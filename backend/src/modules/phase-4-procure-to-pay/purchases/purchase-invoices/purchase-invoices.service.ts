import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { AuditAction, Prisma, PurchaseInvoiceStatus, PurchaseOrderStatus } from '../../../../generated/prisma';

import { PrismaService } from '../../../../common/prisma/prisma.service';
import { AuditService } from '../../../phase-1-accounting-foundation/accounting-core/audit/audit.service';
import { JournalEntriesService } from '../../../phase-1-accounting-foundation/accounting-core/journal-entries/journal-entries.service';
import { ReverseJournalEntryDto } from '../../../phase-1-accounting-foundation/accounting-core/journal-entries/dto/reverse-journal-entry.dto';
import { PostingService } from '../../../phase-1-accounting-foundation/accounting-core/posting-logic/posting.service';
import { ReversalService } from '../../../phase-1-accounting-foundation/accounting-core/reversal-control/reversal.service';
import { SuppliersService } from '../suppliers/suppliers.service';
import { CreatePurchaseInvoiceDto, PurchaseInvoiceLineDto, UpdatePurchaseInvoiceDto } from './dto/purchase-invoices.dto';

type PurchaseInvoiceListQuery = {
  status?: string;
  supplierId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
};

type ResolvedInvoiceLine = {
  itemName: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  taxAmount: number;
  lineSubtotalAmount: number;
  lineTotalAmount: number;
  accountId: string;
};

type PurchaseInvoiceWithRelations = Prisma.PurchaseInvoiceGetPayload<{
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
    sourcePurchaseOrder: {
      select: {
        id: true;
        reference: true;
        status: true;
        orderDate: true;
      };
    };
    journalEntry: {
      select: {
        id: true;
        reference: true;
      };
    };
    lines: {
      include: {
        account: {
          select: {
            id: true;
            code: true;
            name: true;
            type: true;
            currencyCode: true;
            isActive: true;
            isPosting: true;
          };
        };
      };
    };
  };
}>;

