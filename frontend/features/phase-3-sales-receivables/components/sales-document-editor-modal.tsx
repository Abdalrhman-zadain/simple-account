"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  LuCalendarDays as CalendarDays,
  LuCirclePlus as CirclePlus,
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
import { cn, formatCurrency, formatItemServiceLabel } from "@/lib/utils";
import type { Customer, InventoryItem, Tax } from "@/types/api";
import { useAuth } from "@/providers/auth-provider";
import {
  applyItemToSalesLine,
  calculateQuotationTotals,
  createEmptyLine,
  type SalesLineEditorState,
  withCalculatedLineAmount,
} from "./quotation-editor-modal";

type RevenueAccountOption = { id: string; code: string; name: string };

type SalesDocumentEditorModalProps = {
  isOpen: boolean;
  title: string;
  introTitle: string;
  introDescription?: string;
  reference: string;
  dateLabel: string;
  dateValue: string;
  secondaryDateLabel?: string;
  secondaryDateValue?: string;
  currencyCode: string;
  customerId: string;
  description: string;
  lines: SalesLineEditorState[];
  customers: Customer[];
  inventoryItems: InventoryItem[];
  isInventoryItemsLoading: boolean;
  revenueAccounts: RevenueAccountOption[];
  isSubmitting: boolean;
  defaultLineTax?: Tax | null;
  allowTaxOverride?: boolean;
  onClose: () => void;
  onReferenceChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onSecondaryDateChange?: (value: string) => void;
  onCurrencyChange: (value: string) => void;
  onCustomerChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onLinesChange: (lines: SalesLineEditorState[]) => void;
  onSubmit: () => void;
  submitLabel: string;
};

