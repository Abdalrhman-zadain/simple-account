"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import {
  approvePurchaseRequest,
  convertPurchaseRequestToOrder,
  getPurchaseRequestById,
  getSuppliers,
  rejectPurchaseRequest,
  submitPurchaseRequest,
} from "@/lib/api";
import { useTranslation } from "@/lib/i18n";
import { queryKeys } from "@/lib/query-keys";
import { cleanDisplayName, cn, formatDate } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import type { PurchaseOrderStatus, PurchaseRequest } from "@/types/api";
import { Button, Card, PageShell, SectionHeading, SidePanel, StatusPill } from "@/components/ui";
import { Field, Input, Select, Textarea } from "@/components/ui/forms";

type ConversionState = {
  supplierId: string;
  orderDate: string;
  currencyCode: string;
  description: string;
};

const EMPTY_CONVERSION_STATE = (): ConversionState => ({
  supplierId: "",
  orderDate: todayValue(),
  currencyCode: "JOD",
  description: "",
});

export function PurchaseRequestDetailsPage({ purchaseRequestId }: { purchaseRequestId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { token } = useAuth();
  const { t, language } = useTranslation();
  const isArabic = language === "ar";
  const [isConversionOpen, setIsConversionOpen] = useState(false);
  const [conversionEditor, setConversionEditor] = useState<ConversionState>(EMPTY_CONVERSION_STATE);

  const purchaseRequestQuery = useQuery({
    queryKey: queryKeys.purchaseRequestById(token, purchaseRequestId),
    queryFn: () => getPurchaseRequestById(purchaseRequestId, token),
  });

  const suppliersQuery = useQuery({
    queryKey: queryKeys.purchaseSuppliers(token, { isActive: "true" }),
    queryFn: () => getSuppliers({ isActive: "true" }, token),
  });

  const purchaseRequest = purchaseRequestQuery.data;
  const activeSuppliers = suppliersQuery.data ?? [];

  async function invalidatePurchaseRequestWorkspace() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["purchase-requests", token] }),
      queryClient.invalidateQueries({ queryKey: ["purchase-request", token, purchaseRequestId] }),
      queryClient.invalidateQueries({ queryKey: ["purchase-orders", token] }),
      queryClient.invalidateQueries({ queryKey: ["purchase-invoices", token] }),
    ]);
  }

  const submitMutation = useMutation({
    mutationFn: () => submitPurchaseRequest(purchaseRequestId, {}, token),
    onSuccess: invalidatePurchaseRequestWorkspace,
  });

  const approveMutation = useMutation({
    mutationFn: () => approvePurchaseRequest(purchaseRequestId, {}, token),
    onSuccess: invalidatePurchaseRequestWorkspace,
  });

  const rejectMutation = useMutation({
    mutationFn: () => rejectPurchaseRequest(purchaseRequestId, {}, token),
    onSuccess: invalidatePurchaseRequestWorkspace,
  });

  const convertToOrderMutation = useMutation({
    mutationFn: () =>
      convertPurchaseRequestToOrder(
        purchaseRequestId,
        {
          supplierId: conversionEditor.supplierId,
          orderDate: conversionEditor.orderDate,
          currencyCode: conversionEditor.currencyCode || undefined,
          description: conversionEditor.description || undefined,
        },
        token,
      ),
    onSuccess: async () => {
      await invalidatePurchaseRequestWorkspace();
      setIsConversionOpen(false);
      setConversionEditor(EMPTY_CONVERSION_STATE());
    },
  });

  const activeActionPending =
    submitMutation.isPending ||
    approveMutation.isPending ||
    rejectMutation.isPending ||
    convertToOrderMutation.isPending;

  const actionError = getErrorMessage(
    submitMutation.error ??
      approveMutation.error ??
      rejectMutation.error ??
      convertToOrderMutation.error,
  );

  const conversionError = getConversionError(conversionEditor, t);
  const detailsError = getErrorMessage(purchaseRequestQuery.error ?? suppliersQuery.error);

  const historyDateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(isArabic ? "ar-JO" : "en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [isArabic],
  );

  const handleConvertToInvoice = () => {
    router.push(`/purchases?tab=invoices&sourceRequestId=${purchaseRequestId}`);
  };

  const openConversionEditor = () => {
    const defaultSupplier = activeSuppliers[0];
    setConversionEditor({
      supplierId: defaultSupplier?.id ?? "",
      orderDate: todayValue(),
      currencyCode: defaultSupplier?.defaultCurrency ?? "JOD",
      description: purchaseRequest?.description ?? "",
    });
    setIsConversionOpen(true);
    convertToOrderMutation.reset();
  };

  return (
    <PageShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionHeading
            title={t("purchases.requests.section.details")}
            description={t("purchases.requests.description")}
          />
          <Button variant="secondary" onClick={() => router.push("/purchases?tab=requests")}>
            {t("purchases.action.backToRequests")}
          </Button>
        </div>

        {detailsError ? (
          <Card className="border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-800">
            {detailsError}
          </Card>
        ) : null}

        {!purchaseRequest && purchaseRequestQuery.isLoading ? (
          <Card className="p-6 text-sm text-gray-500">{t("purchases.requests.state.loadingDetails")}</Card>
        ) : null}

        {purchaseRequest ? (
          <>
            <Card className="space-y-5 p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="inline-flex rounded-full bg-slate-100 px-3 py-1 font-mono text-xs font-bold text-slate-700">
                    {purchaseRequest.reference}
                  </div>
                  <div className="text-2xl font-black text-gray-900">
                    {purchaseRequest.description || t("purchases.requests.empty.noDescription")}
                  </div>
                  <div className="text-sm text-gray-500">{formatDate(purchaseRequest.requestDate)}</div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill
                    label={translatePurchaseRequestStatus(purchaseRequest.status, t)}
                    tone={requestStatusTone(purchaseRequest.status)}
                  />
                  {purchaseRequest.canSubmit ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={activeActionPending}
                      onClick={() => confirmAndRun(t("purchases.requests.confirm.submit"), () => submitMutation.mutate())}
                    >
                      {t("purchases.action.submitRequest")}
                    </Button>
                  ) : null}
                  {purchaseRequest.canApprove ? (
                    <Button
                      size="sm"
                      disabled={activeActionPending}
                      onClick={() => confirmAndRun(t("purchases.requests.confirm.approve"), () => approveMutation.mutate())}
                    >
                      {t("purchases.action.approveRequest")}
                    </Button>
                  ) : null}
                  {purchaseRequest.canReject ? (
                    <Button
                      variant="danger"
                      size="sm"
                      disabled={activeActionPending}
                      onClick={() => confirmAndRun(t("purchases.requests.confirm.reject"), () => rejectMutation.mutate())}
                    >
                      {t("purchases.action.rejectRequest")}
                    </Button>
                  ) : null}
                  {purchaseRequest.canConvertToOrder ? (
                    <Button size="sm" disabled={activeActionPending} onClick={openConversionEditor}>
                      {t("purchases.action.convertToOrder")}
                    </Button>
                  ) : null}
                  {purchaseRequest.canConvertToInvoice ? (
                    <Button size="sm" disabled={activeActionPending} onClick={handleConvertToInvoice}>
                      {t("purchases.action.convertToInvoice")}
                    </Button>
                  ) : null}
                </div>
              </div>

              {actionError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                  {actionError}
                </div>
              ) : null}

              <div className="grid gap-4 md:grid-cols-4">
                <MiniMetric label={t("purchases.requests.metric.date")} value={formatDate(purchaseRequest.requestDate)} />
                <MiniMetric label={t("purchases.requests.metric.lines")} value={String(purchaseRequest.lines.length)} />
                <MiniMetric label={t("purchases.requests.metric.status")} value={translatePurchaseRequestStatus(purchaseRequest.status, t)} />
                <MiniMetric
                  label={t("purchases.requests.metric.linkedDocuments")}
                  value={String(purchaseRequest.linkedPurchaseOrders.length + purchaseRequest.linkedPurchaseInvoices.length)}
                />
              </div>
            </Card>

            <div className="grid gap-6 xl:grid-cols-2">
              <Card className="space-y-4 p-6">
                <div className="text-sm font-black uppercase tracking-[0.18em] text-gray-500">
                  {t("purchases.requests.section.lines")}
                </div>
                <div className="space-y-3">
                  {purchaseRequest.lines.map((line) => (
                    <div key={line.id} className="rounded-2xl border border-gray-200 px-4 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-bold text-gray-900">{line.itemName || line.description}</div>
                        <div className="text-sm text-gray-500">
                          {t("purchases.requests.line.quantity", { quantity: line.quantity })}
                        </div>
                      </div>
                      <div className="mt-2 text-sm text-gray-600">{line.description}</div>
                      <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">
                        <span>
                          {t("purchases.requests.field.deliveryDate")}:{" "}
                          {line.requestedDeliveryDate ? formatDate(line.requestedDeliveryDate) : t("purchases.requests.empty.notSet")}
                        </span>
                        <span>
                          {t("purchases.requests.field.justification")}:{" "}
                          {line.justification || t("purchases.requests.empty.notSet")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="space-y-4 p-6">
                <div className="text-sm font-black uppercase tracking-[0.18em] text-gray-500">
                  {t("purchases.requests.section.history")}
                </div>
                {purchaseRequest.statusHistory.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-gray-300 px-4 py-6 text-sm text-gray-500">
                    {t("purchases.requests.empty.history")}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {purchaseRequest.statusHistory.map((entry) => (
                      <div key={entry.id} className="rounded-2xl border border-gray-200 px-4 py-4">
                        <div className="flex items-center justify-between gap-3">
                          <StatusPill
                            label={translatePurchaseRequestStatus(entry.status, t)}
                            tone={requestStatusTone(entry.status)}
                          />
                          <div className="text-xs text-gray-500">
                            {historyDateFormatter.format(new Date(entry.changedAt))}
                          </div>
                        </div>
                        <div className="mt-2 text-sm text-gray-700">
                          {entry.note || t("purchases.requests.empty.noNote")}
                        </div>
                        <div className="mt-2 text-xs text-gray-500">
                          {t("purchases.requests.history.byUser", {
                            user: cleanDisplayName(entry.user?.name) || entry.user?.email || t("purchases.requests.history.systemUser"),
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <Card className="space-y-4 p-6">
                <div className="text-sm font-black uppercase tracking-[0.18em] text-gray-500">
                  {t("purchases.requests.section.linkedOrders")}
                </div>
                {purchaseRequest.linkedPurchaseOrders.length === 0 ? (
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
                        {purchaseRequest.linkedPurchaseOrders.map((order) => (
                          <tr key={order.id} className="border-t border-gray-100">
                            <td className="px-6 py-4">{order.reference}</td>
                            <td className="px-6 py-4">{formatDate(order.orderDate)}</td>
                            <td className="px-6 py-4">{order.supplier.code} · {order.supplier.name}</td>
                            <td className="px-6 py-4">
                              <StatusPill
                                label={translatePurchaseOrderStatus(order.status, t)}
                                tone={purchaseOrderStatusTone(order.status)}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>

              <Card className="space-y-4 p-6">
                <div className="text-sm font-black uppercase tracking-[0.18em] text-gray-500">
                  {t("purchases.requests.section.linkedInvoices")}
                </div>
                {purchaseRequest.linkedPurchaseInvoices.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-gray-300 px-4 py-6 text-sm text-gray-500">
                    {t("purchases.requests.empty.linkedInvoices")}
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-2xl border border-gray-200">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <TableHead>{t("purchases.invoices.table.reference")}</TableHead>
                          <TableHead>{t("purchases.invoices.table.date")}</TableHead>
                          <TableHead>{t("purchases.requests.table.orderSupplier")}</TableHead>
                          <TableHead>{t("purchases.requests.table.status")}</TableHead>
                        </tr>
                      </thead>
                      <tbody>
                        {purchaseRequest.linkedPurchaseInvoices.map((invoice) => (
                          <tr key={invoice.id} className="border-t border-gray-100">
                            <td className="px-6 py-4">{invoice.reference}</td>
                            <td className="px-6 py-4">{formatDate(invoice.invoiceDate)}</td>
                            <td className="px-6 py-4">{invoice.supplier.code} · {invoice.supplier.name}</td>
                            <td className="px-6 py-4">
                              <StatusPill
                                label={translatePurchaseInvoiceStatus(invoice.status, t)}
                                tone={purchaseInvoiceStatusTone(invoice.status)}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </div>
          </>
        ) : null}
      </div>

      <SidePanel
        isOpen={isConversionOpen}
        onClose={() => setIsConversionOpen(false)}
        title={t("purchases.dialog.convertToOrder")}
      >
        <div className="space-y-5">
          <Field label={t("purchases.requests.field.supplier")}>
            <Select
              value={conversionEditor.supplierId}
              onChange={(event) => {
                const supplier = activeSuppliers.find((row) => row.id === event.target.value);
                setConversionEditor((current) => ({
                  ...current,
                  supplierId: event.target.value,
                  currencyCode: supplier?.defaultCurrency ?? current.currencyCode,
                }));
              }}
            >
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
              <Input
                type="date"
                value={conversionEditor.orderDate}
                onChange={(event) => setConversionEditor((current) => ({ ...current, orderDate: event.target.value }))}
              />
            </Field>
            <Field label={t("purchases.requests.field.currency")}>
              <Input
                value={conversionEditor.currencyCode}
                maxLength={8}
                onChange={(event) =>
                  setConversionEditor((current) => ({ ...current, currencyCode: event.target.value.toUpperCase() }))
                }
              />
            </Field>
          </div>

          <Field label={t("purchases.requests.field.orderDescription")}>
            <Textarea
              rows={3}
              value={conversionEditor.description}
              onChange={(event) => setConversionEditor((current) => ({ ...current, description: event.target.value }))}
            />
          </Field>

          {conversionError ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {conversionError}
            </div>
          ) : null}

          {convertToOrderMutation.error instanceof Error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
              {convertToOrderMutation.error.message}
            </div>
          ) : null}

          <div className={cn("flex justify-end gap-3", isArabic && "flex-row-reverse")}>
            <Button variant="secondary" onClick={() => setIsConversionOpen(false)}>
              {t("purchases.action.cancel")}
            </Button>
            <Button
              onClick={() => convertToOrderMutation.mutate()}
              disabled={Boolean(conversionError) || convertToOrderMutation.isPending}
            >
              {t("purchases.action.convertToOrder")}
            </Button>
          </div>
        </div>
      </SidePanel>
    </PageShell>
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

function TableHead({ children }: { children: React.ReactNode }) {
  return <th className="px-6 py-3 text-start text-[10px] font-bold uppercase tracking-widest text-gray-600">{children}</th>;
}

function translatePurchaseRequestStatus(
  status: PurchaseRequest["status"],
  t: (key: string, vars?: Record<string, string | number>) => string,
) {
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

function translatePurchaseOrderStatus(
  status: PurchaseOrderStatus,
  t: (key: string, vars?: Record<string, string | number>) => string,
) {
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

function translatePurchaseInvoiceStatus(
  status: string,
  t: (key: string, vars?: Record<string, string | number>) => string,
) {
  switch (status) {
    case "DRAFT":
      return t("purchases.status.draft");
    case "POSTED":
      return t("purchases.invoices.status.posted");
    case "PARTIALLY_PAID":
      return t("purchases.invoices.status.partiallyPaid");
    case "FULLY_PAID":
      return t("purchases.invoices.status.fullyPaid");
    case "CANCELLED":
      return t("purchases.status.cancelled");
    case "REVERSED":
      return t("purchases.status.reversed");
    default:
      return status;
  }
}

function requestStatusTone(status: PurchaseRequest["status"]) {
  if (status === "APPROVED") return "positive" as const;
  if (status === "REJECTED" || status === "SUBMITTED") return "warning" as const;
  return "neutral" as const;
}

function purchaseOrderStatusTone(status: PurchaseOrderStatus) {
  if (status === "FULLY_RECEIVED") return "positive" as const;
  if (status === "ISSUED" || status === "PARTIALLY_RECEIVED" || status === "CANCELLED") {
    return "warning" as const;
  }
  return "neutral" as const;
}

function purchaseInvoiceStatusTone(status: string) {
  if (status === "POSTED" || status === "FULLY_PAID") return "positive" as const;
  if (status === "PARTIALLY_PAID" || status === "CANCELLED" || status === "REVERSED") {
    return "warning" as const;
  }
  return "neutral" as const;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : null;
}

function getConversionError(
  editor: ConversionState,
  t: (key: string, vars?: Record<string, string | number>) => string,
) {
  if (!editor.supplierId) return t("purchases.requests.empty.selectSupplier");
  if (!editor.orderDate) return t("purchases.validation.dateRequired");
  if (!editor.currencyCode.trim()) return t("purchases.validation.currencyRequired");
  return null;
}

function todayValue() {
  return new Date().toISOString().slice(0, 10);
}

function confirmAndRun(message: string, action: () => void) {
  if (window.confirm(message)) {
    action();
  }
}
