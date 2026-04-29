import { Module } from '@nestjs/common';

import { PrismaModule } from '../../../common/prisma/prisma.module';
import { ChartOfAccountsModule } from '../../phase-1-accounting-foundation/accounting-core/chart-of-accounts/chart-of-accounts.module';
import { JournalEntriesModule } from '../../phase-1-accounting-foundation/accounting-core/journal-entries/journal-entries.module';
import { PostingLogicModule } from '../../phase-1-accounting-foundation/accounting-core/posting-logic/posting-logic.module';
import { BankCashAccountsController } from './bank-cash-accounts.controller';
import { BankCashAccountsService } from './bank-cash-accounts.service';

@Module({
  imports: [PrismaModule, ChartOfAccountsModule, JournalEntriesModule, PostingLogicModule],
  controllers: [BankCashAccountsController],
  providers: [BankCashAccountsService],
  exports: [BankCashAccountsService],
})
export class BankCashAccountsModule {}
