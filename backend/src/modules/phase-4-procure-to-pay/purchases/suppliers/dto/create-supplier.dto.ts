import { IsOptional, IsString, Length } from 'class-validator';

export class CreateSupplierDto {
  @IsOptional()
  @IsString()
  @Length(1, 32)
  code?: string;

  @IsString()
  @Length(1, 120)
  name!: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  contactInfo?: string;

  @IsOptional()
  @IsString()
  @Length(0, 64)
  phone?: string;

  @IsOptional()
  @IsString()
  @Length(0, 120)
  email?: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  address?: string;

  @IsString()
  @Length(1, 120)
  paymentTerms!: string;

  @IsOptional()
  @IsString()
  @Length(0, 120)
  taxInfo?: string;

  @IsString()
  @Length(1, 8)
  defaultCurrency!: string;

  @IsString()
  payableAccountId!: string;
}
