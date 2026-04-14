import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../../platform/auth/guards/jwt-auth.guard';
import { CreateBankCashAccountDto } from './dto/create-bank-cash-account.dto';
import { UpdateBankCashAccountDto } from './dto/update-bank-cash-account.dto';
import { BankCashAccountsService } from './bank-cash-accounts.service';

@UseGuards(JwtAuthGuard)
@Controller('bank-cash-accounts')
export class BankCashAccountsController {
  constructor(private readonly service: BankCashAccountsService) {}

  @Get()
  list(
    @Query('type') type?: string,
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
  ) {
    return this.service.list({ type, isActive, search });
  }

  @Post()
  create(@Body() dto: CreateBankCashAccountDto) {
    return this.service.create(dto);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateBankCashAccountDto) {
    return this.service.update(id, dto);
  }

  @Post(':id/deactivate')
  deactivate(@Param('id') id: string) {
    return this.service.deactivate(id);
  }

  @Get(':id/transactions')
  listTransactions(
    @Param('id') id: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.service.listTransactions(id, { dateFrom, dateTo });
  }
}
