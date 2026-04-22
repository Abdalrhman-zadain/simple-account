import { BadRequestException, Injectable } from '@nestjs/common';
import { InventoryCostingMethod, InventoryStockMovementType, Prisma } from '../../../../generated/prisma';

import { JournalEntriesService } from '../../../phase-1-accounting-foundation/accounting-core/journal-entries/journal-entries.service';
import { PostingService } from '../../../phase-1-accounting-foundation/accounting-core/posting-logic/posting.service';
import { InventoryPolicyService } from '../policy/policy.service';

type BalanceDelta = {
  itemId: string;
  warehouseId: string;
  quantityDelta: Prisma.Decimal;
  valueDelta: Prisma.Decimal;
};

type MovementCreateInput = {
  movementType: InventoryStockMovementType;
  transactionType: string;
  transactionId: string;
  transactionLineId?: string | null;
  transactionReference: string;
  transactionDate: Date;
  itemId: string;
  warehouseId: string;
  quantityIn?: Prisma.Decimal;
  quantityOut?: Prisma.Decimal;
  unitCost: Prisma.Decimal;
  valueIn?: Prisma.Decimal;
  valueOut?: Prisma.Decimal;
  balanceId?: string;
  runningQuantity: Prisma.Decimal;
  runningValuation: Prisma.Decimal;
  description?: string | null;
};

type IssueCostInput = {
  tx: Prisma.TransactionClient;
  itemId: string;
  warehouseId: string;
  quantity: Prisma.Decimal;
  fallbackUnitCost: Prisma.Decimal;
  reference: string;
  sourceType: string;
  sourceId: string;
  sourceLineId?: string;
  sourceDate: Date;
  costingMethod?: InventoryCostingMethod;
};

@Injectable()
export class InventoryPostingService {
  constructor(
    private readonly journalEntriesService: JournalEntriesService,
    private readonly postingService: PostingService,
    private readonly inventoryPolicyService: InventoryPolicyService,
  ) {}

  getEnvCostingMethod() {
    const raw = (process.env.INVENTORY_COSTING_METHOD ?? 'WEIGHTED_AVERAGE').trim().toUpperCase();
    return raw === 'FIFO' ? InventoryCostingMethod.FIFO : InventoryCostingMethod.WEIGHTED_AVERAGE;
  }

  async getCostingMethod() {
    return this.inventoryPolicyService.getCostingMethodOrDefault(this.getEnvCostingMethod());
  }

  isAccountingEnabled() {
    return this.parseBoolean(process.env.INVENTORY_ACCOUNTING_ENABLED, false);
  }

  preventNegativeStock() {
    return this.parseBoolean(process.env.INVENTORY_PREVENT_NEGATIVE_STOCK, true);
  }

  averageUnitCost(quantity: Prisma.Decimal | string, value: Prisma.Decimal | string) {
    const q = new Prisma.Decimal(quantity);
    if (q.lte(0)) {
      return new Prisma.Decimal(0);
    }
    return new Prisma.Decimal(value).div(q);
  }

  async applyWarehouseBalance(tx: Prisma.TransactionClient, delta: BalanceDelta) {
    await tx.inventoryWarehouseBalance.upsert({
      where: {
        itemId_warehouseId: {
          itemId: delta.itemId,
          warehouseId: delta.warehouseId,
        },
      },
      create: {
        itemId: delta.itemId,
        warehouseId: delta.warehouseId,
        onHandQuantity: delta.quantityDelta,
        valuationAmount: delta.valueDelta,
      },
      update: {
        onHandQuantity: {
          increment: delta.quantityDelta,
        },
        valuationAmount: {
          increment: delta.valueDelta,
        },
      },
    });

    const balance = await tx.inventoryWarehouseBalance.findUniqueOrThrow({
      where: {
        itemId_warehouseId: {
          itemId: delta.itemId,
          warehouseId: delta.warehouseId,
        },
      },
    });

    return balance;
  }

  async createMovement(tx: Prisma.TransactionClient, movement: MovementCreateInput) {
    await tx.inventoryStockMovement.create({
      data: {
        movementType: movement.movementType,
        transactionType: movement.transactionType,
        transactionId: movement.transactionId,
        transactionLineId: movement.transactionLineId ?? null,
        transactionReference: movement.transactionReference,
        transactionDate: movement.transactionDate,
        itemId: movement.itemId,
        warehouseId: movement.warehouseId,
        quantityIn: movement.quantityIn ?? new Prisma.Decimal(0),
        quantityOut: movement.quantityOut ?? new Prisma.Decimal(0),
        unitCost: movement.unitCost,
        valueIn: movement.valueIn ?? new Prisma.Decimal(0),
        valueOut: movement.valueOut ?? new Prisma.Decimal(0),
        balanceId: movement.balanceId,
        runningQuantity: movement.runningQuantity,
        runningValuation: movement.runningValuation,
        description: movement.description ?? null,
      },
    });
  }

