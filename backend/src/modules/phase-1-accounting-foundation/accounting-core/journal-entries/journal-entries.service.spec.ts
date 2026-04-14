import { JournalEntryStatus } from '../../../../generated/prisma/index';

import { JournalEntriesService } from './journal-entries.service';

describe('JournalEntriesService', () => {
  const prisma = {
    account: {
      findMany: jest.fn(),
    },
    journalEntry: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    journalEntryLine: {
      deleteMany: jest.fn(),
    },
    fiscalPeriod: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const referenceService = {
    generateJournalEntryReference: jest.fn().mockReturnValue('JE-20260409-TESTREF'),
  };

  let service: JournalEntriesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new JournalEntriesService(prisma as never, referenceService);
  });

  it('creates a balanced draft journal entry', async () => {
    prisma.account.findMany.mockResolvedValue([
      { id: 'cash', name: 'Cash', isActive: true, isPosting: true, allowManualPosting: true },
      { id: 'revenue', name: 'Revenue', isActive: true, isPosting: true, allowManualPosting: true },
    ]);
    prisma.fiscalPeriod.findFirst.mockResolvedValue({ id: 'period-1', isActive: true });
    prisma.journalEntry.create.mockResolvedValue({
      id: 'entry-1',
    });
    prisma.journalEntry.findUnique.mockResolvedValue({
      id: 'entry-1',
      reference: 'JE-20260409-TESTREF',
      status: JournalEntryStatus.DRAFT,
      entryDate: new Date('2026-04-09T00:00:00.000Z'),
      description: 'Initial entry',
      postedAt: null,
      postingBatchId: null,
      lines: [
        {
          id: 'line-1',
          accountId: 'cash',
          description: 'Debit cash',
          lineNumber: 1,
          debitAmount: { toString: () => '100.00' },
          creditAmount: { toString: () => '0.00' },
        },
        {
          id: 'line-2',
          accountId: 'revenue',
          description: 'Credit revenue',
          lineNumber: 2,
          debitAmount: { toString: () => '0.00' },
          creditAmount: { toString: () => '100.00' },
        },
      ],
    });

    const result = await service.create({
      entryDate: '2026-04-09',
      description: 'Initial entry',
      lines: [
        { accountId: 'cash', description: 'Debit cash', debitAmount: 100, creditAmount: 0 },
        { accountId: 'revenue', description: 'Credit revenue', debitAmount: 0, creditAmount: 100 },
      ],
    });

    expect(prisma.journalEntry.create).toHaveBeenCalled();
    expect(result.status).toBe('DRAFT');
    expect(result.lines).toHaveLength(2);
  });

  it('rejects an unbalanced journal entry', async () => {
    await expect(
      service.create({
        entryDate: '2026-04-09',
        description: 'Broken entry',
        lines: [
          { accountId: 'cash', debitAmount: 100, creditAmount: 0 },
          { accountId: 'revenue', debitAmount: 0, creditAmount: 90 },
        ],
      }),
    ).rejects.toThrow('Journal entry is not balanced.');
  });

  it('rejects inactive accounts', async () => {
    prisma.account.findMany.mockResolvedValue([
      { id: 'cash', name: 'Cash', isActive: false, isPosting: true, allowManualPosting: true },
      { id: 'revenue', name: 'Revenue', isActive: true, isPosting: true, allowManualPosting: true },
    ]);

    await expect(
      service.create({
        entryDate: '2026-04-09',
        lines: [
          { accountId: 'cash', debitAmount: 100, creditAmount: 0 },
          { accountId: 'revenue', debitAmount: 0, creditAmount: 100 },
        ],
      }),
    ).rejects.toThrow('Account "Cash" is inactive and cannot be used for posting.');
  });

  it('can list journal entries without loading lines', async () => {
    prisma.journalEntry.findMany.mockResolvedValue([
      {
        id: 'entry-1',
        reference: 'JE-20260409-TESTREF',
        status: JournalEntryStatus.DRAFT,
        entryDate: new Date('2026-04-09T00:00:00.000Z'),
        description: 'Initial entry',
        postedAt: null,
        postingBatchId: null,
        reversalOfId: null,
        journalEntryTypeId: null,
        journalEntryType: null,
      },
    ]);

    const result = await service.list({}, { includeLines: false });

    expect(prisma.journalEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          lines: false,
        }),
      }),
    );
    expect(result).toEqual([
      expect.objectContaining({
        id: 'entry-1',
        lines: [],
      }),
    ]);
  });

  it('rounds high-precision amounts to 2 decimal places before validation', async () => {
    prisma.account.findMany.mockResolvedValue([
      { id: 'cash', name: 'Cash', isActive: true, isPosting: true, allowManualPosting: true },
      { id: 'revenue', name: 'Revenue', isActive: true, isPosting: true, allowManualPosting: true },
    ]);
    prisma.fiscalPeriod.findFirst.mockResolvedValue({ id: 'period-1', isActive: true });
    prisma.journalEntry.create.mockResolvedValue({ id: 'entry-1' });
    prisma.journalEntry.findUnique.mockResolvedValue({
      id: 'entry-1',
      reference: 'JE-20260409-TEST',
      status: JournalEntryStatus.DRAFT,
      entryDate: new Date('2026-04-09T00:00:00.000Z'),
      description: 'Test entry',
      lines: [],
    });

    // Debit 100.004, Credit 100.006. 
    // Before fix: diff = -0.002, toFixed(2) is "0.00", PASS.
    // After fix: 100.00 - 100.01 = -0.01, toFixed(2) is "-0.01", FAIL.
    await expect(
      service.create({
        entryDate: '2026-04-09',
        lines: [
          { accountId: 'cash', debitAmount: 100.004, creditAmount: 0 },
          { accountId: 'revenue', debitAmount: 0, creditAmount: 100.006 },
        ],
      }),
    ).rejects.toThrow('Journal entry is not balanced.');
  });
});
