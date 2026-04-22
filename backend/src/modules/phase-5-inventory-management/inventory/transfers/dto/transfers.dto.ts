import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDateString, IsOptional, IsString, Length, Matches, ValidateNested } from 'class-validator';

export class InventoryTransferLineDto {
  @IsString()
  itemId!: string;

  @Matches(/^\d+(\.\d{1,4})?$/)
  quantity!: string;

  @IsString()
  @Length(1, 32)
  unitOfMeasure!: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  description?: string;
}

export class CreateInventoryTransferDto {
  @IsOptional()
  @IsString()
  @Length(1, 40)
  reference?: string;

  @IsDateString()
  transferDate!: string;

  @IsString()
  sourceWarehouseId!: string;

  @IsString()
  destinationWarehouseId!: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  description?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => InventoryTransferLineDto)
  lines!: InventoryTransferLineDto[];
}

export class UpdateInventoryTransferDto {
  @IsOptional()
  @IsString()
  @Length(1, 40)
  reference?: string;

  @IsOptional()
  @IsDateString()
  transferDate?: string;

  @IsOptional()
  @IsString()
  sourceWarehouseId?: string;

  @IsOptional()
  @IsString()
  destinationWarehouseId?: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  description?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => InventoryTransferLineDto)
  lines?: InventoryTransferLineDto[];
}
