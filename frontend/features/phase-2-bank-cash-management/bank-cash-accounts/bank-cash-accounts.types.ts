import type { BankCashAccountType } from "@/types/api";

export type EditorState = {
  id?: string;
  type: BankCashAccountType;
  name: string;
  bankName: string;
  currencyCode: string;
  accountId: string;
  openingBalance: string;
  openingBalanceOffsetAccountId: string;
};

export const EMPTY_EDITOR: EditorState = {
  type: "",
  name: "",
  bankName: "",
  currencyCode: "JOD",
  accountId: "",
  openingBalance: "",
  openingBalanceOffsetAccountId: "",
};
