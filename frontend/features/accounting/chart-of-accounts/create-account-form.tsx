"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { LuArrowLeft as ArrowLeft, LuLoader as Loader2, LuSave as Save, LuX as X, LuBookOpen as BookOpen, LuInfo as Info, LuLink2 as Link2, LuPlus as Plus } from "react-icons/lu";

import {
  createAccount,
  createAccountSubtype,
  getAccountById,
  getAccountSubtypes,
  updateAccount,
} from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { ACCOUNT_TYPES, AccountSubtype, AccountType } from "@/types/api";
import { Card, SectionHeading, Button } from "@/components/ui";
import { Field, Input, Select, Textarea } from "@/components/forms";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

// ─── Schema ────────────────────────────────────────────────────────────────────

function buildFormSchema(t: (key: string, vars?: Record<string, string | number>) => string) {
  return z.object({
    name: z.string().min(1, t("accounts.form.validation.nameRequired")).max(120),
    nameAr: z.string().max(120).optional(),
    description: z.string().max(500).optional(),
    type: z.enum(ACCOUNT_TYPES, { message: t("accounts.form.validation.typeRequired") }),
    subtype: z.string().max(64).optional(),
    accountKind: z.enum(["posting", "header"]).default("posting"),
    isPosting: z.boolean().default(true),
    allowManualPosting: z.boolean().default(true),
    parentAccountId: z.string().optional().or(z.literal("")),
  });
}

type FormValues = z.infer<ReturnType<typeof buildFormSchema>>;

// ─── Account type colour map ────────────────────────────────────────────────

const TYPE_COLORS: Record<AccountType, string> = {
  ASSET: "bg-sky-500/10 text-sky-300 border-sky-500/20",
  LIABILITY: "bg-amber-500/10 text-amber-300 border-amber-500/20",
  EQUITY: "bg-violet-500/10 text-violet-300 border-violet-500/20",
  REVENUE: "bg-teal-500/10 text-teal-300 border-teal-500/20",
  EXPENSE: "bg-rose-500/10 text-rose-300 border-rose-500/20",
};

// ─── Form Component ────────────────────────────────────────────────────────────

