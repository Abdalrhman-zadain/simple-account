import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class SegmentsService {
    constructor(private prisma: PrismaService) { }

    // ─── Definitions ──────────────────────────────────────────────────────

    async findAllDefinitions() {
        return this.prisma.segmentDefinition.findMany({
            include: { values: { orderBy: { code: 'asc' } } },
            orderBy: { index: 'asc' },
        });
    }

    async findDefinitionById(id: string) {
        const def = await this.prisma.segmentDefinition.findUnique({
            where: { id },
            include: { values: { orderBy: { code: 'asc' } } },
        });
        if (!def) throw new NotFoundException(`Segment definition ${id} not found.`);
        return def;
    }

    async createDefinition(data: { index: number; name: string; description?: string }) {
        return this.prisma.segmentDefinition.create({ data });
    }

    async updateDefinition(id: string, data: { name?: string; description?: string }) {
        await this.findDefinitionById(id);
        return this.prisma.segmentDefinition.update({ where: { id }, data });
    }

    // ─── Values ───────────────────────────────────────────────────────────

    async findValuesByDefinition(definitionId: string) {
        await this.findDefinitionById(definitionId);
        return this.prisma.segmentValue.findMany({
            where: { definitionId },
            orderBy: { code: 'asc' },
        });
    }

    async createValue(definitionId: string, data: { code: string; name: string }) {
        await this.findDefinitionById(definitionId);
        const existing = await this.prisma.segmentValue.findUnique({
            where: { definitionId_code: { definitionId, code: data.code } },
        });
        if (existing) throw new ConflictException(`Code "${data.code}" already exists in this segment.`);
        return this.prisma.segmentValue.create({ data: { ...data, definitionId } });
    }

    async updateValue(id: string, data: { code?: string; name?: string; isActive?: boolean }) {
        const existing = await this.prisma.segmentValue.findUnique({ where: { id } });
        if (!existing) throw new NotFoundException(`Segment value ${id} not found.`);
        return this.prisma.segmentValue.update({ where: { id }, data });
    }

    async deactivateValue(id: string) {
        const existing = await this.prisma.segmentValue.findUnique({ where: { id } });
        if (!existing) throw new NotFoundException(`Segment value ${id} not found.`);
        return this.prisma.segmentValue.update({ where: { id }, data: { isActive: false } });
    }

    // ─── Master data summary (for dropdowns) ──────────────────────────────
    async getMasterData() {
        const definitions = await this.findAllDefinitions();
        return definitions.map(def => ({
            id: def.id,
            index: def.index,
            name: def.name,
            description: def.description,
            values: def.values.filter(v => v.isActive).map(v => ({
                id: v.id,
                code: v.code,
                name: v.name,
            }))
        }));
    }
}
