import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../platform/auth/guards/jwt-auth.guard';
import {
  AllocateReceiptDto,
  CreateCreditNoteDto,
  CreateCustomerDto,
  CreateCustomerReceiptDto,
  CreateSalesInvoiceDto,
  CreateSalesOrderDto,
  CreateSalesQuotationDto,
  UpdateCreditNoteDto,
  UpdateCustomerDto,
  UpdateSalesInvoiceDto,
  UpdateSalesOrderDto,
  UpdateSalesQuotationDto,
} from './dto/sales-receivables.dto';
import { SalesReceivablesService } from './sales-receivables.service';

@UseGuards(JwtAuthGuard)
@Controller('sales-receivables')
export class SalesReceivablesController {
  constructor(private readonly service: SalesReceivablesService) {}

  @Get('customers')
  listCustomers(@Query('isActive') isActive?: string, @Query('search') search?: string) {
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

  @Get('quotations')
  listQuotations(
    @Query('status') status?: string,
    @Query('customerId') customerId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('search') search?: string,
  ) {
    return this.service.listQuotations({ status, customerId, dateFrom, dateTo, search });
  }

  @Post('quotations')
  createQuotation(@Body() dto: CreateSalesQuotationDto) {
    return this.service.createQuotation(dto);
  }

  @Patch('quotations/:id')
  updateQuotation(@Param('id') id: string, @Body() dto: UpdateSalesQuotationDto) {
    return this.service.updateQuotation(id, dto);
  }

  @Post('quotations/:id/approve')
  approveQuotation(@Param('id') id: string) {
    return this.service.approveQuotation(id);
  }

  @Post('quotations/:id/cancel')
  cancelQuotation(@Param('id') id: string) {
    return this.service.cancelQuotation(id);
  }

  @Post('quotations/:id/convert-to-order')
  convertQuotationToOrder(@Param('id') id: string, @Body() dto: CreateSalesOrderDto) {
    return this.service.convertQuotationToOrder(id, dto);
  }

  @Post('quotations/:id/convert-to-invoice')
  convertQuotationToInvoice(@Param('id') id: string, @Body() dto: CreateSalesInvoiceDto) {
    return this.service.convertQuotationToInvoice(id, dto);
  }

  @Get('sales-orders')
  listSalesOrders(
    @Query('status') status?: string,
    @Query('customerId') customerId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('search') search?: string,
  ) {
    return this.service.listSalesOrders({ status, customerId, dateFrom, dateTo, search });
  }

  @Post('sales-orders')
  createSalesOrder(@Body() dto: CreateSalesOrderDto) {
    return this.service.createSalesOrder(dto);
  }

  @Patch('sales-orders/:id')
  updateSalesOrder(@Param('id') id: string, @Body() dto: UpdateSalesOrderDto) {
    return this.service.updateSalesOrder(id, dto);
  }

  @Post('sales-orders/:id/confirm')
  confirmSalesOrder(@Param('id') id: string) {
    return this.service.confirmSalesOrder(id);
  }

  @Post('sales-orders/:id/cancel')
  cancelSalesOrder(@Param('id') id: string) {
    return this.service.cancelSalesOrder(id);
  }

  @Post('sales-orders/:id/convert-to-invoice')
  convertSalesOrderToInvoice(@Param('id') id: string, @Body() dto: CreateSalesInvoiceDto) {
    return this.service.convertSalesOrderToInvoice(id, dto);
  }

  @Get('invoices')
  listInvoices(
    @Query('status') status?: string,
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
    @Query('status') status?: string,
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

  @Get('receipts')
  listCustomerReceipts(@Query('customerId') customerId?: string, @Query('search') search?: string) {
    return this.service.listCustomerReceipts({ customerId, search });
  }

  @Post('receipts')
  createCustomerReceipt(@Body() dto: CreateCustomerReceiptDto) {
    return this.service.createCustomerReceipt(dto);
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
