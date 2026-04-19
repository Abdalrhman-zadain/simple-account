import { Module } from '@nestjs/common';

import { PrismaModule } from '../../common/prisma/prisma.module';
import { JournalEntriesModule } from '../phase-1-accounting-foundation/accounting-core/journal-entries/journal-entries.module';
import { PostingLogicModule } from '../phase-1-accounting-foundation/accounting-core/posting-logic/posting-logic.module';
import { SalesReceivablesController } from './sales-receivables.controller';
import { SalesReceivablesService } from './sales-receivables.service';

@Module({
  imports: [PrismaModule, JournalEntriesModule, PostingLogicModule],
  controllers: [SalesReceivablesController],
  providers: [SalesReceivablesService],
  exports: [SalesReceivablesService],
})
export class SalesReceivablesModule {}

