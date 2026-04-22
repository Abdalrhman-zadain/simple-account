import { Module } from '@nestjs/common';

import { PrismaModule } from '../../../../common/prisma/prisma.module';
import { ItemMasterController } from './item-master.controller';
import { ItemMasterService } from './item-master.service';

@Module({
  imports: [PrismaModule],
  controllers: [ItemMasterController],
  providers: [ItemMasterService],
  exports: [ItemMasterService],
})
export class ItemMasterModule {}
