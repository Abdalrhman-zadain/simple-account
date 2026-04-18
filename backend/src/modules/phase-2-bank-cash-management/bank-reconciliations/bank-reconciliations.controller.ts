import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../../platform/auth/guards/jwt-auth.guard';
import {
  CreateBankReconciliationDto,
  CreateBankReconciliationMatchDto,
  CreateBankStatementLineDto,
  ImportBankStatementLinesDto,
} from './dto/create-bank-reconciliation.dto';
import { QueryBankReconciliationsDto } from './dto/query-bank-reconciliations.dto';
import { BankReconciliationsService } from './bank-reconciliations.service';

@UseGuards(JwtAuthGuard)
@Controller('bank-reconciliations')
export class BankReconciliationsController {
  constructor(private readonly service: BankReconciliationsService) {}

  @Get()
  list(@Query() query: QueryBankReconciliationsDto) {
    return this.service.list(query);
  }

  @Post()
  create(@Body() dto: CreateBankReconciliationDto) {
    return this.service.create(dto);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Post(':id/statement-lines')
  addStatementLine(@Param('id') id: string, @Body() dto: CreateBankStatementLineDto) {
    return this.service.addStatementLine(id, dto);
  }

  @Post(':id/statement-lines/import')
  importStatementLines(@Param('id') id: string, @Body() dto: ImportBankStatementLinesDto) {
    return this.service.importStatementLines(id, dto.lines);
  }

  @Post(':id/matches')
  createMatch(@Param('id') id: string, @Body() dto: CreateBankReconciliationMatchDto) {
    return this.service.createMatch(id, dto);
  }

  @Delete(':id/matches/:matchId')
  deleteMatch(@Param('id') id: string, @Param('matchId') matchId: string) {
    return this.service.deleteMatch(id, matchId);
  }

  @Post(':id/matches/:matchId/reconcile')
  reconcileMatch(@Param('id') id: string, @Param('matchId') matchId: string) {
    return this.service.reconcileMatch(id, matchId);
  }

  @Post(':id/complete')
  complete(@Param('id') id: string) {
    return this.service.complete(id);
  }
}
