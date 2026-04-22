import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { AuditAction, InventoryAdjustmentStatus, InventoryStockMovementType, Prisma } from '../../../../generated/prisma';

import { PrismaService } from '../../../../common/prisma/prisma.service';
import { AuditService } from '../../../phase-1-accounting-foundation/accounting-core/audit/audit.service';
import { ItemMasterService } from '../item-master/item-master.service';
import { InventoryPostingService } from '../shared/inventory-posting.service';
import { WarehousesService } from '../warehouses/warehouses.service';
import { CreateInventoryAdjustmentDto, InventoryAdjustmentLineDto, UpdateInventoryAdjustmentDto } from './dto/adjustments.dto';

type AdjustmentListQuery = {
  status?: string;
  warehouseId?: string;
  reason?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
};

type ResolvedAdjustmentLine = {
  itemId: string;
  systemQuantity: Prisma.Decimal;
  countedQuantity: Prisma.Decimal;
  varianceQuantity: Prisma.Decimal;
  unitCost: Prisma.Decimal;
  unitOfMeasure: string;
  description: string | null;
  lineTotalAmount: Prisma.Decimal;
};

type InventoryAdjustmentWithRelations = Prisma.InventoryAdjustmentGetPayload<{
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
            onHandQuantity: true;
            valuationAmount: true;
          };
        };
      };
    };
  };
}>;

