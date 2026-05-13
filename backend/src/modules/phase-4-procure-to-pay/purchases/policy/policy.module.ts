import { Module } from '@nestjs/common';

import { PrismaModule } from '../../../../common/prisma/prisma.module';
import { PurchasePolicyController } from './policy.controller';
import { PurchasePolicyService } from './policy.service';

@Module({
  imports: [PrismaModule],
  controllers: [PurchasePolicyController],
  providers: [PurchasePolicyService],
  exports: [PurchasePolicyService],
})
export class PurchasePolicyModule {}
