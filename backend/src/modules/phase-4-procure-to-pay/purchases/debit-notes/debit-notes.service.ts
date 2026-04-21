import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { AllocationStatus, DebitNoteStatus, Prisma, PurchaseInvoiceStatus } from '../../../../generated/prisma';

import { PrismaService } from '../../../../common/prisma/prisma.service';
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
  taxAmount: number;
  reason: string;
  lineTotalAmount: number;
};

@Injectable()
export class DebitNotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly suppliersService: SuppliersService,
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
    const lines = this.resolveLines(dto.lines);
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

    const lines = dto.lines ? this.resolveLines(dto.lines) : null;
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
            isActive: true,
          },
        },
        purchaseInvoice: {
          select: {
            id: true,
            reference: true,
            supplierId: true,
            totalAmount: true,
            status: true,
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

    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.debitNote.update({
        where: { id },
        data: {
          status: note.purchaseInvoiceId ? DebitNoteStatus.APPLIED : DebitNoteStatus.POSTED,
          postedAt: new Date(),
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

    return this.mapDebitNote(updated);
  }

  private resolveLines(lines: DebitNoteLineDto[]) {
    return lines.map((line) => {
      const quantity = Number(line.quantity);
      const amount = Number(line.amount);
      const taxAmount = Number(line.taxAmount ?? 0);
      const lineTotalAmount = Number((amount + taxAmount).toFixed(2));

      return {
        quantity,
        amount,
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
    if (invoice.status === PurchaseInvoiceStatus.CANCELLED) {
      throw new BadRequestException('Cancelled purchase invoices cannot be linked to debit notes.');
    }
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
