import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { BankReconciliationStatus, BankStatementLineStatus, Prisma } from '../../../generated/prisma';

import { PrismaService } from '../../../common/prisma/prisma.service';
import {
  CreateBankReconciliationDto,
  CreateBankReconciliationMatchDto,
  CreateBankStatementLineDto,
} from './dto/create-bank-reconciliation.dto';
import { QueryBankReconciliationsDto } from './dto/query-bank-reconciliations.dto';

@Injectable()
export class BankReconciliationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: QueryBankReconciliationsDto = {}) {
    const rows = await this.prisma.bankReconciliation.findMany({
      where: {
        bankCashAccountId: query.bankCashAccountId,
        status: query.status,
        statementDate:
          query.dateFrom || query.dateTo
            ? {
                gte: query.dateFrom ? new Date(query.dateFrom) : undefined,
                lte: query.dateTo ? new Date(query.dateTo) : undefined,
              }
            : undefined,
      },
      include: {
        bankCashAccount: {
          include: {
            account: {
              select: this.accountSummarySelect(),
            },
          },
        },
        statementLines: {
          select: {
            id: true,
            status: true,
          },
        },
        matches: {
          select: {
            id: true,
            isReconciled: true,
          },
        },
      },
      orderBy: [{ statementDate: 'desc' }, { createdAt: 'desc' }],
    });

