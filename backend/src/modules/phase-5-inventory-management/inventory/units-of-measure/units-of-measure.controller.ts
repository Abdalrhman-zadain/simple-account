import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../../../platform/auth/guards/jwt-auth.guard';
import { CreateInventoryUnitOfMeasureDto, UpdateInventoryUnitOfMeasureDto } from './dto/units-of-measure.dto';
import { UnitsOfMeasureService } from './units-of-measure.service';

@UseGuards(JwtAuthGuard)
@Controller('inventory/units-of-measure')
export class UnitsOfMeasureController {
  constructor(private readonly service: UnitsOfMeasureService) {}

  @Get()
  list(@Query('isActive') isActive?: string, @Query('search') search?: string) {
    return this.service.list({ isActive, search });
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Post()
  create(@Body() dto: CreateInventoryUnitOfMeasureDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateInventoryUnitOfMeasureDto) {
    return this.service.update(id, dto);
  }

  @Post(':id/deactivate')
  deactivate(@Param('id') id: string) {
    return this.service.deactivate(id);
  }
}
