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

type AuthUser = { userId?: string; email?: string; role?: string };

type ResolvedPurchaseRequestLine = {
  itemId: string | null;
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

type RequestHistoryUser = {
  id: string;
  name: string | null;
  email: string;
};

type RequestHistoryRow = {
  id: string;
  purchaseRequestId: string;
  status: PurchaseRequestStatus;
  note: string | null;
  changedAt: Date;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
};

type LinkedRequestInvoice = {
  id: string;
  reference: string;
  status: string;
  invoiceDate: Date;
  supplier: {
    id: string;
    code: string;
    name: string;
  };
};

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

    return this.enrichAndMapPurchaseRequests(rows);
  }

  async getById(id: string) {
    const row = await this.prisma.purchaseRequest.findUnique({
      where: { id },
      include: this.purchaseRequestInclude(),
    });

    if (!row) {
      throw new BadRequestException(`Purchase request ${id} was not found.`);
    }

    const [mapped] = await this.enrichAndMapPurchaseRequests([row]);
    return mapped;
  }

  async create(dto: CreatePurchaseRequestDto, user?: AuthUser) {
    const requestDate = new Date(dto.requestDate);
    const reference = await this.generateDailyReference(requestDate);
    const lines = await this.resolveLines(dto.lines);

    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const request = await tx.purchaseRequest.create({
          data: {
            reference,
            requestDate,
            description: dto.description?.trim() || null,
            lines: {
              create: lines.map((line, index) => this.buildPurchaseRequestLineCreateInput(line, index + 1)),
            },
          },
        });

        await tx.$executeRaw(
          Prisma.sql`
            INSERT INTO "PurchaseRequestStatusHistory"
              ("id", "purchaseRequestId", "status", "note", "changedAt", "createdAt", "userId")
            VALUES
              (${crypto.randomUUID()}, ${request.id}, ${PurchaseRequestStatus.DRAFT}::"PurchaseRequestStatus", ${'Request created in draft status.'}, NOW(), NOW(), ${user?.userId || null})
          `,
        );

        return tx.purchaseRequest.findUniqueOrThrow({
          where: { id: request.id },
          include: this.purchaseRequestInclude(),
        });
      });

      const [mapped] = await this.enrichAndMapPurchaseRequests([created]);
      return mapped;
    } catch (error) {
      if (this.isUniqueConflict(error, 'reference')) {
        throw new ConflictException('A purchase request with this reference already exists.');
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdatePurchaseRequestDto, _user?: AuthUser) {
    const current = await this.getPurchaseRequestOrThrow(id);
    if (!this.hasStatus(current.status, [PurchaseRequestStatus.DRAFT, PurchaseRequestStatus.REJECTED])) {
      throw new BadRequestException('Only draft or rejected purchase requests can be edited.');
    }

    const lines = dto.lines ? await this.resolveLines(dto.lines) : null;

    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        if (lines) {
          await tx.purchaseRequestLine.deleteMany({ where: { purchaseRequestId: id } });
        }

        return tx.purchaseRequest.update({
          where: { id },
          data: {
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

      const [mapped] = await this.enrichAndMapPurchaseRequests([updated]);
      return mapped;
    } catch (error) {
      if (this.isUniqueConflict(error, 'reference')) {
        throw new ConflictException('A purchase request with this reference already exists.');
      }
      throw error;
    }
  }

  async submit(id: string, note?: string, user?: AuthUser) {
    return this.changeStatus(id, PurchaseRequestStatus.SUBMITTED, {
      allowedCurrentStatuses: [PurchaseRequestStatus.DRAFT, PurchaseRequestStatus.REJECTED],
      note: note?.trim() || 'Purchase request sent for approval.',
    }, user);
  }

  async approve(id: string, note?: string, user?: AuthUser) {
    return this.changeStatus(id, PurchaseRequestStatus.APPROVED, {
      allowedCurrentStatuses: [PurchaseRequestStatus.SUBMITTED],
      note: note?.trim() || 'Purchase request approved.',
    }, user);
  }

  async reject(id: string, note?: string, user?: AuthUser) {
    return this.changeStatus(id, PurchaseRequestStatus.REJECTED, {
      allowedCurrentStatuses: [PurchaseRequestStatus.SUBMITTED],
      note: note?.trim() || 'Purchase request rejected.',
    }, user);
  }

  async close(id: string, note?: string, user?: AuthUser) {
    return this.changeStatus(id, PurchaseRequestStatus.CLOSED, {
      allowedCurrentStatuses: [PurchaseRequestStatus.APPROVED, PurchaseRequestStatus.REJECTED],
      note: note?.trim() || 'Purchase request closed.',
    }, user);
  }

  async convertToOrder(id: string, dto: ConvertPurchaseRequestToOrderDto, user?: AuthUser) {
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
                itemId: line.itemId,
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

        await tx.$executeRaw(
          Prisma.sql`
            INSERT INTO "PurchaseRequestStatusHistory"
              ("id", "purchaseRequestId", "status", "note", "changedAt", "createdAt", "userId")
            VALUES
              (${crypto.randomUUID()}, ${request.id}, ${request.status}::"PurchaseRequestStatus", ${`Converted to purchase order ${order.reference}.`}, NOW(), NOW(), ${user?.userId || null})
          `,
        );

        const updatedRequest = await tx.purchaseRequest.findUniqueOrThrow({
          where: { id: request.id },
          include: this.purchaseRequestInclude(),
        });

        return {
          purchaseRequest: (await this.enrichAndMapPurchaseRequests([updatedRequest]))[0],
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
    user?: AuthUser,
  ) {
    const current = await this.getPurchaseRequestOrThrow(id);

    if (!options.allowedCurrentStatuses.includes(current.status)) {
      throw new BadRequestException(
        `Purchase request must be in one of these statuses: ${options.allowedCurrentStatuses.join(', ')}.`,
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.purchaseRequest.update({
        where: { id },
        data: {
          status: nextStatus,
        },
      });

      await tx.$executeRaw(
        Prisma.sql`
          INSERT INTO "PurchaseRequestStatusHistory"
            ("id", "purchaseRequestId", "status", "note", "changedAt", "createdAt", "userId")
          VALUES
            (${crypto.randomUUID()}, ${id}, ${nextStatus}::"PurchaseRequestStatus", ${options.note}, NOW(), NOW(), ${user?.userId || null})
        `,
      );

      return tx.purchaseRequest.findUniqueOrThrow({
        where: { id },
        include: this.purchaseRequestInclude(),
      });
    });

    const [mapped] = await this.enrichAndMapPurchaseRequests([updated]);
    return mapped;
  }

  private async resolveLines(lines: PurchaseRequestLineDto[]): Promise<ResolvedPurchaseRequestLine[]> {
    const itemIds = Array.from(new Set(lines.map((line) => line.itemId?.trim()).filter(Boolean))) as string[];
    const validItems = new Map(
      (
        itemIds.length
          ? await this.prisma.inventoryItem.findMany({
              where: { id: { in: itemIds }, isActive: true },
              select: { id: true, name: true },
            })
          : []
      ).map((item) => [item.id, item]),
    );

    return lines.map((line) => {
      const itemId = line.itemId?.trim() || null;
      const item = itemId ? validItems.get(itemId) : null;

      if (itemId && !item) {
        throw new BadRequestException('Each linked purchase request item must reference an active inventory item.');
      }

      return {
        itemId,
        itemName: line.itemName?.trim() || item?.name || null,
        description: line.description.trim(),
        quantity: Number(line.quantity),
        requestedDeliveryDate: line.requestedDeliveryDate ? new Date(line.requestedDeliveryDate) : null,
        justification: line.justification?.trim() || null,
      };
    });
  }

  private buildPurchaseRequestLineCreateInput(
    line: ResolvedPurchaseRequestLine,
    lineNumber: number,
  ): Prisma.PurchaseRequestLineUncheckedCreateWithoutPurchaseRequestInput {
    return {
      lineNumber,
      itemId: line.itemId,
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

  private async enrichAndMapPurchaseRequests(rows: PurchaseRequestWithRelations[]) {
    const requestIds = rows.map((row) => row.id);

    const [historyRows, invoiceRows] = await Promise.all([
      requestIds.length
        ? this.prisma.$queryRaw<RequestHistoryRow[]>(
            Prisma.sql`
              SELECT
                h."id",
                h."purchaseRequestId",
                h."status",
                h."note",
                h."changedAt",
                h."userId",
                u."name" AS "userName",
                u."email" AS "userEmail"
              FROM "PurchaseRequestStatusHistory" h
              LEFT JOIN "User" u ON u."id" = h."userId"
              WHERE h."purchaseRequestId" IN (${Prisma.join(requestIds)})
              ORDER BY h."changedAt" DESC
            `,
          )
        : Promise.resolve([]),
      requestIds.length
        ? this.prisma.$queryRaw<
            Array<{
              id: string;
              reference: string;
              status: string;
              invoiceDate: Date;
              sourcePurchaseRequestId: string;
              supplierId: string;
              supplierCode: string;
              supplierName: string;
            }>
          >(
            Prisma.sql`
              SELECT
                i."id",
                i."reference",
                i."status",
                i."invoiceDate",
                i."sourcePurchaseRequestId",
                s."id" AS "supplierId",
                s."code" AS "supplierCode",
                s."name" AS "supplierName"
              FROM "PurchaseInvoice" i
              INNER JOIN "Supplier" s ON s."id" = i."supplierId"
              WHERE i."sourcePurchaseRequestId" IN (${Prisma.join(requestIds)})
              ORDER BY i."invoiceDate" DESC
            `,
          )
        : Promise.resolve([]),
    ]);

    const historyByRequestId = new Map<string, RequestHistoryRow[]>();
    for (const historyRow of historyRows) {
      const bucket = historyByRequestId.get(historyRow.purchaseRequestId) ?? [];
      bucket.push(historyRow);
      historyByRequestId.set(historyRow.purchaseRequestId, bucket);
    }

    const invoicesByRequestId = new Map<string, LinkedRequestInvoice[]>();
    for (const invoice of invoiceRows) {
      const key = invoice.sourcePurchaseRequestId;
      if (!key) continue;
      const bucket = invoicesByRequestId.get(key) ?? [];
      bucket.push({
        id: invoice.id,
        reference: invoice.reference,
        status: invoice.status,
        invoiceDate: invoice.invoiceDate,
        supplier: {
          id: invoice.supplierId,
          code: invoice.supplierCode,
          name: invoice.supplierName,
        },
      });
      invoicesByRequestId.set(key, bucket);
    }

    return rows.map((row) =>
      this.mapPurchaseRequest(row, historyByRequestId.get(row.id) ?? [], invoicesByRequestId.get(row.id) ?? []),
    );
  }

  private mapPurchaseRequest(
    row: PurchaseRequestWithRelations,
    historyRows: RequestHistoryRow[],
    linkedPurchaseInvoices: LinkedRequestInvoice[],
  ) {
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
      canConvertToInvoice: row.status === PurchaseRequestStatus.APPROVED,
      lines: row.lines.map((line) => ({
        id: line.id,
        lineNumber: line.lineNumber,
        itemId: line.itemId,
        itemName: line.itemName,
        description: line.description,
        quantity: line.quantity.toString(),
        requestedDeliveryDate: line.requestedDeliveryDate?.toISOString() ?? null,
        justification: line.justification,
      })),
      statusHistory: historyRows.map((entry) => ({
        id: entry.id,
        status: entry.status,
        note: entry.note,
        changedAt: entry.changedAt.toISOString(),
        userId: entry.userId,
        user: entry.userId
          ? {
              id: entry.userId,
              name: entry.userName,
              email: entry.userEmail ?? '',
            }
          : null,
      })),
      linkedPurchaseOrders: row.purchaseOrders.map((order) => ({
        id: order.id,
        reference: order.reference,
        status: order.status,
        orderDate: order.orderDate.toISOString(),
        supplier: order.supplier,
      })),
      linkedPurchaseInvoices: linkedPurchaseInvoices.map((invoice) => ({
        id: invoice.id,
        reference: invoice.reference,
        status: invoice.status,
        invoiceDate: invoice.invoiceDate.toISOString(),
        supplier: invoice.supplier,
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

  private async generateDailyReference(requestDate: Date) {
    const compactDate = requestDate.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `PR-${compactDate}-`;
    const rows = await this.prisma.purchaseRequest.findMany({
      where: {
        reference: {
          startsWith: prefix,
        },
      },
      select: {
        reference: true,
      },
    });

    let maxSequence = 0;
    for (const row of rows) {
      const match = row.reference.match(new RegExp(`^PR-${compactDate}-(\\d+)$`));
      if (!match) {
        continue;
      }

      const parsed = Number(match[1]);
      if (Number.isFinite(parsed) && parsed > maxSequence) {
        maxSequence = parsed;
      }
    }

    return `PR-${compactDate}-${maxSequence + 1}`;
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
