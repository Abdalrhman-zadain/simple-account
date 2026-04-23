import { Module } from '@nestjs/common';

import { PrismaModule } from './common/prisma/prisma.module';
import { AccountingCoreModule } from './modules/phase-1-accounting-foundation/accounting-core/accounting-core.module';
import { BankCashAccountsModule } from './modules/phase-2-bank-cash-management/bank-cash-accounts/bank-cash-accounts.module';
import { BankReconciliationsModule } from './modules/phase-2-bank-cash-management/bank-reconciliations/bank-reconciliations.module';
import { BankCashTransactionsModule } from './modules/phase-2-bank-cash-management/bank-cash-transactions/bank-cash-transactions.module';
import { SalesReceivablesModule } from './modules/phase-3-sales-receivables/sales-receivables.module';
import { PurchasesModule } from './modules/phase-4-procure-to-pay/purchases/purchases.module';
import { InventoryModule } from './modules/phase-5-inventory-management/inventory/inventory.module';
import { PayrollModule } from './modules/phase-6-payroll-management/payroll/payroll.module';
import { FixedAssetsModule } from './modules/phase-7-fixed-assets-management/fixed-assets/fixed-assets.module';
import { AuthModule } from './modules/platform/auth/auth.module';

@Module({
  imports: [
    PrismaModule,
    AccountingCoreModule,
    BankCashAccountsModule,
    BankCashTransactionsModule,
    BankReconciliationsModule,
    SalesReceivablesModule,
    PurchasesModule,
    InventoryModule,
    PayrollModule,
    FixedAssetsModule,
    AuthModule,
  ],
})
export class AppModule { }
