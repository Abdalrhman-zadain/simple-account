import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { Prisma, type PrismaClient } from '../../../../generated/prisma/index';

import { PrismaService } from '../../../../common/prisma/prisma.service';
import { AccountNotFoundException } from '../validation-rules/accounting-errors';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';

/** Client or interactive transaction client used for atomic code allocation */
type DbClient = Pick<PrismaClient, 'account' | '$queryRaw' | '$executeRaw'>;

const ACCOUNT_CREATE_MAX_ATTEMPTS = 5;

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) { }

  async generateNextCode(parentId: string | null): Promise<string> {
    return await this.prisma.$transaction(async (tx) => {
      return this.computeNextCode(tx, parentId);
    });
  }

  async create(dto: CreateAccountDto) {
    for (let attempt = 0; attempt < ACCOUNT_CREATE_MAX_ATTEMPTS; attempt++) {
      try {
        return await this.prisma.$transaction(async (tx) => {
          const parentAccount = dto.parentAccountId
            ? await this.ensureAccountCanOwnChildren(dto.parentAccountId, tx)
            : null;

          const finalCode = await this.allocateNextAccountCode(tx, dto.parentAccountId ?? null);

          let finalType = dto.type;
          if (!finalType && parentAccount) {
            finalType = parentAccount.type;
          }

          finalType = finalType || 'ASSET';

          try {
            return await tx.account.create({
              data: {
                code: finalCode,
                name: dto.name,
                nameAr: dto.nameAr,
                description: dto.description,
                type: finalType as never,
                subtype: dto.subtype,
                isPosting: dto.isPosting ?? true,
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
        });
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
  }

  /**
   * Serialize sibling creation under the same parent (or among root accounts) so two
   * concurrent creates cannot read the same "last code" before either inserts.
   */
  private async allocateNextAccountCode(tx: DbClient, parentId: string | null): Promise<string> {
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

    const candidate = await this.computeNextCode(tx, parentId);
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

  private async computeNextCode(tx: DbClient, parentId: string | null): Promise<string> {
    let prefix = '';
    if (parentId) {
      const parent = await tx.account.findUnique({
        where: { id: parentId },
        select: { code: true },
      });
      if (!parent) throw new AccountNotFoundException(parentId);
      prefix = parent.code;
    }

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

  async list(query?: { type?: string; isActive?: string; isPosting?: string; search?: string; parentAccountId?: string | null }) {
    return this.prisma.account.findMany({
      where: {
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
      },
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
        parentAccount: true,
      }
    });

    if (!account) {
      throw new AccountNotFoundException(id);
    }

    return account;
  }

  async update(id: string, dto: UpdateAccountDto) {
    const existing = await this.ensureAccountExists(id);

    if (dto.parentAccountId) {
      if (dto.parentAccountId === id) {
        throw new ConflictException('An account cannot be its own parent.');
      }

      await this.ensureAccountCanOwnChildren(dto.parentAccountId);
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
          type: dto.type,
          subtype: dto.subtype,
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
