import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';

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
  create(@Req() req: Request & { user?: any }, @Body() dto: CreatePurchaseRequestDto) {
    return this.service.create(dto, req.user);
  }

  @Patch(':id')
  update(@Req() req: Request & { user?: any }, @Param('id') id: string, @Body() dto: UpdatePurchaseRequestDto) {
    return this.service.update(id, dto, req.user);
  }

  @Post(':id/submit')
  submit(@Req() req: Request & { user?: any }, @Param('id') id: string, @Body() dto: PurchaseRequestStatusNoteDto) {
    return this.service.submit(id, dto.note, req.user);
  }

  @Post(':id/approve')
  approve(@Req() req: Request & { user?: any }, @Param('id') id: string, @Body() dto: PurchaseRequestStatusNoteDto) {
    return this.service.approve(id, dto.note, req.user);
  }

  @Post(':id/reject')
  reject(@Req() req: Request & { user?: any }, @Param('id') id: string, @Body() dto: PurchaseRequestStatusNoteDto) {
    return this.service.reject(id, dto.note, req.user);
  }

  @Post(':id/close')
  close(@Req() req: Request & { user?: any }, @Param('id') id: string, @Body() dto: PurchaseRequestStatusNoteDto) {
    return this.service.close(id, dto.note, req.user);
  }

  @Post(':id/convert-to-order')
  convertToOrder(@Req() req: Request & { user?: any }, @Param('id') id: string, @Body() dto: ConvertPurchaseRequestToOrderDto) {
    return this.service.convertToOrder(id, dto, req.user);
  }
}
