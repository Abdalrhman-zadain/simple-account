import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../../../platform/auth/guards/jwt-auth.guard';
import { UpdatePurchasePolicyDto } from './dto/update-purchase-policy.dto';
import { PurchasePolicyService } from './policy.service';

@UseGuards(JwtAuthGuard)
@Controller('purchases/policy')
export class PurchasePolicyController {
  constructor(private readonly service: PurchasePolicyService) {}

  @Get()
  getPolicy() {
    return this.service.getPolicy();
  }

  @Patch()
  updatePolicy(@Body() dto: UpdatePurchasePolicyDto) {
    return this.service.updatePolicy(dto);
  }
}