@Injectable()
export class AdjustmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly itemMasterService: ItemMasterService,
    private readonly inventoryPostingService: InventoryPostingService,
    private readonly warehousesService: WarehousesService,
  ) {}

  async list(query: AdjustmentListQuery = {}) {
    const search = query.search?.trim();
    const reason = query.reason?.trim();

    const rows = await this.prisma.inventoryAdjustment.findMany({
      where: {
        status: this.parseStatus(query.status),
        warehouseId: query.warehouseId,
        reason: reason ? { contains: reason, mode: 'insensitive' } : undefined,
        adjustmentDate: this.dateRangeFilter(query.dateFrom, query.dateTo),
        OR: search
          ? [
              { reference: { contains: search, mode: 'insensitive' } },
              { reason: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
              { warehouse: { code: { contains: search, mode: 'insensitive' } } },
              { warehouse: { name: { contains: search, mode: 'insensitive' } } },
              { lines: { some: { item: { code: { contains: search, mode: 'insensitive' } } } } },
              { lines: { some: { item: { name: { contains: search, mode: 'insensitive' } } } } },
            ]
          : undefined,
      },
      include: this.adjustmentInclude(),
      orderBy: [{ adjustmentDate: 'desc' }, { createdAt: 'desc' }],
    });

    return rows.map((row) => this.mapAdjustment(row));
  }

  async getById(id: string) {
    const row = await this.prisma.inventoryAdjustment.findUnique({
      where: { id },
      include: this.adjustmentInclude(),
    });
    if (!row) {
      throw new BadRequestException(`Inventory adjustment ${id} was not found.`);
    }
    return this.mapAdjustment(row);
  }

  async create(dto: CreateInventoryAdjustmentDto) {
    const warehouse = await this.warehousesService.getActiveWarehouseReference(dto.warehouseId);
    if (!warehouse) {
      throw new BadRequestException('Adjustment warehouse is required.');
    }

    const reference = dto.reference?.trim() || this.generateReference('ADJ');
    const reason = dto.reason.trim();
    const lines = await this.resolveLines(dto.lines);
    const totals = this.calculateTotals(lines);

    try {
      const created = await this.prisma.inventoryAdjustment.create({
        data: {
          reference,
          adjustmentDate: new Date(dto.adjustmentDate),
          warehouseId: warehouse.id,
          reason,
          description: dto.description?.trim() || null,
          totalVarianceQuantity: totals.totalVarianceQuantity,
          totalAmount: totals.totalAmount,
          lines: {
            create: lines.map((line, index) => ({
              itemId: line.itemId,
              lineNumber: index + 1,
              systemQuantity: line.systemQuantity,
              countedQuantity: line.countedQuantity,
              varianceQuantity: line.varianceQuantity,
              unitCost: line.unitCost,
              unitOfMeasure: line.unitOfMeasure,
              description: line.description,
              lineTotalAmount: line.lineTotalAmount,
            })),
          },
        },
        include: this.adjustmentInclude(),
      });

      await this.auditService.log({
        entity: 'InventoryAdjustment',
        entityId: created.id,
        action: AuditAction.CREATE,
        details: {
          status: created.status,
          reference: created.reference,
          warehouseId: created.warehouseId,
          reason: created.reason,
        },
      });

      return this.mapAdjustment(created);
    } catch (error) {
      if (this.isUniqueConflict(error, 'reference')) {
        throw new ConflictException('An inventory adjustment with this reference already exists.');
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateInventoryAdjustmentDto) {
    const current = await this.getAdjustmentOrThrow(id);
    if (current.status !== InventoryAdjustmentStatus.DRAFT) {
      throw new BadRequestException('Only draft inventory adjustments can be edited.');
    }

    const warehouse = dto.warehouseId ? await this.warehousesService.getActiveWarehouseReference(dto.warehouseId) : null;
    const lines = dto.lines ? await this.resolveLines(dto.lines) : null;
    const totals = lines
      ? this.calculateTotals(lines)
      : {
          totalVarianceQuantity: current.totalVarianceQuantity,
          totalAmount: current.totalAmount,
        };

    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        if (lines) {
          await tx.inventoryAdjustmentLine.deleteMany({ where: { adjustmentId: id } });
        }

        return tx.inventoryAdjustment.update({
          where: { id },
          data: {
            reference: dto.reference?.trim(),
            adjustmentDate: dto.adjustmentDate ? new Date(dto.adjustmentDate) : undefined,
            warehouseId: warehouse?.id,
            reason: dto.reason === undefined ? undefined : dto.reason.trim(),
            description: dto.description === undefined ? undefined : dto.description.trim() || null,
            totalVarianceQuantity: totals.totalVarianceQuantity,
            totalAmount: totals.totalAmount,
            lines: lines
              ? {
                  create: lines.map((line, index) => ({
                    itemId: line.itemId,
                    lineNumber: index + 1,
                    systemQuantity: line.systemQuantity,
                    countedQuantity: line.countedQuantity,
                    varianceQuantity: line.varianceQuantity,
                    unitCost: line.unitCost,
                    unitOfMeasure: line.unitOfMeasure,
                    description: line.description,
                    lineTotalAmount: line.lineTotalAmount,
                  })),
                }
              : undefined,
          },
          include: this.adjustmentInclude(),
        });
      });

      await this.auditService.log({
        entity: 'InventoryAdjustment',
        entityId: updated.id,
        action: AuditAction.UPDATE,
        details: { status: updated.status, reference: updated.reference, reason: updated.reason },
      });

      return this.mapAdjustment(updated);
    } catch (error) {
      if (this.isUniqueConflict(error, 'reference')) {
        throw new ConflictException('An inventory adjustment with this reference already exists.');
      }
      throw error;
    }
  }

  async post(id: string) {
    const adjustment = await this.prisma.inventoryAdjustment.findUnique({
      where: { id },
      include: {
        lines: {
          orderBy: { lineNumber: 'asc' },
        },
      },
    });

    if (!adjustment) {
      throw new BadRequestException(`Inventory adjustment ${id} was not found.`);
    }
    if (adjustment.status !== InventoryAdjustmentStatus.DRAFT) {
      throw new BadRequestException('Only draft inventory adjustments can be posted.');
    }

    await this.warehousesService.getActiveWarehouseReference(adjustment.warehouseId);

    const itemIds = [...new Set(adjustment.lines.map((line) => line.itemId))];
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
    const preventNegativeStock = this.inventoryPostingService.preventNegativeStock();
    const accountingEnabled = this.inventoryPostingService.isAccountingEnabled();
    const costingMethod = await this.inventoryPostingService.getCostingMethod();
    const accountingLines: Array<{ accountId: string; debitAmount: number; creditAmount: number; description?: string }> = [];

    const updated = await this.prisma.$transaction(async (tx) => {
      let totalVarianceQuantity = new Prisma.Decimal(0);
      let totalAmount = new Prisma.Decimal(0);

      for (const line of adjustment.lines) {
        const item = itemMap.get(line.itemId);
        if (!item || !item.isActive) {
          throw new BadRequestException('Inventory adjustment lines must reference active inventory items.');
        }

        const currentBalance = await tx.inventoryWarehouseBalance.findUnique({
          where: {
            itemId_warehouseId: {
              itemId: line.itemId,
              warehouseId: adjustment.warehouseId,
            },
          },
        });
        const systemQuantity = currentBalance?.onHandQuantity ?? new Prisma.Decimal(0);
        const currentValuation = currentBalance?.valuationAmount ?? new Prisma.Decimal(0);
        const countedQuantity = line.countedQuantity;
        const varianceQuantity = countedQuantity.sub(systemQuantity);

        if (preventNegativeStock && systemQuantity.add(varianceQuantity).lt(0)) {
          throw new BadRequestException(`Item ${item.code} does not have enough available stock for this adjustment.`);
        }

        let unitCost = new Prisma.Decimal(0);
        let lineTotalAmount = new Prisma.Decimal(0);

        if (varianceQuantity.gt(0)) {
          unitCost = this.estimateUnitCost(systemQuantity, currentValuation);
          lineTotalAmount = unitCost.mul(varianceQuantity);
          await this.inventoryPostingService.addCostLayer(tx, {
            itemId: line.itemId,
            warehouseId: adjustment.warehouseId,
            quantity: varianceQuantity,
            unitCost,
            movementType: InventoryStockMovementType.ADJUSTMENT_IN,
            sourceType: 'InventoryAdjustment',
            sourceId: adjustment.id,
            sourceLineId: line.id,
            sourceReference: adjustment.reference,
            sourceDate: adjustment.adjustmentDate,
          });
        } else if (varianceQuantity.lt(0)) {
          const issueQuantity = varianceQuantity.abs();
          const fallbackUnitCost = this.inventoryPostingService.averageUnitCost(systemQuantity, currentValuation);
          const valuation = await this.inventoryPostingService.resolveIssueCost({
            tx,
            itemId: line.itemId,
            warehouseId: adjustment.warehouseId,
            quantity: issueQuantity,
            fallbackUnitCost,
            reference: adjustment.reference,
            sourceType: 'InventoryAdjustment',
            sourceId: adjustment.id,
            sourceLineId: line.id,
            sourceDate: adjustment.adjustmentDate,
            costingMethod,
          });
          unitCost = valuation.unitCost;
          lineTotalAmount = valuation.totalAmount.neg();
        }

        totalVarianceQuantity = totalVarianceQuantity.add(varianceQuantity);
        totalAmount = totalAmount.add(lineTotalAmount);

        await tx.inventoryAdjustmentLine.update({
          where: { id: line.id },
          data: {
            systemQuantity,
            countedQuantity,
            varianceQuantity,
            unitCost,
            lineTotalAmount,
          },
        });

        await tx.inventoryItem.update({
          where: { id: item.id },
          data: {
            onHandQuantity: {
              increment: varianceQuantity,
            },
            valuationAmount: {
              increment: lineTotalAmount,
            },
          },
        });

        const warehouseBalance = await this.inventoryPostingService.applyWarehouseBalance(tx, {
          itemId: item.id,
          warehouseId: adjustment.warehouseId,
          quantityDelta: varianceQuantity,
          valueDelta: lineTotalAmount,
        });

        const isPositive = varianceQuantity.gt(0);
        await this.inventoryPostingService.createMovement(tx, {
          movementType: isPositive ? InventoryStockMovementType.ADJUSTMENT_IN : InventoryStockMovementType.ADJUSTMENT_OUT,
          transactionType: 'InventoryAdjustment',
          transactionId: adjustment.id,
          transactionLineId: line.id,
          transactionReference: adjustment.reference,
          transactionDate: adjustment.adjustmentDate,
          itemId: item.id,
          warehouseId: adjustment.warehouseId,
          quantityIn: isPositive ? varianceQuantity : new Prisma.Decimal(0),
          quantityOut: isPositive ? new Prisma.Decimal(0) : varianceQuantity.abs(),
          unitCost,
          valueIn: isPositive ? lineTotalAmount : new Prisma.Decimal(0),
          valueOut: isPositive ? new Prisma.Decimal(0) : lineTotalAmount.abs(),
          balanceId: warehouseBalance.id,
          runningQuantity: warehouseBalance.onHandQuantity,
          runningValuation: warehouseBalance.valuationAmount,
          description: line.description ?? adjustment.description ?? null,
        });

        if (accountingEnabled && lineTotalAmount.abs().gt(0)) {
          if (!item.inventoryAccountId || !item.adjustmentAccountId) {
            throw new BadRequestException(
              `Item ${item.code} requires inventory and adjustment accounts before adjustment posting with accounting enabled.`,
            );
          }
          const amount = Number(lineTotalAmount.abs().toFixed(2));
          if (isPositive) {
            accountingLines.push({
              accountId: item.inventoryAccountId,
              debitAmount: amount,
              creditAmount: 0,
              description: `Inventory adjustment ${adjustment.reference}`,
            });
            accountingLines.push({
              accountId: item.adjustmentAccountId,
              debitAmount: 0,
              creditAmount: amount,
              description: `Inventory adjustment ${adjustment.reference}`,
            });
          } else {
            accountingLines.push({
              accountId: item.adjustmentAccountId,
              debitAmount: amount,
              creditAmount: 0,
              description: `Inventory adjustment ${adjustment.reference}`,
            });
            accountingLines.push({
              accountId: item.inventoryAccountId,
              debitAmount: 0,
              creditAmount: amount,
              description: `Inventory adjustment ${adjustment.reference}`,
            });
          }
        }
      }

      let journalEntryId: string | undefined;
      if (accountingEnabled && accountingLines.length > 0) {
        journalEntryId = await this.inventoryPostingService.createAndPostJournalEntry(
          adjustment.reference,
          adjustment.adjustmentDate,
          `Inventory adjustment ${adjustment.reference}`,
          accountingLines,
        );
      }

      return tx.inventoryAdjustment.update({
        where: { id },
        data: {
          status: InventoryAdjustmentStatus.POSTED,
          postedAt: new Date(),
          totalVarianceQuantity,
          totalAmount,
          journalEntryId,
        },
        include: this.adjustmentInclude(),
      });
    });

    await this.auditService.log({
      entity: 'InventoryAdjustment',
      entityId: updated.id,
      action: AuditAction.POST,
      details: {
        status: updated.status,
        reference: updated.reference,
        warehouseId: updated.warehouse.id,
        reason: updated.reason,
      },
    });

    return this.mapAdjustment(updated);
  }

  async cancel(id: string) {
    const current = await this.getAdjustmentOrThrow(id);
    if (current.status !== InventoryAdjustmentStatus.DRAFT) {
      throw new BadRequestException('Only draft inventory adjustments can be cancelled.');
    }

    const updated = await this.prisma.inventoryAdjustment.update({
      where: { id },
      data: { status: InventoryAdjustmentStatus.CANCELLED },
      include: this.adjustmentInclude(),
    });

    await this.auditService.log({
      entity: 'InventoryAdjustment',
      entityId: updated.id,
      action: AuditAction.DELETE,
      details: { status: updated.status, reference: updated.reference },
    });

    return this.mapAdjustment(updated);
  }

  async reverse(id: string) {
    const current = await this.getAdjustmentOrThrow(id);
    if (current.status !== InventoryAdjustmentStatus.POSTED) {
      throw new BadRequestException('Only posted inventory adjustments can be reversed.');
    }

    const updated = await this.prisma.inventoryAdjustment.update({
      where: { id },
      data: {
        status: InventoryAdjustmentStatus.REVERSED,
        reversedAt: new Date(),
      },
      include: this.adjustmentInclude(),
    });

    await this.auditService.log({
      entity: 'InventoryAdjustment',
      entityId: updated.id,
      action: AuditAction.REVERSE,
      details: { status: updated.status, reference: updated.reference },
    });

    return this.mapAdjustment(updated);
  }

  private async resolveLines(lines: InventoryAdjustmentLineDto[]) {
    const resolved: ResolvedAdjustmentLine[] = [];

    for (const line of lines) {
      const item = await this.itemMasterService.ensureActiveItem(line.itemId);
      const systemQuantity = this.parseNonNegativeQuantity(line.systemQuantity, 'System quantity');
      const countedQuantity = this.parseNonNegativeQuantity(line.countedQuantity, 'Counted quantity');
      const varianceQuantity = countedQuantity.sub(systemQuantity);
      const unitCost = this.estimateUnitCost(item.onHandQuantity, item.valuationAmount);
      const lineTotalAmount = unitCost.mul(varianceQuantity);

      resolved.push({
        itemId: item.id,
        systemQuantity,
        countedQuantity,
        varianceQuantity,
        unitCost,
        unitOfMeasure: line.unitOfMeasure.trim(),
        description: line.description?.trim() || null,
        lineTotalAmount,
      });
    }

    return resolved;
  }

  private calculateTotals(lines: ResolvedAdjustmentLine[]) {
    return {
      totalVarianceQuantity: lines.reduce((sum, line) => sum.add(line.varianceQuantity), new Prisma.Decimal(0)),
      totalAmount: lines.reduce((sum, line) => sum.add(line.lineTotalAmount), new Prisma.Decimal(0)),
    };
  }

  private adjustmentInclude() {
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
              onHandQuantity: true,
              valuationAmount: true,
            },
          },
        },
      },
    } satisfies Prisma.InventoryAdjustmentInclude;
  }

  private async getAdjustmentOrThrow(id: string) {
    const row = await this.prisma.inventoryAdjustment.findUnique({ where: { id } });
    if (!row) {
      throw new BadRequestException(`Inventory adjustment ${id} was not found.`);
    }
    return row;
  }

  private mapAdjustment(row: InventoryAdjustmentWithRelations) {
    return {
      id: row.id,
      reference: row.reference,
      status: row.status,
      adjustmentDate: row.adjustmentDate.toISOString(),
      reason: row.reason,
      description: row.description,
      totalVarianceQuantity: row.totalVarianceQuantity.toString(),
      totalAmount: row.totalAmount.toString(),
      postedAt: row.postedAt?.toISOString() ?? null,
      canEdit: row.status === InventoryAdjustmentStatus.DRAFT,
      canPost: row.status === InventoryAdjustmentStatus.DRAFT,
      canCancel: row.status === InventoryAdjustmentStatus.DRAFT,
      canReverse: row.status === InventoryAdjustmentStatus.POSTED,
      warehouse: row.warehouse,
      lines: row.lines.map((line) => ({
        id: line.id,
        lineNumber: line.lineNumber,
        systemQuantity: line.systemQuantity.toString(),
        countedQuantity: line.countedQuantity.toString(),
        varianceQuantity: line.varianceQuantity.toString(),
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

  private parseStatus(status?: string): InventoryAdjustmentStatus | undefined {
    if (!status) {
      return undefined;
    }
    if (status in InventoryAdjustmentStatus) {
      return status as InventoryAdjustmentStatus;
    }
    throw new BadRequestException('Invalid inventory adjustment status.');
  }

  private dateRangeFilter(dateFrom?: string, dateTo?: string) {
    return dateFrom || dateTo
      ? {
          gte: dateFrom ? new Date(dateFrom) : undefined,
          lte: dateTo ? new Date(dateTo) : undefined,
        }
      : undefined;
  }

  private parseNonNegativeQuantity(value: string, label: string) {
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
