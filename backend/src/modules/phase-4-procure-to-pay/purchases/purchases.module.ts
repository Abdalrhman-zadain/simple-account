import { Module } from '@nestjs/common';
import { DebitNotesModule } from './debit-notes/debit-notes.module';
import { PurchaseInvoicesModule } from './purchase-invoices/purchase-invoices.module';
import { PurchaseOrdersModule } from './purchase-orders/purchase-orders.module';
import { PurchaseRequestsModule } from './purchase-requests/purchase-requests.module';
import { SupplierPaymentsModule } from './supplier-payments/supplier-payments.module';
import { SuppliersModule } from './suppliers/suppliers.module';

@Module({
  imports: [SuppliersModule, PurchaseRequestsModule, PurchaseOrdersModule, PurchaseInvoicesModule, SupplierPaymentsModule, DebitNotesModule],
  controllers: [],
  providers: [],
  exports: [],
})
export class PurchasesModule {}
