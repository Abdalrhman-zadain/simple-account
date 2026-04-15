import { useEffect, useMemo, useRef, useState } from "react";

import { type AccountOption, type BankCashAccountType, type PaymentMethodType } from "@/types/api";
import { Button, SidePanel } from "@/components/ui";
import { cn, formatCurrency } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

import type { EditorState } from "../bank-cash-accounts.types";
import { LinkedAccountAutocomplete } from "./linked-account-autocomplete";

export function BankCashAccountEditor({
  isOpen,
  editor,
  postingAccounts,
  paymentMethodTypes,
  errorMessage,
  isSubmitting,
  onClose,
  onSubmit,
  onChange,
}: {
  isOpen: boolean;
  editor: EditorState;
  postingAccounts: AccountOption[];
  paymentMethodTypes: PaymentMethodType[];
  errorMessage: string | null;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: () => void;
  onChange: (next: EditorState) => void;
}) {
  const { t } = useTranslation();

  const handleTypeChange = (nextType: BankCashAccountType) => {
    onChange({
      ...editor,
      type: nextType,
    });
  };

  const accountNumberSuggestions = useMemo(() => {
    const query = editor.accountNumber.trim().toLowerCase();
    if (!query) {
      return [];
    }

    return postingAccounts
      .filter((option) =>
        [option.code, option.name, option.currencyCode].some((field) => field.toLowerCase().includes(query)),
      )
      .slice(0, 8);
  }, [editor.accountNumber, postingAccounts]);

  const selectedPostingAccount = useMemo(
    () => postingAccounts.find((option) => option.id === editor.accountId) ?? null,
    [editor.accountId, postingAccounts],
  );

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
            onChange={(event) => handleTypeChange(event.target.value as BankCashAccountType)}
            className="w-full rounded-xl border border-gray-200 bg-gray-100 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
          >
            <option value="">{t("bankCash.form.typePlaceholder")}</option>
            {paymentMethodTypes
              .filter((type) => type.isActive)
              .map((type) => (
                <option key={type.id} value={type.name}>
                  {type.name}
                </option>
              ))}
          </select>
          <p className="mt-1.5 text-xs text-gray-500">{t("bankCash.form.typeHelp")}</p>
        </div>

        <Field
          label={t("bankCash.form.bankName")}
          value={editor.bankName}
          onChange={(value) => onChange({ ...editor, bankName: value })}
          hint={t("bankCash.form.bankNameHelp")}
          disabled={!editor.type}
        />
        <AccountReferenceAutocomplete
          label={t("bankCash.form.accountNumber")}
          value={editor.accountNumber}
          suggestions={accountNumberSuggestions}
          disabled={!editor.type}
          hint={t("bankCash.form.accountNumberHelp")}
          onChange={(value) => onChange({ ...editor, accountNumber: value })}
          onSelect={(option) =>
            onChange({
              ...editor,
              name: option.name,
              accountId: option.id,
              currencyCode: option.currencyCode,
            })
          }
        />

        {selectedPostingAccount ? (
          <div className="rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3">
            <div className="text-xs font-bold uppercase tracking-wider text-teal-700">
              {t("bankCash.form.linkedAccount")}
            </div>
            <div className="mt-1 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-mono text-xs font-bold text-teal-700">{selectedPostingAccount.code}</div>
                <div className="truncate text-sm font-semibold text-gray-900">{selectedPostingAccount.name}</div>
              </div>
              <button
                type="button"
                onClick={() =>
                  onChange({
                    ...editor,
                    accountId: "",
                    name: "",
                  })
                }
                className={cn(
                  "shrink-0 rounded-lg border border-teal-200 bg-white px-3 py-1.5 text-xs font-bold text-teal-700 transition hover:bg-teal-100",
                )}
              >
                {t("common.action.change")}
              </button>
            </div>
          </div>
        ) : null}

        <Field
          label={t("bankCash.form.currency")}
          value={editor.currencyCode}
          onChange={(value) => onChange({ ...editor, currencyCode: value.toUpperCase() })}
        />

        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">
            {t("bankCash.form.linkedAccount")}
          </label>
          <LinkedAccountAutocomplete
            options={postingAccounts}
            value={editor.accountId}
            onSelect={(selected) =>
              onChange({
                ...editor,
                name: selected.name,
                accountId: selected.id,
                currencyCode: selected.currencyCode,
              })
            }
            placeholder={t("bankCash.form.linkedAccountPlaceholder")}
            helpText={t("bankCash.form.linkedAccountSearchHelp")}
            emptyText={t("bankCash.form.linkedAccountEmpty")}
          />
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
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">{label}</label>
      <input
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-gray-200 bg-gray-100 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500/40 disabled:cursor-not-allowed disabled:opacity-60"
      />
      {hint ? <p className="mt-1.5 text-xs text-gray-500">{hint}</p> : null}
    </div>
  );
}

function AccountReferenceAutocomplete({
  label,
  value,
  suggestions,
  disabled,
  hint,
  onChange,
  onSelect,
}: {
  label: string;
  value: string;
  suggestions: AccountOption[];
  disabled: boolean;
  hint?: string;
  onChange: (value: string) => void;
  onSelect: (option: AccountOption) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  useEffect(() => {
    if (!value.trim()) {
      setIsOpen(false);
    }
  }, [value]);

  return (
    <div ref={containerRef} className="relative">
      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">{label}</label>
      <input
        value={value}
        disabled={disabled}
        onFocus={() => {
          if (value.trim()) {
            setIsOpen(true);
          }
        }}
        onChange={(event) => {
          onChange(event.target.value);
          setIsOpen(Boolean(event.target.value.trim()));
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setIsOpen(false);
          }

          if (event.key === "Enter" && suggestions.length > 0) {
            event.preventDefault();
            onSelect(suggestions[0]);
            setIsOpen(false);
          }
        }}
        className="w-full rounded-xl border border-gray-200 bg-gray-100 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500/40 disabled:cursor-not-allowed disabled:opacity-60"
      />
      {hint ? <p className="mt-1.5 text-xs text-gray-500">{hint}</p> : null}

      {isOpen && suggestions.length > 0 ? (
        <div className="absolute left-0 right-0 top-[calc(100%-0.25rem)] z-30 rounded-2xl border border-gray-200 bg-white p-2 shadow-2xl">
          {suggestions.map((option) => (
            <button
              key={option.id}
              type="button"
              onMouseDown={(event) => {
                event.preventDefault();
                onSelect(option);
                setIsOpen(false);
              }}
              className="flex w-full items-start justify-between gap-4 rounded-xl px-3 py-2.5 text-left transition hover:bg-gray-50"
            >
              <div className="min-w-0">
                <div className="font-mono text-xs font-bold text-teal-600">{option.code}</div>
                <div className="truncate text-sm font-semibold text-gray-900">{option.name}</div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-xs font-bold uppercase tracking-wide text-gray-500">{option.currencyCode}</div>
                <div className="text-xs text-gray-500">{formatCurrency(option.currentBalance)}</div>
              </div>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
