import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { Prisma, PurchaseOrderStatus, PurchaseRequestStatus } from '../../../../generated/prisma';

import { PrismaService } from '../../../../common/prisma/prisma.service';
import { SuppliersService } from '../suppliers/suppliers.service';
import { CreatePurchaseOrderDto, PurchaseOrderLineDto, UpdatePurchaseOrderDto } from './dto/purchase-orders.dto';

type PurchaseOrderListQuery = {
  status?: string;
  supplierId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
};

type ResolvedOrderLine = {
  itemId: string | null;
  itemName: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  taxId: string | null;
  taxAmount: number;
  lineTotalAmount: number;
  requestedDeliveryDate: Date | null;
};

type PurchaseOrderWithRelations = Prisma.PurchaseOrderGetPayload<{
  include: {
    supplier: {
      select: {
        id: true;
        code: true;
        name: true;
        defaultCurrency: true;
        isActive: true;
      };
    };
    sourcePurchaseRequest: {
      select: {
        id: true;
        reference: true;
        status: true;
      };
    };
    lines: true;
    receipts: {
      select: {
        id: true;
        reference: true;
        status: true;
        receiptDate: true;
        totalQuantity: true;
        postedAt: true;
      };
      orderBy: {
        receiptDate: 'desc';
      };
    };
  };
}>;

