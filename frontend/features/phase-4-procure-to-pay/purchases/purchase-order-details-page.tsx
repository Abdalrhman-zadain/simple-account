"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import {
  cancelPurchaseOrder,
  closePurchaseOrder,
  getPurchaseOrderById,
  issuePurchaseOrder,
  markPurchaseOrderFullyReceived,
  markPurchaseOrderPartiallyReceived,
} from "@/lib/api";
import { useTranslation } from "@/lib/i18n";
import { queryKeys } from "@/lib/query-keys";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import type { PurchaseOrder, PurchaseReceipt } from "@/types/api";
import { Button, Card, PageShell, SectionHeading, StatusPill } from "@/components/ui";

export function PurchaseOrderDetailsPage({ purchaseOrderId }: { purchaseOrderId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { token } = useAuth();
  const { t } = useTranslation();

  const purchaseOrderQuery = useQuery({
    queryKey: queryKeys.purchaseOrderById(token, purchaseOrderId),
    queryFn: () => getPurchaseOrderById(purchaseOrderId, token),
  });

  const purchaseOrder = purchaseOrderQuery.data;

  async function invalidatePurchaseOrderWorkspace() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["purchase-orders", token] }),
      queryClient.invalidateQueries({ queryKey: ["purchase-order", token, purchaseOrderId] }),
      queryClient.invalidateQueries({ queryKey: ["purchase-requests", token] }),
      queryClient.invalidateQueries({ queryKey: ["purchase-request", token] }),
      queryClient.invalidateQueries({ queryKey: ["purchase-receipts", token] }),
      queryClient.invalidateQueries({ queryKey: ["purchase-invoices", token] }),
    ]);
  }

  const issueMutation = useMutation({
    mutationFn: () => issuePurchaseOrder(purchaseOrderId, token),
    onSuccess: invalidatePurchaseOrderWorkspace,
  });

  const markPartiallyReceivedMutation = useMutation({
    mutationFn: () => markPurchaseOrderPartiallyReceived(purchaseOrderId, token),
    onSuccess: invalidatePurchaseOrderWorkspace,
  });

  const markFullyReceivedMutation = useMutation({
    mutationFn: () => markPurchaseOrderFullyReceived(purchaseOrderId, token),
    onSuccess: invalidatePurchaseOrderWorkspace,
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelPurchaseOrder(purchaseOrderId, token),
    onSuccess: invalidatePurchaseOrderWorkspace,
  });

  const closeMutation = useMutation({
    mutationFn: () => closePurchaseOrder(purchaseOrderId, token),
    onSuccess: invalidatePurchaseOrderWorkspace,
  });

  const activeActionPending =
    issueMutation.isPending ||
    markPartiallyReceivedMutation.isPending ||
    markFullyReceivedMutation.isPending ||
    cancelMutation.isPending ||
    closeMutation.isPending;

  const actionError = getErrorMessage(
    issueMutation.error ??
      markPartiallyReceivedMutation.error ??
      markFullyReceivedMutation.error ??
      cancelMutation.error ??
      closeMutation.error,
  );
  const detailsError = getErrorMessage(purchaseOrderQuery.error);

  return (
    <PageShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionHeading
            title={t("purchases.orders.section.details")}
            description={t("purchases.orders.description")}
          />
          <Button variant="secondary" onClick={() => router.push("/purchases?tab=orders")}>
            {t("purchases.action.backToOrders")}
          </Button>
        </div>

        {detailsError ? (
          <Card className="border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-800">
            {detailsError}
          </Card>
        ) : null}

        {!purchaseOrder && purchaseOrderQuery.isLoading ? (
          <Card className="p-6 text-sm text-gray-500">{t("purchases.orders.state.loadingDetails")}</Card>
        ) : null}

        {purchaseOrder ? (
          <>
            <Card className="space-y-5 p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="inline-flex rounded-full bg-slate-100 px-3 py-1 font-mono text-xs font-bold text-slate-700">
                    {purchaseOrder.reference}
                  </div>
                  <div className="text-2xl font-black text-gray-900">
                    {purchaseOrder.description || t("purchases.orders.empty.noDescription")}
                  </div>
                  <div className="text-sm text-gray-500">{formatDate(purchaseOrder.orderDate)}</div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill
                    label={translatePurchaseOrderStatus(purchaseOrder.status, t)}
                    tone={purchaseOrderStatusTone(purchaseOrder.status)}
                  />
                  {purchaseOrder.canIssue ? (
                    <Button
                      size="sm"
                      disabled={activeActionPending}
                      onClick={() => confirmAndRun(t("purchases.orders.confirm.issue"), () => issueMutation.mutate())}
                    >
                      {t("purchases.action.issueOrder")}
                    </Button>
                  ) : null}
                  {purchaseOrder.canMarkPartiallyReceived ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={activeActionPending}
                      onClick={() =>
                        confirmAndRun(
                          t("purchases.orders.confirm.markPartiallyReceived"),
                          () => markPartiallyReceivedMutation.mutate(),
                        )
                      }
                    >
                      {t("purchases.action.markPartiallyReceived")}
                    </Button>
                  ) : null}
                  {purchaseOrder.canMarkFullyReceived ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={activeActionPending}
                      onClick={() =>
                        confirmAndRun(
                          t("purchases.orders.confirm.markFullyReceived"),
                          () => markFullyReceivedMutation.mutate(),
                        )
                      }
                    >
                      {t("purchases.action.markFullyReceived")}
                    </Button>
                  ) : null}
                  {purchaseOrder.canCancel ? (
                    <Button
                      variant="danger"
                      size="sm"
                      disabled={activeActionPending}
                      onClick={() => confirmAndRun(t("purchases.orders.confirm.cancel"), () => cancelMutation.mutate())}
                    >
                      {t("purchases.action.cancelOrder")}
                    </Button>
                  ) : null}
                  {purchaseOrder.canClose ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={activeActionPending}
                      onClick={() => confirmAndRun(t("purchases.orders.confirm.close"), () => closeMutation.mutate())}
                    >
                      {t("purchases.action.closeOrder")}
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
                <MiniMetric label={t("purchases.orders.metric.date")} value={formatDate(purchaseOrder.orderDate)} />
                <MiniMetric label={t("purchases.orders.metric.status")} value={translatePurchaseOrderStatus(purchaseOrder.status, t)} />
                <MiniMetric label={t("purchases.orders.metric.lines")} value={String(purchaseOrder.lines.length)} />
                <MiniMetric label={t("purchases.orders.metric.total")} value={formatCurrency(purchaseOrder.totalAmount)} />
              </div>
            </Card>

            <div className="grid gap-6 xl:grid-cols-2">
              <Card className="space-y-4 p-6">
                <div className="text-sm font-black uppercase tracking-[0.18em] text-gray-500">
                  {t("purchases.orders.section.summary")}
                </div>
                <div className="space-y-3 text-sm text-gray-700">
                  <div className="rounded-2xl border border-gray-200 px-4 py-4">
                    <div className="font-bold text-gray-900">
                      {purchaseOrder.supplier.code} · {purchaseOrder.supplier.name}
                    </div>
                    <div className="mt-1 text-xs text-gray-500">{purchaseOrder.currencyCode}</div>
                  </div>
                  <div className="rounded-2xl border border-gray-200 px-4 py-4">
                    <div>
                      {t("purchases.orders.field.sourceRequest")}:{" "}
                      {purchaseOrder.sourcePurchaseRequest ? (
                        <button
                          type="button"
                          className="font-semibold text-slate-700 underline underline-offset-4"
                          onClick={() =>
                            router.push(`/purchases/requests/${purchaseOrder.sourcePurchaseRequest?.id}`)
                          }
                        >
                          {purchaseOrder.sourcePurchaseRequest.reference}
                        </button>
                      ) : (
                        t("purchases.orders.empty.manual")
                      )}
                    </div>
                    <div className="mt-2">
                      {t("purchases.orders.field.description")}:{" "}
                      {purchaseOrder.description || t("purchases.orders.empty.noDescription")}
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    <MiniMetric label={t("purchases.orders.metric.subtotal")} value={formatCurrency(purchaseOrder.subtotalAmount)} />
                    <MiniMetric label={t("purchases.orders.metric.tax")} value={formatCurrency(purchaseOrder.taxAmount)} />
                    <MiniMetric label={t("purchases.orders.metric.total")} value={formatCurrency(purchaseOrder.totalAmount)} />
                  </div>
                </div>
              </Card>

              <Card className="space-y-4 p-6">
                <div className="text-sm font-black uppercase tracking-[0.18em] text-gray-500">
                  {t("purchases.orders.section.lines")}
                </div>
                <div className="space-y-3">
                  {purchaseOrder.lines.map((line) => (
                    <div key={line.id} className="rounded-2xl border border-gray-200 px-4 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-bold text-gray-900">{line.itemName || line.description}</div>
                        <div className="text-sm text-gray-500">
                          {t("purchases.orders.line.qtyPrice", {
                            quantity: line.quantity,
                            price: formatCurrency(line.unitPrice),
                          })}
                        </div>
                      </div>
                      <div className="mt-2 text-sm text-gray-600">{line.description}</div>
                      <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">
                        <span>{t("purchases.orders.field.taxAmount")}: {formatCurrency(line.taxAmount)}</span>
                        <span>{t("purchases.orders.field.lineTotal")}: {formatCurrency(line.lineTotalAmount)}</span>
                        <span>
                          {t("purchases.orders.field.deliveryDate")}:{" "}
                          {line.requestedDeliveryDate
                            ? formatDate(line.requestedDeliveryDate)
                            : t("purchases.requests.empty.notSet")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <Card className="space-y-4 p-6">
              <div className="text-sm font-black uppercase tracking-[0.18em] text-gray-500">
                {t("purchases.orders.section.receipts")}
              </div>
              {purchaseOrder.receipts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-300 px-4 py-6 text-sm text-gray-500">
                  {t("purchases.orders.empty.receipts")}
                </div>
              ) : (
                <div className="space-y-3">
                  {purchaseOrder.receipts.map((receipt) => (
                    <ReceiptCard key={receipt.id} receipt={receipt} />
                  ))}
                </div>
              )}
            </Card>
          </>
        ) : null}
      </div>
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

function ReceiptCard({ receipt }: { receipt: PurchaseOrder["receipts"][number] }) {
  const { t } = useTranslation();

  return (
    <div className="rounded-2xl border border-gray-200 px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-bold text-gray-900">{receipt.reference}</div>
          <div className="mt-1 text-xs text-gray-500">{formatDate(receipt.receiptDate)}</div>
        </div>
        <StatusPill
          label={translatePurchaseReceiptStatus(receipt.status, t)}
          tone={purchaseReceiptStatusTone(receipt.status)}
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">
        <span>{t("purchases.orders.metric.receivedQuantity")}: {receipt.totalQuantity}</span>
        <span>{t("purchases.orders.field.postedAt")}: {receipt.postedAt ? formatDate(receipt.postedAt) : t("purchases.orders.empty.notPosted")}</span>
      </div>
    </div>
  );
}

function translatePurchaseOrderStatus(
  status: PurchaseOrder["status"],
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

function translatePurchaseReceiptStatus(
  status: PurchaseReceipt["status"],
  t: (key: string, vars?: Record<string, string | number>) => string,
) {
  switch (status) {
    case "DRAFT":
      return t("purchases.status.draft");
    case "POSTED":
      return t("purchases.invoices.status.posted");
    case "CANCELLED":
      return t("purchases.status.cancelled");
    default:
      return status;
  }
}

function purchaseOrderStatusTone(status: PurchaseOrder["status"]) {
  if (status === "FULLY_RECEIVED") return "positive" as const;
  if (status === "ISSUED" || status === "PARTIALLY_RECEIVED" || status === "CANCELLED") {
    return "warning" as const;
  }
  return "neutral" as const;
}

function purchaseReceiptStatusTone(status: PurchaseReceipt["status"]) {
  if (status === "POSTED") return "positive" as const;
  if (status === "CANCELLED") return "warning" as const;
  return "neutral" as const;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : null;
}

function confirmAndRun(message: string, action: () => void) {
  if (window.confirm(message)) {
    action();
  }
}
