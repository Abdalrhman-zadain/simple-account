import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { Prisma, type PrismaClient, type Account } from '../../../../generated/prisma/index';

import { PrismaService } from '../../../../common/prisma/prisma.service';
import { AccountNotFoundException } from '../validation-rules/accounting-errors';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';

/** Client or interactive transaction client used for atomic code allocation */
type DbClient = Pick<PrismaClient, 'account' | 'accountSubtype' | '$queryRaw' | '$executeRaw'>;

const ACCOUNT_CREATE_MAX_ATTEMPTS = 5;
type AccountSelectorUsage = 'purchase-invoice-line' | 'purchase-debit-note-line';

type AccountListQuery = {
  type?: string;
  isActive?: string;
  isPosting?: string;
  search?: string;
  parentAccountId?: string | null;
  usage?: AccountSelectorUsage;
};

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) { }

  async generateNextCode(parentId: string | null, opts?: { isPosting?: boolean; type?: string }): Promise<string> {
    return await this.prisma.$transaction(async (tx) => {
      return this.computeNextCode(tx, parentId, {
        isPosting: opts?.isPosting ?? true,
        type: opts?.type,
      });
    });
  }

  private normalizeSubtype(input: string | undefined) {
    const value = input?.trim();
    return value ? value : null;
  }

  private async ensureAccountSubtypeIsActive(subtype: string, db: Pick<PrismaClient, 'accountSubtype'> = this.prisma) {
    const row = await db.accountSubtype.findFirst({
      where: { name: subtype, isActive: true },
      select: { id: true },
    });
    if (!row) {
      throw new BadRequestException(`Unknown or inactive account subtype: "${subtype}".`);
    }
  }

  async create(dto: CreateAccountDto): Promise<Account> {
    return this.prisma.$transaction(async (tx) => this.createWithinTransaction(dto, tx));
  }

  async createWithinTransaction(dto: CreateAccountDto, db: DbClient): Promise<Account> {
    for (let attempt = 0; attempt < ACCOUNT_CREATE_MAX_ATTEMPTS; attempt++) {
      try {
        const normalizedSubtype = this.normalizeSubtype(dto.subtype ?? undefined);
        if (normalizedSubtype) {
          await this.ensureAccountSubtypeIsActive(normalizedSubtype, db);
        }

        const parentAccount = dto.parentAccountId
          ? await this.ensureAccountCanOwnChildren(dto.parentAccountId, db)
          : null;

        const requestedIsPosting = dto.isPosting ?? true;

        const finalCode = await this.allocateNextAccountCode(db, dto.parentAccountId ?? null, {
          isPosting: requestedIsPosting,
          type: dto.type,
        });

        let finalType = dto.type;
        if (!finalType && parentAccount) {
          finalType = parentAccount.type;
        }

        if (parentAccount && dto.type && dto.type !== parentAccount.type) {
          throw new BadRequestException('Child account type must match the parent account type.');
        }

        if (parentAccount) {
          finalType = parentAccount.type;
        }

        finalType = finalType || 'ASSET';

        // 7-digit numeric root codes (e.g. 5000000) are structural headers by definition.
        const isNumeric7Root = dto.parentAccountId == null && /^\d000000$/.test(finalCode);
        const finalIsPosting = isNumeric7Root ? false : requestedIsPosting;

        try {
          return await db.account.create({
            data: {
              code: finalCode,
              name: dto.name,
              nameAr: dto.nameAr,
              description: dto.description,
              type: finalType as never,
              subtype: normalizedSubtype,
              isPosting: finalIsPosting,
              segment1: dto.segment1,
              segment2: dto.segment2,
              segment3: dto.segment3,
              segment4: dto.segment4,
              segment5: dto.segment5,
              segment1ValueId: dto.segment1ValueId,
              segment2ValueId: dto.segment2ValueId,
              segment3ValueId: dto.segment3ValueId,
              segment4ValueId: dto.segment4ValueId,
              segment5ValueId: dto.segment5ValueId,
              currencyCode: dto.currencyCode || 'JOD',
              parentAccountId: dto.parentAccountId,
              allowManualPosting: dto.allowManualPosting,
            },
          });
        } catch (error) {
          if (this.isPostingLeafConstraint(error)) {
            throw new BadRequestException(this.getPostingLeafConstraintMessage(error));
          }

          throw error;
        }
      } catch (error) {
        if (this.isAccountCodeUniqueConflict(error) && attempt < ACCOUNT_CREATE_MAX_ATTEMPTS - 1) {
          continue;
        }
        if (this.isAccountCodeUniqueConflict(error)) {
          throw new ConflictException('Unable to create account. Please try again.');
        }
        throw error;
      }
    }

    throw new ConflictException('Unable to create account. Please try again.');
  }

  /**
   * Serialize sibling creation under the same parent (or among root accounts) so two
   * concurrent creates cannot read the same "last code" before either inserts.
   */
  private async allocateNextAccountCode(
    tx: DbClient,
    parentId: string | null,
    opts: { isPosting: boolean; type?: string },
  ): Promise<string> {
    if (parentId) {
      const locked = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM "Account" WHERE id = ${parentId} FOR UPDATE
      `;
      if (!locked.length) {
        throw new AccountNotFoundException(parentId);
      }
    } else {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(384629104)`;
    }

    const candidate = await this.computeNextCode(tx, parentId, opts);
    return this.ensureGloballyUnusedAccountCode(tx, candidate);
  }

  /**
   * `code` is unique across the whole chart. Sibling-based allocation can still match an
   * existing account under another branch (same string, different parent). Skip occupied
   * codes before insert so we do not rely on P2002 + blind retries.
   */
  private async ensureGloballyUnusedAccountCode(tx: DbClient, candidate: string): Promise<string> {
    let code = candidate;
    const maxSkips = 500;
    for (let i = 0; i < maxSkips; i++) {
      const taken = await tx.account.findUnique({
        where: { code },
        select: { id: true },
      });
      if (!taken) return code;
      code = this.bumpAccountCodeString(code);
    }

    throw new ConflictException('Unable to allocate a unique account code.');
  }

  /** Increment trailing digits, or append `_1` when there is no numeric tail. */
  private bumpAccountCodeString(code: string): string {
    const match = code.match(/^(.*?)(\d+)$/);
    if (!match) {
      return `${code}_1`;
    }

    const [, prefix, digits] = match;
    const next = (BigInt(digits) + 1n).toString();
    const padded = next.length <= digits.length ? next.padStart(digits.length, '0') : next;
    return prefix + padded;
  }

  private async findLastSiblingCode(tx: DbClient, parentId: string | null): Promise<string | null> {
    const rows =
      parentId === null
        ? await tx.$queryRaw<Array<{ code: string }>>`
            SELECT code FROM "Account"
            WHERE "parentAccountId" IS NULL
            ORDER BY LENGTH(code) DESC, code DESC
            LIMIT 1
          `
        : await tx.$queryRaw<Array<{ code: string }>>`
            SELECT code FROM "Account"
            WHERE "parentAccountId" = ${parentId}
            ORDER BY LENGTH(code) DESC, code DESC
            LIMIT 1
          `;

    return rows[0]?.code ?? null;
  }

  private async computeNextCode(
    tx: DbClient,
    parentId: string | null,
    opts: { isPosting: boolean; type?: string },
  ): Promise<string> {
    if (!parentId) {
      const numericRoot = await this.computeNextNumeric7RootCode(tx, opts.type, opts.isPosting);
      if (numericRoot) return numericRoot;
      return await this.computeNextCodeLegacy(tx, null);
    }

    const parent = await tx.account.findUnique({
      where: { id: parentId },
      select: { code: true },
    });
    if (!parent) throw new AccountNotFoundException(parentId);

    const numericChild = await this.computeNextNumeric7ChildCode(tx, parentId, parent.code, opts.isPosting);
    if (numericChild) return numericChild;

    return await this.computeNextCodeLegacy(tx, parentId, parent.code);
  }

  /**
   * Legacy code allocation: string prefix + numeric suffix, based on last sibling code.
   * This remains for non-numeric charts (e.g. segmented enterprise codes).
   */
  private async computeNextCodeLegacy(tx: DbClient, parentId: string | null, parentCode?: string): Promise<string> {
    const prefix = parentId ? (parentCode ?? '') : '';
    const lastCode = await this.findLastSiblingCode(tx, parentId);

    if (!lastCode) {
      if (!parentId) return '1';
      return prefix + '01';
    }

    const suffix = lastCode.substring(prefix.length);
    const numericSuffix = parseInt(suffix, 10);
    if (isNaN(numericSuffix)) {
      return lastCode + '_1';
    }

    const nextSuffix = (numericSuffix + 1).toString().padStart(suffix.length, '0');
    return prefix + nextSuffix;
  }

  private isNumeric7(code: string) {
    return /^\d{7}$/.test(code);
  }

  private countTrailingZeros(code: string) {
    let count = 0;
    for (let i = code.length - 1; i >= 0 && code[i] === '0'; i--) count++;
    return count;
  }

  private typeToRootDigit(type?: string) {
    switch (type) {
      case 'ASSET':
        return '1';
      case 'LIABILITY':
        return '2';
      case 'EQUITY':
        return '3';
      case 'REVENUE':
        return '4';
      case 'EXPENSE':
        return '5';
      default:
        return null;
    }
  }

  /**
   * Optional numeric-root strategy:
   * - When there are no root siblings yet for that type-digit, allocate `<digit>000000` (7 digits).
   * - If that code is already taken, return null and fall back to legacy allocation.
   *
   * This keeps existing segmented/enterprise charts working while enabling the requested 7-digit hierarchy.
   */
  private async computeNextNumeric7RootCode(tx: DbClient, type: string | undefined, isPosting: boolean): Promise<string | null> {
    if (isPosting) return null;
    const rootDigit = this.typeToRootDigit(type ?? 'ASSET');
    if (!rootDigit) return null;

    const candidate = `${rootDigit}000000`;

    const taken = await tx.account.findUnique({
      where: { code: candidate },
      select: { id: true },
    });

    return taken ? null : candidate;
  }

  /**
   * 7-digit hierarchical numeric strategy (opt-in by parent code shape).
   *
   * Model:
   * - Header accounts have trailing zeros (e.g. `1100000`)
   * - Header children consume one more digit from the left (reduce trailing zeros by 1): `1100000` -> `1110000`
   * - Posting children allocate within the parent's remaining zeros, incrementing from the right:
   *   `1100000` -> `1100001`, `1100002`, ...
   *
   * To avoid collisions with future header branches, posting allocation keeps the "next header digit" at 0
   * whenever the parent still has room for deeper headers.
   */
  private async computeNextNumeric7ChildCode(
    tx: DbClient,
    parentId: string,
    parentCode: string,
    isPosting: boolean,
  ): Promise<string | null> {
    if (!this.isNumeric7(parentCode)) return null;

    const z = this.countTrailingZeros(parentCode);
    if (z <= 0) return null;

    const parentPrefixLen = 7 - z;
    const parentPrefix = parentCode.slice(0, parentPrefixLen);

    const children = await tx.account.findMany({
      where: { parentAccountId: parentId },
      select: { code: true, isPosting: true },
    });

    const childCodes = children.map((c) => c.code).filter((code) => this.isNumeric7(code));

    if (!isPosting) {
      if (z <= 1) {
        throw new BadRequestException('No more hierarchy levels are available under this account.');
      }

      const newTrailingZeros = z - 1;
      const nextDigitIndex = parentPrefixLen; // 0-based
      const maxDigit = childCodes
        .filter((code) => this.countTrailingZeros(code) === newTrailingZeros)
        .filter((code) => code.startsWith(parentPrefix))
        .map((code) => Number(code[nextDigitIndex] ?? '0'))
        .reduce((a, b) => Math.max(a, b), 0);

      if (maxDigit >= 9) {
        throw new ConflictException('Unable to allocate a new header account code under this parent.');
      }

      const nextDigit = String(maxDigit + 1);
      return parentPrefix + nextDigit + '0'.repeat(newTrailingZeros);
    }

    // Posting allocation.
    const suffixLen = z;
    const reservedLeadingDigits = suffixLen > 1 ? 1 : 0;
    const allowedMax = reservedLeadingDigits ? 10 ** (suffixLen - 1) - 1 : 9;

    const maxSerial = childCodes
      .filter((code) => code.startsWith(parentPrefix))
      .filter((code) => (reservedLeadingDigits ? code[parentPrefixLen] === '0' : true))
      .map((code) => Number(code.slice(7 - suffixLen)))
      .filter((n) => Number.isFinite(n) && n >= 0 && n <= allowedMax)
      .reduce((a, b) => Math.max(a, b), 0);

    const nextSerial = maxSerial === 0 ? 1 : maxSerial + 1;
    if (nextSerial > allowedMax) {
      throw new ConflictException('Unable to allocate a posting account code under this parent.');
    }

    const serialStr = String(nextSerial).padStart(suffixLen, '0');
    return parentPrefix + serialStr;
  }

  async list(query?: AccountListQuery) {
    return this.prisma.account.findMany({
      where: this.buildAccountListWhere(query),
      include: {
        segment1Value: true,
        segment2Value: true,
        segment3Value: true,
        segment4Value: true,
        segment5Value: true,
        parentAccount: true,
      },
      orderBy: [{ code: 'asc' }],
    });
  }

  async listSelectorOptions(query?: AccountListQuery) {
    return this.prisma.account.findMany({
      where: this.buildAccountListWhere(query),
      select: {
        id: true,
        code: true,
        name: true,
        nameAr: true,
        type: true,
        subtype: true,
        isPosting: true,
        isActive: true,
        currentBalance: true,
        currencyCode: true,
      },
      orderBy: [{ code: 'asc' }],
    });
  }

  async listTableRows(query?: AccountListQuery) {
    // 1. Fetch the requested accounts and their primary counts.
    const accounts = await this.prisma.account.findMany({
      where: this.buildAccountListWhere(query),
      select: {
        id: true,
        code: true,
        name: true,
        nameAr: true,
        type: true,
        isPosting: true,
        isActive: true,
        currentBalance: true,
        parentAccountId: true,
        parentAccount: {
          select: {
            id: true,
            name: true,
            nameAr: true,
          },
        },
        _count: {
          select: {
            journalLines: true,
            ledgerLines: true,
          },
        },
      },
      orderBy: [{ code: 'asc' }],
    });

    // 2. To determine if a Header account can be deleted, we must know if its 
    // subtree is clean. Fetching subtree status for each row recursively can be 
    // expensive. For now, we perform a lightweight check: if it's a posting 
    // account, check its counts. If it's a header, we fetch descendants 
    // only when needed or use an optimistic check.
    // Optimization: We fetch all descendant transfers in one go for the visible set.
    const results = [];
    for (const account of accounts) {
      let canDelete = account._count.journalLines === 0 && account._count.ledgerLines === 0;

      if (canDelete && !account.isPosting) {
        // If it's a header and clean so far, check its children.
        const descendantIds = await this.getDescendantIds(account.id);
        const subtreeHasHistory = await this.hasAnyTransferHistory(descendantIds);
        canDelete = !subtreeHasHistory;
      }

      results.push({
        ...account,
        canDelete,
      });
    }

    return results;
  }

  private buildAccountListWhere(query?: AccountListQuery) {
    const where: Prisma.AccountWhereInput = {
      parentAccountId: query?.parentAccountId === 'null' ? null : query?.parentAccountId,
      type: query?.type as never,
      isActive: query?.isActive ? query.isActive === 'true' : undefined,
      isPosting: query?.isPosting ? query.isPosting === 'true' : undefined,
      OR: query?.search
        ? [
          { code: { contains: query.search, mode: 'insensitive' } },
          { name: { contains: query.search, mode: 'insensitive' } },
          { nameAr: { contains: query.search, mode: 'insensitive' } },
        ]
        : undefined,
    };

    if (query?.usage === 'purchase-invoice-line' || query?.usage === 'purchase-debit-note-line') {
      where.isPosting = true;
      where.AND = [
        {
          OR: [
            { type: 'ASSET', subtype: 'Inventory' },
            { type: 'ASSET', subtype: 'FixedAsset' },
            { type: 'EXPENSE' },
          ],
        },
      ];
    }

    return where;
  }

  async hierarchy(query?: { type?: string; isActive?: string; isPosting?: string; search?: string }) {
    const accounts = await this.list(query);
    const byParent = new Map<string | null, typeof accounts>();

    for (const account of accounts) {
      const parentId = account.parentAccountId ?? null;
      const siblings = byParent.get(parentId) ?? [];
      siblings.push(account);
      byParent.set(parentId, siblings);
    }

    type AccountTreeNode = (typeof accounts)[number] & { children: AccountTreeNode[] };

    const buildTree = (parentId: string | null): AccountTreeNode[] =>
      (byParent.get(parentId) ?? []).map((account) => ({
        ...account,
        children: buildTree(account.id),
      }));

    return buildTree(null);
  }

  async getById(id: string) {
    const account = await this.prisma.account.findUnique({
      where: { id },
      include: {
        segment1Value: true,
        segment2Value: true,
        segment3Value: true,
        segment4Value: true,
        segment5Value: true,
        parentAccount: {
          select: {
            id: true,
            name: true,
            nameAr: true,
            code: true,
            parentAccountId: true,
          }
        },
      }
    });

    if (!account) {
      throw new AccountNotFoundException(id);
    }

    const ancestors = await this.getAncestors(id);

    return {
      ...account,
      ancestors,
    };
  }

  private async getAncestors(id: string): Promise<Array<{ id: string; name: string; nameAr: string | null; code: string; parentAccountId: string | null }>> {
    const account = await this.prisma.account.findUnique({
      where: { id },
      select: { parentAccountId: true }
    });

    if (!account || !account.parentAccountId) {
      return [];
    }

    const parent = await this.prisma.account.findUnique({
      where: { id: account.parentAccountId },
      select: { id: true, name: true, nameAr: true, code: true, parentAccountId: true }
    });

    if (!parent) {
      return [];
    }

    const higherAncestors = await this.getAncestors(parent.id);
    return [...higherAncestors, parent];
  }

  async update(id: string, dto: UpdateAccountDto) {
    const existing = await this.ensureAccountExists(id);

    if (dto.parentAccountId) {
      if (dto.parentAccountId === id) {
        throw new ConflictException('An account cannot be its own parent.');
      }

      await this.ensureAccountCanOwnChildren(dto.parentAccountId);
    }

    const normalizedSubtype = dto.subtype === undefined ? undefined : this.normalizeSubtype(dto.subtype);
    if (normalizedSubtype) {
      await this.ensureAccountSubtypeIsActive(normalizedSubtype);
    }

    const nextParentId =
      dto.parentAccountId === undefined
        ? existing.parentAccountId
        : dto.parentAccountId;

    let enforcedType: (typeof existing)['type'] | null = null;
    if (nextParentId) {
      const parent = await this.ensureAccountExists(nextParentId);
      enforcedType = parent.type;

      if (dto.type && dto.type !== parent.type) {
        throw new BadRequestException('Child account type must match the parent account type.');
      }
    }

    if (dto.type && dto.type !== existing.type) {
      const child = await this.prisma.account.findFirst({
        where: { parentAccountId: id },
        select: { id: true },
      });
      if (child) {
        throw new BadRequestException('Cannot change account type while the account has children.');
      }
    }

    const nextIsPosting = dto.isPosting ?? existing.isPosting;

    if (nextIsPosting) {
      await this.ensureAccountHasNoChildren(id);
    }

    try {
      return await this.prisma.account.update({
        where: { id },
        data: {
          name: dto.name,
          nameAr: dto.nameAr,
          description: dto.description,
          type: enforcedType ?? dto.type,
          subtype: normalizedSubtype === undefined ? undefined : normalizedSubtype,
          isPosting: dto.isPosting,
          segment1: dto.segment1,
          segment2: dto.segment2,
          segment3: dto.segment3,
          segment4: dto.segment4,
          segment5: dto.segment5,
          segment1ValueId: dto.segment1ValueId,
          segment2ValueId: dto.segment2ValueId,
          segment3ValueId: dto.segment3ValueId,
          segment4ValueId: dto.segment4ValueId,
          segment5ValueId: dto.segment5ValueId,
          currencyCode: dto.currencyCode,
          parentAccountId: dto.parentAccountId,
          allowManualPosting: dto.allowManualPosting,
        },
      });
    } catch (error) {
      if (this.isPostingLeafConstraint(error)) {
        throw new BadRequestException(this.getPostingLeafConstraintMessage(error));
      }

      throw error;
    }
  }

  async deactivate(id: string) {
    await this.ensureAccountExists(id);

    return this.prisma.account.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async activate(id: string) {
    await this.ensureAccountExists(id);

    return this.prisma.account.update({
      where: { id },
      data: { isActive: true },
    });
  }

  async remove(id: string) {
    const account = await this.ensureAccountExists(id);

    // 1. Check if the account itself or any descendant has transfers.
    const descendantIds = await this.getDescendantIds(id);
    const allAffectedIds = [id, ...descendantIds];

    const hasHistory = await this.hasAnyTransferHistory(allAffectedIds);

    if (hasHistory) {
      throw new BadRequestException(
        descendantIds.length > 0
          ? 'Cannot delete an account that has transfer history (including its subtree).'
          : 'Cannot delete an account that has transfer history.'
      );
    }

    // 2. Subtree is clean. Perform cascading deletion in a transaction.
    // Deleting from the bottom up to respect foreign key constraints.
    try {
      return await this.prisma.$transaction(async (tx) => {
        // Reverse the descendant IDs to delete children before parents.
        // getDescendantIds returns children then grandchildren, so reversing 
        // gives us grandchildren then children.
        const reversedDescendantIds = [...descendantIds].reverse();

        for (const descId of reversedDescendantIds) {
          await tx.account.delete({
            where: { id: descId },
          });
        }

        return await tx.account.delete({
          where: { id: id },
        });
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new BadRequestException('Cannot delete an account while it is still linked to other records.');
      }

      throw error;
    }
  }

  private async getDescendantIds(parentId: string): Promise<string[]> {
    const children = await this.prisma.account.findMany({
      where: { parentAccountId: parentId },
      select: { id: true },
    });

    let ids: string[] = children.map(c => c.id);
    for (const child of children) {
      const descendants = await this.getDescendantIds(child.id);
      ids = ids.concat(descendants);
    }

    return ids;
  }

  private async hasAnyTransferHistory(accountIds: string[]): Promise<boolean> {
    if (accountIds.length === 0) return false;

    const [journalUsage, postedUsage] = await Promise.all([
      this.prisma.journalEntryLine.findFirst({
        where: { accountId: { in: accountIds } },
        select: { id: true },
      }),
      this.prisma.ledgerTransaction.findFirst({
        where: { accountId: { in: accountIds } },
        select: { id: true },
      }),
    ]);

    return !!(journalUsage || postedUsage);
  }

  private async ensureAccountExists(id: string, db: DbClient = this.prisma) {
    const account = await db.account.findUnique({ where: { id } });

    if (!account) {
      throw new AccountNotFoundException(id);
    }

    return account;
  }

  private async ensureAccountCanOwnChildren(id: string, db: DbClient = this.prisma) {
    const account = await this.ensureAccountExists(id, db);

    if (account.isPosting) {
      throw new BadRequestException(
        `Posting account "${account.name}" cannot have child accounts.`,
      );
    }

    return account;
  }

  private async ensureAccountHasNoChildren(id: string) {
    const child = await this.prisma.account.findFirst({
      where: { parentAccountId: id },
      select: { id: true },
    });

    if (child) {
      throw new BadRequestException('Posting accounts must be leaf nodes and cannot have child accounts.');
    }
  }

  private isAccountCodeUniqueConflict(error: unknown): error is Prisma.PrismaClientKnownRequestError {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
      return false;
    }

    const target = error.meta?.target;
    if (!Array.isArray(target)) {
      return true;
    }

    return target.includes('code');
  }

  private isPostingLeafConstraint(error: unknown) {
    return error instanceof Error && error.message.includes('account_posting_leaf');
  }

  private getPostingLeafConstraintMessage(error: unknown) {
    if (!(error instanceof Error)) {
      return 'Posting accounts must remain leaf nodes and cannot have child accounts.';
    }

    if (error.message.includes('Posting account "')) {
      const match = error.message.match(/Posting account "[^"]+" cannot have child accounts\./);
      return match?.[0] ?? 'Posting accounts must remain leaf nodes and cannot have child accounts.';
    }

    if (error.message.includes('Posting accounts must be leaf nodes and cannot have child accounts.')) {
      return 'Posting accounts must be leaf nodes and cannot have child accounts.';
    }

    return 'Posting accounts must remain leaf nodes and cannot have child accounts.';
  }
}
