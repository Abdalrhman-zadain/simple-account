"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import {
  LuFileText as FileText,
  LuPackage2 as Package2,
  LuSave as Save,
} from "react-icons/lu";

import {
  cancelInventoryAdjustment,
  cancelInventoryGoodsIssue,
  cancelInventoryGoodsReceipt,
  cancelInventoryTransfer,
  createInventoryAdjustment,
  createInventoryGoodsIssue,
  createInventoryGoodsReceipt,
  createInventoryItem,
  createInventoryItemCategory,
  createInventoryItemGroup,
  createInventoryTransfer,
  createInventoryUnitOfMeasure,
  createInventoryWarehouse,
  deactivateInventoryItem,
  deactivateInventoryItemCategory,
  deactivateInventoryItemGroup,
  deactivateInventoryUnitOfMeasure,
  deactivateInventoryWarehouse,
  generateInventoryBarcode,
  getActiveTaxes,
  getAccountOptions,
  getInventoryAdjustments,
  getInventoryGoodsIssues,
  getInventoryGoodsReceipts,
  getInventoryItemCategories,
  getInventoryItemGroups,
  getInventoryItems,
  getInventoryStockLedger,
  getInventoryPolicy,
  getInventoryTransfers,
  getInventoryUnitsOfMeasure,
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
  updateInventoryItemCategory,
  updateInventoryItemGroup,
  updateInventoryTransfer,
  updateInventoryUnitOfMeasure,
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
  InventoryItemCategory,
  InventoryItemGroup,
  InventoryItemUnitConversion,
  InventoryIssueStatus,
  InventoryCostingMethod,
  InventoryItemType,
  InventoryReceiptStatus,
  InventoryTransfer,
  InventoryTransferLinePayload,
  InventoryTransferStatus,
  InventoryStockMovement,
  InventoryStockMovementType,
  InventoryUnitOfMeasure,
  InventoryWarehouse,
} from "@/types/api";
import { Button, Card, PageShell, SectionHeading, SidePanel, StatusPill } from "@/components/ui";
import { Field, Input, Select, Textarea } from "@/components/ui/forms";
import {
  ItemEditorModal,
  ItemEditorState,
  ItemUnitConversionEditorState,
  createEmptyItemEditor,
  createUnitConversionEditor,
} from "./item-editor-modal";

const ITEM_TYPE_OPTIONS: InventoryItemType[] = ["RAW_MATERIAL", "FINISHED_GOOD", "SERVICE", "MANUFACTURED_ITEM"];
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
const INVENTORY_ITEMS_PAGE_SIZE = 20;
const INVENTORY_RECEIPTS_PAGE_SIZE = 20;
const INVENTORY_ISSUES_PAGE_SIZE = 20;
const INVENTORY_TRANSFERS_PAGE_SIZE = 20;
const INVENTORY_ADJUSTMENTS_PAGE_SIZE = 20;
const INVENTORY_STOCK_LEDGER_PAGE_SIZE = 20;

type InventoryWorkspace =
  | "policy"
  | "itemGroups"
  | "itemCategories"
  | "unitsOfMeasure"
  | "items"
  | "warehouses"
  | "receipts"
  | "issues"
  | "transfers"
  | "adjustments"
  | "stockLedger";

type ItemGroupEditorState = {
  id?: string;
  code: string;
  name: string;
  description: string;
  parentGroupId: string;
  inventoryAccountId: string;
  cogsAccountId: string;
  salesAccountId: string;
  adjustmentAccountId: string;
};

type ItemCategoryEditorState = {
  id?: string;
  code: string;
  name: string;
  description: string;
  itemGroupId: string;
};

