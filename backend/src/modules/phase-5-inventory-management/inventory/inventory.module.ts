import { Module } from '@nestjs/common';

import { AdjustmentsModule } from './adjustments/adjustments.module';
import { GoodsIssuesModule } from './goods-issues/goods-issues.module';
import { GoodsReceiptsModule } from './goods-receipts/goods-receipts.module';
import { ItemCategoriesModule } from './item-categories/item-categories.module';
import { ItemGroupsModule } from './item-groups/item-groups.module';
import { ItemMasterModule } from './item-master/item-master.module';
import { InventoryPolicyModule } from './policy/policy.module';
import { StockLedgerModule } from './stock-ledger/stock-ledger.module';
import { TransfersModule } from './transfers/transfers.module';
import { UnitsOfMeasureModule } from './units-of-measure/units-of-measure.module';
import { WarehousesModule } from './warehouses/warehouses.module';

@Module({
  imports: [
    ItemMasterModule,
    ItemGroupsModule,
    ItemCategoriesModule,
    UnitsOfMeasureModule,
    InventoryPolicyModule,
    WarehousesModule,
    GoodsReceiptsModule,
    GoodsIssuesModule,
    TransfersModule,
    AdjustmentsModule,
    StockLedgerModule,
  ],
  controllers: [],
  providers: [],
  exports: [],
})
export class InventoryModule {}
