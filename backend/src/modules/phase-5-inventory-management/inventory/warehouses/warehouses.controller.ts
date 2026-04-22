import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../../../platform/auth/guards/jwt-auth.guard';
import { CreateInventoryWarehouseDto } from './dto/create-inventory-warehouse.dto';
import { UpdateInventoryWarehouseDto } from './dto/update-inventory-warehouse.dto';
import { WarehousesService } from './warehouses.service';

@UseGuards(JwtAuthGuard)
@Controller('inventory/warehouses')
export class WarehousesController {
  constructor(private readonly service: WarehousesService) {}

  @Get()
  list(
    @Query('isActive') isActive?: string,
    @Query('isTransit') isTransit?: string,
    @Query('search') search?: string,
  ) {
    return this.service.list({ isActive, isTransit, search });
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Post()
  create(@Body() dto: CreateInventoryWarehouseDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateInventoryWarehouseDto) {
    return this.service.update(id, dto);
  }

  @Post(':id/deactivate')
  deactivate(@Param('id') id: string) {
    return this.service.deactivate(id);
  }
}
