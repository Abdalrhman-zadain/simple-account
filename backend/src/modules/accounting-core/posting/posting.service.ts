import { Injectable } from '@nestjs/common';
import { PrismaClient } from '../../../generated/prisma/index';

import { PrismaService } from '../../../common/prisma/prisma.service';
import { JournalEntriesService } from '../journal-entries/journal-entries.service';
import { InvalidJournalEntryException, JournalEntryNotFoundException } from '../shared/accounting-errors';

type TransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

@Injectable()
export class PostingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly journalEntriesService: JournalEntriesService,
  ) {}

  async post(entryId: string) {
    return this.prisma.$transaction(async (tx) => {
      const entry = await tx.journalEntry.findUnique({
        where: { id: entryId },
        include: { lines: { orderBy: { lineNumber: 'asc' } } },
      });

      if (!entry) {
        throw new JournalEntryNotFoundException(entryId);
      }

      this.journalEntriesService.ensureDraft(entry);
      this.journalEntriesService.validateLines(
        entry.lines.map((line) => ({
          accountId: line.accountId,
          description: line.description ?? undefined,
          debitAmount: Number(line.debitAmount),
          creditAmount: Number(line.creditAmount),
        })),
      );
      await this.validatePostingAccounts(tx, entry.lines.map((line) => line.accountId));

      const postedAt = new Date();
      const batch = await tx.postingBatch.create({
        data: {
          postedAt,
        },
      });

      await tx.ledgerTransaction.createMany({
        data: entry.lines.map((line) => ({
          postingBatchId: batch.id,
          journalEntryId: entry.id,
          journalEntryLineId: line.id,
          accountId: line.accountId,
          reference: entry.reference,
          entryDate: entry.entryDate,
          postedAt,
          description: line.description ?? entry.description,
          debitAmount: line.debitAmount,
          creditAmount: line.creditAmount,
        })),
      });

      const updated = await tx.journalEntry.update({
        where: { id: entry.id },
        data: {
          status: 'POSTED',
          postedAt,
          postingBatchId: batch.id,
        },
        include: { lines: { orderBy: { lineNumber: 'asc' } } },
      });

      return {
        id: updated.id,
        reference: updated.reference,
        status: updated.status,
        entryDate: updated.entryDate.toISOString(),
        description: updated.description,
        postedAt: updated.postedAt?.toISOString() ?? null,
        postingBatchId: updated.postingBatchId,
        lines: updated.lines.map((line) => ({
          id: line.id,
          accountId: line.accountId,
          description: line.description,
          lineNumber: line.lineNumber,
          debitAmount: line.debitAmount.toString(),
          creditAmount: line.creditAmount.toString(),
        })),
      };
    });
  }

  private async validatePostingAccounts(tx: TransactionClient, accountIds: string[]) {
    const uniqueAccountIds = [...new Set(accountIds)];
    const accounts = await tx.account.findMany({
      where: { id: { in: uniqueAccountIds } },
    });

    const foundIds = new Set(accounts.map((account) => account.id));
    const missingAccount = uniqueAccountIds.find((accountId) => !foundIds.has(accountId));

    if (missingAccount) {
      throw new InvalidJournalEntryException(`Account ${missingAccount} does not exist.`);
    }

    const inactiveAccount = accounts.find((account) => !account.isActive);

    if (inactiveAccount) {
      throw new InvalidJournalEntryException(`Account ${inactiveAccount.id} is inactive.`);
    }
  }
}
