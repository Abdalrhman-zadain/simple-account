import { BadRequestException, Injectable } from '@nestjs/common';
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
type JournalDb = Prisma.TransactionClient | PrismaService;

@Injectable()
export class JournalEntriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly referenceService: ReferenceService,
  ) { }

  async create(dto: CreateJournalEntryDto, options?: { tx?: JournalDb }): Promise<JournalEntryResponse> {
    const db = options?.tx ?? this.prisma;
    this.validateLines(dto.lines);
    await this.ensureAccountsArePostable(dto.lines);
    const nextTypeId = dto.journalEntryTypeId ?? null;
    if (nextTypeId) {
      await this.ensureJournalEntryTypeIsActive(nextTypeId);
    }

    const entryDate = new Date(dto.entryDate);
    const period = await this.resolveFiscalPeriod(entryDate, db);

    const created = await db.journalEntry.create({
      data: {
        reference: this.referenceService.generateJournalEntryReference(entryDate),
        entryDate,
        description: dto.description,
        journalEntryTypeId: nextTypeId,
        fiscalPeriodId: period?.id,
        sourceType: dto.sourceType,
        sourceId: dto.sourceId,
        sourceNumber: dto.sourceNumber,
        customerId: dto.customerId,
        currencyCode: dto.currencyCode,
        lines: {
          create: dto.lines.map((line, index) => this.mapLineCreateInput(line, index)),
        },
      },
    });

    return this.getById(created.id, db);
  }

  async list(filters?: {
    status?: JournalEntryStatus;
    dateFrom?: string;
    dateTo?: string;
    reference?: string;
    search?: string;
    journalEntryTypeId?: string;
  }, options?: { includeLines?: boolean }): Promise<JournalEntryResponse[]> {
    const search = filters?.search?.trim();
    const includeLines = options?.includeLines ?? true;
    const entries = await this.prisma.journalEntry.findMany({
      where: {
        status: filters?.status,
        journalEntryTypeId: filters?.journalEntryTypeId,
        reference: filters?.reference
          ? { contains: filters.reference, mode: 'insensitive' }
          : undefined,
        OR: search
          ? [
            { reference: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ]
          : undefined,
        entryDate:
          filters?.dateFrom || filters?.dateTo
            ? {
              gte: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
              lte: filters.dateTo ? new Date(filters.dateTo) : undefined,
            }
            : undefined,
      },
      include: {
        lines: includeLines ? { include: { account: { select: { code: true, name: true, nameAr: true } } }, orderBy: { lineNumber: 'asc' } } : false,
        journalEntryType: { select: { id: true, name: true } },
      },
      orderBy: [{ entryDate: 'desc' }, { createdAt: 'desc' }],
    });

    return entries.map((entry) => this.toResponse(entry as EntryWithLines & { reversalOfId?: string | null }, { includeLines }));
  }

  async getById(id: string, db: JournalDb = this.prisma): Promise<JournalEntryResponse> {
    const entry = await db.journalEntry.findUnique({
      where: { id },
      include: {
        lines: { include: { account: { select: { code: true, name: true, nameAr: true } } }, orderBy: { lineNumber: 'asc' } },
        journalEntryType: { select: { id: true, name: true } },
      },
    });

    if (!entry) {
      throw new JournalEntryNotFoundException(id);
    }

    return this.toResponse(entry);
  }

  async update(id: string, dto: UpdateJournalEntryDto): Promise<JournalEntryResponse> {
    const existing = await this.getEntryOrThrow(id);
    this.ensureDraft(existing);

    const nextTypeId = dto.journalEntryTypeId === undefined ? existing.journalEntryTypeId ?? null : dto.journalEntryTypeId;
    if (nextTypeId) {
      await this.ensureJournalEntryTypeIsActive(nextTypeId);
    }

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
          journalEntryTypeId: dto.journalEntryTypeId === undefined ? undefined : dto.journalEntryTypeId,
          description: dto.description,
          sourceType: dto.sourceType,
          sourceId: dto.sourceId,
          sourceNumber: dto.sourceNumber,
          customerId: dto.customerId,
          currencyCode: dto.currencyCode,
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
      include: {
        lines: { include: { account: { select: { code: true, name: true, nameAr: true } } }, orderBy: { lineNumber: 'asc' } },
        journalEntryType: { select: { id: true, name: true } },
      },
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
      const debitAmount = Number(Number(line.debitAmount).toFixed(2));
      const creditAmount = Number(Number(line.creditAmount).toFixed(2));

      if (debitAmount > 0 && creditAmount > 0) {
        throw new InvalidJournalEntryException(
          `Line ${linePosition} cannot contain both a debit and a credit amount.`,
        );
      }

      if (debitAmount === 0 && creditAmount === 0) {
        throw new InvalidJournalEntryException(
          `Line ${linePosition} must contain either a debit or a credit amount.`,
        );
      }

      debitTotal += debitAmount;
      creditTotal += creditAmount;
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

  private async resolveFiscalPeriod(date: Date, db: JournalDb = this.prisma) {
    const period = await db.fiscalPeriod.findFirst({
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

  toResponse(
    entry: EntryWithLines & { reversalOfId?: string | null },
    options?: { includeLines?: boolean },
  ): JournalEntryResponse {
    const includeLines = options?.includeLines ?? true;

    return {
      id: entry.id,
      reference: entry.reference,
      status: entry.status,
      entryDate: entry.entryDate.toISOString(),
      sourceType: entry.sourceType ?? null,
      sourceId: entry.sourceId ?? null,
      sourceNumber: entry.sourceNumber ?? null,
      customerId: entry.customerId ?? null,
      currencyCode: entry.currencyCode ?? null,
      journalEntryTypeId: entry.journalEntryTypeId ?? null,
      journalEntryType: (entry as any).journalEntryType ?? null,
      description: entry.description,
      postedAt: entry.postedAt?.toISOString() ?? null,
      postingBatchId: entry.postingBatchId ?? null,
      reversalOfId: entry.reversalOfId ?? null,
      lines: includeLines
        ? entry.lines.map((line) => ({
          id: line.id,
          accountId: line.accountId,
          accountCode: (line as any).account?.code,
          accountName: (line as any).account?.name,
          accountNameAr: (line as any).account?.nameAr ?? null,
          description: line.description,
          lineNumber: line.lineNumber,
          debitAmount: line.debitAmount.toString(),
          creditAmount: line.creditAmount.toString(),
        }))
        : [],
    };
  }

  private async ensureJournalEntryTypeIsActive(id: string) {
    const row = await this.prisma.journalEntryType.findFirst({
      where: { id, isActive: true },
      select: { id: true },
    });
    if (!row) {
      throw new BadRequestException('Unknown or inactive journal entry type.');
    }
  }
}
