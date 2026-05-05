import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TaxType } from '../../../../generated/prisma';
import { PrismaService } from '../../../../common/prisma/prisma.service';
import { CreateTaxDto, UpdateTaxDto } from './taxes.dto';

const TAX_TYPES_REQUIRING_ACCOUNT: TaxType[] = [TaxType.SALES, TaxType.PURCHASE];
const TAX_IN_USE_MESSAGE = 'لا يمكن حذف هذه الضريبة لأنها مستخدمة في مستندات سابقة. يمكنك تعطيلها بدلًا من ذلك.';

@Injectable()
export class TaxesService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.tax.findMany({
      include: { taxAccount: this.accountSelect() },
      orderBy: [{ isActive: 'desc' }, { taxCode: 'asc' }],
    });
  }

  listActive() {
    return this.prisma.tax.findMany({
      where: { isActive: true },
      include: { taxAccount: this.accountSelect() },
      orderBy: [{ taxCode: 'asc' }],
    });
  }

  async create(dto: CreateTaxDto) {
    const data = await this.validateInput(dto);

    try {
      return await this.prisma.tax.create({
        data,
        include: { taxAccount: this.accountSelect() },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Tax code already exists.');
      }
      throw e;
    }
  }

  async update(id: string, dto: UpdateTaxDto) {
    const existing = await this.prisma.tax.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Tax not found.');

    const merged: CreateTaxDto = {
      taxCode: dto.taxCode ?? existing.taxCode,
      taxName: dto.taxName ?? existing.taxName,
      rate: dto.rate ?? Number(existing.rate),
      taxType: dto.taxType ?? existing.taxType,
      taxAccountId: dto.taxAccountId === undefined ? existing.taxAccountId : dto.taxAccountId,
      isActive: dto.isActive ?? existing.isActive,
    };
    const data = await this.validateInput(merged);

    try {
      return await this.prisma.tax.update({
        where: { id },
        data,
        include: { taxAccount: this.accountSelect() },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Tax code already exists.');
      }
      throw e;
    }
  }

  async remove(id: string) {
    const existing = await this.prisma.tax.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new NotFoundException('Tax not found.');

    if (await this.isTaxUsed(id)) {
      throw new BadRequestException(TAX_IN_USE_MESSAGE);
    }

    return this.prisma.tax.delete({ where: { id } });
  }

  private async validateInput(dto: CreateTaxDto): Promise<Prisma.TaxUncheckedCreateInput> {
    const taxCode = dto.taxCode?.trim().toUpperCase();
    const taxName = dto.taxName?.trim();
    const taxType = dto.taxType;
    const rate = Number(dto.rate);
    const taxAccountId = dto.taxAccountId?.trim() || null;

    if (!taxCode) throw new BadRequestException('Tax code is required.');
    if (!taxName) throw new BadRequestException('Tax name is required.');
    if (!Object.values(TaxType).includes(taxType)) throw new BadRequestException('Tax type is required.');
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
      throw new BadRequestException('Tax rate must be between 0 and 100.');
    }
    if (TAX_TYPES_REQUIRING_ACCOUNT.includes(taxType) && !taxAccountId) {
      throw new BadRequestException('Tax account is required for Sales and Purchase taxes.');
    }

    if (taxAccountId) {
      const account = await this.prisma.account.findFirst({
        where: { id: taxAccountId, isPosting: true, isActive: true },
        select: { id: true },
      });
      if (!account) throw new BadRequestException('Tax account must be an active posting account.');
    }

    return {
      taxCode,
      taxName,
      rate: new Prisma.Decimal(rate),
      taxType,
      taxAccountId,
      isActive: dto.isActive ?? true,
    };
  }

  private async isTaxUsed(id: string) {
    const [
      salesQuotationLines,
      salesOrderLines,
      salesInvoiceLines,
      creditNoteLines,
      purchaseOrderLines,
      purchaseInvoiceLines,
      debitNoteLines,
    ] = await Promise.all([
      this.prisma.salesQuotationLine.count({ where: { taxId: id } }),
      this.prisma.salesOrderLine.count({ where: { taxId: id } }),
      this.prisma.salesInvoiceLine.count({ where: { taxId: id } }),
      this.prisma.creditNoteLine.count({ where: { taxId: id } }),
      this.prisma.purchaseOrderLine.count({ where: { taxId: id } }),
      this.prisma.purchaseInvoiceLine.count({ where: { taxId: id } }),
      this.prisma.debitNoteLine.count({ where: { taxId: id } }),
    ]);

    return (
      salesQuotationLines +
        salesOrderLines +
        salesInvoiceLines +
        creditNoteLines +
        purchaseOrderLines +
        purchaseInvoiceLines +
        debitNoteLines >
      0
    );
  }

  private accountSelect() {
    return {
      select: {
        id: true,
        code: true,
        name: true,
        nameAr: true,
        type: true,
        subtype: true,
        isPosting: true,
        isActive: true,
        currentBalance: true,
        currencyCode: true,
      },
    };
  }
}
