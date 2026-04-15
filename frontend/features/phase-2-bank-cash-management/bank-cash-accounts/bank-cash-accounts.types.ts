import type { BankCashAccountType } from "@/types/api";

export type EditorState = {
  id?: string;
  type: BankCashAccountType;
  name: string;
  bankName: string;
  accountNumber: string;
  currencyCode: string;
  accountId: string;
};

export const EMPTY_EDITOR: EditorState = {
  type: "",
  name: "",
  bankName: "",
  accountNumber: "",
  currencyCode: "JOD",
  accountId: "",
};
