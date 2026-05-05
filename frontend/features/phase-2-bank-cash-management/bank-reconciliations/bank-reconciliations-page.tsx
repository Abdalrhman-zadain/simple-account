"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  LuBadgeCheck as BadgeCheck,
  LuCirclePlus as CirclePlus,
  LuRefreshCw as RefreshCw,
  LuUnplug as Unplug,
  LuEye as Eye,
  LuPrinter as Printer,
  LuArrowDownUp as ArrowDownUp,
  LuFileText as FileText,
} from "react-icons/lu";
import {
  MdMoreVert as MoreVertical,
  MdCheckCircle as CheckCircle2,
  MdWarning as AlertCircle,
} from "react-icons/md";

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
import { Button, Card, SidePanel, StatusPill } from "@/components/ui";
import { Field, Input, Select, Textarea } from "@/components/ui/forms";

type ReconciliationMetrics = {
  statementBalance: string;
  systemBalance: string;
  difference: string;
  differenceNum: number;
  matchedAmount: string;
  totalLines: number;
  unmatchedCount: number;
  matchedCount: number;
} | null;

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

const LANG_LABELS = {
  en: {
    title: "Bank Reconciliation",
    account: "Account",
    statementDate: "Statement Date",
    print: "Print",
    save: "Save",
    complete: "Complete",
    reconciliationList: "Bank Reconciliations",
    listHint: "By Account & Status",
    allAccounts: "All Accounts",
    allStatuses: "All Statuses",
    draft: "Draft",
    completed: "Completed",
    noReconciliations: "No reconciliations",
    selectToView: "Select a reconciliation to view details",
    statementBalance: "Statement Balance",
    systemBalance: "System Balance",
    difference: "Difference",
    netStatement: "Net Statement",
    matched: "Matched",
    total: "Total",
    bankStatements: "Bank Statements",
    matching: "Matching",
    system: "System",
    noRows: "No rows",
    noTransactions: "No transactions",
    matchBtn: "Match",
    cancel: "Cancel",
    steps: "Steps",
    step1: "Select from right",
    step2: "Select from left",
    step3: "Match",
    select: "Select",
    fromStatement: "From Statement",
    fromSystem: "From System",
    matchedTransactions: "Matched Transactions",
    unresolvedTransactions: "Unresolved Transactions",
    date: "Date",
    reference: "Reference",
    description: "Description",
    amount: "Amount",
    action: "Action",
    unresolved: "Unresolved",
    view: "View",
    addLine: "Add Line",
    import: "Import",
    importText: "Text",
    importHint: "Date, Reference, Description, Debit, Credit",
    create: "Create",
    newReconciliation: "Create New Reconciliation",
    readyToComplete: "Ready to Complete",
    differenceWarning: "Difference",
    createReconciliation: "Create",
    selectAccount: "Select an account",
    notes: "Notes",
    debit: "Debit",
    credit: "Credit",
    balance: "Balance",
    search: "Search",
  },
  ar: {
    title: "التسوية البنكية",
    account: "الحساب",
    statementDate: "تاريخ الكشف",
    print: "طباعة",
    save: "حفظ",
    complete: "إكمال",
    reconciliationList: "التسويات البنكية",
    listHint: "حسب الحساب والحالة",
    allAccounts: "جميع الحسابات",
    allStatuses: "جميع الحالات",
    draft: "قيد التسوية",
    completed: "مكتملة",
    noReconciliations: "لا توجد تسويات",
    selectToView: "اختر تسوية لعرض التفاصيل",
    statementBalance: "رصيد كشف",
    systemBalance: "رصيد النظام",
    difference: "الفرق",
    netStatement: "صافي الكشف",
    matched: "المطابق",
    total: "الإجمالي",
    bankStatements: "كشف البنك",
    matching: "المطابقة",
    system: "النظام",
    noRows: "لا توجد سطور",
    noTransactions: "لا توجد حركات",
    matchBtn: "مطابقة",
    cancel: "إلغاء",
    steps: "الخطوات",
    step1: "اختر من اليمين",
    step2: "اختر من اليسار",
    step3: "مطابقة",
    select: "اختر",
    fromStatement: "الكشف",
    fromSystem: "النظام",
    matchedTransactions: "المطابقة",
    unresolvedTransactions: "غير المحلولة",
    date: "التاريخ",
    reference: "المرجع",
    description: "الوصف",
    amount: "المبلغ",
    action: "الإجراء",
    unresolved: "غير موجودة",
    view: "عرض",
    addLine: "إضافة سطر",
    import: "استيراد",
    importText: "النص",
    importHint: "التاريخ, المرجع, الوصف, مدين, دائن",
    create: "إنشاء",
    newReconciliation: "إنشاء تسوية جديدة",
    readyToComplete: "جاهزة للإكمال",
    differenceWarning: "الفرق",
    createReconciliation: "إنشاء",
    selectAccount: "اختر حسابًا",
    notes: "ملاحظات",
    debit: "مدين",
    credit: "دائن",
    balance: "الرصيد",
    search: "ابحث",
  },
};

