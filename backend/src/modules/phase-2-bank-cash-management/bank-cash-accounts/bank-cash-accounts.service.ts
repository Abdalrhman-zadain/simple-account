import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma';

import { PrismaService } from '../../../common/prisma/prisma.service';
import { AccountsService } from '../../phase-1-accounting-foundation/accounting-core/chart-of-accounts/accounts.service';
import { JournalEntriesService } from '../../phase-1-accounting-foundation/accounting-core/journal-entries/journal-entries.service';
import { PostingService } from '../../phase-1-accounting-foundation/accounting-core/posting-logic/posting.service';
import { AccountNotFoundException } from '../../phase-1-accounting-foundation/accounting-core/validation-rules/accounting-errors';
import { CreateBankCashAccountDto } from './dto/create-bank-cash-account.dto';
import { CreateLinkedBankCashAccountDto } from './dto/create-linked-bank-cash-account.dto';
import { UpdateBankCashAccountDto } from './dto/update-bank-cash-account.dto';

type ListQuery = {
  type?: string;
  isActive?: string;
  search?: string;
};

@Injectable()
export class BankCashAccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accountsService: AccountsService,
    private readonly journalEntriesService: JournalEntriesService,
    private readonly postingService: PostingService,
  ) {}

  async list(query: ListQuery = {}) {
    const rows = await this.prisma.bankCashAccount.findMany({
      where: {
        type: query.type?.trim() || undefined,
        isActive: query.isActive ? query.isActive === 'true' : undefined,
        OR: query.search
          ? [
              { name: { contains: query.search, mode: 'insensitive' } },
              { bankName: { contains: query.search, mode: 'insensitive' } },
              { accountNumber: { contains: query.search, mode: 'insensitive' } },
              { account: { code: { contains: query.search, mode: 'insensitive' } } },
              { account: { name: { contains: query.search, mode: 'insensitive' } } },
            ]
          : undefined,
      },
      include: {
        account: {
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
            currentBalance: true,
            currencyCode: true,
            isActive: true,
            isPosting: true,
          },
        },
      },
      orderBy: [{ isActive: 'desc' }, { type: 'asc' }, { name: 'asc' }],
    });

    return rows.map((row) => this.mapSummary(row));
  }

  async create(dto: CreateBankCashAccountDto) {
    const normalized = await this.normalizeAndValidatePayload(dto);
    let createdId: string | null = null;

    try {
      const created = await this.prisma.bankCashAccount.create({
        data: {
          type: normalized.type,
          name: normalized.name,
          bankName: normalized.bankName,
          accountNumber: normalized.accountNumber,
          currencyCode: normalized.currencyCode,
          account: {
            connect: {
              id: normalized.accountId,
            },
          },
        },
        include: {
          account: {
            select: {
              id: true,
              code: true,
              name: true,
              type: true,
              currentBalance: true,
              currencyCode: true,
              isActive: true,
              isPosting: true,
            },
          },
        },
      });

      createdId = created.id;

      if (normalized.openingBalance > 0) {
        await this.postOpeningBalance(created.id, normalized);
        return this.getById(created.id);
      }

      return this.mapSummary(created);
    } catch (error) {
      if (createdId) {
        await this.prisma.bankCashAccount.delete({ where: { id: createdId } }).catch(() => undefined);
      }
      if (this.isAccountUniqueConflict(error)) {
        throw new ConflictException('This chart-of-accounts record is already linked to another bank/cash account.');
      }
      throw error;
    }
  }

  async createLinkedAccount(dto: CreateLinkedBankCashAccountDto) {
    const childName = dto.childName.trim();
    const childNameAr = dto.childNameAr?.trim() || undefined;
    const currencyCode = dto.currencyCode.trim().toUpperCase();

    if (!childName) {
      throw new BadRequestException('Child account name is required.');
    }

    if (!currencyCode) {
      throw new BadRequestException('Currency code is required.');
    }

    return this.prisma.$transaction(async (tx) => {
      const anchor = await this.findCashAndCashEquivalentsAnchor(tx);
      const parentAccount = await this.resolveLinkedAccountParent(tx, dto, anchor.id);
      const createdParent =
        dto.mode === 'create_parent_and_child'
          ? await this.accountsService.createWithinTransaction(
              {
                name: dto.parentName!.trim(),
                nameAr: dto.parentNameAr?.trim() || undefined,
                type: 'ASSET',
                isPosting: false,
                parentAccountId: anchor.id,
                currencyCode,
                allowManualPosting: false,
              },
              tx,
            )
          : null;

      const postingParentId = createdParent?.id ?? parentAccount.id;
      const createdChild = await this.accountsService.createWithinTransaction(
        {
          name: childName,
          nameAr: childNameAr,
          type: 'ASSET',
          isPosting: true,
          parentAccountId: postingParentId,
          currencyCode,
          allowManualPosting: true,
        },
        tx,
      );

      return {
        postingAccount: this.mapAccountOption(createdChild),
        parentAccount: createdParent
          ? {
              id: createdParent.id,
              code: createdParent.code,
              name: createdParent.name,
              currencyCode: createdParent.currencyCode,
            }
          : {
              id: parentAccount.id,
              code: parentAccount.code,
              name: parentAccount.name,
              currencyCode: parentAccount.currencyCode,
            },
      };
    });
  }

  async getById(id: string) {
    const row = await this.prisma.bankCashAccount.findUnique({
      where: { id },
      include: {
        account: {
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
            currentBalance: true,
            currencyCode: true,
            isActive: true,
            isPosting: true,
          },
        },
      },
    });

    if (!row) {
      throw new AccountNotFoundException(id);
    }

    return this.mapSummary(row);
  }

  async update(id: string, dto: UpdateBankCashAccountDto) {
    const existing = await this.prisma.bankCashAccount.findUnique({
      where: { id },
      include: {
        account: {
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
            currentBalance: true,
            currencyCode: true,
            isActive: true,
            isPosting: true,
          },
        },
      },
    });

    if (!existing) {
      throw new AccountNotFoundException(id);
    }

    if (!existing.isActive) {
      throw new BadRequestException('Deactivated bank/cash accounts cannot be edited.');
    }

    const normalized = await this.normalizeAndValidatePayload(
      {
        type: dto.type ?? existing.type,
        name: dto.name ?? existing.name,
        bankName: dto.bankName ?? existing.bankName ?? undefined,
        accountNumber: dto.accountNumber ?? existing.accountNumber ?? undefined,
        currencyCode: dto.currencyCode ?? existing.currencyCode,
        accountId: dto.accountId ?? existing.accountId,
      },
      id,
    );

    try {
      const updated = await this.prisma.bankCashAccount.update({
        where: { id },
        data: {
          type: normalized.type,
          name: normalized.name,
          bankName: normalized.bankName,
          accountNumber: normalized.accountNumber,
          currencyCode: normalized.currencyCode,
          account: {
            connect: {
              id: normalized.accountId,
            },
          },
        },
        include: {
          account: {
            select: {
              id: true,
              code: true,
              name: true,
              type: true,
              currentBalance: true,
              currencyCode: true,
              isActive: true,
              isPosting: true,
            },
          },
        },
      });

      return this.mapSummary(updated);
    } catch (error) {
      if (this.isAccountUniqueConflict(error)) {
        throw new ConflictException('This chart-of-accounts record is already linked to another bank/cash account.');
      }
      throw error;
    }
  }

  async deactivate(id: string) {
    await this.ensureExists(id);

    const updated = await this.prisma.bankCashAccount.update({
      where: { id },
      data: { isActive: false },
      include: {
        account: {
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
            currentBalance: true,
            currencyCode: true,
            isActive: true,
            isPosting: true,
          },
        },
      },
    });

    return this.mapSummary(updated);
  }

  async listTransactions(id: string, query: { dateFrom?: string; dateTo?: string } = {}) {
    const bankCashAccount = await this.prisma.bankCashAccount.findUnique({
      where: { id },
      include: {
        account: {
          select: {
            id: true,
            code: true,
            name: true,
            currentBalance: true,
            currencyCode: true,
          },
        },
      },
    });

    if (!bankCashAccount) {
      throw new AccountNotFoundException(id);
    }

    const transactions = await this.prisma.ledgerTransaction.findMany({
      where: {
        accountId: bankCashAccount.accountId,
        entryDate:
          query.dateFrom || query.dateTo
            ? {
                gte: query.dateFrom ? new Date(query.dateFrom) : undefined,
                lte: query.dateTo ? new Date(query.dateTo) : undefined,
              }
            : undefined,
      },
      include: {
        journalEntry: {
          include: {
            journalEntryType: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: [{ entryDate: 'desc' }, { createdAt: 'desc' }],
    });

    return {
      bankCashAccount: this.mapSummary(bankCashAccount),
      transactions: transactions.map((line) => ({
        id: line.id,
        reference: line.reference,
        journalEntryId: line.journalEntryId,
        journalEntryLineId: line.journalEntryLineId,
        entryDate: line.entryDate.toISOString(),
        postedAt: line.postedAt.toISOString(),
        description: line.description,
        debitAmount: line.debitAmount.toString(),
        creditAmount: line.creditAmount.toString(),
        transactionType: line.journalEntry.journalEntryType?.name ?? 'Journal Entry',
        journalReference: line.journalEntry.reference,
      })),
    };
  }

  private async normalizeAndValidatePayload(
    dto: CreateBankCashAccountDto | UpdateBankCashAccountDto,
    currentId?: string,
  ): Promise<{
    type: string;
    name: string;
    bankName: string | null;
    accountNumber: string | null;
    currencyCode: string;
    accountId: string;
    openingBalance: number;
    openingBalanceOffsetAccountId: string | null;
  }> {
    const rawBankName = dto.bankName?.trim() || null;
    const currencyCode = dto.currencyCode?.trim().toUpperCase();
    const type = await this.normalizeAndValidateType(dto.type);

    if (!currencyCode) {
      throw new BadRequestException('Currency code is required.');
    }

    const bankName = rawBankName;

    if (this.isBankType(type)) {
      if (!bankName) {
        throw new BadRequestException('Bank name is required for bank accounts.');
      }
    }

    const linkedAccount = await this.prisma.account.findUnique({
      where: { id: dto.accountId },
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
        currentBalance: true,
        currencyCode: true,
        isActive: true,
        isPosting: true,
      },
    });

    if (!linkedAccount) {
      throw new AccountNotFoundException(dto.accountId ?? '');
    }

    if (!linkedAccount.isPosting) {
      throw new BadRequestException('Only posting chart-of-accounts entries can be linked to bank/cash accounts.');
    }

    if (!linkedAccount.isActive) {
      throw new BadRequestException('Inactive chart-of-accounts entries cannot be linked to bank/cash accounts.');
    }

    if (linkedAccount.type !== 'ASSET') {
      throw new BadRequestException('Bank/cash accounts must link to asset accounts in the chart of accounts.');
    }

    if (linkedAccount.currencyCode.toUpperCase() !== currencyCode) {
      throw new BadRequestException('Bank/cash account currency must match the linked chart-of-accounts currency.');
    }

    const accountNumber = linkedAccount.code;

    const existingLink = await this.prisma.bankCashAccount.findUnique({
      where: { accountId: linkedAccount.id },
      select: { id: true },
    });

    if (existingLink && existingLink.id !== currentId) {
      throw new ConflictException('This chart-of-accounts record is already linked to another bank/cash account.');
    }

    const openingBalance = dto.openingBalance === undefined ? 0 : Number(dto.openingBalance);
    let openingBalanceOffsetAccountId: string | null = null;

    if (!Number.isFinite(openingBalance) || openingBalance < 0) {
      throw new BadRequestException('Opening balance must be zero or a positive amount.');
    }

    if (openingBalance > 0) {
      openingBalanceOffsetAccountId = dto.openingBalanceOffsetAccountId?.trim() || null;
      if (!openingBalanceOffsetAccountId) {
        throw new BadRequestException('Opening balance offset account is required when an opening balance is provided.');
      }

      const offsetAccount = await this.prisma.account.findUnique({
        where: { id: openingBalanceOffsetAccountId },
        select: {
          id: true,
          name: true,
          currencyCode: true,
          isActive: true,
          isPosting: true,
          allowManualPosting: true,
        },
      });

      if (!offsetAccount) {
        throw new AccountNotFoundException(openingBalanceOffsetAccountId);
      }

      if (!offsetAccount.isActive || !offsetAccount.isPosting || !offsetAccount.allowManualPosting) {
        throw new BadRequestException('Opening balance offset account must be an active posting account that allows manual posting.');
      }

      if (offsetAccount.id === linkedAccount.id) {
        throw new BadRequestException('Opening balance offset account must be different from the linked bank/cash account.');
      }

      if (offsetAccount.currencyCode.toUpperCase() !== currencyCode) {
        throw new BadRequestException('Opening balance offset account currency must match the bank/cash account currency.');
      }
    }

    return {
      type,
      name: linkedAccount.name,
      bankName,
      accountNumber,
      currencyCode,
      accountId: linkedAccount.id,
      openingBalance,
      openingBalanceOffsetAccountId,
    };
  }

  private async findCashAndCashEquivalentsAnchor(
    db: Pick<PrismaService, 'account'>,
  ) {
    const anchor = await db.account.findFirst({
      where: {
        type: 'ASSET',
        isPosting: false,
        isActive: true,
        OR: [{ code: '1110000' }, { name: 'Cash and Cash Equivalents' }],
      },
      orderBy: [{ code: 'asc' }],
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
        isPosting: true,
        isActive: true,
        currencyCode: true,
        parentAccountId: true,
      },
    });

    if (!anchor) {
      throw new BadRequestException('Cash and Cash Equivalents account is not available.');
    }

    return anchor;
  }

  private async resolveLinkedAccountParent(
    db: Pick<PrismaService, 'account'>,
    dto: CreateLinkedBankCashAccountDto,
    anchorId: string,
  ) {
    if (dto.mode === 'create_parent_and_child') {
      const parentName = dto.parentName?.trim();
      if (!parentName) {
        throw new BadRequestException('Parent account name is required.');
      }

      return await db.account.findUniqueOrThrow({
        where: { id: anchorId },
        select: {
          id: true,
          code: true,
          name: true,
          isPosting: true,
          type: true,
          currencyCode: true,
          parentAccountId: true,
        },
      });
    }

    const parentId = dto.existingParentAccountId?.trim();
    if (!parentId) {
      throw new BadRequestException('Existing parent account is required.');
    }

    const parent = await db.account.findUnique({
      where: { id: parentId },
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
        isPosting: true,
        isActive: true,
        currencyCode: true,
        parentAccountId: true,
      },
    });

    if (!parent) {
      throw new AccountNotFoundException(parentId);
    }

    if (!parent.isActive) {
      throw new BadRequestException('Inactive chart-of-accounts entries cannot be used as linked-account parents.');
    }

    if (parent.type !== 'ASSET') {
      throw new BadRequestException('Linked-account parent must belong to the asset chart of accounts.');
    }

    if (parent.isPosting) {
      throw new BadRequestException('Posting account cannot be used as a linked-account parent.');
    }

    const isDescendant = await this.isDescendantOf(db, parent.id, anchorId);
    if (!isDescendant) {
      throw new BadRequestException('Linked-account parent must belong to the Cash and Cash Equivalents subtree.');
    }

    return parent;
  }

  private async isDescendantOf(
    db: Pick<PrismaService, 'account'>,
    accountId: string,
    ancestorId: string,
  ) {
    let currentId: string | null = accountId;

    while (currentId) {
      if (currentId === ancestorId) {
        return true;
      }

      const current: { parentAccountId: string | null } | null = await db.account.findUnique({
        where: { id: currentId },
        select: { parentAccountId: true },
      });

      currentId = current?.parentAccountId ?? null;
    }

    return false;
  }

  private mapAccountOption(account: {
    id: string;
    code: string;
    name: string;
    currentBalance?: Prisma.Decimal | { toString(): string } | null;
    currencyCode: string;
    segment3?: string | null;
    segment4?: string | null;
    segment5?: string | null;
  }) {
    return {
      id: account.id,
      code: account.code,
      name: account.name,
      currentBalance: account.currentBalance?.toString() ?? '0.00',
      currencyCode: account.currencyCode,
      segment3: account.segment3 ?? null,
      segment4: account.segment4 ?? null,
      segment5: account.segment5 ?? null,
    };
  }

  private async postOpeningBalance(
    bankCashAccountId: string,
    normalized: {
      type: string;
      name: string;
      bankName: string | null;
      accountNumber: string | null;
      currencyCode: string;
      accountId: string;
      openingBalance: number;
      openingBalanceOffsetAccountId: string | null;
    },
  ) {
    if (!normalized.openingBalanceOffsetAccountId) {
      return;
    }

    const journalEntry = await this.journalEntriesService.create({
      entryDate: new Date().toISOString(),
      description: `Opening balance for ${normalized.name}`,
      lines: [
        {
          accountId: normalized.accountId,
          description: `Opening balance for ${normalized.name}`,
          debitAmount: normalized.openingBalance,
          creditAmount: 0,
        },
        {
          accountId: normalized.openingBalanceOffsetAccountId,
          description: `Opening balance for ${normalized.name}`,
          debitAmount: 0,
          creditAmount: normalized.openingBalance,
        },
      ],
    });

    await this.postingService.post(journalEntry.id);
  }

  private async ensureExists(id: string) {
    const row = await this.prisma.bankCashAccount.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!row) {
      throw new AccountNotFoundException(id);
    }
  }

  private mapSummary(
    row: {
      id: string;
      type: string;
      name: string;
      bankName: string | null;
      accountNumber: string | null;
      currencyCode: string;
      isActive: boolean;
      createdAt?: Date;
      updatedAt?: Date;
      account: {
        id: string;
        code: string;
        name: string;
        type?: string;
        currentBalance: { toString(): string } | string;
        currencyCode: string;
        isActive?: boolean;
        isPosting?: boolean;
      };
    },
  ) {
    return {
      id: row.id,
      type: row.type,
      name: row.name,
      bankName: row.bankName,
      accountNumber: row.accountNumber,
      currencyCode: row.currencyCode,
      isActive: row.isActive,
      status: row.isActive ? 'ACTIVE' : 'INACTIVE',
      currentBalance: row.account.currentBalance.toString(),
      account: {
        id: row.account.id,
        code: row.account.code,
        name: row.account.name,
        type: row.account.type,
        currencyCode: row.account.currencyCode,
        isActive: row.account.isActive,
        isPosting: row.account.isPosting,
      },
      createdAt: row.createdAt?.toISOString(),
      updatedAt: row.updatedAt?.toISOString(),
    };
  }

  private isAccountUniqueConflict(error: unknown): error is Prisma.PrismaClientKnownRequestError {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002' &&
      Array.isArray(error.meta?.target) &&
      error.meta?.target.includes('accountId')
    );
  }

  private async normalizeAndValidateType(type: string | undefined) {
    const normalizedType = type?.trim();

    if (!normalizedType) {
      throw new BadRequestException('Type is required.');
    }

    const subtype = await this.prisma.paymentMethodType.findFirst({
      where: {
        isActive: true,
        name: {
          equals: normalizedType,
          mode: 'insensitive',
        },
      },
      select: {
        name: true,
      },
    });

    if (!subtype) {
      throw new BadRequestException(`Unknown or inactive payment method type: "${normalizedType}".`);
    }

    return subtype.name;
  }

  private isBankType(type: string) {
    return type.trim().toLowerCase() === 'bank';
  }
}
