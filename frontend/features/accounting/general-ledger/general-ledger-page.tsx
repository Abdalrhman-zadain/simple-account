"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getAccountOptions, getAccountTransactions } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { useAuth } from "@/providers/auth-provider";
import { AccountOption, LedgerEntry } from "@/types/api";
import { SectionHeading, Card } from "@/components/ui";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { LuChartColumn as BarChart2, LuTrendingUp as TrendingUp, LuTrendingDown as TrendingDown } from "react-icons/lu";
import { useTranslation } from "@/lib/i18n";

export function GeneralLedgerPage() {
    const { token } = useAuth();
    const { t } = useTranslation();
    const [accountId, setAccountId] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");

    const accountsQuery = useQuery({
        queryKey: queryKeys.accounts(token, { isPosting: "true", isActive: "true", view: "selector" }),
        queryFn: () => getAccountOptions({ isPosting: "true", isActive: "true" }, token),
        staleTime: 5 * 60 * 1000,
    });

    const postingAccounts = accountsQuery.data ?? [];

    const ledgerQuery = useQuery({
        queryKey: ["general-ledger", token, accountId, dateFrom, dateTo],
        queryFn: () => getAccountTransactions({ accountId, dateFrom, dateTo }, token),
        enabled: !!accountId,
    });

    const selectedAccount = postingAccounts.find((a: AccountOption) => a.id === accountId);
    const openingBalance = parseFloat(ledgerQuery.data?.openingBalance ?? "0");
    const entries: LedgerEntry[] = ledgerQuery.data?.transactions ?? [];

    const totalDebit = entries.reduce((s, e) => s + parseFloat(e.debitAmount ?? "0"), 0);
    const totalCredit = entries.reduce((s, e) => s + parseFloat(e.creditAmount ?? "0"), 0);

    return (
        <div className="space-y-8 animate-in fade-in duration-200 motion-reduce:animate-none">
            <SectionHeading
                title={t("ledger.title")}
                description={t("ledger.description")}
            />

            {/* Filters */}
            <Card className="border border-gray-200 bg-white  p-5">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">{t("ledger.filter.account")}</label>
                        <select value={accountId} onChange={e => setAccountId(e.target.value)}
                            className="w-full rounded-xl border border-gray-200 bg-gray-100 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500/40">
                            <option value="">{t("ledger.filter.selectPostingAccount")}</option>
                            {postingAccounts.map((a: AccountOption) => (
                                <option key={a.id} value={a.id}>{a.code} · {a.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">{t("ledger.filter.dateFrom")}</label>
                        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                            className="w-full rounded-xl border border-gray-200 bg-gray-100 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500/40" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">{t("ledger.filter.dateTo")}</label>
                        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                            className="w-full rounded-xl border border-gray-200 bg-gray-100 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500/40" />
                    </div>
                </div>
            </Card>

            {!accountId ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 py-24">
                    <BarChart2 className="h-10 w-10 text-gray-300 mb-4" />
                    <p className="text-sm text-gray-600">{t("ledger.empty.selectAccount")}</p>
                </div>
            ) : (
                <>
                    {/* Account Header */}
                    {selectedAccount && (
                        <div className="grid grid-cols-3 gap-4">
                            <div className="col-span-1 rounded-2xl border border-gray-200 bg-gray-50 p-5">
                                <div className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-1">{t("ledger.summary.account")}</div>
                                <div className="font-mono text-sm font-bold text-teal-400">{selectedAccount.code}</div>
                                <div className="text-base font-bold text-gray-900 mt-0.5">{selectedAccount.name}</div>
                            </div>
                            <div className="rounded-2xl border border-teal-500/10 bg-teal-500/5 p-5">
                                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-teal-500/60 mb-2">
                                    <TrendingUp className="h-3.5 w-3.5" /> {t("ledger.summary.totalDebit")}
                                </div>
                                <div className="text-2xl font-black tabular-nums text-teal-400">{totalDebit.toFixed(3)}</div>
                            </div>
                            <div className="rounded-2xl border border-orange-500/10 bg-orange-500/5 p-5">
                                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-orange-500/60 mb-2">
                                    <TrendingDown className="h-3.5 w-3.5" /> {t("ledger.summary.totalCredit")}
                                </div>
                                <div className="text-2xl font-black tabular-nums text-orange-400">{totalCredit.toFixed(3)}</div>
                            </div>
                        </div>
                    )}

                    {/* Ledger Table */}
                    <Card className="p-0 border border-gray-200 bg-panel/40  overflow-hidden">
                        <table className="w-full text-left text-sm border-collapse">
                            <thead className="border-b border-gray-200 bg-gray-50">
                                <tr>
                                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-600">{t("ledger.table.date")}</th>
                                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-600">{t("ledger.table.reference")}</th>
                                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-600">{t("ledger.table.description")}</th>
                                    <th className="px-6 py-4 text-right text-[10px] font-bold uppercase tracking-widest text-gray-600">{t("ledger.table.debit")}</th>
                                    <th className="px-6 py-4 text-right text-[10px] font-bold uppercase tracking-widest text-gray-600">{t("ledger.table.credit")}</th>
                                    <th className="px-6 py-4 text-right text-[10px] font-bold uppercase tracking-widest text-gray-600">{t("ledger.table.balance")}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {ledgerQuery.isLoading ? (
                                    <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-600">{t("ledger.loading")}</td></tr>
                                ) : (
                                    <>
                                        {/* Opening Balance Row */}
                                        <tr className="bg-teal-500/5 transition-colors">
                                            <td className="px-6 py-3 text-xs text-gray-500 tabular-nums italic">{dateFrom ? formatDate(dateFrom) : t("ledger.openingBalance.start")}</td>
                                            <td className="px-6 py-3"><span className="font-mono text-[10px] font-bold text-gray-600">OPEN-BAL</span></td>
                                            <td className="px-6 py-3 text-xs text-gray-400 font-bold uppercase tracking-wider">{t("ledger.openingBalance.label")}</td>
                                            <td className="px-6 py-3 text-right font-mono text-xs tabular-nums text-gray-600">—</td>
                                            <td className="px-6 py-3 text-right font-mono text-xs tabular-nums text-gray-600">—</td>
                                            <td className="px-6 py-3 text-right font-mono text-xs tabular-nums text-teal-400 font-black">
                                                {formatCurrency(openingBalance)}
                                            </td>
                                        </tr>

                                        {entries.length === 0 ? (
                                            <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-600 italic">{t("ledger.empty.noMovements")}</td></tr>
                                        ) : entries.map((entry, idx) => {
                                            const dr = parseFloat(entry.debitAmount);
                                            const cr = parseFloat(entry.creditAmount);
                                            const runBal = parseFloat(entry.runningBalance);
                                            return (
                                                <tr key={entry.id} className={cn("hover:bg-gray-50 transition-colors", idx % 2 === 0 ? "" : "bg-gray-50")}>
                                                    <td className="px-6 py-3 text-xs text-gray-400 tabular-nums">{formatDate(entry.entryDate)}</td>
                                                    <td className="px-6 py-3">
                                                        <span className="font-mono text-xs font-bold text-teal-400">{entry.reference || "—"}</span>
                                                    </td>
                                                    <td className="px-6 py-3 text-xs text-gray-500 max-w-[200px] truncate">{entry.description || "—"}</td>
                                                    <td className="px-6 py-3 text-right font-mono text-xs tabular-nums text-teal-400 font-bold">
                                                        {dr > 0 ? dr.toFixed(3) : "—"}
                                                    </td>
                                                    <td className="px-6 py-3 text-right font-mono text-xs tabular-nums text-orange-400 font-bold">
                                                        {cr > 0 ? cr.toFixed(3) : "—"}
                                                    </td>
                                                    <td className="px-6 py-3 text-right font-mono text-xs tabular-nums text-zinc-200 font-black">
                                                        {formatCurrency(runBal)}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </>
                                )}
                            </tbody>
                            <tfoot className="border-t border-gray-200 bg-black/20">
                                <tr>
                                    <td colSpan={3} className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-600">{t("ledger.closingBalance")}</td>
                                    <td className="px-6 py-4 text-right font-mono text-sm font-black tabular-nums text-teal-400">{totalDebit.toFixed(3)}</td>
                                    <td className="px-6 py-4 text-right font-mono text-sm font-black tabular-nums text-orange-400">{totalCredit.toFixed(3)}</td>
                                    <td className="px-6 py-4 text-right font-mono text-sm font-black tabular-nums text-gray-900">{formatCurrency(selectedAccount?.currentBalance ?? "0")}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </Card>
                </>
            )}
        </div>
    );
}
