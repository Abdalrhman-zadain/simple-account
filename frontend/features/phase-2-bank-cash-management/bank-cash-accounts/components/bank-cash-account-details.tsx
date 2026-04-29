import type { ReactNode } from "react";
import { LuLandmark as Landmark, LuWallet as Wallet } from "react-icons/lu";

import type { BankCashAccount, BankCashAccountTransaction } from "@/types/api";
import { Card, StatusPill } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

export function BankCashAccountDetails({
  selectedId,
  selectedDetails,
  historyRows,
  isLoading,
}: {
  selectedId: string | null;
  selectedDetails: BankCashAccount | null;
  historyRows: BankCashAccountTransaction[];
  isLoading: boolean;
}) {
  const { t, language } = useTranslation();
  const localizeName = (name: string, nameAr?: string | null) =>
    language === "ar" ? nameAr?.trim() || name : name;

  return (
    <div className="space-y-6">
      <Card className="border border-gray-200 bg-white p-6">
        <div className="flex items-center gap-3">
          {selectedDetails?.type.trim().toLowerCase() === "bank" ? (
            <Landmark className="h-5 w-5 text-teal-500" />
          ) : (
            <Wallet className="h-5 w-5 text-orange-500" />
          )}
          <div>
            <div className="text-lg font-bold text-gray-900 arabic-heading">
              {selectedDetails ? localizeName(selectedDetails.name) : t("bankCash.title")}
            </div>
            <div className="text-xs text-gray-500 arabic-muted">
              {selectedDetails ? `${selectedDetails.account.code} - ${selectedDetails.account.name}` : t("bankCash.summary.linkedAccount")}
            </div>
          </div>
        </div>

        {selectedDetails ? (
          <div className="mt-6 space-y-4 text-sm text-gray-600 arabic-muted">
            <DetailRow label={t("bankCash.summary.balance")} value={<span className="font-mono font-black text-gray-900">{formatCurrency(selectedDetails.currentBalance)}</span>} />
            <DetailRow label={t("bankCash.form.currency")} value={<span className="font-bold text-gray-900">{selectedDetails.currencyCode}</span>} />
            <DetailRow
              label={t("bankCash.summary.status")}
              value={
                <StatusPill
                  label={selectedDetails.isActive ? t("common.status.active") : t("common.status.inactive")}
                  tone={selectedDetails.isActive ? "positive" : "warning"}
                />
              }
            />
            <DetailRow label={t("bankCash.form.bankName")} value={<span className="font-bold text-gray-900">{selectedDetails.bankName || "—"}</span>} />
            <DetailRow label={t("bankCash.form.accountNumber")} value={<span className="font-bold text-gray-900">{selectedDetails.accountNumber || "—"}</span>} />
          </div>
        ) : (
          <div className="mt-6 text-sm text-gray-500 arabic-muted">{t("bankCash.history.description")}</div>
        )}
      </Card>

      <Card className="overflow-hidden border border-gray-200 bg-panel/40 p-0">
        <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
          <div className="text-sm font-bold text-gray-900 arabic-heading">{t("bankCash.history.title")}</div>
          <div className="text-xs text-gray-500 arabic-muted">{t("bankCash.history.description")}</div>
        </div>
        <div className="max-h-[620px] overflow-auto">
          {!selectedId ? (
            <div className="px-6 py-10 text-sm text-gray-500 arabic-muted">{t("bankCash.history.description")}</div>
          ) : isLoading ? (
            <div className="px-6 py-10 text-sm text-gray-500 arabic-muted">{t("common.loading")}</div>
          ) : historyRows.length === 0 ? (
            <div className="px-6 py-10 text-sm text-gray-500 arabic-muted">{t("bankCash.history.empty")}</div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-white">
                <tr>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-600">{t("bankCash.history.date")}</th>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-600">{t("bankCash.history.type")}</th>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-600">{t("bankCash.history.reference")}</th>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-600">{t("bankCash.history.journalReference")}</th>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-600">{t("bankCash.history.descriptionColumn")}</th>
                  <th className="px-6 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-gray-600">{t("bankCash.history.debit")}</th>
                  <th className="px-6 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-gray-600">{t("bankCash.history.credit")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {historyRows.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-xs text-gray-500 arabic-muted">{formatDate(row.entryDate)}</td>
                    <td className="px-6 py-3 text-xs font-bold text-gray-900">{row.transactionType}</td>
                    <td className="px-6 py-3 font-mono text-xs text-teal-500">{row.reference}</td>
                    <td className="px-6 py-3 font-mono text-xs text-gray-700">{row.journalReference}</td>
                    <td className="px-6 py-3 text-xs text-gray-500">{row.description || "—"}</td>
                    <td className="px-6 py-3 text-right font-mono text-xs font-black text-teal-400">
                      {Number(row.debitAmount) > 0 ? formatCurrency(row.debitAmount) : "—"}
                    </td>
                    <td className="px-6 py-3 text-right font-mono text-xs font-black text-orange-400">
                      {Number(row.creditAmount) > 0 ? formatCurrency(row.creditAmount) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <span>{label}</span>
      {value}
    </div>
  );
}
