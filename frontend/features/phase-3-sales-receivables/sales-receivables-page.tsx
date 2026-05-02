"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  LuBookText as BookText,
  LuCirclePlus as CirclePlus,
  LuFileMinus as FileMinus,
  LuFilePlus2 as FilePlus,
  LuFileText as FileText,
  LuHandshake as Handshake,
  LuReceiptText as ReceiptText,
  LuScrollText as ScrollText,
  LuUsers as Users,
} from "react-icons/lu";

import {
  allocateReceipt,
  approveSalesQuotation,
  cancelSalesOrder,
  cancelSalesQuotation,
  convertQuotationToInvoice,
  convertQuotationToOrder,
  convertSalesOrderToInvoice,
  createCreditNote,
  createCustomer,
  createCustomerReceipt,
  createSalesInvoice,
  createSalesOrder,
  createSalesQuotation,
  confirmSalesOrder,
  getCustomerReceipts,
  deactivateCustomer,
  getAccountOptions,
  getAccountsTree,
  getAgingReport,
  getBankCashAccounts,
  getBankCashTransactions,
  getCreditNotes,
  getCustomerBalance,
  getCustomerTransactions,
  getCustomers,
  getInventoryItems,
  getSalesOrders,
  getSalesQuotations,
  getSalesInvoices,
  postCreditNote,
  postSalesInvoice,
  updateCreditNote,
  updateCustomer,
  updateSalesInvoice,
  updateSalesOrder,
  updateSalesQuotation,
} from "@/lib/api";
import { useTranslation } from "@/lib/i18n";
import { queryKeys } from "@/lib/query-keys";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import type {
  AllocationStatus,
  AccountTreeNode,
  Customer,
  CustomerReceipt,
  SalesInvoiceStatus,
  SalesOrder,
  SalesQuotation,
  SalesLinePayload,
} from "@/types/api";
import { Button, Card, SectionHeading, SidePanel, StatusPill } from "@/components/ui";
import { Field, Input, Select, Textarea } from "@/components/ui/forms";
import {
  createEmptyLine,
  createEmptyQuotationEditor,
  QuotationEditorModal,
  type QuotationEditorState,
  type SalesLineEditorState,
  withCalculatedLineAmount,
} from "./components/quotation-editor-modal";
import { CreditNoteEditorModal } from "./components/credit-note-editor-modal";
import { ReceiptEditorModal } from "./components/receipt-editor-modal";
import { SalesDocumentEditorModal } from "./components/sales-document-editor-modal";
import { SalesOrderEditorModal } from "./components/sales-order-editor-modal";

type SalesTab = "customers" | "quotations" | "orders" | "invoices" | "receipts" | "credit-notes" | "allocations" | "aging";

type CustomerEditorState = {
  id?: string;
  code: string;
  name: string;
  contactInfo: string;
  taxInfo: string;
  salesRepresentative: string;
  paymentTerms: string;
  creditLimit: string;
  receivableAccountId: string;
};

type InvoiceEditorState = {
  id?: string;
  reference: string;
  invoiceDate: string;
  dueDate: string;
  currencyCode: string;
  customerId: string;
  description: string;
  lines: SalesLineEditorState[];
};

type SalesOrderEditorState = {
  id?: string;
  reference: string;
  orderDate: string;
  promisedDate: string;
  currencyCode: string;
  customerId: string;
  sourceQuotationId: string;
  shippingDetails: string;
  description: string;
  lines: SalesLineEditorState[];
};

type CreditNoteEditorState = {
  id?: string;
  reference: string;
  noteDate: string;
  currencyCode: string;
  customerId: string;
  salesInvoiceId: string;
  description: string;
  lines: SalesLineEditorState[];
};

type ReceiptEditorState = {
  reference: string;
  receiptDate: string;
  customerId: string;
  amount: string;
  bankCashAccountId: string;
  description: string;
};

const EMPTY_CUSTOMER_EDITOR: CustomerEditorState = {
  code: "",
  name: "",
  contactInfo: "",
  taxInfo: "",
  salesRepresentative: "",
  paymentTerms: "",
  creditLimit: "0",
  receivableAccountId: "",
};

const EMPTY_ORDER_EDITOR = (): SalesOrderEditorState => ({
  reference: "",
  orderDate: new Date().toISOString().slice(0, 10),
  promisedDate: "",
  currencyCode: "JOD",
  customerId: "",
  sourceQuotationId: "",
  shippingDetails: "",
  description: "",
  lines: [createEmptyLine()],
});

const EMPTY_INVOICE_EDITOR = (): InvoiceEditorState => ({
  reference: "",
  invoiceDate: new Date().toISOString().slice(0, 10),
  dueDate: "",
  currencyCode: "JOD",
  customerId: "",
  description: "",
  lines: [createEmptyLine()],
});

const EMPTY_CREDIT_NOTE_EDITOR = (): CreditNoteEditorState => ({
  reference: "",
  noteDate: new Date().toISOString().slice(0, 10),
  currencyCode: "JOD",
  customerId: "",
  salesInvoiceId: "",
  description: "",
  lines: [createEmptyLine()],
});

const EMPTY_RECEIPT_EDITOR = (): ReceiptEditorState => ({
  reference: "",
  receiptDate: new Date().toISOString().slice(0, 10),
  customerId: "",
  amount: "",
  bankCashAccountId: "",
  description: "",
});

