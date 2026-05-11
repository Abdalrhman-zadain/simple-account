import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../platform/auth/guards/jwt-auth.guard';
import {
  CreateTaxTreatmentDto,
  UpdateTaxTreatmentDto,
} from './tax-treatments.dto';
import { TaxTreatmentsService } from './tax-treatments.service';

@UseGuards(JwtAuthGuard)
@Controller('taxes/treatments')
export class TaxTreatmentsController {
  constructor(private readonly service: TaxTreatmentsService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Get('active')
  listActive() {
    return this.service.listActive();
  }

  @Post()
  create(@Body() dto: CreateTaxTreatmentDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTaxTreatmentDto) {
    return this.service.update(id, dto);
  }
}
