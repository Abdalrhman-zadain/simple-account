import { IsOptional, IsString, Length } from 'class-validator';

export class CreateBankCashAccountDto {
  @IsString()
  @Length(1, 64)
  type!: string;

  @IsString()
  @Length(1, 120)
  name!: string;

  @IsOptional()
  @IsString()
  @Length(0, 120)
  bankName?: string;

  @IsOptional()
  @IsString()
  @Length(0, 120)
  accountNumber?: string;

  @IsString()
  @Length(1, 12)
  currencyCode!: string;

  @IsString()
  accountId!: string;
}