    return rows.map((row) => ({
      id: row.id,
      status: row.status,
      statementDate: row.statementDate.toISOString(),
      statementEndingBalance: row.statementEndingBalance.toString(),
      completedAt: row.completedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      bankCashAccount: this.mapBankCashAccountSummary(row.bankCashAccount),
      summary: {
        statementLineCount: row.statementLines.length,
        unmatchedStatementLineCount: row.statementLines.filter((line) => line.status === BankStatementLineStatus.UNMATCHED).length,
        matchedCount: row.matches.length,
        reconciledCount: row.matches.filter((match) => match.isReconciled).length,
      },
    }));
  }

  async create(dto: CreateBankReconciliationDto) {
    const bankCashAccount = await this.getActiveBankCashAccount(dto.bankCashAccountId);
    const created = await this.prisma.bankReconciliation.create({
      data: {
        bankCashAccountId: bankCashAccount.id,
        statementDate: new Date(dto.statementDate),
        statementEndingBalance: this.toAmount(dto.statementEndingBalance),
        notes: dto.notes?.trim() || null,
      },
      include: this.reconciliationInclude(),
    });

    return this.mapReconciliationDetail(created);
  }

  async getById(id: string) {
    const row = await this.getReconciliationOrThrow(id);
    return this.mapReconciliationDetail(row);
  }

  async addStatementLine(reconciliationId: string, dto: CreateBankStatementLineDto) {
    const reconciliation = await this.getReconciliationForMutation(reconciliationId);
    this.validateStatementAmounts(dto);

    await this.prisma.bankStatementLine.create({
      data: {
        reconciliationId: reconciliation.id,
        transactionDate: new Date(dto.transactionDate),
        reference: dto.reference?.trim() || null,
        description: dto.description?.trim() || null,
        debitAmount: this.toAmount(dto.debitAmount),
        creditAmount: this.toAmount(dto.creditAmount),
      },
    });

    return this.getById(reconciliation.id);
  }

  async importStatementLines(reconciliationId: string, lines: CreateBankStatementLineDto[]) {
    const reconciliation = await this.getReconciliationForMutation(reconciliationId);
    if (!lines.length) {
      throw new BadRequestException('At least one statement line is required for import.');
    }

    for (const line of lines) {
      this.validateStatementAmounts(line);
    }

    for (const line of lines) {
      await this.prisma.bankStatementLine.create({
        data: {
          reconciliationId: reconciliation.id,
          transactionDate: new Date(line.transactionDate),
          reference: line.reference?.trim() || null,
          description: line.description?.trim() || null,
          debitAmount: this.toAmount(line.debitAmount),
          creditAmount: this.toAmount(line.creditAmount),
        },
      });
    }

    return this.getById(reconciliation.id);
  }

  async createMatch(reconciliationId: string, dto: CreateBankReconciliationMatchDto) {
    const reconciliation = await this.getReconciliationForMutation(reconciliationId);
    const statementLine = await this.prisma.bankStatementLine.findUnique({
      where: { id: dto.statementLineId },
    });

    if (!statementLine || statementLine.reconciliationId !== reconciliation.id) {
      throw new BadRequestException('Statement line was not found for this reconciliation.');
    }

    const ledgerTransaction = await this.prisma.ledgerTransaction.findUnique({
      where: { id: dto.ledgerTransactionId },
      include: {
        journalEntry: {
          select: {
            id: true,
            reference: true,
          },
        },
        bankReconciliationMatches: {
          where: {
            isReconciled: true,
          },
        },
      },
    });

    if (!ledgerTransaction) {
      throw new BadRequestException('Ledger transaction was not found.');
    }

    if (ledgerTransaction.accountId !== reconciliation.bankCashAccount.accountId) {
      throw new BadRequestException('The selected system transaction does not belong to the linked bank/cash account.');
    }

    if (ledgerTransaction.bankReconciliationMatches.length > 0) {
      throw new ConflictException('The selected system transaction has already been reconciled.');
    }

    try {
      await this.prisma.bankReconciliationMatch.create({
        data: {
          reconciliationId: reconciliation.id,
          statementLineId: statementLine.id,
          ledgerTransactionId: ledgerTransaction.id,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('This statement line is already matched to the selected system transaction.');
      }
      throw error;
    }

    await this.prisma.bankStatementLine.update({
      where: { id: statementLine.id },
      data: {
        status: BankStatementLineStatus.MATCHED,
      },
    });

    return this.getById(reconciliation.id);
  }

  async deleteMatch(reconciliationId: string, matchId: string) {
    const reconciliation = await this.getReconciliationForMutation(reconciliationId);
    const match = await this.prisma.bankReconciliationMatch.findUnique({
      where: { id: matchId },
    });

    if (!match || match.reconciliationId !== reconciliation.id) {
      throw new BadRequestException('Reconciliation match was not found.');
    }

    await this.prisma.bankReconciliationMatch.delete({
      where: { id: match.id },
    });

    const remaining = await this.prisma.bankReconciliationMatch.count({
      where: {
        statementLineId: match.statementLineId,
      },
    });

    await this.prisma.bankStatementLine.update({
      where: { id: match.statementLineId },
      data: {
        status: remaining > 0 ? BankStatementLineStatus.MATCHED : BankStatementLineStatus.UNMATCHED,
      },
    });

    return this.getById(reconciliation.id);
  }

  async reconcileMatch(reconciliationId: string, matchId: string) {
    const reconciliation = await this.getReconciliationForMutation(reconciliationId);
    const match = await this.prisma.bankReconciliationMatch.findUnique({
      where: { id: matchId },
    });

    if (!match || match.reconciliationId !== reconciliation.id) {
      throw new BadRequestException('Reconciliation match was not found.');
    }

    await this.prisma.bankReconciliationMatch.update({
      where: { id: match.id },
      data: {
        isReconciled: true,
        reconciledAt: new Date(),
      },
    });

    await this.prisma.bankStatementLine.update({
      where: { id: match.statementLineId },
      data: {
        status: BankStatementLineStatus.RECONCILED,
      },
    });

    return this.getById(reconciliation.id);
  }

  async complete(id: string) {
    const reconciliation = await this.getReconciliationForMutation(id);
    const pendingMatches = await this.prisma.bankReconciliationMatch.count({
      where: {
        reconciliationId: reconciliation.id,
        isReconciled: false,
      },
    });

    if (pendingMatches > 0) {
      throw new BadRequestException('All matches must be marked reconciled before the reconciliation can be completed.');
    }

    const updated = await this.prisma.bankReconciliation.update({
      where: { id: reconciliation.id },
      data: {
        status: BankReconciliationStatus.COMPLETED,
        completedAt: new Date(),
      },
      include: this.reconciliationInclude(),
    });

    return this.mapReconciliationDetail(updated);
  }

  private async getReconciliationOrThrow(id: string) {
    const row = await this.prisma.bankReconciliation.findUnique({
      where: { id },
      include: this.reconciliationInclude(),
    });

    if (!row) {
      throw new BadRequestException(`Bank reconciliation ${id} was not found.`);
    }

    return row;
  }

  private async getReconciliationForMutation(id: string) {
    const row = await this.getReconciliationOrThrow(id);
    if (row.status === BankReconciliationStatus.COMPLETED) {
      throw new BadRequestException('Completed reconciliations cannot be edited.');
    }
    return row;
  }

  private async getActiveBankCashAccount(id: string) {
    const row = await this.prisma.bankCashAccount.findUnique({
      where: { id },
      include: {
        account: {
          select: {
            ...this.accountSummarySelect(),
            currentBalance: true,
            isActive: true,
            isPosting: true,
          },
        },
      },
    });

    if (!row) {
      throw new BadRequestException(`Bank/cash account ${id} was not found.`);
    }

    if (!row.isActive) {
      throw new BadRequestException('Deactivated bank/cash accounts cannot be reconciled.');
    }

    if (!row.account.isActive || !row.account.isPosting) {
      throw new BadRequestException('The linked chart-of-accounts record is not available for reconciliation.');
    }

    return row;
  }

  private async getUnmatchedSystemTransactions(
    reconciliation: Awaited<ReturnType<BankReconciliationsService['getReconciliationOrThrow']>>,
  ) {
    const rows = await this.prisma.ledgerTransaction.findMany({
      where: {
        accountId: reconciliation.bankCashAccount.accountId,
        bankReconciliationMatches: {
          none: {
            OR: [{ isReconciled: true }, { reconciliationId: reconciliation.id }],
          },
        },
      },
      orderBy: [{ entryDate: 'desc' }, { postedAt: 'desc' }],
      include: {
        journalEntry: {
          select: {
            id: true,
            reference: true,
          },
        },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      reference: row.reference,
      entryDate: row.entryDate.toISOString(),
      postedAt: row.postedAt.toISOString(),
      description: row.description,
      debitAmount: row.debitAmount.toString(),
      creditAmount: row.creditAmount.toString(),
      journalEntryId: row.journalEntryId,
      journalReference: row.journalEntry.reference,
    }));
  }

  private async mapReconciliationDetail(row: Awaited<ReturnType<BankReconciliationsService['getReconciliationOrThrow']>>) {
    const unmatchedSystemTransactions = await this.getUnmatchedSystemTransactions(row);
    const statementNet = row.statementLines.reduce((sum, line) => sum + Number(line.debitAmount) - Number(line.creditAmount), 0);

    return {
      id: row.id,
      status: row.status,
      statementDate: row.statementDate.toISOString(),
      statementEndingBalance: row.statementEndingBalance.toString(),
      notes: row.notes,
      completedAt: row.completedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      bankCashAccount: this.mapBankCashAccountSummary(row.bankCashAccount, row.bankCashAccount.account.currentBalance.toString()),
      statementLines: row.statementLines.map((line) => ({
        id: line.id,
        transactionDate: line.transactionDate.toISOString(),
        reference: line.reference,
        description: line.description,
        debitAmount: line.debitAmount.toString(),
        creditAmount: line.creditAmount.toString(),
        status: line.status,
        createdAt: line.createdAt.toISOString(),
        updatedAt: line.updatedAt.toISOString(),
        matches: line.matches.map((match) => ({
          id: match.id,
          isReconciled: match.isReconciled,
          matchedAt: match.matchedAt.toISOString(),
          reconciledAt: match.reconciledAt?.toISOString() ?? null,
          ledgerTransaction: {
            id: match.ledgerTransaction.id,
            reference: match.ledgerTransaction.reference,
            entryDate: match.ledgerTransaction.entryDate.toISOString(),
            postedAt: match.ledgerTransaction.postedAt.toISOString(),
            description: match.ledgerTransaction.description,
            debitAmount: match.ledgerTransaction.debitAmount.toString(),
            creditAmount: match.ledgerTransaction.creditAmount.toString(),
            journalEntryId: match.ledgerTransaction.journalEntryId,
            journalReference: match.ledgerTransaction.journalEntry.reference,
          },
        })),
      })),
      unmatchedSystemTransactions,
      summary: {
        statementLineCount: row.statementLines.length,
        unmatchedStatementLineCount: row.statementLines.filter((line) => line.status === BankStatementLineStatus.UNMATCHED).length,
        matchedStatementLineCount: row.statementLines.filter((line) => line.status === BankStatementLineStatus.MATCHED).length,
        reconciledStatementLineCount: row.statementLines.filter((line) => line.status === BankStatementLineStatus.RECONCILED).length,
        matchedCount: row.matches.length,
        reconciledCount: row.matches.filter((match) => match.isReconciled).length,
        statementNetAmount: statementNet.toFixed(2),
        systemBalance: row.bankCashAccount.account.currentBalance.toString(),
        statementEndingBalance: row.statementEndingBalance.toString(),
        balanceDifference: (Number(row.bankCashAccount.account.currentBalance) - Number(row.statementEndingBalance)).toFixed(2),
      },
    };
  }

  private reconciliationInclude() {
    return {
      bankCashAccount: {
        include: {
          account: {
            select: {
              ...this.accountSummarySelect(),
              currentBalance: true,
            },
          },
        },
      },
      statementLines: {
        orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }],
        include: {
          matches: {
            orderBy: [{ matchedAt: 'desc' }],
            include: {
              ledgerTransaction: {
                include: {
                  journalEntry: {
                    select: {
                      id: true,
                      reference: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      matches: {
        select: {
          id: true,
          isReconciled: true,
        },
      },
    } satisfies Prisma.BankReconciliationInclude;
  }

  private mapBankCashAccountSummary(
    row: {
      id: string;
      type: string;
      name: string;
      currencyCode: string;
      isActive: boolean;
      account: { id: string; code: string; name: string; currencyCode: string };
    },
    currentBalance?: string,
  ) {
    return {
      id: row.id,
      type: row.type,
      name: row.name,
      currencyCode: row.currencyCode,
      isActive: row.isActive,
      currentBalance: currentBalance ?? null,
      account: {
        id: row.account.id,
        code: row.account.code,
        name: row.account.name,
        currencyCode: row.account.currencyCode,
      },
    };
  }

  private validateStatementAmounts(dto: CreateBankStatementLineDto) {
    if (dto.debitAmount === 0 && dto.creditAmount === 0) {
      throw new BadRequestException('Statement line must include either a debit amount or a credit amount.');
    }

    if (dto.debitAmount > 0 && dto.creditAmount > 0) {
      throw new BadRequestException('Statement line cannot contain both debit and credit amounts.');
    }
  }

  private accountSummarySelect() {
    return {
      id: true,
      code: true,
      name: true,
      currencyCode: true,
    };
  }

  private toAmount(amount: number) {
    return Number(amount).toFixed(2);
  }
}
