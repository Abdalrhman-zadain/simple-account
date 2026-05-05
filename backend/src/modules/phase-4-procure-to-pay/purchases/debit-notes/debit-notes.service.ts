import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { AllocationStatus, AuditAction, DebitNoteStatus, Prisma, PurchaseInvoiceStatus } from '../../../../generated/prisma';

import { PrismaService } from '../../../../common/prisma/prisma.service';
import { AuditService } from '../../../phase-1-accounting-foundation/accounting-core/audit/audit.service';
import { JournalEntriesService } from '../../../phase-1-accounting-foundation/accounting-core/journal-entries/journal-entries.service';
import { ReverseJournalEntryDto } from '../../../phase-1-accounting-foundation/accounting-core/journal-entries/dto/reverse-journal-entry.dto';
import { PostingService } from '../../../phase-1-accounting-foundation/accounting-core/posting-logic/posting.service';
import { ReversalService } from '../../../phase-1-accounting-foundation/accounting-core/reversal-control/reversal.service';
import { SuppliersService } from '../suppliers/suppliers.service';
import { CreateDebitNoteDto, DebitNoteLineDto, UpdateDebitNoteDto } from './dto/debit-notes.dto';

type DebitNoteListQuery = {
  status?: string;
  supplierId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
};

type ResolvedDebitNoteLine = {
  quantity: number;
  amount: number;
  taxId: string | null;
  taxAmount: number;
  reason: string;
  lineTotalAmount: number;
};

