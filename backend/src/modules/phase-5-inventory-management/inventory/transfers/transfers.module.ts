import { Module } from '@nestjs/common';

import { AuditModule } from '../../../phase-1-accounting-foundation/accounting-core/audit/audit.module';
import { ItemMasterModule } from '../item-master/item-master.module';
import { InventoryPostingModule } from '../shared/inventory-posting.module';
import { WarehousesModule } from '../warehouses/warehouses.module';
import { TransfersController } from './transfers.controller';
import { TransfersService } from './transfers.service';

@Module({
  imports: [AuditModule, ItemMasterModule, WarehousesModule, InventoryPostingModule],
  controllers: [TransfersController],
  providers: [TransfersService],
  exports: [TransfersService],
})
export class TransfersModule {}
