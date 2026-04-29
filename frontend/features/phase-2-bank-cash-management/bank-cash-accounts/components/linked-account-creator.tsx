"use client";

import { useEffect, useMemo, useState } from "react";
import { LuChevronDown, LuX } from "react-icons/lu";

import type {
  CreateLinkedBankCashAccountPayload,
  LinkedBankCashAccountCreationMode,
} from "@/types/api";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type LinkedAccountParentOption = {
  id: string;
  code: string;
  name: string;
  depth: number;
};

export function LinkedAccountCreator({
  isOpen,
  initialChildName,
  currencyCode,
  parentOptions,
  isSubmitting,
  errorMessage,
  onClose,
  onCreate,
}: {
  isOpen: boolean;
  initialChildName: string;
  currencyCode: string;
  parentOptions: LinkedAccountParentOption[];
  isSubmitting: boolean;
  errorMessage: string | null;
  onClose: () => void;
  onCreate: (payload: CreateLinkedBankCashAccountPayload) => void;
}) {
  const { t } = useTranslation();
  const fieldLabelClassName = "mb-2 block text-right text-[0.95rem] font-bold leading-tight text-black sm:text-[1.05rem] arabic-heading";
  const fieldInputClassName =
    "h-[3.35rem] w-full rounded-[1rem] border border-[#b7b7b7] bg-white px-4 text-right text-[0.98rem] font-medium text-[#101010] outline-none transition placeholder:font-medium placeholder:text-[#8a919d] focus:border-black sm:text-[1.02rem] arabic-auto arabic-placeholder";
  const [mode, setMode] = useState<LinkedBankCashAccountCreationMode>("create_parent_and_child");
  const [childName, setChildName] = useState("");
  const [childNameAr, setChildNameAr] = useState("");
  const [parentName, setParentName] = useState("");
  const [parentNameAr, setParentNameAr] = useState("");
  const [existingParentAccountId, setExistingParentAccountId] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setMode("create_parent_and_child");
      setChildName("");
      setChildNameAr("");
      setParentName("");
      setParentNameAr("");
      setExistingParentAccountId("");
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setChildName((current) => (current.trim() ? current : initialChildName.trim()));
  }, [initialChildName, isOpen]);

  const canSubmit = useMemo(() => {
    if (!childName.trim() || !currencyCode.trim()) {
      return false;
    }

    if (mode === "create_parent_and_child") {
      return Boolean(parentName.trim());
    }

    return Boolean(existingParentAccountId);
  }, [childName, currencyCode, existingParentAccountId, mode, parentName]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/92 px-6 py-8 backdrop-blur-sm">
      <div className="w-full max-w-[34rem] rounded-[1.5rem] border border-[#d9d9d9] bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="text-right">
            <h3 className="text-[1.45rem] font-black tracking-tight text-black sm:text-[1.65rem] arabic-heading">
              {t("bankCash.form.linkedAccountCreate.title")}
            </h3>
            <p className="mt-1 text-right text-[0.98rem] text-[#5f6672] sm:text-[1rem] arabic-muted">
              {t("bankCash.form.linkedAccountCreate.description")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-[#6d6d6d] transition hover:bg-[#f5f5f5] hover:text-black"
          >
            <LuX className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 text-right">
          <div>
            <label className={fieldLabelClassName}>{t("bankCash.form.linkedAccountCreate.childNameLabel")}</label>
            <input
              value={childName}
              onChange={(event) => setChildName(event.target.value)}
              placeholder={t("bankCash.form.linkedAccountCreate.childNamePlaceholder")}
              className={fieldInputClassName}
            />
          </div>

          <div>
            <label className={fieldLabelClassName}>{t("bankCash.form.linkedAccountCreate.childNameArLabel")}</label>
            <input
              dir="rtl"
              value={childNameAr}
              onChange={(event) => setChildNameAr(event.target.value)}
              placeholder={t("bankCash.form.linkedAccountCreate.childNameArPlaceholder")}
              className={fieldInputClassName}
            />
          </div>

          <div className="grid gap-3">
            <ModeCard
              title={t("bankCash.form.linkedAccountCreate.modeNewParent")}
              description={t("bankCash.form.linkedAccountCreate.modeNewParentHelp")}
              active={mode === "create_parent_and_child"}
              onClick={() => setMode("create_parent_and_child")}
            />
            <ModeCard
              title={t("bankCash.form.linkedAccountCreate.modeExistingParent")}
              description={t("bankCash.form.linkedAccountCreate.modeExistingParentHelp")}
              active={mode === "create_child_under_existing_parent"}
              onClick={() => setMode("create_child_under_existing_parent")}
            />
          </div>

          {mode === "create_parent_and_child" ? (
            <div className="space-y-5">
              <div>
                <label className={fieldLabelClassName}>{t("bankCash.form.linkedAccountCreate.parentNameLabel")}</label>
                <input
                  value={parentName}
                  onChange={(event) => setParentName(event.target.value)}
                  placeholder={t("bankCash.form.linkedAccountCreate.parentNamePlaceholder")}
                  className={fieldInputClassName}
                />
              </div>
              <div>
                <label className={fieldLabelClassName}>{t("bankCash.form.linkedAccountCreate.parentNameArLabel")}</label>
                <input
                  dir="rtl"
                  value={parentNameAr}
                  onChange={(event) => setParentNameAr(event.target.value)}
                  placeholder={t("bankCash.form.linkedAccountCreate.parentNameArPlaceholder")}
                  className={fieldInputClassName}
                />
              </div>
            </div>
          ) : (
            <div>
              <label className={fieldLabelClassName}>{t("bankCash.form.linkedAccountCreate.existingParentLabel")}</label>
              <div className="relative">
                <select
                  value={existingParentAccountId}
                  onChange={(event) => setExistingParentAccountId(event.target.value)}
                  className={cn(`${fieldInputClassName} appearance-none pl-12 arabic-option`, !existingParentAccountId && "text-[#9d9d9d]")}
                >
                  <option value="">{t("bankCash.form.linkedAccountCreate.existingParentPlaceholder")}</option>
                  {parentOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {`${"— ".repeat(option.depth)}${option.name} - ${option.code}`}
                    </option>
                  ))}
                </select>
                <LuChevronDown className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#9d9d9d]" />
              </div>
            </div>
          )}

          {errorMessage ? (
            <div className="rounded-[1rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 arabic-auto">
              {errorMessage}
            </div>
          ) : null}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="h-[3.2rem] flex-1 rounded-[1rem] border border-[#cfcfcf] bg-white px-4 text-sm font-bold text-black transition hover:bg-[#f7f7f7]"
            >
              {t("bankCash.form.cancel")}
            </button>
            <button
              type="button"
              disabled={!canSubmit || isSubmitting}
              onClick={() =>
                onCreate({
                  mode,
                  currencyCode,
                  childName: childName.trim(),
                  childNameAr: childNameAr.trim() || undefined,
                  parentName: mode === "create_parent_and_child" ? parentName.trim() : undefined,
                  parentNameAr: mode === "create_parent_and_child" ? parentNameAr.trim() || undefined : undefined,
                  existingParentAccountId:
                    mode === "create_child_under_existing_parent" ? existingParentAccountId : undefined,
                })
              }
              className="h-[3.2rem] flex-[1.3] rounded-[1rem] bg-[#17a34a] px-4 text-sm font-bold text-white transition hover:bg-[#149141] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {t("bankCash.form.linkedAccountCreate.submit")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ModeCard({
  title,
  description,
  active,
  onClick,
}: {
  title: string;
  description: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-[1rem] border px-4 py-3 text-right transition",
        active ? "border-[#17a34a] bg-[#eef9f1]" : "border-[#dedede] bg-white hover:bg-[#fafafa]",
      )}
    >
      <div className="text-[0.98rem] font-bold text-black sm:text-[1rem] arabic-heading">{title}</div>
      <div className="mt-1 text-[0.92rem] leading-7 text-[#5f6672] sm:text-[0.97rem] arabic-muted">{description}</div>
    </button>
  );
}
