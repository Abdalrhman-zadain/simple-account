import { Module } from '@nestjs/common';

import { PrismaModule } from '../../../common/prisma/prisma.module';
import { JournalEntriesModule } from '../../phase-1-accounting-foundation/accounting-core/journal-entries/journal-entries.module';
import { PostingLogicModule } from '../../phase-1-accounting-foundation/accounting-core/posting-logic/posting-logic.module';
import { BankCashTransactionsController } from './bank-cash-transactions.controller';
import { BankCashTransactionsService } from './bank-cash-transactions.service';

@Module({
  imports: [PrismaModule, JournalEntriesModule, PostingLogicModule],
  controllers: [BankCashTransactionsController],
  providers: [BankCashTransactionsService],
  exports: [BankCashTransactionsService],
})
export class BankCashTransactionsModule {}
