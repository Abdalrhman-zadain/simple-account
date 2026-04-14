"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LuPlus as Plus, LuRefreshCw as RefreshCw, LuSend as Send, LuRotateCcw as RotateCcw, LuEye as Eye, LuChevronDown as ChevronDown, LuChevronRight as ChevronRight, LuCircleAlert as AlertCircle } from "react-icons/lu";
import {
    getJournalEntries,
    createJournalEntry,
    postJournalEntry,
    reverseJournalEntry,
    getAccountOptions,
    getJournalEntryById,
    getJournalEntryTypes,
    createJournalEntryType,
} from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { useAuth } from "@/providers/auth-provider";
import { JournalEntry, JournalEntryLine, AccountOption, JournalEntryType } from "@/types/api";
import { SectionHeading, StatusPill, Card, Button, SidePanel, TableSkeleton } from "@/components/ui";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

function JournalStatusPill({ status }: { status: string }) {
    return (
        <StatusPill
            label={status}
            tone={status === "POSTED" ? "positive" : status === "DRAFT" ? "warning" : "neutral"}
        />
    );
}

type LineForm = { accountId: string; description: string; debitAmount: string; creditAmount: string };
const EMPTY_LINE: LineForm = { accountId: "", description: "", debitAmount: "", creditAmount: "" };

function normalizeSearchText(value: string) {
    return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function AccountAutocomplete({
    accounts,
    value,
    onChange,
}: {
    accounts: AccountOption[];
    value: string;
    onChange: (nextAccountId: string) => void;
}) {
    const { t } = useTranslation();
    const selected = accounts.find((a) => a.id === value) ?? null;
    const [query, setQuery] = useState("");
    const [open, setOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const rootRef = useRef<HTMLDivElement | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);
    const menuRef = useRef<HTMLDivElement | null>(null);
    const [menuRect, setMenuRect] = useState<{ left: number; top: number; width: number } | null>(null);

    const filtered = useMemo(() => {
        const q = normalizeSearchText(query);
        if (!q) return accounts.slice(0, 50);

        const starts: AccountOption[] = [];
        const contains: AccountOption[] = [];

        for (const a of accounts) {
            const hay = normalizeSearchText(`${a.code} ${a.name}`);
            if (hay.startsWith(q)) starts.push(a);
            else if (hay.includes(q)) contains.push(a);
            if (starts.length + contains.length >= 50) break;
        }
        return [...starts, ...contains];
    }, [accounts, query]);

    const displayValue = open ? query : selected ? `${selected.code} · ${selected.name}` : "";

    useEffect(() => {
        if (!open) return;
        setActiveIndex(0);

        const updateRect = () => {
            const el = inputRef.current;
            if (!el) return;
            const r = el.getBoundingClientRect();
            setMenuRect({ left: r.left, top: r.bottom + 6, width: r.width });
        };

        updateRect();

        const onPointerDown = (event: PointerEvent) => {
            const root = rootRef.current;
            const menu = menuRef.current;
            if (!root) return;
            if (event.target instanceof Node && root.contains(event.target)) return;
            if (event.target instanceof Node && menu?.contains(event.target)) return;
            setOpen(false);
        };

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                event.preventDefault();
                setOpen(false);
            }
        };

        window.addEventListener("scroll", updateRect, true);
        window.addEventListener("resize", updateRect);
        document.addEventListener("pointerdown", onPointerDown);
        document.addEventListener("keydown", onKeyDown);

        return () => {
            window.removeEventListener("scroll", updateRect, true);
            window.removeEventListener("resize", updateRect);
            document.removeEventListener("pointerdown", onPointerDown);
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [open]);

    return (
        <div ref={rootRef} className="relative">
            <input
                ref={inputRef}
                value={displayValue}
                onChange={(e) => {
                    setQuery(e.target.value);
                    setOpen(true);
                }}
                onFocus={() => setOpen(true)}
                onKeyDown={(e) => {
                    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
                        e.preventDefault();
                        setOpen(true);
                        return;
                    }
                    if (e.key === "ArrowDown") {
                        e.preventDefault();
                        setActiveIndex((i) => Math.min(i + 1, filtered.length)); // 0 is "clear", so allow up to filtered.length
                    }
                    if (e.key === "ArrowUp") {
                        e.preventDefault();
                        setActiveIndex((i) => Math.max(i - 1, 0));
                    }
                    if (e.key === "Enter") {
                        if (!open) return;
                        e.preventDefault();
                        if (activeIndex === 0) {
                            onChange("");
                        } else {
                            const pick = filtered[activeIndex - 1];
                            if (pick) onChange(pick.id);
                        }
                        setQuery("");
                        setOpen(false);
                    }
                }}
                placeholder={t("journal.accountSelect.searchPlaceholder")}
                className="w-full rounded-lg border border-gray-200 bg-gray-100 px-2 py-2 text-xs text-gray-900 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
            />

            {open && menuRect
                ? createPortal(
                    <div
                        ref={menuRef}
                        className="fixed z-[1000] rounded-xl border border-gray-200 bg-white shadow-2xl overflow-hidden"
                        style={{ left: menuRect.left, top: menuRect.top, width: menuRect.width }}
                    >
                        <div className="max-h-64 overflow-auto">
                            <button
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => {
                                    onChange("");
                                    setQuery("");
                                    setOpen(false);
                                }}
                                className={cn(
                                    "w-full text-left px-3 py-2 text-xs text-gray-500 hover:bg-gray-50",
                                    activeIndex === 0 && "bg-teal-500/10",
                                )}
                            >
                                {t("journal.accountSelect.placeholder")}
                            </button>
                            {filtered.map((a, idx) => {
                                const isActive = activeIndex === idx + 1;
                                return (
                                    <button
                                        key={a.id}
                                        type="button"
                                        onMouseDown={(e) => e.preventDefault()}
                                        onMouseEnter={() => setActiveIndex(idx + 1)}
                                        onClick={() => {
                                            onChange(a.id);
                                            setQuery("");
                                            setOpen(false);
                                        }}
                                        className={cn(
                                            "w-full text-left px-3 py-2 text-xs hover:bg-gray-50",
                                            isActive && "bg-teal-500/10",
                                        )}
                                    >
                                        <span className="font-mono text-gray-500 mr-2">{a.code}</span>
                                        <span className="text-gray-900">{a.name}</span>
                                    </button>
                                );
                            })}
                            {filtered.length === 0 && (
                                <div className="px-3 py-3 text-xs text-gray-500">{t("journal.accountSelect.noMatches")}</div>
                            )}
                        </div>
                    </div>,
                    document.body,
                )
                : null}
        </div>
    );
}

