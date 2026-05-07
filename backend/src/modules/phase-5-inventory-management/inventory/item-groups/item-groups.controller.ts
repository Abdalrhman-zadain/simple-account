import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../../../platform/auth/guards/jwt-auth.guard';
import { CreateInventoryItemGroupDto, UpdateInventoryItemGroupDto } from './dto/item-groups.dto';
import { ItemGroupsService } from './item-groups.service';

@UseGuards(JwtAuthGuard)
@Controller('inventory/item-groups')
export class ItemGroupsController {
  constructor(private readonly service: ItemGroupsService) {}

  @Get()
  list(@Query('isActive') isActive?: string, @Query('search') search?: string) {
    return this.service.list({ isActive, search });
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Post()
  create(@Body() dto: CreateInventoryItemGroupDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateInventoryItemGroupDto) {
    return this.service.update(id, dto);
  }

  @Post(':id/deactivate')
  deactivate(@Param('id') id: string) {
    return this.service.deactivate(id);
  }
}
