"use client";

import type { ComponentType, ReactNode } from "react";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  LuCalendarDays as CalendarDays,
  LuCirclePlus as CirclePlus,
  LuFileMinus as FileMinus,
  LuFilePlus2 as FilePlus,
  LuFileText as FileText,
  LuPackage2 as Package2,
  LuReceiptText as ReceiptText,
  LuSave as Save,
  LuScrollText as ScrollText,
  LuTrash2 as Trash2,
  LuUsers as Users,
  LuUserRound as UserRound,
  LuX as X,
} from "react-icons/lu";

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
  createPurchaseReceipt,
  createPurchaseRequest,
  createSupplierPayment,
  createSupplier,
  deactivateSupplier,
  getBankCashAccounts,
  getAccountOptions,
  getDebitNoteById,
  getDebitNotes,
  getInventoryItems,
  getPurchaseInvoiceById,
  getPurchaseInvoices,
  getPurchaseOrderById,
  getPurchaseOrders,
  getPurchaseRequestById,
  getPurchaseRequests,
  issuePurchaseOrder,
  markPurchaseOrderFullyReceived,
  markPurchaseOrderPartiallyReceived,
  postPurchaseInvoice,
  postPurchaseReceipt,
  reverseDebitNote,
  reversePurchaseInvoice,
  reverseSupplierPayment,
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
import type { AccountOption, DebitNote, InventoryItem, PurchaseInvoice, PurchaseOrder, PurchaseReceipt, PurchaseRequest, Supplier, SupplierPayment } from "@/types/api";
import { Button, Card, PageShell, SectionHeading, SidePanel, StatusPill } from "@/components/ui";
import { Field, Input, Select, Textarea } from "@/components/ui/forms";

type Workspace = "suppliers" | "requests" | "orders" | "invoices" | "payments" | "notes";

