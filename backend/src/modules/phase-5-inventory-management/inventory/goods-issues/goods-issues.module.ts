import { Module } from '@nestjs/common';

import { AuditModule } from '../../../phase-1-accounting-foundation/accounting-core/audit/audit.module';
import { ItemMasterModule } from '../item-master/item-master.module';
import { InventoryPostingModule } from '../shared/inventory-posting.module';
import { WarehousesModule } from '../warehouses/warehouses.module';
import { GoodsIssuesController } from './goods-issues.controller';
import { GoodsIssuesService } from './goods-issues.service';

@Module({
  imports: [AuditModule, ItemMasterModule, WarehousesModule, InventoryPostingModule],
  controllers: [GoodsIssuesController],
  providers: [GoodsIssuesService],
  exports: [GoodsIssuesService],
})
export class GoodsIssuesModule {}
