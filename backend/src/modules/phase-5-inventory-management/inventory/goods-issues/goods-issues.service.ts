import {
  BadRequestException,
  ConflictException,
  Injectable,
} from "@nestjs/common";
import {
  AuditAction,
  InventoryIssueStatus,
  InventoryStockMovementType,
  Prisma,
} from "../../../../generated/prisma";

import { PrismaService } from "../../../../common/prisma/prisma.service";
import { AuditService } from "../../../phase-1-accounting-foundation/accounting-core/audit/audit.service";
import { ItemMasterService } from "../item-master/item-master.service";
import { InventoryPostingService } from "../shared/inventory-posting.service";
import { WarehousesService } from "../warehouses/warehouses.service";
import {
  CreateInventoryGoodsIssueDto,
  InventoryGoodsIssueLineDto,
  UpdateInventoryGoodsIssueDto,
} from "./dto/goods-issues.dto";

type GoodsIssueListQuery = {
  status?: string;
  warehouseId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: string;
  limit?: string;
};

type ResolvedIssueLine = {
  itemId: string;
  lineNumber: number;
  quantity: Prisma.Decimal;
  unitCost: Prisma.Decimal;
  unitOfMeasure: string;
  description: string | null;
  lineTotalAmount: Prisma.Decimal;
};

