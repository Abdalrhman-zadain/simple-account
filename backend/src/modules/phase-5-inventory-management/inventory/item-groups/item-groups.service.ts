import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma';

import { PrismaService } from '../../../../common/prisma/prisma.service';
import { CreateInventoryItemGroupDto, UpdateInventoryItemGroupDto } from './dto/item-groups.dto';

type ItemGroupListQuery = {
  isActive?: string;
  search?: string;
};

@Injectable()
export class ItemGroupsService {
  readonly accountSelect = {
    id: true,
    code: true,
    name: true,
    type: true,
    currencyCode: true,
    isActive: true,
    isPosting: true,
  } as const;

  readonly groupSelect = {
    id: true,
    code: true,
    name: true,
    isActive: true,
  } as const;

  constructor(private readonly prisma: PrismaService) {}

  async list(query: ItemGroupListQuery = {}) {
    const search = query.search?.trim();
    const rows = await this.prisma.inventoryItemGroup.findMany({
      where: {
        isActive: query.isActive === undefined || query.isActive === '' ? undefined : query.isActive === 'true',
        OR: search
          ? [
              { code: { contains: search, mode: 'insensitive' } },
              { name: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
              { parentGroup: { code: { contains: search, mode: 'insensitive' } } },
              { parentGroup: { name: { contains: search, mode: 'insensitive' } } },
            ]
          : undefined,
      },
      include: this.include(),
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });

    return rows.map((row) => this.mapGroup(row));
  }

  async getById(id: string) {
    const group = await this.getGroupWithDetailsOrThrow(id);
    return this.mapGroup(group);
  }

  async create(dto: CreateInventoryItemGroupDto) {
    const code = dto.code?.trim() || this.generateReference('IG');
    const [parentGroup, inventoryAccountId, cogsAccountId, salesAccountId, adjustmentAccountId] = await Promise.all([
      this.validateParentGroup(dto.parentGroupId),
      this.validateAccount(dto.inventoryAccountId, { label: 'Inventory account', allowedTypes: ['ASSET'] }),
      this.validateAccount(dto.cogsAccountId, { label: 'Cost of goods sold account', allowedTypes: ['EXPENSE'] }),
      this.validateAccount(dto.salesAccountId, { label: 'Sales account', allowedTypes: ['REVENUE'] }),
      this.validateAccount(dto.adjustmentAccountId, { label: 'Adjustment account' }),
    ]);

    const created = await this.prisma.inventoryItemGroup
      .create({
        data: {
          code,
          name: dto.name.trim(),
          description: dto.description?.trim() || null,
          parentGroupId: parentGroup?.id ?? null,
          inventoryAccountId,
          cogsAccountId,
          salesAccountId,
          adjustmentAccountId,
        },
        include: this.include(),
      })
      .catch((error: unknown) => {
        if (this.isCodeConflict(error)) {
          throw new ConflictException('An item group with this code already exists.');
        }
        throw error;
      });

    return this.mapGroup(created);
  }

  async update(id: string, dto: UpdateInventoryItemGroupDto) {
    const current = await this.getGroupOrThrow(id);
    if (!current.isActive) {
      throw new BadRequestException('Deactivated item groups cannot be edited.');
    }

    const [parentGroup, inventoryAccountId, cogsAccountId, salesAccountId, adjustmentAccountId] = await Promise.all([
      dto.parentGroupId !== undefined ? this.validateParentGroup(dto.parentGroupId || undefined, id) : undefined,
      dto.inventoryAccountId !== undefined
        ? this.validateAccount(dto.inventoryAccountId || undefined, { label: 'Inventory account', allowedTypes: ['ASSET'] })
        : undefined,
      dto.cogsAccountId !== undefined
        ? this.validateAccount(dto.cogsAccountId || undefined, { label: 'Cost of goods sold account', allowedTypes: ['EXPENSE'] })
        : undefined,
      dto.salesAccountId !== undefined
        ? this.validateAccount(dto.salesAccountId || undefined, { label: 'Sales account', allowedTypes: ['REVENUE'] })
        : undefined,
      dto.adjustmentAccountId !== undefined
        ? this.validateAccount(dto.adjustmentAccountId || undefined, { label: 'Adjustment account' })
        : undefined,
    ]);

    const updated = await this.prisma.inventoryItemGroup.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        description: dto.description === undefined ? undefined : dto.description.trim() || null,
        parentGroupId: dto.parentGroupId === undefined ? undefined : parentGroup?.id ?? null,
        inventoryAccountId,
        cogsAccountId,
        salesAccountId,
        adjustmentAccountId,
        isActive: dto.isActive,
      },
      include: this.include(),
    });

    return this.mapGroup(updated);
  }

  async deactivate(id: string) {
    await this.getGroupOrThrow(id);
    const updated = await this.prisma.inventoryItemGroup.update({
      where: { id },
      data: { isActive: false },
      include: this.include(),
    });

    return this.mapGroup(updated);
  }

  async ensureActiveGroup(id: string) {
    const group = await this.getGroupOrThrow(id);
    if (!group.isActive) {
      throw new BadRequestException('Item group must be active.');
    }
    return group;
  }

  private include() {
    return {
      parentGroup: { select: this.groupSelect },
      inventoryAccount: { select: this.accountSelect },
      cogsAccount: { select: this.accountSelect },
      salesAccount: { select: this.accountSelect },
      adjustmentAccount: { select: this.accountSelect },
      _count: { select: { categories: true, items: true, childGroups: true } },
    } as const;
  }

  private async getGroupOrThrow(id: string) {
    const group = await this.prisma.inventoryItemGroup.findUnique({ where: { id } });
    if (!group) throw new BadRequestException(`Item group ${id} was not found.`);
    return group;
  }

  private async getGroupWithDetailsOrThrow(id: string) {
    const group = await this.prisma.inventoryItemGroup.findUnique({ where: { id }, include: this.include() });
    if (!group) throw new BadRequestException(`Item group ${id} was not found.`);
    return group;
  }

  private async validateParentGroup(id?: string, currentId?: string) {
    if (!id) return null;
    if (id === currentId) throw new BadRequestException('An item group cannot be its own parent.');
    const group = await this.prisma.inventoryItemGroup.findUnique({ where: { id }, select: this.groupSelect });
    if (!group) throw new BadRequestException('Parent item group was not found.');
    if (!group.isActive) throw new BadRequestException('Parent item group must be active.');
    return group;
  }

  private async validateAccount(id: string | undefined, options: { label: string; allowedTypes?: string[] }) {
    if (!id) return null;
    const account = await this.prisma.account.findUnique({ where: { id }, select: this.accountSelect });
    if (!account) throw new BadRequestException(`${options.label} was not found.`);
    if (!account.isActive || !account.isPosting) {
      throw new BadRequestException(`${options.label} must be active and posting.`);
    }
    if (options.allowedTypes && !options.allowedTypes.includes(account.type)) {
      throw new BadRequestException(`${options.label} must be one of: ${options.allowedTypes.join(', ')}.`);
    }
    return account.id;
  }

  private mapGroup(row: Prisma.InventoryItemGroupGetPayload<{ include: ReturnType<ItemGroupsService['include']> }>) {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      parentGroupId: row.parentGroupId,
      parentGroup: row.parentGroup,
      isActive: row.isActive,
      status: row.isActive ? 'ACTIVE' : 'INACTIVE',
      inventoryAccount: row.inventoryAccount,
      cogsAccount: row.cogsAccount,
      salesAccount: row.salesAccount,
      adjustmentAccount: row.adjustmentAccount,
      categoryCount: row._count.categories,
      itemCount: row._count.items,
      childGroupCount: row._count.childGroups,
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
