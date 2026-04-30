import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { BankCashTransactionKind, BankCashTransactionStatus, Prisma } from '../../../generated/prisma';

import { PrismaService } from '../../../common/prisma/prisma.service';
import { JournalEntriesService } from '../../phase-1-accounting-foundation/accounting-core/journal-entries/journal-entries.service';
import { PostingService } from '../../phase-1-accounting-foundation/accounting-core/posting-logic/posting.service';
import { AccountNotFoundException } from '../../phase-1-accounting-foundation/accounting-core/validation-rules/accounting-errors';
import { CreatePaymentDto, CreateReceiptDto, CreateTransferDto } from './dto/create-bank-cash-transaction.dto';
import { UpdateBankCashTransactionDto } from './dto/update-bank-cash-transaction.dto';

type ListQuery = {
  kind?: BankCashTransactionKind;
  status?: BankCashTransactionStatus;
  bankCashAccountId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
};

type BankCashAccountForPosting = {
  id: string;
  name: string;
  currencyCode: string;
  isActive: boolean;
  account: {
    id: string;
    name: string;
    nameAr?: string | null;
    currencyCode: string;
    isActive: boolean;
    isPosting: boolean;
  };
};

@Injectable()
export class BankCashTransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly journalEntriesService: JournalEntriesService,
    private readonly postingService: PostingService,
  ) {}

  async list(query: ListQuery = {}) {
    const search = query.search?.trim();
    const rows = await this.prisma.bankCashTransaction.findMany({
      where: {
        kind: query.kind,
        status: query.status,
        AND: [
          search
            ? {
                OR: [
                  { reference: { contains: search, mode: 'insensitive' } },
                  { description: { contains: search, mode: 'insensitive' } },
                  { counterpartyName: { contains: search, mode: 'insensitive' } },
                ],
              }
            : {},
          query.bankCashAccountId
            ? {
                OR: [
                  { bankCashAccountId: query.bankCashAccountId },
                  { sourceBankCashAccountId: query.bankCashAccountId },
                  { destinationBankCashAccountId: query.bankCashAccountId },
                ],
              }
            : {},
        ],
        transactionDate:
          query.dateFrom || query.dateTo
            ? {
                gte: query.dateFrom ? new Date(query.dateFrom) : undefined,
                lte: query.dateTo ? new Date(query.dateTo) : undefined,
              }
            : undefined,
      },
      include: this.includeRelations(),
      orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }],
    });

    return rows.map((row) => this.mapTransaction(row));
  }

  async createReceipt(dto: CreateReceiptDto) {
    await this.validateReceiptOrPayment(dto, BankCashTransactionKind.RECEIPT);
    return this.createWithConflictHandling({
      kind: BankCashTransactionKind.RECEIPT,
      reference: this.normalizeReference(dto.reference, 'RCPT'),
      transactionDate: new Date(dto.transactionDate),
      amount: this.toAmount(dto.amount),
      customerId: dto.customerId ?? null,
      bankCashAccountId: dto.bankCashAccountId,
      counterAccountId: dto.counterAccountId,
      counterpartyName: dto.counterpartyName?.trim() || null,
      description: dto.description?.trim() || null,
    });
  }

  async createPayment(dto: CreatePaymentDto) {
    await this.validateReceiptOrPayment(dto, BankCashTransactionKind.PAYMENT);
    return this.createWithConflictHandling({
      kind: BankCashTransactionKind.PAYMENT,
      reference: this.normalizeReference(dto.reference, 'PAY'),
      transactionDate: new Date(dto.transactionDate),
      amount: this.toAmount(dto.amount),
      bankCashAccountId: dto.bankCashAccountId,
      counterAccountId: dto.counterAccountId,
      counterpartyName: dto.counterpartyName?.trim() || null,
      description: dto.description?.trim() || null,
    });
  }

  async createTransfer(dto: CreateTransferDto) {
    await this.validateTransfer(dto);
    return this.createWithConflictHandling({
      kind: BankCashTransactionKind.TRANSFER,
      reference: this.normalizeReference(dto.reference, 'TRF'),
      transactionDate: new Date(dto.transactionDate),
      amount: this.toAmount(dto.amount),
      sourceBankCashAccountId: dto.sourceBankCashAccountId,
      destinationBankCashAccountId: dto.destinationBankCashAccountId,
      description: dto.description?.trim() || null,
    });
  }

  async getById(id: string) {
    const row = await this.getTransactionOrThrow(id);
    return this.mapTransaction(row);
  }

  async update(id: string, dto: UpdateBankCashTransactionDto) {
    const existing = await this.getTransactionOrThrow(id);
    if (existing.status === BankCashTransactionStatus.POSTED) {
      throw new BadRequestException('Posted bank/cash transactions cannot be edited.');
    }

    const next = {
      reference: dto.reference ?? existing.reference,
      transactionDate: dto.transactionDate ?? existing.transactionDate.toISOString(),
      amount: dto.amount ?? Number(existing.amount),
      bankCashAccountId: dto.bankCashAccountId ?? existing.bankCashAccountId ?? undefined,
      counterAccountId: dto.counterAccountId ?? existing.counterAccountId ?? undefined,
      sourceBankCashAccountId: dto.sourceBankCashAccountId ?? existing.sourceBankCashAccountId ?? undefined,
      destinationBankCashAccountId:
        dto.destinationBankCashAccountId ?? existing.destinationBankCashAccountId ?? undefined,
      customerId: dto.customerId === undefined ? existing.customerId ?? undefined : dto.customerId ?? undefined,
      counterpartyName: dto.counterpartyName === undefined ? existing.counterpartyName ?? undefined : dto.counterpartyName ?? undefined,
      description: dto.description === undefined ? existing.description ?? undefined : dto.description ?? undefined,
    };

    if (existing.kind === BankCashTransactionKind.TRANSFER) {
      await this.validateTransfer({
        reference: next.reference,
        transactionDate: next.transactionDate,
        amount: next.amount,
        sourceBankCashAccountId: next.sourceBankCashAccountId!,
        destinationBankCashAccountId: next.destinationBankCashAccountId!,
        description: next.description,
      });
    } else {
      await this.validateReceiptOrPayment(
        {
          reference: next.reference,
          transactionDate: next.transactionDate,
          amount: next.amount,
          bankCashAccountId: next.bankCashAccountId!,
          counterAccountId: next.counterAccountId!,
          counterpartyName: next.counterpartyName,
          description: next.description,
        },
        existing.kind,
      );
    }

    try {
      const updated = await this.prisma.bankCashTransaction.update({
        where: { id },
        data: {
          reference: next.reference.trim(),
          transactionDate: new Date(next.transactionDate),
          amount: this.toAmount(next.amount),
          customerId: existing.kind === BankCashTransactionKind.TRANSFER ? null : next.customerId ?? null,
          bankCashAccountId: existing.kind === BankCashTransactionKind.TRANSFER ? null : next.bankCashAccountId,
          counterAccountId: existing.kind === BankCashTransactionKind.TRANSFER ? null : next.counterAccountId,
          sourceBankCashAccountId:
            existing.kind === BankCashTransactionKind.TRANSFER ? next.sourceBankCashAccountId : null,
          destinationBankCashAccountId:
            existing.kind === BankCashTransactionKind.TRANSFER ? next.destinationBankCashAccountId : null,
          counterpartyName: existing.kind === BankCashTransactionKind.TRANSFER ? null : next.counterpartyName?.trim() || null,
          description: next.description?.trim() || null,
        },
        include: this.includeRelations(),
      });

      return this.mapTransaction(updated);
    } catch (error) {
      if (this.isReferenceUniqueConflict(error)) {
        throw new ConflictException('A bank/cash transaction with this reference already exists.');
      }
      throw error;
    }
  }

  async post(id: string) {
    const transaction = await this.getTransactionOrThrow(id);
    if (transaction.status === BankCashTransactionStatus.POSTED) {
      throw new BadRequestException('Bank/cash transaction is already posted.');
    }

    const journalEntry = await this.journalEntriesService.create({
      entryDate: transaction.transactionDate.toISOString(),
      description: this.buildJournalDescription(transaction.reference, transaction.description),
      lines: this.buildJournalLines(transaction),
    });
    const postedEntry = await this.postingService.post(journalEntry.id);

    const updated = await this.prisma.bankCashTransaction.update({
      where: { id },
      data: {
        status: BankCashTransactionStatus.POSTED,
        journalEntryId: postedEntry.id,
        postedAt: postedEntry.postedAt ? new Date(postedEntry.postedAt) : new Date(),
      },
      include: this.includeRelations(),
    });

    return this.mapTransaction(updated);
  }

  private async createWithConflictHandling(data: Prisma.BankCashTransactionUncheckedCreateInput) {
    try {
      const created = await this.prisma.bankCashTransaction.create({
        data,
        include: this.includeRelations(),
      });
      return this.mapTransaction(created);
    } catch (error) {
      if (this.isReferenceUniqueConflict(error)) {
        throw new ConflictException('A bank/cash transaction with this reference already exists.');
      }
      throw error;
    }
  }

  private async validateReceiptOrPayment(dto: CreateReceiptDto | CreatePaymentDto, kind: BankCashTransactionKind) {
    const bankCashAccount = await this.getActiveBankCashAccount(dto.bankCashAccountId);
    const counterAccount = await this.getPostingAccount(dto.counterAccountId);

    if (bankCashAccount.account.id === counterAccount.id) {
      throw new BadRequestException('The bank/cash account and counter account must be different.');
    }

    if (bankCashAccount.currencyCode.toUpperCase() !== counterAccount.currencyCode.toUpperCase()) {
      throw new BadRequestException(`${kind.toLowerCase()} currency must match the selected counter account currency.`);
    }
  }

  private async validateTransfer(dto: CreateTransferDto) {
    if (dto.sourceBankCashAccountId === dto.destinationBankCashAccountId) {
      throw new BadRequestException('Transfer source and destination accounts must be different.');
    }

    const [source, destination] = await Promise.all([
      this.getActiveBankCashAccount(dto.sourceBankCashAccountId),
      this.getActiveBankCashAccount(dto.destinationBankCashAccountId),
    ]);

    if (source.currencyCode.toUpperCase() !== destination.currencyCode.toUpperCase()) {
      throw new BadRequestException('Transfers currently require source and destination accounts to use the same currency.');
    }
  }

  private async getActiveBankCashAccount(id: string): Promise<BankCashAccountForPosting> {
    const row = await this.prisma.bankCashAccount.findUnique({
      where: { id },
      include: {
        account: {
          select: {
            id: true,
            name: true,
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

    if (!row.isActive) {
      throw new BadRequestException('Deactivated bank/cash accounts cannot be selected for new transactions.');
    }

    if (!row.account.isActive || !row.account.isPosting) {
      throw new BadRequestException('The linked chart-of-accounts record is not available for posting.');
    }

    return row;
  }

  private async getPostingAccount(id: string) {
    const account = await this.prisma.account.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        currencyCode: true,
        isActive: true,
        isPosting: true,
        allowManualPosting: true,
      },
    });

    if (!account) {
      throw new AccountNotFoundException(id);
    }

    if (!account.isActive || !account.isPosting || !account.allowManualPosting) {
      throw new BadRequestException('Counter account must be an active posting account that allows manual posting.');
    }

    return account;
  }

  private async getTransactionOrThrow(id: string) {
    const row = await this.prisma.bankCashTransaction.findUnique({
      where: { id },
      include: this.includeRelations(),
    });

    if (!row) {
      throw new BadRequestException(`Bank/cash transaction ${id} was not found.`);
    }

    return row;
  }

  private buildJournalLines(transaction: Awaited<ReturnType<BankCashTransactionsService['getTransactionOrThrow']>>) {
    const amount = Number(transaction.amount);
    const description = this.buildJournalDescription(transaction.reference, transaction.description);

    if (transaction.kind === BankCashTransactionKind.RECEIPT) {
      return [
        {
          accountId: transaction.bankCashAccount!.account.id,
          description,
          debitAmount: amount,
          creditAmount: 0,
        },
        {
          accountId: transaction.counterAccountId!,
          description,
          debitAmount: 0,
          creditAmount: amount,
        },
      ];
    }

    if (transaction.kind === BankCashTransactionKind.PAYMENT) {
      return [
        {
          accountId: transaction.counterAccountId!,
          description,
          debitAmount: amount,
          creditAmount: 0,
        },
        {
          accountId: transaction.bankCashAccount!.account.id,
          description,
          debitAmount: 0,
          creditAmount: amount,
        },
      ];
    }

    return [
      {
        accountId: transaction.destinationBankCashAccount!.account.id,
        description,
        debitAmount: amount,
        creditAmount: 0,
      },
      {
        accountId: transaction.sourceBankCashAccount!.account.id,
        description,
        debitAmount: 0,
        creditAmount: amount,
      },
    ];
  }

  private mapTransaction(row: Awaited<ReturnType<BankCashTransactionsService['getTransactionOrThrow']>>) {
    return {
      id: row.id,
      kind: row.kind,
      status: row.status,
      reference: row.reference,
      transactionDate: row.transactionDate.toISOString(),
      amount: row.amount.toString(),
      description: row.description,
      counterpartyName: row.counterpartyName,
      customer: row.customer ? { id: row.customer.id, code: row.customer.code, name: row.customer.name } : null,
      bankCashAccount: row.bankCashAccount ? this.mapBankCashAccount(row.bankCashAccount) : null,
      sourceBankCashAccount: row.sourceBankCashAccount ? this.mapBankCashAccount(row.sourceBankCashAccount) : null,
      destinationBankCashAccount: row.destinationBankCashAccount
        ? this.mapBankCashAccount(row.destinationBankCashAccount)
        : null,
      counterAccount: row.counterAccount
        ? {
            id: row.counterAccount.id,
            code: row.counterAccount.code,
            name: row.counterAccount.name,
            nameAr: row.counterAccount.nameAr ?? null,
            currencyCode: row.counterAccount.currencyCode,
          }
        : null,
      journalEntryId: row.journalEntryId,
      journalReference: row.journalEntry?.reference ?? null,
      postedAt: row.postedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private mapBankCashAccount(row: {
    id: string;
    type: string;
    name: string;
    currencyCode: string;
    isActive: boolean;
    account: { id: string; code: string; name: string; nameAr?: string | null; currencyCode: string };
  }) {
    return {
      id: row.id,
      type: row.type,
      name: row.name,
      currencyCode: row.currencyCode,
      isActive: row.isActive,
      account: {
        id: row.account.id,
        code: row.account.code,
        name: row.account.name,
        nameAr: row.account.nameAr ?? null,
        currencyCode: row.account.currencyCode,
      },
    };
  }

  private includeRelations() {
    return {
      bankCashAccount: { include: { account: { select: this.accountSummarySelect() } } },
      sourceBankCashAccount: { include: { account: { select: this.accountSummarySelect() } } },
      destinationBankCashAccount: { include: { account: { select: this.accountSummarySelect() } } },
      counterAccount: { select: this.accountSummarySelect() },
      customer: { select: { id: true, code: true, name: true } },
      journalEntry: { select: { id: true, reference: true } },
    } satisfies Prisma.BankCashTransactionInclude;
  }

  private accountSummarySelect() {
    return {
      id: true,
      code: true,
      name: true,
      nameAr: true,
      currencyCode: true,
    };
  }

  private normalizeReference(reference: string | undefined, prefix: string) {
    const trimmed = reference?.trim();
    if (trimmed) {
      return trimmed;
    }

    const compactDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase();
    return `${prefix}-${compactDate}-${suffix}`;
  }

  private buildJournalDescription(reference: string, description: string | null) {
    return description ? `${reference} - ${description}` : reference;
  }

  private toAmount(amount: number) {
    return Number(amount).toFixed(2);
  }

  private isReferenceUniqueConflict(error: unknown): error is Prisma.PrismaClientKnownRequestError {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002' &&
      Array.isArray(error.meta?.target) &&
      error.meta.target.includes('reference')
    );
  }
}
