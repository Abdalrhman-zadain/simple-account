import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { BankCashTransactionKind, BankCashTransactionStatus } from '../../../generated/prisma';

import { JwtAuthGuard } from '../../platform/auth/guards/jwt-auth.guard';
import { CreatePaymentDto, CreateReceiptDto, CreateTransferDto } from './dto/create-bank-cash-transaction.dto';
import { UpdateBankCashTransactionDto } from './dto/update-bank-cash-transaction.dto';
import { BankCashTransactionsService } from './bank-cash-transactions.service';

@UseGuards(JwtAuthGuard)
@Controller('bank-cash-transactions')
export class BankCashTransactionsController {
  constructor(private readonly service: BankCashTransactionsService) {}

  @Get()
  list(
    @Query('kind') kind?: BankCashTransactionKind,
    @Query('status') status?: BankCashTransactionStatus,
    @Query('bankCashAccountId') bankCashAccountId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('search') search?: string,
  ) {
    return this.service.list({ kind, status, bankCashAccountId, dateFrom, dateTo, search });
  }

  @Post('receipts')
  createReceipt(@Body() dto: CreateReceiptDto) {
    return this.service.createReceipt(dto);
  }

  @Post('payments')
  createPayment(@Body() dto: CreatePaymentDto) {
    return this.service.createPayment(dto);
  }

  @Post('transfers')
  createTransfer(@Body() dto: CreateTransferDto) {
    return this.service.createTransfer(dto);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateBankCashTransactionDto) {
    return this.service.update(id, dto);
  }

  @Post(':id/post')
  postTransaction(@Param('id') id: string) {
    return this.service.post(id);
  }
}
