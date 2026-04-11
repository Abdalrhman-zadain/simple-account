import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { PeriodStatus } from '../../../generated/prisma';

@Injectable()
export class FiscalService {
    constructor(private prisma: PrismaService) { }

    // ─── Fiscal Years ─────────────────────────────────────────────────────

    async findAllYears() {
        return this.prisma.fiscalYear.findMany({
            include: {
                periods: { orderBy: { periodNumber: 'asc' } }
            },
            orderBy: { year: 'desc' },
        });
    }

    async createFiscalYear(year: number) {
        const existing = await this.prisma.fiscalYear.findUnique({ where: { year } });
        if (existing) throw new BadRequestException(`Fiscal year ${year} already exists.`);

        const startDate = new Date(`${year}-01-01`);
        const endDate = new Date(`${year}-12-31`);

        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        return this.prisma.fiscalYear.create({
            data: {
                year,
                startDate,
                endDate,
                periods: {
                    create: monthNames.map((month, i) => {
                        const periodNumber = i + 1;
                        const periodStart = new Date(year, i, 1);
                        const periodEnd = new Date(year, i + 1, 0); // last day of month
                        return {
                            periodNumber,
                            name: `${month} ${year}`,
                            startDate: periodStart,
                            endDate: periodEnd,
                            status: PeriodStatus.OPEN,
                        };
                    }),
                },
            },
            include: { periods: { orderBy: { periodNumber: 'asc' } } },
        });
    }

    // ─── Fiscal Periods ───────────────────────────────────────────────────

    async findAllPeriods() {
        return this.prisma.fiscalPeriod.findMany({
            include: { fiscalYear: true },
            orderBy: [{ fiscalYear: { year: 'desc' } }, { periodNumber: 'asc' }],
        });
    }

    async closePeriod(id: string) {
        const period = await this.prisma.fiscalPeriod.findUnique({ where: { id } });
        if (!period) throw new NotFoundException(`Fiscal period ${id} not found.`);
        if (period.status === PeriodStatus.CLOSED || period.status === PeriodStatus.LOCKED) {
            throw new BadRequestException(`Period is already ${period.status.toLowerCase()}.`);
        }
        return this.prisma.fiscalPeriod.update({ where: { id }, data: { status: PeriodStatus.CLOSED } });
    }

    async openPeriod(id: string) {
        const period = await this.prisma.fiscalPeriod.findUnique({ where: { id } });
        if (!period) throw new NotFoundException(`Fiscal period ${id} not found.`);
        if (period.status === PeriodStatus.LOCKED) {
            throw new BadRequestException('This period is permanently locked and cannot be re-opened.');
        }
        return this.prisma.fiscalPeriod.update({ where: { id }, data: { status: PeriodStatus.OPEN } });
    }

    async findCurrentPeriod() {
        const now = new Date();
        return this.prisma.fiscalPeriod.findFirst({
            where: {
                startDate: { lte: now },
                endDate: { gte: now },
                status: PeriodStatus.OPEN,
            },
            include: { fiscalYear: true },
        });
    }

    async getPeriodForDate(date: Date) {
        return this.prisma.fiscalPeriod.findFirst({
            where: {
                startDate: { lte: date },
                endDate: { gte: date },
            },
        });
    }

    async getFiscalStatus() {
        const currentPeriod = await this.findCurrentPeriod();
        const openYears = await this.prisma.fiscalYear.findMany({
            where: { status: PeriodStatus.OPEN },
            select: { year: true },
        });
        return {
            currentPeriod,
            openYears: openYears.map(y => y.year),
        };
    }
}
