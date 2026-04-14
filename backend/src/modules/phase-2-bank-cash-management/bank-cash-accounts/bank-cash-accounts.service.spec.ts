import { BadRequestException, ConflictException } from '@nestjs/common';

import { BankCashAccountsService } from './bank-cash-accounts.service';

describe('BankCashAccountsService', () => {
  let service: BankCashAccountsService;
  const prisma = {
    account: {
      findUnique: jest.fn(),
    },
    bankCashAccount: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    ledgerTransaction: {
      findMany: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new BankCashAccountsService(prisma as never);
  });

  it('creates a bank account linked to an active posting asset account', async () => {
    prisma.account.findUnique.mockResolvedValue({
      id: 'acct-1',
      code: '1100001',
      name: 'Main Bank',
      type: 'ASSET',
      currentBalance: { toString: () => '1250.00' },
      currencyCode: 'JOD',
      isActive: true,
      isPosting: true,
    });
    prisma.bankCashAccount.findUnique.mockResolvedValue(null);
    prisma.bankCashAccount.create.mockResolvedValue({
      id: 'bc-1',
      type: 'BANK',
      name: 'Main Bank Account',
      bankName: 'Arab Bank',
      accountNumber: '123456',
      currencyCode: 'JOD',
      isActive: true,
      createdAt: new Date('2026-04-14T00:00:00.000Z'),
      updatedAt: new Date('2026-04-14T00:00:00.000Z'),
      account: {
        id: 'acct-1',
        code: '1100001',
        name: 'Main Bank',
        type: 'ASSET',
        currentBalance: { toString: () => '1250.00' },
        currencyCode: 'JOD',
        isActive: true,
        isPosting: true,
      },
    });

    const result = await service.create({
      type: 'BANK',
      name: 'Main Bank Account',
      bankName: 'Arab Bank',
      accountNumber: '123456',
      currencyCode: 'JOD',
      accountId: 'acct-1',
    });

    expect(prisma.bankCashAccount.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: 'BANK',
          name: 'Main Bank Account',
          account: {
            connect: {
              id: 'acct-1',
            },
          },
        }),
      }),
    );
    expect(result.currentBalance).toBe('1250.00');
    expect(result.status).toBe('ACTIVE');
  });

  it('rejects linking a non-posting account', async () => {
    prisma.account.findUnique.mockResolvedValue({
      id: 'acct-header',
      code: '1100000',
      name: 'Cash Header',
      type: 'ASSET',
      currentBalance: { toString: () => '0.00' },
      currencyCode: 'JOD',
      isActive: true,
      isPosting: false,
    });

    await expect(
      service.create({
        type: 'CASH',
        name: 'Petty Cash',
        currencyCode: 'JOD',
        accountId: 'acct-header',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('prevents editing a deactivated bank/cash account', async () => {
    prisma.bankCashAccount.findUnique.mockResolvedValue({
      id: 'bc-2',
      type: 'CASH',
      name: 'Petty Cash',
      bankName: null,
      accountNumber: null,
      currencyCode: 'JOD',
      isActive: false,
      accountId: 'acct-2',
      account: {
        id: 'acct-2',
        code: '1100002',
        name: 'Petty Cash',
        type: 'ASSET',
        currentBalance: { toString: () => '50.00' },
        currencyCode: 'JOD',
        isActive: true,
        isPosting: true,
      },
    });

    await expect(service.update('bc-2', { name: 'Front Desk Cash' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('lists transactions for the linked account with journal entry type labels', async () => {
    prisma.bankCashAccount.findUnique.mockResolvedValue({
      id: 'bc-3',
      type: 'BANK',
      name: 'Main Bank',
      bankName: 'Arab Bank',
      accountNumber: '123',
      currencyCode: 'JOD',
      isActive: true,
      accountId: 'acct-3',
      createdAt: new Date('2026-04-14T00:00:00.000Z'),
      updatedAt: new Date('2026-04-14T00:00:00.000Z'),
      account: {
        id: 'acct-3',
        code: '1100003',
        name: 'Main Bank',
        currentBalance: { toString: () => '900.00' },
        currencyCode: 'JOD',
      },
    });
    prisma.ledgerTransaction.findMany.mockResolvedValue([
      {
        id: 'lt-1',
        reference: 'RCPT-001',
        journalEntryId: 'je-1',
        journalEntryLineId: 'jel-1',
        entryDate: new Date('2026-04-13T00:00:00.000Z'),
        postedAt: new Date('2026-04-13T01:00:00.000Z'),
        description: 'Customer receipt',
        debitAmount: { toString: () => '100.00' },
        creditAmount: { toString: () => '0.00' },
        journalEntry: {
          reference: 'JE-100',
          journalEntryType: {
            id: 'type-1',
            name: 'Receipt',
          },
        },
      },
    ]);

    const result = await service.listTransactions('bc-3');

    expect(result.transactions[0].transactionType).toBe('Receipt');
    expect(result.transactions[0].journalReference).toBe('JE-100');
  });

  it('raises a conflict when the linked account is already used by another bank/cash account', async () => {
    prisma.account.findUnique.mockResolvedValue({
      id: 'acct-1',
      code: '1100001',
      name: 'Main Bank',
      type: 'ASSET',
      currentBalance: { toString: () => '1250.00' },
      currencyCode: 'JOD',
      isActive: true,
      isPosting: true,
    });
    prisma.bankCashAccount.findUnique.mockResolvedValue({ id: 'existing' });

    await expect(
      service.create({
        type: 'BANK',
        name: 'Main Bank Account',
        bankName: 'Arab Bank',
        accountNumber: '123456',
        currencyCode: 'JOD',
        accountId: 'acct-1',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
