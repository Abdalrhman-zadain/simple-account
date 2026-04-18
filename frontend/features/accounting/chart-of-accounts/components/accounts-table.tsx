"use client";

import { LuDatabase as Database, LuRefreshCw as RefreshCw } from "react-icons/lu";

import { Card, StatusPill } from "@/components/ui";
import { useTranslation } from "@/lib/i18n";

import { cn } from "@/lib/utils";
import { AccountsTableProps, ChartAccountType } from "../chart-of-accounts.types";
import { TYPE_STYLES } from "../chart-of-accounts.utils";
import { AccountRow } from "./account-row";

export function AccountsTable({
  accounts,
  isLoading,
  isError,
  isPending,
  isSearching,
  parentId,
  parentType,
  onEnter,
  onBack,
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
            <h2 className="text-sm font-bold text-gray-900">
              {t("accounts.view.title")}
              {parentType && (
                <span className={cn(
                  "ml-3 inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest shadow-sm",
                  TYPE_STYLES[parentType as ChartAccountType].badge
                )}>
                  {t(`accountType.${parentType}`)}
                </span>
              )}
            </h2>
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
            {parentId && (
              <tr
                tabIndex={0}
                className="group cursor-pointer outline-none transition-all hover:bg-teal-500/5 focus-visible:bg-teal-500/5 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-500/20"
                onClick={onBack}
              >
                <td className="px-10 py-4" colSpan={4}>
                  <div className="flex items-center gap-6">
                    <div className="flex h-1.5 w-1.5 items-center justify-center">
                      <div className="h-1.5 w-1.5 rounded-full bg-teal-500/40 shadow-[0_0_8px_rgba(20,184,166,0.4)]" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-teal-400 group-hover:text-teal-300">
                        ...
                      </span>
                      <span className="text-xs font-semibold text-gray-500 group-hover:text-teal-400/80 transition-colors">
                        {t("common.back")}
                      </span>
                    </div>
                  </div>
                </td>
              </tr>
            )}
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
                  showType={!parentId}
                  isMutating={actions.isMutating(account.id)}
                  onEnter={() => {
                    if (!account.isPosting) {
                      onEnter(account.id);
                    }
                  }}
                  onActivate={() => actions.onActivate(account.id)}
                  onDeactivate={() => actions.onDeactivate(account.id)}
                  onDelete={() => actions.onDelete(account.id)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
