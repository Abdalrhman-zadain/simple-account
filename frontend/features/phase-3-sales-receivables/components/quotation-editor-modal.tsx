"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  LuCalendarDays as CalendarDays,
  LuCirclePlus as CirclePlus,
  LuFileCheck2 as FileCheck2,
  LuFileText as FileText,
  LuPackage2 as Package2,
  LuSave as Save,
  LuTrash2 as Trash2,
  LuUserRound as UserRound,
  LuX as X,
} from "react-icons/lu";

import { Button } from "@/components/ui";
import { Field, Input, Select, Textarea } from "@/components/ui/forms";
import { getActiveTaxes } from "@/lib/api";
import { useTranslation } from "@/lib/i18n";
import { cn, formatCurrency } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import type { Customer, InventoryItem } from "@/types/api";

export type SalesLineEditorState = {
  key: string;
  itemId: string;
  itemName: string;
  description: string;
  quantity: string;
  unitPrice: string;
  discountAmount: string;
  taxId: string;
  taxRate: string;
  taxAmount: string;
  lineAmount: string;
  revenueAccountId: string;
};

export type QuotationEditorState = {
  id?: string;
  reference: string;
  quotationDate: string;
  validityDate: string;
  currencyCode: string;
  customerId: string;
  description: string;
  lines: SalesLineEditorState[];
};

type RevenueAccountOption = { id: string; code: string; name: string };

type QuotationEditorModalProps = {
  isOpen: boolean;
  title: string;
  editor: QuotationEditorState;
  validationError?: string | null;
  customers: Customer[];
  inventoryItems: InventoryItem[];
  isInventoryItemsLoading: boolean;
  revenueAccounts: RevenueAccountOption[];
  isSavingDraft: boolean;
  isApproving: boolean;
  onClose: () => void;
  onChange: (editor: QuotationEditorState) => void;
  onSaveDraft: () => void;
  onApprove: () => void;
};

export function createEmptyLine(): SalesLineEditorState {
  return withCalculatedLineAmount({
    key: Math.random().toString(36).slice(2, 10),
    itemId: "",
    itemName: "",
    description: "",
    quantity: "1",
    unitPrice: "",
    discountAmount: "",
    taxId: "",
    taxRate: "",
    taxAmount: "",
    lineAmount: "",
    revenueAccountId: "",
  });
}

export function createEmptyQuotationEditor(): QuotationEditorState {
  return {
    reference: "",
    quotationDate: new Date().toISOString().slice(0, 10),
    validityDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    currencyCode: "JOD",
    customerId: "",
    description: "",
    lines: [createEmptyLine()],
  };
}

export function withCalculatedLineAmount(line: SalesLineEditorState): SalesLineEditorState {
  const quantity = toFiniteNumber(line.quantity);
  const unitPrice = toFiniteNumber(line.unitPrice);
  const discountAmount = toFiniteNumber(line.discountAmount) ?? 0;
  const taxRate = toFiniteNumber(line.taxRate);
  const computedTaxAmount =
    quantity !== null && unitPrice !== null && taxRate !== null
      ? Math.max(quantity * unitPrice - discountAmount, 0) * taxRate / 100
      : null;
  return {
    ...line,
    taxAmount: computedTaxAmount !== null ? computedTaxAmount.toFixed(2) : line.taxAmount,
    lineAmount: calculateLineAmount(line),
  };
}

export function calculateLineAmount(
  line: Pick<SalesLineEditorState, "quantity" | "unitPrice" | "discountAmount" | "taxAmount" | "taxRate">,
) {
  const quantity = toFiniteNumber(line.quantity);
  const unitPrice = toFiniteNumber(line.unitPrice);
  const discountAmount = toFiniteNumber(line.discountAmount) ?? 0;

  if (quantity === null || unitPrice === null) {
    return "";
  }

  const discountedAmount = quantity * unitPrice - discountAmount;
  const taxRate = toFiniteNumber(line.taxRate);
  const taxAmount = taxRate !== null ? discountedAmount * taxRate / 100 : toFiniteNumber(line.taxAmount) ?? 0;

  return (discountedAmount + taxAmount).toFixed(2);
}

