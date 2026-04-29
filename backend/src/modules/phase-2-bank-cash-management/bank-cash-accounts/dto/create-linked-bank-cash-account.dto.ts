import { IsIn, IsOptional, IsString, Length } from 'class-validator';

export class CreateLinkedBankCashAccountDto {
  @IsString()
  @IsIn(['create_parent_and_child', 'create_child_under_existing_parent'])
  mode!: 'create_parent_and_child' | 'create_child_under_existing_parent';

  @IsString()
  @Length(1, 12)
  currencyCode!: string;

  @IsString()
  @Length(1, 120)
  childName!: string;

  @IsOptional()
  @IsString()
  @Length(0, 120)
  childNameAr?: string;

  @IsOptional()
  @IsString()
  @Length(1, 120)
  parentName?: string;

  @IsOptional()
  @IsString()
  @Length(0, 120)
  parentNameAr?: string;

  @IsOptional()
  @IsString()
  existingParentAccountId?: string;
}
