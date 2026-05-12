"use client";

import {
  LuCalendarDays as CalendarDays,
  LuFileCheck2 as FileCheck2,
  LuLandmark as Landmark,
  LuSave as Save,
  LuUserRound as UserRound,
  LuX as X,
} from "react-icons/lu";

import { Button } from "@/components/ui";
import { Field, Input, Select, Textarea } from "@/components/ui/forms";
import { useTranslation } from "@/lib/i18n";
import { cn, formatCurrency } from "@/lib/utils";
import type { BankCashAccount, Customer, SalesInvoice } from "@/types/api";

type ReceiptEditorValue = {
  reference: string;
  receiptDate: string;
  customerId: string;
  amount: string;
  bankCashAccountId: string;
  description: string;
  allocationInvoiceId: string;
  allocationAmount: string;
  sourceAction?: "STANDARD_RECEIPT" | "POST_AND_CREATE_RECEIPT";
};

type AllocationInvoiceOption = Pick<SalesInvoice, "id" | "reference" | "outstandingAmount" | "customer">;

type ReceiptEditorModalProps = {
  isOpen: boolean;
  title: string;
  editor: ReceiptEditorValue;
  customers: Customer[];
  bankCashAccounts: BankCashAccount[];
  openInvoices: AllocationInvoiceOption[];
  selectedInvoice: AllocationInvoiceOption | null;
  isSubmitting: boolean;
  lockCustomerAndInvoice?: boolean;
  onClose: () => void;
  onChange: (editor: ReceiptEditorValue) => void;
  onSubmit: () => void;
};

