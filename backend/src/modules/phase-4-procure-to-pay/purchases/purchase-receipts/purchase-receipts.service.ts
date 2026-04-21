import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { AuditAction, Prisma, PurchaseOrderStatus, PurchaseReceiptStatus } from '../../../../generated/prisma';

import { PrismaService } from '../../../../common/prisma/prisma.service';
import { AuditService } from '../../../phase-1-accounting-foundation/accounting-core/audit/audit.service';
import { CreatePurchaseReceiptDto, PurchaseReceiptLineDto, UpdatePurchaseReceiptDto } from './dto/purchase-receipts.dto';

type PurchaseReceiptListQuery = {
  status?: string;
  purchaseOrderId?: string;
  supplierId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
};

type ResolvedReceiptLine = {
  purchaseOrderLineId: string;
  lineNumber: number;
  itemName: string | null;
  description: string;
  quantityReceived: number;
};

type PurchaseReceiptWithRelations = Prisma.PurchaseReceiptGetPayload<{
  include: {
    supplier: {
      select: {
        id: true;
        code: true;
        name: true;
      };
    };
    purchaseOrder: {
      select: {
        id: true;
        reference: true;
        status: true;
        orderDate: true;
      };
    };
    lines: {
      orderBy: {
        lineNumber: 'asc';
      };
      include: {
        purchaseOrderLine: {
          select: {
            id: true;
            lineNumber: true;
          };
        };
      };
    };
  };
}>;

@Injectable()
export class PurchaseReceiptsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async list(query: PurchaseReceiptListQuery = {}) {
    const search = query.search?.trim();
    const rows = await this.prisma.purchaseReceipt.findMany({
      where: {
        status: this.parseStatus(query.status),
        purchaseOrderId: query.purchaseOrderId,
        supplierId: query.supplierId,
        receiptDate: this.dateRangeFilter(query.dateFrom, query.dateTo),
        OR: search
          ? [
              { reference: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
              { supplier: { code: { contains: search, mode: 'insensitive' } } },
              { supplier: { name: { contains: search, mode: 'insensitive' } } },
              { purchaseOrder: { reference: { contains: search, mode: 'insensitive' } } },
            ]
          : undefined,
      },
      include: this.purchaseReceiptInclude(),
      orderBy: [{ receiptDate: 'desc' }, { createdAt: 'desc' }],
    });

    return rows.map((row) => this.mapPurchaseReceipt(row));
  }

  async getById(id: string) {
    const row = await this.prisma.purchaseReceipt.findUnique({
      where: { id },
      include: this.purchaseReceiptInclude(),
    });
    if (!row) {
      throw new BadRequestException(`Purchase receipt ${id} was not found.`);
    }
    return this.mapPurchaseReceipt(row);
  }

