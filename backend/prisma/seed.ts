import { PrismaClient } from '../src/generated/prisma';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('🗑️ Cleaning existing database data...');

    // Delete in reverse order of dependencies
    await prisma.auditLog.deleteMany();
    await prisma.ledgerTransaction.deleteMany();
    await prisma.journalEntryLine.deleteMany();
    await prisma.journalEntry.deleteMany();
    await prisma.postingBatch.deleteMany();
    await prisma.bankCashAccount.deleteMany();
    await prisma.account.deleteMany();
    await prisma.fiscalPeriod.deleteMany();
    await prisma.fiscalYear.deleteMany();
    await prisma.segmentValue.deleteMany();
    await prisma.segmentDefinition.deleteMany();
    await prisma.accountSubtype.deleteMany();
    await prisma.paymentMethodType.deleteMany();
    await prisma.journalEntryType.deleteMany();
    await prisma.user.deleteMany();

    console.log('🌱 Seeding Realistic Enterprise Dataset...');

    // 1. Admin User
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const admin = await prisma.user.create({
        data: {
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
        await prisma.segmentDefinition.create({ data: seg });
    }
    const defs = await prisma.segmentDefinition.findMany();
    const getDefId = (idx: number) => defs.find(d => d.index === idx)?.id!;

    // 3. Segment Values
    console.log('🏗️ Seeding Segment Values...');

    // Company
    await prisma.segmentValue.create({ data: { definitionId: getDefId(1), code: '01', name: 'Al-Genius Enterprise Solutions' } });

    // Department
    const depts = [
        { code: '00', name: 'Corporate' },
        { code: '10', name: 'Operations' },
        { code: '20', name: 'Sales' },
        { code: '30', name: 'Finance' },
        { code: '40', name: 'Human Resources' },
        { code: '50', name: 'IT & Infrastructure' },
    ];
    for (const d of depts) await prisma.segmentValue.create({ data: { ...d, definitionId: getDefId(3) } });

    // Branch
    const branches = [
        { code: 'AMM', name: 'Amman Headquarters' },
        { code: 'IRB', name: 'Irbid Regional Office' },
        { code: 'AQB', name: 'Aqaba Port Branch' },
        { code: 'ZAR', name: 'Zarqa Logistics Hub' },
    ];
    for (const b of branches) await prisma.segmentValue.create({ data: { ...b, definitionId: getDefId(4) } });

    // Project
    const projs = [
        { code: '000', name: 'No Project (General)' },
        { code: 'ERP', name: 'Project ERP Implementation' },
        { code: 'WEB', name: 'E-commerce Portal Redesign' },
    ];
    for (const p of projs) await prisma.segmentValue.create({ data: { ...p, definitionId: getDefId(5) } });

    // Natural Accounts (for COA building)
    const nats = [
        { code: '1111', name: 'Cash on Hand' },
        { code: '1112', name: 'Bank Accounts' },
        { code: '1121', name: 'Accounts Receivable - Trade' },
        { code: '2111', name: 'Accounts Payable - Trade' },
        { code: '3111', name: 'Share Capital' },
        { code: '4111', name: 'Sales Revenue - Services' },
        { code: '5111', name: 'Salaries and Wages' },
        { code: '5121', name: 'Office Rent' },
        { code: '5131', name: 'Utilities' },
    ];
    for (const n of nats) await prisma.segmentValue.create({ data: { ...n, definitionId: getDefId(2) } });

    // 4. Master Meta Data
    await prisma.accountSubtype.createMany({ data: [{ name: 'Bank' }, { name: 'Cash' }, { name: 'Receivable' }, { name: 'Payable' }, { name: 'Asset' }, { name: 'Equity' }, { name: 'Revenue' }, { name: 'Expense' }] });
    await prisma.paymentMethodType.createMany({ data: [{ name: 'Bank' }, { name: 'Cash' }, { name: 'Card' }, { name: 'Online' }] });
    await prisma.journalEntryType.createMany({ data: [{ name: 'General' }, { name: 'Payment' }, { name: 'Receipt' }, { name: 'Invoice' }, { name: 'Closing' }] });

    // 5. Fiscal Year 2026
    const fy = await prisma.fiscalYear.create({
        data: {
            year: 2026,
            startDate: new Date('2026-01-01'),
            endDate: new Date('2026-12-31'),
            status: 'OPEN',
        }
    });
    for (let p = 1; p <= 12; p++) {
        await prisma.fiscalPeriod.create({
            data: {
                fiscalYearId: fy.id,
                periodNumber: p,
                name: `Period ${p.toString().padStart(2, '0')} - 2026`,
                startDate: new Date(2026, p - 1, 1),
                endDate: new Date(2026, p, 0),
                status: 'OPEN',
            }
        });
    }

    // 6. Chart of Accounts (Segmental Style)
    console.log('🏗️ Building Chart of Accounts (Enterprise Style)...');

    const createAcc = (data: { code: string; name: string; type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE'; isPosting: boolean; subtype?: string; parentId?: string }) => {
        return prisma.account.create({
            data: {
                code: data.code,
                name: data.name,
                type: data.type,
                isPosting: data.isPosting,
                subtype: data.subtype,
                parentAccountId: data.parentId,
                createdById: admin.id,
            }
        });
    };

    // Root Headers
    const assets = await createAcc({ code: '1000', name: 'ASSETS', type: 'ASSET', isPosting: false });
    const liab = await createAcc({ code: '2000', name: 'LIABILITIES', type: 'LIABILITY', isPosting: false });
    const equ = await createAcc({ code: '3000', name: 'EQUITY', type: 'EQUITY', isPosting: false });
    const rev = await createAcc({ code: '4000', name: 'REVENUE', type: 'REVENUE', isPosting: false });
    const exp = await createAcc({ code: '5000', name: 'EXPENSES', type: 'EXPENSE', isPosting: false });

    // Segmental Posting Accounts (Al-Genius style: CO-BRN-DP-NAT-PRJ)
    // Assets
    const currentAssets = await createAcc({ code: '1100', name: 'Current Assets', type: 'ASSET', isPosting: false, parentId: assets.id });

    const mainBank = await createAcc({ code: '01-AMM-30-1112-000', name: 'JNB - Amman Main JOD', type: 'ASSET', isPosting: true, subtype: 'Bank', parentId: currentAssets.id });
    const aqbBank = await createAcc({ code: '01-AQB-30-1112-000', name: 'Arab Bank - Aqaba USD', type: 'ASSET', isPosting: true, subtype: 'Bank', parentId: currentAssets.id });
    const pettyCash = await createAcc({ code: '01-AMM-00-1111-000', name: 'Petty Cash - Corporate HQ', type: 'ASSET', isPosting: true, subtype: 'Cash', parentId: currentAssets.id });
    const arTrade = await createAcc({ code: '01-AMM-20-1121-000', name: 'Accounts Receivable - Trade', type: 'ASSET', isPosting: true, subtype: 'Receivable', parentId: currentAssets.id });

    // Liabilities
    const currentLiab = await createAcc({ code: '2100', name: 'Current Liabilities', type: 'LIABILITY', isPosting: false, parentId: liab.id });
    const apTrade = await createAcc({ code: '01-AMM-30-2111-000', name: 'Accounts Payable - Trade', type: 'LIABILITY', isPosting: true, subtype: 'Payable', parentId: currentLiab.id });

    // Equity
    const capAcc = await createAcc({ code: '01-000-00-3111-000', name: 'Paid Up Capital', type: 'EQUITY', isPosting: true, subtype: 'Equity', parentId: equ.id });

    // Revenue
    const opsRev = await createAcc({ code: '01-AMM-20-4111-000', name: 'Service Revenue - Amman', type: 'REVENUE', isPosting: true, subtype: 'Revenue', parentId: rev.id });
    const irbRev = await createAcc({ code: '01-IRB-20-4111-000', name: 'Service Revenue - Irbid', type: 'REVENUE', isPosting: true, subtype: 'Revenue', parentId: rev.id });

    // Expenses
    const opExp = await createAcc({ code: '5100', name: 'Operating Expenses', type: 'EXPENSE', isPosting: false, parentId: exp.id });
    const salariesAMM = await createAcc({ code: '01-AMM-10-5111-000', name: 'Salaries - Amman Ops', type: 'EXPENSE', isPosting: true, parentId: opExp.id });
    const rentAMM = await createAcc({ code: '01-AMM-10-5121-000', name: 'Office Rent - Amman', type: 'EXPENSE', isPosting: true, parentId: opExp.id });
    const utilitiesAMM = await createAcc({ code: '01-AMM-10-5131-000', name: 'Utilities - Amman', type: 'EXPENSE', isPosting: true, parentId: opExp.id });

    // 7. Bank Cash Registry
    await prisma.bankCashAccount.create({ data: { name: 'JNB - Amman Main JOD', type: 'Bank', bankName: 'Jordan National Bank', accountNumber: 'JNB-AMM-001', accountId: mainBank.id } });
    await prisma.bankCashAccount.create({ data: { name: 'Arab Bank - Aqaba USD', type: 'Bank', bankName: 'Arab Bank', accountNumber: 'AB-AQB-992', accountId: aqbBank.id } });
    await prisma.bankCashAccount.create({ data: { name: 'Corporate Petty Cash', type: 'Cash', accountId: pettyCash.id } });

    // 8. Sample Transactions
    console.log('📝 Posting Sample Transactions...');
    const period4 = (await prisma.fiscalPeriod.findFirst({ where: { periodNumber: 4 } }))!;

    // JE 1: Capital Contribution
    const je1 = await prisma.journalEntry.create({
        data: {
            reference: 'JE/2026/001',
            description: 'Initial Capital Injection',
            entryDate: new Date('2026-01-01'),
            status: 'POSTED',
            postedAt: new Date(),
            fiscalPeriodId: (await prisma.fiscalPeriod.findFirst({ where: { periodNumber: 1 } }))!.id,
            createdById: admin.id,
            lines: {
                create: [
                    { accountId: mainBank.id, lineNumber: 1, debitAmount: 50000, creditAmount: 0, description: 'Bank receipt - Capital' },
                    { accountId: capAcc.id, lineNumber: 2, debitAmount: 0, creditAmount: 50000, description: 'Owner investment' },
                ]
            }
        }
    });

    // Post to ledger for JE 1
    const pBatch1 = await prisma.postingBatch.create({ data: { postedAt: new Date() } });
    await prisma.ledgerTransaction.createMany({
        data: [
            { id: 'LT001', postingBatchId: pBatch1.id, journalEntryId: je1.id, journalEntryLineId: 'L1', accountId: mainBank.id, reference: je1.reference, entryDate: je1.entryDate, postedAt: new Date(), debitAmount: 50000, creditAmount: 0, description: 'Bank receipt - Capital' },
            { id: 'LT002', postingBatchId: pBatch1.id, journalEntryId: je1.id, journalEntryLineId: 'L2', accountId: capAcc.id, reference: je1.reference, entryDate: je1.entryDate, postedAt: new Date(), debitAmount: 0, creditAmount: 50000, description: 'Owner investment' },
        ]
    });
    await prisma.account.update({ where: { id: mainBank.id }, data: { currentBalance: 50000 } });
    await prisma.account.update({ where: { id: capAcc.id }, data: { currentBalance: -50000 } });

    // JE 2: Rent Payment (Draft)
    await prisma.journalEntry.create({
        data: {
            reference: 'JE/2026/042',
            description: 'April Office Rent - Amman HQ',
            entryDate: new Date('2026-04-05'),
            status: 'DRAFT',
            fiscalPeriodId: period4.id,
            createdById: admin.id,
            lines: {
                create: [
                    { accountId: rentAMM.id, lineNumber: 1, debitAmount: 1200, creditAmount: 0, description: 'Monthly rent' },
                    { accountId: mainBank.id, lineNumber: 2, debitAmount: 0, creditAmount: 1200, description: 'Rent payment via cheque' },
                ]
            }
        }
    });

    console.log('\n🚀 Realistic Enterprise Seed Complete!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
