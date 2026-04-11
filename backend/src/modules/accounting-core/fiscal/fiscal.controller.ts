import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { FiscalService } from './fiscal.service';

class CreateFiscalYearDto {
    year!: number;
}

@UseGuards(JwtAuthGuard)
@Controller('fiscal')
export class FiscalController {
    constructor(private readonly fiscalService: FiscalService) { }

    @Get('status')
    getStatus() {
        return this.fiscalService.getFiscalStatus();
    }

    @Get('years')
    findAllYears() {
        return this.fiscalService.findAllYears();
    }

    @Post('years')
    createYear(@Body() dto: CreateFiscalYearDto) {
        return this.fiscalService.createFiscalYear(Number(dto.year));
    }

    @Get('periods')
    findAllPeriods() {
        return this.fiscalService.findAllPeriods();
    }

    @Post('periods/:id/close')
    closePeriod(@Param('id') id: string) {
        return this.fiscalService.closePeriod(id);
    }

    @Post('periods/:id/open')
    openPeriod(@Param('id') id: string) {
        return this.fiscalService.openPeriod(id);
    }
}
