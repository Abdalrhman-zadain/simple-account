import { IsBoolean, IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';

export class CreateInventoryUnitOfMeasureDto {
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
  description?: string;

  @IsOptional()
  @IsString()
  @Length(0, 80)
  unitType?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  decimalPrecision?: number;
}

export class UpdateInventoryUnitOfMeasureDto extends CreateInventoryUnitOfMeasureDto {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
