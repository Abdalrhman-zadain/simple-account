import { PrismaClient } from '../src/generated/prisma';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';

async function main() {
  console.log('Cleaning existing database data...');

  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename <> '_prisma_migrations'
  `;

  if (tables.length > 0) {
    const quotedTables = tables.map(({ tablename }) => `"public"."${tablename}"`).join(', ');
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${quotedTables} RESTART IDENTITY CASCADE;`);
  }

  console.log('Seeding starter accounting dataset...');

  const hashedPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.create({
    data: {
      email: 'admin@genius.com',
      password: hashedPassword,
      name: 'Genius Admin',
      role: 'ADMIN',
    },
  });

  console.log('Admin user created: admin@genius.com / admin123');

  const segmentDefinitions = [
    { index: 1, name: 'Company', description: 'Enterprise Legal Entity' },
    { index: 2, name: 'Natural Account', description: 'Core GL Account Code' },
    { index: 3, name: 'Department', description: 'Functional Cost Center' },
    { index: 4, name: 'Branch', description: 'Geographical Location' },
    { index: 5, name: 'Project', description: 'Specific Project or Client Code' },
  ];

  for (const definition of segmentDefinitions) {
    await prisma.segmentDefinition.create({ data: definition });
  }

  const definitions = await prisma.segmentDefinition.findMany();
  const getDefinitionId = (index: number) => definitions.find((item) => item.index === index)?.id ?? '';

  await prisma.segmentValue.create({
    data: {
      definitionId: getDefinitionId(1),
      code: '01',
      name: 'Genius Demo Company',
    },
  });

  const departments = [
    { code: '00', name: 'Corporate' },
    { code: '10', name: 'Operations' },
    { code: '20', name: 'Sales' },
    { code: '30', name: 'Finance' },
  ];
  for (const department of departments) {
    await prisma.segmentValue.create({
      data: { definitionId: getDefinitionId(3), ...department },
    });
  }

  const branches = [
    { code: 'AMM', name: 'Amman Headquarters' },
    { code: 'IRB', name: 'Irbid Branch' },
  ];
  for (const branch of branches) {
    await prisma.segmentValue.create({
      data: { definitionId: getDefinitionId(4), ...branch },
    });
  }

  const projects = [
    { code: '000', name: 'General Operations' },
    { code: 'ERP', name: 'ERP Rollout' },
  ];
  for (const project of projects) {
    await prisma.segmentValue.create({
      data: { definitionId: getDefinitionId(5), ...project },
    });
  }

  const naturalAccounts = [
    { code: '1110', name: 'Cash' },
    { code: '1120', name: 'Bank' },
    { code: '1210', name: 'Accounts Receivable' },
    { code: '2110', name: 'Accounts Payable' },
    { code: '3110', name: 'Capital' },
    { code: '4110', name: 'Sales Revenue' },
    { code: '5110', name: 'Rent Expense' },
    { code: '5120', name: 'Salaries Expense' },
  ];
  for (const naturalAccount of naturalAccounts) {
    await prisma.segmentValue.create({
      data: { definitionId: getDefinitionId(2), ...naturalAccount },
    });
  }

  await prisma.accountSubtype.createMany({
    data: [
      { name: 'Bank' },
      { name: 'Cash' },
      { name: 'Current Assets' },
      { name: 'Receivable' },
      { name: 'Payable' },
      { name: 'Equity' },
      { name: 'Revenue' },
      { name: 'Expense' },
    ],
  });

  await prisma.paymentMethodType.createMany({
    data: [{ name: 'Bank' }, { name: 'Cash' }],
  });

  await prisma.journalEntryType.createMany({
    data: [{ name: 'General' }, { name: 'Receipt' }, { name: 'Payment' }, { name: 'Transfer' }],
  });

  const fiscalYear = await prisma.fiscalYear.create({
    data: {
      year: 2026,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      status: 'OPEN',
    },
  });

  for (let month = 1; month <= 12; month += 1) {
    await prisma.fiscalPeriod.create({
      data: {
        fiscalYearId: fiscalYear.id,
        periodNumber: month,
        name: `Period ${month.toString().padStart(2, '0')} - 2026`,
        startDate: new Date(2026, month - 1, 1),
        endDate: new Date(2026, month, 0),
        status: 'OPEN',
      },
    });
  }

  const period1 = await prisma.fiscalPeriod.findFirstOrThrow({ where: { fiscalYearId: fiscalYear.id, periodNumber: 1 } });
  const period4 = await prisma.fiscalPeriod.findFirstOrThrow({ where: { fiscalYearId: fiscalYear.id, periodNumber: 4 } });

  const createAccount = (data: {
    code: string;
    name: string;
    nameAr?: string;
    type: AccountType;
    isPosting: boolean;
    subtype?: string;
    parentAccountId?: string;
  }) =>
    prisma.account.create({
      data: {
        ...data,
        createdById: admin.id,
      },
    });

  const assets = await createAccount({ code: '1000000', name: 'Assets', nameAr: 'الاصول', type: 'ASSET', isPosting: false });
  const liabilities = await createAccount({
    code: '2000000',
    name: 'Liabilities',
    nameAr: 'الخصوم',
    type: 'LIABILITY',
    isPosting: false,
  });
  const equity = await createAccount({
    code: '3000000',
    name: 'Equity',
    nameAr: 'حقوق الملكية',
    type: 'EQUITY',
    isPosting: false,
  });
  const revenue = await createAccount({
    code: '4000000',
    name: 'Revenue',
    nameAr: 'الايرادات',
    type: 'REVENUE',
    isPosting: false,
  });
  const expenses = await createAccount({
    code: '5000000',
    name: 'Expenses',
    nameAr: 'المصروفات',
    type: 'EXPENSE',
    isPosting: false,
  });

  const currentAssets = await createAccount({
    code: '1100000',
    name: 'Current Assets',
    nameAr: 'الأصول المتداولة',
    type: 'ASSET',
    isPosting: false,
    parentAccountId: assets.id,
  });
  const cashAndCashEquivalents = await createAccount({
    code: '1110000',
    name: 'Cash and Cash Equivalents',
    nameAr: 'النقد وما في حكمه',
    type: 'ASSET',
    isPosting: false,
    parentAccountId: currentAssets.id,
  });
  const cashOnHand = await createAccount({
    code: '1111000',
    name: 'Cash on Hand',
    nameAr: 'النقد في الصندوق',
    type: 'ASSET',
    isPosting: false,
    parentAccountId: cashAndCashEquivalents.id,
  });
  const bankAccounts = await createAccount({
    code: '1112000',
    name: 'Bank Accounts',
    nameAr: 'الحسابات البنكية',
    type: 'ASSET',
    isPosting: false,
    parentAccountId: cashAndCashEquivalents.id,
  });
  const digitalWallets = await createAccount({
    code: '1113000',
    name: 'Digital Wallets',
    nameAr: 'المحافظ الإلكترونية',
    type: 'ASSET',
    isPosting: false,
    parentAccountId: cashAndCashEquivalents.id,
  });
  const paymentGateways = await createAccount({
    code: '1114000',
    name: 'Payment Gateways',
    nameAr: 'بوابات الدفع',
    type: 'ASSET',
    isPosting: false,
    parentAccountId: cashAndCashEquivalents.id,
  });
  const receivables = await createAccount({
    code: '1120000',
    name: 'Accounts Receivable',
    nameAr: 'الذمم المدينة',
    type: 'ASSET',
    isPosting: false,
    parentAccountId: currentAssets.id,
  });
  const inventory = await createAccount({
    code: '1130000',
    name: 'Inventory',
    nameAr: 'المخزون',
    type: 'ASSET',
    isPosting: false,
    parentAccountId: currentAssets.id,
  });
  const nonCurrentAssets = await createAccount({
    code: '1200000',
    name: 'Non-current Assets',
    nameAr: 'الأصول غير المتداولة',
    type: 'ASSET',
    isPosting: false,
    parentAccountId: assets.id,
  });
  const fixedAssets = await createAccount({
    code: '1210000',
    name: 'Fixed Assets',
    nameAr: 'الأصول الثابتة',
    type: 'ASSET',
    isPosting: false,
    parentAccountId: nonCurrentAssets.id,
  });
  const payables = await createAccount({
    code: '2100000',
    name: 'Accounts Payable',
    nameAr: 'الذمم الدائنة',
    type: 'LIABILITY',
    isPosting: false,
    parentAccountId: liabilities.id,
  });
  const sales = await createAccount({
    code: '4100000',
    name: 'Sales',
    nameAr: 'المبيعات',
    type: 'REVENUE',
    isPosting: false,
    parentAccountId: revenue.id,
  });
  const operatingExpenses = await createAccount({
    code: '5100000',
    name: 'Operating Expenses',
    nameAr: 'المصروفات التشغيلية',
    type: 'EXPENSE',
    isPosting: false,
    parentAccountId: expenses.id,
  });

  const mainCash = await createAccount({
    code: '1111001',
    name: 'Main Cash',
    nameAr: 'الصندوق الرئيسي',
    type: 'ASSET',
    isPosting: true,
    subtype: 'Cash',
    parentAccountId: cashOnHand.id,
  });
  await createAccount({
    code: '1111002',
    name: 'Petty Cash',
    nameAr: 'صندوق المصاريف النثرية',
    type: 'ASSET',
    isPosting: true,
    subtype: 'Cash',
    parentAccountId: cashOnHand.id,
  });
  await createAccount({
    code: '1111003',
    name: 'Branch Cash - Amman',
    nameAr: 'صندوق فرع عمّان',
    type: 'ASSET',
    isPosting: true,
    subtype: 'Cash',
    parentAccountId: cashOnHand.id,
  });
  await createAccount({
    code: '1111004',
    name: 'Branch Cash - Irbid',
    nameAr: 'صندوق فرع إربد',
    type: 'ASSET',
    isPosting: true,
    subtype: 'Cash',
    parentAccountId: cashOnHand.id,
  });
  await createAccount({
    code: '1111005',
    name: 'Cash Drawer',
    nameAr: 'درج الكاش',
    type: 'ASSET',
    isPosting: true,
    subtype: 'Cash',
    parentAccountId: cashOnHand.id,
  });
  await createAccount({
    code: '1111006',
    name: 'Cash in Transit',
    nameAr: 'نقدية بالطريق',
    type: 'ASSET',
    isPosting: true,
    subtype: 'Cash',
    parentAccountId: cashOnHand.id,
  });
  const arabBank = await createAccount({
    code: '1112001',
    name: 'Arab Bank - JOD',
    nameAr: 'البنك العربي',
    type: 'ASSET',
    isPosting: true,
    subtype: 'Bank',
    parentAccountId: bankAccounts.id,
  });
  const islamicBank = await createAccount({
    code: '1112002',
    name: 'Islamic Bank - JOD',
    nameAr: 'البنك الاسلامي',
    type: 'ASSET',
    isPosting: true,
    subtype: 'Bank',
    parentAccountId: bankAccounts.id,
  });
  await createAccount({
    code: '1112003',
    name: 'Bank of Jordan - JOD',
    nameAr: 'بنك الأردن - دينار',
    type: 'ASSET',
    isPosting: true,
    subtype: 'Bank',
    parentAccountId: bankAccounts.id,
  });
  await createAccount({
    code: '1112004',
    name: 'Cairo Amman Bank - JOD',
    nameAr: 'بنك القاهرة عمان - دينار',
    type: 'ASSET',
    isPosting: true,
    subtype: 'Bank',
    parentAccountId: bankAccounts.id,
  });
  await createAccount({
    code: '1112005',
    name: 'Bank Account - USD',
    nameAr: 'حساب بنكي - دولار',
    type: 'ASSET',
    isPosting: true,
    subtype: 'Bank',
    parentAccountId: bankAccounts.id,
  });
  await createAccount({
    code: '1112006',
    name: 'Bank Account - EUR',
    nameAr: 'حساب بنكي - يورو',
    type: 'ASSET',
    isPosting: true,
    subtype: 'Bank',
    parentAccountId: bankAccounts.id,
  });
  await createAccount({
    code: '1112007',
    name: 'Bank Account - SAR',
    nameAr: 'حساب بنكي - ريال سعودي',
    type: 'ASSET',
    isPosting: true,
    subtype: 'Bank',
    parentAccountId: bankAccounts.id,
  });
  await createAccount({
    code: '1112008',
    name: 'Bank Account - AED',
    nameAr: 'حساب بنكي - درهم إماراتي',
    type: 'ASSET',
    isPosting: true,
    subtype: 'Bank',
    parentAccountId: bankAccounts.id,
  });
  await createAccount({
    code: '1113001',
    name: 'CliQ Wallet',
    nameAr: 'محفظة كليك',
    type: 'ASSET',
    isPosting: true,
    parentAccountId: digitalWallets.id,
  });
  await createAccount({
    code: '1113002',
    name: 'Zain Cash',
    nameAr: 'زين كاش',
    type: 'ASSET',
    isPosting: true,
    parentAccountId: digitalWallets.id,
  });
  await createAccount({
    code: '1113003',
    name: 'Orange Money',
    nameAr: 'أورنج موني',
    type: 'ASSET',
    isPosting: true,
    parentAccountId: digitalWallets.id,
  });
  await createAccount({
    code: '1113004',
    name: 'Digital Wallet - Other',
    nameAr: 'محفظة إلكترونية أخرى',
    type: 'ASSET',
    isPosting: true,
    parentAccountId: digitalWallets.id,
  });
  await createAccount({
    code: '1114001',
    name: 'Stripe',
    nameAr: 'سترايب',
    type: 'ASSET',
    isPosting: true,
    parentAccountId: paymentGateways.id,
  });
  await createAccount({
    code: '1114002',
    name: 'PayPal',
    nameAr: 'باي بال',
    type: 'ASSET',
    isPosting: true,
    parentAccountId: paymentGateways.id,
  });
  await createAccount({
    code: '1114003',
    name: 'HyperPay',
    nameAr: 'هايبر باي',
    type: 'ASSET',
    isPosting: true,
    parentAccountId: paymentGateways.id,
  });
  await createAccount({
    code: '1114004',
    name: 'Tap Payments',
    nameAr: 'تاب',
    type: 'ASSET',
    isPosting: true,
    parentAccountId: paymentGateways.id,
  });
  await createAccount({
    code: '1114005',
    name: 'Payment Gateway - Other',
    nameAr: 'بوابة دفع أخرى',
    type: 'ASSET',
    isPosting: true,
    parentAccountId: paymentGateways.id,
  });
  await createAccount({
    code: '1131001',
    name: 'Merchandise Inventory',
    nameAr: 'مخزون بضاعة مشتراة لإعادة البيع',
    type: 'ASSET',
    subtype: 'Inventory',
    isPosting: true,
    parentAccountId: inventory.id,
  });
  await createAccount({
    code: '1131002',
    name: 'Raw Materials Inventory',
    nameAr: 'مخزون مواد خام',
    type: 'ASSET',
    subtype: 'Inventory',
    isPosting: true,
    parentAccountId: inventory.id,
  });
  await createAccount({
    code: '1131003',
    name: 'Operating Supplies Inventory',
    nameAr: 'مخزون مواد تشغيلية',
    type: 'ASSET',
    subtype: 'Inventory',
    isPosting: true,
    parentAccountId: inventory.id,
  });
  await createAccount({
    code: '1131004',
    name: 'Spare Parts Inventory',
    nameAr: 'مخزون قطع غيار',
    type: 'ASSET',
    subtype: 'Inventory',
    isPosting: true,
    parentAccountId: inventory.id,
  });
  const customerReceivables = await createAccount({
    code: '1121000',
    name: 'Customer Receivables',
    nameAr: 'ذمم عملاء',
    type: 'ASSET',
    isPosting: false,
    parentAccountId: receivables.id,
  });
  const customers = await createAccount({
    code: '1121001',
    name: 'Trade Customers',
    nameAr: 'عملاء تجاريون',
    type: 'ASSET',
    isPosting: true,
    subtype: 'Receivable',
    parentAccountId: customerReceivables.id,
  });
  const suppliers = await createAccount({
    code: '2110001',
    name: 'Suppliers',
    nameAr: 'الموردون',
    type: 'LIABILITY',
    isPosting: true,
    subtype: 'Payable',
    parentAccountId: payables.id,
  });
  const salesTaxPayable = await createAccount({
    code: '2110002',
    name: 'Sales Tax Payable',
    nameAr: 'ضريبة مبيعات مستحقة',
    type: 'LIABILITY',
    isPosting: true,
    subtype: 'Payable',
    parentAccountId: payables.id,
  });

  // Sales Tax Payables - Main Account under Liabilities
  const salesTaxByRate = await createAccount({
    code: '2300000',
    name: 'Sales Tax Payables',
    nameAr: 'أمانات ضريبة المبيعات',
    type: 'LIABILITY',
    isPosting: false,
    parentAccountId: liabilities.id,
  });

  // Sales Tax Payables by Rate - 16%
  await createAccount({
    code: '2300001',
    name: 'Sales Tax Payable 16%',
    nameAr: 'أمانات ضريبة المبيعات 16%',
    type: 'LIABILITY',
    isPosting: true,
    subtype: 'Payable',
    parentAccountId: salesTaxByRate.id,
  });

  // Sales Tax Payables by Rate - 10%
  await createAccount({
    code: '2300002',
    name: 'Sales Tax Payable 10%',
    nameAr: 'أمانات ضريبة المبيعات 10%',
    type: 'LIABILITY',
    isPosting: true,
    subtype: 'Payable',
    parentAccountId: salesTaxByRate.id,
  });

  // Sales Tax Payables by Rate - 8%
  await createAccount({
    code: '2300003',
    name: 'Sales Tax Payable 8%',
    nameAr: 'أمانات ضريبة المبيعات 8%',
    type: 'LIABILITY',
    isPosting: true,
    subtype: 'Payable',
    parentAccountId: salesTaxByRate.id,
  });

  // Sales Tax Payables by Rate - 5%
  await createAccount({
    code: '2300004',
    name: 'Sales Tax Payable 5%',
    nameAr: 'أمانات ضريبة المبيعات 5%',
    type: 'LIABILITY',
    isPosting: true,
    subtype: 'Payable',
    parentAccountId: salesTaxByRate.id,
  });

  // Sales Tax Payables by Rate - 4%
  await createAccount({
    code: '2300005',
    name: 'Sales Tax Payable 4%',
    nameAr: 'أمانات ضريبة المبيعات 4%',
    type: 'LIABILITY',
    isPosting: true,
    subtype: 'Payable',
    parentAccountId: salesTaxByRate.id,
  });

  // Sales Tax Payables by Rate - 2%
  await createAccount({
    code: '2300006',
    name: 'Sales Tax Payable 2%',
    nameAr: 'أمانات ضريبة المبيعات 2%',
    type: 'LIABILITY',
    isPosting: true,
    subtype: 'Payable',
    parentAccountId: salesTaxByRate.id,
  });

  // Sales Tax Payables by Rate - 1%
  await createAccount({
    code: '2300007',
    name: 'Sales Tax Payable 1%',
    nameAr: 'أمانات ضريبة المبيعات 1%',
    type: 'LIABILITY',
    isPosting: true,
    subtype: 'Payable',
    parentAccountId: salesTaxByRate.id,
  });

  await prisma.tax.createMany({
    data: [
      {
        taxCode: 'VAT16',
        taxName: 'ضريبة مبيعات 16%',
        rate: 16,
        taxType: 'SALES',
        taxAccountId: salesTaxPayable.id,
        isActive: true,
      },
      {
        taxCode: 'VAT0',
        taxName: 'ضريبة صفرية',
        rate: 0,
        taxType: 'ZERO_RATED',
        taxAccountId: null,
        isActive: true,
      },
      {
        taxCode: 'EXEMPT',
        taxName: 'معفى من الضريبة',
        rate: 0,
        taxType: 'EXEMPT',
        taxAccountId: null,
        isActive: true,
      },
    ],
  });

  const ownersEquity = await createAccount({
    code: '3100000',
    name: "Owner's Equity",
    nameAr: 'حقوق المالك',
    type: 'EQUITY',
    isPosting: false,
    parentAccountId: equity.id,
  });
  const partnersEquity = await createAccount({
    code: '3200000',
    name: "Partners' Equity",
    nameAr: 'حقوق الشركاء',
    type: 'EQUITY',
    isPosting: false,
    parentAccountId: equity.id,
  });
  const retainedEarnings = await createAccount({
    code: '3300000',
    name: 'Retained Earnings',
    nameAr: 'الأرباح المحتجزة',
    type: 'EQUITY',
    isPosting: false,
    parentAccountId: equity.id,
  });
  const openingBalances = await createAccount({
    code: '3400000',
    name: 'Opening Balances',
    nameAr: 'الأرصدة الافتتاحية',
    type: 'EQUITY',
    isPosting: false,
    parentAccountId: equity.id,
  });
  const reserves = await createAccount({
    code: '3500000',
    name: 'Reserves',
    nameAr: 'الاحتياطيات',
    type: 'EQUITY',
    isPosting: false,
    parentAccountId: equity.id,
  });
  const ownerCapital = await createAccount({
    code: '3110001',
    name: 'Owner Capital',
    nameAr: 'راس المال',
    type: 'EQUITY',
    isPosting: true,
    subtype: 'Equity',
    parentAccountId: ownersEquity.id,
  });
  await createAccount({
    code: '3120001',
    name: 'Owner Withdrawals',
    nameAr: 'مسحوبات المالك',
    type: 'EQUITY',
    isPosting: true,
    subtype: 'Equity',
    parentAccountId: ownersEquity.id,
  });
  await createAccount({
    code: '3210001',
    name: 'Partner A Capital',
    nameAr: 'رأس مال الشريك أ',
    type: 'EQUITY',
    isPosting: true,
    subtype: 'Equity',
    parentAccountId: partnersEquity.id,
  });
  await createAccount({
    code: '3220001',
    name: 'Partner B Capital',
    nameAr: 'رأس مال الشريك ب',
    type: 'EQUITY',
    isPosting: true,
    subtype: 'Equity',
    parentAccountId: partnersEquity.id,
  });
  await createAccount({
    code: '3230001',
    name: 'Partners Current Accounts',
    nameAr: 'الحسابات الجارية للشركاء',
    type: 'EQUITY',
    isPosting: true,
    subtype: 'Equity',
    parentAccountId: partnersEquity.id,
  });
  await createAccount({
    code: '3310001',
    name: 'Retained Earnings - Prior Years',
    nameAr: 'أرباح محتجزة - سنوات سابقة',
    type: 'EQUITY',
    isPosting: true,
    subtype: 'Equity',
    parentAccountId: retainedEarnings.id,
  });
  await createAccount({
    code: '3320001',
    name: 'Current Year Profit or Loss',
    nameAr: 'ربح أو خسارة السنة الحالية',
    type: 'EQUITY',
    isPosting: true,
    subtype: 'Equity',
    parentAccountId: retainedEarnings.id,
  });
  await createAccount({
    code: '3410001',
    name: 'Opening Balance Equity',
    nameAr: 'حساب الأرصدة الافتتاحية',
    type: 'EQUITY',
    isPosting: true,
    subtype: 'Equity',
    parentAccountId: openingBalances.id,
  });
  await createAccount({
    code: '3510001',
    name: 'Legal Reserve',
    nameAr: 'الاحتياطي القانوني',
    type: 'EQUITY',
    isPosting: true,
    subtype: 'Equity',
    parentAccountId: reserves.id,
  });
  await createAccount({
    code: '3520001',
    name: 'General Reserve',
    nameAr: 'الاحتياطي العام',
    type: 'EQUITY',
    isPosting: true,
    subtype: 'Equity',
    parentAccountId: reserves.id,
  });
  const salesRevenue = await createAccount({
    code: '4110001',
    name: 'Sales Revenue',
    nameAr: 'ايرادات المبيعات',
    type: 'REVENUE',
    isPosting: true,
    subtype: 'Revenue',
    parentAccountId: sales.id,
  });
  const rentExpense = await createAccount({
    code: '5110001',
    name: 'Rent Expense',
    nameAr: 'مصروف الايجار',
    type: 'EXPENSE',
    isPosting: true,
    subtype: 'Expense',
    parentAccountId: operatingExpenses.id,
  });
  const salariesExpense = await createAccount({
    code: '5120001',
    name: 'Salaries Expense',
    nameAr: 'مصروف الرواتب',
    type: 'EXPENSE',
    isPosting: true,
    subtype: 'Expense',
    parentAccountId: operatingExpenses.id,
  });

  // Payment Terms seed data
  await prisma.paymentTerm.createMany({
    data: [
      {
        name: 'Cash',
        nameAr: 'نقدًا',
        calculationMethod: 'IMMEDIATE',
        numberOfDays: 0,
        isActive: true,
      },
      {
        name: 'Net 7',
        nameAr: 'خلال 7 أيام',
        calculationMethod: 'DAYS_AFTER',
        numberOfDays: 7,
        isActive: true,
      },
      {
        name: 'Net 15',
        nameAr: 'خلال 15 يومًا',
        calculationMethod: 'DAYS_AFTER',
        numberOfDays: 15,
        isActive: true,
      },
      {
        name: 'Net 30',
        nameAr: 'خلال 30 يومًا',
        calculationMethod: 'DAYS_AFTER',
        numberOfDays: 30,
        isActive: true,
      },
      {
        name: 'Net 60',
        nameAr: 'خلال 60 يومًا',
        calculationMethod: 'DAYS_AFTER',
        numberOfDays: 60,
        isActive: true,
      },
      {
        name: 'End of Month',
        nameAr: 'نهاية الشهر',
        calculationMethod: 'END_OF_MONTH',
        numberOfDays: null,
        isActive: true,
      },
      {
        name: 'By Agreement',
        nameAr: 'حسب الاتفاق',
        calculationMethod: 'MANUAL',
        numberOfDays: null,
        isActive: true,
      },
    ],
  });

  const cashRegister = await prisma.bankCashAccount.create({
    data: {
      type: 'Cash',
      name: 'Main Cash Register',
      bankName: 'Head Office Cashier',
      accountNumber: 'CASH-001',
      accountId: mainCash.id,
    },
  });

  const arabBankRegister = await prisma.bankCashAccount.create({
    data: {
      type: 'Bank',
      name: 'Arab Bank Current Account',
      bankName: 'Arab Bank',
      accountNumber: 'ARAB-001',
      accountId: arabBank.id,
    },
  });

  const islamicBankRegister = await prisma.bankCashAccount.create({
    data: {
      type: 'Bank',
      name: 'Islamic Bank Current Account',
      bankName: 'Islamic Bank',
      accountNumber: 'ISLAMIC-001',
      accountId: islamicBank.id,
    },
  });

  const postJournalEntry = async ({
    reference,
    description,
    entryDate,
    fiscalPeriodId,
    lines,
  }: {
    reference: string;
    description: string;
    entryDate: Date;
    fiscalPeriodId: string;
    lines: Array<{ accountId: string; description: string; debitAmount: number; creditAmount: number }>;
  }) => {
    const journalEntry = await prisma.journalEntry.create({
      data: {
        reference,
        description,
        entryDate,
        status: 'POSTED',
        postedAt: entryDate,
        fiscalPeriodId,
        createdById: admin.id,
        lines: {
          create: lines.map((line, index) => ({
            accountId: line.accountId,
            lineNumber: index + 1,
            description: line.description,
            debitAmount: line.debitAmount,
            creditAmount: line.creditAmount,
          })),
        },
      },
    });

    const postingBatch = await prisma.postingBatch.create({
      data: { postedAt: entryDate },
    });

    const journalLines = await prisma.journalEntryLine.findMany({
      where: { journalEntryId: journalEntry.id },
      orderBy: { lineNumber: 'asc' },
    });

    const ledgerLines: Array<{ id: string; accountId: string }> = [];

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      const ledgerLine = await prisma.ledgerTransaction.create({
        data: {
          postingBatchId: postingBatch.id,
          journalEntryId: journalEntry.id,
          journalEntryLineId: journalLines[index].id,
          accountId: line.accountId,
          reference,
          entryDate,
          postedAt: entryDate,
          description: line.description,
          debitAmount: line.debitAmount,
          creditAmount: line.creditAmount,
          fiscalPeriodId,
          createdById: admin.id,
        },
        select: {
          id: true,
          accountId: true,
        },
      });

      ledgerLines.push(ledgerLine);

      await prisma.account.update({
        where: { id: line.accountId },
        data: {
          currentBalance: {
            increment: line.debitAmount - line.creditAmount,
          },
        },
      });
    }

    return { journalEntry, ledgerLines };
  };

  console.log('Posting sample journals and bank/cash activity...');

  const capitalPosting = await postJournalEntry({
    reference: 'JE-2026-0001',
    description: 'Initial owner capital',
    entryDate: new Date('2026-01-01'),
    fiscalPeriodId: period1.id,
    lines: [
      { accountId: arabBank.id, description: 'Capital deposited to Arab Bank', debitAmount: 50000, creditAmount: 0 },
      { accountId: ownerCapital.id, description: 'Owner capital', debitAmount: 0, creditAmount: 50000 },
    ],
  });

  await postJournalEntry({
    reference: 'JE-2026-0002',
    description: 'Credit sale invoice',
    entryDate: new Date('2026-04-10'),
    fiscalPeriodId: period4.id,
    lines: [
      { accountId: customers.id, description: 'Invoice to customer', debitAmount: 2500, creditAmount: 0 },
      { accountId: salesRevenue.id, description: 'Sales on account', debitAmount: 0, creditAmount: 2500 },
    ],
  });

  const cashReceiptPosting = await postJournalEntry({
    reference: 'RCPT-2026-001',
    description: 'Cash sales receipt',
    entryDate: new Date('2026-04-12'),
    fiscalPeriodId: period4.id,
    lines: [
      { accountId: mainCash.id, description: 'Cash received', debitAmount: 800, creditAmount: 0 },
      { accountId: salesRevenue.id, description: 'Sales revenue cash', debitAmount: 0, creditAmount: 800 },
    ],
  });

  await prisma.bankCashTransaction.create({
    data: {
      kind: 'RECEIPT',
      status: 'POSTED',
      reference: 'RCPT-2026-001',
      transactionDate: new Date('2026-04-12'),
      amount: 800,
      bankCashAccountId: cashRegister.id,
      counterAccountId: salesRevenue.id,
      counterpartyName: 'Walk-in Customer',
      description: 'Cash sales receipt',
      journalEntryId: cashReceiptPosting.journalEntry.id,
      postedAt: new Date('2026-04-12'),
    },
  });

  const bankReceiptPosting = await postJournalEntry({
    reference: 'RCPT-2026-002',
    description: 'Collection from trade customers',
    entryDate: new Date('2026-04-14'),
    fiscalPeriodId: period4.id,
    lines: [
      { accountId: arabBank.id, description: 'Customer collection to bank', debitAmount: 1500, creditAmount: 0 },
      { accountId: customers.id, description: 'Settlement of receivable', debitAmount: 0, creditAmount: 1500 },
    ],
  });

  await prisma.bankCashTransaction.create({
    data: {
      kind: 'RECEIPT',
      status: 'POSTED',
      reference: 'RCPT-2026-002',
      transactionDate: new Date('2026-04-14'),
      amount: 1500,
      bankCashAccountId: arabBankRegister.id,
      counterAccountId: customers.id,
      counterpartyName: 'Customer A',
      description: 'Collection from trade customers',
      journalEntryId: bankReceiptPosting.journalEntry.id,
      postedAt: new Date('2026-04-14'),
    },
  });

  const transferPosting = await postJournalEntry({
    reference: 'TRF-2026-001',
    description: 'Deposit cash into bank',
    entryDate: new Date('2026-04-15'),
    fiscalPeriodId: period4.id,
    lines: [
      { accountId: arabBank.id, description: 'Cash deposited to Arab Bank', debitAmount: 500, creditAmount: 0 },
      { accountId: mainCash.id, description: 'Cash transferred from register', debitAmount: 0, creditAmount: 500 },
    ],
  });

  await prisma.bankCashTransaction.create({
    data: {
      kind: 'TRANSFER',
      status: 'POSTED',
      reference: 'TRF-2026-001',
      transactionDate: new Date('2026-04-15'),
      amount: 500,
      sourceBankCashAccountId: cashRegister.id,
      destinationBankCashAccountId: arabBankRegister.id,
      description: 'Deposit cash into bank',
      journalEntryId: transferPosting.journalEntry.id,
      postedAt: new Date('2026-04-15'),
    },
  });

  const rentPaymentPosting = await postJournalEntry({
    reference: 'PAY-2026-001',
    description: 'Office rent payment',
    entryDate: new Date('2026-04-20'),
    fiscalPeriodId: period4.id,
    lines: [
      { accountId: rentExpense.id, description: 'Office rent for April', debitAmount: 1200, creditAmount: 0 },
      { accountId: arabBank.id, description: 'Paid from Arab Bank', debitAmount: 0, creditAmount: 1200 },
    ],
  });

  await prisma.bankCashTransaction.create({
    data: {
      kind: 'PAYMENT',
      status: 'POSTED',
      reference: 'PAY-2026-001',
      transactionDate: new Date('2026-04-20'),
      amount: 1200,
      bankCashAccountId: arabBankRegister.id,
      counterAccountId: rentExpense.id,
      counterpartyName: 'Landlord',
      description: 'Office rent payment',
      journalEntryId: rentPaymentPosting.journalEntry.id,
      postedAt: new Date('2026-04-20'),
    },
  });

  await prisma.bankCashTransaction.create({
    data: {
      kind: 'PAYMENT',
      status: 'DRAFT',
      reference: 'PAY-2026-002',
      transactionDate: new Date('2026-04-27'),
      amount: 900,
      bankCashAccountId: islamicBankRegister.id,
      counterAccountId: salariesExpense.id,
      counterpartyName: 'Payroll Batch',
      description: 'Draft salaries payment',
    },
  });

  console.log('Creating demo bank reconciliation...');

  const capitalBankLedger = capitalPosting.ledgerLines.find((line) => line.accountId === arabBank.id);
  const bankReceiptLedger = bankReceiptPosting.ledgerLines.find((line) => line.accountId === arabBank.id);
  const transferBankLedger = transferPosting.ledgerLines.find((line) => line.accountId === arabBank.id);
  const rentPaymentBankLedger = rentPaymentPosting.ledgerLines.find((line) => line.accountId === arabBank.id);

  if (!capitalBankLedger || !bankReceiptLedger || !transferBankLedger || !rentPaymentBankLedger) {
    throw new Error('Bank-side ledger lines were not created as expected.');
  }

  const reconciliation = await prisma.bankReconciliation.create({
    data: {
      bankCashAccountId: arabBankRegister.id,
      statementDate: new Date('2026-04-30'),
      statementEndingBalance: 50775,
      notes: 'Demo reconciliation with one unmatched bank fee.',
      status: 'DRAFT',
    },
  });

  const capitalStatementLine = await prisma.bankStatementLine.create({
    data: {
      reconciliationId: reconciliation.id,
      transactionDate: new Date('2026-01-01'),
      reference: 'CAP-001',
      description: 'Capital deposit',
      debitAmount: 50000,
      creditAmount: 0,
      status: 'RECONCILED',
    },
  });

  const customerReceiptStatementLine = await prisma.bankStatementLine.create({
    data: {
      reconciliationId: reconciliation.id,
      transactionDate: new Date('2026-04-14'),
      reference: 'DEP-001',
      description: 'Customer collection',
      debitAmount: 1500,
      creditAmount: 0,
      status: 'RECONCILED',
    },
  });

  const transferStatementLine = await prisma.bankStatementLine.create({
    data: {
      reconciliationId: reconciliation.id,
      transactionDate: new Date('2026-04-15'),
      reference: 'DEP-002',
      description: 'Cash deposit into bank',
      debitAmount: 500,
      creditAmount: 0,
      status: 'RECONCILED',
    },
  });

  const rentStatementLine = await prisma.bankStatementLine.create({
    data: {
      reconciliationId: reconciliation.id,
      transactionDate: new Date('2026-04-20'),
      reference: 'CHQ-001',
      description: 'Rent payment',
      debitAmount: 0,
      creditAmount: 1200,
      status: 'RECONCILED',
    },
  });

  await prisma.bankStatementLine.create({
    data: {
      reconciliationId: reconciliation.id,
      transactionDate: new Date('2026-04-25'),
      reference: 'FEE-001',
      description: 'Bank charge not yet recorded',
      debitAmount: 0,
      creditAmount: 25,
      status: 'UNMATCHED',
    },
  });

  const createReconciledMatch = (statementLineId: string, ledgerTransactionId: string) =>
    prisma.bankReconciliationMatch.create({
      data: {
        reconciliationId: reconciliation.id,
        statementLineId,
        ledgerTransactionId,
        isReconciled: true,
        matchedAt: new Date('2026-04-30'),
        reconciledAt: new Date('2026-04-30'),
      },
    });

  await createReconciledMatch(capitalStatementLine.id, capitalBankLedger.id);
  await createReconciledMatch(customerReceiptStatementLine.id, bankReceiptLedger.id);
  await createReconciledMatch(transferStatementLine.id, transferBankLedger.id);
  await createReconciledMatch(rentStatementLine.id, rentPaymentBankLedger.id);

  console.log('Seed complete.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
