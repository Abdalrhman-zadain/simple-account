import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';

export class UpdateSupplierDto {
  @IsOptional()
  @IsString()
  @Length(1, 120)
  name?: string;

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

  @IsOptional()
  @IsString()
  @Length(1, 120)
  paymentTerms?: string;

  @IsOptional()
  @IsString()
  @Length(0, 120)
  taxInfo?: string;

  @IsOptional()
  @IsString()
  @Length(1, 8)
  defaultCurrency?: string;

  @IsOptional()
  @IsString()
  payableAccountId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
