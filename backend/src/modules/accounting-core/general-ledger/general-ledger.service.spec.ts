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

  it('returns running balances and opening balance from posted ledger rows', async () => {
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
        debitAmount: { toString: () => '100.00' },
        creditAmount: { toString: () => '0.00' },
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
        debitAmount: { toString: () => '0.00' },
        creditAmount: { toString: () => '25.00' },
        createdAt: new Date('2026-04-02T01:00:00.000Z'),
        account: {
          code: '1000',
          name: 'Cash',
        },
      },
    ]);

    const result = await service.list({ accountId: 'cash' });

    expect(result.openingBalance).toBe('0.00');
    expect(result.transactions).toHaveLength(2);
    expect(result.transactions[0].runningBalance).toBe('100.00');
    expect(result.transactions[1].runningBalance).toBe('75.00');
  });

  it('calculates opening balance based on transactions before dateFrom', async () => {
    const prismaWithAggregate = {
      ...prisma,
      ledgerTransaction: {
        ...prisma.ledgerTransaction,
        aggregate: jest.fn().mockResolvedValue({
          _sum: {
            debitAmount: 150.00,
            creditAmount: 50.00,
          },
        }),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    const serviceWithAgg = new GeneralLedgerService(prismaWithAggregate as never);

    const result = await serviceWithAgg.list({
      accountId: 'cash',
      dateFrom: '2026-04-10T00:00:00.000Z'
    });

    expect(prismaWithAggregate.ledgerTransaction.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          entryDate: { lt: new Date('2026-04-10T00:00:00.000Z') }
        })
      })
    );
    expect(result.openingBalance).toBe('100.00');
  });
});
