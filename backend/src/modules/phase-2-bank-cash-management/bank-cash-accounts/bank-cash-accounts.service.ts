import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma';

import { PrismaService } from '../../../common/prisma/prisma.service';
import { AccountNotFoundException } from '../../phase-1-accounting-foundation/accounting-core/validation-rules/accounting-errors';
import { CreateBankCashAccountDto } from './dto/create-bank-cash-account.dto';
import { UpdateBankCashAccountDto } from './dto/update-bank-cash-account.dto';

type ListQuery = {
  type?: string;
  isActive?: string;
  search?: string;
};

@Injectable()
export class BankCashAccountsService {
  constructor(private readonly prisma: PrismaService) {}

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

      return this.mapSummary(created);
    } catch (error) {
      if (this.isAccountUniqueConflict(error)) {
        throw new ConflictException('This chart-of-accounts record is already linked to another bank/cash account.');
      }
      throw error;
    }
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
  }> {
    const rawBankName = dto.bankName?.trim() || null;
    const rawAccountNumber = dto.accountNumber?.trim() || null;
    const currencyCode = dto.currencyCode?.trim().toUpperCase();
    const type = await this.normalizeAndValidateType(dto.type);

    if (!currencyCode) {
      throw new BadRequestException('Currency code is required.');
    }

    const bankName = rawBankName;
    const accountNumber = rawAccountNumber;

    if (this.isBankType(type)) {
      if (!bankName) {
        throw new BadRequestException('Bank name is required for bank accounts.');
      }
      if (!accountNumber) {
        throw new BadRequestException('Account number is required for bank accounts.');
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

    const existingLink = await this.prisma.bankCashAccount.findUnique({
      where: { accountId: linkedAccount.id },
      select: { id: true },
    });

    if (existingLink && existingLink.id !== currentId) {
      throw new ConflictException('This chart-of-accounts record is already linked to another bank/cash account.');
    }

    return {
      type,
      name: linkedAccount.name,
      bankName,
      accountNumber,
      currencyCode,
      accountId: linkedAccount.id,
    };
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
