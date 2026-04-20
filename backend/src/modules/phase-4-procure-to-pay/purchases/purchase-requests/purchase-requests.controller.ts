import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../../../platform/auth/guards/jwt-auth.guard';
import {
  ConvertPurchaseRequestToOrderDto,
  CreatePurchaseRequestDto,
  PurchaseRequestStatusNoteDto,
  UpdatePurchaseRequestDto,
} from './dto/purchase-requests.dto';
import { PurchaseRequestsService } from './purchase-requests.service';

@UseGuards(JwtAuthGuard)
@Controller('purchases/purchase-requests')
export class PurchaseRequestsController {
  constructor(private readonly service: PurchaseRequestsService) {}

  @Get()
  list(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.service.list({ status, search, dateFrom, dateTo });
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Post()
  create(@Body() dto: CreatePurchaseRequestDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePurchaseRequestDto) {
    return this.service.update(id, dto);
  }

  @Post(':id/submit')
  submit(@Param('id') id: string, @Body() dto: PurchaseRequestStatusNoteDto) {
    return this.service.submit(id, dto.note);
  }

  @Post(':id/approve')
  approve(@Param('id') id: string, @Body() dto: PurchaseRequestStatusNoteDto) {
    return this.service.approve(id, dto.note);
  }

  @Post(':id/reject')
  reject(@Param('id') id: string, @Body() dto: PurchaseRequestStatusNoteDto) {
    return this.service.reject(id, dto.note);
  }

  @Post(':id/close')
  close(@Param('id') id: string, @Body() dto: PurchaseRequestStatusNoteDto) {
    return this.service.close(id, dto.note);
  }

  @Post(':id/convert-to-order')
  convertToOrder(@Param('id') id: string, @Body() dto: ConvertPurchaseRequestToOrderDto) {
    return this.service.convertToOrder(id, dto);
  }
}