export function BankReconciliationsPage() {
  const { token } = useAuth();
  const { t, language } = useTranslation();
  const queryClient = useQueryClient();
  const labels = LANG_LABELS[language as "en" | "ar"] || LANG_LABELS.en;
  const isArabic = language === "ar";

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
      setImportError(error instanceof Error ? error.message : "Invalid format");
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
  const matchedLines = detail?.statementLines.filter((line) => line.status === "MATCHED" || line.status === "RECONCILED") ?? [];
  const reconciliationLines = detail?.statementLines ?? [];

  const reconciliationMetrics: ReconciliationMetrics = useMemo(() => {
    if (!detail) return null;

    const statementBalance = detail.summary.statementEndingBalance;
    const systemBalance = detail.summary.systemBalance;
    const differenceNum = Number(detail.summary.balanceDifference);
    const matchedAmount = matchedLines.reduce(
      (sum, line) => sum + (Number(line.debitAmount) || Number(line.creditAmount)),
      0,
    );
    const totalLines = reconciliationLines.length;

    return {
      statementBalance: formatCurrency(statementBalance),
      systemBalance: formatCurrency(systemBalance),
      difference: formatCurrency(differenceNum),
      differenceNum,
      matchedAmount: formatCurrency(matchedAmount),
      totalLines,
      unmatchedCount: unmatchedLines.length,
      matchedCount: matchedLines.length,
    };
  }, [detail, matchedLines, reconciliationLines, unmatchedLines]);

  return (
    <div className="grid lg:grid-cols-[1fr_320px] min-h-screen gap-0">
      {/* Main Content */}
      <div className="flex flex-col min-w-0 bg-gray-50" dir={isArabic ? "rtl" : "ltr"}>
        {!detail ? (
          <div className="flex items-center justify-center flex-1">
            <div className="text-center">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">{labels.selectToView}</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6">
              {/* Header */}
              <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6 flex items-center justify-between min-h-24">
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-gray-900">{labels.title}</h1>
                  <p className="text-sm text-gray-600 mt-1">
                    {labels.account}: {cleanDisplayName(detail.bankCashAccount.name)} - {detail.bankCashAccount.account.code}
                  </p>
                  <p className="text-sm text-gray-600 mt-2">{formatDate(detail.statementDate)}</p>
                </div>
                <div className="flex gap-2 items-center ml-4 flex-shrink-0">
                  <StatusPill
                    label={detail.status === "COMPLETED" ? labels.completed : labels.draft}
                    tone={detail.status === "COMPLETED" ? "positive" : "warning"}
                  />
                  <Button variant="secondary" size="sm" className="text-xs">
                    <Printer className="h-3.5 w-3.5 ms-1" />
                    {labels.print}
                  </Button>
                  <Button variant="secondary" size="sm" className="text-xs">
                    {labels.save}
                  </Button>
                  {detail.status === "DRAFT" ? (
                    <Button
                      onClick={() => completeMutation.mutate()}
                      disabled={
                        completeMutation.isPending ||
                        (reconciliationMetrics?.differenceNum ?? 0) !== 0
                      }
                      size="sm"
                      className="text-xs bg-green-600 hover:bg-green-700 text-white"
                    >
                      <BadgeCheck className="h-3.5 w-3.5 ms-1" />
                      {labels.complete}
                    </Button>
                  ) : null}
                  <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* KPI Cards */}
              {reconciliationMetrics && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
                  <KPICard label={labels.statementBalance} value={reconciliationMetrics.statementBalance} icon={<div className="h-7 w-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600">B</div>} />
                  <KPICard label={labels.systemBalance} value={reconciliationMetrics.systemBalance} icon={<div className="h-7 w-7 rounded-full bg-purple-100 flex items-center justify-center text-xs font-bold text-purple-600">S</div>} />
                  <KPICard label={labels.difference} value={reconciliationMetrics.difference} valueColor={reconciliationMetrics.differenceNum !== 0 ? "text-orange-600" : "text-green-600"} icon={<div className={cn("h-7 w-7 rounded-full flex items-center justify-center text-lg", reconciliationMetrics.differenceNum !== 0 ? "bg-orange-100 text-orange-600" : "bg-green-100 text-green-600")}>{reconciliationMetrics.differenceNum !== 0 ? "⚠" : "✓"}</div>} />
                  <KPICard label={labels.netStatement} value={reconciliationMetrics.statementBalance} icon={<div className="h-7 w-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600">S</div>} />
                  <KPICard label={labels.matched} value={reconciliationMetrics.matchedAmount} icon={<CheckCircle2 className="h-6 w-6 text-green-600" />} />
                  <KPICard label={labels.total} value={reconciliationMetrics.totalLines} icon={<div className="h-7 w-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">#</div>} />
                </div>
              )}

              {/* Toolbar */}
              <div className="bg-white rounded-lg border border-gray-200 p-3 flex items-center justify-between gap-4 mb-6 min-h-14">
                <div className="flex gap-2 items-center">
                  <Button variant="secondary" size="sm" className="text-xs py-2">
                    <CirclePlus className="h-3.5 w-3.5 ms-1" />
                    {labels.addLine}
                  </Button>
                  <Button variant="secondary" size="sm" className="text-xs py-2">
                    <RefreshCw className="h-3.5 w-3.5 ms-1" />
                    {labels.import}
                  </Button>
                </div>
                <div className="flex gap-2 items-center">
                  <Input placeholder={labels.search} className="text-xs h-8 w-40" />
                </div>
              </div>

              {/* Error */}
              {currentError instanceof Error ? (
                <Card className="border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700 rounded-lg mb-6">
                  {currentError.message}
                </Card>
              ) : null}

              {/* Workspace */}
              <style>{`
                .reconciliation-workspace {
                  display: grid;
                  grid-template-columns: minmax(380px, 1fr) minmax(240px, 0.6fr) minmax(380px, 1fr);
                  grid-template-areas: "system match statement";
                  gap: 16px;
                  align-items: start;
                  width: 100%;
                  min-width: 0;
                  margin-bottom: 24px;
                }
                .statement-panel { grid-area: statement; min-width: 0; }
                .match-panel { grid-area: match; min-width: 0; }
                .system-panel { grid-area: system; min-width: 0; }
                .reconciliation-panel {
                  background: white;
                  border: 1px solid #E5E7EB;
                  border-radius: 12px;
                  display: flex;
                  flex-direction: column;
                  overflow: hidden;
                  min-height: 420px;
                }
                .panel-header {
                  padding: 12px 16px;
                  border-bottom: 1px solid #F1F5F9;
                  background: #F9FAFB;
                  flex-shrink: 0;
                }
                .panel-body {
                  flex: 1;
                  overflow-y: auto;
                  max-height: calc(100vh - 480px);
                }
              `}</style>

              <div className="reconciliation-workspace">
                {/* Right: Bank Statements */}
                <div className="statement-panel">
                  <div className="reconciliation-panel">
                    <div className="panel-header">
                      <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide">
                        {labels.bankStatements} ({reconciliationLines.length})
                      </h3>
                    </div>
                    <div className="panel-body">
                      {reconciliationLines.length === 0 ? (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center">
                            <FileText className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                            <p className="text-xs text-gray-500">{labels.noRows}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-100">
                          {reconciliationLines.map((line) => (
                            <button
                              key={line.id}
                              onClick={() => setSelectedStatementLineId(line.id)}
                              className={cn(
                                "w-full px-4 py-3 text-right transition-colors text-xs hover:bg-gray-50 border-r-2 border-transparent",
                                selectedStatementLineId === line.id && "bg-green-50 border-r-green-600",
                              )}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="font-semibold text-gray-900 truncate">{line.reference || "—"}</div>
                                  <div className="text-gray-600 mt-0.5 text-xs truncate">{line.description || "—"}</div>
                                  <div className="text-gray-500 mt-0.5 text-xs">{formatDate(line.transactionDate)}</div>
                                </div>
                                <div className="flex-shrink-0 text-right">
                                  <div className="font-mono font-bold text-gray-900">
                                    {formatCurrency(Number(line.debitAmount) || Number(line.creditAmount))}
                                  </div>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Middle: Matching */}
                <div className="match-panel">
                  <div className="reconciliation-panel">
                    <div className="panel-header">
                      <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide text-center">
                        {labels.matching}
                      </h3>
                    </div>
                    <div className="flex-1 flex flex-col overflow-hidden p-4">
                      <div className="space-y-2 mb-3 flex-1 overflow-y-auto">
                        <div className="p-2 border border-gray-200 rounded bg-gray-50">
                          <div className="text-xs text-gray-500 mb-1">{labels.fromStatement}</div>
                          {selectedStatementLineId ? (() => {
                            const sel = reconciliationLines.find((l) => l.id === selectedStatementLineId);
                            return sel ? (
                              <div className="text-xs space-y-0.5">
                                <div className="font-bold text-gray-900 truncate">{sel.reference}</div>
                                <div className="text-gray-600 truncate">{sel.description}</div>
                                <div className="font-mono font-bold text-gray-900">
                                  {formatCurrency(Number(sel.debitAmount) || Number(sel.creditAmount))}
                                </div>
                              </div>
                            ) : null;
                          })() : <p className="text-xs text-gray-500">{labels.select}</p>}
                        </div>
                        <div className="flex justify-center">
                          <ArrowDownUp className="h-4 w-4 text-gray-400 rotate-90" />
                        </div>
                        <div className="p-2 border border-gray-200 rounded bg-gray-50">
                          <div className="text-xs text-gray-500 mb-1">{labels.fromSystem}</div>
                          {selectedSystemTransactionId ? (() => {
                            const sel = detail.unmatchedSystemTransactions.find((t) => t.id === selectedSystemTransactionId);
                            return sel ? (
                              <div className="text-xs space-y-0.5">
                                <div className="font-bold text-gray-900 truncate">{sel.reference}</div>
                                <div className="text-gray-600 truncate">{sel.description}</div>
                                <div className="font-mono font-bold text-gray-900">
                                  {formatCurrency(Number(sel.debitAmount) || Number(sel.creditAmount))}
                                </div>
                              </div>
                            ) : null;
                          })() : <p className="text-xs text-gray-500">{labels.select}</p>}
                        </div>
                      </div>
                      <div className="space-y-2 flex-shrink-0">
                        <Button
                          onClick={() => matchMutation.mutate()}
                          disabled={!selectedStatementLineId || !selectedSystemTransactionId || detail.status === "COMPLETED" || matchMutation.isPending}
                          className="w-full bg-green-600 hover:bg-green-700 text-white text-xs py-2"
                        >
                          <BadgeCheck className="h-3 w-3 ms-1" />
                          {labels.matchBtn}
                        </Button>
                        <Button variant="secondary" onClick={() => { setSelectedStatementLineId(null); setSelectedSystemTransactionId(null); }} className="w-full text-xs py-2">
                          {labels.cancel}
                        </Button>
                        <div className="p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
                          <div className="font-bold mb-1 text-blue-900">{labels.steps}:</div>
                          <ol className="list-decimal list-inside space-y-0.5 text-xs">
                            <li>{labels.step1}</li>
                            <li>{labels.step2}</li>
                            <li>{labels.step3}</li>
                          </ol>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Left: System Transactions */}
                <div className="system-panel">
                  <div className="reconciliation-panel">
                    <div className="panel-header">
                      <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide">
                        {labels.system} ({detail.unmatchedSystemTransactions.length})
                      </h3>
                    </div>
                    <div className="panel-body">
                      {detail.unmatchedSystemTransactions.length === 0 ? (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center">
                            <AlertCircle className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                            <p className="text-xs text-gray-500">{labels.noTransactions}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-100">
                          {detail.unmatchedSystemTransactions.map((transaction) => (
                            <button
                              key={transaction.id}
                              onClick={() => setSelectedSystemTransactionId(transaction.id)}
                              className={cn(
                                "w-full px-4 py-3 text-right transition-colors text-xs hover:bg-gray-50 border-r-2 border-transparent",
                                selectedSystemTransactionId === transaction.id && "bg-green-50 border-r-green-600",
                              )}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="font-semibold text-gray-900 truncate">{transaction.reference}</div>
                                  <div className="text-gray-600 mt-0.5 text-xs truncate">{transaction.description}</div>
                                  <div className="text-gray-500 mt-0.5 text-xs">{formatDate(transaction.entryDate)}</div>
                                </div>
                                <div className="flex-shrink-0 text-right">
                                  <div className="font-mono font-bold text-gray-900">
                                    {formatCurrency(Number(transaction.debitAmount) || Number(transaction.creditAmount))}
                                  </div>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Matched */}
              {matchedLines.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-6">
                  <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      {labels.matchedTransactions} ({matchedLines.length})
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50">
                          <th className="px-4 py-3 text-right font-bold text-gray-700">{labels.date}</th>
                          <th className="px-4 py-3 text-right font-bold text-gray-700">{labels.reference}</th>
                          <th className="px-4 py-3 text-right font-bold text-gray-700">{labels.description}</th>
                          <th className="px-4 py-3 text-right font-bold text-gray-700">{labels.amount}</th>
                          <th className="px-4 py-3 text-right font-bold text-gray-700">{labels.action}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {matchedLines.map((line) => (
                          <tr key={line.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-gray-600">{formatDate(line.transactionDate)}</td>
                            <td className="px-4 py-3 font-semibold text-gray-900">{line.reference}</td>
                            <td className="px-4 py-3 text-gray-600 truncate">{line.description}</td>
                            <td className="px-4 py-3 font-mono font-bold text-gray-900">
                              {formatCurrency(Number(line.debitAmount) || Number(line.creditAmount))}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2 justify-end">
                                <button className="p-1 hover:bg-gray-200 rounded">
                                  <Eye className="h-4 w-4 text-gray-600" />
                                </button>
                                {line.matches.length > 0 && (
                                  <button
                                    className="p-1 hover:bg-red-100 rounded"
                                    onClick={() => removeMatchMutation.mutate({ matchId: line.matches[0].id })}
                                  >
                                    <Unplug className="h-4 w-4 text-red-600" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Unresolved */}
              {unmatchedLines.length > 0 && (
                <div className="bg-white rounded-lg border border-orange-200 overflow-hidden mb-6">
                  <div className="px-6 py-4 border-b border-orange-200 bg-orange-50">
                    <h3 className="text-sm font-bold text-orange-900 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-orange-600" />
                      {labels.unresolvedTransactions} ({unmatchedLines.length})
                    </h3>
                  </div>
                  <div className="p-6">
                    <div className="space-y-4">
                      {unmatchedLines.map((line) => (
                        <div key={line.id} className="border border-orange-200 rounded-lg p-4 bg-orange-50">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h4 className="font-bold text-gray-900">{line.reference}</h4>
                              <p className="text-sm text-gray-600 mt-1">{line.description}</p>
                              <div className="flex gap-4 mt-2 text-xs text-gray-600">
                                <span>{formatDate(line.transactionDate)}</span>
                                <span className="font-mono font-bold">
                                  {formatCurrency(Number(line.debitAmount) || Number(line.creditAmount))}
                                </span>
                              </div>
                            </div>
                            <StatusPill label={labels.unresolved} tone="warning" />
                          </div>
                          <div className="mt-4 p-3 bg-white border border-orange-200 rounded text-xs text-gray-700">
                            {isArabic ? "يمكنك إنشاء حركة مباشرة ومطابقتها." : "You can create a transaction directly and match it."}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Status */}
              {reconciliationMetrics && (
                <div className={cn(
                  "rounded-lg border p-4 text-sm font-semibold flex items-center gap-3 mb-6",
                  reconciliationMetrics.differenceNum === 0
                    ? "bg-green-50 border-green-200 text-green-800"
                    : "bg-blue-50 border-blue-200 text-blue-800",
                )}>
                  {reconciliationMetrics.differenceNum === 0 ? (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                      <span>{labels.readyToComplete}</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0" />
                      <span>{labels.differenceWarning}: {reconciliationMetrics.difference}</span>
                    </>
                  )}
                </div>
              )}

              {/* Forms */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-sm font-bold text-gray-900 mb-4">{labels.addLine}</h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    <Field label={labels.date}>
                      <Input type="date" value={statementLine.transactionDate} onChange={(event) => setStatementLine((current) => ({ ...current, transactionDate: event.target.value }))} />
                    </Field>
                    <Field label={labels.reference}>
                      <Input value={statementLine.reference} onChange={(event) => setStatementLine((current) => ({ ...current, reference: event.target.value }))} />
                    </Field>
                    <div className="md:col-span-2">
                      <Field label={labels.description}>
                        <Input value={statementLine.description} onChange={(event) => setStatementLine((current) => ({ ...current, description: event.target.value }))} />
                      </Field>
                    </div>
                    <Field label={labels.debit}>
                      <Input type="number" min="0" step="0.01" value={statementLine.debitAmount} onChange={(event) => setStatementLine((current) => ({ ...current, debitAmount: event.target.value }))} />
                    </Field>
                    <Field label={labels.credit}>
                      <Input type="number" min="0" step="0.01" value={statementLine.creditAmount} onChange={(event) => setStatementLine((current) => ({ ...current, creditAmount: event.target.value }))} />
                    </Field>
                  </div>
                  <div className="flex justify-end mt-4">
                    <Button onClick={() => addLineMutation.mutate()} disabled={addLineMutation.isPending || detail.status === "COMPLETED"} className="bg-green-600 hover:bg-green-700 text-white text-xs">
                      <CirclePlus className="h-3.5 w-3.5 ms-1" />
                      {labels.addLine}
                    </Button>
                  </div>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-sm font-bold text-gray-900 mb-4">{labels.import}</h3>
                  <Field label={labels.importText} hint={labels.importHint}>
                    <Textarea rows={6} value={importText} placeholder="2026-05-05,FEE-001,Bank fee,0,10" onChange={(event) => { setImportText(event.target.value); setImportError(null); }} />
                  </Field>
                  {importError ? (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                      {importError}
                    </div>
                  ) : null}
                  <div className="flex justify-end mt-4">
                    <Button variant="secondary" onClick={() => importMutation.mutate()} disabled={importMutation.isPending || detail.status === "COMPLETED"} className="text-xs">
                      <RefreshCw className="h-3.5 w-3.5 ms-1" />
                      {labels.import}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sidebar */}
      <div className="hidden lg:flex lg:flex-col lg:border-l lg:border-gray-200 lg:bg-white">
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-gray-900">{labels.reconciliationList}</h2>
                <p className="mt-1 text-xs text-gray-500">{labels.listHint}</p>
              </div>
              <Button size="sm" onClick={() => setIsCreateOpen(true)} className="h-8 bg-green-600 hover:bg-green-700 text-white">
                <CirclePlus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <div className="border-b border-gray-200 px-4 py-3 space-y-2">
            <Select value={bankCashAccountId} onChange={(event) => setBankCashAccountId(event.target.value)} className="text-xs">
              <option value="">{labels.allAccounts}</option>
              {activeBankCashAccounts.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.account.code} · {row.name}
                </option>
              ))}
            </Select>
            <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as BankReconciliationStatus | "")} className="text-xs">
              <option value="">{labels.allStatuses}</option>
              <option value="DRAFT">{labels.draft}</option>
              <option value="COMPLETED">{labels.completed}</option>
            </Select>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {rows.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <AlertCircle className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">{labels.noReconciliations}</p>
              </div>
            ) : (
              rows.map((row) => (
                <button
                  key={row.id}
                  onClick={() => { setSelectedId(row.id); setSelectedStatementLineId(null); setSelectedSystemTransactionId(null); }}
                  className={cn(
                    "w-full px-4 py-3 text-right transition-all border-r-2",
                    activeSelectedId === row.id ? "bg-green-50 border-green-600" : "border-transparent hover:bg-gray-50",
                  )}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-gray-900 text-sm">{cleanDisplayName(row.bankCashAccount.name)}</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {row.bankCashAccount.account.code} · {formatDate(row.statementDate)}
                      </div>
                    </div>
                    <StatusPill label={row.status === "COMPLETED" ? labels.completed : labels.draft} tone={row.status === "COMPLETED" ? "positive" : "warning"} />
                  </div>
                  <div className="flex justify-between items-center text-xs text-gray-600">
                    <span>{row.summary.reconciledCount} {isArabic ? "مطابقة" : "matched"}</span>
                    <span className="font-mono font-bold text-gray-900">{formatCurrency(row.statementEndingBalance)}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      <SidePanel isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title={labels.newReconciliation}>
        <div className="space-y-5">
          <Field label={labels.account}>
            <Select value={editor.bankCashAccountId} onChange={(event) => setEditor((current) => ({ ...current, bankCashAccountId: event.target.value }))}>
              <option value="">{labels.selectAccount}</option>
              {activeBankCashAccounts.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.account.code} · {row.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={labels.date}>
            <Input type="date" value={editor.statementDate} onChange={(event) => setEditor((current) => ({ ...current, statementDate: event.target.value }))} />
          </Field>
          <Field label={labels.balance}>
            <Input type="number" min="0" step="0.01" value={editor.statementEndingBalance} onChange={(event) => setEditor((current) => ({ ...current, statementEndingBalance: event.target.value }))} />
          </Field>
          <Field label={labels.notes}>
            <Textarea rows={4} value={editor.notes} onChange={(event) => setEditor((current) => ({ ...current, notes: event.target.value }))} />
          </Field>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setIsCreateOpen(false)}>
              {labels.cancel}
            </Button>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending} className="bg-green-600 hover:bg-green-700 text-white">
              <CirclePlus className="h-3.5 w-3.5 ms-1" />
              {labels.create}
            </Button>
          </div>
        </div>
      </SidePanel>
    </div>
  );
}

function KPICard({
  label,
  value,
  icon,
  valueColor = "text-gray-900",
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  valueColor?: string;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3 flex items-center justify-between gap-2 min-h-20">
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider truncate">{label}</div>
        <div className={cn("text-base font-bold mt-1 truncate", valueColor)}>{value}</div>
      </div>
      <div className="flex-shrink-0">{icon}</div>
    </div>
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
        throw new Error("Invalid import row format.");
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
