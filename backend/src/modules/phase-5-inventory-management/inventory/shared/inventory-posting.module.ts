import { Module } from '@nestjs/common';

import { JournalEntriesModule } from '../../../phase-1-accounting-foundation/accounting-core/journal-entries/journal-entries.module';
import { PostingLogicModule } from '../../../phase-1-accounting-foundation/accounting-core/posting-logic/posting-logic.module';
import { InventoryPolicyModule } from '../policy/policy.module';
import { InventoryPostingService } from './inventory-posting.service';

@Module({
  imports: [JournalEntriesModule, PostingLogicModule, InventoryPolicyModule],
  providers: [InventoryPostingService],
  exports: [InventoryPostingService],
})
export class InventoryPostingModule {}
