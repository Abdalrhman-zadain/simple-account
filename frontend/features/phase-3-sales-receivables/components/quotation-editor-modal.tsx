"use client";

import { useMemo } from "react";
import {
  LuBadgeDollarSign as BadgeDollarSign,
  LuCalendarDays as CalendarDays,
  LuFileCheck2 as FileCheck2,
  LuGripVertical as GripVertical,
  LuSave as Save,
  LuTrash2 as Trash2,
  LuX as X,
} from "react-icons/lu";

import { Button } from "@/components/ui";
import { Field, Input, Select, Textarea } from "@/components/ui/forms";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { Customer, InventoryItem } from "@/types/api";

export type SalesLineEditorState = {
  key: string;
  itemId: string;
  itemName: string;
  description: string;
  quantity: string;
  unitPrice: string;
  discountAmount: string;
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
  return {
    ...line,
    lineAmount: calculateLineAmount(line),
  };
}

export function calculateLineAmount(
  line: Pick<SalesLineEditorState, "quantity" | "unitPrice" | "discountAmount" | "taxAmount">,
) {
  const quantity = toFiniteNumber(line.quantity);
  const unitPrice = toFiniteNumber(line.unitPrice);
  const discountAmount = toFiniteNumber(line.discountAmount) ?? 0;
  const taxAmount = toFiniteNumber(line.taxAmount) ?? 0;

  if (quantity === null || unitPrice === null) {
    return "";
  }

  return (quantity * unitPrice - discountAmount + taxAmount).toFixed(2);
}

