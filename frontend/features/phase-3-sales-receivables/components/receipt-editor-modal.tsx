"use client";

import {
  LuCalendarDays as CalendarDays,
  LuFileCheck2 as FileCheck2,
  LuLandmark as Landmark,
  LuSave as Save,
  LuUserRound as UserRound,
  LuWalletCards as WalletCards,
  LuX as X,
} from "react-icons/lu";

import { Button } from "@/components/ui";
import { Field, Input, Select, Textarea } from "@/components/ui/forms";
import { useTranslation } from "@/lib/i18n";
import { cn, formatCurrency } from "@/lib/utils";
import type { BankCashAccount, Customer } from "@/types/api";

type ReceiptEditorValue = {
  reference: string;
  receiptDate: string;
  customerId: string;
  amount: string;
  bankCashAccountId: string;
  description: string;
};

type ReceiptEditorModalProps = {
  isOpen: boolean;
  title: string;
  editor: ReceiptEditorValue;
  customers: Customer[];
  bankCashAccounts: BankCashAccount[];
  isSubmitting: boolean;
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
  isSubmitting,
  onClose,
  onChange,
  onSubmit,
}: ReceiptEditorModalProps) {
  const { t, language } = useTranslation();
  const isArabic = language === "ar";
  const amount = Number(editor.amount || 0);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 p-3 sm:p-6">
      <div className="absolute inset-0 bg-slate-950/35 backdrop-blur-sm" onClick={onClose} />
      <div
        dir={isArabic ? "rtl" : "ltr"}
        className={cn(
          "relative mx-auto flex h-full max-w-[1200px] flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-[#fcfcfb] shadow-[0_30px_80px_rgba(15,23,42,0.18)]",
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
            <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.05)] sm:p-6">
              <div className={cn("mb-5 flex items-center gap-3", isArabic ? "flex-row-reverse text-right" : "text-left")}>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                  <WalletCards className="h-5 w-5" />
                </div>
                <div>
                  <div className={cn("text-lg text-slate-900", isArabic ? "arabic-ui-heading" : "font-extrabold")}>
                    {t("salesReceivables.dialog.newReceipt")}
                  </div>
                  <div className="text-sm text-slate-500">{t("salesReceivables.section.pipelineDescription")}</div>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-[1fr_1.35fr_1fr]">
                <Field label={t("salesReceivables.field.receiptDate")} required labelClassName={isArabic ? "arabic-ui" : undefined}>
                  <div className="relative">
                    <Input
                      type="date"
                      value={editor.receiptDate}
                      onChange={(event) => onChange({ ...editor, receiptDate: event.target.value })}
                      className={cn("border-slate-200 bg-slate-50/70", isArabic ? "arabic-ui pe-12 text-right" : "ps-12")}
                    />
                    <CalendarDays className={cn("pointer-events-none absolute top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400", isArabic ? "left-4" : "right-4")} />
                  </div>
                </Field>

                <Field label={t("salesReceivables.field.customer")} required labelClassName={isArabic ? "arabic-ui" : undefined}>
                  <div className="relative">
                    <Select
                      value={editor.customerId}
                      onChange={(event) => onChange({ ...editor, customerId: event.target.value })}
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
                </Field>

                <Field label={t("salesReceivables.field.amount")} required labelClassName={isArabic ? "arabic-ui" : undefined}>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={editor.amount}
                    onChange={(event) => onChange({ ...editor, amount: event.target.value })}
                    className={cn("border-slate-200 bg-slate-50/70", isArabic && "arabic-ui text-right")}
                  />
                </Field>

              </div>

              <div className="mt-4 grid gap-4 xl:grid-cols-[1.2fr_1fr]">
                <Field label={t("salesReceivables.field.bankCashAccount")} required labelClassName={isArabic ? "arabic-ui" : undefined}>
                  <div className="relative">
                    <Select
                      value={editor.bankCashAccountId}
                      onChange={(event) => onChange({ ...editor, bankCashAccountId: event.target.value })}
                      className={cn("border-slate-200 bg-slate-50/70", isArabic ? "arabic-ui pe-12 text-right" : "ps-12")}
                    >
                      <option value="">{t("salesReceivables.empty.selectBankCashAccount")}</option>
                      {bankCashAccounts.map((row) => (
                        <option key={row.id} value={row.id}>
                          {row.name} · {row.type}
                        </option>
                      ))}
                    </Select>
                    <Landmark className={cn("pointer-events-none absolute top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400", isArabic ? "left-4" : "right-4")} />
                  </div>
                </Field>

                <Field label={t("salesReceivables.field.description")} labelClassName={isArabic ? "arabic-ui" : undefined}>
                  <Textarea
                    rows={3}
                    value={editor.description}
                    onChange={(event) => onChange({ ...editor, description: event.target.value })}
                    className={cn("border-slate-200 bg-slate-50/70", isArabic && "arabic-ui text-right")}
                  />
                </Field>
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
              <div className="rounded-[1.75rem] border border-emerald-200 bg-emerald-50/80 p-5 shadow-[0_10px_24px_rgba(16,185,129,0.08)]">
                <div className="text-sm font-bold text-emerald-700">{t("salesReceivables.field.amount")}</div>
                <div className="mt-2 text-3xl font-black text-emerald-700">
                  {formatCurrency(Number.isFinite(amount) ? amount : 0)}
                </div>
              </div>
              <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5">
                <div className="text-sm font-bold text-slate-500">{t("salesReceivables.field.bankCashAccount")}</div>
                <div className="mt-2 text-lg font-black text-slate-900">
                  {(bankCashAccounts.find((row) => row.id === editor.bankCashAccountId)?.name) || "—"}
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
