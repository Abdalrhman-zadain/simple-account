import { AccountsService } from './accounts.service';

describe('AccountsService', () => {
  const prisma = {
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
    account: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    journalEntryLine: {
      findFirst: jest.fn(),
    },
    ledgerTransaction: {
      findFirst: jest.fn(),
    },
    bankCashAccount: {
      findFirst: jest.fn(),
    },
  };

  let service: AccountsService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.account.findUnique.mockReset();
    prisma.account.findUnique.mockResolvedValue(null);
    prisma.account.findFirst.mockReset();
    prisma.account.findFirst.mockResolvedValue(null);
    prisma.account.delete.mockReset();
    prisma.account.delete.mockResolvedValue({ id: 'deleted-account' });
    prisma.journalEntryLine.findFirst.mockReset();
    prisma.journalEntryLine.findFirst.mockResolvedValue(null);
    prisma.ledgerTransaction.findFirst.mockReset();
    prisma.ledgerTransaction.findFirst.mockResolvedValue(null);
    prisma.bankCashAccount.findFirst.mockReset();
    prisma.bankCashAccount.findFirst.mockResolvedValue(null);
    prisma.$executeRaw.mockResolvedValue(undefined);
    prisma.$queryRaw.mockResolvedValue([]);
    prisma.$transaction.mockImplementation(async (callback: (tx: typeof prisma) => Promise<unknown>) => callback(prisma as never));
    service = new AccountsService(prisma as never);
  });

  it('allocates a 7-digit numeric root code for ASSET when available', async () => {
    prisma.account.findUnique.mockImplementation((args: { where: { id?: string; code?: string } }) => {
      if ('code' in args.where && args.where.code === '1000000') {
        return null;
      }
      return null;
    });

    const code = await service.generateNextCode(null, { type: 'ASSET', isPosting: false });
    expect(code).toBe('1000000');
  });

  it('does not allocate a 7-digit numeric root code for posting roots (falls back to legacy)', async () => {
    const code = await service.generateNextCode(null, { type: 'ASSET', isPosting: true });
    expect(code).toBe('1');
  });

  it('allocates header children by consuming one digit from the left', async () => {
    prisma.account.findUnique.mockImplementation((args: { where: { id?: string; code?: string } }) => {
      if ('id' in args.where && args.where.id === 'assets') {
        return { id: 'assets', code: '1000000' };
      }
      return null;
    });

    prisma.account.findMany.mockResolvedValue([
      { code: '1100000', isPosting: false },
      { code: '1200000', isPosting: false },
      { code: '1000001', isPosting: true },
    ]);

    const code = await service.generateNextCode('assets', { isPosting: false });
    expect(code).toBe('1300000');
  });

  it('allocates posting children from the right without colliding with header branches', async () => {
    prisma.account.findUnique.mockImplementation((args: { where: { id?: string; code?: string } }) => {
      if ('id' in args.where && args.where.id === 'cash-header') {
        return { id: 'cash-header', code: '1100000' };
      }
      return null;
    });

    prisma.account.findMany.mockResolvedValue([
      { code: '1100001', isPosting: true },
      { code: '1100002', isPosting: true },
      { code: '1110000', isPosting: false }, // deeper header branch (should not affect posting allocation)
    ]);

    const code = await service.generateNextCode('cash-header', { isPosting: true });
    expect(code).toBe('1100003');
  });

  it('returns a structured hierarchy', async () => {
    prisma.account.findMany.mockResolvedValue([
      {
        id: 'assets',
        code: '1000',
        name: 'Assets',
        parentAccountId: null,
        currentBalance: { toString: () => '0.00' },
      },
      {
        id: 'cash',
        code: '1010',
        name: 'Cash',
        parentAccountId: 'assets',
        currentBalance: { toString: () => '150.00' },
      },
    ]);

    const result = await service.hierarchy();

    expect(result).toHaveLength(1);
    expect(result[0].children).toHaveLength(1);
    expect(result[0].children[0].id).toBe('cash');
  });

  it('returns a lightweight selector view when requested', async () => {
    prisma.account.findMany.mockResolvedValue([
      { id: 'cash', code: '1100001', name: 'Cash', currentBalance: { toString: () => '150.00' } },
    ]);

    const result = await service.listSelectorOptions({ isPosting: 'true', isActive: 'true' });

    expect(prisma.account.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: {
          id: true,
          code: true,
          name: true,
          currentBalance: true,
          currencyCode: true,
        },
      }),
    );
    expect(result).toHaveLength(1);
  });

  it('returns the full ancestor path in getById', async () => {
    prisma.account.findUnique.mockImplementation(({ where }: { where: { id: string } }) => {
      if (where.id === 'grandchild') return { id: 'grandchild', parentAccountId: 'child' };
      if (where.id === 'child') return { id: 'child', parentAccountId: 'root', name: 'Child', code: 'C' };
      if (where.id === 'root') return { id: 'root', parentAccountId: null, name: 'Root', code: 'R' };
      return null;
    });

    const result = (await service.getById('grandchild')) as any;

    expect(result.ancestors).toHaveLength(2);
    expect(result.ancestors[0].id).toBe('root');
    expect(result.ancestors[1].id).toBe('child');
  });

  it('returns a lightweight table view when requested', async () => {
    prisma.account.findMany.mockResolvedValue([
      {
        id: 'cash',
        code: '1100001',
        name: 'Cash',
        type: 'ASSET',
        isPosting: true,
        isActive: true,
        currentBalance: { toString: () => '150.00' },
        parentAccountId: 'assets',
        parentAccount: { id: 'assets', name: 'Assets' },
        _count: {
          journalLines: 0,
          ledgerLines: 0,
          childAccounts: 0,
        },
      },
    ]);

    const result = await service.listTableRows({ isActive: 'true' });

    expect(prisma.account.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          id: true,
          code: true,
          name: true,
          type: true,
          isPosting: true,
          isActive: true,
          currentBalance: true,
          parentAccountId: true,
          parentAccount: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              journalLines: true,
              ledgerLines: true,
            },
          },
        }),
      }),
    );
    expect(result).toHaveLength(1);
    expect(result[0].canDelete).toBe(true);
  });

  it('marks accounts with transfer usage as non-deletable in the table view', async () => {
    prisma.account.findMany.mockResolvedValue([
      {
        id: 'cash',
        code: '1100001',
        name: 'Cash',
        type: 'ASSET',
        isPosting: true,
        isActive: true,
        currentBalance: { toString: () => '150.00' },
        parentAccountId: 'assets',
        parentAccount: { id: 'assets', name: 'Assets' },
        bankCashAccount: null,
        _count: {
          childAccounts: 0,
          journalLines: 1,
          ledgerLines: 1,
        },
      },
    ]);

    const result = await service.listTableRows({ isActive: 'true' });

    expect(result[0].canDelete).toBe(false);
  });

  it('marks accounts with child accounts as deletable in the table view if the subtree is clean', async () => {
    prisma.account.findMany.mockResolvedValueOnce([
      {
        id: 'assets',
        code: '1100000',
        name: 'Assets',
        type: 'ASSET',
        isPosting: false,
        isActive: true,
        currentBalance: { toString: () => '0.00' },
        parentAccountId: null,
        parentAccount: null,
        _count: {
          journalLines: 0,
          ledgerLines: 0,
        },
      },
    ]);

    // Mock getDescendantIds and hasAnyTransferHistory
    prisma.account.findMany.mockResolvedValueOnce([]); // No children for getDescendantIds
    prisma.journalEntryLine.findFirst.mockResolvedValue(null);
    prisma.ledgerTransaction.findFirst.mockResolvedValue(null);

    const result = await service.listTableRows({ isActive: 'true' });

    expect(result[0].canDelete).toBe(true);
  });

  it('rejects creating a child under a posting account', async () => {
    prisma.account.findUnique.mockResolvedValue({
      id: 'cash',
      name: 'Cash',
      isPosting: true,
      type: 'ASSET',
    });

    await expect(
      service.create({
        name: 'Petty Cash',
        parentAccountId: 'cash',
      } as never),
    ).rejects.toThrow('Posting account "Cash" cannot have child accounts.');

    expect(prisma.account.create).not.toHaveBeenCalled();
  });

  it('rejects converting an account with children into a posting account', async () => {
    prisma.account.findUnique.mockResolvedValue({
      id: 'assets',
      name: 'Assets',
      isPosting: false,
    });
    prisma.account.findFirst.mockResolvedValue({ id: 'cash' });

    await expect(
      service.update('assets', {
        isPosting: true,
      }),
    ).rejects.toThrow('Posting accounts must be leaf nodes and cannot have child accounts.');

    expect(prisma.account.update).not.toHaveBeenCalled();
  });

  it('ignores any client-supplied code and uses the generated code instead', async () => {
    prisma.account.create.mockResolvedValue({ id: 'new-account', code: '2' });
    prisma.account.findFirst.mockResolvedValue(null);
    prisma.account.findUnique.mockImplementation((args: { where: { id?: string; code?: string } }) => {
      if ('code' in args.where && args.where.code === '1000000') {
        return { id: 'existing-root' };
      }
      return null;
    });

    await service.create({
      code: '9999',
      name: 'Generated Code Account',
      type: 'ASSET',
    } as never);

    expect(prisma.account.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          code: '1',
          name: 'Generated Code Account',
        }),
      }),
    );
  });

  it('avoids globally occupied codes even when siblings suggest that code', async () => {
    prisma.account.create.mockResolvedValue({ id: 'new-account', code: '2' });
    prisma.account.findUnique.mockImplementation((args: { where: { id?: string; code?: string } }) => {
      if ('code' in args.where && args.where.code === '1') {
        return { id: 'existing-root' };
      }
      if ('code' in args.where && args.where.code === '1000000') {
        return { id: 'existing-numeric-root' };
      }
      return null;
    });

    await service.create({
      name: 'Second root-style account',
      type: 'ASSET',
    } as never);

    expect(prisma.account.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          code: '2',
          name: 'Second root-style account',
        }),
      }),
    );
  });

  it('deletes an account when it has no transfer history and no children', async () => {
    prisma.account.findUnique.mockResolvedValue({
      id: 'unused-account',
      name: 'Unused Account',
      isPosting: true,
    });
    prisma.account.findMany.mockResolvedValue([]); // No children
    prisma.account.findFirst.mockResolvedValue(null); // No children (second check)

    const result = await service.remove('unused-account');

    expect(prisma.account.delete).toHaveBeenCalledWith({
      where: { id: 'unused-account' },
    });
  });

  it('rejects deleting an account that has direct journal usage', async () => {
    prisma.account.findUnique.mockResolvedValue({
      id: 'cash',
      name: 'Cash',
      isPosting: true,
    });
    prisma.account.findMany.mockResolvedValue([]); // No children
    prisma.journalEntryLine.findFirst.mockResolvedValue({ id: 'line-1' });

    await expect(service.remove('cash')).rejects.toThrow(
      'Cannot delete an account that has transfer history.',
    );
  });

  it('rejects deleting an account when its child has transfers', async () => {
    prisma.account.findUnique.mockResolvedValue({
      id: 'assets-header',
      name: 'Assets Header',
      isPosting: false,
    });
    // First call to getDescendantIds find children of assets-header
    prisma.account.findMany.mockResolvedValueOnce([{ id: 'child-account' }]);
    // Second call to getDescendantIds (recursive) find children of child-account
    prisma.account.findMany.mockResolvedValueOnce([]);

    // Check transfers for [assets-header, child-account]
    prisma.journalEntryLine.findFirst.mockResolvedValue({ id: 'line-child' });

    await expect(service.remove('assets-header')).rejects.toThrow(
      'Cannot delete an account that has transfer history (including its subtree).',
    );
  });

  it('cascades deletion to clean children when deleting a head account', async () => {
    prisma.account.findUnique.mockResolvedValue({
      id: 'clean-header',
      name: 'Clean Header',
      isPosting: false,
    });

    // getDescendantIds
    prisma.account.findMany.mockResolvedValueOnce([{ id: 'child-1' }]); // children of clean-header
    prisma.account.findMany.mockResolvedValueOnce([]); // children of child-1

    // hasAnyTransferHistory calls
    prisma.journalEntryLine.findFirst.mockResolvedValue(null);
    prisma.ledgerTransaction.findFirst.mockResolvedValue(null);

    await service.remove('clean-header');

    // Should delete child first (because it was reversed), then header
    expect(prisma.account.delete).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'child-1' } }));
    expect(prisma.account.delete).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'clean-header' } }));
  });
});
