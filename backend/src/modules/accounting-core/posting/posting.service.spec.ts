import { JournalEntryStatus } from '../../../generated/prisma/index';

import { PostingService } from './posting.service';

describe('PostingService', () => {
  const tx = {
    journalEntry: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    postingBatch: {
      create: jest.fn(),
    },
    ledgerTransaction: {
      createMany: jest.fn(),
    },
    account: {
      findMany: jest.fn(),
    },
  };

  const prisma = {
    $transaction: jest.fn(async (callback: (transaction: typeof tx) => Promise<unknown>) => callback(tx)),
  };

  const journalEntriesService = {
    getEntryOrThrow: jest.fn(),
    ensureDraft: jest.fn(),
    validateLines: jest.fn(),
  };

  let service: PostingService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PostingService(prisma as never, journalEntriesService as never);
  });

  it('posts a draft journal entry atomically', async () => {
    tx.journalEntry.findUnique.mockResolvedValue({
      id: 'entry-1',
      reference: 'JE-20260409-TEST',
      status: JournalEntryStatus.DRAFT,
      entryDate: new Date('2026-04-09T00:00:00.000Z'),
      description: 'Entry to post',
      lines: [
        {
          id: 'line-1',
          accountId: 'cash',
          description: 'Debit cash',
          lineNumber: 1,
          debitAmount: 100,
          creditAmount: 0,
        },
        {
          id: 'line-2',
          accountId: 'revenue',
          description: 'Credit revenue',
          lineNumber: 2,
          debitAmount: 0,
          creditAmount: 100,
        },
      ],
    });
    tx.account.findMany.mockResolvedValue([
      { id: 'cash', isActive: true },
      { id: 'revenue', isActive: true },
    ]);
    tx.postingBatch.create.mockResolvedValue({ id: 'batch-1' });
    tx.ledgerTransaction.createMany.mockResolvedValue({ count: 2 });
    tx.journalEntry.update.mockResolvedValue({
      id: 'entry-1',
      reference: 'JE-20260409-TEST',
      status: JournalEntryStatus.POSTED,
      entryDate: new Date('2026-04-09T00:00:00.000Z'),
      description: 'Entry to post',
      postedAt: new Date('2026-04-09T01:00:00.000Z'),
      postingBatchId: 'batch-1',
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

    const result = await service.post('entry-1');

    expect(tx.postingBatch.create).toHaveBeenCalled();
    expect(tx.ledgerTransaction.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({
            accountId: 'cash',
            reference: 'JE-20260409-TEST',
          }),
        ]),
      }),
    );
    expect(result.status).toBe('POSTED');
    expect(result.postingBatchId).toBe('batch-1');
  });

  it('does not create ledger rows when validation fails', async () => {
    tx.journalEntry.findUnique.mockResolvedValue({
      id: 'entry-2',
      reference: 'JE-20260409-BAD',
      status: JournalEntryStatus.DRAFT,
      entryDate: new Date('2026-04-09T00:00:00.000Z'),
      description: 'Bad entry',
      lines: [
        {
          id: 'line-1',
          accountId: 'cash',
          description: 'Debit cash',
          lineNumber: 1,
          debitAmount: 100,
          creditAmount: 0,
        },
      ],
    });
    journalEntriesService.validateLines.mockImplementation(() => {
      throw new Error('A journal entry requires at least two lines.');
    });

    await expect(service.post('entry-2')).rejects.toThrow('A journal entry requires at least two lines.');
    expect(tx.postingBatch.create).not.toHaveBeenCalled();
    expect(tx.ledgerTransaction.createMany).not.toHaveBeenCalled();
  });
});
