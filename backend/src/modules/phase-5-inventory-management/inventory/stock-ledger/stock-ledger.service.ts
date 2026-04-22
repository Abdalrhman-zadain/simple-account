import { BadRequestException, Injectable } from '@nestjs/common';
import { InventoryStockMovementType, Prisma } from '../../../../generated/prisma';

import { PrismaService } from '../../../../common/prisma/prisma.service';

type StockLedgerListQuery = {
  itemId?: string;
  warehouseId?: string;
  movementType?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
};

type StockMovementWithRelations = Prisma.InventoryStockMovementGetPayload<{
  include: {
    item: {
      select: {
        id: true;
        code: true;
        name: true;
        unitOfMeasure: true;
      };
    };
    warehouse: {
      select: {
        id: true;
        code: true;
        name: true;
      };
    };
  };
}>;

@Injectable()
export class StockLedgerService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: StockLedgerListQuery = {}) {
    const search = query.search?.trim();
    const rows = await this.prisma.inventoryStockMovement.findMany({
      where: {
        itemId: query.itemId,
        warehouseId: query.warehouseId,
        movementType: this.parseMovementType(query.movementType),
        transactionDate: this.dateRangeFilter(query.dateFrom, query.dateTo),
        OR: search
          ? [
              { transactionReference: { contains: search, mode: 'insensitive' } },
              { transactionType: { contains: search, mode: 'insensitive' } },
              { item: { code: { contains: search, mode: 'insensitive' } } },
              { item: { name: { contains: search, mode: 'insensitive' } } },
              { warehouse: { code: { contains: search, mode: 'insensitive' } } },
              { warehouse: { name: { contains: search, mode: 'insensitive' } } },
            ]
          : undefined,
      },
      include: {
        item: {
          select: {
            id: true,
            code: true,
            name: true,
            unitOfMeasure: true,
          },
        },
        warehouse: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
      orderBy: [{ transactionDate: 'asc' }, { createdAt: 'asc' }],
    });

    return rows.map((row) => this.mapMovement(row));
  }

  private mapMovement(row: StockMovementWithRelations) {
    return {
      id: row.id,
      movementType: row.movementType,
      transactionType: row.transactionType,
      transactionId: row.transactionId,
      transactionLineId: row.transactionLineId,
      transactionReference: row.transactionReference,
      transactionDate: row.transactionDate.toISOString(),
      quantityIn: row.quantityIn.toString(),
      quantityOut: row.quantityOut.toString(),
      unitCost: row.unitCost.toString(),
      valueIn: row.valueIn.toString(),
      valueOut: row.valueOut.toString(),
      runningQuantity: row.runningQuantity.toString(),
      runningValuation: row.runningValuation.toString(),
      description: row.description,
      item: {
        id: row.item.id,
        code: row.item.code,
        name: row.item.name,
        unitOfMeasure: row.item.unitOfMeasure,
      },
      warehouse: {
        id: row.warehouse.id,
        code: row.warehouse.code,
        name: row.warehouse.name,
      },
      createdAt: row.createdAt.toISOString(),
    };
  }

  private parseMovementType(value?: string) {
    if (!value) {
      return undefined;
    }
    if (value in InventoryStockMovementType) {
      return value as InventoryStockMovementType;
    }
    throw new BadRequestException('Invalid stock movement type.');
  }

  private dateRangeFilter(dateFrom?: string, dateTo?: string) {
    return dateFrom || dateTo
      ? {
          gte: dateFrom ? new Date(dateFrom) : undefined,
          lte: dateTo ? new Date(dateTo) : undefined,
        }
      : undefined;
  }
}
