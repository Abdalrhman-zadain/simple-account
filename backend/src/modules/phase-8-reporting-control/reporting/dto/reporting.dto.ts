import { IsBoolean, IsIn, IsOptional, IsString, Length, Max, Min } from "class-validator";
import { Type } from "class-transformer";
import { IsInt } from "class-validator";

export class ReportingQueryDto {
  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;

  @IsOptional()
  @IsString()
  comparisonFrom?: string;

  @IsOptional()
  @IsString()
  comparisonTo?: string;

  @IsOptional()
  @IsString()
  @IsIn(["ACCRUAL", "CASH"])
  basis?: "ACCRUAL" | "CASH";

  @IsOptional()
  @IsString()
  @IsIn(["true", "false"])
  includeZeroBalance?: string;

  @IsOptional()
  @IsString()
  @IsIn(["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"])
  accountType?: "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";

  @IsOptional()
  @IsString()
  currencyCode?: string;

  @IsOptional()
  @IsString()
  segment3?: string;

  @IsOptional()
  @IsString()
  segment4?: string;

  @IsOptional()
  @IsString()
  segment5?: string;

  @IsOptional()
  @IsString()
  journalEntryTypeId?: string;
}

export class ReportingGeneralLedgerQueryDto extends ReportingQueryDto {
  @IsOptional()
  @IsString()
  accountId?: string;
}

export class ReportingAuditQueryDto extends ReportingQueryDto {
  @IsOptional()
  @IsString()
  entity?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;
}

export class CreateReportDefinitionDto {
  @IsString()
  @Length(1, 120)
  name!: string;

  @IsString()
  @Length(1, 60)
  reportType!: string;

  @IsOptional()
  parameters?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  isShared?: boolean;
}

export class UpdateReportDefinitionDto {
  @IsOptional()
  @IsString()
  @Length(1, 120)
  name?: string;

  @IsOptional()
  parameters?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  isShared?: boolean;
}

export class CreateReportSnapshotDto {
  @IsString()
  @Length(1, 120)
  name!: string;

  @IsString()
  @Length(1, 60)
  reportType!: string;

  @IsOptional()
  parameters?: Record<string, unknown>;
}

export class CreateReportSnapshotVersionDto {
  @IsOptional()
  @IsString()
  @Length(1, 120)
  name?: string;
}

export class ExportReportDto {
  @IsString()
  @Length(1, 60)
  reportType!: string;

  @IsString()
  @IsIn(["PDF", "EXCEL", "PRINT"])
  format!: "PDF" | "EXCEL" | "PRINT";

  @IsOptional()
  @IsString()
  @Length(1, 120)
  title?: string;

  @IsOptional()
  parameters?: Record<string, unknown>;
}
