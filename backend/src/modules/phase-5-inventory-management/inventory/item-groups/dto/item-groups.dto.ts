import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';

export class CreateInventoryItemGroupDto {
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

  @IsOptional()
  @IsString()
  parentGroupId?: string;

  @IsOptional()
  @IsString()
  inventoryAccountId?: string;

  @IsOptional()
  @IsString()
  cogsAccountId?: string;

  @IsOptional()
  @IsString()
  salesAccountId?: string;

  @IsOptional()
  @IsString()
  adjustmentAccountId?: string;
}

export class UpdateInventoryItemGroupDto extends CreateInventoryItemGroupDto {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
