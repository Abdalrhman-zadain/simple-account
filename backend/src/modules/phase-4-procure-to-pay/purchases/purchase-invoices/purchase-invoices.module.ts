import { Module } from '@nestjs/common';

import { PrismaModule } from '../../../../common/prisma/prisma.module';
import { AuditModule } from '../../../phase-1-accounting-foundation/accounting-core/audit/audit.module';
import { JournalEntriesModule } from '../../../phase-1-accounting-foundation/accounting-core/journal-entries/journal-entries.module';
import { PostingLogicModule } from '../../../phase-1-accounting-foundation/accounting-core/posting-logic/posting-logic.module';
import { ReversalControlModule } from '../../../phase-1-accounting-foundation/accounting-core/reversal-control/reversal-control.module';
import { InventoryPostingModule } from '../../../phase-5-inventory-management/inventory/shared/inventory-posting.module';
import { PurchaseInvoicesController } from './purchase-invoices.controller';
import { PurchaseInvoicesService } from './purchase-invoices.service';
import { SuppliersModule } from '../suppliers/suppliers.module';

@Module({
  imports: [PrismaModule, SuppliersModule, JournalEntriesModule, PostingLogicModule, ReversalControlModule, InventoryPostingModule, AuditModule],
  controllers: [PurchaseInvoicesController],
  providers: [PurchaseInvoicesService],
  exports: [PurchaseInvoicesService],
})
export class PurchaseInvoicesModule {}
