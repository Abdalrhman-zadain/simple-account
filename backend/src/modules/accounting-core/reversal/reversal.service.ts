import { Injectable } from '@nestjs/common';
import { PrismaClient } from '../../../generated/prisma/index';

import { PrismaService } from '../../../common/prisma/prisma.service';
import { ReverseJournalEntryDto } from '../journal-entries/dto/reverse-journal-entry.dto';
import { JournalEntriesService } from '../journal-entries/journal-entries.service';
import { InvalidJournalEntryException, JournalEntryNotFoundException } from '../shared/accounting-errors';
import { ReferenceService } from '../shared/reference.service';

type TransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

@Injectable()
export class ReversalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly journalEntriesService: JournalEntriesService,
    private readonly referenceService: ReferenceService,
  ) {}

  async reverse(entryId: string, dto: ReverseJournalEntryDto) {
    const reversedEntryId = await this.prisma.$transaction(async (tx) => {
      const entry = await tx.journalEntry.findUnique({
        where: { id: entryId },
        include: {
          lines: { orderBy: { lineNumber: 'asc' } },
        },
      });

      if (!entry) {
        throw new JournalEntryNotFoundException(entryId);
      }

      await this.journalEntriesService.ensurePosted(entry);
      await this.validatePostingAccounts(tx, entry.lines.map((line) => line.accountId));

      const reversalDate = dto.reversalDate ? new Date(dto.reversalDate) : new Date();
      const postedAt = new Date();
      const batch = await tx.postingBatch.create({
        data: { postedAt },
      });

      const reversedEntry = await tx.journalEntry.create({
        data: {
          reference: this.referenceService.generateJournalEntryReference(reversalDate),
          entryDate: reversalDate,
          description:
            dto.description ??
            `Reversal of ${entry.reference}${entry.description ? `: ${entry.description}` : ''}`,
          status: 'POSTED',
          postedAt,
          postingBatchId: batch.id,
          reversalOfId: entry.id,
          lines: {
            create: entry.lines.map((line, index) => ({
              accountId: line.accountId,
              lineNumber: index + 1,
              description: `Reversal of line ${line.lineNumber}`,
              debitAmount: line.creditAmount,
              creditAmount: line.debitAmount,
            })),
          },
        },
      });

      const reversalLines = await tx.journalEntryLine.findMany({
        where: { journalEntryId: reversedEntry.id },
        orderBy: { lineNumber: 'asc' },
      });

      await tx.ledgerTransaction.createMany({
        data: reversalLines.map((line) => ({
          postingBatchId: batch.id,
          journalEntryId: reversedEntry.id,
          journalEntryLineId: line.id,
          accountId: line.accountId,
          reference: reversedEntry.reference,
          entryDate: reversedEntry.entryDate,
          postedAt,
          description: line.description ?? reversedEntry.description,
          debitAmount: line.debitAmount,
          creditAmount: line.creditAmount,
        })),
      });

      await this.updateAccountBalances(tx, reversalLines);

      return reversedEntry.id;
    });

    return this.journalEntriesService.getById(reversedEntryId);
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

  private async updateAccountBalances(
    tx: TransactionClient,
    lines: Array<{ accountId: string; debitAmount: { toString(): string }; creditAmount: { toString(): string } }>,
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
