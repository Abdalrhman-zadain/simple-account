import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma';
import { PrismaService } from '../../../../common/prisma/prisma.service';
import {
  CreateTaxTreatmentDto,
  UpdateTaxTreatmentDto,
} from './tax-treatments.dto';

@Injectable()
export class TaxTreatmentsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.taxTreatment.findMany({
      include: { defaultTax: this.defaultTaxSelect() },
      orderBy: [{ isActive: 'desc' }, { code: 'asc' }],
    });
  }

  listActive() {
    return this.prisma.taxTreatment.findMany({
      where: { isActive: true },
      include: { defaultTax: this.defaultTaxSelect() },
      orderBy: [{ code: 'asc' }],
    });
  }

  async create(dto: CreateTaxTreatmentDto) {
    const data = await this.validateInput(dto);

    try {
      return await this.prisma.taxTreatment.create({
        data,
        include: { defaultTax: this.defaultTaxSelect() },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Tax treatment code already exists.');
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateTaxTreatmentDto) {
    const existing = await this.prisma.taxTreatment.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Tax treatment not found.');
    }

    const merged: CreateTaxTreatmentDto = {
      code: dto.code ?? existing.code,
      arabicName: dto.arabicName ?? existing.arabicName,
      englishName: dto.englishName ?? existing.englishName,
      description:
        dto.description === undefined ? existing.description : dto.description,
      defaultTaxId:
        dto.defaultTaxId === undefined ? existing.defaultTaxId : dto.defaultTaxId,
      isActive: dto.isActive ?? existing.isActive,
    };

    const data = await this.validateInput(merged);

    try {
      return await this.prisma.taxTreatment.update({
        where: { id },
        data,
        include: { defaultTax: this.defaultTaxSelect() },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Tax treatment code already exists.');
      }
      throw error;
    }
  }

  private async validateInput(
    dto: CreateTaxTreatmentDto,
  ): Promise<Prisma.TaxTreatmentUncheckedCreateInput> {
    const code = dto.code?.trim().toUpperCase();
    const arabicName = dto.arabicName?.trim();
    const englishName = dto.englishName?.trim();
    const description = dto.description?.trim() || null;
    const defaultTaxId = dto.defaultTaxId?.trim() || null;

    if (!code) {
      throw new BadRequestException('Tax treatment code is required.');
    }
    if (!arabicName) {
      throw new BadRequestException('Arabic tax treatment name is required.');
    }
    if (!englishName) {
      throw new BadRequestException('English tax treatment name is required.');
    }

    if (defaultTaxId) {
      const tax = await this.prisma.tax.findFirst({
        where: { id: defaultTaxId },
        select: { id: true },
      });
      if (!tax) {
        throw new BadRequestException('Default tax must reference an existing tax.');
      }
    }

    return {
      code,
      arabicName,
      englishName,
      description,
      defaultTaxId,
      isActive: dto.isActive ?? true,
    };
  }

  private defaultTaxSelect() {
    return {
      select: {
        id: true,
        taxCode: true,
        taxName: true,
        rate: true,
        taxType: true,
        taxAccountId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    };
  }
}
