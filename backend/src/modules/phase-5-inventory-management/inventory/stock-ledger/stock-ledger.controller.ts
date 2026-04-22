import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../../../platform/auth/guards/jwt-auth.guard';
import { StockLedgerService } from './stock-ledger.service';

@UseGuards(JwtAuthGuard)
@Controller('inventory/stock-ledger')
export class StockLedgerController {
  constructor(private readonly service: StockLedgerService) {}

  @Get()
  list(
    @Query('itemId') itemId?: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('movementType') movementType?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.list({ itemId, warehouseId, movementType, dateFrom, dateTo, search, page, limit });
  }
}
