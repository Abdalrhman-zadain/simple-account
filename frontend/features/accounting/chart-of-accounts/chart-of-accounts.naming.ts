import type { Account, AccountTableRow } from "@/types/api";

export function getLocalizedAccountName(
  account:
    | Pick<Account, "name" | "nameAr">
    | Pick<AccountTableRow, "name" | "nameAr">
    | { name: string; nameAr?: string | null },
  language: string,
) {
  if (language === "ar") {
    return account.nameAr?.trim() || account.name;
  }

  return account.name?.trim() || account.nameAr?.trim() || "";
}
