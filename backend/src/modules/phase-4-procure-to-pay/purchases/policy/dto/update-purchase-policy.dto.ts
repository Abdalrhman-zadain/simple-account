import { IsOptional, IsString } from 'class-validator';

export class UpdatePurchasePolicyDto {
  @IsOptional()
  @IsString()
  purchaseDiscountAccountId?: string | null;
}
