import { AccountType } from '../../../../generated/prisma/index';
import { IsEnum, IsOptional, IsString, Length, Matches } from 'class-validator';

export class CreateAccountDto {
  @IsString()
  @Length(1, 32)
  @Matches(/^[A-Za-z0-9._-]+$/)
  code!: string;

  @IsString()
  @Length(1, 120)
  name!: string;

  @IsEnum(AccountType)
  type!: AccountType;

  @IsOptional()
  @IsString()
  parentAccountId?: string;
}
