import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma';
import { PrismaService } from '../../../common/prisma/prisma.service';

export type CreatePaymentTermDto = {
  name: string;
  nameAr?: string;
  calculationMethod: 'IMMEDIATE' | 'DAYS_AFTER' | 'END_OF_MONTH' | 'MANUAL';
  numberOfDays?: number;
  isActive?: boolean;
};

export type UpdatePaymentTermDto = Partial<CreatePaymentTermDto>;

const PAYMENT_TERM_IN_USE_MESSAGE = 'لا يمكن حذف شرط الدفع هذا لأنه مستخدم مع موردين سابقين. يمكنك تعطيله بدلًا من ذلك.';

@Injectable()
export class PaymentTermsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.paymentTerm.findMany({
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });
  }

  listActive() {
    return this.prisma.paymentTerm.findMany({
      where: { isActive: true },
      orderBy: [{ name: 'asc' }],
    });
  }

  async create(dto: CreatePaymentTermDto) {
    try {
      return await this.prisma.paymentTerm.create({
        data: {
          name: dto.name.trim(),
          nameAr: dto.nameAr?.trim() || null,
          calculationMethod: dto.calculationMethod,
          numberOfDays: dto.numberOfDays || null,
          isActive: dto.isActive ?? true,
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && (e as any).code === 'P2002') {
        throw new ConflictException('Payment term name already exists.');
      }
      throw e;
    }
  }

  async update(id: string, dto: UpdatePaymentTermDto) {
    const existing = await this.prisma.paymentTerm.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Payment term not found.');

    try {
      return await this.prisma.paymentTerm.update({
        where: { id },
        data: {
          name: dto.name?.trim() ?? existing.name,
          nameAr: dto.nameAr === undefined ? existing.nameAr : dto.nameAr?.trim() || null,
          calculationMethod: dto.calculationMethod ?? existing.calculationMethod,
          numberOfDays: dto.numberOfDays ?? existing.numberOfDays,
          isActive: dto.isActive ?? existing.isActive,
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && (e as any).code === 'P2002') {
        throw new ConflictException('Payment term name already exists.');
      }
      throw e;
    }
  }

  async remove(id: string) {
    const existing = await this.prisma.paymentTerm.findUnique({
      where: { id },
      select: { id: true, suppliers: { select: { id: true } } },
    });
    if (!existing) throw new NotFoundException('Payment term not found.');

    if (existing.suppliers.length > 0) {
      throw new BadRequestException(PAYMENT_TERM_IN_USE_MESSAGE);
    }

    return this.prisma.paymentTerm.delete({ where: { id } });
  }
}
