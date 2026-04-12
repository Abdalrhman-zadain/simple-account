"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ArrowLeft, Loader2, Save, X, BookOpen, Info, Link2 } from "lucide-react";

import {
  createAccount,
  getAccountById,
  updateAccount,
} from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { ACCOUNT_TYPES, AccountType } from "@/types/api";
import { Card, SectionHeading, Button } from "@/components/ui";
import { Field, Input, Select, Textarea } from "@/components/forms";
import { cn } from "@/lib/utils";

// ─── Schema ────────────────────────────────────────────────────────────────────

const formSchema = z.object({
  name: z.string().min(1, "Name is required.").max(120),
  nameAr: z.string().max(120).optional(),
  description: z.string().max(500).optional(),
  type: z.enum(ACCOUNT_TYPES, { message: "Type is required." }),
  accountKind: z.enum(["posting", "header"]).default("posting"),
  isPosting: z.boolean().default(true),
  allowManualPosting: z.boolean().default(true),
  parentAccountId: z.string().optional().or(z.literal("")),
});

type FormValues = z.infer<typeof formSchema>;

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

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      nameAr: "",
      description: "",
      type: "ASSET",
      accountKind: "posting",
      isPosting: true,
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
      form.setValue("accountKind", "posting");
      form.setValue("isPosting", true);
    }
  }, [searchParams, isEdit, form]);

  const watchedKind = form.watch("accountKind");
  const watchedType = form.watch("type") as AccountType;
  const watchedParentId = form.watch("parentAccountId");
  const watchedAllowManual = form.watch("allowManualPosting");

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
        accountKind: d.isPosting ? "posting" : "header",
        isPosting: d.isPosting,
        allowManualPosting: d.allowManualPosting ?? true,
        parentAccountId: d.parentAccountId || "",
      });
    }
  }, [accountQuery.data, form]);

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const { accountKind, ...rest } = values;
      const payload = {
        ...rest,
        isPosting: accountKind === "posting",
        nameAr: rest.nameAr || undefined,
        description: rest.description || undefined,
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
      router.push("/accounts");
    },
  });

  if (isEdit && accountQuery.isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-zinc-500">
        <Loader2 className="mb-4 h-8 w-8 animate-spin text-teal-500" />
        <p>Loading account details…</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400 shrink-0">
            <BookOpen className="h-6 w-6" />
          </div>
          <SectionHeading
            title={isEdit ? `Edit Account` : "New Account"}
            description={
              isEdit
                ? `Editing "${accountQuery.data?.code} — ${accountQuery.data?.name}"`
                : "Add a new entry to your Chart of Accounts."
            }
          />
        </div>
        <Link href="/accounts">
          <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white">
            <X className="mr-2 h-4 w-4" /> Cancel
          </Button>
        </Link>
      </div>

      {/* Parent account context chip */}
      {watchedParentId && !isEdit && (
        <div className="flex items-center gap-3 rounded-2xl border border-teal-500/20 bg-teal-500/5 px-4 py-3">
          <Link2 className="h-4 w-4 shrink-0 text-teal-400" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-teal-300 uppercase tracking-wide mb-0.5">Adding child under</p>
            {parentQuery.isLoading ? (
              <span className="text-sm text-zinc-500 animate-pulse">Loading parent…</span>
            ) : parentQuery.data ? (
              <span className="text-sm font-bold text-white">
                <span className="font-mono text-zinc-400 mr-2">{parentQuery.data.code}</span>
                {parentQuery.data.name}
              </span>
            ) : (
              <span className="text-sm font-mono text-zinc-400">{watchedParentId}</span>
            )}
          </div>
          <button
            onClick={() => form.setValue("parentAccountId", "")}
            className="shrink-0 p-1 rounded-lg text-zinc-500 hover:text-white hover:bg-white/10 transition-colors"
            title="Remove parent"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <Card className="max-w-3xl bg-panel/40 border-white/5 backdrop-blur-xl p-0 shadow-2xl overflow-hidden">
        <form
          onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
        >

          {/* ── Section 1: Account Category ──────────────────────── */}
          <div className="p-8 space-y-5">
            <SectionLabel icon="🏷️">Account Category</SectionLabel>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Account Type" error={form.formState.errors.type?.message}>
                <Select {...form.register("type")}>
                  {ACCOUNT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {formatAccountType(type)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Account Role">
                <Select
                  value={form.watch("accountKind")}
                  onChange={(event) => {
                    const nextKind = event.target.value as "posting" | "header";
                    form.setValue("accountKind", nextKind);
                    form.setValue("isPosting", nextKind === "posting");
                  }}
                >
                  <option value="posting">Posting — end node (accepts transactions)</option>
                  <option value="header">Header — parent / grouping account</option>
                </Select>
              </Field>
            </div>

            {/* Live type badge preview */}
            {watchedType && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500">Preview:</span>
                <span className={cn("inline-flex rounded-full border px-3 py-0.5 text-xs font-bold uppercase tracking-wide", TYPE_COLORS[watchedType])}>
                  {formatAccountType(watchedType)}
                </span>
                <span className={cn("inline-flex rounded-full border px-3 py-0.5 text-xs font-medium", watchedKind === "posting" ? "bg-teal-500/10 text-teal-400 border-teal-500/20" : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20")}>
                  {watchedKind === "posting" ? "Posting" : "Header"}
                </span>
              </div>
            )}
          </div>

          <div className="border-t border-white/5" />

          {/* ── Section 2: Names ──────────────────────────────────── */}
          <div className="p-8 space-y-5">
            <SectionLabel icon="📝">Names & Description</SectionLabel>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Account Name (English)" error={form.formState.errors.name?.message}>
                <Input placeholder="e.g. Main Bank Account" {...form.register("name")} />
              </Field>
              <Field label="Arabic Name" hint="Optional — displayed RTL" error={form.formState.errors.nameAr?.message}>
                <Input placeholder="الحساب البنكي الرئيسي" dir="rtl" {...form.register("nameAr")} />
              </Field>
            </div>
            <Field label="Description / Notes" error={form.formState.errors.description?.message}>
              <Textarea
                placeholder="Audit notes, operational scope, or internal commentary…"
                rows={3}
                {...form.register("description")}
              />
            </Field>
          </div>

          <div className="border-t border-white/5" />

          {/* ── Section 3: Settings ───────────────────────────────── */}
          <div className="p-8 space-y-5">
            <SectionLabel icon="⚙️">Posting Settings</SectionLabel>
            <label className="flex items-start gap-3 cursor-pointer rounded-2xl border border-white/5 bg-white/[0.02] p-4 hover:bg-white/[0.04] transition-colors">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 shrink-0 rounded accent-teal-500 cursor-pointer"
                checked={watchedAllowManual}
                onChange={(e) => form.setValue("allowManualPosting", e.target.checked)}
              />
              <div>
                <span className="text-sm font-semibold text-zinc-200">Allow manual journal entries</span>
                <p className="mt-0.5 text-xs text-zinc-500 leading-relaxed">
                  When enabled, users can debit/credit this account directly in Journal Entries.
                  Disable for system-controlled accounts (e.g. retained earnings, tax payable).
                </p>
              </div>
            </label>
            {!watchedAllowManual && (
              <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/8 px-4 py-3">
                <Info className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                <p className="text-xs text-amber-300">
                  Manual posting is disabled. This account can only be updated via automated system rules.
                </p>
              </div>
            )}
          </div>

          {/* ── Error ──────────────────────────────────────────────── */}
          {mutation.isError && (
            <div className="mx-8 mb-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {(mutation.error as Error).message || "Failed to save account."}
            </div>
          )}

          {/* ── Actions ────────────────────────────────────────────── */}
          <div className="flex flex-col gap-3 sm:flex-row-reverse sm:items-center px-8 pb-8 pt-0">
            <Button type="submit" disabled={mutation.isPending} className="px-10 h-11 shadow-lg shadow-teal-500/20">
              {mutation.isPending
                ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                : <Save className="mr-2 h-4 w-4" />}
              {isEdit ? "Save Changes" : "Create Account"}
            </Button>
            <Link
              href="/accounts"
              className="inline-flex items-center justify-center gap-2 text-sm font-medium text-zinc-400 hover:text-white px-6 h-11 transition rounded-full hover:bg-white/5"
            >
              <ArrowLeft className="h-4 w-4" />
              Cancel
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
}

function SectionLabel({ children, icon }: { children: React.ReactNode; icon?: string }) {
  return (
    <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-zinc-400 border-b border-white/5 pb-3">
      {icon && <span className="text-sm">{icon}</span>}
      {children}
    </h3>
  );
}

function formatAccountType(type: AccountType) {
  return type.charAt(0) + type.slice(1).toLowerCase();
}
