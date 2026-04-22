import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../../../platform/auth/guards/jwt-auth.guard';
import { CreateInventoryAdjustmentDto, UpdateInventoryAdjustmentDto } from './dto/adjustments.dto';
import { AdjustmentsService } from './adjustments.service';

@UseGuards(JwtAuthGuard)
@Controller('inventory/adjustments')
export class AdjustmentsController {
  constructor(private readonly service: AdjustmentsService) {}

  @Get()
  list(
    @Query('status') status?: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('reason') reason?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('search') search?: string,
  ) {
    return this.service.list({ status, warehouseId, reason, dateFrom, dateTo, search });
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Post()
  create(@Body() dto: CreateInventoryAdjustmentDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateInventoryAdjustmentDto) {
    return this.service.update(id, dto);
  }

  @Post(':id/post')
  post(@Param('id') id: string) {
    return this.service.post(id);
  }

  @Post(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.service.cancel(id);
  }

  @Post(':id/reverse')
  reverse(@Param('id') id: string) {
    return this.service.reverse(id);
  }
}
