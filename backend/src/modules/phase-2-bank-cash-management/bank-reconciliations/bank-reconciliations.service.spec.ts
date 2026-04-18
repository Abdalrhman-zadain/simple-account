import { BadRequestException } from '@nestjs/common';
import { BankReconciliationStatus, BankStatementLineStatus } from '../../../generated/prisma';

import { BankReconciliationsService } from './bank-reconciliations.service';

describe('BankReconciliationsService', () => {
  const prisma = {
    bankCashAccount: {
      findUnique: jest.fn(),
    },
    bankReconciliation: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    bankStatementLine: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    bankReconciliationMatch: {
      count: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    ledgerTransaction: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  let service: BankReconciliationsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new BankReconciliationsService(prisma as never);
    prisma.ledgerTransaction.findMany.mockResolvedValue([]);
  });

  it('creates reconciliation drafts for active bank/cash accounts', async () => {
    prisma.bankCashAccount.findUnique.mockResolvedValue(activeBankCashAccount());
    prisma.bankReconciliation.create.mockResolvedValue(reconciliationRow());

    const result = await service.create({
      bankCashAccountId: 'bc-1',
      statementDate: '2026-04-16',
      statementEndingBalance: 980,
      notes: 'April statement',
    });

    expect(prisma.bankReconciliation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          bankCashAccountId: 'bc-1',
          statementEndingBalance: '980.00',
        }),
      }),
    );
    expect(result.status).toBe(BankReconciliationStatus.DRAFT);
  });

  it('rejects statement lines when both debit and credit are zero', async () => {
    prisma.bankReconciliation.findUnique.mockResolvedValue(reconciliationRow());

    await expect(
      service.addStatementLine('rec-1', {
        transactionDate: '2026-04-16',
        debitAmount: 0,
        creditAmount: 0,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('matches a statement line to a system transaction on the linked account', async () => {
    prisma.bankReconciliation.findUnique.mockResolvedValue(reconciliationRow());
    prisma.bankStatementLine.findUnique.mockResolvedValue(statementLineRow());
    prisma.ledgerTransaction.findUnique.mockResolvedValue(ledgerTransactionRow());

    await service.createMatch('rec-1', {
      statementLineId: 'line-1',
      ledgerTransactionId: 'ledger-1',
    });

    expect(prisma.bankReconciliationMatch.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          reconciliationId: 'rec-1',
          statementLineId: 'line-1',
          ledgerTransactionId: 'ledger-1',
        }),
      }),
    );
    expect(prisma.bankStatementLine.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'line-1' },
        data: { status: BankStatementLineStatus.MATCHED },
      }),
    );
  });

  it('rejects a match when the system transaction belongs to another account', async () => {
    prisma.bankReconciliation.findUnique.mockResolvedValue(reconciliationRow());
    prisma.bankStatementLine.findUnique.mockResolvedValue(statementLineRow());
    prisma.ledgerTransaction.findUnique.mockResolvedValue({
      ...ledgerTransactionRow(),
      accountId: 'other-account',
    });

    await expect(
      service.createMatch('rec-1', {
        statementLineId: 'line-1',
        ledgerTransactionId: 'ledger-1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('marks matched transactions as reconciled and updates the statement line status', async () => {
    prisma.bankReconciliation.findUnique.mockResolvedValue(reconciliationRow());
    prisma.bankReconciliationMatch.findUnique.mockResolvedValue(matchRow());

    await service.reconcileMatch('rec-1', 'match-1');

    expect(prisma.bankReconciliationMatch.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'match-1' },
        data: expect.objectContaining({
          isReconciled: true,
        }),
      }),
    );
    expect(prisma.bankStatementLine.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'line-1' },
        data: { status: BankStatementLineStatus.RECONCILED },
      }),
    );
  });
});

function activeBankCashAccount() {
  return {
    id: 'bc-1',
    type: 'Bank',
    name: 'Main Bank',
    currencyCode: 'JOD',
    isActive: true,
    accountId: 'asset-bank',
    account: {
      id: 'asset-bank',
      code: '1100001',
      name: 'Main Bank',
      currencyCode: 'JOD',
      isActive: true,
      isPosting: true,
      currentBalance: { toString: () => '1000.00' },
    },
  };
}

function ledgerTransactionRow() {
  return {
    id: 'ledger-1',
    accountId: 'asset-bank',
    reference: 'RCPT-001',
    entryDate: new Date('2026-04-16T00:00:00.000Z'),
    postedAt: new Date('2026-04-16T08:00:00.000Z'),
    description: 'Receipt',
    debitAmount: { toString: () => '50.00' },
    creditAmount: { toString: () => '0.00' },
    journalEntryId: 'je-1',
    journalEntry: {
      id: 'je-1',
      reference: 'JE-001',
    },
    bankReconciliationMatches: [],
  };
}

function statementLineRow() {
  return {
    id: 'line-1',
    reconciliationId: 'rec-1',
    transactionDate: new Date('2026-04-16T00:00:00.000Z'),
    reference: 'BANK-001',
    description: 'Deposit',
    debitAmount: { toString: () => '50.00' },
    creditAmount: { toString: () => '0.00' },
    status: BankStatementLineStatus.UNMATCHED,
    matches: [],
    createdAt: new Date('2026-04-16T00:00:00.000Z'),
    updatedAt: new Date('2026-04-16T00:00:00.000Z'),
  };
}

function matchRow() {
  return {
    id: 'match-1',
    reconciliationId: 'rec-1',
    statementLineId: 'line-1',
    ledgerTransactionId: 'ledger-1',
    isReconciled: false,
    matchedAt: new Date('2026-04-16T09:00:00.000Z'),
    reconciledAt: null,
  };
}

function reconciliationRow() {
  return {
    id: 'rec-1',
    bankCashAccountId: 'bc-1',
    bankCashAccount: activeBankCashAccount(),
    statementDate: new Date('2026-04-16T00:00:00.000Z'),
    statementEndingBalance: { toString: () => '980.00' },
    notes: 'April statement',
    status: BankReconciliationStatus.DRAFT,
    completedAt: null,
    statementLines: [statementLineRow()],
    matches: [],
    createdAt: new Date('2026-04-16T00:00:00.000Z'),
    updatedAt: new Date('2026-04-16T00:00:00.000Z'),
  };
}
