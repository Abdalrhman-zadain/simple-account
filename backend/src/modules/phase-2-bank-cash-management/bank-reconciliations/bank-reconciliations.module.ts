import { Module } from '@nestjs/common';

import { PrismaModule } from '../../../common/prisma/prisma.module';
import { BankReconciliationsController } from './bank-reconciliations.controller';
import { BankReconciliationsService } from './bank-reconciliations.service';

@Module({
  imports: [PrismaModule],
  controllers: [BankReconciliationsController],
  providers: [BankReconciliationsService],
  exports: [BankReconciliationsService],
})
export class BankReconciliationsModule {}
