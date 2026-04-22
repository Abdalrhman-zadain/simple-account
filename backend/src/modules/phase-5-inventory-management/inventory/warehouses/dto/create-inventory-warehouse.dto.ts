import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';

export class CreateInventoryWarehouseDto {
  @IsOptional()
  @IsString()
  @Length(1, 40)
  code?: string;

  @IsString()
  @Length(1, 120)
  name!: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  address?: string;

  @IsOptional()
  @IsString()
  @Length(0, 120)
  responsiblePerson?: string;

  @IsOptional()
  @IsBoolean()
  isTransit?: boolean;

  @IsOptional()
  @IsBoolean()
  isDefaultTransit?: boolean;
}
