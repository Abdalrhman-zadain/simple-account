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
  itemId: string | null;
  itemName: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  taxId: string | null;
  taxAmount: number;
  lineSubtotalAmount: number;
  lineTotalAmount: number;
  accountId: string;
};

type PurchaseInvoiceDebitAccount = {
  id: string;
  type: string;
  subtype: string | null;
  isPosting: boolean;
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
        item: {
          select: {
            id: true;
            code: true;
            name: true;
            unitOfMeasure: true;
          };
        };
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

type LinkedSourceRequest = {
  id: string;
  reference: string;
  status: string;
  requestDate: Date;
};

type InvoiceSourceRequestRow = {
  purchaseInvoiceId: string;
  requestId: string;
  reference: string;
  status: string;
  requestDate: Date;
};

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
    const matchingInvoiceIds = search
      ? (
          await this.prisma.$queryRaw<Array<{ id: string }>>(
            Prisma.sql`
              SELECT i."id"
              FROM "PurchaseInvoice" i
              INNER JOIN "PurchaseRequest" r ON r."id" = i."sourcePurchaseRequestId"
              WHERE r."reference" ILIKE ${`%${search}%`}
            `,
          )
        ).map((row) => row.id)
      : [];
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
              ...(matchingInvoiceIds.length
                ? [{ id: { in: matchingInvoiceIds } }]
                : []),
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

    return this.enrichAndMapPurchaseInvoices(rows);
  }

  async getById(id: string) {
    const row = await this.prisma.purchaseInvoice.findUnique({
      where: { id },
      include: this.purchaseInvoiceInclude(),
    });
    if (!row) {
      throw new BadRequestException(`Purchase invoice ${id} was not found.`);
    }
    const [mapped] = await this.enrichAndMapPurchaseInvoices([row]);
    return mapped;
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
    if (dto.sourcePurchaseRequestId) {
      await this.ensurePurchaseRequestSource(dto.sourcePurchaseRequestId);
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

      if (dto.sourcePurchaseRequestId) {
        await this.setInvoiceSourcePurchaseRequest(created.id, dto.sourcePurchaseRequestId);
      }

      await this.auditService.log({
        entity: 'PurchaseInvoice',
        entityId: created.id,
        action: AuditAction.CREATE,
        details: { status: created.status, reference: created.reference },
      });

      const [mapped] = await this.enrichAndMapPurchaseInvoices([created]);
      return mapped;
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
    const currentSourcePurchaseRequestId = await this.getInvoiceSourcePurchaseRequestId(id);
    const nextSourcePurchaseRequestId =
      dto.sourcePurchaseRequestId === undefined ? currentSourcePurchaseRequestId ?? undefined : dto.sourcePurchaseRequestId || undefined;

    if (nextSourcePurchaseOrderId) {
      await this.ensurePurchaseOrderSource(nextSourcePurchaseOrderId, supplier.id);
    }
    if (nextSourcePurchaseRequestId) {
      await this.ensurePurchaseRequestSource(nextSourcePurchaseRequestId);
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

      if (dto.sourcePurchaseRequestId !== undefined) {
        await this.setInvoiceSourcePurchaseRequest(id, dto.sourcePurchaseRequestId || null);
      }

      await this.auditService.log({
        entity: 'PurchaseInvoice',
        entityId: updated.id,
        action: AuditAction.UPDATE,
        details: { status: updated.status, reference: updated.reference },
      });

      const [mapped] = await this.enrichAndMapPurchaseInvoices([updated]);
      return mapped;
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
    const journalLines = await this.buildPurchaseInvoiceJournalLines(invoice, description);

    const journal = await this.journalEntriesService.create({
      entryDate: invoice.invoiceDate.toISOString(),
      description,
      lines: journalLines,
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

    const [mapped] = await this.enrichAndMapPurchaseInvoices([updated]);
    return mapped;
  }

  private async buildPurchaseInvoiceJournalLines(
    invoice: {
      reference: string;
      supplier: { payableAccountId: string };
      lines: Array<{
        accountId: string;
        taxId: string | null;
        taxAmount: Prisma.Decimal | number;
        discountAmount: Prisma.Decimal | number;
        lineSubtotalAmount: Prisma.Decimal | number;
        description: string | null;
      }>;
      totalAmount: Prisma.Decimal | number;
    },
    description: string,
  ) {
    const debitLines = invoice.lines
      .map((line) => ({
        accountId: line.accountId,
        description: line.description || description,
        debitAmount: Number(
          (Number(line.lineSubtotalAmount) - Number(line.discountAmount)).toFixed(2),
        ),
        creditAmount: 0,
      }))
      .filter((line) => line.debitAmount > 0);

    const taxIds = Array.from(
      new Set(invoice.lines.map((line) => line.taxId).filter(Boolean)),
    ) as string[];
    const taxes = taxIds.length
      ? await this.prisma.tax.findMany({
          where: { id: { in: taxIds }, isActive: true },
          select: {
            id: true,
            taxAccountId: true,
            taxAccount: {
              select: {
                id: true,
                isActive: true,
                isPosting: true,
                allowManualPosting: true,
              },
            },
          },
        })
      : [];
    const taxMap = new Map(taxes.map((tax) => [tax.id, tax]));
    const taxByAccount = new Map<string, number>();

    for (const line of invoice.lines) {
      const taxAmount = Number(line.taxAmount);
      if (taxAmount <= 0) {
        continue;
      }

      let taxAccountId: string | null = null;
      if (line.taxId) {
        const tax = taxMap.get(line.taxId);
        if (tax?.taxAccountId && tax.taxAccount?.isActive && tax.taxAccount.isPosting && tax.taxAccount.allowManualPosting) {
          taxAccountId = tax.taxAccountId;
        }
      }

      if (!taxAccountId) {
        taxAccountId = await this.getPurchaseTaxAccountId();
      }

      const current = taxByAccount.get(taxAccountId) ?? 0;
      taxByAccount.set(
        taxAccountId,
        Number((current + taxAmount).toFixed(2)),
      );
    }

    return [
      ...debitLines,
      ...Array.from(taxByAccount.entries()).map(([accountId, amount]) => ({
        accountId,
        description: `${description} tax`,
        debitAmount: Number(amount.toFixed(2)),
        creditAmount: 0,
      })),
      {
        accountId: invoice.supplier.payableAccountId,
        description,
        debitAmount: 0,
        creditAmount: Number(Number(invoice.totalAmount).toFixed(2)),
      },
    ];
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

    const [mapped] = await this.enrichAndMapPurchaseInvoices([updated]);
    return mapped;
  }

  private async resolveLines(lines: PurchaseInvoiceLineDto[]) {
    const accountIds = Array.from(new Set(lines.map((line) => line.accountId)));
    const itemIds = Array.from(new Set(lines.map((line) => line.itemId).filter(Boolean))) as string[];
    const taxIds = Array.from(new Set(lines.map((line) => line.taxId?.trim()).filter(Boolean))) as string[];
    const [accounts, items, taxes] = await Promise.all([
      this.prisma.account.findMany({
        where: { id: { in: accountIds }, isActive: true, isPosting: true },
        select: { id: true, type: true, subtype: true, isPosting: true },
      }),
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
    const validAccountIds = new Set(
      accounts
        .filter((account) => this.isPurchaseInvoiceDebitAccount(account))
        .map((account) => account.id),
    );
    const validItems = new Map(items.map((item) => [item.id, item]));
    const taxById = new Map(taxes.map((tax) => [tax.id, Number(tax.rate)]));

    return lines.map((line) => {
      if (!validAccountIds.has(line.accountId)) {
        throw new BadRequestException('Each purchase invoice line must use an active posting inventory, fixed asset, or expense account.');
      }
      const itemId = line.itemId?.trim() || null;
      const item = itemId ? validItems.get(itemId) : null;
      if (itemId && !item) {
        throw new BadRequestException('Each linked purchase invoice item must reference an active inventory item.');
      }

      const quantity = Number(line.quantity);
      const unitPrice = Number(line.unitPrice);
      const discountAmount = Number(line.discountAmount ?? 0);
      const taxId = line.taxId?.trim() || null;
      if (taxId && !taxById.has(taxId)) {
        throw new BadRequestException('Each purchase invoice line tax must reference an active tax.');
      }
      const lineSubtotalAmount = Number((quantity * unitPrice).toFixed(2));
      const discountedAmount = Number((lineSubtotalAmount - discountAmount).toFixed(2));
      const taxAmount = taxId
        ? Number((discountedAmount * ((taxById.get(taxId) ?? 0) / 100)).toFixed(2))
        : Number(line.taxAmount ?? 0);
      const lineTotalAmount = Number((lineSubtotalAmount - discountAmount + taxAmount).toFixed(2));

      if (lineTotalAmount < 0) {
        throw new BadRequestException('Discounts cannot exceed the subtotal of a purchase invoice line.');
      }

      return {
        itemId,
        itemName: line.itemName?.trim() || item?.name || null,
        description: line.description.trim(),
        quantity,
        unitPrice,
        discountAmount,
        taxId,
        taxAmount,
        lineSubtotalAmount,
        lineTotalAmount,
        accountId: line.accountId,
      } satisfies ResolvedInvoiceLine;
    });
  }

  private isPurchaseInvoiceDebitAccount(account: PurchaseInvoiceDebitAccount) {
    if (!account.isPosting) return false;
    if (account.type === 'EXPENSE') return true;
    if (account.type !== 'ASSET') return false;
    return account.subtype === 'Inventory' || account.subtype === 'FixedAsset';
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
      itemId: line.itemId,
      itemName: line.itemName,
      description: line.description,
      quantity: this.toQuantity(line.quantity),
      unitPrice: this.toAmount(line.unitPrice),
      discountAmount: this.toAmount(line.discountAmount),
      taxId: line.taxId,
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
          item: {
            select: {
              id: true,
              code: true,
              name: true,
              unitOfMeasure: true,
            },
          },
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

  private async ensurePurchaseRequestSource(id: string) {
    const request = await this.prisma.purchaseRequest.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
      },
    });

    if (!request) {
      throw new BadRequestException('Linked purchase request was not found.');
    }
    if (request.status !== 'APPROVED') {
      throw new BadRequestException('Linked purchase request must be approved before use in a purchase invoice.');
    }

    return request;
  }

  private async getInvoiceSourcePurchaseRequestId(invoiceId: string) {
    const rows = await this.prisma.$queryRaw<Array<{ sourcePurchaseRequestId: string | null }>>(
      Prisma.sql`
        SELECT "sourcePurchaseRequestId"
        FROM "PurchaseInvoice"
        WHERE "id" = ${invoiceId}
        LIMIT 1
      `,
    );
    return rows[0]?.sourcePurchaseRequestId ?? null;
  }

  private async setInvoiceSourcePurchaseRequest(invoiceId: string, purchaseRequestId: string | null) {
    await this.prisma.$executeRaw(
      Prisma.sql`
        UPDATE "PurchaseInvoice"
        SET "sourcePurchaseRequestId" = ${purchaseRequestId}
        WHERE "id" = ${invoiceId}
      `,
    );
  }

  private async enrichAndMapPurchaseInvoices(rows: PurchaseInvoiceWithRelations[]) {
    const invoiceIds = rows.map((row) => row.id);
    const sourceRequestRows = invoiceIds.length
      ? await this.prisma.$queryRaw<InvoiceSourceRequestRow[]>(
          Prisma.sql`
            SELECT
              i."id" AS "purchaseInvoiceId",
              r."id" AS "requestId",
              r."reference",
              r."status",
              r."requestDate"
            FROM "PurchaseInvoice" i
            INNER JOIN "PurchaseRequest" r ON r."id" = i."sourcePurchaseRequestId"
            WHERE i."id" IN (${Prisma.join(invoiceIds)})
          `,
        )
      : [];

    const requestsByInvoiceId = new Map<string, LinkedSourceRequest>(
      sourceRequestRows.map((row) => [
        row.purchaseInvoiceId,
        {
          id: row.requestId,
          reference: row.reference,
          status: row.status,
          requestDate: row.requestDate,
        },
      ]),
    );

    return rows.map((row) => this.mapPurchaseInvoice(row, requestsByInvoiceId.get(row.id)));
  }

  private mapPurchaseInvoice(row: PurchaseInvoiceWithRelations, sourcePurchaseRequest?: LinkedSourceRequest) {
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
      sourcePurchaseRequest: sourcePurchaseRequest
        ? {
            id: sourcePurchaseRequest.id,
            reference: sourcePurchaseRequest.reference,
            status: sourcePurchaseRequest.status,
            requestDate: sourcePurchaseRequest.requestDate.toISOString(),
          }
        : null,
      lines: row.lines.map((line) => ({
        id: line.id,
        lineNumber: line.lineNumber,
        itemId: line.itemId,
        item: line.item,
        itemName: line.itemName,
        description: line.description,
        quantity: line.quantity.toString(),
        unitPrice: line.unitPrice.toString(),
        discountAmount: line.discountAmount.toString(),
        taxId: line.taxId ?? null,
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
