import { BadRequestException } from '@nestjs/common';
import { BankCashTransactionKind, BankCashTransactionStatus } from '../../../generated/prisma';

import { BankCashTransactionsService } from './bank-cash-transactions.service';

describe('BankCashTransactionsService', () => {
  const prisma = {
    account: {
      findUnique: jest.fn(),
    },
    bankCashAccount: {
      findUnique: jest.fn(),
    },
    bankCashTransaction: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };
  const journalEntriesService = {
    create: jest.fn(),
  };
  const postingService = {
    post: jest.fn(),
  };
  let service: BankCashTransactionsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new BankCashTransactionsService(prisma as never, journalEntriesService as never, postingService as never);
  });

  it('creates receipt drafts with active bank/cash and counter accounts', async () => {
    prisma.bankCashAccount.findUnique.mockResolvedValue(activeBankCashAccount('bc-1', 'asset-bank'));
    prisma.account.findUnique.mockResolvedValue(activeCounterAccount('income-1'));
    prisma.bankCashTransaction.create.mockResolvedValue(
      transactionRow({
        id: 'txn-1',
        kind: BankCashTransactionKind.RECEIPT,
        bankCashAccountId: 'bc-1',
        counterAccountId: 'income-1',
      }),
    );

    const result = await service.createReceipt({
      reference: 'RCPT-001',
      transactionDate: '2026-04-16',
      amount: 125,
      bankCashAccountId: 'bc-1',
      counterAccountId: 'income-1',
      counterpartyName: 'Customer A',
      description: 'Cash sale',
    });

    expect(prisma.bankCashTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          kind: BankCashTransactionKind.RECEIPT,
          reference: 'RCPT-001',
          amount: '125.00',
          bankCashAccountId: 'bc-1',
          counterAccountId: 'income-1',
        }),
      }),
    );
    expect(result.kind).toBe(BankCashTransactionKind.RECEIPT);
    expect(result.status).toBe(BankCashTransactionStatus.DRAFT);
  });

  it('rejects deactivated bank/cash accounts for new transactions', async () => {
    prisma.bankCashAccount.findUnique.mockResolvedValue({
      ...activeBankCashAccount('bc-inactive', 'asset-bank'),
      isActive: false,
    });

    await expect(
      service.createReceipt({
        transactionDate: '2026-04-16',
        amount: 25,
        bankCashAccountId: 'bc-inactive',
        counterAccountId: 'income-1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects transfers that use the same source and destination account', async () => {
    await expect(
      service.createTransfer({
        transactionDate: '2026-04-16',
        amount: 50,
        sourceBankCashAccountId: 'bc-1',
        destinationBankCashAccountId: 'bc-1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('posts receipt transactions through a generated journal entry', async () => {
    prisma.bankCashTransaction.findUnique.mockResolvedValue(
      transactionRow({
        id: 'txn-1',
        kind: BankCashTransactionKind.RECEIPT,
        bankCashAccountId: 'bc-1',
        counterAccountId: 'income-1',
        amount: { toString: () => '125.00' },
      }),
    );
    journalEntriesService.create.mockResolvedValue({ id: 'je-1' });
    postingService.post.mockResolvedValue({
      id: 'je-1',
      postedAt: '2026-04-16T10:00:00.000Z',
    });
    prisma.bankCashTransaction.update.mockResolvedValue(
      transactionRow({
        id: 'txn-1',
        kind: BankCashTransactionKind.RECEIPT,
        status: BankCashTransactionStatus.POSTED,
        bankCashAccountId: 'bc-1',
        counterAccountId: 'income-1',
        journalEntryId: 'je-1',
        postedAt: new Date('2026-04-16T10:00:00.000Z'),
      }),
    );

    const result = await service.post('txn-1');

    expect(journalEntriesService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        lines: [
          expect.objectContaining({
            accountId: 'asset-bank',
            debitAmount: 125,
            creditAmount: 0,
          }),
          expect.objectContaining({
            accountId: 'income-1',
            debitAmount: 0,
            creditAmount: 125,
          }),
        ],
      }),
    );
    expect(postingService.post).toHaveBeenCalledWith('je-1');
    expect(result.status).toBe(BankCashTransactionStatus.POSTED);
    expect(result.journalEntryId).toBe('je-1');
  });
});

function activeBankCashAccount(id: string, accountId: string) {
  return {
    id,
    type: 'Bank',
    name: 'Main Bank',
    currencyCode: 'JOD',
    isActive: true,
    account: {
      id: accountId,
      code: '1100001',
      name: 'Main Bank',
      currencyCode: 'JOD',
      isActive: true,
      isPosting: true,
    },
  };
}

function activeCounterAccount(id: string) {
  return {
    id,
    code: '4100001',
    name: 'Sales Revenue',
    currencyCode: 'JOD',
    isActive: true,
    isPosting: true,
    allowManualPosting: true,
  };
}

function transactionRow(overrides: Record<string, unknown>) {
  const base = {
    id: 'txn-1',
    kind: BankCashTransactionKind.RECEIPT,
    status: BankCashTransactionStatus.DRAFT,
    reference: 'RCPT-001',
    transactionDate: new Date('2026-04-16T00:00:00.000Z'),
    amount: { toString: () => '125.00' },
    description: 'Cash sale',
    counterpartyName: 'Customer A',
    bankCashAccountId: 'bc-1',
    bankCashAccount: activeBankCashAccount('bc-1', 'asset-bank'),
    sourceBankCashAccountId: null,
    sourceBankCashAccount: null,
    destinationBankCashAccountId: null,
    destinationBankCashAccount: null,
    counterAccountId: 'income-1',
    counterAccount: activeCounterAccount('income-1'),
    journalEntryId: null,
    journalEntry: null,
    postedAt: null,
    createdAt: new Date('2026-04-16T00:00:00.000Z'),
    updatedAt: new Date('2026-04-16T00:00:00.000Z'),
  };

  return {
    ...base,
    ...overrides,
  };
}