export function calculateQuotationTotals(lines: SalesLineEditorState[]) {
  return lines.reduce(
    (totals, line) => {
      const quantity = toFiniteNumber(line.quantity) ?? 0;
      const unitPrice = toFiniteNumber(line.unitPrice) ?? 0;
      const discountAmount = toFiniteNumber(line.discountAmount) ?? 0;
      const taxAmount = toFiniteNumber(line.taxAmount) ?? 0;
      const subtotal = quantity * unitPrice - discountAmount;
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
      <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={onClose} />
      <div
        dir={isArabic ? "rtl" : "ltr"}
        className="relative mx-auto flex h-full max-w-[1180px] flex-col overflow-hidden rounded-[2rem] border border-gray-200 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.22)]"
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-5 sm:px-8">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
          >
            <span className="sr-only">{t("salesReceivables.action.cancel")}</span>
            <X className="h-6 w-6" />
          </button>
          <div className={cn("space-y-1", isArabic ? "text-right" : "text-left")}>
            <div className="text-2xl font-black tracking-tight text-slate-900">{title}</div>
            <div className="text-sm text-gray-500">
              {editor.reference || t("salesReceivables.field.referenceHint")}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-8 sm:py-6">
          <div className="space-y-8">
            {validationError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {validationError}
              </div>
            ) : null}
            <section className="space-y-5">
              <div className="grid gap-4 lg:grid-cols-3">
                <Field label={t("salesReceivables.field.quotationDate")}>
                  <div className="relative">
                    <Input
                      type="date"
                      value={editor.quotationDate}
                      onChange={(event) =>
                        updateEditor((current) => ({ ...current, quotationDate: event.target.value }))
                      }
                      className={cn(isArabic ? "ps-4 pe-12 text-right" : "ps-12 pe-4")}
                    />
                    <CalendarDays
                      className={cn(
                        "pointer-events-none absolute top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400",
                        isArabic ? "left-4" : "right-4",
                      )}
                    />
                  </div>
                </Field>
                <Field label={t("salesReceivables.field.validUntil")}>
                  <div className="relative">
                    <Input
                      type="date"
                      value={editor.validityDate}
                      onChange={(event) =>
                        updateEditor((current) => ({ ...current, validityDate: event.target.value }))
                      }
                      className={cn(isArabic ? "ps-4 pe-12 text-right" : "ps-12 pe-4")}
                    />
                    <CalendarDays
                      className={cn(
                        "pointer-events-none absolute top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400",
                        isArabic ? "left-4" : "right-4",
                      )}
                    />
                  </div>
                </Field>
                <Field label={t("salesReceivables.field.currency")}>
                  <Input
                    value={editor.currencyCode}
                    onChange={(event) =>
                      updateEditor((current) => ({
                        ...current,
                        currencyCode: event.target.value.toUpperCase(),
                      }))
                    }
                    maxLength={3}
                    className={isArabic ? "text-right" : undefined}
                  />
                </Field>
              </div>

              <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
                <Field label={t("salesReceivables.field.customer")}>
                  <Select
                    value={editor.customerId}
                    onChange={(event) =>
                      updateEditor((current) => ({ ...current, customerId: event.target.value }))
                    }
                    className={isArabic ? "text-right" : undefined}
                  >
                    <option value="">{t("salesReceivables.empty.selectActiveCustomer")}</option>
                    {customers.map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.code} · {row.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label={t("salesReceivables.field.description")}>
                  <Textarea
                    rows={4}
                    value={editor.description}
                    onChange={(event) =>
                      updateEditor((current) => ({ ...current, description: event.target.value }))
                    }
                    placeholder={t("salesReceivables.field.description")}
                    className={isArabic ? "text-right" : undefined}
                  />
                </Field>
              </div>
            </section>

            <section className="space-y-4 border-t border-gray-200 pt-6">
              <div className={cn("space-y-2", isArabic ? "text-right" : "text-left")}>
                <div className="text-2xl font-black text-slate-900">
                  {t("salesReceivables.section.documentLines")}
                </div>
                <div className="text-sm text-gray-500">
                  {t("salesReceivables.section.quotationItemsDescription")}
                </div>
              </div>

              <div className="space-y-4">
                {editor.lines.map((line, index) => {
                  const selectedItem = inventoryItems.find((item) => item.id === line.itemId) ?? null;
                  return (
                    <div
                      key={line.key}
                      className="rounded-[1.75rem] border border-gray-200 bg-white p-4 shadow-sm sm:p-6"
                    >
                      <div className="mb-5 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <GripVertical className="h-5 w-5 text-gray-300" />
                          <div className="text-xl font-bold text-slate-900">
                            {t("salesReceivables.line.label", { index: index + 1 })}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeLine(line.key)}
                          disabled={editor.lines.length === 1}
                          className="rounded-full p-2 text-rose-500 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:text-gray-300"
                        >
                          <span className="sr-only">{t("salesReceivables.action.remove")}</span>
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>

                      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
                        <Field label={t("salesReceivables.field.itemOrService")}>
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
                                revenueAccountId:
                                  item?.salesAccount?.id ?? current.revenueAccountId,
                              }));
                            }}
                            className={isArabic ? "text-right" : undefined}
                          >
                            <option value="">
                              {isInventoryItemsLoading
                                ? t("salesReceivables.state.loadingItems")
                                : t("salesReceivables.empty.selectItemOrService")}
                            </option>
                            {selectedItem && !inventoryItems.some((item) => item.id === selectedItem.id) ? (
                              <option value={selectedItem.id}>
                                {selectedItem.code} · {selectedItem.name}
                              </option>
                            ) : null}
                            {inventoryItems.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.code} · {item.name}
                              </option>
                            ))}
                          </Select>
                        </Field>

                        <Field
                          label={t("salesReceivables.field.revenueAccount")}
                          hint={!selectedItem?.salesAccount ? t("salesReceivables.empty.revenueAccountOptional") : undefined}
                        >
                          <Select
                            value={line.revenueAccountId}
                            onChange={(event) =>
                              updateLine(line.key, (current) => ({
                                ...current,
                                revenueAccountId: event.target.value,
                              }))
                            }
                            className={isArabic ? "text-right" : undefined}
                          >
                            <option value="">{t("salesReceivables.empty.selectRevenueAccount")}</option>
                            {revenueAccounts.map((account) => (
                              <option key={account.id} value={account.id}>
                                {account.code} · {account.name}
                              </option>
                            ))}
                          </Select>
                        </Field>
                      </div>

                      <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
                        <Field label={t("salesReceivables.field.description")}>
                          <Input
                            value={line.description}
                            onChange={(event) =>
                              updateLine(line.key, (current) => ({
                                ...current,
                                description: event.target.value,
                              }))
                            }
                            placeholder={t("salesReceivables.field.description")}
                            className={isArabic ? "text-right" : undefined}
                          />
                        </Field>
                        <Field label={t("salesReceivables.field.itemSnapshot")}>
                          <Input
                            value={line.itemName}
                            onChange={(event) =>
                              updateLine(line.key, (current) => ({
                                ...current,
                                itemName: event.target.value,
                              }))
                            }
                            placeholder={t("salesReceivables.field.itemSnapshotPlaceholder")}
                            className={isArabic ? "text-right" : undefined}
                          />
                        </Field>
                      </div>

                      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                        <Field label={t("salesReceivables.field.quantity")}>
                          <Input
                            type="number"
                            min="0.0001"
                            step="0.0001"
                            value={line.quantity}
                            onChange={(event) =>
                              updateLine(line.key, (current) => ({
                                ...current,
                                quantity: event.target.value,
                              }))
                            }
                          />
                        </Field>
                        <Field label={t("salesReceivables.field.unitPrice")}>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.unitPrice}
                            onChange={(event) =>
                              updateLine(line.key, (current) => ({
                                ...current,
                                unitPrice: event.target.value,
                              }))
                            }
                          />
                        </Field>
                        <Field label={t("salesReceivables.field.discountAmount")}>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.discountAmount}
                            onChange={(event) =>
                              updateLine(line.key, (current) => ({
                                ...current,
                                discountAmount: event.target.value,
                              }))
                            }
                          />
                        </Field>
                        <Field label={t("salesReceivables.field.taxAmount")}>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.taxAmount}
                            onChange={(event) =>
                              updateLine(line.key, (current) => ({
                                ...current,
                                taxAmount: event.target.value,
                              }))
                            }
                          />
                        </Field>
                        <Field label={t("salesReceivables.field.lineAmount")}>
                          <div className="relative">
                            <Input value={line.lineAmount} readOnly disabled className="ps-11" />
                            <BadgeDollarSign
                              className={cn(
                                "pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400",
                                isArabic && "left-auto right-4",
                              )}
                            />
                          </div>
                        </Field>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className={cn("flex", isArabic ? "justify-start" : "justify-end")}>
                <Button variant="secondary" onClick={addLine} className="rounded-2xl px-5">
                  {t("salesReceivables.action.addLine")}
                </Button>
              </div>
            </section>
          </div>
        </div>

        <div className="border-t border-gray-200 bg-white px-5 py-5 sm:px-8">
          <div className="rounded-[1.75rem] border border-gray-200 bg-gray-50/60 p-4 sm:p-5">
            <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1.15fr]">
              <SummaryStat
                label={t("salesReceivables.summary.subtotalBeforeTax")}
                value={formatQuotationAmount(totals.subtotalAmount, editor.currencyCode)}
              />
              <SummaryStat
                label={t("salesReceivables.summary.totalTax")}
                value={formatQuotationAmount(totals.taxAmount, editor.currencyCode)}
              />
              <div className="rounded-[1.4rem] bg-emerald-50 px-5 py-4">
                <div className="text-sm font-bold text-emerald-800">
                  {t("salesReceivables.summary.finalTotal")}
                </div>
                <div className="mt-3 flex items-end gap-2 text-emerald-700">
                  <span className="text-xl font-bold">{editor.currencyCode || "JOD"}</span>
                  <span className="text-4xl font-black leading-none">
                    {totals.totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className={cn("mt-5 flex flex-wrap gap-3", isArabic ? "justify-start" : "justify-end")}>
            <Button variant="secondary" onClick={onClose} className="rounded-2xl px-8">
              {t("salesReceivables.action.cancel")}
            </Button>
            <Button
              variant="secondary"
              onClick={onApprove}
              disabled={isSavingDraft || isApproving}
              className="gap-2 rounded-2xl border border-emerald-600 bg-white px-8 text-emerald-700 shadow-none hover:bg-emerald-50"
            >
              <FileCheck2 className="h-4 w-4" />
              {t("salesReceivables.action.approveQuotation")}
            </Button>
            <Button
              onClick={onSaveDraft}
              disabled={isSavingDraft || isApproving}
              className="gap-2 rounded-2xl bg-emerald-600 px-8 hover:bg-emerald-500"
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

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.4rem] bg-white px-5 py-4">
      <div className="text-sm font-bold text-gray-500">{label}</div>
      <div className="mt-3 text-3xl font-black text-slate-900">{value}</div>
    </div>
  );
}

function formatQuotationAmount(amount: number, currencyCode: string) {
  return `${currencyCode || "JOD"} ${amount.toFixed(2)}`;
}
