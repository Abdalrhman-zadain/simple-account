import { IsEnum, IsOptional, IsString, Length, Matches } from 'class-validator';

import { InventoryItemType } from '../../../../../generated/prisma';

export class CreateInventoryItemDto {
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
  @Length(1, 120)
  barcode?: string;

  @IsOptional()
  @IsString()
  @Length(1, 4000)
  qrCodeValue?: string;
  @IsString()
  @Length(1, 32)
  unitOfMeasure?: string;

  @IsString()
  unitOfMeasureId!: string;

  @IsOptional()
  @IsString()
  @Length(0, 120)
  category?: string;

  @IsString()
  itemGroupId!: string;

  @IsString()
  itemCategoryId!: string;

  @IsEnum(InventoryItemType)
  type!: InventoryItemType;

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

  @IsOptional()
  @Matches(/^-?\d+(\.\d{1,4})?$/)
  reorderLevel?: string;

  @IsOptional()
  @Matches(/^-?\d+(\.\d{1,4})?$/)
  reorderQuantity?: string;

  @IsOptional()
  @IsString()
  preferredWarehouseId?: string;
}
