import { Module } from '@nestjs/common';

import { PrismaModule } from './common/prisma/prisma.module';
import { AccountingCoreModule } from './modules/phase-1-accounting-foundation/accounting-core/accounting-core.module';
import { BankCashAccountsModule } from './modules/phase-2-bank-cash-management/bank-cash-accounts/bank-cash-accounts.module';
import { AuthModule } from './modules/platform/auth/auth.module';

@Module({
  imports: [PrismaModule, AccountingCoreModule, BankCashAccountsModule, AuthModule],
})
export class AppModule { }
