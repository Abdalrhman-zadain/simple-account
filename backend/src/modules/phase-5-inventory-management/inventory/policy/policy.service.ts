import { Injectable } from '@nestjs/common';
import { InventoryCostingMethod } from '../../../../generated/prisma';

import { PrismaService } from '../../../../common/prisma/prisma.service';
import { UpdateInventoryPolicyDto } from './dto/update-inventory-policy.dto';

const DEFAULT_POLICY_ID = 'default';

@Injectable()
export class InventoryPolicyService {
  constructor(private readonly prisma: PrismaService) {}

  async getPolicy() {
    const row = await this.ensurePolicy();
    return this.mapPolicy(row);
  }

  async updatePolicy(dto: UpdateInventoryPolicyDto) {
    const updated = await this.prisma.inventoryPolicy.upsert({
      where: { id: DEFAULT_POLICY_ID },
      update: {
        costingMethod: dto.costingMethod,
      },
      create: {
        id: DEFAULT_POLICY_ID,
        costingMethod: dto.costingMethod,
      },
    });

    return this.mapPolicy(updated);
  }

  async getCostingMethodOrDefault(fallback: InventoryCostingMethod) {
    const row = await this.prisma.inventoryPolicy.findUnique({
      where: { id: DEFAULT_POLICY_ID },
      select: { costingMethod: true },
    });
    return row?.costingMethod ?? fallback;
  }

  private async ensurePolicy() {
    return this.prisma.inventoryPolicy.upsert({
      where: { id: DEFAULT_POLICY_ID },
      update: {},
      create: {
        id: DEFAULT_POLICY_ID,
        costingMethod: InventoryCostingMethod.WEIGHTED_AVERAGE,
      },
    });
  }

  private mapPolicy(row: { id: string; costingMethod: InventoryCostingMethod; createdAt: Date; updatedAt: Date }) {
    return {
      id: row.id,
      costingMethod: row.costingMethod,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
