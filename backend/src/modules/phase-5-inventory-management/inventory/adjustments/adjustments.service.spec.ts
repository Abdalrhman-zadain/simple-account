import { BadRequestException } from '@nestjs/common';
import { InventoryAdjustmentStatus, Prisma } from '../../../../generated/prisma';

import { AdjustmentsService } from './adjustments.service';

describe('AdjustmentsService', () => {
  const tx = {
    inventoryAdjustmentLine: {
      update: jest.fn(),
    },
    inventoryItem: {
      update: jest.fn(),
    },
    inventoryAdjustment: {
      update: jest.fn(),
    },
    inventoryWarehouseBalance: {
      findUnique: jest.fn(),
    },
  };

  const prisma = {
    inventoryAdjustment: {
      findUnique: jest.fn(),
    },
    inventoryItem: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn(async (callback: (transaction: typeof tx) => Promise<unknown>) => callback(tx)),
  };

  const auditService = {
    log: jest.fn(),
  };
  const itemMasterService = {};
  const inventoryPostingService = {
    preventNegativeStock: jest.fn().mockReturnValue(true),
    isAccountingEnabled: jest.fn().mockReturnValue(false),
    averageUnitCost: jest.fn(),
    resolveIssueCost: jest.fn(),
    addCostLayer: jest.fn(),
    applyWarehouseBalance: jest.fn(),
    createMovement: jest.fn(),
    createAndPostJournalEntry: jest.fn(),
  };
  const warehousesService = {
    getActiveWarehouseReference: jest.fn(),
  };

  let service: AdjustmentsService;

  beforeEach(() => {
    jest.clearAllMocks();
    tx.inventoryAdjustmentLine.update.mockReset();
    tx.inventoryItem.update.mockReset();
    tx.inventoryAdjustment.update.mockReset();
    tx.inventoryWarehouseBalance.findUnique.mockReset();
    prisma.inventoryAdjustment.findUnique.mockReset();
    prisma.inventoryItem.findMany.mockReset();
    service = new AdjustmentsService(
      prisma as never,
      auditService as never,
      itemMasterService as never,
      inventoryPostingService as never,
      warehousesService as never,
    );
    warehousesService.getActiveWarehouseReference.mockResolvedValue({ id: 'wh-1', code: 'MAIN', name: 'Main Warehouse' });
    inventoryPostingService.applyWarehouseBalance.mockResolvedValue({
      id: 'bal-1',
      onHandQuantity: decimal(10),
      valuationAmount: decimal(50),
    });
    inventoryPostingService.averageUnitCost.mockReturnValue(decimal(5));
  });

  it('posts draft adjustments with positive variance and increases item balances', async () => {
    prisma.inventoryAdjustment.findUnique.mockResolvedValue(
      draftAdjustmentRow({
        warehouseId: 'wh-1',
        lines: [
          {
            id: 'line-1',
            itemId: 'item-1',
            lineNumber: 1,
            systemQuantity: decimal(8),
            countedQuantity: decimal(10),
          },
        ],
      }),
    );
    prisma.inventoryItem.findMany.mockResolvedValue([
      {
        id: 'item-1',
        code: 'ITEM-1',
        isActive: true,
        onHandQuantity: decimal(20),
        valuationAmount: decimal(100),
      },
    ]);
    tx.inventoryWarehouseBalance.findUnique.mockResolvedValue({
      itemId: 'item-1',
      warehouseId: 'wh-1',
      onHandQuantity: decimal(8),
      valuationAmount: decimal(40),
    });
    tx.inventoryAdjustment.update.mockResolvedValue(
      postedAdjustmentRow({
        status: InventoryAdjustmentStatus.POSTED,
        totalVarianceQuantity: decimal(2),
        totalAmount: decimal(10),
        lines: [
          postedLineRow({
            id: 'line-1',
            lineNumber: 1,
            systemQuantity: decimal(8),
            countedQuantity: decimal(10),
            varianceQuantity: decimal(2),
            unitCost: decimal(5),
            lineTotalAmount: decimal(10),
            itemId: 'item-1',
            itemCode: 'ITEM-1',
            itemOnHandQuantity: decimal(22),
            itemValuationAmount: decimal(110),
          }),
        ],
      }),
    );

    const result = await service.post('adj-1');

    expect(tx.inventoryItem.update).toHaveBeenCalledWith({
      where: { id: 'item-1' },
      data: {
        onHandQuantity: { increment: decimal(2) },
        valuationAmount: { increment: decimal(10) },
      },
    });
    expect(inventoryPostingService.createMovement).toHaveBeenCalled();
    expect(result.status).toBe(InventoryAdjustmentStatus.POSTED);
    expect(result.totalVarianceQuantity).toBe('2');
    expect(result.totalAmount).toBe('10');
  });

  it('posts draft adjustments with negative variance and decreases item balances', async () => {
    prisma.inventoryAdjustment.findUnique.mockResolvedValue(
      draftAdjustmentRow({
        warehouseId: 'wh-1',
        lines: [
          {
            id: 'line-1',
            itemId: 'item-1',
            lineNumber: 1,
            systemQuantity: decimal(10),
            countedQuantity: decimal(7),
          },
        ],
      }),
    );
    prisma.inventoryItem.findMany.mockResolvedValue([
      {
        id: 'item-1',
        code: 'ITEM-1',
        isActive: true,
        onHandQuantity: decimal(20),
        valuationAmount: decimal(100),
      },
    ]);
    tx.inventoryWarehouseBalance.findUnique.mockResolvedValue({
      itemId: 'item-1',
      warehouseId: 'wh-1',
      onHandQuantity: decimal(10),
      valuationAmount: decimal(50),
    });
    inventoryPostingService.resolveIssueCost.mockResolvedValue({
      unitCost: decimal(5),
      totalAmount: decimal(15),
    });
    tx.inventoryAdjustment.update.mockResolvedValue(
      postedAdjustmentRow({
        status: InventoryAdjustmentStatus.POSTED,
        totalVarianceQuantity: decimal(-3),
        totalAmount: decimal(-15),
        lines: [
          postedLineRow({
            id: 'line-1',
            lineNumber: 1,
            systemQuantity: decimal(10),
            countedQuantity: decimal(7),
            varianceQuantity: decimal(-3),
            unitCost: decimal(5),
            lineTotalAmount: decimal(-15),
            itemId: 'item-1',
            itemCode: 'ITEM-1',
            itemOnHandQuantity: decimal(17),
            itemValuationAmount: decimal(85),
          }),
        ],
      }),
    );

    const result = await service.post('adj-1');

    expect(tx.inventoryItem.update).toHaveBeenCalledWith({
      where: { id: 'item-1' },
      data: {
        onHandQuantity: { increment: decimal(-3) },
        valuationAmount: { increment: decimal(-15) },
      },
    });
    expect(result.status).toBe(InventoryAdjustmentStatus.POSTED);
    expect(result.totalVarianceQuantity).toBe('-3');
    expect(result.totalAmount).toBe('-15');
  });

  it('rejects posting when a line targets an inactive item', async () => {
    prisma.inventoryAdjustment.findUnique.mockResolvedValue(
      draftAdjustmentRow({
        warehouseId: 'wh-1',
        lines: [
          {
            id: 'line-1',
            itemId: 'item-1',
            lineNumber: 1,
            systemQuantity: decimal(4),
            countedQuantity: decimal(1),
          },
        ],
      }),
    );
    prisma.inventoryItem.findMany.mockResolvedValue([
      {
        id: 'item-1',
        code: 'ITEM-1',
        isActive: false,
        onHandQuantity: decimal(1),
        valuationAmount: decimal(5),
      },
    ]);
    tx.inventoryWarehouseBalance.findUnique.mockResolvedValue({
      itemId: 'item-1',
      warehouseId: 'wh-1',
      onHandQuantity: decimal(1),
      valuationAmount: decimal(5),
    });

    await expect(service.post('adj-1')).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.inventoryAdjustment.update).not.toHaveBeenCalled();
    expect(auditService.log).not.toHaveBeenCalled();
  });
});

