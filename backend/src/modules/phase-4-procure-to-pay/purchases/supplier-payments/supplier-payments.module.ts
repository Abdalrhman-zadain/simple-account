import { Module } from '@nestjs/common';

import { PrismaModule } from '../../../../common/prisma/prisma.module';
import { AuditModule } from '../../../phase-1-accounting-foundation/accounting-core/audit/audit.module';
import { ReversalControlModule } from '../../../phase-1-accounting-foundation/accounting-core/reversal-control/reversal-control.module';
import { BankCashTransactionsModule } from '../../../phase-2-bank-cash-management/bank-cash-transactions/bank-cash-transactions.module';
import { SupplierPaymentsController } from './supplier-payments.controller';
import { SupplierPaymentsService } from './supplier-payments.service';
import { SuppliersModule } from '../suppliers/suppliers.module';

@Module({
  imports: [PrismaModule, SuppliersModule, BankCashTransactionsModule, ReversalControlModule, AuditModule],
  controllers: [SupplierPaymentsController],
  providers: [SupplierPaymentsService],
  exports: [SupplierPaymentsService],
})
export class SupplierPaymentsModule {}
