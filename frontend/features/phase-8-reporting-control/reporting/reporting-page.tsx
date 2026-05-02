"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button, Card, PageShell, SectionHeading } from "@/components/ui";
import {
  LuSettings,
  LuSave,
  LuCamera,
  LuPrinter,
  LuChevronDown,
  LuFileSpreadsheet,
  LuFileText,
  LuTrash2,
  LuHistory,
  LuLock,
  LuLockOpen,
} from "react-icons/lu";
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
  const [basis, setBasis] = useState<"" | "ACCRUAL" | "CASH">("");
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
  const [statusTone, setStatusTone] = useState<"success" | "error">("success");
  const [activeDateChip, setActiveDateChip] = useState<"dateFrom" | "dateTo" | "comparisonFrom" | "comparisonTo" | null>(null);
  const [activeSelectChip, setActiveSelectChip] = useState<"basis" | "accountId" | "accountType" | "currencyCode" | "segment3" | "segment4" | "segment5" | "journalEntryTypeId" | null>(null);

  const filters = useMemo<ReportingQuery>(
    () => ({
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      comparisonFrom: comparisonFrom || undefined,
      comparisonTo: comparisonTo || undefined,
      basis: basis || "ACCRUAL",
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
    setBasis(searchParams.get("basis") === "CASH" ? "CASH" : searchParams.get("basis") === "ACCRUAL" ? "ACCRUAL" : "");
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
      setStatusTone("success");
      setStatusMessage(t("reporting.status.definitionSaved"));
      await refreshControls();
    },
    onError: (error) => {
      setStatusTone("error");
      setStatusMessage(readErrorMessage(error));
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
      setStatusTone("success");
      setStatusMessage(t("reporting.status.definitionUpdated"));
      await refreshControls();
    },
    onError: (error) => {
      setStatusTone("error");
      setStatusMessage(readErrorMessage(error));
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
      setStatusTone("success");
      setStatusMessage(t("reporting.status.definitionArchived"));
      await refreshControls();
    },
    onError: (error) => {
      setStatusTone("error");
      setStatusMessage(readErrorMessage(error));
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
      setStatusTone("success");
      setStatusMessage(t("reporting.status.snapshotSaved"));
      await refreshControls();
    },
    onError: (error) => {
      setStatusTone("error");
      setStatusMessage(readErrorMessage(error));
    },
  });

  const lockSnapshotMutation = useMutation({
    mutationFn: async (id: string) => lockReportingSnapshot(id, token),
    onSuccess: async () => {
      setStatusTone("success");
      setStatusMessage(t("reporting.status.snapshotLocked"));
      await refreshControls();
    },
    onError: (error) => {
      setStatusTone("error");
      setStatusMessage(readErrorMessage(error));
    },
  });

  const unlockSnapshotMutation = useMutation({
    mutationFn: async (id: string) => unlockReportingSnapshot(id, token),
    onSuccess: async () => {
      setStatusTone("success");
      setStatusMessage(t("reporting.status.snapshotUnlocked"));
      await refreshControls();
    },
    onError: (error) => {
      setStatusTone("error");
      setStatusMessage(readErrorMessage(error));
    },
  });

  const versionSnapshotMutation = useMutation({
    mutationFn: async (snapshot: ReportingSnapshot) =>
      createReportingSnapshotVersion(snapshot.id, { name: `${snapshot.name} v${snapshot.version + 1}` }, token),
    onSuccess: async (snapshot) => {
      setStatusTone("success");
      setStatusMessage(t("reporting.status.snapshotVersioned", { version: snapshot.version }));
      await refreshControls();
    },
    onError: (error) => {
      setStatusTone("error");
      setStatusMessage(readErrorMessage(error));
    },
  });

  const exportMutation = useMutation({
    mutationFn: async (overrideFormat?: ReportingExportFormat) =>
      exportReporting(
        {
          reportType: activeTab,
          format: overrideFormat || exportFormat,
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

      {statusMessage ? (
        <Card
          className={`mb-6 border p-4 text-sm ${
            statusTone === "error" ? "border-rose-200 bg-rose-50 text-rose-900" : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {statusMessage}
        </Card>
      ) : null}

      <Card className="space-y-4 p-5">
        <div className="pb-1">
          <div className="flex flex-wrap items-center gap-2">
            <DateFilterChip
              label={t("reporting.filter.dateFrom")}
              value={dateFrom}
              onChange={setDateFrom}
              isActive={activeDateChip === "dateFrom"}
              onActivate={() => setActiveDateChip("dateFrom")}
              onDeactivate={() => setActiveDateChip(null)}
              ariaLabel={t("reporting.filter.dateFrom")}
            />
            <DateFilterChip
              label={t("reporting.filter.dateTo")}
              value={dateTo}
              onChange={setDateTo}
              isActive={activeDateChip === "dateTo"}
              onActivate={() => setActiveDateChip("dateTo")}
              onDeactivate={() => setActiveDateChip(null)}
              ariaLabel={t("reporting.filter.dateTo")}
            />
            <DateFilterChip
              label={t("reporting.filter.comparisonFrom")}
              value={comparisonFrom}
              onChange={setComparisonFrom}
              isActive={activeDateChip === "comparisonFrom"}
              onActivate={() => setActiveDateChip("comparisonFrom")}
              onDeactivate={() => setActiveDateChip(null)}
              ariaLabel={t("reporting.filter.comparisonFrom")}
            />
            <DateFilterChip
              label={t("reporting.filter.comparisonTo")}
              value={comparisonTo}
              onChange={setComparisonTo}
              isActive={activeDateChip === "comparisonTo"}
              onActivate={() => setActiveDateChip("comparisonTo")}
              onDeactivate={() => setActiveDateChip(null)}
              ariaLabel={t("reporting.filter.comparisonTo")}
            />

            <SelectFilterChip
              label={t("reporting.filter.basis")}
              value={basis}
              onChange={(val) => setBasis(val as "" | "ACCRUAL" | "CASH")}
              isActive={activeSelectChip === "basis"}
              onActivate={() => setActiveSelectChip("basis")}
              onDeactivate={() => setActiveSelectChip(null)}
              ariaLabel={t("reporting.filter.basis")}
            >
              <option value="">{t("reporting.value.none")}</option>
              <option value="ACCRUAL">{t("reporting.basis.ACCRUAL")}</option>
              <option value="CASH">{t("reporting.basis.CASH")}</option>
            </SelectFilterChip>

            <SelectFilterChip
              label={t("reporting.filter.generalLedgerAccount")}
              value={accountId}
              onChange={setAccountId}
              isActive={activeSelectChip === "accountId"}
              onActivate={() => setActiveSelectChip("accountId")}
              onDeactivate={() => setActiveSelectChip(null)}
              ariaLabel={t("reporting.filter.generalLedgerAccount")}
            >
              <option value="">{t("reporting.filter.allAccounts")}</option>
              {accounts.map((account: AccountOption) => (
                <option key={account.id} value={account.id}>
                  {account.code} - {account.name}
                </option>
              ))}
            </SelectFilterChip>

            <SelectFilterChip
              label={t("reporting.filter.accountType")}
              value={accountType}
              onChange={(val) => setAccountType(val as AccountType | "")}
              isActive={activeSelectChip === "accountType"}
              onActivate={() => setActiveSelectChip("accountType")}
              onDeactivate={() => setActiveSelectChip(null)}
              ariaLabel={t("reporting.filter.accountType")}
            >
              <option value="">{t("reporting.value.none")}</option>
              <option value="ASSET">{t("reporting.accountType.ASSET")}</option>
              <option value="LIABILITY">{t("reporting.accountType.LIABILITY")}</option>
              <option value="EQUITY">{t("reporting.accountType.EQUITY")}</option>
              <option value="REVENUE">{t("reporting.accountType.REVENUE")}</option>
              <option value="EXPENSE">{t("reporting.accountType.EXPENSE")}</option>
            </SelectFilterChip>

            <SelectFilterChip
              label={t("reporting.filter.currencyCode")}
              value={currencyCode}
              onChange={setCurrencyCode}
              isActive={activeSelectChip === "currencyCode"}
              onActivate={() => setActiveSelectChip("currencyCode")}
              onDeactivate={() => setActiveSelectChip(null)}
              ariaLabel={t("reporting.filter.currencyCode")}
            >
              <option value="">{t("reporting.value.none")}</option>
              {currencyOptions.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </SelectFilterChip>

            <SelectFilterChip
              label={t("reporting.filter.segment3")}
              value={segment3}
              onChange={setSegment3}
              isActive={activeSelectChip === "segment3"}
              onActivate={() => setActiveSelectChip("segment3")}
              onDeactivate={() => setActiveSelectChip(null)}
              ariaLabel={t("reporting.filter.segment3")}
            >
              <option value="">{t("reporting.value.none")}</option>
              {segment3Options.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </SelectFilterChip>

            <SelectFilterChip
              label={t("reporting.filter.segment4")}
              value={segment4}
              onChange={setSegment4}
              isActive={activeSelectChip === "segment4"}
              onActivate={() => setActiveSelectChip("segment4")}
              onDeactivate={() => setActiveSelectChip(null)}
              ariaLabel={t("reporting.filter.segment4")}
            >
              <option value="">{t("reporting.value.none")}</option>
              {segment4Options.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </SelectFilterChip>

            <SelectFilterChip
              label={t("reporting.filter.segment5")}
              value={segment5}
              onChange={setSegment5}
              isActive={activeSelectChip === "segment5"}
              onActivate={() => setActiveSelectChip("segment5")}
              onDeactivate={() => setActiveSelectChip(null)}
              ariaLabel={t("reporting.filter.segment5")}
            >
              <option value="">{t("reporting.value.none")}</option>
              {segment5Options.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </SelectFilterChip>

            <SelectFilterChip
              label={t("reporting.filter.journalEntryType")}
              value={journalEntryTypeId}
              onChange={setJournalEntryTypeId}
              isActive={activeSelectChip === "journalEntryTypeId"}
              onActivate={() => setActiveSelectChip("journalEntryTypeId")}
              onDeactivate={() => setActiveSelectChip(null)}
              ariaLabel={t("reporting.filter.journalEntryType")}
            >
              <option value="">{t("reporting.value.none")}</option>
              {journalEntryTypes.map((entryType: JournalEntryType) => (
                <option key={entryType.id} value={entryType.id}>
                  {entryType.name}
                </option>
              ))}
            </SelectFilterChip>

            <button
              type="button"
              onClick={() => setIncludeZeroBalance((value) => !value)}
              className={`${chipToggleClassName} ${includeZeroBalance ? "border-primary bg-primary/10 text-primary" : "border-gray-400 text-gray-700 hover:border-gray-500"}`}
            >
              {t("reporting.filter.includeZeroBalance")}
            </button>

            <button
              type="button"
              className="inline-flex h-10 items-center justify-center rounded-full border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:border-gray-500"
              onClick={() => {
                setDateFrom("");
                setDateTo("");
                setComparisonFrom("");
                setComparisonTo("");
                setBasis("");
                setIncludeZeroBalance(false);
                setAccountId("");
                setAccountType("");
                setCurrencyCode("");
                setSegment3("");
                setSegment4("");
                setSegment5("");
                setJournalEntryTypeId("");
                setActiveDateChip(null);
                setActiveSelectChip(null);
                setStatusTone("success");
                setStatusMessage("");
              }}
            >
              {t("reporting.action.clearFilters")}
            </button>
          </div>
        </div>
      </Card>

      <ReportToolbar
        t={t}
        isBusy={!token || isBusy}
        definitions={definitionsQuery.data ?? []}
        snapshots={snapshotsQuery.data ?? []}
        onSaveDefinition={() => saveDefinitionMutation.mutate()}
        onUpdateDefinition={() => updateDefinitionMutation.mutate()}
        onDeactivateDefinition={(id) => deactivateDefinitionMutation.mutate(id)}
        onApplyDefinition={applyDefinition}
        onSaveSnapshot={() => snapshotMutation.mutate()}
        onApplySnapshot={applySnapshot}
        onLockSnapshot={(id) => lockSnapshotMutation.mutate(id)}
        onUnlockSnapshot={(id) => unlockSnapshotMutation.mutate(id)}
        onVersionSnapshot={(snap) => versionSnapshotMutation.mutate(snap)}
        onPrint={() => exportMutation.mutate("PRINT")}
        onExport={(format) => exportMutation.mutate(format)}
        selectedDefinitionId={selectedDefinitionId}
        permissions={activePermissions}
      />

      {reportingWarnings.length ? <WarningsCard warnings={reportingWarnings} activeTab={activeTab} t={t} /> : null}

      <Card className="mt-6 flex flex-wrap gap-3 p-3">
        {visibleTabs.map((tab) => (
          <Button key={tab.id} variant={activeTab === tab.id ? "primary" : "secondary"} onClick={() => setActiveTab(tab.id)}>
            {t(tab.labelKey)}
          </Button>
        ))}
      </Card>

      <div className="mt-6 space-y-6">
        {activeTab === "summary" ? <SummarySection data={summaryQuery.data} error={summaryQuery.error} loading={summaryQuery.isLoading} t={t} /> : null}
        {activeTab === "trialBalance" ? (
          <TrialBalanceSection data={trialBalanceQuery.data} error={trialBalanceQuery.error} loading={trialBalanceQuery.isLoading} t={t} onSelectAccount={setAccountId} />
        ) : null}
        {activeTab === "balanceSheet" ? <BalanceSheetSection data={balanceSheetQuery.data} error={balanceSheetQuery.error} loading={balanceSheetQuery.isLoading} t={t} /> : null}
        {activeTab === "profitLoss" ? <ProfitLossSection data={profitLossQuery.data} error={profitLossQuery.error} loading={profitLossQuery.isLoading} t={t} /> : null}
        {activeTab === "cashMovement" ? <CashMovementSection data={cashMovementQuery.data} error={cashMovementQuery.error} loading={cashMovementQuery.isLoading} t={t} /> : null}
        {activeTab === "generalLedger" ? (
          <GeneralLedgerSection
            data={generalLedgerQuery.data}
            error={generalLedgerQuery.error}
            loading={generalLedgerQuery.isLoading}
            selectedAccount={selectedAccount}
            t={t}
          />
        ) : null}
        {activeTab === "audit" ? <AuditSection data={auditQuery.data} error={auditQuery.error} loading={auditQuery.isLoading} t={t} /> : null}
      </div>

      {user?.role !== "USER" ? (
        <Card className="mt-12 space-y-4 p-5 opacity-80">
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
    </PageShell>
  );
}

function SummarySection({ data, error, loading, t }: { data?: ReportingSummary; error?: unknown; loading: boolean; t: TranslationFn }) {
  if (loading) return <LoadingCard label={t("reporting.loading")} />;
  if (error) return <ErrorCard error={error} t={t} />;
  if (!data) return <EmptyCard label={t("reporting.empty")} detail={t("reporting.emptyPostedHint")} />;

  const primaryMetrics = data.metrics.slice(0, 2);
  const secondaryMetrics = data.metrics.slice(2);

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        {primaryMetrics.map((metric) => (
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
      <div className="grid gap-4 md:grid-cols-3">
        {secondaryMetrics.map((metric) => (
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
  error,
  loading,
  onSelectAccount,
  t,
}: {
  data?: ReportingTrialBalanceReport;
  error?: unknown;
  loading: boolean;
  onSelectAccount: (id: string) => void;
  t: TranslationFn;
}) {
  if (loading) return <LoadingCard label={t("reporting.loading")} />;
  if (error) return <ErrorCard error={error} t={t} />;
  if (!data) return <EmptyCard label={t("reporting.empty")} detail={t("reporting.emptyPostedHint")} />;

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
          columnTypes={["code", "name", "amount", "amount", "amount", "amount", "side", "action"]}
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
  error,
  loading,
  t,
}: {
  data?: ReportingBalanceSheetReport;
  error?: unknown;
  loading: boolean;
  t: TranslationFn;
}) {
  if (loading) return <LoadingCard label={t("reporting.loading")} />;
  if (error) return <ErrorCard error={error} t={t} />;
  if (!data) return <EmptyCard label={t("reporting.empty")} detail={t("reporting.emptyPostedHint")} />;

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
  error,
  loading,
  t,
}: {
  data?: ReportingProfitLossReport;
  error?: unknown;
  loading: boolean;
  t: TranslationFn;
}) {
  if (loading) return <LoadingCard label={t("reporting.loading")} />;
  if (error) return <ErrorCard error={error} t={t} />;
  if (!data) return <EmptyCard label={t("reporting.empty")} detail={t("reporting.emptyPostedHint")} />;

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
  error,
  loading,
  t,
}: {
  data?: ReportingCashMovementReport;
  error?: unknown;
  loading: boolean;
  t: TranslationFn;
}) {
  if (loading) return <LoadingCard label={t("reporting.loading")} />;
  if (error) return <ErrorCard error={error} t={t} />;
  if (!data) return <EmptyCard label={t("reporting.empty")} detail={t("reporting.emptyPostedHint")} />;

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
  error,
  loading,
  selectedAccount,
  t,
}: {
  data?: ReportingGeneralLedgerReport;
  error?: unknown;
  loading: boolean;
  selectedAccount: AccountOption | null;
  t: TranslationFn;
}) {
  if (loading) return <LoadingCard label={t("reporting.loading")} />;
  if (!selectedAccount) return <EmptyCard label={t("reporting.generalLedger.selectAccount")} />;
  if (error) return <ErrorCard error={error} t={t} />;
  if (!data) return <EmptyCard label={t("reporting.empty")} detail={t("reporting.emptyPostedHint")} />;

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
  error,
  loading,
  t,
}: {
  data?: ReportingAuditReport;
  error?: unknown;
  loading: boolean;
  t: TranslationFn;
}) {
  if (loading) return <LoadingCard label={t("reporting.loading")} />;
  if (error) return <ErrorCard error={error} t={t} />;
  if (!data) return <EmptyCard label={t("reporting.empty")} detail={t("reporting.emptyPostedHint")} />;

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

type TableColumnType = "text" | "code" | "name" | "amount" | "side" | "action";

function Table({
  headers,
  rows,
  emptyLabel,
  columnTypes = [],
}: {
  headers: string[];
  rows: Array<Array<ReactNode>>;
  emptyLabel: string;
  columnTypes?: TableColumnType[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full table-auto divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            {headers.map((header, index) => (
              <th key={header} className={getTableHeaderClassName(columnTypes[index])}>
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
              <tr key={index} className="transition-colors hover:bg-gray-50/70">
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className={getTableCellClassName(columnTypes[cellIndex])}>
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

function getTableHeaderClassName(type: TableColumnType = "text") {
  const base = "whitespace-nowrap px-3 py-3 text-xs font-bold uppercase text-gray-500";

  switch (type) {
    case "amount":
      return `${base} min-w-[9rem] text-end tabular-nums`;
    case "code":
      return `${base} w-28 text-start`;
    case "name":
      return `${base} min-w-[14rem] text-start`;
    case "side":
      return `${base} w-24 text-center`;
    case "action":
      return `${base} w-28 text-center`;
    default:
      return `${base} text-start`;
  }
}

function getTableCellClassName(type: TableColumnType = "text") {
  const base = "whitespace-nowrap px-3 py-3 align-middle text-gray-700";

  switch (type) {
    case "amount":
      return `${base} text-end font-medium tabular-nums text-slate-900`;
    case "code":
      return `${base} text-start font-mono text-xs text-slate-700`;
    case "name":
      return `${base} text-start font-medium text-slate-800`;
    case "side":
      return `${base} text-center`;
    case "action":
      return `${base} text-center`;
    default:
      return `${base} text-start`;
  }
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

function EmptyCard({ label, detail }: { label: string; detail?: string }) {
  return (
    <Card className="space-y-2 p-6 text-sm text-gray-500">
      <div>{label}</div>
      {detail ? <div className="text-xs text-gray-400">{detail}</div> : null}
    </Card>
  );
}

function ErrorCard({ error, t }: { error: unknown; t: TranslationFn }) {
  return (
    <Card className="space-y-2 border-rose-200 bg-rose-50 p-6 text-sm text-rose-900">
      <div className="font-semibold">{t("reporting.error")}</div>
      <div>{readErrorMessage(error)}</div>
      <div className="text-xs text-rose-700">{t("reporting.errorHint")}</div>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-bold uppercase tracking-wider text-gray-500">{label}</span>
      {children}
    </label>
  );
}

function readErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Unexpected reporting error.";
}

interface DateFilterChipProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  isActive: boolean;
  onActivate: () => void;
  onDeactivate: () => void;
  ariaLabel: string;
}

function DateFilterChip({ label, value, onChange, isActive, onActivate, onDeactivate, ariaLabel }: DateFilterChipProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isActive && inputRef.current) {
      // Use setTimeout to ensure the input is rendered and focused
      setTimeout(() => {
        inputRef.current?.focus();
        // Programmatically open native picker on supported browsers
        if (typeof inputRef.current?.showPicker === "function") {
          inputRef.current.showPicker();
        }
      }, 0);
    }
  }, [isActive]);

  const handleInputBlur = () => {
    onDeactivate();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isActive && !value) {
      e.preventDefault();
      onActivate();
    }
  };

  return (
    <div
      className={`${chipContainerClassName} ${isActive || value ? "border-primary bg-primary/10" : "border-gray-300 bg-white hover:border-gray-500 cursor-pointer"}`}
      title={label}
      onClick={handleContainerClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && !isActive) {
          e.preventDefault();
          onActivate();
        }
      }}
    >
      <span className="max-w-[102px] truncate text-sm font-semibold text-gray-800">{label}</span>
      {isActive ? (
        <input
          ref={inputRef}
          type="date"
          value={value}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          className={chipInputClassName}
          aria-label={ariaLabel}
        />
      ) : null}
    </div>
  );
}

interface SelectFilterChipProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  isActive: boolean;
  onActivate: () => void;
  onDeactivate: () => void;
  ariaLabel: string;
  children: ReactNode;
}

function SelectFilterChip({ label, value, onChange, isActive, onActivate, onDeactivate, ariaLabel, children }: SelectFilterChipProps) {
  const selectRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (isActive && selectRef.current) {
      setTimeout(() => {
        selectRef.current?.focus();
      }, 0);
    }
  }, [isActive]);

  const handleSelectBlur = () => {
    onDeactivate();
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(e.target.value);
  };

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isActive && !value) {
      e.preventDefault();
      onActivate();
    }
  };

  return (
    <div
      className={`${chipContainerClassName} ${isActive || value ? "border-primary bg-primary/10" : "border-gray-300 bg-white hover:border-gray-500 cursor-pointer"}`}
      title={label}
      onClick={handleContainerClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && !isActive) {
          e.preventDefault();
          onActivate();
        }
      }}
    >
      <span className="max-w-[102px] truncate text-sm font-semibold text-gray-800">{label}</span>
      {isActive ? (
        <select
          ref={selectRef}
          value={value}
          onChange={handleSelectChange}
          onBlur={handleSelectBlur}
          className={chipSelectClassName}
          aria-label={ariaLabel}
        >
          {children}
        </select>
      ) : null}
    </div>
  );
}

function FilterChip({ label, children, active = false }: { label: string; children: ReactNode; active?: boolean }) {
  return (
    <label
      className={`${chipContainerClassName} ${active ? "border-primary bg-primary/10" : "border-gray-300 bg-white hover:border-gray-500"}`}
      title={label}
    >
      <span className="max-w-[102px] truncate text-sm font-semibold text-gray-800">{label}</span>
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

function ReportToolbar({
  t,
  isBusy,
  definitions,
  snapshots,
  onSaveDefinition,
  onUpdateDefinition,
  onDeactivateDefinition,
  onApplyDefinition,
  onSaveSnapshot,
  onApplySnapshot,
  onLockSnapshot,
  onUnlockSnapshot,
  onVersionSnapshot,
  onPrint,
  onExport,
  selectedDefinitionId,
  permissions,
}: {
  t: TranslationFn;
  isBusy: boolean;
  definitions: ReportingDefinition[];
  snapshots: ReportingSnapshot[];
  onSaveDefinition: () => void;
  onUpdateDefinition: () => void;
  onDeactivateDefinition: (id: string) => void;
  onApplyDefinition: (d: ReportingDefinition) => void;
  onSaveSnapshot: () => void;
  onApplySnapshot: (s: ReportingSnapshot) => void;
  onLockSnapshot: (id: string) => void;
  onUnlockSnapshot: (id: string) => void;
  onVersionSnapshot: (s: ReportingSnapshot) => void;
  onPrint: () => void;
  onExport: (f: ReportingExportFormat) => void;
  selectedDefinitionId?: string;
  permissions?: ReportingCatalogItem;
}) {
  const [openDropdown, setOpenDropdown] = useState<"definitions" | "snapshots" | "export" | null>(null);

  // Default to true if permissions haven't loaded yet to avoid "nothing work" feeling
  const canSaveDef = permissions ? permissions.canSaveDefinition : true;
  const canSnap = permissions ? permissions.canSnapshot : true;
  const canExp = permissions ? permissions.canExport : true;

  return (
    <div className="mt-6 w-full app-surface p-3 flex flex-wrap items-center justify-between shadow-lg bg-white rounded-2xl border-gray-100 relative z-30 overflow-visible isolate">
      <div className="flex items-center gap-3 px-4 py-2 border-l border-gray-100 ml-2">
        <LuSettings className="h-5 w-5 text-emerald-600" />
        <span className="text-sm font-bold text-gray-900 whitespace-nowrap">{t("reporting.toolbar.title")}</span>
      </div>

      <div className="flex flex-1 flex-wrap items-center gap-4">
        {canSaveDef && (
          <div className="flex items-center gap-2">
            {selectedDefinitionId ? (
              <ToolbarButton
                label={t("reporting.action.updateDefinition")}
                icon={<LuSave className="h-4 w-4 text-emerald-600" />}
                onClick={onUpdateDefinition}
                disabled={isBusy}
              />
            ) : (
              <ToolbarButton
                label={t("reporting.toolbar.saveDefinition")}
                icon={<LuSave className="h-4 w-4 text-emerald-600" />}
                onClick={onSaveDefinition}
                disabled={isBusy}
              />
            )}
            <ToolbarDropdown
              label={t("reporting.toolbar.selectDefinition")}
              isOpen={openDropdown === "definitions"}
              onToggle={() => setOpenDropdown(openDropdown === "definitions" ? null : "definitions")}
            >
              <div className="space-y-1 max-h-[300px] overflow-y-auto p-1 custom-scrollbar">
                {definitions.length === 0 ? (
                  <div className="p-3 text-xs text-gray-500 text-center">{t("reporting.control.emptyDefinitions")}</div>
                ) : (
                  definitions.map((def) => (
                    <div
                      key={def.id}
                      onClick={() => {
                        onApplyDefinition(def);
                        setOpenDropdown(null);
                      }}
                      role="button"
                      tabIndex={0}
                      className={`w-full text-right px-4 py-2.5 rounded-xl text-sm text-gray-700 flex items-center justify-between group transition-colors cursor-pointer ${selectedDefinitionId === def.id ? "bg-emerald-50 border border-emerald-100" : "hover:bg-emerald-50"}`}
                    >
                      <div className="flex flex-col items-start pointer-events-none">
                        <span className="font-medium">{def.name}</span>
                        <span className="text-[10px] text-gray-400">{formatDate(def.updatedAt)}</span>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeactivateDefinition(def.id);
                          }}
                          className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                        >
                          <LuTrash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ToolbarDropdown>
          </div>
        )}

        {(canSaveDef || canSnap) && <div className="h-8 w-px bg-gray-100 hidden md:block" />}

        {canSnap && (
          <div className="flex items-center gap-2">
            <ToolbarButton
              label={t("reporting.toolbar.saveSnapshot")}
              icon={<LuCamera className="h-4 w-4 text-emerald-600" />}
              onClick={onSaveSnapshot}
              disabled={isBusy}
            />
            <ToolbarDropdown
              label={t("reporting.toolbar.viewSnapshots")}
              isOpen={openDropdown === "snapshots"}
              onToggle={() => setOpenDropdown(openDropdown === "snapshots" ? null : "snapshots")}
            >
              <div className="space-y-1 max-h-[300px] overflow-y-auto p-1 custom-scrollbar">
                {snapshots.length === 0 ? (
                  <div className="p-3 text-xs text-gray-500 text-center">{t("reporting.control.emptySnapshots")}</div>
                ) : (
                  snapshots.map((snap) => (
                    <div
                      key={snap.id}
                      onClick={() => {
                        onApplySnapshot(snap);
                        setOpenDropdown(null);
                      }}
                      role="button"
                      tabIndex={0}
                      className="w-full text-right px-4 py-2.5 hover:bg-emerald-50 rounded-xl text-sm text-gray-700 flex items-center justify-between group transition-colors cursor-pointer"
                    >
                      <div className="flex flex-col items-start pointer-events-none">
                        <span className="font-medium text-right w-full">{snap.name}</span>
                        <div className="flex items-center gap-2 text-[10px] text-gray-400">
                          <span>v{snap.version}</span>
                          <span>·</span>
                          <span>{formatDate(snap.createdAt)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onVersionSnapshot(snap);
                          }}
                          className="p-1.5 hover:bg-blue-50 text-gray-400 hover:text-blue-500 rounded-lg transition-colors"
                        >
                          <LuHistory className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            snap.isLocked ? onUnlockSnapshot(snap.id) : onLockSnapshot(snap.id);
                          }}
                          className="p-1.5 hover:bg-amber-50 text-gray-400 hover:text-amber-500 rounded-lg transition-colors"
                        >
                          {snap.isLocked ? <LuLock className="h-3.5 w-3.5" /> : <LuLockOpen className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ToolbarDropdown>
          </div>
        )}

        {canExp && <div className="h-8 w-px bg-gray-100 hidden md:block" />}

        {canExp && (
          <div className="flex items-center gap-2">
            <ToolbarButton
              label={t("reporting.toolbar.print")}
              icon={<LuPrinter className="h-4 w-4 text-emerald-600" />}
              onClick={onPrint}
              disabled={isBusy}
            />
            <ToolbarDropdown
              label={t("reporting.toolbar.export")}
              isOpen={openDropdown === "export"}
              onToggle={() => setOpenDropdown(openDropdown === "export" ? null : "export")}
            >
              <div className="p-1 space-y-1">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    onExport("PDF");
                    setOpenDropdown(null);
                  }}
                  className="w-full text-right px-4 py-2.5 hover:bg-emerald-50 rounded-xl text-sm text-gray-700 flex items-center gap-3 transition-colors cursor-pointer"
                >
                  <LuFileText className="h-4 w-4 text-emerald-500" />
                  <span className="pointer-events-none">{t("reporting.export.PDF")}</span>
                </div>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    onExport("EXCEL");
                    setOpenDropdown(null);
                  }}
                  className="w-full text-right px-4 py-2.5 hover:bg-emerald-50 rounded-xl text-sm text-gray-700 flex items-center gap-3 transition-colors cursor-pointer"
                >
                  <LuFileSpreadsheet className="h-4 w-4 text-emerald-500" />
                  <span className="pointer-events-none">{t("reporting.export.EXCEL")}</span>
                </div>
              </div>
            </ToolbarDropdown>
          </div>
        )}
      </div>
    </div>
  );
}

function ToolbarButton({ label, icon, onClick, disabled }: { label: string; icon?: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        onClick();
      }}
      disabled={disabled}
      className="flex h-[42px] items-center gap-2 rounded-full border border-gray-200 bg-white px-5 text-sm font-bold text-slate-900 shadow-sm transition-all hover:bg-gray-50 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 whitespace-nowrap cursor-pointer pointer-events-auto"
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function ToolbarDropdown({ label, isOpen, onToggle, children }: { label: string; isOpen: boolean; onToggle: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onToggle();
      }
    };
    document.addEventListener("mousedown", handleClick, true);
    return () => document.removeEventListener("mousedown", handleClick, true);
  }, [isOpen, onToggle]);

  return (
    <div ref={ref} className="relative overflow-visible">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          onToggle();
        }}
        className="flex h-[42px] items-center gap-2 rounded-full border border-gray-200 bg-white px-5 text-sm font-bold text-slate-900 shadow-sm transition-all hover:bg-gray-50 hover:-translate-y-0.5 active:translate-y-0 whitespace-nowrap cursor-pointer pointer-events-auto"
      >
        <span>{label}</span>
        <LuChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen && (
        <div className="absolute right-0 top-full z-[100] mt-2 min-w-[300px] rounded-2xl border border-gray-100 bg-white p-2 shadow-2xl animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
          {children}
        </div>
      )}
    </div>
  );
}

type TranslationFn = (key: string, vars?: Record<string, string | number>) => string;

const inputClassName =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20";

const chipContainerClassName =
  "inline-flex h-10 max-w-full items-center gap-1.5 rounded-full border px-3 transition";

const chipInputClassName =
  "h-8 w-[124px] rounded-full border border-transparent bg-transparent px-2 text-sm text-gray-900 outline-none focus:border-gray-300";

const chipSelectClassName =
  "h-8 w-[138px] max-w-[138px] rounded-full border border-transparent bg-transparent px-2 pr-6 text-sm text-gray-900 outline-none focus:border-gray-300";

const chipToggleClassName = "inline-flex h-10 items-center justify-center rounded-full border bg-white px-4 text-sm font-semibold transition";
