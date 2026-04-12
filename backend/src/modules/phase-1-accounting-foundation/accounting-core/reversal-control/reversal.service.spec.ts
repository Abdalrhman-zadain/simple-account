import { JournalEntryStatus } from '../../../../generated/prisma/index';

import { ReversalService } from './reversal.service';

describe('ReversalService', () => {
  const tx = {
    journalEntry: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    journalEntryLine: {
      findMany: jest.fn(),
    },
    postingBatch: {
      create: jest.fn(),
    },
    ledgerTransaction: {
      createMany: jest.fn(),
    },
    account: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };

  const prisma = {
    $transaction: jest.fn(async (callback: (transaction: typeof tx) => Promise<unknown>) => callback(tx)),
  };

  const journalEntriesService = {
    ensurePosted: jest.fn(),
    getById: jest.fn().mockResolvedValue({
      id: 'entry-2',
      reference: 'JE-REV-001',
      status: 'POSTED',
      reversalOfId: 'entry-1',
    }),
  };

  const referenceService = {
    generateJournalEntryReference: jest.fn().mockReturnValue('JE-REV-001'),
  };

  let service: ReversalService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ReversalService(prisma as never, journalEntriesService as never, referenceService);
  });

  it('creates a reversing entry for a posted journal entry', async () => {
    tx.journalEntry.findUnique.mockResolvedValue({
      id: 'entry-1',
      reference: 'JE-001',
      status: JournalEntryStatus.POSTED,
      entryDate: new Date('2026-04-09T00:00:00.000Z'),
      description: 'Original',
      lines: [
        {
          id: 'line-1',
          accountId: 'cash',
          lineNumber: 1,
          debitAmount: { toString: () => '100.00' },
          creditAmount: { toString: () => '0.00' },
        },
        {
          id: 'line-2',
          accountId: 'revenue',
          lineNumber: 2,
          debitAmount: { toString: () => '0.00' },
          creditAmount: { toString: () => '100.00' },
        },
      ],
      reversedBy: null,
    });
    tx.account.findMany.mockResolvedValue([
      { id: 'cash', isActive: true },
      { id: 'revenue', isActive: true },
    ]);
    tx.postingBatch.create.mockResolvedValue({ id: 'batch-2' });
    tx.journalEntry.create.mockResolvedValue({
      id: 'entry-2',
      reference: 'JE-REV-001',
      status: JournalEntryStatus.POSTED,
      entryDate: new Date('2026-04-10T00:00:00.000Z'),
      description: 'Reverse it',
      postedAt: new Date('2026-04-10T00:10:00.000Z'),
      postingBatchId: 'batch-2',
      reversalOfId: 'entry-1',
    });
    tx.journalEntryLine.findMany.mockResolvedValue([
      {
        id: 'rev-line-1',
        accountId: 'cash',
        description: 'Reversal of line 1',
        lineNumber: 1,
        debitAmount: { toString: () => '0.00' },
        creditAmount: { toString: () => '100.00' },
      },
      {
        id: 'rev-line-2',
        accountId: 'revenue',
        description: 'Reversal of line 2',
        lineNumber: 2,
        debitAmount: { toString: () => '100.00' },
        creditAmount: { toString: () => '0.00' },
      },
    ]);
    tx.ledgerTransaction.createMany.mockResolvedValue({ count: 2 });
    tx.account.update.mockResolvedValue({});

    const result = await service.reverse('entry-1', {
      reversalDate: '2026-04-10',
      description: 'Reverse it',
    });

    expect(tx.journalEntry.create).toHaveBeenCalled();
    expect(tx.ledgerTransaction.createMany).toHaveBeenCalled();
    expect(tx.account.update).toHaveBeenCalledTimes(2);
    expect(result.reversalOfId).toBe('entry-1');
  });
});