export function calculateQuotationTotals(lines: SalesLineEditorState[]) {
  return lines.reduce(
    (totals, line) => {
      const quantity = toFiniteNumber(line.quantity) ?? 0;
      const unitPrice = toFiniteNumber(line.unitPrice) ?? 0;
      const discountAmount = toFiniteNumber(line.discountAmount) ?? 0;
      const subtotal = quantity * unitPrice - discountAmount;
      const taxRate = toFiniteNumber(line.taxRate);
      const taxAmount = taxRate !== null ? subtotal * taxRate / 100 : toFiniteNumber(line.taxAmount) ?? 0;
      const lineAmount = toFiniteNumber(line.lineAmount) ?? subtotal + taxAmount;

      return {
        subtotalAmount: totals.subtotalAmount + Math.max(subtotal, 0),
        taxAmount: totals.taxAmount + taxAmount,
        totalAmount: totals.totalAmount + Math.max(lineAmount, 0),
      };
    },
    { subtotalAmount: 0, taxAmount: 0, totalAmount: 0 },
  );
}

function toFiniteNumber(value: string) {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function QuotationEditorModal({
  isOpen,
  title,
  editor,
  validationError,
  customers,
  inventoryItems,
  isInventoryItemsLoading,
  revenueAccounts,
  isSavingDraft,
  isApproving,
  onClose,
  onChange,
  onSaveDraft,
  onApprove,
}: QuotationEditorModalProps) {
  const { t, language } = useTranslation();
  const { token } = useAuth();
  const { data: taxes = [] } = useQuery({ queryKey: ["taxes", "active", token], queryFn: () => getActiveTaxes(token) });
  const isArabic = language === "ar";

  const totals = useMemo(() => calculateQuotationTotals(editor.lines), [editor.lines]);

  const updateEditor = (updater: (current: QuotationEditorState) => QuotationEditorState) => {
    onChange(updater(editor));
  };

  const updateLine = (
    lineKey: string,
    updater: (line: SalesLineEditorState) => SalesLineEditorState,
  ) => {
    updateEditor((current) => ({
      ...current,
      lines: current.lines.map((line) =>
        line.key === lineKey ? withCalculatedLineAmount(updater(line)) : line,
      ),
    }));
  };

  const removeLine = (lineKey: string) => {
    if (editor.lines.length === 1) {
      return;
    }

    updateEditor((current) => ({
      ...current,
      lines: current.lines.filter((line) => line.key !== lineKey),
    }));
  };

  const addLine = () => {
    updateEditor((current) => ({
      ...current,
      lines: [...current.lines, createEmptyLine()],
    }));
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 p-3 sm:p-6">
      <div className="absolute inset-0 bg-slate-950/35 backdrop-blur-sm" onClick={onClose} />
      <div
        dir={isArabic ? "rtl" : "ltr"}
        className={cn(
          "relative mx-auto flex h-full max-w-[1480px] flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-[#fcfcfb] shadow-[0_30px_80px_rgba(15,23,42,0.18)]",
          isArabic && "arabic-ui",
        )}
      >
        <div className="flex items-center justify-between border-b border-slate-200 bg-white/90 px-5 py-5 backdrop-blur sm:px-8">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
          >
            <span className="sr-only">{t("salesReceivables.action.cancel")}</span>
            <X className="h-6 w-6" />
          </button>
          <div className={cn("flex items-center gap-3", isArabic ? "flex-row-reverse text-right" : "text-left")}>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <FileCheck2 className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <div className={cn("text-3xl text-slate-900", isArabic ? "arabic-ui-heading" : "font-black tracking-tight")}>
                {title}
              </div>
              {editor.reference ? <div className="text-sm text-slate-500">{editor.reference}</div> : null}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.06),_transparent_30%),linear-gradient(180deg,_#fcfcfb_0%,_#f7f8f7_100%)] px-4 py-4 sm:px-8 sm:py-6">
          <div className="space-y-5">
            {validationError ? (
              <div className="rounded-[1.5rem] border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700 shadow-[0_10px_24px_rgba(239,68,68,0.08)]">
                {validationError}
              </div>
            ) : null}

            <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.05)] sm:p-6">
              <div className={cn("mb-5 flex items-center gap-3", isArabic ? "flex-row-reverse text-right" : "text-left")}>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <div className={cn("text-lg text-slate-900", isArabic ? "arabic-ui-heading" : "font-extrabold")}>
                    {t("salesReceivables.dialog.newQuotation")}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-[1fr_1fr_1.4fr_1fr]">
                <Field label={t("salesReceivables.field.quotationDate")} required labelClassName={isArabic ? "arabic-ui" : undefined}>
                  <div className="relative">
                    <Input
                      type="date"
                      value={editor.quotationDate}
                      onChange={(event) =>
                        updateEditor((current) => ({ ...current, quotationDate: event.target.value }))
                      }
                      className={cn("border-slate-200 bg-slate-50/70", isArabic ? "arabic-ui pe-12 text-right" : "ps-12")}
                    />
                    <CalendarDays
                      className={cn(
                        "pointer-events-none absolute top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400",
                        isArabic ? "left-4" : "right-4",
                      )}
                    />
                  </div>
                </Field>

                <Field label={t("salesReceivables.field.validUntil")} required labelClassName={isArabic ? "arabic-ui" : undefined}>
                  <div className="relative">
                    <Input
                      type="date"
                      value={editor.validityDate}
                      onChange={(event) =>
                        updateEditor((current) => ({ ...current, validityDate: event.target.value }))
                      }
                      className={cn("border-slate-200 bg-slate-50/70", isArabic ? "arabic-ui pe-12 text-right" : "ps-12")}
                    />
                    <CalendarDays
                      className={cn(
                        "pointer-events-none absolute top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400",
                        isArabic ? "left-4" : "right-4",
                      )}
                    />
                  </div>
                </Field>

                <Field label={t("salesReceivables.field.customer")} required labelClassName={isArabic ? "arabic-ui" : undefined}>
                  <div className="relative">
                    <Select
                      value={editor.customerId}
                      onChange={(event) =>
                        updateEditor((current) => ({ ...current, customerId: event.target.value }))
                      }
                      className={cn("border-slate-200 bg-slate-50/70", isArabic ? "arabic-ui pe-12 text-right" : "ps-12")}
                    >
                      <option value="">{t("salesReceivables.empty.selectActiveCustomer")}</option>
                      {customers.map((row) => (
                        <option key={row.id} value={row.id}>
                          {row.code} · {row.name}
                        </option>
                      ))}
                    </Select>
                    <UserRound
                      className={cn(
                        "pointer-events-none absolute top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400",
                        isArabic ? "left-4" : "right-4",
                      )}
                    />
                  </div>
                </Field>

                <Field label={t("salesReceivables.field.currency")} required labelClassName={isArabic ? "arabic-ui" : undefined}>
                  <Input
                    value={editor.currencyCode}
                    onChange={(event) =>
                      updateEditor((current) => ({
                        ...current,
                        currencyCode: event.target.value.toUpperCase(),
                      }))
                    }
                    maxLength={3}
                    className={cn("border-slate-200 bg-slate-50/70 uppercase", isArabic && "arabic-ui text-right")}
                  />
                </Field>
              </div>

              <div className="mt-4">
                <Field label={t("salesReceivables.field.description")} labelClassName={isArabic ? "arabic-ui" : undefined}>
                  <Textarea
                    rows={3}
                    value={editor.description}
                    onChange={(event) =>
                      updateEditor((current) => ({ ...current, description: event.target.value }))
                    }
                    placeholder={t("salesReceivables.field.description")}
                    className={cn("border-slate-200 bg-slate-50/70", isArabic && "arabic-ui text-right")}
                  />
                </Field>
              </div>
            </section>

            <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.05)] sm:p-6">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className={cn("flex items-center gap-3", isArabic ? "flex-row-reverse text-right" : "text-left")}>
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                    <Package2 className="h-5 w-5" />
                  </div>
                  <div>
                    <div className={cn("text-lg text-slate-900", isArabic ? "arabic-ui-heading" : "font-extrabold")}>
                      {t("salesReceivables.section.documentLines")}
                    </div>
                    <div className="text-sm text-slate-500">{t("salesReceivables.section.documentLinesDescription")}</div>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={addLine}
                  className="rounded-2xl border-emerald-200 px-4 text-emerald-700 hover:bg-emerald-50"
                >
                  <CirclePlus className="h-4 w-4" />
                  {t("salesReceivables.action.addLine")}
                </Button>
              </div>

              <div className="space-y-4">
                {editor.lines.map((line, index) => (
                  <div key={line.key} className="rounded-[1.5rem] border border-slate-200 bg-slate-50/45 p-4">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div className={cn("flex items-center gap-3", isArabic ? "flex-row-reverse text-right" : "text-left")}>
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm">
                          <span className="text-sm font-extrabold">{index + 1}</span>
                        </div>
                        <div>
                          <div className={cn("text-sm text-slate-900", isArabic ? "arabic-ui-heading" : "font-extrabold")}>
                            {t("salesReceivables.line.label", { index: index + 1 })}
                          </div>
                          <div className="text-xs text-slate-500">{formatCurrency(Number(line.lineAmount || 0))}</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeLine(line.key)}
                        disabled={editor.lines.length === 1}
                        className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-white px-3 py-2 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300"
                      >
                        <Trash2 className="h-4 w-4" />
                        {t("salesReceivables.action.remove")}
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <div className="min-w-[1320px]">
                        <div className="mb-3 grid grid-cols-[0.55fr_1.8fr_1.7fr_1.6fr_0.85fr_0.95fr_1fr_1fr_1.35fr] gap-3">
                          {[
                            "#",
                            t("salesReceivables.field.itemOrService"),
                            t("salesReceivables.field.itemSnapshot"),
                            t("salesReceivables.field.revenueAccount"),
                            t("salesReceivables.field.quantity"),
                            t("salesReceivables.field.unitPrice"),
                            t("salesReceivables.field.discountAmount"),
                            t("salesReceivables.field.taxAmount"),
                            t("salesReceivables.field.description"),
                          ].map((label, labelIndex) => (
                            <div
                              key={`${line.key}-label-${labelIndex}`}
                              className={cn(
                                "px-1 text-sm font-bold text-slate-900",
                                isArabic ? "arabic-ui text-right" : "text-left",
                              )}
                            >
                              {label}
                              {labelIndex > 0 &&
                              labelIndex !== 2 &&
                              labelIndex !== 3 &&
                              labelIndex !== 6 &&
                              labelIndex !== 7 &&
                              labelIndex !== 8 ? (
                                <span className="ms-1 text-red-500">*</span>
                              ) : null}
                            </div>
                          ))}
                        </div>

                        <div className="grid grid-cols-[0.55fr_1.8fr_1.7fr_1.6fr_0.85fr_0.95fr_1fr_1fr_1.35fr] gap-3">
                          <div className="flex h-full items-center justify-center rounded-2xl bg-white text-base font-extrabold text-slate-900 shadow-sm">
                            {index + 1}
                          </div>

                          <Select
                            value={line.itemId}
                            onChange={(event) => {
                              const item = inventoryItems.find((row) => row.id === event.target.value) ?? null;
                              updateLine(line.key, (current) => ({
                                ...current,
                                itemId: item?.id ?? "",
                                itemName: item?.name ?? current.itemName,
                                description:
                                  current.description.trim() || !item
                                    ? current.description
                                    : item.description ?? item.name,
                                revenueAccountId: item?.salesAccount?.id ?? current.revenueAccountId,
                              }));
                            }}
                            className={cn("border-slate-200 bg-white", isArabic && "arabic-ui text-right")}
                          >
                            <option value="">
                              {isInventoryItemsLoading
                                ? t("salesReceivables.state.loadingItems")
                                : t("salesReceivables.empty.selectItemOrService")}
                            </option>
                            {inventoryItems.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.code} · {item.name}
                              </option>
                            ))}
                          </Select>

                          <Input
                            value={line.itemName}
                            onChange={(event) =>
                              updateLine(line.key, (current) => ({ ...current, itemName: event.target.value }))
                            }
                            placeholder={t("salesReceivables.field.itemSnapshotPlaceholder")}
                            className={cn("border-slate-200 bg-white", isArabic && "arabic-ui text-right")}
                          />

                          <Select
                            value={line.revenueAccountId}
                            onChange={(event) =>
                              updateLine(line.key, (current) => ({
                                ...current,
                                revenueAccountId: event.target.value,
                              }))
                            }
                            className={cn("border-slate-200 bg-white", isArabic && "arabic-ui text-right")}
                          >
                            <option value="">{t("salesReceivables.empty.selectRevenueAccount")}</option>
                            {revenueAccounts.map((account) => (
                              <option key={account.id} value={account.id}>
                                {account.code} · {account.name}
                              </option>
                            ))}
                          </Select>

                          <Input
                            type="number"
                            min="0"
                            step="1"
                            value={line.quantity}
                            onChange={(event) =>
                              updateLine(line.key, (current) => ({ ...current, quantity: event.target.value }))
                            }
                            className={cn("border-slate-200 bg-white", isArabic && "arabic-ui text-right")}
                          />

                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.unitPrice}
                            onChange={(event) =>
                              updateLine(line.key, (current) => ({ ...current, unitPrice: event.target.value }))
                            }
                            className={cn("border-slate-200 bg-white", isArabic && "arabic-ui text-right")}
                          />

                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.discountAmount}
                            onChange={(event) =>
                              updateLine(line.key, (current) => ({ ...current, discountAmount: event.target.value }))
                            }
                            className={cn("border-slate-200 bg-white", isArabic && "arabic-ui text-right")}
                          />

                          <Select
                            value={line.taxId}
                            onChange={(event) => {
                              const selectedTax = taxes.find((tax) => tax.id === event.target.value);
                              updateLine(line.key, (current) => ({
                                ...current,
                                taxId: selectedTax?.id ?? "",
                                taxRate: selectedTax ? String(selectedTax.rate) : "",
                                taxAmount: selectedTax ? current.taxAmount : "",
                              }));
                            }}
                            className={cn("border-slate-200 bg-white", isArabic && "arabic-ui text-right")}
                          >
                            <option value="">{t("salesReceivables.field.taxAmount")}</option>
                            {taxes.map((tax) => (
                              <option key={tax.id} value={tax.id}>{tax.taxName} {Number(tax.rate).toFixed(2)}%</option>
                            ))}
                          </Select>

                          <Input
                            value={line.description}
                            onChange={(event) =>
                              updateLine(line.key, (current) => ({ ...current, description: event.target.value }))
                            }
                            className={cn("border-slate-200 bg-white", isArabic && "arabic-ui text-right")}
                          />
                        </div>

                        <div className="mt-3 grid grid-cols-[1fr_1fr_1.35fr] gap-3">
                          <div />
                          <div />
                          <div>
                            <div className={cn("mb-2 px-1 text-sm font-bold text-slate-900", isArabic ? "arabic-ui text-right" : "text-left")}>
                              {t("salesReceivables.field.lineAmount")}
                            </div>
                            <div className="relative">
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={line.lineAmount}
                                readOnly
                                disabled
                                className={cn("border-slate-200 bg-slate-100 text-emerald-700 disabled:opacity-100", isArabic && "arabic-ui text-right")}
                              />
                              <span
                                className={cn(
                                  "pointer-events-none absolute top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500",
                                  isArabic ? "left-4" : "right-4",
                                )}
                              >
                                {editor.currencyCode || "JOD"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-[1.25fr_1fr_1fr]">
              <div className="rounded-[1.75rem] border border-emerald-200 bg-emerald-50/80 p-5 shadow-[0_10px_24px_rgba(16,185,129,0.08)]">
                <div className="text-sm font-bold text-emerald-700">{t("salesReceivables.metric.total")}</div>
                <div className="mt-2 text-3xl font-black text-emerald-700">
                  {editor.currencyCode || "JOD"} {totals.totalAmount.toFixed(2)}
                </div>
              </div>
              <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5">
                <div className="text-sm font-bold text-slate-500">{t("salesReceivables.metric.subtotal")}</div>
                <div className="mt-2 text-2xl font-black text-slate-900">
                  {editor.currencyCode || "JOD"} {totals.subtotalAmount.toFixed(2)}
                </div>
              </div>
              <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5">
                <div className="text-sm font-bold text-slate-500">{t("salesReceivables.metric.tax")}</div>
                <div className="mt-2 text-2xl font-black text-slate-900">
                  {editor.currencyCode || "JOD"} {totals.taxAmount.toFixed(2)}
                </div>
              </div>
            </section>
          </div>
        </div>

        <div className="border-t border-slate-200 bg-white px-5 py-4 sm:px-8">
          <div className={cn("flex flex-col gap-3 sm:flex-row", isArabic ? "sm:flex-row-reverse" : "")}>
            <Button variant="secondary" onClick={onClose} className="rounded-2xl px-6">
              {t("salesReceivables.action.cancel")}
            </Button>
            <Button
              variant="secondary"
              onClick={onApprove}
              disabled={isSavingDraft || isApproving}
              className="rounded-2xl border-emerald-200 px-6 text-emerald-700 hover:bg-emerald-50"
            >
              <FileCheck2 className="h-4 w-4" />
              {t("salesReceivables.action.approveQuotation")}
            </Button>
            <Button
              onClick={onSaveDraft}
              disabled={isSavingDraft || isApproving}
              className="rounded-2xl bg-emerald-600 px-6 hover:bg-emerald-700"
            >
              <Save className="h-4 w-4" />
              {t("salesReceivables.action.saveDraft")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
