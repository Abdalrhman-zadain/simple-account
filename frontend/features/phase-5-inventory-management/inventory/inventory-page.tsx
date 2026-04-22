"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import {
  cancelInventoryAdjustment,
  cancelInventoryGoodsIssue,
  cancelInventoryGoodsReceipt,
  cancelInventoryTransfer,
  createInventoryAdjustment,
  createInventoryGoodsIssue,
  createInventoryGoodsReceipt,
  createInventoryItem,
  createInventoryTransfer,
  createInventoryWarehouse,
  deactivateInventoryItem,
  deactivateInventoryWarehouse,
  getAccountOptions,
  getInventoryAdjustments,
  getInventoryGoodsIssues,
  getInventoryGoodsReceipts,
  getInventoryItems,
  getInventoryStockLedger,
  getInventoryPolicy,
  getInventoryTransfers,
  getInventoryWarehouses,
  postInventoryAdjustment,
  postInventoryGoodsIssue,
  postInventoryGoodsReceipt,
  postInventoryTransfer,
  reverseInventoryAdjustment,
  reverseInventoryGoodsIssue,
  reverseInventoryGoodsReceipt,
  reverseInventoryTransfer,
  updateInventoryAdjustment,
  updateInventoryGoodsIssue,
  updateInventoryGoodsReceipt,
  updateInventoryItem,
  updateInventoryTransfer,
  updateInventoryWarehouse,
  updateInventoryPolicy,
} from "@/lib/api";
import { useTranslation } from "@/lib/i18n";
import { queryKeys } from "@/lib/query-keys";
import { useAuth } from "@/providers/auth-provider";
import type {
  AccountOption,
  InventoryAdjustment,
  InventoryAdjustmentLinePayload,
  InventoryAdjustmentStatus,
  InventoryGoodsIssue,
  InventoryGoodsIssueLinePayload,
  InventoryGoodsReceipt,
  InventoryGoodsReceiptLinePayload,
  InventoryItem,
  InventoryIssueStatus,
  InventoryCostingMethod,
  InventoryItemType,
  InventoryReceiptStatus,
  InventoryTransfer,
  InventoryTransferLinePayload,
  InventoryTransferStatus,
  InventoryStockMovement,
  InventoryStockMovementType,
  InventoryWarehouse,
} from "@/types/api";
import { Button, Card, PageShell, SectionHeading, SidePanel, StatusPill } from "@/components/ui";
import { Field, Input, Select, Textarea } from "@/components/ui/forms";

const ITEM_TYPE_OPTIONS: InventoryItemType[] = ["INVENTORY", "NON_STOCK", "SERVICE", "RAW_MATERIAL"];
const RECEIPT_STATUS_OPTIONS: InventoryReceiptStatus[] = ["DRAFT", "POSTED", "CANCELLED", "REVERSED"];
const ISSUE_STATUS_OPTIONS: InventoryIssueStatus[] = ["DRAFT", "POSTED", "CANCELLED", "REVERSED"];
const TRANSFER_STATUS_OPTIONS: InventoryTransferStatus[] = ["DRAFT", "POSTED", "CANCELLED", "REVERSED"];
const ADJUSTMENT_STATUS_OPTIONS: InventoryAdjustmentStatus[] = ["DRAFT", "POSTED", "CANCELLED", "REVERSED"];
const STOCK_MOVEMENT_TYPE_OPTIONS: InventoryStockMovementType[] = [
  "GOODS_RECEIPT",
  "GOODS_ISSUE",
  "TRANSFER_OUT",
  "TRANSFER_IN",
  "ADJUSTMENT_IN",
  "ADJUSTMENT_OUT",
];

type ItemEditorState = {
  id?: string;
  code: string;
  name: string;
  description: string;
  unitOfMeasure: string;
  category: string;
  type: InventoryItemType;
  inventoryAccountId: string;
  cogsAccountId: string;
  salesAccountId: string;
  adjustmentAccountId: string;
  reorderLevel: string;
  reorderQuantity: string;
  preferredWarehouseId: string;
};

type WarehouseEditorState = {
  id?: string;
  code: string;
  name: string;
  address: string;
  responsiblePerson: string;
  isTransit: boolean;
  isDefaultTransit: boolean;
};

type ReceiptLineEditorState = {
  itemId: string;
  quantity: string;
  unitCost: string;
  unitOfMeasure: string;
  description: string;
};

type ReceiptEditorState = {
  id?: string;
  reference: string;
  receiptDate: string;
  warehouseId: string;
  sourcePurchaseOrderRef: string;
  sourcePurchaseInvoiceRef: string;
  description: string;
  lines: ReceiptLineEditorState[];
};

type IssueLineEditorState = {
  itemId: string;
  quantity: string;
  unitOfMeasure: string;
  description: string;
};

type IssueEditorState = {
  id?: string;
  reference: string;
  issueDate: string;
  warehouseId: string;
  sourceSalesOrderRef: string;
  sourceSalesInvoiceRef: string;
  sourceProductionRequestRef: string;
  sourceInternalRequestRef: string;
  description: string;
  lines: IssueLineEditorState[];
};

type TransferLineEditorState = {
  itemId: string;
  quantity: string;
  unitOfMeasure: string;
  description: string;
};

type TransferEditorState = {
  id?: string;
  reference: string;
  transferDate: string;
  sourceWarehouseId: string;
  destinationWarehouseId: string;
  description: string;
  lines: TransferLineEditorState[];
};

type AdjustmentLineEditorState = {
  itemId: string;
  systemQuantity: string;
  countedQuantity: string;
  unitOfMeasure: string;
  description: string;
};

type AdjustmentEditorState = {
  id?: string;
  reference: string;
  adjustmentDate: string;
  warehouseId: string;
  reason: string;
  description: string;
  lines: AdjustmentLineEditorState[];
};

function createEmptyItemEditor(): ItemEditorState {
  return {
    code: "",
    name: "",
    description: "",
    unitOfMeasure: "EA",
    category: "",
    type: "INVENTORY",
    inventoryAccountId: "",
    cogsAccountId: "",
    salesAccountId: "",
    adjustmentAccountId: "",
    reorderLevel: "0",
    reorderQuantity: "0",
    preferredWarehouseId: "",
  };
}

function createEmptyWarehouseEditor(): WarehouseEditorState {
  return {
    code: "",
    name: "",
    address: "",
    responsiblePerson: "",
    isTransit: false,
    isDefaultTransit: false,
  };
}

function createEmptyReceiptLine(): ReceiptLineEditorState {
  return {
    itemId: "",
    quantity: "1",
    unitCost: "0",
    unitOfMeasure: "EA",
    description: "",
  };
}

function createEmptyReceiptEditor(): ReceiptEditorState {
  return {
    reference: "",
    receiptDate: new Date().toISOString().slice(0, 10),
    warehouseId: "",
    sourcePurchaseOrderRef: "",
    sourcePurchaseInvoiceRef: "",
    description: "",
    lines: [createEmptyReceiptLine()],
  };
}

function createEmptyIssueLine(): IssueLineEditorState {
  return {
    itemId: "",
    quantity: "1",
    unitOfMeasure: "EA",
    description: "",
  };
}

function createEmptyIssueEditor(): IssueEditorState {
  return {
    reference: "",
    issueDate: new Date().toISOString().slice(0, 10),
    warehouseId: "",
    sourceSalesOrderRef: "",
    sourceSalesInvoiceRef: "",
    sourceProductionRequestRef: "",
    sourceInternalRequestRef: "",
    description: "",
    lines: [createEmptyIssueLine()],
  };
}

function createEmptyTransferLine(): TransferLineEditorState {
  return {
    itemId: "",
    quantity: "1",
    unitOfMeasure: "EA",
    description: "",
  };
}

function createEmptyTransferEditor(): TransferEditorState {
  return {
    reference: "",
    transferDate: new Date().toISOString().slice(0, 10),
    sourceWarehouseId: "",
    destinationWarehouseId: "",
    description: "",
    lines: [createEmptyTransferLine()],
  };
}

function createEmptyAdjustmentLine(): AdjustmentLineEditorState {
  return {
    itemId: "",
    systemQuantity: "0",
    countedQuantity: "0",
    unitOfMeasure: "EA",
    description: "",
  };
}

function createEmptyAdjustmentEditor(): AdjustmentEditorState {
  return {
    reference: "",
    adjustmentDate: new Date().toISOString().slice(0, 10),
    warehouseId: "",
    reason: "",
    description: "",
    lines: [createEmptyAdjustmentLine()],
  };
}

