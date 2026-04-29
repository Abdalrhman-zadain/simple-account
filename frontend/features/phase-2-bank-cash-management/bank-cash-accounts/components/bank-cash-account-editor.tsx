import { LuChevronDown, LuChevronRight } from "react-icons/lu";

import { type AccountOption, type BankCashAccountType, type PaymentMethodType } from "@/types/api";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import type { EditorState } from "../bank-cash-accounts.types";
import { LinkedAccountAutocomplete } from "./linked-account-autocomplete";
import { LinkedAccountCreator, type LinkedAccountParentOption } from "./linked-account-creator";

export function BankCashAccountEditor({
  isOpen,
  editor,
  postingAccounts,
  offsetAccounts,
  paymentMethodTypes,
  errorMessage,
  isSubmitting,
  isLinkedAccountCreatorOpen,
  linkedAccountCreatorError,
  linkedAccountParentOptions,
  isCreatingLinkedAccount,
  onClose,
  onSubmit,
  onChange,
  onLinkedAccountCreatorOpen,
  onLinkedAccountCreatorClose,
  onLinkedAccountCreate,
}: {
  isOpen: boolean;
  editor: EditorState;
  postingAccounts: AccountOption[];
  offsetAccounts: AccountOption[];
  paymentMethodTypes: PaymentMethodType[];
  errorMessage: string | null;
  isSubmitting: boolean;
  isLinkedAccountCreatorOpen: boolean;
  linkedAccountCreatorError: string | null;
  linkedAccountParentOptions: LinkedAccountParentOption[];
  isCreatingLinkedAccount: boolean;
  onClose: () => void;
  onSubmit: () => void;
  onChange: (next: EditorState) => void;
  onLinkedAccountCreatorOpen: () => void;
  onLinkedAccountCreatorClose: () => void;
  onLinkedAccountCreate: (payload: {
    mode: "create_parent_and_child" | "create_child_under_existing_parent";
    currencyCode: string;
    childName: string;
    parentName?: string;
    existingParentAccountId?: string;
  }) => void;
}) {
  const { t, language } = useTranslation();
  const isRtl = typeof document !== "undefined" && document.documentElement.dir === "rtl";
  const panelTitle = editor.id ? t("bankCash.form.editTitle") : t("bankCash.form.createTitle");
  const submitLabel = editor.id ? t("bankCash.form.save") : t("bankCash.form.create");
  const linkedAccountSource = editor.bankName.trim();

  const fieldLabelClassName = "mb-2 block text-right text-[0.95rem] font-bold leading-tight text-black sm:text-[1.05rem] arabic-heading";
  const fieldInputClassName =
    "h-[3.6rem] w-full rounded-[1rem] border border-[#b7b7b7] bg-white px-4 text-right text-[0.98rem] font-medium text-[#101010] outline-none transition placeholder:text-[0.94rem] placeholder:font-medium placeholder:text-[#8a919d] focus:border-black disabled:cursor-not-allowed disabled:bg-[#fafafa] disabled:text-[#a5a5a5] sm:text-[1.02rem] arabic-auto arabic-placeholder";

  const handleTypeChange = (nextType: BankCashAccountType) => {
    onChange({
      ...editor,
      type: nextType,
    });
  };

  const localizeAccountName = (account: AccountOption) =>
    language === "ar" ? account.nameAr?.trim() || account.name : account.name?.trim() || account.nameAr?.trim() || "";

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 overflow-hidden transition-opacity duration-300",
        isOpen ? "opacity-100" : "pointer-events-none opacity-0",
      )}
    >
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />

      <div
        className={cn(
          "absolute inset-y-0 h-full w-full max-w-[48rem] bg-white shadow-2xl transition-transform duration-300",
          isRtl ? "left-0" : "right-0",
          isOpen ? "translate-x-0" : isRtl ? "-translate-x-full" : "translate-x-full",
        )}
      >
        <div className="relative flex h-full flex-col bg-white">
          <div className="flex-1 overflow-y-auto px-8 pb-10 pt-3">
            <div className="space-y-6">
              <div className="relative pb-2">
                <button
                  type="button"
                  onClick={onClose}
                  className={cn(
                    "absolute top-1/2 -translate-y-1/2 text-[#6b6b6b] transition hover:text-black",
                    isRtl ? "left-0" : "right-0",
                  )}
                >
                  <span className="sr-only">{t("bankCash.form.cancel")}</span>
                  {isRtl ? (
                    <LuChevronRight className="h-10 w-10" strokeWidth={2.2} />
                  ) : (
                    <LuChevronRight className="h-10 w-10 rotate-180" strokeWidth={2.2} />
                  )}
                </button>
                <h2 className="text-center text-[1.45rem] font-black tracking-tight text-black sm:text-[1.65rem] arabic-heading">
                  {panelTitle}
                </h2>
              </div>

              <SelectField
                label={t("bankCash.form.type")}
                value={editor.type}
                placeholder={t("bankCash.form.typePlaceholder")}
                options={paymentMethodTypes
                  .filter((type) => type.isActive)
                  .map((type) => ({ value: type.name, label: type.name }))}
                onChange={(value) => handleTypeChange(value as BankCashAccountType)}
                labelClassName={fieldLabelClassName}
                selectClassName={fieldInputClassName}
              />

              <Field
                label={t("bankCash.form.bankName")}
                value={editor.bankName}
                onChange={(value) => onChange({ ...editor, bankName: value })}
                disabled={!editor.type}
                labelClassName={fieldLabelClassName}
                inputClassName={fieldInputClassName}
              />

              <Field
                label={t("bankCash.form.currency")}
                value={editor.currencyCode}
                onChange={(value) => onChange({ ...editor, currencyCode: value.toUpperCase() })}
                labelClassName={fieldLabelClassName}
                inputClassName={fieldInputClassName}
              />

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={onLinkedAccountCreatorOpen}
                    className="rounded-full border border-[#c8c8c8] px-3 py-1.5 text-xs font-bold text-[#1f1f1f] transition hover:border-black hover:bg-[#f7f7f7]"
                  >
                    {t("bankCash.form.linkedAccountCreate.button")}
                  </button>
                  <label className={cn(fieldLabelClassName, "mb-0")}>{t("bankCash.form.linkedAccount")}</label>
                </div>
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
                  showHelpText={false}
                  inputClassName={fieldInputClassName}
                  dropdownClassName="rounded-[1.25rem] border border-[#d5d5d5] bg-white p-2 shadow-xl"
                />
                <p className="mt-1.5 text-right text-xs text-[#707887] arabic-muted">
                  {t("bankCash.form.linkedAccountCreate.help")}
                </p>
              </div>

              {!editor.id ? (
                <>
                  <Field
                    label={t("bankCash.form.openingBalance")}
                    value={editor.openingBalance}
                    onChange={(value) => onChange({ ...editor, openingBalance: value })}
                    type="text"
                    inputMode="decimal"
                    numericOnly
                    labelClassName={fieldLabelClassName}
                    inputClassName={fieldInputClassName}
                  />

                  <SelectField
                    label={t("bankCash.form.openingBalanceOffsetAccount")}
                    value={editor.openingBalanceOffsetAccountId}
                    placeholder={t("bankCash.form.openingBalanceOffsetPlaceholder")}
                    options={offsetAccounts.map((account) => ({
                      value: account.id,
                      label: `${localizeAccountName(account)} - ${account.code}`,
                    }))}
                    onChange={(value) => onChange({ ...editor, openingBalanceOffsetAccountId: value })}
                    labelClassName={fieldLabelClassName}
                    selectClassName={fieldInputClassName}
                  />
                </>
              ) : null}

              {errorMessage ? (
                <div className="rounded-[1.15rem] border border-red-200 bg-red-50 px-5 py-4 text-right text-sm text-red-700 arabic-auto">
                  {errorMessage}
                </div>
              ) : null}

              <div className="pt-4">
                <button
                  type="button"
                  onClick={onSubmit}
                  disabled={isSubmitting}
                  className="flex h-[3.9rem] w-full items-center justify-center rounded-[1rem] bg-[#17a34a] px-6 text-[1.05rem] font-bold text-white transition hover:bg-[#149141] disabled:cursor-not-allowed disabled:opacity-60 sm:text-[1.1rem] arabic-auto"
                >
                  {submitLabel}
                </button>
              </div>
            </div>
          </div>

          <LinkedAccountCreator
            isOpen={isLinkedAccountCreatorOpen}
            initialChildName={linkedAccountSource}
            currencyCode={editor.currencyCode}
            parentOptions={linkedAccountParentOptions}
            isSubmitting={isCreatingLinkedAccount}
            errorMessage={linkedAccountCreatorError}
            onClose={onLinkedAccountCreatorClose}
            onCreate={onLinkedAccountCreate}
          />
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  disabled = false,
  type = "text",
  inputMode,
  numericOnly = false,
  labelClassName,
  inputClassName,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  type?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  numericOnly?: boolean;
  labelClassName?: string;
  inputClassName?: string;
}) {
  return (
    <div>
      <label className={labelClassName}>{label}</label>
      <input
        type={type}
        value={value}
        disabled={disabled}
        inputMode={inputMode}
        onChange={(event) => {
          const rawValue = event.target.value;

          if (!numericOnly) {
            onChange(rawValue);
            return;
          }

          const normalizedValue = rawValue.replace(/,/g, ".");
          const [integerPart = "", ...decimalParts] = normalizedValue.split(".");
          const sanitizedInteger = integerPart.replace(/\D/g, "");
          const sanitizedDecimal = decimalParts.join("").replace(/\D/g, "");
          const nextValue =
            decimalParts.length > 0 ? `${sanitizedInteger}.${sanitizedDecimal}` : sanitizedInteger;

          onChange(nextValue);
        }}
        className={inputClassName}
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  placeholder,
  options,
  onChange,
  labelClassName,
  selectClassName,
}: {
  label: string;
  value: string;
  placeholder: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
  labelClassName?: string;
  selectClassName?: string;
}) {
  const isRtl = typeof document !== "undefined" && document.documentElement.dir === "rtl";
  const optionFontFamily = isRtl
    ? '"Noto Naskh Arabic", "Scheherazade New", "Tahoma", "Arial", sans-serif'
    : "inherit";

  return (
    <div>
      <label className={labelClassName}>{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          style={{
            fontFamily: optionFontFamily,
            fontWeight: 600,
            lineHeight: 1.75,
            letterSpacing: 0,
          }}
          className={cn(
            selectClassName,
            "appearance-none pl-16 pr-6 font-medium arabic-auto arabic-placeholder",
            isRtl && "font-arabic text-[1.02rem] leading-8",
            !value && "text-[#9d9d9d]",
          )}
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              style={{
                fontFamily: optionFontFamily,
                fontWeight: 600,
                lineHeight: 1.75,
                letterSpacing: 0,
              }}
            >
              {option.label}
            </option>
          ))}
        </select>
        <LuChevronDown className="pointer-events-none absolute left-5 top-1/2 h-6 w-6 -translate-y-1/2 text-[#a0a0a0]" />
      </div>
    </div>
  );
}
