import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsEnum, IsOptional, IsString, Length, Matches, ValidateNested } from 'class-validator';

import { InventoryItemType } from '../../../../../generated/prisma';

export class InventoryItemUnitConversionDto {
  @IsString()
  unitId!: string;

  @Matches(/^\d+(\.\d{1,6})?$/)
  conversionFactorToBaseUnit!: string;

  @IsOptional()
  @IsString()
  @Length(1, 120)
  barcode?: string;

  @IsOptional()
  @Matches(/^\d+(\.\d{1,4})?$/)
  defaultSalesPrice?: string;

  @IsOptional()
  @Matches(/^\d+(\.\d{1,4})?$/)
  defaultPurchasePrice?: string;

  @IsOptional()
  @IsBoolean()
  isBaseUnit?: boolean;
}

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
  @Length(0, 4000)
  internalNotes?: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  itemImageUrl?: string;

  @IsOptional()
  @IsString()
  @Length(0, 4000)
  attachmentsText?: string;

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
  expenseAccountId?: string;

  @IsOptional()
  @IsString()
  cogsAccountId?: string;

  @IsOptional()
  @IsString()
  salesAccountId?: string;

  @IsOptional()
  @IsString()
  salesReturnAccountId?: string;

  @IsOptional()
  @IsString()
  adjustmentAccountId?: string;

  @IsOptional()
  @Matches(/^\d+(\.\d{1,4})?$/)
  defaultSalesPrice?: string;

  @IsOptional()
  @Matches(/^\d+(\.\d{1,4})?$/)
  defaultPurchasePrice?: string;

  @IsOptional()
  @IsString()
  @Length(1, 12)
  currencyCode?: string;

  @IsOptional()
  @IsBoolean()
  taxable?: boolean;

  @IsOptional()
  @IsString()
  defaultTaxId?: string;

  @IsOptional()
  @IsBoolean()
  trackInventory?: boolean;

  @IsOptional()
  @Matches(/^-?\d+(\.\d{1,4})?$/)
  reorderLevel?: string;

  @IsOptional()
  @Matches(/^-?\d+(\.\d{1,4})?$/)
  reorderQuantity?: string;

  @IsOptional()
  @IsString()
  preferredWarehouseId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InventoryItemUnitConversionDto)
  unitConversions?: InventoryItemUnitConversionDto[];
}
