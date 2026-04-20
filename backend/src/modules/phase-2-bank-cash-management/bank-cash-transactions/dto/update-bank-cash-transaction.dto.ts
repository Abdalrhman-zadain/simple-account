import { Type } from 'class-transformer';
import { IsDateString, IsNumber, IsOptional, IsString, Length, Min } from 'class-validator';

export class UpdateBankCashTransactionDto {
  @IsOptional()
  @IsString()
  @Length(1, 64)
  reference?: string;

  @IsOptional()
  @IsDateString()
  transactionDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount?: number;

  @IsOptional()
  @IsString()
  bankCashAccountId?: string;

  @IsOptional()
  @IsString()
  sourceBankCashAccountId?: string;

  @IsOptional()
  @IsString()
  destinationBankCashAccountId?: string;

  @IsOptional()
  @IsString()
  counterAccountId?: string;

  @IsOptional()
  @IsString()
  customerId?: string | null;

  @IsOptional()
  @IsString()
  @Length(0, 120)
  counterpartyName?: string | null;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  description?: string | null;
}
