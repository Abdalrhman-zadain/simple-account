"use client";

import { useTranslation } from "@/lib/i18n";
import { formatCurrency, cn } from "@/lib/utils";

import { ChartAccountType } from "../chart-of-accounts.types";
import { TYPE_STYLES } from "../chart-of-accounts.utils";

export function AccountsStatsSummary({
  stats,
  totalBalance,
  onSelectType,
}: {
  stats: Record<ChartAccountType, number>;
  totalBalance: number;
  onSelectType: (type: ChartAccountType) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
      {(Object.entries(TYPE_STYLES) as [ChartAccountType, (typeof TYPE_STYLES)[ChartAccountType]][]).map(([type, style]) => (
        <button
          key={type}
          onClick={() => onSelectType(type)}
          className={cn(
            "group flex flex-col gap-1 rounded-2xl border-2 p-5 text-left transition-all hover:scale-[1.02] hover:shadow-lg",
            style.badge,
          )}
        >
          <span className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] opacity-70">{t(style.label)}</span>
          <span className="text-3xl font-black tracking-tighter tabular-nums">{stats[type]}</span>
          <span className="text-[10px] opacity-50">{t("accounts.stats.accounts")}</span>
        </button>
      ))}
      <div className="flex flex-col gap-1 rounded-2xl border border-gray-200 bg-gray-50 p-5 shadow-sm">
        <span className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">{t("accounts.stats.netBalance")}</span>
        <span className={cn("font-mono text-xl font-black tabular-nums", totalBalance >= 0 ? "text-teal-400" : "text-rose-400")}>
          {formatCurrency(String(totalBalance))}
        </span>
        <span className="text-[10px] text-gray-600">{t("accounts.stats.allAccounts")}</span>
      </div>
    </div>
  );
}
