import { IsDateString, IsOptional, IsString } from 'class-validator';

export class QueryLedgerDto {
  @IsOptional()
  @IsString()
  accountId?: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
