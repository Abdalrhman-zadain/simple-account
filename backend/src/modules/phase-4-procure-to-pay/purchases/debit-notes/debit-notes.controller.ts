import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../../../platform/auth/guards/jwt-auth.guard';
import { ReverseJournalEntryDto } from '../../../phase-1-accounting-foundation/accounting-core/journal-entries/dto/reverse-journal-entry.dto';
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
  create(@Body() dto: CreateDebitNoteDto, @Req() req: any) {
    return this.service.create(dto, req.user);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateDebitNoteDto, @Req() req: any) {
    return this.service.update(id, dto, req.user);
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
  reverse(@Param('id') id: string, @Body() dto: ReverseJournalEntryDto) {
    return this.service.reverse(id, dto);
  }
}
