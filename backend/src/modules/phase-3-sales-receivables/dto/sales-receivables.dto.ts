import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateCustomerDto {
  @IsOptional()
  @IsString()
  @Length(1, 32)
  code?: string;

  @IsString()
  @Length(1, 120)
  name!: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  contactInfo?: string;

  @IsOptional()
  @IsString()
  @Length(0, 120)
  taxInfo?: string;

  @IsOptional()
  @IsString()
  @Length(0, 120)
  salesRepresentative?: string;

  @IsOptional()
  @IsString()
  @Length(0, 120)
  paymentTerms?: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  creditLimit!: number;

  @IsString()
  receivableAccountId!: string;
}

export class UpdateCustomerDto {
  @IsOptional()
  @IsString()
  @Length(1, 120)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  contactInfo?: string;

  @IsOptional()
  @IsString()
  @Length(0, 120)
  taxInfo?: string;

  @IsOptional()
  @IsString()
  @Length(0, 120)
  salesRepresentative?: string;

  @IsOptional()
  @IsString()
  @Length(0, 120)
  paymentTerms?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  creditLimit?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  receivableAccountId?: string;
}

export class SalesLineDto {
  @IsOptional()
  @IsString()
  itemId?: string;

  @IsOptional()
  @IsString()
  @Length(0, 120)
  itemName?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.0001)
  quantity?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  discountAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  taxAmount?: number;

  @IsOptional()
  @IsString()
  taxId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  lineAmount?: number;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  description?: string;

  @IsOptional()
  @IsString()
  revenueAccountId?: string;
}

class SalesDocumentBaseDto {
  @IsOptional()
  @IsString()
  @Length(1, 64)
  reference?: string;

  @IsOptional()
  @IsString()
  @Length(1, 8)
  currencyCode?: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SalesLineDto)
  lines!: SalesLineDto[];
}

export class CreateSalesQuotationDto extends SalesDocumentBaseDto {
  @IsDateString()
  quotationDate!: string;

  @IsDateString()
  validityDate!: string;

  @IsString()
  customerId!: string;
}

export class UpdateSalesQuotationDto {
  @IsOptional()
  @IsString()
  @Length(1, 64)
  reference?: string;

  @IsOptional()
  @IsDateString()
  quotationDate?: string;

  @IsOptional()
  @IsDateString()
  validityDate?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

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
  @ValidateNested({ each: true })
  @Type(() => SalesLineDto)
  lines?: SalesLineDto[];
}

export class CreateSalesOrderDto extends SalesDocumentBaseDto {
  @IsDateString()
  orderDate!: string;

  @IsOptional()
  @IsDateString()
  promisedDate?: string;

  @IsString()
  customerId!: string;

  @IsOptional()
  @IsString()
  sourceQuotationId?: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  shippingDetails?: string;
}

export class UpdateSalesOrderDto {
  @IsOptional()
  @IsString()
  @Length(1, 64)
  reference?: string;

  @IsOptional()
  @IsDateString()
  orderDate?: string;

  @IsOptional()
  @IsDateString()
  promisedDate?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  sourceQuotationId?: string;

  @IsOptional()
  @IsString()
  @Length(1, 8)
  currencyCode?: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  shippingDetails?: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  description?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SalesLineDto)
  lines?: SalesLineDto[];
}

export class CreateSalesInvoiceDto extends SalesDocumentBaseDto {
  @IsDateString()
  invoiceDate!: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsString()
  customerId!: string;

  @IsOptional()
  @IsString()
  sourceQuotationId?: string;

  @IsOptional()
  @IsString()
  sourceSalesOrderId?: string;
}

export class UpdateSalesInvoiceDto {
  @IsOptional()
  @IsString()
  @Length(1, 64)
  reference?: string;

  @IsOptional()
  @IsDateString()
  invoiceDate?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  sourceQuotationId?: string;

  @IsOptional()
  @IsString()
  sourceSalesOrderId?: string;

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
  @ValidateNested({ each: true })
  @Type(() => SalesLineDto)
  lines?: SalesLineDto[];
}

export class CreateCreditNoteDto extends SalesDocumentBaseDto {
  @IsDateString()
  noteDate!: string;

  @IsString()
  customerId!: string;

  @IsOptional()
  @IsString()
  salesInvoiceId?: string;
}

export class UpdateCreditNoteDto {
  @IsOptional()
  @IsString()
  @Length(1, 64)
  reference?: string;

  @IsOptional()
  @IsDateString()
  noteDate?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  salesInvoiceId?: string;

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
  @ValidateNested({ each: true })
  @Type(() => SalesLineDto)
  lines?: SalesLineDto[];
}

export class CreateCustomerReceiptDto {
  @IsOptional()
  @IsString()
  @Length(1, 64)
  reference?: string;

  @IsDateString()
  receiptDate!: string;

  @IsString()
  customerId!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @IsString()
  bankCashAccountId!: string;

  @IsOptional()
  @IsString()
  @Length(0, 120)
  settlementReference?: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  description?: string;
}

export class AllocateReceiptDto {
  @IsString()
  salesInvoiceId!: string;

  @IsString()
  receiptTransactionId!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;
}
