import { AccountsService } from './accounts.service';

describe('AccountsService', () => {
  const prisma = {
    account: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };

  let service: AccountsService;

  beforeEach(() => {
    jest.clearAllMocks();
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
});
