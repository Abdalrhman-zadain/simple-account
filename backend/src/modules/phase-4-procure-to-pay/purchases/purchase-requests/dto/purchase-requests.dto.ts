import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  Length,
  ValidateNested,
  IsNumber,
  Min,
} from 'class-validator';

export class PurchaseRequestLineDto {
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

  @IsOptional()
  @IsDateString()
  requestedDeliveryDate?: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  justification?: string;
}

export class CreatePurchaseRequestDto {
  @IsOptional()
  @IsString()
  @Length(1, 40)
  reference?: string;

  @IsDateString()
  requestDate!: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  description?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PurchaseRequestLineDto)
  lines!: PurchaseRequestLineDto[];
}

export class UpdatePurchaseRequestDto {
  @IsOptional()
  @IsString()
  @Length(1, 40)
  reference?: string;

  @IsOptional()
  @IsDateString()
  requestDate?: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  description?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PurchaseRequestLineDto)
  lines?: PurchaseRequestLineDto[];
}

export class PurchaseRequestStatusNoteDto {
  @IsOptional()
  @IsString()
  @Length(0, 255)
  note?: string;
}

export class ConvertPurchaseRequestToOrderDto {
  @IsOptional()
  @IsString()
  @Length(1, 40)
  reference?: string;

  @IsString()
  supplierId!: string;

  @IsDateString()
  orderDate!: string;

  @IsOptional()
  @IsString()
  @Length(1, 8)
  currencyCode?: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  description?: string;
}
