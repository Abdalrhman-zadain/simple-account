import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AuditService } from './audit.service';

@UseGuards(JwtAuthGuard)
@Controller('audit')
export class AuditController {
    constructor(private readonly auditService: AuditService) { }

    @Get()
    find(
        @Query('entity') entity?: string,
        @Query('entityId') entityId?: string,
        @Query('userId') userId?: string,
        @Query('limit') limit?: string,
    ) {
        return this.auditService.find({
            entity,
            entityId,
            userId,
            limit: limit ? parseInt(limit, 10) : undefined,
        });
    }
}