type WorkspaceTab = {
  id: Workspace;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

function isPurchaseInvoiceDebitAccount(account: AccountOption) {
  if (!account.isPosting) return false;
  if (account.type === "EXPENSE") return true;
  if (account.type !== "ASSET") return false;
  return account.subtype === "Inventory" || account.subtype === "FixedAsset";
}

type SupplierEditorState = {
  id?: string;
  code: string;
  name: string;
  contactInfo: string;
  phone: string;
  email: string;
  address: string;
  paymentTerms: string;
  taxInfo: string;
  defaultCurrency: string;
  payableAccountId: string;
};

type PurchaseRequestLineEditorState = {
  key: string;
  itemId: string;
  itemName: string;
  description: string;
  quantity: string;
  requestedDeliveryDate: string;
  justification: string;
};

type PurchaseRequestEditorState = {
  id?: string;
  requestDate: string;
  description: string;
  lines: PurchaseRequestLineEditorState[];
};

type PurchaseRequestConversionState = {
  supplierId: string;
  orderDate: string;
  currencyCode: string;
  description: string;
};

type PurchaseOrderLineEditorState = {
  key: string;
  itemId: string;
  itemName: string;
  description: string;
  quantity: string;
  unitPrice: string;
  taxAmount: string;
  requestedDeliveryDate: string;
};

type PurchaseOrderEditorState = {
  id?: string;
  orderDate: string;
  supplierId: string;
  currencyCode: string;
  description: string;
  lines: PurchaseOrderLineEditorState[];
};

type PurchaseReceiptLineEditorState = {
  key: string;
  purchaseOrderLineId: string;
  lineNumber: number;
  itemName: string;
  description: string;
  orderedQuantity: string;
  receivedQuantity: string;
  remainingQuantity: string;
  quantityReceivedNow: string;
};

type PurchaseReceiptEditorState = {
  id?: string;
  reference: string;
  receiptDate: string;
  purchaseOrderId: string;
  description: string;
  lines: PurchaseReceiptLineEditorState[];
};

type PurchaseInvoiceLineEditorState = {
  key: string;
  itemId: string;
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
  phone: "",
  email: "",
  address: "",
  paymentTerms: "",
  taxInfo: "",
  defaultCurrency: "JOD",
  payableAccountId: "",
};

const EMPTY_REQUEST_EDITOR = (): PurchaseRequestEditorState => ({
  requestDate: todayValue(),
  description: "",
  lines: [createEmptyRequestLine()],
});

const EMPTY_CONVERSION_EDITOR = (): PurchaseRequestConversionState => ({
  supplierId: "",
  orderDate: todayValue(),
  currencyCode: "JOD",
  description: "",
});

const EMPTY_ORDER_EDITOR = (): PurchaseOrderEditorState => ({
  orderDate: todayValue(),
  supplierId: "",
  currencyCode: "JOD",
  description: "",
  lines: [createEmptyOrderLine()],
});

const EMPTY_RECEIPT_EDITOR = (): PurchaseReceiptEditorState => ({
  reference: "",
  receiptDate: todayValue(),
  purchaseOrderId: "",
  description: "",
  lines: [],
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
  const { t, language } = useTranslation();
  const isArabic = language === "ar";
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
  const [isReceiptEditorOpen, setIsReceiptEditorOpen] = useState(false);
  const [receiptEditor, setReceiptEditor] = useState<PurchaseReceiptEditorState>(EMPTY_RECEIPT_EDITOR);
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<
    "" | "DRAFT" | "POSTED" | "PARTIALLY_PAID" | "FULLY_PAID" | "CANCELLED" | "REVERSED"
  >("");
  const [selectedPurchaseInvoiceId, setSelectedPurchaseInvoiceId] = useState<string | null>(null);
  const [isInvoiceEditorOpen, setIsInvoiceEditorOpen] = useState(false);
  const [invoiceEditor, setInvoiceEditor] = useState<PurchaseInvoiceEditorState>(EMPTY_INVOICE_EDITOR);
  const [paymentSearch, setPaymentSearch] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<"" | "DRAFT" | "POSTED" | "CANCELLED" | "REVERSED">("");
  const [selectedSupplierPaymentId, setSelectedSupplierPaymentId] = useState<string | null>(null);
  const [isPaymentEditorOpen, setIsPaymentEditorOpen] = useState(false);
  const [paymentEditor, setPaymentEditor] = useState<SupplierPaymentEditorState>(EMPTY_PAYMENT_EDITOR);
  const [debitNoteSearch, setDebitNoteSearch] = useState("");
  const [debitNoteStatusFilter, setDebitNoteStatusFilter] = useState<"" | "DRAFT" | "POSTED" | "APPLIED" | "CANCELLED" | "REVERSED">("");
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
    queryKey: queryKeys.accounts(token, { isPosting: "true", isActive: "true", usage: "purchase-invoice-line", view: "selector" }),
    queryFn: () => getAccountOptions({ isPosting: "true", isActive: "true", usage: "purchase-invoice-line" }, token),
    staleTime: 5 * 60 * 1000,
  });

  const inventoryItemsQuery = useQuery({
    queryKey: queryKeys.inventoryItems(token, { isActive: "true" }),
    queryFn: () => getInventoryItems({ isActive: "true" }, token),
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
          phone: supplierEditor.phone || undefined,
          email: supplierEditor.email || undefined,
          address: supplierEditor.address || undefined,
          paymentTerms: supplierEditor.paymentTerms,
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
          phone: supplierEditor.phone || "",
          email: supplierEditor.email || "",
          address: supplierEditor.address || "",
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
          orderDate: orderEditor.orderDate,
          supplierId: orderEditor.supplierId,
          currencyCode: orderEditor.currencyCode || undefined,
          description: orderEditor.description || undefined,
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

  const receivePurchaseOrderMutation = useMutation({
    mutationFn: async () => {
      const created = await createPurchaseReceipt(
        {
          reference: receiptEditor.reference || undefined,
          receiptDate: receiptEditor.receiptDate,
          purchaseOrderId: receiptEditor.purchaseOrderId,
          description: receiptEditor.description || undefined,
          lines: receiptEditor.lines
            .filter((line) => Number(line.quantityReceivedNow || 0) > 0)
            .map((line) => ({
              purchaseOrderLineId: line.purchaseOrderLineId,
              quantityReceived: Number(line.quantityReceivedNow || 0),
            })),
        },
        token,
      );

      return postPurchaseReceipt(created.id, token);
    },
    onSuccess: async (receipt) => {
      await invalidatePurchases(queryClient);
      setSelectedPurchaseOrderId(receipt.purchaseOrder.id);
      closeReceiptEditor();
    },
  });

  const createPurchaseInvoiceMutation = useMutation({
    mutationFn: () =>
      createPurchaseInvoice(
        {
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

  const postPurchaseInvoiceMutation = useMutation({
    mutationFn: (id: string) => postPurchaseInvoice(id, token),
    onSuccess: async (updated) => {
      await invalidatePurchases(queryClient);
      setSelectedPurchaseInvoiceId(updated.id);
    },
  });

  const reversePurchaseInvoiceMutation = useMutation({
    mutationFn: (id: string) => reversePurchaseInvoice(id, token),
    onSuccess: async (updated) => {
      await invalidatePurchases(queryClient);
      setSelectedPurchaseInvoiceId(updated.id);
    },
  });

  const createSupplierPaymentMutation = useMutation({
    mutationFn: () =>
      createSupplierPayment(
        {
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

  const reverseSupplierPaymentMutation = useMutation({
    mutationFn: (id: string) => reverseSupplierPayment(id, token),
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

  const reverseDebitNoteMutation = useMutation({
    mutationFn: (id: string) => reverseDebitNote(id, token),
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
  const inventoryItems = inventoryItemsQuery.data?.data ?? [];
  const purchaseInvoiceDebitAccounts = (invoiceAccountsQuery.data ?? []).filter(isPurchaseInvoiceDebitAccount);
  const paymentEligibleInvoices = purchaseInvoices.filter(
    (invoice) =>
      (!paymentEditor.supplierId || invoice.supplier.id === paymentEditor.supplierId) &&
      invoice.status !== "DRAFT" &&
      invoice.status !== "CANCELLED",
  );
  const paymentAllocatedAmount = paymentEditor.allocations.reduce((sum, allocation) => sum + Number(allocation.amount || 0), 0);
  const paymentUnallocatedAmount = Math.max(Number(paymentEditor.amount || 0) - paymentAllocatedAmount, 0);
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
  const receiptSaveError = getMutationErrorMessage(receivePurchaseOrderMutation.error);
  const receiptFormError = getPurchaseReceiptFormError(receiptEditor);
  const orderActionError = getMutationErrorMessage(
    issuePurchaseOrderMutation.error ??
      receivePurchaseOrderMutation.error ??
      markPartiallyReceivedMutation.error ??
      markFullyReceivedMutation.error ??
      cancelPurchaseOrderMutation.error ??
      closePurchaseOrderMutation.error,
  );
  const invoiceSaveError = getMutationErrorMessage(createPurchaseInvoiceMutation.error ?? updatePurchaseInvoiceMutation.error);
  const invoiceFormError = getPurchaseInvoiceFormError(invoiceEditor);
  const invoiceActionError = getMutationErrorMessage(postPurchaseInvoiceMutation.error ?? reversePurchaseInvoiceMutation.error);
  const paymentSaveError = getMutationErrorMessage(createSupplierPaymentMutation.error ?? updateSupplierPaymentMutation.error);
  const paymentFormError = getSupplierPaymentFormError(paymentEditor);
  const paymentActionError = getMutationErrorMessage(
    postSupplierPaymentMutation.error ?? cancelSupplierPaymentMutation.error ?? reverseSupplierPaymentMutation.error,
  );
  const debitNoteSaveError = getMutationErrorMessage(createDebitNoteMutation.error ?? updateDebitNoteMutation.error);
  const debitNoteFormError = getDebitNoteFormError(debitNoteEditor);
  const debitNoteActionError = getMutationErrorMessage(
    postDebitNoteMutation.error ?? cancelDebitNoteMutation.error ?? reverseDebitNoteMutation.error,
  );

  const activeActionMutationPending =
    submitPurchaseRequestMutation.isPending ||
    approvePurchaseRequestMutation.isPending ||
    rejectPurchaseRequestMutation.isPending ||
    closePurchaseRequestMutation.isPending;
  const activeOrderActionMutationPending =
    issuePurchaseOrderMutation.isPending ||
    receivePurchaseOrderMutation.isPending ||
    markPartiallyReceivedMutation.isPending ||
    markFullyReceivedMutation.isPending ||
    cancelPurchaseOrderMutation.isPending ||
    closePurchaseOrderMutation.isPending;
  const activeInvoiceActionMutationPending = postPurchaseInvoiceMutation.isPending || reversePurchaseInvoiceMutation.isPending;
  const activePaymentActionMutationPending =
    postSupplierPaymentMutation.isPending ||
    cancelSupplierPaymentMutation.isPending ||
    reverseSupplierPaymentMutation.isPending;
  const activeDebitNoteActionMutationPending =
    postDebitNoteMutation.isPending || cancelDebitNoteMutation.isPending || reverseDebitNoteMutation.isPending;
  const invoiceTotals = useMemo(() => calculateInvoiceEditorTotals(invoiceEditor.lines), [invoiceEditor.lines]);
  const workspaceTabs: WorkspaceTab[] = [
    { id: "suppliers", label: t("purchases.workspace.suppliers"), icon: Users },
    { id: "requests", label: t("purchases.workspace.requests"), icon: FilePlus },
    { id: "orders", label: t("purchases.workspace.orders"), icon: ScrollText },
    { id: "invoices", label: t("purchases.workspace.invoices"), icon: FileText },
    { id: "payments", label: t("purchases.workspace.payments"), icon: ReceiptText },
    { id: "notes", label: t("purchases.workspace.debitNotes"), icon: FileMinus },
  ];

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

        <div className="flex flex-wrap gap-3">
          {workspaceTabs.map((tab) => {
            const Icon = tab.icon;
            const active = tab.id === workspace;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setWorkspace(tab.id)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-bold transition-colors",
                  active ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50",
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

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

              <div className="overflow-x-auto rounded-2xl border border-gray-200">
                <table className="min-w-[1180px] w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <TableHead className="w-[190px]">{t("purchases.table.supplierCode")}</TableHead>
                      <TableHead>{t("purchases.table.supplier")}</TableHead>
                      <TableHead>{t("purchases.table.contact")}</TableHead>
                      <TableHead className="text-center">{t("purchases.table.currency")}</TableHead>
                      <TableHead>{t("purchases.table.payableAccount")}</TableHead>
                      <TableHead className="text-end">{t("purchases.table.outstanding")}</TableHead>
                      <TableHead className="text-center">{t("purchases.table.status")}</TableHead>
                      <TableHead className="text-center">{t("purchases.table.actions")}</TableHead>
                    </tr>
                  </thead>
                  <tbody>
                    {suppliers.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-12 text-center text-sm text-gray-500">
                          {t("purchases.empty.suppliers")}
                        </td>
                      </tr>
                    ) : (
                      suppliers.map((row) => (
                        <tr key={row.id} className={cn("border-t border-gray-100 transition-colors hover:bg-gray-50/60", selectedSupplierId === row.id && "bg-gray-50/70")}>
                          <td dir="ltr" className="px-6 py-4 text-start align-top font-mono text-xs font-bold text-slate-700">
                            <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1">
                              {row.code}
                            </span>
                          </td>
                          <td className="px-6 py-4 align-top text-start">
                            <div className="font-bold text-gray-900">{row.name}</div>
                            <div className="text-xs text-gray-500">{row.paymentTerms || t("purchases.empty.paymentTerms")}</div>
                          </td>
                          <td className="px-6 py-4 align-top text-start">
                            <div className="text-gray-700">{row.phone || row.contactInfo || t("purchases.empty.phone")}</div>
                            <div className="text-xs text-gray-500">{row.email || t("purchases.empty.email")}</div>
                            <div className="text-xs text-gray-500">{row.address || t("purchases.empty.address")}</div>
                          </td>
                          <td className="px-6 py-4 text-center align-top font-semibold text-gray-800">{row.defaultCurrency}</td>
                          <td className="px-6 py-4 align-top text-start">
                            <div className="font-medium text-gray-900">{row.payableAccount.name}</div>
                            <div className="mt-1">
                              <span dir="ltr" className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 font-mono text-xs font-semibold text-slate-600">
                                {row.payableAccount.code}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-end align-top font-semibold tabular-nums text-gray-900">{formatCurrency(row.currentBalance)}</td>
                          <td className="px-6 py-4 text-center align-top">
                            <StatusPill label={row.isActive ? t("purchases.status.active") : t("purchases.status.inactive")} tone={row.isActive ? "positive" : "warning"} />
                          </td>
                          <td className="px-6 py-4 align-top">
                            <div className="flex flex-wrap justify-center gap-2">
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
                    {selectedPurchaseOrder.canReceive ? (
                      <Button variant="secondary" size="sm" disabled={activeOrderActionMutationPending} onClick={() => openReceivePurchaseOrderEditor(selectedPurchaseOrder)}>
                        {t("purchases.action.receiveOrder")}
                      </Button>
                    ) : null}
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

                  <Card className="space-y-4">
                    <div className="text-sm font-black uppercase tracking-[0.18em] text-gray-500">{t("purchases.orders.section.receipts")}</div>
                    {selectedPurchaseOrder.receipts.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-gray-300 px-4 py-6 text-sm text-gray-500">
                        {t("purchases.orders.empty.receipts")}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {selectedPurchaseOrder.receipts.map((receipt) => (
                          <div key={receipt.id} className="rounded-2xl border border-gray-200 px-4 py-4">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <div className="font-bold text-gray-900">{receipt.reference}</div>
                                <div className="mt-1 text-xs text-gray-500">{formatDate(receipt.receiptDate)}</div>
                              </div>
                              <StatusPill label={translatePurchaseReceiptStatus(receipt.status, t)} tone={purchaseReceiptStatusTone(receipt.status)} />
                            </div>
                            <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">
                              <span>{t("purchases.orders.metric.receivedQuantity")}: {receipt.totalQuantity}</span>
                              <span>{t("purchases.orders.field.postedAt")}: {receipt.postedAt ? formatDate(receipt.postedAt) : t("purchases.orders.empty.notPosted")}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
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
                    <option value="REVERSED">{t("purchases.status.reversed")}</option>
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
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm font-black uppercase tracking-[0.22em] text-gray-500">{t("purchases.invoices.section.details")}</div>
                {selectedPurchaseInvoice?.canPost ? (
                  <Button size="sm" disabled={activeInvoiceActionMutationPending} onClick={() => confirmAndRun(t("purchases.invoices.confirm.post"), () => postPurchaseInvoiceMutation.mutate(selectedPurchaseInvoice.id))}>
                    {t("purchases.action.postInvoice")}
                  </Button>
                ) : null}
                {selectedPurchaseInvoice?.canReverse ? (
                  <Button variant="danger" size="sm" disabled={activeInvoiceActionMutationPending} onClick={() => confirmAndRun(t("purchases.invoices.confirm.reverse"), () => reversePurchaseInvoiceMutation.mutate(selectedPurchaseInvoice.id))}>
                    {t("purchases.action.reverseInvoice")}
                  </Button>
                ) : null}
              </div>
              {invoiceActionError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                  {invoiceActionError}
                </div>
              ) : null}
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
                          <div className="mt-1 text-xs text-gray-500">
                            {selectedPurchaseInvoice.currencyCode}
                            {selectedPurchaseInvoice.journalReference ? ` · ${selectedPurchaseInvoice.journalReference}` : ""}
                          </div>
                        </div>
                        <div className="rounded-2xl border border-gray-200 px-4 py-4">
                          <div>{t("purchases.invoices.field.sourceOrder")}: {selectedPurchaseInvoice.sourcePurchaseOrder?.reference || t("purchases.invoices.empty.manual")}</div>
                          <div className="mt-2">{t("purchases.invoices.field.description")}: {selectedPurchaseInvoice.description || t("purchases.requests.empty.noDescription")}</div>
                          <div className="mt-2">{t("purchases.invoices.field.postedAt")}: {selectedPurchaseInvoice.postedAt ? formatDate(selectedPurchaseInvoice.postedAt) : t("purchases.invoices.empty.notPosted")}</div>
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
                    <option value="REVERSED">{t("purchases.status.reversed")}</option>
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
                    {selectedSupplierPayment.canReverse ? (
                      <Button variant="danger" size="sm" disabled={activePaymentActionMutationPending} onClick={() => confirmAndRun(t("purchases.payments.confirm.reverse"), () => reverseSupplierPaymentMutation.mutate(selectedSupplierPayment.id))}>
                        {t("purchases.action.reversePayment")}
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
                    <option value="REVERSED">{t("purchases.status.reversed")}</option>
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
                    {selectedDebitNote.canReverse ? (
                      <Button variant="danger" size="sm" disabled={activeDebitNoteActionMutationPending} onClick={() => confirmAndRun(t("purchases.debitNotes.confirm.reverse"), () => reverseDebitNoteMutation.mutate(selectedDebitNote.id))}>
                        {t("purchases.action.reverseDebitNote")}
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
              <Field label={t("purchases.field.name")} required>
                <Input value={supplierEditor.name} placeholder={t("purchases.placeholder.name")} onChange={(event) => setSupplierEditor((current) => ({ ...current, name: event.target.value }))} />
              </Field>
              <Field label={t("purchases.field.defaultCurrency")} required>
                <Select value={supplierEditor.defaultCurrency} onChange={(event) => setSupplierEditor((current) => ({ ...current, defaultCurrency: event.target.value.toUpperCase() }))}>
                  <option value="JOD">{t("purchases.currency.jod")}</option>
                </Select>
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label={t("purchases.field.paymentTerms")} required>
                <Select value={supplierEditor.paymentTerms} onChange={(event) => setSupplierEditor((current) => ({ ...current, paymentTerms: event.target.value }))}>
                  <option value="">{t("purchases.placeholder.paymentTerms")}</option>
                  <option value={t("purchases.paymentTerms.cash")}>{t("purchases.paymentTerms.cash")}</option>
                  <option value={t("purchases.paymentTerms.net7")}>{t("purchases.paymentTerms.net7")}</option>
                  <option value={t("purchases.paymentTerms.net15")}>{t("purchases.paymentTerms.net15")}</option>
                  <option value={t("purchases.paymentTerms.net30")}>{t("purchases.paymentTerms.net30")}</option>
                  <option value={t("purchases.paymentTerms.net60")}>{t("purchases.paymentTerms.net60")}</option>
                </Select>
              </Field>
              <Field label={t("purchases.field.payableAccount")} required hint={t("purchases.field.payableAccountHint")}>
                <Select value={supplierEditor.payableAccountId} onChange={(event) => setSupplierEditor((current) => ({ ...current, payableAccountId: event.target.value }))}>
                  <option value="">{t("purchases.empty.selectPayableAccount")}</option>
                  {(payableAccountsQuery.data ?? []).map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.code} · {row.name} ({row.currencyCode})
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label={t("purchases.field.phone")}>
                <Input dir="ltr" value={supplierEditor.phone} placeholder="07XXXXXXXX" onChange={(event) => setSupplierEditor((current) => ({ ...current, phone: event.target.value }))} />
              </Field>
              <Field label={t("purchases.field.email")}>
                <Input dir="ltr" type="email" value={supplierEditor.email} placeholder={t("purchases.placeholder.email")} onChange={(event) => setSupplierEditor((current) => ({ ...current, email: event.target.value }))} />
              </Field>
            </div>

            <Field label={t("purchases.field.address")}>
              <Input value={supplierEditor.address} placeholder={t("purchases.placeholder.address")} onChange={(event) => setSupplierEditor((current) => ({ ...current, address: event.target.value }))} />
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

        {isRequestEditorOpen ? (
          <div className="fixed inset-0 z-50 p-3 sm:p-6">
            <div className="absolute inset-0 bg-slate-950/35 backdrop-blur-sm" onClick={closeRequestEditor} />
            <div
              dir={isArabic ? "rtl" : "ltr"}
              className={cn(
                "relative mx-auto flex h-full max-w-[1480px] flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-[#fcfcfb] shadow-[0_30px_80px_rgba(15,23,42,0.18)]",
                isArabic && "arabic-ui",
              )}
            >
              <div className="flex items-center justify-between border-b border-slate-200 bg-white/90 px-5 py-5 backdrop-blur sm:px-8">
                <button
                  type="button"
                  onClick={closeRequestEditor}
                  className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
                >
                  <span className="sr-only">{t("purchases.action.cancel")}</span>
                  <X className="h-6 w-6" />
                </button>
                <div className={cn("flex items-center gap-3", isArabic ? "flex-row-reverse text-right" : "text-left")}>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                    <ScrollText className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <div className={cn("text-3xl text-slate-900", isArabic ? "arabic-ui-heading" : "font-black tracking-tight")}>
                      {requestEditor.id ? t("purchases.dialog.editRequest") : t("purchases.dialog.newRequest")}
                    </div>
                    <div className="text-sm text-slate-500">{t("purchases.requests.section.description")}</div>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.06),_transparent_30%),linear-gradient(180deg,_#fcfcfb_0%,_#f7f8f7_100%)] px-4 py-4 sm:px-8 sm:py-6">
                <div className="space-y-5">
                  <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.05)] sm:p-6">
                    <div className={cn("mb-5 flex items-center gap-3", isArabic ? "flex-row-reverse text-right" : "text-left")}>
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                        <ScrollText className="h-5 w-5" />
                      </div>
                      <div>
                        <div className={cn("text-lg text-slate-900", isArabic ? "arabic-ui-heading" : "font-extrabold")}>
                          {t("purchases.requests.section.details")}
                        </div>
                        <div className="text-sm text-slate-500">{t("purchases.requests.description")}</div>
                      </div>
                    </div>

                    <div className="grid gap-4 xl:grid-cols-2">
                      <Field label={t("purchases.requests.field.requestDate")} required labelClassName={isArabic ? "arabic-ui" : undefined} labelAlign={isArabic ? "end" : "start"}>
                        <div className="relative">
                          <Input
                            type="date"
                            value={requestEditor.requestDate}
                            onChange={(event) => setRequestEditor((current) => ({ ...current, requestDate: event.target.value }))}
                            className={cn("border-slate-200 bg-slate-50/70", isArabic ? "arabic-ui pe-12 text-right" : "ps-12")}
                          />
                          <CalendarDays className={cn("pointer-events-none absolute top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400", isArabic ? "left-4" : "right-4")} />
                        </div>
                      </Field>
                    </div>

                    <div className="mt-4">
                      <Field label={t("purchases.requests.field.description")} labelClassName={isArabic ? "arabic-ui" : undefined} labelAlign={isArabic ? "end" : "start"}>
                        <Textarea
                          rows={3}
                          value={requestEditor.description}
                          onChange={(event) => setRequestEditor((current) => ({ ...current, description: event.target.value }))}
                          className={cn("border-slate-200 bg-slate-50/70", isArabic && "arabic-ui text-right")}
                        />
                      </Field>
                    </div>
                  </section>

                  <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.05)] sm:p-6">
                    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className={cn("flex items-center gap-3", isArabic ? "flex-row-reverse text-right" : "text-left")}>
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                          <Package2 className="h-5 w-5" />
                        </div>
                        <div>
                          <div className={cn("text-lg text-slate-900", isArabic ? "arabic-ui-heading" : "font-extrabold")}>
                            {t("purchases.requests.section.editorLines")}
                          </div>
                          <div className="text-sm text-slate-500">{t("purchases.requests.section.editorLinesDescription")}</div>
                        </div>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={addRequestLine}
                        className="rounded-2xl border-blue-200 px-4 text-blue-700 hover:bg-blue-50"
                      >
                        <CirclePlus className="h-4 w-4" />
                        {t("purchases.action.addLine")}
                      </Button>
                    </div>

                    <div className="space-y-4">
                      {requestEditor.lines.map((line, index) => (
                        <div key={line.key} className="rounded-[1.5rem] border border-slate-200 bg-slate-50/45 p-4">
                          <div className="mb-4 flex items-center justify-between gap-3">
                            <div className={cn("flex items-center gap-3", isArabic ? "flex-row-reverse text-right" : "text-left")}>
                              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm">
                                <span className="text-sm font-extrabold">{index + 1}</span>
                              </div>
                              <div>
                                <div className={cn("text-sm text-slate-900", isArabic ? "arabic-ui-heading" : "font-extrabold")}>
                                  {t("purchases.requests.line.label", { index: index + 1 })}
                                </div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeRequestLine(line.key)}
                              disabled={requestEditor.lines.length === 1}
                              className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-white px-3 py-2 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300"
                            >
                              <Trash2 className="h-4 w-4" />
                              {t("purchases.action.remove")}
                            </button>
                          </div>

                          <div className="space-y-4">
                            <div className="grid gap-4 xl:grid-cols-4">
                              <Field label={t("purchases.requests.field.itemOrService")} required labelClassName={isArabic ? "arabic-ui" : undefined} labelAlign={isArabic ? "end" : "start"}>
                                <Select
                                  value={line.itemId}
                                  onChange={(event) => {
                                    const itemId = event.target.value;
                                    const item = inventoryItems.find((i) => i.id === itemId);
                                    updateRequestLine(line.key, "itemId", itemId);
                                    updateRequestLine(line.key, "itemName", item?.name ?? "");
                                  }}
                                  className={cn("border-slate-200 bg-white", isArabic && "arabic-ui text-right")}
                                >
                                  <option value="">
                                    {inventoryItemsQuery.isLoading ? t("purchases.requests.state.loadingItems") : t("purchases.requests.empty.selectItemOrService")}
                                  </option>
                                  {inventoryItems.map((item) => (
                                    <option key={item.id} value={item.id}>
                                      {item.code} · {item.name}
                                    </option>
                                  ))}
                                </Select>
                              </Field>
                              <Field label={t("purchases.requests.field.quantity")} required labelClassName={isArabic ? "arabic-ui" : undefined} labelAlign={isArabic ? "end" : "start"}>
                                <Input
                                  type="number"
                                  min="0.0001"
                                  step="0.0001"
                                  value={line.quantity}
                                  onChange={(event) => updateRequestLine(line.key, "quantity", event.target.value)}
                                  className={cn("border-slate-200 bg-white", isArabic && "arabic-ui text-right")}
                                />
                              </Field>
                              <Field label={t("purchases.requests.field.deliveryDate")} labelClassName={isArabic ? "arabic-ui" : undefined} labelAlign={isArabic ? "end" : "start"}>
                                <Input
                                  type="date"
                                  value={line.requestedDeliveryDate}
                                  onChange={(event) => updateRequestLine(line.key, "requestedDeliveryDate", event.target.value)}
                                  className={cn("border-slate-200 bg-white", isArabic && "arabic-ui text-right")}
                                />
                              </Field>

                              <Field label={t("purchases.requests.field.justification")} labelClassName={isArabic ? "arabic-ui" : undefined} labelAlign={isArabic ? "end" : "start"}>
                                <Textarea
                                  rows={2}
                                  value={line.justification}
                                  onChange={(event) => updateRequestLine(line.key, "justification", event.target.value)}
                                  className={cn("border-slate-200 bg-white", isArabic && "arabic-ui text-right")}
                                />
                              </Field>
                            </div>

                            <Field label={t("purchases.requests.field.lineDescription")} required labelClassName={isArabic ? "arabic-ui" : undefined} labelAlign={isArabic ? "end" : "start"}>
                              <Textarea
                                rows={2}
                                value={line.description}
                                onChange={(event) => updateRequestLine(line.key, "description", event.target.value)}
                                className={cn("border-slate-200 bg-white", isArabic && "arabic-ui text-right")}
                              />
                            </Field>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

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
                </div>
              </div>

              <div className="border-t border-slate-200 bg-white px-5 py-4 sm:px-8">
                <div className={cn("flex flex-col gap-3 sm:flex-row", isArabic ? "sm:flex-row-reverse" : "")}>
                  <Button variant="secondary" onClick={closeRequestEditor} className="rounded-2xl px-6">
                    {t("purchases.action.cancel")}
                  </Button>
                  <Button
                    onClick={() => (requestEditor.id ? updatePurchaseRequestMutation.mutate() : createPurchaseRequestMutation.mutate())}
                    disabled={Boolean(requestFormError) || createPurchaseRequestMutation.isPending || updatePurchaseRequestMutation.isPending}
                    className="rounded-2xl bg-blue-600 px-6 hover:bg-blue-700"
                  >
                    <Save className="h-4 w-4" />
                    {requestEditor.id ? t("purchases.action.saveChanges") : t("purchases.action.saveDraft")}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

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

        {isOrderEditorOpen ? (
          <div className="fixed inset-0 z-50 p-3 sm:p-6">
            <div className="absolute inset-0 bg-slate-950/35 backdrop-blur-sm" onClick={closeOrderEditor} />
            <div
              dir={isArabic ? "rtl" : "ltr"}
              className={cn(
                "relative mx-auto flex h-full max-w-[1480px] flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-[#fcfcfb] shadow-[0_30px_80px_rgba(15,23,42,0.18)]",
                isArabic && "arabic-ui",
              )}
            >
              <div className="flex items-center justify-between border-b border-slate-200 bg-white/90 px-5 py-5 backdrop-blur sm:px-8">
                <button
                  type="button"
                  onClick={closeOrderEditor}
                  className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
                >
                  <span className="sr-only">{t("purchases.action.cancel")}</span>
                  <X className="h-6 w-6" />
                </button>
                <div className={cn("flex items-center gap-3", isArabic ? "flex-row-reverse text-right" : "text-left")}>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                    <FilePlus className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <div className={cn("text-3xl text-slate-900", isArabic ? "arabic-ui-heading" : "font-black tracking-tight")}>
                      {orderEditor.id ? t("purchases.dialog.editOrder") : t("purchases.dialog.newOrder")}
                    </div>
                    <div className="text-sm text-slate-500">{t("purchases.orders.section.description")}</div>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.06),_transparent_30%),linear-gradient(180deg,_#fcfcfb_0%,_#f7f8f7_100%)] px-4 py-4 sm:px-8 sm:py-6">
                <div className="space-y-5">
                  <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.05)] sm:p-6">
                    <div className={cn("mb-5 flex items-center gap-3", isArabic ? "flex-row-reverse text-right" : "text-left")}>
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                        <FilePlus className="h-5 w-5" />
                      </div>
                      <div>
                        <div className={cn("text-lg text-slate-900", isArabic ? "arabic-ui-heading" : "font-extrabold")}>
                          {t("purchases.orders.section.details")}
                        </div>
                        <div className="text-sm text-slate-500">{t("purchases.orders.description")}</div>
                      </div>
                    </div>

                    <div className="grid gap-4 xl:grid-cols-[1fr_1.4fr_1fr]">
                      <Field label={t("purchases.orders.field.orderDate")} required labelClassName={isArabic ? "arabic-ui" : undefined} labelAlign={isArabic ? "end" : "start"}>
                        <div className="relative">
                          <Input
                            type="date"
                            value={orderEditor.orderDate}
                            onChange={(event) => setOrderEditor((current) => ({ ...current, orderDate: event.target.value }))}
                            className={cn("border-slate-200 bg-slate-50/70", isArabic ? "arabic-ui pe-12 text-right" : "ps-12")}
                          />
                          <CalendarDays className={cn("pointer-events-none absolute top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400", isArabic ? "left-4" : "right-4")} />
                        </div>
                      </Field>

                      <Field label={t("purchases.orders.field.supplier")} required labelClassName={isArabic ? "arabic-ui" : undefined} labelAlign={isArabic ? "end" : "start"}>
                        <div className="relative">
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
                            className={cn("border-slate-200 bg-slate-50/70", isArabic ? "arabic-ui pe-12 text-right" : "ps-12")}
                          >
                            <option value="">{t("purchases.requests.empty.selectSupplier")}</option>
                            {activeSuppliers.map((supplier) => (
                              <option key={supplier.id} value={supplier.id}>
                                {supplier.code} · {supplier.name}
                              </option>
                            ))}
                          </Select>
                          <UserRound className={cn("pointer-events-none absolute top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400", isArabic ? "left-4" : "right-4")} />
                        </div>
                      </Field>

                      <Field label={t("purchases.orders.field.currency")} required labelClassName={isArabic ? "arabic-ui" : undefined} labelAlign={isArabic ? "end" : "start"}>
                        <Input
                          value={orderEditor.currencyCode}
                          maxLength={8}
                          onChange={(event) => setOrderEditor((current) => ({ ...current, currencyCode: event.target.value.toUpperCase() }))}
                          className={cn("border-slate-200 bg-slate-50/70 uppercase", isArabic && "arabic-ui text-right")}
                        />
                      </Field>
                    </div>

                    <div className="mt-4">
                      <Field label={t("purchases.orders.field.description")} labelClassName={isArabic ? "arabic-ui" : undefined} labelAlign={isArabic ? "end" : "start"}>
                        <Textarea
                          rows={3}
                          value={orderEditor.description}
                          onChange={(event) => setOrderEditor((current) => ({ ...current, description: event.target.value }))}
                          className={cn("border-slate-200 bg-slate-50/70", isArabic && "arabic-ui text-right")}
                        />
                      </Field>
                    </div>
                  </section>

                  <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.05)] sm:p-6">
                    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className={cn("flex items-center gap-3", isArabic ? "flex-row-reverse text-right" : "text-left")}>
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                          <Package2 className="h-5 w-5" />
                        </div>
                        <div>
                          <div className={cn("text-lg text-slate-900", isArabic ? "arabic-ui-heading" : "font-extrabold")}>
                            {t("purchases.orders.section.editorLines")}
                          </div>
                          <div className="text-sm text-slate-500">{t("purchases.orders.section.editorLinesDescription")}</div>
                        </div>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={addOrderLine}
                        className="rounded-2xl border-emerald-200 px-4 text-emerald-700 hover:bg-emerald-50"
                      >
                        <CirclePlus className="h-4 w-4" />
                        {t("purchases.action.addLine")}
                      </Button>
                    </div>

                    <div className="space-y-4">
                      {orderEditor.lines.map((line, index) => {
                        const quantity = Number(line.quantity || 0);
                        const unitPrice = Number(line.unitPrice || 0);
                        const taxAmount = Number(line.taxAmount || 0);
                        const lineTotal = quantity * unitPrice + taxAmount;

                        return (
                          <div key={line.key} className="rounded-[1.5rem] border border-slate-200 bg-slate-50/45 p-4">
                            <div className="mb-4 flex items-center justify-between gap-3">
                              <div className={cn("flex items-center gap-3", isArabic ? "flex-row-reverse text-right" : "text-left")}>
                                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm">
                                  <span className="text-sm font-extrabold">{index + 1}</span>
                                </div>
                                <div>
                                  <div className={cn("text-sm text-slate-900", isArabic ? "arabic-ui-heading" : "font-extrabold")}>
                                    {t("purchases.orders.line.label", { index: index + 1 })}
                                  </div>
                                  <div className="text-xs text-slate-500">{formatCurrency(lineTotal)}</div>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeOrderLine(line.key)}
                                disabled={orderEditor.lines.length === 1}
                                className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-white px-3 py-2 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300"
                              >
                                <Trash2 className="h-4 w-4" />
                                {t("purchases.action.remove")}
                              </button>
                            </div>

                            <div className="space-y-4">
                              <div className="grid gap-4 xl:grid-cols-5">
                                <Field label={t("purchases.orders.field.itemOrService")} required labelClassName={isArabic ? "arabic-ui" : undefined} labelAlign={isArabic ? "end" : "start"}>
                                  <Select
                                    value={line.itemId}
                                    onChange={(event) => {
                                      const itemId = event.target.value;
                                      const item = inventoryItems.find((i) => i.id === itemId);
                                      updateOrderLine(line.key, "itemId", itemId);
                                      updateOrderLine(line.key, "itemName", item?.name ?? "");
                                    }}
                                    className={cn("border-slate-200 bg-white", isArabic && "arabic-ui text-right")}
                                  >
                                    <option value="">
                                      {inventoryItemsQuery.isLoading ? t("purchases.orders.state.loadingItems") : t("purchases.orders.empty.selectItemOrService")}
                                    </option>
                                    {inventoryItems.map((item) => (
                                      <option key={item.id} value={item.id}>
                                        {item.code} · {item.name}
                                      </option>
                                    ))}
                                  </Select>
                                </Field>

                                <Field label={t("purchases.orders.field.deliveryDate")} labelClassName={isArabic ? "arabic-ui" : undefined} labelAlign={isArabic ? "end" : "start"}>
                                  <Input
                                    type="date"
                                    value={line.requestedDeliveryDate}
                                    onChange={(event) => updateOrderLine(line.key, "requestedDeliveryDate", event.target.value)}
                                    className={cn("border-slate-200 bg-white", isArabic && "arabic-ui text-right")}
                                  />
                                </Field>

                                <Field label={t("purchases.orders.field.quantity")} required labelClassName={isArabic ? "arabic-ui" : undefined} labelAlign={isArabic ? "end" : "start"}>
                                  <Input
                                    type="number"
                                    min="0.0001"
                                    step="0.0001"
                                    value={line.quantity}
                                    onChange={(event) => updateOrderLine(line.key, "quantity", event.target.value)}
                                    className={cn("border-slate-200 bg-white", isArabic && "arabic-ui text-right")}
                                  />
                                </Field>

                                <Field label={t("purchases.orders.field.unitPrice")} required labelClassName={isArabic ? "arabic-ui" : undefined} labelAlign={isArabic ? "end" : "start"}>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={line.unitPrice}
                                    onChange={(event) => updateOrderLine(line.key, "unitPrice", event.target.value)}
                                    className={cn("border-slate-200 bg-white", isArabic && "arabic-ui text-right")}
                                  />
                                </Field>

                                <Field label={t("purchases.orders.field.taxAmount")} labelClassName={isArabic ? "arabic-ui" : undefined} labelAlign={isArabic ? "end" : "start"}>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={line.taxAmount}
                                    onChange={(event) => updateOrderLine(line.key, "taxAmount", event.target.value)}
                                    className={cn("border-slate-200 bg-white", isArabic && "arabic-ui text-right")}
                                  />
                                </Field>
                              </div>

                              <Field label={t("purchases.orders.field.lineDescription")} required labelClassName={isArabic ? "arabic-ui" : undefined} labelAlign={isArabic ? "end" : "start"}>
                                <Textarea
                                  rows={2}
                                  value={line.description}
                                  onChange={(event) => updateOrderLine(line.key, "description", event.target.value)}
                                  className={cn("border-slate-200 bg-white", isArabic && "arabic-ui text-right")}
                                />
                              </Field>

                              <div className="grid grid-cols-[1fr_1fr] gap-3">
                                <div />
                                <div>
                                  <div className={cn("mb-2 px-1 text-sm font-bold text-slate-900", isArabic ? "arabic-ui text-right" : "text-left")}>
                                    {t("purchases.orders.field.lineTotal")}
                                  </div>
                                  <div className="relative">
                                    <Input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={lineTotal.toFixed(2)}
                                      readOnly
                                      disabled
                                      className={cn("border-slate-200 bg-slate-100 text-purple-700 disabled:opacity-100", isArabic && "arabic-ui text-right")}
                                    />
                                    <span className={cn("pointer-events-none absolute top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500", isArabic ? "left-4" : "right-4")}>
                                      {orderEditor.currencyCode || "JOD"}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>

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
                </div>
              </div>

              <div className="border-t border-slate-200 bg-white px-5 py-4 sm:px-8">
                <div className={cn("flex flex-col gap-3 sm:flex-row", isArabic ? "sm:flex-row-reverse" : "")}>
                  <Button variant="secondary" onClick={closeOrderEditor} className="rounded-2xl px-6">
                    {t("purchases.action.cancel")}
                  </Button>
                  <Button
                    onClick={() => (orderEditor.id ? updatePurchaseOrderMutation.mutate() : createPurchaseOrderMutation.mutate())}
                    disabled={Boolean(orderFormError) || createPurchaseOrderMutation.isPending || updatePurchaseOrderMutation.isPending}
                    className="rounded-2xl bg-purple-600 px-6 hover:bg-purple-700"
                  >
                    <Save className="h-4 w-4" />
                    {orderEditor.id ? t("purchases.action.saveChanges") : t("purchases.action.saveDraft")}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <SidePanel
          isOpen={isReceiptEditorOpen}
          onClose={closeReceiptEditor}
          title={t("purchases.dialog.receiveOrder")}
        >
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label={t("purchases.receipts.field.reference")} hint={t("purchases.receipts.field.referenceHint")}>
                <Input value={receiptEditor.reference} onChange={(event) => setReceiptEditor((current) => ({ ...current, reference: event.target.value }))} />
              </Field>
              <Field label={t("purchases.receipts.field.receiptDate")}>
                <Input type="date" value={receiptEditor.receiptDate} onChange={(event) => setReceiptEditor((current) => ({ ...current, receiptDate: event.target.value }))} />
              </Field>
            </div>

            <Field label={t("purchases.receipts.field.description")}>
              <Textarea rows={3} value={receiptEditor.description} onChange={(event) => setReceiptEditor((current) => ({ ...current, description: event.target.value }))} />
            </Field>

            <div className="space-y-4">
              <div className="text-sm font-black uppercase tracking-[0.18em] text-gray-500">{t("purchases.receipts.section.lines")}</div>
              {receiptEditor.lines.map((line) => (
                <div key={line.key} className="space-y-3 rounded-2xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-bold text-gray-900">{line.itemName || line.description}</div>
                    <div className="text-xs text-gray-500">{t("purchases.orders.line.label", { index: line.lineNumber })}</div>
                  </div>
                  <div className="text-sm text-gray-600">{line.description}</div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <MiniMetric label={t("purchases.receipts.field.orderedQuantity")} value={line.orderedQuantity} />
                    <MiniMetric label={t("purchases.receipts.field.alreadyReceived")} value={line.receivedQuantity} />
                    <MiniMetric label={t("purchases.receipts.field.remainingQuantity")} value={line.remainingQuantity} />
                  </div>
                  <Field label={t("purchases.receipts.field.quantityReceivedNow")}>
                    <Input type="number" min="0" max={line.remainingQuantity} step="0.0001" value={line.quantityReceivedNow} onChange={(event) => updateReceiptLine(line.key, event.target.value)} />
                  </Field>
                </div>
              ))}
            </div>

            {receiptFormError ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                {receiptFormError}
              </div>
            ) : null}

            {receiptSaveError ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                {receiptSaveError}
              </div>
            ) : null}

            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={closeReceiptEditor}>
                {t("purchases.action.cancel")}
              </Button>
              <Button onClick={() => receivePurchaseOrderMutation.mutate()} disabled={Boolean(receiptFormError) || receivePurchaseOrderMutation.isPending}>
                {t("purchases.action.receiveAndPost")}
              </Button>
            </div>
          </div>
        </SidePanel>

        {isInvoiceEditorOpen ? (
          <div className="fixed inset-0 z-50 p-3 sm:p-6">
            <div className="absolute inset-0 bg-slate-950/35 backdrop-blur-sm" onClick={closeInvoiceEditor} />
            <div
              dir={isArabic ? "rtl" : "ltr"}
              className={cn(
                "relative mx-auto flex h-full max-w-[1480px] flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-[#fcfcfb] shadow-[0_30px_80px_rgba(15,23,42,0.18)]",
                isArabic && "arabic-ui",
              )}
            >
              <div className="flex items-center justify-between border-b border-slate-200 bg-white/90 px-5 py-5 backdrop-blur sm:px-8">
                <button
                  type="button"
                  onClick={closeInvoiceEditor}
                  className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
                >
                  <span className="sr-only">{t("purchases.action.cancel")}</span>
                  <X className="h-6 w-6" />
                </button>
                <div className={cn("flex items-center gap-3", isArabic ? "flex-row-reverse text-right" : "text-left")}>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <div className={cn("text-3xl text-slate-900", isArabic ? "arabic-ui-heading" : "font-black tracking-tight")}>
                      {invoiceEditor.id ? t("purchases.dialog.editInvoice") : t("purchases.dialog.newInvoice")}
                    </div>
                    <div className="text-sm text-slate-500">{invoiceEditor.reference || t("purchases.invoices.field.referenceHint")}</div>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.06),_transparent_30%),linear-gradient(180deg,_#fcfcfb_0%,_#f7f8f7_100%)] px-4 py-4 sm:px-8 sm:py-6">
                <div className="space-y-5">
                  <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.05)] sm:p-6">
                    <div className={cn("mb-5 flex items-center gap-3", isArabic ? "flex-row-reverse text-right" : "text-left")}>
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <div className={cn("text-lg text-slate-900", isArabic ? "arabic-ui-heading" : "font-extrabold")}>
                          {t("purchases.invoices.section.details")}
                        </div>
                        <div className="text-sm text-slate-500">{t("purchases.invoices.description")}</div>
                      </div>
                    </div>

                    <div className="grid gap-4 xl:grid-cols-[1fr_1.4fr_1fr_1fr]">
                      <Field label={t("purchases.invoices.field.invoiceDate")} required labelClassName={isArabic ? "arabic-ui" : undefined}>
                        <div className="relative">
                          <Input
                            type="date"
                            value={invoiceEditor.invoiceDate}
                            onChange={(event) => setInvoiceEditor((current) => ({ ...current, invoiceDate: event.target.value }))}
                            className={cn("border-slate-200 bg-slate-50/70", isArabic ? "arabic-ui pe-12 text-right" : "ps-12")}
                          />
                          <CalendarDays className={cn("pointer-events-none absolute top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400", isArabic ? "left-4" : "right-4")} />
                        </div>
                      </Field>

                      <Field label={t("purchases.invoices.field.supplier")} required labelClassName={isArabic ? "arabic-ui" : undefined}>
                        <div className="relative">
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
                            className={cn("border-slate-200 bg-slate-50/70", isArabic ? "arabic-ui pe-12 text-right" : "ps-12")}
                          >
                            <option value="">{t("purchases.requests.empty.selectSupplier")}</option>
                            {activeSuppliers.map((supplier) => (
                              <option key={supplier.id} value={supplier.id}>
                                {supplier.code} · {supplier.name}
                              </option>
                            ))}
                          </Select>
                          <UserRound className={cn("pointer-events-none absolute top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400", isArabic ? "left-4" : "right-4")} />
                        </div>
                      </Field>

                      <Field label={t("purchases.invoices.field.currency")} required labelClassName={isArabic ? "arabic-ui" : undefined}>
                        <Input
                          value={invoiceEditor.currencyCode}
                          maxLength={8}
                          onChange={(event) => setInvoiceEditor((current) => ({ ...current, currencyCode: event.target.value.toUpperCase() }))}
                          className={cn("border-slate-200 bg-slate-50/70 uppercase", isArabic && "arabic-ui text-right")}
                        />
                      </Field>

                      <Field label={t("purchases.invoices.field.sourceOrder")} labelClassName={isArabic ? "arabic-ui" : undefined}>
                        <Select
                          value={invoiceEditor.sourcePurchaseOrderId}
                          onChange={(event) => setInvoiceEditor((current) => ({ ...current, sourcePurchaseOrderId: event.target.value }))}
                          className={cn("border-slate-200 bg-slate-50/70", isArabic && "arabic-ui text-right")}
                        >
                          <option value="">{t("purchases.invoices.empty.manual")}</option>
                          {purchaseOrders
                            .filter((order) => ["ISSUED", "PARTIALLY_RECEIVED", "FULLY_RECEIVED", "CLOSED"].includes(order.status))
                            .map((order) => (
                              <option key={order.id} value={order.id}>
                                {order.reference}
                              </option>
                            ))}
                        </Select>
                      </Field>
                    </div>

                    <div className="mt-4">
                      <Field label={t("purchases.invoices.field.description")} labelClassName={isArabic ? "arabic-ui" : undefined}>
                        <Textarea
                          rows={3}
                          value={invoiceEditor.description}
                          onChange={(event) => setInvoiceEditor((current) => ({ ...current, description: event.target.value }))}
                          className={cn("border-slate-200 bg-slate-50/70", isArabic && "arabic-ui text-right")}
                        />
                      </Field>
                    </div>
                  </section>

                  <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.05)] sm:p-6">
                    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className={cn("flex items-center gap-3", isArabic ? "flex-row-reverse text-right" : "text-left")}>
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                          <Package2 className="h-5 w-5" />
                        </div>
                        <div>
                          <div className={cn("text-lg text-slate-900", isArabic ? "arabic-ui-heading" : "font-extrabold")}>
                            {t("purchases.invoices.section.editorLines")}
                          </div>
                          <div className="text-sm text-slate-500">{t("purchases.invoices.section.editorLinesDescription")}</div>
                        </div>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={addInvoiceLine}
                        className="rounded-2xl border-emerald-200 px-4 text-emerald-700 hover:bg-emerald-50"
                      >
                        <CirclePlus className="h-4 w-4" />
                        {t("purchases.action.addLine")}
                      </Button>
                    </div>

                    <div className="space-y-4">
                      {invoiceEditor.lines.map((line, index) => {
                        const lineTotal = calculateInvoiceLineTotal(line);

                        return (
                          <div key={line.key} className="rounded-[1.5rem] border border-slate-200 bg-slate-50/45 p-4">
                            <div className="mb-4 flex items-center justify-between gap-3">
                              <div className={cn("flex items-center gap-3", isArabic ? "flex-row-reverse text-right" : "text-left")}>
                                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm">
                                  <span className="text-sm font-extrabold">{index + 1}</span>
                                </div>
                                <div>
                                  <div className={cn("text-sm text-slate-900", isArabic ? "arabic-ui-heading" : "font-extrabold")}>
                                    {t("purchases.invoices.line.label", { index: index + 1 })}
                                  </div>
                                  <div className="text-xs text-slate-500">{formatCurrency(lineTotal)}</div>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeInvoiceLine(line.key)}
                                disabled={invoiceEditor.lines.length === 1}
                                className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-white px-3 py-2 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300"
                              >
                                <Trash2 className="h-4 w-4" />
                                {t("purchases.action.remove")}
                              </button>
                            </div>

                            <div className="overflow-x-auto">
                              <div className="min-w-[1320px]">
                                <div className="mb-3 grid grid-cols-[0.55fr_1.8fr_1.7fr_1.6fr_0.85fr_0.95fr_1fr_1fr_1.35fr] gap-3">
                                  {[
                                    "#",
                                    t("purchases.invoices.field.itemOrService"),
                                    t("purchases.invoices.field.itemSnapshot"),
                                    t("purchases.invoices.field.account"),
                                    t("purchases.invoices.field.quantity"),
                                    t("purchases.invoices.field.unitPrice"),
                                    t("purchases.invoices.field.discountAmount"),
                                    t("purchases.invoices.field.taxAmount"),
                                    t("purchases.invoices.field.lineDescription"),
                                  ].map((label, labelIndex) => (
                                    <div
                                      key={`${line.key}-label-${labelIndex}`}
                                      className={cn("px-1 text-sm font-bold text-slate-900", isArabic ? "arabic-ui text-right" : "text-left")}
                                    >
                                      {label}
                                      {labelIndex > 0 && labelIndex !== 2 && labelIndex !== 6 && labelIndex !== 7 ? (
                                        <span className="ms-1 text-red-500">*</span>
                                      ) : null}
                                    </div>
                                  ))}
                                </div>

                                <div className="grid grid-cols-[0.55fr_1.8fr_1.7fr_1.6fr_0.85fr_0.95fr_1fr_1fr_1.35fr] gap-3">
                                  <div className="flex h-full items-center justify-center rounded-2xl bg-white text-base font-extrabold text-slate-900 shadow-sm">
                                    {index + 1}
                                  </div>

                                  <Select
                                    value={line.itemId}
                                    onChange={(event) => updateInvoiceLineFromItem(line.key, inventoryItems.find((item) => item.id === event.target.value) ?? null)}
                                    className={cn("border-slate-200 bg-white", isArabic && "arabic-ui text-right")}
                                  >
                                    <option value="">
                                      {inventoryItemsQuery.isLoading ? t("purchases.invoices.state.loadingItems") : t("purchases.invoices.empty.selectItemOrService")}
                                    </option>
                                    {inventoryItems.map((item) => (
                                      <option key={item.id} value={item.id}>
                                        {item.code} · {item.name}
                                      </option>
                                    ))}
                                  </Select>

                                  <Input
                                    value={line.itemName}
                                    onChange={(event) => updateInvoiceLine(line.key, "itemName", event.target.value)}
                                    placeholder={t("purchases.invoices.field.itemSnapshotPlaceholder")}
                                    className={cn("border-slate-200 bg-white", isArabic && "arabic-ui text-right")}
                                  />

                                  <Select
                                    value={line.accountId}
                                    onChange={(event) => updateInvoiceLine(line.key, "accountId", event.target.value)}
                                    className={cn("border-slate-200 bg-white", isArabic && "arabic-ui text-right")}
                                  >
                                    <option value="">{t("purchases.invoices.empty.selectAccount")}</option>
                                    {purchaseInvoiceDebitAccounts.map((account) => (
                                      <option key={account.id} value={account.id}>
                                        {account.code} · {account.name} ({account.currencyCode})
                                      </option>
                                    ))}
                                  </Select>

                                  <Input
                                    type="number"
                                    min="0.0001"
                                    step="0.0001"
                                    value={line.quantity}
                                    onChange={(event) => updateInvoiceLine(line.key, "quantity", event.target.value)}
                                    className={cn("border-slate-200 bg-white", isArabic && "arabic-ui text-right")}
                                  />

                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={line.unitPrice}
                                    onChange={(event) => updateInvoiceLine(line.key, "unitPrice", event.target.value)}
                                    className={cn("border-slate-200 bg-white", isArabic && "arabic-ui text-right")}
                                  />

                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={line.discountAmount}
                                    onChange={(event) => updateInvoiceLine(line.key, "discountAmount", event.target.value)}
                                    className={cn("border-slate-200 bg-white", isArabic && "arabic-ui text-right")}
                                  />

                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={line.taxAmount}
                                    onChange={(event) => updateInvoiceLine(line.key, "taxAmount", event.target.value)}
                                    className={cn("border-slate-200 bg-white", isArabic && "arabic-ui text-right")}
                                  />

                                  <Input
                                    value={line.description}
                                    onChange={(event) => updateInvoiceLine(line.key, "description", event.target.value)}
                                    className={cn("border-slate-200 bg-white", isArabic && "arabic-ui text-right")}
                                  />
                                </div>

                                <div className="mt-3 grid grid-cols-[1fr_1fr_1.35fr] gap-3">
                                  <div />
                                  <div />
                                  <div>
                                    <div className={cn("mb-2 px-1 text-sm font-bold text-slate-900", isArabic ? "arabic-ui text-right" : "text-left")}>
                                      {t("purchases.invoices.field.lineTotal")}
                                    </div>
                                    <div className="relative">
                                      <Input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={lineTotal.toFixed(2)}
                                        readOnly
                                        disabled
                                        className={cn("border-slate-200 bg-slate-100 text-emerald-700 disabled:opacity-100", isArabic && "arabic-ui text-right")}
                                      />
                                      <span className={cn("pointer-events-none absolute top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500", isArabic ? "left-4" : "right-4")}>
                                        {invoiceEditor.currencyCode || "JOD"}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>

                  <section className="grid gap-4 lg:grid-cols-[1.25fr_1fr_1fr]">
                    <div className="rounded-[1.75rem] border border-emerald-200 bg-emerald-50/80 p-5 shadow-[0_10px_24px_rgba(16,185,129,0.08)]">
                      <div className="text-sm font-bold text-emerald-700">{t("purchases.invoices.metric.total")}</div>
                      <div className="mt-2 text-3xl font-black text-emerald-700">
                        {invoiceEditor.currencyCode || "JOD"} {invoiceTotals.totalAmount.toFixed(2)}
                      </div>
                    </div>
                    <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5">
                      <div className="text-sm font-bold text-slate-500">{t("purchases.invoices.metric.subtotal")}</div>
                      <div className="mt-2 text-2xl font-black text-slate-900">
                        {invoiceEditor.currencyCode || "JOD"} {invoiceTotals.subtotalAmount.toFixed(2)}
                      </div>
                    </div>
                    <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5">
                      <div className="text-sm font-bold text-slate-500">{t("purchases.invoices.metric.tax")}</div>
                      <div className="mt-2 text-2xl font-black text-slate-900">
                        {invoiceEditor.currencyCode || "JOD"} {invoiceTotals.taxAmount.toFixed(2)}
                      </div>
                    </div>
                  </section>

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
                </div>
              </div>

              <div className="border-t border-slate-200 bg-white px-5 py-4 sm:px-8">
                <div className={cn("flex flex-col gap-3 sm:flex-row", isArabic ? "sm:flex-row-reverse" : "")}>
                  <Button variant="secondary" onClick={closeInvoiceEditor} className="rounded-2xl px-6">
                    {t("purchases.action.cancel")}
                  </Button>
                  <Button
                    onClick={() => (invoiceEditor.id ? updatePurchaseInvoiceMutation.mutate() : createPurchaseInvoiceMutation.mutate())}
                    disabled={Boolean(invoiceFormError) || createPurchaseInvoiceMutation.isPending || updatePurchaseInvoiceMutation.isPending}
                    className="rounded-2xl bg-emerald-600 px-6 hover:bg-emerald-700"
                  >
                    <Save className="h-4 w-4" />
                    {invoiceEditor.id ? t("purchases.action.saveChanges") : t("purchases.action.saveDraft")}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {isPaymentEditorOpen ? (
          <div className="fixed inset-0 z-50 p-3 sm:p-6">
            <div className="absolute inset-0 bg-slate-950/35 backdrop-blur-sm" onClick={closePaymentEditor} />
            <div
              dir={isArabic ? "rtl" : "ltr"}
              className={cn(
                "relative mx-auto flex h-full max-w-[1480px] flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-[#fcfcfb] shadow-[0_30px_80px_rgba(15,23,42,0.18)]",
                isArabic && "arabic-ui",
              )}
            >
              <div className="flex items-center justify-between border-b border-slate-200 bg-white/90 px-5 py-5 backdrop-blur sm:px-8">
                <button
                  type="button"
                  onClick={closePaymentEditor}
                  className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
                >
                  <span className="sr-only">{t("purchases.action.cancel")}</span>
                  <X className="h-6 w-6" />
                </button>
                <div className={cn("flex items-center gap-3", isArabic ? "flex-row-reverse text-right" : "text-left")}>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                    <ReceiptText className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <div className={cn("text-3xl text-slate-900", isArabic ? "arabic-ui-heading" : "font-black tracking-tight")}>
                      {paymentEditor.id ? t("purchases.dialog.editPayment") : t("purchases.dialog.newPayment")}
                    </div>
                    <div className="text-sm text-slate-500">{paymentEditor.reference || t("purchases.payments.field.referenceHint")}</div>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.06),_transparent_30%),linear-gradient(180deg,_#fcfcfb_0%,_#f7f8f7_100%)] px-4 py-4 sm:px-8 sm:py-6">
                <div className="space-y-5">
                  <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.05)] sm:p-6">
                    <div className={cn("mb-5 flex items-center gap-3", isArabic ? "flex-row-reverse text-right" : "text-left")}>
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                        <ReceiptText className="h-5 w-5" />
                      </div>
                      <div>
                        <div className={cn("text-lg text-slate-900", isArabic ? "arabic-ui-heading" : "font-extrabold")}>
                          {t("purchases.payments.section.details")}
                        </div>
                        <div className="text-sm text-slate-500">{t("purchases.description.payments")}</div>
                      </div>
                    </div>

                    <div className="grid gap-4 xl:grid-cols-[1fr_1.35fr_1fr_1.35fr]">
                      <Field label={t("purchases.payments.field.paymentDate")} required labelClassName={isArabic ? "arabic-ui" : undefined}>
                        <div className="relative">
                          <Input
                            type="date"
                            value={paymentEditor.paymentDate}
                            onChange={(event) => setPaymentEditor((current) => ({ ...current, paymentDate: event.target.value }))}
                            className={cn("border-slate-200 bg-slate-50/70", isArabic ? "arabic-ui pe-12 text-right" : "ps-12")}
                          />
                          <CalendarDays className={cn("pointer-events-none absolute top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400", isArabic ? "left-4" : "right-4")} />
                        </div>
                      </Field>

                      <Field label={t("purchases.payments.field.supplier")} required labelClassName={isArabic ? "arabic-ui" : undefined}>
                        <div className="relative">
                          <Select
                            value={paymentEditor.supplierId}
                            onChange={(event) =>
                              setPaymentEditor((current) => ({
                                ...current,
                                supplierId: event.target.value,
                                allocations: current.allocations.map((allocation) => ({ ...allocation, purchaseInvoiceId: "" })),
                              }))
                            }
                            className={cn("border-slate-200 bg-slate-50/70", isArabic ? "arabic-ui pe-12 text-right" : "ps-12")}
                          >
                            <option value="">{t("purchases.requests.empty.selectSupplier")}</option>
                            {activeSuppliers.map((supplier) => (
                              <option key={supplier.id} value={supplier.id}>
                                {supplier.code} · {supplier.name}
                              </option>
                            ))}
                          </Select>
                          <UserRound className={cn("pointer-events-none absolute top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400", isArabic ? "left-4" : "right-4")} />
                        </div>
                      </Field>

                      <Field label={t("purchases.payments.field.amount")} required labelClassName={isArabic ? "arabic-ui" : undefined}>
                        <Input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={paymentEditor.amount}
                          onChange={(event) => setPaymentEditor((current) => ({ ...current, amount: event.target.value }))}
                          className={cn("border-slate-200 bg-slate-50/70", isArabic && "arabic-ui text-right")}
                        />
                      </Field>

                      <Field label={t("purchases.payments.field.bankCash")} required labelClassName={isArabic ? "arabic-ui" : undefined}>
                        <Select
                          value={paymentEditor.bankCashAccountId}
                          onChange={(event) => setPaymentEditor((current) => ({ ...current, bankCashAccountId: event.target.value }))}
                          className={cn("border-slate-200 bg-slate-50/70", isArabic && "arabic-ui text-right")}
                        >
                          <option value="">{t("purchases.payments.empty.selectBankCash")}</option>
                          {(bankCashAccountsQuery.data ?? []).map((row) => (
                            <option key={row.id} value={row.id}>
                              {row.name} · {row.type}
                            </option>
                          ))}
                        </Select>
                      </Field>
                    </div>

                    <div className="mt-4">
                      <Field label={t("purchases.payments.field.description")} labelClassName={isArabic ? "arabic-ui" : undefined}>
                        <Textarea
                          rows={3}
                          value={paymentEditor.description}
                          onChange={(event) => setPaymentEditor((current) => ({ ...current, description: event.target.value }))}
                          className={cn("border-slate-200 bg-slate-50/70", isArabic && "arabic-ui text-right")}
                        />
                      </Field>
                    </div>
                  </section>

                  <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.05)] sm:p-6">
                    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className={cn("flex items-center gap-3", isArabic ? "flex-row-reverse text-right" : "text-left")}>
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div>
                          <div className={cn("text-lg text-slate-900", isArabic ? "arabic-ui-heading" : "font-extrabold")}>
                            {t("purchases.payments.section.editorAllocations")}
                          </div>
                          <div className="text-sm text-slate-500">{t("purchases.payments.section.editorAllocationsHint")}</div>
                        </div>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={addPaymentAllocation}
                        className="rounded-2xl border-emerald-200 px-4 text-emerald-700 hover:bg-emerald-50"
                      >
                        <CirclePlus className="h-4 w-4" />
                        {t("purchases.action.addAllocation")}
                      </Button>
                    </div>

                    <div className="overflow-x-auto rounded-[1.5rem] border border-slate-200">
                      <table className="min-w-[1180px] w-full bg-white text-sm">
                        <thead className="bg-slate-50 text-slate-600">
                          <tr>
                            <th className={cn("w-16 px-4 py-3 font-black", isArabic ? "text-right" : "text-left")}>#</th>
                            <th className={cn("px-4 py-3 font-black", isArabic ? "text-right" : "text-left")}>
                              {t("purchases.payments.field.purchaseInvoice")}
                              <span className="ms-1 text-red-500">*</span>
                            </th>
                            <th className={cn("px-4 py-3 font-black", isArabic ? "text-right" : "text-left")}>{t("purchases.payments.field.invoiceDate")}</th>
                            <th className={cn("px-4 py-3 font-black", isArabic ? "text-right" : "text-left")}>{t("purchases.payments.field.invoiceTotal")}</th>
                            <th className={cn("px-4 py-3 font-black", isArabic ? "text-right" : "text-left")}>{t("purchases.payments.metric.remainingOnInvoice")}</th>
                            <th className={cn("px-4 py-3 font-black", isArabic ? "text-right" : "text-left")}>
                              {t("purchases.payments.field.allocationAmount")}
                              <span className="ms-1 text-red-500">*</span>
                            </th>
                            <th className={cn("w-28 px-4 py-3 font-black", isArabic ? "text-right" : "text-left")}>{t("purchases.action.remove")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paymentEditor.allocations.map((allocation, index) => {
                            const selectedInvoice = paymentEligibleInvoices.find((invoice) => invoice.id === allocation.purchaseInvoiceId);

                            return (
                              <tr key={allocation.key} className="border-t border-slate-100">
                                <td className="px-4 py-3 font-extrabold text-slate-900">{index + 1}</td>
                                <td className="px-4 py-3">
                                  <Select
                                    value={allocation.purchaseInvoiceId}
                                    onChange={(event) => updatePaymentAllocation(allocation.key, "purchaseInvoiceId", event.target.value)}
                                    className={cn("border-slate-200 bg-slate-50/70", isArabic && "arabic-ui text-right")}
                                  >
                                    <option value="">{t("purchases.payments.empty.selectInvoice")}</option>
                                    {paymentEligibleInvoices.map((invoice) => (
                                      <option key={invoice.id} value={invoice.id}>
                                        {invoice.reference}
                                      </option>
                                    ))}
                                  </Select>
                                </td>
                                <td className="px-4 py-3 font-bold text-slate-700">
                                  {selectedInvoice ? formatDate(selectedInvoice.invoiceDate) : "-"}
                                </td>
                                <td className="px-4 py-3 font-bold text-slate-700">
                                  {selectedInvoice ? formatCurrency(selectedInvoice.totalAmount) : "-"}
                                </td>
                                <td className="px-4 py-3 font-bold text-emerald-700">
                                  {selectedInvoice ? formatCurrency(selectedInvoice.outstandingAmount) : "-"}
                                </td>
                                <td className="px-4 py-3">
                                  <Input
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    value={allocation.amount}
                                    onChange={(event) => updatePaymentAllocation(allocation.key, "amount", event.target.value)}
                                    className={cn("border-slate-200 bg-slate-50/70", isArabic && "arabic-ui text-right")}
                                  />
                                </td>
                                <td className="px-4 py-3">
                                  <button
                                    type="button"
                                    onClick={() => removePaymentAllocation(allocation.key)}
                                    disabled={paymentEditor.allocations.length === 1}
                                    className="inline-flex items-center justify-center rounded-2xl border border-red-200 bg-white p-3 text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </section>

                  <section className="grid gap-4 lg:grid-cols-3">
                    <div className="rounded-[1.75rem] border border-emerald-200 bg-emerald-50/80 p-5 shadow-[0_10px_24px_rgba(16,185,129,0.08)]">
                      <div className="text-sm font-bold text-emerald-700">{t("purchases.payments.metric.amount")}</div>
                      <div className="mt-2 text-3xl font-black text-emerald-700">{formatCurrency(paymentEditor.amount || 0)}</div>
                    </div>
                    <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5">
                      <div className="text-sm font-bold text-slate-500">{t("purchases.payments.metric.allocated")}</div>
                      <div className="mt-2 text-2xl font-black text-slate-900">{formatCurrency(paymentAllocatedAmount)}</div>
                    </div>
                    <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5">
                      <div className="text-sm font-bold text-slate-500">{t("purchases.payments.metric.unapplied")}</div>
                      <div className="mt-2 text-2xl font-black text-slate-900">{formatCurrency(paymentUnallocatedAmount)}</div>
                    </div>
                  </section>

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
                </div>
              </div>

              <div className="border-t border-slate-200 bg-white px-5 py-4 sm:px-8">
                <div className={cn("flex flex-col gap-3 sm:flex-row", isArabic ? "sm:flex-row-reverse" : "")}>
                  <Button variant="secondary" onClick={closePaymentEditor} className="rounded-2xl px-6">
                    {t("purchases.action.cancel")}
                  </Button>
                  <Button
                    onClick={() => (paymentEditor.id ? updateSupplierPaymentMutation.mutate() : createSupplierPaymentMutation.mutate())}
                    disabled={Boolean(paymentFormError) || createSupplierPaymentMutation.isPending || updateSupplierPaymentMutation.isPending}
                    className="rounded-2xl bg-emerald-600 px-6 hover:bg-emerald-700"
                  >
                    <Save className="h-4 w-4" />
                    {paymentEditor.id ? t("purchases.action.saveChanges") : t("purchases.action.saveDraft")}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

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
                  .filter((invoice) => invoice.status !== "DRAFT" && invoice.status !== "CANCELLED")
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
      phone: supplier.phone ?? "",
      email: supplier.email ?? "",
      address: supplier.address ?? "",
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
      requestDate: request.requestDate.slice(0, 10),
      description: request.description ?? "",
      lines: request.lines.map((line) => ({
        key: line.id,
        itemId: line.itemId ?? "",
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
      orderDate: order.orderDate.slice(0, 10),
      supplierId: order.supplier.id,
      currencyCode: order.currencyCode,
      description: order.description ?? "",
      lines: order.lines.map((line) => ({
        key: line.id,
        itemId: line.itemId ?? "",
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

  function openReceivePurchaseOrderEditor(order: PurchaseOrder) {
    receivePurchaseOrderMutation.reset();
    setReceiptEditor({
      ...EMPTY_RECEIPT_EDITOR(),
      purchaseOrderId: order.id,
      receiptDate: todayValue(),
      description: order.description ?? "",
      lines: order.lines.map((line) => {
        const remainingQuantity = Math.max(0, Number(line.quantity) - Number(line.receivedQuantity));
        return {
          key: line.id,
          purchaseOrderLineId: line.id,
          lineNumber: line.lineNumber,
          itemName: line.itemName ?? "",
          description: line.description,
          orderedQuantity: line.quantity,
          receivedQuantity: line.receivedQuantity,
          remainingQuantity: remainingQuantity.toFixed(4),
          quantityReceivedNow: remainingQuantity > 0 ? remainingQuantity.toFixed(4) : "",
        };
      }),
    });
    setIsReceiptEditorOpen(true);
  }

  function closeReceiptEditor() {
    receivePurchaseOrderMutation.reset();
    setReceiptEditor(EMPTY_RECEIPT_EDITOR());
    setIsReceiptEditorOpen(false);
  }

  function updateReceiptLine(key: string, value: string) {
    setReceiptEditor((current) => ({
      ...current,
      lines: current.lines.map((line) => (line.key === key ? { ...line, quantityReceivedNow: value } : line)),
    }));
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
        itemId: line.itemId ?? line.item?.id ?? "",
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

  function updateInvoiceLineFromItem(key: string, item: InventoryItem | null) {
    setInvoiceEditor((current) => ({
      ...current,
      lines: current.lines.map((line) =>
        line.key === key
          ? {
              ...line,
              itemId: item?.id ?? "",
              itemName: item?.name ?? "",
              description: line.description.trim() || !item ? line.description : item.description ?? item.name,
              accountId: item?.inventoryAccount?.id ?? item?.adjustmentAccount?.id ?? line.accountId,
            }
          : line,
      ),
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

function TableHead({ children, className }: { children: ReactNode; className?: string }) {
  return <th className={cn("px-6 py-3 text-start text-[10px] font-bold uppercase tracking-widest text-gray-600", className)}>{children}</th>;
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
  if (!editor.paymentTerms.trim()) {
    return "Payment terms are required. شروط الدفع مطلوبة.";
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
    if (!line.itemId) {
      return "Each request line needs an inventory item. كل سطر طلب يحتاج إلى صنف من المخزون.";
    }
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
    if (!line.itemId) {
      return "Each order line needs an inventory item. كل سطر أمر شراء يحتاج إلى صنف من المخزون.";
    }
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

function getPurchaseReceiptFormError(editor: PurchaseReceiptEditorState) {
  if (!editor.purchaseOrderId) {
    return "Purchase order is required. أمر الشراء مطلوب.";
  }
  if (!editor.receiptDate) {
    return "Receipt date is required. تاريخ الاستلام مطلوب.";
  }

  const positiveLines = editor.lines.filter((line) => Number(line.quantityReceivedNow || 0) > 0);
  if (positiveLines.length === 0) {
    return "Enter a received quantity on at least one line. أدخل كمية مستلمة في سطر واحد على الأقل.";
  }

  for (const line of positiveLines) {
    if (Number(line.quantityReceivedNow) - Number(line.remainingQuantity) > 0.0001) {
      return "Received quantity cannot exceed the remaining order quantity. لا يمكن أن تتجاوز الكمية المستلمة الكمية المتبقية في أمر الشراء.";
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
    if (!line.itemId) {
      return "Each invoice line needs an inventory item. كل سطر فاتورة شراء يحتاج إلى صنف من المخزون.";
    }
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
    itemId: "",
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
    itemId: "",
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
    itemId: "",
    itemName: "",
    description: "",
    quantity: "1",
    unitPrice: "0.00",
    discountAmount: "0.00",
    taxAmount: "0.00",
    accountId: "",
  };
}

function calculateInvoiceLineTotal(line: PurchaseInvoiceLineEditorState) {
  const quantity = Number(line.quantity || 0);
  const unitPrice = Number(line.unitPrice || 0);
  const discountAmount = Number(line.discountAmount || 0);
  const taxAmount = Number(line.taxAmount || 0);
  return Number((quantity * unitPrice - discountAmount + taxAmount).toFixed(2));
}

function calculateInvoiceEditorTotals(lines: PurchaseInvoiceLineEditorState[]) {
  return lines.reduce(
    (totals, line) => {
      const quantity = Number(line.quantity || 0);
      const unitPrice = Number(line.unitPrice || 0);
      const discountAmount = Number(line.discountAmount || 0);
      const taxAmount = Number(line.taxAmount || 0);
      const subtotal = Number((quantity * unitPrice).toFixed(2));
      return {
        subtotalAmount: Number((totals.subtotalAmount + subtotal).toFixed(2)),
        discountAmount: Number((totals.discountAmount + discountAmount).toFixed(2)),
        taxAmount: Number((totals.taxAmount + taxAmount).toFixed(2)),
        totalAmount: Number((totals.totalAmount + subtotal - discountAmount + taxAmount).toFixed(2)),
      };
    },
    { subtotalAmount: 0, discountAmount: 0, taxAmount: 0, totalAmount: 0 },
  );
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
    itemId: line.itemId || undefined,
    itemName: line.itemName || undefined,
    description: line.description,
    quantity: Number(line.quantity),
    requestedDeliveryDate: line.requestedDeliveryDate || undefined,
    justification: line.justification || undefined,
  }));
}

function mapOrderEditorLines(lines: PurchaseOrderLineEditorState[]) {
  return lines.map((line) => ({
    itemId: line.itemId || undefined,
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
    itemId: line.itemId || undefined,
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
    case "REVERSED":
      return t("purchases.status.reversed");
    default:
      return status;
  }
}

function translatePurchaseReceiptStatus(status: string, t: (key: string, vars?: Record<string, string | number>) => string) {
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

function translateSupplierPaymentStatus(status: string, t: (key: string, vars?: Record<string, string | number>) => string) {
  switch (status) {
    case "DRAFT":
      return t("purchases.status.draft");
    case "POSTED":
      return t("purchases.invoices.status.posted");
    case "CANCELLED":
      return t("purchases.status.cancelled");
    case "REVERSED":
      return t("purchases.status.reversed");
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
    case "REVERSED":
      return t("purchases.status.reversed");
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
  if (status === "REVERSED") return "warning" as const;
  return "neutral" as const;
}

function purchaseReceiptStatusTone(status: PurchaseReceipt["status"]) {
  if (status === "POSTED") return "positive" as const;
  if (status === "CANCELLED") return "warning" as const;
  return "neutral" as const;
}

function supplierPaymentStatusTone(status: SupplierPayment["status"]) {
  if (status === "POSTED") return "positive" as const;
  if (status === "CANCELLED") return "warning" as const;
  if (status === "REVERSED") return "warning" as const;
  return "neutral" as const;
}

function debitNoteStatusTone(status: DebitNote["status"]) {
  if (status === "POSTED" || status === "APPLIED") return "positive" as const;
  if (status === "CANCELLED") return "warning" as const;
  if (status === "REVERSED") return "warning" as const;
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
