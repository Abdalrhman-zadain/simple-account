"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getFiscalYears, createFiscalYear, closeFiscalPeriod, openFiscalPeriod } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { FiscalYear, FiscalPeriod, PeriodStatus } from "@/types/api";
import { SectionHeading, Card, StatusPill, Button } from "@/components/ui";
import { cn, formatDate } from "@/lib/utils";
import {
    LuLock as Lock,
    LuLockOpen as Unlock,
    LuChevronDown as ChevronDown, LuChevronRight as ChevronRight, LuPlus as Plus
} from "react-icons/lu";
import { useTranslation } from "@/lib/i18n";

const statusTone: Record<PeriodStatus, "positive" | "warning" | "neutral"> = {
    OPEN: "positive",
    CLOSED: "neutral",
    LOCKED: "warning",
};

export function FiscalPage() {
    const { token } = useAuth();
    const queryClient = useQueryClient();
    const { t } = useTranslation();
    const [expandedYear, setExpandedYear] = useState<string | null>(null);
    const [newYear, setNewYear] = useState("");
    const [showAdd, setShowAdd] = useState(false);

    const yearsQuery = useQuery({
        queryKey: ["fiscal-years", token],
        queryFn: () => getFiscalYears(token),
    });

    const createYearMutation = useMutation({
        mutationFn: () => createFiscalYear(parseInt(newYear, 10), token),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["fiscal-years"] });
            setNewYear(""); setShowAdd(false);
        },
    });

    const closeMutation = useMutation({
        mutationFn: (id: string) => closeFiscalPeriod(id, token),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["fiscal-years"] }),
    });

    const openMutation = useMutation({
        mutationFn: (id: string) => openFiscalPeriod(id, token),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["fiscal-years"] }),
    });

    const years: FiscalYear[] = yearsQuery.data ?? [];

    return (
        <div className="space-y-8 animate-in fade-in duration-200 motion-reduce:animate-none">
            <SectionHeading
                title={t("fiscal.title")}
                description={t("fiscal.description")}
                action={
                    <Button onClick={() => setShowAdd(!showAdd)}>
                        <Plus className="h-4 w-4 mr-2" /> {t("fiscal.button.newYear")}
                    </Button>
                }
            />

            {showAdd && (
                <Card className="border border-teal-500/20 bg-teal-500/5 p-5">
                    <div className="flex items-center gap-4">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">{t("fiscal.add.year")}</label>
                            <input
                                type="number"
                                value={newYear}
                                onChange={e => setNewYear(e.target.value)}
                                placeholder={t("fiscal.add.placeholderYear")}
                                className="w-32 rounded-xl border border-gray-200 bg-gray-100 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                            />
                        </div>
                        <div className="pt-6">
                            <Button
                                onClick={() => createYearMutation.mutate()}
                                disabled={!newYear || createYearMutation.isPending}
                            >
                                {t("fiscal.add.create")}
                            </Button>
                        </div>
                        <div className="pt-6">
                            <Button variant="secondary" onClick={() => setShowAdd(false)}>{t("fiscal.add.cancel")}</Button>
                        </div>
                    </div>
                    {createYearMutation.isError && (
                        <p className="text-sm text-red-400 mt-3">{(createYearMutation.error as Error).message}</p>
                    )}
                </Card>
            )}

            <div className="space-y-4">
                {yearsQuery.isLoading ? (
                    <div className="py-20 text-center text-sm text-gray-600">{t("fiscal.loadingYears")}</div>
                ) : years.length === 0 ? (
                    <div className="py-20 text-center text-sm text-gray-600">{t("fiscal.emptyYears")}</div>
                ) : years.map((year: FiscalYear) => {
                    const isExpanded = expandedYear === year.id;
                    const openPeriods = year.periods.filter(p => p.status === "OPEN").length;
                    return (
                        <Card key={year.id} className="p-0 border border-gray-200 bg-panel/40  overflow-hidden">
                            <div
                                className="flex items-center justify-between px-6 py-5 cursor-pointer hover:bg-gray-50 transition-colors"
                                onClick={() => setExpandedYear(isExpanded ? null : year.id)}
                            >
                                <div className="flex items-center gap-4">
                                    <button className="text-gray-600">
                                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                    </button>
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900">{t("fiscal.year.title", { year: year.year })}</h3>
                                        <p className="text-xs text-gray-500">{formatDate(year.startDate)} → {formatDate(year.endDate)}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-xs text-gray-600">{t("fiscal.year.openPeriods", { open: openPeriods, total: year.periods.length })}</span>
                                    <StatusPill label={year.status} tone={statusTone[year.status] ?? "neutral"} />
                                </div>
                            </div>

                            {isExpanded && (
                                <div className="border-t border-gray-200">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50 border-b border-gray-200">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-600">{t("fiscal.table.number")}</th>
                                                <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-600">{t("fiscal.table.period")}</th>
                                                <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-600">{t("fiscal.table.dateRange")}</th>
                                                <th className="px-6 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-gray-600">{t("fiscal.table.status")}</th>
                                                <th className="px-6 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-gray-600">{t("fiscal.table.action")}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {year.periods.map((period: FiscalPeriod) => (
                                                <tr key={period.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-3 text-xs font-mono text-gray-600">{String(period.periodNumber).padStart(2, "0")}</td>
                                                    <td className="px-6 py-3 text-sm font-bold text-zinc-200">{period.name}</td>
                                                    <td className="px-6 py-3 text-xs text-gray-500 tabular-nums">
                                                        {formatDate(period.startDate)} → {formatDate(period.endDate)}
                                                    </td>
                                                    <td className="px-6 py-3 text-center">
                                                        <StatusPill label={period.status} tone={statusTone[period.status] ?? "neutral"} />
                                                    </td>
                                                    <td className="px-6 py-3 text-right">
                                                        {period.status === "OPEN" && (
                                                            <button
                                                                onClick={() => { if (confirm(t("fiscal.confirm.close", { name: period.name }))) closeMutation.mutate(period.id); }}
                                                                className="flex items-center gap-1.5 ml-auto rounded-lg border border-gray-200 bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-400 hover:text-red-400 hover:border-red-400/20 hover:bg-red-400/10 transition-all"
                                                            >
                                                                <Lock className="h-3 w-3" /> {t("fiscal.action.close")}
                                                            </button>
                                                        )}
                                                        {period.status === "CLOSED" && (
                                                            <button
                                                                onClick={() => { if (confirm(t("fiscal.confirm.reopen", { name: period.name }))) openMutation.mutate(period.id); }}
                                                                className="flex items-center gap-1.5 ml-auto rounded-lg border border-teal-500/20 bg-teal-500/10 px-3 py-1.5 text-xs font-bold text-teal-400 hover:bg-teal-500/20 transition-all"
                                                            >
                                                                <Unlock className="h-3 w-3" /> {t("fiscal.action.reopen")}
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
