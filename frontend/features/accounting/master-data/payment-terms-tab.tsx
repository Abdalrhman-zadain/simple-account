"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useState } from "react";
import { LuPlus as Plus, LuPencil as Pencil, LuX as X, LuCheck as Check, LuTrash2 as Trash2 } from "react-icons/lu";
import {
    createPaymentTerm,
    getPaymentTerms,
    updatePaymentTerm,
    deletePaymentTerm,
} from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { PaymentTerm, DueDateCalculationMethod, CreatePaymentTermPayload } from "@/types/api";
import { StatusPill, Card, Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

type PaymentTermEditorState = {
    id?: string;
    name: string;
    nameAr: string;
    calculationMethod: DueDateCalculationMethod;
    numberOfDays: string;
    isActive: boolean;
};

const emptyPaymentTermEditor: PaymentTermEditorState = {
    name: "",
    nameAr: "",
    calculationMethod: "DAYS_AFTER",
    numberOfDays: "",
    isActive: true,
};

const CALCULATION_METHODS: DueDateCalculationMethod[] = ["IMMEDIATE", "DAYS_AFTER", "END_OF_MONTH", "MANUAL"];

export function PaymentTermsTab() {
    const { token } = useAuth();
    const queryClient = useQueryClient();
    const { t } = useTranslation();
    const [paymentTermEditor, setPaymentTermEditor] = useState<PaymentTermEditorState | null>(null);

    const { data: paymentTerms = [], isLoading: isLoadingPaymentTerms } = useQuery({
        queryKey: ["payment-terms", token],
        queryFn: () => getPaymentTerms(token),
    });

    const savePaymentTermMutation = useMutation({
        mutationFn: (editor: PaymentTermEditorState) => {
            const payload: CreatePaymentTermPayload = {
                name: editor.name.trim(),
                nameAr: editor.nameAr.trim(),
                calculationMethod: editor.calculationMethod,
                numberOfDays: editor.calculationMethod === "DAYS_AFTER" ? Number(editor.numberOfDays) : undefined,
                isActive: editor.isActive,
            };
            return editor.id 
                ? updatePaymentTerm(editor.id, payload, token) 
                : createPaymentTerm(payload, token);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["payment-terms"] });
            setPaymentTermEditor(null);
        },
    });

    const deletePaymentTermMutation = useMutation({
        mutationFn: (id: string) => deletePaymentTerm(id, token),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["payment-terms"] }),
    });

    const openPaymentTermEditor = (paymentTerm?: PaymentTerm) => {
        setPaymentTermEditor(paymentTerm ? {
            id: paymentTerm.id,
            name: paymentTerm.name,
            nameAr: paymentTerm.nameAr || "",
            calculationMethod: paymentTerm.calculationMethod,
            numberOfDays: paymentTerm.numberOfDays?.toString() || "",
            isActive: paymentTerm.isActive,
        } : emptyPaymentTermEditor);
    };

    const getCalculationMethodLabel = (method: DueDateCalculationMethod): string => {
        const labels: Record<DueDateCalculationMethod, string> = {
            IMMEDIATE: t("master.paymentTerms.method.immediate"),
            DAYS_AFTER: t("master.paymentTerms.method.daysAfter"),
            END_OF_MONTH: t("master.paymentTerms.method.endOfMonth"),
            MANUAL: t("master.paymentTerms.method.manual"),
        };
        return labels[method];
    };

    const canSavePaymentTerm = Boolean(
        paymentTermEditor?.name.trim() &&
        paymentTermEditor?.nameAr.trim() &&
        (paymentTermEditor?.calculationMethod !== "DAYS_AFTER" || (paymentTermEditor?.numberOfDays && Number(paymentTermEditor?.numberOfDays) >= 0))
    );

    if (isLoadingPaymentTerms) return <div className="flex items-center justify-center py-40 text-gray-500">{t("master.loading")}</div>;

    return (
        <div className="space-y-6">
            <Card className="p-0 border border-gray-200 bg-panel/40 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">
                    <div>
                        <h2 className="text-base font-bold text-gray-900">{t("master.paymentTerms.title")}</h2>
                        <p className="text-xs text-gray-500 mt-0.5">{t("master.paymentTerms.description")}</p>
                    </div>
                    <Button onClick={() => openPaymentTermEditor()}>
                        <Plus className="h-4 w-4 mr-2" /> {t("master.paymentTerms.add")}
                    </Button>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-600">{t("master.paymentTerms.name")}</th>
                                <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-600">{t("master.paymentTerms.calculationMethod")}</th>
                                <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-600">{t("master.paymentTerms.numberOfDays")}</th>
                                <th className="px-6 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-gray-600">{t("common.table.status")}</th>
                                <th className="px-6 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-gray-600">{t("common.table.actions")}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {paymentTerms.length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-600">{t("master.paymentTerms.empty")}</td></tr>
                            ) : paymentTerms.map((term) => (
                                <tr key={term.id} className="group hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div>
                                            <div className="text-sm font-medium text-gray-900">{term.name}</div>
                                            <div className="text-xs text-gray-500">{term.nameAr}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-700">{getCalculationMethodLabel(term.calculationMethod)}</td>
                                    <td className="px-6 py-4 text-sm text-gray-700">{term.numberOfDays || "-"}</td>
                                    <td className="px-6 py-4 text-center">
                                        <StatusPill label={term.isActive ? t("common.status.active") : t("common.status.inactive")} tone={term.isActive ? "positive" : "neutral"} />
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => openPaymentTermEditor(term)}
                                                className="p-1.5 rounded-lg text-gray-500 hover:text-green-600 hover:bg-green-400/10 transition-all"
                                                title={t("common.action.edit")}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (confirm(t("common.confirm.delete", { name: term.name }))) {
                                                        deletePaymentTermMutation.mutate(term.id);
                                                    }
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
                {deletePaymentTermMutation.isError && (
                    <div className="border-t border-red-200 bg-red-50 px-6 py-3 text-sm text-red-700">
                        {(deletePaymentTermMutation.error as Error).message || t("master.paymentTerms.deleteError")}
                    </div>
                )}
            </Card>

            {/* Payment Term Editor Modal */}
            {paymentTermEditor && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
                    <div className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                            <h3 className="text-base font-bold text-gray-900">
                                {paymentTermEditor.id ? t("master.paymentTerms.modal.editTitle") : t("master.paymentTerms.modal.createTitle")}
                            </h3>
                            <button onClick={() => setPaymentTermEditor(null)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="grid gap-4 px-6 py-5 sm:grid-cols-2">
                            <Field label={t("master.paymentTerms.nameEnglish")} required>
                                <input
                                    value={paymentTermEditor.name}
                                    onChange={(event) => setPaymentTermEditor((current) => current && ({ ...current, name: event.target.value }))}
                                    placeholder={t("master.paymentTerms.nameEnglishPlaceholder")}
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500/40"
                                />
                            </Field>
                            <Field label={t("master.paymentTerms.nameArabic")} required>
                                <input
                                    value={paymentTermEditor.nameAr}
                                    onChange={(event) => setPaymentTermEditor((current) => current && ({ ...current, nameAr: event.target.value }))}
                                    placeholder={t("master.paymentTerms.nameArabicPlaceholder")}
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500/40"
                                    dir="rtl"
                                />
                            </Field>
                            <Field label={t("master.paymentTerms.calculationMethod")} required>
                                <select
                                    value={paymentTermEditor.calculationMethod}
                                    onChange={(event) => setPaymentTermEditor((current) => current && ({ ...current, calculationMethod: event.target.value as DueDateCalculationMethod, numberOfDays: "" }))}
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500/40"
                                >
                                    {CALCULATION_METHODS.map((method) => (
                                        <option key={method} value={method}>{getCalculationMethodLabel(method)}</option>
                                    ))}
                                </select>
                            </Field>
                            {paymentTermEditor.calculationMethod === "DAYS_AFTER" && (
                                <Field label={t("master.paymentTerms.numberOfDays")} required>
                                    <input
                                        type="number"
                                        min={0}
                                        value={paymentTermEditor.numberOfDays}
                                        onChange={(event) => setPaymentTermEditor((current) => current && ({ ...current, numberOfDays: event.target.value }))}
                                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500/40"
                                    />
                                </Field>
                            )}
                            <Field label={t("common.table.status")}>
                                <select
                                    value={paymentTermEditor.isActive ? "true" : "false"}
                                    onChange={(event) => setPaymentTermEditor((current) => current && ({ ...current, isActive: event.target.value === "true" }))}
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500/40"
                                >
                                    <option value="true">{t("master.paymentTerms.active")}</option>
                                    <option value="false">{t("master.paymentTerms.inactive")}</option>
                                </select>
                            </Field>
                        </div>
                        {savePaymentTermMutation.isError && (
                            <div className="mx-6 mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                                {(savePaymentTermMutation.error as Error).message || t("master.paymentTerms.saveError")}
                            </div>
                        )}
                        <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
                            <Button variant="secondary" onClick={() => setPaymentTermEditor(null)}>{t("common.action.cancel")}</Button>
                            <Button onClick={() => savePaymentTermMutation.mutate(paymentTermEditor)} disabled={!canSavePaymentTerm || savePaymentTermMutation.isPending}>
                                <Check className="h-4 w-4 mr-2" /> {t("common.action.save")}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function Field({ label, children, required }: { label: string; children: ReactNode; required?: boolean }) {
    return (
        <label className="space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
                {label} {required && <span className="text-red-500">*</span>}
            </span>
            {children}
        </label>
    );
}
