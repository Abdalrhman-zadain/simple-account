import { Controller, Get, Param, Query } from '@nestjs/common';

import { QueryLedgerDto } from './dto/query-ledger.dto';
import { GeneralLedgerService } from './general-ledger.service';

@Controller('general-ledger')
export class GeneralLedgerController {
  constructor(private readonly generalLedgerService: GeneralLedgerService) {}

  @Get()
  list(@Query() query: QueryLedgerDto) {
    return this.generalLedgerService.list(query);
  }

  @Get(':id')
  getTransactionDetail(@Param('id') id: string) {
    return this.generalLedgerService.getTransactionDetail(id);
  }
}
