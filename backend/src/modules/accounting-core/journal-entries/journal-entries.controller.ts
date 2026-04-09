import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { JournalEntryStatus } from '../../../generated/prisma/index';

import { PostingService } from '../posting/posting.service';
import { CreateJournalEntryDto, UpdateJournalEntryDto } from './dto/journal-entry-line.dto';
import { JournalEntriesService } from './journal-entries.service';

@Controller('journal-entries')
export class JournalEntriesController {
  constructor(
    private readonly journalEntriesService: JournalEntriesService,
    private readonly postingService: PostingService,
  ) {}

  @Post()
  create(@Body() dto: CreateJournalEntryDto) {
    return this.journalEntriesService.create(dto);
  }

  @Get()
  list(
    @Query('status') status?: JournalEntryStatus,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('reference') reference?: string,
  ) {
    return this.journalEntriesService.list({ status, dateFrom, dateTo, reference });
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.journalEntriesService.getById(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateJournalEntryDto) {
    return this.journalEntriesService.update(id, dto);
  }

  @Post(':id/post')
  post(@Param('id') id: string) {
    return this.postingService.post(id);
  }
}
