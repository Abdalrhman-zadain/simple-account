type JournalEntryLineResponse = {
  id: string;
  accountId: string;
  accountCode?: string;
  accountName?: string;
  accountNameAr?: string | null;
  description: string | null;
  lineNumber: number;
  debitAmount: string;
  creditAmount: string;
};

export type JournalEntryResponse = {
  id: string;
  reference: string;
  status: 'DRAFT' | 'POSTED';
  entryDate: string;
  journalEntryTypeId: string | null;
  journalEntryType: { id: string; name: string } | null;
  description: string | null;
  postedAt: string | null;
  postingBatchId: string | null;
  reversalOfId: string | null;
  lines: JournalEntryLineResponse[];
};
