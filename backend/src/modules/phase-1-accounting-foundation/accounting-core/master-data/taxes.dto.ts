import { TaxType } from '../../../../generated/prisma';

export type CreateTaxDto = {
  taxCode: string;
  taxName: string;
  rate: number;
  taxType: TaxType;
  taxAccountId?: string | null;
  isActive?: boolean;
};

export type UpdateTaxDto = Partial<CreateTaxDto>;
