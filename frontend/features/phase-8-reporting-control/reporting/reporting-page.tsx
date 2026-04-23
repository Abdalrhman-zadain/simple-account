"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button, Card, PageShell, SectionHeading } from "@/components/ui";
import {
  createReportingSnapshotVersion,
  createReportingDefinition,
  createReportingSnapshot,
  deactivateReportingDefinition,
  exportReporting,
  getAccountOptions,
  getJournalEntryTypes,
  getReportingActivity,
  getReportingAudit,
  getReportingBalanceSheet,
  getReportingCashMovement,
  getReportingCatalog,
  getReportingDefinitions,
  getReportingGeneralLedger,
  getReportingProfitLoss,
  getReportingSnapshots,
  getReportingSummary,
  getReportingTrialBalance,
  getReportingWarnings,
  lockReportingSnapshot,
  updateReportingDefinition,
  unlockReportingSnapshot,
} from "@/lib/api";
import { useTranslation } from "@/lib/i18n";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import type {
  AccountOption,
  AccountType,
  JournalEntryType,
  ReportingActivityEntry,
  ReportingAuditReport,
  ReportingBalanceSheetReport,
  ReportingCatalogItem,
  ReportingCashMovementReport,
  ReportingDefinition,
  ReportingExportFormat,
  ReportingGeneralLedgerReport,
  ReportingProfitLossReport,
  ReportingQuery,
  ReportingSnapshot,
  ReportingSummary,
  ReportingTrialBalanceReport,
  ReportingWarning,
} from "@/types/api";

type Tab = "summary" | "trialBalance" | "balanceSheet" | "profitLoss" | "cashMovement" | "generalLedger" | "audit";

const tabs: Array<{ id: Tab; labelKey: string }> = [
  { id: "summary", labelKey: "reporting.tab.summary" },
  { id: "trialBalance", labelKey: "reporting.tab.trialBalance" },
  { id: "balanceSheet", labelKey: "reporting.tab.balanceSheet" },
  { id: "profitLoss", labelKey: "reporting.tab.profitLoss" },
  { id: "cashMovement", labelKey: "reporting.tab.cashMovement" },
  { id: "generalLedger", labelKey: "reporting.tab.generalLedger" },
  { id: "audit", labelKey: "reporting.tab.audit" },
];

const reportTypes = new Set<Tab>(tabs.map((tab) => tab.id));

