import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../platform/auth/guards/jwt-auth.guard';
import {
  AllocateReceiptDto,
  CreateCreditNoteDto,
  CreateCustomerDto,
  CreateSalesInvoiceDto,
  UpdateCreditNoteDto,
  UpdateCustomerDto,
  UpdateSalesInvoiceDto,
} from './dto/sales-receivables.dto';
import { SalesReceivablesService } from './sales-receivables.service';

@UseGuards(JwtAuthGuard)
@Controller('sales-receivables')
export class SalesReceivablesController {
  constructor(private readonly service: SalesReceivablesService) {}

  @Get('customers')
  listCustomers(
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
  ) {
    return this.service.listCustomers({ isActive, search });
  }

  @Post('customers')
  createCustomer(@Body() dto: CreateCustomerDto) {
    return this.service.createCustomer(dto);
  }

  @Patch('customers/:id')
  updateCustomer(@Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    return this.service.updateCustomer(id, dto);
  }

  @Post('customers/:id/deactivate')
  deactivateCustomer(@Param('id') id: string) {
    return this.service.deactivateCustomer(id);
  }

  @Get('customers/:id/balance')
  getCustomerBalance(@Param('id') id: string) {
    return this.service.getCustomerBalance(id);
  }

  @Get('customers/:id/transactions')
  getCustomerTransactions(@Param('id') id: string) {
    return this.service.getCustomerTransactions(id);
  }

  @Get('invoices')
  listInvoices(
    @Query('status') status?: 'DRAFT' | 'POSTED',
    @Query('customerId') customerId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('search') search?: string,
  ) {
    return this.service.listInvoices({ status, customerId, dateFrom, dateTo, search });
  }

  @Post('invoices')
  createInvoice(@Body() dto: CreateSalesInvoiceDto) {
    return this.service.createInvoice(dto);
  }

  @Patch('invoices/:id')
  updateInvoice(@Param('id') id: string, @Body() dto: UpdateSalesInvoiceDto) {
    return this.service.updateInvoice(id, dto);
  }

  @Post('invoices/:id/post')
  postInvoice(@Param('id') id: string) {
    return this.service.postInvoice(id);
  }

  @Get('credit-notes')
  listCreditNotes(
    @Query('status') status?: 'DRAFT' | 'POSTED',
    @Query('customerId') customerId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('search') search?: string,
  ) {
    return this.service.listCreditNotes({ status, customerId, dateFrom, dateTo, search });
  }

  @Post('credit-notes')
  createCreditNote(@Body() dto: CreateCreditNoteDto) {
    return this.service.createCreditNote(dto);
  }

  @Patch('credit-notes/:id')
  updateCreditNote(@Param('id') id: string, @Body() dto: UpdateCreditNoteDto) {
    return this.service.updateCreditNote(id, dto);
  }

  @Post('credit-notes/:id/post')
  postCreditNote(@Param('id') id: string) {
    return this.service.postCreditNote(id);
  }

  @Post('receipt-allocations')
  allocateReceipt(@Body() dto: AllocateReceiptDto) {
    return this.service.allocateReceipt(dto);
  }

  @Get('reports/aging')
  getAgingReport(@Query('asOfDate') asOfDate?: string) {
    return this.service.getAgingReport(asOfDate);
  }
}