@Injectable()
export class PurchaseOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly suppliersService: SuppliersService,
  ) {}

  async list(query: PurchaseOrderListQuery = {}) {
    const search = query.search?.trim();
    const rows = await this.prisma.purchaseOrder.findMany({
      where: {
        supplierId: query.supplierId,
        status: this.parseStatus(query.status),
        orderDate: this.dateRangeFilter(query.dateFrom, query.dateTo),
        OR: search
          ? [
              { reference: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
              { supplier: { code: { contains: search, mode: 'insensitive' } } },
              { supplier: { name: { contains: search, mode: 'insensitive' } } },
              { sourcePurchaseRequest: { reference: { contains: search, mode: 'insensitive' } } },
              { lines: { some: { itemName: { contains: search, mode: 'insensitive' } } } },
              { lines: { some: { description: { contains: search, mode: 'insensitive' } } } },
            ]
          : undefined,
      },
      include: this.purchaseOrderInclude(),
      orderBy: [{ orderDate: 'desc' }, { createdAt: 'desc' }],
    });

    return rows.map((row) => this.mapPurchaseOrder(row));
  }

  async getById(id: string) {
    const row = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: this.purchaseOrderInclude(),
    });

    if (!row) {
      throw new BadRequestException(`Purchase order ${id} was not found.`);
    }

    return this.mapPurchaseOrder(row);
  }

  async create(dto: CreatePurchaseOrderDto) {
    const supplier = await this.suppliersService.ensureActiveSupplier(dto.supplierId);
    const currencyCode = dto.currencyCode?.trim().toUpperCase() || supplier.defaultCurrency;
    const reference = dto.reference?.trim() || this.generateReference('PO');
    const lines = await this.resolveLines(dto.lines);
    const totals = this.computeTotals(lines);

    if (dto.sourcePurchaseRequestId) {
      await this.ensureApprovedRequest(dto.sourcePurchaseRequestId);
    }

    try {
      console.error("DEBUG createPurchaseOrder - resolved lines:",
        JSON.stringify(lines.map(l => ({
          itemId: l.itemId,
          itemName: l.itemName,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
        })), null, 2)
      );
      const created = await this.prisma.purchaseOrder.create({
        data: {
          reference,
          orderDate: new Date(dto.orderDate),
          supplierId: supplier.id,
          currencyCode,
          description: dto.description?.trim() || null,
          sourcePurchaseRequestId: dto.sourcePurchaseRequestId || null,
          subtotalAmount: this.toAmount(totals.subtotalAmount),
          taxAmount: this.toAmount(totals.taxAmount),
          totalAmount: this.toAmount(totals.totalAmount),
          lines: {
            create: lines.map((line, index) => this.buildPurchaseOrderLineCreateInput(line, index + 1)),
          },
        },
        include: this.purchaseOrderInclude(),
      });

      return this.mapPurchaseOrder(created);
    } catch (error) {
      if (this.isUniqueConflict(error, 'reference')) {
        throw new ConflictException('A purchase order with this reference already exists.');
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdatePurchaseOrderDto) {
    const current = await this.getPurchaseOrderOrThrow(id);
    if (current.status !== PurchaseOrderStatus.DRAFT) {
      throw new BadRequestException('Only draft purchase orders can be edited.');
    }

    const nextSupplierId = dto.supplierId ?? current.supplierId;
    const supplier = await this.suppliersService.ensureActiveSupplier(nextSupplierId);
    const currencyCode = dto.currencyCode?.trim().toUpperCase() || current.currencyCode;
    const lines = dto.lines ? await this.resolveLines(dto.lines) : null;
    const totals = lines ? this.computeTotals(lines) : null;

    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        if (lines) {
          await tx.purchaseOrderLine.deleteMany({ where: { purchaseOrderId: id } });
        }

        return tx.purchaseOrder.update({
          where: { id },
          data: {
            reference: dto.reference?.trim(),
            orderDate: dto.orderDate ? new Date(dto.orderDate) : undefined,
            supplierId: nextSupplierId,
            currencyCode,
            description: dto.description === undefined ? undefined : dto.description.trim() || null,
            subtotalAmount: totals ? this.toAmount(totals.subtotalAmount) : undefined,
            taxAmount: totals ? this.toAmount(totals.taxAmount) : undefined,
            totalAmount: totals ? this.toAmount(totals.totalAmount) : undefined,
            lines: lines
              ? {
                  create: lines.map((line, index) => this.buildPurchaseOrderLineCreateInput(line, index + 1)),
                }
              : undefined,
          },
          include: this.purchaseOrderInclude(),
        });
      });

      return this.mapPurchaseOrder(updated);
    } catch (error) {
      if (this.isUniqueConflict(error, 'reference')) {
        throw new ConflictException('A purchase order with this reference already exists.');
      }
      throw error;
    }
  }

  async issue(id: string) {
    return this.changeStatus(id, PurchaseOrderStatus.ISSUED, [PurchaseOrderStatus.DRAFT], 'Only draft purchase orders can be issued.');
  }

  async markPartiallyReceived(id: string) {
    return this.changeStatus(
      id,
      PurchaseOrderStatus.PARTIALLY_RECEIVED,
      [PurchaseOrderStatus.ISSUED, PurchaseOrderStatus.PARTIALLY_RECEIVED],
      'Only issued or partially received purchase orders can be marked partially received.',
    );
  }

  async markFullyReceived(id: string) {
    return this.changeStatus(
      id,
      PurchaseOrderStatus.FULLY_RECEIVED,
      [PurchaseOrderStatus.ISSUED, PurchaseOrderStatus.PARTIALLY_RECEIVED],
      'Only issued or partially received purchase orders can be marked fully received.',
    );
  }

  async cancel(id: string) {
    return this.changeStatus(
      id,
      PurchaseOrderStatus.CANCELLED,
      [PurchaseOrderStatus.DRAFT, PurchaseOrderStatus.ISSUED],
      'Only draft or issued purchase orders can be cancelled.',
    );
  }

  async close(id: string) {
    return this.changeStatus(
      id,
      PurchaseOrderStatus.CLOSED,
      [PurchaseOrderStatus.FULLY_RECEIVED, PurchaseOrderStatus.CANCELLED],
      'Only fully received or cancelled purchase orders can be closed.',
    );
  }

  private async changeStatus(
    id: string,
    nextStatus: PurchaseOrderStatus,
    allowedCurrentStatuses: PurchaseOrderStatus[],
    errorMessage: string,
  ) {
    const current = await this.getPurchaseOrderOrThrow(id);
    if (!allowedCurrentStatuses.includes(current.status)) {
      throw new BadRequestException(errorMessage);
    }

    const updated = await this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: nextStatus },
      include: this.purchaseOrderInclude(),
    });

    return this.mapPurchaseOrder(updated);
  }

  private async resolveLines(lines: PurchaseOrderLineDto[]) {
    const itemIds = Array.from(new Set(lines.map((line) => line.itemId?.trim()).filter(Boolean))) as string[];
    const taxIds = Array.from(new Set(lines.map((line) => line.taxId?.trim()).filter(Boolean))) as string[];
    const [items, taxes] = await Promise.all([
      itemIds.length
        ? this.prisma.inventoryItem.findMany({
            where: { id: { in: itemIds }, isActive: true },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
      taxIds.length
        ? this.prisma.tax.findMany({ where: { id: { in: taxIds }, isActive: true }, select: { id: true, rate: true } })
        : Promise.resolve([]),
    ]);
    const validItems = new Map(items.map((item) => [item.id, item]));
    const taxById = new Map(taxes.map((tax) => [tax.id, Number(tax.rate)]));

    return lines.map((line) => {
      const quantity = Number(line.quantity);
      const unitPrice = Number(line.unitPrice);
      const taxId = line.taxId?.trim() || null;
      if (taxId && !taxById.has(taxId)) {
        throw new BadRequestException('Each purchase order line tax must reference an active tax.');
      }
      const lineBaseAmount = Number((quantity * unitPrice).toFixed(2));
      const taxAmount = taxId
        ? Number((lineBaseAmount * ((taxById.get(taxId) ?? 0) / 100)).toFixed(2))
        : Number(line.taxAmount ?? 0);
      const lineTotalAmount = Number((lineBaseAmount + taxAmount).toFixed(2));
      const itemId = line.itemId?.trim() || null;
      const item = itemId ? validItems.get(itemId) : null;

      if (itemId && !item) {
        throw new BadRequestException('Each linked purchase order item must reference an active inventory item.');
      }

      return {
        itemId,
        itemName: line.itemName?.trim() || item?.name || null,
        description: line.description.trim(),
        quantity,
        unitPrice,
        taxId,
        taxAmount,
        lineTotalAmount,
        requestedDeliveryDate: line.requestedDeliveryDate ? new Date(line.requestedDeliveryDate) : null,
      } satisfies ResolvedOrderLine;
    });
  }

  private computeTotals(lines: ResolvedOrderLine[]) {
    return lines.reduce(
      (totals, line) => {
        const lineSubtotal = Number((line.quantity * line.unitPrice).toFixed(2));
        return {
          subtotalAmount: Number((totals.subtotalAmount + lineSubtotal).toFixed(2)),
          taxAmount: Number((totals.taxAmount + line.taxAmount).toFixed(2)),
          totalAmount: Number((totals.totalAmount + line.lineTotalAmount).toFixed(2)),
        };
      },
      { subtotalAmount: 0, taxAmount: 0, totalAmount: 0 },
    );
  }

  private buildPurchaseOrderLineCreateInput(
    line: ResolvedOrderLine,
    lineNumber: number,
  ): Prisma.PurchaseOrderLineUncheckedCreateWithoutPurchaseOrderInput {
    return {
      lineNumber,
      itemId: line.itemId,
      itemName: line.itemName,
      description: line.description,
      quantity: this.toQuantity(line.quantity),
      unitPrice: this.toAmount(line.unitPrice),
      taxId: line.taxId,
      taxAmount: this.toAmount(line.taxAmount),
      lineTotalAmount: this.toAmount(line.lineTotalAmount),
      requestedDeliveryDate: line.requestedDeliveryDate,
    };
  }

  private purchaseOrderInclude() {
    return {
      supplier: {
        select: {
          id: true,
          code: true,
          name: true,
          defaultCurrency: true,
          isActive: true,
        },
      },
      sourcePurchaseRequest: {
        select: {
          id: true,
          reference: true,
          status: true,
        },
      },
      lines: {
        orderBy: { lineNumber: 'asc' },
      },
      receipts: {
        orderBy: [{ receiptDate: 'desc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          reference: true,
          status: true,
          receiptDate: true,
          totalQuantity: true,
          postedAt: true,
        },
      },
    } satisfies Prisma.PurchaseOrderInclude;
  }

  private async getPurchaseOrderOrThrow(id: string) {
    const row = await this.prisma.purchaseOrder.findUnique({ where: { id } });
    if (!row) {
      throw new BadRequestException(`Purchase order ${id} was not found.`);
    }
    return row;
  }

  private async ensureApprovedRequest(id: string) {
    const request = await this.prisma.purchaseRequest.findUnique({ where: { id } });
    if (!request) {
      throw new BadRequestException('Linked purchase request was not found.');
    }
    if (request.status !== PurchaseRequestStatus.APPROVED && request.status !== PurchaseRequestStatus.CLOSED) {
      throw new BadRequestException('Linked purchase request must be approved before use in a purchase order.');
    }
    return request;
  }

  private mapPurchaseOrder(row: PurchaseOrderWithRelations) {
    const hasRemainingQuantity = row.lines.some((line) => Number(line.receivedQuantity) + 0.0001 < Number(line.quantity));

    return {
      id: row.id,
      reference: row.reference,
      status: row.status,
      orderDate: row.orderDate.toISOString(),
      currencyCode: row.currencyCode,
      description: row.description,
      subtotalAmount: row.subtotalAmount.toString(),
      taxAmount: row.taxAmount.toString(),
      totalAmount: row.totalAmount.toString(),
      canEdit: row.status === PurchaseOrderStatus.DRAFT,
      canIssue: row.status === PurchaseOrderStatus.DRAFT,
      canReceive:
        (row.status === PurchaseOrderStatus.ISSUED || row.status === PurchaseOrderStatus.PARTIALLY_RECEIVED) &&
        hasRemainingQuantity,
      canCancel: row.status === PurchaseOrderStatus.DRAFT || row.status === PurchaseOrderStatus.ISSUED,
      canMarkPartiallyReceived:
        row.status === PurchaseOrderStatus.ISSUED || row.status === PurchaseOrderStatus.PARTIALLY_RECEIVED,
      canMarkFullyReceived:
        row.status === PurchaseOrderStatus.ISSUED || row.status === PurchaseOrderStatus.PARTIALLY_RECEIVED,
      canClose: row.status === PurchaseOrderStatus.FULLY_RECEIVED || row.status === PurchaseOrderStatus.CANCELLED,
      supplier: row.supplier,
      sourcePurchaseRequest: row.sourcePurchaseRequest,
      lines: row.lines.map((line) => ({
        id: line.id,
        lineNumber: line.lineNumber,
        itemId: line.itemId,
        itemName: line.itemName,
        description: line.description,
        quantity: line.quantity.toString(),
        receivedQuantity: line.receivedQuantity.toString(),
        unitPrice: line.unitPrice.toString(),
        taxId: line.taxId ?? null,
        taxAmount: line.taxAmount.toString(),
        lineTotalAmount: line.lineTotalAmount.toString(),
        requestedDeliveryDate: line.requestedDeliveryDate?.toISOString() ?? null,
      })),
      receipts: row.receipts.map((receipt) => ({
        id: receipt.id,
        reference: receipt.reference,
        status: receipt.status,
        receiptDate: receipt.receiptDate.toISOString(),
        totalQuantity: receipt.totalQuantity.toString(),
        postedAt: receipt.postedAt?.toISOString() ?? null,
      })),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private parseStatus(status?: string): PurchaseOrderStatus | undefined {
    if (!status) {
      return undefined;
    }
    if (status in PurchaseOrderStatus) {
      return status as PurchaseOrderStatus;
    }
    throw new BadRequestException('Invalid purchase order status.');
  }

  private dateRangeFilter(dateFrom?: string, dateTo?: string) {
    return dateFrom || dateTo
      ? {
          gte: dateFrom ? new Date(dateFrom) : undefined,
          lte: dateTo ? new Date(dateTo) : undefined,
        }
      : undefined;
  }

  private toAmount(value: number) {
    return Number(value).toFixed(2);
  }

  private toQuantity(value: number) {
    return Number(value).toFixed(4);
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
