import { BadRequestException, Injectable } from "@nestjs/common";
import {
  InventoryStockMovementType,
  Prisma,
} from "../../../../generated/prisma";

import { PrismaService } from "../../../../common/prisma/prisma.service";

type StockLedgerListQuery = {
  itemId?: string;
  warehouseId?: string;
  movementType?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: string;
  limit?: string;
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
    const page = this.parsePaginationNumber(query.page, {
      fallback: 1,
      min: 1,
      max: 10_000,
      label: "Page",
    });
    const limit = this.parsePaginationNumber(query.limit, {
      fallback: 20,
      min: 1,
      max: 100,
      label: "Limit",
    });
    const skip = (page - 1) * limit;
    const search = query.search?.trim();
    const where: Prisma.InventoryStockMovementWhereInput = {
      itemId: query.itemId,
      warehouseId: query.warehouseId,
      movementType: this.parseMovementType(query.movementType),
      transactionDate: this.dateRangeFilter(query.dateFrom, query.dateTo),
      OR: search
        ? [
            { transactionReference: { contains: search, mode: "insensitive" } },
            { transactionType: { contains: search, mode: "insensitive" } },
            { item: { code: { contains: search, mode: "insensitive" } } },
            { item: { name: { contains: search, mode: "insensitive" } } },
            { warehouse: { code: { contains: search, mode: "insensitive" } } },
            { warehouse: { name: { contains: search, mode: "insensitive" } } },
          ]
        : undefined,
    };

    const [total, rows] = await Promise.all([
      this.prisma.inventoryStockMovement.count({ where }),
      this.prisma.inventoryStockMovement.findMany({
        where,
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
        orderBy: [{ transactionDate: "asc" }, { createdAt: "asc" }],
        skip,
        take: limit,
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return {
      data: rows.map((row) => this.mapMovement(row)),
      page,
      limit,
      total,
      totalPages,
    };
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
    throw new BadRequestException("Invalid stock movement type.");
  }

  private dateRangeFilter(dateFrom?: string, dateTo?: string) {
    return dateFrom || dateTo
      ? {
          gte: dateFrom ? new Date(dateFrom) : undefined,
          lte: dateTo ? new Date(dateTo) : undefined,
        }
      : undefined;
  }

  private parsePaginationNumber(
    value: string | undefined,
    options: { fallback: number; min: number; max: number; label: string },
  ) {
    if (!value?.trim()) {
      return options.fallback;
    }

    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || Number.isNaN(parsed)) {
      throw new BadRequestException(
        `${options.label} must be a valid integer.`,
      );
    }
    if (parsed < options.min || parsed > options.max) {
      throw new BadRequestException(
        `${options.label} must be between ${options.min} and ${options.max}.`,
      );
    }

    return parsed;
  }
}
