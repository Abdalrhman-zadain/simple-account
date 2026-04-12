import { Injectable } from '@nestjs/common';
import { JournalEntry, JournalEntryLine, JournalEntryStatus, Prisma } from '../../../../generated/prisma/index';

import { PrismaService } from '../../../../common/prisma/prisma.service';
import {
  JournalEntryAlreadyReversedException,
  InvalidJournalEntryException,
  JournalEntryAlreadyPostedException,
  JournalEntryNotFoundException,
  JournalEntryNotPostedException,
} from '../validation-rules/accounting-errors';
import { toAmountString } from '../validation-rules/decimal.util';
import { ReferenceService } from '../validation-rules/reference.service';
import { CreateJournalEntryDto, JournalEntryLineDto, UpdateJournalEntryDto } from './dto/journal-entry-line.dto';
import { JournalEntryResponse } from './journal-entry-response';

type EntryWithLines = JournalEntry & { lines: JournalEntryLine[] };

@Injectable()
export class JournalEntriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly referenceService: ReferenceService,
  ) { }

  async create(dto: CreateJournalEntryDto): Promise<JournalEntryResponse> {
    this.validateLines(dto.lines);
    await this.ensureAccountsArePostable(dto.lines);

    const entryDate = new Date(dto.entryDate);
    const period = await this.resolveFiscalPeriod(entryDate);

    const created = await this.prisma.journalEntry.create({
      data: {
        reference: this.referenceService.generateJournalEntryReference(entryDate),
        entryDate,
        description: dto.description,
        fiscalPeriodId: period?.id,
        lines: {
          create: dto.lines.map((line, index) => this.mapLineCreateInput(line, index)),
        },
      },
    });

    return this.getById(created.id);
  }

  async list(filters?: {
    status?: JournalEntryStatus;
    dateFrom?: string;
    dateTo?: string;
    reference?: string;
  }): Promise<JournalEntryResponse[]> {
    const entries = await this.prisma.journalEntry.findMany({
      where: {
        status: filters?.status,
        reference: filters?.reference
          ? { contains: filters.reference, mode: 'insensitive' }
          : undefined,
        entryDate:
          filters?.dateFrom || filters?.dateTo
            ? {
              gte: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
              lte: filters.dateTo ? new Date(filters.dateTo) : undefined,
            }
            : undefined,
      },
      include: { lines: { orderBy: { lineNumber: 'asc' } } },
      orderBy: [{ entryDate: 'desc' }, { createdAt: 'desc' }],
    });

    return entries.map((entry) => this.toResponse(entry));
  }

  async getById(id: string): Promise<JournalEntryResponse> {
    const entry = await this.prisma.journalEntry.findUnique({
      where: { id },
      include: { lines: { orderBy: { lineNumber: 'asc' } } },
    });

    if (!entry) {
      throw new JournalEntryNotFoundException(id);
    }

    return this.toResponse(entry);
  }

  async update(id: string, dto: UpdateJournalEntryDto): Promise<JournalEntryResponse> {
    const existing = await this.getEntryOrThrow(id);
    this.ensureDraft(existing);

    if (dto.lines) {
      this.validateLines(dto.lines);
      await this.ensureAccountsAreActive(dto.lines);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.lines) {
        await tx.journalEntryLine.deleteMany({
          where: { journalEntryId: id },
        });
      }

      return tx.journalEntry.update({
        where: { id },
        data: {
          entryDate: dto.entryDate ? new Date(dto.entryDate) : undefined,
          description: dto.description,
          lines: dto.lines
            ? {
              create: dto.lines.map((line, index) => this.mapLineCreateInput(line, index)),
            }
            : undefined,
        },
      });
    });

    return this.getById(updated.id);
  }

  async getEntryOrThrow(id: string) {
    const entry = await this.prisma.journalEntry.findUnique({
      where: { id },
      include: { lines: { orderBy: { lineNumber: 'asc' } } },
    });

    if (!entry) {
      throw new JournalEntryNotFoundException(id);
    }

    return entry;
  }

  ensureDraft(entry: EntryWithLines) {
    if (entry.status === JournalEntryStatus.POSTED) {
      throw new JournalEntryAlreadyPostedException(entry.id);
    }
  }

  async ensurePosted(entry: EntryWithLines) {
    if (entry.status !== JournalEntryStatus.POSTED) {
      throw new JournalEntryNotPostedException(entry.id);
    }

    const existingReversal = await this.prisma.journalEntry.findFirst({
      where: { reversalOfId: entry.id },
      select: { id: true },
    });

    if (existingReversal) {
      throw new JournalEntryAlreadyReversedException(entry.id);
    }
  }

  validateLines(lines: JournalEntryLineDto[]) {
    if (lines.length < 2) {
      throw new InvalidJournalEntryException('A journal entry requires at least two lines.');
    }

    let debitTotal = 0;
    let creditTotal = 0;

    for (const [index, line] of lines.entries()) {
      const linePosition = index + 1;

      if (line.debitAmount > 0 && line.creditAmount > 0) {
        throw new InvalidJournalEntryException(
          `Line ${linePosition} cannot contain both a debit and a credit amount.`,
        );
      }

      if (line.debitAmount === 0 && line.creditAmount === 0) {
        throw new InvalidJournalEntryException(
          `Line ${linePosition} must contain either a debit or a credit amount.`,
        );
      }

      debitTotal += line.debitAmount;
      creditTotal += line.creditAmount;
    }

    if (Number((debitTotal - creditTotal).toFixed(2)) !== 0) {
      throw new InvalidJournalEntryException('Journal entry is not balanced.');
    }
  }

  async ensureAccountsArePostable(lines: JournalEntryLineDto[]) {
    const accountIds = [...new Set(lines.map((line) => line.accountId))];
    const accounts = await this.prisma.account.findMany({
      where: { id: { in: accountIds } },
    });

    if (accounts.length !== accountIds.length) {
      const foundIds = new Set(accounts.map((account) => account.id));
      const missingId = accountIds.find((accountId) => !foundIds.has(accountId));
      throw new InvalidJournalEntryException(`Account ${missingId} does not exist.`);
    }

    for (const account of accounts) {
      if (!account.isActive) {
        throw new InvalidJournalEntryException(`Account "${account.name}" is inactive and cannot be used for posting.`);
      }
      if (!account.isPosting) {
        throw new InvalidJournalEntryException(`Account "${account.name}" is a Header account and cannot receive journal entries.`);
      }
      if (!account.allowManualPosting) {
        throw new InvalidJournalEntryException(`Account "${account.name}" does not allow manual posting.`);
      }
    }
  }

  // Keep the old method name as an alias for backward compatibility
  async ensureAccountsAreActive(lines: JournalEntryLineDto[]) {
    return this.ensureAccountsArePostable(lines);
  }

  private async resolveFiscalPeriod(date: Date) {
    const period = await this.prisma.fiscalPeriod.findFirst({
      where: {
        startDate: { lte: date },
        endDate: { gte: date },
      },
    });

    if (period && (period.status === 'CLOSED' || period.status === 'LOCKED')) {
      throw new InvalidJournalEntryException(
        `The fiscal period "${period.name}" is ${period.status.toLowerCase()}. Posting is not allowed.`
      );
    }

    return period;
  }

  private mapLineCreateInput(line: JournalEntryLineDto, index: number): Prisma.JournalEntryLineUncheckedCreateWithoutJournalEntryInput {
    return {
      accountId: line.accountId,
      lineNumber: index + 1,
      description: line.description,
      debitAmount: toAmountString(line.debitAmount),
      creditAmount: toAmountString(line.creditAmount),
    };
  }

  toResponse(entry: EntryWithLines & { reversalOfId?: string | null }): JournalEntryResponse {
    return {
      id: entry.id,
      reference: entry.reference,
      status: entry.status,
      entryDate: entry.entryDate.toISOString(),
      description: entry.description,
      postedAt: entry.postedAt?.toISOString() ?? null,
      postingBatchId: entry.postingBatchId ?? null,
      reversalOfId: entry.reversalOfId ?? null,
      lines: entry.lines.map((line) => ({
        id: line.id,
        accountId: line.accountId,
        description: line.description,
        lineNumber: line.lineNumber,
        debitAmount: line.debitAmount.toString(),
        creditAmount: line.creditAmount.toString(),
      })),
    };
  }
}
