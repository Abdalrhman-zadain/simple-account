import { Module } from '@nestjs/common';

import { PrismaModule } from '../../../../common/prisma/prisma.module';
import { StockLedgerController } from './stock-ledger.controller';
import { StockLedgerService } from './stock-ledger.service';

@Module({
  imports: [PrismaModule],
  controllers: [StockLedgerController],
  providers: [StockLedgerService],
  exports: [StockLedgerService],
})
export class StockLedgerModule {}
