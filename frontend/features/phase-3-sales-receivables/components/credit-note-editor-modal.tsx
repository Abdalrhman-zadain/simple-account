"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  LuCalendarDays as CalendarDays,
  LuCheck as Check,
  LuCirclePlus as CirclePlus,
  LuFileText as FileText,
  LuInfo as Info,
  LuSave as Save,
  LuTag as Tag,
  LuTrash2 as Trash2,
  LuUserRound as UserRound,
  LuX as X,
} from "react-icons/lu";

import { Button } from "@/components/ui";
import { Field, Input, Select, Textarea } from "@/components/ui/forms";
import { getActiveTaxes } from "@/lib/api";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import type { Customer, SalesInvoice } from "@/types/api";
import {
  calculateQuotationTotals,
  createEmptyLine,
  type SalesLineEditorState,
  withCalculatedLineAmount,
} from "./quotation-editor-modal";

type RevenueAccountOption = { id: string; code: string; name: string };

type CreditNoteEditorValue = {
  id?: string;
  reference: string;
  noteDate: string;
  currencyCode: string;
  customerId: string;
  salesInvoiceId: string;
  description: string;
  lines: SalesLineEditorState[];
};

type CreditNoteEditorModalProps = {
  isOpen: boolean;
  title: string;
  editor: CreditNoteEditorValue;
  customers: Customer[];
  invoices: SalesInvoice[];
  revenueAccounts: RevenueAccountOption[];
  isSubmitting: boolean;
  onClose: () => void;
  onChange: (editor: CreditNoteEditorValue) => void;
  onSubmit: () => void;
  onSubmitAndPost: () => void;
};

function createEmptyDiscountLine(defaultLabel: string) {
  return {
    ...createEmptyLine(),
    itemName: defaultLabel,
    quantity: "1",
    discountAmount: "",
  };
}

function getReceivableAccountName(invoice?: SalesInvoice) {
  return invoice?.customer.receivableAccount
    ? `${invoice.customer.receivableAccount.code} - ${invoice.customer.receivableAccount.name}`
    : "حساب العميل / الذمم المدينة";
}

