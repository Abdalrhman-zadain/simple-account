import { Module } from '@nestjs/common';

import { PrismaModule } from './common/prisma/prisma.module';
import { AccountingCoreModule } from './modules/accounting-core/accounting-core.module';

@Module({
  imports: [PrismaModule, AccountingCoreModule],
})
export class AppModule {}
