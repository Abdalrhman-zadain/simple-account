import { Module } from '@nestjs/common';

import { AuditModule } from './audit/audit.module';
import { ChartOfAccountsModule } from './chart-of-accounts/chart-of-accounts.module';
import { FiscalModule } from './fiscal/fiscal.module';
import { GeneralLedgerModule } from './general-ledger/general-ledger.module';
import { JournalEntriesController } from './journal-entries/journal-entries.controller';
import { JournalEntriesModule } from './journal-entries/journal-entries.module';
import { MasterDataModule } from './master-data/segments.module';
import { PostingLogicModule } from './posting-logic/posting-logic.module';
import { ReversalControlModule } from './reversal-control/reversal-control.module';
import { ValidationRulesModule } from './validation-rules/validation-rules.module';

@Module({
  imports: [
    ValidationRulesModule,
    ChartOfAccountsModule,
    JournalEntriesModule,
    PostingLogicModule,
    ReversalControlModule,
    GeneralLedgerModule,
    MasterDataModule,
    FiscalModule,
    AuditModule,
  ],
  controllers: [JournalEntriesController],
  providers: [],
  exports: [
    ValidationRulesModule,
    ChartOfAccountsModule,
    JournalEntriesModule,
    PostingLogicModule,
    ReversalControlModule,
    GeneralLedgerModule,
    MasterDataModule,
    FiscalModule,
    AuditModule,
  ],
})
export class AccountingCoreModule { }
