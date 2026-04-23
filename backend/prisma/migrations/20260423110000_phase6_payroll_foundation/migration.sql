-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "EmployeePaymentMethod" AS ENUM ('BANK', 'CASH', 'OTHER');

-- CreateEnum
CREATE TYPE "PayrollComponentType" AS ENUM ('EARNING', 'DEDUCTION', 'EMPLOYER_CONTRIBUTION', 'BENEFIT');

-- CreateEnum
CREATE TYPE "PayrollCalculationMethod" AS ENUM ('FIXED_AMOUNT', 'PERCENTAGE', 'QUANTITY', 'FORMULA');

-- CreateEnum
CREATE TYPE "PayrollPeriodStatus" AS ENUM ('DRAFT', 'POSTED', 'CLOSED', 'REVERSED');

-- CreateEnum
CREATE TYPE "PayslipStatus" AS ENUM ('DRAFT', 'POSTED', 'PARTIALLY_PAID', 'PAID', 'CANCELLED', 'REVERSED');

-- CreateEnum
CREATE TYPE "PayrollPaymentStatus" AS ENUM ('DRAFT', 'POSTED', 'CANCELLED', 'REVERSED');

-- CreateEnum
CREATE TYPE "PayrollRuleType" AS ENUM ('TAX', 'INSURANCE', 'LOAN', 'STATUTORY_DEDUCTION', 'OTHER');

