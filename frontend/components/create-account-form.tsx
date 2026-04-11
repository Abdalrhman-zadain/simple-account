"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ArrowLeft, Loader2, Save, X, BookOpen } from "lucide-react";

import {
  createAccount,
  getAccountById,
  getNextAccountCode,
  updateAccount,
} from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { ACCOUNT_TYPES } from "@/types/api";
import { Card, SectionHeading, Button } from "@/components/ui";
import { Field, Input, Textarea } from "@/components/forms";

// ─── Schema ────────────────────────────────────────────────────────────────────

const formSchema = z.object({
  code: z.string().max(32).regex(/^[A-Za-z0-9._-]*$/).optional(),
  name: z.string().min(1, "Name is required.").max(120),
  nameAr: z.string().max(120).optional(),
  description: z.string().max(500).optional(),
  isPosting: z.boolean().default(true),
  allowManualPosting: z.boolean().default(true),
  parentAccountId: z.string().optional().or(z.literal("")),
});

type FormValues = z.infer<typeof formSchema>;

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
      code: "",
      name: "",
      nameAr: "",
      description: "",
      isPosting: true,
      allowManualPosting: true,
      parentAccountId: "",
    },
  });

  // Pre-fill parentAccountId from search params if creating new
  useEffect(() => {
    const parentId = searchParams.get("parentAccountId");
    if (parentId && !isEdit) {
      form.setValue("parentAccountId", parentId);
    }
  }, [searchParams, isEdit, form]);

  // Auto-generate next code when parent changes
  const watchedParent = form.watch("parentAccountId");
  useEffect(() => {
    if (isEdit) return;

    const fetchNextCode = async () => {
      try {
        const nextCode = await getNextAccountCode(watchedParent || null, token);
        form.setValue("code", nextCode);
      } catch (err) {
        console.error("Failed to fetch next code:", err);
      }
    };

    fetchNextCode();
  }, [watchedParent, isEdit, token, form]);

  const accountQuery = useQuery({
    queryKey: ["account", accountId, token],
    queryFn: () => getAccountById(accountId!, token),
    enabled: isEdit,
  });

  useEffect(() => {
    if (accountQuery.data) {
      const d = accountQuery.data;
      form.reset({
        code: d.code,
        name: d.name,
        nameAr: d.nameAr || "",
        description: d.description || "",
        isPosting: d.isPosting,
        allowManualPosting: d.allowManualPosting ?? true,
        parentAccountId: d.parentAccountId || "",
      });
    }
  }, [accountQuery.data, form]);

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = {
        ...values,
        code: values.code || undefined,
        nameAr: values.nameAr || undefined,
        description: values.description || undefined,
        parentAccountId: values.parentAccountId || undefined,
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
        Loading account...
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
            <BookOpen className="h-6 w-6" />
          </div>
          <SectionHeading
            title={isEdit ? `Edit Account: ${accountQuery.data?.code}` : "New Account"}
            description={isEdit
              ? `Editing ${accountQuery.data?.name}`
              : "Create a new account in the Chart of Accounts."
            }
          />
        </div>
        <Link href="/accounts">
          <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white">
            <X className="mr-2 h-4 w-4" /> Cancel
          </Button>
        </Link>
      </div>

      <Card className="max-w-3xl bg-panel/40 border-white/5 backdrop-blur-xl p-8 shadow-2xl">
        <form
          className="space-y-8"
          onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
        >
          {/* Section 1: Basic Information */}
          <div className="space-y-5">
            <SectionLabel>Account Information</SectionLabel>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Account Code" hint="Auto-generated based on hierarchy" error={form.formState.errors.code?.message}>
                <Input placeholder="e.g. 1101" {...form.register("code")} />
              </Field>
              <Field label="Account Name" error={form.formState.errors.name?.message}>
                <Input placeholder="e.g. Main Bank Account" {...form.register("name")} />
              </Field>
            </div>
            <Field label="Arabic Name" hint="Optional — displayed RTL" error={form.formState.errors.nameAr?.message}>
              <Input placeholder="الحساب البنكي الرئيسي" dir="rtl" {...form.register("nameAr")} />
            </Field>
            <Field label="Description / Notes" error={form.formState.errors.description?.message}>
              <Textarea
                placeholder="Audit notes, operational scope, or internal commentary..."
                rows={3}
                {...form.register("description")}
              />
            </Field>
          </div>

          {/* Error */}
          {mutation.isError && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {(mutation.error as Error).message || "Failed to save account."}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-4 sm:flex-row-reverse sm:items-center sm:justify-start pt-6 border-t border-white/5">
            <Button type="submit" disabled={mutation.isPending} className="px-10 h-11 shadow-lg shadow-teal-500/20">
              {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {isEdit ? "Save Changes" : "Create Account"}
            </Button>
            <Link href="/accounts" className="inline-flex items-center justify-center gap-2 text-sm font-medium text-zinc-400 hover:text-white px-6 h-11 transition">
              <ArrowLeft className="h-4 w-4" />
              Cancel
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 border-b border-white/5 pb-2">
      {children}
    </h3>
  );
}
