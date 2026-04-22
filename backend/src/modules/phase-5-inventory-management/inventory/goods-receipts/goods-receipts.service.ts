import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { AuditAction, InventoryStockMovementType, InventoryReceiptStatus, Prisma } from '../../../../generated/prisma';

import { PrismaService } from '../../../../common/prisma/prisma.service';
import { AuditService } from '../../../phase-1-accounting-foundation/accounting-core/audit/audit.service';
import { ItemMasterService } from '../item-master/item-master.service';
import { InventoryPostingService } from '../shared/inventory-posting.service';
import { WarehousesService } from '../warehouses/warehouses.service';
import {
  CreateInventoryGoodsReceiptDto,
  InventoryGoodsReceiptLineDto,
  UpdateInventoryGoodsReceiptDto,
} from './dto/goods-receipts.dto';

type GoodsReceiptListQuery = {
  status?: string;
  warehouseId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: string;
  limit?: string;
};

type ResolvedReceiptLine = {
  itemId: string;
  lineNumber: number;
  itemCode: string;
  itemName: string;
  quantity: Prisma.Decimal;
  unitCost: Prisma.Decimal;
  unitOfMeasure: string;
  description: string | null;
  lineTotalAmount: Prisma.Decimal;
};

type InventoryGoodsReceiptWithRelations = Prisma.InventoryGoodsReceiptGetPayload<{
  include: {
    warehouse: {
      select: {
        id: true;
        code: true;
        name: true;
        isActive: true;
        isTransit: true;
      };
    };
    lines: {
      orderBy: {
        lineNumber: 'asc';
      };
      include: {
        item: {
          select: {
            id: true;
            code: true;
            name: true;
            unitOfMeasure: true;
            type: true;
            isActive: true;
          };
        };
      };
    };
  };
}>;

