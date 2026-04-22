import { Module } from '@nestjs/common';

import { AuditModule } from '../../../phase-1-accounting-foundation/accounting-core/audit/audit.module';
import { ItemMasterModule } from '../item-master/item-master.module';
import { InventoryPostingModule } from '../shared/inventory-posting.module';
import { WarehousesModule } from '../warehouses/warehouses.module';
import { AdjustmentsController } from './adjustments.controller';
import { AdjustmentsService } from './adjustments.service';

@Module({
  imports: [AuditModule, ItemMasterModule, WarehousesModule, InventoryPostingModule],
  controllers: [AdjustmentsController],
  providers: [AdjustmentsService],
  exports: [AdjustmentsService],
})
export class AdjustmentsModule {}
