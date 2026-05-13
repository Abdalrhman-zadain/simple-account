import { Module } from '@nestjs/common';
import { DebitNotesModule } from './debit-notes/debit-notes.module';
import { PurchaseInvoicesModule } from './purchase-invoices/purchase-invoices.module';
import { PurchaseOrdersModule } from './purchase-orders/purchase-orders.module';
import { PurchaseReceiptsModule } from './purchase-receipts/purchase-receipts.module';
import { PurchaseRequestsModule } from './purchase-requests/purchase-requests.module';
import { SupplierPaymentsModule } from './supplier-payments/supplier-payments.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { PaymentTermsController } from './payment-terms.controller';
import { PaymentTermsService } from './payment-terms.service';
import { PurchasePolicyModule } from './policy/policy.module';

@Module({
  imports: [SuppliersModule, PurchaseRequestsModule, PurchaseOrdersModule, PurchaseReceiptsModule, PurchaseInvoicesModule, SupplierPaymentsModule, DebitNotesModule, PurchasePolicyModule],
  controllers: [PaymentTermsController],
  providers: [PaymentTermsService],
  exports: [PaymentTermsService],
})
export class PurchasesModule {}