export function SalesReceivablesPage() {
  const { token } = useAuth();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<SalesTab>("customers");

  const [customerSearch, setCustomerSearch] = useState("");
  const [customerStatusFilter, setCustomerStatusFilter] = useState<"true" | "false" | "">("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [isCustomerEditorOpen, setIsCustomerEditorOpen] = useState(false);
  const [customerEditor, setCustomerEditor] = useState<CustomerEditorState>(EMPTY_CUSTOMER_EDITOR);

  const [quotationSearch, setQuotationSearch] = useState("");
  const [quotationStatusFilter, setQuotationStatusFilter] = useState("");
  const [selectedQuotationId, setSelectedQuotationId] = useState<string | null>(null);
  const [isQuotationEditorOpen, setIsQuotationEditorOpen] = useState(false);
  const [quotationEditor, setQuotationEditor] = useState<QuotationEditorState>(createEmptyQuotationEditor);
  const [quotationEditorClientError, setQuotationEditorClientError] = useState<string | null>(null);

  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isOrderEditorOpen, setIsOrderEditorOpen] = useState(false);
  const [orderEditor, setOrderEditor] = useState<SalesOrderEditorState>(EMPTY_ORDER_EDITOR);

  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<SalesInvoiceStatus | "">("");
  const [invoiceCustomerFilter, setInvoiceCustomerFilter] = useState("");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [isInvoiceEditorOpen, setIsInvoiceEditorOpen] = useState(false);
  const [invoiceEditor, setInvoiceEditor] = useState<InvoiceEditorState>(EMPTY_INVOICE_EDITOR);

  const [creditNoteSearch, setCreditNoteSearch] = useState("");
  const [creditNoteStatusFilter, setCreditNoteStatusFilter] = useState<"DRAFT" | "POSTED" | "">("");
  const [creditNoteCustomerFilter, setCreditNoteCustomerFilter] = useState("");
  const [selectedCreditNoteId, setSelectedCreditNoteId] = useState<string | null>(null);
  const [isCreditNoteEditorOpen, setIsCreditNoteEditorOpen] = useState(false);
  const [creditNoteEditor, setCreditNoteEditor] = useState<CreditNoteEditorState>(EMPTY_CREDIT_NOTE_EDITOR);

  const [receiptSearch, setReceiptSearch] = useState("");
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);
  const [isReceiptEditorOpen, setIsReceiptEditorOpen] = useState(false);
  const [receiptEditor, setReceiptEditor] = useState<ReceiptEditorState>(EMPTY_RECEIPT_EDITOR);

  const [allocationInvoiceId, setAllocationInvoiceId] = useState("");
  const [allocationReceiptId, setAllocationReceiptId] = useState("");
  const [allocationAmount, setAllocationAmount] = useState("");
  const [agingDate, setAgingDate] = useState(new Date().toISOString().slice(0, 10));

  const customersQuery = useQuery({
    queryKey: queryKeys.salesCustomers(token, { search: customerSearch, isActive: customerStatusFilter }),
    queryFn: () => getCustomers({ search: customerSearch, isActive: customerStatusFilter }, token),
  });

  const activeCustomersQuery = useQuery({
    queryKey: queryKeys.salesCustomers(token, { isActive: "true" }),
    queryFn: () => getCustomers({ isActive: "true" }, token),
    staleTime: 5 * 60 * 1000,
  });

  const receivableAccountsTreeQuery = useQuery({
    queryKey: queryKeys.accounts(token, { isActive: "true", type: "ASSET" }),
    queryFn: () => getAccountsTree({ isActive: "true", type: "ASSET" }, token),
    staleTime: 5 * 60 * 1000,
  });

  const revenueAccountsQuery = useQuery({
    queryKey: queryKeys.accounts(token, { isPosting: "true", isActive: "true", type: "REVENUE", view: "selector" }),
    queryFn: () => getAccountOptions({ isPosting: "true", isActive: "true", type: "REVENUE" }, token),
    staleTime: 5 * 60 * 1000,
  });

  const inventoryItemsQuery = useQuery({
    queryKey: queryKeys.inventoryItems(token, { isActive: "true", page: 1, limit: 100 }),
    queryFn: () => getInventoryItems({ isActive: "true", page: 1, limit: 100 }, token),
    staleTime: 5 * 60 * 1000,
  });

  const customerBalanceQuery = useQuery({
    queryKey: queryKeys.salesCustomerBalance(token, selectedCustomerId),
    queryFn: () => getCustomerBalance(selectedCustomerId!, token),
    enabled: Boolean(selectedCustomerId),
  });

  const customerTransactionsQuery = useQuery({
    queryKey: queryKeys.salesCustomerTransactions(token, selectedCustomerId),
    queryFn: () => getCustomerTransactions(selectedCustomerId!, token),
    enabled: Boolean(selectedCustomerId),
  });

  const quotationsQuery = useQuery({
    queryKey: queryKeys.salesQuotations(token, { search: quotationSearch, status: quotationStatusFilter || undefined }),
    queryFn: () => getSalesQuotations({ search: quotationSearch, status: quotationStatusFilter || undefined }, token),
  });

  const salesOrdersQuery = useQuery({
    queryKey: queryKeys.salesOrders(token, { search: orderSearch, status: orderStatusFilter || undefined }),
    queryFn: () => getSalesOrders({ search: orderSearch, status: orderStatusFilter || undefined }, token),
  });

  const invoicesQuery = useQuery({
    queryKey: queryKeys.salesInvoices(token, {
      search: invoiceSearch,
      status: invoiceStatusFilter,
      customerId: invoiceCustomerFilter || undefined,
    }),
    queryFn: () =>
      getSalesInvoices(
        {
          search: invoiceSearch,
          status: invoiceStatusFilter,
          customerId: invoiceCustomerFilter || undefined,
        },
        token,
      ),
  });

  const postedInvoicesQuery = useQuery({
    queryKey: queryKeys.salesInvoices(token, { status: "POSTED" }),
    queryFn: () => getSalesInvoices({ status: "POSTED" }, token),
    staleTime: 30_000,
  });

  const creditNotesQuery = useQuery({
    queryKey: queryKeys.salesCreditNotes(token, {
      search: creditNoteSearch,
      status: creditNoteStatusFilter,
      customerId: creditNoteCustomerFilter || undefined,
    }),
    queryFn: () =>
      getCreditNotes(
        {
          search: creditNoteSearch,
          status: creditNoteStatusFilter,
          customerId: creditNoteCustomerFilter || undefined,
        },
        token,
      ),
  });

  const postedReceiptsQuery = useQuery({
    queryKey: queryKeys.bankCashTransactions(token, { kind: "RECEIPT", status: "POSTED" }),
    queryFn: () => getBankCashTransactions({ kind: "RECEIPT", status: "POSTED" }, token),
    staleTime: 30_000,
  });

  const customerReceiptsQuery = useQuery({
    queryKey: queryKeys.salesReceipts(token, { search: receiptSearch }),
    queryFn: () => getCustomerReceipts({ search: receiptSearch }, token),
    staleTime: 30_000,
  });

  const bankCashAccountsQuery = useQuery({
    queryKey: queryKeys.bankCashAccounts(token, { isActive: "true" }),
    queryFn: () => getBankCashAccounts({ isActive: "true" }, token),
    staleTime: 5 * 60 * 1000,
  });

  const agingQuery = useQuery({
    queryKey: queryKeys.salesAging(token, agingDate),
    queryFn: () => getAgingReport(agingDate, token),
  });

  const createCustomerMutation = useMutation({
    mutationFn: () =>
      createCustomer(
        {
          name: customerEditor.name,
          contactInfo: customerEditor.contactInfo || undefined,
          taxInfo: customerEditor.taxInfo || undefined,
          salesRepresentative: customerEditor.salesRepresentative || undefined,
          paymentTerms: customerEditor.paymentTerms || undefined,
          creditLimit: Number(customerEditor.creditLimit || 0),
          receivableAccountId: customerEditor.receivableAccountId,
        },
        token,
      ),
    onSuccess: async (created) => {
      await invalidateSalesReceivables(queryClient);
      setSelectedCustomerId(created.id);
      setIsCustomerEditorOpen(false);
      setCustomerEditor(EMPTY_CUSTOMER_EDITOR);
    },
  });

  const updateCustomerMutation = useMutation({
    mutationFn: () =>
      updateCustomer(
        customerEditor.id!,
        {
          name: customerEditor.name,
          contactInfo: customerEditor.contactInfo || "",
          taxInfo: customerEditor.taxInfo || "",
          salesRepresentative: customerEditor.salesRepresentative || "",
          paymentTerms: customerEditor.paymentTerms || "",
          creditLimit: Number(customerEditor.creditLimit || 0),
          receivableAccountId: customerEditor.receivableAccountId,
        },
        token,
      ),
    onSuccess: async (updated) => {
      await invalidateSalesReceivables(queryClient);
      setSelectedCustomerId(updated.id);
      setIsCustomerEditorOpen(false);
    },
  });

  const deactivateCustomerMutation = useMutation({
    mutationFn: (id: string) => deactivateCustomer(id, token),
    onSuccess: async (updated) => {
      await invalidateSalesReceivables(queryClient);
      setSelectedCustomerId(updated.id);
    },
  });

  const createQuotationMutation = useMutation({
    mutationFn: () =>
      createSalesQuotation(
        {
          reference: quotationEditor.reference || undefined,
          quotationDate: quotationEditor.quotationDate,
          validityDate: quotationEditor.validityDate,
          currencyCode: quotationEditor.currencyCode || undefined,
          customerId: quotationEditor.customerId,
          description: quotationEditor.description || undefined,
          lines: mapSalesLines(quotationEditor.lines),
        },
        token,
      ),
    onSuccess: async () => {
      await invalidateSalesReceivables(queryClient);
    },
  });

  const updateQuotationMutation = useMutation({
    mutationFn: () =>
      updateSalesQuotation(
        quotationEditor.id!,
        {
          reference: quotationEditor.reference || undefined,
          quotationDate: quotationEditor.quotationDate,
          validityDate: quotationEditor.validityDate,
          currencyCode: quotationEditor.currencyCode || undefined,
          customerId: quotationEditor.customerId,
          description: quotationEditor.description || undefined,
          lines: mapSalesLines(quotationEditor.lines),
        },
        token,
      ),
    onSuccess: async () => {
      await invalidateSalesReceivables(queryClient);
    },
  });

  const approveQuotationMutation = useMutation({
    mutationFn: (id: string) => approveSalesQuotation(id, token),
    onSuccess: async (updated) => {
      await invalidateSalesReceivables(queryClient);
      setSelectedQuotationId(updated.id);
    },
  });

  const cancelQuotationMutation = useMutation({
    mutationFn: (id: string) => cancelSalesQuotation(id, token),
    onSuccess: async (updated) => {
      await invalidateSalesReceivables(queryClient);
      setSelectedQuotationId(updated.id);
    },
  });

  const saveQuotationDraft = async () => {
    const validationError = validateQuotationEditorState(quotationEditor, t);
    if (validationError) {
      setQuotationEditorClientError(validationError);
      return null;
    }

    setQuotationEditorClientError(null);

    try {
      const savedQuotation = quotationEditor.id
        ? await updateQuotationMutation.mutateAsync()
        : await createQuotationMutation.mutateAsync();

      setSelectedQuotationId(savedQuotation.id);
      setIsQuotationEditorOpen(false);
      setQuotationEditorClientError(null);
      setQuotationEditor(createEmptyQuotationEditor());
      return savedQuotation;
    } catch {
      return null;
    }
  };

  const approveQuotationFromEditor = async () => {
    const validationError = validateQuotationEditorState(quotationEditor, t);
    if (validationError) {
      setQuotationEditorClientError(validationError);
      return;
    }

    setQuotationEditorClientError(null);

    try {
      const savedQuotation = quotationEditor.id
        ? await updateQuotationMutation.mutateAsync()
        : await createQuotationMutation.mutateAsync();
      const approvedQuotation = await approveQuotationMutation.mutateAsync(savedQuotation.id);

      setSelectedQuotationId(approvedQuotation.id);
      setIsQuotationEditorOpen(false);
      setQuotationEditorClientError(null);
      setQuotationEditor(createEmptyQuotationEditor());
    } catch {
      // Keep modal open and let mutation error surface in the existing error UI.
    }
  };

  const convertQuotationToOrderMutation = useMutation({
    mutationFn: (quotationId: string) => {
      const quotation = quotations.find((row) => row.id === quotationId);
      return convertQuotationToOrder(
        quotationId,
        {
          orderDate: new Date().toISOString().slice(0, 10),
          promisedDate: "",
          customerId: quotation?.customer.id ?? "",
          currencyCode: quotation?.currencyCode ?? "JOD",
          sourceQuotationId: quotationId,
          shippingDetails: "",
          description: quotation?.description ?? "",
          lines: (quotation?.lines ?? []).map(mapLineForConversion),
        },
        token,
      );
    },
    onSuccess: async (created) => {
      await invalidateSalesReceivables(queryClient);
      setSelectedOrderId(created.id);
      setActiveTab("orders");
    },
  });

  const convertQuotationToInvoiceMutation = useMutation({
    mutationFn: (quotationId: string) => {
      const quotation = quotations.find((row) => row.id === quotationId);
      return convertQuotationToInvoice(
        quotationId,
        {
          invoiceDate: new Date().toISOString().slice(0, 10),
          dueDate: "",
          customerId: quotation?.customer.id ?? "",
          currencyCode: quotation?.currencyCode ?? "JOD",
          sourceQuotationId: quotationId,
          description: quotation?.description ?? "",
          lines: (quotation?.lines ?? []).map(mapLineForConversion),
        },
        token,
      );
    },
    onSuccess: async (created) => {
      await invalidateSalesReceivables(queryClient);
      setSelectedInvoiceId(created.id);
      setActiveTab("invoices");
    },
  });

  const createOrderMutation = useMutation({
    mutationFn: () =>
      createSalesOrder(
        {
          reference: orderEditor.reference || undefined,
          orderDate: orderEditor.orderDate,
          promisedDate: orderEditor.promisedDate || undefined,
          currencyCode: orderEditor.currencyCode || undefined,
          customerId: orderEditor.customerId,
          sourceQuotationId: orderEditor.sourceQuotationId || undefined,
          shippingDetails: orderEditor.shippingDetails || undefined,
          description: orderEditor.description || undefined,
          lines: mapSalesLines(orderEditor.lines),
        },
        token,
      ),
    onSuccess: async (created) => {
      await invalidateSalesReceivables(queryClient);
      setSelectedOrderId(created.id);
      setIsOrderEditorOpen(false);
      setOrderEditor(EMPTY_ORDER_EDITOR());
    },
  });

  const updateOrderMutation = useMutation({
    mutationFn: () =>
      updateSalesOrder(
        orderEditor.id!,
        {
          reference: orderEditor.reference || undefined,
          orderDate: orderEditor.orderDate,
          promisedDate: orderEditor.promisedDate || undefined,
          currencyCode: orderEditor.currencyCode || undefined,
          customerId: orderEditor.customerId,
          sourceQuotationId: orderEditor.sourceQuotationId || undefined,
          shippingDetails: orderEditor.shippingDetails || undefined,
          description: orderEditor.description || undefined,
          lines: mapSalesLines(orderEditor.lines),
        },
        token,
      ),
    onSuccess: async (updated) => {
      await invalidateSalesReceivables(queryClient);
      setSelectedOrderId(updated.id);
      setIsOrderEditorOpen(false);
    },
  });

  const confirmOrderMutation = useMutation({
    mutationFn: (id: string) => confirmSalesOrder(id, token),
    onSuccess: async (updated) => {
      await invalidateSalesReceivables(queryClient);
      setSelectedOrderId(updated.id);
    },
  });

  const cancelOrderMutation = useMutation({
    mutationFn: (id: string) => cancelSalesOrder(id, token),
    onSuccess: async (updated) => {
      await invalidateSalesReceivables(queryClient);
      setSelectedOrderId(updated.id);
    },
  });

  const convertOrderToInvoiceMutation = useMutation({
    mutationFn: (orderId: string) => {
      const order = salesOrders.find((row) => row.id === orderId);
      return convertSalesOrderToInvoice(
        orderId,
        {
          invoiceDate: new Date().toISOString().slice(0, 10),
          dueDate: "",
          customerId: order?.customer.id ?? "",
          currencyCode: order?.currencyCode ?? "JOD",
          sourceQuotationId: order?.sourceQuotation?.id,
          sourceSalesOrderId: orderId,
          description: order?.description ?? "",
          lines: (order?.lines ?? []).map(mapLineForConversion),
        },
        token,
      );
    },
    onSuccess: async (created) => {
      await invalidateSalesReceivables(queryClient);
      setSelectedInvoiceId(created.id);
      setActiveTab("invoices");
    },
  });

  const createInvoiceMutation = useMutation({
    mutationFn: () =>
      createSalesInvoice(
        {
          reference: invoiceEditor.reference || undefined,
          invoiceDate: invoiceEditor.invoiceDate,
          dueDate: invoiceEditor.dueDate || undefined,
          currencyCode: invoiceEditor.currencyCode || undefined,
          customerId: invoiceEditor.customerId,
          description: invoiceEditor.description || undefined,
          lines: mapSalesLines(invoiceEditor.lines),
        },
        token,
      ),
    onSuccess: async (created) => {
      await invalidateSalesReceivables(queryClient);
      setSelectedInvoiceId(created.id);
      setIsInvoiceEditorOpen(false);
      setInvoiceEditor(EMPTY_INVOICE_EDITOR());
    },
  });

  const updateInvoiceMutation = useMutation({
    mutationFn: () =>
      updateSalesInvoice(
        invoiceEditor.id!,
        {
          reference: invoiceEditor.reference || undefined,
          invoiceDate: invoiceEditor.invoiceDate,
          dueDate: invoiceEditor.dueDate || undefined,
          currencyCode: invoiceEditor.currencyCode || undefined,
          customerId: invoiceEditor.customerId,
          description: invoiceEditor.description || undefined,
          lines: mapSalesLines(invoiceEditor.lines),
        },
        token,
      ),
    onSuccess: async (updated) => {
      await invalidateSalesReceivables(queryClient);
      setSelectedInvoiceId(updated.id);
      setIsInvoiceEditorOpen(false);
    },
  });

  const postInvoiceMutation = useMutation({
    mutationFn: (id: string) => postSalesInvoice(id, token),
    onSuccess: async (updated) => {
      await invalidateSalesReceivables(queryClient);
      setSelectedInvoiceId(updated.id);
      setSelectedCustomerId(updated.customer.id);
    },
  });

  const createCreditNoteMutation = useMutation({
    mutationFn: () =>
      createCreditNote(
        {
          reference: creditNoteEditor.reference || undefined,
          noteDate: creditNoteEditor.noteDate,
          currencyCode: creditNoteEditor.currencyCode || undefined,
          customerId: creditNoteEditor.customerId,
          salesInvoiceId: creditNoteEditor.salesInvoiceId || undefined,
          description: creditNoteEditor.description || undefined,
          lines: mapSalesLines(creditNoteEditor.lines),
        },
        token,
      ),
    onSuccess: async (created) => {
      await invalidateSalesReceivables(queryClient);
      setSelectedCreditNoteId(created.id);
      setIsCreditNoteEditorOpen(false);
      setCreditNoteEditor(EMPTY_CREDIT_NOTE_EDITOR());
    },
  });

  const updateCreditNoteMutation = useMutation({
    mutationFn: () =>
      updateCreditNote(
        creditNoteEditor.id!,
        {
          reference: creditNoteEditor.reference || undefined,
          noteDate: creditNoteEditor.noteDate,
          currencyCode: creditNoteEditor.currencyCode || undefined,
          customerId: creditNoteEditor.customerId,
          salesInvoiceId: creditNoteEditor.salesInvoiceId || undefined,
          description: creditNoteEditor.description || undefined,
          lines: mapSalesLines(creditNoteEditor.lines),
        },
        token,
      ),
    onSuccess: async (updated) => {
      await invalidateSalesReceivables(queryClient);
      setSelectedCreditNoteId(updated.id);
      setIsCreditNoteEditorOpen(false);
    },
  });

  const postCreditNoteMutation = useMutation({
    mutationFn: (id: string) => postCreditNote(id, token),
    onSuccess: async (updated) => {
      await invalidateSalesReceivables(queryClient);
      setSelectedCreditNoteId(updated.id);
      setSelectedCustomerId(updated.customer.id);
    },
  });

  const createReceiptMutation = useMutation({
    mutationFn: () =>
      createCustomerReceipt(
        {
          reference: receiptEditor.reference || undefined,
          receiptDate: receiptEditor.receiptDate,
          customerId: receiptEditor.customerId,
          amount: Number(receiptEditor.amount || 0),
          bankCashAccountId: receiptEditor.bankCashAccountId,
          description: receiptEditor.description || undefined,
        },
        token,
      ),
    onSuccess: async (created) => {
      await invalidateSalesReceivables(queryClient);
      setSelectedReceiptId(created.id);
      setIsReceiptEditorOpen(false);
      setReceiptEditor(EMPTY_RECEIPT_EDITOR());
    },
  });

  const allocateReceiptMutation = useMutation({
    mutationFn: () =>
      allocateReceipt(
        {
          salesInvoiceId: allocationInvoiceId,
          receiptTransactionId: allocationReceiptId,
          amount: Number(allocationAmount),
        },
        token,
      ),
    onSuccess: async () => {
      await invalidateSalesReceivables(queryClient);
      setAllocationAmount("");
    },
  });

  const customers = customersQuery.data ?? [];
  const receivableAccounts = useMemo(() => {
    const tree = receivableAccountsTreeQuery.data ?? [];
    const receivableRoot = findAccountTreeNode(
      tree,
      (node) =>
        node.code === "1200000" ||
        node.name.trim().toLowerCase() === "accounts receivable" ||
        node.nameAr?.trim() === "الحسابات المدينة",
    );

    if (!receivableRoot) {
      return [];
    }

    return flattenPostingAccounts(receivableRoot.children);
  }, [receivableAccountsTreeQuery.data]);
  const activeCustomers = activeCustomersQuery.data ?? [];
  const inventoryItems = (inventoryItemsQuery.data?.data ?? []).filter((item) => item.isActive);
  const quotations = quotationsQuery.data ?? [];
  const salesOrders = salesOrdersQuery.data ?? [];
  const invoices = invoicesQuery.data ?? [];
  const postedInvoices = postedInvoicesQuery.data ?? [];
  const openInvoices = postedInvoices.filter((invoice) => Number(invoice.outstandingAmount) > 0);
  const creditNotes = creditNotesQuery.data ?? [];
  const postedReceipts = (postedReceiptsQuery.data ?? []).filter((row) => row.kind === "RECEIPT");
  const customerReceipts = customerReceiptsQuery.data ?? [];

  const selectedCustomer = customers.find((row) => row.id === selectedCustomerId) ?? activeCustomers.find((row) => row.id === selectedCustomerId) ?? null;
  const selectedQuotation = quotations.find((row) => row.id === selectedQuotationId) ?? null;
  const selectedOrder = salesOrders.find((row) => row.id === selectedOrderId) ?? null;
  const selectedInvoice = invoices.find((row) => row.id === selectedInvoiceId) ?? postedInvoices.find((row) => row.id === selectedInvoiceId) ?? null;
  const selectedCreditNote = creditNotes.find((row) => row.id === selectedCreditNoteId) ?? null;
  const selectedReceipt = customerReceipts.find((row) => row.id === selectedReceiptId) ?? null;
  const selectedInvoiceForAllocation = openInvoices.find((row) => row.id === allocationInvoiceId) ?? null;

  const matchingCustomerInvoices = useMemo(
    () => postedInvoices.filter((invoice) => invoice.customer.id === creditNoteEditor.customerId),
    [creditNoteEditor.customerId, postedInvoices],
  );

  const matchingCustomerQuotations = useMemo(
    () => quotations.filter((quotation) => quotation.customer.id === orderEditor.customerId && quotation.status === "APPROVED"),
    [orderEditor.customerId, quotations],
  );

  const currentError =
    inventoryItemsQuery.error ??
    createCustomerMutation.error ??
    updateCustomerMutation.error ??
    deactivateCustomerMutation.error ??
    createQuotationMutation.error ??
    updateQuotationMutation.error ??
    approveQuotationMutation.error ??
    cancelQuotationMutation.error ??
    createOrderMutation.error ??
    updateOrderMutation.error ??
    confirmOrderMutation.error ??
    cancelOrderMutation.error ??
    createInvoiceMutation.error ??
    updateInvoiceMutation.error ??
    postInvoiceMutation.error ??
    createCreditNoteMutation.error ??
    updateCreditNoteMutation.error ??
    postCreditNoteMutation.error ??
    createReceiptMutation.error ??
    allocateReceiptMutation.error;

  const errorMessage = currentError instanceof Error ? currentError.message : null;
  const tabs: Array<{ id: SalesTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: "customers", label: t("salesReceivables.tab.customers"), icon: Users },
    { id: "quotations", label: t("salesReceivables.tab.quotations"), icon: FilePlus },
    { id: "orders", label: t("salesReceivables.tab.orders"), icon: ScrollText },
    { id: "invoices", label: t("salesReceivables.tab.invoices"), icon: FileText },
    { id: "receipts", label: t("salesReceivables.tab.receipts"), icon: ReceiptText },
    { id: "credit-notes", label: t("salesReceivables.tab.creditNotes"), icon: FileMinus },
    { id: "allocations", label: t("salesReceivables.tab.allocations"), icon: Handshake },
    { id: "aging", label: t("salesReceivables.tab.aging"), icon: BookText },
  ];

  return (
    <div className="space-y-8">
      <SectionHeading
        title={t("salesReceivables.title")}
        description={t("salesReceivables.description")}
      />

      <div className="flex flex-wrap gap-3">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
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

      {errorMessage ? <Card className="border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{errorMessage}</Card> : null}

      {activeTab === "customers" ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <SummaryCard label={t("salesReceivables.summary.customers")} value={customers.length} hint={t("salesReceivables.hint.currentFilteredList")} />
            <SummaryCard label={t("salesReceivables.summary.active")} value={customers.filter((row) => row.isActive).length} hint={t("salesReceivables.hint.availableForNewTransactions")} />
            <SummaryCard
              label={t("salesReceivables.summary.receivableBalances")}
              value={formatCurrency(customers.reduce((sum, row) => sum + Number(row.currentBalance), 0))}
              hint={t("salesReceivables.hint.runningCustomerBalances")}
            />
          </div>

          <Card className="p-5">
            <div className="grid gap-4 lg:grid-cols-[1.2fr_0.5fr_auto]">
              <Input value={customerSearch} onChange={(event) => setCustomerSearch(event.target.value)} placeholder={t("salesReceivables.filters.searchCustomers")} />
              <Select value={customerStatusFilter} onChange={(event) => setCustomerStatusFilter(event.target.value as "true" | "false" | "")}>
                <option value="">{t("salesReceivables.filters.allStatuses")}</option>
                <option value="true">{t("salesReceivables.filters.activeOnly")}</option>
                <option value="false">{t("salesReceivables.filters.inactiveOnly")}</option>
              </Select>
              <Button className="gap-2" onClick={() => {
                setCustomerEditor(EMPTY_CUSTOMER_EDITOR);
                setIsCustomerEditorOpen(true);
              }}>
                <CirclePlus className="h-4 w-4 shrink-0" />
                {t("salesReceivables.action.newCustomer")}
              </Button>
            </div>
          </Card>

          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <Card className="overflow-hidden p-0">
              <div className="border-b border-gray-200 px-6 py-4">
                <div className="text-sm font-bold text-gray-900">{t("salesReceivables.section.customerMasterRecords")}</div>
                <div className="text-xs text-gray-500">{t("salesReceivables.section.customerMasterRecordsDescription")}</div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] table-fixed text-sm">
                  <colgroup>
                    <col className="w-[230px]" />
                    <col className="w-[210px]" />
                    <col className="w-[150px]" />
                    <col className="w-[150px]" />
                    <col className="w-[115px]" />
                    <col className="w-[155px]" />
                  </colgroup>
                  <thead className="bg-gray-50">
                    <tr>
                      <TableHead className="text-center">{t("common.table.code")}</TableHead>
                      <TableHead>{t("common.table.name")}</TableHead>
                      <TableHead>{t("salesReceivables.field.terms")}</TableHead>
                      <TableHead className="text-end">{t("salesReceivables.metric.creditLimit")}</TableHead>
                      <TableHead className="text-center">{t("common.table.status")}</TableHead>
                      <TableHead className="text-center">{t("common.table.actions")}</TableHead>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-500">
                          {t("salesReceivables.empty.customers")}
                        </td>
                      </tr>
                    ) : (
                      customers.map((row) => (
                        <tr key={row.id} className={cn("border-t border-gray-100 transition-colors hover:bg-gray-50", selectedCustomer?.id === row.id && "bg-gray-50")}>
                          <td dir="ltr" className="px-4 py-4 text-center align-top">
                            <button
                              type="button"
                              className="inline-flex max-w-full rounded-full bg-slate-100 px-2.5 py-1 font-mono text-[11px] font-bold text-slate-700 transition hover:bg-slate-200"
                              onClick={() => setSelectedCustomerId(row.id)}
                            >
                              <span className="truncate">{row.code}</span>
                            </button>
                          </td>
                          <td className="px-6 py-4 align-top text-start">
                            <div className="font-semibold text-gray-900">{row.name}</div>
                            <div className="text-xs text-gray-500">{row.contactInfo || t("salesReceivables.empty.customerContact")}</div>
                          </td>
                          <td className="px-6 py-4 align-top text-start text-gray-700">{row.paymentTerms || t("salesReceivables.empty.notSet")}</td>
                          <td className="px-6 py-4 text-end align-top font-mono font-bold tabular-nums text-gray-900">{formatCurrency(row.creditLimit)}</td>
                          <td className="px-6 py-4 text-center align-top">
                            <StatusPill label={row.isActive ? t("salesReceivables.status.active") : t("salesReceivables.status.inactive")} tone={row.isActive ? "positive" : "neutral"} />
                          </td>
                          <td className="px-4 py-4 align-top">
                            <div className="flex flex-wrap justify-center gap-2">
                              {row.isActive ? (
                                <>
                                  <button
                                    type="button"
                                    className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50"
                                    onClick={() => {
                                      setCustomerEditor({
                                        id: row.id,
                                        code: row.code,
                                        name: row.name,
                                        contactInfo: row.contactInfo ?? "",
                                        taxInfo: row.taxInfo ?? "",
                                        salesRepresentative: row.salesRepresentative ?? "",
                                        paymentTerms: row.paymentTerms ?? "",
                                        creditLimit: row.creditLimit,
                                        receivableAccountId: row.receivableAccount.id,
                                      });
                                      setIsCustomerEditorOpen(true);
                                    }}
                                  >
                                    {t("salesReceivables.action.edit")}
                                  </button>
                                  <button
                                    type="button"
                                    className="rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 hover:bg-amber-100"
                                    onClick={() => {
                                      if (window.confirm(t("salesReceivables.confirm.deactivateCustomer", { name: row.name }))) {
                                        deactivateCustomerMutation.mutate(row.id);
                                      }
                                    }}
                                  >
                                    {t("salesReceivables.action.deactivate")}
                                  </button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50"
                                  onClick={() => setSelectedCustomerId(row.id)}
                                >
                                  {t("salesReceivables.action.view")}
                                </button>
                              )}
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
              <div>
                <div className="text-lg font-bold text-gray-900">{selectedCustomer?.name ?? t("salesReceivables.section.customerDetails")}</div>
                <div className="text-sm text-gray-500">
                  {selectedCustomer ? `${selectedCustomer.code} · ${selectedCustomer.receivableAccount.code} ${selectedCustomer.receivableAccount.name}` : t("salesReceivables.section.customerDetailsEmpty")}
                </div>
              </div>

              {selectedCustomer ? (
                <>
                  <div className="grid gap-3 md:grid-cols-2">
                    <MiniMetric label={t("salesReceivables.metric.currentBalance")} value={customerBalanceQuery.data ? formatCurrency(customerBalanceQuery.data.currentBalance) : "—"} />
                    <MiniMetric label={t("salesReceivables.metric.outstanding")} value={customerBalanceQuery.data ? formatCurrency(customerBalanceQuery.data.outstandingBalance) : "—"} />
                    <MiniMetric label={t("salesReceivables.metric.creditLimit")} value={customerBalanceQuery.data ? formatCurrency(customerBalanceQuery.data.creditLimit) : "—"} />
                    <MiniMetric label={t("salesReceivables.metric.availableCredit")} value={customerBalanceQuery.data ? formatCurrency(customerBalanceQuery.data.availableCredit) : "—"} />
                  </div>

                  <div className="space-y-3">
                    <div className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">{t("salesReceivables.section.customerTransactions")}</div>
                    <div className="space-y-3">
                      {(customerTransactionsQuery.data ?? []).length === 0 ? (
                        <div className="rounded-xl border border-dashed border-gray-200 px-4 py-5 text-sm text-gray-500">
                          {t("salesReceivables.empty.noPostedCustomerTransactions")}
                        </div>
                      ) : (
                        (customerTransactionsQuery.data ?? []).map((item) => (
                          <div key={item.id} className="rounded-xl border border-gray-200 px-4 py-4">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <div className="text-sm font-bold text-gray-900">{item.reference}</div>
                                <div className="text-xs uppercase tracking-[0.18em] text-gray-500">{item.type.replaceAll("_", " ")}</div>
                              </div>
                              <div className="text-right">
                                <div className="font-mono text-sm font-bold text-gray-900">{formatCurrency(item.amount)}</div>
                                <div className="text-xs text-gray-500">{formatDate(item.date)}</div>
                              </div>
                            </div>
                            {"outstandingAmount" in item ? (
                              <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-600">
                                <span>{t("salesReceivables.transaction.allocated", { amount: formatCurrency(item.allocatedAmount) })}</span>
                                <span>{t("salesReceivables.transaction.outstanding", { amount: formatCurrency(item.outstandingAmount) })}</span>
                              </div>
                            ) : null}
                            {"salesInvoiceReference" in item ? (
                              <div className="mt-3 text-xs text-gray-600">{t("salesReceivables.transaction.appliedToInvoice", { reference: item.salesInvoiceReference })}</div>
                            ) : null}
                            {"description" in item && item.description ? <div className="mt-3 text-sm text-gray-600">{item.description}</div> : null}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-sm text-gray-500">{t("salesReceivables.empty.customerTransactionPrompt")}</div>
              )}
            </Card>
          </div>
        </div>
      ) : null}

      {activeTab === "quotations" ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <SummaryCard label={t("salesReceivables.summary.quotations")} value={quotations.length} hint={t("salesReceivables.hint.currentFilteredList")} />
            <SummaryCard label={t("salesReceivables.summary.approved")} value={quotations.filter((row) => row.status === "APPROVED").length} hint={t("salesReceivables.hint.readyForConversion")} />
            <SummaryCard label={t("salesReceivables.summary.quotedValue")} value={formatCurrency(quotations.reduce((sum, row) => sum + Number(row.totalAmount), 0))} hint={t("salesReceivables.hint.totalQuotedAmount")} />
          </div>

          <Card className="p-5">
            <div className="grid gap-4 lg:grid-cols-[1.2fr_0.5fr_auto]">
              <Input value={quotationSearch} onChange={(event) => setQuotationSearch(event.target.value)} placeholder={t("salesReceivables.filters.searchQuotations")} />
              <Select value={quotationStatusFilter} onChange={(event) => setQuotationStatusFilter(event.target.value)}>
                <option value="">{t("salesReceivables.filters.allStatuses")}</option>
                <option value="DRAFT">{t("salesReceivables.status.draft")}</option>
                <option value="APPROVED">{t("salesReceivables.status.approved")}</option>
                <option value="EXPIRED">{t("salesReceivables.status.expired")}</option>
                <option value="CONVERTED">{t("salesReceivables.status.converted")}</option>
                <option value="CANCELLED">{t("salesReceivables.status.cancelled")}</option>
              </Select>
              <Button className="gap-2" onClick={() => { setQuotationEditorClientError(null); setQuotationEditor(createEmptyQuotationEditor()); setIsQuotationEditorOpen(true); }}>
                <CirclePlus className="h-4 w-4 shrink-0" />
                {t("salesReceivables.action.newQuotation")}
              </Button>
            </div>
          </Card>

          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <Card className="overflow-hidden p-0">
              <div className="border-b border-gray-200 px-6 py-4">
                <div className="text-sm font-bold text-gray-900">{t("salesReceivables.section.quotations")}</div>
                <div className="text-xs text-gray-500">{t("salesReceivables.section.quotationsDescription")}</div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <TableHead>{t("salesReceivables.field.reference")}</TableHead>
                      <TableHead>{t("salesReceivables.field.customer")}</TableHead>
                      <TableHead>{t("salesReceivables.field.quotationDate")}</TableHead>
                      <TableHead>{t("salesReceivables.field.validUntil")}</TableHead>
                      <TableHead className="text-right">{t("salesReceivables.field.total")}</TableHead>
                      <TableHead className="text-center">{t("salesReceivables.field.status")}</TableHead>
                      <TableHead className="text-right">{t("salesReceivables.field.actions")}</TableHead>
                    </tr>
                  </thead>
                  <tbody>
                    {quotations.length === 0 ? (
                      <tr><td colSpan={7} className="px-6 py-10 text-center text-sm text-gray-500">{t("salesReceivables.empty.quotations")}</td></tr>
                    ) : quotations.map((row) => (
                      <tr key={row.id} className={cn("border-t border-gray-100 hover:bg-gray-50", selectedQuotation?.id === row.id && "bg-gray-50")}>
                        <td className="px-6 py-4"><button type="button" className="text-left font-bold text-gray-900" onClick={() => setSelectedQuotationId(row.id)}>{row.reference}</button></td>
                        <td className="px-6 py-4"><div className="font-semibold text-gray-900">{row.customer.name}</div><div className="text-xs text-gray-500">{row.customer.code}</div></td>
                        <td className="px-6 py-4">{formatDate(row.quotationDate)}</td>
                        <td className="px-6 py-4">{formatDate(row.validityDate)}</td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-gray-900">{formatCurrency(row.totalAmount)}</td>
                        <td className="px-6 py-4 text-center"><StatusPill label={row.status} tone={row.status === "APPROVED" ? "positive" : row.status === "DRAFT" ? "warning" : "neutral"} /></td>
                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-2">
                            {row.status === "DRAFT" ? (
                              <>
                                <button type="button" className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50" onClick={() => {
                                  setQuotationEditorClientError(null);
                                  setQuotationEditor({ id: row.id, reference: row.reference, quotationDate: row.quotationDate.slice(0, 10), validityDate: row.validityDate.slice(0, 10), currencyCode: row.currencyCode, customerId: row.customer.id, description: row.description ?? "", lines: row.lines.map(mapLineToEditor) });
                                  setIsQuotationEditorOpen(true);
                                }}>{t("salesReceivables.action.edit")}</button>
                                <button type="button" className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100" onClick={() => approveQuotationMutation.mutate(row.id)}>{t("salesReceivables.action.approve")}</button>
                                <button type="button" className="rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 hover:bg-amber-100" onClick={() => cancelQuotationMutation.mutate(row.id)}>{t("salesReceivables.action.cancelDocument")}</button>
                                <button type="button" className="rounded-md border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-700 hover:bg-sky-100" onClick={() => convertQuotationToOrderMutation.mutate(row.id)}>{t("salesReceivables.action.toOrder")}</button>
                                <button type="button" className="rounded-md border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100" onClick={() => convertQuotationToInvoiceMutation.mutate(row.id)}>{t("salesReceivables.action.toInvoice")}</button>
                              </>
                            ) : row.status === "APPROVED" ? (
                              <>
                                <button type="button" className="rounded-md border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-700 hover:bg-sky-100" onClick={() => convertQuotationToOrderMutation.mutate(row.id)}>{t("salesReceivables.action.toOrder")}</button>
                                <button type="button" className="rounded-md border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100" onClick={() => convertQuotationToInvoiceMutation.mutate(row.id)}>{t("salesReceivables.action.toInvoice")}</button>
                              </>
                            ) : <button type="button" className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50" onClick={() => setSelectedQuotationId(row.id)}>{t("salesReceivables.action.view")}</button>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card className="space-y-5">
              <div>
                <div className="text-lg font-bold text-gray-900">{selectedQuotation?.reference ?? t("salesReceivables.section.quotationDetails")}</div>
                <div className="text-sm text-gray-500">{selectedQuotation ? `${selectedQuotation.customer.code} · ${selectedQuotation.customer.name}` : t("salesReceivables.section.quotationDetailsEmpty")}</div>
              </div>
              {selectedQuotation ? (
                <>
                  <div className="grid gap-3 md:grid-cols-2">
                    <MiniMetric label={t("salesReceivables.field.total")} value={formatCurrency(selectedQuotation.totalAmount)} />
                    <MiniMetric label={t("salesReceivables.field.status")} value={selectedQuotation.status} />
                    <MiniMetric label={t("salesReceivables.field.validUntil")} value={formatDate(selectedQuotation.validityDate)} />
                    <MiniMetric label={t("salesReceivables.field.lines")} value={String(selectedQuotation.lines.length)} />
                  </div>
                  <div className="space-y-3">
                    <div className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">{t("salesReceivables.section.quotationLines")}</div>
                    {selectedQuotation.lines.map((line) => (
                      <div key={line.id} className="rounded-xl border border-gray-200 px-4 py-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="text-sm font-bold text-gray-900">{line.description || line.itemName || `Line ${line.lineNumber}`}</div>
                            <div className="text-xs text-gray-500">{line.revenueAccount ? `${line.revenueAccount.code} · ${line.revenueAccount.name}` : t("salesReceivables.empty.revenueAccountOptional")}</div>
                          </div>
                          <div className="text-right font-mono text-sm font-bold text-gray-900">{formatCurrency(line.lineAmount)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : <div className="text-sm text-gray-500">{t("salesReceivables.section.quotationDetailsEmpty")}</div>}
            </Card>
          </div>
        </div>
      ) : null}

      {activeTab === "orders" ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <SummaryCard label={t("salesReceivables.summary.orders")} value={salesOrders.length} hint={t("salesReceivables.hint.currentFilteredList")} />
            <SummaryCard label={t("salesReceivables.summary.confirmed")} value={salesOrders.filter((row) => row.status === "CONFIRMED").length} hint={t("salesReceivables.hint.readyToInvoice")} />
            <SummaryCard label={t("salesReceivables.summary.orderValue")} value={formatCurrency(salesOrders.reduce((sum, row) => sum + Number(row.totalAmount), 0))} hint={t("salesReceivables.hint.totalOrderAmount")} />
          </div>
          <Card className="p-5">
            <div className="grid gap-4 lg:grid-cols-[1.2fr_0.5fr_auto]">
              <Input value={orderSearch} onChange={(event) => setOrderSearch(event.target.value)} placeholder={t("salesReceivables.filters.searchOrders")} />
              <Select value={orderStatusFilter} onChange={(event) => setOrderStatusFilter(event.target.value)}>
                <option value="">{t("salesReceivables.filters.allStatuses")}</option>
                <option value="DRAFT">{t("salesReceivables.status.draft")}</option>
                <option value="CONFIRMED">{t("salesReceivables.status.confirmed")}</option>
                <option value="PARTIALLY_INVOICED">{t("salesReceivables.status.partiallyInvoiced")}</option>
                <option value="FULLY_INVOICED">{t("salesReceivables.status.fullyInvoiced")}</option>
                <option value="CANCELLED">{t("salesReceivables.status.cancelled")}</option>
              </Select>
              <Button className="gap-2" onClick={() => { setOrderEditor(EMPTY_ORDER_EDITOR()); setIsOrderEditorOpen(true); }}>
                <CirclePlus className="h-4 w-4 shrink-0" />
                {t("salesReceivables.action.newOrder")}
              </Button>
            </div>
          </Card>
          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <Card className="overflow-hidden p-0">
              <div className="border-b border-gray-200 px-6 py-4">
                <div className="text-sm font-bold text-gray-900">{t("salesReceivables.section.orders")}</div>
                <div className="text-xs text-gray-500">{t("salesReceivables.section.ordersDescription")}</div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <TableHead>{t("salesReceivables.field.reference")}</TableHead>
                      <TableHead>{t("salesReceivables.field.customer")}</TableHead>
                      <TableHead>{t("salesReceivables.field.orderDate")}</TableHead>
                      <TableHead>{t("salesReceivables.field.quotation")}</TableHead>
                      <TableHead className="text-right">{t("salesReceivables.field.total")}</TableHead>
                      <TableHead className="text-center">{t("salesReceivables.field.status")}</TableHead>
                      <TableHead className="text-right">{t("salesReceivables.field.actions")}</TableHead>
                    </tr>
                  </thead>
                  <tbody>
                    {salesOrders.length === 0 ? (
                      <tr><td colSpan={7} className="px-6 py-10 text-center text-sm text-gray-500">{t("salesReceivables.empty.orders")}</td></tr>
                    ) : salesOrders.map((row) => (
                      <tr key={row.id} className={cn("border-t border-gray-100 hover:bg-gray-50", selectedOrder?.id === row.id && "bg-gray-50")}>
                        <td className="px-6 py-4"><button type="button" className="text-left font-bold text-gray-900" onClick={() => setSelectedOrderId(row.id)}>{row.reference}</button></td>
                        <td className="px-6 py-4"><div className="font-semibold text-gray-900">{row.customer.name}</div><div className="text-xs text-gray-500">{row.customer.code}</div></td>
                        <td className="px-6 py-4">{formatDate(row.orderDate)}</td>
                        <td className="px-6 py-4 text-gray-700">{row.sourceQuotation?.reference ?? t("salesReceivables.empty.manual")}</td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-gray-900">{formatCurrency(row.totalAmount)}</td>
                        <td className="px-6 py-4 text-center"><StatusPill label={row.status} tone={row.status === "CONFIRMED" || row.status === "FULLY_INVOICED" ? "positive" : row.status === "DRAFT" ? "warning" : "neutral"} /></td>
                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-2">
                            {row.status === "DRAFT" ? (
                              <>
                                <button type="button" className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50" onClick={() => {
                                  setOrderEditor({ id: row.id, reference: row.reference, orderDate: row.orderDate.slice(0, 10), promisedDate: row.promisedDate?.slice(0, 10) ?? "", currencyCode: row.currencyCode, customerId: row.customer.id, sourceQuotationId: row.sourceQuotation?.id ?? "", shippingDetails: row.shippingDetails ?? "", description: row.description ?? "", lines: row.lines.map(mapLineToEditor) });
                                  setIsOrderEditorOpen(true);
                                }}>{t("salesReceivables.action.edit")}</button>
                                <button type="button" className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100" onClick={() => confirmOrderMutation.mutate(row.id)}>{t("salesReceivables.action.confirm")}</button>
                                <button type="button" className="rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 hover:bg-amber-100" onClick={() => cancelOrderMutation.mutate(row.id)}>{t("salesReceivables.action.cancelDocument")}</button>
                              </>
                            ) : row.status === "CONFIRMED" || row.status === "PARTIALLY_INVOICED" ? (
                              <button type="button" className="rounded-md border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100" onClick={() => convertOrderToInvoiceMutation.mutate(row.id)}>{t("salesReceivables.action.toInvoice")}</button>
                            ) : <button type="button" className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50" onClick={() => setSelectedOrderId(row.id)}>{t("salesReceivables.action.view")}</button>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
            <Card className="space-y-5">
              <div>
                <div className="text-lg font-bold text-gray-900">{selectedOrder?.reference ?? t("salesReceivables.section.orderDetails")}</div>
                <div className="text-sm text-gray-500">{selectedOrder ? `${selectedOrder.customer.code} · ${selectedOrder.customer.name}` : t("salesReceivables.section.orderDetailsEmpty")}</div>
              </div>
              {selectedOrder ? (
                <>
                  <div className="grid gap-3 md:grid-cols-2">
                    <MiniMetric label={t("salesReceivables.field.total")} value={formatCurrency(selectedOrder.totalAmount)} />
                    <MiniMetric label={t("salesReceivables.field.status")} value={selectedOrder.status} />
                    <MiniMetric label={t("salesReceivables.field.quotation")} value={selectedOrder.sourceQuotation?.reference ?? t("salesReceivables.empty.manual")} />
                    <MiniMetric label={t("salesReceivables.field.invoices")} value={String(selectedOrder.salesInvoices.length)} />
                  </div>
                  <div className="space-y-3">
                    <div className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">{t("salesReceivables.section.orderLines")}</div>
                    {selectedOrder.lines.map((line) => (
                      <div key={line.id} className="rounded-xl border border-gray-200 px-4 py-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="text-sm font-bold text-gray-900">{line.description || line.itemName || `Line ${line.lineNumber}`}</div>
                          <div className="text-right font-mono text-sm font-bold text-gray-900">{formatCurrency(line.lineAmount)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : <div className="text-sm text-gray-500">{t("salesReceivables.section.orderDetailsEmpty")}</div>}
            </Card>
          </div>
        </div>
      ) : null}

      {activeTab === "invoices" ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <SummaryCard label={t("salesReceivables.summary.invoices")} value={invoices.length} hint={t("salesReceivables.hint.currentFilteredList")} />
            <SummaryCard label={t("salesReceivables.summary.drafts")} value={invoices.filter((row) => row.status === "DRAFT").length} hint={t("salesReceivables.hint.stillEditable")} />
            <SummaryCard
              label={t("salesReceivables.summary.outstanding")}
              value={formatCurrency(invoices.reduce((sum, row) => sum + Number(row.outstandingAmount), 0))}
              hint={t("salesReceivables.hint.receivableStillOpen")}
            />
          </div>

          <Card className="p-5">
            <div className="grid gap-4 lg:grid-cols-[1.1fr_0.5fr_0.7fr_auto]">
              <Input value={invoiceSearch} onChange={(event) => setInvoiceSearch(event.target.value)} placeholder={t("salesReceivables.filters.searchInvoices")} />
              <Select value={invoiceStatusFilter} onChange={(event) => setInvoiceStatusFilter(event.target.value as SalesInvoiceStatus | "")}>
                <option value="">{t("salesReceivables.filters.allStatuses")}</option>
                <option value="DRAFT">{t("salesReceivables.status.draft")}</option>
                <option value="POSTED">{t("salesReceivables.status.posted")}</option>
                <option value="PARTIALLY_PAID">{t("salesReceivables.status.partiallyPaid")}</option>
                <option value="FULLY_PAID">{t("salesReceivables.status.fullyPaid")}</option>
                <option value="OVERDUE">{t("salesReceivables.status.overdue")}</option>
                <option value="CANCELLED">{t("salesReceivables.status.cancelled")}</option>
              </Select>
              <Select value={invoiceCustomerFilter} onChange={(event) => setInvoiceCustomerFilter(event.target.value)}>
                <option value="">{t("salesReceivables.filters.allCustomers")}</option>
                {activeCustomers.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.code} · {row.name}
                  </option>
                ))}
              </Select>
              <Button className="gap-2" onClick={() => {
                setInvoiceEditor(EMPTY_INVOICE_EDITOR());
                setIsInvoiceEditorOpen(true);
              }}>
                <CirclePlus className="h-4 w-4 shrink-0" />
                {t("salesReceivables.action.newInvoice")}
              </Button>
            </div>
          </Card>

          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <Card className="overflow-hidden p-0">
              <div className="border-b border-gray-200 px-6 py-4">
                <div className="text-sm font-bold text-gray-900">{t("salesReceivables.section.salesInvoices")}</div>
                <div className="text-xs text-gray-500">{t("salesReceivables.section.salesInvoicesDescription")}</div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <TableHead>{t("salesReceivables.field.reference")}</TableHead>
                      <TableHead>{t("salesReceivables.field.customer")}</TableHead>
                      <TableHead>{t("salesReceivables.field.date")}</TableHead>
                      <TableHead className="text-right">{t("salesReceivables.field.total")}</TableHead>
                      <TableHead className="text-right">{t("salesReceivables.metric.outstanding")}</TableHead>
                      <TableHead className="text-center">{t("salesReceivables.metric.status")}</TableHead>
                      <TableHead className="text-right">{t("salesReceivables.field.actions")}</TableHead>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-10 text-center text-sm text-gray-500">
                          {t("salesReceivables.empty.invoices")}
                        </td>
                      </tr>
                    ) : (
                      invoices.map((row) => (
                        <tr key={row.id} className={cn("border-t border-gray-100 hover:bg-gray-50", selectedInvoice?.id === row.id && "bg-gray-50")}>
                          <td className="px-6 py-4">
                            <button type="button" className="text-left" onClick={() => setSelectedInvoiceId(row.id)}>
                              <div className="font-bold text-gray-900">{row.reference}</div>
                              <div className="text-xs text-gray-500">{row.journalReference ?? t("salesReceivables.empty.noJournal")}</div>
                            </button>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-semibold text-gray-900">{row.customer.name}</div>
                            <div className="text-xs text-gray-500">{row.customer.code}</div>
                          </td>
                          <td className="px-6 py-4 text-gray-700">{formatDate(row.invoiceDate)}</td>
                          <td className="px-6 py-4 text-right font-mono font-bold text-gray-900">{formatCurrency(row.totalAmount)}</td>
                          <td className="px-6 py-4 text-right">
                            <div className="font-mono font-bold text-gray-900">{formatCurrency(row.outstandingAmount)}</div>
                            <div className="text-xs text-gray-500">{row.allocationStatus.replaceAll("_", " ")}</div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <StatusPill label={row.status} tone={row.status === "POSTED" ? "positive" : "warning"} />
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex justify-end gap-2">
                              {row.status === "DRAFT" ? (
                                <>
                                  <button
                                    type="button"
                                    className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50"
                                    onClick={() => {
                                      setInvoiceEditor({
                                        id: row.id,
                                        reference: row.reference,
                                        invoiceDate: row.invoiceDate.slice(0, 10),
                                        dueDate: row.dueDate?.slice(0, 10) ?? "",
                                        currencyCode: row.currencyCode,
                                        customerId: row.customer.id,
                                        description: row.description ?? "",
                                        lines: row.lines.map(mapLineToEditor),
                                      });
                                      setIsInvoiceEditorOpen(true);
                                    }}
                                  >
                                    {t("salesReceivables.action.edit")}
                                  </button>
                                  <button
                                    type="button"
                                    className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
                                    onClick={() => {
                                      if (window.confirm(t("salesReceivables.confirm.postInvoice", { reference: row.reference }))) {
                                        postInvoiceMutation.mutate(row.id);
                                      }
                                    }}
                                  >
                                    {t("salesReceivables.action.post")}
                                  </button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50"
                                  onClick={() => setSelectedInvoiceId(row.id)}
                                >
                                  {t("salesReceivables.action.view")}
                                </button>
                              )}
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
              <div>
                <div className="text-lg font-bold text-gray-900">{selectedInvoice?.reference ?? t("salesReceivables.section.invoiceDetails")}</div>
                <div className="text-sm text-gray-500">{selectedInvoice ? `${selectedInvoice.customer.code} · ${selectedInvoice.customer.name}` : t("salesReceivables.section.invoiceDetailsEmpty")}</div>
              </div>
              {selectedInvoice ? (
                <>
                  <div className="grid gap-3 md:grid-cols-2">
                    <MiniMetric label={t("salesReceivables.metric.invoiceTotal")} value={formatCurrency(selectedInvoice.totalAmount)} />
                    <MiniMetric label={t("salesReceivables.metric.outstanding")} value={formatCurrency(selectedInvoice.outstandingAmount)} />
                    <MiniMetric label={t("salesReceivables.metric.allocated")} value={formatCurrency(selectedInvoice.allocatedAmount)} />
                    <MiniMetric label={t("salesReceivables.metric.status")} value={selectedInvoice.status} />
                  </div>

                  <div className="space-y-3">
                    <div className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">{t("salesReceivables.section.documentLines")}</div>
                    {selectedInvoice.lines.map((line) => (
                      <div key={line.id} className="rounded-xl border border-gray-200 px-4 py-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="text-sm font-bold text-gray-900">{line.description || `Line ${line.lineNumber}`}</div>
                            <div className="text-xs text-gray-500">
                              {line.revenueAccount ? `${line.revenueAccount.code} · ${line.revenueAccount.name}` : "No revenue account"}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-mono text-sm font-bold text-gray-900">{formatCurrency(line.lineAmount)}</div>
                            <div className="text-xs text-gray-500">
                              Qty {line.quantity} × {formatCurrency(line.unitPrice)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-sm text-gray-500">{t("salesReceivables.section.invoiceDetailsEmpty")}</div>
              )}
            </Card>
          </div>
        </div>
      ) : null}

      {activeTab === "receipts" ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <SummaryCard label={t("salesReceivables.summary.receipts")} value={customerReceipts.length} hint={t("salesReceivables.hint.postedCustomerReceipts")} />
            <SummaryCard label={t("salesReceivables.summary.unapplied")} value={formatCurrency(customerReceipts.reduce((sum, row) => sum + Number(row.unappliedAmount), 0))} hint={t("salesReceivables.hint.availableToAllocate")} />
            <SummaryCard label={t("salesReceivables.summary.allocated")} value={formatCurrency(customerReceipts.reduce((sum, row) => sum + Number(row.allocatedAmount), 0))} hint={t("salesReceivables.hint.matchedToInvoices")} />
          </div>
          <Card className="p-5">
            <div className="grid gap-4 lg:grid-cols-[1.2fr_auto]">
              <Input value={receiptSearch} onChange={(event) => setReceiptSearch(event.target.value)} placeholder={t("salesReceivables.filters.searchReceipts")} />
              <Button className="gap-2" onClick={() => { setReceiptEditor(EMPTY_RECEIPT_EDITOR()); setIsReceiptEditorOpen(true); }}>
                <CirclePlus className="h-4 w-4 shrink-0" />
                {t("salesReceivables.action.newReceipt")}
              </Button>
            </div>
          </Card>
          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <Card className="overflow-hidden p-0">
              <div className="border-b border-gray-200 px-6 py-4">
                <div className="text-sm font-bold text-gray-900">{t("salesReceivables.section.receipts")}</div>
                <div className="text-xs text-gray-500">{t("salesReceivables.section.receiptsDescription")}</div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <TableHead>{t("salesReceivables.field.reference")}</TableHead>
                      <TableHead>{t("salesReceivables.field.customer")}</TableHead>
                      <TableHead>{t("salesReceivables.field.date")}</TableHead>
                      <TableHead className="text-right">{t("salesReceivables.field.amount")}</TableHead>
                      <TableHead className="text-right">{t("salesReceivables.field.unapplied")}</TableHead>
                      <TableHead className="text-right">{t("salesReceivables.field.actions")}</TableHead>
                    </tr>
                  </thead>
                  <tbody>
                    {customerReceipts.length === 0 ? (
                      <tr><td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-500">{t("salesReceivables.empty.receipts")}</td></tr>
                    ) : customerReceipts.map((row) => (
                      <tr key={row.id} className={cn("border-t border-gray-100 hover:bg-gray-50", selectedReceipt?.id === row.id && "bg-gray-50")}>
                        <td className="px-6 py-4"><button type="button" className="text-left font-bold text-gray-900" onClick={() => setSelectedReceiptId(row.id)}>{row.reference}</button></td>
                        <td className="px-6 py-4">{row.customer ? `${row.customer.code} · ${row.customer.name}` : t("salesReceivables.empty.unlinked")}</td>
                        <td className="px-6 py-4">{formatDate(row.receiptDate)}</td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-gray-900">{formatCurrency(row.amount)}</td>
                        <td className="px-6 py-4 text-right font-mono text-gray-700">{formatCurrency(row.unappliedAmount)}</td>
                        <td className="px-6 py-4 text-right">
                          <button type="button" className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50" onClick={() => setSelectedReceiptId(row.id)}>{t("salesReceivables.action.view")}</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
            <Card className="space-y-5">
              <div>
                <div className="text-lg font-bold text-gray-900">{selectedReceipt?.reference ?? t("salesReceivables.section.receiptDetails")}</div>
                <div className="text-sm text-gray-500">{selectedReceipt?.customer ? `${selectedReceipt.customer.code} · ${selectedReceipt.customer.name}` : t("salesReceivables.section.receiptDetailsEmpty")}</div>
              </div>
              {selectedReceipt ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <MiniMetric label={t("salesReceivables.field.amount")} value={formatCurrency(selectedReceipt.amount)} />
                  <MiniMetric label={t("salesReceivables.field.allocated")} value={formatCurrency(selectedReceipt.allocatedAmount)} />
                  <MiniMetric label={t("salesReceivables.field.unapplied")} value={formatCurrency(selectedReceipt.unappliedAmount)} />
                  <MiniMetric label={t("salesReceivables.field.bankCash")} value={selectedReceipt.bankCashAccount?.name ?? t("salesReceivables.empty.notSet")} />
                </div>
              ) : <div className="text-sm text-gray-500">{t("salesReceivables.section.receiptDetailsEmpty")}</div>}
            </Card>
          </div>
        </div>
      ) : null}

      {activeTab === "credit-notes" ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <SummaryCard label={t("salesReceivables.summary.creditNotes")} value={creditNotes.length} hint={t("salesReceivables.hint.currentFilteredList")} />
            <SummaryCard label={t("salesReceivables.summary.drafts")} value={creditNotes.filter((row) => row.status === "DRAFT").length} hint={t("salesReceivables.hint.stillEditable")} />
            <SummaryCard
              label={t("salesReceivables.summary.postedValue")}
              value={formatCurrency(creditNotes.filter((row) => row.status === "POSTED").reduce((sum, row) => sum + Number(row.totalAmount), 0))}
              hint={t("salesReceivables.hint.customerBalanceReductions")}
            />
          </div>

          <Card className="p-5">
            <div className="grid gap-4 lg:grid-cols-[1.1fr_0.5fr_0.7fr_auto]">
              <Input value={creditNoteSearch} onChange={(event) => setCreditNoteSearch(event.target.value)} placeholder={t("salesReceivables.filters.searchCreditNotes")} />
              <Select value={creditNoteStatusFilter} onChange={(event) => setCreditNoteStatusFilter(event.target.value as "DRAFT" | "POSTED" | "")}>
                <option value="">{t("salesReceivables.filters.allStatuses")}</option>
                <option value="DRAFT">{t("salesReceivables.status.draft")}</option>
                <option value="POSTED">{t("salesReceivables.status.posted")}</option>
              </Select>
              <Select value={creditNoteCustomerFilter} onChange={(event) => setCreditNoteCustomerFilter(event.target.value)}>
                <option value="">{t("salesReceivables.filters.allCustomers")}</option>
                {activeCustomers.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.code} · {row.name}
                  </option>
                ))}
              </Select>
              <Button className="gap-2" onClick={() => {
                setCreditNoteEditor(EMPTY_CREDIT_NOTE_EDITOR());
                setIsCreditNoteEditorOpen(true);
              }}>
                <CirclePlus className="h-4 w-4 shrink-0" />
                {t("salesReceivables.action.newCreditNote")}
              </Button>
            </div>
          </Card>

          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <Card className="overflow-hidden p-0">
              <div className="border-b border-gray-200 px-6 py-4">
                <div className="text-sm font-bold text-gray-900">{t("salesReceivables.section.creditNotes")}</div>
                <div className="text-xs text-gray-500">{t("salesReceivables.section.creditNotesDescription")}</div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <TableHead>{t("salesReceivables.field.reference")}</TableHead>
                      <TableHead>{t("salesReceivables.field.customer")}</TableHead>
                      <TableHead>{t("salesReceivables.field.linkedInvoice")}</TableHead>
                      <TableHead>{t("salesReceivables.field.date")}</TableHead>
                      <TableHead className="text-right">{t("salesReceivables.field.total")}</TableHead>
                      <TableHead className="text-center">{t("salesReceivables.field.status")}</TableHead>
                      <TableHead className="text-right">{t("salesReceivables.field.actions")}</TableHead>
                    </tr>
                  </thead>
                  <tbody>
                    {creditNotes.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-10 text-center text-sm text-gray-500">
                          {t("salesReceivables.empty.creditNotes")}
                        </td>
                      </tr>
                    ) : (
                      creditNotes.map((row) => (
                        <tr key={row.id} className={cn("border-t border-gray-100 hover:bg-gray-50", selectedCreditNote?.id === row.id && "bg-gray-50")}>
                          <td className="px-6 py-4">
                            <button type="button" className="text-left" onClick={() => setSelectedCreditNoteId(row.id)}>
                              <div className="font-bold text-gray-900">{row.reference}</div>
                              <div className="text-xs text-gray-500">{row.journalReference ?? t("salesReceivables.empty.noJournal")}</div>
                            </button>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-semibold text-gray-900">{row.customer.name}</div>
                            <div className="text-xs text-gray-500">{row.customer.code}</div>
                          </td>
                          <td className="px-6 py-4 text-gray-700">{row.linkedInvoice?.reference ?? t("salesReceivables.empty.unlinked")}</td>
                          <td className="px-6 py-4 text-gray-700">{formatDate(row.noteDate)}</td>
                          <td className="px-6 py-4 text-right font-mono font-bold text-gray-900">{formatCurrency(row.totalAmount)}</td>
                          <td className="px-6 py-4 text-center">
                            <StatusPill label={row.status} tone={row.status === "POSTED" ? "positive" : "warning"} />
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex justify-end gap-2">
                              {row.status === "DRAFT" ? (
                                <>
                                  <button
                                    type="button"
                                    className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50"
                                    onClick={() => {
                                      setCreditNoteEditor({
                                        id: row.id,
                                        reference: row.reference,
                                        noteDate: row.noteDate.slice(0, 10),
                                        currencyCode: row.currencyCode,
                                        customerId: row.customer.id,
                                        salesInvoiceId: row.linkedInvoice?.id ?? "",
                                        description: row.description ?? "",
                                        lines: row.lines.map(mapLineToEditor),
                                      });
                                      setIsCreditNoteEditorOpen(true);
                                    }}
                                  >
                                    {t("salesReceivables.action.edit")}
                                  </button>
                                  <button
                                    type="button"
                                    className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
                                    onClick={() => {
                                      if (window.confirm(t("salesReceivables.confirm.postCreditNote", { reference: row.reference }))) {
                                        postCreditNoteMutation.mutate(row.id);
                                      }
                                    }}
                                  >
                                    {t("salesReceivables.action.post")}
                                  </button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50"
                                  onClick={() => setSelectedCreditNoteId(row.id)}
                                >
                                  {t("salesReceivables.action.view")}
                                </button>
                              )}
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
              <div>
                <div className="text-lg font-bold text-gray-900">{selectedCreditNote?.reference ?? t("salesReceivables.section.creditNoteDetails")}</div>
                <div className="text-sm text-gray-500">{selectedCreditNote ? `${selectedCreditNote.customer.code} · ${selectedCreditNote.customer.name}` : t("salesReceivables.section.creditNoteDetailsEmpty")}</div>
              </div>
              {selectedCreditNote ? (
                <>
                  <div className="grid gap-3 md:grid-cols-2">
                    <MiniMetric label={t("salesReceivables.field.creditNoteTotal")} value={formatCurrency(selectedCreditNote.totalAmount)} />
                    <MiniMetric label={t("salesReceivables.field.status")} value={selectedCreditNote.status === "DRAFT" ? t("salesReceivables.status.draft") : t("salesReceivables.status.posted")} />
                    <MiniMetric label={t("salesReceivables.field.linkedInvoice")} value={selectedCreditNote.linkedInvoice?.reference ?? t("salesReceivables.empty.unlinked")} />
                    <MiniMetric label={t("salesReceivables.field.date")} value={formatDate(selectedCreditNote.noteDate)} />
                  </div>

                  <div className="space-y-3">
                    <div className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">{t("salesReceivables.field.lines")}</div>
                    {selectedCreditNote.lines.map((line) => (
                      <div key={line.id} className="rounded-xl border border-gray-200 px-4 py-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="text-sm font-bold text-gray-900">{line.description || `Line ${line.lineNumber}`}</div>
                            <div className="text-xs text-gray-500">
                              {line.revenueAccount ? `${line.revenueAccount.code} · ${line.revenueAccount.name}` : "No revenue account"}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-mono text-sm font-bold text-gray-900">{formatCurrency(line.lineAmount)}</div>
                            <div className="text-xs text-gray-500">
                              Qty {line.quantity} × {formatCurrency(line.unitPrice)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-sm text-gray-500">{t("salesReceivables.section.creditNoteDetailsEmpty")}</div>
              )}
            </Card>
          </div>
        </div>
      ) : null}

      {activeTab === "allocations" ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <SummaryCard label={t("salesReceivables.summary.openInvoices")} value={openInvoices.length} hint={t("salesReceivables.hint.allOutstandingPostedInvoices")} />
            <SummaryCard label={t("salesReceivables.summary.postedReceipts")} value={postedReceipts.length} hint={t("salesReceivables.hint.availableReceiptTransactions")} />
            <SummaryCard
              label={t("salesReceivables.summary.openValue")}
              value={formatCurrency(openInvoices.reduce((sum, row) => sum + Number(row.outstandingAmount), 0))}
              hint={t("salesReceivables.hint.stillWaitingToBeAllocated")}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <Card className="space-y-5">
              <div>
                <div className="text-lg font-bold text-gray-900">{t("salesReceivables.section.allocatePostedReceipts")}</div>
                <div className="text-sm text-gray-500">{t("salesReceivables.section.allocatePostedReceiptsDescription")}</div>
              </div>

              <Field label={t("salesReceivables.field.invoice")}>
                <Select
                  value={allocationInvoiceId}
                  onChange={(event) => {
                    setAllocationInvoiceId(event.target.value);
                    setSelectedInvoiceId(event.target.value || null);
                  }}
                >
                  <option value="">{t("salesReceivables.empty.selectOpenInvoice")}</option>
                  {openInvoices.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.reference} · {row.customer.name} · {formatCurrency(row.outstandingAmount)}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label={t("salesReceivables.field.receiptTransaction")}>
                <Select value={allocationReceiptId} onChange={(event) => setAllocationReceiptId(event.target.value)}>
                  <option value="">{t("salesReceivables.empty.selectPostedReceipt")}</option>
                  {postedReceipts.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.reference} · {row.bankCashAccount?.name ?? t("salesReceivables.empty.receipt")} · {formatCurrency(row.amount)}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field
                label={t("salesReceivables.field.allocationAmount")}
                hint={selectedInvoiceForAllocation ? t("salesReceivables.field.currentOutstandingBalance", { amount: formatCurrency(selectedInvoiceForAllocation.outstandingAmount) }) : undefined}
              >
                <Input type="number" min="0.01" step="0.01" value={allocationAmount} onChange={(event) => setAllocationAmount(event.target.value)} />
              </Field>

              <div className="flex justify-end">
                <Button onClick={() => allocateReceiptMutation.mutate()} disabled={allocateReceiptMutation.isPending}>
                  <ReceiptText className="mr-2 h-4 w-4" />
                  {t("salesReceivables.action.allocateReceipt")}
                </Button>
              </div>
            </Card>

            <div className="grid gap-6">
              <Card className="overflow-hidden p-0">
                <div className="border-b border-gray-200 px-6 py-4">
                  <div className="text-sm font-bold text-gray-900">{t("salesReceivables.section.openInvoices")}</div>
                  <div className="text-xs text-gray-500">{t("salesReceivables.section.openInvoicesDescription")}</div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <TableHead>{t("salesReceivables.field.invoice")}</TableHead>
                        <TableHead>{t("salesReceivables.field.customer")}</TableHead>
                        <TableHead className="text-right">{t("salesReceivables.field.allocated")}</TableHead>
                        <TableHead className="text-right">{t("salesReceivables.field.outstanding")}</TableHead>
                        <TableHead className="text-center">{t("salesReceivables.field.status")}</TableHead>
                      </tr>
                    </thead>
                    <tbody>
                      {openInvoices.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-10 text-center text-sm text-gray-500">
                            {t("salesReceivables.empty.noOpenPostedInvoices")}
                          </td>
                        </tr>
                      ) : (
                        openInvoices.map((row) => (
                          <tr key={row.id} className={cn("border-t border-gray-100 hover:bg-gray-50", allocationInvoiceId === row.id && "bg-gray-50")}>
                            <td className="px-6 py-4">
                              <button type="button" className="text-left font-bold text-gray-900" onClick={() => setAllocationInvoiceId(row.id)}>
                                {row.reference}
                              </button>
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-semibold text-gray-900">{row.customer.name}</div>
                              <div className="text-xs text-gray-500">{row.customer.code}</div>
                            </td>
                            <td className="px-6 py-4 text-right font-mono text-gray-700">{formatCurrency(row.allocatedAmount)}</td>
                            <td className="px-6 py-4 text-right font-mono font-bold text-gray-900">{formatCurrency(row.outstandingAmount)}</td>
                            <td className="px-6 py-4 text-center">
                              <StatusPill label={friendlyAllocationStatus(row.allocationStatus)} tone={row.allocationStatus === "FULLY_ALLOCATED" ? "positive" : "warning"} />
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>

              <Card className="overflow-hidden p-0">
                <div className="border-b border-gray-200 px-6 py-4">
                  <div className="text-sm font-bold text-gray-900">{t("salesReceivables.section.postedReceipts")}</div>
                  <div className="text-xs text-gray-500">{t("salesReceivables.section.postedReceiptsDescription")}</div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <TableHead>{t("salesReceivables.field.reference")}</TableHead>
                        <TableHead>{t("salesReceivables.field.bankCash")}</TableHead>
                        <TableHead>{t("salesReceivables.field.date")}</TableHead>
                        <TableHead className="text-right">{t("salesReceivables.field.amount")}</TableHead>
                      </tr>
                    </thead>
                    <tbody>
                      {postedReceipts.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-10 text-center text-sm text-gray-500">
                            {t("salesReceivables.empty.noPostedReceipts")}
                          </td>
                        </tr>
                      ) : (
                        postedReceipts.map((row) => (
                          <tr key={row.id} className={cn("border-t border-gray-100 hover:bg-gray-50", allocationReceiptId === row.id && "bg-gray-50")}>
                            <td className="px-6 py-4">
                              <button type="button" className="text-left font-bold text-gray-900" onClick={() => setAllocationReceiptId(row.id)}>
                                {row.reference}
                              </button>
                            </td>
                            <td className="px-6 py-4 text-gray-700">{row.bankCashAccount?.name ?? t("salesReceivables.empty.receipt")}</td>
                            <td className="px-6 py-4 text-gray-700">{formatDate(row.transactionDate)}</td>
                            <td className="px-6 py-4 text-right font-mono font-bold text-gray-900">{formatCurrency(row.amount)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === "aging" ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-5">
            <SummaryCard label={t("salesReceivables.summary.current")} value={formatCurrency(agingQuery.data?.totals.current ?? 0)} hint={t("salesReceivables.hint.days0To30")} />
            <SummaryCard label={t("salesReceivables.summary.bucket31To60")} value={formatCurrency(agingQuery.data?.totals.bucket31To60 ?? 0)} hint={t("salesReceivables.hint.days31To60")} />
            <SummaryCard label={t("salesReceivables.summary.bucket61To90")} value={formatCurrency(agingQuery.data?.totals.bucket61To90 ?? 0)} hint={t("salesReceivables.hint.days61To90")} />
            <SummaryCard label={t("salesReceivables.summary.over90")} value={formatCurrency(agingQuery.data?.totals.over90 ?? 0)} hint={t("salesReceivables.hint.olderReceivables")} />
            <SummaryCard label={t("salesReceivables.summary.total")} value={formatCurrency(agingQuery.data?.totals.total ?? 0)} hint={t("salesReceivables.hint.allOutstandingPostedInvoices")} />
          </div>

          <Card className="p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <Field label={t("salesReceivables.field.asOfDate")}>
                <Input type="date" value={agingDate} onChange={(event) => setAgingDate(event.target.value)} />
              </Field>
              <div className="text-sm text-gray-500">{t("salesReceivables.field.agingDescription")}</div>
            </div>
          </Card>

          <Card className="overflow-hidden p-0">
            <div className="border-b border-gray-200 px-6 py-4">
              <div className="text-sm font-bold text-gray-900">{t("salesReceivables.section.customerAgingReport")}</div>
              <div className="text-xs text-gray-500">{t("salesReceivables.section.customerAgingReportDescription")}</div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <TableHead>{t("salesReceivables.field.customer")}</TableHead>
                    <TableHead className="text-right">{t("salesReceivables.summary.current")}</TableHead>
                    <TableHead className="text-right">{t("salesReceivables.summary.bucket31To60")}</TableHead>
                    <TableHead className="text-right">{t("salesReceivables.summary.bucket61To90")}</TableHead>
                    <TableHead className="text-right">{t("salesReceivables.summary.over90")}</TableHead>
                    <TableHead className="text-right">{t("salesReceivables.summary.total")}</TableHead>
                  </tr>
                </thead>
                <tbody>
                  {(agingQuery.data?.rows ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-500">
                        {t("salesReceivables.empty.noAgingBalances")}
                      </td>
                    </tr>
                  ) : (
                    agingQuery.data?.rows.map((row) => (
                      <tr key={row.customerId} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-gray-900">{row.customerName}</div>
                          <div className="text-xs text-gray-500">{row.customerCode}</div>
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-gray-700">{formatCurrency(row.current)}</td>
                        <td className="px-6 py-4 text-right font-mono text-gray-700">{formatCurrency(row.bucket31To60)}</td>
                        <td className="px-6 py-4 text-right font-mono text-gray-700">{formatCurrency(row.bucket61To90)}</td>
                        <td className="px-6 py-4 text-right font-mono text-gray-700">{formatCurrency(row.over90)}</td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-gray-900">{formatCurrency(row.total)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : null}

      <SidePanel
        isOpen={isCustomerEditorOpen}
        onClose={() => setIsCustomerEditorOpen(false)}
        title={customerEditor.id ? t("salesReceivables.dialog.editCustomer") : t("salesReceivables.dialog.newCustomer")}
      >
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label={t("salesReceivables.metric.creditLimit")}>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={customerEditor.creditLimit}
                onChange={(event) => setCustomerEditor((current) => ({ ...current, creditLimit: event.target.value }))}
              />
            </Field>
          </div>

          <Field label={t("salesReceivables.field.customerName")}>
            <Input value={customerEditor.name} onChange={(event) => setCustomerEditor((current) => ({ ...current, name: event.target.value }))} />
          </Field>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label={t("salesReceivables.field.contactInformation")}>
              <Input value={customerEditor.contactInfo} onChange={(event) => setCustomerEditor((current) => ({ ...current, contactInfo: event.target.value }))} />
            </Field>
            <Field label={t("salesReceivables.field.paymentTerms")}>
              <Input value={customerEditor.paymentTerms} onChange={(event) => setCustomerEditor((current) => ({ ...current, paymentTerms: event.target.value }))} />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label={t("salesReceivables.field.taxInformation")}>
              <Input value={customerEditor.taxInfo} onChange={(event) => setCustomerEditor((current) => ({ ...current, taxInfo: event.target.value }))} />
            </Field>
            <Field label={t("salesReceivables.field.salesRepresentative")}>
              <Input value={customerEditor.salesRepresentative} onChange={(event) => setCustomerEditor((current) => ({ ...current, salesRepresentative: event.target.value }))} />
            </Field>
          </div>

          <Field label={t("salesReceivables.field.receivableAccount")}>
            <Select value={customerEditor.receivableAccountId} onChange={(event) => setCustomerEditor((current) => ({ ...current, receivableAccountId: event.target.value }))}>
              <option value="">{t("salesReceivables.empty.selectReceivableAccount")}</option>
              {receivableAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.code} - {account.name}
                </option>
              ))}
            </Select>
          </Field>

          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setIsCustomerEditorOpen(false)}>
              {t("salesReceivables.action.cancel")}
            </Button>
            <Button onClick={() => (customerEditor.id ? updateCustomerMutation.mutate() : createCustomerMutation.mutate())} disabled={createCustomerMutation.isPending || updateCustomerMutation.isPending}>
              {customerEditor.id ? t("salesReceivables.action.saveChanges") : t("salesReceivables.action.createCustomer")}
            </Button>
          </div>
        </div>
      </SidePanel>

      <QuotationEditorModal
        isOpen={isQuotationEditorOpen}
        onClose={() => {
          setQuotationEditorClientError(null);
          setIsQuotationEditorOpen(false);
        }}
        title={quotationEditor.id ? t("salesReceivables.dialog.editQuotationDraft") : t("salesReceivables.dialog.newQuotation")}
        editor={quotationEditor}
        validationError={quotationEditorClientError}
        customers={activeCustomers}
        inventoryItems={inventoryItems}
        isInventoryItemsLoading={inventoryItemsQuery.isLoading}
        revenueAccounts={revenueAccountsQuery.data ?? []}
        isSavingDraft={createQuotationMutation.isPending || updateQuotationMutation.isPending}
        isApproving={approveQuotationMutation.isPending}
        onChange={setQuotationEditor}
        onSaveDraft={() => {
          void saveQuotationDraft();
        }}
        onApprove={() => {
          void approveQuotationFromEditor();
        }}
      />

      <SalesOrderEditorModal
        isOpen={isOrderEditorOpen}
        onClose={() => setIsOrderEditorOpen(false)}
        title={orderEditor.id ? t("salesReceivables.dialog.editOrderDraft") : t("salesReceivables.dialog.newOrder")}
        editor={orderEditor}
        customers={activeCustomers}
        quotations={matchingCustomerQuotations}
        inventoryItems={inventoryItems}
        isInventoryItemsLoading={inventoryItemsQuery.isLoading}
        isSubmitting={createOrderMutation.isPending || updateOrderMutation.isPending}
        onChange={setOrderEditor}
        onSubmit={() => (orderEditor.id ? updateOrderMutation.mutate() : createOrderMutation.mutate())}
      />

      <SalesDocumentEditorModal
        isOpen={isInvoiceEditorOpen}
        onClose={() => setIsInvoiceEditorOpen(false)}
        title={invoiceEditor.id ? t("salesReceivables.dialog.editInvoiceDraft") : t("salesReceivables.dialog.newSalesInvoice")}
        introTitle={t("salesReceivables.dialog.newSalesInvoice")}
        introDescription={t("salesReceivables.section.pipelineDescription")}
        reference={invoiceEditor.reference}
        dateLabel={t("salesReceivables.field.invoiceDate")}
        dateValue={invoiceEditor.invoiceDate}
        secondaryDateLabel={t("salesReceivables.field.dueDate")}
        secondaryDateValue={invoiceEditor.dueDate}
        currencyCode={invoiceEditor.currencyCode}
        customerId={invoiceEditor.customerId}
        description={invoiceEditor.description}
        lines={invoiceEditor.lines}
        customers={activeCustomers}
        inventoryItems={inventoryItems}
        isInventoryItemsLoading={inventoryItemsQuery.isLoading}
        revenueAccounts={revenueAccountsQuery.data ?? []}
        isSubmitting={createInvoiceMutation.isPending || updateInvoiceMutation.isPending}
        onReferenceChange={(value) => setInvoiceEditor((current) => ({ ...current, reference: value }))}
        onDateChange={(value) => setInvoiceEditor((current) => ({ ...current, invoiceDate: value }))}
        onSecondaryDateChange={(value) => setInvoiceEditor((current) => ({ ...current, dueDate: value }))}
        onCurrencyChange={(value) => setInvoiceEditor((current) => ({ ...current, currencyCode: value.toUpperCase() }))}
        onCustomerChange={(value) => setInvoiceEditor((current) => ({ ...current, customerId: value }))}
        onDescriptionChange={(value) => setInvoiceEditor((current) => ({ ...current, description: value }))}
        onLinesChange={(lines) => setInvoiceEditor((current) => ({ ...current, lines }))}
        onSubmit={() => (invoiceEditor.id ? updateInvoiceMutation.mutate() : createInvoiceMutation.mutate())}
        submitLabel={invoiceEditor.id ? t("salesReceivables.action.saveChanges") : t("salesReceivables.action.saveDraft")}
      />

      <CreditNoteEditorModal
        isOpen={isCreditNoteEditorOpen}
        onClose={() => setIsCreditNoteEditorOpen(false)}
        title={creditNoteEditor.id ? t("salesReceivables.dialog.editCreditNoteDraft") : t("salesReceivables.dialog.newCreditNote")}
        editor={creditNoteEditor}
        customers={activeCustomers}
        invoices={matchingCustomerInvoices}
        revenueAccounts={revenueAccountsQuery.data ?? []}
        isSubmitting={createCreditNoteMutation.isPending || updateCreditNoteMutation.isPending}
        onChange={setCreditNoteEditor}
        onSubmit={() => (creditNoteEditor.id ? updateCreditNoteMutation.mutate() : createCreditNoteMutation.mutate())}
      />

      <ReceiptEditorModal
        isOpen={isReceiptEditorOpen}
        onClose={() => setIsReceiptEditorOpen(false)}
        title={t("salesReceivables.dialog.newReceipt")}
        editor={receiptEditor}
        customers={activeCustomers}
        bankCashAccounts={bankCashAccountsQuery.data ?? []}
        isSubmitting={createReceiptMutation.isPending}
        onChange={setReceiptEditor}
        onSubmit={() => createReceiptMutation.mutate()}
      />

      {false ? (
      <SidePanel
        isOpen={isCreditNoteEditorOpen}
        onClose={() => setIsCreditNoteEditorOpen(false)}
        title={creditNoteEditor.id ? t("salesReceivables.dialog.editCreditNoteDraft") : t("salesReceivables.dialog.newCreditNote")}
      >
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label={t("salesReceivables.field.reference")}>
              <Input value={creditNoteEditor.reference} onChange={(event) => setCreditNoteEditor((current) => ({ ...current, reference: event.target.value }))} />
            </Field>
            <Field label={t("salesReceivables.field.creditNoteDate")}>
              <Input type="date" value={creditNoteEditor.noteDate} onChange={(event) => setCreditNoteEditor((current) => ({ ...current, noteDate: event.target.value }))} />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label={t("salesReceivables.field.currency")}>
              <Input value={creditNoteEditor.currencyCode} onChange={(event) => setCreditNoteEditor((current) => ({ ...current, currencyCode: event.target.value.toUpperCase() }))} maxLength={3} />
            </Field>
            <Field label={t("salesReceivables.field.customer")}>
                <Select
                  value={creditNoteEditor.customerId}
                  onChange={(event) =>
                    setCreditNoteEditor((current) => ({
                      ...current,
                      customerId: event.target.value,
                      salesInvoiceId: "",
                    }))
                  }
                >
                <option value="">{t("salesReceivables.empty.selectActiveCustomer")}</option>
                {activeCustomers.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.code} · {row.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("salesReceivables.field.linkedInvoice")} hint={t("salesReceivables.field.linkedInvoiceHint")}>
              <Select value={creditNoteEditor.salesInvoiceId} onChange={(event) => setCreditNoteEditor((current) => ({ ...current, salesInvoiceId: event.target.value }))}>
                <option value="">{t("salesReceivables.empty.noLinkedInvoice")}</option>
                {matchingCustomerInvoices.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.reference} · {formatCurrency(row.outstandingAmount)} {t("salesReceivables.metric.outstanding")}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label={t("salesReceivables.field.description")}>
            <Textarea rows={3} value={creditNoteEditor.description} onChange={(event) => setCreditNoteEditor((current) => ({ ...current, description: event.target.value }))} />
          </Field>

          <DocumentLinesEditor lines={creditNoteEditor.lines} revenueAccounts={revenueAccountsQuery.data ?? []} onChange={(lines) => setCreditNoteEditor((current) => ({ ...current, lines }))} />

          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setIsCreditNoteEditorOpen(false)}>
              {t("salesReceivables.action.cancel")}
            </Button>
            <Button onClick={() => (creditNoteEditor.id ? updateCreditNoteMutation.mutate() : createCreditNoteMutation.mutate())} disabled={createCreditNoteMutation.isPending || updateCreditNoteMutation.isPending}>
              {creditNoteEditor.id ? t("salesReceivables.action.saveChanges") : t("salesReceivables.action.saveDraft")}
            </Button>
          </div>
        </div>
      </SidePanel>
      ) : null}

      {false ? (
      <SidePanel
        isOpen={isReceiptEditorOpen}
        onClose={() => setIsReceiptEditorOpen(false)}
        title={t("salesReceivables.dialog.newReceipt")}
      >
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label={t("salesReceivables.field.reference")}>
              <Input value={receiptEditor.reference} onChange={(event) => setReceiptEditor((current) => ({ ...current, reference: event.target.value }))} />
            </Field>
            <Field label={t("salesReceivables.field.receiptDate")}>
              <Input type="date" value={receiptEditor.receiptDate} onChange={(event) => setReceiptEditor((current) => ({ ...current, receiptDate: event.target.value }))} />
            </Field>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label={t("salesReceivables.field.customer")}>
              <Select value={receiptEditor.customerId} onChange={(event) => setReceiptEditor((current) => ({ ...current, customerId: event.target.value }))}>
                <option value="">{t("salesReceivables.empty.selectActiveCustomer")}</option>
                {activeCustomers.map((row) => (
                  <option key={row.id} value={row.id}>{row.code} · {row.name}</option>
                ))}
              </Select>
            </Field>
            <Field label={t("salesReceivables.field.amount")}>
              <Input type="number" min="0.01" step="0.01" value={receiptEditor.amount} onChange={(event) => setReceiptEditor((current) => ({ ...current, amount: event.target.value }))} />
            </Field>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label={t("salesReceivables.field.bankCashAccount")}>
              <Select value={receiptEditor.bankCashAccountId} onChange={(event) => setReceiptEditor((current) => ({ ...current, bankCashAccountId: event.target.value }))}>
                <option value="">{t("salesReceivables.empty.selectBankCashAccount")}</option>
                {(bankCashAccountsQuery.data ?? []).map((row) => (
                  <option key={row.id} value={row.id}>{row.name} · {row.type}</option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label={t("salesReceivables.field.description")}>
            <Textarea rows={3} value={receiptEditor.description} onChange={(event) => setReceiptEditor((current) => ({ ...current, description: event.target.value }))} />
          </Field>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setIsReceiptEditorOpen(false)}>{t("salesReceivables.action.cancel")}</Button>
            <Button onClick={() => createReceiptMutation.mutate()} disabled={createReceiptMutation.isPending}>{t("salesReceivables.action.createReceipt")}</Button>
          </div>
        </div>
      </SidePanel>
      ) : null}
    </div>
  );
}

function SalesDocumentEditor({
  reference,
  dateLabel,
  dateValue,
  secondaryDateLabel,
  secondaryDateValue,
  currencyCode,
  customerId,
  description,
  lines,
  customers,
  revenueAccounts,
  submitLabel,
  isSubmitting,
  onReferenceChange,
  onDateChange,
  onSecondaryDateChange,
  onCurrencyChange,
  onCustomerChange,
  onDescriptionChange,
  onLinesChange,
  onCancel,
  onSubmit,
}: {
  reference: string;
  dateLabel: string;
  dateValue: string;
  secondaryDateLabel?: string;
  secondaryDateValue?: string;
  currencyCode: string;
  customerId: string;
  description: string;
  lines: SalesLineEditorState[];
  customers: Customer[];
  revenueAccounts: Array<{ id: string; code: string; name: string }>;
  submitLabel: string;
  isSubmitting: boolean;
  onReferenceChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onSecondaryDateChange?: (value: string) => void;
  onCurrencyChange: (value: string) => void;
  onCustomerChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onLinesChange: (lines: SalesLineEditorState[]) => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label={t("salesReceivables.field.reference")}>
          <Input value={reference} onChange={(event) => onReferenceChange(event.target.value)} />
        </Field>
        <Field label={dateLabel}>
          <Input type="date" value={dateValue} onChange={(event) => onDateChange(event.target.value)} />
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label={t("salesReceivables.field.currency")}>
          <Input value={currencyCode} onChange={(event) => onCurrencyChange(event.target.value.toUpperCase())} maxLength={3} />
        </Field>
        {secondaryDateLabel && onSecondaryDateChange ? (
          <Field label={secondaryDateLabel}>
            <Input type="date" value={secondaryDateValue ?? ""} onChange={(event) => onSecondaryDateChange(event.target.value)} />
          </Field>
        ) : (
          <div />
        )}
      </div>

      <Field label={t("salesReceivables.field.customer")}>
        <Select value={customerId} onChange={(event) => onCustomerChange(event.target.value)}>
          <option value="">{t("salesReceivables.empty.selectActiveCustomer")}</option>
          {customers.map((row) => (
            <option key={row.id} value={row.id}>
              {row.code} · {row.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field label={t("salesReceivables.field.description")}>
        <Textarea rows={3} value={description} onChange={(event) => onDescriptionChange(event.target.value)} />
      </Field>

      <DocumentLinesEditor lines={lines} revenueAccounts={revenueAccounts} onChange={onLinesChange} />

      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={onCancel}>
          {t("salesReceivables.action.cancel")}
        </Button>
        <Button onClick={onSubmit} disabled={isSubmitting}>
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}

function DocumentLinesEditor({
  lines,
  revenueAccounts,
  onChange,
}: {
  lines: SalesLineEditorState[];
  revenueAccounts: Array<{ id: string; code: string; name: string }>;
  onChange: (lines: SalesLineEditorState[]) => void;
}) {
  const { t } = useTranslation();
  const updateLine = (
    lineKey: string,
    updater: (line: SalesLineEditorState) => SalesLineEditorState,
  ) => {
    onChange(
      lines.map((item) => {
        if (item.key !== lineKey) {
          return item;
        }

        return withCalculatedLineAmount(updater(item));
      }),
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-bold text-gray-900">{t("salesReceivables.section.documentLines")}</div>
          <div className="text-xs text-gray-500">{t("salesReceivables.section.documentLinesDescription")}</div>
        </div>
        <Button variant="secondary" size="sm" onClick={() => onChange([...lines, createEmptyLine()])}>
          {t("salesReceivables.action.addLine")}
        </Button>
      </div>

      <div className="space-y-4">
        {lines.map((line, index) => (
          <div key={line.key} className="rounded-2xl border border-gray-200 p-4">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-sm font-bold text-gray-900">{t("salesReceivables.line.label", { index: index + 1 })}</div>
              <button
                type="button"
                className="text-xs font-bold text-red-600 disabled:text-gray-300"
                onClick={() => onChange(lines.filter((item) => item.key !== line.key))}
                disabled={lines.length === 1}
              >
                {t("salesReceivables.action.remove")}
              </button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label={t("salesReceivables.field.itemOrService")}>
                <Input
                  value={line.itemName}
                  onChange={(event) => updateLine(line.key, (item) => ({ ...item, itemName: event.target.value }))}
                />
              </Field>
              <Field label={t("salesReceivables.field.revenueAccount")}>
                <Select
                  value={line.revenueAccountId}
                  onChange={(event) => updateLine(line.key, (item) => ({ ...item, revenueAccountId: event.target.value }))}
                >
                  <option value="">{t("salesReceivables.empty.selectRevenueAccount")}</option>
                  {revenueAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.code} · {account.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t("salesReceivables.field.description")}>
                <Input
                  value={line.description}
                  onChange={(event) => updateLine(line.key, (item) => ({ ...item, description: event.target.value }))}
                />
              </Field>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field label={t("salesReceivables.field.discountAmount")}>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={line.discountAmount}
                  onChange={(event) => updateLine(line.key, (item) => ({ ...item, discountAmount: event.target.value }))}
                />
              </Field>
              <Field label={t("salesReceivables.field.taxAmount")}>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={line.taxAmount}
                  onChange={(event) => updateLine(line.key, (item) => ({ ...item, taxAmount: event.target.value }))}
                />
              </Field>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <Field label={t("salesReceivables.field.quantity")}>
                <Input
                  type="number"
                  min="0.0001"
                  step="0.0001"
                  value={line.quantity}
                  onChange={(event) => updateLine(line.key, (item) => ({ ...item, quantity: event.target.value }))}
                />
              </Field>
              <Field label={t("salesReceivables.field.unitPrice")}>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={line.unitPrice}
                  onChange={(event) => updateLine(line.key, (item) => ({ ...item, unitPrice: event.target.value }))}
                />
              </Field>
              <Field label={t("salesReceivables.field.lineAmount")}>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={line.lineAmount}
                  readOnly
                  disabled
                />
              </Field>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, hint }: { label: string; value: string | number; hint: string }) {
  return (
    <Card className="p-5">
      <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">{label}</div>
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

function TableHead({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <th className={cn("px-6 py-3 text-start text-[10px] font-bold uppercase tracking-widest text-gray-600", className)}>{children}</th>;
}

function mapSalesLines(lines: SalesLineEditorState[]): SalesLinePayload[] {
  return lines.map((line) => {
    const resolvedLine = withCalculatedLineAmount(line);

    return {
      itemId: line.itemId || undefined,
      itemName: line.itemName || undefined,
      description: line.description || undefined,
      quantity: resolvedLine.quantity ? Number(resolvedLine.quantity) : undefined,
      unitPrice: resolvedLine.unitPrice ? Number(resolvedLine.unitPrice) : undefined,
      discountAmount: resolvedLine.discountAmount ? Number(resolvedLine.discountAmount) : undefined,
      taxAmount: resolvedLine.taxAmount ? Number(resolvedLine.taxAmount) : undefined,
      lineAmount: resolvedLine.lineAmount ? Number(resolvedLine.lineAmount) : undefined,
      revenueAccountId: line.revenueAccountId || undefined,
    };
  });
}

function mapLineToEditor(line: {
  id: string;
  itemId?: string | null;
  itemName?: string | null;
  description?: string | null;
  quantity: string;
  unitPrice: string;
  discountAmount: string;
  taxAmount: string;
  lineAmount: string;
  revenueAccount: { id: string } | null;
}): SalesLineEditorState {
  return withCalculatedLineAmount({
    key: line.id,
    itemId: line.itemId ?? "",
    itemName: line.itemName ?? "",
    description: line.description ?? "",
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    discountAmount: line.discountAmount,
    taxAmount: line.taxAmount,
    lineAmount: line.lineAmount,
    revenueAccountId: line.revenueAccount?.id ?? "",
  });
}

function mapLineForConversion(line: {
  itemId?: string | null;
  itemName?: string | null;
  description?: string | null;
  quantity: string;
  unitPrice: string;
  discountAmount: string;
  taxAmount: string;
  lineAmount: string;
  revenueAccount: { id: string } | null;
}): SalesLinePayload {
  return {
    itemId: line.itemId ?? undefined,
    itemName: line.itemName ?? undefined,
    description: line.description ?? undefined,
    quantity: Number(line.quantity),
    unitPrice: Number(line.unitPrice),
    discountAmount: Number(line.discountAmount),
    taxAmount: Number(line.taxAmount),
    lineAmount: Number(line.lineAmount),
    revenueAccountId: line.revenueAccount?.id ?? undefined,
  };
}

function friendlyAllocationStatus(status: AllocationStatus) {
  return status.replaceAll("_", " ");
}

function validateQuotationEditorState(
  editor: QuotationEditorState,
  t: (key: string, vars?: Record<string, string | number>) => string,
) {
  if (!editor.customerId) {
    return t("salesReceivables.validation.customerRequired");
  }

  if (!editor.lines.length) {
    return t("salesReceivables.validation.lineRequired");
  }

  for (const [index, line] of editor.lines.entries()) {
    const lineAmount = Number(line.lineAmount || 0);
    if (!Number.isFinite(lineAmount) || lineAmount < 0.01) {
      return t("salesReceivables.validation.lineAmountPositive", { index: index + 1 });
    }
  }

  return null;
}

function findAccountTreeNode(
  nodes: AccountTreeNode[],
  predicate: (node: AccountTreeNode) => boolean,
): AccountTreeNode | null {
  for (const node of nodes) {
    if (predicate(node)) {
      return node;
    }

    const nestedMatch = findAccountTreeNode(node.children, predicate);
    if (nestedMatch) {
      return nestedMatch;
    }
  }

  return null;
}

function flattenPostingAccounts(nodes: AccountTreeNode[]): AccountTreeNode[] {
  return nodes.flatMap((node) => [
    ...(node.isPosting ? [node] : []),
    ...flattenPostingAccounts(node.children),
  ]);
}

async function invalidateSalesReceivables(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["sales-customers"] }),
    queryClient.invalidateQueries({ queryKey: ["sales-customer-balance"] }),
    queryClient.invalidateQueries({ queryKey: ["sales-customer-transactions"] }),
    queryClient.invalidateQueries({ queryKey: ["sales-quotations"] }),
    queryClient.invalidateQueries({ queryKey: ["sales-orders"] }),
    queryClient.invalidateQueries({ queryKey: ["sales-invoices"] }),
    queryClient.invalidateQueries({ queryKey: ["sales-receipts"] }),
    queryClient.invalidateQueries({ queryKey: ["sales-credit-notes"] }),
    queryClient.invalidateQueries({ queryKey: ["sales-aging"] }),
    queryClient.invalidateQueries({ queryKey: ["bank-cash-transactions"] }),
    queryClient.invalidateQueries({ queryKey: ["bank-cash-accounts"] }),
  ]);
}
