import { BankReconciliationStatus } from '../../../../generated/prisma';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

export class QueryBankReconciliationsDto {
  @IsOptional()
  @IsString()
  bankCashAccountId?: string;

  @IsOptional()
  @IsEnum(BankReconciliationStatus)
  status?: BankReconciliationStatus;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
