"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { LuPlus as Plus, LuRefreshCw as RefreshCw, LuSend as Send, LuRotateCcw as RotateCcw, LuEye as Eye, LuChevronDown as ChevronDown, LuChevronRight as ChevronRight, LuCircleAlert as AlertCircle } from "react-icons/lu";
import { getJournalEntries, createJournalEntry, postJournalEntry, reverseJournalEntry, getAccounts } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { JournalEntry, JournalEntryLine, Account } from "@/types/api";
import { SectionHeading, StatusPill, Card, Button, SidePanel } from "@/components/ui";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

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

export function JournalEntriesPage() {
    const { token } = useAuth();
    const queryClient = useQueryClient();
    const [showCreate, setShowCreate] = useState(false);
    const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    // Create form state
    const [entryDate, setEntryDate] = useState(new Date().toISOString().split("T")[0]);
    const [description, setDescription] = useState("");
    const [lines, setLines] = useState<LineForm[]>([{ ...EMPTY_LINE }, { ...EMPTY_LINE }]);

    const entriesQuery = useQuery({
        queryKey: ["journal-entries", token],
        queryFn: () => getJournalEntries({}, token),
    });

    const accountsQuery = useQuery({
        queryKey: ["accounts-posting", token],
        queryFn: () => getAccounts({}, token),
    });

    const postingAccounts = (accountsQuery.data ?? []).filter((a: Account) => a.isPosting && a.isActive);

    const createMutation = useMutation({
        mutationFn: () => createJournalEntry({
            entryDate,
            description,
            lines: lines
                .filter(l => l.accountId)
                .map(l => ({
                    accountId: l.accountId,
                    description: l.description || undefined,
                    debitAmount: parseFloat(l.debitAmount) || 0,
                    creditAmount: parseFloat(l.creditAmount) || 0,
                })),
        }, token),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
            setShowCreate(false); setLines([{ ...EMPTY_LINE }, { ...EMPTY_LINE }]); setDescription("");
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

    const debitTotal = lines.reduce((s, l) => s + (parseFloat(l.debitAmount) || 0), 0);
    const creditTotal = lines.reduce((s, l) => s + (parseFloat(l.creditAmount) || 0), 0);
    const isBalanced = Math.abs(debitTotal - creditTotal) < 0.01 && debitTotal > 0;

    const updateLine = (i: number, field: keyof LineForm, value: string) => {
        setLines(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: value } : l));
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <SectionHeading
                title="Journal Entries"
                description="Create, review, and post balanced debit/credit entries. Only active posting accounts can be used."
                action={
                    <Button onClick={() => setShowCreate(!showCreate)}>
                        <Plus className="h-4 w-4 mr-2" /> New Entry
                    </Button>
                }
            />

            {/* Create Form */}
            {showCreate && (
                <Card className="border border-teal-500/20 bg-teal-500/5  p-6">
                    <h3 className="text-base font-bold text-gray-900 mb-6">New Journal Entry</h3>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Date</label>
                            <input type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)}
                                className="w-full rounded-xl border border-gray-200 bg-gray-100 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500/40" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Description</label>
                            <input value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Electricity bill payment"
                                className="w-full rounded-xl border border-gray-200 bg-gray-100 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-500/40" />
                        </div>
                    </div>

                    {/* Lines */}
                    <div className="mb-4 overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-200">
                                    <th className="pb-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-600 pr-3">Account</th>
                                    <th className="pb-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-600 pr-3">Description</th>
                                    <th className="pb-3 text-right text-[10px] font-bold uppercase tracking-wider text-gray-600 w-36 pr-3">Debit</th>
                                    <th className="pb-3 text-right text-[10px] font-bold uppercase tracking-wider text-gray-600 w-36">Credit</th>
                                </tr>
                            </thead>
                            <tbody className="space-y-2">
                                {lines.map((line, i) => (
                                    <tr key={i}>
                                        <td className="py-1.5 pr-3">
                                            <select
                                                value={line.accountId}
                                                onChange={e => updateLine(i, "accountId", e.target.value)}
                                                className="w-full rounded-lg border border-gray-200 bg-gray-100 px-2 py-2 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                                            >
                                                <option value="">— Select account —</option>
                                                {postingAccounts.map((a: Account) => (
                                                    <option key={a.id} value={a.id}>{a.code} · {a.name}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="py-1.5 pr-3">
                                            <input value={line.description} onChange={e => updateLine(i, "description", e.target.value)}
                                                placeholder="Optional"
                                                className="w-full rounded-lg border border-gray-200 bg-gray-100 px-2 py-2 text-xs text-gray-900 placeholder:text-gray-300 focus:outline-none" />
                                        </td>
                                        <td className="py-1.5 pr-3">
                                            <input type="number" value={line.debitAmount} onChange={e => updateLine(i, "debitAmount", e.target.value)}
                                                placeholder="0.000"
                                                className="w-full rounded-lg border border-gray-200 bg-gray-100 px-2 py-2 text-xs text-right text-gray-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-teal-500/40" />
                                        </td>
                                        <td className="py-1.5">
                                            <input type="number" value={line.creditAmount} onChange={e => updateLine(i, "creditAmount", e.target.value)}
                                                placeholder="0.000"
                                                className="w-full rounded-lg border border-gray-200 bg-gray-100 px-2 py-2 text-xs text-right text-gray-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-teal-500/40" />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="border-t border-gray-200">
                                <tr>
                                    <td colSpan={2} className="pt-3">
                                        <button onClick={() => setLines(p => [...p, { ...EMPTY_LINE }])} className="text-xs text-teal-500 hover:text-teal-300 font-bold">
                                            + Add Line
                                        </button>
                                    </td>
                                    <td className="pt-3 text-right text-sm font-black tabular-nums text-teal-400 pr-3">{debitTotal.toFixed(3)}</td>
                                    <td className="pt-3 text-right text-sm font-black tabular-nums text-teal-400">{creditTotal.toFixed(3)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    {!isBalanced && debitTotal > 0 && (
                        <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            Entry is not balanced. Debit: {debitTotal.toFixed(3)} · Credit: {creditTotal.toFixed(3)}
                        </div>
                    )}
                    {isBalanced && (
                        <div className="mb-4 flex items-center gap-2 rounded-xl border border-teal-500/20 bg-teal-500/10 px-4 py-3 text-sm text-teal-400">
                            ✓ Entry is balanced
                        </div>
                    )}

                    <div className="flex items-center gap-3">
                        <Button onClick={() => createMutation.mutate()} disabled={!isBalanced || createMutation.isPending}>
                            Save as Draft
                        </Button>
                        <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
                        {createMutation.isError && (
                            <p className="text-sm text-red-400">{(createMutation.error as Error).message}</p>
                        )}
                    </div>
                </Card>
            )}

            {/* List */}
            <Card className="p-0 border border-gray-200 bg-panel/40  overflow-hidden">
                <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">
                    <h2 className="text-base font-bold text-gray-900">Journal Entries</h2>
                    <button onClick={() => entriesQuery.refetch()} className="text-gray-500 hover:text-teal-400 transition-all">
                        <RefreshCw className={cn("h-4 w-4", entriesQuery.isFetching && "animate-spin")} />
                    </button>
                </div>

                <div className="divide-y divide-white/5">
                    {entriesQuery.isLoading ? (
                        <div className="py-16 text-center text-sm text-gray-600">Loading entries...</div>
                    ) : !entriesQuery.data?.length ? (
                        <div className="py-16 text-center text-sm text-gray-600">No journal entries yet.</div>
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
                                        <p className="text-xs text-gray-500 mt-0.5">{entry.description || "No description"}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="text-xs text-gray-500">{formatDate(entry.entryDate)}</span>
                                    <JournalStatusPill status={entry.status} />
                                    <div className="flex items-center gap-2">
                                        {entry.status === "DRAFT" && (
                                            <button
                                                onClick={e => { e.stopPropagation(); if (confirm("Post this entry?")) postMutation.mutate(entry.id); }}
                                                className="flex items-center gap-1.5 rounded-lg bg-teal-500/10 border border-teal-500/20 px-3 py-1.5 text-xs font-bold text-teal-400 hover:bg-teal-500/20 transition-all"
                                            >
                                                <Send className="h-3 w-3" /> Post
                                            </button>
                                        )}
                                        {entry.status === "POSTED" && !entry.reversalOfId && (
                                            <button
                                                onClick={e => { e.stopPropagation(); if (confirm("Reverse this entry?")) reverseMutation.mutate(entry.id); }}
                                                className="flex items-center gap-1.5 rounded-lg bg-gray-100 border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-400 hover:text-orange-400 hover:border-orange-400/20 hover:bg-orange-400/10 transition-all"
                                            >
                                                <RotateCcw className="h-3 w-3" /> Reverse
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
                                            {entry.lines.map((line: JournalEntryLine) => (
                                                <tr key={line.id} className="hover:bg-gray-100">
                                                    <td className="py-2 font-mono text-gray-900">{line.accountId.slice(0, 8)}…</td>
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
