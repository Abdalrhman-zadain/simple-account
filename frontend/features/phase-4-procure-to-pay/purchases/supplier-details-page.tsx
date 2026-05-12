"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { getSupplierBalance, getSupplierById, getSupplierTransactions } from "@/lib/api";
import { useTranslation } from "@/lib/i18n";
import { queryKeys } from "@/lib/query-keys";
import { cleanDisplayName, formatCurrency, formatDate } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { Button, Card, PageShell, SectionHeading, StatusPill } from "@/components/ui";

export function SupplierDetailsPage({ supplierId }: { supplierId: string }) {
  const router = useRouter();
  const { token } = useAuth();
  const { t } = useTranslation();

  const supplierQuery = useQuery({
    queryKey: queryKeys.purchaseSupplierById(token, supplierId),
    queryFn: () => getSupplierById(supplierId, token),
  });

  const supplierBalanceQuery = useQuery({
    queryKey: queryKeys.purchaseSupplierBalance(token, supplierId),
    queryFn: () => getSupplierBalance(supplierId, token),
    enabled: Boolean(supplierQuery.data),
  });

  const supplierTransactionsQuery = useQuery({
    queryKey: queryKeys.purchaseSupplierTransactions(token, supplierId),
    queryFn: () => getSupplierTransactions(supplierId, token),
    enabled: Boolean(supplierQuery.data),
  });

  const supplier = supplierQuery.data;
  const transactions = supplierTransactionsQuery.data?.transactions ?? [];
  const errorMessage =
    supplierQuery.error instanceof Error
      ? supplierQuery.error.message
      : supplierBalanceQuery.error instanceof Error
        ? supplierBalanceQuery.error.message
        : supplierTransactionsQuery.error instanceof Error
          ? supplierTransactionsQuery.error.message
          : null;

  return (
    <PageShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionHeading
            title={t("purchases.section.supplierDetails")}
            description="تفاصيل المورد وحركة رصيده في صفحة مستقلة."
          />
          <Button variant="secondary" onClick={() => router.push("/purchases")}>
            العودة إلى الموردين
          </Button>
        </div>

        {errorMessage ? (
          <Card className="border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-800">
            {errorMessage}
          </Card>
        ) : null}

        {!supplier && supplierQuery.isLoading ? (
          <Card className="p-6 text-sm text-gray-500">جاري تحميل تفاصيل المورد...</Card>
        ) : null}

        {supplier ? (
          <>
            <Card className="space-y-5 p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="inline-flex rounded-full bg-slate-100 px-3 py-1 font-mono text-xs font-bold text-slate-700">
                    {supplier.code}
                  </div>
                  <div className="text-2xl font-black text-gray-900">{supplier.name}</div>
                  <div className="text-sm text-gray-500">
                    {supplier.paymentTerm
                      ? supplier.paymentTerm.nameAr || supplier.paymentTerm.name
                      : t("purchases.empty.paymentTerms")}
                  </div>
                </div>
                <StatusPill
                  label={supplier.isActive ? t("purchases.status.active") : t("purchases.status.inactive")}
                  tone={supplier.isActive ? "positive" : "warning"}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <MiniMetric
                  label={t("purchases.metric.currentBalance")}
                  value={formatCurrency(supplierBalanceQuery.data?.currentBalance ?? supplier.currentBalance)}
                />
                <MiniMetric
                  label={t("purchases.metric.outstandingBalance")}
                  value={formatCurrency(supplierBalanceQuery.data?.outstandingBalance ?? supplier.currentBalance)}
                />
                <MiniMetric label={t("purchases.table.currency")} value={supplier.defaultCurrency} />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <DetailRow label={t("purchases.table.contact")} value={supplier.phone || supplier.contactInfo || t("purchases.empty.phone")} />
                <DetailRow label={t("purchases.field.email")} value={supplier.email || t("purchases.empty.email")} />
                <DetailRow label={t("purchases.field.address")} value={supplier.address || t("purchases.empty.address")} />
                <DetailRow
                  label={t("purchases.table.payableAccount")}
                  value={`${supplier.payableAccount.code} · ${cleanDisplayName(supplier.payableAccount.name)}`}
                />
              </div>
            </Card>

            <Card className="space-y-5 p-6">
              <div className="text-sm font-black uppercase tracking-[0.22em] text-gray-500">
                {t("purchases.table.transactionType")}
              </div>
              <div className="overflow-hidden rounded-2xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <TableHead>{t("purchases.table.transactionType")}</TableHead>
                      <TableHead>{t("purchases.table.reference")}</TableHead>
                      <TableHead>{t("purchases.table.date")}</TableHead>
                      <TableHead>{t("purchases.table.amount")}</TableHead>
                      <TableHead>{t("purchases.table.transactionStatus")}</TableHead>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-500">
                          {t("purchases.empty.transactions")}
                        </td>
                      </tr>
                    ) : (
                      transactions.map((row) => (
                        <tr key={row.id} className="border-t border-gray-100">
                          <td className="px-6 py-4">{row.type}</td>
                          <td className="px-6 py-4">{row.reference}</td>
                          <td className="px-6 py-4">{formatDate(row.date)}</td>
                          <td className="px-6 py-4">{formatCurrency(row.amount)}</td>
                          <td className="px-6 py-4">{row.status}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        ) : null}
      </div>
    </PageShell>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 px-4 py-4">
      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500">{label}</div>
      <div className="mt-2 text-base font-bold text-gray-900">{value}</div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 px-4 py-4">
      <div className="text-xs font-bold text-gray-500">{label}</div>
      <div className="mt-2 text-sm font-semibold text-gray-900">{value}</div>
    </div>
  );
}

function TableHead({ children }: { children: React.ReactNode }) {
  return <th className="px-6 py-3 text-start text-[10px] font-bold uppercase tracking-widest text-gray-600">{children}</th>;
}