  async create(dto: CreatePurchaseReceiptDto) {
    const order = await this.getEligiblePurchaseOrder(dto.purchaseOrderId);
    const reference = dto.reference?.trim() || this.generateReference('PRC');
    const lines = this.resolveLines(dto.lines, order.lines);
    const totalQuantity = lines.reduce((sum, line) => sum + line.quantityReceived, 0);

    try {
      const created = await this.prisma.purchaseReceipt.create({
        data: {
          reference,
          receiptDate: new Date(dto.receiptDate),
          purchaseOrderId: order.id,
          supplierId: order.supplierId,
          description: dto.description?.trim() || null,
          totalQuantity: this.toQuantity(totalQuantity),
          lines: {
            create: lines.map((line, index) => ({
              lineNumber: index + 1,
              purchaseOrderLineId: line.purchaseOrderLineId,
              itemName: line.itemName,
              description: line.description,
              quantityReceived: this.toQuantity(line.quantityReceived),
            })),
          },
        },
        include: this.purchaseReceiptInclude(),
      });

      await this.auditService.log({
        entity: 'PurchaseReceipt',
        entityId: created.id,
        action: AuditAction.CREATE,
        details: { status: created.status, reference: created.reference, purchaseOrderId: created.purchaseOrderId },
      });

      return this.mapPurchaseReceipt(created);
    } catch (error) {
      if (this.isUniqueConflict(error, 'reference')) {
        throw new ConflictException('A purchase receipt with this reference already exists.');
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdatePurchaseReceiptDto) {
    const current = await this.getPurchaseReceiptOrThrow(id);
    if (current.status !== PurchaseReceiptStatus.DRAFT) {
      throw new BadRequestException('Only draft purchase receipts can be edited.');
    }

    const order = await this.getEligiblePurchaseOrder(current.purchaseOrderId);
    const lines = dto.lines ? this.resolveLines(dto.lines, order.lines) : null;
    const totalQuantity = lines
      ? lines.reduce((sum, line) => sum + line.quantityReceived, 0)
      : Number(current.totalQuantity);

    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        if (lines) {
          await tx.purchaseReceiptLine.deleteMany({ where: { purchaseReceiptId: id } });
        }

        return tx.purchaseReceipt.update({
          where: { id },
          data: {
            reference: dto.reference?.trim(),
            receiptDate: dto.receiptDate ? new Date(dto.receiptDate) : undefined,
            description: dto.description === undefined ? undefined : dto.description.trim() || null,
            totalQuantity: this.toQuantity(totalQuantity),
            lines: lines
              ? {
                  create: lines.map((line, index) => ({
                    lineNumber: index + 1,
                    purchaseOrderLineId: line.purchaseOrderLineId,
                    itemName: line.itemName,
                    description: line.description,
                    quantityReceived: this.toQuantity(line.quantityReceived),
                  })),
                }
              : undefined,
          },
          include: this.purchaseReceiptInclude(),
        });
      });

      await this.auditService.log({
        entity: 'PurchaseReceipt',
        entityId: updated.id,
        action: AuditAction.UPDATE,
        details: { status: updated.status, reference: updated.reference },
      });

      return this.mapPurchaseReceipt(updated);
    } catch (error) {
      if (this.isUniqueConflict(error, 'reference')) {
        throw new ConflictException('A purchase receipt with this reference already exists.');
      }
      throw error;
    }
  }

  async post(id: string) {
    const receipt = await this.prisma.purchaseReceipt.findUnique({
      where: { id },
      include: {
        purchaseOrder: {
          include: {
            lines: {
              orderBy: { lineNumber: 'asc' },
            },
          },
        },
        lines: {
          orderBy: { lineNumber: 'asc' },
        },
      },
    });
    if (!receipt) {
      throw new BadRequestException(`Purchase receipt ${id} was not found.`);
    }
    if (receipt.status !== PurchaseReceiptStatus.DRAFT) {
      throw new BadRequestException('Only draft purchase receipts can be posted.');
    }
    if (
      receipt.purchaseOrder.status !== PurchaseOrderStatus.ISSUED &&
      receipt.purchaseOrder.status !== PurchaseOrderStatus.PARTIALLY_RECEIVED
    ) {
      throw new BadRequestException('Purchase receipts can only be posted for issued or partially received purchase orders.');
    }

    const lineMap = new Map(receipt.purchaseOrder.lines.map((line) => [line.id, line]));
    for (const line of receipt.lines) {
      const orderLine = lineMap.get(line.purchaseOrderLineId);
      if (!orderLine) {
        throw new BadRequestException('Purchase receipt line references an invalid purchase-order line.');
      }
      const remaining = Number(orderLine.quantity) - Number(orderLine.receivedQuantity);
      if (Number(line.quantityReceived) - Number(remaining.toFixed(4)) > 0.0001) {
        throw new BadRequestException('Receipt quantity cannot exceed the remaining quantity of the linked purchase-order line.');
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      for (const line of receipt.lines) {
        await tx.purchaseOrderLine.update({
          where: { id: line.purchaseOrderLineId },
          data: {
            receivedQuantity: {
              increment: this.toQuantity(Number(line.quantityReceived)),
            },
          },
        });
      }

      const refreshedLines = await tx.purchaseOrderLine.findMany({
        where: { purchaseOrderId: receipt.purchaseOrderId },
        orderBy: { lineNumber: 'asc' },
      });

      const allFullyReceived = refreshedLines.every(
        (line) => Number(line.receivedQuantity) + 0.0001 >= Number(line.quantity),
      );
      const anyReceived = refreshedLines.some((line) => Number(line.receivedQuantity) > 0);

      await tx.purchaseOrder.update({
        where: { id: receipt.purchaseOrderId },
        data: {
          status: allFullyReceived
            ? PurchaseOrderStatus.FULLY_RECEIVED
            : anyReceived
              ? PurchaseOrderStatus.PARTIALLY_RECEIVED
              : PurchaseOrderStatus.ISSUED,
        },
      });

      return tx.purchaseReceipt.update({
        where: { id },
        data: {
          status: PurchaseReceiptStatus.POSTED,
          postedAt: new Date(),
        },
        include: this.purchaseReceiptInclude(),
      });
    });

    await this.auditService.log({
      entity: 'PurchaseReceipt',
      entityId: updated.id,
      action: AuditAction.POST,
      details: { status: updated.status, reference: updated.reference, purchaseOrderId: updated.purchaseOrder.id },
    });

    return this.mapPurchaseReceipt(updated);
  }

  async cancel(id: string) {
    const current = await this.getPurchaseReceiptOrThrow(id);
    if (current.status !== PurchaseReceiptStatus.DRAFT) {
      throw new BadRequestException('Only draft purchase receipts can be cancelled.');
    }

    const updated = await this.prisma.purchaseReceipt.update({
      where: { id },
      data: { status: PurchaseReceiptStatus.CANCELLED },
      include: this.purchaseReceiptInclude(),
    });

    await this.auditService.log({
      entity: 'PurchaseReceipt',
      entityId: updated.id,
      action: AuditAction.DELETE,
      details: { status: updated.status, reference: updated.reference },
    });

    return this.mapPurchaseReceipt(updated);
  }

  private async getEligiblePurchaseOrder(id: string) {
    const order = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        lines: {
          orderBy: { lineNumber: 'asc' },
        },
      },
    });

    if (!order) {
      throw new BadRequestException('Linked purchase order was not found.');
    }
    if (order.status !== PurchaseOrderStatus.ISSUED && order.status !== PurchaseOrderStatus.PARTIALLY_RECEIVED) {
      throw new BadRequestException('Purchase receipts can only be created for issued or partially received purchase orders.');
    }

    return order;
  }

  private resolveLines(
    lines: PurchaseReceiptLineDto[],
    orderLines: Array<{
      id: string;
      lineNumber: number;
      itemName: string | null;
      description: string;
      quantity: Prisma.Decimal;
      receivedQuantity: Prisma.Decimal;
    }>,
  ) {
    const orderLineMap = new Map(orderLines.map((line) => [line.id, line]));

    return lines.map((line) => {
      const orderLine = orderLineMap.get(line.purchaseOrderLineId);
      if (!orderLine) {
        throw new BadRequestException('Each purchase receipt line must reference a valid purchase-order line.');
      }

      const quantityReceived = Number(line.quantityReceived);
      const remaining = Number(orderLine.quantity) - Number(orderLine.receivedQuantity);
      if (quantityReceived - Number(remaining.toFixed(4)) > 0.0001) {
        throw new BadRequestException('Receipt quantity cannot exceed the remaining quantity of the linked purchase-order line.');
      }

      return {
        purchaseOrderLineId: orderLine.id,
        lineNumber: orderLine.lineNumber,
        itemName: orderLine.itemName,
        description: orderLine.description,
        quantityReceived,
      } satisfies ResolvedReceiptLine;
    });
  }

  private purchaseReceiptInclude() {
    return {
      supplier: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
      purchaseOrder: {
        select: {
          id: true,
          reference: true,
          status: true,
          orderDate: true,
        },
      },
      lines: {
        orderBy: { lineNumber: 'asc' },
        include: {
          purchaseOrderLine: {
            select: {
              id: true,
              lineNumber: true,
            },
          },
        },
      },
    } satisfies Prisma.PurchaseReceiptInclude;
  }

  private async getPurchaseReceiptOrThrow(id: string) {
    const row = await this.prisma.purchaseReceipt.findUnique({ where: { id } });
    if (!row) {
      throw new BadRequestException(`Purchase receipt ${id} was not found.`);
    }
    return row;
  }

  private mapPurchaseReceipt(row: PurchaseReceiptWithRelations) {
    return {
      id: row.id,
      reference: row.reference,
      status: row.status,
      receiptDate: row.receiptDate.toISOString(),
      description: row.description,
      totalQuantity: row.totalQuantity.toString(),
      postedAt: row.postedAt?.toISOString() ?? null,
      canEdit: row.status === PurchaseReceiptStatus.DRAFT,
      canPost: row.status === PurchaseReceiptStatus.DRAFT,
      canCancel: row.status === PurchaseReceiptStatus.DRAFT,
      supplier: row.supplier,
      purchaseOrder: {
        id: row.purchaseOrder.id,
        reference: row.purchaseOrder.reference,
        status: row.purchaseOrder.status,
        orderDate: row.purchaseOrder.orderDate.toISOString(),
      },
      lines: row.lines.map((line) => ({
        id: line.id,
        lineNumber: line.lineNumber,
        purchaseOrderLineId: line.purchaseOrderLine.id,
        purchaseOrderLineNumber: line.purchaseOrderLine.lineNumber,
        itemName: line.itemName,
        description: line.description,
        quantityReceived: line.quantityReceived.toString(),
      })),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private parseStatus(status?: string): PurchaseReceiptStatus | undefined {
    if (!status) {
      return undefined;
    }
    if (status in PurchaseReceiptStatus) {
      return status as PurchaseReceiptStatus;
    }
    throw new BadRequestException('Invalid purchase receipt status.');
  }

  private dateRangeFilter(dateFrom?: string, dateTo?: string) {
    return dateFrom || dateTo
      ? {
          gte: dateFrom ? new Date(dateFrom) : undefined,
          lte: dateTo ? new Date(dateTo) : undefined,
        }
      : undefined;
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