export function ReportingPage() {
  const { token, user } = useAuth();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<Tab>("summary");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [comparisonFrom, setComparisonFrom] = useState("");
  const [comparisonTo, setComparisonTo] = useState("");
  const [basis, setBasis] = useState<"ACCRUAL" | "CASH">("ACCRUAL");
  const [includeZeroBalance, setIncludeZeroBalance] = useState(false);
  const [accountId, setAccountId] = useState("");
  const [accountType, setAccountType] = useState<AccountType | "">("");
  const [currencyCode, setCurrencyCode] = useState("");
  const [segment3, setSegment3] = useState("");
  const [segment4, setSegment4] = useState("");
  const [segment5, setSegment5] = useState("");
  const [journalEntryTypeId, setJournalEntryTypeId] = useState("");
  const [definitionName, setDefinitionName] = useState("");
  const [snapshotName, setSnapshotName] = useState("");
  const [exportTitle, setExportTitle] = useState("");
  const [exportFormat, setExportFormat] = useState<ReportingExportFormat>("PRINT");
  const [shareDefinition, setShareDefinition] = useState(false);
  const [selectedDefinitionId, setSelectedDefinitionId] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  const filters = useMemo<ReportingQuery>(
    () => ({
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      comparisonFrom: comparisonFrom || undefined,
      comparisonTo: comparisonTo || undefined,
      basis,
      includeZeroBalance,
      accountId: accountId || undefined,
      accountType: accountType || undefined,
      currencyCode: currencyCode || undefined,
      segment3: segment3 || undefined,
      segment4: segment4 || undefined,
      segment5: segment5 || undefined,
      journalEntryTypeId: journalEntryTypeId || undefined,
    }),
    [accountId, accountType, basis, comparisonFrom, comparisonTo, currencyCode, dateFrom, dateTo, includeZeroBalance, journalEntryTypeId, segment3, segment4, segment5],
  );

  const reportParameters = useMemo<Record<string, unknown>>(
    () => ({
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      comparisonFrom: filters.comparisonFrom,
      comparisonTo: filters.comparisonTo,
      basis: filters.basis,
      includeZeroBalance: filters.includeZeroBalance,
      accountId: activeTab === "generalLedger" ? filters.accountId : undefined,
      accountType: filters.accountType,
      currencyCode: filters.currencyCode,
      segment3: filters.segment3,
      segment4: filters.segment4,
      segment5: filters.segment5,
      journalEntryTypeId: filters.journalEntryTypeId,
    }),
    [activeTab, filters],
  );

  const accountsQuery = useQuery({
    queryKey: ["reporting-accounts", token],
    queryFn: () => getAccountOptions({ isPosting: "true", isActive: "true" }, token),
    staleTime: 5 * 60 * 1000,
    enabled: Boolean(token),
  });

  const definitionsQuery = useQuery({
    queryKey: ["reporting-definitions", token],
    queryFn: () => getReportingDefinitions(token),
    enabled: Boolean(token),
  });

  const catalogQuery = useQuery({
    queryKey: ["reporting-catalog", token],
    queryFn: () => getReportingCatalog(token),
    enabled: Boolean(token),
  });

  const warningsQuery = useQuery({
    queryKey: ["reporting-warnings", token],
    queryFn: () => getReportingWarnings(token),
    enabled: Boolean(token),
  });

  const journalEntryTypesQuery = useQuery({
    queryKey: ["reporting-journal-entry-types", token],
    queryFn: () => getJournalEntryTypes(token),
    enabled: Boolean(token),
    staleTime: 5 * 60 * 1000,
  });

  const snapshotsQuery = useQuery({
    queryKey: ["reporting-snapshots", token],
    queryFn: () => getReportingSnapshots(token),
    enabled: Boolean(token),
  });

  const activityQuery = useQuery({
    queryKey: ["reporting-activity", token],
    queryFn: () => getReportingActivity(25, token),
    enabled: Boolean(token),
  });

  const summaryQuery = useQuery({
    queryKey: ["reporting-summary", token, filters],
    queryFn: () => getReportingSummary(filters, token),
    enabled: Boolean(token),
  });

  const trialBalanceQuery = useQuery({
    queryKey: ["reporting-trial-balance", token, filters],
    queryFn: () => getReportingTrialBalance(filters, token),
    enabled: Boolean(token) && activeTab === "trialBalance",
  });

  const balanceSheetQuery = useQuery({
    queryKey: ["reporting-balance-sheet", token, filters],
    queryFn: () => getReportingBalanceSheet(filters, token),
    enabled: Boolean(token) && activeTab === "balanceSheet",
  });

  const profitLossQuery = useQuery({
    queryKey: ["reporting-profit-loss", token, filters],
    queryFn: () => getReportingProfitLoss(filters, token),
    enabled: Boolean(token) && activeTab === "profitLoss",
  });

  const cashMovementQuery = useQuery({
    queryKey: ["reporting-cash-movement", token, filters],
    queryFn: () => getReportingCashMovement(filters, token),
    enabled: Boolean(token) && activeTab === "cashMovement",
  });

  const generalLedgerQuery = useQuery({
    queryKey: ["reporting-general-ledger", token, filters, accountId],
    queryFn: () => getReportingGeneralLedger({ ...filters, accountId: accountId || undefined }, token),
    enabled: Boolean(token) && activeTab === "generalLedger",
  });

  const auditQuery = useQuery({
    queryKey: ["reporting-audit", token, filters],
    queryFn: () => getReportingAudit(filters, token),
    enabled: Boolean(token) && activeTab === "audit",
  });

  const selectedDefinition = (definitionsQuery.data ?? []).find((row) => row.id === selectedDefinitionId) ?? null;
  const accounts = accountsQuery.data ?? [];
  const catalog = catalogQuery.data ?? [];
  const visibleTabs = tabs.filter((tab) => catalog.some((item) => item.reportType === tab.id && item.canView));
  const selectedAccount = accounts.find((row) => row.id === accountId) ?? null;
  const journalEntryTypes = journalEntryTypesQuery.data ?? [];
  const reportingWarnings = warningsQuery.data ?? [];
  const currencyOptions = useMemo(() => Array.from(new Set(accounts.map((row) => row.currencyCode))).sort(), [accounts]);
  const segment3Options = useMemo(() => Array.from(new Set(accounts.map((row) => row.segment3).filter(Boolean) as string[])).sort(), [accounts]);
  const segment4Options = useMemo(() => Array.from(new Set(accounts.map((row) => row.segment4).filter(Boolean) as string[])).sort(), [accounts]);
  const segment5Options = useMemo(() => Array.from(new Set(accounts.map((row) => row.segment5).filter(Boolean) as string[])).sort(), [accounts]);
  const activePermissions = catalog.find((item) => item.reportType === activeTab);

  useEffect(() => {
    const tabFromQuery = searchParams.get("tab");
    if (tabFromQuery && reportTypes.has(tabFromQuery as Tab)) {
      setActiveTab(tabFromQuery as Tab);
    }

    setDateFrom(searchParams.get("dateFrom") || "");
    setDateTo(searchParams.get("dateTo") || "");
    setComparisonFrom(searchParams.get("comparisonFrom") || "");
    setComparisonTo(searchParams.get("comparisonTo") || "");
    setBasis(searchParams.get("basis") === "CASH" ? "CASH" : "ACCRUAL");
    setIncludeZeroBalance(searchParams.get("includeZeroBalance") === "true");
    setAccountId(searchParams.get("accountId") || "");
    setAccountType((searchParams.get("accountType") as AccountType | null) || "");
    setCurrencyCode(searchParams.get("currencyCode") || "");
    setSegment3(searchParams.get("segment3") || "");
    setSegment4(searchParams.get("segment4") || "");
    setSegment5(searchParams.get("segment5") || "");
    setJournalEntryTypeId(searchParams.get("journalEntryTypeId") || "");
  }, [searchParams]);

  useEffect(() => {
    if (catalog.length > 0 && !catalog.some((item) => item.reportType === activeTab && item.canView)) {
      const fallbackTab = visibleTabs[0]?.id ?? "summary";
      setActiveTab(fallbackTab);
    }
  }, [activeTab, catalog, visibleTabs]);

  const refreshControls = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["reporting-definitions"] }),
      queryClient.invalidateQueries({ queryKey: ["reporting-snapshots"] }),
      queryClient.invalidateQueries({ queryKey: ["reporting-activity"] }),
    ]);
  };

  const saveDefinitionMutation = useMutation({
    mutationFn: async () => {
      const name = definitionName.trim() || `${getReportLabel(activeTab, t)} ${new Date().toISOString().slice(0, 10)}`;
      return createReportingDefinition(
        {
          name,
          reportType: activeTab,
          parameters: reportParameters,
          isShared: shareDefinition,
        },
        token,
      );
    },
    onSuccess: async (definition) => {
      setDefinitionName(definition.name);
      setSelectedDefinitionId(definition.id);
      setStatusMessage(t("reporting.status.definitionSaved"));
      await refreshControls();
    },
  });

  const updateDefinitionMutation = useMutation({
    mutationFn: async () => {
      if (!selectedDefinitionId) {
        throw new Error(t("reporting.status.selectDefinition"));
      }

      return updateReportingDefinition(
        selectedDefinitionId,
        {
          name: definitionName.trim() || selectedDefinition?.name,
          reportType: activeTab,
          parameters: reportParameters,
          isShared: shareDefinition,
        },
        token,
      );
    },
    onSuccess: async (definition) => {
      setDefinitionName(definition.name);
      setStatusMessage(t("reporting.status.definitionUpdated"));
      await refreshControls();
    },
  });

  const deactivateDefinitionMutation = useMutation({
    mutationFn: async (definitionId: string) => deactivateReportingDefinition(definitionId, token),
    onSuccess: async (_, definitionId) => {
      if (selectedDefinitionId === definitionId) {
        setSelectedDefinitionId("");
        setDefinitionName("");
        setShareDefinition(false);
      }
      setStatusMessage(t("reporting.status.definitionArchived"));
      await refreshControls();
    },
  });

  const snapshotMutation = useMutation({
    mutationFn: async () => {
      const name = snapshotName.trim() || `${getReportLabel(activeTab, t)} ${new Date().toISOString().slice(0, 10)}`;
      return createReportingSnapshot(
        {
          name,
          reportType: activeTab,
          parameters: reportParameters,
        },
        token,
      );
    },
    onSuccess: async (snapshot) => {
      setSnapshotName(snapshot.name);
      setStatusMessage(t("reporting.status.snapshotSaved"));
      await refreshControls();
    },
  });

  const lockSnapshotMutation = useMutation({
    mutationFn: async (id: string) => lockReportingSnapshot(id, token),
    onSuccess: async () => {
      setStatusMessage(t("reporting.status.snapshotLocked"));
      await refreshControls();
    },
  });

  const unlockSnapshotMutation = useMutation({
    mutationFn: async (id: string) => unlockReportingSnapshot(id, token),
    onSuccess: async () => {
      setStatusMessage(t("reporting.status.snapshotUnlocked"));
      await refreshControls();
    },
  });

  const versionSnapshotMutation = useMutation({
    mutationFn: async (snapshot: ReportingSnapshot) =>
      createReportingSnapshotVersion(snapshot.id, { name: `${snapshot.name} v${snapshot.version + 1}` }, token),
    onSuccess: async (snapshot) => {
      setStatusMessage(t("reporting.status.snapshotVersioned", { version: snapshot.version }));
      await refreshControls();
    },
  });

  const exportMutation = useMutation({
    mutationFn: async () =>
      exportReporting(
        {
          reportType: activeTab,
          format: exportFormat,
          title: exportTitle.trim() || undefined,
          parameters: reportParameters,
        },
        token,
      ),
    onSuccess: async (result) => {
      const blob =
        result.encoding === "base64"
          ? new Blob([Uint8Array.from(atob(result.content), (char) => char.charCodeAt(0))], { type: result.mimeType })
          : new Blob([result.content], { type: result.mimeType });
      const url = window.URL.createObjectURL(blob);

      if (result.format === "EXCEL") {
        const link = document.createElement("a");
        link.href = url;
        link.download = result.fileName;
        link.click();
      } else {
        const popup = window.open(url, "_blank", "noopener,noreferrer");
        if (result.format === "PRINT" && popup) {
          popup.onload = () => popup.print();
        }
      }

      window.setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
      setStatusMessage(
        result.format === "EXCEL" ? t("reporting.status.exportDownloaded") : t("reporting.status.exportOpened"),
      );
      await queryClient.invalidateQueries({ queryKey: ["reporting-activity"] });
    },
  });

  const applyDefinition = (definition: ReportingDefinition) => {
    applyStoredParameters(definition.reportType, definition.parameters, {
      setActiveTab,
      setDateFrom,
      setDateTo,
      setComparisonFrom,
      setComparisonTo,
      setBasis,
      setIncludeZeroBalance,
      setAccountId,
      setAccountType,
      setCurrencyCode,
      setSegment3,
      setSegment4,
      setSegment5,
      setJournalEntryTypeId,
    });
    setDefinitionName(definition.name);
    setShareDefinition(definition.isShared);
    setSelectedDefinitionId(definition.id);
    setStatusMessage(t("reporting.status.definitionApplied"));
  };

  const applySnapshot = (snapshot: ReportingSnapshot) => {
    applyStoredParameters(snapshot.reportType, snapshot.parameters, {
      setActiveTab,
      setDateFrom,
      setDateTo,
      setComparisonFrom,
      setComparisonTo,
      setBasis,
      setIncludeZeroBalance,
      setAccountId,
      setAccountType,
      setCurrencyCode,
      setSegment3,
      setSegment4,
      setSegment5,
      setJournalEntryTypeId,
    });
    setSnapshotName(snapshot.name);
    setStatusMessage(t("reporting.status.snapshotApplied"));
  };

  const isBusy =
    saveDefinitionMutation.isPending ||
    updateDefinitionMutation.isPending ||
    deactivateDefinitionMutation.isPending ||
    snapshotMutation.isPending ||
    lockSnapshotMutation.isPending ||
    unlockSnapshotMutation.isPending ||
    versionSnapshotMutation.isPending ||
    exportMutation.isPending;

  return (
    <PageShell>
      <SectionHeading title={t("reporting.title")} description={t("reporting.description")} />

      {statusMessage ? <Card className="mb-6 border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{statusMessage}</Card> : null}

      <Card className="space-y-4 p-5">
        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          <Field label={t("reporting.filter.dateFrom")}>
            <input value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} type="date" className={inputClassName} />
          </Field>
          <Field label={t("reporting.filter.dateTo")}>
            <input value={dateTo} onChange={(event) => setDateTo(event.target.value)} type="date" className={inputClassName} />
          </Field>
          <Field label={t("reporting.filter.comparisonFrom")}>
            <input value={comparisonFrom} onChange={(event) => setComparisonFrom(event.target.value)} type="date" className={inputClassName} />
          </Field>
          <Field label={t("reporting.filter.comparisonTo")}>
            <input value={comparisonTo} onChange={(event) => setComparisonTo(event.target.value)} type="date" className={inputClassName} />
          </Field>
          <Field label={t("reporting.filter.basis")}>
            <select value={basis} onChange={(event) => setBasis(event.target.value as "ACCRUAL" | "CASH")} className={inputClassName}>
              <option value="ACCRUAL">{t("reporting.basis.ACCRUAL")}</option>
              <option value="CASH">{t("reporting.basis.CASH")}</option>
            </select>
          </Field>
          <Field label={t("reporting.filter.generalLedgerAccount")}>
            <select value={accountId} onChange={(event) => setAccountId(event.target.value)} className={inputClassName}>
              <option value="">{t("reporting.filter.allAccounts")}</option>
              {accounts.map((account: AccountOption) => (
                <option key={account.id} value={account.id}>
                  {account.code} - {account.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          <Field label={t("reporting.filter.accountType")}>
            <select value={accountType} onChange={(event) => setAccountType(event.target.value as AccountType | "")} className={inputClassName}>
              <option value="">{t("reporting.value.none")}</option>
              <option value="ASSET">{t("reporting.accountType.ASSET")}</option>
              <option value="LIABILITY">{t("reporting.accountType.LIABILITY")}</option>
              <option value="EQUITY">{t("reporting.accountType.EQUITY")}</option>
              <option value="REVENUE">{t("reporting.accountType.REVENUE")}</option>
              <option value="EXPENSE">{t("reporting.accountType.EXPENSE")}</option>
            </select>
          </Field>
          <Field label={t("reporting.filter.currencyCode")}>
            <select value={currencyCode} onChange={(event) => setCurrencyCode(event.target.value)} className={inputClassName}>
              <option value="">{t("reporting.value.none")}</option>
              {currencyOptions.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("reporting.filter.segment3")}>
            <select value={segment3} onChange={(event) => setSegment3(event.target.value)} className={inputClassName}>
              <option value="">{t("reporting.value.none")}</option>
              {segment3Options.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("reporting.filter.segment4")}>
            <select value={segment4} onChange={(event) => setSegment4(event.target.value)} className={inputClassName}>
              <option value="">{t("reporting.value.none")}</option>
              {segment4Options.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("reporting.filter.segment5")}>
            <select value={segment5} onChange={(event) => setSegment5(event.target.value)} className={inputClassName}>
              <option value="">{t("reporting.value.none")}</option>
              {segment5Options.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("reporting.filter.journalEntryType")}>
            <select value={journalEntryTypeId} onChange={(event) => setJournalEntryTypeId(event.target.value)} className={inputClassName}>
              <option value="">{t("reporting.value.none")}</option>
              {journalEntryTypes.map((entryType: JournalEntryType) => (
                <option key={entryType.id} value={entryType.id}>
                  {entryType.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
            <input
              checked={includeZeroBalance}
              onChange={(event) => setIncludeZeroBalance(event.target.checked)}
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/30"
            />
            {t("reporting.filter.includeZeroBalance")}
          </label>
          <Button
            variant="secondary"
            onClick={() => {
              setDateFrom("");
              setDateTo("");
              setComparisonFrom("");
              setComparisonTo("");
              setBasis("ACCRUAL");
              setIncludeZeroBalance(false);
              setAccountId("");
              setAccountType("");
              setCurrencyCode("");
              setSegment3("");
              setSegment4("");
              setSegment5("");
              setJournalEntryTypeId("");
              setStatusMessage("");
            }}
          >
            {t("reporting.action.clearFilters")}
          </Button>
        </div>
      </Card>

      {reportingWarnings.length ? <WarningsCard warnings={reportingWarnings} activeTab={activeTab} t={t} /> : null}

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        {activePermissions?.canSaveDefinition ? (
        <Card className="space-y-4 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-base font-bold text-gray-900">{t("reporting.control.definitionsTitle")}</div>
              <div className="text-sm text-gray-500">{t("reporting.control.definitionsDescription")}</div>
            </div>
            <div className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600">{(definitionsQuery.data ?? []).length}</div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label={t("reporting.field.definitionName")}>
              <input value={definitionName} onChange={(event) => setDefinitionName(event.target.value)} className={inputClassName} />
            </Field>
            <Field label={t("reporting.field.selectedDefinition")}>
              <select
                value={selectedDefinitionId}
                onChange={(event) => {
                  setSelectedDefinitionId(event.target.value);
                  const nextDefinition = (definitionsQuery.data ?? []).find((row) => row.id === event.target.value);
                  if (nextDefinition) {
                    setDefinitionName(nextDefinition.name);
                    setShareDefinition(nextDefinition.isShared);
                  }
                }}
                className={inputClassName}
              >
                <option value="">{t("reporting.value.none")}</option>
                {(definitionsQuery.data ?? []).map((definition) => (
                  <option key={definition.id} value={definition.id}>
                    {definition.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
            <input
              checked={shareDefinition}
              onChange={(event) => setShareDefinition(event.target.checked)}
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/30"
            />
            {t("reporting.field.shareDefinition")}
          </label>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => saveDefinitionMutation.mutate()} disabled={!token || isBusy}>
              {t("reporting.action.saveDefinition")}
            </Button>
            <Button variant="secondary" onClick={() => updateDefinitionMutation.mutate()} disabled={!token || !selectedDefinitionId || isBusy}>
              {t("reporting.action.updateDefinition")}
            </Button>
          </div>
          <DefinitionList
            definitions={definitionsQuery.data ?? []}
            onApply={applyDefinition}
            onDeactivate={(definitionId) => deactivateDefinitionMutation.mutate(definitionId)}
            selectedId={selectedDefinitionId}
            t={t}
          />
        </Card>
        ) : null}

        {activePermissions?.canSnapshot ? (
        <Card className="space-y-4 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-base font-bold text-gray-900">{t("reporting.control.snapshotsTitle")}</div>
              <div className="text-sm text-gray-500">{t("reporting.control.snapshotsDescription")}</div>
            </div>
            <div className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600">{(snapshotsQuery.data ?? []).length}</div>
          </div>
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
            <Field label={t("reporting.field.snapshotName")}>
              <input value={snapshotName} onChange={(event) => setSnapshotName(event.target.value)} className={inputClassName} />
            </Field>
            <div className="flex items-end">
              <Button onClick={() => snapshotMutation.mutate()} disabled={!token || isBusy}>
                {t("reporting.action.captureSnapshot")}
              </Button>
            </div>
          </div>
          <SnapshotList
            snapshots={snapshotsQuery.data ?? []}
            onApply={applySnapshot}
            onLock={(snapshotId) => lockSnapshotMutation.mutate(snapshotId)}
            onUnlock={(snapshotId) => unlockSnapshotMutation.mutate(snapshotId)}
            onCreateVersion={(snapshot) => versionSnapshotMutation.mutate(snapshot)}
            t={t}
          />
        </Card>
        ) : null}

        {activePermissions?.canExport ? (
        <Card className="space-y-4 p-5">
          <div>
            <div className="text-base font-bold text-gray-900">{t("reporting.control.exportTitle")}</div>
            <div className="text-sm text-gray-500">{t("reporting.control.exportDescription")}</div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label={t("reporting.field.exportTitle")}>
              <input value={exportTitle} onChange={(event) => setExportTitle(event.target.value)} className={inputClassName} />
            </Field>
            <Field label={t("reporting.field.exportFormat")}>
              <select value={exportFormat} onChange={(event) => setExportFormat(event.target.value as ReportingExportFormat)} className={inputClassName}>
                <option value="PRINT">{t("reporting.export.PRINT")}</option>
                <option value="PDF">{t("reporting.export.PDF")}</option>
                <option value="EXCEL">{t("reporting.export.EXCEL")}</option>
              </select>
            </Field>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{t("reporting.export.note")}</div>
          <Button onClick={() => exportMutation.mutate()} disabled={!token || isBusy}>
            {t("reporting.action.export")}
          </Button>
        </Card>
        ) : null}

        {user?.role !== "USER" ? (
        <Card className="space-y-4 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-base font-bold text-gray-900">{t("reporting.control.activityTitle")}</div>
              <div className="text-sm text-gray-500">{t("reporting.control.activityDescription")}</div>
            </div>
            <Button variant="secondary" onClick={() => activityQuery.refetch()} disabled={!token || activityQuery.isFetching}>
              {t("reporting.action.refreshActivity")}
            </Button>
          </div>
          <ActivityList entries={activityQuery.data ?? []} t={t} />
        </Card>
        ) : null}
      </div>

      <Card className="mt-6 flex flex-wrap gap-3 p-3">
        {visibleTabs.map((tab) => (
          <Button key={tab.id} variant={activeTab === tab.id ? "primary" : "secondary"} onClick={() => setActiveTab(tab.id)}>
            {t(tab.labelKey)}
          </Button>
        ))}
      </Card>

      <div className="mt-6 space-y-6">
        {activeTab === "summary" ? <SummarySection data={summaryQuery.data} loading={summaryQuery.isLoading} t={t} /> : null}
        {activeTab === "trialBalance" ? (
          <TrialBalanceSection data={trialBalanceQuery.data} loading={trialBalanceQuery.isLoading} t={t} onSelectAccount={setAccountId} />
        ) : null}
        {activeTab === "balanceSheet" ? <BalanceSheetSection data={balanceSheetQuery.data} loading={balanceSheetQuery.isLoading} t={t} /> : null}
        {activeTab === "profitLoss" ? <ProfitLossSection data={profitLossQuery.data} loading={profitLossQuery.isLoading} t={t} /> : null}
        {activeTab === "cashMovement" ? <CashMovementSection data={cashMovementQuery.data} loading={cashMovementQuery.isLoading} t={t} /> : null}
        {activeTab === "generalLedger" ? (
          <GeneralLedgerSection
            data={generalLedgerQuery.data}
            loading={generalLedgerQuery.isLoading}
            selectedAccount={selectedAccount}
            t={t}
          />
        ) : null}
        {activeTab === "audit" ? <AuditSection data={auditQuery.data} loading={auditQuery.isLoading} t={t} /> : null}
      </div>
    </PageShell>
  );
}

function SummarySection({ data, loading, t }: { data?: ReportingSummary; loading: boolean; t: TranslationFn }) {
  if (loading) return <LoadingCard label={t("reporting.loading")} />;
  if (!data) return <EmptyCard label={t("reporting.empty")} />;

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.metrics.map((metric) => (
          <Card key={metric.key} className="space-y-2 p-5">
            <div className="text-xs font-bold uppercase tracking-widest text-gray-500">{metric.label}</div>
            <div className="text-2xl font-black text-gray-900">{formatCurrency(metric.amount)}</div>
            <div className="text-sm text-gray-500">
              {t("reporting.metric.comparison")}: {formatCurrency(metric.comparisonAmount)}
            </div>
            <div className="text-sm text-gray-500">
              {t("reporting.metric.variance")}: {formatCurrency(metric.varianceAmount)}
            </div>
          </Card>
        ))}
      </div>
      <Card className="grid gap-3 p-5 md:grid-cols-3">
        <MiniStat label={t("reporting.summary.period")} value={data.period} />
        <MiniStat label={t("reporting.summary.comparisonPeriod")} value={data.comparisonPeriod || t("reporting.value.none")} />
        <MiniStat label={t("reporting.summary.generatedAt")} value={formatDate(data.generatedAt)} />
        <MiniStat label={t("reporting.summary.trialBalanceRows")} value={String(data.operational.trialBalanceRowCount)} />
        <MiniStat label={t("reporting.summary.cashAccounts")} value={String(data.operational.cashAccountCount)} />
        <MiniStat label={t("reporting.summary.auditEvents")} value={String(data.operational.auditEventCount)} />
      </Card>
    </>
  );
}

function TrialBalanceSection({
  data,
  loading,
  onSelectAccount,
  t,
}: {
  data?: ReportingTrialBalanceReport;
  loading: boolean;
  onSelectAccount: (id: string) => void;
  t: TranslationFn;
}) {
  if (loading) return <LoadingCard label={t("reporting.loading")} />;
  if (!data) return <EmptyCard label={t("reporting.empty")} />;

  return (
    <>
      <Card className="grid gap-3 p-5 md:grid-cols-5">
        <MiniStat label={t("reporting.summary.period")} value={data.period} />
        <MiniStat label={t("reporting.trialBalance.total.debit")} value={formatCurrency(data.totals.debit)} />
        <MiniStat label={t("reporting.trialBalance.total.credit")} value={formatCurrency(data.totals.credit)} />
        <MiniStat label={t("reporting.trialBalance.total.closingDebit")} value={formatCurrency(data.totals.closingDebit)} />
        <MiniStat label={t("reporting.trialBalance.total.closingCredit")} value={formatCurrency(data.totals.closingCredit)} />
      </Card>
      <Card className="overflow-hidden p-0">
        <Table
          headers={[
            t("reporting.column.code"),
            t("reporting.column.name"),
            t("reporting.column.openingBalance"),
            t("reporting.column.debit"),
            t("reporting.column.credit"),
            t("reporting.column.closingBalance"),
            t("reporting.column.side"),
            t("reporting.column.action"),
          ]}
          rows={data.rows.map((row) => [
            row.accountCode,
            row.accountName,
            formatCurrency(row.openingBalance),
            formatCurrency(row.debitTotal),
            formatCurrency(row.creditTotal),
            formatCurrency(row.closingBalance),
            t(`reporting.side.${row.closingSide}`),
            <button key={`${row.accountId}-action`} className="text-sm font-semibold text-primary hover:underline" onClick={() => onSelectAccount(row.accountId)}>
              {t("reporting.action.openLedger")}
            </button>,
          ])}
          emptyLabel={t("reporting.value.noRows")}
        />
      </Card>
    </>
  );
}

function BalanceSheetSection({
  data,
  loading,
  t,
}: {
  data?: ReportingBalanceSheetReport;
  loading: boolean;
  t: TranslationFn;
}) {
  if (loading) return <LoadingCard label={t("reporting.loading")} />;
  if (!data) return <EmptyCard label={t("reporting.empty")} />;

  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <SectionCard title={t("reporting.balanceSheet.assets")}>
        <AmountTable rows={data.assets} t={t} />
      </SectionCard>
      <SectionCard title={t("reporting.balanceSheet.liabilities")}>
        <AmountTable rows={data.liabilities} t={t} />
      </SectionCard>
      <SectionCard title={t("reporting.balanceSheet.equity")}>
        <AmountTable rows={data.equity} t={t} />
      </SectionCard>
    </div>
  );
}

function ProfitLossSection({
  data,
  loading,
  t,
}: {
  data?: ReportingProfitLossReport;
  loading: boolean;
  t: TranslationFn;
}) {
  if (loading) return <LoadingCard label={t("reporting.loading")} />;
  if (!data) return <EmptyCard label={t("reporting.empty")} />;

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <SectionCard title={t("reporting.profitLoss.revenue")}>
        <AmountTable rows={data.revenue} t={t} />
      </SectionCard>
      <SectionCard title={t("reporting.profitLoss.expenses")}>
        <AmountTable rows={data.expenses} t={t} />
      </SectionCard>
      <Card className="grid gap-3 p-5 md:grid-cols-3 xl:col-span-2">
        <MiniStat label={t("reporting.profitLoss.totalRevenue")} value={formatCurrency(data.totals.revenue.amount)} />
        <MiniStat label={t("reporting.profitLoss.totalExpenses")} value={formatCurrency(data.totals.expenses.amount)} />
        <MiniStat label={t("reporting.profitLoss.netIncome")} value={formatCurrency(data.totals.netIncome.amount)} />
      </Card>
    </div>
  );
}

function CashMovementSection({
  data,
  loading,
  t,
}: {
  data?: ReportingCashMovementReport;
  loading: boolean;
  t: TranslationFn;
}) {
  if (loading) return <LoadingCard label={t("reporting.loading")} />;
  if (!data) return <EmptyCard label={t("reporting.empty")} />;

  return (
    <>
      <Card className="grid gap-3 p-5 md:grid-cols-4">
        <MiniStat label={t("reporting.cashMovement.openingBalance")} value={formatCurrency(data.totals.openingBalance.amount)} />
        <MiniStat label={t("reporting.cashMovement.netMovement")} value={formatCurrency(data.totals.netMovement.amount)} />
        <MiniStat label={t("reporting.cashMovement.closingBalance")} value={formatCurrency(data.totals.closingBalance.amount)} />
        <MiniStat label={t("reporting.summary.comparisonPeriod")} value={data.comparisonPeriod || t("reporting.value.none")} />
      </Card>
      <Card className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-4">
        {Object.entries(data.classified).map(([key, metric]) => (
          <Card key={key} className="space-y-2 border border-gray-200 bg-gray-50 p-4">
            <div className="text-xs font-bold uppercase tracking-widest text-gray-500">{t(`reporting.cashMovement.classified.${key}`)}</div>
            <div className="text-lg font-black text-gray-900">{formatCurrency(metric.amount)}</div>
            <div className="text-sm text-gray-500">
              {t("reporting.metric.comparison")}: {formatCurrency(metric.comparisonAmount)}
            </div>
            <div className="text-sm text-gray-500">
              {t("reporting.metric.variance")}: {formatCurrency(metric.varianceAmount)}
            </div>
          </Card>
        ))}
      </Card>
      <Card className="overflow-hidden p-0">
        <Table
          headers={[
            t("reporting.column.code"),
            t("reporting.column.name"),
            t("reporting.column.type"),
            t("reporting.column.openingBalance"),
            t("reporting.column.debit"),
            t("reporting.column.credit"),
            t("reporting.column.netMovement"),
            t("reporting.column.closingBalance"),
            t("reporting.column.action"),
          ]}
          rows={data.rows.map((row) => [
            row.code,
            row.name,
            row.type,
            formatCurrency(row.openingBalance),
            formatCurrency(row.debitTotal),
            formatCurrency(row.creditTotal),
            formatCurrency(row.netMovement),
            formatCurrency(row.closingBalance),
            row.drillDownPath ? (
              <Link key={`${row.accountId}-ledger`} href={row.drillDownPath} className="text-sm font-semibold text-primary hover:underline">
                {t("reporting.action.openLedger")}
              </Link>
            ) : (
              t("reporting.value.none")
            ),
          ])}
          emptyLabel={t("reporting.value.noRows")}
        />
      </Card>
    </>
  );
}

function GeneralLedgerSection({
  data,
  loading,
  selectedAccount,
  t,
}: {
  data?: ReportingGeneralLedgerReport;
  loading: boolean;
  selectedAccount: AccountOption | null;
  t: TranslationFn;
}) {
  if (loading) return <LoadingCard label={t("reporting.loading")} />;
  if (!selectedAccount) return <EmptyCard label={t("reporting.generalLedger.selectAccount")} />;
  if (!data) return <EmptyCard label={t("reporting.empty")} />;

  return (
    <>
      <Card className="grid gap-3 p-5 md:grid-cols-4">
        <MiniStat label={t("reporting.column.account")} value={`${selectedAccount.code} - ${selectedAccount.name}`} />
        <MiniStat label={t("reporting.column.openingBalance")} value={formatCurrency(data.openingBalance)} />
        <MiniStat label={t("reporting.column.debit")} value={formatCurrency(data.totalDebit)} />
        <MiniStat label={t("reporting.column.credit")} value={formatCurrency(data.totalCredit)} />
      </Card>
      <Card className="overflow-hidden p-0">
        <Table
          headers={[
            t("reporting.column.date"),
            t("reporting.column.reference"),
            t("reporting.column.journal"),
            t("reporting.column.description"),
            t("reporting.column.debit"),
            t("reporting.column.credit"),
            t("reporting.column.runningBalance"),
            t("reporting.column.source"),
          ]}
          rows={data.transactions.map((row) => [
            formatDate(row.entryDate),
            row.reference,
            row.journalReference,
            row.description || row.journalDescription || t("reporting.value.none"),
            formatCurrency(row.debitAmount),
            formatCurrency(row.creditAmount),
            formatCurrency(row.runningBalance),
            row.sourceDocument ? (
              <Link key={`${row.id}-source`} href={row.sourceDocument.path} className="text-sm font-semibold text-primary hover:underline">
                {row.sourceDocument.label}: {row.sourceDocument.reference}
              </Link>
            ) : (
              t("reporting.value.none")
            ),
          ])}
          emptyLabel={t("reporting.value.noRows")}
        />
      </Card>
    </>
  );
}

function AuditSection({
  data,
  loading,
  t,
}: {
  data?: ReportingAuditReport;
  loading: boolean;
  t: TranslationFn;
}) {
  if (loading) return <LoadingCard label={t("reporting.loading")} />;
  if (!data) return <EmptyCard label={t("reporting.empty")} />;

  return (
    <>
      <Card className="grid gap-3 p-5 md:grid-cols-3">
        <MiniStat label={t("reporting.audit.totalEvents")} value={String(data.totalEvents)} />
        <MiniStat label={t("reporting.summary.generatedAt")} value={formatDate(data.generatedAt)} />
        <MiniStat label={t("reporting.audit.actionCount")} value={String(data.actionTotals.length)} />
      </Card>
      <Card className="grid gap-3 p-5 md:grid-cols-3">
        <MiniStat label={t("reporting.audit.highRisk")} value={String(data.compliancePackage.highRiskCount)} />
        <MiniStat label={t("reporting.audit.systemEvents")} value={String(data.compliancePackage.systemEventCount)} />
        <MiniStat label={t("reporting.audit.exceptions")} value={String(data.exceptions.length)} />
      </Card>
      <Card className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-4">
        <MiniStat label={t("reporting.audit.complianceGenerated")} value={formatDate(data.compliancePackage.generatedAt)} />
        <MiniStat label={t("reporting.audit.complianceEntries")} value={String(data.compliancePackage.entryCount)} />
        <MiniStat label={t("reporting.audit.highRisk")} value={String(data.compliancePackage.highRiskCount)} />
        <MiniStat label={t("reporting.audit.systemEvents")} value={String(data.compliancePackage.systemEventCount)} />
      </Card>
      <Card className="overflow-hidden p-0">
        <Table
          headers={[t("reporting.column.code"), t("reporting.column.description"), t("reporting.column.amount")]}
          rows={data.exceptions.map((row) => [row.code, row.description, String(row.count)])}
          emptyLabel={t("reporting.audit.noExceptions")}
        />
      </Card>
      <Card className="overflow-hidden p-0">
        <Table
          headers={[
            t("reporting.column.date"),
            t("reporting.column.entity"),
            t("reporting.column.action"),
            t("reporting.column.user"),
            t("reporting.column.details"),
            t("reporting.column.source"),
          ]}
          rows={data.entries.map((row) => [
            formatDate(row.createdAt),
            row.entity,
            row.action,
            row.user?.name || row.user?.email || t("reporting.value.system"),
            row.entityId || t("reporting.value.none"),
            getAuditSourcePath(row) ? (
              <Link key={`${row.id}-audit-source`} href={getAuditSourcePath(row)!} className="text-sm font-semibold text-primary hover:underline">
                {t("reporting.action.openSource")}
              </Link>
            ) : (
              t("reporting.value.none")
            ),
          ])}
          emptyLabel={t("reporting.value.noRows")}
        />
      </Card>
    </>
  );
}

function DefinitionList({
  definitions,
  onApply,
  onDeactivate,
  selectedId,
  t,
}: {
  definitions: ReportingDefinition[];
  onApply: (definition: ReportingDefinition) => void;
  onDeactivate: (id: string) => void;
  selectedId: string;
  t: TranslationFn;
}) {
  if (!definitions.length) {
    return <EmptyCard label={t("reporting.control.emptyDefinitions")} />;
  }

  return (
    <div className="space-y-3">
      {definitions.slice(0, 6).map((definition) => (
        <div
          key={definition.id}
          className={`rounded-2xl border p-4 ${selectedId === definition.id ? "border-primary/40 bg-primary/5" : "border-gray-200 bg-white"}`}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="text-sm font-bold text-gray-900">{definition.name}</div>
              <div className="text-xs text-gray-500">
                {getReportLabel(definition.reportType, t)} · {definition.isShared ? t("reporting.value.shared") : t("reporting.value.private")}
              </div>
              <div className="text-xs text-gray-500">
                {t("reporting.summary.generatedAt")}: {formatDate(definition.updatedAt)}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => onApply(definition)}>
                {t("reporting.action.applyDefinition")}
              </Button>
              <Button variant="secondary" onClick={() => onDeactivate(definition.id)}>
                {t("reporting.action.archiveDefinition")}
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function SnapshotList({
  snapshots,
  onApply,
  onLock,
  onUnlock,
  onCreateVersion,
  t,
}: {
  snapshots: ReportingSnapshot[];
  onApply: (snapshot: ReportingSnapshot) => void;
  onLock: (snapshotId: string) => void;
  onUnlock: (snapshotId: string) => void;
  onCreateVersion: (snapshot: ReportingSnapshot) => void;
  t: TranslationFn;
}) {
  if (!snapshots.length) {
    return <EmptyCard label={t("reporting.control.emptySnapshots")} />;
  }

  return (
    <div className="space-y-3">
      {snapshots.slice(0, 6).map((snapshot) => (
        <div key={snapshot.id} className="rounded-2xl border border-gray-200 bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="text-sm font-bold text-gray-900">{snapshot.name}</div>
              <div className="text-xs text-gray-500">{getReportLabel(snapshot.reportType, t)}</div>
              <div className="text-xs text-gray-500">
                {t("reporting.snapshot.version")}: {snapshot.version} · {snapshot.isLocked ? t("reporting.snapshot.locked") : t("reporting.snapshot.unlocked")}
              </div>
              <div className="text-xs text-gray-500">
                {snapshot.periodLabel || t("reporting.value.none")}
                {snapshot.comparisonPeriodLabel ? ` / ${snapshot.comparisonPeriodLabel}` : ""}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => onApply(snapshot)}>
                {t("reporting.action.applySnapshot")}
              </Button>
              <Button variant="secondary" onClick={() => onCreateVersion(snapshot)}>
                {t("reporting.action.versionSnapshot")}
              </Button>
              <Button variant="secondary" onClick={() => (snapshot.isLocked ? onUnlock(snapshot.id) : onLock(snapshot.id))}>
                {snapshot.isLocked ? t("reporting.action.unlockSnapshot") : t("reporting.action.lockSnapshot")}
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ActivityList({ entries, t }: { entries: ReportingActivityEntry[]; t: TranslationFn }) {
  return (
    <Table
      headers={[
        t("reporting.column.date"),
        t("reporting.column.entity"),
        t("reporting.column.action"),
        t("reporting.column.user"),
      ]}
      rows={entries.map((entry) => [
        formatDate(entry.createdAt),
        entry.entity,
        entry.action,
        entry.user?.name || entry.user?.email || t("reporting.value.system"),
      ])}
      emptyLabel={t("reporting.control.emptyActivity")}
    />
  );
}

function WarningsCard({ warnings, activeTab, t }: { warnings: ReportingWarning[]; activeTab: Tab; t: TranslationFn }) {
  const visibleWarnings = warnings.filter((warning) => warning.reportTypes.includes(activeTab) || warning.reportTypes.includes("summary"));

  if (!visibleWarnings.length) return null;

  return (
    <Card className="mt-6 space-y-3 border border-amber-200 bg-amber-50 p-5">
      <div className="text-base font-bold text-amber-900">{t("reporting.warning.title")}</div>
      {visibleWarnings.map((warning) => (
        <div key={warning.code} className="rounded-2xl border border-amber-200 bg-white/80 p-4 text-sm text-amber-900">
          <div className="font-semibold">{warning.code}</div>
          <div>{warning.message}</div>
        </div>
      ))}
    </Card>
  );
}

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="space-y-4 p-5">
      <div className="text-base font-bold text-gray-900">{title}</div>
      {children}
    </Card>
  );
}

function AmountTable({
  rows,
  t,
}: {
  rows: Array<{ accountCode: string; accountName: string; amount: string; comparisonAmount: string; varianceAmount: string; drillDownPath?: string }>;
  t: TranslationFn;
}) {
  return (
    <Table
      headers={[
        t("reporting.column.code"),
        t("reporting.column.name"),
        t("reporting.column.amount"),
        t("reporting.column.comparison"),
        t("reporting.column.variance"),
        t("reporting.column.action"),
      ]}
      rows={rows.map((row) => [
        row.accountCode,
        row.accountName,
        formatCurrency(row.amount),
        formatCurrency(row.comparisonAmount),
        formatCurrency(row.varianceAmount),
        row.drillDownPath ? (
          <Link key={`${row.accountCode}-drilldown`} href={row.drillDownPath} className="text-sm font-semibold text-primary hover:underline">
            {t("reporting.action.openLedger")}
          </Link>
        ) : (
          t("reporting.value.none")
        ),
      ])}
      emptyLabel={t("reporting.value.noRows")}
    />
  );
}

function Table({ headers, rows, emptyLabel }: { headers: string[]; rows: Array<Array<ReactNode>>; emptyLabel: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={headers.length} className="px-4 py-8 text-center text-sm text-gray-500">
                {emptyLabel}
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={index}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-4 py-3 text-gray-700">
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
      <div className="text-xs font-bold uppercase tracking-widest text-gray-500">{label}</div>
      <div className="mt-2 text-sm font-semibold text-gray-900">{value}</div>
    </div>
  );
}

function LoadingCard({ label }: { label: string }) {
  return <Card className="p-6 text-sm text-gray-600">{label}</Card>;
}

function EmptyCard({ label }: { label: string }) {
  return <Card className="p-6 text-sm text-gray-500">{label}</Card>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-bold uppercase tracking-wider text-gray-500">{label}</span>
      {children}
    </label>
  );
}

function getReportLabel(reportType: string, t: TranslationFn) {
  if (reportTypes.has(reportType as Tab)) {
    return t(`reporting.tab.${reportType}`);
  }

  return reportType;
}

function getAuditSourcePath(entry: ReportingActivityEntry) {
  const entityId = entry.entityId;
  if (!entityId) return null;

  switch (entry.entity) {
    case "JournalEntry":
      return `/journal-entries?reference=${encodeURIComponent(entityId)}`;
    case "BankCashTransaction":
      return `/bank-cash-transactions?sourceId=${encodeURIComponent(entityId)}`;
    case "SalesInvoice":
    case "CreditNote":
      return `/sales-receivables?sourceId=${encodeURIComponent(entityId)}`;
    case "PurchaseInvoice":
    case "DebitNote":
      return `/purchases?sourceId=${encodeURIComponent(entityId)}`;
    case "InventoryGoodsReceipt":
    case "InventoryGoodsIssue":
    case "InventoryAdjustment":
      return `/inventory?sourceId=${encodeURIComponent(entityId)}`;
    case "PayrollPeriod":
    case "PayrollAdjustment":
      return `/payroll?sourceId=${encodeURIComponent(entityId)}`;
    case "FixedAssetAcquisition":
    case "FixedAssetDepreciationRun":
    case "FixedAssetDisposal":
      return `/fixed-assets?sourceId=${encodeURIComponent(entityId)}`;
    default:
      return null;
  }
}

function applyStoredParameters(
  reportType: string,
  parameters: Record<string, unknown>,
  setters: {
    setActiveTab: (value: Tab) => void;
    setDateFrom: (value: string) => void;
    setDateTo: (value: string) => void;
    setComparisonFrom: (value: string) => void;
    setComparisonTo: (value: string) => void;
    setBasis: (value: "ACCRUAL" | "CASH") => void;
    setIncludeZeroBalance: (value: boolean) => void;
    setAccountId: (value: string) => void;
    setAccountType: (value: AccountType | "") => void;
    setCurrencyCode: (value: string) => void;
    setSegment3: (value: string) => void;
    setSegment4: (value: string) => void;
    setSegment5: (value: string) => void;
    setJournalEntryTypeId: (value: string) => void;
  },
) {
  if (reportTypes.has(reportType as Tab)) {
    setters.setActiveTab(reportType as Tab);
  }

  setters.setDateFrom(readString(parameters.dateFrom));
  setters.setDateTo(readString(parameters.dateTo));
  setters.setComparisonFrom(readString(parameters.comparisonFrom));
  setters.setComparisonTo(readString(parameters.comparisonTo));
  setters.setBasis(parameters.basis === "CASH" ? "CASH" : "ACCRUAL");
  setters.setIncludeZeroBalance(parameters.includeZeroBalance === true || parameters.includeZeroBalance === "true");
  setters.setAccountId(readString(parameters.accountId));
  setters.setAccountType((readString(parameters.accountType) as AccountType | "") || "");
  setters.setCurrencyCode(readString(parameters.currencyCode));
  setters.setSegment3(readString(parameters.segment3));
  setters.setSegment4(readString(parameters.segment4));
  setters.setSegment5(readString(parameters.segment5));
  setters.setJournalEntryTypeId(readString(parameters.journalEntryTypeId));
}

function readString(value: unknown) {
  return typeof value === "string" ? value : "";
}

type TranslationFn = (key: string, vars?: Record<string, string | number>) => string;

const inputClassName =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20";
