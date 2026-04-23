import { Module } from "@nestjs/common";

import { PrismaModule } from "../../../common/prisma/prisma.module";
import { AuditModule } from "../../phase-1-accounting-foundation/accounting-core/audit/audit.module";
import { JournalEntriesModule } from "../../phase-1-accounting-foundation/accounting-core/journal-entries/journal-entries.module";
import { FixedAssetsController } from "./fixed-assets.controller";
import { FixedAssetsService } from "./fixed-assets.service";

@Module({
  imports: [PrismaModule, AuditModule, JournalEntriesModule],
  controllers: [FixedAssetsController],
  providers: [FixedAssetsService],
  exports: [FixedAssetsService],
})
export class FixedAssetsModule {}
