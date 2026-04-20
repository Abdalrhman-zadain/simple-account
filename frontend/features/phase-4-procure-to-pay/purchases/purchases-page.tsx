"use client";

import { ReactNode, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  approvePurchaseRequest,
  closePurchaseRequest,
  convertPurchaseRequestToOrder,
  createPurchaseRequest,
  createSupplier,
  deactivateSupplier,
  getAccountOptions,
  getPurchaseRequestById,
  getPurchaseRequests,
  getSupplierBalance,
  getSupplierTransactions,
  getSuppliers,
  rejectPurchaseRequest,
  submitPurchaseRequest,
  updatePurchaseRequest,
  updateSupplier,
} from "@/lib/api";
import { useTranslation } from "@/lib/i18n";
import { queryKeys } from "@/lib/query-keys";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import type { PurchaseRequest, Supplier } from "@/types/api";
import { Button, Card, PageShell, SectionHeading, SidePanel, StatusPill } from "@/components/ui";
import { Field, Input, Select, Textarea } from "@/components/ui/forms";

type Workspace = "suppliers" | "requests";

type SupplierEditorState = {
  id?: string;
  code: string;
  name: string;
  contactInfo: string;
  paymentTerms: string;
  taxInfo: string;
  defaultCurrency: string;
  payableAccountId: string;
};

type PurchaseRequestLineEditorState = {
  key: string;
  itemName: string;
  description: string;
  quantity: string;
  requestedDeliveryDate: string;
  justification: string;
};

type PurchaseRequestEditorState = {
  id?: string;
  reference: string;
  requestDate: string;
  description: string;
  lines: PurchaseRequestLineEditorState[];
};

type PurchaseRequestConversionState = {
  supplierId: string;
  orderDate: string;
  reference: string;
  currencyCode: string;
  description: string;
};

const EMPTY_SUPPLIER_EDITOR: SupplierEditorState = {
  code: "",
  name: "",
  contactInfo: "",
  paymentTerms: "",
  taxInfo: "",
  defaultCurrency: "JOD",
  payableAccountId: "",
};

const EMPTY_REQUEST_EDITOR = (): PurchaseRequestEditorState => ({
  reference: "",
  requestDate: todayValue(),
  description: "",
  lines: [createEmptyRequestLine()],
});

const EMPTY_CONVERSION_EDITOR = (): PurchaseRequestConversionState => ({
  supplierId: "",
  orderDate: todayValue(),
  reference: "",
  currencyCode: "JOD",
  description: "",
});

