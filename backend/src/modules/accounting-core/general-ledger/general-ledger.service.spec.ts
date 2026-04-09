import { GeneralLedgerService } from './general-ledger.service';

describe('GeneralLedgerService', () => {
  const prisma = {
    ledgerTransaction: {
      findMany: jest.fn(),
    },
  };

  let service: GeneralLedgerService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new GeneralLedgerService(prisma as never);
  });

  it('returns running balances from posted ledger rows', async () => {
    prisma.ledgerTransaction.findMany.mockResolvedValue([
      {
        id: 'ledger-1',
        reference: 'JE-001',
        journalEntryId: 'entry-1',
        journalEntryLineId: 'line-1',
        postingBatchId: 'batch-1',
        accountId: 'cash',
        entryDate: new Date('2026-04-01T00:00:00.000Z'),
        postedAt: new Date('2026-04-01T01:00:00.000Z'),
        description: 'Initial funding',
        debitAmount: { toString: () => '100.00', valueOf: () => 100 },
        creditAmount: { toString: () => '0.00', valueOf: () => 0 },
        createdAt: new Date('2026-04-01T01:00:00.000Z'),
        account: {
          code: '1000',
          name: 'Cash',
        },
      },
      {
        id: 'ledger-2',
        reference: 'JE-002',
        journalEntryId: 'entry-2',
        journalEntryLineId: 'line-2',
        postingBatchId: 'batch-2',
        accountId: 'cash',
        entryDate: new Date('2026-04-02T00:00:00.000Z'),
        postedAt: new Date('2026-04-02T01:00:00.000Z'),
        description: 'Expense payment',
        debitAmount: { toString: () => '0.00', valueOf: () => 0 },
        creditAmount: { toString: () => '25.00', valueOf: () => 25 },
        createdAt: new Date('2026-04-02T01:00:00.000Z'),
        account: {
          code: '1000',
          name: 'Cash',
        },
      },
    ]);

    const result = await service.list({});

    expect(result).toEqual([
      expect.objectContaining({ runningBalance: '100.00' }),
      expect.objectContaining({ runningBalance: '75.00' }),
    ]);
  });
});
