import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../../../platform/auth/guards/jwt-auth.guard';
import { UpdateInventoryPolicyDto } from './dto/update-inventory-policy.dto';
import { InventoryPolicyService } from './policy.service';

@UseGuards(JwtAuthGuard)
@Controller('inventory/policy')
export class InventoryPolicyController {
  constructor(private readonly service: InventoryPolicyService) {}

  @Get()
  getPolicy() {
    return this.service.getPolicy();
  }

  @Patch()
  updatePolicy(@Body() dto: UpdateInventoryPolicyDto) {
    return this.service.updatePolicy(dto);
  }
}
