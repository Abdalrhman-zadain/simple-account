import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Min,
  ValidateNested,
} from 'class-validator';

export class PurchaseOrderLineDto {
  @IsOptional()
  @IsString()
  itemId?: string;

  @IsOptional()
  @IsString()
  @Length(0, 120)
  itemName?: string;

  @IsString()
  @Length(1, 255)
  description!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  quantity!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  taxAmount!: number;

  @IsOptional()
  @IsDateString()
  requestedDeliveryDate?: string;
}

export class CreatePurchaseOrderDto {
  @IsOptional()
  @IsString()
  @Length(1, 40)
  reference?: string;

  @IsDateString()
  orderDate!: string;

  @IsString()
  supplierId!: string;

  @IsOptional()
  @IsString()
  @Length(1, 8)
  currencyCode?: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  description?: string;

  @IsOptional()
  @IsString()
  sourcePurchaseRequestId?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderLineDto)
  lines!: PurchaseOrderLineDto[];
}

export class UpdatePurchaseOrderDto {
  @IsOptional()
  @IsString()
  @Length(1, 40)
  reference?: string;

  @IsOptional()
  @IsDateString()
  orderDate?: string;

  @IsOptional()
  @IsString()
  supplierId?: string;

  @IsOptional()
  @IsString()
  @Length(1, 8)
  currencyCode?: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  description?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderLineDto)
  lines?: PurchaseOrderLineDto[];
}
