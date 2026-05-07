import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../../../platform/auth/guards/jwt-auth.guard';
import { CreateInventoryItemCategoryDto, UpdateInventoryItemCategoryDto } from './dto/item-categories.dto';
import { ItemCategoriesService } from './item-categories.service';

@UseGuards(JwtAuthGuard)
@Controller('inventory/item-categories')
export class ItemCategoriesController {
  constructor(private readonly service: ItemCategoriesService) {}

  @Get()
  list(
    @Query('isActive') isActive?: string,
    @Query('itemGroupId') itemGroupId?: string,
    @Query('search') search?: string,
  ) {
    return this.service.list({ isActive, itemGroupId, search });
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Post()
  create(@Body() dto: CreateInventoryItemCategoryDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateInventoryItemCategoryDto) {
    return this.service.update(id, dto);
  }

  @Post(':id/deactivate')
  deactivate(@Param('id') id: string) {
    return this.service.deactivate(id);
  }
}
