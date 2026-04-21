import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../../../platform/auth/guards/jwt-auth.guard';
import { CreateDebitNoteDto, UpdateDebitNoteDto } from './dto/debit-notes.dto';
import { DebitNotesService } from './debit-notes.service';

@UseGuards(JwtAuthGuard)
@Controller('purchases/debit-notes')
export class DebitNotesController {
  constructor(private readonly service: DebitNotesService) {}

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
  create(@Body() dto: CreateDebitNoteDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateDebitNoteDto) {
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
}
