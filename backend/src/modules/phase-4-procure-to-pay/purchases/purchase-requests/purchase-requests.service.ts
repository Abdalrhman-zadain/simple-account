import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { Prisma, PurchaseRequestStatus } from '../../../../generated/prisma';

import { PrismaService } from '../../../../common/prisma/prisma.service';
import { SuppliersService } from '../suppliers/suppliers.service';
import {
  ConvertPurchaseRequestToOrderDto,
  CreatePurchaseRequestDto,
  PurchaseRequestLineDto,
  UpdatePurchaseRequestDto,
} from './dto/purchase-requests.dto';

type PurchaseRequestListQuery = {
  status?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
};

type ResolvedPurchaseRequestLine = {
  itemName: string | null;
  description: string;
  quantity: number;
  requestedDeliveryDate: Date | null;
  justification: string | null;
};

type PurchaseRequestWithRelations = Prisma.PurchaseRequestGetPayload<{
  include: {
    lines: true;
    statusHistory: true;
    purchaseOrders: {
      select: {
        id: true;
        reference: true;
        status: true;
        orderDate: true;
        supplier: {
          select: {
            id: true;
            code: true;
            name: true;
          };
        };
      };
    };
  };
}>;

@Injectable()
export class PurchaseRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly suppliersService: SuppliersService,
  ) {}

  async list(query: PurchaseRequestListQuery = {}) {
    const search = query.search?.trim();
    const rows = await this.prisma.purchaseRequest.findMany({
      where: {
        status: this.parseStatus(query.status),
        requestDate: this.dateRangeFilter(query.dateFrom, query.dateTo),
        OR: search
          ? [
              { reference: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
              { lines: { some: { itemName: { contains: search, mode: 'insensitive' } } } },
              { lines: { some: { description: { contains: search, mode: 'insensitive' } } } },
              { purchaseOrders: { some: { reference: { contains: search, mode: 'insensitive' } } } },
            ]
          : undefined,
      },
      include: this.purchaseRequestInclude(),
      orderBy: [{ requestDate: 'desc' }, { createdAt: 'desc' }],
    });

    return rows.map((row) => this.mapPurchaseRequest(row));
  }

  async getById(id: string) {
    const row = await this.prisma.purchaseRequest.findUnique({
      where: { id },
      include: this.purchaseRequestInclude(),
    });

    if (!row) {
      throw new BadRequestException(`Purchase request ${id} was not found.`);
    }

    return this.mapPurchaseRequest(row);
  }

  async create(dto: CreatePurchaseRequestDto) {
    const reference = dto.reference?.trim() || this.generateReference('PR');
    const lines = this.resolveLines(dto.lines);

    try {
      const created = await this.prisma.purchaseRequest.create({
        data: {
          reference,
          requestDate: new Date(dto.requestDate),
          description: dto.description?.trim() || null,
          lines: {
            create: lines.map((line, index) => this.buildPurchaseRequestLineCreateInput(line, index + 1)),
          },
          statusHistory: {
            create: {
              status: PurchaseRequestStatus.DRAFT,
              note: 'Request created in draft status.',
            },
          },
        },
        include: this.purchaseRequestInclude(),
      });

      return this.mapPurchaseRequest(created);
    } catch (error) {
      if (this.isUniqueConflict(error, 'reference')) {
        throw new ConflictException('A purchase request with this reference already exists.');
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdatePurchaseRequestDto) {
    const current = await this.getPurchaseRequestOrThrow(id);
    if (!this.hasStatus(current.status, [PurchaseRequestStatus.DRAFT, PurchaseRequestStatus.REJECTED])) {
      throw new BadRequestException('Only draft or rejected purchase requests can be edited.');
    }

    const lines = dto.lines ? this.resolveLines(dto.lines) : null;

    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        if (lines) {
          await tx.purchaseRequestLine.deleteMany({ where: { purchaseRequestId: id } });
        }

        return tx.purchaseRequest.update({
          where: { id },
          data: {
            reference: dto.reference?.trim(),
            requestDate: dto.requestDate ? new Date(dto.requestDate) : undefined,
            description: dto.description === undefined ? undefined : dto.description.trim() || null,
            lines: lines
              ? {
                  create: lines.map((line, index) => this.buildPurchaseRequestLineCreateInput(line, index + 1)),
                }
              : undefined,
          },
          include: this.purchaseRequestInclude(),
        });
      });

      return this.mapPurchaseRequest(updated);
    } catch (error) {
      if (this.isUniqueConflict(error, 'reference')) {
        throw new ConflictException('A purchase request with this reference already exists.');
      }
      throw error;
    }
  }

  async submit(id: string, note?: string) {
    return this.changeStatus(id, PurchaseRequestStatus.SUBMITTED, {
      allowedCurrentStatuses: [PurchaseRequestStatus.DRAFT, PurchaseRequestStatus.REJECTED],
      note: note?.trim() || 'Purchase request submitted for approval.',
    });
  }

  async approve(id: string, note?: string) {
    return this.changeStatus(id, PurchaseRequestStatus.APPROVED, {
      allowedCurrentStatuses: [PurchaseRequestStatus.SUBMITTED],
      note: note?.trim() || 'Purchase request approved.',
    });
  }

  async reject(id: string, note?: string) {
    return this.changeStatus(id, PurchaseRequestStatus.REJECTED, {
      allowedCurrentStatuses: [PurchaseRequestStatus.SUBMITTED],
      note: note?.trim() || 'Purchase request rejected.',
    });
  }

  async close(id: string, note?: string) {
    return this.changeStatus(id, PurchaseRequestStatus.CLOSED, {
      allowedCurrentStatuses: [PurchaseRequestStatus.APPROVED, PurchaseRequestStatus.REJECTED],
      note: note?.trim() || 'Purchase request closed.',
    });
  }

  async convertToOrder(id: string, dto: ConvertPurchaseRequestToOrderDto) {
    const request = await this.prisma.purchaseRequest.findUnique({
      where: { id },
      include: {
        lines: { orderBy: { lineNumber: 'asc' } },
      },
    });

    if (!request) {
      throw new BadRequestException(`Purchase request ${id} was not found.`);
    }
    if (request.status !== PurchaseRequestStatus.APPROVED) {
      throw new BadRequestException('Only approved purchase requests can be converted to purchase orders.');
    }

    const supplier = await this.suppliersService.ensureActiveSupplier(dto.supplierId);
    const currencyCode = dto.currencyCode?.trim().toUpperCase() || supplier.defaultCurrency;
    const reference = dto.reference?.trim() || this.generateReference('PO');

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const order = await tx.purchaseOrder.create({
          data: {
            reference,
            orderDate: new Date(dto.orderDate),
            supplierId: supplier.id,
            currencyCode,
            description: dto.description?.trim() || request.description || null,
            sourcePurchaseRequestId: request.id,
            subtotalAmount: this.toAmount(0),
            taxAmount: this.toAmount(0),
            totalAmount: this.toAmount(0),
            lines: {
              create: request.lines.map((line, index) => ({
                lineNumber: index + 1,
                itemName: line.itemName,
                description: line.description,
                quantity: line.quantity,
                unitPrice: this.toAmount(0),
                taxAmount: this.toAmount(0),
                lineTotalAmount: this.toAmount(0),
                requestedDeliveryDate: line.requestedDeliveryDate,
              })),
            },
          },
          include: {
            supplier: {
              select: { id: true, code: true, name: true },
            },
          },
        });

        const updatedRequest = await tx.purchaseRequest.update({
          where: { id: request.id },
          data: {
            status: PurchaseRequestStatus.CLOSED,
            statusHistory: {
              create: {
                status: PurchaseRequestStatus.CLOSED,
                note: `Converted to purchase order ${order.reference}.`,
              },
            },
          },
          include: this.purchaseRequestInclude(),
        });

        return {
          purchaseRequest: this.mapPurchaseRequest(updatedRequest),
          purchaseOrder: {
            id: order.id,
            reference: order.reference,
            status: order.status,
            orderDate: order.orderDate.toISOString(),
            currencyCode: order.currencyCode,
            supplier: order.supplier,
          },
        };
      });

      return result;
    } catch (error) {
      if (this.isUniqueConflict(error, 'reference')) {
        throw new ConflictException('A purchase order with this reference already exists.');
      }
      throw error;
    }
  }

  private async changeStatus(
    id: string,
    nextStatus: PurchaseRequestStatus,
    options: { allowedCurrentStatuses: PurchaseRequestStatus[]; note: string },
  ) {
    const current = await this.getPurchaseRequestOrThrow(id);

    if (!options.allowedCurrentStatuses.includes(current.status)) {
      throw new BadRequestException(
        `Purchase request must be in one of these statuses: ${options.allowedCurrentStatuses.join(', ')}.`,
      );
    }

    const updated = await this.prisma.purchaseRequest.update({
      where: { id },
      data: {
        status: nextStatus,
        statusHistory: {
          create: {
            status: nextStatus,
            note: options.note,
          },
        },
      },
      include: this.purchaseRequestInclude(),
    });

    return this.mapPurchaseRequest(updated);
  }

  private resolveLines(lines: PurchaseRequestLineDto[]): ResolvedPurchaseRequestLine[] {
    return lines.map((line) => ({
      itemName: line.itemName?.trim() || null,
      description: line.description.trim(),
      quantity: Number(line.quantity),
      requestedDeliveryDate: line.requestedDeliveryDate ? new Date(line.requestedDeliveryDate) : null,
      justification: line.justification?.trim() || null,
    }));
  }

  private buildPurchaseRequestLineCreateInput(
    line: ResolvedPurchaseRequestLine,
    lineNumber: number,
  ): Prisma.PurchaseRequestLineUncheckedCreateWithoutPurchaseRequestInput {
    return {
      lineNumber,
      itemName: line.itemName,
      description: line.description,
      quantity: this.toQuantity(line.quantity),
      requestedDeliveryDate: line.requestedDeliveryDate,
      justification: line.justification,
    };
  }

  private purchaseRequestInclude() {
    return {
      lines: {
        orderBy: { lineNumber: 'asc' },
      },
      statusHistory: {
        orderBy: { changedAt: 'desc' },
      },
      purchaseOrders: {
        select: {
          id: true,
          reference: true,
          status: true,
          orderDate: true,
          supplier: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
        },
        orderBy: { orderDate: 'desc' },
      },
    } satisfies Prisma.PurchaseRequestInclude;
  }

  private async getPurchaseRequestOrThrow(id: string) {
    const row = await this.prisma.purchaseRequest.findUnique({ where: { id } });
    if (!row) {
      throw new BadRequestException(`Purchase request ${id} was not found.`);
    }
    return row;
  }

  private mapPurchaseRequest(row: PurchaseRequestWithRelations) {
    return {
      id: row.id,
      reference: row.reference,
      status: row.status,
      requestDate: row.requestDate.toISOString(),
      description: row.description,
      canEdit: this.hasStatus(row.status, [PurchaseRequestStatus.DRAFT, PurchaseRequestStatus.REJECTED]),
      canSubmit: this.hasStatus(row.status, [PurchaseRequestStatus.DRAFT, PurchaseRequestStatus.REJECTED]),
      canApprove: row.status === PurchaseRequestStatus.SUBMITTED,
      canReject: row.status === PurchaseRequestStatus.SUBMITTED,
      canClose: this.hasStatus(row.status, [PurchaseRequestStatus.APPROVED, PurchaseRequestStatus.REJECTED]),
      canConvertToOrder: row.status === PurchaseRequestStatus.APPROVED,
      lines: row.lines.map((line) => ({
        id: line.id,
        lineNumber: line.lineNumber,
        itemName: line.itemName,
        description: line.description,
        quantity: line.quantity.toString(),
        requestedDeliveryDate: line.requestedDeliveryDate?.toISOString() ?? null,
        justification: line.justification,
      })),
      statusHistory: row.statusHistory.map((entry) => ({
        id: entry.id,
        status: entry.status,
        note: entry.note,
        changedAt: entry.changedAt.toISOString(),
      })),
      linkedPurchaseOrders: row.purchaseOrders.map((order) => ({
        id: order.id,
        reference: order.reference,
        status: order.status,
        orderDate: order.orderDate.toISOString(),
        supplier: order.supplier,
      })),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private parseStatus(status?: string): PurchaseRequestStatus | undefined {
    if (!status) {
      return undefined;
    }

    if (status in PurchaseRequestStatus) {
      return status as PurchaseRequestStatus;
    }

    throw new BadRequestException('Invalid purchase request status.');
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

  private hasStatus(current: PurchaseRequestStatus, allowed: PurchaseRequestStatus[]) {
    return allowed.includes(current);
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
