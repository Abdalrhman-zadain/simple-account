import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsNumber, IsOptional, IsString, Length, Min, ValidateNested } from 'class-validator';

export class JournalEntryLineDto {
  @IsString()
  accountId!: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  description?: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  debitAmount!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  creditAmount!: number;
}

export class CreateJournalEntryDto {
  @IsDateString()
  entryDate!: string;

  @IsOptional()
  @IsString()
  journalEntryTypeId?: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  description?: string;

  @IsOptional()
  @IsString()
  sourceType?: string;

  @IsOptional()
  @IsString()
  sourceId?: string;

  @IsOptional()
  @IsString()
  @Length(0, 120)
  sourceNumber?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  @Length(0, 8)
  currencyCode?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JournalEntryLineDto)
  lines!: JournalEntryLineDto[];
}

export class UpdateJournalEntryDto {
  @IsOptional()
  @IsDateString()
  entryDate?: string;

  @IsOptional()
  @IsString()
  journalEntryTypeId?: string | null;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  description?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JournalEntryLineDto)
  lines?: JournalEntryLineDto[];
}
