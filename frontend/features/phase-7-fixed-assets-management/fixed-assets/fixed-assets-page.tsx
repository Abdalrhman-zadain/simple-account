"use client";

import { useEffect, useMemo, useState } from "react";

import {
  createFixedAsset,
  createFixedAssetAcquisition,
  createFixedAssetCategory,
  createFixedAssetDepreciationRun,
  createFixedAssetDisposal,
  createFixedAssetTransfer,
  deactivateFixedAsset,
  getFixedAsset,
  getAccountOptions,
  getFixedAssetAcquisitions,
  getFixedAssetCategories,
  getFixedAssetDepreciationRuns,
  getFixedAssetDisposals,
  getFixedAssets,
  getFixedAssetSummary,
  getFixedAssetTransfers,
  postFixedAssetAcquisition,
  postFixedAssetDepreciationRun,
  postFixedAssetDisposal,
  postFixedAssetTransfer,
  reverseFixedAssetAcquisition,
  reverseFixedAssetDepreciationRun,
  reverseFixedAssetDisposal,
  reverseFixedAssetTransfer,
  updateFixedAsset,
} from "@/lib/api";
import { useTranslation } from "@/lib/i18n";
import { Button, Card, PageShell, SectionHeading, SidePanel, StatusPill } from "@/components/ui";
import { useAuth } from "@/providers/auth-provider";
import type {
  AccountOption,
  FixedAsset,
  FixedAssetAcquisition,
  FixedAssetCategory,
  FixedAssetDepreciationMethod,
  FixedAssetDepreciationRun,
  FixedAssetDisposal,
  FixedAssetDisposalMethod,
  FixedAssetSummary,
  FixedAssetTransfer,
} from "@/types/api";

type Tab = "categories" | "assets" | "acquisitions" | "depreciation" | "disposals" | "transfers" | "summary";

const tabs: Array<{ id: Tab; labelKey: string }> = [
  { id: "categories", labelKey: "fixedAssets.tab.categories" },
  { id: "assets", labelKey: "fixedAssets.tab.assets" },
  { id: "acquisitions", labelKey: "fixedAssets.tab.acquisitions" },
  { id: "depreciation", labelKey: "fixedAssets.tab.depreciation" },
  { id: "disposals", labelKey: "fixedAssets.tab.disposals" },
  { id: "transfers", labelKey: "fixedAssets.tab.transfers" },
  { id: "summary", labelKey: "fixedAssets.tab.summary" },
];

