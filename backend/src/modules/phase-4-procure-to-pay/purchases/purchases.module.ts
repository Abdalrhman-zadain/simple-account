import { Module } from '@nestjs/common';
import { PurchaseInvoicesModule } from './purchase-invoices/purchase-invoices.module';
import { PurchaseOrdersModule } from './purchase-orders/purchase-orders.module';
import { PurchaseRequestsModule } from './purchase-requests/purchase-requests.module';
import { SuppliersModule } from './suppliers/suppliers.module';

@Module({
  imports: [SuppliersModule, PurchaseRequestsModule, PurchaseOrdersModule, PurchaseInvoicesModule],
  controllers: [],
  providers: [],
  exports: [],
})
export class PurchasesModule {}
