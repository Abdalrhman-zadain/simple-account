"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  LuArrowLeftRight as ArrowLeftRight,
  LuCirclePlus as CirclePlus,
  LuInbox as Inbox,
  LuReceiptText as ReceiptText,
  LuSend as Send,
} from "react-icons/lu";

import {
  createPaymentTransaction,
  createReceiptTransaction,
  createTransferTransaction,
  getAccountOptions,
  getBankCashAccounts,
  getBankCashTransactions,
  postBankCashTransaction,
  updateBankCashTransaction,
} from "@/lib/api";
import { useTranslation } from "@/lib/i18n";
import { queryKeys } from "@/lib/query-keys";
import { cn, formatCurrency, formatDate, cleanDisplayName } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import type {
  AccountOption,
  BankCashAccount,
  BankCashTransaction,
  BankCashTransactionKind,
  BankCashTransactionStatus,
} from "@/types/api";
import { Button, Card, SectionHeading, SidePanel, StatusPill } from "@/components/ui";
import { Field, Input, Select, Textarea } from "@/components/ui/forms";

type EditorState = {
  id?: string;
  transactionDate: string;
  amount: string;
  description: string;
  counterpartyName: string;
  bankCashAccountId: string;
  counterAccountId: string;
  sourceBankCashAccountId: string;
  destinationBankCashAccountId: string;
};

const EMPTY_EDITOR: EditorState = {
  transactionDate: new Date().toISOString().slice(0, 10),
  amount: "",
  description: "",
  counterpartyName: "",
  bankCashAccountId: "",
  counterAccountId: "",
  sourceBankCashAccountId: "",
  destinationBankCashAccountId: "",
};

const KIND_ROUTES: Array<{ kind: BankCashTransactionKind; href: string; icon: any }> = [
  { kind: "RECEIPT", href: "/bank-cash-accounts?tab=receipts", icon: Inbox },
  { kind: "PAYMENT", href: "/bank-cash-accounts?tab=payments", icon: Send },
  { kind: "TRANSFER", href: "/bank-cash-accounts?tab=transfers", icon: ArrowLeftRight },
];

