import { AccountType } from '../../../../../generated/prisma/index';
import { IsEnum, IsOptional, IsString, Length } from 'class-validator';

export class UpdateAccountDto {
  @IsOptional()
  @IsString()
  @Length(1, 120)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(0, 120)
  nameAr?: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string;

  @IsOptional()
  @IsEnum(AccountType)
  type?: AccountType;

  @IsOptional()
  @IsString()
  @Length(0, 64)
  subtype?: string;

  @IsOptional()
  isPosting?: boolean;

  @IsOptional()
  @IsString()
  segment1?: string;

  @IsOptional()
  @IsString()
  segment2?: string;

  @IsOptional()
  @IsString()
  segment3?: string;

  @IsOptional()
  @IsString()
  segment4?: string;

  @IsOptional()
  @IsString()
  segment5?: string;

  // Enterprise Relational Segments
  @IsOptional()
  @IsString()
  segment1ValueId?: string;

  @IsOptional()
  @IsString()
  segment2ValueId?: string;

  @IsOptional()
  @IsString()
  segment3ValueId?: string;

  @IsOptional()
  @IsString()
  segment4ValueId?: string;

  @IsOptional()
  @IsString()
  segment5ValueId?: string;

  @IsOptional()
  @IsString()
  currencyCode?: string;

  @IsOptional()
  @IsString()
  parentAccountId?: string | null;

  @IsOptional()
  allowManualPosting?: boolean;

  @IsOptional()
  isActive?: boolean;
}
