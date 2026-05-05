"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useState } from "react";
import { LuPlus as Plus, LuPencil as Pencil, LuX as X, LuCheck as Check, LuBuilding2 as Building2, LuMapPin as MapPin, LuUsers as Users2, LuBookMarked as BookMarked, LuFolderKanban as FolderKanban, LuWallet as Wallet, LuPercent as Percent, LuTrash2 as Trash2 } from "react-icons/lu";
import {
    createTax,
    createAccountSubtype,
    createJournalEntryType,
    createPaymentMethodType,
    createSegmentValue,
    deactivateAccountSubtype,
    deactivateJournalEntryType,
    deactivatePaymentMethodType,
    deactivateSegmentValue,
    getAccountSubtypes,
    getAccountOptions,
    getJournalEntryTypes,
    getPaymentMethodTypes,
    getSegmentDefinitions,
    getTaxes,
    updateAccountSubtype,
    updateJournalEntryType,
    updatePaymentMethodType,
    updateSegmentValue,
    updateTax,
    deleteTax,
} from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { AccountOption, AccountSubtype, JournalEntryType, PaymentMethodType, SegmentDefinition, SegmentValue, Tax, TaxType } from "@/types/api";
import { SectionHeading, StatusPill, Card, Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

const SEGMENT_ICONS = [Building2, BookMarked, Users2, MapPin, FolderKanban];
const SEGMENT_COLORS = [
    "text-violet-400 bg-violet-400/10 border-violet-400/20",
    "text-teal-400 bg-teal-400/10 border-teal-400/20",
    "text-blue-400 bg-blue-400/10 border-blue-400/20",
    "text-orange-400 bg-orange-400/10 border-orange-400/20",
    "text-pink-400 bg-pink-400/10 border-pink-400/20",
];

const TAX_TYPES: TaxType[] = ["SALES", "PURCHASE", "ZERO_RATED", "EXEMPT", "OUT_OF_SCOPE"];

type TaxEditorState = {
    id?: string;
    taxCode: string;
    taxName: string;
    rate: string;
    taxType: TaxType;
    taxAccountId: string;
    isActive: boolean;
};

const emptyTaxEditor: TaxEditorState = {
    taxCode: "",
    taxName: "",
    rate: "",
    taxType: "SALES",
    taxAccountId: "",
    isActive: true,
};

export function MasterDataPage() {
    const { token } = useAuth();
    const queryClient = useQueryClient();
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState(0);
    const [segmentEditingId, setSegmentEditingId] = useState<string | null>(null);
    const [editCode, setEditCode] = useState("");
    const [editName, setEditName] = useState("");
    const [newCode, setNewCode] = useState("");
    const [newName, setNewName] = useState("");
    const [showAddSegmentValue, setShowAddSegmentValue] = useState(false);

    const [subtypeEditingId, setSubtypeEditingId] = useState<string | null>(null);
    const [editSubtypeName, setEditSubtypeName] = useState("");
    const [newSubtypeName, setNewSubtypeName] = useState("");
    const [showAddSubtype, setShowAddSubtype] = useState(false);

    const [typeEditingId, setTypeEditingId] = useState<string | null>(null);
    const [editTypeName, setEditTypeName] = useState("");
    const [newTypeName, setNewTypeName] = useState("");
    const [showAddType, setShowAddType] = useState(false);

    const [paymentMethodTypeEditingId, setPaymentMethodTypeEditingId] = useState<string | null>(null);
    const [editPaymentMethodTypeName, setEditPaymentMethodTypeName] = useState("");
    const [newPaymentMethodTypeName, setNewPaymentMethodTypeName] = useState("");
    const [showAddPaymentMethodType, setShowAddPaymentMethodType] = useState(false);
    const [taxEditor, setTaxEditor] = useState<TaxEditorState | null>(null);

    const { data: definitions = [], isLoading } = useQuery({
        queryKey: ["segment-definitions", token],
        queryFn: () => getSegmentDefinitions(token),
    });

    const { data: accountSubtypes = [], isLoading: isLoadingSubtypes } = useQuery({
        queryKey: ["account-subtypes", token],
        queryFn: () => getAccountSubtypes(token),
    });

    const { data: journalEntryTypes = [], isLoading: isLoadingTypes } = useQuery({
        queryKey: ["journal-entry-types", token],
        queryFn: () => getJournalEntryTypes(token),
    });

    const { data: paymentMethodTypes = [], isLoading: isLoadingPaymentMethodTypes } = useQuery({
        queryKey: ["payment-method-types", token],
        queryFn: () => getPaymentMethodTypes(token),
    });

    const { data: taxes = [], isLoading: isLoadingTaxes, isError: isTaxesError, error: taxesError } = useQuery({
        queryKey: ["taxes", token],
        queryFn: () => getTaxes(token),
    });

    const { data: taxAccounts = [] } = useQuery({
        queryKey: ["accounts", "tax-account-options", token],
        queryFn: () => getAccountOptions({ isActive: "true", isPosting: "true" }, token),
    });

    const createMutation = useMutation({
        mutationFn: ({ defId, code, name }: { defId: string; code: string; name: string }) =>
            createSegmentValue(defId, { code, name }, token),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["segment-definitions"] });
            setNewCode(""); setNewName(""); setShowAddSegmentValue(false);
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, code, name }: { id: string; code: string; name: string }) =>
            updateSegmentValue(id, { code, name }, token),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["segment-definitions"] });
            setSegmentEditingId(null);
        },
    });

    const deactivateMutation = useMutation({
        mutationFn: (id: string) => deactivateSegmentValue(id, token),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["segment-definitions"] }),
    });

    const createSubtypeMutation = useMutation({
        mutationFn: (name: string) => createAccountSubtype({ name }, token),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["account-subtypes"] });
            setNewSubtypeName("");
            setShowAddSubtype(false);
        },
    });

    const updateSubtypeMutation = useMutation({
        mutationFn: ({ id, name }: { id: string; name: string }) => updateAccountSubtype(id, { name }, token),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["account-subtypes"] });
            setSubtypeEditingId(null);
        },
    });

    const deactivateSubtypeMutation = useMutation({
        mutationFn: (id: string) => deactivateAccountSubtype(id, token),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["account-subtypes"] }),
    });

    const createTypeMutation = useMutation({
        mutationFn: (name: string) => createJournalEntryType({ name }, token),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["journal-entry-types"] });
            setNewTypeName("");
            setShowAddType(false);
        },
    });

    const updateTypeMutation = useMutation({
        mutationFn: ({ id, name }: { id: string; name: string }) => updateJournalEntryType(id, { name }, token),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["journal-entry-types"] });
            setTypeEditingId(null);
        },
    });

    const deactivateTypeMutation = useMutation({
        mutationFn: (id: string) => deactivateJournalEntryType(id, token),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["journal-entry-types"] }),
    });

    const createPaymentMethodTypeMutation = useMutation({
        mutationFn: (name: string) => createPaymentMethodType({ name }, token),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["payment-method-types"] });
            setNewPaymentMethodTypeName("");
            setShowAddPaymentMethodType(false);
        },
    });

    const updatePaymentMethodTypeMutation = useMutation({
        mutationFn: ({ id, name }: { id: string; name: string }) => updatePaymentMethodType(id, { name }, token),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["payment-method-types"] });
            setPaymentMethodTypeEditingId(null);
        },
    });

    const deactivatePaymentMethodTypeMutation = useMutation({
        mutationFn: (id: string) => deactivatePaymentMethodType(id, token),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["payment-method-types"] }),
    });

    const saveTaxMutation = useMutation({
        mutationFn: (editor: TaxEditorState) => {
            const payload = {
                taxCode: editor.taxCode,
                taxName: editor.taxName,
                rate: Number(editor.rate),
                taxType: editor.taxType,
                taxAccountId: editor.taxAccountId || null,
                isActive: editor.isActive,
            };
            return editor.id ? updateTax(editor.id, payload, token) : createTax(payload, token);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["taxes"] });
            setTaxEditor(null);
        },
    });

    const deleteTaxMutation = useMutation({
        mutationFn: (id: string) => deleteTax(id, token),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["taxes"] }),
    });

    if (isLoading || isLoadingSubtypes || isLoadingTypes || isLoadingPaymentMethodTypes || isLoadingTaxes) return <div className="flex items-center justify-center py-40 text-gray-500">{t("master.loading")}</div>;

    const TABS = [
        ...definitions.map((def) => ({ kind: "segment" as const, def })),
        { kind: "account-subtypes" as const, def: null },
        { kind: "journal-entry-types" as const, def: null },
        { kind: "payment-method-types" as const, def: null },
        { kind: "taxes" as const, def: null },
    ];

    const active = TABS[activeTab];
    const activeDef: SegmentDefinition | undefined = active?.kind === "segment" ? active.def : undefined;
    const openTaxEditor = (tax?: Tax) => {
        setTaxEditor(tax ? {
            id: tax.id,
            taxCode: tax.taxCode,
            taxName: tax.taxName,
            rate: String(tax.rate),
            taxType: tax.taxType,
            taxAccountId: tax.taxAccountId ?? "",
            isActive: tax.isActive,
        } : emptyTaxEditor);
    };
    const accountLabel = (account?: AccountOption | null) =>
        account ? `${account.code} - ${account.nameAr || account.name}` : t("master.taxes.noAccount");
    const selectedTaxTypeRequiresAccount = taxEditor?.taxType === "SALES" || taxEditor?.taxType === "PURCHASE";
    const canSaveTax = Boolean(
        taxEditor?.taxCode.trim() &&
        taxEditor?.taxName.trim() &&
        taxEditor?.rate !== "" &&
        Number.isFinite(Number(taxEditor?.rate)) &&
        Number(taxEditor?.rate) >= 0 &&
        Number(taxEditor?.rate) <= 100 &&
        (!selectedTaxTypeRequiresAccount || taxEditor?.taxAccountId)
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-200 motion-reduce:animate-none">
            <SectionHeading
                title={t("master.title")}
                description={t("master.description")}
            />

            {/* Tabs */}
            <div className="flex gap-2 flex-wrap">
                {TABS.map((tab, i) => {
                    const isSubtypeTab = tab.kind === "account-subtypes";
                    const isTypeTab = tab.kind === "journal-entry-types";
                    const isPaymentMethodTypeTab = tab.kind === "payment-method-types";
                    const isTaxTab = tab.kind === "taxes";
                    const def = tab.def as SegmentDefinition | null;
                    const Icon = isSubtypeTab ? BookMarked : isTypeTab ? FolderKanban : isPaymentMethodTypeTab ? Wallet : isTaxTab ? Percent : (SEGMENT_ICONS[i] ?? Building2);
                    const color =
                        isSubtypeTab
                            ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/20"
                            : isTypeTab
                                ? "text-indigo-400 bg-indigo-400/10 border-indigo-400/20"
                                : isPaymentMethodTypeTab
                                    ? "text-cyan-400 bg-cyan-400/10 border-cyan-400/20"
                                    : isTaxTab
                                        ? "text-green-400 bg-green-400/10 border-green-400/20"
                                        : (SEGMENT_COLORS[i] ?? SEGMENT_COLORS[0]);
                    return (
                        <button
                            key={isSubtypeTab ? "account-subtypes" : isTypeTab ? "journal-entry-types" : isPaymentMethodTypeTab ? "payment-method-types" : isTaxTab ? "taxes" : def!.id}
                            onClick={() => {
                                setActiveTab(i);
                                setShowAddSegmentValue(false);
                                setSegmentEditingId(null);
                                setShowAddSubtype(false);
                                setSubtypeEditingId(null);
                                setShowAddType(false);
                                setTypeEditingId(null);
                                setShowAddPaymentMethodType(false);
                                setPaymentMethodTypeEditingId(null);
                                setTaxEditor(null);
                            }}
                            className={cn(
                                "flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold border transition-all",
                                activeTab === i ? color : "text-gray-500 bg-gray-100 border-gray-200 hover:bg-gray-100 hover:text-gray-900"
                            )}
                        >
                            <Icon className="h-4 w-4" />
                            {isSubtypeTab ? t("master.tab.accountSubtypes") : isTypeTab ? t("master.tab.journalEntryTypes") : isPaymentMethodTypeTab ? t("master.tab.paymentMethodTypes") : isTaxTab ? t("master.tab.taxes") : def!.name}
                            <span className={cn(
                                "ml-1 rounded-full px-2 py-0.5 text-[10px] font-black",
                                activeTab === i ? "bg-gray-100" : "bg-gray-100"
                            )}>
                                {isSubtypeTab
                                    ? accountSubtypes.filter((s) => s.isActive).length
                                    : isTypeTab
                                        ? journalEntryTypes.filter((t) => t.isActive).length
                                        : isPaymentMethodTypeTab
                                            ? paymentMethodTypes.filter((t) => t.isActive).length
                                            : isTaxTab
                                                ? taxes.filter((tax) => tax.isActive).length
                                                : def!.values.filter(v => v.isActive).length}
                            </span>
                        </button>
                    );
                })}
            </div>

            {activeDef && (
                <Card className="p-0 border border-gray-200 bg-panel/40  overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">
                        <div>
                            <h2 className="text-base font-bold text-gray-900">{activeDef.name}</h2>
                            <p className="text-xs text-gray-500 mt-0.5">
                                {activeDef.description || t("master.segmentValues.manage", { name: activeDef.name })}
                            </p>
                        </div>
                        <Button onClick={() => setShowAddSegmentValue(true)} disabled={showAddSegmentValue}>
                            <Plus className="h-4 w-4 mr-2" /> {t("master.segmentValues.add", { name: activeDef.name })}
                        </Button>
                    </div>

                    {/* Add Row */}
                    {showAddSegmentValue && (
                        <div className="border-b border-gray-200 px-6 py-4 bg-teal-500/5">
                            <div className="flex items-center gap-3">
                                <input
                                    value={newCode}
                                    onChange={e => setNewCode(e.target.value.toUpperCase())}
                                    placeholder={t("master.segmentValues.codePlaceholder")}
                                    className="w-32 rounded-lg border border-teal-500/30 bg-gray-100 px-3 py-2 text-sm font-mono text-gray-900 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                                />
                                <input
                                    value={newName}
                                    onChange={e => setNewName(e.target.value)}
                                    placeholder={t("master.segmentValues.namePlaceholder")}
                                    className="flex-1 rounded-lg border border-teal-500/30 bg-gray-100 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                                />
                                <button
                                    onClick={() => createMutation.mutate({ defId: activeDef.id, code: newCode, name: newName })}
                                    disabled={!newCode || !newName || createMutation.isPending}
                                    className="flex items-center gap-1.5 rounded-lg bg-teal-500 px-4 py-2 text-sm font-bold text-teal-950 hover:bg-teal-400 disabled:opacity-50 transition-all"
                                >
                                    <Check className="h-4 w-4" /> {t("common.action.save")}
                                </button>
                                <button onClick={() => setShowAddSegmentValue(false)} className="p-2 text-gray-500 hover:text-gray-900">
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Table */}
                    <table className="w-full text-left">
                        <thead className="border-b border-gray-200 bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-600">{t("common.table.code")}</th>
                                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-600">{t("common.table.name")}</th>
                                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-600 text-center">{t("common.table.status")}</th>
                                <th className="px-6 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-gray-600">{t("common.table.actions")}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {activeDef.values.length === 0 ? (
                                <tr><td colSpan={4} className="px-6 py-12 text-center text-sm text-gray-600">{t("master.segmentValues.empty")}</td></tr>
                            ) : activeDef.values.map((val: SegmentValue) => (
                                <tr key={val.id} className="group hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        {segmentEditingId === val.id
                                            ? <input value={editCode} onChange={e => setEditCode(e.target.value.toUpperCase())} className="w-24 rounded-lg border border-teal-500/30 bg-gray-100 px-2 py-1 font-mono text-sm text-gray-900 focus:outline-none" />
                                            : <span className="font-mono text-xs font-bold text-teal-400">{val.code}</span>
                                        }
                                    </td>
                                    <td className="px-6 py-4">
                                        {segmentEditingId === val.id
                                            ? <input value={editName} onChange={e => setEditName(e.target.value)} className="rounded-lg border border-teal-500/30 bg-gray-100 px-2 py-1 text-sm text-gray-900 focus:outline-none w-64" />
                                            : <span className="text-sm font-medium text-zinc-200">{val.name}</span>
                                        }
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <StatusPill label={val.isActive ? t("common.status.active") : t("common.status.inactive")} tone={val.isActive ? "positive" : "neutral"} />
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {segmentEditingId === val.id ? (
                                                <>
                                                    <button onClick={() => updateMutation.mutate({ id: val.id, code: editCode, name: editName })} className="p-1.5 rounded-lg text-teal-400 hover:bg-teal-400/10">
                                                        <Check className="h-4 w-4" />
                                                    </button>
                                                    <button onClick={() => setSegmentEditingId(null)} className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900">
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button onClick={() => { setSegmentEditingId(val.id); setEditCode(val.code); setEditName(val.name); }} className="p-1.5 rounded-lg text-gray-500 hover:text-teal-400 hover:bg-teal-400/10 transition-all">
                                                        <Pencil className="h-4 w-4" />
                                                    </button>
                                                    {val.isActive && (
                                                        <button onClick={() => { if (confirm(t("common.confirm.deactivate", { name: val.name }))) deactivateMutation.mutate(val.id); }} className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition-all">
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

            {active?.kind === "account-subtypes" && (
                <Card className="p-0 border border-gray-200 bg-panel/40 overflow-hidden">
                    <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">
                        <div>
                            <h2 className="text-base font-bold text-gray-900">{t("master.section.accountSubtypes.title")}</h2>
                            <p className="text-xs text-gray-500 mt-0.5">
                                {t("master.section.accountSubtypes.description")}
                            </p>
                        </div>
                        <Button onClick={() => setShowAddSubtype(true)} disabled={showAddSubtype}>
                            <Plus className="h-4 w-4 mr-2" /> {t("master.section.accountSubtypes.add")}
                        </Button>
                    </div>

                    {showAddSubtype && (
                        <div className="border-b border-gray-200 px-6 py-4 bg-emerald-500/5">
                            <div className="flex items-center gap-3">
                                <input
                                    value={newSubtypeName}
                                    onChange={(e) => setNewSubtypeName(e.target.value)}
                                    placeholder={t("master.accountSubtypes.namePlaceholder")}
                                    className="flex-1 rounded-lg border border-emerald-500/30 bg-gray-100 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                                />
                                <button
                                    onClick={() => createSubtypeMutation.mutate(newSubtypeName)}
                                    disabled={!newSubtypeName.trim() || createSubtypeMutation.isPending}
                                    className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-bold text-emerald-950 hover:bg-emerald-400 disabled:opacity-50 transition-all"
                                >
                                    <Check className="h-4 w-4" /> {t("common.action.save")}
                                </button>
                                <button onClick={() => setShowAddSubtype(false)} className="p-2 text-gray-500 hover:text-gray-900">
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                            {createSubtypeMutation.isError && (
                                <div className="mt-2 text-xs text-red-400">
                                    {(createSubtypeMutation.error as Error).message || t("master.accountSubtypes.createError")}
                                </div>
                            )}
                        </div>
                    )}

                    <table className="w-full text-left">
                        <thead className="border-b border-gray-200 bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-600">{t("common.table.name")}</th>
                                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-600 text-center">{t("common.table.status")}</th>
                                <th className="px-6 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-gray-600">{t("common.table.actions")}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {accountSubtypes.length === 0 ? (
                                <tr><td colSpan={3} className="px-6 py-12 text-center text-sm text-gray-600">{t("master.accountSubtypes.empty")}</td></tr>
                            ) : accountSubtypes.map((row: AccountSubtype) => (
                                <tr key={row.id} className="group hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        {subtypeEditingId === row.id ? (
                                            <input
                                                value={editSubtypeName}
                                                onChange={(e) => setEditSubtypeName(e.target.value)}
                                                className="rounded-lg border border-emerald-500/30 bg-gray-100 px-2 py-1 text-sm text-gray-900 focus:outline-none w-64"
                                            />
                                        ) : (
                                            <span className="text-sm font-medium text-zinc-200">{row.name}</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <StatusPill label={row.isActive ? t("common.status.active") : t("common.status.inactive")} tone={row.isActive ? "positive" : "neutral"} />
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {subtypeEditingId === row.id ? (
                                                <>
                                                    <button
                                                        onClick={() => updateSubtypeMutation.mutate({ id: row.id, name: editSubtypeName })}
                                                        className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-400/10"
                                                    >
                                                        <Check className="h-4 w-4" />
                                                    </button>
                                                    <button onClick={() => setSubtypeEditingId(null)} className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900">
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => { setSubtypeEditingId(row.id); setEditSubtypeName(row.name); }}
                                                        className="p-1.5 rounded-lg text-gray-500 hover:text-emerald-400 hover:bg-emerald-400/10 transition-all"
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </button>
                                                    {row.isActive && (
                                                        <button
                                                            onClick={() => { if (confirm(t("common.confirm.deactivate", { name: row.name }))) deactivateSubtypeMutation.mutate(row.id); }}
                                                            className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition-all"
                                                        >
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

            {active?.kind === "journal-entry-types" && (
                <Card className="p-0 border border-gray-200 bg-panel/40 overflow-hidden">
                    <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">
                        <div>
                            <h2 className="text-base font-bold text-gray-900">{t("master.section.journalEntryTypes.title")}</h2>
                            <p className="text-xs text-gray-500 mt-0.5">
                                {t("master.section.journalEntryTypes.description")}
                            </p>
                        </div>
                        <Button onClick={() => setShowAddType(true)} disabled={showAddType}>
                            <Plus className="h-4 w-4 mr-2" /> {t("master.section.journalEntryTypes.add")}
                        </Button>
                    </div>

                    {showAddType && (
                        <div className="border-b border-gray-200 px-6 py-4 bg-indigo-500/5">
                            <div className="flex items-center gap-3">
                                <input
                                    value={newTypeName}
                                    onChange={(e) => setNewTypeName(e.target.value)}
                                    placeholder={t("master.journalEntryTypes.namePlaceholder")}
                                    className="flex-1 rounded-lg border border-indigo-500/30 bg-gray-100 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                                />
                                <button
                                    onClick={() => createTypeMutation.mutate(newTypeName)}
                                    disabled={!newTypeName.trim() || createTypeMutation.isPending}
                                    className="flex items-center gap-1.5 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-bold text-indigo-950 hover:bg-indigo-400 disabled:opacity-50 transition-all"
                                >
                                    <Check className="h-4 w-4" /> {t("common.action.save")}
                                </button>
                                <button onClick={() => setShowAddType(false)} className="p-2 text-gray-500 hover:text-gray-900">
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                            {createTypeMutation.isError && (
                                <div className="mt-2 text-xs text-red-400">
                                    {(createTypeMutation.error as Error).message || t("master.journalEntryTypes.createError")}
                                </div>
                            )}
                        </div>
                    )}

                    <table className="w-full text-left">
                        <thead className="border-b border-gray-200 bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-600">{t("common.table.name")}</th>
                                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-600 text-center">{t("common.table.status")}</th>
                                <th className="px-6 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-gray-600">{t("common.table.actions")}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {journalEntryTypes.length === 0 ? (
                                <tr><td colSpan={3} className="px-6 py-12 text-center text-sm text-gray-600">{t("master.journalEntryTypes.empty")}</td></tr>
                            ) : journalEntryTypes.map((row: JournalEntryType) => (
                                <tr key={row.id} className="group hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        {typeEditingId === row.id ? (
                                            <input
                                                value={editTypeName}
                                                onChange={(e) => setEditTypeName(e.target.value)}
                                                className="rounded-lg border border-indigo-500/30 bg-gray-100 px-2 py-1 text-sm text-gray-900 focus:outline-none w-64"
                                            />
                                        ) : (
                                            <span className="text-sm font-medium text-zinc-200">{row.name}</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <StatusPill label={row.isActive ? t("common.status.active") : t("common.status.inactive")} tone={row.isActive ? "positive" : "neutral"} />
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {typeEditingId === row.id ? (
                                                <>
                                                    <button
                                                        onClick={() => updateTypeMutation.mutate({ id: row.id, name: editTypeName })}
                                                        className="p-1.5 rounded-lg text-indigo-400 hover:bg-indigo-400/10"
                                                    >
                                                        <Check className="h-4 w-4" />
                                                    </button>
                                                    <button onClick={() => setTypeEditingId(null)} className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900">
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => { setTypeEditingId(row.id); setEditTypeName(row.name); }}
                                                        className="p-1.5 rounded-lg text-gray-500 hover:text-indigo-400 hover:bg-indigo-400/10 transition-all"
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </button>
                                                    {row.isActive && (
                                                        <button
                                                            onClick={() => { if (confirm(t("common.confirm.deactivate", { name: row.name }))) deactivateTypeMutation.mutate(row.id); }}
                                                            className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition-all"
                                                        >
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

            {active?.kind === "payment-method-types" && (
                <Card className="p-0 border border-gray-200 bg-panel/40 overflow-hidden">
                    <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">
                        <div>
                            <h2 className="text-base font-bold text-gray-900">{t("master.section.paymentMethodTypes.title")}</h2>
                            <p className="text-xs text-gray-500 mt-0.5">
                                {t("master.section.paymentMethodTypes.description")}
                            </p>
                        </div>
                        <Button onClick={() => setShowAddPaymentMethodType(true)} disabled={showAddPaymentMethodType}>
                            <Plus className="h-4 w-4 mr-2" /> {t("master.section.paymentMethodTypes.add")}
                        </Button>
                    </div>

                    {showAddPaymentMethodType && (
                        <div className="border-b border-gray-200 px-6 py-4 bg-cyan-500/5">
                            <div className="flex items-center gap-3">
                                <input
                                    value={newPaymentMethodTypeName}
                                    onChange={(e) => setNewPaymentMethodTypeName(e.target.value)}
                                    placeholder={t("master.paymentMethodTypes.namePlaceholder")}
                                    className="flex-1 rounded-lg border border-cyan-500/30 bg-gray-100 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                                />
                                <button
                                    onClick={() => createPaymentMethodTypeMutation.mutate(newPaymentMethodTypeName)}
                                    disabled={!newPaymentMethodTypeName.trim() || createPaymentMethodTypeMutation.isPending}
                                    className="flex items-center gap-1.5 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-bold text-cyan-950 hover:bg-cyan-400 disabled:opacity-50 transition-all"
                                >
                                    <Check className="h-4 w-4" /> {t("common.action.save")}
                                </button>
                                <button onClick={() => setShowAddPaymentMethodType(false)} className="p-2 text-gray-500 hover:text-gray-900">
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                            {createPaymentMethodTypeMutation.isError && (
                                <div className="mt-2 text-xs text-red-400">
                                    {(createPaymentMethodTypeMutation.error as Error).message || t("master.paymentMethodTypes.createError")}
                                </div>
                            )}
                        </div>
                    )}

                    <table className="w-full text-left">
                        <thead className="border-b border-gray-200 bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-600">{t("common.table.name")}</th>
                                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-600 text-center">{t("common.table.status")}</th>
                                <th className="px-6 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-gray-600">{t("common.table.actions")}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {paymentMethodTypes.length === 0 ? (
                                <tr><td colSpan={3} className="px-6 py-12 text-center text-sm text-gray-600">{t("master.paymentMethodTypes.empty")}</td></tr>
                            ) : paymentMethodTypes.map((row: PaymentMethodType) => (
                                <tr key={row.id} className="group hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        {paymentMethodTypeEditingId === row.id ? (
                                            <input
                                                value={editPaymentMethodTypeName}
                                                onChange={(e) => setEditPaymentMethodTypeName(e.target.value)}
                                                className="rounded-lg border border-cyan-500/30 bg-gray-100 px-2 py-1 text-sm text-gray-900 focus:outline-none w-64"
                                            />
                                        ) : (
                                            <span className="text-sm font-medium text-zinc-200">{row.name}</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <StatusPill label={row.isActive ? t("common.status.active") : t("common.status.inactive")} tone={row.isActive ? "positive" : "neutral"} />
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {paymentMethodTypeEditingId === row.id ? (
                                                <>
                                                    <button
                                                        onClick={() => updatePaymentMethodTypeMutation.mutate({ id: row.id, name: editPaymentMethodTypeName })}
                                                        className="p-1.5 rounded-lg text-cyan-400 hover:bg-cyan-400/10"
                                                    >
                                                        <Check className="h-4 w-4" />
                                                    </button>
                                                    <button onClick={() => setPaymentMethodTypeEditingId(null)} className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900">
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => { setPaymentMethodTypeEditingId(row.id); setEditPaymentMethodTypeName(row.name); }}
                                                        className="p-1.5 rounded-lg text-gray-500 hover:text-cyan-400 hover:bg-cyan-400/10 transition-all"
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </button>
                                                    {row.isActive && (
                                                        <button
                                                            onClick={() => { if (confirm(t("common.confirm.deactivate", { name: row.name }))) deactivatePaymentMethodTypeMutation.mutate(row.id); }}
                                                            className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition-all"
                                                        >
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

            {active?.kind === "taxes" && (
                <Card className="p-0 border border-gray-200 bg-panel/40 overflow-hidden">
                    <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">
                        <div>
                            <h2 className="text-base font-bold text-gray-900">{t("master.section.taxes.title")}</h2>
                            <p className="text-xs text-gray-500 mt-0.5">{t("master.section.taxes.description")}</p>
                        </div>
                        <Button onClick={() => openTaxEditor()}>
                            <Plus className="h-4 w-4 mr-2" /> {t("master.section.taxes.add")}
                        </Button>
                    </div>

                    {isTaxesError && (
                        <div className="border-b border-red-200 bg-red-50 px-6 py-3 text-sm text-red-700">
                            {(taxesError as Error)?.message || t("master.taxes.error")}
                        </div>
                    )}

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="border-b border-gray-200 bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-600">{t("master.taxes.taxCode")}</th>
                                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-600">{t("master.taxes.taxName")}</th>
                                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-600">{t("master.taxes.rate")}</th>
                                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-600">{t("master.taxes.taxType")}</th>
                                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-600">{t("master.taxes.taxAccount")}</th>
                                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-600 text-center">{t("common.table.status")}</th>
                                    <th className="px-6 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-gray-600">{t("common.table.actions")}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {taxes.length === 0 ? (
                                    <tr><td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-600">{t("master.taxes.empty")}</td></tr>
                                ) : taxes.map((tax) => (
                                    <tr key={tax.id} className="group hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4"><span className="font-mono text-xs font-bold text-green-600">{tax.taxCode}</span></td>
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{tax.taxName}</td>
                                        <td className="px-6 py-4 text-sm text-gray-700">{Number(tax.rate).toFixed(2)}%</td>
                                        <td className="px-6 py-4 text-sm text-gray-700">{t(`master.taxes.type.${tax.taxType}`)}</td>
                                        <td className="px-6 py-4 text-sm text-gray-700">{accountLabel(tax.taxAccount)}</td>
                                        <td className="px-6 py-4 text-center">
                                            <StatusPill label={tax.isActive ? t("common.status.active") : t("common.status.inactive")} tone={tax.isActive ? "positive" : "neutral"} />
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => openTaxEditor(tax)}
                                                    className="p-1.5 rounded-lg text-gray-500 hover:text-green-600 hover:bg-green-400/10 transition-all"
                                                    title={t("common.action.edit")}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        if (confirm(t("common.confirm.delete", { name: tax.taxName }))) deleteTaxMutation.mutate(tax.id);
                                                    }}
                                                    className="p-1.5 rounded-lg text-gray-500 hover:text-red-500 hover:bg-red-400/10 transition-all"
                                                    title={t("common.action.delete")}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {deleteTaxMutation.isError && (
                        <div className="border-t border-red-200 bg-red-50 px-6 py-3 text-sm text-red-700">
                            {(deleteTaxMutation.error as Error).message || t("master.taxes.deleteError")}
                        </div>
                    )}
                </Card>
            )}

            {taxEditor && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
                    <div className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                            <h3 className="text-base font-bold text-gray-900">
                                {taxEditor.id ? t("master.taxes.modal.editTitle") : t("master.taxes.modal.createTitle")}
                            </h3>
                            <button onClick={() => setTaxEditor(null)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="grid gap-4 px-6 py-5 sm:grid-cols-2">
                            <Field label={t("master.taxes.taxCode")}>
                                <input
                                    value={taxEditor.taxCode}
                                    onChange={(event) => setTaxEditor((current) => current && ({ ...current, taxCode: event.target.value.toUpperCase() }))}
                                    placeholder={t("master.taxes.codePlaceholder")}
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500/40"
                                />
                            </Field>
                            <Field label={t("master.taxes.taxName")}>
                                <input
                                    value={taxEditor.taxName}
                                    onChange={(event) => setTaxEditor((current) => current && ({ ...current, taxName: event.target.value }))}
                                    placeholder={t("master.taxes.namePlaceholder")}
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500/40"
                                />
                            </Field>
                            <Field label={t("master.taxes.rate")}>
                                <input
                                    type="number"
                                    min={0}
                                    max={100}
                                    value={taxEditor.rate}
                                    onChange={(event) => setTaxEditor((current) => current && ({ ...current, rate: event.target.value }))}
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500/40"
                                />
                            </Field>
                            <Field label={t("master.taxes.taxType")}>
                                <select
                                    value={taxEditor.taxType}
                                    onChange={(event) => setTaxEditor((current) => current && ({ ...current, taxType: event.target.value as TaxType, taxAccountId: ["ZERO_RATED", "EXEMPT", "OUT_OF_SCOPE"].includes(event.target.value) ? "" : current.taxAccountId }))}
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500/40"
                                >
                                    {TAX_TYPES.map((type) => <option key={type} value={type}>{t(`master.taxes.type.${type}`)}</option>)}
                                </select>
                            </Field>
                            <Field label={t("master.taxes.taxAccount")}>
                                <select
                                    value={taxEditor.taxAccountId}
                                    onChange={(event) => setTaxEditor((current) => current && ({ ...current, taxAccountId: event.target.value }))}
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500/40"
                                >
                                    <option value="">{t("master.taxes.accountPlaceholder")}</option>
                                    {taxAccounts.map((account) => <option key={account.id} value={account.id}>{accountLabel(account)}</option>)}
                                </select>
                            </Field>
                            <Field label={t("common.table.status")}>
                                <select
                                    value={taxEditor.isActive ? "true" : "false"}
                                    onChange={(event) => setTaxEditor((current) => current && ({ ...current, isActive: event.target.value === "true" }))}
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500/40"
                                >
                                    <option value="true">{t("master.taxes.active")}</option>
                                    <option value="false">{t("master.taxes.inactive")}</option>
                                </select>
                            </Field>
                        </div>
                        {saveTaxMutation.isError && (
                            <div className="mx-6 mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                                {(saveTaxMutation.error as Error).message || t("master.taxes.saveError")}
                            </div>
                        )}
                        <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
                            <Button variant="secondary" onClick={() => setTaxEditor(null)}>{t("common.action.cancel")}</Button>
                            <Button onClick={() => saveTaxMutation.mutate(taxEditor)} disabled={!canSaveTax || saveTaxMutation.isPending}>
                                <Check className="h-4 w-4 mr-2" /> {t("common.action.save")}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
    return (
        <label className="space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wide text-gray-500">{label}</span>
            {children}
        </label>
    );
}
