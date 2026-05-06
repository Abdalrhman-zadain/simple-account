import { Module } from '@nestjs/common';

import { PrismaModule } from '../../common/prisma/prisma.module';
import { BankCashTransactionsModule } from '../phase-2-bank-cash-management/bank-cash-transactions/bank-cash-transactions.module';
import { ChartOfAccountsModule } from '../phase-1-accounting-foundation/accounting-core/chart-of-accounts/chart-of-accounts.module';
import { JournalEntriesModule } from '../phase-1-accounting-foundation/accounting-core/journal-entries/journal-entries.module';
import { PostingLogicModule } from '../phase-1-accounting-foundation/accounting-core/posting-logic/posting-logic.module';
import { SalesReceivablesController } from './sales-receivables.controller';
import { SalesReceivablesService } from './sales-receivables.service';

@Module({
  imports: [PrismaModule, BankCashTransactionsModule, ChartOfAccountsModule, JournalEntriesModule, PostingLogicModule],
  controllers: [SalesReceivablesController],
  providers: [SalesReceivablesService],
  exports: [SalesReceivablesService],
})
export class SalesReceivablesModule {}