export function InventoryPage() {
  const { t } = useTranslation();
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const [itemSearch, setItemSearch] = useState("");
  const [itemStatusFilter, setItemStatusFilter] = useState<"" | "true" | "false">("");
  const [itemTypeFilter, setItemTypeFilter] = useState<InventoryItemType | "">("");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isItemEditorOpen, setIsItemEditorOpen] = useState(false);
  const [itemEditor, setItemEditor] = useState<ItemEditorState>(createEmptyItemEditor);

  const [warehouseSearch, setWarehouseSearch] = useState("");
  const [warehouseStatusFilter, setWarehouseStatusFilter] = useState<"" | "true" | "false">("");
  const [warehouseTransitFilter, setWarehouseTransitFilter] = useState<"" | "true" | "false">("");
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | null>(null);
  const [isWarehouseEditorOpen, setIsWarehouseEditorOpen] = useState(false);
  const [warehouseEditor, setWarehouseEditor] = useState<WarehouseEditorState>(createEmptyWarehouseEditor);

  const [receiptSearch, setReceiptSearch] = useState("");
  const [receiptStatusFilter, setReceiptStatusFilter] = useState<InventoryReceiptStatus | "">("");
  const [receiptWarehouseFilter, setReceiptWarehouseFilter] = useState("");
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);
  const [isReceiptEditorOpen, setIsReceiptEditorOpen] = useState(false);
  const [receiptEditor, setReceiptEditor] = useState<ReceiptEditorState>(createEmptyReceiptEditor);
  const [issueSearch, setIssueSearch] = useState("");
  const [issueStatusFilter, setIssueStatusFilter] = useState<InventoryIssueStatus | "">("");
  const [issueWarehouseFilter, setIssueWarehouseFilter] = useState("");
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [isIssueEditorOpen, setIsIssueEditorOpen] = useState(false);
  const [issueEditor, setIssueEditor] = useState<IssueEditorState>(createEmptyIssueEditor);
  const [transferSearch, setTransferSearch] = useState("");
  const [transferStatusFilter, setTransferStatusFilter] = useState<InventoryTransferStatus | "">("");
  const [transferSourceWarehouseFilter, setTransferSourceWarehouseFilter] = useState("");
  const [transferDestinationWarehouseFilter, setTransferDestinationWarehouseFilter] = useState("");
  const [selectedTransferId, setSelectedTransferId] = useState<string | null>(null);
  const [isTransferEditorOpen, setIsTransferEditorOpen] = useState(false);
  const [transferEditor, setTransferEditor] = useState<TransferEditorState>(createEmptyTransferEditor);
  const [adjustmentSearch, setAdjustmentSearch] = useState("");
  const [adjustmentStatusFilter, setAdjustmentStatusFilter] = useState<InventoryAdjustmentStatus | "">("");
  const [adjustmentWarehouseFilter, setAdjustmentWarehouseFilter] = useState("");
  const [adjustmentReasonFilter, setAdjustmentReasonFilter] = useState("");
  const [selectedAdjustmentId, setSelectedAdjustmentId] = useState<string | null>(null);
  const [isAdjustmentEditorOpen, setIsAdjustmentEditorOpen] = useState(false);
  const [adjustmentEditor, setAdjustmentEditor] = useState<AdjustmentEditorState>(createEmptyAdjustmentEditor);
  const [stockLedgerSearch, setStockLedgerSearch] = useState("");
  const [stockLedgerItemFilter, setStockLedgerItemFilter] = useState("");
  const [stockLedgerWarehouseFilter, setStockLedgerWarehouseFilter] = useState("");
  const [stockLedgerMovementTypeFilter, setStockLedgerMovementTypeFilter] = useState<InventoryStockMovementType | "">("");
  const [costingMethodDraft, setCostingMethodDraft] = useState<InventoryCostingMethod>("WEIGHTED_AVERAGE");

  const inventoryItemsQuery = useQuery({
    queryKey: queryKeys.inventoryItems(token, { search: itemSearch, isActive: itemStatusFilter, type: itemTypeFilter }),
    queryFn: () => getInventoryItems({ search: itemSearch, isActive: itemStatusFilter, type: itemTypeFilter }, token),
  });

  const inventoryWarehousesQuery = useQuery({
    queryKey: queryKeys.inventoryWarehouses(token, {
      search: warehouseSearch,
      isActive: warehouseStatusFilter,
      isTransit: warehouseTransitFilter,
    }),
    queryFn: () =>
      getInventoryWarehouses(
        { search: warehouseSearch, isActive: warehouseStatusFilter, isTransit: warehouseTransitFilter },
        token,
      ),
  });

  const goodsReceiptsQuery = useQuery({
    queryKey: queryKeys.inventoryGoodsReceipts(token, {
      search: receiptSearch,
      status: receiptStatusFilter,
      warehouseId: receiptWarehouseFilter || undefined,
    }),
    queryFn: () =>
      getInventoryGoodsReceipts(
        {
          search: receiptSearch,
          status: receiptStatusFilter,
          warehouseId: receiptWarehouseFilter || undefined,
        },
        token,
      ),
  });

  const goodsIssuesQuery = useQuery({
    queryKey: queryKeys.inventoryGoodsIssues(token, {
      search: issueSearch,
      status: issueStatusFilter,
      warehouseId: issueWarehouseFilter || undefined,
    }),
    queryFn: () =>
      getInventoryGoodsIssues(
        {
          search: issueSearch,
          status: issueStatusFilter,
          warehouseId: issueWarehouseFilter || undefined,
        },
        token,
      ),
  });

  const inventoryTransfersQuery = useQuery({
    queryKey: queryKeys.inventoryTransfers(token, {
      search: transferSearch,
      status: transferStatusFilter,
      sourceWarehouseId: transferSourceWarehouseFilter || undefined,
      destinationWarehouseId: transferDestinationWarehouseFilter || undefined,
    }),
    queryFn: () =>
      getInventoryTransfers(
        {
          search: transferSearch,
          status: transferStatusFilter,
          sourceWarehouseId: transferSourceWarehouseFilter || undefined,
          destinationWarehouseId: transferDestinationWarehouseFilter || undefined,
        },
        token,
      ),
  });

  const inventoryAdjustmentsQuery = useQuery({
    queryKey: queryKeys.inventoryAdjustments(token, {
      search: adjustmentSearch,
      status: adjustmentStatusFilter,
      warehouseId: adjustmentWarehouseFilter || undefined,
      reason: adjustmentReasonFilter || undefined,
    }),
    queryFn: () =>
      getInventoryAdjustments(
        {
          search: adjustmentSearch,
          status: adjustmentStatusFilter,
          warehouseId: adjustmentWarehouseFilter || undefined,
          reason: adjustmentReasonFilter || undefined,
        },
        token,
      ),
  });

  const inventoryStockLedgerQuery = useQuery({
    queryKey: queryKeys.inventoryStockLedger(token, {
      search: stockLedgerSearch,
      itemId: stockLedgerItemFilter || undefined,
      warehouseId: stockLedgerWarehouseFilter || undefined,
      movementType: stockLedgerMovementTypeFilter || undefined,
    }),
    queryFn: () =>
      getInventoryStockLedger(
        {
          search: stockLedgerSearch,
          itemId: stockLedgerItemFilter || undefined,
          warehouseId: stockLedgerWarehouseFilter || undefined,
          movementType: stockLedgerMovementTypeFilter || undefined,
        },
        token,
      ),
  });

  const inventoryPolicyQuery = useQuery({
    queryKey: queryKeys.inventoryPolicy(token),
    queryFn: () => getInventoryPolicy(token),
  });

  const inventoryAccountsQuery = useQuery({
    queryKey: queryKeys.accounts(token, { isPosting: "true", isActive: "true", type: "ASSET", view: "selector" }),
    queryFn: () => getAccountOptions({ isPosting: "true", isActive: "true", type: "ASSET" }, token),
    staleTime: 5 * 60 * 1000,
  });

  const cogsAccountsQuery = useQuery({
    queryKey: queryKeys.accounts(token, { isPosting: "true", isActive: "true", type: "EXPENSE", view: "selector" }),
    queryFn: () => getAccountOptions({ isPosting: "true", isActive: "true", type: "EXPENSE" }, token),
    staleTime: 5 * 60 * 1000,
  });

  const salesAccountsQuery = useQuery({
    queryKey: queryKeys.accounts(token, { isPosting: "true", isActive: "true", type: "REVENUE", view: "selector" }),
    queryFn: () => getAccountOptions({ isPosting: "true", isActive: "true", type: "REVENUE" }, token),
    staleTime: 5 * 60 * 1000,
  });

  const adjustmentAccountsQuery = useQuery({
    queryKey: queryKeys.accounts(token, { isPosting: "true", isActive: "true", view: "selector" }),
    queryFn: () => getAccountOptions({ isPosting: "true", isActive: "true" }, token),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (inventoryPolicyQuery.data?.costingMethod) {
      setCostingMethodDraft(inventoryPolicyQuery.data.costingMethod);
    }
  }, [inventoryPolicyQuery.data?.costingMethod]);

  const updateInventoryPolicyMutation = useMutation({
    mutationFn: () => updateInventoryPolicy({ costingMethod: costingMethodDraft }, token),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["inventory-policy"] });
    },
  });

  const createItemMutation = useMutation({
    mutationFn: () => createInventoryItem(mapItemEditorToPayload(itemEditor), token),
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      setSelectedItemId(created.id);
      closeItemEditor();
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: () => updateInventoryItem(itemEditor.id!, mapItemEditorToPayload(itemEditor), token),
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      setSelectedItemId(updated.id);
      closeItemEditor();
    },
  });

  const deactivateItemMutation = useMutation({
    mutationFn: (id: string) => deactivateInventoryItem(id, token),
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      await queryClient.invalidateQueries({ queryKey: ["inventory-warehouses"] });
      setSelectedItemId(updated.id);
    },
  });

  const createWarehouseMutation = useMutation({
    mutationFn: () => createInventoryWarehouse(mapWarehouseEditorToPayload(warehouseEditor), token),
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ["inventory-warehouses"] });
      setSelectedWarehouseId(created.id);
      closeWarehouseEditor();
    },
  });

  const updateWarehouseMutation = useMutation({
    mutationFn: () => updateInventoryWarehouse(warehouseEditor.id!, mapWarehouseEditorToPayload(warehouseEditor), token),
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({ queryKey: ["inventory-warehouses"] });
      await queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      setSelectedWarehouseId(updated.id);
      closeWarehouseEditor();
    },
  });

  const deactivateWarehouseMutation = useMutation({
    mutationFn: (id: string) => deactivateInventoryWarehouse(id, token),
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({ queryKey: ["inventory-warehouses"] });
      await queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      setSelectedWarehouseId(updated.id);
    },
  });

  const createReceiptMutation = useMutation({
    mutationFn: () => createInventoryGoodsReceipt(mapReceiptEditorToPayload(receiptEditor), token),
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ["inventory-goods-receipts"] });
      setSelectedReceiptId(created.id);
      closeReceiptEditor();
    },
  });

  const updateReceiptMutation = useMutation({
    mutationFn: () => updateInventoryGoodsReceipt(receiptEditor.id!, mapReceiptEditorToPayload(receiptEditor), token),
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({ queryKey: ["inventory-goods-receipts"] });
      setSelectedReceiptId(updated.id);
      closeReceiptEditor();
    },
  });

  const postReceiptMutation = useMutation({
    mutationFn: (id: string) => postInventoryGoodsReceipt(id, token),
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({ queryKey: ["inventory-goods-receipts"] });
      await queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      await queryClient.invalidateQueries({ queryKey: ["inventory-stock-ledger"] });
      setSelectedReceiptId(updated.id);
    },
  });

  const cancelReceiptMutation = useMutation({
    mutationFn: (id: string) => cancelInventoryGoodsReceipt(id, token),
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({ queryKey: ["inventory-goods-receipts"] });
      setSelectedReceiptId(updated.id);
    },
  });

  const reverseReceiptMutation = useMutation({
    mutationFn: (id: string) => reverseInventoryGoodsReceipt(id, token),
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({ queryKey: ["inventory-goods-receipts"] });
      await queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      await queryClient.invalidateQueries({ queryKey: ["inventory-stock-ledger"] });
      setSelectedReceiptId(updated.id);
    },
  });

  const createIssueMutation = useMutation({
    mutationFn: () => createInventoryGoodsIssue(mapIssueEditorToPayload(issueEditor), token),
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ["inventory-goods-issues"] });
      setSelectedIssueId(created.id);
      closeIssueEditor();
    },
  });

  const updateIssueMutation = useMutation({
    mutationFn: () => updateInventoryGoodsIssue(issueEditor.id!, mapIssueEditorToPayload(issueEditor), token),
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({ queryKey: ["inventory-goods-issues"] });
      setSelectedIssueId(updated.id);
      closeIssueEditor();
    },
  });

  const postIssueMutation = useMutation({
    mutationFn: (id: string) => postInventoryGoodsIssue(id, token),
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({ queryKey: ["inventory-goods-issues"] });
      await queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      await queryClient.invalidateQueries({ queryKey: ["inventory-stock-ledger"] });
      setSelectedIssueId(updated.id);
    },
  });

  const cancelIssueMutation = useMutation({
    mutationFn: (id: string) => cancelInventoryGoodsIssue(id, token),
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({ queryKey: ["inventory-goods-issues"] });
      setSelectedIssueId(updated.id);
    },
  });

  const reverseIssueMutation = useMutation({
    mutationFn: (id: string) => reverseInventoryGoodsIssue(id, token),
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({ queryKey: ["inventory-goods-issues"] });
      await queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      await queryClient.invalidateQueries({ queryKey: ["inventory-stock-ledger"] });
      setSelectedIssueId(updated.id);
    },
  });

  const createTransferMutation = useMutation({
    mutationFn: () => createInventoryTransfer(mapTransferEditorToPayload(transferEditor), token),
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ["inventory-transfers"] });
      setSelectedTransferId(created.id);
      closeTransferEditor();
    },
  });

  const updateTransferMutation = useMutation({
    mutationFn: () => updateInventoryTransfer(transferEditor.id!, mapTransferEditorToPayload(transferEditor), token),
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({ queryKey: ["inventory-transfers"] });
      setSelectedTransferId(updated.id);
      closeTransferEditor();
    },
  });

  const postTransferMutation = useMutation({
    mutationFn: (id: string) => postInventoryTransfer(id, token),
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({ queryKey: ["inventory-transfers"] });
      await queryClient.invalidateQueries({ queryKey: ["inventory-stock-ledger"] });
      setSelectedTransferId(updated.id);
    },
  });

  const cancelTransferMutation = useMutation({
    mutationFn: (id: string) => cancelInventoryTransfer(id, token),
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({ queryKey: ["inventory-transfers"] });
      setSelectedTransferId(updated.id);
    },
  });

  const reverseTransferMutation = useMutation({
    mutationFn: (id: string) => reverseInventoryTransfer(id, token),
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({ queryKey: ["inventory-transfers"] });
      await queryClient.invalidateQueries({ queryKey: ["inventory-stock-ledger"] });
      setSelectedTransferId(updated.id);
    },
  });

  const createAdjustmentMutation = useMutation({
    mutationFn: () => createInventoryAdjustment(mapAdjustmentEditorToPayload(adjustmentEditor), token),
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ["inventory-adjustments"] });
      setSelectedAdjustmentId(created.id);
      closeAdjustmentEditor();
    },
  });

  const updateAdjustmentMutation = useMutation({
    mutationFn: () => updateInventoryAdjustment(adjustmentEditor.id!, mapAdjustmentEditorToPayload(adjustmentEditor), token),
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({ queryKey: ["inventory-adjustments"] });
      setSelectedAdjustmentId(updated.id);
      closeAdjustmentEditor();
    },
  });

  const postAdjustmentMutation = useMutation({
    mutationFn: (id: string) => postInventoryAdjustment(id, token),
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({ queryKey: ["inventory-adjustments"] });
      await queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      await queryClient.invalidateQueries({ queryKey: ["inventory-stock-ledger"] });
      setSelectedAdjustmentId(updated.id);
    },
  });

  const cancelAdjustmentMutation = useMutation({
    mutationFn: (id: string) => cancelInventoryAdjustment(id, token),
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({ queryKey: ["inventory-adjustments"] });
      setSelectedAdjustmentId(updated.id);
    },
  });

  const reverseAdjustmentMutation = useMutation({
    mutationFn: (id: string) => reverseInventoryAdjustment(id, token),
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({ queryKey: ["inventory-adjustments"] });
      await queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      await queryClient.invalidateQueries({ queryKey: ["inventory-stock-ledger"] });
      setSelectedAdjustmentId(updated.id);
    },
  });

  const items = inventoryItemsQuery.data ?? [];
  const warehouses = inventoryWarehousesQuery.data ?? [];
  const receipts = goodsReceiptsQuery.data ?? [];
  const issues = goodsIssuesQuery.data ?? [];
  const transfers = inventoryTransfersQuery.data ?? [];
  const adjustments = inventoryAdjustmentsQuery.data ?? [];
  const stockMovements = inventoryStockLedgerQuery.data ?? [];

  const selectedItem = items.find((row) => row.id === (selectedItemId ?? items[0]?.id)) ?? items[0] ?? null;
  const selectedWarehouse =
    warehouses.find((row) => row.id === (selectedWarehouseId ?? warehouses[0]?.id)) ?? warehouses[0] ?? null;
  const selectedReceipt = receipts.find((row) => row.id === (selectedReceiptId ?? receipts[0]?.id)) ?? receipts[0] ?? null;
  const selectedIssue = issues.find((row) => row.id === (selectedIssueId ?? issues[0]?.id)) ?? issues[0] ?? null;
  const selectedTransfer =
    transfers.find((row) => row.id === (selectedTransferId ?? transfers[0]?.id)) ?? transfers[0] ?? null;
  const selectedAdjustment =
    adjustments.find((row) => row.id === (selectedAdjustmentId ?? adjustments[0]?.id)) ?? adjustments[0] ?? null;

  const itemFormError = getItemFormError(itemEditor);
  const warehouseFormError = getWarehouseFormError(warehouseEditor);
  const receiptFormError = getReceiptFormError(receiptEditor);
  const issueFormError = getIssueFormError(issueEditor);
  const transferFormError = getTransferFormError(transferEditor);
  const adjustmentFormError = getAdjustmentFormError(adjustmentEditor);

  const itemMutationError = getMutationError(createItemMutation.error, updateItemMutation.error, deactivateItemMutation.error);
  const warehouseMutationError = getMutationError(
    createWarehouseMutation.error,
    updateWarehouseMutation.error,
    deactivateWarehouseMutation.error,
  );
  const receiptMutationError = getMutationError(
    createReceiptMutation.error,
    updateReceiptMutation.error,
    postReceiptMutation.error,
    cancelReceiptMutation.error,
    reverseReceiptMutation.error,
  );
  const issueMutationError = getMutationError(
    createIssueMutation.error,
    updateIssueMutation.error,
    postIssueMutation.error,
    cancelIssueMutation.error,
    reverseIssueMutation.error,
  );
  const transferMutationError = getMutationError(
    createTransferMutation.error,
    updateTransferMutation.error,
    postTransferMutation.error,
    cancelTransferMutation.error,
    reverseTransferMutation.error,
  );
  const adjustmentMutationError = getMutationError(
    createAdjustmentMutation.error,
    updateAdjustmentMutation.error,
    postAdjustmentMutation.error,
    cancelAdjustmentMutation.error,
    reverseAdjustmentMutation.error,
  );
  const policyMutationError = getMutationError(updateInventoryPolicyMutation.error);

  const activeItems = items.filter((row) => row.isActive).length;
  const activeWarehouses = warehouses.filter((row) => row.isActive).length;
  const postedReceipts = receipts.filter((row) => row.status === "POSTED").length;
  const postedIssues = issues.filter((row) => row.status === "POSTED").length;
  const postedTransfers = transfers.filter((row) => row.status === "POSTED").length;
  const postedAdjustments = adjustments.filter((row) => row.status === "POSTED").length;

  return (
    <PageShell>
      <div className="space-y-10">
        <SectionHeading title={t("inventory.title")} description={t("inventory.description")} />

        <div className="grid gap-4 md:grid-cols-4 xl:grid-cols-8">
          <MetricCard label={t("inventory.metrics.total")} value={String(items.length)} />
          <MetricCard label={t("inventory.metrics.active")} value={String(activeItems)} />
          <MetricCard label={t("inventory.metrics.warehouses")} value={String(warehouses.length)} />
          <MetricCard label={t("inventory.metrics.activeWarehouses")} value={String(activeWarehouses)} />
          <MetricCard label={t("inventory.metrics.receipts")} value={String(receipts.length)} />
          <MetricCard label={t("inventory.metrics.postedReceipts")} value={String(postedReceipts)} />
          <MetricCard label={t("inventory.metrics.issues")} value={String(issues.length)} />
          <MetricCard label={t("inventory.metrics.postedIssues")} value={String(postedIssues)} />
          <MetricCard label={t("inventory.metrics.transfers")} value={String(transfers.length)} />
          <MetricCard label={t("inventory.metrics.postedTransfers")} value={String(postedTransfers)} />
          <MetricCard label={t("inventory.metrics.adjustments")} value={String(adjustments.length)} />
          <MetricCard label={t("inventory.metrics.postedAdjustments")} value={String(postedAdjustments)} />
          <MetricCard label={t("inventory.metrics.stockMovements")} value={String(stockMovements.length)} />
        </div>

        <section id="inventory-policy-section" className="space-y-5">
          <SectionHeading title={t("inventory.policy.title")} description={t("inventory.policy.description")} />
          <Card className="space-y-4">
            <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
              <Field label={t("inventory.policy.field.costingMethod")}>
                <Select value={costingMethodDraft} onChange={(event) => setCostingMethodDraft(event.target.value as InventoryCostingMethod)}>
                  <option value="WEIGHTED_AVERAGE">{t("inventory.policy.costingMethod.WEIGHTED_AVERAGE")}</option>
                  <option value="FIFO">{t("inventory.policy.costingMethod.FIFO")}</option>
                </Select>
              </Field>
              <Button
                onClick={() => updateInventoryPolicyMutation.mutate()}
                disabled={
                  updateInventoryPolicyMutation.isPending ||
                  inventoryPolicyQuery.isLoading ||
                  costingMethodDraft === inventoryPolicyQuery.data?.costingMethod
                }
              >
                {t("inventory.policy.button.save")}
              </Button>
            </div>
            {policyMutationError ? <ErrorBox message={policyMutationError} /> : null}
          </Card>
        </section>

        <section id="inventory-items-section" className="space-y-5">
          <SectionHeading
            title={t("inventory.items.title")}
            description={t("inventory.items.description")}
            action={<Button onClick={() => openNewItem()}>{t("inventory.button.newItem")}</Button>}
          />

          <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
            <Card className="space-y-5">
              <div className="flex flex-col gap-4 lg:flex-row">
                <Input value={itemSearch} onChange={(event) => setItemSearch(event.target.value)} placeholder={t("inventory.filters.search")} />
                <Select value={itemStatusFilter} onChange={(event) => setItemStatusFilter(event.target.value as "" | "true" | "false")}>
                  <option value="">{t("inventory.filters.allStatuses")}</option>
                  <option value="true">{t("inventory.filters.activeOnly")}</option>
                  <option value="false">{t("inventory.filters.inactiveOnly")}</option>
                </Select>
                <Select value={itemTypeFilter} onChange={(event) => setItemTypeFilter(event.target.value as InventoryItemType | "")}>
                  <option value="">{t("inventory.filters.allTypes")}</option>
                  {ITEM_TYPE_OPTIONS.map((type) => (
                    <option key={type} value={type}>
                      {t(`inventory.type.${type}`)}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-3">
                {inventoryItemsQuery.isLoading ? (
                  <div className="text-sm text-gray-500">{t("inventory.loading")}</div>
                ) : items.length === 0 ? (
                  <EmptyState message={t("inventory.empty")} />
                ) : (
                  items.map((item) => {
                    const isSelected = selectedItem?.id === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedItemId(item.id)}
                        className={`w-full rounded-2xl border px-5 py-4 text-left transition ${
                          isSelected ? "border-teal-200 bg-teal-50/60" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <div className="text-xs font-black uppercase tracking-[0.18em] text-gray-500">{item.code}</div>
                            <div className="text-lg font-black tracking-tight text-gray-900">{item.name}</div>
                            <div className="text-sm text-gray-600">
                              {t(`inventory.type.${item.type}`)} · {item.unitOfMeasure}
                              {item.category ? ` · ${item.category}` : ""}
                            </div>
                          </div>
                          <StatusPill
                            label={item.isActive ? t("inventory.status.active") : t("inventory.status.inactive")}
                            tone={item.isActive ? "positive" : "warning"}
                          />
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </Card>

            <Card className="space-y-4">
              {selectedItem ? (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="text-xs font-black uppercase tracking-[0.18em] text-gray-500">{selectedItem.code}</div>
                      <h2 className="text-2xl font-black tracking-tight text-gray-900">{selectedItem.name}</h2>
                    </div>
                    <StatusPill
                      label={selectedItem.isActive ? t("inventory.status.active") : t("inventory.status.inactive")}
                      tone={selectedItem.isActive ? "positive" : "warning"}
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <DetailCard label={t("inventory.detail.type")} value={t(`inventory.type.${selectedItem.type}`)} />
                    <DetailCard label={t("inventory.detail.unit")} value={selectedItem.unitOfMeasure} />
                    <DetailCard label={t("inventory.detail.onHand")} value={selectedItem.onHandQuantity} />
                    <DetailCard label={t("inventory.detail.valuation")} value={selectedItem.valuationAmount} />
                    <DetailCard label={t("inventory.detail.reorderLevel")} value={selectedItem.reorderLevel} />
                    <DetailCard label={t("inventory.detail.reorderQuantity")} value={selectedItem.reorderQuantity} />
                  </div>

                  {selectedItem.description ? <p className="text-sm leading-7 text-gray-600">{selectedItem.description}</p> : null}

                  <div className="space-y-2 text-sm leading-7 text-gray-600">
                    <AccountLine label={t("inventory.detail.inventoryAccount")} account={selectedItem.inventoryAccount} />
                    <AccountLine label={t("inventory.detail.cogsAccount")} account={selectedItem.cogsAccount} />
                    <AccountLine label={t("inventory.detail.salesAccount")} account={selectedItem.salesAccount} />
                    <AccountLine label={t("inventory.detail.adjustmentAccount")} account={selectedItem.adjustmentAccount} />
                    <div>
                      <span className="font-semibold text-gray-900">{t("inventory.detail.preferredWarehouse")}:</span>{" "}
                      {selectedItem.preferredWarehouse
                        ? `${selectedItem.preferredWarehouse.code} · ${selectedItem.preferredWarehouse.name}`
                        : selectedItem.preferredWarehouseCode || t("inventory.emptyValue")}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 pt-2">
                    <Button variant="secondary" onClick={() => openEditItem(selectedItem)} disabled={!selectedItem.isActive}>
                      {t("inventory.button.edit")}
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => confirmDeactivateItem(selectedItem.id)}
                      disabled={!selectedItem.isActive || deactivateItemMutation.isPending}
                    >
                      {t("inventory.button.deactivate")}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-sm leading-7 text-gray-500">{t("inventory.details.empty")}</div>
              )}
            </Card>
          </div>
        </section>

        <section id="inventory-issues-section" className="space-y-5">
          <SectionHeading
            title={t("inventory.issues.title")}
            description={t("inventory.issues.description")}
            action={<Button onClick={() => openNewIssue()}>{t("inventory.button.newIssue")}</Button>}
          />

          <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
            <Card className="space-y-5">
              <div className="flex flex-col gap-4 lg:flex-row">
                <Input
                  value={issueSearch}
                  onChange={(event) => setIssueSearch(event.target.value)}
                  placeholder={t("inventory.issues.filters.search")}
                />
                <Select value={issueStatusFilter} onChange={(event) => setIssueStatusFilter(event.target.value as InventoryIssueStatus | "")}>
                  <option value="">{t("inventory.issues.filters.allStatuses")}</option>
                  {ISSUE_STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {t(`inventory.issues.status.${status}`)}
                    </option>
                  ))}
                </Select>
                <Select value={issueWarehouseFilter} onChange={(event) => setIssueWarehouseFilter(event.target.value)}>
                  <option value="">{t("inventory.issues.filters.allWarehouses")}</option>
                  {warehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.code} · {warehouse.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-3">
                {goodsIssuesQuery.isLoading ? (
                  <div className="text-sm text-gray-500">{t("inventory.issues.loading")}</div>
                ) : issues.length === 0 ? (
                  <EmptyState message={t("inventory.issues.empty")} />
                ) : (
                  issues.map((issue) => {
                    const isSelected = selectedIssue?.id === issue.id;
                    return (
                      <button
                        key={issue.id}
                        type="button"
                        onClick={() => setSelectedIssueId(issue.id)}
                        className={`w-full rounded-2xl border px-5 py-4 text-left transition ${
                          isSelected ? "border-rose-200 bg-rose-50/60" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <div className="text-xs font-black uppercase tracking-[0.18em] text-gray-500">{issue.reference}</div>
                            <div className="text-lg font-black tracking-tight text-gray-900">{issue.warehouse.name}</div>
                            <div className="text-sm text-gray-600">
                              {issue.totalQuantity} · {issue.totalAmount}
                            </div>
                          </div>
                          <StatusPill label={t(`inventory.issues.status.${issue.status}`)} tone={issueTone(issue.status)} />
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </Card>

            <Card className="space-y-4">
              {selectedIssue ? (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="text-xs font-black uppercase tracking-[0.18em] text-gray-500">{selectedIssue.reference}</div>
                      <h2 className="text-2xl font-black tracking-tight text-gray-900">{selectedIssue.warehouse.name}</h2>
                    </div>
                    <StatusPill label={t(`inventory.issues.status.${selectedIssue.status}`)} tone={issueTone(selectedIssue.status)} />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <DetailCard label={t("inventory.issues.detail.date")} value={selectedIssue.issueDate.slice(0, 10)} />
                    <DetailCard label={t("inventory.issues.detail.lines")} value={String(selectedIssue.lines.length)} />
                    <DetailCard label={t("inventory.issues.detail.totalQuantity")} value={selectedIssue.totalQuantity} />
                    <DetailCard label={t("inventory.issues.detail.totalAmount")} value={selectedIssue.totalAmount} />
                  </div>

                  <div className="space-y-2 text-sm leading-7 text-gray-600">
                    <div>
                      <span className="font-semibold text-gray-900">{t("inventory.issues.field.warehouse")}:</span>{" "}
                      {selectedIssue.warehouse.code} · {selectedIssue.warehouse.name}
                    </div>
                    <div>
                      <span className="font-semibold text-gray-900">{t("inventory.issues.field.sourceSalesOrder")}:</span>{" "}
                      {selectedIssue.sourceSalesOrderRef || t("inventory.emptyValue")}
                    </div>
                    <div>
                      <span className="font-semibold text-gray-900">{t("inventory.issues.field.sourceSalesInvoice")}:</span>{" "}
                      {selectedIssue.sourceSalesInvoiceRef || t("inventory.emptyValue")}
                    </div>
                    <div>
                      <span className="font-semibold text-gray-900">{t("inventory.issues.field.sourceProductionRequest")}:</span>{" "}
                      {selectedIssue.sourceProductionRequestRef || t("inventory.emptyValue")}
                    </div>
                    <div>
                      <span className="font-semibold text-gray-900">{t("inventory.issues.field.sourceInternalRequest")}:</span>{" "}
                      {selectedIssue.sourceInternalRequestRef || t("inventory.emptyValue")}
                    </div>
                    <div>
                      <span className="font-semibold text-gray-900">{t("inventory.issues.field.postedAt")}:</span>{" "}
                      {selectedIssue.postedAt ? selectedIssue.postedAt.slice(0, 10) : t("inventory.issues.notPosted")}
                    </div>
                  </div>

                  {selectedIssue.description ? <p className="text-sm leading-7 text-gray-600">{selectedIssue.description}</p> : null}

                  <div className="space-y-2 rounded-2xl border border-gray-200 p-4">
                    <div className="text-xs font-black uppercase tracking-[0.18em] text-gray-500">
                      {t("inventory.issues.lines.title")}
                    </div>
                    {selectedIssue.lines.map((line) => (
                      <div key={line.id} className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
                        <div className="font-semibold text-gray-900">
                          {line.item.code} · {line.item.name}
                        </div>
                        <div>
                          {line.quantity} {line.unitOfMeasure} · {line.unitCost} · {line.lineTotalAmount}
                        </div>
                        <div>
                          {t("inventory.issues.detail.available")}: {line.item.onHandQuantity}
                        </div>
                        {line.description ? <div>{line.description}</div> : null}
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-3 pt-2">
                    <Button variant="secondary" onClick={() => openEditIssue(selectedIssue)} disabled={!selectedIssue.canEdit}>
                      {t("inventory.button.editIssue")}
                    </Button>
                    <Button
                      onClick={() => confirmPostIssue(selectedIssue.id)}
                      disabled={!selectedIssue.canPost || postIssueMutation.isPending}
                    >
                      {t("inventory.button.postIssue")}
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => confirmCancelIssue(selectedIssue.id)}
                      disabled={!selectedIssue.canCancel || cancelIssueMutation.isPending}
                    >
                      {t("inventory.button.cancelIssue")}
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => confirmReverseIssue(selectedIssue.id)}
                      disabled={!selectedIssue.canReverse || reverseIssueMutation.isPending}
                    >
                      {t("inventory.button.reverseIssue")}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-sm leading-7 text-gray-500">{t("inventory.issues.details.empty")}</div>
              )}
            </Card>
          </div>
        </section>

        <section id="inventory-transfers-section" className="space-y-5">
          <SectionHeading
            title={t("inventory.transfers.title")}
            description={t("inventory.transfers.description")}
            action={<Button onClick={() => openNewTransfer()}>{t("inventory.button.newTransfer")}</Button>}
          />

          <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
            <Card className="space-y-5">
              <div className="flex flex-col gap-4 lg:flex-row">
                <Input
                  value={transferSearch}
                  onChange={(event) => setTransferSearch(event.target.value)}
                  placeholder={t("inventory.transfers.filters.search")}
                />
                <Select
                  value={transferStatusFilter}
                  onChange={(event) => setTransferStatusFilter(event.target.value as InventoryTransferStatus | "")}
                >
                  <option value="">{t("inventory.transfers.filters.allStatuses")}</option>
                  {TRANSFER_STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {t(`inventory.transfers.status.${status}`)}
                    </option>
                  ))}
                </Select>
                <Select value={transferSourceWarehouseFilter} onChange={(event) => setTransferSourceWarehouseFilter(event.target.value)}>
                  <option value="">{t("inventory.transfers.filters.allSourceWarehouses")}</option>
                  {warehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.code} Â· {warehouse.name}
                    </option>
                  ))}
                </Select>
                <Select
                  value={transferDestinationWarehouseFilter}
                  onChange={(event) => setTransferDestinationWarehouseFilter(event.target.value)}
                >
                  <option value="">{t("inventory.transfers.filters.allDestinationWarehouses")}</option>
                  {warehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.code} Â· {warehouse.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-3">
                {inventoryTransfersQuery.isLoading ? (
                  <div className="text-sm text-gray-500">{t("inventory.transfers.loading")}</div>
                ) : transfers.length === 0 ? (
                  <EmptyState message={t("inventory.transfers.empty")} />
                ) : (
                  transfers.map((transfer) => {
                    const isSelected = selectedTransfer?.id === transfer.id;
                    return (
                      <button
                        key={transfer.id}
                        type="button"
                        onClick={() => setSelectedTransferId(transfer.id)}
                        className={`w-full rounded-2xl border px-5 py-4 text-left transition ${
                          isSelected ? "border-violet-200 bg-violet-50/60" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <div className="text-xs font-black uppercase tracking-[0.18em] text-gray-500">{transfer.reference}</div>
                            <div className="text-lg font-black tracking-tight text-gray-900">
                              {transfer.sourceWarehouse.name} â†’ {transfer.destinationWarehouse.name}
                            </div>
                            <div className="text-sm text-gray-600">
                              {transfer.totalQuantity} Â· {transfer.totalAmount}
                            </div>
                          </div>
                          <StatusPill label={t(`inventory.transfers.status.${transfer.status}`)} tone={transferTone(transfer.status)} />
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </Card>

            <Card className="space-y-4">
              {selectedTransfer ? (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="text-xs font-black uppercase tracking-[0.18em] text-gray-500">{selectedTransfer.reference}</div>
                      <h2 className="text-2xl font-black tracking-tight text-gray-900">
                        {selectedTransfer.sourceWarehouse.name} â†’ {selectedTransfer.destinationWarehouse.name}
                      </h2>
                    </div>
                    <StatusPill
                      label={t(`inventory.transfers.status.${selectedTransfer.status}`)}
                      tone={transferTone(selectedTransfer.status)}
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <DetailCard label={t("inventory.transfers.detail.date")} value={selectedTransfer.transferDate.slice(0, 10)} />
                    <DetailCard label={t("inventory.transfers.detail.lines")} value={String(selectedTransfer.lines.length)} />
                    <DetailCard label={t("inventory.transfers.detail.totalQuantity")} value={selectedTransfer.totalQuantity} />
                    <DetailCard label={t("inventory.transfers.detail.totalAmount")} value={selectedTransfer.totalAmount} />
                  </div>

                  <div className="space-y-2 text-sm leading-7 text-gray-600">
                    <div>
                      <span className="font-semibold text-gray-900">{t("inventory.transfers.field.sourceWarehouse")}:</span>{" "}
                      {selectedTransfer.sourceWarehouse.code} Â· {selectedTransfer.sourceWarehouse.name}
                    </div>
                    <div>
                      <span className="font-semibold text-gray-900">{t("inventory.transfers.field.destinationWarehouse")}:</span>{" "}
                      {selectedTransfer.destinationWarehouse.code} Â· {selectedTransfer.destinationWarehouse.name}
                    </div>
                    <div>
                      <span className="font-semibold text-gray-900">{t("inventory.transfers.field.postedAt")}:</span>{" "}
                      {selectedTransfer.postedAt ? selectedTransfer.postedAt.slice(0, 10) : t("inventory.transfers.notPosted")}
                    </div>
                  </div>

                  {selectedTransfer.description ? <p className="text-sm leading-7 text-gray-600">{selectedTransfer.description}</p> : null}

                  <div className="space-y-2 rounded-2xl border border-gray-200 p-4">
                    <div className="text-xs font-black uppercase tracking-[0.18em] text-gray-500">
                      {t("inventory.transfers.lines.title")}
                    </div>
                    {selectedTransfer.lines.map((line) => (
                      <div key={line.id} className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
                        <div className="font-semibold text-gray-900">
                          {line.item.code} Â· {line.item.name}
                        </div>
                        <div>
                          {line.quantity} {line.unitOfMeasure} Â· {line.unitCost} Â· {line.lineTotalAmount}
                        </div>
                        <div>
                          {t("inventory.transfers.detail.available")}: {line.item.onHandQuantity}
                        </div>
                        {line.description ? <div>{line.description}</div> : null}
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-3 pt-2">
                    <Button
                      variant="secondary"
                      onClick={() => openEditTransfer(selectedTransfer)}
                      disabled={!selectedTransfer.canEdit}
                    >
                      {t("inventory.button.editTransfer")}
                    </Button>
                    <Button
                      onClick={() => confirmPostTransfer(selectedTransfer.id)}
                      disabled={!selectedTransfer.canPost || postTransferMutation.isPending}
                    >
                      {t("inventory.button.postTransfer")}
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => confirmCancelTransfer(selectedTransfer.id)}
                      disabled={!selectedTransfer.canCancel || cancelTransferMutation.isPending}
                    >
                      {t("inventory.button.cancelTransfer")}
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => confirmReverseTransfer(selectedTransfer.id)}
                      disabled={!selectedTransfer.canReverse || reverseTransferMutation.isPending}
                    >
                      {t("inventory.button.reverseTransfer")}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-sm leading-7 text-gray-500">{t("inventory.transfers.details.empty")}</div>
              )}
            </Card>
          </div>
        </section>

        <section id="inventory-adjustments-section" className="space-y-5">
          <SectionHeading
            title={t("inventory.adjustments.title")}
            description={t("inventory.adjustments.description")}
            action={<Button onClick={() => openNewAdjustment()}>{t("inventory.button.newAdjustment")}</Button>}
          />

          <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
            <Card className="space-y-5">
              <div className="flex flex-col gap-4 lg:flex-row">
                <Input
                  value={adjustmentSearch}
                  onChange={(event) => setAdjustmentSearch(event.target.value)}
                  placeholder={t("inventory.adjustments.filters.search")}
                />
                <Select
                  value={adjustmentStatusFilter}
                  onChange={(event) => setAdjustmentStatusFilter(event.target.value as InventoryAdjustmentStatus | "")}
                >
                  <option value="">{t("inventory.adjustments.filters.allStatuses")}</option>
                  {ADJUSTMENT_STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {t(`inventory.adjustments.status.${status}`)}
                    </option>
                  ))}
                </Select>
                <Select value={adjustmentWarehouseFilter} onChange={(event) => setAdjustmentWarehouseFilter(event.target.value)}>
                  <option value="">{t("inventory.adjustments.filters.allWarehouses")}</option>
                  {warehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.code} · {warehouse.name}
                    </option>
                  ))}
                </Select>
                <Input
                  value={adjustmentReasonFilter}
                  onChange={(event) => setAdjustmentReasonFilter(event.target.value)}
                  placeholder={t("inventory.adjustments.filters.reason")}
                />
              </div>

              <div className="space-y-3">
                {inventoryAdjustmentsQuery.isLoading ? (
                  <div className="text-sm text-gray-500">{t("inventory.adjustments.loading")}</div>
                ) : adjustments.length === 0 ? (
                  <EmptyState message={t("inventory.adjustments.empty")} />
                ) : (
                  adjustments.map((adjustment) => {
                    const isSelected = selectedAdjustment?.id === adjustment.id;
                    return (
                      <button
                        key={adjustment.id}
                        type="button"
                        onClick={() => setSelectedAdjustmentId(adjustment.id)}
                        className={`w-full rounded-2xl border px-5 py-4 text-left transition ${
                          isSelected ? "border-emerald-200 bg-emerald-50/60" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <div className="text-xs font-black uppercase tracking-[0.18em] text-gray-500">{adjustment.reference}</div>
                            <div className="text-lg font-black tracking-tight text-gray-900">
                              {adjustment.warehouse.name}
                            </div>
                            <div className="text-sm text-gray-600">
                              {adjustment.reason} · {adjustment.totalVarianceQuantity} · {adjustment.totalAmount}
                            </div>
                          </div>
                          <StatusPill label={t(`inventory.adjustments.status.${adjustment.status}`)} tone={adjustmentTone(adjustment.status)} />
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </Card>

            <Card className="space-y-4">
              {selectedAdjustment ? (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="text-xs font-black uppercase tracking-[0.18em] text-gray-500">{selectedAdjustment.reference}</div>
                      <h2 className="text-2xl font-black tracking-tight text-gray-900">{selectedAdjustment.warehouse.name}</h2>
                    </div>
                    <StatusPill
                      label={t(`inventory.adjustments.status.${selectedAdjustment.status}`)}
                      tone={adjustmentTone(selectedAdjustment.status)}
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <DetailCard label={t("inventory.adjustments.detail.date")} value={selectedAdjustment.adjustmentDate.slice(0, 10)} />
                    <DetailCard label={t("inventory.adjustments.detail.lines")} value={String(selectedAdjustment.lines.length)} />
                    <DetailCard label={t("inventory.adjustments.detail.totalVariance")} value={selectedAdjustment.totalVarianceQuantity} />
                    <DetailCard label={t("inventory.adjustments.detail.totalAmount")} value={selectedAdjustment.totalAmount} />
                  </div>

                  <div className="space-y-2 text-sm leading-7 text-gray-600">
                    <div>
                      <span className="font-semibold text-gray-900">{t("inventory.adjustments.field.warehouse")}:</span>{" "}
                      {selectedAdjustment.warehouse.code} · {selectedAdjustment.warehouse.name}
                    </div>
                    <div>
                      <span className="font-semibold text-gray-900">{t("inventory.adjustments.field.reason")}:</span>{" "}
                      {selectedAdjustment.reason}
                    </div>
                    <div>
                      <span className="font-semibold text-gray-900">{t("inventory.adjustments.field.postedAt")}:</span>{" "}
                      {selectedAdjustment.postedAt ? selectedAdjustment.postedAt.slice(0, 10) : t("inventory.adjustments.notPosted")}
                    </div>
                  </div>

                  {selectedAdjustment.description ? <p className="text-sm leading-7 text-gray-600">{selectedAdjustment.description}</p> : null}

                  <div className="space-y-2 rounded-2xl border border-gray-200 p-4">
                    <div className="text-xs font-black uppercase tracking-[0.18em] text-gray-500">
                      {t("inventory.adjustments.lines.title")}
                    </div>
                    {selectedAdjustment.lines.map((line) => (
                      <div key={line.id} className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
                        <div className="font-semibold text-gray-900">
                          {line.item.code} · {line.item.name}
                        </div>
                        <div>
                          {t("inventory.adjustments.detail.system")}: {line.systemQuantity} · {t("inventory.adjustments.detail.counted")}:{" "}
                          {line.countedQuantity}
                        </div>
                        <div>
                          {t("inventory.adjustments.detail.variance")}: {line.varianceQuantity} · {line.unitCost} · {line.lineTotalAmount}
                        </div>
                        {line.description ? <div>{line.description}</div> : null}
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-3 pt-2">
                    <Button
                      variant="secondary"
                      onClick={() => openEditAdjustment(selectedAdjustment)}
                      disabled={!selectedAdjustment.canEdit}
                    >
                      {t("inventory.button.editAdjustment")}
                    </Button>
                    <Button
                      onClick={() => confirmPostAdjustment(selectedAdjustment.id)}
                      disabled={!selectedAdjustment.canPost || postAdjustmentMutation.isPending}
                    >
                      {t("inventory.button.postAdjustment")}
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => confirmCancelAdjustment(selectedAdjustment.id)}
                      disabled={!selectedAdjustment.canCancel || cancelAdjustmentMutation.isPending}
                    >
                      {t("inventory.button.cancelAdjustment")}
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => confirmReverseAdjustment(selectedAdjustment.id)}
                      disabled={!selectedAdjustment.canReverse || reverseAdjustmentMutation.isPending}
                    >
                      {t("inventory.button.reverseAdjustment")}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-sm leading-7 text-gray-500">{t("inventory.adjustments.details.empty")}</div>
              )}
            </Card>
          </div>
        </section>

        <section id="inventory-warehouses-section" className="space-y-5">
          <SectionHeading
            title={t("inventory.warehouses.title")}
            description={t("inventory.warehouses.description")}
            action={<Button onClick={() => openNewWarehouse()}>{t("inventory.button.newWarehouse")}</Button>}
          />

          <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
            <Card className="space-y-5">
              <div className="flex flex-col gap-4 lg:flex-row">
                <Input
                  value={warehouseSearch}
                  onChange={(event) => setWarehouseSearch(event.target.value)}
                  placeholder={t("inventory.warehouses.filters.search")}
                />
                <Select value={warehouseStatusFilter} onChange={(event) => setWarehouseStatusFilter(event.target.value as "" | "true" | "false")}>
                  <option value="">{t("inventory.filters.allStatuses")}</option>
                  <option value="true">{t("inventory.filters.activeOnly")}</option>
                  <option value="false">{t("inventory.filters.inactiveOnly")}</option>
                </Select>
                <Select
                  value={warehouseTransitFilter}
                  onChange={(event) => setWarehouseTransitFilter(event.target.value as "" | "true" | "false")}
                >
                  <option value="">{t("inventory.warehouses.filters.allModes")}</option>
                  <option value="false">{t("inventory.warehouses.filters.storageOnly")}</option>
                  <option value="true">{t("inventory.warehouses.filters.transitOnly")}</option>
                </Select>
              </div>

              <div className="space-y-3">
                {inventoryWarehousesQuery.isLoading ? (
                  <div className="text-sm text-gray-500">{t("inventory.warehouses.loading")}</div>
                ) : warehouses.length === 0 ? (
                  <EmptyState message={t("inventory.warehouses.empty")} />
                ) : (
                  warehouses.map((warehouse) => {
                    const isSelected = selectedWarehouse?.id === warehouse.id;
                    return (
                      <button
                        key={warehouse.id}
                        type="button"
                        onClick={() => setSelectedWarehouseId(warehouse.id)}
                        className={`w-full rounded-2xl border px-5 py-4 text-left transition ${
                          isSelected ? "border-amber-200 bg-amber-50/60" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <div className="text-xs font-black uppercase tracking-[0.18em] text-gray-500">{warehouse.code}</div>
                            <div className="text-lg font-black tracking-tight text-gray-900">{warehouse.name}</div>
                            <div className="text-sm text-gray-600">
                              {warehouse.isTransit ? t("inventory.warehouses.mode.transit") : t("inventory.warehouses.mode.storage")} ·{" "}
                              {t("inventory.warehouses.itemCount", { count: warehouse.itemCount })}
                              {warehouse.isDefaultTransit ? ` Â· ${t("inventory.warehouses.badge.defaultTransit")}` : ""}
                            </div>
                          </div>
                          <StatusPill
                            label={warehouse.isActive ? t("inventory.status.active") : t("inventory.status.inactive")}
                            tone={warehouse.isActive ? "positive" : "warning"}
                          />
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </Card>

            <Card className="space-y-4">
              {selectedWarehouse ? (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="text-xs font-black uppercase tracking-[0.18em] text-gray-500">{selectedWarehouse.code}</div>
                      <h2 className="text-2xl font-black tracking-tight text-gray-900">{selectedWarehouse.name}</h2>
                    </div>
                    <StatusPill
                      label={selectedWarehouse.isActive ? t("inventory.status.active") : t("inventory.status.inactive")}
                      tone={selectedWarehouse.isActive ? "positive" : "warning"}
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <DetailCard
                      label={t("inventory.warehouses.detail.mode")}
                      value={
                        selectedWarehouse.isTransit
                          ? t("inventory.warehouses.mode.transit")
                          : t("inventory.warehouses.mode.storage")
                      }
                    />
                    <DetailCard
                      label={t("inventory.warehouses.detail.defaultTransit")}
                      value={selectedWarehouse.isDefaultTransit ? t("inventory.boolean.yes") : t("inventory.boolean.no")}
                    />
                    <DetailCard label={t("inventory.warehouses.detail.itemCount")} value={String(selectedWarehouse.itemCount)} />
                  </div>

                  <div className="space-y-2 text-sm leading-7 text-gray-600">
                    <div>
                      <span className="font-semibold text-gray-900">{t("inventory.warehouses.field.address")}:</span>{" "}
                      {selectedWarehouse.address || t("inventory.emptyValue")}
                    </div>
                    <div>
                      <span className="font-semibold text-gray-900">{t("inventory.warehouses.field.responsiblePerson")}:</span>{" "}
                      {selectedWarehouse.responsiblePerson || t("inventory.emptyValue")}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 pt-2">
                    <Button variant="secondary" onClick={() => openEditWarehouse(selectedWarehouse)} disabled={!selectedWarehouse.isActive}>
                      {t("inventory.button.editWarehouse")}
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => confirmDeactivateWarehouse(selectedWarehouse.id)}
                      disabled={!selectedWarehouse.isActive || deactivateWarehouseMutation.isPending}
                    >
                      {t("inventory.button.deactivate")}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-sm leading-7 text-gray-500">{t("inventory.warehouses.details.empty")}</div>
              )}
            </Card>
          </div>
        </section>

        <section id="inventory-receipts-section" className="space-y-5">
          <SectionHeading
            title={t("inventory.receipts.title")}
            description={t("inventory.receipts.description")}
            action={<Button onClick={() => openNewReceipt()}>{t("inventory.button.newReceipt")}</Button>}
          />

          <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
            <Card className="space-y-5">
              <div className="flex flex-col gap-4 lg:flex-row">
                <Input
                  value={receiptSearch}
                  onChange={(event) => setReceiptSearch(event.target.value)}
                  placeholder={t("inventory.receipts.filters.search")}
                />
                <Select value={receiptStatusFilter} onChange={(event) => setReceiptStatusFilter(event.target.value as InventoryReceiptStatus | "")}>
                  <option value="">{t("inventory.receipts.filters.allStatuses")}</option>
                  {RECEIPT_STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {t(`inventory.receipts.status.${status}`)}
                    </option>
                  ))}
                </Select>
                <Select value={receiptWarehouseFilter} onChange={(event) => setReceiptWarehouseFilter(event.target.value)}>
                  <option value="">{t("inventory.receipts.filters.allWarehouses")}</option>
                  {warehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.code} · {warehouse.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-3">
                {goodsReceiptsQuery.isLoading ? (
                  <div className="text-sm text-gray-500">{t("inventory.receipts.loading")}</div>
                ) : receipts.length === 0 ? (
                  <EmptyState message={t("inventory.receipts.empty")} />
                ) : (
                  receipts.map((receipt) => {
                    const isSelected = selectedReceipt?.id === receipt.id;
                    return (
                      <button
                        key={receipt.id}
                        type="button"
                        onClick={() => setSelectedReceiptId(receipt.id)}
                        className={`w-full rounded-2xl border px-5 py-4 text-left transition ${
                          isSelected ? "border-sky-200 bg-sky-50/60" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <div className="text-xs font-black uppercase tracking-[0.18em] text-gray-500">{receipt.reference}</div>
                            <div className="text-lg font-black tracking-tight text-gray-900">{receipt.warehouse.name}</div>
                            <div className="text-sm text-gray-600">
                              {receipt.totalQuantity} · {receipt.totalAmount}
                            </div>
                          </div>
                          <StatusPill label={t(`inventory.receipts.status.${receipt.status}`)} tone={receiptTone(receipt.status)} />
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </Card>

            <Card className="space-y-4">
              {selectedReceipt ? (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="text-xs font-black uppercase tracking-[0.18em] text-gray-500">{selectedReceipt.reference}</div>
                      <h2 className="text-2xl font-black tracking-tight text-gray-900">{selectedReceipt.warehouse.name}</h2>
                    </div>
                    <StatusPill label={t(`inventory.receipts.status.${selectedReceipt.status}`)} tone={receiptTone(selectedReceipt.status)} />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <DetailCard label={t("inventory.receipts.detail.date")} value={selectedReceipt.receiptDate.slice(0, 10)} />
                    <DetailCard label={t("inventory.receipts.detail.lines")} value={String(selectedReceipt.lines.length)} />
                    <DetailCard label={t("inventory.receipts.detail.totalQuantity")} value={selectedReceipt.totalQuantity} />
                    <DetailCard label={t("inventory.receipts.detail.totalAmount")} value={selectedReceipt.totalAmount} />
                  </div>

                  <div className="space-y-2 text-sm leading-7 text-gray-600">
                    <div>
                      <span className="font-semibold text-gray-900">{t("inventory.receipts.field.warehouse")}:</span>{" "}
                      {selectedReceipt.warehouse.code} · {selectedReceipt.warehouse.name}
                    </div>
                    <div>
                      <span className="font-semibold text-gray-900">{t("inventory.receipts.field.sourcePurchaseOrder")}:</span>{" "}
                      {selectedReceipt.sourcePurchaseOrderRef || t("inventory.emptyValue")}
                    </div>
                    <div>
                      <span className="font-semibold text-gray-900">{t("inventory.receipts.field.sourcePurchaseInvoice")}:</span>{" "}
                      {selectedReceipt.sourcePurchaseInvoiceRef || t("inventory.emptyValue")}
                    </div>
                    <div>
                      <span className="font-semibold text-gray-900">{t("inventory.receipts.field.postedAt")}:</span>{" "}
                      {selectedReceipt.postedAt ? selectedReceipt.postedAt.slice(0, 10) : t("inventory.receipts.notPosted")}
                    </div>
                  </div>

                  {selectedReceipt.description ? <p className="text-sm leading-7 text-gray-600">{selectedReceipt.description}</p> : null}

                  <div className="space-y-2 rounded-2xl border border-gray-200 p-4">
                    <div className="text-xs font-black uppercase tracking-[0.18em] text-gray-500">
                      {t("inventory.receipts.lines.title")}
                    </div>
                    {selectedReceipt.lines.map((line) => (
                      <div key={line.id} className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
                        <div className="font-semibold text-gray-900">
                          {line.item.code} · {line.item.name}
                        </div>
                        <div>
                          {line.quantity} {line.unitOfMeasure} · {line.unitCost} · {line.lineTotalAmount}
                        </div>
                        {line.description ? <div>{line.description}</div> : null}
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-3 pt-2">
                    <Button variant="secondary" onClick={() => openEditReceipt(selectedReceipt)} disabled={!selectedReceipt.canEdit}>
                      {t("inventory.button.editReceipt")}
                    </Button>
                    <Button
                      onClick={() => confirmPostReceipt(selectedReceipt.id)}
                      disabled={!selectedReceipt.canPost || postReceiptMutation.isPending}
                    >
                      {t("inventory.button.postReceipt")}
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => confirmCancelReceipt(selectedReceipt.id)}
                      disabled={!selectedReceipt.canCancel || cancelReceiptMutation.isPending}
                    >
                      {t("inventory.button.cancelReceipt")}
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => confirmReverseReceipt(selectedReceipt.id)}
                      disabled={!selectedReceipt.canReverse || reverseReceiptMutation.isPending}
                    >
                      {t("inventory.button.reverseReceipt")}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-sm leading-7 text-gray-500">{t("inventory.receipts.details.empty")}</div>
              )}
            </Card>
          </div>
        </section>

        <section className="space-y-6">
          <SectionHeading title={t("inventory.stockLedger.title")} description={t("inventory.stockLedger.description")} />

          <Card className="space-y-5">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <Input
                value={stockLedgerSearch}
                onChange={(event) => setStockLedgerSearch(event.target.value)}
                placeholder={t("inventory.stockLedger.filters.search")}
              />
              <Select value={stockLedgerItemFilter} onChange={(event) => setStockLedgerItemFilter(event.target.value)}>
                <option value="">{t("inventory.stockLedger.filters.allItems")}</option>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.code} · {item.name}
                  </option>
                ))}
              </Select>
              <Select value={stockLedgerWarehouseFilter} onChange={(event) => setStockLedgerWarehouseFilter(event.target.value)}>
                <option value="">{t("inventory.stockLedger.filters.allWarehouses")}</option>
                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.code} · {warehouse.name}
                  </option>
                ))}
              </Select>
              <Select
                value={stockLedgerMovementTypeFilter}
                onChange={(event) => setStockLedgerMovementTypeFilter(event.target.value as InventoryStockMovementType | "")}
              >
                <option value="">{t("inventory.stockLedger.filters.allMovementTypes")}</option>
                {STOCK_MOVEMENT_TYPE_OPTIONS.map((movementType) => (
                  <option key={movementType} value={movementType}>
                    {t(`inventory.stockLedger.movementType.${movementType}`)}
                  </option>
                ))}
              </Select>
            </div>

            {inventoryStockLedgerQuery.isLoading ? (
              <div className="text-sm text-gray-500">{t("inventory.stockLedger.loading")}</div>
            ) : stockMovements.length === 0 ? (
              <EmptyState message={t("inventory.stockLedger.empty")} />
            ) : (
              <div className="space-y-3">
                {stockMovements.map((movement) => (
                  <Card key={movement.id} className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="text-xs font-black uppercase tracking-[0.18em] text-gray-500">
                        {movement.transactionReference} · {movement.transactionDate.slice(0, 10)}
                      </div>
                      <StatusPill label={t(`inventory.stockLedger.movementType.${movement.movementType}`)} tone="neutral" />
                    </div>
                    <div className="text-sm font-semibold text-gray-900">
                      {movement.item.code} · {movement.item.name} · {movement.warehouse.code} · {movement.warehouse.name}
                    </div>
                    <div className="text-sm text-gray-700">
                      {t("inventory.stockLedger.detail.quantityIn")}: {movement.quantityIn} · {t("inventory.stockLedger.detail.quantityOut")}:
                      {" "}
                      {movement.quantityOut} · {t("inventory.stockLedger.detail.runningQuantity")}: {movement.runningQuantity}
                    </div>
                    <div className="text-sm text-gray-700">
                      {t("inventory.stockLedger.detail.valueIn")}: {movement.valueIn} · {t("inventory.stockLedger.detail.valueOut")}:
                      {" "}
                      {movement.valueOut} · {t("inventory.stockLedger.detail.runningValuation")}: {movement.runningValuation}
                    </div>
                    <div className="text-xs text-gray-500">
                      {t("inventory.stockLedger.detail.transactionType")}: {movement.transactionType} ·{" "}
                      {t("inventory.stockLedger.detail.transactionId")}: {movement.transactionId}
                    </div>
                    {isStockMovementDrillDownSupported(movement) ? (
                      <div className="pt-1">
                        <Button variant="secondary" onClick={() => openStockMovementSource(movement)}>
                          {t("inventory.stockLedger.action.openSource")}
                        </Button>
                      </div>
                    ) : null}
                  </Card>
                ))}
              </div>
            )}
          </Card>
        </section>

        <SidePanel isOpen={isItemEditorOpen} onClose={closeItemEditor} title={itemEditor.id ? t("inventory.editor.editTitle") : t("inventory.editor.createTitle")}>
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label={t("inventory.field.code")} hint={t("inventory.field.codeHint")}>
                <Input value={itemEditor.code} onChange={(event) => setItemEditor((current) => ({ ...current, code: event.target.value }))} />
              </Field>
              <Field label={t("inventory.field.name")}>
                <Input value={itemEditor.name} onChange={(event) => setItemEditor((current) => ({ ...current, name: event.target.value }))} />
              </Field>
              <Field label={t("inventory.field.unitOfMeasure")}>
                <Input value={itemEditor.unitOfMeasure} onChange={(event) => setItemEditor((current) => ({ ...current, unitOfMeasure: event.target.value }))} />
              </Field>
              <Field label={t("inventory.field.category")}>
                <Input value={itemEditor.category} onChange={(event) => setItemEditor((current) => ({ ...current, category: event.target.value }))} />
              </Field>
              <Field label={t("inventory.field.type")}>
                <Select value={itemEditor.type} onChange={(event) => setItemEditor((current) => ({ ...current, type: event.target.value as InventoryItemType }))}>
                  {ITEM_TYPE_OPTIONS.map((type) => (
                    <option key={type} value={type}>
                      {t(`inventory.type.${type}`)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t("inventory.field.preferredWarehouse")}>
                <WarehouseSelect
                  value={itemEditor.preferredWarehouseId}
                  onChange={(value) => setItemEditor((current) => ({ ...current, preferredWarehouseId: value }))}
                  options={warehouses.filter((row) => row.isActive)}
                  placeholder={t("inventory.placeholder.selectWarehouse")}
                />
              </Field>
              <Field label={t("inventory.field.reorderLevel")}>
                <Input value={itemEditor.reorderLevel} onChange={(event) => setItemEditor((current) => ({ ...current, reorderLevel: event.target.value }))} />
              </Field>
              <Field label={t("inventory.field.reorderQuantity")}>
                <Input value={itemEditor.reorderQuantity} onChange={(event) => setItemEditor((current) => ({ ...current, reorderQuantity: event.target.value }))} />
              </Field>
            </div>

            <Field label={t("inventory.field.description")}>
              <Textarea value={itemEditor.description} rows={4} onChange={(event) => setItemEditor((current) => ({ ...current, description: event.target.value }))} />
            </Field>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label={t("inventory.field.inventoryAccount")}>
                <AccountSelect
                  value={itemEditor.inventoryAccountId}
                  onChange={(value) => setItemEditor((current) => ({ ...current, inventoryAccountId: value }))}
                  options={inventoryAccountsQuery.data ?? []}
                  placeholder={t("inventory.placeholder.selectAccount")}
                />
              </Field>
              <Field label={t("inventory.field.cogsAccount")}>
                <AccountSelect
                  value={itemEditor.cogsAccountId}
                  onChange={(value) => setItemEditor((current) => ({ ...current, cogsAccountId: value }))}
                  options={cogsAccountsQuery.data ?? []}
                  placeholder={t("inventory.placeholder.selectAccount")}
                />
              </Field>
              <Field label={t("inventory.field.salesAccount")}>
                <AccountSelect
                  value={itemEditor.salesAccountId}
                  onChange={(value) => setItemEditor((current) => ({ ...current, salesAccountId: value }))}
                  options={salesAccountsQuery.data ?? []}
                  placeholder={t("inventory.placeholder.selectAccount")}
                />
              </Field>
              <Field label={t("inventory.field.adjustmentAccount")}>
                <AccountSelect
                  value={itemEditor.adjustmentAccountId}
                  onChange={(value) => setItemEditor((current) => ({ ...current, adjustmentAccountId: value }))}
                  options={adjustmentAccountsQuery.data ?? []}
                  placeholder={t("inventory.placeholder.selectAccount")}
                />
              </Field>
            </div>

            {itemFormError ? <ErrorBox message={itemFormError} /> : null}
            {itemMutationError ? <ErrorBox message={itemMutationError} /> : null}

            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" onClick={closeItemEditor}>
                {t("inventory.button.cancel")}
              </Button>
              <Button
                onClick={() => {
                  if (itemFormError) return;
                  if (itemEditor.id) {
                    void updateItemMutation.mutate();
                    return;
                  }
                  void createItemMutation.mutate();
                }}
                disabled={Boolean(itemFormError) || createItemMutation.isPending || updateItemMutation.isPending}
              >
                {itemEditor.id ? t("inventory.button.save") : t("inventory.button.create")}
              </Button>
            </div>
          </div>
        </SidePanel>

        <SidePanel
          isOpen={isWarehouseEditorOpen}
          onClose={closeWarehouseEditor}
          title={warehouseEditor.id ? t("inventory.warehouses.editor.editTitle") : t("inventory.warehouses.editor.createTitle")}
        >
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label={t("inventory.warehouses.field.code")} hint={t("inventory.warehouses.field.codeHint")}>
                <Input value={warehouseEditor.code} onChange={(event) => setWarehouseEditor((current) => ({ ...current, code: event.target.value }))} />
              </Field>
              <Field label={t("inventory.warehouses.field.name")}>
                <Input value={warehouseEditor.name} onChange={(event) => setWarehouseEditor((current) => ({ ...current, name: event.target.value }))} />
              </Field>
            </div>

            <Field label={t("inventory.warehouses.field.address")}>
              <Textarea value={warehouseEditor.address} rows={4} onChange={(event) => setWarehouseEditor((current) => ({ ...current, address: event.target.value }))} />
            </Field>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label={t("inventory.warehouses.field.responsiblePerson")}>
                <Input
                  value={warehouseEditor.responsiblePerson}
                  onChange={(event) => setWarehouseEditor((current) => ({ ...current, responsiblePerson: event.target.value }))}
                />
              </Field>
              <Field label={t("inventory.warehouses.field.mode")}>
                <Select
                  value={warehouseEditor.isTransit ? "transit" : "storage"}
                  onChange={(event) =>
                    setWarehouseEditor((current) => {
                      const isTransit = event.target.value === "transit";
                      return { ...current, isTransit, isDefaultTransit: isTransit ? current.isDefaultTransit : false };
                    })
                  }
                >
                  <option value="storage">{t("inventory.warehouses.mode.storage")}</option>
                  <option value="transit">{t("inventory.warehouses.mode.transit")}</option>
                </Select>
              </Field>
              <Field label={t("inventory.warehouses.field.defaultTransit")}>
                <Select
                  value={warehouseEditor.isDefaultTransit ? "true" : "false"}
                  onChange={(event) =>
                    setWarehouseEditor((current) => ({ ...current, isDefaultTransit: event.target.value === "true" }))
                  }
                  disabled={!warehouseEditor.isTransit}
                >
                  <option value="false">{t("inventory.boolean.no")}</option>
                  <option value="true">{t("inventory.boolean.yes")}</option>
                </Select>
              </Field>
            </div>

            {warehouseFormError ? <ErrorBox message={warehouseFormError} /> : null}
            {warehouseMutationError ? <ErrorBox message={warehouseMutationError} /> : null}

            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" onClick={closeWarehouseEditor}>
                {t("inventory.button.cancel")}
              </Button>
              <Button
                onClick={() => {
                  if (warehouseFormError) return;
                  if (warehouseEditor.id) {
                    void updateWarehouseMutation.mutate();
                    return;
                  }
                  void createWarehouseMutation.mutate();
                }}
                disabled={Boolean(warehouseFormError) || createWarehouseMutation.isPending || updateWarehouseMutation.isPending}
              >
                {warehouseEditor.id ? t("inventory.button.save") : t("inventory.button.createWarehouse")}
              </Button>
            </div>
          </div>
        </SidePanel>

        <SidePanel
          isOpen={isReceiptEditorOpen}
          onClose={closeReceiptEditor}
          title={receiptEditor.id ? t("inventory.receipts.editor.editTitle") : t("inventory.receipts.editor.createTitle")}
        >
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label={t("inventory.receipts.field.reference")} hint={t("inventory.receipts.field.referenceHint")}>
                <Input value={receiptEditor.reference} onChange={(event) => setReceiptEditor((current) => ({ ...current, reference: event.target.value }))} />
              </Field>
              <Field label={t("inventory.receipts.field.date")}>
                <Input type="date" value={receiptEditor.receiptDate} onChange={(event) => setReceiptEditor((current) => ({ ...current, receiptDate: event.target.value }))} />
              </Field>
              <Field label={t("inventory.receipts.field.warehouse")}>
                <WarehouseSelect
                  value={receiptEditor.warehouseId}
                  onChange={(value) => setReceiptEditor((current) => ({ ...current, warehouseId: value }))}
                  options={warehouses.filter((row) => row.isActive)}
                  placeholder={t("inventory.placeholder.selectWarehouse")}
                />
              </Field>
              <Field label={t("inventory.receipts.field.sourcePurchaseOrder")}>
                <Input
                  value={receiptEditor.sourcePurchaseOrderRef}
                  onChange={(event) => setReceiptEditor((current) => ({ ...current, sourcePurchaseOrderRef: event.target.value }))}
                />
              </Field>
              <Field label={t("inventory.receipts.field.sourcePurchaseInvoice")}>
                <Input
                  value={receiptEditor.sourcePurchaseInvoiceRef}
                  onChange={(event) => setReceiptEditor((current) => ({ ...current, sourcePurchaseInvoiceRef: event.target.value }))}
                />
              </Field>
            </div>

            <Field label={t("inventory.field.description")}>
              <Textarea value={receiptEditor.description} rows={3} onChange={(event) => setReceiptEditor((current) => ({ ...current, description: event.target.value }))} />
            </Field>

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-gray-900">{t("inventory.receipts.lines.title")}</div>
                <Button variant="secondary" onClick={() => addReceiptLine()}>
                  {t("inventory.receipts.button.addLine")}
                </Button>
              </div>

              {receiptEditor.lines.map((line, index) => (
                <Card key={`receipt-line-${index}`} className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-gray-900">{t("inventory.receipts.line.label", { index: index + 1 })}</div>
                    {receiptEditor.lines.length > 1 ? (
                      <Button variant="danger" onClick={() => removeReceiptLine(index)}>
                        {t("inventory.receipts.button.removeLine")}
                      </Button>
                    ) : null}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label={t("inventory.receipts.field.item")}>
                      <ItemSelect
                        value={line.itemId}
                        onChange={(value) => updateReceiptLine(index, { itemId: value })}
                        options={items.filter((row) => row.isActive)}
                        placeholder={t("inventory.receipts.placeholder.selectItem")}
                      />
                    </Field>
                    <Field label={t("inventory.receipts.field.unitOfMeasure")}>
                      <Input
                        value={line.unitOfMeasure}
                        onChange={(event) => updateReceiptLine(index, { unitOfMeasure: event.target.value })}
                      />
                    </Field>
                    <Field label={t("inventory.receipts.field.quantity")}>
                      <Input value={line.quantity} onChange={(event) => updateReceiptLine(index, { quantity: event.target.value })} />
                    </Field>
                    <Field label={t("inventory.receipts.field.unitCost")}>
                      <Input value={line.unitCost} onChange={(event) => updateReceiptLine(index, { unitCost: event.target.value })} />
                    </Field>
                  </div>

                  <Field label={t("inventory.receipts.field.lineDescription")}>
                    <Input value={line.description} onChange={(event) => updateReceiptLine(index, { description: event.target.value })} />
                  </Field>
                </Card>
              ))}
            </div>

            {receiptFormError ? <ErrorBox message={receiptFormError} /> : null}
            {receiptMutationError ? <ErrorBox message={receiptMutationError} /> : null}

            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" onClick={closeReceiptEditor}>
                {t("inventory.button.cancel")}
              </Button>
              <Button
                onClick={() => {
                  if (receiptFormError) return;
                  if (receiptEditor.id) {
                    void updateReceiptMutation.mutate();
                    return;
                  }
                  void createReceiptMutation.mutate();
                }}
                disabled={Boolean(receiptFormError) || createReceiptMutation.isPending || updateReceiptMutation.isPending}
              >
                {receiptEditor.id ? t("inventory.button.save") : t("inventory.button.createReceipt")}
              </Button>
            </div>
          </div>
        </SidePanel>

        <SidePanel
          isOpen={isIssueEditorOpen}
          onClose={closeIssueEditor}
          title={issueEditor.id ? t("inventory.issues.editor.editTitle") : t("inventory.issues.editor.createTitle")}
        >
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label={t("inventory.issues.field.reference")} hint={t("inventory.issues.field.referenceHint")}>
                <Input value={issueEditor.reference} onChange={(event) => setIssueEditor((current) => ({ ...current, reference: event.target.value }))} />
              </Field>
              <Field label={t("inventory.issues.field.date")}>
                <Input type="date" value={issueEditor.issueDate} onChange={(event) => setIssueEditor((current) => ({ ...current, issueDate: event.target.value }))} />
              </Field>
              <Field label={t("inventory.issues.field.warehouse")}>
                <WarehouseSelect
                  value={issueEditor.warehouseId}
                  onChange={(value) => setIssueEditor((current) => ({ ...current, warehouseId: value }))}
                  options={warehouses.filter((row) => row.isActive)}
                  placeholder={t("inventory.placeholder.selectWarehouse")}
                />
              </Field>
              <Field label={t("inventory.issues.field.sourceSalesOrder")}>
                <Input
                  value={issueEditor.sourceSalesOrderRef}
                  onChange={(event) => setIssueEditor((current) => ({ ...current, sourceSalesOrderRef: event.target.value }))}
                />
              </Field>
              <Field label={t("inventory.issues.field.sourceSalesInvoice")}>
                <Input
                  value={issueEditor.sourceSalesInvoiceRef}
                  onChange={(event) => setIssueEditor((current) => ({ ...current, sourceSalesInvoiceRef: event.target.value }))}
                />
              </Field>
              <Field label={t("inventory.issues.field.sourceProductionRequest")}>
                <Input
                  value={issueEditor.sourceProductionRequestRef}
                  onChange={(event) => setIssueEditor((current) => ({ ...current, sourceProductionRequestRef: event.target.value }))}
                />
              </Field>
              <Field label={t("inventory.issues.field.sourceInternalRequest")}>
                <Input
                  value={issueEditor.sourceInternalRequestRef}
                  onChange={(event) => setIssueEditor((current) => ({ ...current, sourceInternalRequestRef: event.target.value }))}
                />
              </Field>
            </div>

            <Field label={t("inventory.field.description")}>
              <Textarea value={issueEditor.description} rows={3} onChange={(event) => setIssueEditor((current) => ({ ...current, description: event.target.value }))} />
            </Field>

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-gray-900">{t("inventory.issues.lines.title")}</div>
                <Button variant="secondary" onClick={() => addIssueLine()}>
                  {t("inventory.issues.button.addLine")}
                </Button>
              </div>

              {issueEditor.lines.map((line, index) => (
                <Card key={`issue-line-${index}`} className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-gray-900">{t("inventory.issues.line.label", { index: index + 1 })}</div>
                    {issueEditor.lines.length > 1 ? (
                      <Button variant="danger" onClick={() => removeIssueLine(index)}>
                        {t("inventory.issues.button.removeLine")}
                      </Button>
                    ) : null}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label={t("inventory.issues.field.item")}>
                      <ItemSelect
                        value={line.itemId}
                        onChange={(value) => updateIssueLine(index, { itemId: value })}
                        options={items.filter((row) => row.isActive)}
                        placeholder={t("inventory.issues.placeholder.selectItem")}
                      />
                    </Field>
                    <Field label={t("inventory.issues.field.unitOfMeasure")}>
                      <Input
                        value={line.unitOfMeasure}
                        onChange={(event) => updateIssueLine(index, { unitOfMeasure: event.target.value })}
                      />
                    </Field>
                    <Field label={t("inventory.issues.field.quantity")}>
                      <Input value={line.quantity} onChange={(event) => updateIssueLine(index, { quantity: event.target.value })} />
                    </Field>
                  </div>

                  <Field label={t("inventory.issues.field.lineDescription")}>
                    <Input value={line.description} onChange={(event) => updateIssueLine(index, { description: event.target.value })} />
                  </Field>
                </Card>
              ))}
            </div>

            {issueFormError ? <ErrorBox message={issueFormError} /> : null}
            {issueMutationError ? <ErrorBox message={issueMutationError} /> : null}

            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" onClick={closeIssueEditor}>
                {t("inventory.button.cancel")}
              </Button>
              <Button
                onClick={() => {
                  if (issueFormError) return;
                  if (issueEditor.id) {
                    void updateIssueMutation.mutate();
                    return;
                  }
                  void createIssueMutation.mutate();
                }}
                disabled={Boolean(issueFormError) || createIssueMutation.isPending || updateIssueMutation.isPending}
              >
                {issueEditor.id ? t("inventory.button.save") : t("inventory.button.createIssue")}
              </Button>
            </div>
          </div>
        </SidePanel>

        <SidePanel
          isOpen={isTransferEditorOpen}
          onClose={closeTransferEditor}
          title={transferEditor.id ? t("inventory.transfers.editor.editTitle") : t("inventory.transfers.editor.createTitle")}
        >
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label={t("inventory.transfers.field.reference")} hint={t("inventory.transfers.field.referenceHint")}>
                <Input
                  value={transferEditor.reference}
                  onChange={(event) => setTransferEditor((current) => ({ ...current, reference: event.target.value }))}
                />
              </Field>
              <Field label={t("inventory.transfers.field.date")}>
                <Input
                  type="date"
                  value={transferEditor.transferDate}
                  onChange={(event) => setTransferEditor((current) => ({ ...current, transferDate: event.target.value }))}
                />
              </Field>
              <Field label={t("inventory.transfers.field.sourceWarehouse")}>
                <WarehouseSelect
                  value={transferEditor.sourceWarehouseId}
                  onChange={(value) => setTransferEditor((current) => ({ ...current, sourceWarehouseId: value }))}
                  options={warehouses.filter((row) => row.isActive)}
                  placeholder={t("inventory.placeholder.selectWarehouse")}
                />
              </Field>
              <Field label={t("inventory.transfers.field.destinationWarehouse")}>
                <WarehouseSelect
                  value={transferEditor.destinationWarehouseId}
                  onChange={(value) => setTransferEditor((current) => ({ ...current, destinationWarehouseId: value }))}
                  options={warehouses.filter((row) => row.isActive)}
                  placeholder={t("inventory.placeholder.selectWarehouse")}
                />
              </Field>
            </div>

            <Field label={t("inventory.field.description")}>
              <Textarea
                value={transferEditor.description}
                rows={3}
                onChange={(event) => setTransferEditor((current) => ({ ...current, description: event.target.value }))}
              />
            </Field>

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-gray-900">{t("inventory.transfers.lines.title")}</div>
                <Button variant="secondary" onClick={() => addTransferLine()}>
                  {t("inventory.transfers.button.addLine")}
                </Button>
              </div>

              {transferEditor.lines.map((line, index) => (
                <Card key={`transfer-line-${index}`} className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-gray-900">{t("inventory.transfers.line.label", { index: index + 1 })}</div>
                    {transferEditor.lines.length > 1 ? (
                      <Button variant="danger" onClick={() => removeTransferLine(index)}>
                        {t("inventory.transfers.button.removeLine")}
                      </Button>
                    ) : null}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label={t("inventory.transfers.field.item")}>
                      <ItemSelect
                        value={line.itemId}
                        onChange={(value) => updateTransferLine(index, { itemId: value })}
                        options={items.filter((row) => row.isActive)}
                        placeholder={t("inventory.transfers.placeholder.selectItem")}
                      />
                    </Field>
                    <Field label={t("inventory.transfers.field.unitOfMeasure")}>
                      <Input
                        value={line.unitOfMeasure}
                        onChange={(event) => updateTransferLine(index, { unitOfMeasure: event.target.value })}
                      />
                    </Field>
                    <Field label={t("inventory.transfers.field.quantity")}>
                      <Input value={line.quantity} onChange={(event) => updateTransferLine(index, { quantity: event.target.value })} />
                    </Field>
                  </div>

                  <Field label={t("inventory.transfers.field.lineDescription")}>
                    <Input value={line.description} onChange={(event) => updateTransferLine(index, { description: event.target.value })} />
                  </Field>
                </Card>
              ))}
            </div>

            {transferFormError ? <ErrorBox message={transferFormError} /> : null}
            {transferMutationError ? <ErrorBox message={transferMutationError} /> : null}

            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" onClick={closeTransferEditor}>
                {t("inventory.button.cancel")}
              </Button>
              <Button
                onClick={() => {
                  if (transferFormError) return;
                  if (transferEditor.id) {
                    void updateTransferMutation.mutate();
                    return;
                  }
                  void createTransferMutation.mutate();
                }}
                disabled={Boolean(transferFormError) || createTransferMutation.isPending || updateTransferMutation.isPending}
              >
                {transferEditor.id ? t("inventory.button.save") : t("inventory.button.createTransfer")}
              </Button>
            </div>
          </div>
        </SidePanel>

        <SidePanel
          isOpen={isAdjustmentEditorOpen}
          onClose={closeAdjustmentEditor}
          title={adjustmentEditor.id ? t("inventory.adjustments.editor.editTitle") : t("inventory.adjustments.editor.createTitle")}
        >
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label={t("inventory.adjustments.field.reference")} hint={t("inventory.adjustments.field.referenceHint")}>
                <Input
                  value={adjustmentEditor.reference}
                  onChange={(event) => setAdjustmentEditor((current) => ({ ...current, reference: event.target.value }))}
                />
              </Field>
              <Field label={t("inventory.adjustments.field.date")}>
                <Input
                  type="date"
                  value={adjustmentEditor.adjustmentDate}
                  onChange={(event) => setAdjustmentEditor((current) => ({ ...current, adjustmentDate: event.target.value }))}
                />
              </Field>
              <Field label={t("inventory.adjustments.field.warehouse")}>
                <WarehouseSelect
                  value={adjustmentEditor.warehouseId}
                  onChange={(value) => setAdjustmentEditor((current) => ({ ...current, warehouseId: value }))}
                  options={warehouses.filter((row) => row.isActive)}
                  placeholder={t("inventory.placeholder.selectWarehouse")}
                />
              </Field>
              <Field label={t("inventory.adjustments.field.reason")}>
                <Input
                  value={adjustmentEditor.reason}
                  onChange={(event) => setAdjustmentEditor((current) => ({ ...current, reason: event.target.value }))}
                />
              </Field>
            </div>

            <Field label={t("inventory.field.description")}>
              <Textarea
                value={adjustmentEditor.description}
                rows={3}
                onChange={(event) => setAdjustmentEditor((current) => ({ ...current, description: event.target.value }))}
              />
            </Field>

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-gray-900">{t("inventory.adjustments.lines.title")}</div>
                <Button variant="secondary" onClick={() => addAdjustmentLine()}>
                  {t("inventory.adjustments.button.addLine")}
                </Button>
              </div>

              {adjustmentEditor.lines.map((line, index) => (
                <Card key={`adjustment-line-${index}`} className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-gray-900">{t("inventory.adjustments.line.label", { index: index + 1 })}</div>
                    {adjustmentEditor.lines.length > 1 ? (
                      <Button variant="danger" onClick={() => removeAdjustmentLine(index)}>
                        {t("inventory.adjustments.button.removeLine")}
                      </Button>
                    ) : null}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label={t("inventory.adjustments.field.item")}>
                      <ItemSelect
                        value={line.itemId}
                        onChange={(value) => updateAdjustmentLine(index, { itemId: value })}
                        options={items.filter((row) => row.isActive)}
                        placeholder={t("inventory.adjustments.placeholder.selectItem")}
                      />
                    </Field>
                    <Field label={t("inventory.adjustments.field.unitOfMeasure")}>
                      <Input
                        value={line.unitOfMeasure}
                        onChange={(event) => updateAdjustmentLine(index, { unitOfMeasure: event.target.value })}
                      />
                    </Field>
                    <Field label={t("inventory.adjustments.field.systemQuantity")}>
                      <Input
                        value={line.systemQuantity}
                        onChange={(event) => updateAdjustmentLine(index, { systemQuantity: event.target.value })}
                      />
                    </Field>
                    <Field label={t("inventory.adjustments.field.countedQuantity")}>
                      <Input
                        value={line.countedQuantity}
                        onChange={(event) => updateAdjustmentLine(index, { countedQuantity: event.target.value })}
                      />
                    </Field>
                    <Field label={t("inventory.adjustments.field.varianceQuantity")}>
                      <Input value={formatVariance(line.systemQuantity, line.countedQuantity)} disabled />
                    </Field>
                  </div>

                  <Field label={t("inventory.adjustments.field.lineDescription")}>
                    <Input value={line.description} onChange={(event) => updateAdjustmentLine(index, { description: event.target.value })} />
                  </Field>
                </Card>
              ))}
            </div>

            {adjustmentFormError ? <ErrorBox message={adjustmentFormError} /> : null}
            {adjustmentMutationError ? <ErrorBox message={adjustmentMutationError} /> : null}

            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" onClick={closeAdjustmentEditor}>
                {t("inventory.button.cancel")}
              </Button>
              <Button
                onClick={() => {
                  if (adjustmentFormError) return;
                  if (adjustmentEditor.id) {
                    void updateAdjustmentMutation.mutate();
                    return;
                  }
                  void createAdjustmentMutation.mutate();
                }}
                disabled={Boolean(adjustmentFormError) || createAdjustmentMutation.isPending || updateAdjustmentMutation.isPending}
              >
                {adjustmentEditor.id ? t("inventory.button.save") : t("inventory.button.createAdjustment")}
              </Button>
            </div>
          </div>
        </SidePanel>
      </div>
    </PageShell>
  );

  function openNewItem() {
    setItemEditor(createEmptyItemEditor());
    setIsItemEditorOpen(true);
  }

  function openEditItem(item: InventoryItem) {
    setItemEditor(mapItemToEditor(item));
    setIsItemEditorOpen(true);
  }

  function openNewWarehouse() {
    setWarehouseEditor(createEmptyWarehouseEditor());
    setIsWarehouseEditorOpen(true);
  }

  function openEditWarehouse(warehouse: InventoryWarehouse) {
    setWarehouseEditor(mapWarehouseToEditor(warehouse));
    setIsWarehouseEditorOpen(true);
  }

  function openNewReceipt() {
    setReceiptEditor(createEmptyReceiptEditor());
    setIsReceiptEditorOpen(true);
  }

  function openEditReceipt(receipt: InventoryGoodsReceipt) {
    setReceiptEditor(mapReceiptToEditor(receipt));
    setIsReceiptEditorOpen(true);
  }

  function openNewIssue() {
    setIssueEditor(createEmptyIssueEditor());
    setIsIssueEditorOpen(true);
  }

  function openEditIssue(issue: InventoryGoodsIssue) {
    setIssueEditor(mapIssueToEditor(issue));
    setIsIssueEditorOpen(true);
  }

  function openNewTransfer() {
    setTransferEditor(createEmptyTransferEditor());
    setIsTransferEditorOpen(true);
  }

  function openEditTransfer(transfer: InventoryTransfer) {
    setTransferEditor(mapTransferToEditor(transfer));
    setIsTransferEditorOpen(true);
  }

  function openNewAdjustment() {
    setAdjustmentEditor(createEmptyAdjustmentEditor());
    setIsAdjustmentEditorOpen(true);
  }

  function openEditAdjustment(adjustment: InventoryAdjustment) {
    setAdjustmentEditor(mapAdjustmentToEditor(adjustment));
    setIsAdjustmentEditorOpen(true);
  }

  function addReceiptLine() {
    setReceiptEditor((current) => ({ ...current, lines: [...current.lines, createEmptyReceiptLine()] }));
  }

  function removeReceiptLine(index: number) {
    setReceiptEditor((current) => ({ ...current, lines: current.lines.filter((_, lineIndex) => lineIndex !== index) }));
  }

  function updateReceiptLine(index: number, patch: Partial<ReceiptLineEditorState>) {
    setReceiptEditor((current) => ({
      ...current,
      lines: current.lines.map((line, lineIndex) => (lineIndex === index ? { ...line, ...patch } : line)),
    }));
  }

  function addIssueLine() {
    setIssueEditor((current) => ({ ...current, lines: [...current.lines, createEmptyIssueLine()] }));
  }

  function removeIssueLine(index: number) {
    setIssueEditor((current) => ({ ...current, lines: current.lines.filter((_, lineIndex) => lineIndex !== index) }));
  }

  function updateIssueLine(index: number, patch: Partial<IssueLineEditorState>) {
    setIssueEditor((current) => ({
      ...current,
      lines: current.lines.map((line, lineIndex) => (lineIndex === index ? { ...line, ...patch } : line)),
    }));
  }

  function addTransferLine() {
    setTransferEditor((current) => ({ ...current, lines: [...current.lines, createEmptyTransferLine()] }));
  }

  function removeTransferLine(index: number) {
    setTransferEditor((current) => ({ ...current, lines: current.lines.filter((_, lineIndex) => lineIndex !== index) }));
  }

  function updateTransferLine(index: number, patch: Partial<TransferLineEditorState>) {
    setTransferEditor((current) => ({
      ...current,
      lines: current.lines.map((line, lineIndex) => (lineIndex === index ? { ...line, ...patch } : line)),
    }));
  }

  function addAdjustmentLine() {
    setAdjustmentEditor((current) => ({ ...current, lines: [...current.lines, createEmptyAdjustmentLine()] }));
  }

  function removeAdjustmentLine(index: number) {
    setAdjustmentEditor((current) => ({ ...current, lines: current.lines.filter((_, lineIndex) => lineIndex !== index) }));
  }

  function updateAdjustmentLine(index: number, patch: Partial<AdjustmentLineEditorState>) {
    setAdjustmentEditor((current) => ({
      ...current,
      lines: current.lines.map((line, lineIndex) => (lineIndex === index ? { ...line, ...patch } : line)),
    }));
  }

  function confirmDeactivateItem(id: string) {
    if (typeof window === "undefined" || window.confirm(t("inventory.confirm.deactivate"))) {
      void deactivateItemMutation.mutate(id);
    }
  }

  function confirmDeactivateWarehouse(id: string) {
    if (typeof window === "undefined" || window.confirm(t("inventory.warehouses.confirm.deactivate"))) {
      void deactivateWarehouseMutation.mutate(id);
    }
  }

  function confirmPostReceipt(id: string) {
    if (typeof window === "undefined" || window.confirm(t("inventory.receipts.confirm.post"))) {
      void postReceiptMutation.mutate(id);
    }
  }

  function confirmCancelReceipt(id: string) {
    if (typeof window === "undefined" || window.confirm(t("inventory.receipts.confirm.cancel"))) {
      void cancelReceiptMutation.mutate(id);
    }
  }

  function confirmReverseReceipt(id: string) {
    if (typeof window === "undefined" || window.confirm(t("inventory.receipts.confirm.reverse"))) {
      void reverseReceiptMutation.mutate(id);
    }
  }

  function confirmPostIssue(id: string) {
    if (typeof window === "undefined" || window.confirm(t("inventory.issues.confirm.post"))) {
      void postIssueMutation.mutate(id);
    }
  }

  function confirmCancelIssue(id: string) {
    if (typeof window === "undefined" || window.confirm(t("inventory.issues.confirm.cancel"))) {
      void cancelIssueMutation.mutate(id);
    }
  }

  function confirmReverseIssue(id: string) {
    if (typeof window === "undefined" || window.confirm(t("inventory.issues.confirm.reverse"))) {
      void reverseIssueMutation.mutate(id);
    }
  }

  function confirmPostTransfer(id: string) {
    if (typeof window === "undefined" || window.confirm(t("inventory.transfers.confirm.post"))) {
      void postTransferMutation.mutate(id);
    }
  }

  function confirmCancelTransfer(id: string) {
    if (typeof window === "undefined" || window.confirm(t("inventory.transfers.confirm.cancel"))) {
      void cancelTransferMutation.mutate(id);
    }
  }

  function confirmReverseTransfer(id: string) {
    if (typeof window === "undefined" || window.confirm(t("inventory.transfers.confirm.reverse"))) {
      void reverseTransferMutation.mutate(id);
    }
  }

  function confirmPostAdjustment(id: string) {
    if (typeof window === "undefined" || window.confirm(t("inventory.adjustments.confirm.post"))) {
      void postAdjustmentMutation.mutate(id);
    }
  }

  function confirmCancelAdjustment(id: string) {
    if (typeof window === "undefined" || window.confirm(t("inventory.adjustments.confirm.cancel"))) {
      void cancelAdjustmentMutation.mutate(id);
    }
  }

  function confirmReverseAdjustment(id: string) {
    if (typeof window === "undefined" || window.confirm(t("inventory.adjustments.confirm.reverse"))) {
      void reverseAdjustmentMutation.mutate(id);
    }
  }

  function isStockMovementDrillDownSupported(movement: InventoryStockMovement) {
    return (
      movement.transactionType === "InventoryGoodsReceipt" ||
      movement.transactionType === "InventoryGoodsIssue" ||
      movement.transactionType === "InventoryTransfer" ||
      movement.transactionType === "InventoryAdjustment"
    );
  }

  function openStockMovementSource(movement: InventoryStockMovement) {
    if (movement.transactionType === "InventoryGoodsReceipt") {
      setSelectedReceiptId(movement.transactionId);
      setTimeout(() => document.getElementById("inventory-receipts-section")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
      return;
    }
    if (movement.transactionType === "InventoryGoodsIssue") {
      setSelectedIssueId(movement.transactionId);
      setTimeout(() => document.getElementById("inventory-issues-section")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
      return;
    }
    if (movement.transactionType === "InventoryTransfer") {
      setSelectedTransferId(movement.transactionId);
      setTimeout(() => document.getElementById("inventory-transfers-section")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
      return;
    }
    if (movement.transactionType === "InventoryAdjustment") {
      setSelectedAdjustmentId(movement.transactionId);
      setTimeout(() => document.getElementById("inventory-adjustments-section")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
    }
  }

  function closeItemEditor() {
    setIsItemEditorOpen(false);
    setItemEditor(createEmptyItemEditor());
  }

  function closeWarehouseEditor() {
    setIsWarehouseEditorOpen(false);
    setWarehouseEditor(createEmptyWarehouseEditor());
  }

  function closeReceiptEditor() {
    setIsReceiptEditorOpen(false);
    setReceiptEditor(createEmptyReceiptEditor());
  }

  function closeIssueEditor() {
    setIsIssueEditorOpen(false);
    setIssueEditor(createEmptyIssueEditor());
  }

  function closeTransferEditor() {
    setIsTransferEditorOpen(false);
    setTransferEditor(createEmptyTransferEditor());
  }

  function closeAdjustmentEditor() {
    setIsAdjustmentEditorOpen(false);
    setAdjustmentEditor(createEmptyAdjustmentEditor());
  }
}

function MetricCard({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return (
    <Card className="space-y-2">
      <div className="text-xs font-black uppercase tracking-[0.18em] text-gray-500">{label}</div>
      <div className="text-3xl font-black tracking-tight text-gray-900">
        {value}
        {suffix ? <span className="ms-2 text-base text-gray-500">{suffix}</span> : null}
      </div>
    </Card>
  );
}

function DetailCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 px-4 py-3">
      <div className="text-xs font-black uppercase tracking-[0.16em] text-gray-500">{label}</div>
      <div className="mt-1 text-lg font-bold text-gray-900">{value}</div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return <div className="rounded-2xl border border-dashed border-gray-200 px-6 py-10 text-sm text-gray-500">{message}</div>;
}

function ErrorBox({ message }: { message: string }) {
  return <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{message}</div>;
}

function AccountLine({ label, account }: { label: string; account?: InventoryItem["inventoryAccount"] }) {
  return (
    <div>
      <span className="font-semibold text-gray-900">{label}:</span>{" "}
      {account ? `${account.code} · ${account.name}` : "—"}
    </div>
  );
}

function AccountSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  options: AccountOption[];
  placeholder: string;
}) {
  return (
    <Select value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.code} · {option.name}
        </option>
      ))}
    </Select>
  );
}

function WarehouseSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  options: InventoryWarehouse[];
  placeholder: string;
}) {
  return (
    <Select value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.code} · {option.name}
        </option>
      ))}
    </Select>
  );
}

function ItemSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  options: InventoryItem[];
  placeholder: string;
}) {
  return (
    <Select value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.code} · {option.name}
        </option>
      ))}
    </Select>
  );
}

function mapItemToEditor(item: InventoryItem): ItemEditorState {
  return {
    id: item.id,
    code: item.code,
    name: item.name,
    description: item.description ?? "",
    unitOfMeasure: item.unitOfMeasure,
    category: item.category ?? "",
    type: item.type,
    inventoryAccountId: item.inventoryAccount?.id ?? "",
    cogsAccountId: item.cogsAccount?.id ?? "",
    salesAccountId: item.salesAccount?.id ?? "",
    adjustmentAccountId: item.adjustmentAccount?.id ?? "",
    reorderLevel: item.reorderLevel,
    reorderQuantity: item.reorderQuantity,
    preferredWarehouseId: item.preferredWarehouse?.id ?? item.preferredWarehouseId ?? "",
  };
}

function mapWarehouseToEditor(warehouse: InventoryWarehouse): WarehouseEditorState {
  return {
    id: warehouse.id,
    code: warehouse.code,
    name: warehouse.name,
    address: warehouse.address ?? "",
    responsiblePerson: warehouse.responsiblePerson ?? "",
    isTransit: warehouse.isTransit,
    isDefaultTransit: Boolean(warehouse.isDefaultTransit),
  };
}

function mapReceiptToEditor(receipt: InventoryGoodsReceipt): ReceiptEditorState {
  return {
    id: receipt.id,
    reference: receipt.reference,
    receiptDate: receipt.receiptDate.slice(0, 10),
    warehouseId: receipt.warehouse.id,
    sourcePurchaseOrderRef: receipt.sourcePurchaseOrderRef ?? "",
    sourcePurchaseInvoiceRef: receipt.sourcePurchaseInvoiceRef ?? "",
    description: receipt.description ?? "",
    lines: receipt.lines.map((line) => ({
      itemId: line.item.id,
      quantity: line.quantity,
      unitCost: line.unitCost,
      unitOfMeasure: line.unitOfMeasure,
      description: line.description ?? "",
    })),
  };
}

function mapIssueToEditor(issue: InventoryGoodsIssue): IssueEditorState {
  return {
    id: issue.id,
    reference: issue.reference,
    issueDate: issue.issueDate.slice(0, 10),
    warehouseId: issue.warehouse.id,
    sourceSalesOrderRef: issue.sourceSalesOrderRef ?? "",
    sourceSalesInvoiceRef: issue.sourceSalesInvoiceRef ?? "",
    sourceProductionRequestRef: issue.sourceProductionRequestRef ?? "",
    sourceInternalRequestRef: issue.sourceInternalRequestRef ?? "",
    description: issue.description ?? "",
    lines: issue.lines.map((line) => ({
      itemId: line.item.id,
      quantity: line.quantity,
      unitOfMeasure: line.unitOfMeasure,
      description: line.description ?? "",
    })),
  };
}

function mapTransferToEditor(transfer: InventoryTransfer): TransferEditorState {
  return {
    id: transfer.id,
    reference: transfer.reference,
    transferDate: transfer.transferDate.slice(0, 10),
    sourceWarehouseId: transfer.sourceWarehouse.id,
    destinationWarehouseId: transfer.destinationWarehouse.id,
    description: transfer.description ?? "",
    lines: transfer.lines.map((line) => ({
      itemId: line.item.id,
      quantity: line.quantity,
      unitOfMeasure: line.unitOfMeasure,
      description: line.description ?? "",
    })),
  };
}

function mapAdjustmentToEditor(adjustment: InventoryAdjustment): AdjustmentEditorState {
  return {
    id: adjustment.id,
    reference: adjustment.reference,
    adjustmentDate: adjustment.adjustmentDate.slice(0, 10),
    warehouseId: adjustment.warehouse.id,
    reason: adjustment.reason,
    description: adjustment.description ?? "",
    lines: adjustment.lines.map((line) => ({
      itemId: line.item.id,
      systemQuantity: line.systemQuantity,
      countedQuantity: line.countedQuantity,
      unitOfMeasure: line.unitOfMeasure,
      description: line.description ?? "",
    })),
  };
}

function mapItemEditorToPayload(editor: ItemEditorState) {
  return {
    code: editor.code.trim() || undefined,
    name: editor.name.trim(),
    description: editor.description.trim() || undefined,
    unitOfMeasure: editor.unitOfMeasure.trim(),
    category: editor.category.trim() || undefined,
    type: editor.type,
    inventoryAccountId: editor.inventoryAccountId || undefined,
    cogsAccountId: editor.cogsAccountId || undefined,
    salesAccountId: editor.salesAccountId || undefined,
    adjustmentAccountId: editor.adjustmentAccountId || undefined,
    reorderLevel: editor.reorderLevel.trim() || undefined,
    reorderQuantity: editor.reorderQuantity.trim() || undefined,
    preferredWarehouseId: editor.preferredWarehouseId || undefined,
  };
}

function mapWarehouseEditorToPayload(editor: WarehouseEditorState) {
  return {
    code: editor.code.trim() || undefined,
    name: editor.name.trim(),
    address: editor.address.trim() || undefined,
    responsiblePerson: editor.responsiblePerson.trim() || undefined,
    isTransit: editor.isTransit,
    isDefaultTransit: editor.isTransit ? editor.isDefaultTransit : false,
  };
}

function mapReceiptEditorToPayload(editor: ReceiptEditorState) {
  return {
    reference: editor.reference.trim() || undefined,
    receiptDate: editor.receiptDate,
    warehouseId: editor.warehouseId,
    sourcePurchaseOrderRef: editor.sourcePurchaseOrderRef.trim() || undefined,
    sourcePurchaseInvoiceRef: editor.sourcePurchaseInvoiceRef.trim() || undefined,
    description: editor.description.trim() || undefined,
    lines: editor.lines.map(
      (line): InventoryGoodsReceiptLinePayload => ({
        itemId: line.itemId,
        quantity: line.quantity.trim(),
        unitCost: line.unitCost.trim(),
        unitOfMeasure: line.unitOfMeasure.trim(),
        description: line.description.trim() || undefined,
      }),
    ),
  };
}

function mapIssueEditorToPayload(editor: IssueEditorState) {
  return {
    reference: editor.reference.trim() || undefined,
    issueDate: editor.issueDate,
    warehouseId: editor.warehouseId,
    sourceSalesOrderRef: editor.sourceSalesOrderRef.trim() || undefined,
    sourceSalesInvoiceRef: editor.sourceSalesInvoiceRef.trim() || undefined,
    sourceProductionRequestRef: editor.sourceProductionRequestRef.trim() || undefined,
    sourceInternalRequestRef: editor.sourceInternalRequestRef.trim() || undefined,
    description: editor.description.trim() || undefined,
    lines: editor.lines.map(
      (line): InventoryGoodsIssueLinePayload => ({
        itemId: line.itemId,
        quantity: line.quantity.trim(),
        unitOfMeasure: line.unitOfMeasure.trim(),
        description: line.description.trim() || undefined,
      }),
    ),
  };
}

function mapTransferEditorToPayload(editor: TransferEditorState) {
  return {
    reference: editor.reference.trim() || undefined,
    transferDate: editor.transferDate,
    sourceWarehouseId: editor.sourceWarehouseId,
    destinationWarehouseId: editor.destinationWarehouseId,
    description: editor.description.trim() || undefined,
    lines: editor.lines.map(
      (line): InventoryTransferLinePayload => ({
        itemId: line.itemId,
        quantity: line.quantity.trim(),
        unitOfMeasure: line.unitOfMeasure.trim(),
        description: line.description.trim() || undefined,
      }),
    ),
  };
}

function mapAdjustmentEditorToPayload(editor: AdjustmentEditorState) {
  return {
    reference: editor.reference.trim() || undefined,
    adjustmentDate: editor.adjustmentDate,
    warehouseId: editor.warehouseId,
    reason: editor.reason.trim(),
    description: editor.description.trim() || undefined,
    lines: editor.lines.map(
      (line): InventoryAdjustmentLinePayload => ({
        itemId: line.itemId,
        systemQuantity: line.systemQuantity.trim(),
        countedQuantity: line.countedQuantity.trim(),
        unitOfMeasure: line.unitOfMeasure.trim(),
        description: line.description.trim() || undefined,
      }),
    ),
  };
}

function getItemFormError(editor: ItemEditorState) {
  if (!editor.name.trim()) return "Item name is required. اسم الصنف مطلوب.";
  if (!editor.unitOfMeasure.trim()) return "Unit of measure is required. وحدة القياس مطلوبة.";
  if (editor.reorderLevel.trim() && Number.isNaN(Number(editor.reorderLevel))) {
    return "Reorder level must be numeric. يجب أن يكون حد إعادة الطلب رقميا.";
  }
  if (editor.reorderQuantity.trim() && Number.isNaN(Number(editor.reorderQuantity))) {
    return "Reorder quantity must be numeric. يجب أن تكون كمية إعادة الطلب رقمية.";
  }
  return null;
}

function getWarehouseFormError(editor: WarehouseEditorState) {
  if (!editor.name.trim()) return "Warehouse name is required. اسم المستودع مطلوب.";
  if (editor.isDefaultTransit && !editor.isTransit) {
    return "Default transit requires transit mode.";
  }
  return null;
}

function getReceiptFormError(editor: ReceiptEditorState) {
  if (!editor.receiptDate) return "Receipt date is required. تاريخ الاستلام مطلوب.";
  if (!editor.warehouseId) return "Warehouse is required. المستودع مطلوب.";
  if (editor.lines.length === 0) return "At least one receipt line is required. يجب إدخال سطر استلام واحد على الأقل.";

  for (let index = 0; index < editor.lines.length; index += 1) {
    const line = editor.lines[index];
    if (!line.itemId) return `Receipt line ${index + 1} requires an item. سطر الاستلام ${index + 1} يتطلب صنفا.`;
    if (!line.unitOfMeasure.trim()) return `Receipt line ${index + 1} requires a unit of measure. سطر الاستلام ${index + 1} يتطلب وحدة قياس.`;
    if (!line.quantity.trim() || Number.isNaN(Number(line.quantity)) || Number(line.quantity) <= 0) {
      return `Receipt line ${index + 1} requires a positive quantity. سطر الاستلام ${index + 1} يتطلب كمية موجبة.`;
    }
    if (!line.unitCost.trim() || Number.isNaN(Number(line.unitCost)) || Number(line.unitCost) < 0) {
      return `Receipt line ${index + 1} requires a valid unit cost. سطر الاستلام ${index + 1} يتطلب تكلفة وحدة صحيحة.`;
    }
  }

  return null;
}

function getIssueFormError(editor: IssueEditorState) {
  if (!editor.issueDate) return "Issue date is required. تاريخ الصرف مطلوب.";
  if (!editor.warehouseId) return "Warehouse is required. المستودع مطلوب.";
  if (editor.lines.length === 0) return "At least one issue line is required. يجب إدخال سطر صرف واحد على الأقل.";

  for (let index = 0; index < editor.lines.length; index += 1) {
    const line = editor.lines[index];
    if (!line.itemId) return `Issue line ${index + 1} requires an item. سطر الصرف ${index + 1} يتطلب صنفاً.`;
    if (!line.unitOfMeasure.trim()) return `Issue line ${index + 1} requires a unit of measure. سطر الصرف ${index + 1} يتطلب وحدة قياس.`;
    if (!line.quantity.trim() || Number.isNaN(Number(line.quantity)) || Number(line.quantity) <= 0) {
      return `Issue line ${index + 1} requires a positive quantity. سطر الصرف ${index + 1} يتطلب كمية موجبة.`;
    }
  }

  return null;
}

function getTransferFormError(editor: TransferEditorState) {
  if (!editor.transferDate) return "Transfer date is required. تاريخ التحويل مطلوب.";
  if (!editor.sourceWarehouseId) return "Source warehouse is required. مستودع المصدر مطلوب.";
  if (!editor.destinationWarehouseId) return "Destination warehouse is required. مستودع الوجهة مطلوب.";
  if (editor.sourceWarehouseId && editor.destinationWarehouseId && editor.sourceWarehouseId === editor.destinationWarehouseId) {
    return "Source and destination warehouses must be different. يجب أن يكون مستودع المصدر مختلفاً عن مستودع الوجهة.";
  }
  if (editor.lines.length === 0) return "At least one transfer line is required. يجب إدخال سطر تحويل واحد على الأقل.";

  for (let index = 0; index < editor.lines.length; index += 1) {
    const line = editor.lines[index];
    if (!line.itemId) return `Transfer line ${index + 1} requires an item. سطر التحويل ${index + 1} يتطلب صنفاً.`;
    if (!line.unitOfMeasure.trim()) {
      return `Transfer line ${index + 1} requires a unit of measure. سطر التحويل ${index + 1} يتطلب وحدة قياس.`;
    }
    if (!line.quantity.trim() || Number.isNaN(Number(line.quantity)) || Number(line.quantity) <= 0) {
      return `Transfer line ${index + 1} requires a positive quantity. سطر التحويل ${index + 1} يتطلب كمية موجبة.`;
    }
  }

  return null;
}

function getAdjustmentFormError(editor: AdjustmentEditorState) {
  if (!editor.adjustmentDate) return "Adjustment date is required. تاريخ التسوية مطلوب.";
  if (!editor.warehouseId) return "Warehouse is required. المستودع مطلوب.";
  if (!editor.reason.trim()) return "Adjustment reason is required. سبب التسوية مطلوب.";
  if (editor.lines.length === 0) return "At least one adjustment line is required. يجب إدخال سطر تسوية واحد على الأقل.";

  for (let index = 0; index < editor.lines.length; index += 1) {
    const line = editor.lines[index];
    if (!line.itemId) return `Adjustment line ${index + 1} requires an item. سطر التسوية ${index + 1} يتطلب صنفًا.`;
    if (!line.unitOfMeasure.trim()) {
      return `Adjustment line ${index + 1} requires a unit of measure. سطر التسوية ${index + 1} يتطلب وحدة قياس.`;
    }
    if (!line.systemQuantity.trim() || Number.isNaN(Number(line.systemQuantity)) || Number(line.systemQuantity) < 0) {
      return `Adjustment line ${index + 1} requires a non-negative system quantity. سطر التسوية ${index + 1} يتطلب كمية نظام غير سالبة.`;
    }
    if (!line.countedQuantity.trim() || Number.isNaN(Number(line.countedQuantity)) || Number(line.countedQuantity) < 0) {
      return `Adjustment line ${index + 1} requires a non-negative counted quantity. سطر التسوية ${index + 1} يتطلب كمية جرد غير سالبة.`;
    }
  }

  return null;
}

function getMutationError(...errors: unknown[]) {
  const error = errors.find((value) => value instanceof Error);
  return error instanceof Error ? error.message : null;
}

function receiptTone(status: InventoryReceiptStatus): "positive" | "warning" | "neutral" {
  if (status === "POSTED") return "positive";
  if (status === "CANCELLED") return "neutral";
  return "warning";
}

function issueTone(status: InventoryIssueStatus): "positive" | "warning" | "neutral" {
  if (status === "POSTED") return "positive";
  if (status === "CANCELLED") return "neutral";
  return "warning";
}

function transferTone(status: InventoryTransferStatus): "positive" | "warning" | "neutral" {
  if (status === "POSTED") return "positive";
  if (status === "CANCELLED") return "neutral";
  return "warning";
}

function adjustmentTone(status: InventoryAdjustmentStatus): "positive" | "warning" | "neutral" {
  if (status === "POSTED") return "positive";
  if (status === "CANCELLED") return "neutral";
  return "warning";
}

function formatVariance(systemQuantity: string, countedQuantity: string) {
  const system = Number(systemQuantity);
  const counted = Number(countedQuantity);
  if (Number.isNaN(system) || Number.isNaN(counted)) {
    return "";
  }
  return String(counted - system);
}
