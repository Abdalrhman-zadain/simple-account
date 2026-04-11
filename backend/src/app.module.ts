import { Module } from '@nestjs/common';

import { PrismaModule } from './common/prisma/prisma.module';
import { AccountingCoreModule } from './modules/accounting-core/accounting-core.module';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [PrismaModule, AccountingCoreModule, AuthModule],
})
export class AppModule { }