export function BankCashTransactionsPage({
  kind,
  showKindTabs = true,
  headerTabs,
}: {
  kind: BankCashTransactionKind;
  showKindTabs?: boolean;
  headerTabs?: ReactNode;
}) {
  const { token } = useAuth();
  const { t, language } = useTranslation();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<BankCashTransactionStatus | "">("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editor, setEditor] = useState<EditorState>(EMPTY_EDITOR);

  const transactionsQuery = useQuery({
    queryKey: queryKeys.bankCashTransactions(token, { kind, status: statusFilter, search }),
    queryFn: () => getBankCashTransactions({ kind, status: statusFilter, search }, token),
  });

  const bankCashAccountsQuery = useQuery({
    queryKey: queryKeys.bankCashAccounts(token, { isActive: "true" }),
    queryFn: () => getBankCashAccounts({ isActive: "true" }, token),
    staleTime: 5 * 60 * 1000,
  });

  const counterAccountsQuery = useQuery({
    queryKey: queryKeys.accounts(token, { isPosting: "true", isActive: "true", view: "selector" }),
    queryFn: () => getAccountOptions({ isPosting: "true", isActive: "true" }, token),
    staleTime: 5 * 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: () => createTransaction(kind, editor, token),
    onSuccess: (created) => {
      void invalidateEverything(queryClient);
      setSelectedId(created.id);
      setEditor(EMPTY_EDITOR);
      setIsEditorOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => updateBankCashTransaction(editor.id!, toUpdatePayload(kind, editor), token),
    onSuccess: (updated) => {
      void invalidateEverything(queryClient);
      setSelectedId(updated.id);
      setIsEditorOpen(false);
    },
  });

  const postMutation = useMutation({
    mutationFn: (id: string) => postBankCashTransaction(id, token),
    onSuccess: (updated) => {
      void invalidateEverything(queryClient);
      setSelectedId(updated.id);
    },
  });

  const rows = transactionsQuery.data ?? [];
  const activeBankCashAccounts = bankCashAccountsQuery.data ?? [];
  const postingAccounts = counterAccountsQuery.data ?? [];
  const selected = rows.find((row) => row.id === selectedId) ?? rows[0] ?? null;
  const selectedBankCashAccountId =
    kind === "TRANSFER" ? editor.sourceBankCashAccountId : editor.bankCashAccountId;

  const filteredCounterAccounts = useMemo(
    () =>
      postingAccounts.filter((account) => {
        const linkedAccountId = activeBankCashAccounts.find((row) => row.id === selectedBankCashAccountId)?.account.id;
        return account.id !== linkedAccountId;
      }),
    [postingAccounts, activeBankCashAccounts, selectedBankCashAccountId],
  );

  const localizeAccountName = (account: { name: string; nameAr?: string | null }) =>
    cleanDisplayName(language === "ar" ? account.nameAr?.trim() || account.name : account.name?.trim() || account.nameAr?.trim() || "");

  const formatPostingAccountLabel = (account: { code: string; name: string; nameAr?: string | null }) =>
    `${localizeAccountName(account)} · ${account.code}`;

  const formatBankCashAccountLabel = (account: BankCashAccount) =>
    `${localizeAccountName(account.account)} · ${account.account.code}`;

  const primaryLabel = (row: BankCashTransaction) => primaryAccountLabel(row, language);
  const secondaryLabel = (row: BankCashTransaction) => secondaryAccountLabel(row, language);
  const textAlign = language === "ar" ? "text-right" : "text-left";

  const totals = useMemo(
    () => ({
      draft: rows.filter((row) => row.status === "DRAFT").length,
      amount: rows.reduce((sum, row) => sum + Number(row.amount), 0),
    }),
    [rows],
  );

  const currentError = createMutation.error ?? updateMutation.error ?? postMutation.error;
  const errorMessage = currentError instanceof Error ? currentError.message : null;

  const openCreate = () => {
    setEditor(EMPTY_EDITOR);
    setIsEditorOpen(true);
  };

  const openEdit = (row: BankCashTransaction) => {
    setEditor({
      id: row.id,
      transactionDate: row.transactionDate.slice(0, 10),
      amount: row.amount,
      description: row.description ?? "",
      counterpartyName: row.counterpartyName ?? "",
      bankCashAccountId: row.bankCashAccount?.id ?? "",
      counterAccountId: row.counterAccount?.id ?? "",
      sourceBankCashAccountId: row.sourceBankCashAccount?.id ?? "",
      destinationBankCashAccountId: row.destinationBankCashAccount?.id ?? "",
    });
    setIsEditorOpen(true);
  };

  const submit = () => {
    if (editor.id) {
      updateMutation.mutate();
      return;
    }
    createMutation.mutate();
  };

  return (
    <div className="space-y-8">
      <SectionHeading
        title={t(transactionTitleKey(kind))}
        description={t(transactionDescriptionKey(kind))}
        action={
          <Button onClick={openCreate}>
            <CirclePlus className="mr-2 h-4 w-4" />
            {t(transactionButtonKey(kind))}
          </Button>
        }
      />

      {headerTabs ? <div className="-mt-4 flex flex-wrap gap-3">{headerTabs}</div> : null}

      {showKindTabs && !headerTabs ? (
        <div className="flex flex-wrap gap-3">
          {KIND_ROUTES.map((item) => {
            const Icon = item.icon;
            const active = item.kind === kind;
            return (
              <Link
                key={item.kind}
                href={item.href}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-bold transition-colors",
                  active ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50",
                )}
              >
                <Icon className="h-4 w-4" />
                {t(transactionTabKey(item.kind))}
              </Link>
            );
          })}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard label={t("bankCashTransactions.summary.total")} value={rows.length} hint={t("bankCashTransactions.summary.rows")} />
        <SummaryCard label={t("bankCashTransactions.summary.draft")} value={totals.draft} hint={t("bankCashTransactions.status.DRAFT")} />
        <SummaryCard label={t("bankCashTransactions.summary.amount")} value={formatCurrency(totals.amount)} hint={t(transactionTabKey(kind))} />
      </div>

      <Card className="p-5">
        <div className="grid gap-4 md:grid-cols-[1.4fr_0.6fr]">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("bankCashTransactions.filters.search")}
          />
          <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as BankCashTransactionStatus | "")}>
            <option value="">{t("bankCashTransactions.filters.allStatuses")}</option>
            <option value="DRAFT">{t("bankCashTransactions.status.DRAFT")}</option>
            <option value="POSTED">{t("bankCashTransactions.status.POSTED")}</option>
          </Select>
        </div>
      </Card>

      {errorMessage ? <Card className="border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{errorMessage}</Card> : null}

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-gray-200 px-6 py-4">
            <div className="text-sm font-bold text-gray-900">{t("bankCashTransactions.table.title")}</div>
            <div className="text-xs text-gray-500">{t("bankCashTransactions.table.description")}</div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className={cn("px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-600", textAlign)}>{t("bankCashTransactions.table.reference")}</th>
                  <th className={cn("px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-600", textAlign)}>{t("bankCashTransactions.table.account")}</th>
                  <th className={cn("px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-600", textAlign)}>{t("bankCashTransactions.table.date")}</th>
                  <th className="px-6 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-gray-600">{t("bankCashTransactions.table.amount")}</th>
                  <th className="px-6 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-gray-600">{t("bankCashTransactions.table.status")}</th>
                  <th className="px-6 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-gray-600">{t("bankCashTransactions.table.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-500">
                      {t("bankCashTransactions.empty")}
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr
                      key={row.id}
                      className={cn(
                        "border-t border-gray-100 transition-colors hover:bg-gray-50",
                        selected?.id === row.id && "bg-gray-50",
                      )}
                    >
                      <td className="px-6 py-4">
                        <button className={textAlign} onClick={() => setSelectedId(row.id)}>
                          <div className="font-bold text-gray-900">{row.reference}</div>
                          <div className="text-xs text-gray-500">{row.journalReference ?? t("bankCashTransactions.table.noJournal")}</div>
                        </button>
                      </td>
                      <td className={cn("px-6 py-4", textAlign)}>
                        <div className="font-semibold text-gray-900">{primaryLabel(row)}</div>
                        <div className="text-xs text-gray-500">{secondaryLabel(row)}</div>
                      </td>
                      <td className="px-6 py-4 text-gray-700">{formatDate(row.transactionDate)}</td>
                      <td className="px-6 py-4 text-right font-mono font-bold text-gray-900">{formatCurrency(row.amount)}</td>
                      <td className="px-6 py-4 text-center">
                        <StatusPill
                          label={t(`bankCashTransactions.status.${row.status}`)}
                          tone={row.status === "POSTED" ? "positive" : "warning"}
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          {row.status === "DRAFT" ? (
                            <>
                              <button
                                className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50"
                                onClick={() => openEdit(row)}
                              >
                                {t("bankCashTransactions.action.edit")}
                              </button>
                              <button
                                className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
                                onClick={() => {
                                  if (window.confirm(t("bankCashTransactions.confirm.post"))) {
                                    postMutation.mutate(row.id);
                                  }
                                }}
                              >
                                {t("bankCashTransactions.action.post")}
                              </button>
                            </>
                          ) : (
                            <button
                              className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50"
                              onClick={() => setSelectedId(row.id)}
                            >
                              {t("bankCashTransactions.action.view")}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="space-y-5">
          <div>
            <div className="text-lg font-bold text-gray-900">{selected?.reference ?? t("bankCashTransactions.details.title")}</div>
            <div className="text-sm text-gray-500">{selected ? t(`bankCashTransactions.kind.${selected.kind}`) : t("bankCashTransactions.details.empty")}</div>
          </div>

          {selected ? (
            <div className="space-y-4 text-sm">
              <DetailRow label={t("bankCashTransactions.table.status")} value={<StatusPill label={t(`bankCashTransactions.status.${selected.status}`)} tone={selected.status === "POSTED" ? "positive" : "warning"} />} />
              <DetailRow label={t("bankCashTransactions.table.amount")} value={<span className="font-mono font-bold text-gray-900">{formatCurrency(selected.amount)}</span>} />
              <DetailRow label={t("bankCashTransactions.table.date")} value={<span className="font-semibold text-gray-900">{formatDate(selected.transactionDate)}</span>} />
              <DetailRow label={t("bankCashTransactions.table.reference")} value={<span className="font-semibold text-gray-900">{selected.reference}</span>} />
              {selected.journalReference ? (
                <DetailRow label={t("bankCashTransactions.details.journal")} value={<span className="font-semibold text-gray-900">{selected.journalReference}</span>} />
              ) : null}
              <DetailRow label={t("bankCashTransactions.details.primary")} value={<span className="font-semibold text-gray-900">{primaryLabel(selected)}</span>} />
              <DetailRow label={t("bankCashTransactions.details.secondary")} value={<span className="font-semibold text-gray-900">{secondaryLabel(selected)}</span>} />
              {selected.counterpartyName ? (
                <DetailRow label={t("bankCashTransactions.form.counterparty")} value={<span className="font-semibold text-gray-900">{selected.counterpartyName}</span>} />
              ) : null}
              <DetailRow label={t("bankCashTransactions.form.description")} value={<span className="text-gray-700">{selected.description || "—"}</span>} />
            </div>
          ) : (
            <div className="text-sm text-gray-500">{t("bankCashTransactions.details.empty")}</div>
          )}
        </Card>
      </div>

      <SidePanel
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        title={editor.id ? t("bankCashTransactions.form.editTitle") : t(transactionButtonKey(kind))}
      >
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-1">
            <Field label={t("bankCashTransactions.form.date")}>
              <Input type="date" value={editor.transactionDate} onChange={(event) => setEditor((current) => ({ ...current, transactionDate: event.target.value }))} />
            </Field>
          </div>

          <Field label={t("bankCashTransactions.form.amount")}>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              value={editor.amount}
              onChange={(event) => setEditor((current) => ({ ...current, amount: event.target.value }))}
            />
          </Field>

          {kind === "TRANSFER" ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Field label={t("bankCashTransactions.form.sourceAccount")}>
                <Select
                  value={editor.sourceBankCashAccountId}
                  onChange={(event) => setEditor((current) => ({ ...current, sourceBankCashAccountId: event.target.value }))}
                >
                  <option value="">{t("bankCashTransactions.form.selectBankCashAccount")}</option>
                  {activeBankCashAccounts.map((row) => (
                    <option key={row.id} value={row.id}>
                      {formatBankCashAccountLabel(row)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t("bankCashTransactions.form.destinationAccount")}>
                <Select
                  value={editor.destinationBankCashAccountId}
                  onChange={(event) => setEditor((current) => ({ ...current, destinationBankCashAccountId: event.target.value }))}
                >
                  <option value="">{t("bankCashTransactions.form.selectBankCashAccount")}</option>
                  {activeBankCashAccounts.map((row) => (
                    <option key={row.id} value={row.id}>
                      {formatBankCashAccountLabel(row)}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label={t("bankCashTransactions.form.bankCashAccount")}>
                  <Select
                    value={editor.bankCashAccountId}
                    onChange={(event) => setEditor((current) => ({ ...current, bankCashAccountId: event.target.value }))}
                  >
                    <option value="">{t("bankCashTransactions.form.selectBankCashAccount")}</option>
                    {activeBankCashAccounts.map((row) => (
                      <option key={row.id} value={row.id}>
                        {formatBankCashAccountLabel(row)}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label={t("bankCashTransactions.form.counterAccount")}>
                  <Select
                    value={editor.counterAccountId}
                    onChange={(event) => setEditor((current) => ({ ...current, counterAccountId: event.target.value }))}
                  >
                    <option value="">{t("bankCashTransactions.form.selectCounterAccount")}</option>
                    {filteredCounterAccounts.map((row) => (
                      <option key={row.id} value={row.id}>
                        {formatPostingAccountLabel(row)}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <Field label={t("bankCashTransactions.form.counterparty")} hint={t(counterpartyHintKey(kind))}>
                <Input
                  value={editor.counterpartyName}
                  onChange={(event) => setEditor((current) => ({ ...current, counterpartyName: event.target.value }))}
                />
              </Field>
            </>
          )}

          <Field label={t("bankCashTransactions.form.description")}>
            <Textarea
              rows={4}
              value={editor.description}
              onChange={(event) => setEditor((current) => ({ ...current, description: event.target.value }))}
            />
          </Field>

          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setIsEditorOpen(false)}>
              {t("bankCashTransactions.form.cancel")}
            </Button>
            <Button onClick={submit} disabled={createMutation.isPending || updateMutation.isPending}>
              <ReceiptText className="mr-2 h-4 w-4" />
              {editor.id ? t("bankCashTransactions.form.save") : t("bankCashTransactions.form.create")}
            </Button>
          </div>
        </div>
      </SidePanel>
    </div>
  );
}

function SummaryCard({ label, value, hint }: { label: string; value: string | number; hint: string }) {
  return (
    <Card className="p-5">
      <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">{label}</div>
      <div className="mt-2 text-2xl font-black text-gray-900">{value}</div>
      <div className="mt-1 text-xs text-gray-500">{hint}</div>
    </Card>
  );
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-3 last:border-b-0 last:pb-0">
      <div className="text-xs font-bold uppercase tracking-[0.15em] text-gray-500">{label}</div>
      <div className="text-right">{value}</div>
    </div>
  );
}

function localizeName(name: string, nameAr: string | null | undefined, language: string) {
  if (language === "ar") {
    return cleanDisplayName(nameAr?.trim() || name);
  }

  return cleanDisplayName(name?.trim() || nameAr?.trim() || "");
}

function primaryAccountLabel(row: BankCashTransaction, language: string) {
  if (row.kind === "TRANSFER") {
    if (row.sourceBankCashAccount) {
      return `${localizeName(row.sourceBankCashAccount.account.name, row.sourceBankCashAccount.account.nameAr, language)} · ${row.sourceBankCashAccount.account.code}`;
    }
    return "—";
  }
  return row.bankCashAccount
    ? `${localizeName(row.bankCashAccount.account.name, row.bankCashAccount.account.nameAr, language)} · ${row.bankCashAccount.account.code}`
    : "—";
}

function secondaryAccountLabel(row: BankCashTransaction, language: string) {
  if (row.kind === "TRANSFER") {
    return row.destinationBankCashAccount
      ? `${localizeName(row.destinationBankCashAccount.account.name, row.destinationBankCashAccount.account.nameAr, language)} · ${row.destinationBankCashAccount.account.code}`
      : "—";
  }
  return row.counterAccount
    ? `${localizeName(row.counterAccount.name, row.counterAccount.nameAr, language)} · ${row.counterAccount.code}`
    : "—";
}

async function createTransaction(kind: BankCashTransactionKind, editor: EditorState, token?: string | null) {
  const amount = Number(editor.amount);
  if (kind === "RECEIPT") {
    return createReceiptTransaction(
      {
        transactionDate: editor.transactionDate,
        amount,
        bankCashAccountId: editor.bankCashAccountId,
        counterAccountId: editor.counterAccountId,
        counterpartyName: editor.counterpartyName || undefined,
        description: editor.description || undefined,
      },
      token,
    );
  }

  if (kind === "PAYMENT") {
    return createPaymentTransaction(
      {
        transactionDate: editor.transactionDate,
        amount,
        bankCashAccountId: editor.bankCashAccountId,
        counterAccountId: editor.counterAccountId,
        counterpartyName: editor.counterpartyName || undefined,
        description: editor.description || undefined,
      },
      token,
    );
  }

  return createTransferTransaction(
    {
      transactionDate: editor.transactionDate,
      amount,
      sourceBankCashAccountId: editor.sourceBankCashAccountId,
      destinationBankCashAccountId: editor.destinationBankCashAccountId,
      description: editor.description || undefined,
    },
    token,
  );
}

function toUpdatePayload(kind: BankCashTransactionKind, editor: EditorState) {
  if (kind === "TRANSFER") {
    return {
      transactionDate: editor.transactionDate,
      amount: Number(editor.amount),
      sourceBankCashAccountId: editor.sourceBankCashAccountId,
      destinationBankCashAccountId: editor.destinationBankCashAccountId,
      description: editor.description || null,
    };
  }

  return {
    transactionDate: editor.transactionDate,
    amount: Number(editor.amount),
    bankCashAccountId: editor.bankCashAccountId,
    counterAccountId: editor.counterAccountId,
    counterpartyName: editor.counterpartyName || null,
    description: editor.description || null,
  };
}

async function invalidateEverything(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["bank-cash-transactions"] }),
    queryClient.invalidateQueries({ queryKey: ["bank-cash-accounts"] }),
  ]);
}

function transactionTitleKey(kind: BankCashTransactionKind) {
  return `bankCashTransactions.title.${kind}`;
}

function transactionDescriptionKey(kind: BankCashTransactionKind) {
  return `bankCashTransactions.description.${kind}`;
}

function transactionButtonKey(kind: BankCashTransactionKind) {
  return `bankCashTransactions.button.${kind}`;
}

function transactionTabKey(kind: BankCashTransactionKind) {
  return `bankCashTransactions.tab.${kind}`;
}

function counterpartyHintKey(kind: BankCashTransactionKind) {
  return kind === "RECEIPT"
    ? "bankCashTransactions.form.counterpartyHint.receipt"
    : "bankCashTransactions.form.counterpartyHint.payment";
}
