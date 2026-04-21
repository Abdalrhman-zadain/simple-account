"use client";

import { ReactNode, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  approvePurchaseRequest,
  cancelDebitNote,
  closePurchaseRequest,
  closePurchaseOrder,
  cancelPurchaseOrder,
  cancelSupplierPayment,
  convertPurchaseRequestToOrder,
  createDebitNote,
  createPurchaseInvoice,
  createPurchaseOrder,
  createPurchaseRequest,
  createSupplierPayment,
  createSupplier,
  deactivateSupplier,
  getBankCashAccounts,
  getAccountOptions,
  getDebitNoteById,
  getDebitNotes,
  getPurchaseInvoiceById,
  getPurchaseInvoices,
  getPurchaseOrderById,
  getPurchaseOrders,
  getPurchaseRequestById,
  getPurchaseRequests,
  issuePurchaseOrder,
  markPurchaseOrderFullyReceived,
  markPurchaseOrderPartiallyReceived,
  getSupplierBalance,
  getSupplierPaymentById,
  getSupplierPayments,
  getSupplierTransactions,
  getSuppliers,
  postDebitNote,
  rejectPurchaseRequest,
  submitPurchaseRequest,
  postSupplierPayment,
  updateDebitNote,
  updatePurchaseInvoice,
  updatePurchaseOrder,
  updatePurchaseRequest,
  updateSupplierPayment,
  updateSupplier,
} from "@/lib/api";
import { useTranslation } from "@/lib/i18n";
import { queryKeys } from "@/lib/query-keys";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import type { DebitNote, PurchaseInvoice, PurchaseOrder, PurchaseRequest, Supplier, SupplierPayment } from "@/types/api";
import { Button, Card, PageShell, SectionHeading, SidePanel, StatusPill } from "@/components/ui";
import { Field, Input, Select, Textarea } from "@/components/ui/forms";

type Workspace = "suppliers" | "requests" | "orders" | "invoices" | "payments" | "notes";

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

type PurchaseOrderLineEditorState = {
  key: string;
  itemName: string;
  description: string;
  quantity: string;
  unitPrice: string;
  taxAmount: string;
  requestedDeliveryDate: string;
};

type PurchaseOrderEditorState = {
  id?: string;
  reference: string;
  orderDate: string;
  supplierId: string;
  currencyCode: string;
  description: string;
  sourcePurchaseRequestId: string;
  lines: PurchaseOrderLineEditorState[];
};

type PurchaseInvoiceLineEditorState = {
  key: string;
  itemName: string;
  description: string;
  quantity: string;
  unitPrice: string;
  discountAmount: string;
  taxAmount: string;
  accountId: string;
};

type PurchaseInvoiceEditorState = {
  id?: string;
  reference: string;
  invoiceDate: string;
  supplierId: string;
  currencyCode: string;
  description: string;
  sourcePurchaseOrderId: string;
  lines: PurchaseInvoiceLineEditorState[];
};

type SupplierPaymentAllocationEditorState = {
  key: string;
  purchaseInvoiceId: string;
  amount: string;
};

type SupplierPaymentEditorState = {
  id?: string;
  reference: string;
  paymentDate: string;
  supplierId: string;
  amount: string;
  bankCashAccountId: string;
  description: string;
  allocations: SupplierPaymentAllocationEditorState[];
};

type DebitNoteLineEditorState = {
  key: string;
  quantity: string;
  amount: string;
  taxAmount: string;
  reason: string;
};

