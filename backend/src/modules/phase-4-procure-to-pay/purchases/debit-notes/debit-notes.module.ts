import { Module } from '@nestjs/common';

import { PrismaModule } from '../../../../common/prisma/prisma.module';
import { AuditModule } from '../../../phase-1-accounting-foundation/accounting-core/audit/audit.module';
import { JournalEntriesModule } from '../../../phase-1-accounting-foundation/accounting-core/journal-entries/journal-entries.module';
import { PostingLogicModule } from '../../../phase-1-accounting-foundation/accounting-core/posting-logic/posting-logic.module';
import { ReversalControlModule } from '../../../phase-1-accounting-foundation/accounting-core/reversal-control/reversal-control.module';
import { DebitNotesController } from './debit-notes.controller';
import { DebitNotesService } from './debit-notes.service';
import { SuppliersModule } from '../suppliers/suppliers.module';

@Module({
  imports: [PrismaModule, SuppliersModule, JournalEntriesModule, PostingLogicModule, ReversalControlModule, AuditModule],
  controllers: [DebitNotesController],
  providers: [DebitNotesService],
  exports: [DebitNotesService],
})
export class DebitNotesModule {}