export function FixedAssetsPage() {
  const { token } = useAuth();
  const { t, language } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>("assets");
  const [categories, setCategories] = useState<FixedAssetCategory[]>([]);
  const [assets, setAssets] = useState<FixedAsset[]>([]);
  const [acquisitions, setAcquisitions] = useState<FixedAssetAcquisition[]>([]);
  const [depreciationRuns, setDepreciationRuns] = useState<FixedAssetDepreciationRun[]>([]);
  const [disposals, setDisposals] = useState<FixedAssetDisposal[]>([]);
  const [transfers, setTransfers] = useState<FixedAssetTransfer[]>([]);
  const [summary, setSummary] = useState<FixedAssetSummary | null>(null);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string>("");
  const [selectedAsset, setSelectedAsset] = useState<FixedAsset | null>(null);
  const [isAssetEditOpen, setIsAssetEditOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function refresh() {
    if (!token) return;
    setIsLoading(true);
    try {
      const [categoryRows, assetRows, acquisitionRows, depreciationRows, disposalRows, transferRows, summaryRow, accountRows] = await Promise.all([
        getFixedAssetCategories({}, token),
        getFixedAssets({}, token),
        getFixedAssetAcquisitions({}, token),
        getFixedAssetDepreciationRuns({}, token),
        getFixedAssetDisposals({}, token),
        getFixedAssetTransfers({}, token),
        getFixedAssetSummary(token),
        getAccountOptions({ isPosting: "true", isActive: "true" }, token),
      ]);
      setCategories(categoryRows);
      setAssets(assetRows);
      setAcquisitions(acquisitionRows);
      setDepreciationRuns(depreciationRows);
      setDisposals(disposalRows);
      setTransfers(transferRows);
      setSummary(summaryRow);
      setAccounts(accountRows);
      if (selectedAssetId) {
        setSelectedAsset(await getFixedAsset(selectedAssetId, token));
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : t("fixedAssets.error.loadFallback");
      setMessage(t("fixedAssets.error.load", { detail }));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, [token]);

  useEffect(() => {
    if (!token || !selectedAssetId) {
      setSelectedAsset(null);
      return;
    }
    void getFixedAsset(selectedAssetId, token)
      .then(setSelectedAsset)
      .catch((error) => {
        setMessage(error instanceof Error ? error.message : t("fixedAssets.error.actionFailed"));
      });
  }, [selectedAssetId, token]);

  async function submitForm(form: HTMLFormElement, action: (data: FormData) => Promise<void>) {
    setMessage(null);
    try {
      await action(new FormData(form));
      form.reset();
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("fixedAssets.error.actionFailed"));
    }
  }

  const categoryOptions = categories.map((category) => ({
    value: category.id,
    label: `${category.code} - ${localizedCategoryName(category, language)}`,
  }));
  const assetOptions = assets.map((asset) => ({ value: asset.id, label: `${asset.code} - ${asset.name}` }));
  const activeAssetOptions = assets.filter((asset) => asset.status === "ACTIVE").map((asset) => ({ value: asset.id, label: `${asset.code} - ${asset.name}` }));
  const assetAccountOptions = accounts.filter((account) => account.code.startsWith("1") || account.code.startsWith("5") || account.code.startsWith("4"));

  const latestDraftAcquisition = useMemo(() => acquisitions.find((row) => row.status === "DRAFT"), [acquisitions]);
  const latestDraftDepreciation = useMemo(() => depreciationRuns.find((row) => row.status === "DRAFT"), [depreciationRuns]);
  const latestDraftDisposal = useMemo(() => disposals.find((row) => row.status === "DRAFT"), [disposals]);
  const latestDraftTransfer = useMemo(() => transfers.find((row) => row.status === "DRAFT"), [transfers]);

  return (
    <PageShell>
      <SectionHeading title={t("fixedAssets.title")} description={t("fixedAssets.description")} />

      {message ? <Card className="mb-6 border border-orange-200 bg-orange-50 p-4 text-sm text-orange-800">{message}</Card> : null}

      <Card className="mb-6 flex flex-wrap gap-3 p-3">
        {tabs.map((tab) => (
          <Button key={tab.id} type="button" variant={activeTab === tab.id ? "primary" : "secondary"} onClick={() => setActiveTab(tab.id)}>
            {t(tab.labelKey)}
          </Button>
        ))}
      </Card>

      {isLoading ? <Card className="p-5 text-sm text-gray-600">{t("fixedAssets.loading")}</Card> : null}

      {activeTab === "categories" ? (
        <WorkspaceGrid buttonLabel={t("fixedAssets.action.newCategory")} title={t("fixedAssets.category.title")} form={
          <form className="grid gap-3" onSubmit={(event) => {
            event.preventDefault();
            void submitForm(event.currentTarget, async (data) => {
              await createFixedAssetCategory({
                code: value(data, "code"),
                name: required(data, "name"),
                nameAr: value(data, "nameAr"),
                description: value(data, "description"),
                assetAccountId: required(data, "assetAccountId"),
                accumulatedDepreciationAccountId: required(data, "accumulatedDepreciationAccountId"),
                depreciationExpenseAccountId: required(data, "depreciationExpenseAccountId"),
                disposalGainAccountId: value(data, "disposalGainAccountId"),
                disposalLossAccountId: value(data, "disposalLossAccountId"),
              }, token);
            });
          }}>
            <Input name="code" placeholder={t("fixedAssets.field.code")} />
            <Input name="name" placeholder={t("fixedAssets.field.name")} required />
            <Input name="nameAr" placeholder={t("fixedAssets.field.nameAr")} />
            <Input name="description" placeholder={t("fixedAssets.field.description")} />
            <AccountSelect name="assetAccountId" accounts={assetAccountOptions} label={t("fixedAssets.placeholder.assetAccount")} required />
            <AccountSelect name="accumulatedDepreciationAccountId" accounts={assetAccountOptions} label={t("fixedAssets.placeholder.accumulatedAccount")} required />
            <AccountSelect name="depreciationExpenseAccountId" accounts={assetAccountOptions} label={t("fixedAssets.placeholder.expenseAccount")} required />
            <AccountSelect name="disposalGainAccountId" accounts={assetAccountOptions} label={t("fixedAssets.placeholder.gainAccount")} />
            <AccountSelect name="disposalLossAccountId" accounts={assetAccountOptions} label={t("fixedAssets.placeholder.lossAccount")} />
            <Button type="submit">{t("fixedAssets.action.saveCategory")}</Button>
          </form>
        }>
          <DataTable
            columns={[t("fixedAssets.column.code"), t("fixedAssets.column.name"), t("fixedAssets.column.assets"), t("fixedAssets.column.assetAccount"), t("fixedAssets.column.status")]}
            rows={categories.map((category) => [
              category.code,
              localizedCategoryName(category, language),
              String(category.assetCount),
              `${category.assetAccount.code} - ${category.assetAccount.name}`,
              category.isActive ? t("fixedAssets.boolean.yes") : t("fixedAssets.boolean.no"),
            ])}
          />
        </WorkspaceGrid>
      ) : null}

      {activeTab === "assets" ? (
        <WorkspaceGrid buttonLabel={t("fixedAssets.action.newAsset")} title={t("fixedAssets.asset.title")} form={
          <form className="grid gap-3" onSubmit={(event) => {
            event.preventDefault();
            void submitForm(event.currentTarget, async (data) => {
              await createFixedAsset({
                code: value(data, "code"),
                name: required(data, "name"),
                categoryId: required(data, "categoryId"),
                acquisitionDate: required(data, "acquisitionDate"),
                depreciationStartDate: required(data, "depreciationStartDate"),
                usefulLifeMonths: Number(required(data, "usefulLifeMonths")),
                depreciationMethod: required(data, "depreciationMethod") as FixedAssetDepreciationMethod,
                residualValue: numberValue(data, "residualValue"),
                department: value(data, "department"),
                costCenter: value(data, "costCenter"),
                employee: value(data, "employee"),
                location: value(data, "location"),
                branch: value(data, "branch"),
              }, token);
            });
          }}>
            <Input name="code" placeholder={t("fixedAssets.field.code")} />
            <Input name="name" placeholder={t("fixedAssets.field.name")} required />
            <OptionSelect name="categoryId" label={t("fixedAssets.placeholder.category")} options={categoryOptions} required />
            <Input name="acquisitionDate" type="date" required />
            <Input name="depreciationStartDate" type="date" required />
            <Input name="usefulLifeMonths" type="number" min={1} placeholder={t("fixedAssets.field.usefulLifeMonths")} required />
            <Select name="depreciationMethod" options={["STRAIGHT_LINE", "DECLINING_BALANCE"]} getLabel={(option) => t(`fixedAssets.depreciationMethod.${option}`)} />
            <Input name="residualValue" type="number" step="0.01" placeholder={t("fixedAssets.field.residualValue")} />
            <Input name="department" placeholder={t("fixedAssets.field.department")} />
            <Input name="costCenter" placeholder={t("fixedAssets.field.costCenter")} />
            <Input name="employee" placeholder={t("fixedAssets.field.employee")} />
            <Input name="location" placeholder={t("fixedAssets.field.location")} />
            <Input name="branch" placeholder={t("fixedAssets.field.branch")} />
            <Button type="submit">{t("fixedAssets.action.saveAsset")}</Button>
          </form>
        }>
          <ActionBar
            actions={[
              {
                label: t("fixedAssets.action.editSelectedAsset"),
                disabled: !selectedAsset || selectedAsset.status === "DISPOSED" || Number(selectedAsset.accumulatedDepreciation) > 0,
                onClick: () => setIsAssetEditOpen(true),
              },
              {
                label: t("fixedAssets.action.deactivateSelectedAsset"),
                disabled: !selectedAsset || selectedAsset.status !== "ACTIVE",
                onClick: () => {
                  if (selectedAsset) {
                    void submitAction(() => deactivateFixedAsset(selectedAsset.id, token), async () => {
                      await refresh();
                      setSelectedAsset(await getFixedAsset(selectedAsset.id, token));
                    }, setMessage, t);
                  }
                },
              },
            ]}
          />
          <div className="mb-4 grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
            <Card className="p-4">
              <p className="mb-2 text-xs uppercase text-gray-500">{t("fixedAssets.asset.title")}</p>
              <OptionSelect name="selectedAssetId" label={t("fixedAssets.placeholder.selectAssetDetails")} options={assetOptions} value={selectedAssetId} onChange={(event) => setSelectedAssetId(event.currentTarget.value)} />
            </Card>
            {selectedAsset ? (
              <Card className="p-4">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <Metric label={t("fixedAssets.column.cost")} value={selectedAsset.acquisitionCost} />
                  <Metric label={t("fixedAssets.column.accumulated")} value={selectedAsset.accumulatedDepreciation} />
                  <Metric label={t("fixedAssets.column.bookValue")} value={selectedAsset.bookValue} />
                  <Metric label={t("fixedAssets.column.status")} value={t(`fixedAssets.status.${selectedAsset.status}`)} />
                </div>
              </Card>
            ) : null}
          </div>
          <DataTable
            columns={[t("fixedAssets.column.code"), t("fixedAssets.column.name"), t("fixedAssets.column.category"), t("fixedAssets.column.cost"), t("fixedAssets.column.accumulated"), t("fixedAssets.column.bookValue"), t("fixedAssets.column.status")]}
            rows={assets.map((asset) => [
              asset.code,
              asset.name,
              localizedCategoryName(asset.category, language),
              asset.acquisitionCost,
              asset.accumulatedDepreciation,
              asset.bookValue,
              t(`fixedAssets.status.${asset.status}`),
            ])}
          />
          {selectedAsset ? (
            <div className="mt-6 grid gap-6 xl:grid-cols-2">
              <Card className="overflow-x-auto p-5">
                <p className="mb-4 text-sm font-semibold text-gray-900">{t("fixedAssets.section.depreciationSchedule")}</p>
                <DataTable
                  columns={[t("fixedAssets.column.period"), t("fixedAssets.column.amount"), t("fixedAssets.column.accumulated"), t("fixedAssets.column.bookValue")]}
                  rows={selectedAsset.depreciationSchedule.slice(0, 24).map((line) => [
                    formatDate(line.periodStart),
                    line.amount,
                    line.projectedAccumulated,
                    line.projectedBookValue,
                  ])}
                />
              </Card>
              <Card className="overflow-x-auto p-5">
                <p className="mb-4 text-sm font-semibold text-gray-900">{t("fixedAssets.section.auditHistory")}</p>
                <DataTable
                  columns={[t("fixedAssets.column.entity"), t("fixedAssets.column.action"), t("fixedAssets.column.createdAt")]}
                  rows={(selectedAsset.auditHistory ?? []).map((item) => [
                    item.entity,
                    item.action,
                    formatDate(item.createdAt),
                  ])}
                />
              </Card>
            </div>
          ) : null}
        </WorkspaceGrid>
      ) : null}

      <SidePanel isOpen={isAssetEditOpen} onClose={() => setIsAssetEditOpen(false)} title={t("fixedAssets.action.editSelectedAsset")}>
        {selectedAsset ? (
          <form className="grid gap-3" onSubmit={(event) => {
            event.preventDefault();
            void submitForm(event.currentTarget, async (data) => {
              await updateFixedAsset(selectedAsset.id, {
                name: required(data, "name"),
                categoryId: required(data, "categoryId"),
                acquisitionDate: required(data, "acquisitionDate"),
                depreciationStartDate: required(data, "depreciationStartDate"),
                usefulLifeMonths: Number(required(data, "usefulLifeMonths")),
                depreciationMethod: required(data, "depreciationMethod") as FixedAssetDepreciationMethod,
                residualValue: numberValue(data, "residualValue"),
                department: value(data, "department"),
                costCenter: value(data, "costCenter"),
                employee: value(data, "employee"),
                location: value(data, "location"),
                branch: value(data, "branch"),
              }, token);
              setIsAssetEditOpen(false);
            });
          }}>
            <Input name="name" placeholder={t("fixedAssets.field.name")} defaultValue={selectedAsset.name} required />
            <OptionSelect name="categoryId" label={t("fixedAssets.placeholder.category")} options={categoryOptions} defaultValue={selectedAsset.categoryId} required />
            <Input name="acquisitionDate" type="date" defaultValue={selectedAsset.acquisitionDate.slice(0, 10)} required />
            <Input name="depreciationStartDate" type="date" defaultValue={selectedAsset.depreciationStartDate.slice(0, 10)} required />
            <Input name="usefulLifeMonths" type="number" min={1} defaultValue={selectedAsset.usefulLifeMonths} required />
            <Select name="depreciationMethod" options={["STRAIGHT_LINE", "DECLINING_BALANCE"]} defaultValue={selectedAsset.depreciationMethod} getLabel={(option) => t(`fixedAssets.depreciationMethod.${option}`)} />
            <Input name="residualValue" type="number" step="0.01" defaultValue={selectedAsset.residualValue} />
            <Input name="department" defaultValue={selectedAsset.department ?? ""} placeholder={t("fixedAssets.field.department")} />
            <Input name="costCenter" defaultValue={selectedAsset.costCenter ?? ""} placeholder={t("fixedAssets.field.costCenter")} />
            <Input name="employee" defaultValue={selectedAsset.employee ?? ""} placeholder={t("fixedAssets.field.employee")} />
            <Input name="location" defaultValue={selectedAsset.location ?? ""} placeholder={t("fixedAssets.field.location")} />
            <Input name="branch" defaultValue={selectedAsset.branch ?? ""} placeholder={t("fixedAssets.field.branch")} />
            <Button type="submit">{t("fixedAssets.action.saveAssetChanges")}</Button>
          </form>
        ) : null}
      </SidePanel>

      {activeTab === "acquisitions" ? (
        <WorkspaceGrid buttonLabel={t("fixedAssets.action.newAcquisition")} title={t("fixedAssets.acquisition.title")} form={
          <form className="grid gap-3" onSubmit={(event) => {
            event.preventDefault();
            void submitForm(event.currentTarget, async (data) => {
              await createFixedAssetAcquisition({
                reference: value(data, "reference"),
                assetId: required(data, "assetId"),
                acquisitionDate: required(data, "acquisitionDate"),
                acquisitionCost: Number(required(data, "acquisitionCost")),
                capitalizedCost: numberValue(data, "capitalizedCost"),
                supplierReference: value(data, "supplierReference"),
                purchaseInvoiceReference: value(data, "purchaseInvoiceReference"),
                paymentReference: value(data, "paymentReference"),
                clearingAccountId: required(data, "clearingAccountId"),
                description: value(data, "description"),
              }, token);
            });
          }}>
            <Input name="reference" placeholder={t("fixedAssets.field.reference")} />
            <OptionSelect name="assetId" label={t("fixedAssets.placeholder.asset")} options={activeAssetOptions} required />
            <Input name="acquisitionDate" type="date" required />
            <Input name="acquisitionCost" type="number" step="0.01" placeholder={t("fixedAssets.field.acquisitionCost")} required />
            <Input name="capitalizedCost" type="number" step="0.01" placeholder={t("fixedAssets.field.capitalizedCost")} />
            <Input name="supplierReference" placeholder={t("fixedAssets.field.supplierReference")} />
            <Input name="purchaseInvoiceReference" placeholder={t("fixedAssets.field.purchaseInvoiceReference")} />
            <Input name="paymentReference" placeholder={t("fixedAssets.field.paymentReference")} />
            <AccountSelect name="clearingAccountId" accounts={assetAccountOptions} label={t("fixedAssets.placeholder.clearingAccount")} required />
            <Input name="description" placeholder={t("fixedAssets.field.description")} />
            <Button type="submit">{t("fixedAssets.action.saveAcquisition")}</Button>
          </form>
        }>
          <ActionBar
            actions={[
              { label: t("fixedAssets.action.postDraft"), disabled: !latestDraftAcquisition, onClick: () => latestDraftAcquisition && void submitAction(() => postFixedAssetAcquisition(latestDraftAcquisition.id, token), refresh, setMessage, t) },
              { label: t("fixedAssets.action.reverseLatest"), disabled: !acquisitions.find((row) => row.status === "POSTED"), onClick: () => {
                const row = acquisitions.find((item) => item.status === "POSTED");
                if (row) void submitAction(() => reverseFixedAssetAcquisition(row.id, token), refresh, setMessage, t);
              } },
            ]}
          />
          <DataTable
            columns={[t("fixedAssets.column.reference"), t("fixedAssets.column.asset"), t("fixedAssets.column.amount"), t("fixedAssets.column.clearingAccount"), t("fixedAssets.column.status")]}
            rows={acquisitions.map((item) => [
              item.reference,
              item.asset.name,
              item.totalCost,
              `${item.clearingAccount.code} - ${item.clearingAccount.name}`,
              item.status === "POSTED" ? <StatusPill key={item.id} label={t(`fixedAssets.transactionStatus.${item.status}`)} tone="positive" /> : t(`fixedAssets.transactionStatus.${item.status}`),
            ])}
          />
        </WorkspaceGrid>
      ) : null}

      {activeTab === "depreciation" ? (
        <WorkspaceGrid buttonLabel={t("fixedAssets.action.newDepreciationRun")} title={t("fixedAssets.depreciation.title")} form={
          <form className="grid gap-3" onSubmit={(event) => {
            event.preventDefault();
            void submitForm(event.currentTarget, async (data) => {
              await createFixedAssetDepreciationRun({
                reference: value(data, "reference"),
                periodStart: required(data, "periodStart"),
                periodEnd: required(data, "periodEnd"),
                categoryId: value(data, "categoryId"),
                assetId: value(data, "assetId"),
                description: value(data, "description"),
              }, token);
            });
          }}>
            <Input name="reference" placeholder={t("fixedAssets.field.reference")} />
            <Input name="periodStart" type="date" required />
            <Input name="periodEnd" type="date" required />
            <OptionSelect name="categoryId" label={t("fixedAssets.placeholder.allCategories")} options={categoryOptions} />
            <OptionSelect name="assetId" label={t("fixedAssets.placeholder.singleAsset")} options={activeAssetOptions} />
            <Input name="description" placeholder={t("fixedAssets.field.description")} />
            <Button type="submit">{t("fixedAssets.action.saveDepreciationRun")}</Button>
          </form>
        }>
          <ActionBar
            actions={[
              { label: t("fixedAssets.action.postDraft"), disabled: !latestDraftDepreciation, onClick: () => latestDraftDepreciation && void submitAction(() => postFixedAssetDepreciationRun(latestDraftDepreciation.id, token), refresh, setMessage, t) },
              { label: t("fixedAssets.action.reverseLatest"), disabled: !depreciationRuns.find((row) => row.status === "POSTED"), onClick: () => {
                const row = depreciationRuns.find((item) => item.status === "POSTED");
                if (row) void submitAction(() => reverseFixedAssetDepreciationRun(row.id, token), refresh, setMessage, t);
              } },
            ]}
          />
          <DataTable
            columns={[t("fixedAssets.column.reference"), t("fixedAssets.column.period"), t("fixedAssets.column.scope"), t("fixedAssets.column.amount"), t("fixedAssets.column.status")]}
            rows={depreciationRuns.map((run) => [
              run.reference,
              `${formatDate(run.periodStart)} - ${formatDate(run.periodEnd)}`,
              run.scope,
              run.totalAmount,
              run.status === "POSTED" ? <StatusPill key={run.id} label={t(`fixedAssets.transactionStatus.${run.status}`)} tone="positive" /> : t(`fixedAssets.transactionStatus.${run.status}`),
            ])}
          />
        </WorkspaceGrid>
      ) : null}

      {activeTab === "disposals" ? (
        <WorkspaceGrid buttonLabel={t("fixedAssets.action.newDisposal")} title={t("fixedAssets.disposal.title")} form={
          <form className="grid gap-3" onSubmit={(event) => {
            event.preventDefault();
            void submitForm(event.currentTarget, async (data) => {
              await createFixedAssetDisposal({
                reference: value(data, "reference"),
                assetId: required(data, "assetId"),
                disposalDate: required(data, "disposalDate"),
                method: required(data, "method") as FixedAssetDisposalMethod,
                proceedsAmount: numberValue(data, "proceedsAmount"),
                disposalExpense: numberValue(data, "disposalExpense"),
                proceedsAccountId: value(data, "proceedsAccountId"),
                disposalExpenseAccountId: value(data, "disposalExpenseAccountId"),
                description: value(data, "description"),
              }, token);
            });
          }}>
            <Input name="reference" placeholder={t("fixedAssets.field.reference")} />
            <OptionSelect name="assetId" label={t("fixedAssets.placeholder.asset")} options={activeAssetOptions} required />
            <Input name="disposalDate" type="date" required />
            <Select name="method" options={["SALE", "WRITE_OFF", "SCRAP", "OTHER"]} getLabel={(option) => t(`fixedAssets.disposalMethod.${option}`)} />
            <Input name="proceedsAmount" type="number" step="0.01" placeholder={t("fixedAssets.field.proceedsAmount")} />
            <Input name="disposalExpense" type="number" step="0.01" placeholder={t("fixedAssets.field.disposalExpense")} />
            <AccountSelect name="proceedsAccountId" accounts={assetAccountOptions} label={t("fixedAssets.placeholder.proceedsAccount")} />
            <AccountSelect name="disposalExpenseAccountId" accounts={assetAccountOptions} label={t("fixedAssets.placeholder.disposalExpenseAccount")} />
            <Input name="description" placeholder={t("fixedAssets.field.description")} />
            <Button type="submit">{t("fixedAssets.action.saveDisposal")}</Button>
          </form>
        }>
          <ActionBar
            actions={[
              { label: t("fixedAssets.action.postDraft"), disabled: !latestDraftDisposal, onClick: () => latestDraftDisposal && void submitAction(() => postFixedAssetDisposal(latestDraftDisposal.id, token), refresh, setMessage, t) },
              { label: t("fixedAssets.action.reverseLatest"), disabled: !disposals.find((row) => row.status === "POSTED"), onClick: () => {
                const row = disposals.find((item) => item.status === "POSTED");
                if (row) void submitAction(() => reverseFixedAssetDisposal(row.id, token), refresh, setMessage, t);
              } },
            ]}
          />
          <DataTable
            columns={[t("fixedAssets.column.reference"), t("fixedAssets.column.asset"), t("fixedAssets.column.method"), t("fixedAssets.column.gainLoss"), t("fixedAssets.column.status")]}
            rows={disposals.map((item) => [
              item.reference,
              item.asset.name,
              t(`fixedAssets.disposalMethod.${item.method}`),
              item.gainLossAmount,
              item.status === "POSTED" ? <StatusPill key={item.id} label={t(`fixedAssets.transactionStatus.${item.status}`)} tone="positive" /> : t(`fixedAssets.transactionStatus.${item.status}`),
            ])}
          />
        </WorkspaceGrid>
      ) : null}

      {activeTab === "transfers" ? (
        <WorkspaceGrid buttonLabel={t("fixedAssets.action.newTransfer")} title={t("fixedAssets.transfer.title")} form={
          <form className="grid gap-3" onSubmit={(event) => {
            event.preventDefault();
            void submitForm(event.currentTarget, async (data) => {
              await createFixedAssetTransfer({
                reference: value(data, "reference"),
                assetId: required(data, "assetId"),
                transferDate: required(data, "transferDate"),
                toDepartment: value(data, "toDepartment"),
                toCostCenter: value(data, "toCostCenter"),
                toEmployee: value(data, "toEmployee"),
                toLocation: value(data, "toLocation"),
                toBranch: value(data, "toBranch"),
                reason: value(data, "reason"),
              }, token);
            });
          }}>
            <Input name="reference" placeholder={t("fixedAssets.field.reference")} />
            <OptionSelect name="assetId" label={t("fixedAssets.placeholder.asset")} options={activeAssetOptions} required />
            <Input name="transferDate" type="date" required />
            <Input name="toDepartment" placeholder={t("fixedAssets.field.department")} />
            <Input name="toCostCenter" placeholder={t("fixedAssets.field.costCenter")} />
            <Input name="toEmployee" placeholder={t("fixedAssets.field.employee")} />
            <Input name="toLocation" placeholder={t("fixedAssets.field.location")} />
            <Input name="toBranch" placeholder={t("fixedAssets.field.branch")} />
            <Input name="reason" placeholder={t("fixedAssets.field.reason")} />
            <Button type="submit">{t("fixedAssets.action.saveTransfer")}</Button>
          </form>
        }>
          <ActionBar
            actions={[
              { label: t("fixedAssets.action.postDraft"), disabled: !latestDraftTransfer, onClick: () => latestDraftTransfer && void submitAction(() => postFixedAssetTransfer(latestDraftTransfer.id, token), refresh, setMessage, t) },
              { label: t("fixedAssets.action.reverseLatest"), disabled: !transfers.find((row) => row.status === "POSTED"), onClick: () => {
                const row = transfers.find((item) => item.status === "POSTED");
                if (row) void submitAction(() => reverseFixedAssetTransfer(row.id, token), refresh, setMessage, t);
              } },
            ]}
          />
          <DataTable
            columns={[t("fixedAssets.column.reference"), t("fixedAssets.column.asset"), t("fixedAssets.column.transferTo"), t("fixedAssets.column.reason"), t("fixedAssets.column.status")]}
            rows={transfers.map((item) => [
              item.reference,
              item.asset.name,
              item.toLocation || item.toDepartment || item.toBranch || "-",
              item.reason || "-",
              item.status === "POSTED" ? <StatusPill key={item.id} label={t(`fixedAssets.transactionStatus.${item.status}`)} tone="positive" /> : t(`fixedAssets.transactionStatus.${item.status}`),
            ])}
          />
        </WorkspaceGrid>
      ) : null}

      {activeTab === "summary" && summary ? (
        <div className="grid gap-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Metric label={t("fixedAssets.metric.assetCount")} value={String(summary.assetCount)} />
            <Metric label={t("fixedAssets.metric.activeAssetCount")} value={String(summary.activeAssetCount)} />
            <Metric label={t("fixedAssets.metric.acquisitionCost")} value={summary.acquisitionCost} />
            <Metric label={t("fixedAssets.metric.bookValue")} value={summary.bookValue} />
          </div>
          <Card className="p-5">
            <DataTable
              columns={[t("fixedAssets.column.metric"), t("fixedAssets.column.value")]}
              rows={[
                [t("fixedAssets.metric.accumulatedDepreciation"), summary.accumulatedDepreciation],
                [t("fixedAssets.metric.postedAcquisitions"), String(summary.postedAcquisitions)],
                [t("fixedAssets.metric.postedDepreciationRuns"), String(summary.postedDepreciationRuns)],
                [t("fixedAssets.metric.postedDisposals"), String(summary.postedDisposals)],
                [t("fixedAssets.metric.postedTransfers"), String(summary.postedTransfers)],
              ]}
            />
          </Card>
        </div>
      ) : null}
    </PageShell>
  );
}

function WorkspaceGrid({ buttonLabel, children, form, title }: { buttonLabel: string; children: React.ReactNode; form: React.ReactNode; title: string }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button type="button" onClick={() => setIsOpen(true)}>{buttonLabel}</Button>
      </div>
      <Card className="overflow-x-auto p-5">{children}</Card>
      <SidePanel isOpen={isOpen} onClose={() => setIsOpen(false)} title={title}>{form}</SidePanel>
    </div>
  );
}

function ActionBar({ actions }: { actions: Array<{ label: string; disabled?: boolean; onClick: () => void }> }) {
  return <div className="mb-4 flex flex-wrap gap-2">{actions.map((action) => <Button key={action.label} disabled={action.disabled} onClick={action.onClick}>{action.label}</Button>)}</div>;
}

function DataTable({ columns, rows }: { columns: string[]; rows: React.ReactNode[][] }) {
  return (
    <table className="w-full min-w-[760px] text-left text-sm">
      <thead><tr className="border-b text-xs uppercase text-gray-500">{columns.map((column) => <th key={column} className="px-3 py-2">{column}</th>)}</tr></thead>
      <tbody>{rows.map((row, index) => <tr key={index} className="border-b last:border-0">{row.map((cell, cellIndex) => <td key={cellIndex} className="px-3 py-3 align-middle">{cell}</td>)}</tr>)}</tbody>
    </table>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <Card className="p-5"><p className="text-xs uppercase text-gray-500">{label}</p><p className="mt-2 text-2xl font-black text-gray-900">{value}</p></Card>;
}

const controlClassName = "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none transition-all placeholder:text-gray-500 focus:border-teal-500 focus:bg-gray-50 focus:ring-4 focus:ring-teal-500/10";

function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={[controlClassName, className].filter(Boolean).join(" ")} />;
}

function Select({ options, getLabel, className, ...props }: { options: string[]; getLabel?: (option: string) => string } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={[controlClassName, "[&>option]:bg-white", className].filter(Boolean).join(" ")}>{options.map((option) => <option key={option} value={option}>{getLabel ? getLabel(option) : option}</option>)}</select>;
}

function OptionSelect({ options, label, className, ...props }: { options: Array<{ value: string; label: string }>; label: string } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={[controlClassName, "[&>option]:bg-white", className].filter(Boolean).join(" ")}><option value="">{label}</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>;
}

function AccountSelect({ accounts, label, required, name }: { accounts: AccountOption[]; label: string; required?: boolean; name: string }) {
  return <select name={name} required={required} className={`${controlClassName} [&>option]:bg-white`}><option value="">{label}</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.code} - {account.name}</option>)}</select>;
}

function localizedCategoryName(category: FixedAssetCategory | null | undefined, language: string) {
  if (!category) return "-";
  return language === "ar" && category.nameAr ? category.nameAr : category.name;
}

function value(data: FormData, key: string) {
  return String(data.get(key) ?? "").trim() || undefined;
}

function required(data: FormData, key: string) {
  const next = value(data, key);
  if (!next) throw new Error(`${key} is required.`);
  return next;
}

function numberValue(data: FormData, key: string) {
  const next = value(data, key);
  return next ? Number(next) : undefined;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}

async function submitAction(
  action: () => Promise<unknown>,
  refresh: () => Promise<void>,
  setMessage: (message: string | null) => void,
  t: (key: string, vars?: Record<string, string | number>) => string,
) {
  setMessage(null);
  try {
    await action();
    await refresh();
  } catch (error) {
    setMessage(error instanceof Error ? error.message : t("fixedAssets.error.actionFailed"));
  }
}
