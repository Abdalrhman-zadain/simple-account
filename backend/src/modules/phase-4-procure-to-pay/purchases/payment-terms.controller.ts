import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../platform/auth/guards/jwt-auth.guard';
import { PaymentTermsService, CreatePaymentTermDto, UpdatePaymentTermDto } from './payment-terms.service';

@UseGuards(JwtAuthGuard)
@Controller('payment-terms')
export class PaymentTermsController {
  constructor(private readonly service: PaymentTermsService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Get('active')
  listActive() {
    return this.service.listActive();
  }

  @Post()
  create(@Body() dto: CreatePaymentTermDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePaymentTermDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
