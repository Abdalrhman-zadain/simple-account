import { Module } from '@nestjs/common';
import { PurchaseOrdersModule } from './purchase-orders/purchase-orders.module';
import { PurchaseRequestsModule } from './purchase-requests/purchase-requests.module';
import { SuppliersModule } from './suppliers/suppliers.module';

@Module({
  imports: [SuppliersModule, PurchaseRequestsModule, PurchaseOrdersModule],
  controllers: [],
  providers: [],
  exports: [],
})
export class PurchasesModule {}
