export const ACCOUNT_TYPES = [
  "ASSET",
  "LIABILITY",
  "EQUITY",
  "REVENUE",
  "EXPENSE",
] as const;

export type AccountType = (typeof ACCOUNT_TYPES)[number];

export type UserRole = "ADMIN" | "MANAGER" | "USER";

export type ApiErrorShape = {
  statusCode?: number;
  message?: string | string[];
  error?: string;
};

export type AuthUser = {
  id: string;
  email: string;
  name?: string | null;
  role: UserRole;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type RegisterPayload = {
  email: string;
  password: string;
  name?: string;
};

export type LoginResponse = {
  access_token: string;
  user: AuthUser;
};

export type RegisterResponse = {
  id: string;
  email: string;
  name?: string | null;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

// ─── Segments ─────────────────────────────────────────────────────────────────

export type SegmentValue = {
  id: string;
  definitionId: string;
  code: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SegmentDefinition = {
  id: string;
  index: number;
  name: string;
  description?: string | null;
  values: SegmentValue[];
  createdAt: string;
  updatedAt: string;
};

export type CreateSegmentValuePayload = {
  code: string;
  name: string;
};

export type UpdateSegmentValuePayload = {
  code?: string;
  name?: string;
  isActive?: boolean;
};

// ─── Account Subtypes (Categories) ─────────────────────────────────────────────

export type AccountSubtype = {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateAccountSubtypePayload = {
  name: string;
};

export type UpdateAccountSubtypePayload = {
  name?: string;
  isActive?: boolean;
};

// ─── Payment Method Types ─────────────────────────────────────────────────────

export type PaymentMethodType = {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TaxType =
  | "SALES"
  | "PURCHASE"
  | "ZERO_RATED"
  | "EXEMPT"
  | "OUT_OF_SCOPE";

export type Tax = {
  id: string;
  taxCode: string;
  taxName: string;
  rate: string;
  taxType: TaxType;
  taxAccountId?: string | null;
  taxAccount?: AccountOption | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TaxTreatment = {
  id: string;
  code: string;
  arabicName: string;
  englishName: string;
  description?: string | null;
  defaultTaxId?: string | null;
  defaultTax?: Tax | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateTaxPayload = {
  taxCode: string;
  taxName: string;
  rate: number;
  taxType: TaxType;
  taxAccountId?: string | null;
  isActive?: boolean;
};

export type UpdateTaxPayload = Partial<CreateTaxPayload>;

export type CreateTaxTreatmentPayload = {
  code: string;
  arabicName: string;
  englishName: string;
  description?: string | null;
  defaultTaxId?: string | null;
  isActive?: boolean;
};

export type UpdateTaxTreatmentPayload = Partial<CreateTaxTreatmentPayload>;

export type DueDateCalculationMethod = "IMMEDIATE" | "DAYS_AFTER" | "END_OF_MONTH" | "MANUAL";

export type PaymentTerm = {
  id: string;
  name: string;
  nameAr?: string | null;
  calculationMethod: DueDateCalculationMethod;
  numberOfDays?: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreatePaymentTermPayload = {
  name: string;
  nameAr?: string;
  calculationMethod: DueDateCalculationMethod;
  numberOfDays?: number;
  isActive?: boolean;
};

export type UpdatePaymentTermPayload = Partial<CreatePaymentTermPayload>;

export type InventoryItemType =
  | "RAW_MATERIAL"
  | "FINISHED_GOOD"
  | "SERVICE"
  | "MANUFACTURED_ITEM";

export type InventoryWarehouse = {
  id: string;
  code: string;
  name: string;
  address?: string | null;
  responsiblePerson?: string | null;
  isTransit: boolean;
  isDefaultTransit?: boolean;
  isActive: boolean;
  status: "ACTIVE" | "INACTIVE";
  itemCount: number;
  createdAt: string;
  updatedAt: string;
};

export type InventoryReceiptStatus =
  | "DRAFT"
  | "POSTED"
  | "CANCELLED"
  | "REVERSED";
export type InventoryIssueStatus =
  | "DRAFT"
  | "POSTED"
  | "CANCELLED"
  | "REVERSED";
export type InventoryTransferStatus =
  | "DRAFT"
  | "POSTED"
  | "CANCELLED"
  | "REVERSED";
export type InventoryAdjustmentStatus =
  | "DRAFT"
  | "POSTED"
  | "CANCELLED"
  | "REVERSED";
export type InventoryStockMovementType =
  | "GOODS_RECEIPT"
  | "GOODS_ISSUE"
  | "TRANSFER_OUT"
  | "TRANSFER_IN"
  | "ADJUSTMENT_IN"
  | "ADJUSTMENT_OUT";

export type InventoryCostingMethod = "WEIGHTED_AVERAGE" | "FIFO";

export type InventoryPolicy = {
  id: string;
  costingMethod: InventoryCostingMethod;
  createdAt: string;
  updatedAt: string;
};

export type UpdateInventoryPolicyPayload = {
  costingMethod: InventoryCostingMethod;
};

export type InventoryItemGroup = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  parentGroupId?: string | null;
  parentGroup?: Pick<InventoryItemGroup, "id" | "code" | "name" | "isActive"> | null;
  isActive: boolean;
  status: "ACTIVE" | "INACTIVE";
  inventoryAccount?: AccountOption | null;
  cogsAccount?: AccountOption | null;
  salesAccount?: AccountOption | null;
  adjustmentAccount?: AccountOption | null;
  categoryCount: number;
  itemCount: number;
  childGroupCount: number;
  createdAt: string;
  updatedAt: string;
};

export type InventoryItemCategory = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  itemGroupId: string;
  itemGroup: Pick<InventoryItemGroup, "id" | "code" | "name" | "isActive">;
  isActive: boolean;
  status: "ACTIVE" | "INACTIVE";
  itemCount: number;
  createdAt: string;
  updatedAt: string;
};

export type InventoryUnitOfMeasure = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  unitType?: string | null;
  decimalPrecision: number;
  isActive: boolean;
  status: "ACTIVE" | "INACTIVE";
  itemCount: number;
  createdAt: string;
  updatedAt: string;
};

export type InventoryItem = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  internalNotes?: string | null;
  itemImageUrl?: string | null;
  attachmentsText?: string | null;
  barcode?: string | null;
  qrCodeValue?: string | null;
  unitOfMeasure: string;
  unitOfMeasureId?: string | null;
  unitOfMeasureRef?: Pick<
    InventoryUnitOfMeasure,
    "id" | "code" | "name" | "decimalPrecision" | "isActive"
  > | null;
  category?: string | null;
  itemGroupId?: string | null;
  itemGroup?: Pick<InventoryItemGroup, "id" | "code" | "name" | "isActive"> | null;
  itemCategoryId?: string | null;
  itemCategory?: Pick<
    InventoryItemCategory,
    "id" | "code" | "name" | "itemGroupId" | "isActive"
  > | null;
  type: InventoryItemType;
  defaultSalesPrice: string;
  defaultPurchasePrice: string;
  currencyCode?: string | null;
  taxable: boolean;
  defaultTaxId?: string | null;
  defaultTax?: Pick<Tax, "id" | "taxCode" | "taxName" | "rate" | "taxType" | "isActive"> | null;
  trackInventory: boolean;
  reorderLevel: string;
  reorderQuantity: string;
  preferredWarehouseId?: string | null;
  preferredWarehouseCode?: string | null;
  preferredWarehouse?: Pick<
    InventoryWarehouse,
    "id" | "code" | "name" | "isActive" | "isTransit"
  > | null;
  onHandQuantity: string;
  valuationAmount: string;
  isActive: boolean;
  status: "ACTIVE" | "INACTIVE";
  inventoryAccount?: {
    id: string;
    code: string;
    name: string;
    type: AccountType;
    currencyCode: string;
    isActive: boolean;
    isPosting: boolean;
  } | null;
  cogsAccount?: {
    id: string;
    code: string;
    name: string;
    type: AccountType;
    currencyCode: string;
    isActive: boolean;
    isPosting: boolean;
  } | null;
  salesAccount?: {
    id: string;
    code: string;
    name: string;
    type: AccountType;
    currencyCode: string;
    isActive: boolean;
    isPosting: boolean;
  } | null;
  salesReturnAccount?: {
    id: string;
    code: string;
    name: string;
    type: AccountType;
    currencyCode: string;
    isActive: boolean;
    isPosting: boolean;
  } | null;
  adjustmentAccount?: {
    id: string;
    code: string;
    name: string;
    type: AccountType;
    currencyCode: string;
    isActive: boolean;
    isPosting: boolean;
  } | null;
  unitConversions: InventoryItemUnitConversion[];
  createdAt: string;
  updatedAt: string;
};

export type InventoryItemUnitConversion = {
  id: string;
  unitId: string;
  unit: Pick<
    InventoryUnitOfMeasure,
    "id" | "code" | "name" | "decimalPrecision" | "isActive"
  >;
  conversionFactorToBaseUnit: string;
  barcode?: string | null;
  defaultSalesPrice: string;
  defaultPurchasePrice: string;
  isBaseUnit: boolean;
};

export type InventoryItemsQuery = {
  isActive?: "true" | "false" | "";
  search?: string;
  type?: InventoryItemType | "";
  itemGroupId?: string;
  itemCategoryId?: string;
  page?: number;
  limit?: number;
};

export type InventoryMasterDataQuery = {
  isActive?: "true" | "false" | "";
  search?: string;
};

export type InventoryItemCategoriesQuery = InventoryMasterDataQuery & {
  itemGroupId?: string;
};

export type InventoryItemsResponse = {
  data: InventoryItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type InventoryWarehousesQuery = {
  isActive?: "true" | "false" | "";
  isTransit?: "true" | "false" | "";
  search?: string;
};

export type InventoryGoodsReceiptsQuery = {
  status?: InventoryReceiptStatus | "";
  warehouseId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  limit?: number;
};

export type InventoryGoodsIssuesQuery = {
  status?: InventoryIssueStatus | "";
  warehouseId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  limit?: number;
};

export type InventoryTransfersQuery = {
  status?: InventoryTransferStatus | "";
  sourceWarehouseId?: string;
  destinationWarehouseId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  limit?: number;
};

export type InventoryAdjustmentsQuery = {
  status?: InventoryAdjustmentStatus | "";
  warehouseId?: string;
  reason?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  limit?: number;
};

export type InventoryStockLedgerQuery = {
  itemId?: string;
  warehouseId?: string;
  movementType?: InventoryStockMovementType | "";
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  limit?: number;
};

export type CreateInventoryItemPayload = {
  code?: string;
  name: string;
  description?: string;
  internalNotes?: string;
  itemImageUrl?: string;
  attachmentsText?: string;
  barcode?: string;
  qrCodeValue?: string;
  unitOfMeasure?: string;
  unitOfMeasureId: string;
  category?: string;
  itemGroupId: string;
  itemCategoryId: string;
  type: InventoryItemType;
  inventoryAccountId?: string;
  cogsAccountId?: string;
  salesAccountId?: string;
  salesReturnAccountId?: string;
  adjustmentAccountId?: string;
  defaultSalesPrice?: string;
  defaultPurchasePrice?: string;
  currencyCode?: string;
  taxable?: boolean;
  defaultTaxId?: string;
  trackInventory?: boolean;
  reorderLevel?: string;
  reorderQuantity?: string;
  preferredWarehouseId?: string;
  unitConversions?: InventoryItemUnitConversionPayload[];
};

export type InventoryItemUnitConversionPayload = {
  unitId: string;
  conversionFactorToBaseUnit: string;
  barcode?: string;
  defaultSalesPrice?: string;
  defaultPurchasePrice?: string;
  isBaseUnit?: boolean;
};

export type CreateInventoryItemGroupPayload = {
  code?: string;
  name: string;
  description?: string;
  parentGroupId?: string;
  inventoryAccountId?: string;
  cogsAccountId?: string;
  salesAccountId?: string;
  adjustmentAccountId?: string;
};

export type UpdateInventoryItemGroupPayload = Partial<CreateInventoryItemGroupPayload> & {
  isActive?: boolean;
};

export type CreateInventoryItemCategoryPayload = {
  code?: string;
  name: string;
  description?: string;
  itemGroupId: string;
};

export type UpdateInventoryItemCategoryPayload = Partial<CreateInventoryItemCategoryPayload> & {
  isActive?: boolean;
};

export type CreateInventoryUnitOfMeasurePayload = {
  code?: string;
  name: string;
  description?: string;
  unitType?: string;
  decimalPrecision?: number;
};

export type UpdateInventoryUnitOfMeasurePayload = Partial<CreateInventoryUnitOfMeasurePayload> & {
  isActive?: boolean;
};

export type UpdateInventoryItemPayload = Partial<CreateInventoryItemPayload> & {
  isActive?: boolean;
};

export type GenerateInventoryBarcodeResponse = {
  barcode: string;
};

export type CreateInventoryWarehousePayload = {
  code?: string;
  name: string;
  address?: string;
  responsiblePerson?: string;
  isTransit?: boolean;
  isDefaultTransit?: boolean;
};

export type UpdateInventoryWarehousePayload =
  Partial<CreateInventoryWarehousePayload> & {
    isActive?: boolean;
  };

export type InventoryGoodsReceiptLine = {
  id: string;
  lineNumber: number;
  quantity: string;
  unitCost: string;
  unitOfMeasure: string;
  description?: string | null;
  lineTotalAmount: string;
  item: {
    id: string;
    code: string;
    name: string;
    unitOfMeasure: string;
    type: InventoryItemType;
    isActive: boolean;
  };
};

export type InventoryGoodsReceipt = {
  id: string;
  reference: string;
  status: InventoryReceiptStatus;
  receiptDate: string;
  sourcePurchaseOrderRef?: string | null;
  sourcePurchaseInvoiceRef?: string | null;
  description?: string | null;
  totalQuantity: string;
  totalAmount: string;
  postedAt?: string | null;
  canEdit: boolean;
  canPost: boolean;
  canCancel: boolean;
  canReverse?: boolean;
  warehouse: Pick<
    InventoryWarehouse,
    "id" | "code" | "name" | "isActive" | "isTransit"
  >;
  lines: InventoryGoodsReceiptLine[];
  createdAt: string;
  updatedAt: string;
};

export type InventoryGoodsReceiptsResponse = {
  data: InventoryGoodsReceipt[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type InventoryGoodsIssueLine = {
  id: string;
  lineNumber: number;
  quantity: string;
  unitCost: string;
  unitOfMeasure: string;
  description?: string | null;
  lineTotalAmount: string;
  item: {
    id: string;
    code: string;
    name: string;
    unitOfMeasure: string;
    type: InventoryItemType;
    isActive: boolean;
    onHandQuantity: string;
    valuationAmount: string;
  };
};

export type InventoryGoodsIssue = {
  id: string;
  reference: string;
  status: InventoryIssueStatus;
  issueDate: string;
  sourceSalesOrderRef?: string | null;
  sourceSalesInvoiceRef?: string | null;
  sourceProductionRequestRef?: string | null;
  sourceInternalRequestRef?: string | null;
  description?: string | null;
  totalQuantity: string;
  totalAmount: string;
  postedAt?: string | null;
  canEdit: boolean;
  canPost: boolean;
  canCancel: boolean;
  canReverse?: boolean;
  warehouse: Pick<
    InventoryWarehouse,
    "id" | "code" | "name" | "isActive" | "isTransit"
  >;
  lines: InventoryGoodsIssueLine[];
  createdAt: string;
  updatedAt: string;
};

export type InventoryGoodsIssuesResponse = {
  data: InventoryGoodsIssue[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type InventoryTransferLine = {
  id: string;
  lineNumber: number;
  quantity: string;
  unitCost: string;
  unitOfMeasure: string;
  description?: string | null;
  lineTotalAmount: string;
  item: {
    id: string;
    code: string;
    name: string;
    unitOfMeasure: string;
    type: InventoryItemType;
    isActive: boolean;
    onHandQuantity: string;
    valuationAmount: string;
  };
};

export type InventoryTransfer = {
  id: string;
  reference: string;
  status: InventoryTransferStatus;
  transferDate: string;
  description?: string | null;
  totalQuantity: string;
  totalAmount: string;
  postedAt?: string | null;
  canEdit: boolean;
  canPost: boolean;
  canCancel: boolean;
  canReverse?: boolean;
  sourceWarehouse: Pick<
    InventoryWarehouse,
    "id" | "code" | "name" | "isActive" | "isTransit"
  >;
  destinationWarehouse: Pick<
    InventoryWarehouse,
    "id" | "code" | "name" | "isActive" | "isTransit"
  >;
  lines: InventoryTransferLine[];
  createdAt: string;
  updatedAt: string;
};

export type InventoryTransfersResponse = {
  data: InventoryTransfer[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type InventoryAdjustmentLine = {
  id: string;
  lineNumber: number;
  systemQuantity: string;
  countedQuantity: string;
  varianceQuantity: string;
  unitCost: string;
  unitOfMeasure: string;
  description?: string | null;
  lineTotalAmount: string;
  item: {
    id: string;
    code: string;
    name: string;
    unitOfMeasure: string;
    type: InventoryItemType;
    isActive: boolean;
    onHandQuantity: string;
    valuationAmount: string;
  };
};

export type InventoryAdjustment = {
  id: string;
  reference: string;
  status: InventoryAdjustmentStatus;
  adjustmentDate: string;
  reason: string;
  description?: string | null;
  totalVarianceQuantity: string;
  totalAmount: string;
  postedAt?: string | null;
  canEdit: boolean;
  canPost: boolean;
  canCancel: boolean;
  canReverse?: boolean;
  warehouse: Pick<
    InventoryWarehouse,
    "id" | "code" | "name" | "isActive" | "isTransit"
  >;
  lines: InventoryAdjustmentLine[];
  createdAt: string;
  updatedAt: string;
};

export type InventoryAdjustmentsResponse = {
  data: InventoryAdjustment[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type InventoryStockMovement = {
  id: string;
  movementType: InventoryStockMovementType;
  transactionType: string;
  transactionId: string;
  transactionLineId?: string | null;
  transactionReference: string;
  transactionDate: string;
  quantityIn: string;
  quantityOut: string;
  unitCost: string;
  valueIn: string;
  valueOut: string;
  runningQuantity: string;
  runningValuation: string;
  description?: string | null;
  item: Pick<InventoryItem, "id" | "code" | "name" | "unitOfMeasure">;
  warehouse: Pick<InventoryWarehouse, "id" | "code" | "name">;
  createdAt: string;
};

export type InventoryStockLedgerResponse = {
  data: InventoryStockMovement[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type InventoryGoodsReceiptLinePayload = {
  itemId: string;
  quantity: string;
  unitCost: string;
  unitOfMeasure: string;
  description?: string;
};

export type CreateInventoryGoodsReceiptPayload = {
  reference?: string;
  receiptDate: string;
  warehouseId: string;
  sourcePurchaseOrderRef?: string;
  sourcePurchaseInvoiceRef?: string;
  description?: string;
  lines: InventoryGoodsReceiptLinePayload[];
};

export type UpdateInventoryGoodsReceiptPayload =
  Partial<CreateInventoryGoodsReceiptPayload>;

export type InventoryGoodsIssueLinePayload = {
  itemId: string;
  quantity: string;
  unitOfMeasure: string;
  description?: string;
};

export type CreateInventoryGoodsIssuePayload = {
  reference?: string;
  issueDate: string;
  warehouseId: string;
  sourceSalesOrderRef?: string;
  sourceSalesInvoiceRef?: string;
  sourceProductionRequestRef?: string;
  sourceInternalRequestRef?: string;
  description?: string;
  lines: InventoryGoodsIssueLinePayload[];
};

export type UpdateInventoryGoodsIssuePayload =
  Partial<CreateInventoryGoodsIssuePayload>;

export type InventoryTransferLinePayload = {
  itemId: string;
  quantity: string;
  unitOfMeasure: string;
  description?: string;
};

export type CreateInventoryTransferPayload = {
  reference?: string;
  transferDate: string;
  sourceWarehouseId: string;
  destinationWarehouseId: string;
  description?: string;
  lines: InventoryTransferLinePayload[];
};

export type UpdateInventoryTransferPayload =
  Partial<CreateInventoryTransferPayload>;

export type InventoryAdjustmentLinePayload = {
  itemId: string;
  systemQuantity: string;
  countedQuantity: string;
  unitOfMeasure: string;
  description?: string;
};

export type CreateInventoryAdjustmentPayload = {
  reference?: string;
  adjustmentDate: string;
  warehouseId: string;
  reason: string;
  description?: string;
  lines: InventoryAdjustmentLinePayload[];
};

export type UpdateInventoryAdjustmentPayload =
  Partial<CreateInventoryAdjustmentPayload>;

export type EmployeeStatus = "ACTIVE" | "INACTIVE";
export type EmployeePaymentMethod = "BANK" | "CASH" | "OTHER";
export type PayrollComponentType =
  | "EARNING"
  | "DEDUCTION"
  | "EMPLOYER_CONTRIBUTION"
  | "BENEFIT";
export type PayrollCalculationMethod =
  | "FIXED_AMOUNT"
  | "PERCENTAGE"
  | "QUANTITY"
  | "FORMULA";
export type PayrollPeriodStatus = "DRAFT" | "POSTED" | "CLOSED" | "REVERSED";
export type PayslipStatus =
  | "DRAFT"
  | "POSTED"
  | "PARTIALLY_PAID"
  | "PAID"
  | "CANCELLED"
  | "REVERSED";
export type PayrollPaymentStatus =
  | "DRAFT"
  | "POSTED"
  | "CANCELLED"
  | "REVERSED";
export type PayrollRuleType =
  | "TAX"
  | "INSURANCE"
  | "LOAN"
  | "STATUTORY_DEDUCTION"
  | "OTHER";

export type FixedAssetStatus = "ACTIVE" | "INACTIVE" | "DISPOSED" | "RETIRED";
export type FixedAssetDepreciationMethod = "STRAIGHT_LINE" | "DECLINING_BALANCE";
export type FixedAssetTransactionStatus = "DRAFT" | "POSTED" | "CANCELLED" | "REVERSED";
export type FixedAssetDisposalMethod = "SALE" | "WRITE_OFF" | "SCRAP" | "OTHER";

export type FixedAssetCategory = {
  id: string;
  code: string;
  name: string;
  nameAr?: string | null;
  description?: string | null;
  isActive: boolean;
  assetAccount: AccountOption;
  accumulatedDepreciationAccount: AccountOption;
  depreciationExpenseAccount: AccountOption;
  disposalGainAccount?: AccountOption | null;
  disposalLossAccount?: AccountOption | null;
  assetCount: number;
  createdAt: string;
  updatedAt: string;
};

export type FixedAsset = {
  id: string;
  code: string;
  name: string;
  categoryId: string;
  category?: FixedAssetCategory | null;
  acquisitionDate: string;
  depreciationStartDate: string;
  usefulLifeMonths: number;
  depreciationMethod: FixedAssetDepreciationMethod;
  residualValue: string;
  acquisitionCost: string;
  accumulatedDepreciation: string;
  bookValue: string;
  status: FixedAssetStatus;
  department?: string | null;
  costCenter?: string | null;
  employee?: string | null;
  location?: string | null;
  branch?: string | null;
  acquisitions: Array<{ id: string; reference: string; status: FixedAssetTransactionStatus; totalCost: string; postedAt?: string | null }>;
  depreciationHistory: Array<{ id: string; reference?: string | null; amount: string; periodEnd?: string | null }>;
  depreciationSchedule: Array<{ periodStart: string; amount: string; projectedAccumulated: string; projectedBookValue: string }>;
  disposals: Array<{ id: string; reference: string; status: FixedAssetTransactionStatus; gainLossAmount: string }>;
  transfers: Array<{ id: string; reference: string; status: FixedAssetTransactionStatus; toLocation?: string | null; toDepartment?: string | null }>;
  auditHistory?: Array<{ id: string; entity: string; entityId?: string | null; action: string; details?: unknown; createdAt: string }>;
  createdAt: string;
  updatedAt: string;
};

export type FixedAssetAcquisition = {
  id: string;
  reference: string;
  status: FixedAssetTransactionStatus;
  asset: FixedAsset;
  acquisitionDate: string;
  acquisitionCost: string;
  capitalizedCost: string;
  totalCost: string;
  supplierReference?: string | null;
  purchaseInvoiceReference?: string | null;
  paymentReference?: string | null;
  clearingAccount: AccountOption;
  description?: string | null;
  journalEntryId?: string | null;
  journalReference?: string | null;
  postedAt?: string | null;
  reversedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type FixedAssetDepreciationLine = {
  id: string;
  asset: FixedAsset;
  depreciationAmount: string;
  accumulatedBefore: string;
  accumulatedAfter: string;
  bookValueBefore: string;
  bookValueAfter: string;
};

export type FixedAssetDepreciationRun = {
  id: string;
  reference: string;
  status: FixedAssetTransactionStatus;
  periodStart: string;
  periodEnd: string;
  scope: string;
  categoryId?: string | null;
  assetId?: string | null;
  description?: string | null;
  totalAmount: string;
  journalEntryId?: string | null;
  journalReference?: string | null;
  postedAt?: string | null;
  reversedAt?: string | null;
  lines: FixedAssetDepreciationLine[];
  createdAt: string;
  updatedAt: string;
};

export type FixedAssetDisposal = {
  id: string;
  reference: string;
  status: FixedAssetTransactionStatus;
  asset: FixedAsset;
  disposalDate: string;
  method: FixedAssetDisposalMethod;
  proceedsAmount: string;
  disposalExpense: string;
  bookValueAtDisposal: string;
  gainLossAmount: string;
  proceedsAccount?: AccountOption | null;
  disposalExpenseAccount?: AccountOption | null;
  description?: string | null;
  journalEntryId?: string | null;
  journalReference?: string | null;
  postedAt?: string | null;
  reversedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type FixedAssetTransfer = {
  id: string;
  reference: string;
  status: FixedAssetTransactionStatus;
  asset: FixedAsset;
  transferDate: string;
  fromDepartment?: string | null;
  toDepartment?: string | null;
  fromCostCenter?: string | null;
  toCostCenter?: string | null;
  fromEmployee?: string | null;
  toEmployee?: string | null;
  fromLocation?: string | null;
  toLocation?: string | null;
  fromBranch?: string | null;
  toBranch?: string | null;
  reason?: string | null;
  postedAt?: string | null;
  reversedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type FixedAssetSummary = {
  assetCount: number;
  activeAssetCount: number;
  acquisitionCost: string;
  accumulatedDepreciation: string;
  bookValue: string;
  postedAcquisitions: number;
  postedDepreciationRuns: number;
  postedDisposals: number;
  postedTransfers: number;
};

export type CreateFixedAssetCategoryPayload = {
  code?: string;
  name: string;
  nameAr?: string;
  description?: string;
  assetAccountId: string;
  accumulatedDepreciationAccountId: string;
  depreciationExpenseAccountId: string;
  disposalGainAccountId?: string;
  disposalLossAccountId?: string;
};

export type UpdateFixedAssetCategoryPayload = Partial<CreateFixedAssetCategoryPayload> & {
  isActive?: boolean;
};

export type CreateFixedAssetPayload = {
  code?: string;
  name: string;
  categoryId: string;
  acquisitionDate: string;
  depreciationStartDate: string;
  usefulLifeMonths: number;
  depreciationMethod: FixedAssetDepreciationMethod;
  residualValue?: number;
  department?: string;
  costCenter?: string;
  employee?: string;
  location?: string;
  branch?: string;
};

export type UpdateFixedAssetPayload = Partial<CreateFixedAssetPayload> & {
  status?: FixedAssetStatus;
};

export type CreateFixedAssetAcquisitionPayload = {
  reference?: string;
  assetId: string;
  acquisitionDate: string;
  acquisitionCost: number;
  capitalizedCost?: number;
  supplierReference?: string;
  purchaseInvoiceReference?: string;
  paymentReference?: string;
  clearingAccountId: string;
  description?: string;
};

export type CreateFixedAssetDepreciationRunPayload = {
  reference?: string;
  periodStart: string;
  periodEnd: string;
  categoryId?: string;
  assetId?: string;
  description?: string;
};

export type CreateFixedAssetDisposalPayload = {
  reference?: string;
  assetId: string;
  disposalDate: string;
  method: FixedAssetDisposalMethod;
  proceedsAmount?: number;
  disposalExpense?: number;
  proceedsAccountId?: string;
  disposalExpenseAccountId?: string;
  description?: string;
};

export type CreateFixedAssetTransferPayload = {
  reference?: string;
  assetId: string;
  transferDate: string;
  toDepartment?: string;
  toCostCenter?: string;
  toEmployee?: string;
  toLocation?: string;
  toBranch?: string;
  reason?: string;
};

export type PayrollComponent = {
  id: string;
  code: string;
  name: string;
  nameAr?: string | null;
  type: PayrollComponentType;
  calculationMethod: PayrollCalculationMethod;
  defaultAmount: string;
  defaultPercentage: string;
  formula?: string | null;
  taxable: boolean;
  isActive: boolean;
  expenseAccount?: AccountOption | null;
  liabilityAccount?: AccountOption | null;
};

export type EmployeePayrollComponent = {
  id: string;
  payrollComponentId: string;
  payrollComponent?: PayrollComponent | null;
  amount: string;
  percentage: string;
  quantity: string;
  installmentAmount?: string | null;
  isRecurring: boolean;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  outstandingBalance?: string | null;
};

export type PayrollGroup = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  employeesCount: number;
  periodsCount: number;
  rulesCount: number;
  components: EmployeePayrollComponent[];
  createdAt: string;
  updatedAt: string;
};

export type PayrollRule = {
  id: string;
  code: string;
  name: string;
  ruleType: PayrollRuleType;
  payrollComponentId: string;
  payrollComponent?: PayrollComponent | null;
  payrollGroupId?: string | null;
  payrollGroup?: PayrollGroup | null;
  calculationMethod: PayrollCalculationMethod;
  amount: string;
  percentage: string;
  formula?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PayrollEmployee = {
  id: string;
  code: string;
  name: string;
  department?: string | null;
  position?: string | null;
  joiningDate: string;
  paymentMethod: EmployeePaymentMethod;
  status: EmployeeStatus;
  defaultSalaryStructure?: string | null;
  bankAccountNumber?: string | null;
  payrollGroup?: string | null;
  payrollGroupId?: string | null;
  payrollGroupRecord?: PayrollGroup | null;
  currentBalance: string;
  components: EmployeePayrollComponent[];
  createdAt: string;
  updatedAt: string;
};

export type PayslipLine = {
  id: string;
  lineNumber: number;
  payrollComponentId?: string | null;
  componentCode: string;
  componentName: string;
  componentType: PayrollComponentType;
  calculationMethod: PayrollCalculationMethod;
  quantity: string;
  rate: string;
  amount: string;
  accountId?: string | null;
  liabilityAccountId?: string | null;
  description?: string | null;
};

export type Payslip = {
  id: string;
  reference: string;
  status: PayslipStatus;
  payrollPeriod?: Pick<PayrollPeriod, "id" | "reference" | "name" | "status">;
  employee?: PayrollEmployee | null;
  grossPay: string;
  totalDeductions: string;
  employerContributions: string;
  netPay: string;
  paidAmount: string;
  outstandingAmount: string;
  notes?: string | null;
  lines: PayslipLine[];
  postedAt?: string | null;
  paidAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PayrollPeriod = {
  id: string;
  reference: string;
  name: string;
  payrollGroup?: string | null;
  payrollGroupId?: string | null;
  payrollGroupRecord?: PayrollGroup | null;
  cycle: string;
  startDate: string;
  endDate: string;
  paymentDate: string;
  status: PayrollPeriodStatus;
  payrollPayableAccount: AccountOption;
  journalEntryId?: string | null;
  journalReference?: string | null;
  grossPay: string;
  totalDeductions: string;
  employerContributions: string;
  netPay: string;
  payslipCount: number;
  payslips: Payslip[];
  postedAt?: string | null;
  closedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PayrollPayment = {
  id: string;
  reference: string;
  status: PayrollPaymentStatus;
  paymentDate: string;
  payrollPeriod: Pick<PayrollPeriod, "id" | "reference" | "name" | "status">;
  employee?: PayrollEmployee | null;
  bankCashAccount: BankCashAccount;
  amount: string;
  allocatedAmount: string;
  unappliedAmount: string;
  description?: string | null;
  bankCashTransaction?: Pick<BankCashTransaction, "id" | "reference" | "status" | "postedAt"> | null;
  allocations: Array<{
    id: string;
    payslipId: string;
    payslipReference?: string;
    employeeName?: string;
    amount: string;
    allocatedAt: string;
  }>;
  postedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PayrollSummary = {
  grossPay: string;
  totalDeductions: string;
  employerContributions: string;
  netPay: string;
  paidAmount: string;
  outstandingAmount: string;
  payslipCount: number;
  componentTotals: Array<{ name: string; type: string; amount: string }>;
  rows: Payslip[];
};

export type CreatePayrollEmployeePayload = {
  code?: string;
  name: string;
  department?: string;
  position?: string;
  joiningDate: string;
  paymentMethod: EmployeePaymentMethod;
  defaultSalaryStructure?: string;
  bankAccountNumber?: string;
  payrollGroup?: string;
  payrollGroupId?: string;
};

export type UpdatePayrollEmployeePayload = Partial<CreatePayrollEmployeePayload> & {
  status?: EmployeeStatus;
};

export type CreatePayrollComponentPayload = {
  code?: string;
  name: string;
  nameAr?: string;
  type: PayrollComponentType;
  calculationMethod: PayrollCalculationMethod;
  defaultAmount?: number;
  defaultPercentage?: number;
  formula?: string;
  taxable?: boolean;
  expenseAccountId?: string;
  liabilityAccountId?: string;
};

export type UpdatePayrollComponentPayload =
  Partial<CreatePayrollComponentPayload> & { isActive?: boolean };

export type AssignEmployeeComponentPayload = {
  payrollComponentId: string;
  amount?: number;
  percentage?: number;
  quantity?: number;
  installmentAmount?: number;
  isRecurring?: boolean;
  effectiveFrom?: string;
  effectiveTo?: string;
  outstandingBalance?: number;
};

export type CreatePayrollGroupPayload = {
  code?: string;
  name: string;
  description?: string;
};

export type UpdatePayrollGroupPayload = Partial<CreatePayrollGroupPayload> & {
  isActive?: boolean;
};

export type AssignPayrollGroupComponentPayload = AssignEmployeeComponentPayload;

export type CreatePayrollRulePayload = {
  code?: string;
  name: string;
  ruleType: PayrollRuleType;
  payrollComponentId: string;
  payrollGroupId?: string;
  calculationMethod: PayrollCalculationMethod;
  amount?: number;
  percentage?: number;
  formula?: string;
};

export type UpdatePayrollRulePayload = Partial<CreatePayrollRulePayload> & {
  isActive?: boolean;
};

export type CreatePayrollPeriodPayload = {
  reference?: string;
  name: string;
  payrollGroup?: string;
  payrollGroupId?: string;
  cycle?: string;
  startDate: string;
  endDate: string;
  paymentDate: string;
  payrollPayableAccountId: string;
};

export type UpdatePayrollPeriodPayload = Partial<CreatePayrollPeriodPayload>;

export type CreatePayrollPaymentPayload = {
  reference?: string;
  paymentDate: string;
  payrollPeriodId: string;
  employeeId?: string;
  bankCashAccountId: string;
  amount: number;
  description?: string;
  allocations?: Array<{ payslipId: string; amount: number }>;
};

export type UpdatePayrollPaymentPayload =
  Partial<Omit<CreatePayrollPaymentPayload, "payrollPeriodId" | "reference">>;

export type AdjustPayslipPayload = {
  description?: string;
  lines: Array<{
    payrollComponentId?: string;
    componentCode: string;
    componentName: string;
    componentType: PayrollComponentType;
    calculationMethod: PayrollCalculationMethod;
    quantity?: number;
    rate?: number;
    amount: number;
    accountId?: string;
    liabilityAccountId?: string;
    description?: string;
  }>;
};

export type CreatePaymentMethodTypePayload = {
  name: string;
};

export type UpdatePaymentMethodTypePayload = {
  name?: string;
  isActive?: boolean;
};

// ─── Journal Entry Types ───────────────────────────────────────────────────────

export type JournalEntryType = {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateJournalEntryTypePayload = {
  name: string;
};

export type UpdateJournalEntryTypePayload = {
  name?: string;
  isActive?: boolean;
};

// ─── Fiscal ───────────────────────────────────────────────────────────────────

export type PeriodStatus = "OPEN" | "CLOSED" | "LOCKED";

export type FiscalPeriod = {
  id: string;
  fiscalYearId: string;
  fiscalYear?: FiscalYear;
  periodNumber: number;
  name: string;
  startDate: string;
  endDate: string;
  status: PeriodStatus;
};

export type FiscalYear = {
  id: string;
  year: number;
  startDate: string;
  endDate: string;
  status: PeriodStatus;
  periods: FiscalPeriod[];
};

// ─── Payment Methods ─────────────────────────────────────────────────────

export type BankCashAccountType = string;

export type BankCashAccount = {
  id: string;
  type: BankCashAccountType;
  name: string;
  bankName?: string | null;
  accountNumber?: string | null;
  currencyCode: string;
  isActive: boolean;
  status: "ACTIVE" | "INACTIVE";
  currentBalance: string;
  account: {
    id: string;
    code: string;
    name: string;
    nameAr?: string | null;
    type?: AccountType;
    currencyCode: string;
    isActive?: boolean;
    isPosting?: boolean;
  };
  createdAt?: string;
  updatedAt?: string;
};

export type BankCashAccountsQuery = {
  type?: BankCashAccountType | "";
  isActive?: "true" | "false" | "";
  search?: string;
};

export type BankCashTransactionKind = "RECEIPT" | "PAYMENT" | "TRANSFER";
export type BankCashTransactionStatus = "DRAFT" | "POSTED";

export type BankCashTransaction = {
  id: string;
  kind: BankCashTransactionKind;
  status: BankCashTransactionStatus;
  reference: string;
  transactionDate: string;
  amount: string;
  description?: string | null;
  counterpartyName?: string | null;
  bankCashAccount?: {
    id: string;
    type: string;
    name: string;
    currencyCode: string;
    isActive: boolean;
    account: {
      id: string;
      code: string;
      name: string;
      nameAr?: string | null;
      currencyCode: string;
    };
  } | null;
  sourceBankCashAccount?: {
    id: string;
    type: string;
    name: string;
    currencyCode: string;
    isActive: boolean;
    account: {
      id: string;
      code: string;
      name: string;
      nameAr?: string | null;
      currencyCode: string;
    };
  } | null;
  destinationBankCashAccount?: {
    id: string;
    type: string;
    name: string;
    currencyCode: string;
    isActive: boolean;
    account: {
      id: string;
      code: string;
      name: string;
      nameAr?: string | null;
      currencyCode: string;
    };
  } | null;
  counterAccount?: {
    id: string;
    code: string;
    name: string;
    nameAr?: string | null;
    currencyCode: string;
  } | null;
  journalEntryId?: string | null;
  journalReference?: string | null;
  postedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BankCashTransactionsQuery = {
  kind?: BankCashTransactionKind | "";
  status?: BankCashTransactionStatus | "";
  bankCashAccountId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
};

export type BankReconciliationStatus = "DRAFT" | "COMPLETED";
export type BankStatementLineStatus = "UNMATCHED" | "MATCHED" | "RECONCILED";

export type BankReconciliationListItem = {
  id: string;
  status: BankReconciliationStatus;
  statementDate: string;
  statementEndingBalance: string;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  bankCashAccount: {
    id: string;
    type: string;
    name: string;
    currencyCode: string;
    isActive: boolean;
    account: {
      id: string;
      code: string;
      name: string;
      currencyCode: string;
    };
  };
  summary: {
    statementLineCount: number;
    unmatchedStatementLineCount: number;
    matchedCount: number;
    reconciledCount: number;
  };
};

export type BankReconciliationLedgerTransaction = {
  id: string;
  reference: string;
  entryDate: string;
  postedAt: string;
  description?: string | null;
  debitAmount: string;
  creditAmount: string;
  journalEntryId: string;
  journalReference: string;
};

export type BankReconciliationMatch = {
  id: string;
  isReconciled: boolean;
  matchedAt: string;
  reconciledAt?: string | null;
  ledgerTransaction: BankReconciliationLedgerTransaction;
};

export type BankStatementLine = {
  id: string;
  transactionDate: string;
  reference?: string | null;
  description?: string | null;
  debitAmount: string;
  creditAmount: string;
  status: BankStatementLineStatus;
  createdAt: string;
  updatedAt: string;
  matches: BankReconciliationMatch[];
};

export type BankReconciliation = {
  id: string;
  status: BankReconciliationStatus;
  statementDate: string;
  statementEndingBalance: string;
  notes?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  bankCashAccount: {
    id: string;
    type: string;
    name: string;
    currencyCode: string;
    isActive: boolean;
    currentBalance?: string | null;
    account: {
      id: string;
      code: string;
      name: string;
      currencyCode: string;
    };
  };
  statementLines: BankStatementLine[];
  unmatchedSystemTransactions: BankReconciliationLedgerTransaction[];
  summary: {
    statementLineCount: number;
    unmatchedStatementLineCount: number;
    matchedStatementLineCount: number;
    reconciledStatementLineCount: number;
    matchedCount: number;
    reconciledCount: number;
    statementNetAmount: string;
    systemBalance: string;
    statementEndingBalance: string;
    balanceDifference: string;
  };
};

export type BankReconciliationsQuery = {
  bankCashAccountId?: string;
  status?: BankReconciliationStatus | "";
  dateFrom?: string;
  dateTo?: string;
};

export type CreateBankReconciliationPayload = {
  bankCashAccountId: string;
  statementDate: string;
  statementEndingBalance: number;
  notes?: string;
};

export type CreateBankStatementLinePayload = {
  transactionDate: string;
  reference?: string;
  description?: string;
  debitAmount: number;
  creditAmount: number;
};

export type ImportBankStatementLinesPayload = {
  lines: CreateBankStatementLinePayload[];
};

export type CreateBankReconciliationMatchPayload = {
  statementLineId: string;
  ledgerTransactionId: string;
};

export type CreateReceiptPayload = {
  reference?: string;
  transactionDate: string;
  amount: number;
  bankCashAccountId: string;
  counterAccountId: string;
  counterpartyName?: string;
  description?: string;
};

export type CreatePaymentPayload = CreateReceiptPayload;

export type CreateTransferPayload = {
  reference?: string;
  transactionDate: string;
  amount: number;
  sourceBankCashAccountId: string;
  destinationBankCashAccountId: string;
  description?: string;
};

export type UpdateBankCashTransactionPayload = Partial<{
  reference: string;
  transactionDate: string;
  amount: number;
  bankCashAccountId: string;
  sourceBankCashAccountId: string;
  destinationBankCashAccountId: string;
  counterAccountId: string;
  counterpartyName: string | null;
  description: string | null;
}>;

export type QuotationStatus =
  | "DRAFT"
  | "APPROVED"
  | "EXPIRED"
  | "CONVERTED"
  | "CANCELLED";
export type SalesOrderStatus =
  | "DRAFT"
  | "CONFIRMED"
  | "PARTIALLY_INVOICED"
  | "FULLY_INVOICED"
  | "CANCELLED";
export type SalesInvoiceStatus =
  | "DRAFT"
  | "POSTED"
  | "PARTIALLY_PAID"
  | "FULLY_PAID"
  | "OVERDUE"
  | "CANCELLED";
export type CreditNoteStatus = "DRAFT" | "POSTED" | "APPLIED" | "CANCELLED";
export type AllocationStatus = "UNALLOCATED" | "PARTIAL" | "FULLY_ALLOCATED";
export type SalesRepStatus = "ACTIVE" | "INACTIVE";

export type SalesRepresentative = {
  id: string;
  code: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  defaultCommissionRate: string;
  employeeReceivableAccountId?: string | null;
  employeeReceivableAccount?: AccountOption | null;
  status: SalesRepStatus;
  _count?: { customers: number };
  createdAt: string;
  updatedAt: string;
};

export type Customer = {
  id: string;
  code: string;
  name: string;
  contactInfo?: string | null;
  taxInfo?: string | null;
  taxTreatmentId: string;
  taxTreatment: TaxTreatment | null;
  salesRepresentative?: string | null;
  salesRepId?: string | null;
  salesRep?: {
    id: string;
    code: string;
    name: string;
    status: SalesRepStatus;
  } | null;
  paymentTerms?: string | null;
  creditLimit: string;
  currentBalance: string;
  isActive: boolean;
  receivableAccount: {
    id: string;
    code: string;
    name: string;
    type: AccountType;
    currencyCode: string;
    isActive: boolean;
    isPosting: boolean;
  };
  createdAt: string;
  updatedAt: string;
};

export type Supplier = {
  id: string;
  code: string;
  name: string;
  contactInfo?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  paymentTermId?: string | null;
  paymentTerm?: PaymentTerm | null;
  taxInfo?: string | null;
  defaultCurrency: string;
  currentBalance: string;
  isActive: boolean;
  status: "ACTIVE" | "INACTIVE";
  payableAccount: {
    id: string;
    code: string;
    name: string;
    type: AccountType;
    currencyCode: string;
    isActive: boolean;
    isPosting: boolean;
  };
  createdAt: string;
  updatedAt: string;
};

export type SuppliersQuery = {
  isActive?: "true" | "false" | "";
  search?: string;
};

export type CreateSupplierPayload = {
  code?: string;
  name: string;
  contactInfo?: string;
  phone?: string;
  email?: string;
  address?: string;
  paymentTermId?: string;
  taxInfo?: string;
  defaultCurrency: string;
  payableAccountId: string;
};

export type UpdateSupplierPayload = Partial<CreateSupplierPayload>;

export type SupplierBalance = {
  supplierId: string;
  supplierCode: string;
  supplierName: string;
  currentBalance: string;
  outstandingBalance: string;
};

export type SupplierTransaction = {
  type: string;
  id: string;
  reference: string;
  date: string;
  amount: string;
  status: string;
};

export type SupplierTransactionsResponse = {
  supplierId: string;
  supplierCode: string;
  supplierName: string;
  transactions: SupplierTransaction[];
};

export type PurchaseRequestStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "APPROVED"
  | "REJECTED"
  | "CLOSED";
export type PurchaseOrderStatus =
  | "DRAFT"
  | "ISSUED"
  | "PARTIALLY_RECEIVED"
  | "FULLY_RECEIVED"
  | "CANCELLED"
  | "CLOSED";
export type PurchaseReceiptStatus = "DRAFT" | "POSTED" | "CANCELLED";
export type PurchaseInvoiceStatus =
  | "DRAFT"
  | "POSTED"
  | "PARTIALLY_PAID"
  | "FULLY_PAID"
  | "CANCELLED"
  | "REVERSED";
export type SupplierPaymentStatus =
  | "DRAFT"
  | "POSTED"
  | "CANCELLED"
  | "REVERSED";
export type DebitNoteStatus =
  | "DRAFT"
  | "POSTED"
  | "APPLIED"
  | "CANCELLED"
  | "REVERSED";

export type PurchaseRequestLine = {
  id: string;
  lineNumber: number;
  itemId?: string | null;
  itemName?: string | null;
  description: string;
  quantity: string;
  requestedDeliveryDate?: string | null;
  justification?: string | null;
};

export type PurchaseRequestStatusHistoryEntry = {
  id: string;
  status: PurchaseRequestStatus;
  note?: string | null;
  changedAt: string;
};

export type PurchaseRequestLinkedOrder = {
  id: string;
  reference: string;
  status: PurchaseOrderStatus;
  orderDate: string;
  supplier: {
    id: string;
    code: string;
    name: string;
  };
};

export type PurchaseRequest = {
  id: string;
  reference: string;
  status: PurchaseRequestStatus;
  requestDate: string;
  description?: string | null;
  canEdit: boolean;
  canSubmit: boolean;
  canApprove: boolean;
  canReject: boolean;
  canClose: boolean;
  canConvertToOrder: boolean;
  lines: PurchaseRequestLine[];
  statusHistory: PurchaseRequestStatusHistoryEntry[];
  linkedPurchaseOrders: PurchaseRequestLinkedOrder[];
  createdAt: string;
  updatedAt: string;
};

export type PurchaseRequestsQuery = {
  status?: PurchaseRequestStatus | "";
  search?: string;
  dateFrom?: string;
  dateTo?: string;
};

export type PurchaseRequestLinePayload = {
  itemId?: string;
  itemName?: string;
  description: string;
  quantity: number;
  requestedDeliveryDate?: string;
  justification?: string;
};

export type CreatePurchaseRequestPayload = {
  requestDate: string;
  description?: string;
  lines: PurchaseRequestLinePayload[];
};

export type UpdatePurchaseRequestPayload =
  Partial<CreatePurchaseRequestPayload>;

export type PurchaseRequestStatusNotePayload = {
  note?: string;
};

export type ConvertPurchaseRequestToOrderPayload = {
  supplierId: string;
  orderDate: string;
  currencyCode?: string;
  description?: string;
};

export type PurchaseRequestConversionResult = {
  purchaseRequest: PurchaseRequest;
  purchaseOrder: {
    id: string;
    reference: string;
    status: PurchaseOrderStatus;
    orderDate: string;
    currencyCode: string;
    supplier: {
      id: string;
      code: string;
      name: string;
    };
  };
};

export type PurchaseOrderLine = {
  id: string;
  lineNumber: number;
  itemId?: string | null;
  itemName?: string | null;
  description: string;
  quantity: string;
  receivedQuantity: string;
  unitPrice: string;
  taxId?: string | null;
  taxAmount: string;
  lineTotalAmount: string;
  requestedDeliveryDate?: string | null;
};

export type PurchaseReceiptLine = {
  id: string;
  lineNumber: number;
  purchaseOrderLineId: string;
  purchaseOrderLineNumber: number;
  itemName?: string | null;
  description: string;
  quantityReceived: string;
};

export type PurchaseReceipt = {
  id: string;
  reference: string;
  status: PurchaseReceiptStatus;
  receiptDate: string;
  description?: string | null;
  totalQuantity: string;
  postedAt?: string | null;
  canEdit: boolean;
  canPost: boolean;
  canCancel: boolean;
  canReverse: boolean;
  supplier: {
    id: string;
    code: string;
    name: string;
  };
  purchaseOrder: {
    id: string;
    reference: string;
    status: PurchaseOrderStatus;
    orderDate: string;
  };
  lines: PurchaseReceiptLine[];
  createdAt: string;
  updatedAt: string;
};

export type PurchaseOrder = {
  id: string;
  reference: string;
  status: PurchaseOrderStatus;
  orderDate: string;
  currencyCode: string;
  description?: string | null;
  subtotalAmount: string;
  taxAmount: string;
  totalAmount: string;
  canEdit: boolean;
  canIssue: boolean;
  canReceive: boolean;
  canCancel: boolean;
  canMarkPartiallyReceived: boolean;
  canMarkFullyReceived: boolean;
  canClose: boolean;
  supplier: {
    id: string;
    code: string;
    name: string;
    defaultCurrency: string;
    isActive: boolean;
  };
  sourcePurchaseRequest?: {
    id: string;
    reference: string;
    status: PurchaseRequestStatus;
  } | null;
  lines: PurchaseOrderLine[];
  receipts: Array<{
    id: string;
    reference: string;
    status: PurchaseReceiptStatus;
    receiptDate: string;
    totalQuantity: string;
    postedAt?: string | null;
  }>;
  createdAt: string;
  updatedAt: string;
};

export type PurchaseOrdersQuery = {
  status?: PurchaseOrderStatus | "";
  supplierId?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
};

export type PurchaseOrderLinePayload = {
  itemId?: string;
  itemName?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxId?: string;
  taxAmount: number;
  requestedDeliveryDate?: string;
};

export type CreatePurchaseOrderPayload = {
  orderDate: string;
  supplierId: string;
  currencyCode?: string;
  description?: string;
  lines: PurchaseOrderLinePayload[];
};

export type UpdatePurchaseOrderPayload = Partial<CreatePurchaseOrderPayload>;

export type PurchaseReceiptLinePayload = {
  purchaseOrderLineId: string;
  quantityReceived: number;
};

export type CreatePurchaseReceiptPayload = {
  reference?: string;
  receiptDate: string;
  purchaseOrderId: string;
  description?: string;
  lines: PurchaseReceiptLinePayload[];
};

export type UpdatePurchaseReceiptPayload =
  Partial<CreatePurchaseReceiptPayload>;

export type PurchaseInvoiceLine = {
  id: string;
  lineNumber: number;
  itemId?: string | null;
  item?: Pick<InventoryItem, "id" | "code" | "name" | "unitOfMeasure"> | null;
  itemName?: string | null;
  description: string;
  quantity: string;
  unitPrice: string;
  discountAmount: string;
  taxId?: string | null;
  taxAmount: string;
  lineSubtotalAmount: string;
  lineTotalAmount: string;
  account: {
    id: string;
    code: string;
    name: string;
    type: AccountType;
    currencyCode: string;
    isActive: boolean;
    isPosting: boolean;
  };
};

export type PurchaseInvoice = {
  id: string;
  reference: string;
  status: PurchaseInvoiceStatus;
  invoiceDate: string;
  currencyCode: string;
  description?: string | null;
  subtotalAmount: string;
  discountAmount: string;
  taxAmount: string;
  totalAmount: string;
  allocatedAmount: string;
  outstandingAmount: string;
  allocationStatus: AllocationStatus;
  canEdit: boolean;
  canPost?: boolean;
  canReverse: boolean;
  journalEntryId?: string | null;
  journalReference?: string | null;
  postedAt?: string | null;
  supplier: {
    id: string;
    code: string;
    name: string;
    defaultCurrency: string;
    isActive: boolean;
  };
  sourcePurchaseOrder?: {
    id: string;
    reference: string;
    status: PurchaseOrderStatus;
    orderDate: string;
  } | null;
  lines: PurchaseInvoiceLine[];
  createdAt: string;
  updatedAt: string;
};

export type PurchaseInvoicesQuery = {
  status?: PurchaseInvoiceStatus | "";
  supplierId?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
};

export type PurchaseInvoiceLinePayload = {
  itemId?: string;
  itemName?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  taxId?: string;
  taxAmount: number;
  accountId: string;
};

export type CreatePurchaseInvoicePayload = {
  reference?: string;
  invoiceDate: string;
  supplierId: string;
  currencyCode?: string;
  description?: string;
  sourcePurchaseOrderId?: string;
  lines: PurchaseInvoiceLinePayload[];
};

export type UpdatePurchaseInvoicePayload =
  Partial<CreatePurchaseInvoicePayload>;

export type SupplierPaymentAllocation = {
  id: string;
  amount: string;
  purchaseInvoice: {
    id: string;
    reference: string;
    status: PurchaseInvoiceStatus;
    invoiceDate: string;
    totalAmount: string;
    allocatedAmount: string;
    outstandingAmount: string;
  };
};

export type SupplierPayment = {
  id: string;
  reference: string;
  status: SupplierPaymentStatus;
  paymentDate: string;
  amount: string;
  allocatedAmount: string;
  unappliedAmount: string;
  description?: string | null;
  canEdit: boolean;
  canPost: boolean;
  canCancel: boolean;
  canReverse: boolean;
  supplier: {
    id: string;
    code: string;
    name: string;
    defaultCurrency: string;
    isActive: boolean;
  };
  bankCashAccount: {
    id: string;
    name: string;
    type: string;
    currencyCode: string;
    account: {
      id: string;
      code: string;
      name: string;
      currencyCode: string;
    };
  };
  bankCashTransaction?: {
    id: string;
    reference: string;
    status: BankCashTransactionStatus;
    transactionDate: string;
    postedAt?: string | null;
  } | null;
  allocations: SupplierPaymentAllocation[];
  postedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SupplierPaymentsQuery = {
  status?: SupplierPaymentStatus | "";
  supplierId?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
};

export type SupplierPaymentAllocationPayload = {
  purchaseInvoiceId: string;
  amount: number;
};

export type CreateSupplierPaymentPayload = {
  reference?: string;
  paymentDate: string;
  supplierId: string;
  amount: number;
  bankCashAccountId: string;
  description?: string;
  allocations?: SupplierPaymentAllocationPayload[];
};

export type UpdateSupplierPaymentPayload =
  Partial<CreateSupplierPaymentPayload>;

export type DebitNoteLine = {
  id: string;
  lineNumber: number;
  quantity: string;
  amount: string;
  taxId?: string | null;
  taxAmount: string;
  reason: string;
  lineTotalAmount: string;
};

export type DebitNote = {
  id: string;
  reference: string;
  status: DebitNoteStatus;
  noteDate: string;
  currencyCode: string;
  description?: string | null;
  subtotalAmount: string;
  taxAmount: string;
  totalAmount: string;
  journalEntryId?: string | null;
  journalReference?: string | null;
  postedAt?: string | null;
  canEdit: boolean;
  canPost: boolean;
  canCancel: boolean;
  canReverse: boolean;
  supplier: {
    id: string;
    code: string;
    name: string;
    defaultCurrency: string;
    isActive: boolean;
  };
  purchaseInvoice?: {
    id: string;
    reference: string;
    status: PurchaseInvoiceStatus;
    invoiceDate: string;
    totalAmount: string;
    allocatedAmount: string;
    outstandingAmount: string;
  } | null;
  lines: DebitNoteLine[];
  createdAt: string;
  updatedAt: string;
};

export type DebitNotesQuery = {
  status?: DebitNoteStatus | "";
  supplierId?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
};

export type DebitNoteLinePayload = {
  quantity: number;
  amount: number;
  taxId?: string;
  taxAmount: number;
  reason: string;
};

export type CreateDebitNotePayload = {
  reference?: string;
  noteDate: string;
  supplierId: string;
  purchaseInvoiceId?: string;
  currencyCode?: string;
  description?: string;
  lines: DebitNoteLinePayload[];
};

export type UpdateDebitNotePayload = Partial<CreateDebitNotePayload>;

export type SalesLine = {
  id: string;
  lineNumber: number;
  itemId?: string | null;
  itemName?: string | null;
  item?: Pick<
    InventoryItem,
    "id" | "code" | "name" | "description" | "type" | "isActive" | "salesAccount"
  > | null;
  description?: string | null;
  quantity: string;
  unitPrice: string;
  discountAmount: string;
  taxId?: string | null;
  taxAmount: string;
  lineSubtotalAmount: string;
  lineAmount: string;
  revenueAccount: {
    id: string;
    code: string;
    name: string;
    type: AccountType;
    currencyCode: string;
    isActive: boolean;
    isPosting: boolean;
  } | null;
};

export type SalesQuotation = {
  id: string;
  reference: string;
  status: QuotationStatus;
  quotationDate: string;
  validityDate: string;
  currencyCode: string;
  description?: string | null;
  subtotalAmount: string;
  discountAmount: string;
  taxAmount: string;
  totalAmount: string;
  convertedAt?: string | null;
  customer: {
    id: string;
    code: string;
    name: string;
    isActive: boolean;
    paymentTerms?: string | null;
    creditLimit: string;
    currentBalance: string;
    receivableAccount: Customer["receivableAccount"];
    taxTreatment: Customer["taxTreatment"];
  };
  lines: SalesLine[];
  createdAt: string;
  updatedAt: string;
};

export type SalesOrder = {
  id: string;
  reference: string;
  status: SalesOrderStatus;
  orderDate: string;
  promisedDate?: string | null;
  currencyCode: string;
  shippingDetails?: string | null;
  description?: string | null;
  subtotalAmount: string;
  discountAmount: string;
  taxAmount: string;
  totalAmount: string;
  sourceQuotation?: { id: string; reference: string } | null;
  customer: SalesQuotation["customer"];
  salesInvoices: Array<{
    id: string;
    reference: string;
    totalAmount: string;
    status: SalesInvoiceStatus;
  }>;
  lines: SalesLine[];
  createdAt: string;
  updatedAt: string;
};

export type SalesInvoice = {
  id: string;
  reference: string;
  status: SalesInvoiceStatus;
  invoiceDate: string;
  dueDate?: string | null;
  currencyCode: string;
  description?: string | null;
  subtotalAmount: string;
  discountAmount: string;
  taxAmount: string;
  totalAmount: string;
  allocatedAmount: string;
  outstandingAmount: string;
  allocationStatus: AllocationStatus;
  postedAt?: string | null;
  journalEntryId?: string | null;
  journalReference?: string | null;
  sourceQuotation?: { id: string; reference: string } | null;
  sourceSalesOrder?: { id: string; reference: string } | null;
  customer: {
    id: string;
    code: string;
    name: string;
    isActive: boolean;
    paymentTerms?: string | null;
    creditLimit: string;
    currentBalance: string;
    receivableAccount: Customer["receivableAccount"];
    taxTreatment: Customer["taxTreatment"];
  };
  lines: SalesLine[];
  createdAt: string;
  updatedAt: string;
};

export type CreditNote = {
  id: string;
  reference: string;
  status: CreditNoteStatus;
  noteDate: string;
  currencyCode: string;
  description?: string | null;
  subtotalAmount: string;
  discountAmount: string;
  taxAmount: string;
  totalAmount: string;
  postedAt?: string | null;
  journalEntryId?: string | null;
  journalReference?: string | null;
  linkedInvoice?: { id: string; reference: string } | null;
  customer: SalesInvoice["customer"];
  lines: SalesLine[];
  createdAt: string;
  updatedAt: string;
};

export type CustomerBalance = {
  customerId: string;
  customerCode: string;
  customerName: string;
  currentBalance: string;
  outstandingBalance: string;
  creditLimit: string;
  availableCredit: string;
};

export type CustomerTransaction =
  | {
      type: "INVOICE";
      id: string;
      reference: string;
      date: string;
      amount: string;
      allocatedAmount: string;
      outstandingAmount: string;
      description?: string | null;
    }
  | {
      type: "CREDIT_NOTE";
      id: string;
      reference: string;
      date: string;
      amount: string;
      linkedInvoiceId?: string | null;
      description?: string | null;
    }
  | {
      type: "RECEIPT";
      id: string;
      reference: string;
      date: string;
      amount: string;
      description?: string | null;
    }
  | {
      type: "RECEIPT_ALLOCATION";
      id: string;
      reference: string;
      date: string;
      amount: string;
      salesInvoiceId: string;
      salesInvoiceReference: string;
    };

export type ReceiptAllocationResult = {
  allocation: {
    id: string;
    salesInvoiceId: string;
    receiptTransactionId: string;
    amount: string;
    allocatedAt: string;
  };
  invoice: {
    id: string;
    reference: string;
    totalAmount: string;
    allocatedAmount: string;
    outstandingAmount: string;
    allocationStatus: AllocationStatus;
    status: SalesInvoiceStatus;
  };
};

export type CustomerReceipt = {
  id: string;
  reference: string;
  status: BankCashTransactionStatus;
  receiptDate: string;
  amount: string;
  allocatedAmount: string;
  unappliedAmount: string;
  settlementReference?: string | null;
  journalEntryId?: string | null;
  journalReference?: string | null;
  postedAt?: string | null;
  customer?: { id: string; code: string; name: string } | null;
  bankCashAccount?: {
    id: string;
    name: string;
    type: BankCashAccountType;
    currencyCode: string;
    account: Customer["receivableAccount"];
  } | null;
};

export type AgingReportRow = {
  customerId: string;
  customerCode: string;
  customerName: string;
  current: string;
  bucket31To60: string;
  bucket61To90: string;
  over90: string;
  total: string;
};

export type AgingReport = {
  asOfDate: string;
  rows: AgingReportRow[];
  totals: Omit<AgingReportRow, "customerId" | "customerCode" | "customerName">;
};

export type CustomersQuery = {
  isActive?: "true" | "false" | "";
  search?: string;
  salesRepId?: string;
};

export type SalesRepresentativesQuery = {
  status?: string;
  search?: string;
};

export type SalesDocumentsQuery = {
  status?: string;
  customerId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
};

export type CreateCustomerPayload = {
  code?: string;
  name: string;
  contactInfo?: string;
  taxTreatmentId: string;
  salesRepresentative?: string;
  salesRepId?: string;
  paymentTerms?: string;
  creditLimit: number;
  receivableAccountLinkMode: "AUTO" | "EXISTING";
  receivableAccountId?: string;
};

export type UpdateCustomerPayload = Partial<{
  name: string;
  contactInfo: string;
  taxTreatmentId: string;
  salesRepresentative: string;
  salesRepId: string;
  paymentTerms: string;
  creditLimit: number;
  isActive: boolean;
  receivableAccountId: string;
}>;

export type CreateSalesRepresentativePayload = {
  code?: string;
  name: string;
  phone?: string;
  email?: string;
  defaultCommissionRate?: number;
  employeeReceivableAccountId?: string;
  employeeReceivableAccountLinkMode?: "NONE" | "AUTO" | "EXISTING";
  status: SalesRepStatus;
};

export type UpdateSalesRepresentativePayload = Partial<CreateSalesRepresentativePayload>;

export type SalesLinePayload = {
  itemId?: string;
  itemName?: string;
  quantity?: number;
  unitPrice?: number;
  discountAmount?: number;
  taxId?: string;
  taxAmount?: number;
  lineAmount?: number;
  description?: string;
  revenueAccountId?: string;
};

export type CreateSalesQuotationPayload = {
  reference?: string;
  quotationDate: string;
  validityDate: string;
  customerId: string;
  currencyCode?: string;
  description?: string;
  lines: SalesLinePayload[];
};

export type UpdateSalesQuotationPayload = Partial<CreateSalesQuotationPayload>;

export type CreateSalesOrderPayload = {
  reference?: string;
  orderDate: string;
  promisedDate?: string;
  customerId: string;
  currencyCode?: string;
  sourceQuotationId?: string;
  shippingDetails?: string;
  description?: string;
  lines: SalesLinePayload[];
};

export type UpdateSalesOrderPayload = Partial<CreateSalesOrderPayload>;

export type CreateSalesInvoicePayload = {
  reference?: string;
  invoiceDate: string;
  dueDate?: string;
  customerId: string;
  currencyCode?: string;
  sourceQuotationId?: string;
  sourceSalesOrderId?: string;
  description?: string;
  lines: SalesLinePayload[];
};

export type UpdateSalesInvoicePayload = Partial<CreateSalesInvoicePayload>;

export type CreateCreditNotePayload = {
  reference?: string;
  noteDate: string;
  customerId: string;
  currencyCode?: string;
  salesInvoiceId?: string;
  description?: string;
  lines: SalesLinePayload[];
};

export type UpdateCreditNotePayload = Partial<CreateCreditNotePayload>;

export type AllocateReceiptPayload = {
  salesInvoiceId: string;
  receiptTransactionId: string;
  amount: number;
};

export type CreateCustomerReceiptPayload = {
  reference?: string;
  receiptDate: string;
  customerId: string;
  amount: number;
  bankCashAccountId: string;
  settlementReference?: string;
  description?: string;
};

export type CreateBankCashAccountPayload = {
  type: BankCashAccountType;
  name: string;
  bankName?: string;
  accountNumber?: string;
  currencyCode: string;
  accountId: string;
  openingBalance?: number;
  openingBalanceOffsetAccountId?: string;
};

export type UpdateBankCashAccountPayload =
  Partial<CreateBankCashAccountPayload>;

export type LinkedBankCashAccountCreationMode =
  | "create_parent_and_child"
  | "create_child_under_existing_parent";

export type CreateLinkedBankCashAccountPayload = {
  mode: LinkedBankCashAccountCreationMode;
  currencyCode: string;
  childName: string;
  childNameAr?: string;
  parentName?: string;
  parentNameAr?: string;
  existingParentAccountId?: string;
};

export type CreateLinkedBankCashAccountResponse = {
  postingAccount: AccountOption;
  parentAccount: Pick<Account, "id" | "code" | "name" | "currencyCode">;
};

export type BankCashAccountTransaction = {
  id: string;
  reference: string;
  journalEntryId: string;
  journalEntryLineId: string;
  entryDate: string;
  postedAt: string;
  description?: string | null;
  debitAmount: string;
  creditAmount: string;
  transactionType: string;
  journalReference: string;
};

export type BankCashAccountTransactionsResponse = {
  bankCashAccount: BankCashAccount;
  transactions: BankCashAccountTransaction[];
};

// ─── Accounts ─────────────────────────────────────────────────────────────────

export type Account = {
  id: string;
  code: string;
  name: string;
  nameAr?: string | null;
  description?: string | null;
  type: AccountType;
  subtype?: string | null;
  isPosting: boolean;
  allowManualPosting: boolean;

  // Enterprise Segments (Relational)
  segment1ValueId?: string | null;
  segment1Value?: SegmentValue | null;
  segment2ValueId?: string | null;
  segment2Value?: SegmentValue | null;
  segment3ValueId?: string | null;
  segment3Value?: SegmentValue | null;
  segment4ValueId?: string | null;
  segment4Value?: SegmentValue | null;
  segment5ValueId?: string | null;
  segment5Value?: SegmentValue | null;

  // Legacy/String Segments
  segment1?: string | null;
  segment2?: string | null;
  segment3?: string | null;
  segment4?: string | null;
  segment5?: string | null;

  currencyCode: string;
  isActive: boolean;
  currentBalance: string;
  parentAccountId?: string | null;
  parentAccount?: Account | null;
  ancestors?: Array<{
    id: string;
    name: string;
    nameAr?: string | null;
    code: string;
    parentAccountId: string | null;
  }>;
  createdAt: string;
  updatedAt: string;
};

export type AccountOption = Pick<
  Account,
  | "id"
  | "code"
  | "name"
  | "nameAr"
  | "type"
  | "subtype"
  | "isPosting"
  | "isActive"
  | "currentBalance"
  | "currencyCode"
  | "segment3"
  | "segment4"
  | "segment5"
>;

export type AccountTableRow = Pick<
  Account,
  | "id"
  | "code"
  | "name"
  | "nameAr"
  | "type"
  | "isPosting"
  | "isActive"
  | "currentBalance"
  | "parentAccountId"
> & {
  canDelete: boolean;
  parentAccount?: { id: string; name: string; nameAr?: string | null } | null;
};

export type AccountTreeNode = Account & {
  children: AccountTreeNode[];
};

export type AccountsQuery = {
  type?: AccountType | "";
  isActive?: "true" | "false" | "";
  isPosting?: "true" | "false" | "";
  search?: string;
  parentAccountId?: string | null;
  view?: "selector" | "table";
  usage?: "purchase-invoice-line";
};

export type CreateAccountPayload = {
  name: string;
  nameAr?: string;
  description?: string;
  type: AccountType;
  subtype?: string;
  isPosting?: boolean;
  allowManualPosting?: boolean;

  segment1ValueId?: string;
  segment2ValueId?: string;
  segment3ValueId?: string;
  segment4ValueId?: string;
  segment5ValueId?: string;

  segment1?: string;
  segment2?: string;
  segment3?: string;
  segment4?: string;
  segment5?: string;

  currencyCode?: string;
  parentAccountId?: string;
};

export type UpdateAccountPayload = Partial<CreateAccountPayload> & {
  isActive?: boolean;
};

// ─── Journal Entries ──────────────────────────────────────────────────────────

export type JournalEntryStatus = "DRAFT" | "POSTED";

export type JournalEntryLine = {
  id: string;
  accountId: string;
  accountCode?: string;
  accountName?: string;
  accountNameAr?: string | null;
  lineNumber: number;
  description?: string | null;
  debitAmount: string;
  creditAmount: string;
};

export type JournalEntry = {
  id: string;
  reference: string;
  status: JournalEntryStatus;
  entryDate: string;
  journalEntryTypeId?: string | null;
  journalEntryType?: { id: string; name: string } | null;
  description?: string | null;
  postedAt?: string | null;
  postingBatchId?: string | null;
  reversalOfId?: string | null;
  fiscalPeriodId?: string | null;
  lines: JournalEntryLine[];
};

export type JournalEntryLinePayload = {
  accountId: string;
  description?: string;
  debitAmount: number;
  creditAmount: number;
};

export type CreateJournalEntryPayload = {
  entryDate: string;
  journalEntryTypeId?: string;
  description?: string;
  lines: JournalEntryLinePayload[];
};

export type JournalEntriesQuery = {
  status?: JournalEntryStatus | "";
  dateFrom?: string;
  dateTo?: string;
  reference?: string;
  search?: string;
  journalEntryTypeId?: string;
  includeLines?: boolean;
};

// ─── General Ledger ───────────────────────────────────────────────────────────

export type LedgerEntry = {
  id: string;
  reference: string;
  journalEntryId: string;
  journalEntryLineId: string;
  postingBatchId: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  entryDate: string;
  postedAt: string;
  description: string;
  debitAmount: string;
  creditAmount: string;
  runningBalance: string;
};

export type LedgerResponse = {
  openingBalance: string;
  transactions: LedgerEntry[];
};

export type LedgerQuery = {
  accountId?: string;
  dateFrom?: string;
  dateTo?: string;
};

export type ReportingBasis = "ACCRUAL" | "CASH";

export type ReportingQuery = {
  dateFrom?: string;
  dateTo?: string;
  comparisonFrom?: string;
  comparisonTo?: string;
  basis?: ReportingBasis;
  includeZeroBalance?: boolean;
  accountId?: string;
  accountType?: AccountType;
  currencyCode?: string;
  segment3?: string;
  segment4?: string;
  segment5?: string;
  journalEntryTypeId?: string;
  entity?: string;
  limit?: number;
};

export type ReportingCatalogItem = {
  reportType: string;
  canView: boolean;
  canSaveDefinition: boolean;
  canSnapshot: boolean;
  canExport: boolean;
};

export type ReportingWarning = {
  code: string;
  severity: "warning" | "info";
  message: string;
  reportTypes: string[];
};

export type ReportingDefinitionPayload = {
  name: string;
  reportType: string;
  parameters?: Record<string, unknown>;
  isShared?: boolean;
};

export type ReportingDefinition = {
  id: string;
  name: string;
  reportType: string;
  parameters: Record<string, unknown>;
  createdById: string;
  updatedById: string;
  isShared: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ReportingSnapshotPayload = {
  name: string;
  reportType: string;
  parameters?: Record<string, unknown>;
};

export type ReportingSnapshot = {
  id: string;
  name: string;
  reportType: string;
  parameters: Record<string, unknown>;
  snapshotData: Record<string, unknown>;
  periodLabel?: string | null;
  comparisonPeriodLabel?: string | null;
  generatedAt: string;
  version: number;
  isLocked: boolean;
  lockedAt?: string | null;
  lockedById?: string | null;
  replacesSnapshotId?: string | null;
  rootSnapshotId?: string | null;
  createdById: string;
  createdAt: string;
};

export type ReportingExportFormat = "PDF" | "EXCEL" | "PRINT";

export type ReportingExportPayload = {
  reportType: string;
  format: ReportingExportFormat;
  title?: string;
  parameters?: Record<string, unknown>;
};

export type ReportingExportResult = {
  title: string;
  reportType: string;
  format: ReportingExportFormat;
  generatedAt: string;
  fileName: string;
  mimeType: string;
  encoding?: "utf8" | "base64";
  content: string;
};

export type ReportingMetric = {
  key: string;
  label: string;
  amount: string;
  comparisonAmount: string;
  varianceAmount: string;
};

export type ReportingSummary = {
  generatedAt: string;
  basis: ReportingBasis;
  period: string;
  comparisonPeriod?: string | null;
  metrics: ReportingMetric[];
  warnings?: ReportingWarning[];
  operational: {
    trialBalanceRowCount: number;
    cashAccountCount: number;
    auditEventCount: number;
  };
};

export type ReportingTrialBalanceRow = {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountNameAr?: string | null;
  accountType: AccountType;
  currencyCode: string;
  openingBalance: string;
  debitTotal: string;
  creditTotal: string;
  closingBalance: string;
  closingSide: "DEBIT" | "CREDIT" | "ZERO";
  drillDownPath?: string;
};

export type ReportingTrialBalanceReport = {
  generatedAt: string;
  basis: ReportingBasis;
  period: string;
  totals: {
    opening: string;
    debit: string;
    credit: string;
    closingDebit: string;
    closingCredit: string;
    difference: string;
  };
  rows: ReportingTrialBalanceRow[];
};

export type ReportingBalanceSheetRow = {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountNameAr?: string | null;
  accountType: AccountType;
  amount: string;
  comparisonAmount: string;
  varianceAmount: string;
  drillDownPath?: string;
};

export type ReportingBalanceSheetReport = {
  generatedAt: string;
  asOfDate: string;
  comparisonAsOfDate?: string | null;
  assets: ReportingBalanceSheetRow[];
  liabilities: ReportingBalanceSheetRow[];
  equity: ReportingBalanceSheetRow[];
  totals: {
    assets: ReportingMetric;
    liabilities: ReportingMetric;
    equity: ReportingMetric;
  };
};

export type ReportingProfitLossRow = ReportingBalanceSheetRow;

export type ReportingProfitLossReport = {
  generatedAt: string;
  period: string;
  comparisonPeriod?: string | null;
  revenue: ReportingProfitLossRow[];
  expenses: ReportingProfitLossRow[];
  totals: {
    revenue: ReportingMetric;
    expenses: ReportingMetric;
    netIncome: ReportingMetric;
  };
};

export type ReportingCashMovementRow = {
  bankCashAccountId: string;
  accountId: string;
  code: string;
  name: string;
  nameAr?: string | null;
  type: string;
  currencyCode: string;
  openingBalance: string;
  debitTotal: string;
  creditTotal: string;
  netMovement: string;
  closingBalance: string;
  comparisonNetMovement: string;
  comparisonClosingBalance: string;
  varianceAmount: string;
  drillDownPath?: string;
};

export type ReportingCashMovementReport = {
  generatedAt: string;
  period: string;
  comparisonPeriod?: string | null;
  rows: ReportingCashMovementRow[];
  classified: Record<string, ReportingMetric>;
  totals: {
    openingBalance: ReportingMetric;
    debit: ReportingMetric;
    credit: ReportingMetric;
    netMovement: ReportingMetric;
    closingBalance: ReportingMetric;
  };
};

export type ReportingGeneralLedgerTransaction = {
  id: string;
  reference: string;
  journalEntryId: string;
  journalReference: string;
  journalDescription?: string | null;
  entryDate: string;
  postedAt: string;
  description?: string | null;
  debitAmount: string;
  creditAmount: string;
  runningBalance: string;
  sourceDocument?: {
    type: string;
    id: string;
    reference: string;
    label: string;
    path: string;
  };
};

export type ReportingGeneralLedgerReport = {
  generatedAt: string;
  account: {
    id: string;
    code: string;
    name: string;
    nameAr?: string | null;
    type: AccountType;
    currencyCode: string;
    isPosting: boolean;
    isActive: boolean;
  } | null;
  openingBalance: string;
  totalDebit: string;
  totalCredit: string;
  closingBalance: string;
  transactions: ReportingGeneralLedgerTransaction[];
};

export type ReportingAuditReport = {
  generatedAt: string;
  totalEvents: number;
  actionTotals: Array<{ action: string; count: number }>;
  exceptions: Array<{ code: string; description: string; count: number }>;
  compliancePackage: {
    generatedAt: string;
    entryCount: number;
    highRiskCount: number;
    systemEventCount: number;
  };
  entries: AuditLogEntry[];
};

export type ReportingActivityEntry = AuditLogEntry;

// ─── Audit ────────────────────────────────────────────────────────────────────

export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "POST"
  | "REVERSE"
  | "OPEN"
  | "CLOSE"
  | "VIEW";

export type AuditLogEntry = {
  id: string;
  userId?: string | null;
  user?: { id: string; name?: string | null; email: string } | null;
  entity: string;
  entityId?: string | null;
  action: AuditAction;
  details?: Record<string, unknown> | null;
  createdAt: string;
};

// ─── Misc ─────────────────────────────────────────────────────────────────────

export type ApiCheckResult = {
  baseUrl: string;
  usedAuth: boolean;
  hasToken: boolean;
  data: Account[];
};
