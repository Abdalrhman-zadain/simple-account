"use client";

import { LuDatabase as Database, LuRefreshCw as RefreshCw } from "react-icons/lu";

import { Card, StatusPill } from "@/components/ui";
import { useTranslation } from "@/lib/i18n";

import { AccountsTableProps } from "../chart-of-accounts.types";
import { AccountRow } from "./account-row";

export function AccountsTable({
  accounts,
  isLoading,
  isError,
  isPending,
  isSearching,
  parentId,
  onEnter,
  actions,
}: AccountsTableProps) {
  const { t } = useTranslation();

  return (
    <Card className="app-surface overflow-hidden p-0 shadow-2xl">
      <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50/50 px-10 py-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg border border-gray-200 bg-gray-100 p-2 text-teal-400">
            <Database className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-900">{t("accounts.view.title")}</h2>
            <p className="mt-0.5 text-[10px] font-medium uppercase tracking-widest text-gray-500">
              {parentId ? t("accounts.view.childAccounts") : t("accounts.view.rootAccounts")}
            </p>
          </div>
        </div>
        <StatusPill
          label={isError ? t("accounts.status.error") : isPending ? t("accounts.status.syncing") : t("accounts.status.live")}
          tone={isError ? "warning" : isPending ? "neutral" : "positive"}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50/50">
              <th className="px-10 py-4 text-[11px] font-black uppercase tracking-[0.3em] text-gray-500">
                {t("accounts.table.accountDetails")}
              </th>
              <th className="px-6 py-4 text-[11px] font-black uppercase tracking-[0.3em] text-gray-500">
                {t("accounts.table.role")}
              </th>
              <th className="px-6 py-4 text-right text-[11px] font-black uppercase tracking-[0.3em] text-gray-500">
                {t("accounts.table.balance")}
              </th>
              <th className="px-10 py-4 text-right text-[11px] font-black uppercase tracking-[0.3em] text-gray-500">
                {t("accounts.table.actions")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {isLoading ? (
              <tr>
                <td colSpan={4} className="px-6 py-20 text-center">
                  <RefreshCw className="mx-auto mb-4 h-8 w-8 animate-spin text-teal-500/50" />
                  <span className="text-xs font-bold uppercase tracking-widest text-gray-500">{t("accounts.loading")}</span>
                </td>
              </tr>
            ) : accounts.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-20 text-center">
                  <Database className="mx-auto mb-4 h-10 w-10 text-gray-300 opacity-30" />
                  <p className="text-sm font-medium text-gray-500">{t("accounts.empty")}</p>
                </td>
              </tr>
            ) : (
              accounts.map((account) => (
                <AccountRow
                  key={account.id}
                  account={account}
                  isSearching={isSearching}
                  isMutating={actions.isMutating(account.id)}
                  onEnter={() => {
                    if (!account.isPosting) {
                      onEnter(account.id);
                    }
                  }}
                  onActivate={() => actions.onActivate(account.id)}
                  onDeactivate={() => actions.onDeactivate(account.id)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
