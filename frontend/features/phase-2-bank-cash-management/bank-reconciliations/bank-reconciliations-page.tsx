"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LuBadgeCheck as BadgeCheck, LuCirclePlus as CirclePlus, LuRefreshCw as RefreshCw, LuUnplug as Unplug } from "react-icons/lu";

import {
  completeBankReconciliation,
  createBankReconciliation,
  createBankReconciliationMatch,
  createBankStatementLine,
  deleteBankReconciliationMatch,
  getBankCashAccounts,
  getBankReconciliationById,
  getBankReconciliations,
  importBankStatementLines,
  reconcileBankReconciliationMatch,
} from "@/lib/api";
import { useTranslation } from "@/lib/i18n";
import { queryKeys } from "@/lib/query-keys";
import { cn, formatCurrency, formatDate, cleanDisplayName } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import type {
  BankReconciliation,
  BankReconciliationListItem,
  BankReconciliationStatus,
  CreateBankStatementLinePayload,
} from "@/types/api";
import { Button, Card, SectionHeading, SidePanel, StatusPill } from "@/components/ui";
import { Field, Input, Select, Textarea } from "@/components/ui/forms";

type ReconciliationEditorState = {
  bankCashAccountId: string;
  statementDate: string;
  statementEndingBalance: string;
  notes: string;
};

type StatementLineEditorState = {
  transactionDate: string;
  reference: string;
  description: string;
  debitAmount: string;
  creditAmount: string;
};

const EMPTY_RECONCILIATION: ReconciliationEditorState = {
  bankCashAccountId: "",
  statementDate: new Date().toISOString().slice(0, 10),
  statementEndingBalance: "",
  notes: "",
};

const EMPTY_STATEMENT_LINE: StatementLineEditorState = {
  transactionDate: new Date().toISOString().slice(0, 10),
  reference: "",
  description: "",
  debitAmount: "",
  creditAmount: "",
};