export function CreditNoteEditorModal({
  isOpen,
  title,
  editor,
  customers,
  invoices,
  revenueAccounts,
  isSubmitting,
  onClose,
  onChange,
  onSubmit,
  onSubmitAndPost,
}: CreditNoteEditorModalProps) {
  const { t, language } = useTranslation();
  const { token } = useAuth();
  const { data: taxes = [] } = useQuery({ queryKey: ["taxes", "active", token], queryFn: () => getActiveTaxes(token) });
  const isArabic = language === "ar";
  const totals = useMemo(() => calculateQuotationTotals(editor.lines), [editor.lines]);
  const selectedInvoice = invoices.find((invoice) => invoice.id === editor.salesInvoiceId);
  const selectedCustomer = customers.find((customer) => customer.id === editor.customerId) ?? selectedInvoice?.customer;
  const currencyCode = editor.currencyCode || selectedInvoice?.currencyCode || "JOD";
  const availableCredit = selectedInvoice ? Number(selectedInvoice.outstandingAmount) : null;
  const defaultDiscountLabel = t("salesReceivables.creditNote.defaultDiscountLabel");

  const updateLine = (
    lineKey: string,
    updater: (line: SalesLineEditorState) => SalesLineEditorState,
  ) => {
    onChange({
      ...editor,
      lines: editor.lines.map((line) =>
        line.key === lineKey ? withCalculatedLineAmount(updater(line)) : line,
      ),
    });
  };

  const removeLine = (lineKey: string) => {
    if (editor.lines.length === 1) {
      return;
    }

    onChange({
      ...editor,
      lines: editor.lines.filter((line) => line.key !== lineKey),
    });
  };

  const addLine = () => {
    onChange({
      ...editor,
      lines: [...editor.lines, createEmptyDiscountLine(defaultDiscountLabel)],
    });
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
            className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
          >
            <span className="sr-only">{t("salesReceivables.action.cancel")}</span>
            <X className="h-6 w-6" />
          </button>
          <div className={cn("flex items-center gap-3", isArabic ? "flex-row-reverse text-right" : "text-left")}>
            <div>
              <div className={cn("text-2xl text-slate-950 sm:text-3xl", isArabic ? "arabic-ui-heading" : "font-black tracking-tight")}>
                {title}
              </div>
              {editor.reference ? <div className="text-sm font-semibold text-slate-500">{editor.reference}</div> : null}
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-700">
              <FileText className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.06),_transparent_30%),linear-gradient(180deg,_#fcfcfb_0%,_#f7f8f7_100%)] px-4 py-4 sm:px-8 sm:py-6">
          <div className="space-y-5">
            <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.05)] sm:p-6">
              <div className={cn("mb-4 text-lg text-slate-950", isArabic ? "arabic-ui-heading text-right" : "font-black")}>
                {t("salesReceivables.creditNote.section.noticeData")}
              </div>
              <div className="grid gap-4 lg:grid-cols-4">
                <Field label={t("salesReceivables.field.creditNoteDate")} required labelAlign={isArabic ? "end" : "start"}>
                  <div className="relative">
                    <Input
                      type="date"
                      value={editor.noteDate}
                      onChange={(event) => onChange({ ...editor, noteDate: event.target.value })}
                      className={cn("h-12 border-slate-200 bg-white", isArabic ? "pe-12 ps-12 text-right" : "ps-12")}
                    />
                    <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  </div>
                </Field>

                <Field label={t("salesReceivables.field.customer")} required labelAlign={isArabic ? "end" : "start"}>
                  <div className="relative">
                    <Select
                      value={editor.customerId}
                      onChange={(event) =>
                        onChange({
                          ...editor,
                          customerId: event.target.value,
                          salesInvoiceId: "",
                        })
                      }
                      className={cn("h-12 border-slate-200 bg-white", isArabic ? "pe-12 ps-12 text-right" : "ps-12")}
                    >
                      <option value="">{t("salesReceivables.empty.selectActiveCustomer")}</option>
                      {customers.map((row) => (
                        <option key={row.id} value={row.id}>
                          {row.code} - {row.name}
                        </option>
                      ))}
                    </Select>
                    <UserRound className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  </div>
                </Field>

                <Field label={t("salesReceivables.field.currency")} required labelAlign={isArabic ? "end" : "start"}>
                  <Input
                    value={currencyCode}
                    onChange={(event) => onChange({ ...editor, currencyCode: event.target.value.toUpperCase() })}
                    maxLength={3}
                    className={cn("h-12 border-slate-200 bg-white uppercase", isArabic && "text-right")}
                  />
                </Field>

                <Field label={t("salesReceivables.field.linkedInvoice")} required labelAlign={isArabic ? "end" : "start"}>
                  <Select
                    value={editor.salesInvoiceId}
                    onChange={(event) => {
                      const invoice = invoices.find((row) => row.id === event.target.value);
                      onChange({
                        ...editor,
                        salesInvoiceId: event.target.value,
                        currencyCode: invoice?.currencyCode ?? editor.currencyCode,
                      });
                    }}
                    className={cn("h-12 border-slate-200 bg-white", isArabic && "text-right")}
                  >
                    <option value="">{t("salesReceivables.empty.noLinkedInvoice")}</option>
                    {invoices.map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.reference}
                      </option>
                    ))}
                  </Select>
                  {availableCredit !== null ? (
                    <span className="mt-2 flex items-center justify-end gap-2 text-xs font-bold text-emerald-700">
                      <Check className="h-4 w-4" />
                      {t("salesReceivables.creditNote.availableDiscount", {
                        amount: `${currencyCode} ${availableCredit.toFixed(3)}`,
                      })}
                    </span>
                  ) : null}
                </Field>
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr]">
                <Field label={t("salesReceivables.creditNote.reason")} required labelAlign={isArabic ? "end" : "start"}>
                  <Textarea
                    rows={3}
                    value={editor.description}
                    onChange={(event) => onChange({ ...editor, description: event.target.value })}
                    placeholder={t("salesReceivables.creditNote.reasonPlaceholder", {
                      invoice: selectedInvoice?.reference ?? "INV-2026-0154",
                    })}
                    className={cn("min-h-[86px] resize-none border-slate-200 bg-white", isArabic && "text-right")}
                  />
                </Field>

                <div>
                  <div className={cn("mb-2 text-sm font-semibold text-slate-900", isArabic && "text-right")}>
                    {t("salesReceivables.creditNote.type")}
                  </div>
                  <div className="flex min-h-[86px] items-center justify-between gap-4 rounded-xl border border-emerald-400 bg-emerald-50/40 px-5 py-4">
                    <div className={cn("space-y-1", isArabic ? "text-right" : "text-left")}>
                      <div className="text-base font-bold text-slate-950">{t("salesReceivables.creditNote.postSaleDiscount")}</div>
                      <div className="text-sm font-medium text-slate-500">{t("salesReceivables.creditNote.postSaleDiscountHint")}</div>
                    </div>
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                      <Tag className="h-5 w-5" />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.05)] sm:p-6">
              <div className={cn("mb-5 text-lg text-slate-950", isArabic ? "arabic-ui-heading text-right" : "font-black")}>
                {t("salesReceivables.creditNote.discountDetails")}
              </div>

              <div className="space-y-3">
                <div className="hidden grid-cols-[74px_1.8fr_1.35fr_1.05fr_1.05fr_1.15fr_54px] gap-4 px-1 text-sm font-bold text-slate-900 xl:grid">
                  <div className="text-center">#</div>
                  <div className={cn(isArabic && "text-right")}>{t("salesReceivables.creditNote.discountType")}</div>
                  <div className={cn(isArabic && "text-right")}>{t("salesReceivables.field.revenueAccount")}</div>
                  <div className={cn(isArabic && "text-right")}>{t("salesReceivables.creditNote.amountBeforeTax")}</div>
                  <div className={cn(isArabic && "text-right")}>{t("salesReceivables.field.taxAmount")}</div>
                  <div className={cn(isArabic && "text-right")}>{t("salesReceivables.metric.total")}</div>
                  <div />
                </div>

                {editor.lines.map((line, index) => (
                  <div key={line.key} className="grid gap-3 rounded-xl border border-slate-100 bg-slate-50/45 p-3 xl:grid-cols-[74px_1.8fr_1.35fr_1.05fr_1.05fr_1.15fr_54px] xl:gap-4 xl:bg-transparent xl:p-0">
                    <Input
                      value={`${index + 1}`}
                      readOnly
                      className="h-12 border-slate-200 bg-white text-center font-bold"
                      aria-label={t("salesReceivables.line.label", { index: index + 1 })}
                    />
                    <Input
                      value={line.itemName || defaultDiscountLabel}
                      onChange={(event) => updateLine(line.key, (current) => ({ ...current, itemName: event.target.value }))}
                      className={cn("h-12 border-slate-200 bg-white", isArabic && "text-right")}
                    />
                    <Select
                      value={line.revenueAccountId}
                      onChange={(event) =>
                        updateLine(line.key, (current) => ({
                          ...current,
                          revenueAccountId: event.target.value,
                        }))
                      }
                      className={cn("h-12 border-slate-200 bg-white", isArabic && "text-right")}
                    >
                      <option value="">{t("salesReceivables.empty.selectRevenueAccount")}</option>
                      {revenueAccounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.code} - {account.name}
                        </option>
                      ))}
                    </Select>
                    <CurrencyInput
                      currencyCode={currencyCode}
                      value={line.unitPrice}
                      onChange={(value) => updateLine(line.key, (current) => ({ ...current, quantity: "1", unitPrice: value, discountAmount: "" }))}
                      isArabic={isArabic}
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
                    <CurrencyInput
                      currencyCode={currencyCode}
                      value={line.lineAmount}
                      readOnly
                      isArabic={isArabic}
                      className="font-bold text-slate-950"
                    />
                    <button
                      type="button"
                      onClick={() => removeLine(line.key)}
                      disabled={editor.lines.length === 1}
                      className="inline-flex h-12 items-center justify-center rounded-xl border border-red-100 bg-white text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-300"
                    >
                      <span className="sr-only">{t("salesReceivables.action.remove")}</span>
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.35fr]">
                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  <div className={cn("mb-4 text-sm font-bold text-slate-950", isArabic && "text-right")}>
                    {t("salesReceivables.creditNote.summary")}
                  </div>
                  <SummaryRow label={t("salesReceivables.summary.subtotalBeforeTax")} value={`${currencyCode} ${totals.subtotalAmount.toFixed(3)}`} isArabic={isArabic} />
                  <SummaryRow label={t("salesReceivables.field.taxAmount")} value={`${currencyCode} ${totals.taxAmount.toFixed(3)}`} isArabic={isArabic} />
                  <div className="mt-3 border-t border-slate-200 pt-3">
                    <SummaryRow
                      label={t("salesReceivables.creditNote.totalDiscount")}
                      value={`${currencyCode} ${totals.totalAmount.toFixed(3)}`}
                      isArabic={isArabic}
                      strong
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-blue-200 bg-blue-50/45 p-5">
                  <div className={cn("mb-4 flex items-center gap-2 text-sm font-bold text-slate-700", isArabic ? "justify-end text-right" : "text-left")}>
                    <Info className="h-5 w-5 text-blue-500" />
                    {t("salesReceivables.creditNote.postingHint")}
                  </div>
                  <div className={cn("space-y-2 text-sm text-slate-700", isArabic ? "text-right" : "text-left")}>
                    <div className="font-bold text-slate-950">{t("salesReceivables.creditNote.journalAtApproval")}</div>
                    <PostingRow
                      label={t("salesReceivables.creditNote.journalDebit", {
                        account: revenueAccounts.find((account) => account.id === editor.lines[0]?.revenueAccountId)?.name ?? t("salesReceivables.field.revenueAccount"),
                      })}
                      value={`${totals.totalAmount.toFixed(3)} ${currencyCode}`}
                      isArabic={isArabic}
                    />
                    <PostingRow
                      label={t("salesReceivables.creditNote.journalCredit", {
                        account: selectedCustomer ? getReceivableAccountName(selectedInvoice) : t("salesReceivables.field.receivableAccount"),
                      })}
                      value={`${totals.totalAmount.toFixed(3)} ${currencyCode}`}
                      isArabic={isArabic}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  onClick={addLine}
                  className="inline-flex min-w-[260px] items-center justify-center gap-2 rounded-xl border border-dashed border-emerald-500 bg-white px-5 py-2 text-sm font-bold text-emerald-700 transition hover:bg-emerald-50"
                >
                  <CirclePlus className="h-4 w-4" />
                  {t("salesReceivables.creditNote.addDiscountLine")}
                </button>
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-3">
              <MetricCard label={t("salesReceivables.field.taxAmount")} value={`${currencyCode} ${totals.taxAmount.toFixed(2)}`} />
              <MetricCard label={t("salesReceivables.summary.subtotalBeforeTax")} value={`${currencyCode} ${totals.subtotalAmount.toFixed(2)}`} />
              <MetricCard
                label={t("salesReceivables.creditNote.totalDiscount")}
                value={`${currencyCode} ${totals.totalAmount.toFixed(2)}`}
                highlight
              />
            </section>
          </div>
        </div>

        <div className="border-t border-slate-200 bg-white px-5 py-4 sm:px-8">
          <div className={cn("flex flex-col gap-3 sm:flex-row", isArabic ? "sm:flex-row-reverse" : "")}>
            <Button variant="secondary" onClick={onClose} className="rounded-xl px-7">
              {t("salesReceivables.action.cancel")}
            </Button>
            <Button variant="secondary" onClick={onSubmit} disabled={isSubmitting} className="rounded-xl border-emerald-300 px-7 text-emerald-800 hover:bg-emerald-50">
              <Save className="h-4 w-4" />
              {t("salesReceivables.action.saveDraft")}
            </Button>
            <Button onClick={onSubmitAndPost} disabled={isSubmitting} className="rounded-xl bg-emerald-700 px-7 hover:bg-emerald-800">
              <Check className="h-4 w-4" />
              {t("salesReceivables.creditNote.approveAndIssue")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CurrencyInput({
  currencyCode,
  value,
  onChange,
  readOnly,
  isArabic,
  className,
}: {
  currencyCode: string;
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  isArabic: boolean;
  className?: string;
}) {
  return (
    <div className="relative">
      <Input
        type="number"
        min="0"
        step="0.001"
        value={value}
        readOnly={readOnly}
        disabled={readOnly}
        onChange={(event) => onChange?.(event.target.value)}
        className={cn(
          "h-12 border-slate-200 bg-white disabled:opacity-100",
          isArabic ? "pe-4 ps-16 text-right" : "ps-16",
          className,
        )}
      />
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">
        {currencyCode}
      </span>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  isArabic,
  strong,
}: {
  label: string;
  value: string;
  isArabic: boolean;
  strong?: boolean;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-4 py-1 text-sm", isArabic && "flex-row-reverse text-right")}>
      <span className="text-slate-500">{label}</span>
      <span className={cn("font-bold text-slate-950", strong && "text-base text-emerald-700")}>{value}</span>
    </div>
  );
}

function PostingRow({ label, value, isArabic }: { label: string; value: string; isArabic: boolean }) {
  return (
    <div className={cn("grid gap-3 sm:grid-cols-[1fr_130px]", isArabic && "sm:grid-cols-[130px_1fr]")}>
      <div className={cn("text-slate-600", isArabic && "sm:order-2")}>{label}</div>
      <div className={cn("font-semibold text-slate-700", isArabic && "sm:order-1")}>{value}</div>
    </div>
  );
}

function MetricCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={cn("rounded-xl border bg-white p-5 shadow-sm", highlight ? "border-emerald-300 bg-emerald-50/60 text-emerald-800" : "border-slate-200")}>
      <div className="text-sm font-bold text-slate-600">{label}</div>
      <div className={cn("mt-3 text-2xl font-black", highlight ? "text-emerald-700" : "text-slate-950")}>{value}</div>
    </div>
  );
}
