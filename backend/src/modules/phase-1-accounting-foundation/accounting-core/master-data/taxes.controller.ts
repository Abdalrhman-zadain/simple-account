import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../platform/auth/guards/jwt-auth.guard';
import { CreateTaxDto, UpdateTaxDto } from './taxes.dto';
import { TaxesService } from './taxes.service';

@UseGuards(JwtAuthGuard)
@Controller('taxes')
export class TaxesController {
  constructor(private readonly service: TaxesService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Get('active')
  listActive() {
    return this.service.listActive();
  }

  @Post()
  create(@Body() dto: CreateTaxDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTaxDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
