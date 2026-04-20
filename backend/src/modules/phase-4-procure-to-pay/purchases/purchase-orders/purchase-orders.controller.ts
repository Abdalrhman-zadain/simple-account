import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../../../platform/auth/guards/jwt-auth.guard';
import { CreatePurchaseOrderDto, UpdatePurchaseOrderDto } from './dto/purchase-orders.dto';
import { PurchaseOrdersService } from './purchase-orders.service';

@UseGuards(JwtAuthGuard)
@Controller('purchases/purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly service: PurchaseOrdersService) {}

  @Get()
  list(
    @Query('status') status?: string,
    @Query('supplierId') supplierId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('search') search?: string,
  ) {
    return this.service.list({ status, supplierId, dateFrom, dateTo, search });
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Post()
  create(@Body() dto: CreatePurchaseOrderDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePurchaseOrderDto) {
    return this.service.update(id, dto);
  }

  @Post(':id/issue')
  issue(@Param('id') id: string) {
    return this.service.issue(id);
  }

  @Post(':id/mark-partially-received')
  markPartiallyReceived(@Param('id') id: string) {
    return this.service.markPartiallyReceived(id);
  }

  @Post(':id/mark-fully-received')
  markFullyReceived(@Param('id') id: string) {
    return this.service.markFullyReceived(id);
  }

  @Post(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.service.cancel(id);
  }

  @Post(':id/close')
  close(@Param('id') id: string) {
    return this.service.close(id);
  }
}
