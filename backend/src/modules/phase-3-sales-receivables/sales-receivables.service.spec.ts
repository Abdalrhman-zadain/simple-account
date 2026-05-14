import { BadRequestException } from "@nestjs/common";

import { BankCashTransactionKind, BankCashTransactionStatus, Prisma, SalesInvoiceStatus } from "../../generated/prisma";
import { SalesReceivablesService } from "./sales-receivables.service";

describe("SalesReceivablesService", () => {
  const prisma = {
    $transaction: jest.fn(),
    salesInvoice: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    customer: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    bankCashAccount: {
      findUnique: jest.fn(),
    },
    bankCashTransaction: {
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    tax: {
      findMany: jest.fn(),
    },
    creditNote: {
      aggregate: jest.fn(),
    },
    receiptAllocation: {
      aggregate: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
    },
    account: {
      findFirst: jest.fn(),
    },
    inventoryStockMovement: {
      findFirst: jest.fn(),
    },
    inventoryWarehouseBalance: {
      findUnique: jest.fn(),
    },
    inventoryItem: {
      update: jest.fn(),
    },
  };
  const auditService = {
    log: jest.fn(),
  };
  const bankCashTransactionsService = {};
  const accountsService = {};
  const journalEntriesService = {
    create: jest.fn(),
  };
  const postingService = {
    post: jest.fn(),
  };
  const inventoryPostingService = {
    getCostingMethod: jest.fn(),
    preventNegativeStock: jest.fn(),
    averageUnitCost: jest.fn(),
    resolveIssueCost: jest.fn(),
    applyWarehouseBalance: jest.fn(),
    createMovement: jest.fn(),
  };

  let service: SalesReceivablesService;
  let recomputeInvoiceAmountsSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(async (callback: (tx: typeof prisma) => unknown) => callback(prisma as never));
    service = new SalesReceivablesService(
      prisma as never,
      auditService as never,
      bankCashTransactionsService as never,
      accountsService as never,
      journalEntriesService as never,
      postingService as never,
      inventoryPostingService as never,
    );
    recomputeInvoiceAmountsSpy = jest.spyOn(service as any, "recomputeInvoiceAmounts").mockResolvedValue({
      id: "inv-1",
      reference: "INV-001",
      totalAmount: "116.00",
      allocatedAmount: "0.00",
      outstandingAmount: "116.00",
      allocationStatus: "UNALLOCATED",
      status: SalesInvoiceStatus.POSTED,
    });
    jest.spyOn(service as any, "refreshSalesOrderStatus").mockResolvedValue(undefined);
  });

  it("posts sales invoices with grouped revenue credits and separate output VAT", async () => {
    const invoice = salesInvoiceRow({
      totalAmount: decimal("116.00"),
      taxAmount: decimal("16.00"),
      lines: [
        salesInvoiceLine({
          lineNumber: 1,
          revenueAccountId: "rev-1",
          lineSubtotalAmount: decimal("60.00"),
          taxAmount: decimal("9.60"),
          taxId: "tax-16",
        }),
        salesInvoiceLine({
          lineNumber: 2,
          revenueAccountId: "rev-1",
          lineSubtotalAmount: decimal("40.00"),
          taxAmount: decimal("6.40"),
          taxId: "tax-16",
        }),
      ],
    });

    prisma.salesInvoice.findUnique.mockResolvedValue(invoice);
    prisma.tax.findMany.mockResolvedValue([
      {
        id: "tax-16",
        taxName: "VAT 16%",
        taxAccountId: "vat-payable",
        taxAccount: {
          id: "vat-payable",
          isActive: true,
          isPosting: true,
          allowManualPosting: true,
        },
      },
    ]);
    journalEntriesService.create.mockResolvedValue({ id: "je-1", postedAt: null });
    postingService.post.mockResolvedValue({ id: "je-1", postedAt: "2026-05-12T09:00:00.000Z" });

    await service.postInvoice("inv-1", { sourceAction: "STANDARD_POST" }, { userId: "user-1" });

    expect(journalEntriesService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        lines: [
          expect.objectContaining({
            accountId: "ar-1",
            debitAmount: 116,
            creditAmount: 0,
          }),
          expect.objectContaining({
            accountId: "rev-1",
            debitAmount: 0,
            creditAmount: 100,
          }),
          expect.objectContaining({
            accountId: "vat-payable",
            debitAmount: 0,
            creditAmount: 16,
          }),
        ],
      }),
      expect.anything(),
    );
    expect(postingService.post).toHaveBeenCalledWith("je-1", prisma);
  });

  it("posts sales invoices without tax lines when no tax is applied", async () => {
    const invoice = salesInvoiceRow({
      totalAmount: decimal("100.00"),
      taxAmount: decimal("0.00"),
      lines: [
        salesInvoiceLine({
          revenueAccountId: "rev-1",
          lineSubtotalAmount: decimal("100.00"),
          taxAmount: decimal("0.00"),
          taxId: null,
        }),
      ],
    });

    prisma.salesInvoice.findUnique.mockResolvedValue(invoice);
    prisma.tax.findMany.mockResolvedValue([]);
    journalEntriesService.create.mockResolvedValue({ id: "je-2", postedAt: null });
    postingService.post.mockResolvedValue({ id: "je-2", postedAt: "2026-05-12T09:00:00.000Z" });

    await service.postInvoice("inv-1", { sourceAction: "STANDARD_POST" }, { userId: "user-1" });

    const call = journalEntriesService.create.mock.calls[0][0];
    expect(call.lines).toHaveLength(2);
    expect(call.lines.some((line: { accountId: string }) => line.accountId === "vat-payable")).toBe(false);
  });

  it("posts inventory-tracked sales lines with stock relief and COGS entries", async () => {
    const invoice = salesInvoiceRow({
      totalAmount: decimal("100.00"),
      taxAmount: decimal("0.00"),
      lines: [
        salesInvoiceLine({
          itemId: "item-1",
          warehouseId: "wh-1",
          item: {
            id: "item-1",
            code: "ITEM-1",
            name: "Tracked item",
            type: "FINISHED_GOOD",
            trackInventory: true,
            inventoryAccountId: "inv-asset",
            cogsAccountId: "cogs-exp",
            isActive: true,
          },
          revenueAccountId: "rev-1",
          quantity: decimal("2.0000"),
          lineSubtotalAmount: decimal("100.00"),
          taxAmount: decimal("0.00"),
          taxId: null,
        }),
      ],
    });

    prisma.salesInvoice.findUnique.mockResolvedValue(invoice);
    prisma.tax.findMany.mockResolvedValue([]);
    prisma.inventoryStockMovement.findFirst.mockResolvedValue(null);
    prisma.inventoryWarehouseBalance.findUnique.mockResolvedValue({
      id: "bal-1",
      onHandQuantity: decimal("10.0000"),
      valuationAmount: decimal("250.00"),
    });
    inventoryPostingService.preventNegativeStock.mockReturnValue(true);
    inventoryPostingService.getCostingMethod.mockResolvedValue("WEIGHTED_AVERAGE");
    inventoryPostingService.averageUnitCost.mockReturnValue(decimal("25.00"));
    inventoryPostingService.resolveIssueCost.mockResolvedValue({
      unitCost: decimal("25.00"),
      totalAmount: decimal("50.00"),
    });
    inventoryPostingService.applyWarehouseBalance.mockResolvedValue({
      id: "bal-1",
      onHandQuantity: decimal("8.0000"),
      valuationAmount: decimal("200.00"),
    });
    journalEntriesService.create.mockResolvedValue({ id: "je-3", postedAt: null });
    postingService.post.mockResolvedValue({ id: "je-3", postedAt: "2026-05-12T09:00:00.000Z" });

    await service.postInvoice("inv-1", { sourceAction: "STANDARD_POST" }, { userId: "user-1" });

    expect(inventoryPostingService.resolveIssueCost).toHaveBeenCalled();
    expect(inventoryPostingService.createMovement).toHaveBeenCalledWith(
      prisma,
      expect.objectContaining({
        movementType: "SALES_ISSUE",
        transactionType: "SalesInvoice",
        transactionLineId: "line-1",
        warehouseId: "wh-1",
      }),
    );

    expect(journalEntriesService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        lines: expect.arrayContaining([
          expect.objectContaining({ accountId: "cogs-exp", debitAmount: 50, creditAmount: 0 }),
          expect.objectContaining({ accountId: "inv-asset", debitAmount: 0, creditAmount: 50 }),
        ]),
      }),
      expect.anything(),
    );
  });

  it("prevents duplicate invoice posting when a journal entry already exists", async () => {
    prisma.salesInvoice.findUnique.mockResolvedValue(
      salesInvoiceRow({ journalEntryId: "je-existing" }),
    );

    await expect(
      service.postInvoice("inv-1", { sourceAction: "STANDARD_POST" }, { userId: "user-1" }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("prevents posting invoices without a revenue account on each line", async () => {
    prisma.salesInvoice.findUnique.mockResolvedValue(
      salesInvoiceRow({
        lines: [
          salesInvoiceLine({
            lineNumber: 1,
            revenueAccountId: null,
          }),
        ],
      }),
    );

    await expect(
      service.postInvoice("inv-1", { sourceAction: "STANDARD_POST" }, { userId: "user-1" }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("posts a linked customer receipt, allocates part of it, and keeps unapplied credit", async () => {
    prisma.customer.findUnique.mockResolvedValue(customerRow());
    prisma.bankCashAccount.findUnique.mockResolvedValue(bankCashAccountRow());
    prisma.bankCashTransaction.create.mockResolvedValue(
      bankCashTransactionRow({
        id: "rcpt-1",
        amount: decimal("20.00"),
        status: BankCashTransactionStatus.DRAFT,
        journalEntryId: null,
      }),
    );
    journalEntriesService.create.mockResolvedValue({ id: "je-r1", postedAt: null });
    postingService.post.mockResolvedValue({ id: "je-r1", postedAt: "2026-05-12T09:00:00.000Z" });
    prisma.bankCashTransaction.update.mockResolvedValue(
      bankCashTransactionRow({
        id: "rcpt-1",
        amount: decimal("20.00"),
        status: BankCashTransactionStatus.POSTED,
        journalEntryId: "je-r1",
        receiptAllocations: [{ amount: decimal("0.09") }],
      }),
    );
    prisma.salesInvoice.findUnique.mockResolvedValueOnce(
      salesInvoiceLinkedLookup({ outstandingAmount: decimal("0.09") }),
    );
    prisma.receiptAllocation.create.mockResolvedValue({
      id: "alloc-1",
      salesInvoiceId: "inv-1",
      bankCashTransactionId: "rcpt-1",
      amount: decimal("0.09"),
    });
    recomputeInvoiceAmountsSpy.mockResolvedValue({
      id: "inv-1",
      reference: "INV-001",
      totalAmount: "116.00",
      allocatedAmount: "116.00",
      outstandingAmount: "0.00",
      allocationStatus: "FULLY_ALLOCATED",
      status: SalesInvoiceStatus.FULLY_PAID,
    });

    const result = await service.createCustomerReceipt(
      {
        receiptDate: "2026-05-12",
        customerId: "cust-1",
        amount: 20,
        bankCashAccountId: "bank-1",
        linkedInvoiceId: "inv-1",
        allocationAmount: 0.09,
        description: "Receipt against Sales Invoice INV-001",
        sourceAction: "POST_AND_CREATE_RECEIPT",
      },
      { userId: "user-1" },
    );

    expect(journalEntriesService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        lines: [
          expect.objectContaining({ accountId: "cash-1", debitAmount: 20, creditAmount: 0 }),
          expect.objectContaining({ accountId: "ar-1", debitAmount: 0, creditAmount: 20 }),
        ],
      }),
      expect.anything(),
    );
    expect(prisma.receiptAllocation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          amount: "0.09",
        }),
      }),
    );
    expect(result.allocatedAmount).toBe("0.09");
    expect(result.unappliedAmount).toBe("19.91");
  });

  it("prevents allocation above invoice outstanding balance", async () => {
    prisma.customer.findUnique.mockResolvedValue(customerRow());
    prisma.bankCashAccount.findUnique.mockResolvedValue(bankCashAccountRow());
    prisma.bankCashTransaction.create.mockResolvedValue(
      bankCashTransactionRow({
        id: "rcpt-1",
        amount: decimal("20.00"),
      }),
    );
    journalEntriesService.create.mockResolvedValue({ id: "je-r1", postedAt: null });
    postingService.post.mockResolvedValue({ id: "je-r1", postedAt: "2026-05-12T09:00:00.000Z" });
    prisma.bankCashTransaction.update.mockResolvedValue(
      bankCashTransactionRow({
        id: "rcpt-1",
        amount: decimal("20.00"),
        status: BankCashTransactionStatus.POSTED,
        journalEntryId: "je-r1",
        receiptAllocations: [],
      }),
    );
    prisma.salesInvoice.findUnique.mockResolvedValueOnce(
      salesInvoiceLinkedLookup({ outstandingAmount: decimal("0.09") }),
    );

    await expect(
      service.createCustomerReceipt(
        {
          receiptDate: "2026-05-12",
          customerId: "cust-1",
          amount: 20,
          bankCashAccountId: "bank-1",
          linkedInvoiceId: "inv-1",
          allocationAmount: 5,
        },
        { userId: "user-1" },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("prevents posting receipts without a valid bank or cash account", async () => {
    prisma.customer.findUnique.mockResolvedValue(customerRow());
    prisma.bankCashAccount.findUnique.mockResolvedValue(null);

    await expect(
      service.createCustomerReceipt(
        {
          receiptDate: "2026-05-12",
          customerId: "cust-1",
          amount: 20,
          bankCashAccountId: "bank-1",
        },
        { userId: "user-1" },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

function decimal(value: string) {
  return new Prisma.Decimal(value);
}

function customerRow() {
  return {
    id: "cust-1",
    code: "CUS-001",
    name: "Customer One",
    isActive: true,
    receivableAccountId: "ar-1",
    receivableAccount: {
      id: "ar-1",
      code: "1121001",
      name: "Customer Receivable",
      currencyCode: "JOD",
      isActive: true,
      isPosting: true,
    },
  };
}

function bankCashAccountRow() {
  return {
    id: "bank-1",
    type: "Bank",
    name: "Main Bank",
    currencyCode: "JOD",
    isActive: true,
    account: {
      id: "cash-1",
      code: "1110001",
      name: "Main Bank Account",
      currencyCode: "JOD",
      isActive: true,
      isPosting: true,
    },
  };
}

function salesInvoiceLine(overrides: Record<string, unknown>) {
  return {
    id: "line-1",
    lineNumber: 1,
    itemId: "item-1",
    itemName: "Service A",
    description: "Service A",
    quantity: decimal("1.0000"),
    unitPrice: decimal("100.00"),
    discountAmount: decimal("0.00"),
    taxId: "tax-16",
    taxAmount: decimal("16.00"),
    lineSubtotalAmount: decimal("100.00"),
    lineAmount: decimal("116.00"),
    revenueAccountId: "rev-1",
    ...overrides,
  };
}

function salesInvoiceRow(overrides: Record<string, unknown>) {
  return {
    id: "inv-1",
    reference: "INV-001",
    status: SalesInvoiceStatus.DRAFT,
    journalEntryId: null,
    invoiceDate: new Date("2026-05-12T00:00:00.000Z"),
    dueDate: new Date("2026-05-12T00:00:00.000Z"),
    customerId: "cust-1",
    customer: {
      ...customerRow(),
      creditLimit: decimal("0.00"),
      currentBalance: decimal("0.00"),
    },
    currencyCode: "JOD",
    description: "Sales invoice",
    subtotalAmount: decimal("100.00"),
    discountAmount: decimal("0.00"),
    totalAmount: decimal("116.00"),
    taxAmount: decimal("16.00"),
    allocatedAmount: decimal("0.00"),
    outstandingAmount: decimal("116.00"),
    allocationStatus: "UNALLOCATED",
    postedAt: null,
    journalEntry: null,
    sourceQuotation: null,
    sourceSalesOrderId: null,
    sourceSalesOrder: null,
    lines: [salesInvoiceLine({})],
    createdAt: new Date("2026-05-12T00:00:00.000Z"),
    updatedAt: new Date("2026-05-12T00:00:00.000Z"),
    ...overrides,
  };
}

function salesInvoiceLinkedLookup(overrides: Record<string, unknown>) {
  return {
    id: "inv-1",
    customerId: "cust-1",
    reference: "INV-001",
    outstandingAmount: decimal("0.09"),
    sourceSalesOrderId: null,
    ...overrides,
  };
}

function bankCashTransactionRow(overrides: Record<string, unknown>) {
  return {
    id: "rcpt-1",
    kind: BankCashTransactionKind.RECEIPT,
    status: BankCashTransactionStatus.POSTED,
    reference: "RCPT-001",
    transactionDate: new Date("2026-05-12T00:00:00.000Z"),
    amount: decimal("20.00"),
    description: "Receipt against Sales Invoice INV-001",
    counterpartyName: "Customer One",
    customerId: "cust-1",
    customer: { id: "cust-1", code: "CUS-001", name: "Customer One" },
    bankCashAccountId: "bank-1",
    bankCashAccount: bankCashAccountRow(),
    sourceBankCashAccountId: null,
    sourceBankCashAccount: null,
    destinationBankCashAccountId: null,
    destinationBankCashAccount: null,
    counterAccountId: "ar-1",
    counterAccount: null,
    journalEntryId: "je-r1",
    journalEntry: { id: "je-r1", reference: "JE-001" },
    postedAt: new Date("2026-05-12T09:00:00.000Z"),
    createdAt: new Date("2026-05-12T00:00:00.000Z"),
    updatedAt: new Date("2026-05-12T00:00:00.000Z"),
    receiptAllocations: [],
    ...overrides,
  };
}
