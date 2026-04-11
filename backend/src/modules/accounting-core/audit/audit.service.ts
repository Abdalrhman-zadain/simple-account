import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { AuditAction } from '../../../generated/prisma';

@Injectable()
export class AuditService {
    constructor(private prisma: PrismaService) { }

    async log(data: {
        userId?: string;
        entity: string;
        entityId?: string;
        action: AuditAction;
        details?: object;
    }) {
        return this.prisma.auditLog.create({
            data: {
                userId: data.userId,
                entity: data.entity,
                entityId: data.entityId,
                action: data.action,
                details: data.details as never,
            },
        });
    }

    async find(filters?: { entity?: string; entityId?: string; userId?: string; limit?: number }) {
        return this.prisma.auditLog.findMany({
            where: {
                entity: filters?.entity,
                entityId: filters?.entityId,
                userId: filters?.userId,
            },
            include: { user: { select: { id: true, name: true, email: true } } },
            orderBy: { createdAt: 'desc' },
            take: filters?.limit ?? 100,
        });
    }
}
