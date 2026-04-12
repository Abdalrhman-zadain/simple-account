import { Module } from '@nestjs/common';

import { PrismaModule } from './common/prisma/prisma.module';
import { AccountingCoreModule } from './modules/phase-1-accounting-foundation/accounting-core/accounting-core.module';
import { AuthModule } from './modules/platform/auth/auth.module';

@Module({
  imports: [PrismaModule, AccountingCoreModule, AuthModule],
})
export class AppModule { }
