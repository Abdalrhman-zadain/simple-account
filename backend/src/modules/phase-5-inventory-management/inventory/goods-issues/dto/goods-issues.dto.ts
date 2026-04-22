import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDateString, IsOptional, IsString, Length, Matches, ValidateNested } from 'class-validator';

export class InventoryGoodsIssueLineDto {
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

export class CreateInventoryGoodsIssueDto {
  @IsOptional()
  @IsString()
  @Length(1, 40)
  reference?: string;

  @IsDateString()
  issueDate!: string;

  @IsString()
  warehouseId!: string;

  @IsOptional()
  @IsString()
  @Length(0, 40)
  sourceSalesOrderRef?: string;

  @IsOptional()
  @IsString()
  @Length(0, 40)
  sourceSalesInvoiceRef?: string;

  @IsOptional()
  @IsString()
  @Length(0, 40)
  sourceProductionRequestRef?: string;

  @IsOptional()
  @IsString()
  @Length(0, 40)
  sourceInternalRequestRef?: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  description?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => InventoryGoodsIssueLineDto)
  lines!: InventoryGoodsIssueLineDto[];
}

export class UpdateInventoryGoodsIssueDto {
  @IsOptional()
  @IsString()
  @Length(1, 40)
  reference?: string;

  @IsOptional()
  @IsDateString()
  issueDate?: string;

  @IsOptional()
  @IsString()
  warehouseId?: string;

  @IsOptional()
  @IsString()
  @Length(0, 40)
  sourceSalesOrderRef?: string;

  @IsOptional()
  @IsString()
  @Length(0, 40)
  sourceSalesInvoiceRef?: string;

  @IsOptional()
  @IsString()
  @Length(0, 40)
  sourceProductionRequestRef?: string;

  @IsOptional()
  @IsString()
  @Length(0, 40)
  sourceInternalRequestRef?: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  description?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => InventoryGoodsIssueLineDto)
  lines?: InventoryGoodsIssueLineDto[];
}
