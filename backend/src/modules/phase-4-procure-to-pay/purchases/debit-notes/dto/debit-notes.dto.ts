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

export class DebitNoteLineDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  quantity!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  taxAmount!: number;

  @IsOptional()
  @IsString()
  taxId?: string;

  @IsString()
  @Length(1, 255)
  reason!: string;
}

export class CreateDebitNoteDto {
  @IsOptional()
  @IsString()
  @Length(1, 40)
  reference?: string;

  @IsDateString()
  noteDate!: string;

  @IsString()
  supplierId!: string;

  @IsOptional()
  @IsString()
  purchaseInvoiceId?: string;

  @IsOptional()
  @IsString()
  @Length(1, 8)
  currencyCode?: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  description?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DebitNoteLineDto)
  lines!: DebitNoteLineDto[];
}

export class UpdateDebitNoteDto {
  @IsOptional()
  @IsString()
  @Length(1, 40)
  reference?: string;

  @IsOptional()
  @IsDateString()
  noteDate?: string;

  @IsOptional()
  @IsString()
  supplierId?: string;

  @IsOptional()
  @IsString()
  purchaseInvoiceId?: string;

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
  @Type(() => DebitNoteLineDto)
  lines?: DebitNoteLineDto[];
}
