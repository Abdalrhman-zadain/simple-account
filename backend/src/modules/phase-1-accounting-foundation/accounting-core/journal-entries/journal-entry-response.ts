type JournalEntryLineResponse = {
  id: string;
  accountId: string;
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
  description: string | null;
  postedAt: string | null;
  postingBatchId: string | null;
  reversalOfId: string | null;
  lines: JournalEntryLineResponse[];
};
