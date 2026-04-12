import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../platform/auth/guards/jwt-auth.guard';
import { SegmentsService } from './segments.service';

class CreateDefinitionDto {
    index!: number;
    name!: string;
    description?: string;
}

class UpdateDefinitionDto {
    name?: string;
    description?: string;
}

class CreateValueDto {
    code!: string;
    name!: string;
}

class UpdateValueDto {
    code?: string;
    name?: string;
    isActive?: boolean;
}

@UseGuards(JwtAuthGuard)
@Controller('segments')
export class SegmentsController {
    constructor(private readonly segmentsService: SegmentsService) { }

    @Get('master-data')
    getMasterData() {
        return this.segmentsService.getMasterData();
    }

    @Get('definitions')
    findAllDefinitions() {
        return this.segmentsService.findAllDefinitions();
    }

    @Post('definitions')
    createDefinition(@Body() dto: CreateDefinitionDto) {
        return this.segmentsService.createDefinition(dto);
    }

    @Patch('definitions/:id')
    updateDefinition(@Param('id') id: string, @Body() dto: UpdateDefinitionDto) {
        return this.segmentsService.updateDefinition(id, dto);
    }

    @Get('definitions/:id/values')
    findValues(@Param('id') id: string) {
        return this.segmentsService.findValuesByDefinition(id);
    }

    @Post('definitions/:id/values')
    createValue(@Param('id') id: string, @Body() dto: CreateValueDto) {
        return this.segmentsService.createValue(id, dto);
    }

    @Patch('values/:id')
    updateValue(@Param('id') id: string, @Body() dto: UpdateValueDto) {
        return this.segmentsService.updateValue(id, dto);
    }

    @Delete('values/:id')
    deactivateValue(@Param('id') id: string) {
        return this.segmentsService.deactivateValue(id);
    }
}
