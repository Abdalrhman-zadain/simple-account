import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Min,
  ValidateNested,
} from "class-validator";

import {
  EmployeePaymentMethod,
  EmployeeStatus,
  PayrollCalculationMethod,
  PayrollComponentType,
  PayrollRuleType,
} from "../../../../generated/prisma";

export class CreatePayrollGroupDto {
  @IsOptional()
  @IsString()
  @Length(1, 40)
  code?: string;

  @IsString()
  @Length(1, 120)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdatePayrollGroupDto {
  @IsOptional()
  @IsString()
  @Length(1, 120)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateEmployeeDto {
  @IsOptional()
  @IsString()
  @Length(1, 40)
  code?: string;

  @IsString()
  @Length(1, 120)
  name!: string;

  @IsOptional()
  @IsString()
  @Length(0, 120)
  department?: string;

  @IsOptional()
  @IsString()
  @Length(0, 120)
  position?: string;

  @IsDateString()
  joiningDate!: string;

  @IsEnum(EmployeePaymentMethod)
  paymentMethod!: EmployeePaymentMethod;

  @IsOptional()
  @IsString()
  defaultSalaryStructure?: string;

  @IsOptional()
  @IsString()
  bankAccountNumber?: string;

  @IsOptional()
  @IsString()
  payrollGroup?: string;

  @IsOptional()
  @IsString()
  payrollGroupId?: string;
}

export class UpdateEmployeeDto {
  @IsOptional()
  @IsString()
  @Length(1, 120)
  name?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  position?: string;

  @IsOptional()
  @IsDateString()
  joiningDate?: string;

  @IsOptional()
  @IsEnum(EmployeePaymentMethod)
  paymentMethod?: EmployeePaymentMethod;

  @IsOptional()
  @IsEnum(EmployeeStatus)
  status?: EmployeeStatus;

  @IsOptional()
  @IsString()
  defaultSalaryStructure?: string;

  @IsOptional()
  @IsString()
  bankAccountNumber?: string;

  @IsOptional()
  @IsString()
  payrollGroup?: string;

  @IsOptional()
  @IsString()
  payrollGroupId?: string;
}

export class CreatePayrollComponentDto {
  @IsOptional()
  @IsString()
  @Length(1, 40)
  code?: string;

  @IsString()
  @Length(1, 120)
  name!: string;

  @IsOptional()
  @IsString()
  nameAr?: string;

  @IsEnum(PayrollComponentType)
  type!: PayrollComponentType;

  @IsEnum(PayrollCalculationMethod)
  calculationMethod!: PayrollCalculationMethod;

  @IsOptional()
  @IsNumber()
  defaultAmount?: number;

  @IsOptional()
  @IsNumber()
  defaultPercentage?: number;

  @IsOptional()
  @IsString()
  formula?: string;

  @IsOptional()
  @IsBoolean()
  taxable?: boolean;

  @IsOptional()
  @IsString()
  expenseAccountId?: string;

  @IsOptional()
  @IsString()
  liabilityAccountId?: string;
}

export class UpdatePayrollComponentDto {
  @IsOptional()
  @IsString()
  @Length(1, 120)
  name?: string;

  @IsOptional()
  @IsString()
  nameAr?: string;

  @IsOptional()
  @IsEnum(PayrollComponentType)
  type?: PayrollComponentType;

  @IsOptional()
  @IsEnum(PayrollCalculationMethod)
  calculationMethod?: PayrollCalculationMethod;

  @IsOptional()
  @IsNumber()
  defaultAmount?: number;

  @IsOptional()
  @IsNumber()
  defaultPercentage?: number;

  @IsOptional()
  @IsString()
  formula?: string;

  @IsOptional()
  @IsBoolean()
  taxable?: boolean;

  @IsOptional()
  @IsString()
  expenseAccountId?: string;

  @IsOptional()
  @IsString()
  liabilityAccountId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class AssignEmployeeComponentDto {
  @IsString()
  payrollComponentId!: string;

  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsNumber()
  percentage?: number;

  @IsOptional()
  @IsNumber()
  quantity?: number;

  @IsOptional()
  @IsNumber()
  installmentAmount?: number;

  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @IsOptional()
  @IsDateString()
  effectiveTo?: string;

  @IsOptional()
  @IsNumber()
  outstandingBalance?: number;
}

export class AssignGroupComponentDto extends AssignEmployeeComponentDto {}

export class CreatePayrollRuleDto {
  @IsOptional()
  @IsString()
  @Length(1, 40)
  code?: string;

  @IsString()
  @Length(1, 120)
  name!: string;

  @IsEnum(PayrollRuleType)
  ruleType!: PayrollRuleType;

  @IsString()
  payrollComponentId!: string;

  @IsOptional()
  @IsString()
  payrollGroupId?: string;

  @IsEnum(PayrollCalculationMethod)
  calculationMethod!: PayrollCalculationMethod;

  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsNumber()
  percentage?: number;

  @IsOptional()
  @IsString()
  formula?: string;
}

export class UpdatePayrollRuleDto {
  @IsOptional()
  @IsString()
  @Length(1, 120)
  name?: string;

  @IsOptional()
  @IsEnum(PayrollRuleType)
  ruleType?: PayrollRuleType;

  @IsOptional()
  @IsString()
  payrollComponentId?: string;

  @IsOptional()
  @IsString()
  payrollGroupId?: string;

  @IsOptional()
  @IsEnum(PayrollCalculationMethod)
  calculationMethod?: PayrollCalculationMethod;

  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsNumber()
  percentage?: number;

  @IsOptional()
  @IsString()
  formula?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreatePayrollPeriodDto {
  @IsOptional()
  @IsString()
  reference?: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  payrollGroup?: string;

  @IsOptional()
  @IsString()
  payrollGroupId?: string;

  @IsOptional()
  @IsString()
  cycle?: string;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsDateString()
  paymentDate!: string;

  @IsString()
  payrollPayableAccountId!: string;
}

export class UpdatePayrollPeriodDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  payrollGroup?: string;

  @IsOptional()
  @IsString()
  payrollGroupId?: string;

  @IsOptional()
  @IsString()
  cycle?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsDateString()
  paymentDate?: string;

  @IsOptional()
  @IsString()
  payrollPayableAccountId?: string;
}

export class GeneratePayslipsDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  employeeIds?: string[];
}

export class PayslipLineInputDto {
  @IsOptional()
  @IsString()
  payrollComponentId?: string;

  @IsString()
  componentCode!: string;

  @IsString()
  componentName!: string;

  @IsEnum(PayrollComponentType)
  componentType!: PayrollComponentType;

  @IsEnum(PayrollCalculationMethod)
  calculationMethod!: PayrollCalculationMethod;

  @IsOptional()
  @IsNumber()
  quantity?: number;

  @IsOptional()
  @IsNumber()
  rate?: number;

  @IsNumber()
  amount!: number;

  @IsOptional()
  @IsString()
  accountId?: string;

  @IsOptional()
  @IsString()
  liabilityAccountId?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdatePayslipDto {
  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PayslipLineInputDto)
  lines?: PayslipLineInputDto[];
}

export class PayrollPaymentAllocationDto {
  @IsString()
  payslipId!: string;

  @IsNumber()
  @Min(0.01)
  amount!: number;
}

export class CreatePayrollPaymentDto {
  @IsOptional()
  @IsString()
  reference?: string;

  @IsDateString()
  paymentDate!: string;

  @IsString()
  payrollPeriodId!: string;

  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsString()
  bankCashAccountId!: string;

  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PayrollPaymentAllocationDto)
  allocations?: PayrollPaymentAllocationDto[];
}

export class UpdatePayrollPaymentDto {
  @IsOptional()
  @IsDateString()
  paymentDate?: string;

  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsOptional()
  @IsString()
  bankCashAccountId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PayrollPaymentAllocationDto)
  allocations?: PayrollPaymentAllocationDto[];
}

export class AdjustPayslipDto {
  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PayslipLineInputDto)
  lines!: PayslipLineInputDto[];
}