type UnitEditorState = {
  id?: string;
  code: string;
  name: string;
  description: string;
  unitType: string;
  decimalPrecision: string;
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

function createEmptyItemGroupEditor(): ItemGroupEditorState {
  return {
    code: "",
    name: "",
    description: "",
    parentGroupId: "",
    inventoryAccountId: "",
    cogsAccountId: "",
    salesAccountId: "",
    adjustmentAccountId: "",
  };
}

function createEmptyItemCategoryEditor(): ItemCategoryEditorState {
  return {
    code: "",
    name: "",
    description: "",
    itemGroupId: "",
  };
}

function createEmptyUnitEditor(): UnitEditorState {
  return {
    code: "",
    name: "",
    description: "",
    unitType: "",
    decimalPrecision: "0",
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
  const { t, language } = useTranslation();
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [workspace, setWorkspace] = useState<InventoryWorkspace>("items");

  const [itemSearch, setItemSearch] = useState("");
  const [itemStatusFilter, setItemStatusFilter] = useState<"" | "true" | "false">("");
  const [itemTypeFilter, setItemTypeFilter] = useState<InventoryItemType | "">("");
  const [itemGroupFilter, setItemGroupFilter] = useState("");
  const [itemCategoryFilter, setItemCategoryFilter] = useState("");
  const [itemPage, setItemPage] = useState(1);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isItemEditorOpen, setIsItemEditorOpen] = useState(false);
  const [itemEditor, setItemEditor] = useState<ItemEditorState>(createEmptyItemEditor);
  const itemSaveModeRef = useRef<"save" | "saveAndClose">("saveAndClose");
  const [showItemCodePreview, setShowItemCodePreview] = useState(false);

  const [itemGroupSearch, setItemGroupSearch] = useState("");
  const [itemGroupStatusFilter, setItemGroupStatusFilter] = useState<"" | "true" | "false">("");
  const [selectedItemGroupId, setSelectedItemGroupId] = useState<string | null>(null);
  const [isItemGroupEditorOpen, setIsItemGroupEditorOpen] = useState(false);
  const [itemGroupEditor, setItemGroupEditor] = useState<ItemGroupEditorState>(createEmptyItemGroupEditor);

  const [itemCategorySearch, setItemCategorySearch] = useState("");
  const [itemCategoryStatusFilter, setItemCategoryStatusFilter] = useState<"" | "true" | "false">("");
  const [itemCategoryGroupFilter, setItemCategoryGroupFilter] = useState("");
  const [selectedItemCategoryId, setSelectedItemCategoryId] = useState<string | null>(null);
  const [isItemCategoryEditorOpen, setIsItemCategoryEditorOpen] = useState(false);
  const [itemCategoryEditor, setItemCategoryEditor] = useState<ItemCategoryEditorState>(createEmptyItemCategoryEditor);

  const [unitSearch, setUnitSearch] = useState("");
  const [unitStatusFilter, setUnitStatusFilter] = useState<"" | "true" | "false">("");
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [isUnitEditorOpen, setIsUnitEditorOpen] = useState(false);
  const [unitEditor, setUnitEditor] = useState<UnitEditorState>(createEmptyUnitEditor);

  const [warehouseSearch, setWarehouseSearch] = useState("");
  const [warehouseStatusFilter, setWarehouseStatusFilter] = useState<"" | "true" | "false">("");
  const [warehouseTransitFilter, setWarehouseTransitFilter] = useState<"" | "true" | "false">("");
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | null>(null);
  const [isWarehouseEditorOpen, setIsWarehouseEditorOpen] = useState(false);
  const [warehouseEditor, setWarehouseEditor] = useState<WarehouseEditorState>(createEmptyWarehouseEditor);

  const [receiptSearch, setReceiptSearch] = useState("");
  const [receiptStatusFilter, setReceiptStatusFilter] = useState<InventoryReceiptStatus | "">("");
  const [receiptWarehouseFilter, setReceiptWarehouseFilter] = useState("");
  const [receiptPage, setReceiptPage] = useState(1);
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);
  const [isReceiptEditorOpen, setIsReceiptEditorOpen] = useState(false);
  const [receiptEditor, setReceiptEditor] = useState<ReceiptEditorState>(createEmptyReceiptEditor);
  const [issueSearch, setIssueSearch] = useState("");
  const [issueStatusFilter, setIssueStatusFilter] = useState<InventoryIssueStatus | "">("");
  const [issueWarehouseFilter, setIssueWarehouseFilter] = useState("");
  const [issuePage, setIssuePage] = useState(1);
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [isIssueEditorOpen, setIsIssueEditorOpen] = useState(false);
  const [issueEditor, setIssueEditor] = useState<IssueEditorState>(createEmptyIssueEditor);
  const [transferSearch, setTransferSearch] = useState("");
  const [transferStatusFilter, setTransferStatusFilter] = useState<InventoryTransferStatus | "">("");
  const [transferSourceWarehouseFilter, setTransferSourceWarehouseFilter] = useState("");
  const [transferDestinationWarehouseFilter, setTransferDestinationWarehouseFilter] = useState("");
  const [transferPage, setTransferPage] = useState(1);
  const [selectedTransferId, setSelectedTransferId] = useState<string | null>(null);
  const [isTransferEditorOpen, setIsTransferEditorOpen] = useState(false);
  const [transferEditor, setTransferEditor] = useState<TransferEditorState>(createEmptyTransferEditor);
  const [adjustmentSearch, setAdjustmentSearch] = useState("");
  const [adjustmentStatusFilter, setAdjustmentStatusFilter] = useState<InventoryAdjustmentStatus | "">("");
  const [adjustmentWarehouseFilter, setAdjustmentWarehouseFilter] = useState("");
  const [adjustmentReasonFilter, setAdjustmentReasonFilter] = useState("");
  const [adjustmentPage, setAdjustmentPage] = useState(1);
  const [selectedAdjustmentId, setSelectedAdjustmentId] = useState<string | null>(null);
  const [isAdjustmentEditorOpen, setIsAdjustmentEditorOpen] = useState(false);
  const [adjustmentEditor, setAdjustmentEditor] = useState<AdjustmentEditorState>(createEmptyAdjustmentEditor);
  const [stockLedgerSearch, setStockLedgerSearch] = useState("");
  const [stockLedgerItemFilter, setStockLedgerItemFilter] = useState("");
  const [stockLedgerWarehouseFilter, setStockLedgerWarehouseFilter] = useState("");
  const [stockLedgerMovementTypeFilter, setStockLedgerMovementTypeFilter] = useState<InventoryStockMovementType | "">("");
  const [stockLedgerPage, setStockLedgerPage] = useState(1);
  const [costingMethodDraft, setCostingMethodDraft] = useState<InventoryCostingMethod>("WEIGHTED_AVERAGE");

  const inventoryItemsQuery = useQuery({
    queryKey: queryKeys.inventoryItems(token, {
      search: itemSearch,
      isActive: itemStatusFilter,
      type: itemTypeFilter,
      itemGroupId: itemGroupFilter || undefined,
      itemCategoryId: itemCategoryFilter || undefined,
      page: itemPage,
      limit: INVENTORY_ITEMS_PAGE_SIZE,
    }),
    queryFn: () =>
      getInventoryItems(
        {
          search: itemSearch,
          isActive: itemStatusFilter,
          type: itemTypeFilter,
          itemGroupId: itemGroupFilter || undefined,
          itemCategoryId: itemCategoryFilter || undefined,
          page: itemPage,
          limit: INVENTORY_ITEMS_PAGE_SIZE,
        },
        token,
      ),
  });

  const itemGroupsQuery = useQuery({
    queryKey: queryKeys.inventoryItemGroups(token, {
      search: itemGroupSearch,
      isActive: itemGroupStatusFilter,
    }),
    queryFn: () =>
      getInventoryItemGroups(
        { search: itemGroupSearch, isActive: itemGroupStatusFilter },
        token,
      ),
  });

  const activeItemGroupsQuery = useQuery({
    queryKey: queryKeys.inventoryItemGroups(token, { isActive: "true" }),
    queryFn: () => getInventoryItemGroups({ isActive: "true" }, token),
    staleTime: 5 * 60 * 1000,
  });

  const itemCategoriesQuery = useQuery({
    queryKey: queryKeys.inventoryItemCategories(token, {
      search: itemCategorySearch,
      isActive: itemCategoryStatusFilter,
      itemGroupId: itemCategoryGroupFilter || undefined,
    }),
    queryFn: () =>
      getInventoryItemCategories(
        {
          search: itemCategorySearch,
          isActive: itemCategoryStatusFilter,
          itemGroupId: itemCategoryGroupFilter || undefined,
        },
        token,
      ),
  });

  const activeItemCategoriesQuery = useQuery({
    queryKey: queryKeys.inventoryItemCategories(token, { isActive: "true" }),
    queryFn: () => getInventoryItemCategories({ isActive: "true" }, token),
    staleTime: 5 * 60 * 1000,
  });

  const unitsQuery = useQuery({
    queryKey: queryKeys.inventoryUnitsOfMeasure(token, {
      search: unitSearch,
      isActive: unitStatusFilter,
    }),
    queryFn: () =>
      getInventoryUnitsOfMeasure(
        { search: unitSearch, isActive: unitStatusFilter },
        token,
      ),
  });

  const activeUnitsQuery = useQuery({
    queryKey: queryKeys.inventoryUnitsOfMeasure(token, { isActive: "true" }),
    queryFn: () => getInventoryUnitsOfMeasure({ isActive: "true" }, token),
    staleTime: 5 * 60 * 1000,
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
      page: receiptPage,
      limit: INVENTORY_RECEIPTS_PAGE_SIZE,
    }),
    queryFn: () =>
      getInventoryGoodsReceipts(
        {
          search: receiptSearch,
          status: receiptStatusFilter,
          warehouseId: receiptWarehouseFilter || undefined,
          page: receiptPage,
          limit: INVENTORY_RECEIPTS_PAGE_SIZE,
        },
        token,
      ),
  });

  const goodsIssuesQuery = useQuery({
    queryKey: queryKeys.inventoryGoodsIssues(token, {
      search: issueSearch,
      status: issueStatusFilter,
      warehouseId: issueWarehouseFilter || undefined,
      page: issuePage,
      limit: INVENTORY_ISSUES_PAGE_SIZE,
    }),
    queryFn: () =>
      getInventoryGoodsIssues(
        {
          search: issueSearch,
          status: issueStatusFilter,
          warehouseId: issueWarehouseFilter || undefined,
          page: issuePage,
          limit: INVENTORY_ISSUES_PAGE_SIZE,
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
      page: transferPage,
      limit: INVENTORY_TRANSFERS_PAGE_SIZE,
    }),
    queryFn: () =>
      getInventoryTransfers(
        {
          search: transferSearch,
          status: transferStatusFilter,
          sourceWarehouseId: transferSourceWarehouseFilter || undefined,
          destinationWarehouseId: transferDestinationWarehouseFilter || undefined,
          page: transferPage,
          limit: INVENTORY_TRANSFERS_PAGE_SIZE,
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
      page: adjustmentPage,
      limit: INVENTORY_ADJUSTMENTS_PAGE_SIZE,
    }),
    queryFn: () =>
      getInventoryAdjustments(
        {
          search: adjustmentSearch,
          status: adjustmentStatusFilter,
          warehouseId: adjustmentWarehouseFilter || undefined,
          reason: adjustmentReasonFilter || undefined,
          page: adjustmentPage,
          limit: INVENTORY_ADJUSTMENTS_PAGE_SIZE,
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
      page: stockLedgerPage,
      limit: INVENTORY_STOCK_LEDGER_PAGE_SIZE,
    }),
    queryFn: () =>
      getInventoryStockLedger(
        {
          search: stockLedgerSearch,
          itemId: stockLedgerItemFilter || undefined,
          warehouseId: stockLedgerWarehouseFilter || undefined,
          movementType: stockLedgerMovementTypeFilter || undefined,
          page: stockLedgerPage,
          limit: INVENTORY_STOCK_LEDGER_PAGE_SIZE,
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

  const activeTaxesQuery = useQuery({
    queryKey: ["taxes", "active", token],
    queryFn: () => getActiveTaxes(token),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (inventoryPolicyQuery.data?.costingMethod) {
      setCostingMethodDraft(inventoryPolicyQuery.data.costingMethod);
    }
  }, [inventoryPolicyQuery.data?.costingMethod]);

  useEffect(() => {
    setItemPage(1);
  }, [itemSearch, itemStatusFilter, itemTypeFilter, itemGroupFilter, itemCategoryFilter]);

  useEffect(() => {
    if (!itemGroupFilter && itemCategoryFilter) return;
    const category = itemCategoriesQuery.data?.find((row) => row.id === itemCategoryFilter);
    if (category && itemGroupFilter && category.itemGroupId !== itemGroupFilter) {
      setItemCategoryFilter("");
    }
  }, [itemCategoryFilter, itemCategoriesQuery.data, itemGroupFilter]);

  useEffect(() => {
    setItemCategoryEditor((current) =>
      itemCategoryGroupFilter && !current.id ? { ...current, itemGroupId: itemCategoryGroupFilter } : current,
    );
  }, [itemCategoryGroupFilter]);

  useEffect(() => {
    setReceiptPage(1);
  }, [receiptSearch, receiptStatusFilter, receiptWarehouseFilter]);

  useEffect(() => {
    setIssuePage(1);
  }, [issueSearch, issueStatusFilter, issueWarehouseFilter]);

  useEffect(() => {
    setTransferPage(1);
  }, [transferSearch, transferStatusFilter, transferSourceWarehouseFilter, transferDestinationWarehouseFilter]);

  useEffect(() => {
    setAdjustmentPage(1);
  }, [adjustmentSearch, adjustmentStatusFilter, adjustmentWarehouseFilter, adjustmentReasonFilter]);

  useEffect(() => {
    setStockLedgerPage(1);
  }, [stockLedgerSearch, stockLedgerItemFilter, stockLedgerWarehouseFilter, stockLedgerMovementTypeFilter]);

  const updateInventoryPolicyMutation = useMutation({
    mutationFn: () => updateInventoryPolicy({ costingMethod: costingMethodDraft }, token),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["inventory-policy"] });
    },
  });

  const createItemGroupMutation = useMutation({
    mutationFn: () => createInventoryItemGroup(mapItemGroupEditorToPayload(itemGroupEditor), token),
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ["inventory-item-groups"] });
      setSelectedItemGroupId(created.id);
      closeItemGroupEditor();
    },
  });

  const updateItemGroupMutation = useMutation({
    mutationFn: () => updateInventoryItemGroup(itemGroupEditor.id!, mapItemGroupEditorToPayload(itemGroupEditor), token),
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({ queryKey: ["inventory-item-groups"] });
      await queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      setSelectedItemGroupId(updated.id);
      closeItemGroupEditor();
    },
  });

  const deactivateItemGroupMutation = useMutation({
    mutationFn: (id: string) => deactivateInventoryItemGroup(id, token),
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({ queryKey: ["inventory-item-groups"] });
      await queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      setSelectedItemGroupId(updated.id);
    },
  });

  const createItemCategoryMutation = useMutation({
    mutationFn: () => createInventoryItemCategory(mapItemCategoryEditorToPayload(itemCategoryEditor), token),
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ["inventory-item-categories"] });
      setSelectedItemCategoryId(created.id);
      closeItemCategoryEditor();
    },
  });

  const updateItemCategoryMutation = useMutation({
    mutationFn: () => updateInventoryItemCategory(itemCategoryEditor.id!, mapItemCategoryEditorToPayload(itemCategoryEditor), token),
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({ queryKey: ["inventory-item-categories"] });
      await queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      setSelectedItemCategoryId(updated.id);
      closeItemCategoryEditor();
    },
  });

  const deactivateItemCategoryMutation = useMutation({
    mutationFn: (id: string) => deactivateInventoryItemCategory(id, token),
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({ queryKey: ["inventory-item-categories"] });
      await queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      setSelectedItemCategoryId(updated.id);
    },
  });

  const createUnitMutation = useMutation({
    mutationFn: () => createInventoryUnitOfMeasure(mapUnitEditorToPayload(unitEditor), token),
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ["inventory-units-of-measure"] });
      setSelectedUnitId(created.id);
      closeUnitEditor();
    },
  });

  const updateUnitMutation = useMutation({
    mutationFn: () => updateInventoryUnitOfMeasure(unitEditor.id!, mapUnitEditorToPayload(unitEditor), token),
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({ queryKey: ["inventory-units-of-measure"] });
      await queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      setSelectedUnitId(updated.id);
      closeUnitEditor();
    },
  });

  const deactivateUnitMutation = useMutation({
    mutationFn: (id: string) => deactivateInventoryUnitOfMeasure(id, token),
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({ queryKey: ["inventory-units-of-measure"] });
      await queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      setSelectedUnitId(updated.id);
    },
  });

  const createItemMutation = useMutation({
    mutationFn: () => createInventoryItem(mapItemEditorToPayload(itemEditor), token),
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      setSelectedItemId(created.id);
      setItemEditor(mapItemToEditor(created));
      setShowItemCodePreview(Boolean(created.barcode || created.qrCodeValue));
      if (itemSaveModeRef.current === "saveAndClose") {
        closeItemEditor();
      }
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: () => updateInventoryItem(itemEditor.id!, mapItemEditorToPayload(itemEditor), token),
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      setSelectedItemId(updated.id);
      setItemEditor(mapItemToEditor(updated));
      setShowItemCodePreview(Boolean(updated.barcode || updated.qrCodeValue));
      if (itemSaveModeRef.current === "saveAndClose") {
        closeItemEditor();
      }
    },
  });

  const generateBarcodeMutation = useMutation({
    mutationFn: () => generateInventoryBarcode(token),
    onSuccess: ({ barcode }) => {
      setItemEditor((current) => ({ ...current, barcode }));
      setShowItemCodePreview(true);
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

  const itemsResponse = inventoryItemsQuery.data;
  const items = itemsResponse?.data ?? [];
  const itemGroups = itemGroupsQuery.data ?? [];
  const itemCategories = itemCategoriesQuery.data ?? [];
  const unitsOfMeasure = unitsQuery.data ?? [];
  const activeItemGroups = activeItemGroupsQuery.data ?? itemGroups.filter((row) => row.isActive);
  const activeItemCategories = activeItemCategoriesQuery.data ?? itemCategories.filter((row) => row.isActive);
  const activeUnitsOfMeasure = activeUnitsQuery.data ?? unitsOfMeasure.filter((row) => row.isActive);
  const activeTaxes = activeTaxesQuery.data ?? [];
  const itemEditorCategories = activeItemCategories.filter((row) => row.itemGroupId === itemEditor.itemGroupId);
  const isArabic = language === "ar";
  const inventorySettingsDisabled = itemEditor.type === "SERVICE" || !itemEditor.trackInventory;
  useEffect(() => {
    if (itemEditor.type !== "SERVICE") {
      setItemEditor((current) => ensureBaseUnitConversionRow(current, activeUnitsOfMeasure));
    }
  }, [activeUnitsOfMeasure, itemEditor.unitOfMeasureId, itemEditor.type]);

  const itemTotal = itemsResponse?.total ?? 0;
  const itemTotalPages = itemsResponse?.totalPages ?? 1;
  const itemRangeStart = itemTotal === 0 ? 0 : (itemPage - 1) * INVENTORY_ITEMS_PAGE_SIZE + 1;
  const itemRangeEnd = itemTotal === 0 ? 0 : Math.min(itemPage * INVENTORY_ITEMS_PAGE_SIZE, itemTotal);
  const warehouses = inventoryWarehousesQuery.data ?? [];
  const receiptsResponse = goodsReceiptsQuery.data;
  const receipts = receiptsResponse?.data ?? [];
  const receiptsTotal = receiptsResponse?.total ?? 0;
  const receiptsTotalPages = receiptsResponse?.totalPages ?? 1;
  const receiptsRangeStart = receiptsTotal === 0 ? 0 : (receiptPage - 1) * INVENTORY_RECEIPTS_PAGE_SIZE + 1;
  const receiptsRangeEnd = receiptsTotal === 0 ? 0 : Math.min(receiptPage * INVENTORY_RECEIPTS_PAGE_SIZE, receiptsTotal);
  const issuesResponse = goodsIssuesQuery.data;
  const issues = issuesResponse?.data ?? [];
  const issuesTotal = issuesResponse?.total ?? 0;
  const issuesTotalPages = issuesResponse?.totalPages ?? 1;
  const issuesRangeStart = issuesTotal === 0 ? 0 : (issuePage - 1) * INVENTORY_ISSUES_PAGE_SIZE + 1;
  const issuesRangeEnd = issuesTotal === 0 ? 0 : Math.min(issuePage * INVENTORY_ISSUES_PAGE_SIZE, issuesTotal);
  const transfersResponse = inventoryTransfersQuery.data;
  const transfers = transfersResponse?.data ?? [];
  const transfersTotal = transfersResponse?.total ?? 0;
  const transfersTotalPages = transfersResponse?.totalPages ?? 1;
  const transfersRangeStart = transfersTotal === 0 ? 0 : (transferPage - 1) * INVENTORY_TRANSFERS_PAGE_SIZE + 1;
  const transfersRangeEnd = transfersTotal === 0 ? 0 : Math.min(transferPage * INVENTORY_TRANSFERS_PAGE_SIZE, transfersTotal);
  const adjustmentsResponse = inventoryAdjustmentsQuery.data;
  const adjustments = adjustmentsResponse?.data ?? [];
  const adjustmentsTotal = adjustmentsResponse?.total ?? 0;
  const adjustmentsTotalPages = adjustmentsResponse?.totalPages ?? 1;
  const adjustmentsRangeStart = adjustmentsTotal === 0 ? 0 : (adjustmentPage - 1) * INVENTORY_ADJUSTMENTS_PAGE_SIZE + 1;
  const adjustmentsRangeEnd =
    adjustmentsTotal === 0 ? 0 : Math.min(adjustmentPage * INVENTORY_ADJUSTMENTS_PAGE_SIZE, adjustmentsTotal);
  const stockMovementsResponse = inventoryStockLedgerQuery.data;
  const stockMovements = stockMovementsResponse?.data ?? [];
  const stockMovementsTotal = stockMovementsResponse?.total ?? 0;
  const stockMovementsTotalPages = stockMovementsResponse?.totalPages ?? 1;
  const stockMovementsRangeStart =
    stockMovementsTotal === 0 ? 0 : (stockLedgerPage - 1) * INVENTORY_STOCK_LEDGER_PAGE_SIZE + 1;
  const stockMovementsRangeEnd =
    stockMovementsTotal === 0
      ? 0
      : Math.min(stockLedgerPage * INVENTORY_STOCK_LEDGER_PAGE_SIZE, stockMovementsTotal);

  const selectedItem = items.find((row) => row.id === (selectedItemId ?? items[0]?.id)) ?? items[0] ?? null;
  const selectedItemGroup =
    itemGroups.find((row) => row.id === (selectedItemGroupId ?? itemGroups[0]?.id)) ?? itemGroups[0] ?? null;
  const selectedItemCategory =
    itemCategories.find((row) => row.id === (selectedItemCategoryId ?? itemCategories[0]?.id)) ?? itemCategories[0] ?? null;
  const selectedUnit = unitsOfMeasure.find((row) => row.id === (selectedUnitId ?? unitsOfMeasure[0]?.id)) ?? unitsOfMeasure[0] ?? null;
  const selectedWarehouse =
    warehouses.find((row) => row.id === (selectedWarehouseId ?? warehouses[0]?.id)) ?? warehouses[0] ?? null;
  const selectedReceipt = receipts.find((row) => row.id === (selectedReceiptId ?? receipts[0]?.id)) ?? receipts[0] ?? null;
  const selectedIssue = issues.find((row) => row.id === (selectedIssueId ?? issues[0]?.id)) ?? issues[0] ?? null;
  const selectedTransfer =
    transfers.find((row) => row.id === (selectedTransferId ?? transfers[0]?.id)) ?? transfers[0] ?? null;
  const selectedAdjustment =
    adjustments.find((row) => row.id === (selectedAdjustmentId ?? adjustments[0]?.id)) ?? adjustments[0] ?? null;

  const itemFormError = getItemFormError(itemEditor);
  const itemGroupFormError = getItemGroupFormError(itemGroupEditor);
  const itemCategoryFormError = getItemCategoryFormError(itemCategoryEditor);
  const unitFormError = getUnitFormError(unitEditor);
  const warehouseFormError = getWarehouseFormError(warehouseEditor);
  const receiptFormError = getReceiptFormError(receiptEditor);
  const issueFormError = getIssueFormError(issueEditor);
  const transferFormError = getTransferFormError(transferEditor);
  const adjustmentFormError = getAdjustmentFormError(adjustmentEditor);

  const itemMutationError = getMutationError(
    createItemMutation.error,
    updateItemMutation.error,
    deactivateItemMutation.error,
    generateBarcodeMutation.error,
  );
  const itemGroupMutationError = getMutationError(
    createItemGroupMutation.error,
    updateItemGroupMutation.error,
    deactivateItemGroupMutation.error,
  );
  const itemCategoryMutationError = getMutationError(
    createItemCategoryMutation.error,
    updateItemCategoryMutation.error,
    deactivateItemCategoryMutation.error,
  );
  const unitMutationError = getMutationError(createUnitMutation.error, updateUnitMutation.error, deactivateUnitMutation.error);
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
          <MetricCard label={t("inventory.metrics.total")} value={String(itemTotal)} />
          <MetricCard label={t("inventory.metrics.active")} value={String(activeItems)} />
          <MetricCard label={t("inventory.metrics.itemGroups")} value={String(itemGroups.length)} />
          <MetricCard label={t("inventory.metrics.itemCategories")} value={String(itemCategories.length)} />
          <MetricCard label={t("inventory.metrics.unitsOfMeasure")} value={String(unitsOfMeasure.length)} />
          <MetricCard label={t("inventory.metrics.warehouses")} value={String(warehouses.length)} />
          <MetricCard label={t("inventory.metrics.activeWarehouses")} value={String(activeWarehouses)} />
          <MetricCard label={t("inventory.metrics.receipts")} value={String(receiptsTotal)} />
          <MetricCard label={t("inventory.metrics.postedReceipts")} value={String(postedReceipts)} />
          <MetricCard label={t("inventory.metrics.issues")} value={String(issuesTotal)} />
          <MetricCard label={t("inventory.metrics.postedIssues")} value={String(postedIssues)} />
          <MetricCard label={t("inventory.metrics.transfers")} value={String(transfersTotal)} />
          <MetricCard label={t("inventory.metrics.postedTransfers")} value={String(postedTransfers)} />
          <MetricCard label={t("inventory.metrics.adjustments")} value={String(adjustmentsTotal)} />
          <MetricCard label={t("inventory.metrics.postedAdjustments")} value={String(postedAdjustments)} />
          <MetricCard label={t("inventory.metrics.stockMovements")} value={String(stockMovementsTotal)} />
        </div>

        <section className="space-y-4">
          <SectionHeading title={t("inventory.workspace.title")} description={t("inventory.workspace.description")} />
          <Card className="flex flex-wrap gap-3">
            <Button variant={workspace === "items" ? "primary" : "secondary"} onClick={() => setWorkspace("items")}>
              {t("inventory.workspace.items")}
            </Button>
            <Button variant={workspace === "itemGroups" ? "primary" : "secondary"} onClick={() => setWorkspace("itemGroups")}>
              {t("inventory.workspace.itemGroups")}
            </Button>
            <Button variant={workspace === "itemCategories" ? "primary" : "secondary"} onClick={() => setWorkspace("itemCategories")}>
              {t("inventory.workspace.itemCategories")}
            </Button>
            <Button variant={workspace === "unitsOfMeasure" ? "primary" : "secondary"} onClick={() => setWorkspace("unitsOfMeasure")}>
              {t("inventory.workspace.unitsOfMeasure")}
            </Button>
            <Button variant={workspace === "warehouses" ? "primary" : "secondary"} onClick={() => setWorkspace("warehouses")}>
              {t("inventory.workspace.warehouses")}
            </Button>
            <Button variant={workspace === "receipts" ? "primary" : "secondary"} onClick={() => setWorkspace("receipts")}>
              {t("inventory.workspace.receipts")}
            </Button>
            <Button variant={workspace === "issues" ? "primary" : "secondary"} onClick={() => setWorkspace("issues")}>
              {t("inventory.workspace.issues")}
            </Button>
            <Button variant={workspace === "transfers" ? "primary" : "secondary"} onClick={() => setWorkspace("transfers")}>
              {t("inventory.workspace.transfers")}
            </Button>
            <Button variant={workspace === "adjustments" ? "primary" : "secondary"} onClick={() => setWorkspace("adjustments")}>
              {t("inventory.workspace.adjustments")}
            </Button>
            <Button variant={workspace === "stockLedger" ? "primary" : "secondary"} onClick={() => setWorkspace("stockLedger")}>
              {t("inventory.workspace.stockLedger")}
            </Button>
            <Button variant={workspace === "policy" ? "primary" : "secondary"} onClick={() => setWorkspace("policy")}>
              {t("inventory.workspace.policy")}
            </Button>
          </Card>
        </section>

        <section id="inventory-policy-section" className={`space-y-5 ${workspace === "policy" ? "" : "hidden"}`}>
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

        <section id="inventory-item-groups-section" className={`space-y-5 ${workspace === "itemGroups" ? "" : "hidden"}`}>
          <SectionHeading
            title={t("inventory.itemGroups.title")}
            description={t("inventory.itemGroups.description")}
            action={<Button onClick={() => openNewItemGroup()}>{t("inventory.button.newItemGroup")}</Button>}
          />
          <MasterDataGrid
            search={itemGroupSearch}
            onSearch={setItemGroupSearch}
            status={itemGroupStatusFilter}
            onStatus={(value) => setItemGroupStatusFilter(value)}
            searchPlaceholder={t("inventory.itemGroups.filters.search")}
            loading={itemGroupsQuery.isLoading}
            empty={t("inventory.itemGroups.empty")}
            rows={itemGroups}
            selectedId={selectedItemGroup?.id ?? null}
            onSelect={setSelectedItemGroupId}
            renderMeta={(group) =>
              <div className="flex flex-wrap justify-end gap-x-2 gap-y-1">
                {group.parentGroup ? <span>{formatCodeName(group.parentGroup.code, group.parentGroup.name, isArabic)}</span> : null}
                <span>{t("inventory.itemGroups.categoryCount", { count: group.categoryCount })}</span>
                <span>{t("inventory.itemGroups.itemCount", { count: group.itemCount })}</span>
              </div>
            }
            detail={
              selectedItemGroup ? (
                <MasterDataDetail
                  code={selectedItemGroup.code}
                  name={selectedItemGroup.name}
                  isActive={selectedItemGroup.isActive}
                  description={selectedItemGroup.description}
                  rows={[
                    [t("inventory.itemGroups.field.parentGroup"), selectedItemGroup.parentGroup ? formatCodeName(selectedItemGroup.parentGroup.code, selectedItemGroup.parentGroup.name, isArabic) : t("inventory.emptyValue")],
                    [t("inventory.itemGroups.detail.categoryCount"), String(selectedItemGroup.categoryCount)],
                    [t("inventory.itemGroups.detail.itemCount"), String(selectedItemGroup.itemCount)],
                  ]}
                  onEdit={() => openEditItemGroup(selectedItemGroup)}
                  onDeactivate={() => confirmDeactivateItemGroup(selectedItemGroup.id)}
                  editLabel={t("inventory.button.editItemGroup")}
                  deactivateLabel={t("inventory.button.deactivate")}
                  disableActions={!selectedItemGroup.isActive || deactivateItemGroupMutation.isPending}
                />
              ) : (
                <div className="text-sm leading-7 text-gray-500">{t("inventory.itemGroups.details.empty")}</div>
              )
            }
          />
        </section>

        <section id="inventory-item-categories-section" className={`space-y-5 ${workspace === "itemCategories" ? "" : "hidden"}`}>
          <SectionHeading
            title={t("inventory.itemCategories.title")}
            description={t("inventory.itemCategories.description")}
            action={<Button onClick={() => openNewItemCategory()}>{t("inventory.button.newItemCategory")}</Button>}
          />
          <MasterDataGrid
            search={itemCategorySearch}
            onSearch={setItemCategorySearch}
            status={itemCategoryStatusFilter}
            onStatus={(value) => setItemCategoryStatusFilter(value)}
            searchPlaceholder={t("inventory.itemCategories.filters.search")}
            loading={itemCategoriesQuery.isLoading}
            empty={t("inventory.itemCategories.empty")}
            rows={itemCategories}
            selectedId={selectedItemCategory?.id ?? null}
            onSelect={setSelectedItemCategoryId}
            extraFilter={
              <Select value={itemCategoryGroupFilter} onChange={(event) => setItemCategoryGroupFilter(event.target.value)}>
                <option value="">{t("inventory.itemCategories.filters.allGroups")}</option>
                {activeItemGroups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {formatCodeNameText(group.code, group.name, isArabic)}
                  </option>
                ))}
              </Select>
            }
            renderMeta={(category) =>
              <div className="flex flex-wrap justify-end gap-x-2 gap-y-1">
                <span>{formatCodeName(category.itemGroup.code, category.itemGroup.name, isArabic)}</span>
                <span>{t("inventory.itemCategories.itemCount", { count: category.itemCount })}</span>
              </div>
            }
            detail={
              selectedItemCategory ? (
                <MasterDataDetail
                  code={selectedItemCategory.code}
                  name={selectedItemCategory.name}
                  isActive={selectedItemCategory.isActive}
                  description={selectedItemCategory.description}
                  rows={[
                    [t("inventory.itemCategories.field.itemGroup"), formatCodeName(selectedItemCategory.itemGroup.code, selectedItemCategory.itemGroup.name, isArabic)],
                    [t("inventory.itemCategories.detail.itemCount"), String(selectedItemCategory.itemCount)],
                  ]}
                  onEdit={() => openEditItemCategory(selectedItemCategory)}
                  onDeactivate={() => confirmDeactivateItemCategory(selectedItemCategory.id)}
                  editLabel={t("inventory.button.editItemCategory")}
                  deactivateLabel={t("inventory.button.deactivate")}
                  disableActions={!selectedItemCategory.isActive || deactivateItemCategoryMutation.isPending}
                />
              ) : (
                <div className="text-sm leading-7 text-gray-500">{t("inventory.itemCategories.details.empty")}</div>
              )
            }
          />
        </section>

        <section id="inventory-units-section" className={`space-y-5 ${workspace === "unitsOfMeasure" ? "" : "hidden"}`}>
          <SectionHeading
            title={t("inventory.units.title")}
            description={t("inventory.units.description")}
            action={<Button onClick={() => openNewUnit()}>{t("inventory.button.newUnit")}</Button>}
          />
          <MasterDataGrid
            search={unitSearch}
            onSearch={setUnitSearch}
            status={unitStatusFilter}
            onStatus={(value) => setUnitStatusFilter(value)}
            searchPlaceholder={t("inventory.units.filters.search")}
            loading={unitsQuery.isLoading}
            empty={t("inventory.units.empty")}
            rows={unitsOfMeasure}
            selectedId={selectedUnit?.id ?? null}
            onSelect={setSelectedUnitId}
            renderMeta={(unit) =>
              [
                unit.unitType || null,
                t("inventory.units.decimalPrecision", { count: unit.decimalPrecision }),
                t("inventory.units.itemCount", { count: unit.itemCount }),
              ]
                .filter(Boolean)
                .join(" · ")
            }
            detail={
              selectedUnit ? (
                <MasterDataDetail
                  code={selectedUnit.code}
                  name={selectedUnit.name}
                  isActive={selectedUnit.isActive}
                  description={selectedUnit.description}
                  rows={[
                    [t("inventory.units.field.unitType"), selectedUnit.unitType || t("inventory.emptyValue")],
                    [t("inventory.units.field.decimalPrecision"), String(selectedUnit.decimalPrecision)],
                    [t("inventory.units.detail.itemCount"), String(selectedUnit.itemCount)],
                  ]}
                  onEdit={() => openEditUnit(selectedUnit)}
                  onDeactivate={() => confirmDeactivateUnit(selectedUnit.id)}
                  editLabel={t("inventory.button.editUnit")}
                  deactivateLabel={t("inventory.button.deactivate")}
                  disableActions={!selectedUnit.isActive || deactivateUnitMutation.isPending}
                />
              ) : (
                <div className="text-sm leading-7 text-gray-500">{t("inventory.units.details.empty")}</div>
              )
            }
          />
        </section>

        <section id="inventory-items-section" className={`space-y-5 ${workspace === "items" ? "" : "hidden"}`}>
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
                <Select
                  value={itemGroupFilter}
                  onChange={(event) => {
                    setItemGroupFilter(event.target.value);
                    setItemCategoryFilter("");
                  }}
                >
                  <option value="">{t("inventory.filters.allItemGroups")}</option>
                  {activeItemGroups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {formatCodeNameText(group.code, group.name, isArabic)}
                    </option>
                  ))}
                </Select>
                <Select value={itemCategoryFilter} onChange={(event) => setItemCategoryFilter(event.target.value)}>
                  <option value="">{t("inventory.filters.allItemCategories")}</option>
                  {activeItemCategories
                    .filter((category) => !itemGroupFilter || category.itemGroupId === itemGroupFilter)
                    .map((category) => (
                      <option key={category.id} value={category.id}>
                        {formatCodeNameText(category.code, category.name, isArabic)}
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
                        className={`w-full rounded-2xl border px-5 py-4 text-left transition ${isSelected ? "border-teal-200 bg-teal-50/60" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                          }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <div className="text-xs font-black uppercase tracking-[0.18em] text-gray-500">{item.code}</div>
                            <div className="text-lg font-black tracking-tight text-gray-900">{item.name}</div>
                            <div className="text-sm text-gray-600">
                              {t(`inventory.type.${item.type}`)} · {item.unitOfMeasure}
                              {item.itemGroup ? ` · ${item.itemGroup.name}` : ""}
                              {item.itemCategory ? ` · ${item.itemCategory.name}` : item.category ? ` · ${item.category}` : ""}
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

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-4 text-sm text-gray-600">
                <div>
                  {t("inventory.pagination.summary", {
                    from: itemRangeStart,
                    to: itemRangeEnd,
                    total: itemTotal,
                  })}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">
                    {t("inventory.pagination.page", { page: itemPage, totalPages: itemTotalPages })}
                  </span>
                  <Button variant="secondary" onClick={() => setItemPage((current) => current - 1)} disabled={itemPage <= 1}>
                    {t("inventory.pagination.previous")}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setItemPage((current) => current + 1)}
                    disabled={itemPage >= itemTotalPages}
                  >
                    {t("inventory.pagination.next")}
                  </Button>
                </div>
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
                    <DetailCard label={t("inventory.detail.itemGroup")} value={selectedItem.itemGroup?.name ?? t("inventory.emptyValue")} />
                    <DetailCard label={t("inventory.detail.itemCategory")} value={selectedItem.itemCategory?.name ?? selectedItem.category ?? t("inventory.emptyValue")} />
                    <DetailCard label={t("inventory.detail.onHand")} value={selectedItem.onHandQuantity} />
                    <DetailCard label={t("inventory.detail.valuation")} value={selectedItem.valuationAmount} />
                    <DetailCard label={t("inventory.detail.reorderLevel")} value={selectedItem.reorderLevel} />
                    <DetailCard label={t("inventory.detail.reorderQuantity")} value={selectedItem.reorderQuantity} />
                    <DetailCard label="الباركود" value={selectedItem.barcode || t("inventory.emptyValue")} />
                    <DetailCard label="رمز QR" value={selectedItem.qrCodeValue || t("inventory.emptyValue")} />
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

                  {selectedItem.barcode || selectedItem.qrCodeValue ? (
                    <div className="grid gap-4 lg:grid-cols-2">
                      <PreviewCard
                        label="الباركود"
                        value={selectedItem.barcode}
                        emptyMessage="لا يوجد باركود بعد."
                        svg={selectedItem.barcode ? getBarcodePreviewSvg(selectedItem.barcode) : null}
                      />
                      <PreviewCard
                        label="رمز QR"
                        value={selectedItem.qrCodeValue}
                        emptyMessage="لا يوجد رمز QR بعد."
                        svg={selectedItem.qrCodeValue ? getQrPreviewSvg(selectedItem.qrCodeValue) : null}
                      />
                    </div>
                  ) : null}

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

        <section id="inventory-issues-section" className={`space-y-5 ${workspace === "issues" ? "" : "hidden"}`}>
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
                        className={`w-full rounded-2xl border px-5 py-4 text-left transition ${isSelected ? "border-rose-200 bg-rose-50/60" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
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

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-4 text-sm text-gray-600">
                <div>
                  {t("inventory.pagination.summary", {
                    from: issuesRangeStart,
                    to: issuesRangeEnd,
                    total: issuesTotal,
                  })}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">
                    {t("inventory.pagination.page", { page: issuePage, totalPages: issuesTotalPages })}
                  </span>
                  <Button variant="secondary" onClick={() => setIssuePage((current) => current - 1)} disabled={issuePage <= 1}>
                    {t("inventory.pagination.previous")}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setIssuePage((current) => current + 1)}
                    disabled={issuePage >= issuesTotalPages}
                  >
                    {t("inventory.pagination.next")}
                  </Button>
                </div>
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

        <section id="inventory-transfers-section" className={`space-y-5 ${workspace === "transfers" ? "" : "hidden"}`}>
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
                      {warehouse.code} · {warehouse.name}
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
                      {warehouse.code} · {warehouse.name}
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
                        className={`w-full rounded-2xl border px-5 py-4 text-left transition ${isSelected ? "border-violet-200 bg-violet-50/60" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                          }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <div className="text-xs font-black uppercase tracking-[0.18em] text-gray-500">{transfer.reference}</div>
                            <div className="text-lg font-black tracking-tight text-gray-900">
                              {transfer.sourceWarehouse.name} {"->"} {transfer.destinationWarehouse.name}
                            </div>
                            <div className="text-sm text-gray-600">
                              {transfer.totalQuantity} · {transfer.totalAmount}
                            </div>
                          </div>
                          <StatusPill label={t(`inventory.transfers.status.${transfer.status}`)} tone={transferTone(transfer.status)} />
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-4 text-sm text-gray-600">
                <div>
                  {t("inventory.pagination.summary", {
                    from: transfersRangeStart,
                    to: transfersRangeEnd,
                    total: transfersTotal,
                  })}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">
                    {t("inventory.pagination.page", { page: transferPage, totalPages: transfersTotalPages })}
                  </span>
                  <Button variant="secondary" onClick={() => setTransferPage((current) => current - 1)} disabled={transferPage <= 1}>
                    {t("inventory.pagination.previous")}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setTransferPage((current) => current + 1)}
                    disabled={transferPage >= transfersTotalPages}
                  >
                    {t("inventory.pagination.next")}
                  </Button>
                </div>
              </div>
            </Card>

            <Card className="space-y-4">
              {selectedTransfer ? (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="text-xs font-black uppercase tracking-[0.18em] text-gray-500">{selectedTransfer.reference}</div>
                      <h2 className="text-2xl font-black tracking-tight text-gray-900">
                        {selectedTransfer.sourceWarehouse.name} {"->"} {selectedTransfer.destinationWarehouse.name}
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
                      {selectedTransfer.sourceWarehouse.code} · {selectedTransfer.sourceWarehouse.name}
                    </div>
                    <div>
                      <span className="font-semibold text-gray-900">{t("inventory.transfers.field.destinationWarehouse")}:</span>{" "}
                      {selectedTransfer.destinationWarehouse.code} · {selectedTransfer.destinationWarehouse.name}
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
                          {line.item.code} · {line.item.name}
                        </div>
                        <div>
                          {line.quantity} {line.unitOfMeasure} · {line.unitCost} · {line.lineTotalAmount}
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

        <section id="inventory-adjustments-section" className={`space-y-5 ${workspace === "adjustments" ? "" : "hidden"}`}>
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
                        className={`w-full rounded-2xl border px-5 py-4 text-left transition ${isSelected ? "border-emerald-200 bg-emerald-50/60" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
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

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-4 text-sm text-gray-600">
                <div>
                  {t("inventory.pagination.summary", {
                    from: adjustmentsRangeStart,
                    to: adjustmentsRangeEnd,
                    total: adjustmentsTotal,
                  })}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">
                    {t("inventory.pagination.page", { page: adjustmentPage, totalPages: adjustmentsTotalPages })}
                  </span>
                  <Button
                    variant="secondary"
                    onClick={() => setAdjustmentPage((current) => current - 1)}
                    disabled={adjustmentPage <= 1}
                  >
                    {t("inventory.pagination.previous")}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setAdjustmentPage((current) => current + 1)}
                    disabled={adjustmentPage >= adjustmentsTotalPages}
                  >
                    {t("inventory.pagination.next")}
                  </Button>
                </div>
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

        <section id="inventory-warehouses-section" className={`space-y-5 ${workspace === "warehouses" ? "" : "hidden"}`}>
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
                        className={`w-full rounded-2xl border px-5 py-4 text-left transition ${isSelected ? "border-amber-200 bg-amber-50/60" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                          }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <div className="text-xs font-black uppercase tracking-[0.18em] text-gray-500">{warehouse.code}</div>
                            <div className="text-lg font-black tracking-tight text-gray-900">{warehouse.name}</div>
                            <div className="text-sm text-gray-600">
                              {warehouse.isTransit ? t("inventory.warehouses.mode.transit") : t("inventory.warehouses.mode.storage")} ·{" "}
                              {t("inventory.warehouses.itemCount", { count: warehouse.itemCount })}
                              {warehouse.isDefaultTransit ? ` · ${t("inventory.warehouses.badge.defaultTransit")}` : ""}
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

        <section id="inventory-receipts-section" className={`space-y-5 ${workspace === "receipts" ? "" : "hidden"}`}>
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
                        className={`w-full rounded-2xl border px-5 py-4 text-left transition ${isSelected ? "border-sky-200 bg-sky-50/60" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
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

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-4 text-sm text-gray-600">
                <div>
                  {t("inventory.pagination.summary", {
                    from: receiptsRangeStart,
                    to: receiptsRangeEnd,
                    total: receiptsTotal,
                  })}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">
                    {t("inventory.pagination.page", { page: receiptPage, totalPages: receiptsTotalPages })}
                  </span>
                  <Button variant="secondary" onClick={() => setReceiptPage((current) => current - 1)} disabled={receiptPage <= 1}>
                    {t("inventory.pagination.previous")}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setReceiptPage((current) => current + 1)}
                    disabled={receiptPage >= receiptsTotalPages}
                  >
                    {t("inventory.pagination.next")}
                  </Button>
                </div>
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

        <section id="inventory-stock-ledger-section" className={`space-y-6 ${workspace === "stockLedger" ? "" : "hidden"}`}>
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

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-4 text-sm text-gray-600">
              <div>
                {t("inventory.pagination.summary", {
                  from: stockMovementsRangeStart,
                  to: stockMovementsRangeEnd,
                  total: stockMovementsTotal,
                })}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">
                  {t("inventory.pagination.page", { page: stockLedgerPage, totalPages: stockMovementsTotalPages })}
                </span>
                <Button
                  variant="secondary"
                  onClick={() => setStockLedgerPage((current) => current - 1)}
                  disabled={stockLedgerPage <= 1}
                >
                  {t("inventory.pagination.previous")}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setStockLedgerPage((current) => current + 1)}
                  disabled={stockLedgerPage >= stockMovementsTotalPages}
                >
                  {t("inventory.pagination.next")}
                </Button>
              </div>
            </div>
          </Card>
        </section>

        <ItemEditorModal
          isOpen={isItemEditorOpen}
          onClose={closeItemEditor}
          title={itemEditor.id ? t("inventory.editor.editTitle") : t("inventory.editor.createTitle")}
          editor={itemEditor}
          onChange={setItemEditor}
          onSave={submitItemEditor}
          isSaving={createItemMutation.isPending || updateItemMutation.isPending}
          validationError={itemFormError || itemMutationError}
          activeItemGroups={activeItemGroups}
          activeItemCategories={activeItemCategories}
          activeUnitsOfMeasure={activeUnitsOfMeasure}
          activeTaxes={activeTaxes}
          warehouses={warehouses}
          inventoryAccounts={inventoryAccountsQuery.data ?? []}
          salesAccounts={salesAccountsQuery.data ?? []}
          cogsAccounts={cogsAccountsQuery.data ?? []}
          adjustmentAccounts={adjustmentAccountsQuery.data ?? []}
          generateBarcode={() => void generateBarcodeMutation.mutate()}
          isGeneratingBarcode={generateBarcodeMutation.isPending}
          generateQr={generateQrForItemEditor}
          previewCodes={previewItemCodes}
          printLabel={printItemLabel}
          showCodePreview={showItemCodePreview}
          getBarcodePreviewSvg={getBarcodePreviewSvg}
          getQrPreviewSvg={getQrPreviewSvg}
        />
        {/* Old item editor SidePanel removed */}
        <SidePanel
          isOpen={isItemGroupEditorOpen}
          onClose={closeItemGroupEditor}
          title={itemGroupEditor.id ? t("inventory.itemGroups.editor.editTitle") : t("inventory.itemGroups.editor.createTitle")}
        >
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label={t("inventory.itemGroups.field.code")} hint={t("inventory.field.codeHint")}>
                <Input value={itemGroupEditor.code} onChange={(event) => setItemGroupEditor((current) => ({ ...current, code: event.target.value }))} />
              </Field>
              <Field label={t("inventory.itemGroups.field.name")}>
                <Input value={itemGroupEditor.name} onChange={(event) => setItemGroupEditor((current) => ({ ...current, name: event.target.value }))} />
              </Field>
              <Field label={t("inventory.itemGroups.field.parentGroup")}>
                <ItemGroupSelect
                  value={itemGroupEditor.parentGroupId}
                  onChange={(value) => setItemGroupEditor((current) => ({ ...current, parentGroupId: value }))}
                  options={activeItemGroups.filter((group) => group.id !== itemGroupEditor.id)}
                  placeholder={t("inventory.placeholder.selectOptionalItemGroup")}
                />
              </Field>
            </div>
            <Field label={t("inventory.field.description")}>
              <Textarea value={itemGroupEditor.description} rows={3} onChange={(event) => setItemGroupEditor((current) => ({ ...current, description: event.target.value }))} />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label={t("inventory.field.inventoryAccount")}>
                <AccountSelect value={itemGroupEditor.inventoryAccountId} onChange={(value) => setItemGroupEditor((current) => ({ ...current, inventoryAccountId: value }))} options={inventoryAccountsQuery.data ?? []} placeholder={t("inventory.placeholder.selectAccount")} />
              </Field>
              <Field label={t("inventory.field.cogsAccount")}>
                <AccountSelect value={itemGroupEditor.cogsAccountId} onChange={(value) => setItemGroupEditor((current) => ({ ...current, cogsAccountId: value }))} options={cogsAccountsQuery.data ?? []} placeholder={t("inventory.placeholder.selectAccount")} />
              </Field>
              <Field label={t("inventory.field.salesAccount")}>
                <AccountSelect value={itemGroupEditor.salesAccountId} onChange={(value) => setItemGroupEditor((current) => ({ ...current, salesAccountId: value }))} options={salesAccountsQuery.data ?? []} placeholder={t("inventory.placeholder.selectAccount")} />
              </Field>
              <Field label={t("inventory.field.adjustmentAccount")}>
                <AccountSelect value={itemGroupEditor.adjustmentAccountId} onChange={(value) => setItemGroupEditor((current) => ({ ...current, adjustmentAccountId: value }))} options={adjustmentAccountsQuery.data ?? []} placeholder={t("inventory.placeholder.selectAccount")} />
              </Field>
            </div>
            {itemGroupFormError ? <ErrorBox message={itemGroupFormError} /> : null}
            {itemGroupMutationError ? <ErrorBox message={itemGroupMutationError} /> : null}
            <EditorActions
              onCancel={closeItemGroupEditor}
              onSave={() => {
                if (itemGroupFormError) return;
                if (itemGroupEditor.id) void updateItemGroupMutation.mutate();
                else void createItemGroupMutation.mutate();
              }}
              disabled={Boolean(itemGroupFormError) || createItemGroupMutation.isPending || updateItemGroupMutation.isPending}
              label={itemGroupEditor.id ? t("inventory.button.save") : t("inventory.button.createItemGroup")}
              cancelLabel={t("inventory.button.cancel")}
            />
          </div>
        </SidePanel>

        <SidePanel
          isOpen={isItemCategoryEditorOpen}
          onClose={closeItemCategoryEditor}
          title={itemCategoryEditor.id ? t("inventory.itemCategories.editor.editTitle") : t("inventory.itemCategories.editor.createTitle")}
        >
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label={t("inventory.itemCategories.field.code")} hint={t("inventory.field.codeHint")}>
                <Input value={itemCategoryEditor.code} onChange={(event) => setItemCategoryEditor((current) => ({ ...current, code: event.target.value }))} disabled={Boolean(itemCategoryEditor.id)} />
              </Field>
              <Field label={t("inventory.itemCategories.field.name")}>
                <Input value={itemCategoryEditor.name} onChange={(event) => setItemCategoryEditor((current) => ({ ...current, name: event.target.value }))} />
              </Field>
              <Field label={t("inventory.itemCategories.field.itemGroup")}>
                <ItemGroupSelect
                  value={itemCategoryEditor.itemGroupId}
                  onChange={(value) => setItemCategoryEditor((current) => ({ ...current, itemGroupId: value }))}
                  options={activeItemGroups}
                  placeholder={t("inventory.placeholder.selectItemGroup")}
                />
              </Field>
            </div>
            <Field label={t("inventory.field.description")}>
              <Textarea value={itemCategoryEditor.description} rows={3} onChange={(event) => setItemCategoryEditor((current) => ({ ...current, description: event.target.value }))} />
            </Field>
            {itemCategoryFormError ? <ErrorBox message={itemCategoryFormError} /> : null}
            {itemCategoryMutationError ? <ErrorBox message={itemCategoryMutationError} /> : null}
            <EditorActions
              onCancel={closeItemCategoryEditor}
              onSave={() => {
                if (itemCategoryFormError) return;
                if (itemCategoryEditor.id) void updateItemCategoryMutation.mutate();
                else void createItemCategoryMutation.mutate();
              }}
              disabled={Boolean(itemCategoryFormError) || createItemCategoryMutation.isPending || updateItemCategoryMutation.isPending}
              label={itemCategoryEditor.id ? t("inventory.button.save") : t("inventory.button.createItemCategory")}
              cancelLabel={t("inventory.button.cancel")}
            />
          </div>
        </SidePanel>

        <SidePanel
          isOpen={isUnitEditorOpen}
          onClose={closeUnitEditor}
          title={unitEditor.id ? t("inventory.units.editor.editTitle") : t("inventory.units.editor.createTitle")}
        >
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label={t("inventory.units.field.code")} hint={t("inventory.field.codeHint")}>
                <Input value={unitEditor.code} onChange={(event) => setUnitEditor((current) => ({ ...current, code: event.target.value }))} disabled={Boolean(unitEditor.id)} />
              </Field>
              <Field label={t("inventory.units.field.name")}>
                <Input value={unitEditor.name} onChange={(event) => setUnitEditor((current) => ({ ...current, name: event.target.value }))} />
              </Field>
              <Field label={t("inventory.units.field.unitType")}>
                <Input value={unitEditor.unitType} onChange={(event) => setUnitEditor((current) => ({ ...current, unitType: event.target.value }))} />
              </Field>
              <Field label={t("inventory.units.field.decimalPrecision")}>
                <Input value={unitEditor.decimalPrecision} onChange={(event) => setUnitEditor((current) => ({ ...current, decimalPrecision: event.target.value }))} />
              </Field>
            </div>
            <Field label={t("inventory.field.description")}>
              <Textarea value={unitEditor.description} rows={3} onChange={(event) => setUnitEditor((current) => ({ ...current, description: event.target.value }))} />
            </Field>
            {unitFormError ? <ErrorBox message={unitFormError} /> : null}
            {unitMutationError ? <ErrorBox message={unitMutationError} /> : null}
            <EditorActions
              onCancel={closeUnitEditor}
              onSave={() => {
                if (unitFormError) return;
                if (unitEditor.id) void updateUnitMutation.mutate();
                else void createUnitMutation.mutate();
              }}
              disabled={Boolean(unitFormError) || createUnitMutation.isPending || updateUnitMutation.isPending}
              label={unitEditor.id ? t("inventory.button.save") : t("inventory.button.createUnit")}
              cancelLabel={t("inventory.button.cancel")}
            />
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
    setShowItemCodePreview(false);
    setIsItemEditorOpen(true);
  }

  function openEditItem(item: InventoryItem) {
    setItemEditor(mapItemToEditor(item));
    setShowItemCodePreview(Boolean(item.barcode || item.qrCodeValue));
    setIsItemEditorOpen(true);
  }

  function addUnitConversionRow() {
    setItemEditor((current) => ({
      ...current,
      unitConversions: [...current.unitConversions, createUnitConversionEditor()],
    }));
  }

  function updateUnitConversionRow(
    key: string,
    updater: (row: ItemUnitConversionEditorState) => ItemUnitConversionEditorState,
  ) {
    setItemEditor((current) => ({
      ...current,
      unitConversions: current.unitConversions.map((row) =>
        row.key === key ? updater(row) : row,
      ),
    }));
  }

  function removeUnitConversionRow(key: string) {
    setItemEditor((current) => {
      const row = current.unitConversions.find((entry) => entry.key === key);
      if (!row || row.isBaseUnit) {
        return current;
      }

      return {
        ...current,
        unitConversions: current.unitConversions.filter((entry) => entry.key !== key),
      };
    });
  }

  function submitItemEditor(mode: "save" | "saveAndClose") {
    if (itemFormError) {
      return;
    }

    itemSaveModeRef.current = mode;
    if (itemEditor.id) {
      void updateItemMutation.mutate();
      return;
    }
    void createItemMutation.mutate();
  }

  function openNewItemGroup() {
    setItemGroupEditor(createEmptyItemGroupEditor());
    setIsItemGroupEditorOpen(true);
  }

  function openEditItemGroup(group: InventoryItemGroup) {
    setItemGroupEditor(mapItemGroupToEditor(group));
    setIsItemGroupEditorOpen(true);
  }

  function openNewItemCategory() {
    setItemCategoryEditor({
      ...createEmptyItemCategoryEditor(),
      itemGroupId: itemCategoryGroupFilter,
    });
    setIsItemCategoryEditorOpen(true);
  }

  function openEditItemCategory(category: InventoryItemCategory) {
    setItemCategoryEditor(mapItemCategoryToEditor(category));
    setIsItemCategoryEditorOpen(true);
  }

  function openNewUnit() {
    setUnitEditor(createEmptyUnitEditor());
    setIsUnitEditorOpen(true);
  }

  function openEditUnit(unit: InventoryUnitOfMeasure) {
    setUnitEditor(mapUnitToEditor(unit));
    setIsUnitEditorOpen(true);
  }

  function generateQrForItemEditor() {
    const nextCode =
      itemEditor.code.trim() || buildInternalItemCodeCandidate();
    const nextBarcode = itemEditor.barcode.trim();

    const nextQrValue = buildInventoryQrValue({
      code: nextCode,
      name: itemEditor.name,
      barcode: nextBarcode,
      category: itemEditor.category,
      unitOfMeasure: itemEditor.unitOfMeasure,
      itemGroup: itemEditor.type,
    });

    setItemEditor((current) => ({
      ...current,
      code: nextCode,
      qrCodeValue: nextQrValue,
    }));
    setShowItemCodePreview(true);
  }

  function previewItemCodes() {
    setShowItemCodePreview(true);
  }

  function printItemLabel() {
    const barcode = itemEditor.barcode.trim();
    const qrCodeValue = itemEditor.qrCodeValue.trim();
    if (!barcode && !qrCodeValue) {
      setShowItemCodePreview(true);
      return;
    }

    const labelWindow = window.open("", "_blank", "noopener,noreferrer,width=920,height=720");
    if (!labelWindow) {
      return;
    }

    const title = itemEditor.name.trim() || itemEditor.code.trim() || "Item Label";
    const barcodeSvg = barcode ? getBarcodePreviewSvg(barcode) : "";
    const qrSvg = qrCodeValue ? getQrPreviewSvg(qrCodeValue) : "";

    labelWindow.document.write(`<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 24px; color: #111827; }
      .label { border: 1px solid #d1d5db; border-radius: 18px; padding: 24px; }
      .meta { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-bottom: 20px; }
      .meta div { border: 1px solid #e5e7eb; border-radius: 12px; padding: 10px 12px; }
      .title { font-size: 24px; font-weight: 700; margin: 0 0 8px; }
      .row { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; align-items: start; }
      .section { border: 1px solid #e5e7eb; border-radius: 14px; padding: 16px; }
      .label-name { font-size: 14px; font-weight: 700; margin-bottom: 12px; }
      .value { margin-top: 10px; font-size: 13px; word-break: break-all; }
      @media print { body { margin: 0; } .label { border: 0; border-radius: 0; } }
    </style>
  </head>
  <body>
    <div class="label">
      <h1 class="title">${escapeHtml(title)}</h1>
      <div class="meta">
        <div><strong>كود المادة:</strong> ${escapeHtml(itemEditor.code.trim() || "—")}</div>
        <div><strong>وحدة القياس:</strong> ${escapeHtml(itemEditor.unitOfMeasure.trim() || "—")}</div>
        <div><strong>الفئة:</strong> ${escapeHtml(itemEditor.category.trim() || "—")}</div>
        <div><strong>المجموعة:</strong> ${escapeHtml(itemEditor.type)}</div>
      </div>
      <div class="row">
        <div class="section">
          <div class="label-name">الباركود</div>
          ${barcodeSvg || "<div>—</div>"}
          <div class="value">${escapeHtml(barcode || "—")}</div>
        </div>
        <div class="section">
          <div class="label-name">رمز QR</div>
          ${qrSvg || "<div>—</div>"}
          <div class="value">${escapeHtml(qrCodeValue || "—")}</div>
        </div>
      </div>
    </div>
    <script>window.onload = () => window.print();</script>
  </body>
</html>`);
    labelWindow.document.close();
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

  function confirmDeactivateItemGroup(id: string) {
    if (typeof window === "undefined" || window.confirm(t("inventory.itemGroups.confirm.deactivate"))) {
      void deactivateItemGroupMutation.mutate(id);
    }
  }

  function confirmDeactivateItemCategory(id: string) {
    if (typeof window === "undefined" || window.confirm(t("inventory.itemCategories.confirm.deactivate"))) {
      void deactivateItemCategoryMutation.mutate(id);
    }
  }

  function confirmDeactivateUnit(id: string) {
    if (typeof window === "undefined" || window.confirm(t("inventory.units.confirm.deactivate"))) {
      void deactivateUnitMutation.mutate(id);
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
    setShowItemCodePreview(false);
  }

  function closeItemGroupEditor() {
    setIsItemGroupEditorOpen(false);
    setItemGroupEditor(createEmptyItemGroupEditor());
  }

  function closeItemCategoryEditor() {
    setIsItemCategoryEditorOpen(false);
    setItemCategoryEditor(createEmptyItemCategoryEditor());
  }

  function closeUnitEditor() {
    setIsUnitEditorOpen(false);
    setUnitEditor(createEmptyUnitEditor());
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

function PreviewCard({
  label,
  value,
  emptyMessage,
  svg,
}: {
  label: string;
  value?: string | null;
  emptyMessage: string;
  svg?: string | null;
}) {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-4">
      <div className="mb-3 text-sm font-black text-gray-900">{label}</div>
      {svg ? (
        <div
          className="overflow-hidden rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-3"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <EmptyState message={emptyMessage} />
      )}
      <div className="mt-3 break-all text-xs leading-6 text-gray-600">{value || "—"}</div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return <div className="rounded-2xl border border-dashed border-gray-200 px-6 py-10 text-sm text-gray-500">{message}</div>;
}

function ErrorBox({ message }: { message: string }) {
  return <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{message}</div>;
}

type MasterDataRow = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  isActive: boolean;
};

function MasterDataGrid<T extends MasterDataRow>({
  search,
  onSearch,
  status,
  onStatus,
  searchPlaceholder,
  loading,
  empty,
  rows,
  selectedId,
  onSelect,
  renderMeta,
  detail,
  extraFilter,
}: {
  search: string;
  onSearch: (value: string) => void;
  status: "" | "true" | "false";
  onStatus: (value: "" | "true" | "false") => void;
  searchPlaceholder: string;
  loading: boolean;
  empty: string;
  rows: T[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  renderMeta: (row: T) => ReactNode;
  detail: ReactNode;
  extraFilter?: ReactNode;
}) {
  const { t, language } = useTranslation();
  const isArabic = language === "ar";

  return (
    <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
      <Card className="space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row">
          <Input value={search} onChange={(event) => onSearch(event.target.value)} placeholder={searchPlaceholder} />
          <Select value={status} onChange={(event) => onStatus(event.target.value as "" | "true" | "false")}>
            <option value="">{t("inventory.filters.allStatuses")}</option>
            <option value="true">{t("inventory.filters.activeOnly")}</option>
            <option value="false">{t("inventory.filters.inactiveOnly")}</option>
          </Select>
          {extraFilter}
        </div>

        <div className="space-y-3">
          {loading ? (
            <div className="text-sm text-gray-500">{t("inventory.loading")}</div>
          ) : rows.length === 0 ? (
            <EmptyState message={empty} />
          ) : (
            rows.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => onSelect(row.id)}
                className={`w-full rounded-2xl border px-5 py-4 transition ${
                  selectedId === row.id ? "border-teal-200 bg-teal-50/60" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                <div className={`flex items-start gap-4 ${isArabic ? "flex-row-reverse" : "justify-between"}`}>
                  <div className={`flex min-w-0 flex-1 flex-col space-y-1 ${isArabic ? "items-end text-right" : "text-left"}`}>
                    <div className="text-xs font-black uppercase tracking-[0.18em] text-gray-500">{row.code}</div>
                    <div className="text-lg font-black tracking-tight text-gray-900">{row.name}</div>
                    <div className="text-sm text-gray-600">{renderMeta(row)}</div>
                  </div>
                  <div className="shrink-0">
                    <StatusPill
                      label={row.isActive ? t("inventory.status.active") : t("inventory.status.inactive")}
                      tone={row.isActive ? "positive" : "warning"}
                    />
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </Card>
      <Card className="space-y-4">{detail}</Card>
    </div>
  );
}

function MasterDataDetail({
  code,
  name,
  isActive,
  description,
  rows,
  onEdit,
  onDeactivate,
  editLabel,
  deactivateLabel,
  disableActions,
}: {
  code: string;
  name: string;
  isActive: boolean;
  description?: string | null;
  rows: Array<[string, ReactNode]>;
  onEdit: () => void;
  onDeactivate: () => void;
  editLabel: string;
  deactivateLabel: string;
  disableActions: boolean;
}) {
  const { t, language } = useTranslation();
  const isArabic = language === "ar";

  return (
    <>
      <div className={`flex items-start gap-4 ${isArabic ? "flex-row-reverse" : "justify-between"}`}>
        <div className={`flex min-w-0 flex-1 flex-col space-y-1 ${isArabic ? "items-end text-right" : "text-left"}`}>
          <div className="text-xs font-black uppercase tracking-[0.18em] text-gray-500">{code}</div>
          <h2 className="text-2xl font-black tracking-tight text-gray-900">{name}</h2>
        </div>
        <div className="shrink-0">
          <StatusPill label={isActive ? t("inventory.status.active") : t("inventory.status.inactive")} tone={isActive ? "positive" : "warning"} />
        </div>
      </div>
      {description ? <p className={`text-sm leading-7 text-gray-600 ${isArabic ? "text-right" : ""}`}>{description}</p> : null}
      <div className="space-y-2 text-sm leading-7 text-gray-600">
        {rows.map(([label, value]) => (
          <div key={label} className="text-right">
            <span className="font-semibold text-gray-900">{label}:</span> {value}
          </div>
        ))}
      </div>
      <div className={`flex flex-wrap gap-3 pt-2 ${isArabic ? "justify-end" : ""}`}>
        <Button variant="secondary" onClick={onEdit} disabled={disableActions}>
          {editLabel}
        </Button>
        <Button variant="danger" onClick={onDeactivate} disabled={disableActions}>
          {deactivateLabel}
        </Button>
      </div>
    </>
  );
}

function EditorActions({
  onCancel,
  onSave,
  disabled,
  label,
  cancelLabel,
}: {
  onCancel: () => void;
  onSave: () => void;
  disabled: boolean;
  label: string;
  cancelLabel: string;
}) {
  return (
    <div className="flex flex-wrap gap-3">
      <Button variant="secondary" onClick={onCancel}>
        {cancelLabel}
      </Button>
      <Button onClick={onSave} disabled={disabled}>
        {label}
      </Button>
    </div>
  );
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
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  options: InventoryWarehouse[];
  placeholder: string;
  disabled?: boolean;
}) {
  return (
    <Select value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled}>
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

function ItemGroupSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  options: InventoryItemGroup[];
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

function ItemCategorySelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  options: InventoryItemCategory[];
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

function UnitSelect({
  value,
  onChange,
  options,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  options: InventoryUnitOfMeasure[];
  placeholder: string;
  disabled?: boolean;
}) {
  return (
    <Select value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled}>
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
    internalNotes: item.internalNotes ?? "",
    itemImageUrl: item.itemImageUrl ?? "",
    attachmentsText: item.attachmentsText ?? "",
    barcode: item.barcode ?? "",
    qrCodeValue: item.qrCodeValue ?? "",
    unitOfMeasure: item.unitOfMeasure,
    unitOfMeasureId: item.unitOfMeasureRef?.id ?? item.unitOfMeasureId ?? "",
    category: item.category ?? "",
    itemGroupId: item.itemGroup?.id ?? item.itemGroupId ?? "",
    itemCategoryId: item.itemCategory?.id ?? item.itemCategoryId ?? "",
    type: item.type,
    defaultSalesPrice: item.defaultSalesPrice ?? "",
    defaultPurchasePrice: item.defaultPurchasePrice ?? "",
    currencyCode: item.currencyCode ?? "JOD",
    taxable: item.taxable,
    defaultTaxId: item.defaultTaxId ?? "",
    trackInventory: item.trackInventory,
    inventoryAccountId: item.inventoryAccount?.id ?? "",
    cogsAccountId: item.cogsAccount?.id ?? "",
    salesAccountId: item.salesAccount?.id ?? "",
    salesReturnAccountId: item.salesReturnAccount?.id ?? "",
    adjustmentAccountId: item.adjustmentAccount?.id ?? "",
    reorderLevel: item.reorderLevel,
    reorderQuantity: item.reorderQuantity,
    preferredWarehouseId: item.preferredWarehouse?.id ?? item.preferredWarehouseId ?? "",
    unitConversions: item.unitConversions.map(mapUnitConversionToEditor),
  };
}

function mapUnitConversionToEditor(conversion: InventoryItemUnitConversion): ItemUnitConversionEditorState {
  return createUnitConversionEditor({
    key: conversion.id,
    unitId: conversion.unitId,
    conversionFactorToBaseUnit: conversion.conversionFactorToBaseUnit,
    barcode: conversion.barcode ?? "",
    defaultSalesPrice: conversion.defaultSalesPrice ?? "",
    defaultPurchasePrice: conversion.defaultPurchasePrice ?? "",
    isBaseUnit: conversion.isBaseUnit,
  });
}

function ensureBaseUnitConversionRow(
  editor: ItemEditorState,
  units: InventoryUnitOfMeasure[],
): ItemEditorState {
  if (!editor.unitOfMeasureId) {
    return editor.unitConversions.length === 0 ? editor : { ...editor, unitConversions: [] };
  }

  const baseUnit = units.find((row) => row.id === editor.unitOfMeasureId);
  const nextUnitOfMeasure = baseUnit?.code ?? editor.unitOfMeasure;
  const nextRows = editor.unitConversions
    .filter((row, index, current) => current.findIndex((candidate) => candidate.unitId === row.unitId) === index)
    .map((row) =>
      row.unitId === editor.unitOfMeasureId
        ? {
            ...row,
            isBaseUnit: true,
            conversionFactorToBaseUnit: "1",
          }
        : { ...row, isBaseUnit: false },
    );

  const hasBaseRow = nextRows.some((row) => row.unitId === editor.unitOfMeasureId);
  const normalizedRows = hasBaseRow
    ? nextRows
    : [createUnitConversionEditor({ unitId: editor.unitOfMeasureId, conversionFactorToBaseUnit: "1", isBaseUnit: true }), ...nextRows];

  if (
    nextUnitOfMeasure === editor.unitOfMeasure &&
    normalizedRows.length === editor.unitConversions.length &&
    normalizedRows.every((row, index) => {
      const current = editor.unitConversions[index];
      return current
        && current.unitId === row.unitId
        && current.conversionFactorToBaseUnit === row.conversionFactorToBaseUnit
        && current.barcode === row.barcode
        && current.defaultSalesPrice === row.defaultSalesPrice
        && current.defaultPurchasePrice === row.defaultPurchasePrice
        && current.isBaseUnit === row.isBaseUnit;
    })
  ) {
    return editor;
  }

  return {
    ...editor,
    unitOfMeasure: nextUnitOfMeasure,
    unitConversions: normalizedRows,
  };
}

function mapItemGroupToEditor(group: InventoryItemGroup): ItemGroupEditorState {
  return {
    id: group.id,
    code: group.code,
    name: group.name,
    description: group.description ?? "",
    parentGroupId: group.parentGroup?.id ?? group.parentGroupId ?? "",
    inventoryAccountId: group.inventoryAccount?.id ?? "",
    cogsAccountId: group.cogsAccount?.id ?? "",
    salesAccountId: group.salesAccount?.id ?? "",
    adjustmentAccountId: group.adjustmentAccount?.id ?? "",
  };
}

function mapItemCategoryToEditor(category: InventoryItemCategory): ItemCategoryEditorState {
  return {
    id: category.id,
    code: category.code,
    name: category.name,
    description: category.description ?? "",
    itemGroupId: category.itemGroup.id,
  };
}

function mapUnitToEditor(unit: InventoryUnitOfMeasure): UnitEditorState {
  return {
    id: unit.id,
    code: unit.code,
    name: unit.name,
    description: unit.description ?? "",
    unitType: unit.unitType ?? "",
    decimalPrecision: String(unit.decimalPrecision),
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
    internalNotes: editor.internalNotes.trim() || undefined,
    itemImageUrl: editor.itemImageUrl.trim() || undefined,
    attachmentsText: editor.attachmentsText.trim() || undefined,
    barcode: editor.barcode.trim() || undefined,
    qrCodeValue: editor.qrCodeValue.trim() || undefined,
    unitOfMeasure: editor.unitOfMeasure.trim(),
    unitOfMeasureId: editor.unitOfMeasureId,
    category: editor.category.trim() || undefined,
    itemGroupId: editor.itemGroupId,
    itemCategoryId: editor.itemCategoryId,
    type: editor.type,
    defaultSalesPrice: editor.defaultSalesPrice.trim() || undefined,
    defaultPurchasePrice: editor.defaultPurchasePrice.trim() || undefined,
    currencyCode: editor.currencyCode.trim() || undefined,
    taxable: editor.taxable,
    defaultTaxId: editor.taxable ? editor.defaultTaxId || undefined : undefined,
    trackInventory: editor.trackInventory,
    inventoryAccountId: editor.inventoryAccountId || undefined,
    cogsAccountId: editor.cogsAccountId || undefined,
    salesAccountId: editor.salesAccountId || undefined,
    salesReturnAccountId: editor.salesReturnAccountId || undefined,
    adjustmentAccountId: editor.adjustmentAccountId || undefined,
    reorderLevel: editor.reorderLevel.trim() || undefined,
    reorderQuantity: editor.reorderQuantity.trim() || undefined,
    preferredWarehouseId: editor.preferredWarehouseId || undefined,
    unitConversions: editor.unitConversions.map((row) => ({
      unitId: row.unitId,
      conversionFactorToBaseUnit: row.conversionFactorToBaseUnit.trim(),
      barcode: row.barcode.trim() || undefined,
      defaultSalesPrice: row.defaultSalesPrice.trim() || undefined,
      defaultPurchasePrice: row.defaultPurchasePrice.trim() || undefined,
      isBaseUnit: row.isBaseUnit,
    })),
  };
}

function mapItemGroupEditorToPayload(editor: ItemGroupEditorState) {
  return {
    code: editor.id ? undefined : editor.code.trim() || undefined,
    name: editor.name.trim(),
    description: editor.description.trim() || undefined,
    parentGroupId: editor.parentGroupId || undefined,
    inventoryAccountId: editor.inventoryAccountId || undefined,
    cogsAccountId: editor.cogsAccountId || undefined,
    salesAccountId: editor.salesAccountId || undefined,
    adjustmentAccountId: editor.adjustmentAccountId || undefined,
  };
}

function mapItemCategoryEditorToPayload(editor: ItemCategoryEditorState) {
  return {
    code: editor.id ? undefined : editor.code.trim() || undefined,
    name: editor.name.trim(),
    description: editor.description.trim() || undefined,
    itemGroupId: editor.itemGroupId,
  };
}

function mapUnitEditorToPayload(editor: UnitEditorState) {
  return {
    code: editor.id ? undefined : editor.code.trim() || undefined,
    name: editor.name.trim(),
    description: editor.description.trim() || undefined,
    unitType: editor.unitType.trim() || undefined,
    decimalPrecision: Number(editor.decimalPrecision || 0),
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
  if (!editor.name.trim()) return "Material name is required. اسم المادة مطلوب.";
  if (!editor.itemGroupId) return "Item group is required. مجموعة الأصناف مطلوبة.";
  if (!editor.itemCategoryId) return "Item category is required. فئة الصنف / التصنيف مطلوبة.";

  const isService = editor.type === "SERVICE";

  if (!isService) {
    if (!editor.unitOfMeasureId) return "Base unit of measure is required. وحدة القياس الأساسية مطلوبة.";
    if (!editor.unitOfMeasure.trim()) return "Unit of measure is required. وحدة القياس مطلوبة.";
    if (!editor.unitConversions.length) {
      return "Base unit conversion row is required. يجب وجود صف للوحدة الأساسية داخل جدول التحويلات.";
    }
  }

  if (editor.barcode.trim().length > 120) return "Barcode is too long. الباركود طويل جدًا.";
  if (editor.defaultSalesPrice.trim() && Number.isNaN(Number(editor.defaultSalesPrice))) {
    return "Default sales price must be numeric. يجب أن يكون سعر البيع الافتراضي رقمياً.";
  }
  if (editor.defaultPurchasePrice.trim() && Number.isNaN(Number(editor.defaultPurchasePrice))) {
    return "Default purchase price must be numeric. يجب أن يكون سعر الشراء الافتراضي رقمياً.";
  }
  if (editor.taxable && !editor.defaultTaxId) {
    return "Tax category is required when the item is taxable. فئة الضريبة مطلوبة عند تفعيل خاضع للضريبة.";
  }
  if (editor.reorderLevel.trim() && Number.isNaN(Number(editor.reorderLevel))) {
    return "Reorder level must be numeric. يجب أن يكون حد إعادة الطلب رقميا.";
  }
  if (editor.reorderQuantity.trim() && Number.isNaN(Number(editor.reorderQuantity))) {
    return "Reorder quantity must be numeric. يجب أن تكون كمية إعادة الطلب رقمية.";
  }

  const unitIds = new Set<string>();
  let hasBaseUnit = false;

  for (const row of editor.unitConversions) {
    if (!row.unitId) {
      return "Each conversion row must have a unit. يجب اختيار وحدة لكل صف تحويل.";
    }
    if (unitIds.has(row.unitId)) {
      return "Duplicate units are not allowed. لا يمكن تكرار نفس الوحدة أكثر من مرة.";
    }
    unitIds.add(row.unitId);

    const factor = Number(row.conversionFactorToBaseUnit);
    if (!row.conversionFactorToBaseUnit.trim() || Number.isNaN(factor) || factor <= 0) {
      return "Conversion factor must be greater than zero. معامل التحويل إلى الوحدة الأساسية يجب أن يكون أكبر من صفر.";
    }

    if (!isService && row.unitId === editor.unitOfMeasureId) {
      hasBaseUnit = true;
      if (factor !== 1) {
        return "Base unit conversion factor must be 1. يجب أن يكون معامل تحويل الوحدة الأساسية مساوياً لـ 1.";
      }
    }
  }

  if (!isService && !hasBaseUnit && editor.unitOfMeasureId) {
    return "Base unit row must always exist. يجب أن يكون صف الوحدة الأساسية موجوداً دائماً.";
  }

  return null;
}

function getItemGroupFormError(editor: ItemGroupEditorState) {
  if (!editor.name.trim()) return "Item group name is required. اسم مجموعة الأصناف مطلوب.";
  return null;
}

function getItemCategoryFormError(editor: ItemCategoryEditorState) {
  if (!editor.name.trim()) return "Item category name is required. اسم فئة الصنف مطلوب.";
  if (!editor.itemGroupId) return "Item group is required. مجموعة الأصناف مطلوبة.";
  return null;
}

function getUnitFormError(editor: UnitEditorState) {
  if (!editor.name.trim()) return "Unit name is required. اسم وحدة القياس مطلوب.";
  if (editor.decimalPrecision.trim() && (!Number.isInteger(Number(editor.decimalPrecision)) || Number(editor.decimalPrecision) < 0 || Number(editor.decimalPrecision) > 6)) {
    return "Decimal precision must be an integer between 0 and 6. دقة الكسور يجب أن تكون رقماً صحيحاً بين 0 و6.";
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

function buildInternalItemCodeCandidate() {
  const compactDate = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const suffix =
    `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase();
  return `ITEM-${compactDate}-${suffix}`;
}

function formatCodeName(code: string, name: string, isArabic: boolean) {
  return isArabic ? (
    <>
      <span>{name}</span>
      <span>{' · '}</span>
      <bdi dir="ltr">{code}</bdi>
    </>
  ) : (
    <>
      <bdi dir="ltr">{code}</bdi>
      <span>{' · '}</span>
      <span>{name}</span>
    </>
  );
}

function formatCodeNameText(code: string, name: string, isArabic: boolean) {
  return isArabic ? `${name} · ${code}` : `${code} · ${name}`;
}

function buildInventoryQrValue({
  code,
  name,
  barcode,
  category,
  unitOfMeasure,
  itemGroup,
}: {
  code: string;
  name: string;
  barcode: string;
  category: string;
  unitOfMeasure: string;
  itemGroup: string;
}) {
  return JSON.stringify(
    {
      itemCode: code.trim(),
      itemName: name.trim(),
      barcode: barcode.trim(),
      itemGroup: itemGroup.trim(),
      itemCategory: category.trim(),
      unitOfMeasure: unitOfMeasure.trim(),
    },
    null,
    0,
  );
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getBarcodePreviewSvg(value: string) {
  const bits: number[] = [1, 0, 1, 0, 1, 0];

  for (const char of value) {
    const binary = char.charCodeAt(0).toString(2).padStart(8, "0");
    for (const bit of binary) {
      bits.push(bit === "1" ? 1 : 0);
    }
    bits.push(0);
  }

  bits.push(1, 0, 1, 0, 1, 0, 1);

  const barWidth = 2;
  const width = bits.length * barWidth + 24;
  const rects = bits
    .map((bit, index) =>
      bit
        ? `<rect x="${12 + index * barWidth}" y="8" width="${barWidth}" height="68" fill="#111827" />`
        : "",
    )
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} 96" width="100%" height="160" role="img" aria-label="Barcode preview">
  <rect width="${width}" height="96" rx="16" fill="#ffffff" />
  ${rects}
  <text x="${width / 2}" y="90" text-anchor="middle" font-family="monospace" font-size="12" fill="#111827">${escapeHtml(value)}</text>
</svg>`;
}

function getQrPreviewSvg(value: string) {
  const size = 25;
  const cell = 7;
  const margin = 2;
  const matrix = Array.from({ length: size }, () => Array.from({ length: size }, () => false));

  paintFinder(matrix, 0, 0);
  paintFinder(matrix, size - 7, 0);
  paintFinder(matrix, 0, size - 7);

  let state = 2166136261;
  for (const char of value) {
    state ^= char.charCodeAt(0);
    state = Math.imul(state, 16777619);
  }

  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) {
      if (isFinderZone(size, row, column)) {
        continue;
      }
      state ^= row * size + column + 1;
      state = Math.imul(state, 2246822519);
      matrix[row][column] = (state >>> 29) % 2 === 0;
    }
  }

  const viewSize = (size + margin * 2) * cell;
  const rects: string[] = [];
  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) {
      if (!matrix[row][column]) {
        continue;
      }
      rects.push(
        `<rect x="${(column + margin) * cell}" y="${(row + margin) * cell}" width="${cell}" height="${cell}" fill="#111827" />`,
      );
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewSize} ${viewSize}" width="100%" height="220" role="img" aria-label="QR preview">
  <rect width="${viewSize}" height="${viewSize}" rx="16" fill="#ffffff" />
  ${rects.join("")}
</svg>`;
}

function paintFinder(matrix: boolean[][], startColumn: number, startRow: number) {
  for (let row = 0; row < 7; row += 1) {
    for (let column = 0; column < 7; column += 1) {
      const isBorder = row === 0 || row === 6 || column === 0 || column === 6;
      const isCenter = row >= 2 && row <= 4 && column >= 2 && column <= 4;
      matrix[startRow + row][startColumn + column] = isBorder || isCenter;
    }
  }
}

function isFinderZone(size: number, row: number, column: number) {
  const inTopLeft = row < 7 && column < 7;
  const inTopRight = row < 7 && column >= size - 7;
  const inBottomLeft = row >= size - 7 && column < 7;
  return inTopLeft || inTopRight || inBottomLeft;
}
