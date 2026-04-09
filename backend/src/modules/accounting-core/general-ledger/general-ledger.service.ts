import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../common/prisma/prisma.service';
import { JournalEntryNotFoundException } from '../shared/accounting-errors';
import { QueryLedgerDto } from './dto/query-ledger.dto';

@Injectable()
export class GeneralLedgerService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: QueryLedgerDto) {
    const lines = await this.prisma.ledgerTransaction.findMany({
      where: {
        accountId: query.accountId,
        entryDate:
          query.dateFrom || query.dateTo
            ? {
                gte: query.dateFrom ? new Date(query.dateFrom) : undefined,
                lte: query.dateTo ? new Date(query.dateTo) : undefined,
              }
            : undefined,
      },
      include: {
        account: true,
      },
      orderBy: [{ entryDate: 'asc' }, { createdAt: 'asc' }],
    });

    const runningBalances = new Map<string, number>();

    return lines.map((line) => {
      const previousBalance = runningBalances.get(line.accountId) ?? 0;
      const nextBalance = previousBalance + Number(line.debitAmount) - Number(line.creditAmount);
      runningBalances.set(line.accountId, nextBalance);

      return {
        id: line.id,
        reference: line.reference,
        journalEntryId: line.journalEntryId,
        journalEntryLineId: line.journalEntryLineId,
        postingBatchId: line.postingBatchId,
        accountId: line.accountId,
        accountCode: line.account.code,
        accountName: line.account.name,
        entryDate: line.entryDate.toISOString(),
        postedAt: line.postedAt.toISOString(),
        description: line.description,
        debitAmount: line.debitAmount.toString(),
        creditAmount: line.creditAmount.toString(),
        runningBalance: nextBalance.toFixed(2),
      };
    });
  }

  async getTransactionDetail(id: string) {
    const line = await this.prisma.ledgerTransaction.findUnique({
      where: { id },
      include: {
        account: true,
        journalEntry: {
          include: {
            lines: {
              orderBy: { lineNumber: 'asc' },
            },
          },
        },
      },
    });

    if (!line) {
      throw new JournalEntryNotFoundException(id);
    }

    return {
      id: line.id,
      reference: line.reference,
      accountId: line.accountId,
      accountCode: line.account.code,
      accountName: line.account.name,
      entryDate: line.entryDate.toISOString(),
      postedAt: line.postedAt.toISOString(),
      description: line.description,
      debitAmount: line.debitAmount.toString(),
      creditAmount: line.creditAmount.toString(),
      journalEntry: {
        id: line.journalEntry.id,
        reference: line.journalEntry.reference,
        description: line.journalEntry.description,
        entryDate: line.journalEntry.entryDate.toISOString(),
        postedAt: line.journalEntry.postedAt?.toISOString() ?? null,
        lines: line.journalEntry.lines.map((entryLine) => ({
          id: entryLine.id,
          lineNumber: entryLine.lineNumber,
          accountId: entryLine.accountId,
          description: entryLine.description,
          debitAmount: entryLine.debitAmount.toString(),
          creditAmount: entryLine.creditAmount.toString(),
        })),
      },
    };
  }
}
