import { Module } from '@nestjs/common';

import { InventoryPolicyController } from './policy.controller';
import { InventoryPolicyService } from './policy.service';

@Module({
  controllers: [InventoryPolicyController],
  providers: [InventoryPolicyService],
  exports: [InventoryPolicyService],
})
export class InventoryPolicyModule {}
