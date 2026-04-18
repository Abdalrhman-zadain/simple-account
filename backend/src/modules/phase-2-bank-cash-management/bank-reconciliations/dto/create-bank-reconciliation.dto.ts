import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsNumber, IsOptional, IsString, Length, Min, ValidateNested } from 'class-validator';

export class CreateBankReconciliationDto {
  @IsString()
  bankCashAccountId!: string;

  @IsDateString()
  statementDate!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  statementEndingBalance!: number;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  notes?: string;
}

export class CreateBankStatementLineDto {
  @IsDateString()
  transactionDate!: string;

  @IsOptional()
  @IsString()
  @Length(0, 64)
  reference?: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  description?: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  debitAmount!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  creditAmount!: number;
}

export class ImportBankStatementLinesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateBankStatementLineDto)
  lines!: CreateBankStatementLineDto[];
}

export class CreateBankReconciliationMatchDto {
  @IsString()
  statementLineId!: string;

  @IsString()
  ledgerTransactionId!: string;
}
