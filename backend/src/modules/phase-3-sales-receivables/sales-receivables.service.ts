import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { BankCashTransactionKind, BankCashTransactionStatus, Prisma, SalesDocumentStatus } from '../../generated/prisma';

import { PrismaService } from '../../common/prisma/prisma.service';
import { JournalEntriesService } from '../phase-1-accounting-foundation/accounting-core/journal-entries/journal-entries.service';
import { PostingService } from '../phase-1-accounting-foundation/accounting-core/posting-logic/posting.service';
import {
  AllocateReceiptDto,
  CreateCreditNoteDto,
  CreateCustomerDto,
  CreateSalesInvoiceDto,
  SalesLineDto,
  UpdateCreditNoteDto,
  UpdateCustomerDto,
  UpdateSalesInvoiceDto,
} from './dto/sales-receivables.dto';

type InvoiceQuery = {
  status?: SalesDocumentStatus;
  customerId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
};

type ResolvedLine = {
  description: string | null;
  revenueAccountId: string;
  quantity: number;
  unitPrice: number;
  lineAmount: number;
};

@Injectable()
export class SalesReceivablesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly journalEntriesService: JournalEntriesService,
    private readonly postingService: PostingService,
  ) {}

  async listCustomers(query: { isActive?: string; search?: string } = {}) {
    const search = query.search?.trim();
    return this.prisma.customer.findMany({
      where: {
        isActive: query.isActive === undefined || query.isActive === '' ? undefined : query.isActive === 'true',
        OR: search
          ? [
              { name: { contains: search, mode: 'insensitive' } },
              { code: { contains: search, mode: 'insensitive' } },
              { contactInfo: { contains: search, mode: 'insensitive' } },
            ]
          : undefined,
      },
      include: { receivableAccount: { select: this.accountSummarySelect() } },
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async createCustomer(dto: CreateCustomerDto) {
    await this.ensureReceivableAccount(dto.receivableAccountId);
    const code = dto.code?.trim() || this.generateReference('CUS');

    try {
      return await this.prisma.customer.create({
        data: {
          code,
          name: dto.name.trim(),
          contactInfo: dto.contactInfo?.trim() || null,
          paymentTerms: dto.paymentTerms?.trim() || null,
          creditLimit: this.toAmount(dto.creditLimit),
          receivableAccountId: dto.receivableAccountId,
        },
        include: { receivableAccount: { select: this.accountSummarySelect() } },
      });
    } catch (error) {
      if (this.isUniqueConflict(error, 'code')) {
        throw new ConflictException('A customer with this code already exists.');
      }
      throw error;
    }
  }

  async updateCustomer(id: string, dto: UpdateCustomerDto) {
    const current = await this.getCustomerOrThrow(id);
    if (!current.isActive) {
      throw new BadRequestException('Deactivated customers cannot be edited.');
    }
    if (dto.receivableAccountId) {
      await this.ensureReceivableAccount(dto.receivableAccountId);
    }

    return this.prisma.customer.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        contactInfo: dto.contactInfo === undefined ? undefined : dto.contactInfo.trim() || null,
        paymentTerms: dto.paymentTerms === undefined ? undefined : dto.paymentTerms.trim() || null,
        creditLimit: dto.creditLimit === undefined ? undefined : this.toAmount(dto.creditLimit),
        receivableAccountId: dto.receivableAccountId,
      },
      include: { receivableAccount: { select: this.accountSummarySelect() } },
    });
  }

  async deactivateCustomer(id: string) {
    await this.getCustomerOrThrow(id);
    return this.prisma.customer.update({
      where: { id },
      data: { isActive: false },
      include: { receivableAccount: { select: this.accountSummarySelect() } },
    });
  }

  async listInvoices(query: InvoiceQuery = {}) {
    const search = query.search?.trim();
    const rows = await this.prisma.salesInvoice.findMany({
      where: {
        status: query.status,
        customerId: query.customerId,
        invoiceDate:
          query.dateFrom || query.dateTo
            ? {
                gte: query.dateFrom ? new Date(query.dateFrom) : undefined,
                lte: query.dateTo ? new Date(query.dateTo) : undefined,
              }
            : undefined,
        OR: search
          ? [
              { reference: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
              { customer: { name: { contains: search, mode: 'insensitive' } } },
              { customer: { code: { contains: search, mode: 'insensitive' } } },
            ]
          : undefined,
      },
      include: {
        customer: { include: { receivableAccount: { select: this.accountSummarySelect() } } },
        lines: { include: { revenueAccount: { select: this.accountSummarySelect() } }, orderBy: { lineNumber: 'asc' } },
        journalEntry: { select: { id: true, reference: true } },
      },
      orderBy: [{ invoiceDate: 'desc' }, { createdAt: 'desc' }],
    });

    return rows.map((row) => this.mapInvoice(row));
  }

  async createInvoice(dto: CreateSalesInvoiceDto) {
    const customer = await this.ensureActiveCustomer(dto.customerId);
    const lines = await this.resolveAndValidateLines(dto.lines);
    const totalAmount = lines.reduce((sum, line) => sum + line.lineAmount, 0);

    const reference = dto.reference?.trim() || this.generateReference('INV');
    try {
      const created = await this.prisma.salesInvoice.create({
        data: {
          reference,
          invoiceDate: new Date(dto.invoiceDate),
          customerId: customer.id,
          description: dto.description?.trim() || null,
          totalAmount: this.toAmount(totalAmount),
          outstandingAmount: this.toAmount(totalAmount),
          lines: {
            create: lines.map((line, index) => ({
              lineNumber: index + 1,
              description: line.description,
              quantity: this.toQuantity(line.quantity),
              unitPrice: this.toAmount(line.unitPrice),
              lineAmount: this.toAmount(line.lineAmount),
              revenueAccountId: line.revenueAccountId,
            })),
          },
        },
        include: {
          customer: { include: { receivableAccount: { select: this.accountSummarySelect() } } },
          lines: { include: { revenueAccount: { select: this.accountSummarySelect() } }, orderBy: { lineNumber: 'asc' } },
          journalEntry: { select: { id: true, reference: true } },
        },
      });
      return this.mapInvoice(created);
    } catch (error) {
      if (this.isUniqueConflict(error, 'reference')) {
        throw new ConflictException('A sales invoice with this reference already exists.');
      }
      throw error;
    }
  }

  async updateInvoice(id: string, dto: UpdateSalesInvoiceDto) {
    const invoice = await this.getInvoiceOrThrow(id);
    if (invoice.status === SalesDocumentStatus.POSTED) {
      throw new BadRequestException('Posted invoices are locked and cannot be edited.');
    }

    const nextCustomerId = dto.customerId ?? invoice.customerId;
    await this.ensureActiveCustomer(nextCustomerId);

    const lines = dto.lines ? await this.resolveAndValidateLines(dto.lines) : null;
    const totalAmount = lines ? lines.reduce((sum, line) => sum + line.lineAmount, 0) : Number(invoice.totalAmount);

    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        if (lines) {
          await tx.salesInvoiceLine.deleteMany({ where: { salesInvoiceId: id } });
        }

        return tx.salesInvoice.update({
          where: { id },
          data: {
            reference: dto.reference?.trim(),
            invoiceDate: dto.invoiceDate ? new Date(dto.invoiceDate) : undefined,
            customerId: nextCustomerId,
            description: dto.description === undefined ? undefined : dto.description.trim() || null,
            totalAmount: this.toAmount(totalAmount),
            outstandingAmount: this.toAmount(totalAmount),
            lines: lines
              ? {
                  create: lines.map((line, index) => ({
                    lineNumber: index + 1,
                    description: line.description,
                    quantity: this.toQuantity(line.quantity),
                    unitPrice: this.toAmount(line.unitPrice),
                    lineAmount: this.toAmount(line.lineAmount),
                    revenueAccountId: line.revenueAccountId,
                  })),
                }
              : undefined,
          },
          include: {
            customer: { include: { receivableAccount: { select: this.accountSummarySelect() } } },
            lines: { include: { revenueAccount: { select: this.accountSummarySelect() } }, orderBy: { lineNumber: 'asc' } },
            journalEntry: { select: { id: true, reference: true } },
          },
        });
      });
      return this.mapInvoice(updated);
    } catch (error) {
      if (this.isUniqueConflict(error, 'reference')) {
        throw new ConflictException('A sales invoice with this reference already exists.');
      }
      throw error;
    }
  }

  async postInvoice(id: string) {
    const invoice = await this.prisma.salesInvoice.findUnique({
      where: { id },
      include: {
        customer: { include: { receivableAccount: true } },
        lines: { orderBy: { lineNumber: 'asc' } },
      },
    });
    if (!invoice) {
      throw new BadRequestException(`Sales invoice ${id} was not found.`);
    }
    if (invoice.status === SalesDocumentStatus.POSTED) {
      throw new BadRequestException('Sales invoice is already posted.');
    }
    if (!invoice.customer.isActive) {
      throw new BadRequestException('Deactivated customers cannot be selected for new transactions.');
    }

    const totalAmount = Number(invoice.totalAmount);
    if (Number(invoice.customer.creditLimit) > 0 && Number(invoice.customer.currentBalance) + totalAmount > Number(invoice.customer.creditLimit)) {
      throw new BadRequestException('Posting this invoice exceeds the customer credit limit.');
    }

    const description = invoice.description ? `${invoice.reference} - ${invoice.description}` : invoice.reference;

    const journal = await this.journalEntriesService.create({
      entryDate: invoice.invoiceDate.toISOString(),
      description,
      lines: [
        {
          accountId: invoice.customer.receivableAccountId,
          description,
          debitAmount: totalAmount,
          creditAmount: 0,
        },
        ...invoice.lines.map((line) => ({
          accountId: line.revenueAccountId,
          description: line.description ?? description,
          debitAmount: 0,
          creditAmount: Number(line.lineAmount),
        })),
      ],
    });
    const posted = await this.postingService.post(journal.id);
    const postedAt = posted.postedAt ? new Date(posted.postedAt) : new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.salesInvoice.update({
        where: { id: invoice.id },
        data: {
          status: SalesDocumentStatus.POSTED,
          journalEntryId: posted.id,
          postedAt,
        },
      });
      await tx.customer.update({
        where: { id: invoice.customerId },
        data: { currentBalance: { increment: this.toAmount(totalAmount) } },
      });
      await this.recomputeInvoiceAmounts(tx, invoice.id);
    });

    const updated = await this.getInvoiceOrThrow(id);
    return this.mapInvoice(updated);
  }

  async listCreditNotes(query: InvoiceQuery = {}) {
    const search = query.search?.trim();
    const rows = await this.prisma.creditNote.findMany({
      where: {
        status: query.status,
        customerId: query.customerId,
        noteDate:
          query.dateFrom || query.dateTo
            ? {
                gte: query.dateFrom ? new Date(query.dateFrom) : undefined,
                lte: query.dateTo ? new Date(query.dateTo) : undefined,
              }
            : undefined,
        OR: search
          ? [
              { reference: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
              { customer: { name: { contains: search, mode: 'insensitive' } } },
              { customer: { code: { contains: search, mode: 'insensitive' } } },
            ]
          : undefined,
      },
      include: {
        customer: { include: { receivableAccount: { select: this.accountSummarySelect() } } },
        salesInvoice: { select: { id: true, reference: true } },
        lines: { include: { revenueAccount: { select: this.accountSummarySelect() } }, orderBy: { lineNumber: 'asc' } },
        journalEntry: { select: { id: true, reference: true } },
      },
      orderBy: [{ noteDate: 'desc' }, { createdAt: 'desc' }],
    });

    return rows.map((row) => this.mapCreditNote(row));
  }

  async createCreditNote(dto: CreateCreditNoteDto) {
    await this.ensureActiveCustomer(dto.customerId);
    if (dto.salesInvoiceId) {
      const invoice = await this.prisma.salesInvoice.findUnique({ where: { id: dto.salesInvoiceId } });
      if (!invoice) {
        throw new BadRequestException('Linked invoice was not found.');
      }
      if (invoice.customerId !== dto.customerId) {
        throw new BadRequestException('Credit note and linked invoice must use the same customer.');
      }
    }

    const lines = await this.resolveAndValidateLines(dto.lines);
    const totalAmount = lines.reduce((sum, line) => sum + line.lineAmount, 0);
    const reference = dto.reference?.trim() || this.generateReference('CN');

    try {
      const created = await this.prisma.creditNote.create({
        data: {
          reference,
          noteDate: new Date(dto.noteDate),
          customerId: dto.customerId,
          salesInvoiceId: dto.salesInvoiceId,
          description: dto.description?.trim() || null,
          totalAmount: this.toAmount(totalAmount),
          lines: {
            create: lines.map((line, index) => ({
              lineNumber: index + 1,
              description: line.description,
              quantity: this.toQuantity(line.quantity),
              unitPrice: this.toAmount(line.unitPrice),
              lineAmount: this.toAmount(line.lineAmount),
              revenueAccountId: line.revenueAccountId,
            })),
          },
        },
        include: {
          customer: { include: { receivableAccount: { select: this.accountSummarySelect() } } },
          salesInvoice: { select: { id: true, reference: true } },
          lines: { include: { revenueAccount: { select: this.accountSummarySelect() } }, orderBy: { lineNumber: 'asc' } },
          journalEntry: { select: { id: true, reference: true } },
        },
      });
      return this.mapCreditNote(created);
    } catch (error) {
      if (this.isUniqueConflict(error, 'reference')) {
        throw new ConflictException('A credit note with this reference already exists.');
      }
      throw error;
    }
  }

  async updateCreditNote(id: string, dto: UpdateCreditNoteDto) {
    const note = await this.getCreditNoteOrThrow(id);
    if (note.status === SalesDocumentStatus.POSTED) {
      throw new BadRequestException('Posted credit notes are locked and cannot be edited.');
    }
    const nextCustomerId = dto.customerId ?? note.customerId;
    await this.ensureActiveCustomer(nextCustomerId);

    const nextSalesInvoiceId = dto.salesInvoiceId === undefined ? note.salesInvoiceId : dto.salesInvoiceId;
    if (nextSalesInvoiceId) {
      const invoice = await this.prisma.salesInvoice.findUnique({ where: { id: nextSalesInvoiceId } });
      if (!invoice) {
        throw new BadRequestException('Linked invoice was not found.');
      }
      if (invoice.customerId !== nextCustomerId) {
        throw new BadRequestException('Credit note and linked invoice must use the same customer.');
      }
    }

    const lines = dto.lines ? await this.resolveAndValidateLines(dto.lines) : null;
    const totalAmount = lines ? lines.reduce((sum, line) => sum + line.lineAmount, 0) : Number(note.totalAmount);
    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        if (lines) {
          await tx.creditNoteLine.deleteMany({ where: { creditNoteId: id } });
        }
        return tx.creditNote.update({
          where: { id },
          data: {
            reference: dto.reference?.trim(),
            noteDate: dto.noteDate ? new Date(dto.noteDate) : undefined,
            customerId: nextCustomerId,
            salesInvoiceId: nextSalesInvoiceId,
            description: dto.description === undefined ? undefined : dto.description.trim() || null,
            totalAmount: this.toAmount(totalAmount),
            lines: lines
              ? {
                  create: lines.map((line, index) => ({
                    lineNumber: index + 1,
                    description: line.description,
                    quantity: this.toQuantity(line.quantity),
                    unitPrice: this.toAmount(line.unitPrice),
                    lineAmount: this.toAmount(line.lineAmount),
                    revenueAccountId: line.revenueAccountId,
                  })),
                }
              : undefined,
          },
          include: {
            customer: { include: { receivableAccount: { select: this.accountSummarySelect() } } },
            salesInvoice: { select: { id: true, reference: true } },
            lines: { include: { revenueAccount: { select: this.accountSummarySelect() } }, orderBy: { lineNumber: 'asc' } },
            journalEntry: { select: { id: true, reference: true } },
          },
        });
      });
      return this.mapCreditNote(updated);
    } catch (error) {
      if (this.isUniqueConflict(error, 'reference')) {
        throw new ConflictException('A credit note with this reference already exists.');
      }
      throw error;
    }
  }

  async postCreditNote(id: string) {
    const note = await this.prisma.creditNote.findUnique({
      where: { id },
      include: {
        customer: { include: { receivableAccount: true } },
        lines: { orderBy: { lineNumber: 'asc' } },
      },
    });
    if (!note) {
      throw new BadRequestException(`Credit note ${id} was not found.`);
    }
    if (note.status === SalesDocumentStatus.POSTED) {
      throw new BadRequestException('Credit note is already posted.');
    }
    if (!note.customer.isActive) {
      throw new BadRequestException('Deactivated customers cannot be selected for new transactions.');
    }

    const totalAmount = Number(note.totalAmount);
    const description = note.description ? `${note.reference} - ${note.description}` : note.reference;

    const journal = await this.journalEntriesService.create({
      entryDate: note.noteDate.toISOString(),
      description,
      lines: [
        ...note.lines.map((line) => ({
          accountId: line.revenueAccountId,
          description: line.description ?? description,
          debitAmount: Number(line.lineAmount),
          creditAmount: 0,
        })),
        {
          accountId: note.customer.receivableAccountId,
          description,
          debitAmount: 0,
          creditAmount: totalAmount,
        },
      ],
    });
    const posted = await this.postingService.post(journal.id);
    const postedAt = posted.postedAt ? new Date(posted.postedAt) : new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.creditNote.update({
        where: { id: note.id },
        data: {
          status: SalesDocumentStatus.POSTED,
          journalEntryId: posted.id,
          postedAt,
        },
      });
      await tx.customer.update({
        where: { id: note.customerId },
        data: { currentBalance: { decrement: this.toAmount(totalAmount) } },
      });
      if (note.salesInvoiceId) {
        await this.recomputeInvoiceAmounts(tx, note.salesInvoiceId);
      }
    });

    const updated = await this.getCreditNoteOrThrow(id);
    return this.mapCreditNote(updated);
  }

  async allocateReceipt(dto: AllocateReceiptDto) {
    const invoice = await this.prisma.salesInvoice.findUnique({
      where: { id: dto.salesInvoiceId },
      include: {
        customer: { select: { id: true, name: true } },
      },
    });
    if (!invoice) {
      throw new BadRequestException('Sales invoice was not found.');
    }
    if (invoice.status !== SalesDocumentStatus.POSTED) {
      throw new BadRequestException('Receipt allocation is only allowed for posted invoices.');
    }

    const receipt = await this.prisma.bankCashTransaction.findUnique({
      where: { id: dto.receiptTransactionId },
    });
    if (!receipt) {
      throw new BadRequestException('Receipt transaction was not found.');
    }
    if (receipt.kind !== BankCashTransactionKind.RECEIPT || receipt.status !== BankCashTransactionStatus.POSTED) {
      throw new BadRequestException('Only posted receipt transactions can be allocated.');
    }

    const requestedAmount = Number(dto.amount.toFixed(2));
    const receiptAllocations = await this.prisma.receiptAllocation.findMany({
      where: { bankCashTransactionId: dto.receiptTransactionId },
      select: { amount: true },
    });
    const allocatedFromReceipt = receiptAllocations.reduce((sum, item) => sum + Number(item.amount), 0);
    const receiptAvailable = Number(receipt.amount) - allocatedFromReceipt;
    if (requestedAmount > Number(receiptAvailable.toFixed(2))) {
      throw new BadRequestException('Allocation amount exceeds available receipt balance.');
    }

    await this.recomputeInvoiceAmounts(this.prisma, invoice.id);
    const refreshedInvoice = await this.prisma.salesInvoice.findUnique({ where: { id: invoice.id } });
    if (!refreshedInvoice) {
      throw new BadRequestException('Sales invoice was not found.');
    }
    if (requestedAmount > Number(refreshedInvoice.outstandingAmount)) {
      throw new BadRequestException('Allocation amount exceeds invoice outstanding balance.');
    }

    const updatedAllocation = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.receiptAllocation.findUnique({
        where: {
          salesInvoiceId_bankCashTransactionId: {
            salesInvoiceId: invoice.id,
            bankCashTransactionId: dto.receiptTransactionId,
          },
        },
      });

      const allocation = existing
        ? await tx.receiptAllocation.update({
            where: { id: existing.id },
            data: {
              amount: this.toAmount(Number(existing.amount) + requestedAmount),
              allocatedAt: new Date(),
            },
          })
        : await tx.receiptAllocation.create({
            data: {
              salesInvoiceId: invoice.id,
              bankCashTransactionId: dto.receiptTransactionId,
              amount: this.toAmount(requestedAmount),
            },
          });

      const invoiceSummary = await this.recomputeInvoiceAmounts(tx, invoice.id);
      return { allocation, invoice: invoiceSummary };
    });

    return {
      allocation: {
        id: updatedAllocation.allocation.id,
        salesInvoiceId: updatedAllocation.allocation.salesInvoiceId,
        receiptTransactionId: updatedAllocation.allocation.bankCashTransactionId,
        amount: updatedAllocation.allocation.amount.toString(),
        allocatedAt: updatedAllocation.allocation.allocatedAt.toISOString(),
      },
      invoice: updatedAllocation.invoice,
    };
  }

  async getCustomerBalance(customerId: string) {
    const customer = await this.getCustomerOrThrow(customerId);
    const outstanding = await this.prisma.salesInvoice.aggregate({
      where: { customerId, status: SalesDocumentStatus.POSTED },
      _sum: { outstandingAmount: true },
    });
    const outstandingBalance = Number(outstanding._sum.outstandingAmount ?? 0);
    const currentBalance = Number(customer.currentBalance);
    const creditLimit = Number(customer.creditLimit);

    return {
      customerId: customer.id,
      customerCode: customer.code,
      customerName: customer.name,
      currentBalance: currentBalance.toFixed(2),
      outstandingBalance: outstandingBalance.toFixed(2),
      creditLimit: creditLimit.toFixed(2),
      availableCredit: (creditLimit - currentBalance).toFixed(2),
    };
  }

  async getCustomerTransactions(customerId: string) {
    await this.getCustomerOrThrow(customerId);

    const [invoices, creditNotes, allocations] = await Promise.all([
      this.prisma.salesInvoice.findMany({
        where: { customerId, status: SalesDocumentStatus.POSTED },
        select: {
          id: true,
          reference: true,
          invoiceDate: true,
          totalAmount: true,
          allocatedAmount: true,
          outstandingAmount: true,
          description: true,
        },
      }),
      this.prisma.creditNote.findMany({
        where: { customerId, status: SalesDocumentStatus.POSTED },
        select: {
          id: true,
          reference: true,
          noteDate: true,
          totalAmount: true,
          description: true,
          salesInvoiceId: true,
        },
      }),
      this.prisma.receiptAllocation.findMany({
        where: { salesInvoice: { customerId } },
        include: {
          salesInvoice: { select: { id: true, reference: true } },
          bankCashTransaction: { select: { id: true, reference: true, transactionDate: true } },
        },
      }),
    ]);

    return [
      ...invoices.map((item) => ({
        type: 'INVOICE',
        id: item.id,
        reference: item.reference,
        date: item.invoiceDate.toISOString(),
        amount: item.totalAmount.toString(),
        allocatedAmount: item.allocatedAmount.toString(),
        outstandingAmount: item.outstandingAmount.toString(),
        description: item.description,
      })),
      ...creditNotes.map((item) => ({
        type: 'CREDIT_NOTE',
        id: item.id,
        reference: item.reference,
        date: item.noteDate.toISOString(),
        amount: item.totalAmount.toString(),
        linkedInvoiceId: item.salesInvoiceId,
        description: item.description,
      })),
      ...allocations.map((item) => ({
        type: 'RECEIPT_ALLOCATION',
        id: item.id,
        reference: item.bankCashTransaction.reference,
        date: item.allocatedAt.toISOString(),
        amount: item.amount.toString(),
        salesInvoiceId: item.salesInvoice.id,
        salesInvoiceReference: item.salesInvoice.reference,
      })),
    ].sort((a, b) => (a.date < b.date ? 1 : -1));
  }

  async getAgingReport(asOfDate?: string) {
    const asOf = asOfDate ? new Date(asOfDate) : new Date();
    if (Number.isNaN(asOf.getTime())) {
      throw new BadRequestException('Invalid aging date.');
    }

    const invoices = await this.prisma.salesInvoice.findMany({
      where: {
        status: SalesDocumentStatus.POSTED,
        outstandingAmount: { gt: 0 },
        invoiceDate: { lte: asOf },
      },
      include: { customer: { select: { id: true, code: true, name: true } } },
      orderBy: [{ customerId: 'asc' }, { invoiceDate: 'asc' }],
    });

    const byCustomer = new Map<string, {
      customerId: string;
      customerCode: string;
      customerName: string;
      current: number;
      bucket31To60: number;
      bucket61To90: number;
      over90: number;
      total: number;
    }>();

    for (const invoice of invoices) {
      const days = Math.floor((asOf.getTime() - invoice.invoiceDate.getTime()) / (1000 * 60 * 60 * 24));
      const amount = Number(invoice.outstandingAmount);
      const currentRow =
        byCustomer.get(invoice.customerId) ??
        {
          customerId: invoice.customer.id,
          customerCode: invoice.customer.code,
          customerName: invoice.customer.name,
          current: 0,
          bucket31To60: 0,
          bucket61To90: 0,
          over90: 0,
          total: 0,
        };

      if (days <= 30) {
        currentRow.current += amount;
      } else if (days <= 60) {
        currentRow.bucket31To60 += amount;
      } else if (days <= 90) {
        currentRow.bucket61To90 += amount;
      } else {
        currentRow.over90 += amount;
      }
      currentRow.total += amount;
      byCustomer.set(invoice.customerId, currentRow);
    }

    const rows = [...byCustomer.values()].map((row) => ({
      ...row,
      current: row.current.toFixed(2),
      bucket31To60: row.bucket31To60.toFixed(2),
      bucket61To90: row.bucket61To90.toFixed(2),
      over90: row.over90.toFixed(2),
      total: row.total.toFixed(2),
    }));

    const totals = rows.reduce(
      (acc, row) => {
        acc.current += Number(row.current);
        acc.bucket31To60 += Number(row.bucket31To60);
        acc.bucket61To90 += Number(row.bucket61To90);
        acc.over90 += Number(row.over90);
        acc.total += Number(row.total);
        return acc;
      },
      { current: 0, bucket31To60: 0, bucket61To90: 0, over90: 0, total: 0 },
    );

    return {
      asOfDate: asOf.toISOString(),
      rows,
      totals: {
        current: totals.current.toFixed(2),
        bucket31To60: totals.bucket31To60.toFixed(2),
        bucket61To90: totals.bucket61To90.toFixed(2),
        over90: totals.over90.toFixed(2),
        total: totals.total.toFixed(2),
      },
    };
  }

  private async getCustomerOrThrow(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: { receivableAccount: { select: this.accountSummarySelect() } },
    });
    if (!customer) {
      throw new BadRequestException(`Customer ${id} was not found.`);
    }
    return customer;
  }

  private async ensureActiveCustomer(id: string) {
    const customer = await this.getCustomerOrThrow(id);
    if (!customer.isActive) {
      throw new BadRequestException('Deactivated customers cannot be selected for new transactions.');
    }
    return customer;
  }

  private async getInvoiceOrThrow(id: string) {
    const invoice = await this.prisma.salesInvoice.findUnique({
      where: { id },
      include: {
        customer: { include: { receivableAccount: { select: this.accountSummarySelect() } } },
        lines: { include: { revenueAccount: { select: this.accountSummarySelect() } }, orderBy: { lineNumber: 'asc' } },
        journalEntry: { select: { id: true, reference: true } },
      },
    });
    if (!invoice) {
      throw new BadRequestException(`Sales invoice ${id} was not found.`);
    }
    return invoice;
  }

  private async getCreditNoteOrThrow(id: string) {
    const note = await this.prisma.creditNote.findUnique({
      where: { id },
      include: {
        customer: { include: { receivableAccount: { select: this.accountSummarySelect() } } },
        salesInvoice: { select: { id: true, reference: true } },
        lines: { include: { revenueAccount: { select: this.accountSummarySelect() } }, orderBy: { lineNumber: 'asc' } },
        journalEntry: { select: { id: true, reference: true } },
      },
    });
    if (!note) {
      throw new BadRequestException(`Credit note ${id} was not found.`);
    }
    return note;
  }

  private async ensureReceivableAccount(accountId: string) {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      select: {
        id: true,
        name: true,
        type: true,
        isActive: true,
        isPosting: true,
        allowManualPosting: true,
      },
    });

    if (!account) {
      throw new BadRequestException(`Account ${accountId} was not found.`);
    }
    if (!account.isActive || !account.isPosting || !account.allowManualPosting) {
      throw new BadRequestException('Receivable account must be an active posting account that allows manual posting.');
    }
    if (account.type !== 'ASSET') {
      throw new BadRequestException('Receivable account must be an Asset account.');
    }
  }

  private async ensureRevenueAccount(accountId: string) {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      select: {
        id: true,
        type: true,
        isActive: true,
        isPosting: true,
        allowManualPosting: true,
      },
    });

    if (!account) {
      throw new BadRequestException(`Revenue account ${accountId} was not found.`);
    }
    if (!account.isActive || !account.isPosting || !account.allowManualPosting) {
      throw new BadRequestException('Revenue line account must be an active posting account.');
    }
    if (account.type !== 'REVENUE') {
      throw new BadRequestException('Sales lines must use revenue accounts.');
    }
  }

  private async resolveAndValidateLines(lines: SalesLineDto[]): Promise<ResolvedLine[]> {
    if (!lines.length) {
      throw new BadRequestException('At least one line is required.');
    }

    const resolved: ResolvedLine[] = [];
    for (const [index, rawLine] of lines.entries()) {
      await this.ensureRevenueAccount(rawLine.revenueAccountId);
      const quantity = rawLine.quantity ?? 1;
      const unitPrice = rawLine.unitPrice;
      const lineAmount = rawLine.lineAmount;

      if (quantity <= 0) {
        throw new BadRequestException(`Line ${index + 1} quantity must be greater than zero.`);
      }

      let finalLineAmount = lineAmount;
      let finalUnitPrice = unitPrice;

      if (finalLineAmount === undefined && finalUnitPrice === undefined) {
        throw new BadRequestException(`Line ${index + 1} requires unit price or line amount.`);
      }

      if (finalLineAmount === undefined) {
        finalLineAmount = Number((quantity * (finalUnitPrice as number)).toFixed(2));
      }

      if (finalUnitPrice === undefined) {
        finalUnitPrice = Number((finalLineAmount / quantity).toFixed(2));
      }

      if (finalLineAmount <= 0) {
        throw new BadRequestException(`Line ${index + 1} amount must be greater than zero.`);
      }

      resolved.push({
        description: rawLine.description?.trim() || null,
        revenueAccountId: rawLine.revenueAccountId,
        quantity: Number(quantity.toFixed(4)),
        unitPrice: Number(finalUnitPrice.toFixed(2)),
        lineAmount: Number(finalLineAmount.toFixed(2)),
      });
    }

    return resolved;
  }

  private async recomputeInvoiceAmounts(tx: Prisma.TransactionClient | PrismaService, invoiceId: string) {
    const invoice = await tx.salesInvoice.findUnique({
      where: { id: invoiceId },
      select: { id: true, totalAmount: true },
    });
    if (!invoice) {
      throw new BadRequestException(`Sales invoice ${invoiceId} was not found.`);
    }

    const [creditNotes, allocations] = await Promise.all([
      tx.creditNote.aggregate({
        where: { salesInvoiceId: invoiceId, status: SalesDocumentStatus.POSTED },
        _sum: { totalAmount: true },
      }),
      tx.receiptAllocation.aggregate({
        where: { salesInvoiceId: invoiceId },
        _sum: { amount: true },
      }),
    ]);

    const total = Number(invoice.totalAmount);
    const postedCredits = Number(creditNotes._sum.totalAmount ?? 0);
    const allocated = Number(allocations._sum.amount ?? 0);
    const baseOutstanding = Math.max(0, Number((total - postedCredits).toFixed(2)));
    const outstanding = Math.max(0, Number((baseOutstanding - allocated).toFixed(2)));
    const status =
      allocated <= 0 ? 'UNALLOCATED' : outstanding <= 0 ? 'FULLY_ALLOCATED' : 'PARTIAL';

    const updated = await tx.salesInvoice.update({
      where: { id: invoiceId },
      data: {
        allocatedAmount: this.toAmount(allocated),
        outstandingAmount: this.toAmount(outstanding),
        allocationStatus: status,
      },
      select: {
        id: true,
        reference: true,
        totalAmount: true,
        allocatedAmount: true,
        outstandingAmount: true,
        allocationStatus: true,
      },
    });

    return {
      id: updated.id,
      reference: updated.reference,
      totalAmount: updated.totalAmount.toString(),
      allocatedAmount: updated.allocatedAmount.toString(),
      outstandingAmount: updated.outstandingAmount.toString(),
      allocationStatus: updated.allocationStatus,
    };
  }

  private mapInvoice(row: Awaited<ReturnType<SalesReceivablesService['getInvoiceOrThrow']>>) {
    return {
      id: row.id,
      reference: row.reference,
      status: row.status,
      invoiceDate: row.invoiceDate.toISOString(),
      description: row.description,
      totalAmount: row.totalAmount.toString(),
      allocatedAmount: row.allocatedAmount.toString(),
      outstandingAmount: row.outstandingAmount.toString(),
      allocationStatus: row.allocationStatus,
      postedAt: row.postedAt?.toISOString() ?? null,
      journalEntryId: row.journalEntryId,
      journalReference: row.journalEntry?.reference ?? null,
      customer: {
        id: row.customer.id,
        code: row.customer.code,
        name: row.customer.name,
        isActive: row.customer.isActive,
        paymentTerms: row.customer.paymentTerms,
        creditLimit: row.customer.creditLimit.toString(),
        currentBalance: row.customer.currentBalance.toString(),
        receivableAccount: row.customer.receivableAccount,
      },
      lines: row.lines.map((line) => ({
        id: line.id,
        lineNumber: line.lineNumber,
        description: line.description,
        quantity: line.quantity.toString(),
        unitPrice: line.unitPrice.toString(),
        lineAmount: line.lineAmount.toString(),
        revenueAccount: line.revenueAccount,
      })),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private mapCreditNote(row: Awaited<ReturnType<SalesReceivablesService['getCreditNoteOrThrow']>>) {
    return {
      id: row.id,
      reference: row.reference,
      status: row.status,
      noteDate: row.noteDate.toISOString(),
      description: row.description,
      totalAmount: row.totalAmount.toString(),
      postedAt: row.postedAt?.toISOString() ?? null,
      journalEntryId: row.journalEntryId,
      journalReference: row.journalEntry?.reference ?? null,
      linkedInvoice: row.salesInvoice ?? null,
      customer: {
        id: row.customer.id,
        code: row.customer.code,
        name: row.customer.name,
        isActive: row.customer.isActive,
        paymentTerms: row.customer.paymentTerms,
        creditLimit: row.customer.creditLimit.toString(),
        currentBalance: row.customer.currentBalance.toString(),
        receivableAccount: row.customer.receivableAccount,
      },
      lines: row.lines.map((line) => ({
        id: line.id,
        lineNumber: line.lineNumber,
        description: line.description,
        quantity: line.quantity.toString(),
        unitPrice: line.unitPrice.toString(),
        lineAmount: line.lineAmount.toString(),
        revenueAccount: line.revenueAccount,
      })),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private accountSummarySelect() {
    return {
      id: true,
      code: true,
      name: true,
      type: true,
      currencyCode: true,
      isActive: true,
      isPosting: true,
    };
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

