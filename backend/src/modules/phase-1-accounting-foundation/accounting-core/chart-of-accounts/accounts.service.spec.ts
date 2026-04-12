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
    },
  };

  let service: AccountsService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.account.findUnique.mockReset();
    prisma.account.findUnique.mockResolvedValue(null);
    prisma.account.findFirst.mockReset();
    prisma.account.findFirst.mockResolvedValue(null);
    prisma.$executeRaw.mockResolvedValue(undefined);
    prisma.$queryRaw.mockResolvedValue([]);
    prisma.$transaction.mockImplementation(async (callback: (tx: typeof prisma) => Promise<unknown>) => callback(prisma as never));
    service = new AccountsService(prisma as never);
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
});
