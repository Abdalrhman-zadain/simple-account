import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma';

import { PrismaService } from '../../../../common/prisma/prisma.service';
import { CreateInventoryItemCategoryDto, UpdateInventoryItemCategoryDto } from './dto/item-categories.dto';

type ItemCategoryListQuery = {
  isActive?: string;
  itemGroupId?: string;
  search?: string;
};

@Injectable()
export class ItemCategoriesService {
  readonly groupSelect = {
    id: true,
    code: true,
    name: true,
    isActive: true,
  } as const;

  constructor(private readonly prisma: PrismaService) {}

  async list(query: ItemCategoryListQuery = {}) {
    const search = query.search?.trim();
    const rows = await this.prisma.inventoryItemCategory.findMany({
      where: {
        isActive: query.isActive === undefined || query.isActive === '' ? undefined : query.isActive === 'true',
        itemGroupId: query.itemGroupId || undefined,
        OR: search
          ? [
              { code: { contains: search, mode: 'insensitive' } },
              { name: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
              { itemGroup: { code: { contains: search, mode: 'insensitive' } } },
              { itemGroup: { name: { contains: search, mode: 'insensitive' } } },
            ]
          : undefined,
      },
      include: this.include(),
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });

    return rows.map((row) => this.mapCategory(row));
  }

  async getById(id: string) {
    const category = await this.getCategoryWithDetailsOrThrow(id);
    return this.mapCategory(category);
  }

  async create(dto: CreateInventoryItemCategoryDto) {
    const group = await this.validateActiveGroup(dto.itemGroupId);
    const created = await this.prisma.inventoryItemCategory
      .create({
        data: {
          code: dto.code?.trim() || this.generateReference('IC'),
          name: dto.name.trim(),
          description: dto.description?.trim() || null,
          itemGroupId: group.id,
        },
        include: this.include(),
      })
      .catch((error: unknown) => {
        if (this.isCodeConflict(error)) {
          throw new ConflictException('An item category with this code already exists.');
        }
        throw error;
      });

    return this.mapCategory(created);
  }

  async update(id: string, dto: UpdateInventoryItemCategoryDto) {
    const current = await this.getCategoryOrThrow(id);
    if (!current.isActive) {
      throw new BadRequestException('Deactivated item categories cannot be edited.');
    }

    const group = dto.itemGroupId !== undefined ? await this.validateActiveGroup(dto.itemGroupId) : undefined;
    const updated = await this.prisma.inventoryItemCategory.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        description: dto.description === undefined ? undefined : dto.description.trim() || null,
        itemGroupId: dto.itemGroupId === undefined ? undefined : group?.id,
        isActive: dto.isActive,
      },
      include: this.include(),
    });

    return this.mapCategory(updated);
  }

  async deactivate(id: string) {
    await this.getCategoryOrThrow(id);
    const updated = await this.prisma.inventoryItemCategory.update({
      where: { id },
      data: { isActive: false },
      include: this.include(),
    });

    return this.mapCategory(updated);
  }

  async ensureActiveCategoryInGroup(categoryId: string, groupId: string) {
    const category = await this.getCategoryOrThrow(categoryId);
    if (!category.isActive) {
      throw new BadRequestException('Item category must be active.');
    }
    if (category.itemGroupId !== groupId) {
      throw new BadRequestException('Selected item category does not belong to the selected item group.');
    }
    return category;
  }

  private include() {
    return {
      itemGroup: { select: this.groupSelect },
      _count: { select: { items: true } },
    } as const;
  }

  private async validateActiveGroup(id: string) {
    if (!id) throw new BadRequestException('Item group is required.');
    const group = await this.prisma.inventoryItemGroup.findUnique({ where: { id }, select: this.groupSelect });
    if (!group) throw new BadRequestException('Item group was not found.');
    if (!group.isActive) throw new BadRequestException('Item group must be active.');
    return group;
  }

  private async getCategoryOrThrow(id: string) {
    const category = await this.prisma.inventoryItemCategory.findUnique({ where: { id } });
    if (!category) throw new BadRequestException(`Item category ${id} was not found.`);
    return category;
  }

  private async getCategoryWithDetailsOrThrow(id: string) {
    const category = await this.prisma.inventoryItemCategory.findUnique({ where: { id }, include: this.include() });
    if (!category) throw new BadRequestException(`Item category ${id} was not found.`);
    return category;
  }

  private mapCategory(row: Prisma.InventoryItemCategoryGetPayload<{ include: ReturnType<ItemCategoriesService['include']> }>) {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      itemGroupId: row.itemGroupId,
      itemGroup: row.itemGroup,
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
