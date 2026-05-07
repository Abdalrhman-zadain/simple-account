import { Module } from '@nestjs/common';

import { ItemGroupsController } from './item-groups.controller';
import { ItemGroupsService } from './item-groups.service';

@Module({
  controllers: [ItemGroupsController],
  providers: [ItemGroupsService],
  exports: [ItemGroupsService],
})
export class ItemGroupsModule {}