export function CreateAccountForm({ accountId }: { accountId?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const isEdit = Boolean(accountId);
  const { t } = useTranslation();
  const formSchema = buildFormSchema(t);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      nameAr: "",
      description: "",
      type: "ASSET",
      subtype: "",
      accountKind: "header",
      isPosting: false,
      allowManualPosting: true,
      parentAccountId: "",
    },
  });

  // Pre-fill parentAccountId from search params if creating new
  useEffect(() => {
    const parentId = searchParams.get("parentAccountId");
    const mode = searchParams.get("mode");

    if (mode === "parent" && !isEdit) {
      form.setValue("accountKind", "header");
      form.setValue("isPosting", false);
      form.setValue("parentAccountId", "");
    }

    if (parentId && !isEdit) {
      form.setValue("parentAccountId", parentId);
      // Default child behavior is decided after loading the parent account.
    }
  }, [searchParams, isEdit, form]);

  const watchedKind = form.watch("accountKind");
  const watchedType = form.watch("type") as AccountType;
  const watchedSubtype = form.watch("subtype");
  const watchedParentId = form.watch("parentAccountId");
  const watchedAllowManual = form.watch("allowManualPosting");
  const hasParent = Boolean(watchedParentId);

  useEffect(() => {
    if (isEdit) return;
    form.setValue("isPosting", watchedKind === "posting");
  }, [watchedKind, isEdit, form]);

  // Fetch parent account info for the parent chip display
  const parentQuery = useQuery({
    queryKey: ["account", watchedParentId, token],
    queryFn: () => getAccountById(watchedParentId!, token),
    enabled: Boolean(watchedParentId) && !isEdit,
  });

  const didInitChildDefaults = useRef(false);

  // Default child role for numeric hierarchies:
  // - under a 7-digit numeric header with >1 trailing zeros, default to Header (e.g. 5000000 -> 5100000)
  // - otherwise default to Posting
  useEffect(() => {
    if (!hasParent || isEdit) return;
    if (didInitChildDefaults.current) return;
    if (!parentQuery.data?.code) return;

    const code = parentQuery.data.code;
    const isNumeric7 = /^\d{7}$/.test(code);
    const trailingZeros = isNumeric7 ? (code.match(/0+$/)?.[0]?.length ?? 0) : 0;
    const defaultKind = isNumeric7 && trailingZeros > 1 ? "header" : "posting";

    form.setValue("accountKind", defaultKind);
    form.setValue("isPosting", defaultKind === "posting");
    didInitChildDefaults.current = true;
  }, [hasParent, isEdit, parentQuery.data?.code, form]);

  // Enforce parent type in the form: children inherit parent's type and cannot choose another.
  useEffect(() => {
    if (!hasParent) return;
    if (parentQuery.data?.type) {
      form.setValue("type", parentQuery.data.type);
    }
  }, [hasParent, parentQuery.data?.type, form]);

  const accountQuery = useQuery({
    queryKey: ["account", accountId, token],
    queryFn: () => getAccountById(accountId!, token),
    enabled: isEdit,
  });

  useEffect(() => {
    if (accountQuery.data) {
      const d = accountQuery.data;
      form.reset({
        name: d.name,
        nameAr: d.nameAr || "",
        description: d.description || "",
        type: d.type,
        subtype: d.subtype || "",
        accountKind: d.isPosting ? "posting" : "header",
        isPosting: d.isPosting,
        allowManualPosting: d.allowManualPosting ?? true,
        parentAccountId: d.parentAccountId || "",
      });
    }
  }, [accountQuery.data, form]);

  const accountSubtypesQuery = useQuery({
    queryKey: ["account-subtypes", token],
    queryFn: () => getAccountSubtypes(token),
  });

  const [showAddSubtype, setShowAddSubtype] = useState(false);
  const [newSubtypeName, setNewSubtypeName] = useState("");

  const createSubtypeMutation = useMutation({
    mutationFn: async (name: string) => createAccountSubtype({ name }, token),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["account-subtypes"] });
      form.setValue("subtype", created.name);
      setNewSubtypeName("");
      setShowAddSubtype(false);
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const { accountKind, ...rest } = values;
      const payload = {
        ...rest,
        isPosting: accountKind === "posting",
        nameAr: rest.nameAr || undefined,
        description: rest.description || undefined,
        subtype: rest.subtype?.trim() ? rest.subtype.trim() : undefined,
        parentAccountId: rest.parentAccountId || undefined,
      };

      if (isEdit) {
        return updateAccount(accountId!, payload as any, token);
      } else {
        return createAccount(payload as any, token);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["accounts-tree"] });
      const returnParentId = form.getValues("parentAccountId") || "";
      router.push(returnParentId ? `/accounts?parentId=${returnParentId}` : "/accounts");
    },
  });

  if (isEdit && accountQuery.isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-500">
        <Loader2 className="mb-4 h-8 w-8 animate-spin text-teal-500" />
        <p>{t("accounts.form.loadingDetails")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-200 motion-reduce:animate-none">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400 shrink-0">
            <BookOpen className="h-6 w-6" />
          </div>
          <SectionHeading
            title={isEdit ? t("accounts.form.title.edit") : t("accounts.form.title.new")}
            description={
              isEdit
                ? `Editing "${accountQuery.data?.code} — ${accountQuery.data?.name}"`
                : t("accounts.form.description.new")
            }
          />
        </div>
        <Link href="/accounts">
          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-gray-900">
            <X className="mr-2 h-4 w-4" /> {t("common.action.cancel")}
          </Button>
        </Link>
      </div>

      {/* Parent account context chip */}
      {watchedParentId && !isEdit && (
        <div className="flex items-center gap-3 rounded-2xl border border-teal-500/20 bg-teal-500/5 px-4 py-3">
          <Link2 className="h-4 w-4 shrink-0 text-teal-400" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-teal-300 uppercase tracking-wide mb-0.5">{t("accounts.form.parentContext.label")}</p>
            {parentQuery.isLoading ? (
              <span className="text-sm text-gray-500 animate-pulse">{t("accounts.form.parentContext.loading")}</span>
            ) : parentQuery.data ? (
              <span className="text-sm font-bold text-gray-900">
                <span className="font-mono text-gray-400 mr-2">{parentQuery.data.code}</span>
                {parentQuery.data.name}
              </span>
            ) : (
              <span className="text-sm font-mono text-gray-400">{watchedParentId}</span>
            )}
          </div>
          <button
            onClick={() => form.setValue("parentAccountId", "")}
            className="shrink-0 p-1 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            title={t("common.action.remove")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <Card className="max-w-3xl bg-panel/40 border-gray-200  p-0 shadow-2xl overflow-hidden">
        <form
          onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
        >

          {/* ── Section 1: Account Class ─────────────────────────── */}
          <div className="p-8 space-y-5">
            <SectionLabel icon="🏷️">{t("accounts.typeAndClass")}</SectionLabel>
            <div className="grid gap-5 sm:grid-cols-2">
              {hasParent ? (
                <Field label={t("accounts.type")}>
                  <Input value={formatAccountType(watchedType)} disabled />
                </Field>
              ) : (
                <Field label={t("accounts.type")} error={form.formState.errors.type?.message}>
                  <Select {...form.register("type")}>
                    {ACCOUNT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {formatAccountType(type)}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}
              <Field label={t("accounts.role.label")}>
                <Select
                  value={form.watch("accountKind")}
                  onChange={(event) => {
                    const nextKind = event.target.value as "posting" | "header";
                    form.setValue("accountKind", nextKind);
                    form.setValue("isPosting", nextKind === "posting");
                  }}
                >
                  <option value="posting">{t("accounts.role.posting")}</option>
                  <option value="header">{t("accounts.role.header")}</option>
                </Select>
              </Field>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                label={t("accounts.subtype.label")}
                hint={t("accounts.subtype.hint")}
                error={form.formState.errors.subtype?.message}
              >
                <Select
                  value={watchedSubtype || ""}
                  onChange={(e) => form.setValue("subtype", e.target.value)}
                  disabled={accountSubtypesQuery.isLoading}
                >
                  <option value="">— {t("common.none")} —</option>
                  {(accountSubtypesQuery.data ?? [])
                    .filter((s: AccountSubtype) => s.isActive || s.name === watchedSubtype)
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((s: AccountSubtype) => (
                      <option key={s.id} value={s.name}>
                        {s.name}{s.isActive ? "" : ` (${t("common.status.inactive")})`}
                      </option>
                    ))}
                </Select>
              </Field>

              <div className="flex items-end">
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  onClick={() => setShowAddSubtype((v) => !v)}
                >
                  {t("accounts.form.subtype.addToggle")}
                </Button>
              </div>
            </div>

            {showAddSubtype && (
              <div className="rounded-2xl border border-teal-500/20 bg-teal-500/5 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Input
                    placeholder={t("accounts.subtype.placeholder")}
                    value={newSubtypeName}
                    onChange={(e) => setNewSubtypeName(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      disabled={!newSubtypeName.trim() || createSubtypeMutation.isPending}
                      onClick={() => createSubtypeMutation.mutate(newSubtypeName)}
                    >
                      {createSubtypeMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="mr-2 h-4 w-4" />
                      )}
                      {t("accounts.form.subtype.save")}
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => setShowAddSubtype(false)}>
                      {t("common.action.cancel")}
                    </Button>
                  </div>
                </div>
                {createSubtypeMutation.isError && (
                  <div className="mt-2 text-xs text-red-400">
                    {(createSubtypeMutation.error as Error).message || t("accounts.subtype.createError")}
                  </div>
                )}
              </div>
            )}

            {/* Live type badge preview */}
            {watchedType && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">{t("accounts.form.preview")}</span>
                <span className={cn("inline-flex rounded-full border px-3 py-0.5 text-xs font-bold uppercase tracking-wide", TYPE_COLORS[watchedType])}>
                  {formatAccountType(watchedType)}
                </span>
                <span className={cn("inline-flex rounded-full border px-3 py-0.5 text-xs font-medium", watchedKind === "posting" ? "bg-teal-500/10 text-teal-400 border-teal-500/20" : "bg-zinc-500/10 text-gray-400 border-zinc-500/20")}>
                  {watchedKind === "posting" ? t("accounts.role.posting") : t("accounts.role.header")}
                </span>
                {watchedSubtype?.trim() && (
                  <span className="inline-flex rounded-full border px-3 py-0.5 text-xs font-medium bg-gray-100 text-gray-900 border-gray-200">
                    {watchedSubtype.trim()}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="border-t border-gray-200" />

          {/* ── Section 2: Names ──────────────────────────────────── */}
          <div className="p-8 space-y-5">
            <SectionLabel icon="📝">{t("accounts.form.section.names")}</SectionLabel>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label={t("accounts.form.nameEnLabel")} error={form.formState.errors.name?.message}>
                <Input placeholder={t("accounts.form.nameEnPlaceholder")} {...form.register("name")} />
              </Field>
              <Field label={t("accounts.form.nameArLabel")} hint={t("accounts.form.nameArHint")} error={form.formState.errors.nameAr?.message}>
                <Input placeholder={t("accounts.form.nameArPlaceholder")} dir="rtl" {...form.register("nameAr")} />
              </Field>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label={t("accounts.form.descriptionLabel")} error={form.formState.errors.description?.message}>
                <Textarea
                  placeholder={t("accounts.form.descriptionPlaceholder")}
                  rows={3}
                  {...form.register("description")}
                />
              </Field>
            </div>
          </div>

          <div className="border-t border-gray-200" />

          {/* ── Section 3: Settings ───────────────────────────────── */}
          <div className="p-8 space-y-5">
            <SectionLabel icon="⚙️">{t("accounts.form.postingSettings")}</SectionLabel>
            <label className="flex items-start gap-3 cursor-pointer rounded-2xl border border-gray-200 bg-gray-50 p-4 hover:bg-gray-50 transition-colors">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 shrink-0 rounded accent-teal-500 cursor-pointer"
                checked={watchedAllowManual}
                onChange={(e) => form.setValue("allowManualPosting", e.target.checked)}
              />
              <div>
                <span className="text-sm font-semibold text-zinc-200">{t("accounts.form.allowManual.label")}</span>
                <p className="mt-0.5 text-xs text-gray-500 leading-relaxed">
                  {t("accounts.form.allowManual.help")}
                </p>
              </div>
            </label>
            {!watchedAllowManual && (
              <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/8 px-4 py-3">
                <Info className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                <p className="text-xs text-amber-300">
                  {t("accounts.form.allowManual.disabledNote")}
                </p>
              </div>
            )}
          </div>

          {/* ── Error ──────────────────────────────────────────────── */}
          {mutation.isError && (
            <div className="mx-8 mb-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {(mutation.error as Error).message || t("accounts.form.error.saveFailed")}
            </div>
          )}

          {/* ── Actions ────────────────────────────────────────────── */}
          <div className="flex flex-col gap-3 sm:flex-row-reverse sm:items-center px-8 pb-8 pt-0">
            <Button type="submit" disabled={mutation.isPending} className="px-10 h-11 shadow-lg shadow-teal-500/20">
              {mutation.isPending
                ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                : <Save className="mr-2 h-4 w-4" />}
              {isEdit ? t("accounts.form.action.saveChanges") : t("accounts.form.action.create")}
            </Button>
            <Link
              href="/accounts"
              className="inline-flex items-center justify-center gap-2 text-sm font-medium text-gray-400 hover:text-gray-900 px-6 h-11 transition rounded-full hover:bg-gray-100"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("common.action.cancel")}
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
}

function SectionLabel({ children, icon }: { children: React.ReactNode; icon?: string }) {
  return (
    <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400 border-b border-gray-200 pb-3">
      {icon && <span className="text-sm">{icon}</span>}
      {children}
    </h3>
  );
}

function formatAccountType(type: AccountType) {
  return type.charAt(0) + type.slice(1).toLowerCase();
}