export function BankReconciliationsPage() {
  const { token } = useAuth();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [bankCashAccountId, setBankCashAccountId] = useState("");
  const [statusFilter, setStatusFilter] = useState<BankReconciliationStatus | "">("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedStatementLineId, setSelectedStatementLineId] = useState<string | null>(null);
  const [selectedSystemTransactionId, setSelectedSystemTransactionId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editor, setEditor] = useState<ReconciliationEditorState>(EMPTY_RECONCILIATION);
  const [statementLine, setStatementLine] = useState<StatementLineEditorState>(EMPTY_STATEMENT_LINE);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState<string | null>(null);

  const reconciliationsQuery = useQuery({
    queryKey: queryKeys.bankReconciliations(token, { bankCashAccountId, status: statusFilter }),
    queryFn: () => getBankReconciliations({ bankCashAccountId: bankCashAccountId || undefined, status: statusFilter }, token),
  });

  const bankCashAccountsQuery = useQuery({
    queryKey: queryKeys.bankCashAccounts(token, { isActive: "true" }),
    queryFn: () => getBankCashAccounts({ isActive: "true" }, token),
    staleTime: 5 * 60 * 1000,
  });

  const rows = reconciliationsQuery.data ?? [];
  const activeBankCashAccounts = bankCashAccountsQuery.data ?? [];
  const selectedListItem = rows.find((row) => row.id === selectedId) ?? rows[0] ?? null;
  const activeSelectedId = selectedId ?? selectedListItem?.id ?? null;

  const detailQuery = useQuery({
    queryKey: queryKeys.bankReconciliationById(token, activeSelectedId),
    queryFn: () => getBankReconciliationById(activeSelectedId!, token),
    enabled: Boolean(activeSelectedId),
  });

  const detail = detailQuery.data ?? null;

  const createMutation = useMutation({
    mutationFn: () =>
      createBankReconciliation(
        {
          bankCashAccountId: editor.bankCashAccountId,
          statementDate: editor.statementDate,
          statementEndingBalance: Number(editor.statementEndingBalance),
          notes: editor.notes || undefined,
        },
        token,
      ),
    onSuccess: async (created) => {
      await invalidateReconciliations(queryClient);
      setSelectedId(created.id);
      setEditor(EMPTY_RECONCILIATION);
      setIsCreateOpen(false);
    },
  });

  const addLineMutation = useMutation({
    mutationFn: () => createBankStatementLine(activeSelectedId!, normalizeStatementLine(statementLine), token),
    onSuccess: async () => {
      await invalidateReconciliations(queryClient);
      setStatementLine(EMPTY_STATEMENT_LINE);
    },
  });

  const importMutation = useMutation({
    mutationFn: () => importBankStatementLines(activeSelectedId!, { lines: parseImportRows(importText) }, token),
    onSuccess: async () => {
      await invalidateReconciliations(queryClient);
      setImportText("");
      setImportError(null);
    },
    onError: (error) => {
      setImportError(error instanceof Error ? error.message : t("bankReconciliation.error.parse"));
    },
  });

  const matchMutation = useMutation({
    mutationFn: () =>
      createBankReconciliationMatch(
        activeSelectedId!,
        {
          statementLineId: selectedStatementLineId!,
          ledgerTransactionId: selectedSystemTransactionId!,
        },
        token,
      ),
    onSuccess: async () => {
      await invalidateReconciliations(queryClient);
      setSelectedStatementLineId(null);
      setSelectedSystemTransactionId(null);
    },
  });

  const removeMatchMutation = useMutation({
    mutationFn: ({ matchId }: { matchId: string }) => deleteBankReconciliationMatch(activeSelectedId!, matchId, token),
    onSuccess: async () => {
      await invalidateReconciliations(queryClient);
    },
  });

  const reconcileMutation = useMutation({
    mutationFn: ({ matchId }: { matchId: string }) => reconcileBankReconciliationMatch(activeSelectedId!, matchId, token),
    onSuccess: async () => {
      await invalidateReconciliations(queryClient);
    },
  });

  const completeMutation = useMutation({
    mutationFn: () => completeBankReconciliation(activeSelectedId!, token),
    onSuccess: async () => {
      await invalidateReconciliations(queryClient);
    },
  });

  const currentError =
    createMutation.error ??
    addLineMutation.error ??
    importMutation.error ??
    matchMutation.error ??
    removeMatchMutation.error ??
    reconcileMutation.error ??
    completeMutation.error;

  const unmatchedLines = detail?.statementLines.filter((line) => line.status === "UNMATCHED") ?? [];

  const totals = useMemo(
    () => ({
      reconciliations: rows.length,
      unmatchedLines: rows.reduce((sum, row) => sum + row.summary.unmatchedStatementLineCount, 0),
      difference: rows.reduce((sum, row) => sum + Number(row.statementEndingBalance), 0),
    }),
    [rows],
  );

  return (
    <div className="space-y-8">
      <SectionHeading
        title={t("bankReconciliation.title")}
        description={t("bankReconciliation.description")}
        action={
          <Button onClick={() => setIsCreateOpen(true)}>
            <CirclePlus className="mr-2 h-4 w-4" />
            {t("bankReconciliation.button.new")}
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard label={t("bankReconciliation.summary.reconciliations")} value={totals.reconciliations} />
        <SummaryCard label={t("bankReconciliation.summary.unmatchedLines")} value={totals.unmatchedLines} />
        <SummaryCard label={t("bankReconciliation.summary.difference")} value={formatCurrency(totals.difference)} />
      </div>

      <Card className="p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <Select value={bankCashAccountId} onChange={(event) => setBankCashAccountId(event.target.value)}>
            <option value="">{t("bankReconciliation.filters.allAccounts")}</option>
            {activeBankCashAccounts.map((row) => (
              <option key={row.id} value={row.id}>
                {row.account.code} · {row.name}
              </option>
            ))}
          </Select>
          <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as BankReconciliationStatus | "")}>
            <option value="">{t("bankReconciliation.filters.allStatuses")}</option>
            <option value="DRAFT">{t("bankReconciliation.status.DRAFT")}</option>
            <option value="COMPLETED">{t("bankReconciliation.status.COMPLETED")}</option>
          </Select>
        </div>
      </Card>

      {currentError instanceof Error ? (
        <Card className="border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{currentError.message}</Card>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-gray-200 px-6 py-4">
            <div className="text-sm font-bold text-gray-900">{t("bankReconciliation.list.title")}</div>
          </div>
          <div className="divide-y divide-gray-100">
            {rows.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-gray-500">{t("bankReconciliation.list.empty")}</div>
            ) : (
              rows.map((row) => (
                <button
                  key={row.id}
                  className={cn(
                    "w-full px-6 py-4 text-left transition-colors hover:bg-gray-50",
                    activeSelectedId === row.id && "bg-gray-50",
                  )}
                  onClick={() => {
                    setSelectedId(row.id);
                    setSelectedStatementLineId(null);
                    setSelectedSystemTransactionId(null);
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-bold text-gray-900">{cleanDisplayName(row.bankCashAccount.name)}</div>
                      <div className="text-xs text-gray-500">
                        {row.bankCashAccount.account.code} · {formatDate(row.statementDate)}
                      </div>
                    </div>
                    <StatusPill
                      label={t(`bankReconciliation.status.${row.status}`)}
                      tone={row.status === "COMPLETED" ? "positive" : "warning"}
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">
                    <span>{t("bankReconciliation.list.lines", { count: row.summary.statementLineCount })}</span>
                    <span>{t("bankReconciliation.list.reconciled", { count: row.summary.reconciledCount })}</span>
                    <span className="font-semibold text-gray-700">{formatCurrency(row.statementEndingBalance)}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </Card>

        <Card className="space-y-6">
          {!detail ? (
            <div className="text-sm text-gray-500">{t("bankReconciliation.details.empty")}</div>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-lg font-bold text-gray-900">{cleanDisplayName(detail.bankCashAccount.name)}</div>
                  <div className="text-sm text-gray-500">
                    {detail.bankCashAccount.account.code} · {formatDate(detail.statementDate)}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <StatusPill
                    label={t(`bankReconciliation.status.${detail.status}`)}
                    tone={detail.status === "COMPLETED" ? "positive" : "warning"}
                  />
                  {detail.status === "DRAFT" ? (
                    <Button onClick={() => completeMutation.mutate()} disabled={completeMutation.isPending}>
                      <BadgeCheck className="mr-2 h-4 w-4" />
                      {t("bankReconciliation.matching.complete")}
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-4">
                <MetricCard label={t("bankReconciliation.details.statementBalance")} value={formatCurrency(detail.summary.statementEndingBalance)} />
                <MetricCard label={t("bankReconciliation.details.systemBalance")} value={formatCurrency(detail.summary.systemBalance)} />
                <MetricCard label={t("bankReconciliation.details.difference")} value={formatCurrency(detail.summary.balanceDifference)} />
                <MetricCard label={t("bankReconciliation.details.statementNet")} value={formatCurrency(detail.summary.statementNetAmount)} />
              </div>

              <div className="grid gap-6 xl:grid-cols-2">
                <Card className="space-y-4 border border-gray-200 p-5 shadow-none">
                  <div className="text-sm font-bold text-gray-900">{t("bankReconciliation.statementLines.title")}</div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <Field label={t("bankReconciliation.statementLines.date")}>
                      <Input
                        type="date"
                        value={statementLine.transactionDate}
                        onChange={(event) => setStatementLine((current) => ({ ...current, transactionDate: event.target.value }))}
                      />
                    </Field>
                    <Field label={t("bankReconciliation.statementLines.reference")}>
                      <Input
                        value={statementLine.reference}
                        onChange={(event) => setStatementLine((current) => ({ ...current, reference: event.target.value }))}
                      />
                    </Field>
                    <div className="md:col-span-2">
                      <Field label={t("bankReconciliation.statementLines.description")}>
                        <Input
                          value={statementLine.description}
                          onChange={(event) => setStatementLine((current) => ({ ...current, description: event.target.value }))}
                        />
                      </Field>
                    </div>
                    <Field label={t("bankReconciliation.statementLines.debit")}>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={statementLine.debitAmount}
                        onChange={(event) => setStatementLine((current) => ({ ...current, debitAmount: event.target.value }))}
                      />
                    </Field>
                    <Field label={t("bankReconciliation.statementLines.credit")}>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={statementLine.creditAmount}
                        onChange={(event) => setStatementLine((current) => ({ ...current, creditAmount: event.target.value }))}
                      />
                    </Field>
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={() => addLineMutation.mutate()} disabled={addLineMutation.isPending || detail.status === "COMPLETED"}>
                      <CirclePlus className="mr-2 h-4 w-4" />
                      {t("bankReconciliation.statementLines.add")}
                    </Button>
                  </div>

                  <Field label={t("bankReconciliation.statementLines.import")} hint={t("bankReconciliation.statementLines.importHint")}>
                    <Textarea
                      rows={5}
                      value={importText}
                      placeholder={t("bankReconciliation.import.placeholder")}
                      onChange={(event) => {
                        setImportText(event.target.value);
                        setImportError(null);
                      }}
                    />
                  </Field>
                  {importError ? <div className="text-sm font-semibold text-red-600">{importError}</div> : null}
                  <div className="flex justify-end">
                    <Button variant="secondary" onClick={() => importMutation.mutate()} disabled={importMutation.isPending || detail.status === "COMPLETED"}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      {t("bankReconciliation.statementLines.import")}
                    </Button>
                  </div>
                </Card>

                <Card className="space-y-4 border border-gray-200 p-5 shadow-none">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-bold text-gray-900">{t("bankReconciliation.matching.title")}</div>
                    <Button
                      variant="secondary"
                      onClick={() => matchMutation.mutate()}
                      disabled={!selectedStatementLineId || !selectedSystemTransactionId || detail.status === "COMPLETED"}
                    >
                      <BadgeCheck className="mr-2 h-4 w-4" />
                      {t("bankReconciliation.matching.match")}
                    </Button>
                  </div>
                  <div className="text-sm text-gray-500">
                    {selectedStatementLineId && selectedSystemTransactionId
                      ? t("bankReconciliation.matching.selectedLine")
                      : t("bankReconciliation.matching.noneSelected")}
                  </div>
                  <div className="space-y-3">
                    <div className="text-xs font-bold uppercase tracking-[0.15em] text-gray-500">
                      {t("bankReconciliation.statementLines.unmatched")}
                    </div>
                    {unmatchedLines.length === 0 ? (
                      <div className="text-sm text-gray-500">{t("bankReconciliation.statementLines.empty")}</div>
                    ) : (
                      unmatchedLines.map((line) => (
                        <SelectableRow
                          key={line.id}
                          isActive={selectedStatementLineId === line.id}
                          onClick={() => setSelectedStatementLineId(line.id)}
                          title={`${line.reference || "—"} · ${formatDate(line.transactionDate)}`}
                          subtitle={line.description || "—"}
                          amount={formatCurrency(Number(line.debitAmount) || Number(line.creditAmount))}
                        />
                      ))
                    )}
                  </div>
                  <div className="space-y-3">
                    <div className="text-xs font-bold uppercase tracking-[0.15em] text-gray-500">
                      {t("bankReconciliation.matching.unmatchedSystem")}
                    </div>
                    {detail.unmatchedSystemTransactions.length === 0 ? (
                      <div className="text-sm text-gray-500">{t("bankReconciliation.matching.emptySystem")}</div>
                    ) : (
                      detail.unmatchedSystemTransactions.map((transaction) => (
                        <SelectableRow
                          key={transaction.id}
                          isActive={selectedSystemTransactionId === transaction.id}
                          onClick={() => setSelectedSystemTransactionId(transaction.id)}
                          title={`${transaction.reference} · ${formatDate(transaction.entryDate)}`}
                          subtitle={transaction.description || transaction.journalReference}
                          amount={formatCurrency(Number(transaction.debitAmount) || Number(transaction.creditAmount))}
                        />
                      ))
                    )}
                  </div>
                </Card>
              </div>

              <div className="space-y-4">
                <div className="text-sm font-bold text-gray-900">{t("bankReconciliation.statementLines.title")}</div>
                {detail.statementLines.length === 0 ? (
                  <div className="text-sm text-gray-500">{t("bankReconciliation.statementLines.empty")}</div>
                ) : (
                  detail.statementLines.map((line) => (
                    <Card key={line.id} className="space-y-3 border border-gray-200 p-4 shadow-none">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold text-gray-900">
                            {line.reference || "—"} · {formatDate(line.transactionDate)}
                          </div>
                          <div className="text-sm text-gray-500">{line.description || "—"}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusPill
                            label={t(`bankReconciliation.lineStatus.${line.status}`)}
                            tone={line.status === "RECONCILED" ? "positive" : line.status === "MATCHED" ? "warning" : "neutral"}
                          />
                          <div className="font-mono font-bold text-gray-900">
                            {formatCurrency(Number(line.debitAmount) || Number(line.creditAmount))}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {line.matches.length === 0 ? (
                          <div className="text-sm text-gray-500">{t("bankReconciliation.matching.none")}</div>
                        ) : (
                          line.matches.map((match) => (
                            <div
                              key={match.id}
                              className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-gray-200 bg-gray-50 px-3 py-2"
                            >
                              <div>
                                <div className="text-sm font-semibold text-gray-900">
                                  {match.ledgerTransaction.reference} · {match.ledgerTransaction.journalReference}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {formatDate(match.ledgerTransaction.entryDate)} · {match.ledgerTransaction.description || "—"}
                                </div>
                              </div>
                              <div className="flex gap-2">
                                {!match.isReconciled ? (
                                  <button
                                    className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
                                    onClick={() => reconcileMutation.mutate({ matchId: match.id })}
                                  >
                                    {t("bankReconciliation.matching.reconcile")}
                                  </button>
                                ) : null}
                                <button
                                  className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-100"
                                  onClick={() => removeMatchMutation.mutate({ matchId: match.id })}
                                  disabled={detail.status === "COMPLETED"}
                                >
                                  <Unplug className="mr-1 inline h-3.5 w-3.5" />
                                  {t("bankReconciliation.matching.remove")}
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </>
          )}
        </Card>
      </div>

      <SidePanel isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title={t("bankReconciliation.form.title")}>
        <div className="space-y-5">
          <Field label={t("bankReconciliation.form.account")}>
            <Select
              value={editor.bankCashAccountId}
              onChange={(event) => setEditor((current) => ({ ...current, bankCashAccountId: event.target.value }))}
            >
              <option value="">{t("bankReconciliation.form.selectAccount")}</option>
              {activeBankCashAccounts.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.account.code} · {row.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("bankReconciliation.form.statementDate")}>
            <Input
              type="date"
              value={editor.statementDate}
              onChange={(event) => setEditor((current) => ({ ...current, statementDate: event.target.value }))}
            />
          </Field>
          <Field label={t("bankReconciliation.form.endingBalance")}>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={editor.statementEndingBalance}
              onChange={(event) => setEditor((current) => ({ ...current, statementEndingBalance: event.target.value }))}
            />
          </Field>
          <Field label={t("bankReconciliation.form.notes")}>
            <Textarea rows={4} value={editor.notes} onChange={(event) => setEditor((current) => ({ ...current, notes: event.target.value }))} />
          </Field>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setIsCreateOpen(false)}>
              {t("bankReconciliation.form.cancel")}
            </Button>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
              <CirclePlus className="mr-2 h-4 w-4" />
              {t("bankReconciliation.form.create")}
            </Button>
          </div>
        </div>
      </SidePanel>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="p-5">
      <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">{label}</div>
      <div className="mt-2 text-2xl font-black text-gray-900">{value}</div>
    </Card>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="border border-gray-200 p-4 shadow-none">
      <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-500">{label}</div>
      <div className="mt-2 text-lg font-black text-gray-900">{value}</div>
    </Card>
  );
}

function SelectableRow({
  isActive,
  onClick,
  title,
  subtitle,
  amount,
}: {
  isActive: boolean;
  onClick: () => void;
  title: string;
  subtitle: string;
  amount: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full rounded-md border px-3 py-2 text-left transition-colors",
        isActive ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 bg-white text-gray-900 hover:bg-gray-50",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">{title}</div>
          <div className={cn("text-xs", isActive ? "text-gray-200" : "text-gray-500")}>{subtitle}</div>
        </div>
        <div className="font-mono text-sm font-bold">{amount}</div>
      </div>
    </button>
  );
}

function normalizeStatementLine(state: StatementLineEditorState): CreateBankStatementLinePayload {
  return {
    transactionDate: state.transactionDate,
    reference: state.reference || undefined,
    description: state.description || undefined,
    debitAmount: Number(state.debitAmount || 0),
    creditAmount: Number(state.creditAmount || 0),
  };
}

function parseImportRows(value: string): CreateBankStatementLinePayload[] {
  return value
    .split(/\r?\n/)
    .map((row) => row.trim())
    .filter(Boolean)
    .map((row) => {
      const parts = row.split(",").map((part) => part.trim());
      if (parts.length < 5) {
        throw new Error("Invalid import row.");
      }

      return {
        transactionDate: parts[0],
        reference: parts[1] || undefined,
        description: parts[2] || undefined,
        debitAmount: Number(parts[3] || 0),
        creditAmount: Number(parts[4] || 0),
      };
    });
}

async function invalidateReconciliations(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["bank-reconciliations"] }),
    queryClient.invalidateQueries({ queryKey: ["bank-reconciliation"] }),
    queryClient.invalidateQueries({ queryKey: ["bank-cash-accounts"] }),
  ]);
}