-- CreateEnum
CREATE TYPE "PayrollAdjustmentType" AS ENUM ('ADJUSTMENT', 'REVERSAL');

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "department" TEXT,
    "position" TEXT,
    "joiningDate" TIMESTAMP(3) NOT NULL,
    "paymentMethod" "EmployeePaymentMethod" NOT NULL DEFAULT 'BANK',
    "status" "EmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
    "defaultSalaryStructure" TEXT,
    "bankAccountNumber" TEXT,
    "payrollGroup" TEXT,
    "payrollGroupId" TEXT,
    "currentBalance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollGroup" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PayrollGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollComponent" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameAr" TEXT,
    "type" "PayrollComponentType" NOT NULL,
    "calculationMethod" "PayrollCalculationMethod" NOT NULL DEFAULT 'FIXED_AMOUNT',
    "defaultAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "defaultPercentage" DECIMAL(9,4) NOT NULL DEFAULT 0,
    "formula" TEXT,
    "taxable" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expenseAccountId" TEXT,
    "liabilityAccountId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PayrollComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeePayrollComponent" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "payrollComponentId" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "percentage" DECIMAL(9,4) NOT NULL DEFAULT 0,
    "quantity" DECIMAL(18,4) NOT NULL DEFAULT 1,
    "installmentAmount" DECIMAL(18,2),
    "isRecurring" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "outstandingBalance" DECIMAL(18,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EmployeePayrollComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollGroupComponent" (
    "id" TEXT NOT NULL,
    "payrollGroupId" TEXT NOT NULL,
    "payrollComponentId" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "percentage" DECIMAL(9,4) NOT NULL DEFAULT 0,
    "quantity" DECIMAL(18,4) NOT NULL DEFAULT 1,
    "installmentAmount" DECIMAL(18,2),
    "isRecurring" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PayrollGroupComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollRule" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ruleType" "PayrollRuleType" NOT NULL,
    "payrollComponentId" TEXT NOT NULL,
    "payrollGroupId" TEXT,
    "calculationMethod" "PayrollCalculationMethod" NOT NULL DEFAULT 'FIXED_AMOUNT',
    "amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "percentage" DECIMAL(9,4) NOT NULL DEFAULT 0,
    "formula" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PayrollRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollPeriod" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "payrollGroup" TEXT,
    "payrollGroupId" TEXT,
    "cycle" TEXT NOT NULL DEFAULT 'MONTHLY',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "status" "PayrollPeriodStatus" NOT NULL DEFAULT 'DRAFT',
    "payrollPayableAccountId" TEXT NOT NULL,
    "journalEntryId" TEXT,
    "postedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PayrollPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollAdjustment" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "type" "PayrollAdjustmentType" NOT NULL,
    "payrollPeriodId" TEXT NOT NULL,
    "payslipId" TEXT,
    "employeeId" TEXT,
    "amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "description" TEXT,
    "journalEntryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PayrollAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payslip" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "status" "PayslipStatus" NOT NULL DEFAULT 'DRAFT',
    "payrollPeriodId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "grossPay" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalDeductions" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "employerContributions" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "netPay" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "paidAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "outstandingAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "postedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Payslip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayslipLine" (
    "id" TEXT NOT NULL,
    "payslipId" TEXT NOT NULL,
    "payrollComponentId" TEXT,
    "lineNumber" INTEGER NOT NULL,
    "componentCode" TEXT NOT NULL,
    "componentName" TEXT NOT NULL,
    "componentType" "PayrollComponentType" NOT NULL,
    "calculationMethod" "PayrollCalculationMethod" NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL DEFAULT 1,
    "rate" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "accountId" TEXT,
    "liabilityAccountId" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PayslipLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollPayment" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "status" "PayrollPaymentStatus" NOT NULL DEFAULT 'DRAFT',
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "payrollPeriodId" TEXT NOT NULL,
    "employeeId" TEXT,
    "bankCashAccountId" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "allocatedAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "unappliedAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "description" TEXT,
    "bankCashTransactionId" TEXT,
    "postedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PayrollPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollPaymentAllocation" (
    "id" TEXT NOT NULL,
    "payrollPaymentId" TEXT NOT NULL,
    "payslipId" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "allocatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PayrollPaymentAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Employee_code_key" ON "Employee"("code");
CREATE INDEX "Employee_status_name_idx" ON "Employee"("status", "name");
CREATE INDEX "Employee_department_idx" ON "Employee"("department");
CREATE INDEX "Employee_payrollGroup_idx" ON "Employee"("payrollGroup");
CREATE INDEX "Employee_payrollGroupId_idx" ON "Employee"("payrollGroupId");
CREATE UNIQUE INDEX "PayrollGroup_code_key" ON "PayrollGroup"("code");
CREATE INDEX "PayrollGroup_isActive_name_idx" ON "PayrollGroup"("isActive", "name");
CREATE UNIQUE INDEX "PayrollComponent_code_key" ON "PayrollComponent"("code");
CREATE INDEX "PayrollComponent_type_isActive_idx" ON "PayrollComponent"("type", "isActive");
CREATE INDEX "PayrollComponent_expenseAccountId_idx" ON "PayrollComponent"("expenseAccountId");
CREATE INDEX "PayrollComponent_liabilityAccountId_idx" ON "PayrollComponent"("liabilityAccountId");
CREATE UNIQUE INDEX "EmployeePayrollComponent_employeeId_payrollComponentId_key" ON "EmployeePayrollComponent"("employeeId", "payrollComponentId");
CREATE INDEX "EmployeePayrollComponent_payrollComponentId_idx" ON "EmployeePayrollComponent"("payrollComponentId");
CREATE UNIQUE INDEX "PayrollGroupComponent_payrollGroupId_payrollComponentId_key" ON "PayrollGroupComponent"("payrollGroupId", "payrollComponentId");
CREATE INDEX "PayrollGroupComponent_payrollComponentId_idx" ON "PayrollGroupComponent"("payrollComponentId");
CREATE UNIQUE INDEX "PayrollRule_code_key" ON "PayrollRule"("code");
CREATE INDEX "PayrollRule_ruleType_isActive_idx" ON "PayrollRule"("ruleType", "isActive");
CREATE INDEX "PayrollRule_payrollComponentId_idx" ON "PayrollRule"("payrollComponentId");
CREATE INDEX "PayrollRule_payrollGroupId_idx" ON "PayrollRule"("payrollGroupId");
CREATE UNIQUE INDEX "PayrollPeriod_reference_key" ON "PayrollPeriod"("reference");
CREATE UNIQUE INDEX "PayrollPeriod_journalEntryId_key" ON "PayrollPeriod"("journalEntryId");
CREATE INDEX "PayrollPeriod_status_startDate_endDate_idx" ON "PayrollPeriod"("status", "startDate", "endDate");
CREATE INDEX "PayrollPeriod_payrollGroup_idx" ON "PayrollPeriod"("payrollGroup");
CREATE INDEX "PayrollPeriod_payrollGroupId_idx" ON "PayrollPeriod"("payrollGroupId");
CREATE INDEX "PayrollPeriod_payrollPayableAccountId_idx" ON "PayrollPeriod"("payrollPayableAccountId");
CREATE UNIQUE INDEX "PayrollAdjustment_reference_key" ON "PayrollAdjustment"("reference");
CREATE UNIQUE INDEX "PayrollAdjustment_journalEntryId_key" ON "PayrollAdjustment"("journalEntryId");
CREATE INDEX "PayrollAdjustment_payrollPeriodId_type_idx" ON "PayrollAdjustment"("payrollPeriodId", "type");
CREATE INDEX "PayrollAdjustment_payslipId_idx" ON "PayrollAdjustment"("payslipId");
CREATE INDEX "PayrollAdjustment_employeeId_idx" ON "PayrollAdjustment"("employeeId");
CREATE UNIQUE INDEX "Payslip_reference_key" ON "Payslip"("reference");
CREATE UNIQUE INDEX "Payslip_payrollPeriodId_employeeId_key" ON "Payslip"("payrollPeriodId", "employeeId");
CREATE INDEX "Payslip_employeeId_status_idx" ON "Payslip"("employeeId", "status");
CREATE INDEX "Payslip_payrollPeriodId_status_idx" ON "Payslip"("payrollPeriodId", "status");
CREATE UNIQUE INDEX "PayslipLine_payslipId_lineNumber_key" ON "PayslipLine"("payslipId", "lineNumber");
CREATE INDEX "PayslipLine_payrollComponentId_idx" ON "PayslipLine"("payrollComponentId");
CREATE UNIQUE INDEX "PayrollPayment_reference_key" ON "PayrollPayment"("reference");
CREATE UNIQUE INDEX "PayrollPayment_bankCashTransactionId_key" ON "PayrollPayment"("bankCashTransactionId");
CREATE INDEX "PayrollPayment_payrollPeriodId_status_paymentDate_idx" ON "PayrollPayment"("payrollPeriodId", "status", "paymentDate");
CREATE INDEX "PayrollPayment_employeeId_idx" ON "PayrollPayment"("employeeId");
CREATE INDEX "PayrollPayment_bankCashAccountId_idx" ON "PayrollPayment"("bankCashAccountId");
CREATE UNIQUE INDEX "PayrollPaymentAllocation_payrollPaymentId_payslipId_key" ON "PayrollPaymentAllocation"("payrollPaymentId", "payslipId");
CREATE INDEX "PayrollPaymentAllocation_payslipId_idx" ON "PayrollPaymentAllocation"("payslipId");

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_payrollGroupId_fkey" FOREIGN KEY ("payrollGroupId") REFERENCES "PayrollGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PayrollComponent" ADD CONSTRAINT "PayrollComponent_expenseAccountId_fkey" FOREIGN KEY ("expenseAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PayrollComponent" ADD CONSTRAINT "PayrollComponent_liabilityAccountId_fkey" FOREIGN KEY ("liabilityAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EmployeePayrollComponent" ADD CONSTRAINT "EmployeePayrollComponent_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmployeePayrollComponent" ADD CONSTRAINT "EmployeePayrollComponent_payrollComponentId_fkey" FOREIGN KEY ("payrollComponentId") REFERENCES "PayrollComponent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PayrollGroupComponent" ADD CONSTRAINT "PayrollGroupComponent_payrollGroupId_fkey" FOREIGN KEY ("payrollGroupId") REFERENCES "PayrollGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PayrollGroupComponent" ADD CONSTRAINT "PayrollGroupComponent_payrollComponentId_fkey" FOREIGN KEY ("payrollComponentId") REFERENCES "PayrollComponent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PayrollRule" ADD CONSTRAINT "PayrollRule_payrollComponentId_fkey" FOREIGN KEY ("payrollComponentId") REFERENCES "PayrollComponent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PayrollRule" ADD CONSTRAINT "PayrollRule_payrollGroupId_fkey" FOREIGN KEY ("payrollGroupId") REFERENCES "PayrollGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PayrollPeriod" ADD CONSTRAINT "PayrollPeriod_payrollGroupId_fkey" FOREIGN KEY ("payrollGroupId") REFERENCES "PayrollGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PayrollPeriod" ADD CONSTRAINT "PayrollPeriod_payrollPayableAccountId_fkey" FOREIGN KEY ("payrollPayableAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PayrollPeriod" ADD CONSTRAINT "PayrollPeriod_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PayrollAdjustment" ADD CONSTRAINT "PayrollAdjustment_payrollPeriodId_fkey" FOREIGN KEY ("payrollPeriodId") REFERENCES "PayrollPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PayrollAdjustment" ADD CONSTRAINT "PayrollAdjustment_payslipId_fkey" FOREIGN KEY ("payslipId") REFERENCES "Payslip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PayrollAdjustment" ADD CONSTRAINT "PayrollAdjustment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PayrollAdjustment" ADD CONSTRAINT "PayrollAdjustment_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Payslip" ADD CONSTRAINT "Payslip_payrollPeriodId_fkey" FOREIGN KEY ("payrollPeriodId") REFERENCES "PayrollPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Payslip" ADD CONSTRAINT "Payslip_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PayslipLine" ADD CONSTRAINT "PayslipLine_payslipId_fkey" FOREIGN KEY ("payslipId") REFERENCES "Payslip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PayslipLine" ADD CONSTRAINT "PayslipLine_payrollComponentId_fkey" FOREIGN KEY ("payrollComponentId") REFERENCES "PayrollComponent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PayrollPayment" ADD CONSTRAINT "PayrollPayment_payrollPeriodId_fkey" FOREIGN KEY ("payrollPeriodId") REFERENCES "PayrollPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PayrollPayment" ADD CONSTRAINT "PayrollPayment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PayrollPayment" ADD CONSTRAINT "PayrollPayment_bankCashAccountId_fkey" FOREIGN KEY ("bankCashAccountId") REFERENCES "BankCashAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PayrollPayment" ADD CONSTRAINT "PayrollPayment_bankCashTransactionId_fkey" FOREIGN KEY ("bankCashTransactionId") REFERENCES "BankCashTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PayrollPaymentAllocation" ADD CONSTRAINT "PayrollPaymentAllocation_payrollPaymentId_fkey" FOREIGN KEY ("payrollPaymentId") REFERENCES "PayrollPayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PayrollPaymentAllocation" ADD CONSTRAINT "PayrollPaymentAllocation_payslipId_fkey" FOREIGN KEY ("payslipId") REFERENCES "Payslip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
