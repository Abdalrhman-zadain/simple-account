import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDateString, IsOptional, IsString, Length, Matches, ValidateNested } from 'class-validator';

export class InventoryAdjustmentLineDto {
  @IsString()
  itemId!: string;

  @Matches(/^\d+(\.\d{1,4})?$/)
  systemQuantity!: string;

  @Matches(/^\d+(\.\d{1,4})?$/)
  countedQuantity!: string;

  @IsString()
  @Length(1, 32)
  unitOfMeasure!: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  description?: string;
}

export class CreateInventoryAdjustmentDto {
  @IsOptional()
  @IsString()
  @Length(1, 40)
  reference?: string;

  @IsDateString()
  adjustmentDate!: string;

  @IsString()
  warehouseId!: string;

  @IsString()
  @Length(1, 80)
  reason!: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  description?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => InventoryAdjustmentLineDto)
  lines!: InventoryAdjustmentLineDto[];
}

export class UpdateInventoryAdjustmentDto {
  @IsOptional()
  @IsString()
  @Length(1, 40)
  reference?: string;

  @IsOptional()
  @IsDateString()
  adjustmentDate?: string;

  @IsOptional()
  @IsString()
  warehouseId?: string;

  @IsOptional()
  @IsString()
  @Length(1, 80)
  reason?: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  description?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => InventoryAdjustmentLineDto)
  lines?: InventoryAdjustmentLineDto[];
}