  async addCostLayer(
    tx: Prisma.TransactionClient,
    input: {
      itemId: string;
      warehouseId: string;
      quantity: Prisma.Decimal;
      unitCost: Prisma.Decimal;
      movementType: InventoryStockMovementType;
      sourceType: string;
      sourceId: string;
      sourceLineId?: string;
      sourceReference?: string;
      sourceDate: Date;
    },
  ) {
    if (input.quantity.lte(0)) {
      return;
    }

    await tx.inventoryCostLayer.create({
      data: {
        itemId: input.itemId,
        warehouseId: input.warehouseId,
        remainingQuantity: input.quantity,
        unitCost: input.unitCost,
        sourceMovementType: input.movementType,
        sourceTransactionType: input.sourceType,
        sourceTransactionId: input.sourceId,
        sourceLineId: input.sourceLineId ?? null,
        sourceReference: input.sourceReference ?? null,
        sourceDate: input.sourceDate,
      },
    });
  }

  async resolveIssueCost(input: IssueCostInput) {
    const { tx, itemId, warehouseId, quantity, fallbackUnitCost, reference, sourceType, sourceId, sourceLineId, sourceDate } = input;
    const costingMethod = input.costingMethod ?? (await this.getCostingMethod());

    if (costingMethod === InventoryCostingMethod.WEIGHTED_AVERAGE) {
      return {
        unitCost: fallbackUnitCost,
        totalAmount: fallbackUnitCost.mul(quantity),
      };
    }

    let remaining = new Prisma.Decimal(quantity);
    let totalAmount = new Prisma.Decimal(0);

    const layers = await tx.inventoryCostLayer.findMany({
      where: {
        itemId,
        warehouseId,
        remainingQuantity: {
          gt: 0,
        },
      },
      orderBy: [{ sourceDate: 'asc' }, { createdAt: 'asc' }],
    });

    for (const layer of layers) {
      if (remaining.lte(0)) {
        break;
      }

      const consumeQty = layer.remainingQuantity.gte(remaining) ? remaining : layer.remainingQuantity;
      if (consumeQty.lte(0)) {
        continue;
      }

      const consumeValue = consumeQty.mul(layer.unitCost);
      totalAmount = totalAmount.add(consumeValue);
      remaining = remaining.sub(consumeQty);

      await tx.inventoryCostLayer.update({
        where: { id: layer.id },
        data: {
          remainingQuantity: {
            decrement: consumeQty,
          },
        },
      });
    }

    if (remaining.gt(0)) {
      if (this.preventNegativeStock()) {
        throw new BadRequestException(`Item does not have enough FIFO layers for ${reference}.`);
      }

      totalAmount = totalAmount.add(remaining.mul(fallbackUnitCost));
      await tx.inventoryCostLayer.create({
        data: {
          itemId,
          warehouseId,
          remainingQuantity: remaining.neg(),
          unitCost: fallbackUnitCost,
          sourceMovementType: InventoryStockMovementType.GOODS_ISSUE,
          sourceTransactionType: sourceType,
          sourceTransactionId: sourceId,
          sourceLineId: sourceLineId ?? null,
          sourceReference: reference,
          sourceDate,
        },
      });
      remaining = new Prisma.Decimal(0);
    }

    const unitCost = quantity.gt(0) ? totalAmount.div(quantity) : new Prisma.Decimal(0);
    return {
      unitCost,
      totalAmount,
    };
  }

  async createAndPostJournalEntry(
    reference: string,
    entryDate: Date,
    description: string,
    lines: Array<{ accountId: string; debitAmount: number; creditAmount: number; description?: string }>,
  ) {
    const grouped = new Map<string, { debit: number; credit: number; description?: string }>();

    for (const line of lines) {
      if (line.debitAmount === 0 && line.creditAmount === 0) {
        continue;
      }
      const current = grouped.get(line.accountId) ?? { debit: 0, credit: 0, description: line.description };
      current.debit += line.debitAmount;
      current.credit += line.creditAmount;
      grouped.set(line.accountId, current);
    }

    const normalized = [...grouped.entries()].map(([accountId, value]) => ({
      accountId,
      description: value.description,
      debitAmount: Number(value.debit.toFixed(2)),
      creditAmount: Number(value.credit.toFixed(2)),
    }));

    const totalDebit = normalized.reduce((sum, line) => sum + line.debitAmount, 0);
    const totalCredit = normalized.reduce((sum, line) => sum + line.creditAmount, 0);
    if (Number((totalDebit - totalCredit).toFixed(2)) !== 0) {
      throw new BadRequestException(`Inventory accounting entry for ${reference} is not balanced.`);
    }

    const created = await this.journalEntriesService.create({
      entryDate: entryDate.toISOString(),
      description,
      lines: normalized,
    });
    await this.postingService.post(created.id);
    return created.id;
  }

  private parseBoolean(value: string | undefined, fallback: boolean) {
    if (!value) {
      return fallback;
    }
    const normalized = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) {
      return true;
    }
    if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) {
      return false;
    }
    return fallback;
  }
}
