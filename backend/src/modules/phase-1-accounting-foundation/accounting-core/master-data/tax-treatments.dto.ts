export type CreateTaxTreatmentDto = {
  code: string;
  arabicName: string;
  englishName: string;
  description?: string | null;
  defaultTaxId?: string | null;
  isActive?: boolean;
};

export type UpdateTaxTreatmentDto = Partial<CreateTaxTreatmentDto>;
