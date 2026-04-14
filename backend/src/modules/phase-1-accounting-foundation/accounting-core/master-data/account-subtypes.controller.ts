import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../platform/auth/guards/jwt-auth.guard';
import { AccountSubtypesService } from './account-subtypes.service';

@UseGuards(JwtAuthGuard)
@Controller('account-subtypes')
export class AccountSubtypesController {
  constructor(private readonly service: AccountSubtypesService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Post()
  create(@Body() dto: { name: string }) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: { name?: string; isActive?: boolean }) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  deactivate(@Param('id') id: string) {
    return this.service.deactivate(id);
  }
}

