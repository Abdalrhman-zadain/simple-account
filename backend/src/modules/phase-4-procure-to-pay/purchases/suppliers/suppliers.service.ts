import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma';

import { PrismaService } from '../../../../common/prisma/prisma.service';
import { AccountsService } from '../../../phase-1-accounting-foundation/accounting-core/chart-of-accounts/accounts.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

type SupplierListQuery = {
  isActive?: string;
  search?: string;
};

type SuppliersDb = Prisma.TransactionClient | PrismaService;

const PAYABLES_HEADER_CODE = '2110000';
const SUPPLIER_AUTO_PAYABLE_SUBTYPE = 'Payable';

type SupplierWithPayableAccount = Prisma.SupplierGetPayload<{
  include: {
    payableAccount: {
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
    paymentTerm: {
      select: {
        id: true;
        name: true;
        nameAr: true;
        calculationMethod: true;
        numberOfDays: true;
        isActive: true;
      };
    };
  };
}>;

@Injectable()
export class SuppliersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accountsService: AccountsService,
  ) {}

  async list(query: SupplierListQuery = {}) {
    const search = query.search?.trim();
    const rows = await this.prisma.supplier.findMany({
      where: {
        isActive: query.isActive === undefined || query.isActive === '' ? undefined : query.isActive === 'true',
        OR: search
          ? [
              { code: { contains: search, mode: 'insensitive' } },
              { name: { contains: search, mode: 'insensitive' } },
              { contactInfo: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { address: { contains: search, mode: 'insensitive' } },
              { taxInfo: { contains: search, mode: 'insensitive' } },
              { payableAccount: { code: { contains: search, mode: 'insensitive' } } },
              { payableAccount: { name: { contains: search, mode: 'insensitive' } } },
            ]
          : undefined,
      },
      include: {
        payableAccount: {
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
        paymentTerm: {
          select: {
            id: true,
            name: true,
            nameAr: true,
            calculationMethod: true,
            numberOfDays: true,
            isActive: true,
          },
        },
      },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });

    return rows.map((row: SupplierWithPayableAccount) => this.mapSupplier(row));
  }

  async create(dto: CreateSupplierDto) {
    return this.prisma.$transaction(async (tx) => {
      const code = dto.code?.trim() || (await this.getNextSupplierCode(tx));
      const defaultCurrency = dto.defaultCurrency.trim().toUpperCase();

      try {
        if (dto.payableAccountLinkMode === 'AUTO' && !dto.name?.trim()) {
          throw new BadRequestException('يرجى إدخال اسم المورد قبل إنشاء حساب دائن تلقائي.');
        }

        const payableAccountId = await this.resolveSupplierPayableAccount(dto, defaultCurrency, tx);

        const created = await tx.supplier.create({
          data: {
            code,
            name: dto.name.trim(),
            contactInfo: dto.contactInfo?.trim() || null,
            phone: dto.phone?.trim() || null,
            email: dto.email?.trim() || null,
            address: dto.address?.trim() || null,
            paymentTermId: dto.paymentTermId || null,
            taxInfo: dto.taxInfo?.trim() || null,
            defaultCurrency,
            payableAccountId,
          },
          include: {
            payableAccount: {
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
            paymentTerm: {
              select: {
                id: true,
                name: true,
                nameAr: true,
                calculationMethod: true,
                numberOfDays: true,
                isActive: true,
              },
            },
          },
        });

        return this.mapSupplier(created);
      } catch (error) {
        if (this.isUniqueCodeConflict(error)) {
          throw new ConflictException('A supplier with this code already exists.');
        }
        throw error;
      }
    });
  }

  async getById(id: string) {
    const supplier = await this.getSupplierOrThrow(id);
    return this.mapSupplier(supplier);
  }

  private async getNextSupplierCode(tx: SuppliersDb): Promise<string> {
    const suppliers = await tx.supplier.findMany({
      where: {
        code: {
          startsWith: 'SUP-',
        },
      },
      select: {
        code: true,
      },
    });

    let maxNumber = 0;
    for (const supplier of suppliers) {
      const match = supplier.code.match(/^SUP-(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNumber) {
          maxNumber = num;
        }
      }
    }

    return `SUP-${maxNumber + 1}`;
  }

  async update(id: string, dto: UpdateSupplierDto) {
    const current = await this.getSupplierOrThrow(id);
    if (!current.isActive) {
      throw new BadRequestException('Deactivated suppliers cannot be edited.');
    }

    const nextPayableAccountId = dto.payableAccountId ?? current.payableAccountId;
    const payableAccount = await this.ensurePayableAccount(nextPayableAccountId);
    const nextCurrency = (dto.defaultCurrency ?? current.defaultCurrency).trim().toUpperCase();

    if (nextCurrency !== payableAccount.currencyCode.toUpperCase()) {
      throw new BadRequestException('Default supplier currency must match the selected payable account currency.');
    }

    const updated = await this.prisma.supplier.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        contactInfo: dto.contactInfo === undefined ? undefined : dto.contactInfo.trim() || null,
        phone: dto.phone === undefined ? undefined : dto.phone.trim() || null,
        email: dto.email === undefined ? undefined : dto.email.trim() || null,
        address: dto.address === undefined ? undefined : dto.address.trim() || null,
        paymentTermId: dto.paymentTermId === undefined ? undefined : dto.paymentTermId || null,
        taxInfo: dto.taxInfo === undefined ? undefined : dto.taxInfo.trim() || null,
        defaultCurrency: nextCurrency,
        payableAccountId: nextPayableAccountId,
      },
      include: {
        payableAccount: {
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
        paymentTerm: {
          select: {
            id: true,
            name: true,
            nameAr: true,
            calculationMethod: true,
            numberOfDays: true,
            isActive: true,
          },
        },
      },
    });

    return this.mapSupplier(updated);
  }

  async deactivate(id: string) {
    await this.getSupplierOrThrow(id);
    const updated = await this.prisma.supplier.update({
      where: { id },
      data: { isActive: false },
      include: {
        payableAccount: {
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
        paymentTerm: {
          select: {
            id: true,
            name: true,
            nameAr: true,
            calculationMethod: true,
            numberOfDays: true,
            isActive: true,
          },
        },
      },
    });

    return this.mapSupplier(updated);
  }

  async getBalance(id: string) {
    const supplier = await this.getSupplierOrThrow(id);
    return {
      supplierId: supplier.id,
      supplierCode: supplier.code,
      supplierName: supplier.name,
      currentBalance: supplier.currentBalance.toString(),
      outstandingBalance: supplier.currentBalance.toString(),
    };
  }

  async getTransactions(id: string) {
    const supplier = await this.getSupplierOrThrow(id);
    const [purchaseInvoices, supplierPayments, debitNotes] = await Promise.all([
      this.prisma.purchaseInvoice.findMany({
        where: { supplierId: id },
        select: {
          id: true,
          reference: true,
          invoiceDate: true,
          totalAmount: true,
          status: true,
          createdAt: true,
        },
      }),
      this.prisma.supplierPayment.findMany({
        where: { supplierId: id },
        select: {
          id: true,
          reference: true,
          paymentDate: true,
          amount: true,
          status: true,
          createdAt: true,
        },
      }),
      this.prisma.debitNote.findMany({
        where: { supplierId: id },
        select: {
          id: true,
          reference: true,
          noteDate: true,
          totalAmount: true,
          status: true,
          createdAt: true,
        },
      }),
    ]);

    const transactions = [
      ...purchaseInvoices.map((row) => ({
        type: 'PURCHASE_INVOICE',
        id: row.id,
        reference: row.reference,
        date: row.invoiceDate.toISOString(),
        amount: row.totalAmount.toString(),
        status: row.status,
        createdAt: row.createdAt.toISOString(),
      })),
      ...supplierPayments.map((row) => ({
        type: 'SUPPLIER_PAYMENT',
        id: row.id,
        reference: row.reference,
        date: row.paymentDate.toISOString(),
        amount: row.amount.toString(),
        status: row.status,
        createdAt: row.createdAt.toISOString(),
      })),
      ...debitNotes.map((row) => ({
        type: 'DEBIT_NOTE',
        id: row.id,
        reference: row.reference,
        date: row.noteDate.toISOString(),
        amount: row.totalAmount.toString(),
        status: row.status,
        createdAt: row.createdAt.toISOString(),
      })),
    ].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));

    return {
      supplierId: supplier.id,
      supplierCode: supplier.code,
      supplierName: supplier.name,
      transactions: transactions.map(({ createdAt, ...row }) => row),
    };
  }

  async ensureActiveSupplier(id: string) {
    const supplier = await this.getSupplierOrThrow(id);
    if (!supplier.isActive) {
      throw new BadRequestException('Deactivated suppliers cannot be used in new transactions.');
    }
    return supplier;
  }

  private async resolveSupplierPayableAccount(
    dto: CreateSupplierDto,
    defaultCurrency: string,
    db: SuppliersDb,
  ) {
    if (!dto.payableAccountLinkMode) {
      throw new BadRequestException('يرجى تحديد طريقة ربط حساب الدائن.');
    }

    if (dto.payableAccountLinkMode === 'EXISTING') {
      if (!dto.payableAccountId) {
        throw new BadRequestException('يرجى اختيار حساب دائن المورد قبل الحفظ.');
      }

      const payableAccount = await this.ensurePayableAccount(dto.payableAccountId, db);
      if (defaultCurrency !== payableAccount.currencyCode.toUpperCase()) {
        throw new BadRequestException('Default supplier currency must match the selected payable account currency.');
      }
      return payableAccount.id;
    }

    const parentAccount = await this.getSupplierPayablesHeaderAccount(db);
    await this.ensureUniqueSupplierPayableAccountName(dto.name, parentAccount.id, db);
    await db.accountSubtype.upsert({
      where: { name: SUPPLIER_AUTO_PAYABLE_SUBTYPE },
      create: { name: SUPPLIER_AUTO_PAYABLE_SUBTYPE, isActive: true },
      update: { isActive: true },
    });

    const account = await this.accountsService.createWithinTransaction(
      {
        name: dto.name.trim(),
        nameAr: dto.name.trim(),
        type: 'LIABILITY',
        subtype: SUPPLIER_AUTO_PAYABLE_SUBTYPE,
        isPosting: true,
        allowManualPosting: true,
        currencyCode: defaultCurrency,
        parentAccountId: parentAccount.id,
      },
      db as never,
    );

    return account.id;
  }

  private async ensurePayableAccount(id: string, db: SuppliersDb = this.prisma) {
    const account = await db.account.findUnique({
      where: { id },
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
        currencyCode: true,
        isActive: true,
        isPosting: true,
      },
    });

    if (!account) {
      throw new BadRequestException(`Payable account ${id} was not found.`);
    }
    if (!account.isActive || !account.isPosting) {
      throw new BadRequestException('Payable account must be active and posting.');
    }
    if (account.type !== 'LIABILITY') {
      throw new BadRequestException('Payable account must be a liability account.');
    }

    return account;
  }

  private async ensureUniqueSupplierPayableAccountName(
    name: string,
    parentAccountId: string,
    db: SuppliersDb,
  ) {
    const normalizedName = name.trim();
    const existingAccount = await db.account.findFirst({
      where: {
        parentAccountId,
        OR: [
          { name: { equals: normalizedName, mode: 'insensitive' } },
          { nameAr: { equals: normalizedName, mode: 'insensitive' } },
        ],
      },
      select: { id: true },
    });

    if (existingAccount) {
      throw new ConflictException('يوجد حساب دائن بنفس اسم المورد تحت الموردين.');
    }
  }

  private async getSupplierPayablesHeaderAccount(db: SuppliersDb) {
    const payablesHeader = await db.account.findUnique({
      where: { code: PAYABLES_HEADER_CODE },
      select: {
        id: true,
        type: true,
        isActive: true,
        isPosting: true,
        currencyCode: true,
      },
    });

    if (!payablesHeader) {
      throw new BadRequestException(`Payables header account ${PAYABLES_HEADER_CODE} was not found.`);
    }
    if (!payablesHeader.isActive || payablesHeader.isPosting || payablesHeader.type !== 'LIABILITY') {
      throw new BadRequestException('Payables header account must be an active Liability header account.');
    }

    return payablesHeader;
  }

  private async getSupplierOrThrow(id: string) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id },
      include: {
        payableAccount: {
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
        paymentTerm: {
          select: {
            id: true,
            name: true,
            nameAr: true,
            calculationMethod: true,
            numberOfDays: true,
            isActive: true,
          },
        },
      },
    });
    if (!supplier) {
      throw new BadRequestException(`Supplier ${id} was not found.`);
    }
    return supplier;
  }

  private mapSupplier(row: SupplierWithPayableAccount) {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      contactInfo: row.contactInfo,
      phone: row.phone,
      email: row.email,
      address: row.address,
      paymentTermId: row.paymentTermId,
      paymentTerm: row.paymentTerm,
      taxInfo: row.taxInfo,
      defaultCurrency: row.defaultCurrency,
      currentBalance: row.currentBalance.toString(),
      isActive: row.isActive,
      status: row.isActive ? 'ACTIVE' : 'INACTIVE',
      payableAccount: row.payableAccount,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private generateReference(prefix: string) {
    const compactDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase();
    return `${prefix}-${compactDate}-${suffix}`;
  }

  private isUniqueCodeConflict(error: unknown) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
      return false;
    }

    return error.code === 'P2002' && Array.isArray(error.meta?.target) && error.meta.target.includes('code');
  }
}
