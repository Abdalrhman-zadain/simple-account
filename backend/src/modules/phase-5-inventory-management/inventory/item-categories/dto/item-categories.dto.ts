import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';

export class CreateInventoryItemCategoryDto {
  @IsOptional()
  @IsString()
  @Length(1, 40)
  code?: string;

  @IsString()
  @Length(1, 120)
  name!: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  description?: string;

  @IsString()
  itemGroupId!: string;
}

export class UpdateInventoryItemCategoryDto {
  @IsOptional()
  @IsString()
  @Length(1, 120)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  description?: string;

  @IsOptional()
  @IsString()
  itemGroupId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
