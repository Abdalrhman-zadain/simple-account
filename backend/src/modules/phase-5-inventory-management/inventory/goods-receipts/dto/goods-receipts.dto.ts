import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  Length,
  Matches,
  ValidateNested,
} from 'class-validator';

export class InventoryGoodsReceiptLineDto {
  @IsString()
  itemId!: string;

  @Matches(/^\d+(\.\d{1,4})?$/)
  quantity!: string;

  @Matches(/^\d+(\.\d{1,2})?$/)
  unitCost!: string;

  @IsString()
  @Length(1, 32)
  unitOfMeasure!: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  description?: string;
}

export class CreateInventoryGoodsReceiptDto {
  @IsOptional()
  @IsString()
  @Length(1, 40)
  reference?: string;

  @IsDateString()
  receiptDate!: string;

  @IsString()
  warehouseId!: string;

  @IsOptional()
  @IsString()
  @Length(0, 40)
  sourcePurchaseOrderRef?: string;

  @IsOptional()
  @IsString()
  @Length(0, 40)
  sourcePurchaseInvoiceRef?: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  description?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => InventoryGoodsReceiptLineDto)
  lines!: InventoryGoodsReceiptLineDto[];
}

export class UpdateInventoryGoodsReceiptDto {
  @IsOptional()
  @IsString()
  @Length(1, 40)
  reference?: string;

  @IsOptional()
  @IsDateString()
  receiptDate?: string;

  @IsOptional()
  @IsString()
  warehouseId?: string;

  @IsOptional()
  @IsString()
  @Length(0, 40)
  sourcePurchaseOrderRef?: string;

  @IsOptional()
  @IsString()
  @Length(0, 40)
  sourcePurchaseInvoiceRef?: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  description?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => InventoryGoodsReceiptLineDto)
  lines?: InventoryGoodsReceiptLineDto[];
}
