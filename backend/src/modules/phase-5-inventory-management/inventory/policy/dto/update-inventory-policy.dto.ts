import { IsEnum } from 'class-validator';

import { InventoryCostingMethod } from '../../../../../generated/prisma';

export class UpdateInventoryPolicyDto {
  @IsEnum(InventoryCostingMethod)
  costingMethod!: InventoryCostingMethod;
}