export function SalesDocumentEditorModal({
  isOpen,
  title,
  introTitle,
  introDescription,
  reference,
  dateLabel,
  dateValue,
  secondaryDateLabel,
  secondaryDateValue,
  currencyCode,
  customerId,
  description,
  lines,
  customers,
  inventoryItems,
  isInventoryItemsLoading,
  revenueAccounts,
  isSubmitting,
  defaultLineTax,
  allowTaxOverride = true,
  onClose,
  onReferenceChange,
  onDateChange,
  onSecondaryDateChange,
  onCurrencyChange,
  onCustomerChange,
  onDescriptionChange,
  onLinesChange,
  onSubmit,
  submitLabel,
}: SalesDocumentEditorModalProps) {
  const { t, language } = useTranslation();
  const { token } = useAuth();
  const { data: taxes = [] } = useQuery({ queryKey: ["taxes", "active", token], queryFn: () => getActiveTaxes(token) });
  const isArabic = language === "ar";
  const totals = useMemo(() => calculateQuotationTotals(lines), [lines]);

  const updateLine = (
    lineKey: string,
    updater: (line: SalesLineEditorState) => SalesLineEditorState,
  ) => {
    onLinesChange(
      lines.map((line) =>
        line.key === lineKey ? withCalculatedLineAmount(updater(line)) : line,
      ),
    );
  };

  const removeLine = (lineKey: string) => {
    if (lines.length === 1) {
      return;
    }

    onLinesChange(lines.filter((line) => line.key !== lineKey));
  };

  const addLine = () => {
    onLinesChange([
      ...lines,
      withCalculatedLineAmount({
        ...createEmptyLine(),
        taxId: defaultLineTax?.id ?? "",
        taxRate: defaultLineTax ? String(defaultLineTax.rate) : "",
        taxAmount: "",
      }),
    ]);
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
              <FileText className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <div className={cn("text-3xl text-slate-900", isArabic ? "arabic-ui-heading" : "font-black tracking-tight")}>
                {title}
              </div>
              {reference ? <div className="text-sm text-slate-500">{reference}</div> : null}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.06),_transparent_30%),linear-gradient(180deg,_#fcfcfb_0%,_#f7f8f7_100%)] px-4 py-4 sm:px-8 sm:py-6">
          <div className="space-y-5">
            <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.05)] sm:p-6">
              <div className={cn("mb-5 flex items-center gap-3", isArabic ? "flex-row-reverse text-right" : "text-left")}>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <div className={cn("text-lg text-slate-900", isArabic ? "arabic-ui-heading" : "font-extrabold")}>
                    {introTitle}
                  </div>
                  {introDescription ? <div className="text-sm text-slate-500">{introDescription}</div> : null}
                </div>
              </div>

              <div className={cn("grid gap-4", secondaryDateLabel && onSecondaryDateChange ? "xl:grid-cols-[1fr_1fr_1.4fr_1fr_1fr]" : "xl:grid-cols-[1fr_1.4fr_1fr_1fr]")}>
                <Field label={dateLabel} required labelClassName={isArabic ? "arabic-ui" : undefined}>
                  <div className="relative">
                    <Input
                      type="date"
                      value={dateValue}
                      onChange={(event) => onDateChange(event.target.value)}
                      className={cn("border-slate-200 bg-slate-50/70", isArabic ? "arabic-ui pe-12 text-right" : "ps-12")}
                    />
                    <CalendarDays className={cn("pointer-events-none absolute top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400", isArabic ? "left-4" : "right-4")} />
                  </div>
                </Field>

                {secondaryDateLabel && onSecondaryDateChange ? (
                  <Field label={secondaryDateLabel} labelClassName={isArabic ? "arabic-ui" : undefined}>
                    <div className="relative">
                      <Input
                        type="date"
                        value={secondaryDateValue ?? ""}
                        onChange={(event) => onSecondaryDateChange(event.target.value)}
                        className={cn("border-slate-200 bg-slate-50/70", isArabic ? "arabic-ui pe-12 text-right" : "ps-12")}
                      />
                      <CalendarDays className={cn("pointer-events-none absolute top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400", isArabic ? "left-4" : "right-4")} />
                    </div>
                  </Field>
                ) : null}

                <Field label={t("salesReceivables.field.customer")} required labelClassName={isArabic ? "arabic-ui" : undefined}>
                  <div className="relative">
                    <Select
                      value={customerId}
                      onChange={(event) => onCustomerChange(event.target.value)}
                      className={cn("border-slate-200 bg-slate-50/70", isArabic ? "arabic-ui pe-12 text-right" : "ps-12")}
                    >
                      <option value="">{t("salesReceivables.empty.selectActiveCustomer")}</option>
                      {customers.map((row) => (
                        <option key={row.id} value={row.id}>
                          {row.code} · {row.name}
                        </option>
                      ))}
                    </Select>
                    <UserRound className={cn("pointer-events-none absolute top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400", isArabic ? "left-4" : "right-4")} />
                  </div>
                  <div className="mt-2">
                    <div className={cn(
                      "inline-flex items-center rounded-xl px-3 py-1.5 text-xs font-bold shadow-sm ring-1 ring-inset",
                      customerId 
                        ? "bg-emerald-50 text-emerald-700 ring-emerald-200" 
                        : "bg-slate-50 text-slate-500 ring-slate-200"
                    )}>
                      <span className={cn(isArabic && "arabic-ui")}>
                        {t("salesReceivables.field.customerTaxTreatment")}: {" "}
                        {customerId ? (
                          customers.find(c => c.id === customerId)?.taxTreatment ? (
                            isArabic 
                              ? customers.find(c => c.id === customerId)?.taxTreatment?.arabicName 
                              : customers.find(c => c.id === customerId)?.taxTreatment?.englishName
                          ) : t("salesReceivables.empty.notSet")
                        ) : t("salesReceivables.empty.selectCustomerToViewTaxTreatment")}
                      </span>
                    </div>
                  </div>
                </Field>

                <Field label={t("salesReceivables.field.currency")} required labelClassName={isArabic ? "arabic-ui" : undefined}>
                  <Input
                    value={currencyCode}
                    onChange={(event) => onCurrencyChange(event.target.value.toUpperCase())}
                    maxLength={3}
                    className={cn("border-slate-200 bg-slate-50/70 uppercase", isArabic && "arabic-ui text-right")}
                  />
                </Field>
              </div>

              <div className="mt-4">
                <Field label={t("salesReceivables.field.description")} labelClassName={isArabic ? "arabic-ui" : undefined}>
                  <Textarea
                    rows={3}
                    value={description}
                    onChange={(event) => onDescriptionChange(event.target.value)}
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
                {lines.map((line, index) => (
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
                        disabled={lines.length === 1}
                        className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-white px-3 py-2 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300"
                      >
                        <Trash2 className="h-4 w-4" />
                        {t("salesReceivables.action.remove")}
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <div className="min-w-[1400px]">
                        <div className="mb-3 grid grid-cols-[0.4fr_2.4fr_2.1fr_2.1fr_0.7fr_0.9fr_0.9fr_2fr] gap-3">
                          {[
                            "#",
                            t("salesReceivables.field.itemOrService"),
                            t("salesReceivables.field.itemSnapshot"),
                            t("salesReceivables.field.revenueAccount"),
                            t("salesReceivables.field.quantity"),
                            t("salesReceivables.field.unitPrice"),
                            t("salesReceivables.field.discountAmount"),
                            t("salesReceivables.field.tax"),
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
                              labelIndex !== 6 &&
                              labelIndex !== 7 ? (
                                <span className="ms-1 text-red-500">*</span>
                              ) : null}
                            </div>
                          ))}
                        </div>

                        <div className="grid grid-cols-[0.4fr_2.4fr_2.1fr_2.1fr_0.7fr_0.9fr_0.9fr_2fr] gap-3">
                          <div className="flex h-full items-center justify-center rounded-2xl bg-white text-base font-extrabold text-slate-900 shadow-sm">
                            {index + 1}
                          </div>

                          <Select
                            value={line.itemId}
                            onChange={(event) => {
                              const item = inventoryItems.find((row) => row.id === event.target.value) ?? null;
                              const customer = customers.find((c) => c.id === customerId) ?? null;

                              let shouldUpdatePrice = true;
                              if (line.unitPrice && line.unitPrice !== "0" && line.itemId) {
                                const prevItem = inventoryItems.find((i) => i.id === line.itemId);
                                if (prevItem && line.unitPrice !== prevItem.defaultSalesPrice) {
                                  if (!confirm(t("salesReceivables.message.confirmPriceUpdate"))) {
                                    shouldUpdatePrice = false;
                                  }
                                }
                              }

                              updateLine(line.key, (current) =>
                                applyItemToSalesLine(current, item, customer, taxes, shouldUpdatePrice),
                              );
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
                                {formatItemServiceLabel(item.code, item.name)}
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
                            <option value="">{t("salesReceivables.field.tax")}</option>
                            {taxes.map((tax) => (
                              <option key={tax.id} value={tax.id}>{tax.taxName} {Number(tax.rate).toFixed(2)}%</option>
                            ))}
                          </Select>
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
                              <span className={cn("pointer-events-none absolute top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500", isArabic ? "left-4" : "right-4")}>
                                {currencyCode || "JOD"}
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
                  {currencyCode || "JOD"} {totals.totalAmount.toFixed(2)}
                </div>
              </div>
              <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5">
                <div className="text-sm font-bold text-slate-500">{t("salesReceivables.metric.subtotal")}</div>
                <div className="mt-2 text-2xl font-black text-slate-900">
                  {currencyCode || "JOD"} {totals.subtotalAmount.toFixed(2)}
                </div>
              </div>
              <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5">
                <div className="text-sm font-bold text-slate-500">{t("salesReceivables.metric.tax")}</div>
                <div className="mt-2 text-2xl font-black text-slate-900">
                  {currencyCode || "JOD"} {totals.taxAmount.toFixed(2)}
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
            <Button onClick={onSubmit} disabled={isSubmitting} className="rounded-2xl bg-emerald-600 px-6 hover:bg-emerald-700">
              <Save className="h-4 w-4" />
              {submitLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
