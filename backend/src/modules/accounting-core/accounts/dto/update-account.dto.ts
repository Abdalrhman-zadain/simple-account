import { AccountType } from '../../../../generated/prisma/index';
import { IsEnum, IsOptional, IsString, Length } from 'class-validator';

export class UpdateAccountDto {
  @IsOptional()
  @IsString()
  @Length(1, 120)
  name?: string;

  @IsOptional()
  @IsEnum(AccountType)
  type?: AccountType;

  @IsOptional()
  @IsString()
  parentAccountId?: string | null;
}
