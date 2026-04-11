import { PrismaClient } from '../src/generated/prisma';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding Genius ERP demo data...');

    // 1. Admin User
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const admin = await prisma.user.upsert({
        where: { email: 'admin@genius.com' },
        update: {},
        create: {
            email: 'admin@genius.com',
            password: hashedPassword,
            name: 'Genius Admin',
            role: 'ADMIN',
        },
    });
    console.log('✔ Admin User created: admin@genius.com / admin123');

    // 2. Segment Definitions
    const segments = [
        { index: 1, name: 'Company', description: 'Enterprise Legal Entity' },
        { index: 2, name: 'Natural Account', description: 'Core GL Account Code' },
        { index: 3, name: 'Department', description: 'Functional Cost Center' },
        { index: 4, name: 'Branch', description: 'Geographical Location' },
        { index: 5, name: 'Project', description: 'Specific Project or Client Code' },
    ];

    for (const seg of segments) {
        await prisma.segmentDefinition.upsert({
            where: { index: seg.index },
            update: { name: seg.name, description: seg.description },
            create: seg,
        });
    }
    console.log('✔ Segment Definitions seeded');

    // 3. Segment Values
    const getDef = (idx: number) => prisma.segmentDefinition.findUnique({ where: { index: idx } });

    const coDef = await getDef(1);
    const natDef = await getDef(2);
    const deptDef = await getDef(3);
    const branchDef = await getDef(4);
    const projDef = await getDef(5);

    if (coDef) await prisma.segmentValue.upsert({ where: { definitionId_code: { definitionId: coDef.id, code: '01' } }, update: {}, create: { code: '01', name: 'Al-Genius Enterprise', definitionId: coDef.id } });

    if (natDef) {
        const nats = [
            { code: '1100', name: 'Cash on Hand' },
            { code: '1200', name: 'Main Bank Account' },
            { code: '4100', name: 'Sales Revenue' },
            { code: '5200', name: 'Electricity Expense' },
        ];
        for (const n of nats) await prisma.segmentValue.upsert({ where: { definitionId_code: { definitionId: natDef.id, code: n.code } }, update: {}, create: { ...n, definitionId: natDef.id } });
    }

    if (deptDef) {
        const depts = [
            { code: '00', name: 'Corporate' },
            { code: '10', name: 'Operations' },
            { code: '20', name: 'Sales' },
        ];
        for (const d of depts) await prisma.segmentValue.upsert({ where: { definitionId_code: { definitionId: deptDef.id, code: d.code } }, update: {}, create: { ...d, definitionId: deptDef.id } });
    }

    if (branchDef) {
        const branches = [
            { code: 'AMM', name: 'Amman HQ' },
            { code: 'IRB', name: 'Irbid Branch' },
        ];
        for (const b of branches) await prisma.segmentValue.upsert({ where: { definitionId_code: { definitionId: branchDef.id, code: b.code } }, update: {}, create: { ...b, definitionId: branchDef.id } });
    }

    if (projDef) await prisma.segmentValue.upsert({ where: { definitionId_code: { definitionId: projDef.id, code: '000' } }, update: {}, create: { code: '000', name: 'No Project', definitionId: projDef.id } });

    console.log('✔ Master Segment Values seeded');

    // 4. Fiscal Year
    const fy2026 = await prisma.fiscalYear.upsert({
        where: { year: 2026 },
        update: {},
        create: {
            year: 2026,
            startDate: new Date('2026-01-01'),
            endDate: new Date('2026-12-31'),
            status: 'OPEN',
        },
    });

    for (let i = 1; i <= 12; i++) {
        await prisma.fiscalPeriod.upsert({
            where: { fiscalYearId_periodNumber: { fiscalYearId: fy2026.id, periodNumber: i } },
            update: {},
            create: {
                fiscalYearId: fy2026.id,
                periodNumber: i,
                name: `Period ${i.toString().padStart(2, '0')} - 2026`,
                startDate: new Date(2026, i - 1, 1),
                endDate: new Date(2026, i, 0),
                status: 'OPEN',
            },
        });
    }
    console.log('✔ Fiscal periods created');

    // 5. Sample Chart of Accounts
    const accounts = [
        { code: '01-AMM-00-1100-000', name: 'Petty Cash - Amman HQ', type: 'ASSET', isPosting: true },
        { code: '01-AMM-00-1200-000', name: 'Bank - Jordan National', type: 'ASSET', isPosting: true },
        { code: '01-AMM-20-4100-000', name: 'Sales Revenue - Amman', type: 'REVENUE', isPosting: true },
        { code: '01-AMM-10-5200-000', name: 'Electricity - Amman Ops', type: 'EXPENSE', isPosting: true },
        { code: '5000', name: 'Operating Expenses', type: 'EXPENSE', isPosting: false }, // Header
    ];

    for (const acc of accounts) {
        await prisma.account.upsert({
            where: { code: acc.code },
            update: {},
            create: {
                ...acc,
                type: acc.type as any,
                createdById: admin.id,
            },
        });
    }
    console.log('✔ Example Chart of Accounts seeded');

    // 6. Sample Journal Entry
    const cashAcc = await prisma.account.findUnique({ where: { code: '01-AMM-00-1100-000' } });
    const bankAcc = await prisma.account.findUnique({ where: { code: '01-AMM-00-1200-000' } });
    const period = await prisma.fiscalPeriod.findFirst({ where: { fiscalYearId: fy2026.id, periodNumber: 4 } });

    if (cashAcc && bankAcc && period) {
        const existingJE = await prisma.journalEntry.findUnique({ where: { reference: 'JE-2026-0001' } });
        if (!existingJE) {
            await prisma.journalEntry.create({
                data: {
                    reference: 'JE-2026-0001',
                    description: 'Cash deposit to bank from petty cash',
                    entryDate: new Date('2026-04-11'),
                    status: 'POSTED',
                    postedAt: new Date(),
                    fiscalPeriodId: period.id,
                    createdById: admin.id,
                    lines: {
                        create: [
                            { accountId: bankAcc.id, lineNumber: 1, debitAmount: 1000, creditAmount: 0, description: 'Bank deposit' },
                            { accountId: cashAcc.id, lineNumber: 2, debitAmount: 0, creditAmount: 1000, description: 'Cash withdrawal' },
                        ]
                    }
                }
            });
            console.log('✔ Sample Journal Entry posted');
        } else {
            console.log('✔ Sample Journal Entry already exists');
        }
    }

    console.log('Demo Seeding complete!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
