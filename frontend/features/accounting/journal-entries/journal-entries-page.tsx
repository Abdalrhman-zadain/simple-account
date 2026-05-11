"use client";

import type { ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LuPlus as Plus, LuRefreshCw as RefreshCw, LuSend as Send, LuRotateCcw as RotateCcw, LuChevronDown as ChevronDown, LuChevronRight as ChevronRight, LuCircleAlert as AlertCircle } from "react-icons/lu";
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
import { SectionHeading, StatusPill, Card, Button, TableSkeleton, PageShell } from "@/components/ui";
import { ExportActions } from "@/components/ui/export-actions";
import { exportOrPrint, formatExportDate, type ExportMode } from "@/lib/export-print";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

function JournalStatusPill({ status }: { status: string }) {
    const { t } = useTranslation();

    return (
        <StatusPill
            label={t(`journal.status.${status}`)}
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
    const { token, user } = useAuth();
    const queryClient = useQueryClient();
    const { t, language } = useTranslation();
    const isArabic = language === "ar";
    const [showCreate, setShowCreate] = useState(false);
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
    const exportPermissions = { canPrint: true, canExportPdf: true, canExportExcel: true };
    const entries = entriesQuery.data ?? [];
    const activeTypes = (typesQuery.data ?? []).filter((type: JournalEntryType) => type.isActive);
    const draftCount = entries.filter((entry) => entry.status === "DRAFT").length;
    const postedCount = entries.filter((entry) => entry.status === "POSTED").length;

    const handleExport = (mode: ExportMode) => {
        exportOrPrint({
            mode,
            entityType: "table",
            title: "القيود اليومية",
            fileName: "journal-entries",
            currency: "JOD",
            generatedBy: user?.name || user?.email,
            permissions: exportPermissions,
            filters: [
                { label: "البحث", value: search.trim() || "كل القيود" },
                {
                    label: "نوع القيد",
                    value: filterTypeId
                        ? (typesQuery.data ?? []).find((type: JournalEntryType) => type.id === filterTypeId)?.name
                        : "كل الأنواع",
                },
            ],
            columns: [
                { key: "reference", label: "رقم القيد", value: (row) => row.reference },
                { key: "date", label: "تاريخ القيد", value: (row) => formatExportDate(row.entryDate) },
                { key: "type", label: "نوع القيد", value: (row) => row.journalEntryType?.name || "غير محدد" },
                { key: "description", label: "الوصف", value: (row) => row.description || "بدون وصف" },
                { key: "status", label: "الحالة", value: (row) => t(`journal.status.${row.status}`) },
            ],
            rows: entriesQuery.data ?? [],
            totals: [{ label: "عدد القيود", value: String(entriesQuery.data?.length ?? 0) }],
        });
    };

    const updateLine = (i: number, field: keyof LineForm, value: string) => {
        setLines(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: value } : l));
    };

    return (
        <PageShell>
            <div dir={isArabic ? "rtl" : "ltr"} className={cn("space-y-8 animate-in fade-in duration-200 motion-reduce:animate-none", isArabic && "arabic-ui")}>
                <SectionHeading
                    title={t("journal.title")}
                    description={t("journal.description")}
                />

                <div className="grid gap-4 md:grid-cols-3">
                    <SummaryCard label={t("journal.list.title")} value={entries.length} hint={t("journal.list.subtitle")} />
                    <SummaryCard label={t("journal.status.DRAFT")} value={draftCount} hint={t("journal.button.saveDraft")} />
                    <SummaryCard label={t("journal.status.POSTED")} value={postedCount} hint={t("journal.action.post")} />
                </div>

                <Card className="p-5">
                    <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr_auto_auto]">
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={t("journal.list.searchPlaceholder")}
                            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                        />
                        <select
                            value={filterTypeId}
                            onChange={(e) => setFilterTypeId(e.target.value)}
                            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                        >
                            <option value="">{t("journal.list.allTypes")}</option>
                            {activeTypes.map((type: JournalEntryType) => (
                                <option key={type.id} value={type.id}>
                                    {type.name}
                                </option>
                            ))}
                        </select>
                        <Button className="gap-2" onClick={() => setShowCreate(!showCreate)}>
                            <Plus className="h-4 w-4 shrink-0" />
                            {t("journal.button.newEntry")}
                        </Button>
                        <div className="flex items-center justify-end">
                            <button
                                type="button"
                                onClick={() => entriesQuery.refetch()}
                                className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-50 hover:text-teal-500"
                            >
                                <RefreshCw className={cn("h-4 w-4", entriesQuery.isFetching && "animate-spin")} />
                            </button>
                        </div>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                        <ExportActions onAction={handleExport} permissions={exportPermissions} disabled={entriesQuery.isLoading} />
                    </div>
                </Card>

                {showCreate && (
                    <Card className="space-y-6 border border-teal-200 bg-teal-50/40 p-6">
                        <div>
                            <div className="text-base font-bold text-gray-900">{t("journal.create.title")}</div>
                            <div className="mt-1 text-xs text-gray-500">{t("journal.description")}</div>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">{t("journal.field.date")}</label>
                                <input
                                    type="date"
                                    value={entryDate}
                                    onChange={e => setEntryDate(e.target.value)}
                                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                                />
                            </div>
                            <div>
                                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">{t("journal.field.description")}</label>
                                <input
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    placeholder="e.g. Electricity bill payment"
                                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                                />
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">{t("journal.field.type")}</label>
                                <select
                                    value={journalEntryTypeId}
                                    onChange={(e) => setJournalEntryTypeId(e.target.value)}
                                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
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
                            <div className="rounded-2xl border border-teal-200 bg-white p-4">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                                    <input
                                        value={newTypeName}
                                        onChange={(e) => setNewTypeName(e.target.value)}
                                        placeholder="e.g. Payment, Invoice, Adjustment"
                                        className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
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
                                    <div className="mt-2 text-xs text-red-500">
                                        {(createTypeMutation.error as Error).message || t("journal.type.createError")}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
                            <table className="w-full min-w-[860px] table-fixed text-sm">
                                <colgroup>
                                    <col className="w-[28%]" />
                                    <col className="w-[34%]" />
                                    <col className="w-[19%]" />
                                    <col className="w-[19%]" />
                                </colgroup>
                                <thead className="bg-gray-50">
                                    <tr>
                                        <TableHead>{t("journal.lines.account")}</TableHead>
                                        <TableHead>{t("journal.lines.description")}</TableHead>
                                        <TableHead className="text-end">{t("journal.lines.debit")}</TableHead>
                                        <TableHead className="text-end">{t("journal.lines.credit")}</TableHead>
                                    </tr>
                                </thead>
                                <tbody>
                                    {lines.map((line, i) => (
                                        <tr key={i} className="border-t border-gray-100">
                                            <td className="px-4 py-3 align-top">
                                                <AccountAutocomplete
                                                    accounts={postingAccounts}
                                                    value={line.accountId}
                                                    onChange={(id) => updateLine(i, "accountId", id)}
                                                />
                                            </td>
                                            <td className="px-4 py-3 align-top">
                                                <input
                                                    value={line.description}
                                                    onChange={e => updateLine(i, "description", e.target.value)}
                                                    placeholder={t("common.optional")}
                                                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-2 py-2 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                                                />
                                            </td>
                                            <td className="px-4 py-3 align-top">
                                                <input
                                                    type="number"
                                                    value={line.debitAmount}
                                                    onChange={e => updateLine(i, "debitAmount", e.target.value)}
                                                    placeholder="0.00"
                                                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-2 py-2 text-xs text-right text-gray-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                                                />
                                            </td>
                                            <td className="px-4 py-3 align-top">
                                                <input
                                                    type="number"
                                                    value={line.creditAmount}
                                                    onChange={e => updateLine(i, "creditAmount", e.target.value)}
                                                    placeholder="0.00"
                                                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-2 py-2 text-xs text-right text-gray-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="border-t border-gray-200 bg-gray-50">
                                    <tr>
                                        <td colSpan={2} className="px-4 py-3">
                                            <button onClick={() => setLines(p => [...p, { ...EMPTY_LINE }])} className="text-xs font-bold text-teal-600 hover:text-teal-700">
                                                {t("journal.lines.addLine")}
                                            </button>
                                        </td>
                                        <td className="px-4 py-3 text-end text-sm font-black tabular-nums text-teal-600">{debitTotal.toFixed(2)}</td>
                                        <td className="px-4 py-3 text-end text-sm font-black tabular-nums text-teal-600">{creditTotal.toFixed(2)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        {!isBalanced && debitTotal > 0 && (
                            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                                <AlertCircle className="h-4 w-4 shrink-0" />
                                {t("journal.balance.notBalanced", { debit: debitTotal.toFixed(2), credit: creditTotal.toFixed(2) })}
                            </div>
                        )}
                        {isBalanced && (
                            <div className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-700">
                                {t("journal.balance.balanced")}
                            </div>
                        )}

                        <div className="flex flex-wrap items-center gap-3">
                            <Button onClick={() => createMutation.mutate()} disabled={!isBalanced || createMutation.isPending}>
                                {t("journal.button.saveDraft")}
                            </Button>
                            <Button variant="secondary" onClick={() => setShowCreate(false)}>{t("journal.button.cancel")}</Button>
                            {createMutation.isError && (
                                <p className="text-sm text-red-500">{(createMutation.error as Error).message}</p>
                            )}
                        </div>
                    </Card>
                )}

                <Card className="overflow-hidden p-0">
                    <div className="border-b border-gray-200 px-6 py-4">
                        <div className="text-sm font-bold text-gray-900">{t("journal.list.title")}</div>
                        <div className="text-xs text-gray-500">{t("journal.list.subtitle")}</div>
                    </div>

                    <div className="divide-y divide-gray-100">
                        {entriesQuery.isLoading ? (
                            <TableSkeleton rows={8} />
                        ) : !entries.length ? (
                            <div className="py-16 text-center text-sm text-gray-600">{t("journal.list.empty")}</div>
                        ) : entries.map((entry: JournalEntry) => (
                            <div key={entry.id}>
                                <div
                                    className="flex cursor-pointer items-start justify-between px-6 py-5 transition-colors hover:bg-gray-50"
                                    onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                                >
                                    <div className="flex min-w-0 items-start gap-4">
                                        <button type="button" className="mt-1 text-gray-600 hover:text-gray-900">
                                            {expandedId === entry.id ? (
                                                <ChevronDown className="h-4 w-4" />
                                            ) : (
                                                <ChevronRight className={cn("h-4 w-4", isArabic && "rotate-180")} />
                                            )}
                                        </button>
                                        <div className="min-w-0">
                                            <span className="font-mono text-sm font-bold text-teal-500">{entry.reference}</span>
                                            <p className="mt-1 text-xs text-gray-500">{entry.description || t("journal.entry.noDescription")}</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-3">
                                        <span className="text-xs text-gray-500">{formatDate(entry.entryDate)}</span>
                                        {entry.journalEntryType?.name && (
                                            <span className="inline-flex rounded-full border border-gray-200 bg-gray-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-900">
                                                {entry.journalEntryType.name}
                                            </span>
                                        )}
                                        <JournalStatusPill status={entry.status} />
                                        <div className="flex items-center gap-2">
                                            {entry.status === "DRAFT" && (
                                                <button
                                                    onClick={e => { e.stopPropagation(); if (confirm(t("journal.confirm.post"))) postMutation.mutate(entry.id); }}
                                                    className="rounded-md border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-bold text-teal-700 hover:bg-teal-100"
                                                >
                                                    <span className="inline-flex items-center gap-1.5">
                                                        <Send className="h-3 w-3" />
                                                        {t("journal.action.post")}
                                                    </span>
                                                </button>
                                            )}
                                            {entry.status === "POSTED" && !entry.reversalOfId && (
                                                <button
                                                    onClick={e => { e.stopPropagation(); if (confirm(t("journal.confirm.reverse"))) reverseMutation.mutate(entry.id); }}
                                                    className="rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 hover:bg-amber-100"
                                                >
                                                    <span className="inline-flex items-center gap-1.5">
                                                        <RotateCcw className="h-3 w-3" />
                                                        {t("journal.action.reverse")}
                                                    </span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {expandedId === entry.id && (
                                    <div className="border-t border-gray-200 bg-gray-50 px-6 py-5">
                                        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
                                            <table className="w-full min-w-[760px] table-fixed text-sm">
                                                <colgroup>
                                                    <col className="w-[30%]" />
                                                    <col className="w-[34%]" />
                                                    <col className="w-36" />
                                                    <col className="w-36" />
                                                </colgroup>
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <TableHead className={isArabic ? "text-right" : "text-left"}>{t("journal.lines.account")}</TableHead>
                                                        <TableHead className={isArabic ? "text-right" : "text-left"}>{t("journal.lines.description")}</TableHead>
                                                        <TableHead className="text-end">{t("journal.lines.debit")}</TableHead>
                                                        <TableHead className="text-end">{t("journal.lines.credit")}</TableHead>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {expandedEntryQuery.isLoading ? (
                                                        <tr>
                                                            <td colSpan={4} className="py-6 text-center text-sm text-gray-600">
                                                                {t("journal.list.loading")}
                                                            </td>
                                                        </tr>
                                                    ) : (expandedEntryQuery.data?.lines ?? []).map((line: JournalEntryLine) => (
                                                        <tr key={line.id} className="border-t border-gray-100">
                                                            <td className={cn("px-6 py-4 align-top text-slate-900", isArabic ? "text-right" : "text-left")}>
                                                                <div className={cn("inline-flex flex-col", isArabic ? "ml-auto items-end text-right" : "mr-auto items-start text-left")}>
                                                                    <span className="block font-semibold">
                                                                        {isArabic ? line.accountNameAr || line.accountName : line.accountName}
                                                                    </span>
                                                                <span dir="ltr" className="block self-start text-left font-mono text-xs text-slate-500">
                                                                    {line.accountCode}
                                                                </span>
                                                                </div>
                                                            </td>
                                                            <td className={cn("px-6 py-4 align-top text-gray-700", isArabic ? "text-right" : "text-left")}>{line.description || "—"}</td>
                                                            <td className="px-6 py-4 text-end align-top font-mono font-bold tabular-nums text-teal-600">
                                                                {parseFloat(line.debitAmount) > 0 ? formatCurrency(line.debitAmount) : "—"}
                                                            </td>
                                                            <td className="px-6 py-4 text-end align-top font-mono font-bold tabular-nums text-amber-600">
                                                                {parseFloat(line.creditAmount) > 0 ? formatCurrency(line.creditAmount) : "—"}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
        </PageShell>
    );
}

function SummaryCard({ label, value, hint }: { label: string; value: string | number; hint: string }) {
    return (
        <Card className="p-5">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">{label}</div>
            <div className="mt-2 text-2xl font-black text-gray-900">{value}</div>
            <div className="mt-1 text-xs text-gray-500">{hint}</div>
        </Card>
    );
}

function TableHead({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    return <th className={cn("px-6 py-3 text-start text-[10px] font-bold uppercase tracking-widest text-gray-600", className)}>{children}</th>;
}
