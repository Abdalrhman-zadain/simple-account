import { BadRequestException, ConflictException } from '@nestjs/common';

import { BankCashAccountsService } from './bank-cash-accounts.service';

describe('BankCashAccountsService', () => {
  let service: BankCashAccountsService;
  const prisma = {
    $transaction: jest.fn(),
    account: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
    paymentMethodType: {
      findFirst: jest.fn(),
    },
    bankCashAccount: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
    },
    ledgerTransaction: {
      findMany: jest.fn(),
    },
  };
  const journalEntriesService = {
    create: jest.fn(),
  };
  const postingService = {
    post: jest.fn(),
  };
  const accountsService = {
    createWithinTransaction: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(async (callback: (tx: typeof prisma) => unknown) => callback(prisma as never));
    service = new BankCashAccountsService(
      prisma as never,
      accountsService as never,
      journalEntriesService as never,
      postingService as never,
    );
    prisma.paymentMethodType.findFirst.mockImplementation(async ({ where }: { where: { name?: { equals?: string } } }) => {
      const name = where.name?.equals;
      return name ? { name } : null;
    });
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
      type: 'Bank',
      name: 'Main Bank',
      bankName: 'Arab Bank',
      accountNumber: '1100001',
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
      type: 'Bank',
      name: 'Main Bank Account',
      bankName: 'Arab Bank',
      accountNumber: 'manual-reference',
      currencyCode: 'JOD',
      accountId: 'acct-1',
    });

    expect(prisma.bankCashAccount.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: 'Bank',
          name: 'Main Bank',
          accountNumber: '1100001',
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

  it('posts an opening balance when provided during creation', async () => {
    prisma.account.findUnique
      .mockResolvedValueOnce({
        id: 'acct-1',
        code: '1100001',
        name: 'Main Bank',
        type: 'ASSET',
        currentBalance: { toString: () => '0.00' },
        currencyCode: 'JOD',
        isActive: true,
        isPosting: true,
      })
      .mockResolvedValueOnce({
        id: 'offset-1',
        name: 'Opening Balance Equity',
        currencyCode: 'JOD',
        isActive: true,
        isPosting: true,
        allowManualPosting: true,
      });
    prisma.bankCashAccount.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'bc-1',
        type: 'Bank',
        name: 'Main Bank',
        bankName: 'Arab Bank',
        accountNumber: '1100001',
        currencyCode: 'JOD',
        isActive: true,
        createdAt: new Date('2026-04-14T00:00:00.000Z'),
        updatedAt: new Date('2026-04-14T00:00:00.000Z'),
        account: {
          id: 'acct-1',
          code: '1100001',
          name: 'Main Bank',
          type: 'ASSET',
          currentBalance: { toString: () => '500.00' },
          currencyCode: 'JOD',
          isActive: true,
          isPosting: true,
        },
      });
    prisma.bankCashAccount.create.mockResolvedValue({
      id: 'bc-1',
      type: 'Bank',
      name: 'Main Bank',
      bankName: 'Arab Bank',
      accountNumber: '1100001',
      currencyCode: 'JOD',
      isActive: true,
      createdAt: new Date('2026-04-14T00:00:00.000Z'),
      updatedAt: new Date('2026-04-14T00:00:00.000Z'),
      account: {
        id: 'acct-1',
        code: '1100001',
        name: 'Main Bank',
        type: 'ASSET',
        currentBalance: { toString: () => '0.00' },
        currencyCode: 'JOD',
        isActive: true,
        isPosting: true,
      },
    });
    journalEntriesService.create.mockResolvedValue({ id: 'je-open-1' });
    postingService.post.mockResolvedValue({ id: 'je-open-1' });

    const result = await service.create({
      type: 'Bank',
      name: 'Main Bank Account',
      bankName: 'Arab Bank',
      currencyCode: 'JOD',
      accountId: 'acct-1',
      openingBalance: 500,
      openingBalanceOffsetAccountId: 'offset-1',
    });

    expect(journalEntriesService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        lines: [
          expect.objectContaining({ accountId: 'acct-1', debitAmount: 500, creditAmount: 0 }),
          expect.objectContaining({ accountId: 'offset-1', debitAmount: 0, creditAmount: 500 }),
        ],
      }),
    );
    expect(postingService.post).toHaveBeenCalledWith('je-open-1');
    expect(result.currentBalance).toBe('500.00');
  });

  it('allows non-bank account types without bank-only requirements', async () => {
    prisma.paymentMethodType.findFirst.mockResolvedValue({ name: 'Cash' });
    prisma.account.findUnique.mockResolvedValue({
      id: 'acct-cash',
      code: '1100002',
      name: 'Petty Cash',
      type: 'ASSET',
      currentBalance: { toString: () => '75.00' },
      currencyCode: 'JOD',
      isActive: true,
      isPosting: true,
    });
    prisma.bankCashAccount.findUnique.mockResolvedValue(null);
    prisma.bankCashAccount.create.mockResolvedValue({
      id: 'bc-cash',
      type: 'Cash',
      name: 'Petty Cash',
      bankName: null,
      accountNumber: null,
      currencyCode: 'JOD',
      isActive: true,
      createdAt: new Date('2026-04-14T00:00:00.000Z'),
      updatedAt: new Date('2026-04-14T00:00:00.000Z'),
      account: {
        id: 'acct-cash',
        code: '1100002',
        name: 'Petty Cash',
        type: 'ASSET',
        currentBalance: { toString: () => '75.00' },
        currencyCode: 'JOD',
        isActive: true,
        isPosting: true,
      },
    });

    const result = await service.create({
      type: 'Cash',
      name: 'Front Desk Cash',
      currencyCode: 'JOD',
      accountId: 'acct-cash',
    });

    expect(prisma.bankCashAccount.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: 'Cash',
        }),
      }),
    );
    expect(result.type).toBe('Cash');
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
        type: 'Cash',
        name: 'Petty Cash',
        currencyCode: 'JOD',
        accountId: 'acct-header',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('prevents editing a deactivated bank/cash account', async () => {
    prisma.bankCashAccount.findUnique.mockResolvedValue({
      id: 'bc-2',
      type: 'Cash',
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

  it('requires bank name for bank accounts', async () => {
    prisma.account.findUnique.mockResolvedValue({
      id: 'acct-bank',
      code: '1100001',
      name: 'Main Bank',
      type: 'ASSET',
      currentBalance: { toString: () => '0.00' },
      currencyCode: 'JOD',
      isActive: true,
      isPosting: true,
    });

    await expect(
      service.create({
        type: 'Bank',
        name: 'Main Bank Account',
        currencyCode: 'JOD',
        accountId: 'acct-bank',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a currency that does not match the linked chart-of-accounts entry', async () => {
    prisma.account.findUnique.mockResolvedValue({
      id: 'acct-foreign',
      code: '1100004',
      name: 'USD Bank',
      type: 'ASSET',
      currentBalance: { toString: () => '500.00' },
      currencyCode: 'USD',
      isActive: true,
      isPosting: true,
    });

    await expect(
      service.create({
        type: 'Bank',
        name: 'USD Bank Account',
        bankName: 'Arab Bank',
        currencyCode: 'JOD',
        accountId: 'acct-foreign',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('requires an offset account when opening balance is provided', async () => {
    prisma.account.findUnique.mockResolvedValue({
      id: 'acct-open',
      code: '1100006',
      name: 'Cash Drawer',
      type: 'ASSET',
      currentBalance: { toString: () => '0.00' },
      currencyCode: 'JOD',
      isActive: true,
      isPosting: true,
    });
    prisma.bankCashAccount.findUnique.mockResolvedValue(null);

    await expect(
      service.create({
        type: 'Cash',
        name: 'Cash Drawer',
        currencyCode: 'JOD',
        accountId: 'acct-open',
        openingBalance: 100,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('lists transactions for the linked account with journal entry type labels', async () => {
    prisma.bankCashAccount.findUnique.mockResolvedValue({
      id: 'bc-3',
      type: 'Bank',
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
        type: 'Bank',
        name: 'Main Bank Account',
        bankName: 'Arab Bank',
        currencyCode: 'JOD',
        accountId: 'acct-1',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects account types that are not active master-data subtypes', async () => {
    prisma.paymentMethodType.findFirst.mockResolvedValue(null);

    await expect(
      service.create({
        type: 'Wallet',
        name: 'Wallet Account',
        currencyCode: 'JOD',
        accountId: 'acct-1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows custom account types from master data', async () => {
    prisma.paymentMethodType.findFirst.mockResolvedValue({ name: 'Wallet' });
    prisma.account.findUnique.mockResolvedValue({
      id: 'acct-wallet',
      code: '1100005',
      name: 'Wallet Clearing',
      type: 'ASSET',
      currentBalance: { toString: () => '25.00' },
      currencyCode: 'JOD',
      isActive: true,
      isPosting: true,
    });
    prisma.bankCashAccount.findUnique.mockResolvedValue(null);
    prisma.bankCashAccount.create.mockResolvedValue({
      id: 'bc-wallet',
      type: 'Wallet',
      name: 'Wallet Clearing',
      bankName: null,
      accountNumber: null,
      currencyCode: 'JOD',
      isActive: true,
      createdAt: new Date('2026-04-14T00:00:00.000Z'),
      updatedAt: new Date('2026-04-14T00:00:00.000Z'),
      account: {
        id: 'acct-wallet',
        code: '1100005',
        name: 'Wallet Clearing',
        type: 'ASSET',
        currentBalance: { toString: () => '25.00' },
        currencyCode: 'JOD',
        isActive: true,
        isPosting: true,
      },
    });

    const result = await service.create({
      type: 'Wallet',
      name: 'Office Wallet',
      currencyCode: 'JOD',
      accountId: 'acct-wallet',
    });

    expect(result.type).toBe('Wallet');
    expect(prisma.bankCashAccount.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: 'Wallet',
        }),
      }),
    );
  });

  it('creates a new header and posting child under Cash and Cash Equivalents', async () => {
    prisma.account.findFirst.mockResolvedValue({
      id: 'cash-root',
      code: '1110000',
      name: 'Cash and Cash Equivalents',
      type: 'ASSET',
      isPosting: false,
      isActive: true,
      currencyCode: 'JOD',
      parentAccountId: 'current-assets',
    });
    prisma.account.findUniqueOrThrow.mockResolvedValue({
      id: 'cash-root',
      code: '1110000',
      name: 'Cash and Cash Equivalents',
      type: 'ASSET',
      isPosting: false,
      currencyCode: 'JOD',
      parentAccountId: 'current-assets',
    });
    accountsService.createWithinTransaction
      .mockResolvedValueOnce({
        id: 'parent-1',
        code: '1115000',
        name: 'Branch Cash',
        currencyCode: 'JOD',
      })
      .mockResolvedValueOnce({
        id: 'child-1',
        code: '1115001',
        name: 'Branch Cash Register',
        currencyCode: 'JOD',
        currentBalance: { toString: () => '0.00' },
      });

    const result = await service.createLinkedAccount({
      mode: 'create_parent_and_child',
      currencyCode: 'JOD',
      childName: 'Branch Cash Register',
      parentName: 'Branch Cash',
    });

    expect(accountsService.createWithinTransaction).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        name: 'Branch Cash',
        type: 'ASSET',
        isPosting: false,
        parentAccountId: 'cash-root',
      }),
      prisma,
    );
    expect(accountsService.createWithinTransaction).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        name: 'Branch Cash Register',
        type: 'ASSET',
        isPosting: true,
        parentAccountId: 'parent-1',
      }),
      prisma,
    );
    expect(result.postingAccount.code).toBe('1115001');
    expect(result.parentAccount.id).toBe('parent-1');
  });

  it('creates a posting child under an existing header inside Cash and Cash Equivalents', async () => {
    prisma.account.findFirst.mockResolvedValue({
      id: 'cash-root',
      code: '1110000',
      name: 'Cash and Cash Equivalents',
      type: 'ASSET',
      isPosting: false,
      isActive: true,
      currencyCode: 'JOD',
      parentAccountId: 'current-assets',
    });
    prisma.account.findUnique
      .mockResolvedValueOnce({
        id: 'parent-2',
        code: '1112000',
        name: 'Bank Accounts',
        type: 'ASSET',
        isPosting: false,
        isActive: true,
        currencyCode: 'JOD',
        parentAccountId: 'cash-root',
      })
      .mockResolvedValueOnce({
        parentAccountId: 'cash-root',
      })
      .mockResolvedValueOnce({
        parentAccountId: 'current-assets',
      });
    accountsService.createWithinTransaction.mockResolvedValue({
      id: 'child-2',
      code: '1112001',
      name: 'Arab Bank - Main',
      currencyCode: 'JOD',
      currentBalance: { toString: () => '0.00' },
    });

    const result = await service.createLinkedAccount({
      mode: 'create_child_under_existing_parent',
      currencyCode: 'JOD',
      childName: 'Arab Bank - Main',
      existingParentAccountId: 'parent-2',
    });

    expect(accountsService.createWithinTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Arab Bank - Main',
        parentAccountId: 'parent-2',
        isPosting: true,
      }),
      prisma,
    );
    expect(result.parentAccount.id).toBe('parent-2');
  });

  it('rejects linked-account parents outside the Cash and Cash Equivalents subtree', async () => {
    prisma.account.findFirst.mockResolvedValue({
      id: 'cash-root',
      code: '1110000',
      name: 'Cash and Cash Equivalents',
      type: 'ASSET',
      isPosting: false,
      isActive: true,
      currencyCode: 'JOD',
      parentAccountId: 'current-assets',
    });
    prisma.account.findUnique
      .mockResolvedValueOnce({
        id: 'parent-3',
        code: '1200000',
        name: 'Accounts Receivable',
        type: 'ASSET',
        isPosting: false,
        isActive: true,
        currencyCode: 'JOD',
        parentAccountId: 'assets-root',
      })
      .mockResolvedValueOnce({
        parentAccountId: 'assets-root',
      })
      .mockResolvedValueOnce({
        parentAccountId: null,
      });

    await expect(
      service.createLinkedAccount({
        mode: 'create_child_under_existing_parent',
        currencyCode: 'JOD',
        childName: 'Invalid Child',
        existingParentAccountId: 'parent-3',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects posting accounts as linked-account parents', async () => {
    prisma.account.findFirst.mockResolvedValue({
      id: 'cash-root',
      code: '1110000',
      name: 'Cash and Cash Equivalents',
      type: 'ASSET',
      isPosting: false,
      isActive: true,
      currencyCode: 'JOD',
      parentAccountId: 'current-assets',
    });
    prisma.account.findUnique.mockResolvedValue({
      id: 'posting-parent',
      code: '1112001',
      name: 'Operating Bank',
      type: 'ASSET',
      isPosting: true,
      isActive: true,
      currencyCode: 'JOD',
      parentAccountId: 'cash-root',
    });

    await expect(
      service.createLinkedAccount({
        mode: 'create_child_under_existing_parent',
        currencyCode: 'JOD',
        childName: 'Invalid Child',
        existingParentAccountId: 'posting-parent',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('passes the requested currency into created linked accounts', async () => {
    prisma.account.findFirst.mockResolvedValue({
      id: 'cash-root',
      code: '1110000',
      name: 'Cash and Cash Equivalents',
      type: 'ASSET',
      isPosting: false,
      isActive: true,
      currencyCode: 'USD',
      parentAccountId: 'current-assets',
    });
    prisma.account.findUnique.mockResolvedValueOnce({
      id: 'parent-usd',
      code: '1112000',
      name: 'USD Banks',
      type: 'ASSET',
      isPosting: false,
      isActive: true,
      currencyCode: 'USD',
      parentAccountId: 'cash-root',
    });
    accountsService.createWithinTransaction.mockResolvedValue({
      id: 'child-usd',
      code: '1112002',
      name: 'USD Bank Account',
      currencyCode: 'USD',
      currentBalance: { toString: () => '0.00' },
    });

    await service.createLinkedAccount({
      mode: 'create_child_under_existing_parent',
      currencyCode: 'USD',
      childName: 'USD Bank Account',
      existingParentAccountId: 'parent-usd',
    });

    expect(accountsService.createWithinTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        currencyCode: 'USD',
      }),
      prisma,
    );
  });

  it('runs linked-account creation atomically', async () => {
    prisma.account.findFirst.mockResolvedValue({
      id: 'cash-root',
      code: '1110000',
      name: 'Cash and Cash Equivalents',
      type: 'ASSET',
      isPosting: false,
      isActive: true,
      currencyCode: 'JOD',
      parentAccountId: 'current-assets',
    });
    prisma.account.findUniqueOrThrow.mockResolvedValue({
      id: 'cash-root',
      code: '1110000',
      name: 'Cash and Cash Equivalents',
      type: 'ASSET',
      isPosting: false,
      currencyCode: 'JOD',
      parentAccountId: 'current-assets',
    });
    accountsService.createWithinTransaction
      .mockResolvedValueOnce({
        id: 'parent-atomic',
        code: '1116000',
        name: 'Atomic Parent',
        currencyCode: 'JOD',
      })
      .mockRejectedValueOnce(new Error('boom'));

    await expect(
      service.createLinkedAccount({
        mode: 'create_parent_and_child',
        currencyCode: 'JOD',
        childName: 'Atomic Child',
        parentName: 'Atomic Parent',
      }),
    ).rejects.toThrow('boom');

    expect(prisma.$transaction).toHaveBeenCalled();
  });
});
