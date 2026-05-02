import type { TranslationKey } from "@/lib/i18n";
import { AccountTableRow } from "@/types/api";

export type ChartAccountType = "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";

export type CommandSuggestion = {
  label: string;
  value: string;
  category: string;
  labelKey?: TranslationKey;
  categoryKey?: TranslationKey;
};

export type ActiveFilterChip = {
  label: string;
  remove: string;
  labelKey?: TranslationKey;
};

export type AccountsSearchFilters = {
  search: string;
  type: ChartAccountType[];
  isActive: Array<"true" | "false">;
  isPosting: Array<"true" | "false">;
};

export type AccountRowActionState = {
  onActivate: (accountId: string) => void;
  onDeactivate: (accountId: string) => void;
  onDelete: (accountId: string) => void;
  isMutating: (accountId: string) => boolean;
};

export type AccountsTableProps = {
  accounts: AccountTableRow[];
  isLoading: boolean;
  isError: boolean;
  isPending: boolean;
  isSearching: boolean;
  parentId: string | null;
  parentType?: string | null;
  onEnter: (accountId: string) => void;
  onBack: () => void;
  actions: AccountRowActionState;
};
