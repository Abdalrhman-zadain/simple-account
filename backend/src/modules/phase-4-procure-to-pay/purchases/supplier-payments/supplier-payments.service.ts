import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { AllocationStatus, BankCashTransactionStatus, DebitNoteStatus, Prisma, SupplierPaymentStatus } from '../../../../generated/prisma';

import { PrismaService } from '../../../../common/prisma/prisma.service';
import { BankCashTransactionsService } from '../../../phase-2-bank-cash-management/bank-cash-transactions/bank-cash-transactions.service';
import { SuppliersService } from '../suppliers/suppliers.service';
import {
  CreateSupplierPaymentDto,
  SupplierPaymentAllocationDto,
  UpdateSupplierPaymentDto,
} from './dto/supplier-payments.dto';

type SupplierPaymentListQuery = {
  status?: string;
  supplierId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
};

type ResolvedAllocation = {
  purchaseInvoiceId: string;
  amount: number;
};

type SupplierPaymentWithRelations = Prisma.SupplierPaymentGetPayload<{
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
    bankCashAccount: {
      include: {
        account: {
          select: {
            id: true;
            code: true;
            name: true;
            currencyCode: true;
          };
        };
      };
    };
    bankCashTransaction: {
      select: {
        id: true;
        reference: true;
        status: true;
        transactionDate: true;
        postedAt: true;
      };
    };
    allocations: {
      include: {
        purchaseInvoice: {
          select: {
            id: true;
            reference: true;
            status: true;
            invoiceDate: true;
            totalAmount: true;
            allocatedAmount: true;
            outstandingAmount: true;
          };
        };
      };
    };
  };
}>;

