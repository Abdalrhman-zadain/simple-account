import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { AuditAction, InventoryStockMovementType, InventoryTransferStatus, Prisma } from '../../../../generated/prisma';

import { PrismaService } from '../../../../common/prisma/prisma.service';
import { AuditService } from '../../../phase-1-accounting-foundation/accounting-core/audit/audit.service';
import { ItemMasterService } from '../item-master/item-master.service';
import { InventoryPostingService } from '../shared/inventory-posting.service';
import { WarehousesService } from '../warehouses/warehouses.service';
import { CreateInventoryTransferDto, InventoryTransferLineDto, UpdateInventoryTransferDto } from './dto/transfers.dto';

type TransferListQuery = {
  status?: string;
  sourceWarehouseId?: string;
  destinationWarehouseId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: string;
  limit?: string;
};

type ResolvedTransferLine = {
  itemId: string;
  quantity: Prisma.Decimal;
  unitCost: Prisma.Decimal;
  unitOfMeasure: string;
  description: string | null;
  lineTotalAmount: Prisma.Decimal;
};

type InventoryTransferWithRelations = Prisma.InventoryTransferGetPayload<{
  include: {
    sourceWarehouse: {
      select: {
        id: true;
        code: true;
        name: true;
        isActive: true;
        isTransit: true;
      };
    };
    destinationWarehouse: {
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
            onHandQuantity: true;
            valuationAmount: true;
          };
        };
      };
    };
  };
}>;

