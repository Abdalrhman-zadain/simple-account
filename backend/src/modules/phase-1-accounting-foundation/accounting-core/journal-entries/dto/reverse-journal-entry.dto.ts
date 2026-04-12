import { IsDateString, IsOptional, IsString, Length } from 'class-validator';

export class ReverseJournalEntryDto {
  @IsOptional()
  @IsDateString()
  reversalDate?: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  description?: string;
}
