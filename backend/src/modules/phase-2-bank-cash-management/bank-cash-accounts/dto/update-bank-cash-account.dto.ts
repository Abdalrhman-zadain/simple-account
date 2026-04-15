import { IsOptional, IsString, Length } from 'class-validator';

export class UpdateBankCashAccountDto {
  @IsOptional()
  @IsString()
  @Length(1, 64)
  type?: string;

  @IsOptional()
  @IsString()
  @Length(1, 120)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(0, 120)
  bankName?: string;

  @IsOptional()
  @IsString()
  @Length(0, 120)
  accountNumber?: string;

  @IsOptional()
  @IsString()
  @Length(1, 12)
  currencyCode?: string;

  @IsOptional()
  @IsString()
  accountId?: string;
}
