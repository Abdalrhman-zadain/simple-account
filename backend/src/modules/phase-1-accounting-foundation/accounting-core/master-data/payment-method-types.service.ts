import { BadRequestException, ConflictException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma';
import { PrismaService } from '../../../../common/prisma/prisma.service';

@Injectable()
export class PaymentMethodTypesService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    try {
      return await this.prisma.paymentMethodType.findMany({
        orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
      });
    } catch (e) {
      this.throwHelpfulMigrationErrorIfNeeded(e);
      throw e;
    }
  }

  async create(dto: { name: string }) {
    const name = dto.name?.trim();
    if (!name) throw new BadRequestException('Name is required.');

    try {
      return await this.prisma.paymentMethodType.create({
        data: { name },
      });
    } catch (e) {
      this.throwHelpfulMigrationErrorIfNeeded(e);
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Payment method type already exists.');
      }
      throw e;
    }
  }

  async update(id: string, dto: { name?: string; isActive?: boolean }) {
    const name = dto.name?.trim();
    if (dto.name !== undefined && !name) throw new BadRequestException('Name cannot be empty.');

    try {
      return await this.prisma.paymentMethodType.update({
        where: { id },
        data: {
          name: name ?? undefined,
          isActive: dto.isActive,
        },
      });
    } catch (e) {
      this.throwHelpfulMigrationErrorIfNeeded(e);
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Payment method type already exists.');
      }
      throw e;
    }
  }

  async deactivate(id: string) {
    try {
      return await this.prisma.paymentMethodType.update({
        where: { id },
        data: { isActive: false },
      });
    } catch (e) {
      this.throwHelpfulMigrationErrorIfNeeded(e);
      throw e;
    }
  }

  private throwHelpfulMigrationErrorIfNeeded(error: unknown) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return;
    if (error.code === 'P2021' || error.code === 'P2022') {
      throw new ServiceUnavailableException(
        'Database is missing the PaymentMethodType table. Apply Prisma migrations and restart the backend.',
      );
    }
  }
}
