import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma';

import { PrismaService } from '../../../../common/prisma/prisma.service';
import { CreateInventoryUnitOfMeasureDto, UpdateInventoryUnitOfMeasureDto } from './dto/units-of-measure.dto';

type UnitOfMeasureListQuery = {
  isActive?: string;
  search?: string;
};

@Injectable()
export class UnitsOfMeasureService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: UnitOfMeasureListQuery = {}) {
    const search = query.search?.trim();
    const rows = await this.prisma.inventoryUnitOfMeasure.findMany({
      where: {
        isActive: query.isActive === undefined || query.isActive === '' ? undefined : query.isActive === 'true',
        OR: search
          ? [
              { code: { contains: search, mode: 'insensitive' } },
              { name: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
              { unitType: { contains: search, mode: 'insensitive' } },
            ]
          : undefined,
      },
      include: {
        _count: { select: { items: true } },
      },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });

    return rows.map((row) => this.mapUnit(row));
  }

  async getById(id: string) {
    const unit = await this.getUnitWithDetailsOrThrow(id);
    return this.mapUnit(unit);
  }

  async create(dto: CreateInventoryUnitOfMeasureDto) {
    const created = await this.prisma.inventoryUnitOfMeasure
      .create({
        data: {
          code: dto.code?.trim() || this.generateReference('UOM'),
          name: dto.name.trim(),
          description: dto.description?.trim() || null,
          unitType: dto.unitType?.trim() || null,
          decimalPrecision: dto.decimalPrecision ?? 0,
        },
        include: { _count: { select: { items: true } } },
      })
      .catch((error: unknown) => {
        if (this.isCodeConflict(error)) {
          throw new ConflictException('A unit of measure with this code already exists.');
        }
        throw error;
      });

    return this.mapUnit(created);
  }

  async update(id: string, dto: UpdateInventoryUnitOfMeasureDto) {
    const current = await this.getUnitOrThrow(id);
    if (!current.isActive) {
      throw new BadRequestException('Deactivated units of measure cannot be edited.');
    }

    const updated = await this.prisma.inventoryUnitOfMeasure.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        description: dto.description === undefined ? undefined : dto.description.trim() || null,
        unitType: dto.unitType === undefined ? undefined : dto.unitType.trim() || null,
        decimalPrecision: dto.decimalPrecision,
        isActive: dto.isActive,
      },
      include: { _count: { select: { items: true } } },
    });

    return this.mapUnit(updated);
  }

  async deactivate(id: string) {
    await this.getUnitOrThrow(id);
    const updated = await this.prisma.inventoryUnitOfMeasure.update({
      where: { id },
      data: { isActive: false },
      include: { _count: { select: { items: true } } },
    });

    return this.mapUnit(updated);
  }

  async ensureActiveUnit(id: string) {
    const unit = await this.getUnitOrThrow(id);
    if (!unit.isActive) {
      throw new BadRequestException('Unit of measure must be active.');
    }
    return unit;
  }

  private async getUnitOrThrow(id: string) {
    const unit = await this.prisma.inventoryUnitOfMeasure.findUnique({ where: { id } });
    if (!unit) throw new BadRequestException(`Unit of measure ${id} was not found.`);
    return unit;
  }

  private async getUnitWithDetailsOrThrow(id: string) {
    const unit = await this.prisma.inventoryUnitOfMeasure.findUnique({
      where: { id },
      include: { _count: { select: { items: true } } },
    });
    if (!unit) throw new BadRequestException(`Unit of measure ${id} was not found.`);
    return unit;
  }

  private mapUnit(row: Prisma.InventoryUnitOfMeasureGetPayload<{ include: { _count: { select: { items: true } } } }>) {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      unitType: row.unitType,
      decimalPrecision: row.decimalPrecision,
      isActive: row.isActive,
      status: row.isActive ? 'ACTIVE' : 'INACTIVE',
      itemCount: row._count.items,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private generateReference(prefix: string) {
    const compactDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase();
    return `${prefix}-${compactDate}-${suffix}`;
  }

  private isCodeConflict(error: unknown) {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002' &&
      Array.isArray(error.meta?.target) &&
      error.meta.target.includes('code')
    );
  }
}
