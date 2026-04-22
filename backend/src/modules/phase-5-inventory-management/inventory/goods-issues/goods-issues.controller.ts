import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../../../platform/auth/guards/jwt-auth.guard';
import { CreateInventoryGoodsIssueDto, UpdateInventoryGoodsIssueDto } from './dto/goods-issues.dto';
import { GoodsIssuesService } from './goods-issues.service';

@UseGuards(JwtAuthGuard)
@Controller('inventory/goods-issues')
export class GoodsIssuesController {
  constructor(private readonly service: GoodsIssuesService) {}

  @Get()
  list(
    @Query('status') status?: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.list({ status, warehouseId, dateFrom, dateTo, search, page, limit });
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Post()
  create(@Body() dto: CreateInventoryGoodsIssueDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateInventoryGoodsIssueDto) {
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
