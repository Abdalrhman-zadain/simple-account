import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma';

import { PrismaService } from '../../../../common/prisma/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

type SupplierListQuery = {
  isActive?: string;
  search?: string;
};

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
  };
}>;

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

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
      },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });

    return rows.map((row: SupplierWithPayableAccount) => this.mapSupplier(row));
  }

  async create(dto: CreateSupplierDto) {
    const payableAccount = await this.ensurePayableAccount(dto.payableAccountId);
    const code = dto.code?.trim() || this.generateReference('SUP');
    const defaultCurrency = dto.defaultCurrency.trim().toUpperCase();

    if (defaultCurrency !== payableAccount.currencyCode.toUpperCase()) {
      throw new BadRequestException('Default supplier currency must match the selected payable account currency.');
    }

    try {
      const created = await this.prisma.supplier.create({
        data: {
          code,
          name: dto.name.trim(),
          contactInfo: dto.contactInfo?.trim() || null,
          paymentTerms: dto.paymentTerms?.trim() || null,
          taxInfo: dto.taxInfo?.trim() || null,
          defaultCurrency,
          payableAccountId: payableAccount.id,
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
        },
      });

      return this.mapSupplier(created);
    } catch (error) {
      if (this.isUniqueCodeConflict(error)) {
        throw new ConflictException('A supplier with this code already exists.');
      }
      throw error;
    }
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
        paymentTerms: dto.paymentTerms === undefined ? undefined : dto.paymentTerms.trim() || null,
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
    return {
      supplierId: supplier.id,
      supplierCode: supplier.code,
      supplierName: supplier.name,
      transactions: [] as Array<{
        type: string;
        id: string;
        reference: string;
        date: string;
        amount: string;
        status: string;
      }>,
    };
  }

  async ensureActiveSupplier(id: string) {
    const supplier = await this.getSupplierOrThrow(id);
    if (!supplier.isActive) {
      throw new BadRequestException('Deactivated suppliers cannot be used in new transactions.');
    }
    return supplier;
  }

  private async ensurePayableAccount(id: string) {
    const account = await this.prisma.account.findUnique({
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

  private async getSupplierOrThrow(id: string) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id } });
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
      paymentTerms: row.paymentTerms,
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
