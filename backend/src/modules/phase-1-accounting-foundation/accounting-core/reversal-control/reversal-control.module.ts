import { Module } from '@nestjs/common';

import { PrismaModule } from '../../../../common/prisma/prisma.module';
import { JournalEntriesModule } from '../journal-entries/journal-entries.module';
import { ValidationRulesModule } from '../validation-rules/validation-rules.module';
import { ReversalService } from './reversal.service';

@Module({
  imports: [PrismaModule, JournalEntriesModule, ValidationRulesModule],
  providers: [ReversalService],
  exports: [ReversalService],
})
export class ReversalControlModule {}
