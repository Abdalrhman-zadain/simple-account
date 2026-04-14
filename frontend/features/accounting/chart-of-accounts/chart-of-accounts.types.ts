import { AccountTableRow } from "@/types/api";

export type ChartAccountType = "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";

export type CommandSuggestion = {
  label: string;
  value: string;
  category: string;
};

export type ActiveFilterChip = {
  label: string;
  remove: string;
};

export type AccountRowActionState = {
  onActivate: (accountId: string) => void;
  onDeactivate: (accountId: string) => void;
  isMutating: (accountId: string) => boolean;
};

export type AccountsTableProps = {
  accounts: AccountTableRow[];
  isLoading: boolean;
  isError: boolean;
  isPending: boolean;
  isSearching: boolean;
  parentId: string | null;
  onEnter: (accountId: string) => void;
  actions: AccountRowActionState;
};
