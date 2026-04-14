import { type AccountOption, type BankCashAccountType, BANK_CASH_ACCOUNT_TYPES } from "@/types/api";
import { Button, SidePanel } from "@/components/ui";
import { useTranslation } from "@/lib/i18n";

import type { EditorState } from "../bank-cash-accounts.types";

export function BankCashAccountEditor({
  isOpen,
  editor,
  postingAccounts,
  errorMessage,
  isSubmitting,
  onClose,
  onSubmit,
  onChange,
}: {
  isOpen: boolean;
  editor: EditorState;
  postingAccounts: AccountOption[];
  errorMessage: string | null;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: () => void;
  onChange: (next: EditorState) => void;
}) {
  const { t } = useTranslation();

  return (
    <SidePanel
      isOpen={isOpen}
      onClose={onClose}
      title={editor.id ? t("bankCash.form.editTitle") : t("bankCash.form.createTitle")}
    >
      <div className="space-y-5">
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">
            {t("bankCash.form.type")}
          </label>
          <select
            value={editor.type}
            onChange={(event) => onChange({ ...editor, type: event.target.value as BankCashAccountType })}
            className="w-full rounded-xl border border-gray-200 bg-gray-100 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
          >
            {BANK_CASH_ACCOUNT_TYPES.map((type) => (
              <option key={type} value={type}>
                {t(`bankCash.type.${type}`)}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-gray-500">{t("bankCash.form.typeHelp")}</p>
        </div>

        <Field label={t("bankCash.form.name")} value={editor.name} onChange={(value) => onChange({ ...editor, name: value })} />
        <Field
          label={t("bankCash.form.bankName")}
          value={editor.bankName}
          onChange={(value) => onChange({ ...editor, bankName: value })}
          hint={t("bankCash.form.bankNameHelp")}
        />
        <Field
          label={t("bankCash.form.accountNumber")}
          value={editor.accountNumber}
          onChange={(value) => onChange({ ...editor, accountNumber: value })}
          hint={t("bankCash.form.accountNumberHelp")}
        />
        <Field
          label={t("bankCash.form.currency")}
          value={editor.currencyCode}
          onChange={(value) => onChange({ ...editor, currencyCode: value.toUpperCase() })}
        />

        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">
            {t("bankCash.form.linkedAccount")}
          </label>
          <select
            value={editor.accountId}
            onChange={(event) => {
              const selected = postingAccounts.find((item) => item.id === event.target.value);
              onChange({
                ...editor,
                accountId: event.target.value,
                currencyCode: selected?.currencyCode ?? editor.currencyCode,
              });
            }}
            className="w-full rounded-xl border border-gray-200 bg-gray-100 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
          >
            <option value="">{t("bankCash.form.linkedAccountPlaceholder")}</option>
            {postingAccounts.map((option) => (
              <option key={option.id} value={option.id}>
                {option.code} · {option.name}
              </option>
            ))}
          </select>
        </div>

        {errorMessage ? (
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}

        <div className="flex items-center justify-end gap-3 pt-4">
          <Button variant="secondary" onClick={onClose}>
            {t("bankCash.form.cancel")}
          </Button>
          <Button onClick={onSubmit} disabled={isSubmitting}>
            {editor.id ? t("bankCash.form.save") : t("bankCash.form.create")}
          </Button>
        </div>
      </div>
    </SidePanel>
  );
}

function Field({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">{label}</label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-gray-200 bg-gray-100 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
      />
      {hint ? <p className="mt-1.5 text-xs text-gray-500">{hint}</p> : null}
    </div>
  );
}
