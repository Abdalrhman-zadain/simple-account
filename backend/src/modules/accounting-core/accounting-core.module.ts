import { Module } from '@nestjs/common';

import { AccountsController } from './accounts/accounts.controller';
import { AccountsService } from './accounts/accounts.service';
import { GeneralLedgerController } from './general-ledger/general-ledger.controller';
import { GeneralLedgerService } from './general-ledger/general-ledger.service';
import { JournalEntriesController } from './journal-entries/journal-entries.controller';
import { JournalEntriesService } from './journal-entries/journal-entries.service';
import { PostingService } from './posting/posting.service';
import { ReversalService } from './reversal/reversal.service';
import { ReferenceService } from './shared/reference.service';

@Module({
  controllers: [
    AccountsController,
    JournalEntriesController,
    GeneralLedgerController,
  ],
  providers: [
    AccountsService,
    JournalEntriesService,
    GeneralLedgerService,
    PostingService,
    ReversalService,
    ReferenceService,
  ],
})
export class AccountingCoreModule {}