function decimal(value: string | number) {
  return new Prisma.Decimal(value);
}

function draftAdjustmentRow(overrides: Record<string, unknown>) {
  return {
    id: 'adj-1',
    reference: 'ADJ-001',
    status: InventoryAdjustmentStatus.DRAFT,
    adjustmentDate: new Date('2026-04-22T00:00:00.000Z'),
    warehouseId: 'wh-1',
    reason: 'Stock Count',
    description: null,
    totalVarianceQuantity: decimal(0),
    totalAmount: decimal(0),
    postedAt: null,
    createdAt: new Date('2026-04-22T00:00:00.000Z'),
    updatedAt: new Date('2026-04-22T00:00:00.000Z'),
    lines: [],
    ...overrides,
  };
}

function postedAdjustmentRow(overrides: Record<string, unknown>) {
  return {
    id: 'adj-1',
    reference: 'ADJ-001',
    status: InventoryAdjustmentStatus.POSTED,
    adjustmentDate: new Date('2026-04-22T00:00:00.000Z'),
    warehouseId: 'wh-1',
    reason: 'Stock Count',
    description: null,
    totalVarianceQuantity: decimal(0),
    totalAmount: decimal(0),
    postedAt: new Date('2026-04-22T01:00:00.000Z'),
    createdAt: new Date('2026-04-22T00:00:00.000Z'),
    updatedAt: new Date('2026-04-22T01:00:00.000Z'),
    warehouse: {
      id: 'wh-1',
      code: 'MAIN',
      name: 'Main Warehouse',
      isActive: true,
      isTransit: false,
    },
    lines: [],
    ...overrides,
  };
}

function postedLineRow(overrides: Record<string, unknown>) {
  return {
    id: 'line-1',
    lineNumber: 1,
    systemQuantity: decimal(0),
    countedQuantity: decimal(0),
    varianceQuantity: decimal(0),
    unitCost: decimal(0),
    unitOfMeasure: 'pcs',
    description: null,
    lineTotalAmount: decimal(0),
    ...overrides,
    item: {
      id: overrides.itemId ?? 'item-1',
      code: overrides.itemCode ?? 'ITEM-1',
      name: 'Item 1',
      unitOfMeasure: 'pcs',
      type: 'INVENTORY',
      isActive: true,
      onHandQuantity: overrides.itemOnHandQuantity ?? decimal(0),
      valuationAmount: overrides.itemValuationAmount ?? decimal(0),
    },
  };
}