export function ReceiptEditorModal({
  isOpen,
  title,
  editor,
  customers,
  bankCashAccounts,
  openInvoices,
  selectedInvoice,
  isSubmitting,
  lockCustomerAndInvoice = false,
  onClose,
  onChange,
  onSubmit,
}: ReceiptEditorModalProps) {
  const { t, language } = useTranslation();
  const isArabic = language === "ar";
  const amount = Number(editor.amount || 0);
  const selectedBankCashAccount = bankCashAccounts.find((row) => row.id === editor.bankCashAccountId) ?? null;
  const suggestedAllocationAmount = selectedInvoice
    ? Math.min(Number(editor.amount || 0), Number(selectedInvoice.outstandingAmount || 0))
    : 0;

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
            <div className="space-y-1">
              <div className={cn("text-2xl text-slate-950 sm:text-3xl", isArabic ? "arabic-ui-heading" : "font-black tracking-tight")}>
                {title}
              </div>
              {editor.reference ? <div className="text-sm font-semibold text-slate-500">{editor.reference}</div> : null}
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-700">
              <FileCheck2 className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.06),_transparent_30%),linear-gradient(180deg,_#fcfcfb_0%,_#f7f8f7_100%)] px-4 py-4 sm:px-8 sm:py-6">
          <div className="space-y-5">
            <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.05)] sm:p-6">
              <div className={cn("mb-4 text-lg text-slate-950", isArabic ? "arabic-ui-heading text-right" : "font-black")}>
                {t("salesReceivables.dialog.newReceipt")}
              </div>

              <div className="grid gap-4 xl:grid-cols-[1fr_1.35fr_1fr]">
                <Field label={t("salesReceivables.field.receiptDate")} required labelAlign={isArabic ? "end" : "start"}>
                  <div className="relative">
                    <Input
                      type="date"
                      value={editor.receiptDate}
                      onChange={(event) => onChange({ ...editor, receiptDate: event.target.value })}
                      className={cn("h-12 border-slate-200 bg-white", isArabic ? "pe-12 ps-12 text-right" : "ps-12")}
                    />
                    <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  </div>
                </Field>

                <Field label={t("salesReceivables.field.customer")} required labelAlign={isArabic ? "end" : "start"}>
                  <div className="relative">
                    <Select
                      value={editor.customerId}
                      disabled={lockCustomerAndInvoice}
                      onChange={(event) =>
                        onChange({
                          ...editor,
                          customerId: event.target.value,
                          allocationInvoiceId: "",
                          allocationAmount: "",
                        })
                      }
                        className={cn("h-12 border-slate-200 bg-white", isArabic ? "pe-12 ps-12 text-right" : "ps-12")}
                    >
                      <option value="">{t("salesReceivables.empty.selectActiveCustomer")}</option>
                      {customers.map((row) => (
                        <option key={row.id} value={row.id}>
                          {row.code} · {row.name}
                        </option>
                      ))}
                    </Select>
                    <UserRound className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  </div>
                </Field>

                <Field label={t("salesReceivables.field.amount")} required labelAlign={isArabic ? "end" : "start"}>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={editor.amount}
                    onChange={(event) => onChange({ ...editor, amount: event.target.value })}
                    className={cn("h-12 border-slate-200 bg-white", isArabic && "text-right")}
                  />
                </Field>

              </div>

              <div className="mt-4 grid gap-4 xl:grid-cols-[1.2fr_1fr]">
                <Field label={t("salesReceivables.field.bankCashAccount")} required labelAlign={isArabic ? "end" : "start"}>
                  <div className="relative">
                    <Select
                      value={editor.bankCashAccountId}
                      onChange={(event) => onChange({ ...editor, bankCashAccountId: event.target.value })}
                      className={cn("h-12 border-slate-200 bg-white", isArabic ? "pe-12 ps-12 text-right" : "ps-12")}
                    >
                      <option value="">{t("salesReceivables.empty.selectBankCashAccount")}</option>
                      {bankCashAccounts.map((row) => (
                        <option key={row.id} value={row.id}>
                          {row.name} · {row.type}
                        </option>
                      ))}
                    </Select>
                    <Landmark className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  </div>
                </Field>

                <Field label={t("salesReceivables.field.description")} labelAlign={isArabic ? "end" : "start"}>
                  <Textarea
                    rows={3}
                    value={editor.description}
                    onChange={(event) => onChange({ ...editor, description: event.target.value })}
                    className={cn("min-h-[86px] resize-none border-slate-200 bg-white", isArabic && "text-right")}
                  />
                </Field>
              </div>
            </section>

            <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.05)] sm:p-6">
              <div className={cn("mb-4 text-lg text-slate-950", isArabic ? "arabic-ui-heading text-right" : "font-black")}>
                {isArabic ? "تخصيص المقبوض على فاتورة" : "Allocate receipt to invoice"}
              </div>
              <div className={cn("mb-5 text-sm text-slate-500", isArabic ? "text-right" : "text-left")}>
                {isArabic
                  ? "اختياري: سيتم تنفيذ التخصيص مباشرة بعد إنشاء المقبوض."
                  : "Optional: allocation runs automatically right after the receipt is created."}
              </div>

              <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
                <div className="space-y-4">
                  <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                    <Field label={t("salesReceivables.field.linkedInvoice")} labelAlign={isArabic ? "end" : "start"}>
                      <Select
                        value={editor.allocationInvoiceId}
                        disabled={lockCustomerAndInvoice}
                        onChange={(event) => {
                          const nextInvoice = openInvoices.find((row) => row.id === event.target.value) ?? null;
                          onChange({
                            ...editor,
                            allocationInvoiceId: event.target.value,
                            allocationAmount:
                              nextInvoice && Number(editor.amount || 0) > 0
                                ? String(Math.min(Number(editor.amount || 0), Number(nextInvoice.outstandingAmount || 0)))
                                : "",
                          });
                        }}
                        className={cn("h-12 border-slate-200 bg-white", isArabic && "text-right")}
                      >
                        <option value="">{t("salesReceivables.empty.selectOpenInvoice")}</option>
                        {openInvoices.map((invoice) => (
                          <option key={invoice.id} value={invoice.id}>
                            {invoice.reference} · {invoice.customer.code} · {invoice.customer.name}
                          </option>
                        ))}
                      </Select>
                    </Field>

                    <Field label={t("salesReceivables.field.allocationAmount")} labelAlign={isArabic ? "end" : "start"}>
                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={editor.allocationAmount}
                        onChange={(event) => onChange({ ...editor, allocationAmount: event.target.value })}
                        className={cn("h-12 border-slate-200 bg-white", isArabic && "text-right")}
                      />
                    </Field>
                  </div>

                  {lockCustomerAndInvoice && selectedInvoice ? (
                    <div className={cn("rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800", isArabic ? "text-right" : "text-left")}>
                      {isArabic
                        ? "تم ربط هذا المقبوض بهذه الفاتورة تلقائيًا. يمكنك تعديل مبلغ المقبوض أو مبلغ التخصيص بشرط ألا يتجاوز المتبقي على الفاتورة."
                        : "This receipt is linked to the selected invoice. You can reduce the receipt or allocation amount, but it cannot exceed the invoice outstanding balance."}
                    </div>
                  ) : null}

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
                      <div className="text-sm font-bold text-slate-500">{t("salesReceivables.field.currentOutstandingBalance")}</div>
                      <div className="mt-2 text-2xl font-black text-slate-900">
                        {formatCurrency(selectedInvoice ? Number(selectedInvoice.outstandingAmount) : 0)}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {selectedInvoice
                          ? `${selectedInvoice.reference} · ${selectedInvoice.customer.name}`
                          : t("salesReceivables.empty.selectOpenInvoice")}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 px-5 py-4">
                      <div className="text-sm font-bold text-emerald-700">
                        {isArabic ? "المبلغ المقترح للتخصيص" : "Suggested allocation"}
                      </div>
                      <div className="mt-2 text-2xl font-black text-emerald-700">{formatCurrency(suggestedAllocationAmount)}</div>
                      <div className="mt-1 text-xs text-emerald-700/80">
                        {isArabic
                          ? "يعتمد على الأقل بين مبلغ المقبوض والمتبقي على الفاتورة."
                          : "Based on the lower value between the receipt and invoice outstanding balance."}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4">
                  <div className="rounded-[1.75rem] border border-emerald-200 bg-emerald-50/80 p-5 shadow-[0_10px_24px_rgba(16,185,129,0.08)]">
                    <div className="text-sm font-bold text-emerald-700">{t("salesReceivables.field.amount")}</div>
                    <div className="mt-2 text-3xl font-black text-emerald-700">
                      {formatCurrency(Number.isFinite(amount) ? amount : 0)}
                    </div>
                  </div>

                  <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5">
                    <div className="text-sm font-bold text-slate-500">{t("salesReceivables.field.bankCashAccount")}</div>
                    <div className="mt-2 text-lg font-black text-slate-900">
                      {selectedBankCashAccount?.name || "—"}
                    </div>
                  </div>
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
              {t("salesReceivables.action.createReceipt")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
