import { Module } from '@nestjs/common';
import { PurchaseRequestsModule } from './purchase-requests/purchase-requests.module';
import { SuppliersModule } from './suppliers/suppliers.module';

@Module({
  imports: [SuppliersModule, PurchaseRequestsModule],
  controllers: [],
  providers: [],
  exports: [],
})
export class PurchasesModule {}
