import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../../../platform/auth/guards/jwt-auth.guard';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { SuppliersService } from './suppliers.service';

@UseGuards(JwtAuthGuard)
@Controller('purchases/suppliers')
export class SuppliersController {
  constructor(private readonly service: SuppliersService) {}

  @Get()
  list(@Query('isActive') isActive?: string, @Query('search') search?: string) {
    return this.service.list({ isActive, search });
  }

  @Post()
  create(@Body() dto: CreateSupplierDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSupplierDto) {
    return this.service.update(id, dto);
  }

  @Post(':id/deactivate')
  deactivate(@Param('id') id: string) {
    return this.service.deactivate(id);
  }

  @Get(':id/balance')
  getBalance(@Param('id') id: string) {
    return this.service.getBalance(id);
  }

  @Get(':id/transactions')
  getTransactions(@Param('id') id: string) {
    return this.service.getTransactions(id);
  }
}
