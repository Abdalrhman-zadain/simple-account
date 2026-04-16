import { Type } from 'class-transformer';
import { IsDateString, IsNumber, IsOptional, IsString, Length, Min } from 'class-validator';

export class CreateReceiptDto {
  @IsOptional()
  @IsString()
  @Length(1, 64)
  reference?: string;

  @IsDateString()
  transactionDate!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @IsString()
  bankCashAccountId!: string;

  @IsString()
  counterAccountId!: string;

  @IsOptional()
  @IsString()
  @Length(0, 120)
  counterpartyName?: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  description?: string;
}

export class CreatePaymentDto extends CreateReceiptDto {}

export class CreateTransferDto {
  @IsOptional()
  @IsString()
  @Length(1, 64)
  reference?: string;

  @IsDateString()
  transactionDate!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @IsString()
  sourceBankCashAccountId!: string;

  @IsString()
  destinationBankCashAccountId!: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  description?: string;
}
