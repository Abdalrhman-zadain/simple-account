import type { BankCashAccountType, PaymentMethodType } from "@/types/api";
import { Card } from "@/components/ui";
import { useTranslation } from "@/lib/i18n";

export function BankCashAccountsFilters({
  search,
  typeFilter,
  statusFilter,
  paymentMethodTypes,
  onSearchChange,
  onTypeFilterChange,
  onStatusFilterChange,
}: {
  search: string;
  typeFilter: BankCashAccountType | "";
  statusFilter: "true" | "false" | "";
  paymentMethodTypes: PaymentMethodType[];
  onSearchChange: (value: string) => void;
  onTypeFilterChange: (value: BankCashAccountType | "") => void;
  onStatusFilterChange: (value: "true" | "false" | "") => void;
}) {
  const { t } = useTranslation();

  return (
    <Card className="border border-gray-200 bg-white p-5">
      <div className="grid gap-4 md:grid-cols-3">
        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={t("bankCash.filters.search")}
          className="rounded-xl border border-gray-200 bg-gray-100 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
        />
        <select
          value={typeFilter}
          onChange={(event) => onTypeFilterChange(event.target.value as BankCashAccountType | "")}
          className="rounded-xl border border-gray-200 bg-gray-100 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
        >
          <option value="">{t("bankCash.filters.allTypes")}</option>
          {paymentMethodTypes
            .filter((type) => type.isActive)
            .map((type) => (
              <option key={type.id} value={type.name}>
                {type.name}
              </option>
            ))}
        </select>
        <select
          value={statusFilter}
          onChange={(event) => onStatusFilterChange(event.target.value as "true" | "false" | "")}
          className="rounded-xl border border-gray-200 bg-gray-100 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
        >
          <option value="">{t("bankCash.filters.allStatuses")}</option>
          <option value="true">{t("bankCash.filters.active")}</option>
          <option value="false">{t("bankCash.filters.inactive")}</option>
        </select>
      </div>
    </Card>
  );
}
