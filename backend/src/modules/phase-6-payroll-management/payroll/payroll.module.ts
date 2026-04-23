import { Module } from "@nestjs/common";

import { PrismaModule } from "../../../common/prisma/prisma.module";
import { BankCashTransactionsModule } from "../../phase-2-bank-cash-management/bank-cash-transactions/bank-cash-transactions.module";
import { JournalEntriesModule } from "../../phase-1-accounting-foundation/accounting-core/journal-entries/journal-entries.module";
import { PostingLogicModule } from "../../phase-1-accounting-foundation/accounting-core/posting-logic/posting-logic.module";
import { ReversalControlModule } from "../../phase-1-accounting-foundation/accounting-core/reversal-control/reversal-control.module";
import { PayrollController } from "./payroll.controller";
import { PayrollService } from "./payroll.service";

@Module({
  imports: [
    PrismaModule,
    JournalEntriesModule,
    PostingLogicModule,
    ReversalControlModule,
    BankCashTransactionsModule,
  ],
  controllers: [PayrollController],
  providers: [PayrollService],
  exports: [PayrollService],
})
export class PayrollModule {}
