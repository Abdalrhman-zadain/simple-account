"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Pencil, X, Check, Building2, MapPin, Users2, BookMarked, FolderKanban } from "lucide-react";
import { getSegmentDefinitions, createSegmentValue, updateSegmentValue, deactivateSegmentValue } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { SegmentDefinition, SegmentValue } from "@/types/api";
import { SectionHeading, StatusPill, Card, Button } from "@/components/ui";
import { cn } from "@/lib/utils";

const SEGMENT_ICONS = [Building2, BookMarked, Users2, MapPin, FolderKanban];
const SEGMENT_COLORS = [
    "text-violet-400 bg-violet-400/10 border-violet-400/20",
    "text-teal-400 bg-teal-400/10 border-teal-400/20",
    "text-blue-400 bg-blue-400/10 border-blue-400/20",
    "text-orange-400 bg-orange-400/10 border-orange-400/20",
    "text-pink-400 bg-pink-400/10 border-pink-400/20",
];

export function MasterDataPage() {
    const { token } = useAuth();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState(0);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editCode, setEditCode] = useState("");
    const [editName, setEditName] = useState("");
    const [newCode, setNewCode] = useState("");
    const [newName, setNewName] = useState("");
    const [showAdd, setShowAdd] = useState(false);

    const { data: definitions = [], isLoading } = useQuery({
        queryKey: ["segment-definitions", token],
        queryFn: () => getSegmentDefinitions(token),
    });

    const createMutation = useMutation({
        mutationFn: ({ defId, code, name }: { defId: string; code: string; name: string }) =>
            createSegmentValue(defId, { code, name }, token),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["segment-definitions"] });
            setNewCode(""); setNewName(""); setShowAdd(false);
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, code, name }: { id: string; code: string; name: string }) =>
            updateSegmentValue(id, { code, name }, token),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["segment-definitions"] });
            setEditingId(null);
        },
    });

    const deactivateMutation = useMutation({
        mutationFn: (id: string) => deactivateSegmentValue(id, token),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["segment-definitions"] }),
    });

    if (isLoading) return <div className="flex items-center justify-center py-40 text-zinc-500">Loading master data...</div>;

    const activeDef: SegmentDefinition | undefined = definitions[activeTab];

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <SectionHeading
                title="Master Data Setup"
                description="Define your business dimensions — Companies, Natural Accounts, Departments, Branches, and Projects. These become the building blocks for all account codes."
            />

            {/* Tabs */}
            <div className="flex gap-2 flex-wrap">
                {definitions.map((def, i) => {
                    const Icon = SEGMENT_ICONS[i] ?? Building2;
                    const color = SEGMENT_COLORS[i] ?? SEGMENT_COLORS[0];
                    return (
                        <button
                            key={def.id}
                            onClick={() => { setActiveTab(i); setShowAdd(false); setEditingId(null); }}
                            className={cn(
                                "flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold border transition-all",
                                activeTab === i ? color : "text-zinc-500 bg-white/5 border-white/5 hover:bg-white/10 hover:text-zinc-300"
                            )}
                        >
                            <Icon className="h-4 w-4" />
                            {def.name}
                            <span className={cn(
                                "ml-1 rounded-full px-2 py-0.5 text-[10px] font-black",
                                activeTab === i ? "bg-white/20" : "bg-white/10"
                            )}>
                                {def.values.filter(v => v.isActive).length}
                            </span>
                        </button>
                    );
                })}
            </div>

            {activeDef && (
                <Card className="p-0 border border-white/5 bg-panel/40 backdrop-blur-xl overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-white/5 px-6 py-5">
                        <div>
                            <h2 className="text-base font-bold text-white">{activeDef.name}</h2>
                            <p className="text-xs text-zinc-500 mt-0.5">{activeDef.description || `Manage ${activeDef.name} master values`}</p>
                        </div>
                        <Button onClick={() => setShowAdd(true)} disabled={showAdd}>
                            <Plus className="h-4 w-4 mr-2" /> Add {activeDef.name}
                        </Button>
                    </div>

                    {/* Add Row */}
                    {showAdd && (
                        <div className="border-b border-white/5 px-6 py-4 bg-teal-500/5">
                            <div className="flex items-center gap-3">
                                <input
                                    value={newCode}
                                    onChange={e => setNewCode(e.target.value.toUpperCase())}
                                    placeholder="Code (e.g., AMM)"
                                    className="w-32 rounded-lg border border-teal-500/30 bg-white/5 px-3 py-2 text-sm font-mono text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                                />
                                <input
                                    value={newName}
                                    onChange={e => setNewName(e.target.value)}
                                    placeholder="Full name (e.g., Amman)"
                                    className="flex-1 rounded-lg border border-teal-500/30 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                                />
                                <button
                                    onClick={() => createMutation.mutate({ defId: activeDef.id, code: newCode, name: newName })}
                                    disabled={!newCode || !newName || createMutation.isPending}
                                    className="flex items-center gap-1.5 rounded-lg bg-teal-500 px-4 py-2 text-sm font-bold text-teal-950 hover:bg-teal-400 disabled:opacity-50 transition-all"
                                >
                                    <Check className="h-4 w-4" /> Save
                                </button>
                                <button onClick={() => setShowAdd(false)} className="p-2 text-zinc-500 hover:text-white">
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Table */}
                    <table className="w-full text-left">
                        <thead className="border-b border-white/5 bg-white/[0.02]">
                            <tr>
                                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-600">Code</th>
                                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-600">Name</th>
                                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-600 text-center">Status</th>
                                <th className="px-6 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-zinc-600">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {activeDef.values.length === 0 ? (
                                <tr><td colSpan={4} className="px-6 py-12 text-center text-sm text-zinc-600">No values yet. Add one above.</td></tr>
                            ) : activeDef.values.map((val: SegmentValue) => (
                                <tr key={val.id} className="group hover:bg-white/[0.02] transition-colors">
                                    <td className="px-6 py-4">
                                        {editingId === val.id
                                            ? <input value={editCode} onChange={e => setEditCode(e.target.value.toUpperCase())} className="w-24 rounded-lg border border-teal-500/30 bg-white/5 px-2 py-1 font-mono text-sm text-white focus:outline-none" />
                                            : <span className="font-mono text-xs font-bold text-teal-400">{val.code}</span>
                                        }
                                    </td>
                                    <td className="px-6 py-4">
                                        {editingId === val.id
                                            ? <input value={editName} onChange={e => setEditName(e.target.value)} className="rounded-lg border border-teal-500/30 bg-white/5 px-2 py-1 text-sm text-white focus:outline-none w-64" />
                                            : <span className="text-sm font-medium text-zinc-200">{val.name}</span>
                                        }
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <StatusPill label={val.isActive ? "Active" : "Inactive"} tone={val.isActive ? "positive" : "neutral"} />
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {editingId === val.id ? (
                                                <>
                                                    <button onClick={() => updateMutation.mutate({ id: val.id, code: editCode, name: editName })} className="p-1.5 rounded-lg text-teal-400 hover:bg-teal-400/10">
                                                        <Check className="h-4 w-4" />
                                                    </button>
                                                    <button onClick={() => setEditingId(null)} className="p-1.5 rounded-lg text-zinc-500 hover:text-white">
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button onClick={() => { setEditingId(val.id); setEditCode(val.code); setEditName(val.name); }} className="p-1.5 rounded-lg text-zinc-500 hover:text-teal-400 hover:bg-teal-400/10 transition-all">
                                                        <Pencil className="h-4 w-4" />
                                                    </button>
                                                    {val.isActive && (
                                                        <button onClick={() => { if (confirm(`Deactivate "${val.name}"?`)) deactivateMutation.mutate(val.id); }} className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-400/10 transition-all">
                                                            <X className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Card>
            )}
        </div>
    );
}
