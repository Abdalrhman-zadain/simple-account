import { Module } from '@nestjs/common';

import { PrismaModule } from '../../../../common/prisma/prisma.module';
import { FiscalModule } from '../fiscal/fiscal.module';
import { ValidationRulesModule } from '../validation-rules/validation-rules.module';
import { JournalEntriesService } from './journal-entries.service';

@Module({
  imports: [PrismaModule, FiscalModule, ValidationRulesModule],
  providers: [JournalEntriesService],
  exports: [JournalEntriesService],
})
export class JournalEntriesModule {}
