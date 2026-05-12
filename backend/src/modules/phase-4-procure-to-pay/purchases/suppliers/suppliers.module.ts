import { Module } from '@nestjs/common';

import { PrismaModule } from '../../../../common/prisma/prisma.module';
import { ChartOfAccountsModule } from '../../../phase-1-accounting-foundation/accounting-core/chart-of-accounts/chart-of-accounts.module';
import { SuppliersController } from './suppliers.controller';
import { SuppliersService } from './suppliers.service';

@Module({
  imports: [PrismaModule, ChartOfAccountsModule],
  controllers: [SuppliersController],
  providers: [SuppliersService],
  exports: [SuppliersService],
})
export class SuppliersModule {}