type DebitNoteEditorState = {
  id?: string;
  reference: string;
  noteDate: string;
  supplierId: string;
  purchaseInvoiceId: string;
  currencyCode: string;
  description: string;
  lines: DebitNoteLineEditorState[];
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

const EMPTY_ORDER_EDITOR = (): PurchaseOrderEditorState => ({
  reference: "",
  orderDate: todayValue(),
  supplierId: "",
  currencyCode: "JOD",
  description: "",
  sourcePurchaseRequestId: "",
  lines: [createEmptyOrderLine()],
});

const EMPTY_INVOICE_EDITOR = (): PurchaseInvoiceEditorState => ({
  reference: "",
  invoiceDate: todayValue(),
  supplierId: "",
  currencyCode: "JOD",
  description: "",
  sourcePurchaseOrderId: "",
  lines: [createEmptyInvoiceLine()],
});

const EMPTY_PAYMENT_EDITOR = (): SupplierPaymentEditorState => ({
  reference: "",
  paymentDate: todayValue(),
  supplierId: "",
  amount: "",
  bankCashAccountId: "",
  description: "",
  allocations: [createEmptyPaymentAllocation()],
});

const EMPTY_DEBIT_NOTE_EDITOR = (): DebitNoteEditorState => ({
  reference: "",
  noteDate: todayValue(),
  supplierId: "",
  purchaseInvoiceId: "",
  currencyCode: "JOD",
  description: "",
  lines: [createEmptyDebitNoteLine()],
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
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState<
    "" | "DRAFT" | "ISSUED" | "PARTIALLY_RECEIVED" | "FULLY_RECEIVED" | "CANCELLED" | "CLOSED"
  >("");
  const [selectedPurchaseOrderId, setSelectedPurchaseOrderId] = useState<string | null>(null);
  const [isOrderEditorOpen, setIsOrderEditorOpen] = useState(false);
  const [orderEditor, setOrderEditor] = useState<PurchaseOrderEditorState>(EMPTY_ORDER_EDITOR);
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<
    "" | "DRAFT" | "POSTED" | "PARTIALLY_PAID" | "FULLY_PAID" | "CANCELLED"
  >("");
  const [selectedPurchaseInvoiceId, setSelectedPurchaseInvoiceId] = useState<string | null>(null);
  const [isInvoiceEditorOpen, setIsInvoiceEditorOpen] = useState(false);
  const [invoiceEditor, setInvoiceEditor] = useState<PurchaseInvoiceEditorState>(EMPTY_INVOICE_EDITOR);
  const [paymentSearch, setPaymentSearch] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<"" | "DRAFT" | "POSTED" | "CANCELLED">("");
  const [selectedSupplierPaymentId, setSelectedSupplierPaymentId] = useState<string | null>(null);
  const [isPaymentEditorOpen, setIsPaymentEditorOpen] = useState(false);
  const [paymentEditor, setPaymentEditor] = useState<SupplierPaymentEditorState>(EMPTY_PAYMENT_EDITOR);
  const [debitNoteSearch, setDebitNoteSearch] = useState("");
  const [debitNoteStatusFilter, setDebitNoteStatusFilter] = useState<"" | "DRAFT" | "POSTED" | "APPLIED" | "CANCELLED">("");
  const [selectedDebitNoteId, setSelectedDebitNoteId] = useState<string | null>(null);
  const [isDebitNoteEditorOpen, setIsDebitNoteEditorOpen] = useState(false);
  const [debitNoteEditor, setDebitNoteEditor] = useState<DebitNoteEditorState>(EMPTY_DEBIT_NOTE_EDITOR);

  const suppliersQuery = useQuery({
    queryKey: queryKeys.purchaseSuppliers(token, { search: supplierSearch, isActive: supplierStatusFilter }),
    queryFn: () => getSuppliers({ search: supplierSearch, isActive: supplierStatusFilter }, token),
  });

  const payableAccountsQuery = useQuery({
    queryKey: queryKeys.accounts(token, { isPosting: "true", isActive: "true", type: "LIABILITY", view: "selector" }),
    queryFn: () => getAccountOptions({ isPosting: "true", isActive: "true", type: "LIABILITY" }, token),
    staleTime: 5 * 60 * 1000,
  });

  const invoiceAccountsQuery = useQuery({
    queryKey: queryKeys.accounts(token, { isPosting: "true", isActive: "true", view: "selector" }),
    queryFn: () => getAccountOptions({ isPosting: "true", isActive: "true" }, token),
    staleTime: 5 * 60 * 1000,
  });

  const bankCashAccountsQuery = useQuery({
    queryKey: queryKeys.bankCashAccounts(token, { isActive: "true" }),
    queryFn: () => getBankCashAccounts({ isActive: "true" }, token),
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

  const purchaseOrdersQuery = useQuery({
    queryKey: queryKeys.purchaseOrders(token, {
      search: orderSearch,
      status: orderStatusFilter,
    }),
    queryFn: () =>
      getPurchaseOrders(
        {
          search: orderSearch,
          status: orderStatusFilter,
        },
        token,
      ),
  });

  const purchaseOrderDetailQuery = useQuery({
    queryKey: queryKeys.purchaseOrderById(token, selectedPurchaseOrderId),
    queryFn: () => getPurchaseOrderById(selectedPurchaseOrderId!, token),
    enabled: Boolean(selectedPurchaseOrderId),
  });

  const purchaseInvoicesQuery = useQuery({
    queryKey: queryKeys.purchaseInvoices(token, {
      search: invoiceSearch,
      status: invoiceStatusFilter,
    }),
    queryFn: () =>
      getPurchaseInvoices(
        {
          search: invoiceSearch,
          status: invoiceStatusFilter,
        },
        token,
      ),
  });

  const purchaseInvoiceDetailQuery = useQuery({
    queryKey: queryKeys.purchaseInvoiceById(token, selectedPurchaseInvoiceId),
    queryFn: () => getPurchaseInvoiceById(selectedPurchaseInvoiceId!, token),
    enabled: Boolean(selectedPurchaseInvoiceId),
  });

  const supplierPaymentsQuery = useQuery({
    queryKey: queryKeys.supplierPayments(token, {
      search: paymentSearch,
      status: paymentStatusFilter,
    }),
    queryFn: () =>
      getSupplierPayments(
        {
          search: paymentSearch,
          status: paymentStatusFilter,
        },
        token,
      ),
  });

  const supplierPaymentDetailQuery = useQuery({
    queryKey: queryKeys.supplierPaymentById(token, selectedSupplierPaymentId),
    queryFn: () => getSupplierPaymentById(selectedSupplierPaymentId!, token),
    enabled: Boolean(selectedSupplierPaymentId),
  });

  const debitNotesQuery = useQuery({
    queryKey: queryKeys.debitNotes(token, {
      search: debitNoteSearch,
      status: debitNoteStatusFilter,
    }),
    queryFn: () =>
      getDebitNotes(
        {
          search: debitNoteSearch,
          status: debitNoteStatusFilter,
        },
        token,
      ),
  });

  const debitNoteDetailQuery = useQuery({
    queryKey: queryKeys.debitNoteById(token, selectedDebitNoteId),
    queryFn: () => getDebitNoteById(selectedDebitNoteId!, token),
    enabled: Boolean(selectedDebitNoteId),
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

  const createPurchaseOrderMutation = useMutation({
    mutationFn: () =>
      createPurchaseOrder(
        {
          reference: orderEditor.reference || undefined,
          orderDate: orderEditor.orderDate,
          supplierId: orderEditor.supplierId,
          currencyCode: orderEditor.currencyCode || undefined,
          description: orderEditor.description || undefined,
          sourcePurchaseRequestId: orderEditor.sourcePurchaseRequestId || undefined,
          lines: mapOrderEditorLines(orderEditor.lines),
        },
        token,
      ),
    onSuccess: async (created) => {
      await invalidatePurchases(queryClient);
      setSelectedPurchaseOrderId(created.id);
      closeOrderEditor();
    },
  });

  const updatePurchaseOrderMutation = useMutation({
    mutationFn: () =>
      updatePurchaseOrder(
        orderEditor.id!,
        {
          reference: orderEditor.reference || undefined,
          orderDate: orderEditor.orderDate,
          supplierId: orderEditor.supplierId,
          currencyCode: orderEditor.currencyCode || undefined,
          description: orderEditor.description || undefined,
          lines: mapOrderEditorLines(orderEditor.lines),
        },
        token,
      ),
    onSuccess: async (updated) => {
      await invalidatePurchases(queryClient);
      setSelectedPurchaseOrderId(updated.id);
      closeOrderEditor();
    },
  });

  const issuePurchaseOrderMutation = useMutation({
    mutationFn: (id: string) => issuePurchaseOrder(id, token),
    onSuccess: async (updated) => {
      await invalidatePurchases(queryClient);
      setSelectedPurchaseOrderId(updated.id);
    },
  });

  const markPartiallyReceivedMutation = useMutation({
    mutationFn: (id: string) => markPurchaseOrderPartiallyReceived(id, token),
    onSuccess: async (updated) => {
      await invalidatePurchases(queryClient);
      setSelectedPurchaseOrderId(updated.id);
    },
  });

  const markFullyReceivedMutation = useMutation({
    mutationFn: (id: string) => markPurchaseOrderFullyReceived(id, token),
    onSuccess: async (updated) => {
      await invalidatePurchases(queryClient);
      setSelectedPurchaseOrderId(updated.id);
    },
  });

  const cancelPurchaseOrderMutation = useMutation({
    mutationFn: (id: string) => cancelPurchaseOrder(id, token),
    onSuccess: async (updated) => {
      await invalidatePurchases(queryClient);
      setSelectedPurchaseOrderId(updated.id);
    },
  });

  const closePurchaseOrderMutation = useMutation({
    mutationFn: (id: string) => closePurchaseOrder(id, token),
    onSuccess: async (updated) => {
      await invalidatePurchases(queryClient);
      setSelectedPurchaseOrderId(updated.id);
    },
  });

  const createPurchaseInvoiceMutation = useMutation({
    mutationFn: () =>
      createPurchaseInvoice(
        {
          reference: invoiceEditor.reference || undefined,
          invoiceDate: invoiceEditor.invoiceDate,
          supplierId: invoiceEditor.supplierId,
          currencyCode: invoiceEditor.currencyCode || undefined,
          description: invoiceEditor.description || undefined,
          sourcePurchaseOrderId: invoiceEditor.sourcePurchaseOrderId || undefined,
          lines: mapInvoiceEditorLines(invoiceEditor.lines),
        },
        token,
      ),
    onSuccess: async (created) => {
      await invalidatePurchases(queryClient);
      setSelectedPurchaseInvoiceId(created.id);
      closeInvoiceEditor();
    },
  });

  const updatePurchaseInvoiceMutation = useMutation({
    mutationFn: () =>
      updatePurchaseInvoice(
        invoiceEditor.id!,
        {
          reference: invoiceEditor.reference || undefined,
          invoiceDate: invoiceEditor.invoiceDate,
          supplierId: invoiceEditor.supplierId,
          currencyCode: invoiceEditor.currencyCode || undefined,
          description: invoiceEditor.description || undefined,
          sourcePurchaseOrderId: invoiceEditor.sourcePurchaseOrderId || undefined,
          lines: mapInvoiceEditorLines(invoiceEditor.lines),
        },
        token,
      ),
    onSuccess: async (updated) => {
      await invalidatePurchases(queryClient);
      setSelectedPurchaseInvoiceId(updated.id);
      closeInvoiceEditor();
    },
  });

  const createSupplierPaymentMutation = useMutation({
    mutationFn: () =>
      createSupplierPayment(
        {
          reference: paymentEditor.reference || undefined,
          paymentDate: paymentEditor.paymentDate,
          supplierId: paymentEditor.supplierId,
          amount: Number(paymentEditor.amount || 0),
          bankCashAccountId: paymentEditor.bankCashAccountId,
          description: paymentEditor.description || undefined,
          allocations: mapPaymentEditorAllocations(paymentEditor.allocations),
        },
        token,
      ),
    onSuccess: async (created) => {
      await invalidatePurchases(queryClient);
      setSelectedSupplierPaymentId(created.id);
      closePaymentEditor();
    },
  });

  const updateSupplierPaymentMutation = useMutation({
    mutationFn: () =>
      updateSupplierPayment(
        paymentEditor.id!,
        {
          reference: paymentEditor.reference || undefined,
          paymentDate: paymentEditor.paymentDate,
          supplierId: paymentEditor.supplierId,
          amount: Number(paymentEditor.amount || 0),
          bankCashAccountId: paymentEditor.bankCashAccountId,
          description: paymentEditor.description || undefined,
          allocations: mapPaymentEditorAllocations(paymentEditor.allocations),
        },
        token,
      ),
    onSuccess: async (updated) => {
      await invalidatePurchases(queryClient);
      setSelectedSupplierPaymentId(updated.id);
      closePaymentEditor();
    },
  });

  const postSupplierPaymentMutation = useMutation({
    mutationFn: (id: string) => postSupplierPayment(id, token),
    onSuccess: async (updated) => {
      await invalidatePurchases(queryClient);
      setSelectedSupplierPaymentId(updated.id);
    },
  });

  const cancelSupplierPaymentMutation = useMutation({
    mutationFn: (id: string) => cancelSupplierPayment(id, token),
    onSuccess: async (updated) => {
      await invalidatePurchases(queryClient);
      setSelectedSupplierPaymentId(updated.id);
    },
  });

  const createDebitNoteMutation = useMutation({
    mutationFn: () =>
      createDebitNote(
        {
          reference: debitNoteEditor.reference || undefined,
          noteDate: debitNoteEditor.noteDate,
          supplierId: debitNoteEditor.supplierId,
          purchaseInvoiceId: debitNoteEditor.purchaseInvoiceId || undefined,
          currencyCode: debitNoteEditor.currencyCode || undefined,
          description: debitNoteEditor.description || undefined,
          lines: mapDebitNoteEditorLines(debitNoteEditor.lines),
        },
        token,
      ),
    onSuccess: async (created) => {
      await invalidatePurchases(queryClient);
      setSelectedDebitNoteId(created.id);
      closeDebitNoteEditor();
    },
  });

  const updateDebitNoteMutation = useMutation({
    mutationFn: () =>
      updateDebitNote(
        debitNoteEditor.id!,
        {
          reference: debitNoteEditor.reference || undefined,
          noteDate: debitNoteEditor.noteDate,
          supplierId: debitNoteEditor.supplierId,
          purchaseInvoiceId: debitNoteEditor.purchaseInvoiceId || undefined,
          currencyCode: debitNoteEditor.currencyCode || undefined,
          description: debitNoteEditor.description || undefined,
          lines: mapDebitNoteEditorLines(debitNoteEditor.lines),
        },
        token,
      ),
    onSuccess: async (updated) => {
      await invalidatePurchases(queryClient);
      setSelectedDebitNoteId(updated.id);
      closeDebitNoteEditor();
    },
  });

  const postDebitNoteMutation = useMutation({
    mutationFn: (id: string) => postDebitNote(id, token),
    onSuccess: async (updated) => {
      await invalidatePurchases(queryClient);
      setSelectedDebitNoteId(updated.id);
    },
  });

  const cancelDebitNoteMutation = useMutation({
    mutationFn: (id: string) => cancelDebitNote(id, token),
    onSuccess: async (updated) => {
      await invalidatePurchases(queryClient);
      setSelectedDebitNoteId(updated.id);
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
  const purchaseOrders = purchaseOrdersQuery.data ?? [];
  const selectedPurchaseOrder =
    purchaseOrderDetailQuery.data ??
    purchaseOrders.find((row) => row.id === selectedPurchaseOrderId) ??
    null;
  const purchaseInvoices = purchaseInvoicesQuery.data ?? [];
  const selectedPurchaseInvoice =
    purchaseInvoiceDetailQuery.data ??
    purchaseInvoices.find((row) => row.id === selectedPurchaseInvoiceId) ??
    null;
  const supplierPayments = supplierPaymentsQuery.data ?? [];
  const selectedSupplierPayment =
    supplierPaymentDetailQuery.data ??
    supplierPayments.find((row) => row.id === selectedSupplierPaymentId) ??
    null;
  const debitNotes = debitNotesQuery.data ?? [];
  const selectedDebitNote =
    debitNoteDetailQuery.data ??
    debitNotes.find((row) => row.id === selectedDebitNoteId) ??
    null;

  const activeSuppliers = suppliers.filter((row) => row.isActive);
  const totalOutstanding = suppliers.reduce((sum, row) => sum + Number(row.currentBalance), 0);

  const totalRequests = purchaseRequests.length;
  const submittedRequests = purchaseRequests.filter((row) => row.status === "SUBMITTED").length;
  const approvedRequests = purchaseRequests.filter((row) => row.status === "APPROVED").length;
  const totalOrders = purchaseOrders.length;
  const issuedOrders = purchaseOrders.filter((row) => row.status === "ISSUED").length;
  const openReceiptOrders = purchaseOrders.filter(
    (row) => row.status === "ISSUED" || row.status === "PARTIALLY_RECEIVED",
  ).length;
  const totalInvoices = purchaseInvoices.length;
  const draftInvoices = purchaseInvoices.filter((row) => row.status === "DRAFT").length;
  const linkedOrderInvoices = purchaseInvoices.filter((row) => row.sourcePurchaseOrder).length;
  const totalPayments = supplierPayments.length;
  const draftPayments = supplierPayments.filter((row) => row.status === "DRAFT").length;
  const postedPayments = supplierPayments.filter((row) => row.status === "POSTED").length;
  const totalDebitNotes = debitNotes.length;
  const draftDebitNotes = debitNotes.filter((row) => row.status === "DRAFT").length;
  const appliedDebitNotes = debitNotes.filter((row) => row.status === "APPLIED").length;

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
  const orderSaveError = getMutationErrorMessage(createPurchaseOrderMutation.error ?? updatePurchaseOrderMutation.error);
  const orderFormError = getPurchaseOrderFormError(orderEditor);
  const orderActionError = getMutationErrorMessage(
    issuePurchaseOrderMutation.error ??
      markPartiallyReceivedMutation.error ??
      markFullyReceivedMutation.error ??
      cancelPurchaseOrderMutation.error ??
      closePurchaseOrderMutation.error,
  );
  const invoiceSaveError = getMutationErrorMessage(createPurchaseInvoiceMutation.error ?? updatePurchaseInvoiceMutation.error);
  const invoiceFormError = getPurchaseInvoiceFormError(invoiceEditor);
  const paymentSaveError = getMutationErrorMessage(createSupplierPaymentMutation.error ?? updateSupplierPaymentMutation.error);
  const paymentFormError = getSupplierPaymentFormError(paymentEditor);
  const paymentActionError = getMutationErrorMessage(postSupplierPaymentMutation.error ?? cancelSupplierPaymentMutation.error);
  const debitNoteSaveError = getMutationErrorMessage(createDebitNoteMutation.error ?? updateDebitNoteMutation.error);
  const debitNoteFormError = getDebitNoteFormError(debitNoteEditor);
  const debitNoteActionError = getMutationErrorMessage(postDebitNoteMutation.error ?? cancelDebitNoteMutation.error);

  const activeActionMutationPending =
    submitPurchaseRequestMutation.isPending ||
    approvePurchaseRequestMutation.isPending ||
    rejectPurchaseRequestMutation.isPending ||
    closePurchaseRequestMutation.isPending;
  const activeOrderActionMutationPending =
    issuePurchaseOrderMutation.isPending ||
    markPartiallyReceivedMutation.isPending ||
    markFullyReceivedMutation.isPending ||
    cancelPurchaseOrderMutation.isPending ||
    closePurchaseOrderMutation.isPending;
  const activePaymentActionMutationPending =
    postSupplierPaymentMutation.isPending || cancelSupplierPaymentMutation.isPending;
  const activeDebitNoteActionMutationPending =
    postDebitNoteMutation.isPending || cancelDebitNoteMutation.isPending;

  return (
    <PageShell>
      <div className="space-y-8">
        <SectionHeading
          title={t("purchases.title")}
          description={
            workspace === "suppliers"
              ? t("purchases.description")
              : workspace === "requests"
                ? t("purchases.requests.description")
                : workspace === "orders"
                  ? t("purchases.orders.description")
                  : workspace === "invoices"
                    ? t("purchases.invoices.description")
                    : workspace === "payments"
                      ? t("purchases.payments.description")
                      : t("purchases.debitNotes.description")
          }
          action={
            workspace === "suppliers" ? (
              <Button onClick={openNewSupplierEditor}>{t("purchases.action.newSupplier")}</Button>
            ) : workspace === "requests" ? (
              <Button onClick={openNewPurchaseRequestEditor}>{t("purchases.action.newRequest")}</Button>
            ) : workspace === "orders" ? (
              <Button onClick={openNewPurchaseOrderEditor}>{t("purchases.action.newOrder")}</Button>
            ) : workspace === "invoices" ? (
              <Button onClick={openNewPurchaseInvoiceEditor}>{t("purchases.action.newInvoice")}</Button>
            ) : workspace === "payments" ? (
              <Button onClick={openNewSupplierPaymentEditor}>{t("purchases.action.newPayment")}</Button>
            ) : (
              <Button onClick={openNewDebitNoteEditor}>{t("purchases.action.newDebitNote")}</Button>
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
          <Button variant={workspace === "orders" ? "primary" : "secondary"} onClick={() => setWorkspace("orders")}>
            {t("purchases.workspace.orders")}
          </Button>
          <Button variant={workspace === "invoices" ? "primary" : "secondary"} onClick={() => setWorkspace("invoices")}>
            {t("purchases.workspace.invoices")}
          </Button>
          <Button variant={workspace === "payments" ? "primary" : "secondary"} onClick={() => setWorkspace("payments")}>
            {t("purchases.workspace.payments")}
          </Button>
          <Button variant={workspace === "notes" ? "primary" : "secondary"} onClick={() => setWorkspace("notes")}>
            {t("purchases.workspace.debitNotes")}
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
        ) : workspace === "requests" ? (
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
        ) : workspace === "orders" ? (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <SummaryCard label={t("purchases.orders.summary.total")} value={String(totalOrders)} hint={t("purchases.orders.summary.totalHint")} />
              <SummaryCard label={t("purchases.orders.summary.issued")} value={String(issuedOrders)} hint={t("purchases.orders.summary.issuedHint")} />
              <SummaryCard label={t("purchases.orders.summary.openReceipt")} value={String(openReceiptOrders)} hint={t("purchases.orders.summary.openReceiptHint")} />
            </div>

            <Card className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <Field label={t("purchases.orders.filters.search")}>
                  <Input value={orderSearch} onChange={(event) => setOrderSearch(event.target.value)} placeholder={t("purchases.orders.filters.searchPlaceholder")} />
                </Field>
                <Field label={t("purchases.orders.filters.status")}>
                  <Select value={orderStatusFilter} onChange={(event) => setOrderStatusFilter(event.target.value as typeof orderStatusFilter)}>
                    <option value="">{t("purchases.filters.allStatuses")}</option>
                    <option value="DRAFT">{t("purchases.status.orderDraft")}</option>
                    <option value="ISSUED">{t("purchases.status.orderIssued")}</option>
                    <option value="PARTIALLY_RECEIVED">{t("purchases.status.orderPartiallyReceived")}</option>
                    <option value="FULLY_RECEIVED">{t("purchases.status.orderFullyReceived")}</option>
                    <option value="CANCELLED">{t("purchases.status.cancelled")}</option>
                    <option value="CLOSED">{t("purchases.status.closed")}</option>
                  </Select>
                </Field>
                <div className="flex items-end">
                  <Button variant="secondary" onClick={() => { setOrderSearch(""); setOrderStatusFilter(""); }}>
                    {t("purchases.action.clearFilters")}
                  </Button>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <TableHead>{t("purchases.orders.table.reference")}</TableHead>
                      <TableHead>{t("purchases.orders.table.supplier")}</TableHead>
                      <TableHead>{t("purchases.orders.table.date")}</TableHead>
                      <TableHead>{t("purchases.orders.table.total")}</TableHead>
                      <TableHead>{t("purchases.orders.table.status")}</TableHead>
                      <TableHead>{t("purchases.table.actions")}</TableHead>
                    </tr>
                  </thead>
                  <tbody>
                    {purchaseOrders.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-500">
                          {t("purchases.orders.empty.list")}
                        </td>
                      </tr>
                    ) : (
                      purchaseOrders.map((row) => (
                        <tr key={row.id} className={cn("border-t border-gray-100", selectedPurchaseOrderId === row.id && "bg-gray-50/70")}>
                          <td className="px-6 py-4 align-top">
                            <div className="font-bold text-gray-900">{row.reference}</div>
                            <div className="text-xs text-gray-500">{row.sourcePurchaseRequest?.reference || t("purchases.orders.empty.manual")}</div>
                          </td>
                          <td className="px-6 py-4 align-top">
                            <div className="font-bold text-gray-900">{row.supplier.code} · {row.supplier.name}</div>
                            <div className="text-xs text-gray-500">{row.currencyCode}</div>
                          </td>
                          <td className="px-6 py-4 align-top">{formatDate(row.orderDate)}</td>
                          <td className="px-6 py-4 align-top">{formatCurrency(row.totalAmount)}</td>
                          <td className="px-6 py-4 align-top">
                            <StatusPill label={translatePurchaseOrderStatus(row.status, t)} tone={purchaseOrderStatusTone(row.status)} />
                          </td>
                          <td className="px-6 py-4 align-top">
                            <div className="flex flex-wrap gap-2">
                              <Button variant="secondary" size="sm" onClick={() => setSelectedPurchaseOrderId(row.id)}>
                                {t("purchases.action.view")}
                              </Button>
                              {row.canEdit ? (
                                <Button variant="secondary" size="sm" onClick={() => openEditPurchaseOrderEditor(row)}>
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
                <div className="text-sm font-black uppercase tracking-[0.22em] text-gray-500">{t("purchases.orders.section.details")}</div>
                {selectedPurchaseOrder ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedPurchaseOrder.canIssue ? (
                      <Button size="sm" disabled={activeOrderActionMutationPending} onClick={() => confirmAndRun(t("purchases.orders.confirm.issue"), () => issuePurchaseOrderMutation.mutate(selectedPurchaseOrder.id))}>
                        {t("purchases.action.issueOrder")}
                      </Button>
                    ) : null}
                    {selectedPurchaseOrder.canMarkPartiallyReceived ? (
                      <Button variant="secondary" size="sm" disabled={activeOrderActionMutationPending} onClick={() => confirmAndRun(t("purchases.orders.confirm.markPartiallyReceived"), () => markPartiallyReceivedMutation.mutate(selectedPurchaseOrder.id))}>
                        {t("purchases.action.markPartiallyReceived")}
                      </Button>
                    ) : null}
                    {selectedPurchaseOrder.canMarkFullyReceived ? (
                      <Button variant="secondary" size="sm" disabled={activeOrderActionMutationPending} onClick={() => confirmAndRun(t("purchases.orders.confirm.markFullyReceived"), () => markFullyReceivedMutation.mutate(selectedPurchaseOrder.id))}>
                        {t("purchases.action.markFullyReceived")}
                      </Button>
                    ) : null}
                    {selectedPurchaseOrder.canCancel ? (
                      <Button variant="danger" size="sm" disabled={activeOrderActionMutationPending} onClick={() => confirmAndRun(t("purchases.orders.confirm.cancel"), () => cancelPurchaseOrderMutation.mutate(selectedPurchaseOrder.id))}>
                        {t("purchases.action.cancelOrder")}
                      </Button>
                    ) : null}
                    {selectedPurchaseOrder.canClose ? (
                      <Button variant="secondary" size="sm" disabled={activeOrderActionMutationPending} onClick={() => confirmAndRun(t("purchases.orders.confirm.close"), () => closePurchaseOrderMutation.mutate(selectedPurchaseOrder.id))}>
                        {t("purchases.action.closeOrder")}
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </div>

              {orderActionError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                  {orderActionError}
                </div>
              ) : null}

              {!selectedPurchaseOrder ? (
                <div className="rounded-2xl border border-dashed border-gray-300 px-6 py-8 text-sm text-gray-500">
                  {t("purchases.orders.empty.selectOrder")}
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-4">
                    <MiniMetric label={t("purchases.orders.metric.date")} value={formatDate(selectedPurchaseOrder.orderDate)} />
                    <MiniMetric label={t("purchases.orders.metric.status")} value={translatePurchaseOrderStatus(selectedPurchaseOrder.status, t)} />
                    <MiniMetric label={t("purchases.orders.metric.lines")} value={String(selectedPurchaseOrder.lines.length)} />
                    <MiniMetric label={t("purchases.orders.metric.total")} value={formatCurrency(selectedPurchaseOrder.totalAmount)} />
                  </div>

                  <div className="grid gap-6 xl:grid-cols-2">
                    <Card className="space-y-4">
                      <div className="text-sm font-black uppercase tracking-[0.18em] text-gray-500">{t("purchases.orders.section.summary")}</div>
                      <div className="space-y-3 text-sm text-gray-700">
                        <div className="rounded-2xl border border-gray-200 px-4 py-4">
                          <div className="font-bold text-gray-900">{selectedPurchaseOrder.supplier.code} · {selectedPurchaseOrder.supplier.name}</div>
                          <div className="mt-1 text-xs text-gray-500">{selectedPurchaseOrder.currencyCode}</div>
                        </div>
                        <div className="rounded-2xl border border-gray-200 px-4 py-4">
                          <div>{t("purchases.orders.field.sourceRequest")}: {selectedPurchaseOrder.sourcePurchaseRequest?.reference || t("purchases.orders.empty.manual")}</div>
                          <div className="mt-2">{t("purchases.orders.field.description")}: {selectedPurchaseOrder.description || t("purchases.requests.empty.noDescription")}</div>
                        </div>
                        <div className="grid gap-3 md:grid-cols-3">
                          <MiniMetric label={t("purchases.orders.metric.subtotal")} value={formatCurrency(selectedPurchaseOrder.subtotalAmount)} />
                          <MiniMetric label={t("purchases.orders.metric.tax")} value={formatCurrency(selectedPurchaseOrder.taxAmount)} />
                          <MiniMetric label={t("purchases.orders.metric.total")} value={formatCurrency(selectedPurchaseOrder.totalAmount)} />
                        </div>
                      </div>
                    </Card>

                    <Card className="space-y-4">
                      <div className="text-sm font-black uppercase tracking-[0.18em] text-gray-500">{t("purchases.orders.section.lines")}</div>
                      <div className="space-y-3">
                        {selectedPurchaseOrder.lines.map((line) => (
                          <div key={line.id} className="rounded-2xl border border-gray-200 px-4 py-4">
                            <div className="flex items-center justify-between gap-3">
                              <div className="font-bold text-gray-900">{line.itemName || line.description}</div>
                              <div className="text-sm text-gray-500">{t("purchases.orders.line.qtyPrice", { quantity: line.quantity, price: formatCurrency(line.unitPrice) })}</div>
                            </div>
                            <div className="mt-2 text-sm text-gray-600">{line.description}</div>
                            <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">
                              <span>{t("purchases.orders.field.taxAmount")}: {formatCurrency(line.taxAmount)}</span>
                              <span>{t("purchases.orders.field.lineTotal")}: {formatCurrency(line.lineTotalAmount)}</span>
                              <span>{t("purchases.orders.field.deliveryDate")}: {line.requestedDeliveryDate ? formatDate(line.requestedDeliveryDate) : t("purchases.requests.empty.notSet")}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </div>
                </div>
              )}
            </Card>
          </>
        ) : workspace === "invoices" ? (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <SummaryCard label={t("purchases.invoices.summary.total")} value={String(totalInvoices)} hint={t("purchases.invoices.summary.totalHint")} />
              <SummaryCard label={t("purchases.invoices.summary.draft")} value={String(draftInvoices)} hint={t("purchases.invoices.summary.draftHint")} />
              <SummaryCard label={t("purchases.invoices.summary.linkedOrders")} value={String(linkedOrderInvoices)} hint={t("purchases.invoices.summary.linkedOrdersHint")} />
            </div>

            <Card className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <Field label={t("purchases.invoices.filters.search")}>
                  <Input value={invoiceSearch} onChange={(event) => setInvoiceSearch(event.target.value)} placeholder={t("purchases.invoices.filters.searchPlaceholder")} />
                </Field>
                <Field label={t("purchases.invoices.filters.status")}>
                  <Select value={invoiceStatusFilter} onChange={(event) => setInvoiceStatusFilter(event.target.value as typeof invoiceStatusFilter)}>
                    <option value="">{t("purchases.filters.allStatuses")}</option>
                    <option value="DRAFT">{t("purchases.status.draft")}</option>
                    <option value="POSTED">{t("purchases.invoices.status.posted")}</option>
                    <option value="PARTIALLY_PAID">{t("purchases.invoices.status.partiallyPaid")}</option>
                    <option value="FULLY_PAID">{t("purchases.invoices.status.fullyPaid")}</option>
                    <option value="CANCELLED">{t("purchases.status.cancelled")}</option>
                  </Select>
                </Field>
                <div className="flex items-end">
                  <Button variant="secondary" onClick={() => { setInvoiceSearch(""); setInvoiceStatusFilter(""); }}>
                    {t("purchases.action.clearFilters")}
                  </Button>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <TableHead>{t("purchases.invoices.table.reference")}</TableHead>
                      <TableHead>{t("purchases.invoices.table.supplier")}</TableHead>
                      <TableHead>{t("purchases.invoices.table.date")}</TableHead>
                      <TableHead>{t("purchases.invoices.table.total")}</TableHead>
                      <TableHead>{t("purchases.invoices.table.status")}</TableHead>
                      <TableHead>{t("purchases.table.actions")}</TableHead>
                    </tr>
                  </thead>
                  <tbody>
                    {purchaseInvoices.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-500">
                          {t("purchases.invoices.empty.list")}
                        </td>
                      </tr>
                    ) : (
                      purchaseInvoices.map((row) => (
                        <tr key={row.id} className={cn("border-t border-gray-100", selectedPurchaseInvoiceId === row.id && "bg-gray-50/70")}>
                          <td className="px-6 py-4 align-top">
                            <div className="font-bold text-gray-900">{row.reference}</div>
                            <div className="text-xs text-gray-500">{row.sourcePurchaseOrder?.reference || t("purchases.invoices.empty.manual")}</div>
                          </td>
                          <td className="px-6 py-4 align-top">
                            <div className="font-bold text-gray-900">{row.supplier.code} · {row.supplier.name}</div>
                            <div className="text-xs text-gray-500">{row.currencyCode}</div>
                          </td>
                          <td className="px-6 py-4 align-top">{formatDate(row.invoiceDate)}</td>
                          <td className="px-6 py-4 align-top">{formatCurrency(row.totalAmount)}</td>
                          <td className="px-6 py-4 align-top">
                            <StatusPill label={translatePurchaseInvoiceStatus(row.status, t)} tone={purchaseInvoiceStatusTone(row.status)} />
                          </td>
                          <td className="px-6 py-4 align-top">
                            <div className="flex flex-wrap gap-2">
                              <Button variant="secondary" size="sm" onClick={() => setSelectedPurchaseInvoiceId(row.id)}>
                                {t("purchases.action.view")}
                              </Button>
                              {row.canEdit ? (
                                <Button variant="secondary" size="sm" onClick={() => openEditPurchaseInvoiceEditor(row)}>
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
              <div className="text-sm font-black uppercase tracking-[0.22em] text-gray-500">{t("purchases.invoices.section.details")}</div>
              {!selectedPurchaseInvoice ? (
                <div className="rounded-2xl border border-dashed border-gray-300 px-6 py-8 text-sm text-gray-500">
                  {t("purchases.invoices.empty.selectInvoice")}
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-4">
                    <MiniMetric label={t("purchases.invoices.metric.date")} value={formatDate(selectedPurchaseInvoice.invoiceDate)} />
                    <MiniMetric label={t("purchases.invoices.metric.status")} value={translatePurchaseInvoiceStatus(selectedPurchaseInvoice.status, t)} />
                    <MiniMetric label={t("purchases.invoices.metric.lines")} value={String(selectedPurchaseInvoice.lines.length)} />
                    <MiniMetric label={t("purchases.invoices.metric.total")} value={formatCurrency(selectedPurchaseInvoice.totalAmount)} />
                  </div>

                  <div className="grid gap-6 xl:grid-cols-2">
                    <Card className="space-y-4">
                      <div className="text-sm font-black uppercase tracking-[0.18em] text-gray-500">{t("purchases.invoices.section.summary")}</div>
                      <div className="space-y-3 text-sm text-gray-700">
                        <div className="rounded-2xl border border-gray-200 px-4 py-4">
                          <div className="font-bold text-gray-900">{selectedPurchaseInvoice.supplier.code} · {selectedPurchaseInvoice.supplier.name}</div>
                          <div className="mt-1 text-xs text-gray-500">{selectedPurchaseInvoice.currencyCode}</div>
                        </div>
                        <div className="rounded-2xl border border-gray-200 px-4 py-4">
                          <div>{t("purchases.invoices.field.sourceOrder")}: {selectedPurchaseInvoice.sourcePurchaseOrder?.reference || t("purchases.invoices.empty.manual")}</div>
                          <div className="mt-2">{t("purchases.invoices.field.description")}: {selectedPurchaseInvoice.description || t("purchases.requests.empty.noDescription")}</div>
                        </div>
                        <div className="grid gap-3 md:grid-cols-3">
                          <MiniMetric label={t("purchases.invoices.metric.subtotal")} value={formatCurrency(selectedPurchaseInvoice.subtotalAmount)} />
                          <MiniMetric label={t("purchases.invoices.metric.discount")} value={formatCurrency(selectedPurchaseInvoice.discountAmount)} />
                          <MiniMetric label={t("purchases.invoices.metric.tax")} value={formatCurrency(selectedPurchaseInvoice.taxAmount)} />
                        </div>
                      </div>
                    </Card>

                    <Card className="space-y-4">
                      <div className="text-sm font-black uppercase tracking-[0.18em] text-gray-500">{t("purchases.invoices.section.lines")}</div>
                      <div className="space-y-3">
                        {selectedPurchaseInvoice.lines.map((line) => (
                          <div key={line.id} className="rounded-2xl border border-gray-200 px-4 py-4">
                            <div className="flex items-center justify-between gap-3">
                              <div className="font-bold text-gray-900">{line.itemName || line.description}</div>
                              <div className="text-sm text-gray-500">{t("purchases.invoices.line.qtyPrice", { quantity: line.quantity, price: formatCurrency(line.unitPrice) })}</div>
                            </div>
                            <div className="mt-2 text-sm text-gray-600">{line.description}</div>
                            <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">
                              <span>{t("purchases.invoices.field.account")}: {line.account.code} · {line.account.name}</span>
                              <span>{t("purchases.invoices.field.discountAmount")}: {formatCurrency(line.discountAmount)}</span>
                              <span>{t("purchases.invoices.field.taxAmount")}: {formatCurrency(line.taxAmount)}</span>
                              <span>{t("purchases.invoices.field.lineTotal")}: {formatCurrency(line.lineTotalAmount)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </div>
                </div>
              )}
            </Card>
          </>
        ) : workspace === "payments" ? (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <SummaryCard label={t("purchases.payments.summary.total")} value={String(totalPayments)} hint={t("purchases.payments.summary.totalHint")} />
              <SummaryCard label={t("purchases.payments.summary.draft")} value={String(draftPayments)} hint={t("purchases.payments.summary.draftHint")} />
              <SummaryCard label={t("purchases.payments.summary.posted")} value={String(postedPayments)} hint={t("purchases.payments.summary.postedHint")} />
            </div>

            <Card className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <Field label={t("purchases.payments.filters.search")}>
                  <Input value={paymentSearch} onChange={(event) => setPaymentSearch(event.target.value)} placeholder={t("purchases.payments.filters.searchPlaceholder")} />
                </Field>
                <Field label={t("purchases.payments.filters.status")}>
                  <Select value={paymentStatusFilter} onChange={(event) => setPaymentStatusFilter(event.target.value as typeof paymentStatusFilter)}>
                    <option value="">{t("purchases.filters.allStatuses")}</option>
                    <option value="DRAFT">{t("purchases.status.draft")}</option>
                    <option value="POSTED">{t("purchases.invoices.status.posted")}</option>
                    <option value="CANCELLED">{t("purchases.status.cancelled")}</option>
                  </Select>
                </Field>
                <div className="flex items-end">
                  <Button variant="secondary" onClick={() => { setPaymentSearch(""); setPaymentStatusFilter(""); }}>
                    {t("purchases.action.clearFilters")}
                  </Button>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <TableHead>{t("purchases.payments.table.reference")}</TableHead>
                      <TableHead>{t("purchases.payments.table.supplier")}</TableHead>
                      <TableHead>{t("purchases.payments.table.date")}</TableHead>
                      <TableHead>{t("purchases.payments.table.amount")}</TableHead>
                      <TableHead>{t("purchases.payments.table.status")}</TableHead>
                      <TableHead>{t("purchases.table.actions")}</TableHead>
                    </tr>
                  </thead>
                  <tbody>
                    {supplierPayments.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-500">
                          {t("purchases.payments.empty.list")}
                        </td>
                      </tr>
                    ) : (
                      supplierPayments.map((row) => (
                        <tr key={row.id} className={cn("border-t border-gray-100", selectedSupplierPaymentId === row.id && "bg-gray-50/70")}>
                          <td className="px-6 py-4 align-top">
                            <div className="font-bold text-gray-900">{row.reference}</div>
                            <div className="text-xs text-gray-500">{row.bankCashAccount.name}</div>
                          </td>
                          <td className="px-6 py-4 align-top">
                            <div className="font-bold text-gray-900">{row.supplier.code} · {row.supplier.name}</div>
                            <div className="text-xs text-gray-500">{row.allocations.length} {t("purchases.payments.metric.allocations").toLowerCase()}</div>
                          </td>
                          <td className="px-6 py-4 align-top">{formatDate(row.paymentDate)}</td>
                          <td className="px-6 py-4 align-top">{formatCurrency(row.amount)}</td>
                          <td className="px-6 py-4 align-top">
                            <StatusPill label={translateSupplierPaymentStatus(row.status, t)} tone={supplierPaymentStatusTone(row.status)} />
                          </td>
                          <td className="px-6 py-4 align-top">
                            <div className="flex flex-wrap gap-2">
                              <Button variant="secondary" size="sm" onClick={() => setSelectedSupplierPaymentId(row.id)}>
                                {t("purchases.action.view")}
                              </Button>
                              {row.canEdit ? (
                                <Button variant="secondary" size="sm" onClick={() => openEditSupplierPaymentEditor(row)}>
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
                <div className="text-sm font-black uppercase tracking-[0.22em] text-gray-500">{t("purchases.payments.section.details")}</div>
                {selectedSupplierPayment ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedSupplierPayment.canPost ? (
                      <Button size="sm" disabled={activePaymentActionMutationPending} onClick={() => confirmAndRun(t("purchases.payments.confirm.post"), () => postSupplierPaymentMutation.mutate(selectedSupplierPayment.id))}>
                        {t("purchases.action.postPayment")}
                      </Button>
                    ) : null}
                    {selectedSupplierPayment.canCancel ? (
                      <Button variant="danger" size="sm" disabled={activePaymentActionMutationPending} onClick={() => confirmAndRun(t("purchases.payments.confirm.cancel"), () => cancelSupplierPaymentMutation.mutate(selectedSupplierPayment.id))}>
                        {t("purchases.action.cancelPayment")}
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </div>

              {paymentActionError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                  {paymentActionError}
                </div>
              ) : null}

              {!selectedSupplierPayment ? (
                <div className="rounded-2xl border border-dashed border-gray-300 px-6 py-8 text-sm text-gray-500">
                  {t("purchases.payments.empty.selectPayment")}
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-4">
                    <MiniMetric label={t("purchases.payments.metric.date")} value={formatDate(selectedSupplierPayment.paymentDate)} />
                    <MiniMetric label={t("purchases.payments.metric.status")} value={translateSupplierPaymentStatus(selectedSupplierPayment.status, t)} />
                    <MiniMetric label={t("purchases.payments.metric.allocated")} value={formatCurrency(selectedSupplierPayment.allocatedAmount)} />
                    <MiniMetric label={t("purchases.payments.metric.unapplied")} value={formatCurrency(selectedSupplierPayment.unappliedAmount)} />
                  </div>

                  <div className="grid gap-6 xl:grid-cols-2">
                    <Card className="space-y-4">
                      <div className="text-sm font-black uppercase tracking-[0.18em] text-gray-500">{t("purchases.payments.section.summary")}</div>
                      <div className="space-y-3 text-sm text-gray-700">
                        <div className="rounded-2xl border border-gray-200 px-4 py-4">
                          <div className="font-bold text-gray-900">{selectedSupplierPayment.supplier.code} · {selectedSupplierPayment.supplier.name}</div>
                          <div className="mt-1 text-xs text-gray-500">{selectedSupplierPayment.bankCashAccount.name} · {selectedSupplierPayment.bankCashAccount.type}</div>
                        </div>
                        <div className="rounded-2xl border border-gray-200 px-4 py-4">
                          <div>{t("purchases.payments.field.description")}: {selectedSupplierPayment.description || t("purchases.requests.empty.noDescription")}</div>
                          <div className="mt-2">{t("purchases.payments.field.bankCash")}: {selectedSupplierPayment.bankCashAccount.account.code} · {selectedSupplierPayment.bankCashAccount.account.name}</div>
                        </div>
                        <div className="grid gap-3 md:grid-cols-3">
                          <MiniMetric label={t("purchases.payments.metric.amount")} value={formatCurrency(selectedSupplierPayment.amount)} />
                          <MiniMetric label={t("purchases.payments.metric.allocated")} value={formatCurrency(selectedSupplierPayment.allocatedAmount)} />
                          <MiniMetric label={t("purchases.payments.metric.unapplied")} value={formatCurrency(selectedSupplierPayment.unappliedAmount)} />
                        </div>
                      </div>
                    </Card>

                    <Card className="space-y-4">
                      <div className="text-sm font-black uppercase tracking-[0.18em] text-gray-500">{t("purchases.payments.section.allocations")}</div>
                      {selectedSupplierPayment.allocations.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-gray-300 px-4 py-6 text-sm text-gray-500">
                          {t("purchases.payments.empty.allocations")}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {selectedSupplierPayment.allocations.map((allocation) => (
                            <div key={allocation.id} className="rounded-2xl border border-gray-200 px-4 py-4">
                              <div className="flex items-center justify-between gap-3">
                                <div className="font-bold text-gray-900">{allocation.purchaseInvoice.reference}</div>
                                <div className="text-sm text-gray-500">{formatCurrency(allocation.amount)}</div>
                              </div>
                              <div className="mt-2 text-xs text-gray-500">
                                {translatePurchaseInvoiceStatus(allocation.purchaseInvoice.status, t)} · {formatDate(allocation.purchaseInvoice.invoiceDate)}
                              </div>
                              <div className="mt-2 text-xs text-gray-500">
                                {t("purchases.payments.metric.remainingOnInvoice")}: {formatCurrency(allocation.purchaseInvoice.outstandingAmount)}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </Card>
                  </div>
                </div>
              )}
            </Card>
          </>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <SummaryCard label={t("purchases.debitNotes.summary.total")} value={String(totalDebitNotes)} hint={t("purchases.debitNotes.summary.totalHint")} />
              <SummaryCard label={t("purchases.debitNotes.summary.draft")} value={String(draftDebitNotes)} hint={t("purchases.debitNotes.summary.draftHint")} />
              <SummaryCard label={t("purchases.debitNotes.summary.applied")} value={String(appliedDebitNotes)} hint={t("purchases.debitNotes.summary.appliedHint")} />
            </div>

            <Card className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <Field label={t("purchases.debitNotes.filters.search")}>
                  <Input value={debitNoteSearch} onChange={(event) => setDebitNoteSearch(event.target.value)} placeholder={t("purchases.debitNotes.filters.searchPlaceholder")} />
                </Field>
                <Field label={t("purchases.debitNotes.filters.status")}>
                  <Select value={debitNoteStatusFilter} onChange={(event) => setDebitNoteStatusFilter(event.target.value as typeof debitNoteStatusFilter)}>
                    <option value="">{t("purchases.filters.allStatuses")}</option>
                    <option value="DRAFT">{t("purchases.status.draft")}</option>
                    <option value="POSTED">{t("purchases.invoices.status.posted")}</option>
                    <option value="APPLIED">{t("purchases.debitNotes.status.applied")}</option>
                    <option value="CANCELLED">{t("purchases.status.cancelled")}</option>
                  </Select>
                </Field>
                <div className="flex items-end">
                  <Button variant="secondary" onClick={() => { setDebitNoteSearch(""); setDebitNoteStatusFilter(""); }}>
                    {t("purchases.action.clearFilters")}
                  </Button>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <TableHead>{t("purchases.debitNotes.table.reference")}</TableHead>
                      <TableHead>{t("purchases.debitNotes.table.supplier")}</TableHead>
                      <TableHead>{t("purchases.debitNotes.table.date")}</TableHead>
                      <TableHead>{t("purchases.debitNotes.table.amount")}</TableHead>
                      <TableHead>{t("purchases.debitNotes.table.status")}</TableHead>
                      <TableHead>{t("purchases.table.actions")}</TableHead>
                    </tr>
                  </thead>
                  <tbody>
                    {debitNotes.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-500">
                          {t("purchases.debitNotes.empty.list")}
                        </td>
                      </tr>
                    ) : (
                      debitNotes.map((row) => (
                        <tr key={row.id} className={cn("border-t border-gray-100", selectedDebitNoteId === row.id && "bg-gray-50/70")}>
                          <td className="px-6 py-4 align-top">
                            <div className="font-bold text-gray-900">{row.reference}</div>
                            <div className="text-xs text-gray-500">{row.purchaseInvoice?.reference || t("purchases.debitNotes.empty.standalone")}</div>
                          </td>
                          <td className="px-6 py-4 align-top">
                            <div className="font-bold text-gray-900">{row.supplier.code} Â· {row.supplier.name}</div>
                            <div className="text-xs text-gray-500">{row.lines.length} {t("purchases.debitNotes.metric.lines").toLowerCase()}</div>
                          </td>
                          <td className="px-6 py-4 align-top">{formatDate(row.noteDate)}</td>
                          <td className="px-6 py-4 align-top">{formatCurrency(row.totalAmount)}</td>
                          <td className="px-6 py-4 align-top">
                            <StatusPill label={translateDebitNoteStatus(row.status, t)} tone={debitNoteStatusTone(row.status)} />
                          </td>
                          <td className="px-6 py-4 align-top">
                            <div className="flex flex-wrap gap-2">
                              <Button variant="secondary" size="sm" onClick={() => setSelectedDebitNoteId(row.id)}>
                                {t("purchases.action.view")}
                              </Button>
                              {row.canEdit ? (
                                <Button variant="secondary" size="sm" onClick={() => openEditDebitNoteEditor(row)}>
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
                <div className="text-sm font-black uppercase tracking-[0.22em] text-gray-500">{t("purchases.debitNotes.section.details")}</div>
                {selectedDebitNote ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedDebitNote.canPost ? (
                      <Button size="sm" disabled={activeDebitNoteActionMutationPending} onClick={() => confirmAndRun(t("purchases.debitNotes.confirm.post"), () => postDebitNoteMutation.mutate(selectedDebitNote.id))}>
                        {t("purchases.action.postDebitNote")}
                      </Button>
                    ) : null}
                    {selectedDebitNote.canCancel ? (
                      <Button variant="danger" size="sm" disabled={activeDebitNoteActionMutationPending} onClick={() => confirmAndRun(t("purchases.debitNotes.confirm.cancel"), () => cancelDebitNoteMutation.mutate(selectedDebitNote.id))}>
                        {t("purchases.action.cancelDebitNote")}
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </div>

              {debitNoteActionError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                  {debitNoteActionError}
                </div>
              ) : null}

              {!selectedDebitNote ? (
                <div className="rounded-2xl border border-dashed border-gray-300 px-6 py-8 text-sm text-gray-500">
                  {t("purchases.debitNotes.empty.selectDebitNote")}
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-4">
                    <MiniMetric label={t("purchases.debitNotes.metric.date")} value={formatDate(selectedDebitNote.noteDate)} />
                    <MiniMetric label={t("purchases.debitNotes.metric.status")} value={translateDebitNoteStatus(selectedDebitNote.status, t)} />
                    <MiniMetric label={t("purchases.debitNotes.metric.lines")} value={String(selectedDebitNote.lines.length)} />
                    <MiniMetric label={t("purchases.debitNotes.metric.total")} value={formatCurrency(selectedDebitNote.totalAmount)} />
                  </div>

                  <div className="grid gap-6 xl:grid-cols-2">
                    <Card className="space-y-4">
                      <div className="text-sm font-black uppercase tracking-[0.18em] text-gray-500">{t("purchases.debitNotes.section.summary")}</div>
                      <div className="space-y-3 text-sm text-gray-700">
                        <div className="rounded-2xl border border-gray-200 px-4 py-4">
                          <div className="font-bold text-gray-900">{selectedDebitNote.supplier.code} Â· {selectedDebitNote.supplier.name}</div>
                          <div className="mt-1 text-xs text-gray-500">{selectedDebitNote.currencyCode}</div>
                        </div>
                        <div className="rounded-2xl border border-gray-200 px-4 py-4">
                          <div>{t("purchases.debitNotes.field.purchaseInvoice")}: {selectedDebitNote.purchaseInvoice?.reference || t("purchases.debitNotes.empty.standalone")}</div>
                          <div className="mt-2">{t("purchases.debitNotes.field.description")}: {selectedDebitNote.description || t("purchases.requests.empty.noDescription")}</div>
                        </div>
                        <div className="grid gap-3 md:grid-cols-3">
                          <MiniMetric label={t("purchases.debitNotes.metric.subtotal")} value={formatCurrency(selectedDebitNote.subtotalAmount)} />
                          <MiniMetric label={t("purchases.debitNotes.metric.tax")} value={formatCurrency(selectedDebitNote.taxAmount)} />
                          <MiniMetric label={t("purchases.debitNotes.metric.total")} value={formatCurrency(selectedDebitNote.totalAmount)} />
                        </div>
                      </div>
                    </Card>

                    <Card className="space-y-4">
                      <div className="text-sm font-black uppercase tracking-[0.18em] text-gray-500">{t("purchases.debitNotes.section.lines")}</div>
                      <div className="space-y-3">
                        {selectedDebitNote.lines.map((line) => (
                          <div key={line.id} className="rounded-2xl border border-gray-200 px-4 py-4">
                            <div className="flex items-center justify-between gap-3">
                              <div className="font-bold text-gray-900">{line.reason}</div>
                              <div className="text-sm text-gray-500">{formatCurrency(line.lineTotalAmount)}</div>
                            </div>
                            <div className="mt-2 text-xs text-gray-500">
                              {t("purchases.debitNotes.line.qtyAmount", { quantity: line.quantity, amount: formatCurrency(line.amount) })}
                            </div>
                            <div className="mt-2 text-xs text-gray-500">
                              {t("purchases.debitNotes.field.taxAmount")}: {formatCurrency(line.taxAmount)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </div>
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

        <SidePanel
          isOpen={isOrderEditorOpen}
          onClose={closeOrderEditor}
          title={orderEditor.id ? t("purchases.dialog.editOrder") : t("purchases.dialog.newOrder")}
        >
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label={t("purchases.orders.field.reference")} hint={t("purchases.orders.field.referenceHint")}>
                <Input value={orderEditor.reference} onChange={(event) => setOrderEditor((current) => ({ ...current, reference: event.target.value }))} />
              </Field>
              <Field label={t("purchases.orders.field.orderDate")}>
                <Input type="date" value={orderEditor.orderDate} onChange={(event) => setOrderEditor((current) => ({ ...current, orderDate: event.target.value }))} />
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label={t("purchases.orders.field.supplier")}>
                <Select
                  value={orderEditor.supplierId}
                  onChange={(event) => {
                    const supplierId = event.target.value;
                    const supplier = activeSuppliers.find((row) => row.id === supplierId);
                    setOrderEditor((current) => ({
                      ...current,
                      supplierId,
                      currencyCode: current.id ? current.currencyCode : supplier?.defaultCurrency || current.currencyCode,
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
              <Field label={t("purchases.orders.field.currency")}>
                <Input value={orderEditor.currencyCode} maxLength={8} onChange={(event) => setOrderEditor((current) => ({ ...current, currencyCode: event.target.value.toUpperCase() }))} />
              </Field>
            </div>

            <Field label={t("purchases.orders.field.sourceRequest")}>
              <Select value={orderEditor.sourcePurchaseRequestId} onChange={(event) => setOrderEditor((current) => ({ ...current, sourcePurchaseRequestId: event.target.value }))} disabled={Boolean(orderEditor.id)}>
                <option value="">{t("purchases.orders.empty.manual")}</option>
                {purchaseRequests
                  .filter((request) => request.status === "APPROVED" || request.status === "CLOSED")
                  .map((request) => (
                    <option key={request.id} value={request.id}>
                      {request.reference}
                    </option>
                  ))}
              </Select>
            </Field>

            <Field label={t("purchases.orders.field.description")}>
              <Textarea rows={3} value={orderEditor.description} onChange={(event) => setOrderEditor((current) => ({ ...current, description: event.target.value }))} />
            </Field>

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-black uppercase tracking-[0.18em] text-gray-500">{t("purchases.orders.section.editorLines")}</div>
                <Button variant="secondary" size="sm" onClick={addOrderLine}>
                  {t("purchases.action.addLine")}
                </Button>
              </div>

              {orderEditor.lines.map((line, index) => {
                const quantity = Number(line.quantity || 0);
                const unitPrice = Number(line.unitPrice || 0);
                const taxAmount = Number(line.taxAmount || 0);
                const lineTotal = quantity * unitPrice + taxAmount;

                return (
                  <div key={line.key} className="space-y-4 rounded-2xl border border-gray-200 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-bold text-gray-900">{t("purchases.orders.line.label", { index: index + 1 })}</div>
                      {orderEditor.lines.length > 1 ? (
                        <Button variant="danger" size="sm" onClick={() => removeOrderLine(line.key)}>
                          {t("purchases.action.remove")}
                        </Button>
                      ) : null}
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label={t("purchases.orders.field.itemOrService")}>
                        <Input value={line.itemName} onChange={(event) => updateOrderLine(line.key, "itemName", event.target.value)} />
                      </Field>
                      <Field label={t("purchases.orders.field.deliveryDate")}>
                        <Input type="date" value={line.requestedDeliveryDate} onChange={(event) => updateOrderLine(line.key, "requestedDeliveryDate", event.target.value)} />
                      </Field>
                    </div>
                    <Field label={t("purchases.orders.field.lineDescription")}>
                      <Textarea rows={2} value={line.description} onChange={(event) => updateOrderLine(line.key, "description", event.target.value)} />
                    </Field>
                    <div className="grid gap-4 md:grid-cols-3">
                      <Field label={t("purchases.orders.field.quantity")}>
                        <Input type="number" min="0.0001" step="0.0001" value={line.quantity} onChange={(event) => updateOrderLine(line.key, "quantity", event.target.value)} />
                      </Field>
                      <Field label={t("purchases.orders.field.unitPrice")}>
                        <Input type="number" min="0" step="0.01" value={line.unitPrice} onChange={(event) => updateOrderLine(line.key, "unitPrice", event.target.value)} />
                      </Field>
                      <Field label={t("purchases.orders.field.taxAmount")}>
                        <Input type="number" min="0" step="0.01" value={line.taxAmount} onChange={(event) => updateOrderLine(line.key, "taxAmount", event.target.value)} />
                      </Field>
                    </div>
                    <div className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">
                      {t("purchases.orders.field.lineTotal")}: {formatCurrency(lineTotal)}
                    </div>
                  </div>
                );
              })}
            </div>

            {orderFormError ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                {orderFormError}
              </div>
            ) : null}

            {orderSaveError ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                {orderSaveError}
              </div>
            ) : null}

            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={closeOrderEditor}>
                {t("purchases.action.cancel")}
              </Button>
              <Button onClick={() => (orderEditor.id ? updatePurchaseOrderMutation.mutate() : createPurchaseOrderMutation.mutate())} disabled={Boolean(orderFormError) || createPurchaseOrderMutation.isPending || updatePurchaseOrderMutation.isPending}>
                {orderEditor.id ? t("purchases.action.saveChanges") : t("purchases.action.saveDraft")}
              </Button>
            </div>
          </div>
        </SidePanel>

        <SidePanel
          isOpen={isInvoiceEditorOpen}
          onClose={closeInvoiceEditor}
          title={invoiceEditor.id ? t("purchases.dialog.editInvoice") : t("purchases.dialog.newInvoice")}
        >
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label={t("purchases.invoices.field.reference")} hint={t("purchases.invoices.field.referenceHint")}>
                <Input value={invoiceEditor.reference} onChange={(event) => setInvoiceEditor((current) => ({ ...current, reference: event.target.value }))} />
              </Field>
              <Field label={t("purchases.invoices.field.invoiceDate")}>
                <Input type="date" value={invoiceEditor.invoiceDate} onChange={(event) => setInvoiceEditor((current) => ({ ...current, invoiceDate: event.target.value }))} />
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label={t("purchases.invoices.field.supplier")}>
                <Select
                  value={invoiceEditor.supplierId}
                  onChange={(event) => {
                    const supplierId = event.target.value;
                    const supplier = activeSuppliers.find((row) => row.id === supplierId);
                    setInvoiceEditor((current) => ({
                      ...current,
                      supplierId,
                      currencyCode: current.id ? current.currencyCode : supplier?.defaultCurrency || current.currencyCode,
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
              <Field label={t("purchases.invoices.field.currency")}>
                <Input value={invoiceEditor.currencyCode} maxLength={8} onChange={(event) => setInvoiceEditor((current) => ({ ...current, currencyCode: event.target.value.toUpperCase() }))} />
              </Field>
            </div>

            <Field label={t("purchases.invoices.field.sourceOrder")}>
              <Select value={invoiceEditor.sourcePurchaseOrderId} onChange={(event) => setInvoiceEditor((current) => ({ ...current, sourcePurchaseOrderId: event.target.value }))}>
                <option value="">{t("purchases.invoices.empty.manual")}</option>
                {purchaseOrders
                  .filter((order) =>
                    ["ISSUED", "PARTIALLY_RECEIVED", "FULLY_RECEIVED", "CLOSED"].includes(order.status),
                  )
                  .map((order) => (
                    <option key={order.id} value={order.id}>
                      {order.reference}
                    </option>
                  ))}
              </Select>
            </Field>

            <Field label={t("purchases.invoices.field.description")}>
              <Textarea rows={3} value={invoiceEditor.description} onChange={(event) => setInvoiceEditor((current) => ({ ...current, description: event.target.value }))} />
            </Field>

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-black uppercase tracking-[0.18em] text-gray-500">{t("purchases.invoices.section.editorLines")}</div>
                <Button variant="secondary" size="sm" onClick={addInvoiceLine}>
                  {t("purchases.action.addLine")}
                </Button>
              </div>

              {invoiceEditor.lines.map((line, index) => {
                const quantity = Number(line.quantity || 0);
                const unitPrice = Number(line.unitPrice || 0);
                const discountAmount = Number(line.discountAmount || 0);
                const taxAmount = Number(line.taxAmount || 0);
                const lineSubtotal = quantity * unitPrice;
                const lineTotal = lineSubtotal - discountAmount + taxAmount;

                return (
                  <div key={line.key} className="space-y-4 rounded-2xl border border-gray-200 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-bold text-gray-900">{t("purchases.invoices.line.label", { index: index + 1 })}</div>
                      {invoiceEditor.lines.length > 1 ? (
                        <Button variant="danger" size="sm" onClick={() => removeInvoiceLine(line.key)}>
                          {t("purchases.action.remove")}
                        </Button>
                      ) : null}
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label={t("purchases.invoices.field.itemOrService")}>
                        <Input value={line.itemName} onChange={(event) => updateInvoiceLine(line.key, "itemName", event.target.value)} />
                      </Field>
                      <Field label={t("purchases.invoices.field.account")}>
                        <Select value={line.accountId} onChange={(event) => updateInvoiceLine(line.key, "accountId", event.target.value)}>
                          <option value="">{t("purchases.invoices.empty.selectAccount")}</option>
                          {(invoiceAccountsQuery.data ?? []).map((account) => (
                            <option key={account.id} value={account.id}>
                              {account.code} · {account.name} ({account.currencyCode})
                            </option>
                          ))}
                        </Select>
                      </Field>
                    </div>
                    <Field label={t("purchases.invoices.field.lineDescription")}>
                      <Textarea rows={2} value={line.description} onChange={(event) => updateInvoiceLine(line.key, "description", event.target.value)} />
                    </Field>
                    <div className="grid gap-4 md:grid-cols-4">
                      <Field label={t("purchases.invoices.field.quantity")}>
                        <Input type="number" min="0.0001" step="0.0001" value={line.quantity} onChange={(event) => updateInvoiceLine(line.key, "quantity", event.target.value)} />
                      </Field>
                      <Field label={t("purchases.invoices.field.unitPrice")}>
                        <Input type="number" min="0" step="0.01" value={line.unitPrice} onChange={(event) => updateInvoiceLine(line.key, "unitPrice", event.target.value)} />
                      </Field>
                      <Field label={t("purchases.invoices.field.discountAmount")}>
                        <Input type="number" min="0" step="0.01" value={line.discountAmount} onChange={(event) => updateInvoiceLine(line.key, "discountAmount", event.target.value)} />
                      </Field>
                      <Field label={t("purchases.invoices.field.taxAmount")}>
                        <Input type="number" min="0" step="0.01" value={line.taxAmount} onChange={(event) => updateInvoiceLine(line.key, "taxAmount", event.target.value)} />
                      </Field>
                    </div>
                    <div className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">
                      {t("purchases.invoices.field.lineTotal")}: {formatCurrency(lineTotal)}
                    </div>
                  </div>
                );
              })}
            </div>

            {invoiceFormError ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                {invoiceFormError}
              </div>
            ) : null}

            {invoiceSaveError ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                {invoiceSaveError}
              </div>
            ) : null}

            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={closeInvoiceEditor}>
                {t("purchases.action.cancel")}
              </Button>
              <Button onClick={() => (invoiceEditor.id ? updatePurchaseInvoiceMutation.mutate() : createPurchaseInvoiceMutation.mutate())} disabled={Boolean(invoiceFormError) || createPurchaseInvoiceMutation.isPending || updatePurchaseInvoiceMutation.isPending}>
                {invoiceEditor.id ? t("purchases.action.saveChanges") : t("purchases.action.saveDraft")}
              </Button>
            </div>
          </div>
        </SidePanel>

        <SidePanel
          isOpen={isPaymentEditorOpen}
          onClose={closePaymentEditor}
          title={paymentEditor.id ? t("purchases.dialog.editPayment") : t("purchases.dialog.newPayment")}
        >
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label={t("purchases.payments.field.reference")} hint={t("purchases.payments.field.referenceHint")}>
                <Input value={paymentEditor.reference} onChange={(event) => setPaymentEditor((current) => ({ ...current, reference: event.target.value }))} />
              </Field>
              <Field label={t("purchases.payments.field.paymentDate")}>
                <Input type="date" value={paymentEditor.paymentDate} onChange={(event) => setPaymentEditor((current) => ({ ...current, paymentDate: event.target.value }))} />
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label={t("purchases.payments.field.supplier")}>
                <Select value={paymentEditor.supplierId} onChange={(event) => setPaymentEditor((current) => ({ ...current, supplierId: event.target.value }))}>
                  <option value="">{t("purchases.requests.empty.selectSupplier")}</option>
                  {activeSuppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.code} · {supplier.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t("purchases.payments.field.amount")}>
                <Input type="number" min="0.01" step="0.01" value={paymentEditor.amount} onChange={(event) => setPaymentEditor((current) => ({ ...current, amount: event.target.value }))} />
              </Field>
            </div>

            <Field label={t("purchases.payments.field.bankCash")}>
              <Select value={paymentEditor.bankCashAccountId} onChange={(event) => setPaymentEditor((current) => ({ ...current, bankCashAccountId: event.target.value }))}>
                <option value="">{t("purchases.payments.empty.selectBankCash")}</option>
                {(bankCashAccountsQuery.data ?? []).map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name} · {row.type}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label={t("purchases.payments.field.description")}>
              <Textarea rows={3} value={paymentEditor.description} onChange={(event) => setPaymentEditor((current) => ({ ...current, description: event.target.value }))} />
            </Field>

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-black uppercase tracking-[0.18em] text-gray-500">{t("purchases.payments.section.editorAllocations")}</div>
                <Button variant="secondary" size="sm" onClick={addPaymentAllocation}>
                  {t("purchases.action.addAllocation")}
                </Button>
              </div>

              {paymentEditor.allocations.map((allocation, index) => {
                const supplierInvoices = purchaseInvoices.filter(
                  (invoice) =>
                    (!paymentEditor.supplierId || invoice.supplier.id === paymentEditor.supplierId) &&
                    invoice.status !== "CANCELLED",
                );
                const selectedInvoice = supplierInvoices.find((invoice) => invoice.id === allocation.purchaseInvoiceId);

                return (
                  <div key={allocation.key} className="space-y-4 rounded-2xl border border-gray-200 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-bold text-gray-900">{t("purchases.payments.allocation.label", { index: index + 1 })}</div>
                      {paymentEditor.allocations.length > 1 ? (
                        <Button variant="danger" size="sm" onClick={() => removePaymentAllocation(allocation.key)}>
                          {t("purchases.action.remove")}
                        </Button>
                      ) : null}
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label={t("purchases.payments.field.purchaseInvoice")}>
                        <Select value={allocation.purchaseInvoiceId} onChange={(event) => updatePaymentAllocation(allocation.key, "purchaseInvoiceId", event.target.value)}>
                          <option value="">{t("purchases.payments.empty.selectInvoice")}</option>
                          {supplierInvoices.map((invoice) => (
                            <option key={invoice.id} value={invoice.id}>
                              {invoice.reference}
                            </option>
                          ))}
                        </Select>
                      </Field>
                      <Field label={t("purchases.payments.field.allocationAmount")}>
                        <Input type="number" min="0.01" step="0.01" value={allocation.amount} onChange={(event) => updatePaymentAllocation(allocation.key, "amount", event.target.value)} />
                      </Field>
                    </div>
                    {selectedInvoice ? (
                      <div className="text-xs text-gray-500">
                        {t("purchases.payments.metric.remainingOnInvoice")}: {formatCurrency(selectedInvoice.outstandingAmount)}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>

            {paymentFormError ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                {paymentFormError}
              </div>
            ) : null}

            {paymentSaveError ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                {paymentSaveError}
              </div>
            ) : null}

            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={closePaymentEditor}>
                {t("purchases.action.cancel")}
              </Button>
              <Button onClick={() => (paymentEditor.id ? updateSupplierPaymentMutation.mutate() : createSupplierPaymentMutation.mutate())} disabled={Boolean(paymentFormError) || createSupplierPaymentMutation.isPending || updateSupplierPaymentMutation.isPending}>
                {paymentEditor.id ? t("purchases.action.saveChanges") : t("purchases.action.saveDraft")}
              </Button>
            </div>
          </div>
        </SidePanel>

        <SidePanel
          isOpen={isDebitNoteEditorOpen}
          onClose={closeDebitNoteEditor}
          title={debitNoteEditor.id ? t("purchases.dialog.editDebitNote") : t("purchases.dialog.newDebitNote")}
        >
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label={t("purchases.debitNotes.field.reference")} hint={t("purchases.debitNotes.field.referenceHint")}>
                <Input value={debitNoteEditor.reference} onChange={(event) => setDebitNoteEditor((current) => ({ ...current, reference: event.target.value }))} />
              </Field>
              <Field label={t("purchases.debitNotes.field.noteDate")}>
                <Input type="date" value={debitNoteEditor.noteDate} onChange={(event) => setDebitNoteEditor((current) => ({ ...current, noteDate: event.target.value }))} />
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label={t("purchases.debitNotes.field.supplier")}>
                <Select
                  value={debitNoteEditor.supplierId}
                  onChange={(event) => {
                    const supplierId = event.target.value;
                    const supplier = activeSuppliers.find((row) => row.id === supplierId);
                    setDebitNoteEditor((current) => ({
                      ...current,
                      supplierId,
                      purchaseInvoiceId: "",
                      currencyCode: current.id ? current.currencyCode : supplier?.defaultCurrency || current.currencyCode,
                    }));
                  }}
                >
                  <option value="">{t("purchases.requests.empty.selectSupplier")}</option>
                  {activeSuppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.code} Â· {supplier.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t("purchases.debitNotes.field.currency")}>
                <Input value={debitNoteEditor.currencyCode} maxLength={8} onChange={(event) => setDebitNoteEditor((current) => ({ ...current, currencyCode: event.target.value.toUpperCase() }))} />
              </Field>
            </div>

            <Field label={t("purchases.debitNotes.field.purchaseInvoice")}>
              <Select value={debitNoteEditor.purchaseInvoiceId} onChange={(event) => setDebitNoteEditor((current) => ({ ...current, purchaseInvoiceId: event.target.value }))}>
                <option value="">{t("purchases.debitNotes.empty.standalone")}</option>
                {purchaseInvoices
                  .filter((invoice) => !debitNoteEditor.supplierId || invoice.supplier.id === debitNoteEditor.supplierId)
                  .filter((invoice) => invoice.status !== "CANCELLED")
                  .map((invoice) => (
                    <option key={invoice.id} value={invoice.id}>
                      {invoice.reference}
                    </option>
                  ))}
              </Select>
            </Field>

            <Field label={t("purchases.debitNotes.field.description")}>
              <Textarea rows={3} value={debitNoteEditor.description} onChange={(event) => setDebitNoteEditor((current) => ({ ...current, description: event.target.value }))} />
            </Field>

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-black uppercase tracking-[0.18em] text-gray-500">{t("purchases.debitNotes.section.editorLines")}</div>
                <Button variant="secondary" size="sm" onClick={addDebitNoteLine}>
                  {t("purchases.action.addLine")}
                </Button>
              </div>

              {debitNoteEditor.lines.map((line, index) => {
                const lineTotal = Number(line.amount || 0) + Number(line.taxAmount || 0);

                return (
                  <div key={line.key} className="space-y-4 rounded-2xl border border-gray-200 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-bold text-gray-900">{t("purchases.debitNotes.line.label", { index: index + 1 })}</div>
                      {debitNoteEditor.lines.length > 1 ? (
                        <Button variant="danger" size="sm" onClick={() => removeDebitNoteLine(line.key)}>
                          {t("purchases.action.remove")}
                        </Button>
                      ) : null}
                    </div>
                    <Field label={t("purchases.debitNotes.field.reason")}>
                      <Textarea rows={2} value={line.reason} onChange={(event) => updateDebitNoteLine(line.key, "reason", event.target.value)} />
                    </Field>
                    <div className="grid gap-4 md:grid-cols-3">
                      <Field label={t("purchases.debitNotes.field.quantity")}>
                        <Input type="number" min="0.0001" step="0.0001" value={line.quantity} onChange={(event) => updateDebitNoteLine(line.key, "quantity", event.target.value)} />
                      </Field>
                      <Field label={t("purchases.debitNotes.field.amount")}>
                        <Input type="number" min="0" step="0.01" value={line.amount} onChange={(event) => updateDebitNoteLine(line.key, "amount", event.target.value)} />
                      </Field>
                      <Field label={t("purchases.debitNotes.field.taxAmount")}>
                        <Input type="number" min="0" step="0.01" value={line.taxAmount} onChange={(event) => updateDebitNoteLine(line.key, "taxAmount", event.target.value)} />
                      </Field>
                    </div>
                    <div className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">
                      {t("purchases.debitNotes.field.lineTotal")}: {formatCurrency(lineTotal)}
                    </div>
                  </div>
                );
              })}
            </div>

            {debitNoteFormError ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                {debitNoteFormError}
              </div>
            ) : null}

            {debitNoteSaveError ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                {debitNoteSaveError}
              </div>
            ) : null}

            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={closeDebitNoteEditor}>
                {t("purchases.action.cancel")}
              </Button>
              <Button onClick={() => (debitNoteEditor.id ? updateDebitNoteMutation.mutate() : createDebitNoteMutation.mutate())} disabled={Boolean(debitNoteFormError) || createDebitNoteMutation.isPending || updateDebitNoteMutation.isPending}>
                {debitNoteEditor.id ? t("purchases.action.saveChanges") : t("purchases.action.saveDraft")}
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

  function openNewPurchaseOrderEditor() {
    createPurchaseOrderMutation.reset();
    updatePurchaseOrderMutation.reset();
    const defaultSupplier = activeSuppliers[0];
    setOrderEditor({
      ...EMPTY_ORDER_EDITOR(),
      supplierId: defaultSupplier?.id ?? "",
      currencyCode: defaultSupplier?.defaultCurrency ?? "JOD",
    });
    setIsOrderEditorOpen(true);
  }

  function openEditPurchaseOrderEditor(order: PurchaseOrder) {
    createPurchaseOrderMutation.reset();
    updatePurchaseOrderMutation.reset();
    setOrderEditor({
      id: order.id,
      reference: order.reference,
      orderDate: order.orderDate.slice(0, 10),
      supplierId: order.supplier.id,
      currencyCode: order.currencyCode,
      description: order.description ?? "",
      sourcePurchaseRequestId: order.sourcePurchaseRequest?.id ?? "",
      lines: order.lines.map((line) => ({
        key: line.id,
        itemName: line.itemName ?? "",
        description: line.description,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        taxAmount: line.taxAmount,
        requestedDeliveryDate: line.requestedDeliveryDate?.slice(0, 10) ?? "",
      })),
    });
    setIsOrderEditorOpen(true);
  }

  function closeOrderEditor() {
    createPurchaseOrderMutation.reset();
    updatePurchaseOrderMutation.reset();
    setOrderEditor(EMPTY_ORDER_EDITOR());
    setIsOrderEditorOpen(false);
  }

  function addOrderLine() {
    setOrderEditor((current) => ({
      ...current,
      lines: [...current.lines, createEmptyOrderLine()],
    }));
  }

  function removeOrderLine(key: string) {
    setOrderEditor((current) => ({
      ...current,
      lines: current.lines.filter((line) => line.key !== key),
    }));
  }

  function updateOrderLine(
    key: string,
    field: keyof Omit<PurchaseOrderLineEditorState, "key">,
    value: string,
  ) {
    setOrderEditor((current) => ({
      ...current,
      lines: current.lines.map((line) => (line.key === key ? { ...line, [field]: value } : line)),
    }));
  }

  function openNewPurchaseInvoiceEditor() {
    createPurchaseInvoiceMutation.reset();
    updatePurchaseInvoiceMutation.reset();
    const defaultSupplier = activeSuppliers[0];
    setInvoiceEditor({
      ...EMPTY_INVOICE_EDITOR(),
      supplierId: defaultSupplier?.id ?? "",
      currencyCode: defaultSupplier?.defaultCurrency ?? "JOD",
    });
    setIsInvoiceEditorOpen(true);
  }

  function openEditPurchaseInvoiceEditor(invoice: PurchaseInvoice) {
    createPurchaseInvoiceMutation.reset();
    updatePurchaseInvoiceMutation.reset();
    setInvoiceEditor({
      id: invoice.id,
      reference: invoice.reference,
      invoiceDate: invoice.invoiceDate.slice(0, 10),
      supplierId: invoice.supplier.id,
      currencyCode: invoice.currencyCode,
      description: invoice.description ?? "",
      sourcePurchaseOrderId: invoice.sourcePurchaseOrder?.id ?? "",
      lines: invoice.lines.map((line) => ({
        key: line.id,
        itemName: line.itemName ?? "",
        description: line.description,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        discountAmount: line.discountAmount,
        taxAmount: line.taxAmount,
        accountId: line.account.id,
      })),
    });
    setIsInvoiceEditorOpen(true);
  }

  function closeInvoiceEditor() {
    createPurchaseInvoiceMutation.reset();
    updatePurchaseInvoiceMutation.reset();
    setInvoiceEditor(EMPTY_INVOICE_EDITOR());
    setIsInvoiceEditorOpen(false);
  }

  function addInvoiceLine() {
    setInvoiceEditor((current) => ({
      ...current,
      lines: [...current.lines, createEmptyInvoiceLine()],
    }));
  }

  function removeInvoiceLine(key: string) {
    setInvoiceEditor((current) => ({
      ...current,
      lines: current.lines.filter((line) => line.key !== key),
    }));
  }

  function updateInvoiceLine(
    key: string,
    field: keyof Omit<PurchaseInvoiceLineEditorState, "key">,
    value: string,
  ) {
    setInvoiceEditor((current) => ({
      ...current,
      lines: current.lines.map((line) => (line.key === key ? { ...line, [field]: value } : line)),
    }));
  }

  function openNewSupplierPaymentEditor() {
    createSupplierPaymentMutation.reset();
    updateSupplierPaymentMutation.reset();
    setPaymentEditor(EMPTY_PAYMENT_EDITOR());
    setIsPaymentEditorOpen(true);
  }

  function openEditSupplierPaymentEditor(payment: SupplierPayment) {
    createSupplierPaymentMutation.reset();
    updateSupplierPaymentMutation.reset();
    setPaymentEditor({
      id: payment.id,
      reference: payment.reference,
      paymentDate: payment.paymentDate.slice(0, 10),
      supplierId: payment.supplier.id,
      amount: payment.amount,
      bankCashAccountId: payment.bankCashAccount.id,
      description: payment.description ?? "",
      allocations: payment.allocations.length
        ? payment.allocations.map((allocation) => ({
            key: allocation.id,
            purchaseInvoiceId: allocation.purchaseInvoice.id,
            amount: allocation.amount,
          }))
        : [createEmptyPaymentAllocation()],
    });
    setIsPaymentEditorOpen(true);
  }

  function closePaymentEditor() {
    createSupplierPaymentMutation.reset();
    updateSupplierPaymentMutation.reset();
    setPaymentEditor(EMPTY_PAYMENT_EDITOR());
    setIsPaymentEditorOpen(false);
  }

  function addPaymentAllocation() {
    setPaymentEditor((current) => ({
      ...current,
      allocations: [...current.allocations, createEmptyPaymentAllocation()],
    }));
  }

  function removePaymentAllocation(key: string) {
    setPaymentEditor((current) => ({
      ...current,
      allocations: current.allocations.filter((allocation) => allocation.key !== key),
    }));
  }

  function updatePaymentAllocation(
    key: string,
    field: keyof Omit<SupplierPaymentAllocationEditorState, "key">,
    value: string,
  ) {
    setPaymentEditor((current) => ({
      ...current,
      allocations: current.allocations.map((allocation) =>
        allocation.key === key ? { ...allocation, [field]: value } : allocation,
      ),
    }));
  }

  function openNewDebitNoteEditor() {
    createDebitNoteMutation.reset();
    updateDebitNoteMutation.reset();
    setDebitNoteEditor(EMPTY_DEBIT_NOTE_EDITOR());
    setIsDebitNoteEditorOpen(true);
  }

  function openEditDebitNoteEditor(note: DebitNote) {
    createDebitNoteMutation.reset();
    updateDebitNoteMutation.reset();
    setDebitNoteEditor({
      id: note.id,
      reference: note.reference,
      noteDate: note.noteDate.slice(0, 10),
      supplierId: note.supplier.id,
      purchaseInvoiceId: note.purchaseInvoice?.id ?? "",
      currencyCode: note.currencyCode,
      description: note.description ?? "",
      lines: note.lines.length
        ? note.lines.map((line) => ({
            key: line.id,
            quantity: line.quantity,
            amount: line.amount,
            taxAmount: line.taxAmount,
            reason: line.reason,
          }))
        : [createEmptyDebitNoteLine()],
    });
    setIsDebitNoteEditorOpen(true);
  }

  function closeDebitNoteEditor() {
    createDebitNoteMutation.reset();
    updateDebitNoteMutation.reset();
    setDebitNoteEditor(EMPTY_DEBIT_NOTE_EDITOR());
    setIsDebitNoteEditorOpen(false);
  }

  function addDebitNoteLine() {
    setDebitNoteEditor((current) => ({
      ...current,
      lines: [...current.lines, createEmptyDebitNoteLine()],
    }));
  }

  function removeDebitNoteLine(key: string) {
    setDebitNoteEditor((current) => ({
      ...current,
      lines: current.lines.filter((line) => line.key !== key),
    }));
  }

  function updateDebitNoteLine(
    key: string,
    field: keyof Omit<DebitNoteLineEditorState, "key">,
    value: string,
  ) {
    setDebitNoteEditor((current) => ({
      ...current,
      lines: current.lines.map((line) => (line.key === key ? { ...line, [field]: value } : line)),
    }));
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
    queryClient.invalidateQueries({ queryKey: ["purchase-orders"] }),
    queryClient.invalidateQueries({ queryKey: ["purchase-order"] }),
    queryClient.invalidateQueries({ queryKey: ["purchase-invoices"] }),
    queryClient.invalidateQueries({ queryKey: ["purchase-invoice"] }),
    queryClient.invalidateQueries({ queryKey: ["supplier-payments"] }),
    queryClient.invalidateQueries({ queryKey: ["supplier-payment"] }),
    queryClient.invalidateQueries({ queryKey: ["debit-notes"] }),
    queryClient.invalidateQueries({ queryKey: ["debit-note"] }),
    queryClient.invalidateQueries({ queryKey: ["bank-cash-accounts"] }),
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

function getPurchaseOrderFormError(editor: PurchaseOrderEditorState) {
  if (!editor.supplierId) {
    return "Supplier selection is required. اختيار المورد مطلوب.";
  }
  if (!editor.orderDate) {
    return "Purchase order date is required. تاريخ أمر الشراء مطلوب.";
  }
  if (!editor.currencyCode.trim()) {
    return "Currency is required. العملة مطلوبة.";
  }
  if (editor.lines.length === 0) {
    return "At least one purchase order line is required. يجب إضافة سطر أمر شراء واحد على الأقل.";
  }
  for (const line of editor.lines) {
    if (!line.description.trim()) {
      return "Each order line needs a description. كل سطر أمر شراء يحتاج إلى وصف.";
    }
    if (!line.quantity || Number(line.quantity) <= 0) {
      return "Each order line needs a quantity greater than zero. كل سطر أمر شراء يحتاج إلى كمية أكبر من صفر.";
    }
    if (line.unitPrice === "" || Number(line.unitPrice) < 0) {
      return "Each order line needs a valid unit price. كل سطر أمر شراء يحتاج إلى سعر وحدة صحيح.";
    }
    if (line.taxAmount === "" || Number(line.taxAmount) < 0) {
      return "Each order line needs a valid tax amount. كل سطر أمر شراء يحتاج إلى قيمة ضريبة صحيحة.";
    }
  }
  return null;
}

function getPurchaseInvoiceFormError(editor: PurchaseInvoiceEditorState) {
  if (!editor.supplierId) {
    return "Supplier selection is required. اختيار المورد مطلوب.";
  }
  if (!editor.invoiceDate) {
    return "Purchase invoice date is required. تاريخ فاتورة الشراء مطلوب.";
  }
  if (!editor.currencyCode.trim()) {
    return "Currency is required. العملة مطلوبة.";
  }
  if (editor.lines.length === 0) {
    return "At least one purchase invoice line is required. يجب إضافة سطر فاتورة شراء واحد على الأقل.";
  }
  for (const line of editor.lines) {
    if (!line.description.trim()) {
      return "Each invoice line needs a description. كل سطر فاتورة شراء يحتاج إلى وصف.";
    }
    if (!line.accountId) {
      return "Each invoice line needs an account classification. كل سطر فاتورة شراء يحتاج إلى تصنيف حساب.";
    }
    if (!line.quantity || Number(line.quantity) <= 0) {
      return "Each invoice line needs a quantity greater than zero. كل سطر فاتورة شراء يحتاج إلى كمية أكبر من صفر.";
    }
    if (line.unitPrice === "" || Number(line.unitPrice) < 0) {
      return "Each invoice line needs a valid unit price. كل سطر فاتورة شراء يحتاج إلى سعر وحدة صحيح.";
    }
    if (line.discountAmount === "" || Number(line.discountAmount) < 0) {
      return "Each invoice line needs a valid discount amount. كل سطر فاتورة شراء يحتاج إلى قيمة خصم صحيحة.";
    }
    if (line.taxAmount === "" || Number(line.taxAmount) < 0) {
      return "Each invoice line needs a valid tax amount. كل سطر فاتورة شراء يحتاج إلى قيمة ضريبة صحيحة.";
    }
    if (Number(line.discountAmount) > Number(line.quantity) * Number(line.unitPrice)) {
      return "Discount cannot exceed the line subtotal. لا يمكن أن يتجاوز الخصم إجمالي السطر قبل الضريبة.";
    }
  }
  return null;
}

function getSupplierPaymentFormError(editor: SupplierPaymentEditorState) {
  if (!editor.supplierId) {
    return "Supplier selection is required. اختيار المورد مطلوب.";
  }
  if (!editor.paymentDate) {
    return "Payment date is required. تاريخ الدفعة مطلوب.";
  }
  if (!editor.amount || Number(editor.amount) <= 0) {
    return "Payment amount must be greater than zero. مبلغ الدفعة يجب أن يكون أكبر من صفر.";
  }
  if (!editor.bankCashAccountId) {
    return "Bank or cash account is required. حساب البنك أو الصندوق مطلوب.";
  }
  const seen = new Set<string>();
  let allocated = 0;
  for (const allocation of editor.allocations) {
    if (!allocation.purchaseInvoiceId && !allocation.amount) {
      continue;
    }
    if (!allocation.purchaseInvoiceId) {
      return "Each allocation needs a purchase invoice. كل تخصيص يحتاج إلى فاتورة شراء.";
    }
    if (seen.has(allocation.purchaseInvoiceId)) {
      return "The same purchase invoice cannot be allocated twice in one payment. لا يمكن تخصيص نفس فاتورة الشراء مرتين في نفس الدفعة.";
    }
    seen.add(allocation.purchaseInvoiceId);
    if (!allocation.amount || Number(allocation.amount) <= 0) {
      return "Each allocation amount must be greater than zero. مبلغ كل تخصيص يجب أن يكون أكبر من صفر.";
    }
    allocated += Number(allocation.amount);
  }
  if (allocated - Number(editor.amount) > 0.0001) {
    return "Allocated amount cannot exceed payment amount. لا يمكن أن يتجاوز المبلغ المخصص مبلغ الدفعة.";
  }
  return null;
}

function getDebitNoteFormError(editor: DebitNoteEditorState) {
  if (!editor.supplierId) {
    return "Supplier selection is required.";
  }
  if (!editor.noteDate) {
    return "Debit note date is required.";
  }
  if (!editor.currencyCode.trim()) {
    return "Currency is required.";
  }
  if (editor.lines.length === 0) {
    return "At least one debit note line is required.";
  }
  for (const line of editor.lines) {
    if (!line.reason.trim()) {
      return "Each debit note line needs a reason.";
    }
    if (!line.quantity || Number(line.quantity) <= 0) {
      return "Each debit note line needs a quantity greater than zero.";
    }
    if (line.amount === "" || Number(line.amount) < 0) {
      return "Each debit note line needs a valid amount.";
    }
    if (line.taxAmount === "" || Number(line.taxAmount) < 0) {
      return "Each debit note line needs a valid tax amount.";
    }
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

function createEmptyOrderLine(): PurchaseOrderLineEditorState {
  return {
    key: randomKey(),
    itemName: "",
    description: "",
    quantity: "1",
    unitPrice: "0.00",
    taxAmount: "0.00",
    requestedDeliveryDate: "",
  };
}

function createEmptyInvoiceLine(): PurchaseInvoiceLineEditorState {
  return {
    key: randomKey(),
    itemName: "",
    description: "",
    quantity: "1",
    unitPrice: "0.00",
    discountAmount: "0.00",
    taxAmount: "0.00",
    accountId: "",
  };
}

function createEmptyPaymentAllocation(): SupplierPaymentAllocationEditorState {
  return {
    key: randomKey(),
    purchaseInvoiceId: "",
    amount: "",
  };
}

function createEmptyDebitNoteLine(): DebitNoteLineEditorState {
  return {
    key: randomKey(),
    quantity: "1",
    amount: "0.00",
    taxAmount: "0.00",
    reason: "",
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

function mapOrderEditorLines(lines: PurchaseOrderLineEditorState[]) {
  return lines.map((line) => ({
    itemName: line.itemName || undefined,
    description: line.description,
    quantity: Number(line.quantity),
    unitPrice: Number(line.unitPrice),
    taxAmount: Number(line.taxAmount),
    requestedDeliveryDate: line.requestedDeliveryDate || undefined,
  }));
}

function mapInvoiceEditorLines(lines: PurchaseInvoiceLineEditorState[]) {
  return lines.map((line) => ({
    itemName: line.itemName || undefined,
    description: line.description,
    quantity: Number(line.quantity),
    unitPrice: Number(line.unitPrice),
    discountAmount: Number(line.discountAmount),
    taxAmount: Number(line.taxAmount),
    accountId: line.accountId,
  }));
}

function mapPaymentEditorAllocations(lines: SupplierPaymentAllocationEditorState[]) {
  return lines
    .filter((line) => line.purchaseInvoiceId && line.amount)
    .map((line) => ({
      purchaseInvoiceId: line.purchaseInvoiceId,
      amount: Number(line.amount),
    }));
}

function mapDebitNoteEditorLines(lines: DebitNoteLineEditorState[]) {
  return lines.map((line) => ({
    quantity: Number(line.quantity),
    amount: Number(line.amount),
    taxAmount: Number(line.taxAmount),
    reason: line.reason,
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

function translatePurchaseInvoiceStatus(status: string, t: (key: string, vars?: Record<string, string | number>) => string) {
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
    default:
      return status;
  }
}

function translateSupplierPaymentStatus(status: string, t: (key: string, vars?: Record<string, string | number>) => string) {
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

function translateDebitNoteStatus(status: string, t: (key: string, vars?: Record<string, string | number>) => string) {
  switch (status) {
    case "DRAFT":
      return t("purchases.status.draft");
    case "POSTED":
      return t("purchases.invoices.status.posted");
    case "APPLIED":
      return t("purchases.debitNotes.status.applied");
    case "CANCELLED":
      return t("purchases.status.cancelled");
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

function purchaseOrderStatusTone(status: PurchaseOrder["status"]) {
  if (status === "FULLY_RECEIVED") return "positive" as const;
  if (status === "ISSUED" || status === "PARTIALLY_RECEIVED") return "warning" as const;
  if (status === "CANCELLED") return "warning" as const;
  return "neutral" as const;
}

function purchaseInvoiceStatusTone(status: PurchaseInvoice["status"]) {
  if (status === "FULLY_PAID") return "positive" as const;
  if (status === "PARTIALLY_PAID") return "warning" as const;
  if (status === "CANCELLED") return "warning" as const;
  return "neutral" as const;
}

function supplierPaymentStatusTone(status: SupplierPayment["status"]) {
  if (status === "POSTED") return "positive" as const;
  if (status === "CANCELLED") return "warning" as const;
  return "neutral" as const;
}

function debitNoteStatusTone(status: DebitNote["status"]) {
  if (status === "POSTED" || status === "APPLIED") return "positive" as const;
  if (status === "CANCELLED") return "warning" as const;
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