@Injectable()
export class TransfersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly itemMasterService: ItemMasterService,
    private readonly inventoryPostingService: InventoryPostingService,
    private readonly warehousesService: WarehousesService,
  ) {}

  async list(query: TransferListQuery = {}) {
    const page = this.parsePaginationNumber(query.page, { fallback: 1, min: 1, max: 10_000, label: 'Page' });
    const limit = this.parsePaginationNumber(query.limit, { fallback: 20, min: 1, max: 100, label: 'Limit' });
    const skip = (page - 1) * limit;
    const search = query.search?.trim();
    const where: Prisma.InventoryTransferWhereInput = {
      status: this.parseStatus(query.status),
      sourceWarehouseId: query.sourceWarehouseId,
      destinationWarehouseId: query.destinationWarehouseId,
      transferDate: this.dateRangeFilter(query.dateFrom, query.dateTo),
      OR: search
        ? [
            { reference: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
            { sourceWarehouse: { code: { contains: search, mode: 'insensitive' } } },
            { sourceWarehouse: { name: { contains: search, mode: 'insensitive' } } },
            { destinationWarehouse: { code: { contains: search, mode: 'insensitive' } } },
            { destinationWarehouse: { name: { contains: search, mode: 'insensitive' } } },
            { lines: { some: { item: { code: { contains: search, mode: 'insensitive' } } } } },
            { lines: { some: { item: { name: { contains: search, mode: 'insensitive' } } } } },
          ]
        : undefined,
    };

    const [total, rows] = await Promise.all([
      this.prisma.inventoryTransfer.count({ where }),
      this.prisma.inventoryTransfer.findMany({
        where,
        include: this.transferInclude(),
        orderBy: [{ transferDate: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return {
      data: rows.map((row) => this.mapTransfer(row)),
      page,
      limit,
      total,
      totalPages,
    };
  }

  async getById(id: string) {
    const row = await this.prisma.inventoryTransfer.findUnique({
      where: { id },
      include: this.transferInclude(),
    });
    if (!row) {
      throw new BadRequestException(`Inventory transfer ${id} was not found.`);
    }
    return this.mapTransfer(row);
  }

  async create(dto: CreateInventoryTransferDto) {
    const { sourceWarehouse, destinationWarehouse } = await this.resolveWarehouses(
      dto.sourceWarehouseId,
      dto.destinationWarehouseId,
    );
    const reference = dto.reference?.trim() || this.generateReference('TRF');
    const lines = await this.resolveLines(dto.lines);
    const totals = this.calculateTotals(lines);

    try {
      const created = await this.prisma.inventoryTransfer.create({
        data: {
          reference,
          transferDate: new Date(dto.transferDate),
          sourceWarehouseId: sourceWarehouse.id,
          destinationWarehouseId: destinationWarehouse.id,
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
        include: this.transferInclude(),
      });

      await this.auditService.log({
        entity: 'InventoryTransfer',
        entityId: created.id,
        action: AuditAction.CREATE,
        details: {
          status: created.status,
          reference: created.reference,
          sourceWarehouseId: created.sourceWarehouseId,
          destinationWarehouseId: created.destinationWarehouseId,
        },
      });

      return this.mapTransfer(created);
    } catch (error) {
      if (this.isUniqueConflict(error, 'reference')) {
        throw new ConflictException('An inventory transfer with this reference already exists.');
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateInventoryTransferDto) {
    const current = await this.getTransferOrThrow(id);
    if (current.status !== InventoryTransferStatus.DRAFT) {
      throw new BadRequestException('Only draft inventory transfers can be edited.');
    }

    const sourceWarehouseId = dto.sourceWarehouseId ?? current.sourceWarehouseId;
    const destinationWarehouseId = dto.destinationWarehouseId ?? current.destinationWarehouseId;
    const warehouses =
      dto.sourceWarehouseId !== undefined || dto.destinationWarehouseId !== undefined
        ? await this.resolveWarehouses(sourceWarehouseId, destinationWarehouseId)
        : null;

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
          await tx.inventoryTransferLine.deleteMany({ where: { transferId: id } });
        }

        return tx.inventoryTransfer.update({
          where: { id },
          data: {
            reference: dto.reference?.trim(),
            transferDate: dto.transferDate ? new Date(dto.transferDate) : undefined,
            sourceWarehouseId: warehouses?.sourceWarehouse.id,
            destinationWarehouseId: warehouses?.destinationWarehouse.id,
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
          include: this.transferInclude(),
        });
      });

      await this.auditService.log({
        entity: 'InventoryTransfer',
        entityId: updated.id,
        action: AuditAction.UPDATE,
        details: { status: updated.status, reference: updated.reference },
      });

      return this.mapTransfer(updated);
    } catch (error) {
      if (this.isUniqueConflict(error, 'reference')) {
        throw new ConflictException('An inventory transfer with this reference already exists.');
      }
      throw error;
    }
  }

  async post(id: string) {
    const transfer = await this.prisma.inventoryTransfer.findUnique({
      where: { id },
      include: {
        lines: {
          orderBy: { lineNumber: 'asc' },
        },
      },
    });

    if (!transfer) {
      throw new BadRequestException(`Inventory transfer ${id} was not found.`);
    }
    if (transfer.status !== InventoryTransferStatus.DRAFT) {
      throw new BadRequestException('Only draft inventory transfers can be posted.');
    }

    await this.resolveWarehouses(transfer.sourceWarehouseId, transfer.destinationWarehouseId);

    const itemIds = [...new Set(transfer.lines.map((line) => line.itemId))];
    const items = await this.prisma.inventoryItem.findMany({
      where: { id: { in: itemIds } },
      select: {
        id: true,
        code: true,
        isActive: true,
      },
    });
    const itemMap = new Map(items.map((item) => [item.id, item]));

    const preventNegativeStock = this.inventoryPostingService.preventNegativeStock();
    const costingMethod = await this.inventoryPostingService.getCostingMethod();
    const sourceBalances = await this.prisma.inventoryWarehouseBalance.findMany({
      where: {
        warehouseId: transfer.sourceWarehouseId,
        itemId: { in: itemIds },
      },
      select: {
        itemId: true,
        onHandQuantity: true,
      },
    });
    const availableByItem = new Map(sourceBalances.map((row) => [row.itemId, new Prisma.Decimal(row.onHandQuantity)]));
    for (const line of transfer.lines) {
      const item = itemMap.get(line.itemId);
      if (!item || !item.isActive) {
        throw new BadRequestException('Inventory transfer lines must reference active inventory items.');
      }
      const available = availableByItem.get(line.itemId) ?? new Prisma.Decimal(0);
      if (preventNegativeStock && available.lt(line.quantity)) {
        throw new BadRequestException(`Item ${item.code} does not have enough available stock for this transfer.`);
      }
      availableByItem.set(line.itemId, available.sub(line.quantity));
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      let totalQuantity = new Prisma.Decimal(0);
      let totalAmount = new Prisma.Decimal(0);

      for (const line of transfer.lines) {
        const item = itemMap.get(line.itemId);
        if (!item) {
          throw new BadRequestException('Inventory transfer lines must reference active inventory items.');
        }

        const sourceBalance = await tx.inventoryWarehouseBalance.findUnique({
          where: {
            itemId_warehouseId: {
              itemId: line.itemId,
              warehouseId: transfer.sourceWarehouseId,
            },
          },
        });
        const sourceQuantity = sourceBalance?.onHandQuantity ?? new Prisma.Decimal(0);
        const sourceValuation = sourceBalance?.valuationAmount ?? new Prisma.Decimal(0);
        if (preventNegativeStock && sourceQuantity.lt(line.quantity)) {
          throw new BadRequestException(`Item ${item.code} does not have enough available stock for this transfer.`);
        }

        const fallbackUnitCost = this.inventoryPostingService.averageUnitCost(sourceQuantity, sourceValuation);
        const valuation = await this.inventoryPostingService.resolveIssueCost({
          tx,
          itemId: line.itemId,
          warehouseId: transfer.sourceWarehouseId,
          quantity: line.quantity,
          fallbackUnitCost,
          reference: transfer.reference,
          sourceType: 'InventoryTransfer',
          sourceId: transfer.id,
          sourceLineId: line.id,
          sourceDate: transfer.transferDate,
          costingMethod,
        });

        totalQuantity = totalQuantity.add(line.quantity);
        totalAmount = totalAmount.add(valuation.totalAmount);

        await tx.inventoryTransferLine.update({
          where: { id: line.id },
          data: {
            unitCost: valuation.unitCost,
            lineTotalAmount: valuation.totalAmount,
          },
        });

        const updatedSourceBalance = await this.inventoryPostingService.applyWarehouseBalance(tx, {
          itemId: line.itemId,
          warehouseId: transfer.sourceWarehouseId,
          quantityDelta: line.quantity.neg(),
          valueDelta: valuation.totalAmount.neg(),
        });

        await this.inventoryPostingService.createMovement(tx, {
          movementType: InventoryStockMovementType.TRANSFER_OUT,
          transactionType: 'InventoryTransfer',
          transactionId: transfer.id,
          transactionLineId: line.id,
          transactionReference: transfer.reference,
          transactionDate: transfer.transferDate,
          itemId: line.itemId,
          warehouseId: transfer.sourceWarehouseId,
          quantityOut: line.quantity,
          unitCost: valuation.unitCost,
          valueOut: valuation.totalAmount,
          balanceId: updatedSourceBalance.id,
          runningQuantity: updatedSourceBalance.onHandQuantity,
          runningValuation: updatedSourceBalance.valuationAmount,
          description: line.description ?? transfer.description ?? null,
        });

        const updatedDestinationBalance = await this.inventoryPostingService.applyWarehouseBalance(tx, {
          itemId: line.itemId,
          warehouseId: transfer.destinationWarehouseId,
          quantityDelta: line.quantity,
          valueDelta: valuation.totalAmount,
        });

        await this.inventoryPostingService.createMovement(tx, {
          movementType: InventoryStockMovementType.TRANSFER_IN,
          transactionType: 'InventoryTransfer',
          transactionId: transfer.id,
          transactionLineId: line.id,
          transactionReference: transfer.reference,
          transactionDate: transfer.transferDate,
          itemId: line.itemId,
          warehouseId: transfer.destinationWarehouseId,
          quantityIn: line.quantity,
          unitCost: valuation.unitCost,
          valueIn: valuation.totalAmount,
          balanceId: updatedDestinationBalance.id,
          runningQuantity: updatedDestinationBalance.onHandQuantity,
          runningValuation: updatedDestinationBalance.valuationAmount,
          description: line.description ?? transfer.description ?? null,
        });

        await this.inventoryPostingService.addCostLayer(tx, {
          itemId: line.itemId,
          warehouseId: transfer.destinationWarehouseId,
          quantity: line.quantity,
          unitCost: valuation.unitCost,
          movementType: InventoryStockMovementType.TRANSFER_IN,
          sourceType: 'InventoryTransfer',
          sourceId: transfer.id,
          sourceLineId: line.id,
          sourceReference: transfer.reference,
          sourceDate: transfer.transferDate,
        });
      }

      return tx.inventoryTransfer.update({
        where: { id },
        data: {
          status: InventoryTransferStatus.POSTED,
          postedAt: new Date(),
          totalQuantity,
          totalAmount,
        },
        include: this.transferInclude(),
      });
    });

    await this.auditService.log({
      entity: 'InventoryTransfer',
      entityId: updated.id,
      action: AuditAction.POST,
      details: {
        status: updated.status,
        reference: updated.reference,
        sourceWarehouseId: updated.sourceWarehouse.id,
        destinationWarehouseId: updated.destinationWarehouse.id,
      },
    });

    return this.mapTransfer(updated);
  }

  async cancel(id: string) {
    const current = await this.getTransferOrThrow(id);
    if (current.status !== InventoryTransferStatus.DRAFT) {
      throw new BadRequestException('Only draft inventory transfers can be cancelled.');
    }

    const updated = await this.prisma.inventoryTransfer.update({
      where: { id },
      data: { status: InventoryTransferStatus.CANCELLED },
      include: this.transferInclude(),
    });

    await this.auditService.log({
      entity: 'InventoryTransfer',
      entityId: updated.id,
      action: AuditAction.DELETE,
      details: { status: updated.status, reference: updated.reference },
    });

    return this.mapTransfer(updated);
  }

  async reverse(id: string) {
    const current = await this.getTransferOrThrow(id);
    if (current.status !== InventoryTransferStatus.POSTED) {
      throw new BadRequestException('Only posted inventory transfers can be reversed.');
    }

    const updated = await this.prisma.inventoryTransfer.update({
      where: { id },
      data: {
        status: InventoryTransferStatus.REVERSED,
        reversedAt: new Date(),
      },
      include: this.transferInclude(),
    });

    await this.auditService.log({
      entity: 'InventoryTransfer',
      entityId: updated.id,
      action: AuditAction.REVERSE,
      details: { status: updated.status, reference: updated.reference },
    });

    return this.mapTransfer(updated);
  }

  private async resolveLines(lines: InventoryTransferLineDto[]) {
    const resolved: ResolvedTransferLine[] = [];

    for (const line of lines) {
      const item = await this.itemMasterService.ensureActiveItem(line.itemId);
      const quantity = this.parseQuantity(line.quantity, 'Transfer quantity');
      const unitCost = this.estimateUnitCost(item.onHandQuantity, item.valuationAmount);

      resolved.push({
        itemId: item.id,
        quantity,
        unitCost,
        unitOfMeasure: line.unitOfMeasure.trim(),
        description: line.description?.trim() || null,
        lineTotalAmount: unitCost.mul(quantity),
      });
    }

    return resolved;
  }

  private calculateTotals(lines: ResolvedTransferLine[]) {
    return {
      totalQuantity: lines.reduce((sum, line) => sum.add(line.quantity), new Prisma.Decimal(0)),
      totalAmount: lines.reduce((sum, line) => sum.add(line.lineTotalAmount), new Prisma.Decimal(0)),
    };
  }

  private transferInclude() {
    return {
      sourceWarehouse: {
        select: {
          id: true,
          code: true,
          name: true,
          isActive: true,
          isTransit: true,
        },
      },
      destinationWarehouse: {
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
              onHandQuantity: true,
              valuationAmount: true,
            },
          },
        },
      },
    } satisfies Prisma.InventoryTransferInclude;
  }

  private async getTransferOrThrow(id: string) {
    const row = await this.prisma.inventoryTransfer.findUnique({ where: { id } });
    if (!row) {
      throw new BadRequestException(`Inventory transfer ${id} was not found.`);
    }
    return row;
  }

  private async resolveWarehouses(sourceWarehouseId: string, destinationWarehouseId: string) {
    if (sourceWarehouseId === destinationWarehouseId) {
      throw new BadRequestException('Source and destination warehouses must be different.');
    }

    const [sourceWarehouse, destinationWarehouse] = await Promise.all([
      this.warehousesService.getActiveWarehouseReference(sourceWarehouseId),
      this.warehousesService.getActiveWarehouseReference(destinationWarehouseId),
    ]);

    if (!sourceWarehouse || !destinationWarehouse) {
      throw new BadRequestException('Source and destination warehouses are required.');
    }

    return { sourceWarehouse, destinationWarehouse };
  }

  private mapTransfer(row: InventoryTransferWithRelations) {
    return {
      id: row.id,
      reference: row.reference,
      status: row.status,
      transferDate: row.transferDate.toISOString(),
      description: row.description,
      totalQuantity: row.totalQuantity.toString(),
      totalAmount: row.totalAmount.toString(),
      postedAt: row.postedAt?.toISOString() ?? null,
      canEdit: row.status === InventoryTransferStatus.DRAFT,
      canPost: row.status === InventoryTransferStatus.DRAFT,
      canCancel: row.status === InventoryTransferStatus.DRAFT,
      canReverse: row.status === InventoryTransferStatus.POSTED,
      sourceWarehouse: row.sourceWarehouse,
      destinationWarehouse: row.destinationWarehouse,
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
          onHandQuantity: line.item.onHandQuantity.toString(),
          valuationAmount: line.item.valuationAmount.toString(),
        },
      })),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private parseStatus(status?: string): InventoryTransferStatus | undefined {
    if (!status) {
      return undefined;
    }
    if (status in InventoryTransferStatus) {
      return status as InventoryTransferStatus;
    }
    throw new BadRequestException('Invalid inventory transfer status.');
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

  private estimateUnitCost(onHandQuantity: Prisma.Decimal | string, valuationAmount: Prisma.Decimal | string) {
    const quantity = new Prisma.Decimal(onHandQuantity);
    if (quantity.lte(0)) {
      return new Prisma.Decimal(0);
    }

    return new Prisma.Decimal(valuationAmount).div(quantity);
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
