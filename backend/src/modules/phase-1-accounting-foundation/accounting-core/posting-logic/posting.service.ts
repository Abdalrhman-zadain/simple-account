import { Injectable } from '@nestjs/common';
import { PrismaClient } from '../../../../generated/prisma/index';

import { PrismaService } from '../../../../common/prisma/prisma.service';
import { JournalEntriesService } from '../journal-entries/journal-entries.service';
import { InvalidJournalEntryException, JournalEntryNotFoundException } from '../validation-rules/accounting-errors';

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
    const postedEntryId = await this.prisma.$transaction(async (tx) => {
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

      await this.updateAccountBalances(tx, entry.lines);

      const updated = await tx.journalEntry.update({
        where: { id: entry.id },
        data: {
          status: 'POSTED',
          postedAt,
          postingBatchId: batch.id,
        },
      });

      return updated.id;
    });

    return this.journalEntriesService.getById(postedEntryId);
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

    const headerAccount = accounts.find((account) => !account.isPosting);

    if (headerAccount) {
      throw new InvalidJournalEntryException(`Account ${headerAccount.id} is a header account and cannot receive journal entries.`);
    }

    const manualPostingDisabled = accounts.find((account) => account.allowManualPosting === false);

    if (manualPostingDisabled) {
      throw new InvalidJournalEntryException(`Account ${manualPostingDisabled.id} does not allow manual posting.`);
    }
  }

  private async updateAccountBalances(
    tx: TransactionClient,
    lines: Array<{ accountId: string; debitAmount: { toString(): string } | number; creditAmount: { toString(): string } | number }>,
  ) {
    const netByAccount = new Map<string, number>();

    for (const line of lines) {
      const current = netByAccount.get(line.accountId) ?? 0;
      const next =
        current + Number(line.debitAmount.toString()) - Number(line.creditAmount.toString());
      netByAccount.set(line.accountId, next);
    }

    for (const [accountId, amount] of netByAccount.entries()) {
      if (amount >= 0) {
        await tx.account.update({
          where: { id: accountId },
          data: { currentBalance: { increment: amount.toFixed(2) } },
        });
      } else {
        await tx.account.update({
          where: { id: accountId },
          data: { currentBalance: { decrement: Math.abs(amount).toFixed(2) } },
        });
      }
    }
  }
}
