import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../../../platform/auth/guards/jwt-auth.guard';
import { CreateInventoryTransferDto, UpdateInventoryTransferDto } from './dto/transfers.dto';
import { TransfersService } from './transfers.service';

@UseGuards(JwtAuthGuard)
@Controller('inventory/transfers')
export class TransfersController {
  constructor(private readonly service: TransfersService) {}

  @Get()
  list(
    @Query('status') status?: string,
    @Query('sourceWarehouseId') sourceWarehouseId?: string,
    @Query('destinationWarehouseId') destinationWarehouseId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.list({ status, sourceWarehouseId, destinationWarehouseId, dateFrom, dateTo, search, page, limit });
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Post()
  create(@Body() dto: CreateInventoryTransferDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateInventoryTransferDto) {
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
