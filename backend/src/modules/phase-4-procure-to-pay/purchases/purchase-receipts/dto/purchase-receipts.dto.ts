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

export class PurchaseReceiptLineDto {
  @IsString()
  purchaseOrderLineId!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  quantityReceived!: number;
}

export class CreatePurchaseReceiptDto {
  @IsOptional()
  @IsString()
  @Length(1, 40)
  reference?: string;

  @IsDateString()
  receiptDate!: string;

  @IsString()
  purchaseOrderId!: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  description?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PurchaseReceiptLineDto)
  lines!: PurchaseReceiptLineDto[];
}

export class UpdatePurchaseReceiptDto {
  @IsOptional()
  @IsString()
  @Length(1, 40)
  reference?: string;

  @IsOptional()
  @IsDateString()
  receiptDate?: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  description?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PurchaseReceiptLineDto)
  lines?: PurchaseReceiptLineDto[];
}
