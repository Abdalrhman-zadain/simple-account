"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getAccounts, getAccountTransactions } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { Account, LedgerEntry } from "@/types/api";
import { SectionHeading, Card } from "@/components/ui";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { BarChart2, TrendingUp, TrendingDown } from "lucide-react";

export function GeneralLedgerPage() {
    const { token } = useAuth();
    const [accountId, setAccountId] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");

    const accountsQuery = useQuery({
        queryKey: ["accounts-all", token],
        queryFn: () => getAccounts({}, token),
    });

    const postingAccounts = (accountsQuery.data ?? []).filter((a: Account) => a.isPosting && a.isActive);

    const ledgerQuery = useQuery({
        queryKey: ["general-ledger", token, accountId, dateFrom, dateTo],
        queryFn: () => getAccountTransactions({ accountId, dateFrom, dateTo }, token),
        enabled: !!accountId,
    });

    const selectedAccount = postingAccounts.find((a: Account) => a.id === accountId);
    const openingBalance = parseFloat(ledgerQuery.data?.openingBalance ?? "0");
    const entries: LedgerEntry[] = ledgerQuery.data?.transactions ?? [];

    const totalDebit = entries.reduce((s, e) => s + parseFloat(e.debitAmount ?? "0"), 0);
    const totalCredit = entries.reduce((s, e) => s + parseFloat(e.creditAmount ?? "0"), 0);

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <SectionHeading
                title="General Ledger"
                description="Inspect posted transaction history for any account. See running balances, source references, and period summaries."
            />

            {/* Filters */}
            <Card className="border border-white/5 bg-panel/30 backdrop-blur-xl p-5">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Account</label>
                        <select value={accountId} onChange={e => setAccountId(e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500/40">
                            <option value="">— Select a posting account —</option>
                            {postingAccounts.map((a: Account) => (
                                <option key={a.id} value={a.id}>{a.code} · {a.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Date From</label>
                        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500/40" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Date To</label>
                        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500/40" />
                    </div>
                </div>
            </Card>

            {!accountId ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-white/5 bg-white/[0.01] py-24">
                    <BarChart2 className="h-10 w-10 text-zinc-700 mb-4" />
                    <p className="text-sm text-zinc-600">Select an account above to view its General Ledger</p>
                </div>
            ) : (
                <>
                    {/* Account Header */}
                    {selectedAccount && (
                        <div className="grid grid-cols-3 gap-4">
                            <div className="col-span-1 rounded-2xl border border-white/5 bg-white/[0.02] p-5">
                                <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-1">Account</div>
                                <div className="font-mono text-sm font-bold text-teal-400">{selectedAccount.code}</div>
                                <div className="text-base font-bold text-white mt-0.5">{selectedAccount.name}</div>
                            </div>
                            <div className="rounded-2xl border border-teal-500/10 bg-teal-500/5 p-5">
                                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-teal-500/60 mb-2">
                                    <TrendingUp className="h-3.5 w-3.5" /> Total Debit
                                </div>
                                <div className="text-2xl font-black tabular-nums text-teal-400">{totalDebit.toFixed(3)}</div>
                            </div>
                            <div className="rounded-2xl border border-orange-500/10 bg-orange-500/5 p-5">
                                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-orange-500/60 mb-2">
                                    <TrendingDown className="h-3.5 w-3.5" /> Total Credit
                                </div>
                                <div className="text-2xl font-black tabular-nums text-orange-400">{totalCredit.toFixed(3)}</div>
                            </div>
                        </div>
                    )}

                    {/* Ledger Table */}
                    <Card className="p-0 border border-white/5 bg-panel/40 backdrop-blur-xl overflow-hidden">
                        <table className="w-full text-left text-sm border-collapse">
                            <thead className="border-b border-white/5 bg-white/[0.02]">
                                <tr>
                                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-600">Date</th>
                                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-600">Reference</th>
                                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-600">Description</th>
                                    <th className="px-6 py-4 text-right text-[10px] font-bold uppercase tracking-widest text-zinc-600">Debit</th>
                                    <th className="px-6 py-4 text-right text-[10px] font-bold uppercase tracking-widest text-zinc-600">Credit</th>
                                    <th className="px-6 py-4 text-right text-[10px] font-bold uppercase tracking-widest text-zinc-600">Balance</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {ledgerQuery.isLoading ? (
                                    <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-zinc-600">Loading...</td></tr>
                                ) : (
                                    <>
                                        {/* Opening Balance Row */}
                                        <tr className="bg-teal-500/5 transition-colors">
                                            <td className="px-6 py-3 text-xs text-zinc-500 tabular-nums italic">{dateFrom ? formatDate(dateFrom) : "Start"}</td>
                                            <td className="px-6 py-3"><span className="font-mono text-[10px] font-bold text-zinc-600">OPEN-BAL</span></td>
                                            <td className="px-6 py-3 text-xs text-zinc-400 font-bold uppercase tracking-wider">Opening Balance</td>
                                            <td className="px-6 py-3 text-right font-mono text-xs tabular-nums text-zinc-600">—</td>
                                            <td className="px-6 py-3 text-right font-mono text-xs tabular-nums text-zinc-600">—</td>
                                            <td className="px-6 py-3 text-right font-mono text-xs tabular-nums text-teal-400 font-black">
                                                {formatCurrency(openingBalance)}
                                            </td>
                                        </tr>

                                        {entries.length === 0 ? (
                                            <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-zinc-600 italic">No movements recorded in this period.</td></tr>
                                        ) : entries.map((entry, idx) => {
                                            const dr = parseFloat(entry.debitAmount);
                                            const cr = parseFloat(entry.creditAmount);
                                            const runBal = parseFloat(entry.runningBalance);
                                            return (
                                                <tr key={entry.id} className={cn("hover:bg-white/[0.02] transition-colors", idx % 2 === 0 ? "" : "bg-white/[0.01]")}>
                                                    <td className="px-6 py-3 text-xs text-zinc-400 tabular-nums">{formatDate(entry.entryDate)}</td>
                                                    <td className="px-6 py-3">
                                                        <span className="font-mono text-xs font-bold text-teal-400">{entry.reference || "—"}</span>
                                                    </td>
                                                    <td className="px-6 py-3 text-xs text-zinc-500 max-w-[200px] truncate">{entry.description || "—"}</td>
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
                            <tfoot className="border-t border-white/10 bg-black/20">
                                <tr>
                                    <td colSpan={3} className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-zinc-600">Closing Balance</td>
                                    <td className="px-6 py-4 text-right font-mono text-sm font-black tabular-nums text-teal-400">{totalDebit.toFixed(3)}</td>
                                    <td className="px-6 py-4 text-right font-mono text-sm font-black tabular-nums text-orange-400">{totalCredit.toFixed(3)}</td>
                                    <td className="px-6 py-4 text-right font-mono text-sm font-black tabular-nums text-white">{formatCurrency(selectedAccount?.currentBalance ?? "0")}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </Card>
                </>
            )}
        </div>
    );
}