export function PurchasesPage() {
  const { token } = useAuth();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [workspace, setWorkspace] = useState<Workspace>("suppliers");

  const [supplierSearch, setSupplierSearch] = useState("");
  const [supplierStatusFilter, setSupplierStatusFilter] = useState<"true" | "false" | "">("");
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [isSupplierEditorOpen, setIsSupplierEditorOpen] = useState(false);
  const [supplierEditor, setSupplierEditor] = useState<SupplierEditorState>(EMPTY_SUPPLIER_EDITOR);

  const [requestSearch, setRequestSearch] = useState("");
  const [requestStatusFilter, setRequestStatusFilter] = useState<"" | "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED" | "CLOSED">("");
  const [selectedPurchaseRequestId, setSelectedPurchaseRequestId] = useState<string | null>(null);
  const [isRequestEditorOpen, setIsRequestEditorOpen] = useState(false);
  const [requestEditor, setRequestEditor] = useState<PurchaseRequestEditorState>(EMPTY_REQUEST_EDITOR);
  const [isConversionOpen, setIsConversionOpen] = useState(false);
  const [conversionEditor, setConversionEditor] = useState<PurchaseRequestConversionState>(EMPTY_CONVERSION_EDITOR);

  const suppliersQuery = useQuery({
    queryKey: queryKeys.purchaseSuppliers(token, { search: supplierSearch, isActive: supplierStatusFilter }),
    queryFn: () => getSuppliers({ search: supplierSearch, isActive: supplierStatusFilter }, token),
  });

  const payableAccountsQuery = useQuery({
    queryKey: queryKeys.accounts(token, { isPosting: "true", isActive: "true", type: "LIABILITY", view: "selector" }),
    queryFn: () => getAccountOptions({ isPosting: "true", isActive: "true", type: "LIABILITY" }, token),
    staleTime: 5 * 60 * 1000,
  });

  const supplierBalanceQuery = useQuery({
    queryKey: queryKeys.purchaseSupplierBalance(token, selectedSupplierId),
    queryFn: () => getSupplierBalance(selectedSupplierId!, token),
    enabled: Boolean(selectedSupplierId),
  });

  const supplierTransactionsQuery = useQuery({
    queryKey: queryKeys.purchaseSupplierTransactions(token, selectedSupplierId),
    queryFn: () => getSupplierTransactions(selectedSupplierId!, token),
    enabled: Boolean(selectedSupplierId),
  });

  const purchaseRequestsQuery = useQuery({
    queryKey: queryKeys.purchaseRequests(token, {
      search: requestSearch,
      status: requestStatusFilter,
    }),
    queryFn: () =>
      getPurchaseRequests(
        {
          search: requestSearch,
          status: requestStatusFilter,
        },
        token,
      ),
  });

  const purchaseRequestDetailQuery = useQuery({
    queryKey: queryKeys.purchaseRequestById(token, selectedPurchaseRequestId),
    queryFn: () => getPurchaseRequestById(selectedPurchaseRequestId!, token),
    enabled: Boolean(selectedPurchaseRequestId),
  });

  const createSupplierMutation = useMutation({
    mutationFn: () =>
      createSupplier(
        {
          code: supplierEditor.code || undefined,
          name: supplierEditor.name,
          contactInfo: supplierEditor.contactInfo || undefined,
          paymentTerms: supplierEditor.paymentTerms || undefined,
          taxInfo: supplierEditor.taxInfo || undefined,
          defaultCurrency: supplierEditor.defaultCurrency || "JOD",
          payableAccountId: supplierEditor.payableAccountId,
        },
        token,
      ),
    onSuccess: async (created) => {
      await invalidatePurchases(queryClient);
      setSelectedSupplierId(created.id);
      closeSupplierEditor();
    },
  });

  const updateSupplierMutation = useMutation({
    mutationFn: () =>
      updateSupplier(
        supplierEditor.id!,
        {
          name: supplierEditor.name,
          contactInfo: supplierEditor.contactInfo || "",
          paymentTerms: supplierEditor.paymentTerms || "",
          taxInfo: supplierEditor.taxInfo || "",
          defaultCurrency: supplierEditor.defaultCurrency || "JOD",
          payableAccountId: supplierEditor.payableAccountId,
        },
        token,
      ),
    onSuccess: async (updated) => {
      await invalidatePurchases(queryClient);
      setSelectedSupplierId(updated.id);
      closeSupplierEditor();
    },
  });

  const deactivateSupplierMutation = useMutation({
    mutationFn: (id: string) => deactivateSupplier(id, token),
    onSuccess: async (updated) => {
      await invalidatePurchases(queryClient);
      setSelectedSupplierId(updated.id);
    },
  });

  const createPurchaseRequestMutation = useMutation({
    mutationFn: () =>
      createPurchaseRequest(
        {
          reference: requestEditor.reference || undefined,
          requestDate: requestEditor.requestDate,
          description: requestEditor.description || undefined,
          lines: mapRequestEditorLines(requestEditor.lines),
        },
        token,
      ),
    onSuccess: async (created) => {
      await invalidatePurchases(queryClient);
      setSelectedPurchaseRequestId(created.id);
      closeRequestEditor();
    },
  });

  const updatePurchaseRequestMutation = useMutation({
    mutationFn: () =>
      updatePurchaseRequest(
        requestEditor.id!,
        {
          reference: requestEditor.reference || undefined,
          requestDate: requestEditor.requestDate,
          description: requestEditor.description || undefined,
          lines: mapRequestEditorLines(requestEditor.lines),
        },
        token,
      ),
    onSuccess: async (updated) => {
      await invalidatePurchases(queryClient);
      setSelectedPurchaseRequestId(updated.id);
      closeRequestEditor();
    },
  });

  const submitPurchaseRequestMutation = useMutation({
    mutationFn: (id: string) => submitPurchaseRequest(id, {}, token),
    onSuccess: async (updated) => {
      await invalidatePurchases(queryClient);
      setSelectedPurchaseRequestId(updated.id);
    },
  });

  const approvePurchaseRequestMutation = useMutation({
    mutationFn: (id: string) => approvePurchaseRequest(id, {}, token),
    onSuccess: async (updated) => {
      await invalidatePurchases(queryClient);
      setSelectedPurchaseRequestId(updated.id);
    },
  });

  const rejectPurchaseRequestMutation = useMutation({
    mutationFn: (id: string) => rejectPurchaseRequest(id, {}, token),
    onSuccess: async (updated) => {
      await invalidatePurchases(queryClient);
      setSelectedPurchaseRequestId(updated.id);
    },
  });

  const closePurchaseRequestMutation = useMutation({
    mutationFn: (id: string) => closePurchaseRequest(id, {}, token),
    onSuccess: async (updated) => {
      await invalidatePurchases(queryClient);
      setSelectedPurchaseRequestId(updated.id);
    },
  });

  const convertPurchaseRequestMutation = useMutation({
    mutationFn: () =>
      convertPurchaseRequestToOrder(
        selectedPurchaseRequestId!,
        {
          supplierId: conversionEditor.supplierId,
          orderDate: conversionEditor.orderDate,
          reference: conversionEditor.reference || undefined,
          currencyCode: conversionEditor.currencyCode || undefined,
          description: conversionEditor.description || undefined,
        },
        token,
      ),
    onSuccess: async (result) => {
      await invalidatePurchases(queryClient);
      setSelectedPurchaseRequestId(result.purchaseRequest.id);
      closeConversionEditor();
    },
  });

  const suppliers = suppliersQuery.data ?? [];
  const selectedSupplier = useMemo(
    () => suppliers.find((row) => row.id === selectedSupplierId) ?? null,
    [suppliers, selectedSupplierId],
  );

  const purchaseRequests = purchaseRequestsQuery.data ?? [];
  const selectedPurchaseRequest =
    purchaseRequestDetailQuery.data ??
    purchaseRequests.find((row) => row.id === selectedPurchaseRequestId) ??
    null;

  const activeSuppliers = suppliers.filter((row) => row.isActive);
  const totalOutstanding = suppliers.reduce((sum, row) => sum + Number(row.currentBalance), 0);

  const totalRequests = purchaseRequests.length;
  const submittedRequests = purchaseRequests.filter((row) => row.status === "SUBMITTED").length;
  const approvedRequests = purchaseRequests.filter((row) => row.status === "APPROVED").length;

  const supplierSaveError = getMutationErrorMessage(createSupplierMutation.error ?? updateSupplierMutation.error);
  const supplierFormError = getSupplierFormError(supplierEditor);
  const requestSaveError = getMutationErrorMessage(createPurchaseRequestMutation.error ?? updatePurchaseRequestMutation.error);
  const requestFormError = getPurchaseRequestFormError(requestEditor);
  const requestActionError = getMutationErrorMessage(
    submitPurchaseRequestMutation.error ??
      approvePurchaseRequestMutation.error ??
      rejectPurchaseRequestMutation.error ??
      closePurchaseRequestMutation.error,
  );
  const conversionError = getMutationErrorMessage(convertPurchaseRequestMutation.error);
  const conversionFormError = getPurchaseRequestConversionError(conversionEditor);

  const activeActionMutationPending =
    submitPurchaseRequestMutation.isPending ||
    approvePurchaseRequestMutation.isPending ||
    rejectPurchaseRequestMutation.isPending ||
    closePurchaseRequestMutation.isPending;

  return (
    <PageShell>
      <div className="space-y-8">
        <SectionHeading
          title={t("purchases.title")}
          description={
            workspace === "suppliers" ? t("purchases.description") : t("purchases.requests.description")
          }
          action={
            workspace === "suppliers" ? (
              <Button onClick={openNewSupplierEditor}>{t("purchases.action.newSupplier")}</Button>
            ) : (
              <Button onClick={openNewPurchaseRequestEditor}>{t("purchases.action.newRequest")}</Button>
            )
          }
        />

        <Card className="flex flex-wrap gap-3 p-3">
          <Button variant={workspace === "suppliers" ? "primary" : "secondary"} onClick={() => setWorkspace("suppliers")}>
            {t("purchases.workspace.suppliers")}
          </Button>
          <Button variant={workspace === "requests" ? "primary" : "secondary"} onClick={() => setWorkspace("requests")}>
            {t("purchases.workspace.requests")}
          </Button>
        </Card>

        {workspace === "suppliers" ? (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <SummaryCard label={t("purchases.summary.totalSuppliers")} value={String(suppliers.length)} hint={t("purchases.summary.totalSuppliersHint")} />
              <SummaryCard label={t("purchases.summary.activeSuppliers")} value={String(activeSuppliers.length)} hint={t("purchases.summary.activeSuppliersHint")} />
              <SummaryCard label={t("purchases.summary.totalOutstanding")} value={formatCurrency(totalOutstanding)} hint={t("purchases.summary.totalOutstandingHint")} />
            </div>

            <Card className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <Field label={t("purchases.filters.search")}>
                  <Input value={supplierSearch} onChange={(event) => setSupplierSearch(event.target.value)} placeholder={t("purchases.filters.searchPlaceholder")} />
                </Field>
                <Field label={t("purchases.filters.status")}>
                  <Select value={supplierStatusFilter} onChange={(event) => setSupplierStatusFilter(event.target.value as "true" | "false" | "")}>
                    <option value="">{t("purchases.filters.allStatuses")}</option>
                    <option value="true">{t("purchases.filters.activeOnly")}</option>
                    <option value="false">{t("purchases.filters.inactiveOnly")}</option>
                  </Select>
                </Field>
                <div className="flex items-end">
                  <Button variant="secondary" onClick={() => { setSupplierSearch(""); setSupplierStatusFilter(""); }}>
                    {t("purchases.action.clearFilters")}
                  </Button>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <TableHead>{t("purchases.table.supplier")}</TableHead>
                      <TableHead>{t("purchases.table.contact")}</TableHead>
                      <TableHead>{t("purchases.table.currency")}</TableHead>
                      <TableHead>{t("purchases.table.payableAccount")}</TableHead>
                      <TableHead>{t("purchases.table.outstanding")}</TableHead>
                      <TableHead>{t("purchases.table.status")}</TableHead>
                      <TableHead>{t("purchases.table.actions")}</TableHead>
                    </tr>
                  </thead>
                  <tbody>
                    {suppliers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-500">
                          {t("purchases.empty.suppliers")}
                        </td>
                      </tr>
                    ) : (
                      suppliers.map((row) => (
                        <tr key={row.id} className={cn("border-t border-gray-100", selectedSupplierId === row.id && "bg-gray-50/70")}>
                          <td className="px-6 py-4 align-top">
                            <div className="font-bold text-gray-900">{row.code} · {row.name}</div>
                            <div className="text-xs text-gray-500">{row.paymentTerms || t("purchases.empty.paymentTerms")}</div>
                          </td>
                          <td className="px-6 py-4 align-top">
                            <div className="text-gray-700">{row.contactInfo || t("purchases.empty.contactInfo")}</div>
                            <div className="text-xs text-gray-500">{row.taxInfo || t("purchases.empty.taxInfo")}</div>
                          </td>
                          <td className="px-6 py-4 align-top">{row.defaultCurrency}</td>
                          <td className="px-6 py-4 align-top">{row.payableAccount.code} · {row.payableAccount.name}</td>
                          <td className="px-6 py-4 align-top">{formatCurrency(row.currentBalance)}</td>
                          <td className="px-6 py-4 align-top">
                            <StatusPill label={row.isActive ? t("purchases.status.active") : t("purchases.status.inactive")} tone={row.isActive ? "positive" : "warning"} />
                          </td>
                          <td className="px-6 py-4 align-top">
                            <div className="flex flex-wrap gap-2">
                              <Button variant="secondary" size="sm" onClick={() => setSelectedSupplierId(row.id)}>
                                {t("purchases.action.view")}
                              </Button>
                              {row.isActive ? (
                                <>
                                  <Button variant="secondary" size="sm" onClick={() => openEditSupplierEditor(row)}>
                                    {t("purchases.action.edit")}
                                  </Button>
                                  <Button variant="danger" size="sm" onClick={() => deactivateSupplierMutation.mutate(row.id)} disabled={deactivateSupplierMutation.isPending}>
                                    {t("purchases.action.deactivate")}
                                  </Button>
                                </>
                              ) : null}
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
              <div className="text-sm font-black uppercase tracking-[0.22em] text-gray-500">{t("purchases.section.supplierDetails")}</div>
              {!selectedSupplier ? (
                <div className="rounded-2xl border border-dashed border-gray-300 px-6 py-8 text-sm text-gray-500">
                  {t("purchases.empty.selectSupplier")}
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="grid gap-4 md:grid-cols-3">
                    <MiniMetric label={t("purchases.metric.currentBalance")} value={formatCurrency(supplierBalanceQuery.data?.currentBalance ?? selectedSupplier.currentBalance)} />
                    <MiniMetric label={t("purchases.metric.outstandingBalance")} value={formatCurrency(supplierBalanceQuery.data?.outstandingBalance ?? selectedSupplier.currentBalance)} />
                    <MiniMetric label={t("purchases.metric.status")} value={selectedSupplier.isActive ? t("purchases.status.active") : t("purchases.status.inactive")} />
                  </div>
                  <div className="overflow-hidden rounded-2xl border border-gray-200">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <TableHead>{t("purchases.table.transactionType")}</TableHead>
                          <TableHead>{t("purchases.table.reference")}</TableHead>
                          <TableHead>{t("purchases.table.date")}</TableHead>
                          <TableHead>{t("purchases.table.amount")}</TableHead>
                          <TableHead>{t("purchases.table.transactionStatus")}</TableHead>
                        </tr>
                      </thead>
                      <tbody>
                        {(supplierTransactionsQuery.data?.transactions ?? []).length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-500">
                              {t("purchases.empty.transactions")}
                            </td>
                          </tr>
                        ) : (
                          (supplierTransactionsQuery.data?.transactions ?? []).map((row) => (
                            <tr key={row.id} className="border-t border-gray-100">
                              <td className="px-6 py-4">{row.type}</td>
                              <td className="px-6 py-4">{row.reference}</td>
                              <td className="px-6 py-4">{formatDate(row.date)}</td>
                              <td className="px-6 py-4">{formatCurrency(row.amount)}</td>
                              <td className="px-6 py-4">{row.status}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </Card>
          </>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <SummaryCard label={t("purchases.requests.summary.total")} value={String(totalRequests)} hint={t("purchases.requests.summary.totalHint")} />
              <SummaryCard label={t("purchases.requests.summary.pendingApproval")} value={String(submittedRequests)} hint={t("purchases.requests.summary.pendingApprovalHint")} />
              <SummaryCard label={t("purchases.requests.summary.readyToConvert")} value={String(approvedRequests)} hint={t("purchases.requests.summary.readyToConvertHint")} />
            </div>

            <Card className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <Field label={t("purchases.requests.filters.search")}>
                  <Input value={requestSearch} onChange={(event) => setRequestSearch(event.target.value)} placeholder={t("purchases.requests.filters.searchPlaceholder")} />
                </Field>
                <Field label={t("purchases.requests.filters.status")}>
                  <Select value={requestStatusFilter} onChange={(event) => setRequestStatusFilter(event.target.value as typeof requestStatusFilter)}>
                    <option value="">{t("purchases.filters.allStatuses")}</option>
                    <option value="DRAFT">{t("purchases.status.draft")}</option>
                    <option value="SUBMITTED">{t("purchases.status.submitted")}</option>
                    <option value="APPROVED">{t("purchases.status.approved")}</option>
                    <option value="REJECTED">{t("purchases.status.rejected")}</option>
                    <option value="CLOSED">{t("purchases.status.closed")}</option>
                  </Select>
                </Field>
                <div className="flex items-end">
                  <Button variant="secondary" onClick={() => { setRequestSearch(""); setRequestStatusFilter(""); }}>
                    {t("purchases.action.clearFilters")}
                  </Button>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <TableHead>{t("purchases.requests.table.reference")}</TableHead>
                      <TableHead>{t("purchases.requests.table.date")}</TableHead>
                      <TableHead>{t("purchases.requests.table.lines")}</TableHead>
                      <TableHead>{t("purchases.requests.table.status")}</TableHead>
                      <TableHead>{t("purchases.table.actions")}</TableHead>
                    </tr>
                  </thead>
                  <tbody>
                    {purchaseRequests.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-500">
                          {t("purchases.requests.empty.list")}
                        </td>
                      </tr>
                    ) : (
                      purchaseRequests.map((row) => (
                        <tr key={row.id} className={cn("border-t border-gray-100", selectedPurchaseRequestId === row.id && "bg-gray-50/70")}>
                          <td className="px-6 py-4 align-top">
                            <div className="font-bold text-gray-900">{row.reference}</div>
                            <div className="text-xs text-gray-500">{row.description || t("purchases.requests.empty.noDescription")}</div>
                          </td>
                          <td className="px-6 py-4 align-top">{formatDate(row.requestDate)}</td>
                          <td className="px-6 py-4 align-top">{row.lines.length}</td>
                          <td className="px-6 py-4 align-top">
                            <StatusPill label={translatePurchaseRequestStatus(row.status, t)} tone={statusTone(row.status)} />
                          </td>
                          <td className="px-6 py-4 align-top">
                            <div className="flex flex-wrap gap-2">
                              <Button variant="secondary" size="sm" onClick={() => setSelectedPurchaseRequestId(row.id)}>
                                {t("purchases.action.view")}
                              </Button>
                              {row.canEdit ? (
                                <Button variant="secondary" size="sm" onClick={() => openEditPurchaseRequestEditor(row)}>
                                  {t("purchases.action.edit")}
                                </Button>
                              ) : null}
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
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm font-black uppercase tracking-[0.22em] text-gray-500">{t("purchases.requests.section.details")}</div>
                {selectedPurchaseRequest ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedPurchaseRequest.canSubmit ? (
                      <Button variant="secondary" size="sm" disabled={activeActionMutationPending} onClick={() => confirmAndRun(t("purchases.requests.confirm.submit"), () => submitPurchaseRequestMutation.mutate(selectedPurchaseRequest.id))}>
                        {t("purchases.action.submitRequest")}
                      </Button>
                    ) : null}
                    {selectedPurchaseRequest.canApprove ? (
                      <Button size="sm" disabled={activeActionMutationPending} onClick={() => confirmAndRun(t("purchases.requests.confirm.approve"), () => approvePurchaseRequestMutation.mutate(selectedPurchaseRequest.id))}>
                        {t("purchases.action.approveRequest")}
                      </Button>
                    ) : null}
                    {selectedPurchaseRequest.canReject ? (
                      <Button variant="danger" size="sm" disabled={activeActionMutationPending} onClick={() => confirmAndRun(t("purchases.requests.confirm.reject"), () => rejectPurchaseRequestMutation.mutate(selectedPurchaseRequest.id))}>
                        {t("purchases.action.rejectRequest")}
                      </Button>
                    ) : null}
                    {selectedPurchaseRequest.canClose ? (
                      <Button variant="secondary" size="sm" disabled={activeActionMutationPending} onClick={() => confirmAndRun(t("purchases.requests.confirm.close"), () => closePurchaseRequestMutation.mutate(selectedPurchaseRequest.id))}>
                        {t("purchases.action.closeRequest")}
                      </Button>
                    ) : null}
                    {selectedPurchaseRequest.canConvertToOrder ? (
                      <Button size="sm" onClick={openConversionEditor}>
                        {t("purchases.action.convertToOrder")}
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </div>

              {requestActionError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                  {requestActionError}
                </div>
              ) : null}

              {convertPurchaseRequestMutation.data ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                  {t("purchases.requests.success.converted", { reference: convertPurchaseRequestMutation.data.purchaseOrder.reference })}
                </div>
              ) : null}

              {!selectedPurchaseRequest ? (
                <div className="rounded-2xl border border-dashed border-gray-300 px-6 py-8 text-sm text-gray-500">
                  {t("purchases.requests.empty.selectRequest")}
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-4">
                    <MiniMetric label={t("purchases.requests.metric.date")} value={formatDate(selectedPurchaseRequest.requestDate)} />
                    <MiniMetric label={t("purchases.requests.metric.lines")} value={String(selectedPurchaseRequest.lines.length)} />
                    <MiniMetric label={t("purchases.requests.metric.status")} value={translatePurchaseRequestStatus(selectedPurchaseRequest.status, t)} />
                    <MiniMetric label={t("purchases.requests.metric.linkedOrders")} value={String(selectedPurchaseRequest.linkedPurchaseOrders.length)} />
                  </div>

                  <div className="grid gap-6 xl:grid-cols-2">
                    <Card className="space-y-4">
                      <div className="text-sm font-black uppercase tracking-[0.18em] text-gray-500">{t("purchases.requests.section.lines")}</div>
                      <div className="space-y-3">
                        {selectedPurchaseRequest.lines.map((line) => (
                          <div key={line.id} className="rounded-2xl border border-gray-200 px-4 py-4">
                            <div className="flex items-center justify-between gap-3">
                              <div className="font-bold text-gray-900">
                                {line.itemName || line.description}
                              </div>
                              <div className="text-sm text-gray-500">
                                {t("purchases.requests.line.quantity", { quantity: line.quantity })}
                              </div>
                            </div>
                            <div className="mt-2 text-sm text-gray-600">{line.description}</div>
                            <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">
                              <span>{t("purchases.requests.field.deliveryDate")}: {line.requestedDeliveryDate ? formatDate(line.requestedDeliveryDate) : t("purchases.requests.empty.notSet")}</span>
                              <span>{t("purchases.requests.field.justification")}: {line.justification || t("purchases.requests.empty.notSet")}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>

                    <Card className="space-y-4">
                      <div className="text-sm font-black uppercase tracking-[0.18em] text-gray-500">{t("purchases.requests.section.history")}</div>
                      {selectedPurchaseRequest.statusHistory.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-gray-300 px-4 py-6 text-sm text-gray-500">
                          {t("purchases.requests.empty.history")}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {selectedPurchaseRequest.statusHistory.map((entry) => (
                            <div key={entry.id} className="rounded-2xl border border-gray-200 px-4 py-4">
                              <div className="flex items-center justify-between gap-3">
                                <StatusPill label={translatePurchaseRequestStatus(entry.status, t)} tone={statusTone(entry.status)} />
                                <div className="text-xs text-gray-500">{formatDate(entry.changedAt)}</div>
                              </div>
                              <div className="mt-2 text-sm text-gray-600">{entry.note || t("purchases.requests.empty.noNote")}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </Card>
                  </div>

                  <Card className="space-y-4">
                    <div className="text-sm font-black uppercase tracking-[0.18em] text-gray-500">{t("purchases.requests.section.linkedOrders")}</div>
                    {selectedPurchaseRequest.linkedPurchaseOrders.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-gray-300 px-4 py-6 text-sm text-gray-500">
                        {t("purchases.requests.empty.linkedOrders")}
                      </div>
                    ) : (
                      <div className="overflow-hidden rounded-2xl border border-gray-200">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <TableHead>{t("purchases.requests.table.orderReference")}</TableHead>
                              <TableHead>{t("purchases.requests.table.orderDate")}</TableHead>
                              <TableHead>{t("purchases.requests.table.orderSupplier")}</TableHead>
                              <TableHead>{t("purchases.requests.table.status")}</TableHead>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedPurchaseRequest.linkedPurchaseOrders.map((order) => (
                              <tr key={order.id} className="border-t border-gray-100">
                                <td className="px-6 py-4">{order.reference}</td>
                                <td className="px-6 py-4">{formatDate(order.orderDate)}</td>
                                <td className="px-6 py-4">{order.supplier.code} · {order.supplier.name}</td>
                                <td className="px-6 py-4">
                                  <StatusPill label={translatePurchaseOrderStatus(order.status, t)} tone="neutral" />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </Card>
                </div>
              )}
            </Card>
          </>
        )}

        <SidePanel
          isOpen={isSupplierEditorOpen}
          onClose={closeSupplierEditor}
          title={supplierEditor.id ? t("purchases.dialog.editSupplier") : t("purchases.dialog.newSupplier")}
        >
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label={t("purchases.field.code")} hint={t("purchases.field.codeHint")}>
                <Input value={supplierEditor.code} onChange={(event) => setSupplierEditor((current) => ({ ...current, code: event.target.value }))} disabled={Boolean(supplierEditor.id)} />
              </Field>
              <Field label={t("purchases.field.name")}>
                <Input value={supplierEditor.name} onChange={(event) => setSupplierEditor((current) => ({ ...current, name: event.target.value }))} />
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label={t("purchases.field.contactInfo")}>
                <Textarea rows={3} value={supplierEditor.contactInfo} onChange={(event) => setSupplierEditor((current) => ({ ...current, contactInfo: event.target.value }))} />
              </Field>
              <Field label={t("purchases.field.taxInfo")}>
                <Textarea rows={3} value={supplierEditor.taxInfo} onChange={(event) => setSupplierEditor((current) => ({ ...current, taxInfo: event.target.value }))} />
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label={t("purchases.field.paymentTerms")}>
                <Input value={supplierEditor.paymentTerms} onChange={(event) => setSupplierEditor((current) => ({ ...current, paymentTerms: event.target.value }))} />
              </Field>
              <Field label={t("purchases.field.defaultCurrency")}>
                <Input value={supplierEditor.defaultCurrency} maxLength={8} onChange={(event) => setSupplierEditor((current) => ({ ...current, defaultCurrency: event.target.value.toUpperCase() }))} />
              </Field>
            </div>

            <Field label={t("purchases.field.payableAccount")} hint={t("purchases.field.payableAccountHint")}>
              <Select value={supplierEditor.payableAccountId} onChange={(event) => setSupplierEditor((current) => ({ ...current, payableAccountId: event.target.value }))}>
                <option value="">{t("purchases.empty.selectPayableAccount")}</option>
                {(payableAccountsQuery.data ?? []).map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.code} · {row.name} ({row.currencyCode})
                  </option>
                ))}
              </Select>
            </Field>

            {supplierFormError ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                {supplierFormError}
              </div>
            ) : null}

            {supplierSaveError ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                {supplierSaveError}
              </div>
            ) : null}

            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={closeSupplierEditor}>
                {t("purchases.action.cancel")}
              </Button>
              <Button onClick={() => (supplierEditor.id ? updateSupplierMutation.mutate() : createSupplierMutation.mutate())} disabled={Boolean(supplierFormError) || createSupplierMutation.isPending || updateSupplierMutation.isPending}>
                {supplierEditor.id ? t("purchases.action.saveChanges") : t("purchases.action.saveSupplier")}
              </Button>
            </div>
          </div>
        </SidePanel>

        <SidePanel
          isOpen={isRequestEditorOpen}
          onClose={closeRequestEditor}
          title={requestEditor.id ? t("purchases.dialog.editRequest") : t("purchases.dialog.newRequest")}
        >
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label={t("purchases.requests.field.reference")} hint={t("purchases.requests.field.referenceHint")}>
                <Input value={requestEditor.reference} onChange={(event) => setRequestEditor((current) => ({ ...current, reference: event.target.value }))} />
              </Field>
              <Field label={t("purchases.requests.field.requestDate")}>
                <Input type="date" value={requestEditor.requestDate} onChange={(event) => setRequestEditor((current) => ({ ...current, requestDate: event.target.value }))} />
              </Field>
            </div>

            <Field label={t("purchases.requests.field.description")}>
              <Textarea rows={3} value={requestEditor.description} onChange={(event) => setRequestEditor((current) => ({ ...current, description: event.target.value }))} />
            </Field>

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-black uppercase tracking-[0.18em] text-gray-500">{t("purchases.requests.section.editorLines")}</div>
                <Button variant="secondary" size="sm" onClick={addRequestLine}>
                  {t("purchases.action.addLine")}
                </Button>
              </div>

              {requestEditor.lines.map((line, index) => (
                <div key={line.key} className="space-y-4 rounded-2xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-bold text-gray-900">{t("purchases.requests.line.label", { index: index + 1 })}</div>
                    {requestEditor.lines.length > 1 ? (
                      <Button variant="danger" size="sm" onClick={() => removeRequestLine(line.key)}>
                        {t("purchases.action.remove")}
                      </Button>
                    ) : null}
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label={t("purchases.requests.field.itemOrService")}>
                      <Input value={line.itemName} onChange={(event) => updateRequestLine(line.key, "itemName", event.target.value)} />
                    </Field>
                    <Field label={t("purchases.requests.field.quantity")}>
                      <Input type="number" min="0.0001" step="0.0001" value={line.quantity} onChange={(event) => updateRequestLine(line.key, "quantity", event.target.value)} />
                    </Field>
                  </div>
                  <Field label={t("purchases.requests.field.lineDescription")}>
                    <Textarea rows={2} value={line.description} onChange={(event) => updateRequestLine(line.key, "description", event.target.value)} />
                  </Field>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label={t("purchases.requests.field.deliveryDate")}>
                      <Input type="date" value={line.requestedDeliveryDate} onChange={(event) => updateRequestLine(line.key, "requestedDeliveryDate", event.target.value)} />
                    </Field>
                    <Field label={t("purchases.requests.field.justification")}>
                      <Textarea rows={2} value={line.justification} onChange={(event) => updateRequestLine(line.key, "justification", event.target.value)} />
                    </Field>
                  </div>
                </div>
              ))}
            </div>

            {requestFormError ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                {requestFormError}
              </div>
            ) : null}

            {requestSaveError ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                {requestSaveError}
              </div>
            ) : null}

            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={closeRequestEditor}>
                {t("purchases.action.cancel")}
              </Button>
              <Button onClick={() => (requestEditor.id ? updatePurchaseRequestMutation.mutate() : createPurchaseRequestMutation.mutate())} disabled={Boolean(requestFormError) || createPurchaseRequestMutation.isPending || updatePurchaseRequestMutation.isPending}>
                {requestEditor.id ? t("purchases.action.saveChanges") : t("purchases.action.saveDraft")}
              </Button>
            </div>
          </div>
        </SidePanel>

        <SidePanel
          isOpen={isConversionOpen}
          onClose={closeConversionEditor}
          title={t("purchases.dialog.convertToOrder")}
        >
          <div className="space-y-5">
            <Field label={t("purchases.requests.field.supplier")}>
              <Select value={conversionEditor.supplierId} onChange={(event) => setConversionEditor((current) => ({ ...current, supplierId: event.target.value }))}>
                <option value="">{t("purchases.requests.empty.selectSupplier")}</option>
                {activeSuppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.code} · {supplier.name}
                  </option>
                ))}
              </Select>
            </Field>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label={t("purchases.requests.field.orderDate")}>
                <Input type="date" value={conversionEditor.orderDate} onChange={(event) => setConversionEditor((current) => ({ ...current, orderDate: event.target.value }))} />
              </Field>
              <Field label={t("purchases.requests.field.currency")}>
                <Input value={conversionEditor.currencyCode} maxLength={8} onChange={(event) => setConversionEditor((current) => ({ ...current, currencyCode: event.target.value.toUpperCase() }))} />
              </Field>
            </div>

            <Field label={t("purchases.requests.field.orderReference")} hint={t("purchases.requests.field.orderReferenceHint")}>
              <Input value={conversionEditor.reference} onChange={(event) => setConversionEditor((current) => ({ ...current, reference: event.target.value }))} />
            </Field>

            <Field label={t("purchases.requests.field.orderDescription")}>
              <Textarea rows={3} value={conversionEditor.description} onChange={(event) => setConversionEditor((current) => ({ ...current, description: event.target.value }))} />
            </Field>

            {conversionFormError ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                {conversionFormError}
              </div>
            ) : null}

            {conversionError ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                {conversionError}
              </div>
            ) : null}

            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={closeConversionEditor}>
                {t("purchases.action.cancel")}
              </Button>
              <Button onClick={() => convertPurchaseRequestMutation.mutate()} disabled={Boolean(conversionFormError) || convertPurchaseRequestMutation.isPending}>
                {t("purchases.action.convertToOrder")}
              </Button>
            </div>
          </div>
        </SidePanel>
      </div>
    </PageShell>
  );

  function openNewSupplierEditor() {
    createSupplierMutation.reset();
    updateSupplierMutation.reset();
    setSupplierEditor(EMPTY_SUPPLIER_EDITOR);
    setIsSupplierEditorOpen(true);
  }

  function openEditSupplierEditor(supplier: Supplier) {
    createSupplierMutation.reset();
    updateSupplierMutation.reset();
    setSupplierEditor({
      id: supplier.id,
      code: supplier.code,
      name: supplier.name,
      contactInfo: supplier.contactInfo ?? "",
      paymentTerms: supplier.paymentTerms ?? "",
      taxInfo: supplier.taxInfo ?? "",
      defaultCurrency: supplier.defaultCurrency,
      payableAccountId: supplier.payableAccount.id,
    });
    setIsSupplierEditorOpen(true);
  }

  function closeSupplierEditor() {
    createSupplierMutation.reset();
    updateSupplierMutation.reset();
    setSupplierEditor(EMPTY_SUPPLIER_EDITOR);
    setIsSupplierEditorOpen(false);
  }

  function openNewPurchaseRequestEditor() {
    createPurchaseRequestMutation.reset();
    updatePurchaseRequestMutation.reset();
    setRequestEditor(EMPTY_REQUEST_EDITOR());
    setIsRequestEditorOpen(true);
  }

  function openEditPurchaseRequestEditor(request: PurchaseRequest) {
    createPurchaseRequestMutation.reset();
    updatePurchaseRequestMutation.reset();
    setRequestEditor({
      id: request.id,
      reference: request.reference,
      requestDate: request.requestDate.slice(0, 10),
      description: request.description ?? "",
      lines: request.lines.map((line) => ({
        key: line.id,
        itemName: line.itemName ?? "",
        description: line.description,
        quantity: line.quantity,
        requestedDeliveryDate: line.requestedDeliveryDate?.slice(0, 10) ?? "",
        justification: line.justification ?? "",
      })),
    });
    setIsRequestEditorOpen(true);
  }

  function closeRequestEditor() {
    createPurchaseRequestMutation.reset();
    updatePurchaseRequestMutation.reset();
    setRequestEditor(EMPTY_REQUEST_EDITOR());
    setIsRequestEditorOpen(false);
  }

  function addRequestLine() {
    setRequestEditor((current) => ({
      ...current,
      lines: [...current.lines, createEmptyRequestLine()],
    }));
  }

  function removeRequestLine(key: string) {
    setRequestEditor((current) => ({
      ...current,
      lines: current.lines.filter((line) => line.key !== key),
    }));
  }

  function updateRequestLine(
    key: string,
    field: keyof Omit<PurchaseRequestLineEditorState, "key">,
    value: string,
  ) {
    setRequestEditor((current) => ({
      ...current,
      lines: current.lines.map((line) => (line.key === key ? { ...line, [field]: value } : line)),
    }));
  }

  function openConversionEditor() {
    convertPurchaseRequestMutation.reset();
    const defaultSupplier = activeSuppliers[0];
    setConversionEditor({
      supplierId: defaultSupplier?.id ?? "",
      orderDate: todayValue(),
      reference: "",
      currencyCode: defaultSupplier?.defaultCurrency ?? "JOD",
      description: selectedPurchaseRequest?.description ?? "",
    });
    setIsConversionOpen(true);
  }

  function closeConversionEditor() {
    convertPurchaseRequestMutation.reset();
    setConversionEditor(EMPTY_CONVERSION_EDITOR());
    setIsConversionOpen(false);
  }
}

function SummaryCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card className="p-5">
      <div className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-500">{label}</div>
      <div className="mt-2 text-2xl font-black text-gray-900">{value}</div>
      <div className="mt-1 text-xs text-gray-500">{hint}</div>
    </Card>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 px-4 py-4">
      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500">{label}</div>
      <div className="mt-2 text-base font-bold text-gray-900">{value}</div>
    </div>
  );
}

function TableHead({ children }: { children: ReactNode }) {
  return <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-600">{children}</th>;
}

async function invalidatePurchases(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["purchase-suppliers"] }),
    queryClient.invalidateQueries({ queryKey: ["purchase-supplier-balance"] }),
    queryClient.invalidateQueries({ queryKey: ["purchase-supplier-transactions"] }),
    queryClient.invalidateQueries({ queryKey: ["purchase-requests"] }),
    queryClient.invalidateQueries({ queryKey: ["purchase-request"] }),
  ]);
}

function getSupplierFormError(editor: SupplierEditorState) {
  if (!editor.name.trim()) {
    return "Supplier name is required. اسم المورد مطلوب.";
  }
  if (!editor.payableAccountId) {
    return "Default payable account is required. حساب الدائنين الافتراضي مطلوب.";
  }
  if (!editor.defaultCurrency.trim()) {
    return "Default currency is required. العملة الافتراضية مطلوبة.";
  }
  return null;
}

function getPurchaseRequestFormError(editor: PurchaseRequestEditorState) {
  if (!editor.requestDate) {
    return "Request date is required. تاريخ الطلب مطلوب.";
  }
  if (editor.lines.length === 0) {
    return "At least one request line is required. يجب إضافة سطر طلب واحد على الأقل.";
  }
  for (const line of editor.lines) {
    if (!line.description.trim()) {
      return "Each request line needs a description. كل سطر طلب يحتاج إلى وصف.";
    }
    if (!line.quantity || Number(line.quantity) <= 0) {
      return "Each request line needs a quantity greater than zero. كل سطر طلب يحتاج إلى كمية أكبر من صفر.";
    }
  }
  return null;
}

function getPurchaseRequestConversionError(editor: PurchaseRequestConversionState) {
  if (!editor.supplierId) {
    return "Supplier selection is required. اختيار المورد مطلوب.";
  }
  if (!editor.orderDate) {
    return "Order date is required. تاريخ أمر الشراء مطلوب.";
  }
  return null;
}

function getMutationErrorMessage(error: unknown) {
  if (!error) {
    return null;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Unable to complete the action. تعذر إكمال العملية.";
}

function createEmptyRequestLine(): PurchaseRequestLineEditorState {
  return {
    key: randomKey(),
    itemName: "",
    description: "",
    quantity: "1",
    requestedDeliveryDate: "",
    justification: "",
  };
}

function mapRequestEditorLines(lines: PurchaseRequestLineEditorState[]) {
  return lines.map((line) => ({
    itemName: line.itemName || undefined,
    description: line.description,
    quantity: Number(line.quantity),
    requestedDeliveryDate: line.requestedDeliveryDate || undefined,
    justification: line.justification || undefined,
  }));
}

function translatePurchaseRequestStatus(status: PurchaseRequest["status"], t: (key: string, vars?: Record<string, string | number>) => string) {
  switch (status) {
    case "DRAFT":
      return t("purchases.status.draft");
    case "SUBMITTED":
      return t("purchases.status.submitted");
    case "APPROVED":
      return t("purchases.status.approved");
    case "REJECTED":
      return t("purchases.status.rejected");
    case "CLOSED":
      return t("purchases.status.closed");
    default:
      return status;
  }
}

function translatePurchaseOrderStatus(status: string, t: (key: string, vars?: Record<string, string | number>) => string) {
  switch (status) {
    case "DRAFT":
      return t("purchases.status.orderDraft");
    case "ISSUED":
      return t("purchases.status.orderIssued");
    case "PARTIALLY_RECEIVED":
      return t("purchases.status.orderPartiallyReceived");
    case "FULLY_RECEIVED":
      return t("purchases.status.orderFullyReceived");
    case "CANCELLED":
      return t("purchases.status.cancelled");
    case "CLOSED":
      return t("purchases.status.closed");
    default:
      return status;
  }
}

function statusTone(status: PurchaseRequest["status"]) {
  if (status === "APPROVED") return "positive" as const;
  if (status === "REJECTED") return "warning" as const;
  if (status === "CLOSED") return "neutral" as const;
  if (status === "SUBMITTED") return "warning" as const;
  return "neutral" as const;
}

function confirmAndRun(message: string, action: () => void) {
  if (typeof window === "undefined" || window.confirm(message)) {
    action();
  }
}

function randomKey() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function todayValue() {
  return new Date().toISOString().slice(0, 10);
}
