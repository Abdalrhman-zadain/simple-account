import { Module } from '@nestjs/common';

import { PrismaModule } from '../../../common/prisma/prisma.module';
import { BankCashAccountsController } from './bank-cash-accounts.controller';
import { BankCashAccountsService } from './bank-cash-accounts.service';

@Module({
  imports: [PrismaModule],
  controllers: [BankCashAccountsController],
  providers: [BankCashAccountsService],
  exports: [BankCashAccountsService],
})
export class BankCashAccountsModule {}