@Injectable()
export class SupplierPaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly suppliersService: SuppliersService,
    private readonly bankCashTransactionsService: BankCashTransactionsService,
  ) {}

  async list(query: SupplierPaymentListQuery = {}) {
    const search = query.search?.trim();
    const rows = await this.prisma.supplierPayment.findMany({
      where: {
        supplierId: query.supplierId,
        status: this.parseStatus(query.status),
        paymentDate: this.dateRangeFilter(query.dateFrom, query.dateTo),
        OR: search
          ? [
              { reference: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
              { supplier: { code: { contains: search, mode: 'insensitive' } } },
              { supplier: { name: { contains: search, mode: 'insensitive' } } },
              { allocations: { some: { purchaseInvoice: { reference: { contains: search, mode: 'insensitive' } } } } },
            ]
          : undefined,
      },
      include: this.supplierPaymentInclude(),
      orderBy: [{ paymentDate: 'desc' }, { createdAt: 'desc' }],
    });

    return rows.map((row) => this.mapSupplierPayment(row));
  }

  async getById(id: string) {
    const row = await this.prisma.supplierPayment.findUnique({
      where: { id },
      include: this.supplierPaymentInclude(),
    });
    if (!row) {
      throw new BadRequestException(`Supplier payment ${id} was not found.`);
    }
    return this.mapSupplierPayment(row);
  }

  async create(dto: CreateSupplierPaymentDto) {
    const supplier = await this.suppliersService.ensureActiveSupplier(dto.supplierId);
    await this.ensureBankCashAccount(dto.bankCashAccountId, supplier.payableAccountId);
    const reference = dto.reference?.trim() || this.generateReference('SPAY');
    const allocations = await this.resolveAllocations(dto.allocations ?? [], supplier.id);
    const allocatedAmount = allocations.reduce((sum, item) => sum + item.amount, 0);
    const unappliedAmount = Number((dto.amount - allocatedAmount).toFixed(2));

    if (allocatedAmount - dto.amount > 0.0001) {
      throw new BadRequestException('Allocated amount cannot exceed the supplier payment amount.');
    }

    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const payment = await tx.supplierPayment.create({
          data: {
            reference,
            paymentDate: new Date(dto.paymentDate),
            supplierId: supplier.id,
            amount: this.toAmount(dto.amount),
            allocatedAmount: this.toAmount(allocatedAmount),
            unappliedAmount: this.toAmount(unappliedAmount),
            bankCashAccountId: dto.bankCashAccountId,
            description: dto.description?.trim() || null,
            allocations: {
              create: allocations.map((allocation) => ({
                purchaseInvoiceId: allocation.purchaseInvoiceId,
                amount: this.toAmount(allocation.amount),
              })),
            },
          },
          include: this.supplierPaymentInclude(),
        });

        await this.recomputePurchaseInvoices(tx, allocations.map((item) => item.purchaseInvoiceId));
        return payment;
      });

      return this.mapSupplierPayment(created);
    } catch (error) {
      if (this.isUniqueConflict(error, 'reference')) {
        throw new ConflictException('A supplier payment with this reference already exists.');
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateSupplierPaymentDto) {
    const current = await this.getSupplierPaymentOrThrow(id);
    if (current.status !== SupplierPaymentStatus.DRAFT) {
      throw new BadRequestException('Only draft supplier payments can be edited.');
    }

    const nextSupplierId = dto.supplierId ?? current.supplierId;
    const supplier = await this.suppliersService.ensureActiveSupplier(nextSupplierId);
    const nextBankCashAccountId = dto.bankCashAccountId ?? current.bankCashAccountId;
    await this.ensureBankCashAccount(nextBankCashAccountId, supplier.payableAccountId);

    const nextAmount = dto.amount ?? Number(current.amount);
    const allocations = dto.allocations
      ? await this.resolveAllocations(dto.allocations, supplier.id, current.id)
      : await this.getCurrentResolvedAllocations(current.id);
    const allocatedAmount = allocations.reduce((sum, item) => sum + item.amount, 0);
    const unappliedAmount = Number((nextAmount - allocatedAmount).toFixed(2));

    if (allocatedAmount - nextAmount > 0.0001) {
      throw new BadRequestException('Allocated amount cannot exceed the supplier payment amount.');
    }

    const previousAllocationIds = await this.prisma.supplierPaymentAllocation.findMany({
      where: { supplierPaymentId: id },
      select: { purchaseInvoiceId: true },
    });

    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        if (dto.allocations) {
          await tx.supplierPaymentAllocation.deleteMany({ where: { supplierPaymentId: id } });
        }

        const payment = await tx.supplierPayment.update({
          where: { id },
          data: {
            reference: dto.reference?.trim(),
            paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : undefined,
            supplierId: nextSupplierId,
            amount: dto.amount === undefined ? undefined : this.toAmount(dto.amount),
            allocatedAmount: this.toAmount(allocatedAmount),
            unappliedAmount: this.toAmount(unappliedAmount),
            bankCashAccountId: nextBankCashAccountId,
            description: dto.description === undefined ? undefined : dto.description.trim() || null,
            allocations: dto.allocations
              ? {
                  create: allocations.map((allocation) => ({
                    purchaseInvoiceId: allocation.purchaseInvoiceId,
                    amount: this.toAmount(allocation.amount),
                  })),
                }
              : undefined,
          },
          include: this.supplierPaymentInclude(),
        });

        await this.recomputePurchaseInvoices(tx, [
          ...previousAllocationIds.map((item) => item.purchaseInvoiceId),
          ...allocations.map((item) => item.purchaseInvoiceId),
        ]);
        return payment;
      });

      return this.mapSupplierPayment(updated);
    } catch (error) {
      if (this.isUniqueConflict(error, 'reference')) {
        throw new ConflictException('A supplier payment with this reference already exists.');
      }
      throw error;
    }
  }

  async post(id: string) {
    const payment = await this.prisma.supplierPayment.findUnique({
      where: { id },
      include: this.supplierPaymentInclude(),
    });
    if (!payment) {
      throw new BadRequestException(`Supplier payment ${id} was not found.`);
    }
    if (payment.status !== SupplierPaymentStatus.DRAFT) {
      throw new BadRequestException('Only draft supplier payments can be posted.');
    }
    if (!payment.supplier.isActive) {
      throw new BadRequestException('Deactivated suppliers cannot be selected for new transactions.');
    }

    const supplierCounterparty = await this.prisma.supplier.findUnique({
      where: { id: payment.supplierId },
      select: { payableAccountId: true, name: true },
    });
    if (!supplierCounterparty) {
      throw new BadRequestException('Supplier was not found.');
    }

    await this.ensureBankCashAccount(payment.bankCashAccountId, supplierCounterparty.payableAccountId);

    const createdTransaction = await this.bankCashTransactionsService.createPayment({
      reference: payment.reference,
      transactionDate: payment.paymentDate.toISOString(),
      amount: Number(payment.amount),
      bankCashAccountId: payment.bankCashAccountId,
      counterAccountId: supplierCounterparty.payableAccountId,
      counterpartyName: supplierCounterparty.name,
      description: payment.description ?? undefined,
    });
    const postedTransaction = await this.bankCashTransactionsService.post(createdTransaction.id);

    const updated = await this.prisma.$transaction(async (tx) => {
      const nextPayment = await tx.supplierPayment.update({
        where: { id },
        data: {
          status: SupplierPaymentStatus.POSTED,
          bankCashTransactionId: postedTransaction.id,
          postedAt: postedTransaction.postedAt ? new Date(postedTransaction.postedAt) : new Date(),
        },
        include: this.supplierPaymentInclude(),
      });

      await tx.supplier.update({
        where: { id: payment.supplierId },
        data: {
          currentBalance: {
            decrement: this.toAmount(Number(payment.amount)),
          },
        },
      });

      await this.recomputePurchaseInvoices(tx, payment.allocations.map((item) => item.purchaseInvoiceId));
      return nextPayment;
    });

    return this.mapSupplierPayment(updated);
  }

  async cancel(id: string) {
    const payment = await this.prisma.supplierPayment.findUnique({
      where: { id },
      include: { allocations: { select: { purchaseInvoiceId: true } } },
    });
    if (!payment) {
      throw new BadRequestException(`Supplier payment ${id} was not found.`);
    }
    if (payment.status !== SupplierPaymentStatus.DRAFT) {
      throw new BadRequestException('Only draft supplier payments can be cancelled.');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.supplierPayment.update({
        where: { id },
        data: { status: SupplierPaymentStatus.CANCELLED },
        include: this.supplierPaymentInclude(),
      });
      await this.recomputePurchaseInvoices(tx, payment.allocations.map((item) => item.purchaseInvoiceId));
      return next;
    });

    return this.mapSupplierPayment(updated);
  }

  private async resolveAllocations(
    allocations: SupplierPaymentAllocationDto[],
    supplierId: string,
    excludeSupplierPaymentId?: string,
  ) {
    const uniqueInvoiceIds = Array.from(new Set(allocations.map((item) => item.purchaseInvoiceId)));
    const invoices = await this.prisma.purchaseInvoice.findMany({
      where: {
        id: { in: uniqueInvoiceIds },
        supplierId,
        status: { not: 'CANCELLED' as any },
      },
      select: { id: true, totalAmount: true },
    });
    const invoiceMap = new Map(invoices.map((invoice) => [invoice.id, invoice]));

    return Promise.all(
      allocations.map(async (allocation) => {
        const invoice = invoiceMap.get(allocation.purchaseInvoiceId);
        if (!invoice) {
          throw new BadRequestException('Each allocation must reference an existing purchase invoice for the same supplier.');
        }

        const allocatedElsewhere = await this.prisma.supplierPaymentAllocation.aggregate({
          where: {
            purchaseInvoiceId: allocation.purchaseInvoiceId,
            supplierPayment: {
              status: { not: SupplierPaymentStatus.CANCELLED },
            },
            supplierPaymentId: excludeSupplierPaymentId ? { not: excludeSupplierPaymentId } : undefined,
          },
          _sum: { amount: true },
        });

        const currentReserved = Number(allocatedElsewhere._sum.amount ?? 0);
        const invoiceAvailable = Number(invoice.totalAmount) - currentReserved;
        if (allocation.amount - Number(invoiceAvailable.toFixed(2)) > 0.0001) {
          throw new BadRequestException('Payment allocation amount exceeds the outstanding balance of the related purchase invoice.');
        }

        return {
          purchaseInvoiceId: allocation.purchaseInvoiceId,
          amount: Number(allocation.amount.toFixed(2)),
        } satisfies ResolvedAllocation;
      }),
    );
  }

  private async getCurrentResolvedAllocations(supplierPaymentId: string) {
    const rows = await this.prisma.supplierPaymentAllocation.findMany({
      where: { supplierPaymentId },
      select: { purchaseInvoiceId: true, amount: true },
    });
    return rows.map((row) => ({
      purchaseInvoiceId: row.purchaseInvoiceId,
      amount: Number(row.amount),
    }));
  }

  private async recomputePurchaseInvoices(tx: Prisma.TransactionClient | PrismaService, invoiceIds: string[]) {
    const uniqueIds = Array.from(new Set(invoiceIds.filter(Boolean)));
    await Promise.all(uniqueIds.map((invoiceId) => this.recomputePurchaseInvoiceAmounts(tx, invoiceId)));
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
          supplierPayment: { status: { not: SupplierPaymentStatus.CANCELLED } },
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
      invoice.status === 'DRAFT' || invoice.status === 'CANCELLED'
        ? invoice.status
        : outstanding <= 0
          ? 'FULLY_PAID'
          : allocated > 0
            ? 'PARTIALLY_PAID'
            : 'POSTED';

    await tx.purchaseInvoice.update({
      where: { id: invoiceId },
      data: {
        allocatedAmount: this.toAmount(allocated),
        outstandingAmount: this.toAmount(outstanding),
        allocationStatus,
        status: nextStatus as any,
      },
    });
  }

  private async ensureBankCashAccount(bankCashAccountId: string, counterAccountId: string) {
    const bankCashAccount = await this.prisma.bankCashAccount.findUnique({
      where: { id: bankCashAccountId },
      include: { account: { select: { id: true, currencyCode: true, isActive: true, isPosting: true } } },
    });
    if (!bankCashAccount || !bankCashAccount.isActive || !bankCashAccount.account.isActive || !bankCashAccount.account.isPosting) {
      throw new BadRequestException('Supplier payments require an active bank/cash account.');
    }
    const counterAccount = await this.prisma.account.findUnique({
      where: { id: counterAccountId },
      select: { id: true, currencyCode: true, isActive: true, isPosting: true },
    });
    if (!counterAccount || !counterAccount.isActive || !counterAccount.isPosting) {
      throw new BadRequestException('Supplier payments require an active payable counter account.');
    }
    if (bankCashAccount.account.id === counterAccount.id) {
      throw new BadRequestException('Paying bank/cash account must be different from the supplier payable account.');
    }
    if (bankCashAccount.currencyCode.toUpperCase() !== counterAccount.currencyCode.toUpperCase()) {
      throw new BadRequestException('Payment bank/cash currency must match the supplier payable account currency.');
    }
  }

  private supplierPaymentInclude() {
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
      bankCashAccount: {
        include: {
          account: {
            select: {
              id: true,
              code: true,
              name: true,
              currencyCode: true,
            },
          },
        },
      },
      bankCashTransaction: {
        select: {
          id: true,
          reference: true,
          status: true,
          transactionDate: true,
          postedAt: true,
        },
      },
      allocations: {
        orderBy: { allocatedAt: 'asc' },
        include: {
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
        },
      },
    } satisfies Prisma.SupplierPaymentInclude;
  }

  private mapSupplierPayment(row: SupplierPaymentWithRelations) {
    return {
      id: row.id,
      reference: row.reference,
      status: row.status,
      paymentDate: row.paymentDate.toISOString(),
      amount: row.amount.toString(),
      allocatedAmount: row.allocatedAmount.toString(),
      unappliedAmount: row.unappliedAmount.toString(),
      description: row.description,
      canEdit: row.status === SupplierPaymentStatus.DRAFT,
      canPost: row.status === SupplierPaymentStatus.DRAFT,
      canCancel: row.status === SupplierPaymentStatus.DRAFT,
      supplier: row.supplier,
      bankCashAccount: {
        id: row.bankCashAccount.id,
        name: row.bankCashAccount.name,
        type: row.bankCashAccount.type,
        currencyCode: row.bankCashAccount.currencyCode,
        account: row.bankCashAccount.account,
      },
      bankCashTransaction: row.bankCashTransaction
        ? {
            id: row.bankCashTransaction.id,
            reference: row.bankCashTransaction.reference,
            status: row.bankCashTransaction.status,
            transactionDate: row.bankCashTransaction.transactionDate.toISOString(),
            postedAt: row.bankCashTransaction.postedAt?.toISOString() ?? null,
          }
        : null,
      allocations: row.allocations.map((allocation) => ({
        id: allocation.id,
        amount: allocation.amount.toString(),
        purchaseInvoice: {
          id: allocation.purchaseInvoice.id,
          reference: allocation.purchaseInvoice.reference,
          status: allocation.purchaseInvoice.status,
          invoiceDate: allocation.purchaseInvoice.invoiceDate.toISOString(),
          totalAmount: allocation.purchaseInvoice.totalAmount.toString(),
          allocatedAmount: allocation.purchaseInvoice.allocatedAmount.toString(),
          outstandingAmount: allocation.purchaseInvoice.outstandingAmount.toString(),
        },
      })),
      postedAt: row.postedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private async getSupplierPaymentOrThrow(id: string) {
    const row = await this.prisma.supplierPayment.findUnique({ where: { id } });
    if (!row) {
      throw new BadRequestException(`Supplier payment ${id} was not found.`);
    }
    return row;
  }

  private parseStatus(status?: string): SupplierPaymentStatus | undefined {
    if (!status) return undefined;
    if (status in SupplierPaymentStatus) {
      return status as SupplierPaymentStatus;
    }
    throw new BadRequestException('Invalid supplier payment status.');
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