@Injectable()
export class DebitNotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly suppliersService: SuppliersService,
    private readonly journalEntriesService: JournalEntriesService,
    private readonly postingService: PostingService,
    private readonly reversalService: ReversalService,
    private readonly auditService: AuditService,
  ) {}

  async list(query: DebitNoteListQuery = {}) {
    const search = query.search?.trim();
    const rows = await this.prisma.debitNote.findMany({
      where: {
        supplierId: query.supplierId,
        status: this.parseStatus(query.status),
        noteDate: this.dateRangeFilter(query.dateFrom, query.dateTo),
        OR: search
          ? [
              { reference: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
              { supplier: { code: { contains: search, mode: 'insensitive' } } },
              { supplier: { name: { contains: search, mode: 'insensitive' } } },
              { purchaseInvoice: { reference: { contains: search, mode: 'insensitive' } } },
              { lines: { some: { reason: { contains: search, mode: 'insensitive' } } } },
            ]
          : undefined,
      },
      include: this.debitNoteInclude(),
      orderBy: [{ noteDate: 'desc' }, { createdAt: 'desc' }],
    });

    return rows.map((row) => this.mapDebitNote(row));
  }

  async getById(id: string) {
    const row = await this.prisma.debitNote.findUnique({
      where: { id },
      include: this.debitNoteInclude(),
    });
    if (!row) {
      throw new BadRequestException(`Debit note ${id} was not found.`);
    }
    return this.mapDebitNote(row);
  }

  async create(dto: CreateDebitNoteDto) {
    const supplier = await this.suppliersService.ensureActiveSupplier(dto.supplierId);
    await this.ensurePurchaseInvoice(dto.purchaseInvoiceId, supplier.id);

    const reference = dto.reference?.trim() || this.generateReference('DN');
    const currencyCode = dto.currencyCode?.trim().toUpperCase() || supplier.defaultCurrency;
    const lines = await this.resolveLines(dto.lines);
    const totals = this.computeTotals(lines);

    try {
      const created = await this.prisma.debitNote.create({
        data: {
          reference,
          noteDate: new Date(dto.noteDate),
          supplierId: supplier.id,
          purchaseInvoiceId: dto.purchaseInvoiceId || null,
          currencyCode,
          description: dto.description?.trim() || null,
          subtotalAmount: this.toAmount(totals.subtotalAmount),
          taxAmount: this.toAmount(totals.taxAmount),
          totalAmount: this.toAmount(totals.totalAmount),
          lines: {
            create: lines.map((line, index) => this.buildDebitNoteLineCreateInput(line, index + 1)),
          },
        },
        include: this.debitNoteInclude(),
      });

      await this.auditService.log({
        entity: 'DebitNote',
        entityId: created.id,
        action: AuditAction.CREATE,
        details: { status: created.status, reference: created.reference },
      });

      return this.mapDebitNote(created);
    } catch (error) {
      if (this.isUniqueConflict(error, 'reference')) {
        throw new ConflictException('A debit note with this reference already exists.');
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateDebitNoteDto) {
    const current = await this.getDebitNoteOrThrow(id);
    if (current.status !== DebitNoteStatus.DRAFT) {
      throw new BadRequestException('Posted debit notes are locked and cannot be edited.');
    }

    const nextSupplierId = dto.supplierId ?? current.supplierId;
    const supplier = await this.suppliersService.ensureActiveSupplier(nextSupplierId);
    const nextPurchaseInvoiceId =
      dto.purchaseInvoiceId === undefined ? current.purchaseInvoiceId ?? undefined : dto.purchaseInvoiceId || undefined;
    await this.ensurePurchaseInvoice(nextPurchaseInvoiceId, supplier.id);

    const lines = dto.lines ? await this.resolveLines(dto.lines) : null;
    const totals = lines ? this.computeTotals(lines) : null;

    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        if (lines) {
          await tx.debitNoteLine.deleteMany({ where: { debitNoteId: id } });
        }

        return tx.debitNote.update({
          where: { id },
          data: {
            reference: dto.reference?.trim(),
            noteDate: dto.noteDate ? new Date(dto.noteDate) : undefined,
            supplierId: nextSupplierId,
            purchaseInvoiceId: dto.purchaseInvoiceId === undefined ? undefined : dto.purchaseInvoiceId || null,
            currencyCode: dto.currencyCode?.trim().toUpperCase() || supplier.defaultCurrency,
            description: dto.description === undefined ? undefined : dto.description.trim() || null,
            subtotalAmount: totals ? this.toAmount(totals.subtotalAmount) : undefined,
            taxAmount: totals ? this.toAmount(totals.taxAmount) : undefined,
            totalAmount: totals ? this.toAmount(totals.totalAmount) : undefined,
            lines: lines
              ? {
                  create: lines.map((line, index) => this.buildDebitNoteLineCreateInput(line, index + 1)),
                }
              : undefined,
          },
          include: this.debitNoteInclude(),
        });
      });

      await this.auditService.log({
        entity: 'DebitNote',
        entityId: updated.id,
        action: AuditAction.UPDATE,
        details: { status: updated.status, reference: updated.reference },
      });

      return this.mapDebitNote(updated);
    } catch (error) {
      if (this.isUniqueConflict(error, 'reference')) {
        throw new ConflictException('A debit note with this reference already exists.');
      }
      throw error;
    }
  }

  async post(id: string) {
    const note = await this.prisma.debitNote.findUnique({
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
        purchaseInvoice: {
          select: {
            id: true,
            reference: true,
            supplierId: true,
            subtotalAmount: true,
            discountAmount: true,
            taxAmount: true,
            totalAmount: true,
            status: true,
            lines: {
              orderBy: { lineNumber: 'asc' },
              select: {
                accountId: true,
                lineSubtotalAmount: true,
                discountAmount: true,
              },
            },
          },
        },
      },
    });
    if (!note) {
      throw new BadRequestException(`Debit note ${id} was not found.`);
    }
    if (note.status !== DebitNoteStatus.DRAFT) {
      throw new BadRequestException('Only draft debit notes can be posted.');
    }
    if (!note.supplier.isActive) {
      throw new BadRequestException('Deactivated suppliers cannot be selected for new transactions.');
    }

    if (note.purchaseInvoice) {
      if (note.purchaseInvoice.status === PurchaseInvoiceStatus.CANCELLED) {
        throw new BadRequestException('Cancelled purchase invoices cannot be linked to posted debit notes.');
      }

      const postedCredits = await this.prisma.debitNote.aggregate({
        where: {
          purchaseInvoiceId: note.purchaseInvoiceId!,
          id: { not: id },
          status: { in: [DebitNoteStatus.POSTED, DebitNoteStatus.APPLIED] },
        },
        _sum: { totalAmount: true },
      });

      const remaining = Number(note.purchaseInvoice.totalAmount) - Number(postedCredits._sum.totalAmount ?? 0);
      if (Number(note.totalAmount) - Number(remaining.toFixed(2)) > 0.0001) {
        throw new BadRequestException('Debit note amount cannot exceed the remaining payable amount of the linked purchase invoice.');
      }
    }

    const description = note.description ? `${note.reference} - ${note.description}` : note.reference;
    const journal = await this.journalEntriesService.create({
      entryDate: note.noteDate.toISOString(),
      description,
      lines: [
        {
          accountId: note.supplier.payableAccountId,
          description,
          debitAmount: Number(note.totalAmount),
          creditAmount: 0,
        },
        ...(await this.buildOffsetJournalLines(note, description)),
      ],
    });
    const posted = await this.postingService.post(journal.id);
    const postedAt = posted.postedAt ? new Date(posted.postedAt) : new Date();

    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.debitNote.update({
        where: { id },
        data: {
          status: note.purchaseInvoiceId ? DebitNoteStatus.APPLIED : DebitNoteStatus.POSTED,
          journalEntryId: posted.id,
          postedAt,
        },
        include: this.debitNoteInclude(),
      });

      await tx.supplier.update({
        where: { id: note.supplierId },
        data: {
          currentBalance: {
            decrement: this.toAmount(Number(note.totalAmount)),
          },
        },
      });

      if (note.purchaseInvoiceId) {
        await this.recomputePurchaseInvoiceAmounts(tx, note.purchaseInvoiceId);
      }

      return next;
    });

    await this.auditService.log({
      entity: 'DebitNote',
      entityId: updated.id,
      action: AuditAction.POST,
      details: { status: updated.status, reference: updated.reference, journalEntryId: posted.id },
    });

    return this.mapDebitNote(updated);
  }

  async cancel(id: string) {
    const note = await this.prisma.debitNote.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!note) {
      throw new BadRequestException(`Debit note ${id} was not found.`);
    }
    if (note.status !== DebitNoteStatus.DRAFT) {
      throw new BadRequestException('Only draft debit notes can be cancelled.');
    }

    const updated = await this.prisma.debitNote.update({
      where: { id },
      data: { status: DebitNoteStatus.CANCELLED },
      include: this.debitNoteInclude(),
    });

    await this.auditService.log({
      entity: 'DebitNote',
      entityId: updated.id,
      action: AuditAction.DELETE,
      details: { status: updated.status, reference: updated.reference },
    });

    return this.mapDebitNote(updated);
  }

  async reverse(id: string, dto: ReverseJournalEntryDto) {
    const note = await this.prisma.debitNote.findUnique({
      where: { id },
      select: {
        id: true,
        reference: true,
        status: true,
        supplierId: true,
        purchaseInvoiceId: true,
        totalAmount: true,
        journalEntryId: true,
      },
    });
    if (!note) {
      throw new BadRequestException(`Debit note ${id} was not found.`);
    }
    if (note.status !== DebitNoteStatus.POSTED && note.status !== DebitNoteStatus.APPLIED) {
      throw new BadRequestException('Only posted debit notes can be reversed.');
    }
    if (!note.journalEntryId) {
      throw new BadRequestException('Debit note does not have a posted journal entry to reverse.');
    }

    await this.reversalService.reverse(note.journalEntryId, dto);

    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.debitNote.update({
        where: { id },
        data: { status: DebitNoteStatus.REVERSED },
        include: this.debitNoteInclude(),
      });

      await tx.supplier.update({
        where: { id: note.supplierId },
        data: {
          currentBalance: {
            increment: this.toAmount(Number(note.totalAmount)),
          },
        },
      });

      if (note.purchaseInvoiceId) {
        await this.recomputePurchaseInvoiceAmounts(tx, note.purchaseInvoiceId);
      }

      return next;
    });

    await this.auditService.log({
      entity: 'DebitNote',
      entityId: updated.id,
      action: AuditAction.REVERSE,
      details: { status: updated.status, reference: updated.reference, journalEntryId: note.journalEntryId },
    });

    return this.mapDebitNote(updated);
  }

  private async resolveLines(lines: DebitNoteLineDto[]) {
    const taxIds = Array.from(new Set(lines.map((line) => line.taxId?.trim()).filter(Boolean))) as string[];
    const taxes = taxIds.length
      ? await this.prisma.tax.findMany({ where: { id: { in: taxIds }, isActive: true }, select: { id: true, rate: true } })
      : [];
    const taxById = new Map(taxes.map((tax) => [tax.id, Number(tax.rate)]));

    return lines.map((line) => {
      const quantity = Number(line.quantity);
      const amount = Number(line.amount);
      const taxId = line.taxId?.trim() || null;
      if (taxId && !taxById.has(taxId)) {
        throw new BadRequestException('Each debit note line tax must reference an active tax.');
      }
      const taxAmount = taxId
        ? Number((amount * ((taxById.get(taxId) ?? 0) / 100)).toFixed(2))
        : Number(line.taxAmount ?? 0);
      const lineTotalAmount = Number((amount + taxAmount).toFixed(2));

      return {
        quantity,
        amount,
        taxId,
        taxAmount,
        reason: line.reason.trim(),
        lineTotalAmount,
      } satisfies ResolvedDebitNoteLine;
    });
  }

  private computeTotals(lines: ResolvedDebitNoteLine[]) {
    return lines.reduce(
      (totals, line) => ({
        subtotalAmount: Number((totals.subtotalAmount + line.amount).toFixed(2)),
        taxAmount: Number((totals.taxAmount + line.taxAmount).toFixed(2)),
        totalAmount: Number((totals.totalAmount + line.lineTotalAmount).toFixed(2)),
      }),
      { subtotalAmount: 0, taxAmount: 0, totalAmount: 0 },
    );
  }

  private buildDebitNoteLineCreateInput(
    line: ResolvedDebitNoteLine,
    lineNumber: number,
  ): Prisma.DebitNoteLineUncheckedCreateWithoutDebitNoteInput {
    return {
      lineNumber,
      quantity: this.toQuantity(line.quantity),
      amount: this.toAmount(line.amount),
      taxId: line.taxId,
      taxAmount: this.toAmount(line.taxAmount),
      reason: line.reason,
      lineTotalAmount: this.toAmount(line.lineTotalAmount),
    };
  }

  private async ensurePurchaseInvoice(purchaseInvoiceId: string | undefined, supplierId: string) {
    if (!purchaseInvoiceId) {
      return;
    }
    const invoice = await this.prisma.purchaseInvoice.findUnique({
      where: { id: purchaseInvoiceId },
      select: { id: true, supplierId: true, status: true },
    });
    if (!invoice) {
      throw new BadRequestException('Linked purchase invoice was not found.');
    }
    if (invoice.supplierId !== supplierId) {
      throw new BadRequestException('Debit notes and linked purchase invoices must use the same supplier.');
    }
    if (invoice.status === PurchaseInvoiceStatus.DRAFT || invoice.status === PurchaseInvoiceStatus.CANCELLED) {
      throw new BadRequestException('Only posted purchase invoices can be linked to debit notes.');
    }
  }

  private async buildOffsetJournalLines(
    note: {
      purchaseInvoice: {
        id: string;
        subtotalAmount: { toString(): string };
        discountAmount: { toString(): string };
        taxAmount: { toString(): string };
        lines: Array<{
          accountId: string;
          lineSubtotalAmount: { toString(): string };
          discountAmount: { toString(): string };
        }>;
      } | null;
      subtotalAmount: { toString(): string };
      taxAmount: { toString(): string };
    },
    description: string,
  ) {
    const subtotalAmount = Number(note.subtotalAmount);
    const taxAmount = Number(note.taxAmount);
    const lines: Array<{ accountId: string; description: string; debitAmount: number; creditAmount: number }> = [];

    if (note.purchaseInvoice) {
      const baseLines = note.purchaseInvoice.lines.map((line) => ({
        accountId: line.accountId,
        netAmount: Number((Number(line.lineSubtotalAmount) - Number(line.discountAmount)).toFixed(2)),
      }));
      const totalBase = baseLines.reduce((sum, line) => sum + line.netAmount, 0);

      if (subtotalAmount > 0) {
        if (totalBase <= 0) {
          throw new BadRequestException('Linked purchase invoice does not provide a valid account distribution for the debit note.');
        }
        baseLines.forEach((line, index) => {
          const amount =
            index === baseLines.length - 1
              ? Number((subtotalAmount - lines.reduce((sum, item) => sum + item.creditAmount, 0)).toFixed(2))
              : Number(((subtotalAmount * line.netAmount) / totalBase).toFixed(2));
          if (amount > 0) {
            lines.push({
              accountId: line.accountId,
              description,
              debitAmount: 0,
              creditAmount: amount,
            });
          }
        });
      }
    } else if (subtotalAmount > 0) {
      lines.push({
        accountId: await this.getStandaloneAdjustmentAccountId(),
        description,
        debitAmount: 0,
        creditAmount: subtotalAmount,
      });
    }

    if (taxAmount > 0) {
      lines.push({
        accountId: await this.getPurchaseTaxAccountId(),
        description: `${description} tax`,
        debitAmount: 0,
        creditAmount: taxAmount,
      });
    }

    return lines;
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

  private async getStandaloneAdjustmentAccountId() {
    const account = await this.prisma.account.findFirst({
      where: {
        isActive: true,
        isPosting: true,
        allowManualPosting: true,
        type: { in: ['EXPENSE', 'ASSET'] as any },
        OR: [
          { subtype: { contains: 'purchase', mode: 'insensitive' } },
          { subtype: { contains: 'adjust', mode: 'insensitive' } },
          { subtype: { contains: 'return', mode: 'insensitive' } },
          { name: { contains: 'purchase', mode: 'insensitive' } },
          { name: { contains: 'adjust', mode: 'insensitive' } },
          { name: { contains: 'return', mode: 'insensitive' } },
        ],
      },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });

    if (!account) {
      throw new BadRequestException(
        'Standalone debit note posting requires an active purchase adjustment account to be configured.',
      );
    }

    return account.id;
  }

  private async recomputePurchaseInvoiceAmounts(tx: Prisma.TransactionClient | PrismaService, invoiceId: string) {
    const invoice = await tx.purchaseInvoice.findUnique({
      where: { id: invoiceId },
      select: { id: true, totalAmount: true, status: true },
    });
    if (!invoice) {
      return;
    }

    const [allocations, debitNotes] = await Promise.all([
      tx.supplierPaymentAllocation.aggregate({
        where: {
          purchaseInvoiceId: invoiceId,
          supplierPayment: { status: { not: 'CANCELLED' as any } },
        },
        _sum: { amount: true },
      }),
      tx.debitNote.aggregate({
        where: {
          purchaseInvoiceId: invoiceId,
          status: { in: [DebitNoteStatus.POSTED, DebitNoteStatus.APPLIED] },
        },
        _sum: { totalAmount: true },
      }),
    ]);

    const credited = Number(debitNotes._sum.totalAmount ?? 0);
    const baseOutstanding = Math.max(0, Number((Number(invoice.totalAmount) - credited).toFixed(2)));
    const allocated = Number(allocations._sum.amount ?? 0);
    const outstanding = Math.max(0, Number((baseOutstanding - allocated).toFixed(2)));
    const allocationStatus: AllocationStatus =
      allocated <= 0 ? AllocationStatus.UNALLOCATED : outstanding <= 0 ? AllocationStatus.FULLY_ALLOCATED : AllocationStatus.PARTIAL;

    const nextStatus =
      invoice.status === PurchaseInvoiceStatus.DRAFT || invoice.status === PurchaseInvoiceStatus.CANCELLED
        ? invoice.status
        : outstanding <= 0
          ? PurchaseInvoiceStatus.FULLY_PAID
          : allocated > 0
            ? PurchaseInvoiceStatus.PARTIALLY_PAID
            : PurchaseInvoiceStatus.POSTED;

    await tx.purchaseInvoice.update({
      where: { id: invoiceId },
      data: {
        allocatedAmount: this.toAmount(allocated),
        outstandingAmount: this.toAmount(outstanding),
        allocationStatus,
        status: nextStatus,
      },
    });
  }

  private debitNoteInclude() {
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
      purchaseInvoice: {
        select: {
          id: true,
          reference: true,
          status: true,
          invoiceDate: true,
          totalAmount: true,
          allocatedAmount: true,
          outstandingAmount: true,
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
      },
    } satisfies Prisma.DebitNoteInclude;
  }

  private mapDebitNote(row: any) {
    return {
      id: row.id,
      reference: row.reference,
      status: row.status,
      noteDate: row.noteDate.toISOString(),
      currencyCode: row.currencyCode,
      description: row.description,
      subtotalAmount: row.subtotalAmount.toString(),
      taxAmount: row.taxAmount.toString(),
      totalAmount: row.totalAmount.toString(),
      postedAt: row.postedAt?.toISOString() ?? null,
      journalEntryId: row.journalEntryId ?? null,
      journalReference: row.journalEntry?.reference ?? null,
      canEdit: row.status === DebitNoteStatus.DRAFT,
      canPost: row.status === DebitNoteStatus.DRAFT,
      canCancel: row.status === DebitNoteStatus.DRAFT,
      canReverse: row.status === DebitNoteStatus.POSTED || row.status === DebitNoteStatus.APPLIED,
      supplier: row.supplier,
      purchaseInvoice: row.purchaseInvoice
        ? {
            id: row.purchaseInvoice.id,
            reference: row.purchaseInvoice.reference,
            status: row.purchaseInvoice.status,
            invoiceDate: row.purchaseInvoice.invoiceDate.toISOString(),
            totalAmount: row.purchaseInvoice.totalAmount.toString(),
            allocatedAmount: row.purchaseInvoice.allocatedAmount.toString(),
            outstandingAmount: row.purchaseInvoice.outstandingAmount.toString(),
          }
        : null,
      lines: row.lines.map((line: any) => ({
        id: line.id,
        lineNumber: line.lineNumber,
        quantity: line.quantity.toString(),
        amount: line.amount.toString(),
        taxId: line.taxId ?? null,
        taxAmount: line.taxAmount.toString(),
        reason: line.reason,
        lineTotalAmount: line.lineTotalAmount.toString(),
      })),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private async getDebitNoteOrThrow(id: string) {
    const row = await this.prisma.debitNote.findUnique({ where: { id } });
    if (!row) {
      throw new BadRequestException(`Debit note ${id} was not found.`);
    }
    return row;
  }

  private parseStatus(status?: string): DebitNoteStatus | undefined {
    if (!status) {
      return undefined;
    }
    if (status in DebitNoteStatus) {
      return status as DebitNoteStatus;
    }
    throw new BadRequestException('Invalid debit note status.');
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
