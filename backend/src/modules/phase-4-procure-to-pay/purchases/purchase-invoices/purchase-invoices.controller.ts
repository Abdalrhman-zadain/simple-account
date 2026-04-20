import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../../../platform/auth/guards/jwt-auth.guard';
import { CreatePurchaseInvoiceDto, UpdatePurchaseInvoiceDto } from './dto/purchase-invoices.dto';
import { PurchaseInvoicesService } from './purchase-invoices.service';

@UseGuards(JwtAuthGuard)
@Controller('purchases/purchase-invoices')
export class PurchaseInvoicesController {
  constructor(private readonly service: PurchaseInvoicesService) {}

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
  create(@Body() dto: CreatePurchaseInvoiceDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePurchaseInvoiceDto) {
    return this.service.update(id, dto);
  }
}