export function JournalEntriesPage() {
    const { token } = useAuth();
    const queryClient = useQueryClient();
    const { t } = useTranslation();
    const [showCreate, setShowCreate] = useState(false);
    const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    // Create form state
    const [entryDate, setEntryDate] = useState(new Date().toISOString().split("T")[0]);
    const [journalEntryTypeId, setJournalEntryTypeId] = useState<string>("");
    const [description, setDescription] = useState("");
    const [lines, setLines] = useState<LineForm[]>([{ ...EMPTY_LINE }, { ...EMPTY_LINE }]);
    const [showAddType, setShowAddType] = useState(false);
    const [newTypeName, setNewTypeName] = useState("");

    // List filters
    const [search, setSearch] = useState("");
    const [filterTypeId, setFilterTypeId] = useState<string>("");

    const journalParams = useMemo(
        () => ({
            search: search.trim() || undefined,
            journalEntryTypeId: filterTypeId || undefined,
            includeLines: false,
        }),
        [search, filterTypeId],
    );

    const entriesQuery = useQuery({
        queryKey: queryKeys.journalEntries(token, journalParams),
        queryFn: () => getJournalEntries(journalParams, token),
    });

    const accountsQuery = useQuery({
        queryKey: queryKeys.accounts(token, { isPosting: "true", isActive: "true", view: "selector" }),
        queryFn: () => getAccountOptions({ isPosting: "true", isActive: "true" }, token),
        staleTime: 5 * 60 * 1000,
    });

    const typesQuery = useQuery({
        queryKey: queryKeys.journalEntryTypes(token),
        queryFn: () => getJournalEntryTypes(token),
        staleTime: 10 * 60 * 1000,
    });

    const postingAccounts = accountsQuery.data ?? [];

    const expandedEntryQuery = useQuery({
        queryKey: queryKeys.journalEntryById(token, expandedId),
        queryFn: () => getJournalEntryById(expandedId!, token),
        enabled: !!expandedId,
        staleTime: 30_000,
    });

    const createTypeMutation = useMutation({
        mutationFn: (name: string) => createJournalEntryType({ name }, token),
        onSuccess: (created) => {
            queryClient.invalidateQueries({ queryKey: ["journal-entry-types"] });
            setJournalEntryTypeId(created.id);
            setNewTypeName("");
            setShowAddType(false);
        },
    });

    const createMutation = useMutation({
        mutationFn: () => createJournalEntry({
            entryDate,
            description,
            journalEntryTypeId: journalEntryTypeId || undefined,
            lines: lines
                .filter(l => l.accountId)
                .map(l => ({
                    accountId: l.accountId,
                    description: l.description || undefined,
                    debitAmount: Number((parseFloat(l.debitAmount) || 0).toFixed(2)),
                    creditAmount: Number((parseFloat(l.creditAmount) || 0).toFixed(2)),
                })),
        }, token),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
            setShowCreate(false);
            setLines([{ ...EMPTY_LINE }, { ...EMPTY_LINE }]);
            setDescription("");
            setJournalEntryTypeId("");
        },
    });

    const postMutation = useMutation({
        mutationFn: (id: string) => postJournalEntry(id, token),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["journal-entries"] }),
    });

    const reverseMutation = useMutation({
        mutationFn: (id: string) => reverseJournalEntry(id, token),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["journal-entries"] }),
    });

    const debitTotal = lines.reduce((s, l) => s + Number((parseFloat(l.debitAmount) || 0).toFixed(2)), 0);
    const creditTotal = lines.reduce((s, l) => s + Number((parseFloat(l.creditAmount) || 0).toFixed(2)), 0);
    const isBalanced = Math.abs(debitTotal - creditTotal) < 0.001 && debitTotal > 0;

    const updateLine = (i: number, field: keyof LineForm, value: string) => {
        setLines(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: value } : l));
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-200 motion-reduce:animate-none">
            <SectionHeading
                title={t("journal.title")}
                description={t("journal.description")}
                action={
                    <Button onClick={() => setShowCreate(!showCreate)}>
                        <Plus className="h-4 w-4 mr-2" /> {t("journal.button.newEntry")}
                    </Button>
                }
            />

            {/* Create Form */}
            {showCreate && (
                <Card className="border border-teal-500/20 bg-teal-500/5  p-6">
                    <h3 className="text-base font-bold text-gray-900 mb-6">{t("journal.create.title")}</h3>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">{t("journal.field.date")}</label>
                            <input type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)}
                                className="w-full rounded-xl border border-gray-200 bg-gray-100 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500/40" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">{t("journal.field.description")}</label>
                            <input value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Electricity bill payment"
                                className="w-full rounded-xl border border-gray-200 bg-gray-100 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-500/40" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">{t("journal.field.type")}</label>
                            <select
                                value={journalEntryTypeId}
                                onChange={(e) => setJournalEntryTypeId(e.target.value)}
                                className="w-full rounded-xl border border-gray-200 bg-gray-100 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                            >
                                <option value="">{t("journal.none")}</option>
                                {(typesQuery.data ?? [])
                                    .filter((t: JournalEntryType) => t.isActive || t.id === journalEntryTypeId)
                                    .map((t: JournalEntryType) => (
                                        <option key={t.id} value={t.id}>
                                            {t.name}{t.isActive ? "" : " (inactive)"}
                                        </option>
                                    ))}
                            </select>
                        </div>
                        <div className="flex items-end">
                            <Button type="button" variant="secondary" className="w-full" onClick={() => setShowAddType((v) => !v)}>
                                {t("journal.button.addType")}
                            </Button>
                        </div>
                    </div>

                    {showAddType && (
                        <div className="mb-6 rounded-2xl border border-teal-500/20 bg-teal-500/5 p-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                                <input
                                    value={newTypeName}
                                    onChange={(e) => setNewTypeName(e.target.value)}
                                    placeholder="e.g. Payment, Invoice, Adjustment"
                                    className="flex-1 rounded-xl border border-gray-200 bg-gray-100 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                                />
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        disabled={!newTypeName.trim() || createTypeMutation.isPending}
                                        onClick={() => createTypeMutation.mutate(newTypeName)}
                                    >
                                        {createTypeMutation.isPending ? t("journal.type.saving") : t("journal.type.save")}
                                    </Button>
                                    <Button type="button" variant="ghost" onClick={() => setShowAddType(false)}>
                                        {t("journal.button.cancel")}
                                    </Button>
                                </div>
                            </div>
                            {createTypeMutation.isError && (
                                <div className="mt-2 text-xs text-red-400">
                                    {(createTypeMutation.error as Error).message || t("journal.type.createError")}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Lines */}
                    <div className="mb-4 overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-200">
                                    <th className="pb-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-600 pr-3">{t("journal.lines.account")}</th>
                                    <th className="pb-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-600 pr-3">{t("journal.lines.description")}</th>
                                    <th className="pb-3 text-right text-[10px] font-bold uppercase tracking-wider text-gray-600 w-36 pr-3">{t("journal.lines.debit")}</th>
                                    <th className="pb-3 text-right text-[10px] font-bold uppercase tracking-wider text-gray-600 w-36">{t("journal.lines.credit")}</th>
                                </tr>
                            </thead>
                            <tbody className="space-y-2">
                                {lines.map((line, i) => (
                                    <tr key={i}>
                                        <td className="py-1.5 pr-3">
                                            <AccountAutocomplete
                                                accounts={postingAccounts}
                                                value={line.accountId}
                                                onChange={(id) => updateLine(i, "accountId", id)}
                                            />
                                        </td>
                                        <td className="py-1.5 pr-3">
                                            <input value={line.description} onChange={e => updateLine(i, "description", e.target.value)}
                                                placeholder={t("common.optional")}
                                                className="w-full rounded-lg border border-gray-200 bg-gray-100 px-2 py-2 text-xs text-gray-900 placeholder:text-gray-300 focus:outline-none" />
                                        </td>
                                        <td className="py-1.5 pr-3">
                                            <input type="number" value={line.debitAmount} onChange={e => updateLine(i, "debitAmount", e.target.value)}
                                                placeholder="0.00"
                                                className="w-full rounded-lg border border-gray-200 bg-gray-100 px-2 py-2 text-xs text-right text-gray-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-teal-500/40" />
                                        </td>
                                        <td className="py-1.5">
                                            <input type="number" value={line.creditAmount} onChange={e => updateLine(i, "creditAmount", e.target.value)}
                                                placeholder="0.00"
                                                className="w-full rounded-lg border border-gray-200 bg-gray-100 px-2 py-2 text-xs text-right text-gray-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-teal-500/40" />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="border-t border-gray-200">
                                <tr>
                                    <td colSpan={2} className="pt-3">
                                        <button onClick={() => setLines(p => [...p, { ...EMPTY_LINE }])} className="text-xs text-teal-500 hover:text-teal-300 font-bold">
                                            {t("journal.lines.addLine")}
                                        </button>
                                    </td>
                                    <td className="pt-3 text-right text-sm font-black tabular-nums text-teal-400 pr-3">{debitTotal.toFixed(2)}</td>
                                    <td className="pt-3 text-right text-sm font-black tabular-nums text-teal-400">{creditTotal.toFixed(2)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    {!isBalanced && debitTotal > 0 && (
                        <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            {t("journal.balance.notBalanced", { debit: debitTotal.toFixed(2), credit: creditTotal.toFixed(2) })}
                        </div>
                    )}
                    {isBalanced && (
                        <div className="mb-4 flex items-center gap-2 rounded-xl border border-teal-500/20 bg-teal-500/10 px-4 py-3 text-sm text-teal-400">
                            {t("journal.balance.balanced")}
                        </div>
                    )}

                    <div className="flex items-center gap-3">
                        <Button onClick={() => createMutation.mutate()} disabled={!isBalanced || createMutation.isPending}>
                            {t("journal.button.saveDraft")}
                        </Button>
                        <Button variant="secondary" onClick={() => setShowCreate(false)}>{t("journal.button.cancel")}</Button>
                        {createMutation.isError && (
                            <p className="text-sm text-red-400">{(createMutation.error as Error).message}</p>
                        )}
                    </div>
                </Card>
            )}

            {/* List */}
            <Card className="p-0 border border-gray-200 bg-panel/40  overflow-hidden">
                <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">
                    <div>
                        <h2 className="text-base font-bold text-gray-900">{t("journal.list.title")}</h2>
                        <p className="text-xs text-gray-500 mt-0.5">{t("journal.list.subtitle")}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => entriesQuery.refetch()} className="text-gray-500 hover:text-teal-400 transition-all">
                            <RefreshCw className={cn("h-4 w-4", entriesQuery.isFetching && "animate-spin")} />
                        </button>
                    </div>
                </div>

                <div className="border-b border-gray-200 px-6 py-4 bg-gray-50">
                    <div className="grid gap-3 sm:grid-cols-3">
                        <div className="sm:col-span-2">
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={t("journal.list.searchPlaceholder")}
                                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                            />
                        </div>
                        <div>
                            <select
                                value={filterTypeId}
                                onChange={(e) => setFilterTypeId(e.target.value)}
                                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                            >
                                <option value="">{t("journal.list.allTypes")}</option>
                                {(typesQuery.data ?? [])
                                    .filter((t: JournalEntryType) => t.isActive)
                                    .map((t: JournalEntryType) => (
                                        <option key={t.id} value={t.id}>
                                            {t.name}
                                        </option>
                                    ))}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="divide-y divide-white/5">
                    {entriesQuery.isLoading ? (
                        <TableSkeleton rows={8} />
                    ) : !entriesQuery.data?.length ? (
                        <div className="py-16 text-center text-sm text-gray-600">{t("journal.list.empty")}</div>
                    ) : entriesQuery.data.map((entry: JournalEntry) => (
                        <div key={entry.id}>
                            <div
                                className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
                                onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                            >
                                <div className="flex items-center gap-4">
                                    <button className="text-gray-600 hover:text-gray-900">
                                        {expandedId === entry.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                    </button>
                                    <div>
                                        <span className="font-mono text-sm font-bold text-teal-400">{entry.reference}</span>
                                        <p className="text-xs text-gray-500 mt-0.5">{entry.description || t("journal.entry.noDescription")}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="text-xs text-gray-500">{formatDate(entry.entryDate)}</span>
                                    {entry.journalEntryType?.name && (
                                        <span className="inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-gray-100 text-gray-900 border-gray-200">
                                            {entry.journalEntryType.name}
                                        </span>
                                    )}
                                    <JournalStatusPill status={entry.status} />
                                    <div className="flex items-center gap-2">
                                        {entry.status === "DRAFT" && (
                                            <button
                                                onClick={e => { e.stopPropagation(); if (confirm(t("journal.confirm.post"))) postMutation.mutate(entry.id); }}
                                                className="flex items-center gap-1.5 rounded-lg bg-teal-500/10 border border-teal-500/20 px-3 py-1.5 text-xs font-bold text-teal-400 hover:bg-teal-500/20 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 active:shadow-md transition-all"
                                            >
                                                <Send className="h-3 w-3" /> {t("journal.action.post")}
                                            </button>
                                        )}
                                        {entry.status === "POSTED" && !entry.reversalOfId && (
                                            <button
                                                onClick={e => { e.stopPropagation(); if (confirm(t("journal.confirm.reverse"))) reverseMutation.mutate(entry.id); }}
                                                className="flex items-center gap-1.5 rounded-lg bg-gray-100 border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-400 hover:text-orange-400 hover:border-orange-400/20 hover:bg-orange-400/10 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 active:shadow-md transition-all"
                                            >
                                                <RotateCcw className="h-3 w-3" /> {t("journal.action.reverse")}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {expandedId === entry.id && (
                                <div className="bg-black/20 px-16 py-4">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="border-b border-gray-200 text-gray-600 uppercase tracking-wider">
                                                <th className="pb-2 text-left font-bold">Account</th>
                                                <th className="pb-2 text-left font-bold">Description</th>
                                                <th className="pb-2 text-right font-bold w-32">Debit</th>
                                                <th className="pb-2 text-right font-bold w-32">Credit</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {expandedEntryQuery.isLoading ? (
                                                <tr>
                                                    <td colSpan={4} className="py-4 text-center text-xs text-gray-600">
                                                        {t("journal.list.loading")}
                                                    </td>
                                                </tr>
                                            ) : (expandedEntryQuery.data?.lines ?? []).map((line: JournalEntryLine) => (
                                                <tr key={line.id} className="hover:bg-gray-100">
                                                    <td className="py-2 text-gray-900">
                                                        <div className="flex flex-col">
                                                            <span className="font-bold">{line.accountName}</span>
                                                            <span className="font-mono text-[10px] text-gray-400">
                                                                {line.accountCode}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="py-2 text-gray-500">{line.description || "—"}</td>
                                                    <td className="py-2 text-right tabular-nums text-teal-400 font-bold">
                                                        {parseFloat(line.debitAmount) > 0 ? formatCurrency(line.debitAmount) : "—"}
                                                    </td>
                                                    <td className="py-2 text-right tabular-nums text-orange-400 font-bold">
                                                        {parseFloat(line.creditAmount) > 0 ? formatCurrency(line.creditAmount) : "—"}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    );
}
