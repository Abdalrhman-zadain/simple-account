import { Module } from '@nestjs/common';

import { PrismaModule } from '../../../../common/prisma/prisma.module';
import { ItemCategoriesModule } from '../item-categories/item-categories.module';
import { ItemGroupsModule } from '../item-groups/item-groups.module';
import { UnitsOfMeasureModule } from '../units-of-measure/units-of-measure.module';
import { ItemMasterController } from './item-master.controller';
import { ItemMasterService } from './item-master.service';

@Module({
  imports: [PrismaModule, ItemGroupsModule, ItemCategoriesModule, UnitsOfMeasureModule],
  controllers: [ItemMasterController],
  providers: [ItemMasterService],
  exports: [ItemMasterService],
})
export class ItemMasterModule {}
