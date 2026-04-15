import { LuArrowLeftRight as ArrowLeftRight, LuPencil as Pencil, LuWallet as Wallet } from "react-icons/lu";

import type { BankCashAccount } from "@/types/api";
import { Card, StatusPill } from "@/components/ui";
import { formatCurrency, cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

export function BankCashAccountsTable({
  rows,
  selectedId,
  isLoading,
  isDeactivatePending,
  onSelect,
  onEdit,
  onDeactivate,
}: {
  rows: BankCashAccount[];
  selectedId: string | null;
  isLoading: boolean;
  isDeactivatePending: boolean;
  onSelect: (id: string) => void;
  onEdit: (row: BankCashAccount) => void;
  onDeactivate: (id: string) => void;
}) {
  const { t } = useTranslation();

  return (
    <Card className="overflow-hidden border border-gray-200 bg-panel/40 p-0">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-gray-200 bg-gray-50">
          <tr>
            <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-600">{t("bankCash.table.account")}</th>
            <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-600">{t("bankCash.table.bankName")}</th>
            <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-600">{t("bankCash.table.type")}</th>
            <th className="px-6 py-4 text-right text-[10px] font-bold uppercase tracking-widest text-gray-600">{t("bankCash.table.balance")}</th>
            <th className="px-6 py-4 text-center text-[10px] font-bold uppercase tracking-widest text-gray-600">{t("bankCash.table.status")}</th>
            <th className="px-6 py-4 text-right text-[10px] font-bold uppercase tracking-widest text-gray-600">{t("bankCash.table.actions")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {isLoading ? (
            <tr>
              <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-600">
                {t("common.loading")}
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-600">
                {t("bankCash.empty")}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={row.id}
                className={cn(
                  "transition-colors hover:bg-gray-50",
                  selectedId === row.id && "bg-teal-500/5",
                )}
              >
                <td className="px-6 py-4">
                  <button className="text-left" onClick={() => onSelect(row.id)}>
                    <div className="font-bold text-gray-900">{row.name}</div>
                    <div className="font-mono text-xs text-teal-500">
                      {row.account.code} · {row.account.name}
                    </div>
                  </button>
                </td>
                <td className="px-6 py-4 text-xs text-gray-500">
                  {row.bankName || row.accountNumber || "—"}
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex rounded-full border border-gray-200 bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">
                    {row.type}
                  </span>
                </td>
                <td className="px-6 py-4 text-right font-mono text-xs font-black text-gray-900">
                  {formatCurrency(row.currentBalance)}
                </td>
                <td className="px-6 py-4 text-center">
                  <StatusPill
                    label={row.isActive ? t("common.status.active") : t("common.status.inactive")}
                    tone={row.isActive ? "positive" : "warning"}
                  />
                </td>
                <td className="px-6 py-4">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => onSelect(row.id)}
                      className="rounded-lg border border-gray-200 p-2 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-900"
                      title={t("bankCash.action.select")}
                    >
                      <ArrowLeftRight className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onEdit(row)}
                      disabled={!row.isActive}
                      className="rounded-lg border border-gray-200 p-2 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-900 disabled:opacity-40"
                      title={t("bankCash.action.edit")}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeactivate(row.id)}
                      disabled={!row.isActive || isDeactivatePending}
                      className="rounded-lg border border-red-100 p-2 text-red-500 transition-colors hover:bg-red-50 disabled:opacity-40"
                      title={t("bankCash.action.deactivate")}
                    >
                      <Wallet className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </Card>
  );
}