@Injectable()
export class GoodsReceiptsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly itemMasterService: ItemMasterService,
    private readonly inventoryPostingService: InventoryPostingService,
    private readonly warehousesService: WarehousesService,
  ) {}

  async list(query: GoodsReceiptListQuery = {}) {
    const page = this.parsePaginationNumber(query.page, { fallback: 1, min: 1, max: 10_000, label: 'Page' });
    const limit = this.parsePaginationNumber(query.limit, { fallback: 20, min: 1, max: 100, label: 'Limit' });
    const skip = (page - 1) * limit;
    const search = query.search?.trim();
    const where: Prisma.InventoryGoodsReceiptWhereInput = {
      status: this.parseStatus(query.status),
      warehouseId: query.warehouseId,
      receiptDate: this.dateRangeFilter(query.dateFrom, query.dateTo),
      OR: search
        ? [
            { reference: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
            { sourcePurchaseOrderRef: { contains: search, mode: 'insensitive' } },
            { sourcePurchaseInvoiceRef: { contains: search, mode: 'insensitive' } },
            { warehouse: { code: { contains: search, mode: 'insensitive' } } },
            { warehouse: { name: { contains: search, mode: 'insensitive' } } },
            { lines: { some: { item: { code: { contains: search, mode: 'insensitive' } } } } },
            { lines: { some: { item: { name: { contains: search, mode: 'insensitive' } } } } },
          ]
        : undefined,
    };

    const [total, rows] = await Promise.all([
      this.prisma.inventoryGoodsReceipt.count({ where }),
      this.prisma.inventoryGoodsReceipt.findMany({
        where,
        include: this.goodsReceiptInclude(),
        orderBy: [{ receiptDate: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return {
      data: rows.map((row) => this.mapGoodsReceipt(row)),
      page,
      limit,
      total,
      totalPages,
    };
  }

  async getById(id: string) {
    const row = await this.prisma.inventoryGoodsReceipt.findUnique({
      where: { id },
      include: this.goodsReceiptInclude(),
    });
    if (!row) {
      throw new BadRequestException(`Inventory goods receipt ${id} was not found.`);
    }
    return this.mapGoodsReceipt(row);
  }

  async create(dto: CreateInventoryGoodsReceiptDto) {
    const warehouse = await this.warehousesService.getActiveWarehouseReference(dto.warehouseId);
    if (!warehouse) {
      throw new BadRequestException('Receiving warehouse is required.');
    }
    const reference = dto.reference?.trim() || this.generateReference('GRN');
    const lines = await this.resolveLines(dto.lines);
    const totals = this.calculateTotals(lines);

    try {
      const created = await this.prisma.inventoryGoodsReceipt.create({
        data: {
          reference,
          receiptDate: new Date(dto.receiptDate),
          warehouseId: warehouse.id,
          sourcePurchaseOrderRef: dto.sourcePurchaseOrderRef?.trim() || null,
          sourcePurchaseInvoiceRef: dto.sourcePurchaseInvoiceRef?.trim() || null,
          description: dto.description?.trim() || null,
          totalQuantity: totals.totalQuantity,
          totalAmount: totals.totalAmount,
          lines: {
            create: lines.map((line, index) => ({
              itemId: line.itemId,
              lineNumber: index + 1,
              quantity: line.quantity,
              unitCost: line.unitCost,
              unitOfMeasure: line.unitOfMeasure,
              description: line.description,
              lineTotalAmount: line.lineTotalAmount,
            })),
          },
        },
        include: this.goodsReceiptInclude(),
      });

      await this.auditService.log({
        entity: 'InventoryGoodsReceipt',
        entityId: created.id,
        action: AuditAction.CREATE,
        details: { status: created.status, reference: created.reference, warehouseId: created.warehouseId },
      });

      return this.mapGoodsReceipt(created);
    } catch (error) {
      if (this.isUniqueConflict(error, 'reference')) {
        throw new ConflictException('An inventory goods receipt with this reference already exists.');
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateInventoryGoodsReceiptDto) {
    const current = await this.getGoodsReceiptOrThrow(id);
    if (current.status !== InventoryReceiptStatus.DRAFT) {
      throw new BadRequestException('Only draft inventory goods receipts can be edited.');
    }

    const warehouse = dto.warehouseId ? await this.warehousesService.getActiveWarehouseReference(dto.warehouseId) : null;
    const lines = dto.lines ? await this.resolveLines(dto.lines) : null;
    const totals = lines
      ? this.calculateTotals(lines)
      : {
          totalQuantity: current.totalQuantity,
          totalAmount: current.totalAmount,
        };

    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        if (lines) {
          await tx.inventoryGoodsReceiptLine.deleteMany({ where: { goodsReceiptId: id } });
        }

        return tx.inventoryGoodsReceipt.update({
          where: { id },
          data: {
            reference: dto.reference?.trim(),
            receiptDate: dto.receiptDate ? new Date(dto.receiptDate) : undefined,
            warehouseId: warehouse?.id,
            sourcePurchaseOrderRef:
              dto.sourcePurchaseOrderRef === undefined ? undefined : dto.sourcePurchaseOrderRef.trim() || null,
            sourcePurchaseInvoiceRef:
              dto.sourcePurchaseInvoiceRef === undefined ? undefined : dto.sourcePurchaseInvoiceRef.trim() || null,
            description: dto.description === undefined ? undefined : dto.description.trim() || null,
            totalQuantity: totals.totalQuantity,
            totalAmount: totals.totalAmount,
            lines: lines
              ? {
                  create: lines.map((line, index) => ({
                    itemId: line.itemId,
                    lineNumber: index + 1,
                    quantity: line.quantity,
                    unitCost: line.unitCost,
                    unitOfMeasure: line.unitOfMeasure,
                    description: line.description,
                    lineTotalAmount: line.lineTotalAmount,
                  })),
                }
              : undefined,
          },
          include: this.goodsReceiptInclude(),
        });
      });

      await this.auditService.log({
        entity: 'InventoryGoodsReceipt',
        entityId: updated.id,
        action: AuditAction.UPDATE,
        details: { status: updated.status, reference: updated.reference },
      });

      return this.mapGoodsReceipt(updated);
    } catch (error) {
      if (this.isUniqueConflict(error, 'reference')) {
        throw new ConflictException('An inventory goods receipt with this reference already exists.');
      }
      throw error;
    }
  }

  async post(id: string) {
    const receipt = await this.prisma.inventoryGoodsReceipt.findUnique({
      where: { id },
      include: {
        lines: {
          orderBy: { lineNumber: 'asc' },
        },
      },
    });

    if (!receipt) {
      throw new BadRequestException(`Inventory goods receipt ${id} was not found.`);
    }
    if (receipt.status !== InventoryReceiptStatus.DRAFT) {
      throw new BadRequestException('Only draft inventory goods receipts can be posted.');
    }
    await this.warehousesService.getActiveWarehouseReference(receipt.warehouseId);

    const itemIds = [...new Set(receipt.lines.map((line) => line.itemId))];
    const items = await this.prisma.inventoryItem.findMany({
      where: { id: { in: itemIds } },
      select: {
        id: true,
        code: true,
        inventoryAccountId: true,
        adjustmentAccountId: true,
        isActive: true,
        onHandQuantity: true,
        valuationAmount: true,
      },
    });
    const itemMap = new Map(items.map((item) => [item.id, item]));
    for (const line of receipt.lines) {
      const item = itemMap.get(line.itemId);
      if (!item || !item.isActive) {
        throw new BadRequestException('Inventory goods receipt lines must reference active inventory items.');
      }
    }

    const accountingEnabled = this.inventoryPostingService.isAccountingEnabled();
    const accountingLines: Array<{ accountId: string; debitAmount: number; creditAmount: number; description?: string }> = [];

    const updated = await this.prisma.$transaction(async (tx) => {
      for (const line of receipt.lines) {
        const item = itemMap.get(line.itemId);
        if (!item) {
          throw new BadRequestException('Inventory goods receipt lines must reference active inventory items.');
        }

        const unitCost = line.quantity.gt(0) ? line.lineTotalAmount.div(line.quantity) : new Prisma.Decimal(0);

        await tx.inventoryItem.update({
          where: { id: line.itemId },
          data: {
            onHandQuantity: {
              increment: line.quantity,
            },
            valuationAmount: {
              increment: line.lineTotalAmount,
            },
          },
        });

        const warehouseBalance = await this.inventoryPostingService.applyWarehouseBalance(tx, {
          itemId: line.itemId,
          warehouseId: receipt.warehouseId,
          quantityDelta: line.quantity,
          valueDelta: line.lineTotalAmount,
        });

        await this.inventoryPostingService.createMovement(tx, {
          movementType: InventoryStockMovementType.GOODS_RECEIPT,
          transactionType: 'InventoryGoodsReceipt',
          transactionId: receipt.id,
          transactionLineId: line.id,
          transactionReference: receipt.reference,
          transactionDate: receipt.receiptDate,
          itemId: line.itemId,
          warehouseId: receipt.warehouseId,
          quantityIn: line.quantity,
          unitCost,
          valueIn: line.lineTotalAmount,
          balanceId: warehouseBalance.id,
          runningQuantity: warehouseBalance.onHandQuantity,
          runningValuation: warehouseBalance.valuationAmount,
          description: line.description ?? receipt.description ?? null,
        });

        await this.inventoryPostingService.addCostLayer(tx, {
          itemId: line.itemId,
          warehouseId: receipt.warehouseId,
          quantity: line.quantity,
          unitCost,
          movementType: InventoryStockMovementType.GOODS_RECEIPT,
          sourceType: 'InventoryGoodsReceipt',
          sourceId: receipt.id,
          sourceLineId: line.id,
          sourceReference: receipt.reference,
          sourceDate: receipt.receiptDate,
        });

        if (accountingEnabled && line.lineTotalAmount.gt(0)) {
          if (!item.inventoryAccountId || !item.adjustmentAccountId) {
            throw new BadRequestException(
              `Item ${item.code} requires both inventory and adjustment accounts before receipt posting with accounting enabled.`,
            );
          }
          const amount = Number(line.lineTotalAmount.toFixed(2));
          accountingLines.push({
            accountId: item.inventoryAccountId,
            debitAmount: amount,
            creditAmount: 0,
            description: `Inventory receipt ${receipt.reference}`,
          });
          accountingLines.push({
            accountId: item.adjustmentAccountId,
            debitAmount: 0,
            creditAmount: amount,
            description: `Inventory receipt ${receipt.reference}`,
          });
        }
      }

      let journalEntryId: string | undefined;
      if (accountingEnabled && accountingLines.length > 0) {
        journalEntryId = await this.inventoryPostingService.createAndPostJournalEntry(
          receipt.reference,
          receipt.receiptDate,
          `Inventory goods receipt ${receipt.reference}`,
          accountingLines,
        );
      }

      return tx.inventoryGoodsReceipt.update({
        where: { id },
        data: {
          status: InventoryReceiptStatus.POSTED,
          postedAt: new Date(),
          journalEntryId,
        },
        include: this.goodsReceiptInclude(),
      });
    });

    await this.auditService.log({
      entity: 'InventoryGoodsReceipt',
      entityId: updated.id,
      action: AuditAction.POST,
      details: { status: updated.status, reference: updated.reference, warehouseId: updated.warehouse.id },
    });

    return this.mapGoodsReceipt(updated);
  }

  async cancel(id: string) {
    const current = await this.getGoodsReceiptOrThrow(id);
    if (current.status !== InventoryReceiptStatus.DRAFT) {
      throw new BadRequestException('Only draft inventory goods receipts can be cancelled.');
    }

    const updated = await this.prisma.inventoryGoodsReceipt.update({
      where: { id },
      data: { status: InventoryReceiptStatus.CANCELLED },
      include: this.goodsReceiptInclude(),
    });

    await this.auditService.log({
      entity: 'InventoryGoodsReceipt',
      entityId: updated.id,
      action: AuditAction.DELETE,
      details: { status: updated.status, reference: updated.reference },
    });

    return this.mapGoodsReceipt(updated);
  }

  async reverse(id: string) {
    const current = await this.getGoodsReceiptOrThrow(id);
    if (current.status !== InventoryReceiptStatus.POSTED) {
      throw new BadRequestException('Only posted inventory goods receipts can be reversed.');
    }

    const updated = await this.prisma.inventoryGoodsReceipt.update({
      where: { id },
      data: {
        status: InventoryReceiptStatus.REVERSED,
        reversedAt: new Date(),
      },
      include: this.goodsReceiptInclude(),
    });

    await this.auditService.log({
      entity: 'InventoryGoodsReceipt',
      entityId: updated.id,
      action: AuditAction.REVERSE,
      details: { status: updated.status, reference: updated.reference },
    });

    return this.mapGoodsReceipt(updated);
  }

  private async resolveLines(lines: InventoryGoodsReceiptLineDto[]) {
    const resolved: ResolvedReceiptLine[] = [];

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      const item = await this.itemMasterService.ensureActiveItem(line.itemId);
      const quantity = this.parseQuantity(line.quantity, 'Receipt quantity');
      const unitCost = this.parseAmount(line.unitCost, 'Unit cost');
      const lineTotalAmount = quantity.mul(unitCost);

      resolved.push({
        itemId: item.id,
        lineNumber: index + 1,
        itemCode: item.code,
        itemName: item.name,
        quantity,
        unitCost,
        unitOfMeasure: line.unitOfMeasure.trim(),
        description: line.description?.trim() || null,
        lineTotalAmount,
      });
    }

    return resolved;
  }

  private calculateTotals(lines: ResolvedReceiptLine[]) {
    return {
      totalQuantity: lines.reduce((sum, line) => sum.add(line.quantity), new Prisma.Decimal(0)),
      totalAmount: lines.reduce((sum, line) => sum.add(line.lineTotalAmount), new Prisma.Decimal(0)),
    };
  }

  private goodsReceiptInclude() {
    return {
      warehouse: {
        select: {
          id: true,
          code: true,
          name: true,
          isActive: true,
          isTransit: true,
        },
      },
      lines: {
        orderBy: { lineNumber: 'asc' },
        include: {
          item: {
            select: {
              id: true,
              code: true,
              name: true,
              unitOfMeasure: true,
              type: true,
              isActive: true,
            },
          },
        },
      },
    } satisfies Prisma.InventoryGoodsReceiptInclude;
  }

  private async getGoodsReceiptOrThrow(id: string) {
    const row = await this.prisma.inventoryGoodsReceipt.findUnique({ where: { id } });
    if (!row) {
      throw new BadRequestException(`Inventory goods receipt ${id} was not found.`);
    }
    return row;
  }

  private mapGoodsReceipt(row: InventoryGoodsReceiptWithRelations) {
    return {
      id: row.id,
      reference: row.reference,
      status: row.status,
      receiptDate: row.receiptDate.toISOString(),
      sourcePurchaseOrderRef: row.sourcePurchaseOrderRef,
      sourcePurchaseInvoiceRef: row.sourcePurchaseInvoiceRef,
      description: row.description,
      totalQuantity: row.totalQuantity.toString(),
      totalAmount: row.totalAmount.toString(),
      postedAt: row.postedAt?.toISOString() ?? null,
      canEdit: row.status === InventoryReceiptStatus.DRAFT,
      canPost: row.status === InventoryReceiptStatus.DRAFT,
      canCancel: row.status === InventoryReceiptStatus.DRAFT,
      canReverse: row.status === InventoryReceiptStatus.POSTED,
      warehouse: row.warehouse,
      lines: row.lines.map((line) => ({
        id: line.id,
        lineNumber: line.lineNumber,
        quantity: line.quantity.toString(),
        unitCost: line.unitCost.toString(),
        unitOfMeasure: line.unitOfMeasure,
        description: line.description,
        lineTotalAmount: line.lineTotalAmount.toString(),
        item: {
          id: line.item.id,
          code: line.item.code,
          name: line.item.name,
          unitOfMeasure: line.item.unitOfMeasure,
          type: line.item.type,
          isActive: line.item.isActive,
        },
      })),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private parseStatus(status?: string): InventoryReceiptStatus | undefined {
    if (!status) {
      return undefined;
    }
    if (status in InventoryReceiptStatus) {
      return status as InventoryReceiptStatus;
    }
    throw new BadRequestException('Invalid inventory goods receipt status.');
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
      throw new BadRequestException(`${options.label} must be a valid integer.`);
    }
    if (parsed < options.min || parsed > options.max) {
      throw new BadRequestException(`${options.label} must be between ${options.min} and ${options.max}.`);
    }

    return parsed;
  }

  private parseQuantity(value: string, label: string) {
    try {
      const parsed = new Prisma.Decimal(value);
      if (parsed.lte(0)) {
        throw new BadRequestException(`${label} must be greater than zero.`);
      }
      return parsed;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`${label} is invalid.`);
    }
  }

  private parseAmount(value: string, label: string) {
    try {
      const parsed = new Prisma.Decimal(value);
      if (parsed.lt(0)) {
        throw new BadRequestException(`${label} cannot be negative.`);
      }
      return parsed;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`${label} is invalid.`);
    }
  }

  private generateReference(prefix: string) {
    const compactDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase();
    return `${prefix}-${compactDate}-${suffix}`;
  }

  private isUniqueConflict(error: unknown, field: string) {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002' &&
      Array.isArray(error.meta?.target) &&
      error.meta.target.includes(field)
    );
  }
}
