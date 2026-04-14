import { Card } from "@/components/ui";
import { cn, formatCurrency } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

export function BankCashAccountsSummary({
  activeCount,
  totalBalance,
}: {
  activeCount: number;
  totalBalance: number;
}) {
  const { t } = useTranslation();

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card className="border border-gray-200 bg-white p-5">
        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">{t("bankCash.summary.status")}</div>
        <div className="mt-2 text-3xl font-black text-gray-900">{activeCount}</div>
        <div className="text-xs text-gray-500">{t("bankCash.filters.active")}</div>
      </Card>
      <Card className="border border-gray-200 bg-white p-5 md:col-span-3">
        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">{t("bankCash.summary.balance")}</div>
        <div className={cn("mt-2 text-3xl font-black", totalBalance >= 0 ? "text-teal-400" : "text-rose-400")}>
          {formatCurrency(totalBalance)}
        </div>
        <div className="text-xs text-gray-500">{t("bankCash.title")}</div>
      </Card>
    </div>
  );
}