@Injectable()
export class PurchaseInvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly suppliersService: SuppliersService,
    private readonly journalEntriesService: JournalEntriesService,
    private readonly postingService: PostingService,
    private readonly reversalService: ReversalService,
    private readonly auditService: AuditService,
  ) {}

  async list(query: PurchaseInvoiceListQuery = {}) {
    const search = query.search?.trim();
    const rows = await this.prisma.purchaseInvoice.findMany({
      where: {
        supplierId: query.supplierId,
        status: this.parseStatus(query.status),
        invoiceDate: this.dateRangeFilter(query.dateFrom, query.dateTo),
        OR: search
          ? [
              { reference: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
              { supplier: { code: { contains: search, mode: 'insensitive' } } },
              { supplier: { name: { contains: search, mode: 'insensitive' } } },
              { sourcePurchaseOrder: { reference: { contains: search, mode: 'insensitive' } } },
              { lines: { some: { itemName: { contains: search, mode: 'insensitive' } } } },
              { lines: { some: { description: { contains: search, mode: 'insensitive' } } } },
              { lines: { some: { account: { code: { contains: search, mode: 'insensitive' } } } } },
              { lines: { some: { account: { name: { contains: search, mode: 'insensitive' } } } } },
            ]
          : undefined,
      },
      include: this.purchaseInvoiceInclude(),
      orderBy: [{ invoiceDate: 'desc' }, { createdAt: 'desc' }],
    });

    return rows.map((row) => this.mapPurchaseInvoice(row));
  }

  async getById(id: string) {
    const row = await this.prisma.purchaseInvoice.findUnique({
      where: { id },
      include: this.purchaseInvoiceInclude(),
    });
    if (!row) {
      throw new BadRequestException(`Purchase invoice ${id} was not found.`);
    }
    return this.mapPurchaseInvoice(row);
  }

  async create(dto: CreatePurchaseInvoiceDto) {
    const supplier = await this.suppliersService.ensureActiveSupplier(dto.supplierId);
    const currencyCode = dto.currencyCode?.trim().toUpperCase() || supplier.defaultCurrency;
    const reference = dto.reference?.trim() || this.generateReference('PINV');
    const lines = await this.resolveLines(dto.lines);
    const totals = this.computeTotals(lines);
    if (totals.totalAmount <= 0) {
      throw new BadRequestException('Purchase invoices require a total payable amount greater than zero.');
    }

    if (dto.sourcePurchaseOrderId) {
      await this.ensurePurchaseOrderSource(dto.sourcePurchaseOrderId, supplier.id);
    }

    try {
      const created = await this.prisma.purchaseInvoice.create({
        data: {
          reference,
          invoiceDate: new Date(dto.invoiceDate),
          supplierId: supplier.id,
          currencyCode,
          description: dto.description?.trim() || null,
          sourcePurchaseOrderId: dto.sourcePurchaseOrderId || null,
          subtotalAmount: this.toAmount(totals.subtotalAmount),
          discountAmount: this.toAmount(totals.discountAmount),
          taxAmount: this.toAmount(totals.taxAmount),
          totalAmount: this.toAmount(totals.totalAmount),
          allocatedAmount: this.toAmount(0),
          outstandingAmount: this.toAmount(totals.totalAmount),
          allocationStatus: 'UNALLOCATED',
          lines: {
            create: lines.map((line, index) => this.buildPurchaseInvoiceLineCreateInput(line, index + 1)),
          },
        },
        include: this.purchaseInvoiceInclude(),
      });

      await this.auditService.log({
        entity: 'PurchaseInvoice',
        entityId: created.id,
        action: AuditAction.CREATE,
        details: { status: created.status, reference: created.reference },
      });

      return this.mapPurchaseInvoice(created);
    } catch (error) {
      if (this.isUniqueConflict(error, 'reference')) {
        throw new ConflictException('A purchase invoice with this reference already exists.');
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdatePurchaseInvoiceDto) {
    const current = await this.getPurchaseInvoiceOrThrow(id);
    if (current.status !== PurchaseInvoiceStatus.DRAFT) {
      throw new BadRequestException('Only draft purchase invoices can be edited.');
    }

    const nextSupplierId = dto.supplierId ?? current.supplierId;
    const supplier = await this.suppliersService.ensureActiveSupplier(nextSupplierId);
    const nextSourcePurchaseOrderId =
      dto.sourcePurchaseOrderId === undefined ? current.sourcePurchaseOrderId ?? undefined : dto.sourcePurchaseOrderId || undefined;

    if (nextSourcePurchaseOrderId) {
      await this.ensurePurchaseOrderSource(nextSourcePurchaseOrderId, supplier.id);
    }

    const lines = dto.lines ? await this.resolveLines(dto.lines) : null;
    const totals = lines ? this.computeTotals(lines) : null;
    if (totals && totals.totalAmount <= 0) {
      throw new BadRequestException('Purchase invoices require a total payable amount greater than zero.');
    }

    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        if (lines) {
          await tx.purchaseInvoiceLine.deleteMany({ where: { purchaseInvoiceId: id } });
        }

        return tx.purchaseInvoice.update({
          where: { id },
          data: {
            reference: dto.reference?.trim(),
            invoiceDate: dto.invoiceDate ? new Date(dto.invoiceDate) : undefined,
            supplierId: nextSupplierId,
            currencyCode: dto.currencyCode?.trim().toUpperCase() || supplier.defaultCurrency,
            description: dto.description === undefined ? undefined : dto.description.trim() || null,
            sourcePurchaseOrderId: dto.sourcePurchaseOrderId === undefined ? undefined : dto.sourcePurchaseOrderId || null,
            subtotalAmount: totals ? this.toAmount(totals.subtotalAmount) : undefined,
            discountAmount: totals ? this.toAmount(totals.discountAmount) : undefined,
            taxAmount: totals ? this.toAmount(totals.taxAmount) : undefined,
            totalAmount: totals ? this.toAmount(totals.totalAmount) : undefined,
            outstandingAmount: totals ? this.toAmount(Math.max(0, totals.totalAmount - Number(current.allocatedAmount))) : undefined,
            lines: lines
              ? {
                  create: lines.map((line, index) => this.buildPurchaseInvoiceLineCreateInput(line, index + 1)),
                }
              : undefined,
          },
          include: this.purchaseInvoiceInclude(),
        });
      });

      await this.auditService.log({
        entity: 'PurchaseInvoice',
        entityId: updated.id,
        action: AuditAction.UPDATE,
        details: { status: updated.status, reference: updated.reference },
      });

      return this.mapPurchaseInvoice(updated);
    } catch (error) {
      if (this.isUniqueConflict(error, 'reference')) {
        throw new ConflictException('A purchase invoice with this reference already exists.');
      }
      throw error;
    }
  }

  async post(id: string) {
    const invoice = await this.prisma.purchaseInvoice.findUnique({
      where: { id },
      include: {
        supplier: {
          select: {
            id: true,
            code: true,
            name: true,
            isActive: true,
            payableAccountId: true,
          },
        },
        lines: {
          orderBy: { lineNumber: 'asc' },
          include: {
            account: {
              select: {
                id: true,
                isActive: true,
                isPosting: true,
              },
            },
          },
        },
      },
    });
    if (!invoice) {
      throw new BadRequestException(`Purchase invoice ${id} was not found.`);
    }
    if (invoice.status !== PurchaseInvoiceStatus.DRAFT) {
      throw new BadRequestException('Only draft purchase invoices can be posted.');
    }
    if (!invoice.supplier.isActive) {
      throw new BadRequestException('Deactivated suppliers cannot be selected for new transactions.');
    }

    const description = invoice.description ? `${invoice.reference} - ${invoice.description}` : invoice.reference;
    const taxAccountId = Number(invoice.taxAmount) > 0 ? await this.getPurchaseTaxAccountId() : null;

    const journal = await this.journalEntriesService.create({
      entryDate: invoice.invoiceDate.toISOString(),
      description,
      lines: [
        ...invoice.lines
          .map((line) => ({
            accountId: line.accountId,
            description: line.description || description,
            debitAmount: Number((Number(line.lineSubtotalAmount) - Number(line.discountAmount)).toFixed(2)),
            creditAmount: 0,
          }))
          .filter((line) => line.debitAmount > 0),
        ...(taxAccountId
          ? [
              {
                accountId: taxAccountId,
                description: `${description} tax`,
                debitAmount: Number(invoice.taxAmount),
                creditAmount: 0,
              },
            ]
          : []),
        {
          accountId: invoice.supplier.payableAccountId,
          description,
          debitAmount: 0,
          creditAmount: Number(invoice.totalAmount),
        },
      ],
    });

    const posted = await this.postingService.post(journal.id);
    const postedAt = posted.postedAt ? new Date(posted.postedAt) : new Date();

    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.purchaseInvoice.update({
        where: { id },
        data: {
          status: PurchaseInvoiceStatus.POSTED,
          journalEntryId: posted.id,
          postedAt,
        },
        include: this.purchaseInvoiceInclude(),
      });

      await tx.supplier.update({
        where: { id: invoice.supplierId },
        data: {
          currentBalance: {
            increment: this.toAmount(Number(invoice.totalAmount)),
          },
        },
      });

      return next;
    });

    await this.auditService.log({
      entity: 'PurchaseInvoice',
      entityId: updated.id,
      action: AuditAction.POST,
      details: { status: updated.status, reference: updated.reference, journalEntryId: posted.id },
    });

    return this.mapPurchaseInvoice(updated);
  }

  async reverse(id: string, dto: ReverseJournalEntryDto) {
    const invoice = await this.prisma.purchaseInvoice.findUnique({
      where: { id },
      include: {
        supplier: {
          select: {
            id: true,
            isActive: true,
          },
        },
      },
    });
    if (!invoice) {
      throw new BadRequestException(`Purchase invoice ${id} was not found.`);
    }
    if (
      invoice.status !== PurchaseInvoiceStatus.POSTED &&
      invoice.status !== PurchaseInvoiceStatus.PARTIALLY_PAID &&
      invoice.status !== PurchaseInvoiceStatus.FULLY_PAID
    ) {
      throw new BadRequestException('Only posted purchase invoices can be reversed.');
    }
    if (!invoice.journalEntryId) {
      throw new BadRequestException('Purchase invoice does not have a posted journal entry to reverse.');
    }
    if (Number(invoice.allocatedAmount) > 0) {
      throw new BadRequestException('Purchase invoices with supplier payment allocations cannot be reversed.');
    }

    const activeDebitNotes = await this.prisma.debitNote.count({
      where: {
        purchaseInvoiceId: id,
        status: { in: ['POSTED', 'APPLIED'] as any },
      },
    });
    if (activeDebitNotes > 0) {
      throw new BadRequestException('Purchase invoices with posted debit notes cannot be reversed.');
    }

    await this.reversalService.reverse(invoice.journalEntryId, dto);

    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.purchaseInvoice.update({
        where: { id },
        data: {
          status: PurchaseInvoiceStatus.REVERSED,
          allocatedAmount: this.toAmount(0),
          outstandingAmount: this.toAmount(0),
          allocationStatus: 'UNALLOCATED',
        },
        include: this.purchaseInvoiceInclude(),
      });

      await tx.supplier.update({
        where: { id: invoice.supplierId },
        data: {
          currentBalance: {
            decrement: this.toAmount(Number(invoice.totalAmount)),
          },
        },
      });

      return next;
    });

    await this.auditService.log({
      entity: 'PurchaseInvoice',
      entityId: updated.id,
      action: AuditAction.REVERSE,
      details: { status: updated.status, reference: updated.reference, journalEntryId: invoice.journalEntryId },
    });

    return this.mapPurchaseInvoice(updated);
  }

  private async resolveLines(lines: PurchaseInvoiceLineDto[]) {
    const accountIds = Array.from(new Set(lines.map((line) => line.accountId)));
    const accounts = await this.prisma.account.findMany({
      where: { id: { in: accountIds }, isActive: true, isPosting: true },
      select: { id: true },
    });
    const validAccountIds = new Set(accounts.map((account) => account.id));

    return lines.map((line) => {
      if (!validAccountIds.has(line.accountId)) {
        throw new BadRequestException('Each purchase invoice line must use an active posting account.');
      }

      const quantity = Number(line.quantity);
      const unitPrice = Number(line.unitPrice);
      const discountAmount = Number(line.discountAmount ?? 0);
      const taxAmount = Number(line.taxAmount ?? 0);
      const lineSubtotalAmount = Number((quantity * unitPrice).toFixed(2));
      const lineTotalAmount = Number((lineSubtotalAmount - discountAmount + taxAmount).toFixed(2));

      if (lineTotalAmount < 0) {
        throw new BadRequestException('Discounts cannot exceed the subtotal of a purchase invoice line.');
      }

      return {
        itemName: line.itemName?.trim() || null,
        description: line.description.trim(),
        quantity,
        unitPrice,
        discountAmount,
        taxAmount,
        lineSubtotalAmount,
        lineTotalAmount,
        accountId: line.accountId,
      } satisfies ResolvedInvoiceLine;
    });
  }

  private computeTotals(lines: ResolvedInvoiceLine[]) {
    return lines.reduce(
      (totals, line) => ({
        subtotalAmount: Number((totals.subtotalAmount + line.lineSubtotalAmount).toFixed(2)),
        discountAmount: Number((totals.discountAmount + line.discountAmount).toFixed(2)),
        taxAmount: Number((totals.taxAmount + line.taxAmount).toFixed(2)),
        totalAmount: Number((totals.totalAmount + line.lineTotalAmount).toFixed(2)),
      }),
      { subtotalAmount: 0, discountAmount: 0, taxAmount: 0, totalAmount: 0 },
    );
  }

  private buildPurchaseInvoiceLineCreateInput(
    line: ResolvedInvoiceLine,
    lineNumber: number,
  ): Prisma.PurchaseInvoiceLineUncheckedCreateWithoutPurchaseInvoiceInput {
    return {
      lineNumber,
      itemName: line.itemName,
      description: line.description,
      quantity: this.toQuantity(line.quantity),
      unitPrice: this.toAmount(line.unitPrice),
      discountAmount: this.toAmount(line.discountAmount),
      taxAmount: this.toAmount(line.taxAmount),
      lineSubtotalAmount: this.toAmount(line.lineSubtotalAmount),
      lineTotalAmount: this.toAmount(line.lineTotalAmount),
      accountId: line.accountId,
    };
  }

  private purchaseInvoiceInclude() {
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
      sourcePurchaseOrder: {
        select: {
          id: true,
          reference: true,
          status: true,
          orderDate: true,
        },
      },
      journalEntry: {
        select: {
          id: true,
          reference: true,
        },
      },
      lines: {
        orderBy: { lineNumber: 'asc' },
        include: {
          account: {
            select: {
              id: true,
              code: true,
              name: true,
              type: true,
              currencyCode: true,
              isActive: true,
              isPosting: true,
            },
          },
        },
      },
    } satisfies Prisma.PurchaseInvoiceInclude;
  }

  private async getPurchaseInvoiceOrThrow(id: string) {
    const row = await this.prisma.purchaseInvoice.findUnique({ where: { id } });
    if (!row) {
      throw new BadRequestException(`Purchase invoice ${id} was not found.`);
    }
    return row;
  }

  private async ensurePurchaseOrderSource(id: string, supplierId: string) {
    const order = await this.prisma.purchaseOrder.findUnique({ where: { id } });
    if (!order) {
      throw new BadRequestException('Linked purchase order was not found.');
    }
    if (order.supplierId !== supplierId) {
      throw new BadRequestException('Linked purchase order must belong to the same supplier.');
    }
    if (
      order.status !== PurchaseOrderStatus.ISSUED &&
      order.status !== PurchaseOrderStatus.PARTIALLY_RECEIVED &&
      order.status !== PurchaseOrderStatus.FULLY_RECEIVED &&
      order.status !== PurchaseOrderStatus.CLOSED
    ) {
      throw new BadRequestException('Only issued or received purchase orders can be linked to purchase invoices.');
    }
    return order;
  }

  private async getPurchaseTaxAccountId() {
    const account = await this.prisma.account.findFirst({
      where: {
        isActive: true,
        isPosting: true,
        allowManualPosting: true,
        type: { in: ['ASSET', 'EXPENSE'] as any },
        OR: [
          { subtype: { contains: 'tax', mode: 'insensitive' } },
          { subtype: { contains: 'vat', mode: 'insensitive' } },
          { name: { contains: 'tax', mode: 'insensitive' } },
          { name: { contains: 'vat', mode: 'insensitive' } },
        ],
      },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });

    if (!account) {
      throw new BadRequestException('No active purchase tax/VAT account is configured for posting tax amounts.');
    }

    return account.id;
  }

  private mapPurchaseInvoice(row: PurchaseInvoiceWithRelations) {
    return {
      id: row.id,
      reference: row.reference,
      status: row.status,
      invoiceDate: row.invoiceDate.toISOString(),
      currencyCode: row.currencyCode,
      description: row.description,
      subtotalAmount: row.subtotalAmount.toString(),
      discountAmount: row.discountAmount.toString(),
      taxAmount: row.taxAmount.toString(),
      totalAmount: row.totalAmount.toString(),
      allocatedAmount: row.allocatedAmount.toString(),
      outstandingAmount: row.outstandingAmount.toString(),
      allocationStatus: row.allocationStatus,
      canEdit: row.status === PurchaseInvoiceStatus.DRAFT,
      canPost: row.status === PurchaseInvoiceStatus.DRAFT,
      canReverse:
        row.status === PurchaseInvoiceStatus.POSTED ||
        row.status === PurchaseInvoiceStatus.PARTIALLY_PAID ||
        row.status === PurchaseInvoiceStatus.FULLY_PAID,
      journalEntryId: row.journalEntryId ?? null,
      journalReference: row.journalEntry?.reference ?? null,
      postedAt: row.postedAt?.toISOString() ?? null,
      supplier: row.supplier,
      sourcePurchaseOrder: row.sourcePurchaseOrder
        ? {
            id: row.sourcePurchaseOrder.id,
            reference: row.sourcePurchaseOrder.reference,
            status: row.sourcePurchaseOrder.status,
            orderDate: row.sourcePurchaseOrder.orderDate.toISOString(),
          }
        : null,
      lines: row.lines.map((line) => ({
        id: line.id,
        lineNumber: line.lineNumber,
        itemName: line.itemName,
        description: line.description,
        quantity: line.quantity.toString(),
        unitPrice: line.unitPrice.toString(),
        discountAmount: line.discountAmount.toString(),
        taxAmount: line.taxAmount.toString(),
        lineSubtotalAmount: line.lineSubtotalAmount.toString(),
        lineTotalAmount: line.lineTotalAmount.toString(),
        account: line.account,
      })),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private parseStatus(status?: string): PurchaseInvoiceStatus | undefined {
    if (!status) {
      return undefined;
    }
    if (status in PurchaseInvoiceStatus) {
      return status as PurchaseInvoiceStatus;
    }
    throw new BadRequestException('Invalid purchase invoice status.');
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
