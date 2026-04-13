"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getAuditLog } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { AuditLogEntry, AuditAction } from "@/types/api";
import { SectionHeading, Card } from "@/components/ui";
import { cn, formatDate } from "@/lib/utils";
import { LuShieldCheck as ShieldCheck } from "react-icons/lu";

const ACTION_STYLES: Record<AuditAction, string> = {
    CREATE: "text-teal-400 bg-teal-400/10 border-teal-400/20",
    UPDATE: "text-blue-400 bg-blue-400/10 border-blue-400/20",
    DELETE: "text-red-400 bg-red-400/10 border-red-400/20",
    POST: "text-violet-400 bg-violet-400/10 border-violet-400/20",
    REVERSE: "text-orange-400 bg-orange-400/10 border-orange-400/20",
    OPEN: "text-teal-400 bg-teal-400/10 border-teal-400/20",
    CLOSE: "text-gray-400 bg-zinc-400/10 border-zinc-400/20",
    VIEW: "text-gray-600 bg-gray-100 border-gray-200",
};

const ENTITIES = ["Account", "JournalEntry", "FiscalPeriod", "SegmentValue"];

export function AuditPage() {
    const { token } = useAuth();
    const [entity, setEntity] = useState("");
    const [limit, setLimit] = useState("100");

    const auditQuery = useQuery({
        queryKey: ["audit-log", token, entity, limit],
        queryFn: () => getAuditLog({ entity: entity || undefined, limit: parseInt(limit, 10) }, token),
    });

    const entries: AuditLogEntry[] = auditQuery.data ?? [];

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <SectionHeading
                title="Audit Trail"
                description="Full history of every system action — who did what, on which record, and when. This log is append-only and cannot be modified."
            />

            {/* Filters */}
            <Card className="border border-gray-200 bg-white  p-5">
                <div className="flex items-center gap-4 flex-wrap">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Entity</label>
                        <select value={entity} onChange={e => setEntity(e.target.value)}
                            className="rounded-xl border border-gray-200 bg-gray-100 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500/40">
                            <option value="">All entities</option>
                            {ENTITIES.map(e => <option key={e} value={e}>{e}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Show Last</label>
                        <select value={limit} onChange={e => setLimit(e.target.value)}
                            className="rounded-xl border border-gray-200 bg-gray-100 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500/40">
                            <option value="50">50 events</option>
                            <option value="100">100 events</option>
                            <option value="250">250 events</option>
                        </select>
                    </div>
                </div>
            </Card>

            <Card className="p-0 border border-gray-200 bg-panel/40  overflow-hidden">
                <div className="flex items-center gap-3 border-b border-gray-200 px-6 py-5">
                    <div className="p-2 rounded-lg bg-gray-100 border border-gray-200">
                        <ShieldCheck className="h-4 w-4 text-violet-400" />
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-gray-900">System Audit Log</h2>
                        <p className="text-xs text-gray-500 mt-0.5">{entries.length} events recorded</p>
                    </div>
                </div>

                <div className="divide-y divide-white/5">
                    {auditQuery.isLoading ? (
                        <div className="py-16 text-center text-sm text-gray-600">Loading audit trail...</div>
                    ) : entries.length === 0 ? (
                        <div className="py-16 text-center text-sm text-gray-600">No audit events recorded yet.</div>
                    ) : entries.map((entry: AuditLogEntry) => (
                        <div key={entry.id} className="flex items-start gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                            {/* Action badge */}
                            <div className={cn(
                                "mt-0.5 shrink-0 rounded-lg border px-2 py-1 text-[9px] font-black uppercase tracking-widest",
                                ACTION_STYLES[entry.action] ?? "text-gray-500 bg-gray-100 border-gray-200"
                            )}>
                                {entry.action}
                            </div>

                            {/* Details */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-bold text-zinc-200">{entry.entity}</span>
                                    {entry.entityId && (
                                        <span className="font-mono text-[10px] text-gray-600 border border-gray-200 bg-gray-100 rounded px-1.5 py-0.5 truncate max-w-[200px]">
                                            {entry.entityId}
                                        </span>
                                    )}
                                </div>
                                {entry.details && Object.keys(entry.details).length > 0 && (
                                    <p className="text-xs text-gray-600 mt-0.5 truncate">
                                        {JSON.stringify(entry.details)}
                                    </p>
                                )}
                            </div>

                            {/* User + Time */}
                            <div className="shrink-0 text-right">
                                <div className="text-xs font-bold text-gray-400">
                                    {entry.user?.name || entry.user?.email || "System"}
                                </div>
                                <div className="text-[10px] text-gray-600 tabular-nums mt-0.5">
                                    {new Date(entry.createdAt).toLocaleString()}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    );
}