type InventoryGoodsIssueWithRelations = Prisma.InventoryGoodsIssueGetPayload<{
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
        lineNumber: "asc";
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
export class GoodsIssuesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly itemMasterService: ItemMasterService,
    private readonly inventoryPostingService: InventoryPostingService,
    private readonly warehousesService: WarehousesService,
  ) {}

  async list(query: GoodsIssueListQuery = {}) {
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
    const where: Prisma.InventoryGoodsIssueWhereInput = {
      status: this.parseStatus(query.status),
      warehouseId: query.warehouseId,
      issueDate: this.dateRangeFilter(query.dateFrom, query.dateTo),
      OR: search
        ? [
            { reference: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
            { sourceSalesOrderRef: { contains: search, mode: "insensitive" } },
            {
              sourceSalesInvoiceRef: { contains: search, mode: "insensitive" },
            },
            {
              sourceProductionRequestRef: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              sourceInternalRequestRef: {
                contains: search,
                mode: "insensitive",
              },
            },
            { warehouse: { code: { contains: search, mode: "insensitive" } } },
            { warehouse: { name: { contains: search, mode: "insensitive" } } },
            {
              lines: {
                some: {
                  item: { code: { contains: search, mode: "insensitive" } },
                },
              },
            },
            {
              lines: {
                some: {
                  item: { name: { contains: search, mode: "insensitive" } },
                },
              },
            },
          ]
        : undefined,
    };

    const [total, rows] = await Promise.all([
      this.prisma.inventoryGoodsIssue.count({ where }),
      this.prisma.inventoryGoodsIssue.findMany({
        where,
        include: this.goodsIssueInclude(),
        orderBy: [{ issueDate: "desc" }, { createdAt: "desc" }],
        skip,
        take: limit,
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return {
      data: rows.map((row) => this.mapGoodsIssue(row)),
      page,
      limit,
      total,
      totalPages,
    };
  }

  async getById(id: string) {
    const row = await this.prisma.inventoryGoodsIssue.findUnique({
      where: { id },
      include: this.goodsIssueInclude(),
    });
    if (!row) {
      throw new BadRequestException(
        `Inventory goods issue ${id} was not found.`,
      );
    }
    return this.mapGoodsIssue(row);
  }

  async create(dto: CreateInventoryGoodsIssueDto) {
    const warehouse = await this.warehousesService.getActiveWarehouseReference(
      dto.warehouseId,
    );
    if (!warehouse) {
      throw new BadRequestException("Issuing warehouse is required.");
    }

    const reference = dto.reference?.trim() || this.generateReference("GIN");
    const lines = await this.resolveLines(dto.lines);
    const totals = this.calculateTotals(lines);

    try {
      const created = await this.prisma.inventoryGoodsIssue.create({
        data: {
          reference,
          issueDate: new Date(dto.issueDate),
          warehouseId: warehouse.id,
          sourceSalesOrderRef: dto.sourceSalesOrderRef?.trim() || null,
          sourceSalesInvoiceRef: dto.sourceSalesInvoiceRef?.trim() || null,
          sourceProductionRequestRef:
            dto.sourceProductionRequestRef?.trim() || null,
          sourceInternalRequestRef:
            dto.sourceInternalRequestRef?.trim() || null,
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
        include: this.goodsIssueInclude(),
      });

      await this.auditService.log({
        entity: "InventoryGoodsIssue",
        entityId: created.id,
        action: AuditAction.CREATE,
        details: {
          status: created.status,
          reference: created.reference,
          warehouseId: created.warehouseId,
        },
      });

      return this.mapGoodsIssue(created);
    } catch (error) {
      if (this.isUniqueConflict(error, "reference")) {
        throw new ConflictException(
          "An inventory goods issue with this reference already exists.",
        );
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateInventoryGoodsIssueDto) {
    const current = await this.getGoodsIssueOrThrow(id);
    if (current.status !== InventoryIssueStatus.DRAFT) {
      throw new BadRequestException(
        "Only draft inventory goods issues can be edited.",
      );
    }

    const warehouse = dto.warehouseId
      ? await this.warehousesService.getActiveWarehouseReference(
          dto.warehouseId,
        )
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
          await tx.inventoryGoodsIssueLine.deleteMany({
            where: { goodsIssueId: id },
          });
        }

        return tx.inventoryGoodsIssue.update({
          where: { id },
          data: {
            reference: dto.reference?.trim(),
            issueDate: dto.issueDate ? new Date(dto.issueDate) : undefined,
            warehouseId: warehouse?.id,
            sourceSalesOrderRef:
              dto.sourceSalesOrderRef === undefined
                ? undefined
                : dto.sourceSalesOrderRef.trim() || null,
            sourceSalesInvoiceRef:
              dto.sourceSalesInvoiceRef === undefined
                ? undefined
                : dto.sourceSalesInvoiceRef.trim() || null,
            sourceProductionRequestRef:
              dto.sourceProductionRequestRef === undefined
                ? undefined
                : dto.sourceProductionRequestRef.trim() || null,
            sourceInternalRequestRef:
              dto.sourceInternalRequestRef === undefined
                ? undefined
                : dto.sourceInternalRequestRef.trim() || null,
            description:
              dto.description === undefined
                ? undefined
                : dto.description.trim() || null,
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
          include: this.goodsIssueInclude(),
        });
      });

      await this.auditService.log({
        entity: "InventoryGoodsIssue",
        entityId: updated.id,
        action: AuditAction.UPDATE,
        details: { status: updated.status, reference: updated.reference },
      });

      return this.mapGoodsIssue(updated);
    } catch (error) {
      if (this.isUniqueConflict(error, "reference")) {
        throw new ConflictException(
          "An inventory goods issue with this reference already exists.",
        );
      }
      throw error;
    }
  }

  async post(id: string) {
    const issue = await this.prisma.inventoryGoodsIssue.findUnique({
      where: { id },
      include: {
        lines: {
          orderBy: { lineNumber: "asc" },
        },
      },
    });

    if (!issue) {
      throw new BadRequestException(
        `Inventory goods issue ${id} was not found.`,
      );
    }
    if (issue.status !== InventoryIssueStatus.DRAFT) {
      throw new BadRequestException(
        "Only draft inventory goods issues can be posted.",
      );
    }
    await this.warehousesService.getActiveWarehouseReference(issue.warehouseId);

    const itemIds = [...new Set(issue.lines.map((line) => line.itemId))];
    const items = await this.prisma.inventoryItem.findMany({
      where: { id: { in: itemIds } },
      select: {
        id: true,
        code: true,
        name: true,
        inventoryAccountId: true,
        cogsAccountId: true,
        adjustmentAccountId: true,
        isActive: true,
        onHandQuantity: true,
        valuationAmount: true,
      },
    });
    const itemMap = new Map(items.map((item) => [item.id, item]));

    const preventNegativeStock =
      this.inventoryPostingService.preventNegativeStock();
    const warehouseBalances =
      await this.prisma.inventoryWarehouseBalance.findMany({
        where: {
          warehouseId: issue.warehouseId,
          itemId: { in: itemIds },
        },
        select: {
          itemId: true,
          onHandQuantity: true,
        },
      });
    const availableByItem = new Map(
      warehouseBalances.map((row) => [
        row.itemId,
        new Prisma.Decimal(row.onHandQuantity),
      ]),
    );

    for (const line of issue.lines) {
      const item = itemMap.get(line.itemId);
      if (!item || !item.isActive) {
        throw new BadRequestException(
          "Inventory goods issue lines must reference active inventory items.",
        );
      }
      const available =
        availableByItem.get(line.itemId) ?? new Prisma.Decimal(0);
      if (preventNegativeStock && available.lt(line.quantity)) {
        throw new BadRequestException(
          `Item ${item.code} does not have enough available stock for this issue.`,
        );
      }
      availableByItem.set(line.itemId, available.sub(line.quantity));
    }

    const accountingEnabled =
      this.inventoryPostingService.isAccountingEnabled();
    const costingMethod = await this.inventoryPostingService.getCostingMethod();
    const accountingLines: Array<{
      accountId: string;
      debitAmount: number;
      creditAmount: number;
      description?: string;
    }> = [];

    const updated = await this.prisma.$transaction(async (tx) => {
      let totalQuantity = new Prisma.Decimal(0);
      let totalAmount = new Prisma.Decimal(0);

      for (const line of issue.lines) {
        const item = itemMap.get(line.itemId);
        if (!item) {
          throw new BadRequestException(
            "Inventory goods issue lines must reference active inventory items.",
          );
        }

        const currentBalance = await tx.inventoryWarehouseBalance.findUnique({
          where: {
            itemId_warehouseId: {
              itemId: line.itemId,
              warehouseId: issue.warehouseId,
            },
          },
        });

        const currentQuantity =
          currentBalance?.onHandQuantity ?? new Prisma.Decimal(0);
        const currentValuation =
          currentBalance?.valuationAmount ?? new Prisma.Decimal(0);
        if (preventNegativeStock && currentQuantity.lt(line.quantity)) {
          throw new BadRequestException(
            `Item ${item.code} does not have enough available stock for this issue.`,
          );
        }

        const fallbackUnitCost = this.inventoryPostingService.averageUnitCost(
          currentQuantity,
          currentValuation,
        );
        const valuation = await this.inventoryPostingService.resolveIssueCost({
          tx,
          itemId: line.itemId,
          warehouseId: issue.warehouseId,
          quantity: line.quantity,
          fallbackUnitCost,
          reference: issue.reference,
          sourceType: "InventoryGoodsIssue",
          sourceId: issue.id,
          sourceLineId: line.id,
          sourceDate: issue.issueDate,
          costingMethod,
        });

        totalQuantity = totalQuantity.add(line.quantity);
        totalAmount = totalAmount.add(valuation.totalAmount);

        await tx.inventoryGoodsIssueLine.update({
          where: { id: line.id },
          data: {
            unitCost: valuation.unitCost,
            lineTotalAmount: valuation.totalAmount,
          },
        });

        await tx.inventoryItem.update({
          where: { id: item.id },
          data: {
            onHandQuantity: {
              decrement: line.quantity,
            },
            valuationAmount: {
              decrement: valuation.totalAmount,
            },
          },
        });

        const warehouseBalance =
          await this.inventoryPostingService.applyWarehouseBalance(tx, {
            itemId: item.id,
            warehouseId: issue.warehouseId,
            quantityDelta: line.quantity.neg(),
            valueDelta: valuation.totalAmount.neg(),
          });

        await this.inventoryPostingService.createMovement(tx, {
          movementType: InventoryStockMovementType.GOODS_ISSUE,
          transactionType: "InventoryGoodsIssue",
          transactionId: issue.id,
          transactionLineId: line.id,
          transactionReference: issue.reference,
          transactionDate: issue.issueDate,
          itemId: item.id,
          warehouseId: issue.warehouseId,
          quantityOut: line.quantity,
          unitCost: valuation.unitCost,
          valueOut: valuation.totalAmount,
          balanceId: warehouseBalance.id,
          runningQuantity: warehouseBalance.onHandQuantity,
          runningValuation: warehouseBalance.valuationAmount,
          description: line.description ?? issue.description ?? null,
        });

        if (accountingEnabled && valuation.totalAmount.gt(0)) {
          const inventoryAccountId = item.inventoryAccountId;
          const expenseAccountId =
            item.cogsAccountId ?? item.adjustmentAccountId;
          if (!inventoryAccountId || !expenseAccountId) {
            throw new BadRequestException(
              `Item ${item.code} requires inventory and COGS/adjustment accounts before issue posting with accounting enabled.`,
            );
          }

          const amount = Number(valuation.totalAmount.toFixed(2));
          accountingLines.push({
            accountId: expenseAccountId,
            debitAmount: amount,
            creditAmount: 0,
            description: `Inventory issue ${issue.reference}`,
          });
          accountingLines.push({
            accountId: inventoryAccountId,
            debitAmount: 0,
            creditAmount: amount,
            description: `Inventory issue ${issue.reference}`,
          });
        }
      }

      let journalEntryId: string | undefined;
      if (accountingEnabled && accountingLines.length > 0) {
        journalEntryId =
          await this.inventoryPostingService.createAndPostJournalEntry(
            issue.reference,
            issue.issueDate,
            `Inventory goods issue ${issue.reference}`,
            accountingLines,
          );
      }

      return tx.inventoryGoodsIssue.update({
        where: { id },
        data: {
          status: InventoryIssueStatus.POSTED,
          postedAt: new Date(),
          totalQuantity,
          totalAmount,
          journalEntryId,
        },
        include: this.goodsIssueInclude(),
      });
    });

    await this.auditService.log({
      entity: "InventoryGoodsIssue",
      entityId: updated.id,
      action: AuditAction.POST,
      details: {
        status: updated.status,
        reference: updated.reference,
        warehouseId: updated.warehouse.id,
      },
    });

    return this.mapGoodsIssue(updated);
  }

  async cancel(id: string) {
    const current = await this.getGoodsIssueOrThrow(id);
    if (current.status !== InventoryIssueStatus.DRAFT) {
      throw new BadRequestException(
        "Only draft inventory goods issues can be cancelled.",
      );
    }

    const updated = await this.prisma.inventoryGoodsIssue.update({
      where: { id },
      data: { status: InventoryIssueStatus.CANCELLED },
      include: this.goodsIssueInclude(),
    });

    await this.auditService.log({
      entity: "InventoryGoodsIssue",
      entityId: updated.id,
      action: AuditAction.DELETE,
      details: { status: updated.status, reference: updated.reference },
    });

    return this.mapGoodsIssue(updated);
  }

  async reverse(id: string) {
    const current = await this.getGoodsIssueOrThrow(id);
    if (current.status !== InventoryIssueStatus.POSTED) {
      throw new BadRequestException(
        "Only posted inventory goods issues can be reversed.",
      );
    }

    const updated = await this.prisma.inventoryGoodsIssue.update({
      where: { id },
      data: {
        status: InventoryIssueStatus.REVERSED,
        reversedAt: new Date(),
      },
      include: this.goodsIssueInclude(),
    });

    await this.auditService.log({
      entity: "InventoryGoodsIssue",
      entityId: updated.id,
      action: AuditAction.REVERSE,
      details: { status: updated.status, reference: updated.reference },
    });

    return this.mapGoodsIssue(updated);
  }

  private async resolveLines(lines: InventoryGoodsIssueLineDto[]) {
    const resolved: ResolvedIssueLine[] = [];

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      const item = await this.itemMasterService.ensureActiveItem(line.itemId);
      const quantity = this.parseQuantity(line.quantity, "Issue quantity");
      const unitCost = this.estimateUnitCost(
        item.onHandQuantity,
        item.valuationAmount,
      );
      const lineTotalAmount = unitCost.mul(quantity);

      resolved.push({
        itemId: item.id,
        lineNumber: index + 1,
        quantity,
        unitCost,
        unitOfMeasure: line.unitOfMeasure.trim(),
        description: line.description?.trim() || null,
        lineTotalAmount,
      });
    }

    return resolved;
  }

  private estimateUnitCost(
    onHandQuantity: Prisma.Decimal | string,
    valuationAmount: Prisma.Decimal | string,
  ) {
    const quantity = new Prisma.Decimal(onHandQuantity);
    if (quantity.lte(0)) {
      return new Prisma.Decimal(0);
    }

    return new Prisma.Decimal(valuationAmount).div(quantity);
  }

  private calculateTotals(lines: ResolvedIssueLine[]) {
    return {
      totalQuantity: lines.reduce(
        (sum, line) => sum.add(line.quantity),
        new Prisma.Decimal(0),
      ),
      totalAmount: lines.reduce(
        (sum, line) => sum.add(line.lineTotalAmount),
        new Prisma.Decimal(0),
      ),
    };
  }

  private goodsIssueInclude() {
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
        orderBy: { lineNumber: "asc" },
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
    } satisfies Prisma.InventoryGoodsIssueInclude;
  }

  private async getGoodsIssueOrThrow(id: string) {
    const row = await this.prisma.inventoryGoodsIssue.findUnique({
      where: { id },
    });
    if (!row) {
      throw new BadRequestException(
        `Inventory goods issue ${id} was not found.`,
      );
    }
    return row;
  }

  private mapGoodsIssue(row: InventoryGoodsIssueWithRelations) {
    return {
      id: row.id,
      reference: row.reference,
      status: row.status,
      issueDate: row.issueDate.toISOString(),
      sourceSalesOrderRef: row.sourceSalesOrderRef,
      sourceSalesInvoiceRef: row.sourceSalesInvoiceRef,
      sourceProductionRequestRef: row.sourceProductionRequestRef,
      sourceInternalRequestRef: row.sourceInternalRequestRef,
      description: row.description,
      totalQuantity: row.totalQuantity.toString(),
      totalAmount: row.totalAmount.toString(),
      postedAt: row.postedAt?.toISOString() ?? null,
      canEdit: row.status === InventoryIssueStatus.DRAFT,
      canPost: row.status === InventoryIssueStatus.DRAFT,
      canCancel: row.status === InventoryIssueStatus.DRAFT,
      canReverse: row.status === InventoryIssueStatus.POSTED,
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
          onHandQuantity: line.item.onHandQuantity.toString(),
          valuationAmount: line.item.valuationAmount.toString(),
        },
      })),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private parseStatus(status?: string): InventoryIssueStatus | undefined {
    if (!status) {
      return undefined;
    }
    if (status in InventoryIssueStatus) {
      return status as InventoryIssueStatus;
    }
    throw new BadRequestException("Invalid inventory goods issue status.");
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

  private generateReference(prefix: string) {
    const compactDate = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const suffix =
      `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase();
    return `${prefix}-${compactDate}-${suffix}`;
  }

  private isUniqueConflict(error: unknown, field: string) {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002" &&
      Array.isArray(error.meta?.target) &&
      error.meta.target.includes(field)
    );
  }
}
