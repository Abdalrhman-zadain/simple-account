import {
  BadRequestException,
  ConflictException,
  Injectable,
} from "@nestjs/common";
import {
  BankCashTransactionKind,
  BankCashTransactionStatus,
  CreditNoteStatus,
  Prisma,
  QuotationStatus,
  SalesInvoiceStatus,
  SalesOrderStatus,
} from "../../generated/prisma";

import { PrismaService } from "../../common/prisma/prisma.service";
import { BankCashTransactionsService } from "../phase-2-bank-cash-management/bank-cash-transactions/bank-cash-transactions.service";
import { AccountsService } from "../phase-1-accounting-foundation/accounting-core/chart-of-accounts/accounts.service";
import { JournalEntriesService } from "../phase-1-accounting-foundation/accounting-core/journal-entries/journal-entries.service";
import { PostingService } from "../phase-1-accounting-foundation/accounting-core/posting-logic/posting.service";
import {
  AllocateReceiptDto,
  CreateCreditNoteDto,
  CreateCustomerDto,
  CreateCustomerReceiptDto,
  CreateSalesInvoiceDto,
  CreateSalesOrderDto,
  CreateSalesQuotationDto,
  SalesLineDto,
  UpdateCreditNoteDto,
  UpdateCustomerDto,
  UpdateSalesInvoiceDto,
  UpdateSalesOrderDto,
  UpdateSalesQuotationDto,
} from "./dto/sales-receivables.dto";

type DocumentQuery = {
  status?: string;
  customerId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
};

type ReceiptQuery = {
  customerId?: string;
  search?: string;
};

type SalesReceivablesDb = Prisma.TransactionClient | PrismaService;

const CUSTOMER_RECEIVABLES_PARENT_CODE = "1121000";
const RECEIVABLES_HEADER_CODE = "1120000";
const CUSTOMER_AUTO_RECEIVABLE_SUBTYPE = "Current Assets";

type ResolvedLine = {
  itemName: string | null;
  description: string | null;
  revenueAccountId: string | null;
  taxId: string | null;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  taxAmount: number;
  lineSubtotalAmount: number;
  lineTotalAmount: number;
};

@Injectable()
export class SalesReceivablesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bankCashTransactionsService: BankCashTransactionsService,
    private readonly accountsService: AccountsService,
    private readonly journalEntriesService: JournalEntriesService,
    private readonly postingService: PostingService,
  ) {}

  async listCustomers(query: { isActive?: string; search?: string } = {}) {
    const search = query.search?.trim();
    return this.prisma.customer.findMany({
      where: {
        isActive:
          query.isActive === undefined || query.isActive === ""
            ? undefined
            : query.isActive === "true",
        OR: search
          ? [
              { name: { contains: search, mode: "insensitive" } },
              { code: { contains: search, mode: "insensitive" } },
              { contactInfo: { contains: search, mode: "insensitive" } },
              { taxInfo: { contains: search, mode: "insensitive" } },
              {
                salesRepresentative: { contains: search, mode: "insensitive" },
              },
            ]
          : undefined,
      },
      include: { receivableAccount: { select: this.accountSummarySelect() } },
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    });
  }

  async createCustomer(dto: CreateCustomerDto) {
    const code = dto.code?.trim() || this.generateReference("CUS");

    try {
      return await this.prisma.$transaction(async (tx) => {
        const receivableAccountId = await this.resolveCustomerReceivableAccount(dto, tx);

        return tx.customer.create({
          data: {
            code,
            name: dto.name.trim(),
            contactInfo: dto.contactInfo?.trim() || null,
            taxInfo: dto.taxInfo?.trim() || null,
            salesRepresentative: dto.salesRepresentative?.trim() || null,
            paymentTerms: dto.paymentTerms?.trim() || null,
            creditLimit: this.toAmount(dto.creditLimit),
            receivableAccountId,
          },
          include: { receivableAccount: { select: this.accountSummarySelect() } },
        });
      });
    } catch (error) {
      if (this.isUniqueConflict(error, "code")) {
        throw new ConflictException(
          "A customer with this code already exists.",
        );
      }
      throw error;
    }
  }

  async updateCustomer(id: string, dto: UpdateCustomerDto) {
    const current = await this.getCustomerOrThrow(id);
    if (!current.isActive) {
      throw new BadRequestException("Deactivated customers cannot be edited.");
    }
    if (dto.receivableAccountId) {
      await this.ensureReceivableAccount(dto.receivableAccountId);
    }

    return this.prisma.customer.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        contactInfo:
          dto.contactInfo === undefined
            ? undefined
            : dto.contactInfo.trim() || null,
        taxInfo:
          dto.taxInfo === undefined ? undefined : dto.taxInfo.trim() || null,
        salesRepresentative:
          dto.salesRepresentative === undefined
            ? undefined
            : dto.salesRepresentative.trim() || null,
        paymentTerms:
          dto.paymentTerms === undefined
            ? undefined
            : dto.paymentTerms.trim() || null,
        creditLimit:
          dto.creditLimit === undefined
            ? undefined
            : this.toAmount(dto.creditLimit),
        receivableAccountId: dto.receivableAccountId,
      },
      include: { receivableAccount: { select: this.accountSummarySelect() } },
    });
  }

  async deactivateCustomer(id: string) {
    await this.getCustomerOrThrow(id);
    return this.prisma.customer.update({
      where: { id },
      data: { isActive: false },
      include: { receivableAccount: { select: this.accountSummarySelect() } },
    });
  }

  async listQuotations(query: DocumentQuery = {}) {
    const search = query.search?.trim();
    const rows = await this.prisma.salesQuotation.findMany({
      where: {
        customerId: query.customerId,
        status: this.parseQuotationStatus(query.status),
        quotationDate: this.dateRangeFilter(query.dateFrom, query.dateTo),
        OR: search
          ? [
              { reference: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } },
              { customer: { name: { contains: search, mode: "insensitive" } } },
              { customer: { code: { contains: search, mode: "insensitive" } } },
            ]
          : undefined,
      },
      include: this.quotationInclude(),
      orderBy: [{ quotationDate: "desc" }, { createdAt: "desc" }],
    });

    return rows.map((row) => this.mapQuotation(row));
  }

  async createQuotation(dto: CreateSalesQuotationDto) {
    const customer = await this.ensureActiveCustomer(dto.customerId);
    const lines = await this.resolveAndValidateLines(dto.lines, {
      requireRevenueAccount: false,
    });
    const totals = this.computeTotals(lines);
    const reference = dto.reference?.trim() || this.generateReference("QUO");

    try {
      const created = await this.prisma.salesQuotation.create({
        data: {
          reference,
          quotationDate: new Date(dto.quotationDate),
          validityDate: new Date(dto.validityDate),
          customerId: dto.customerId,
          currencyCode:
            dto.currencyCode?.trim().toUpperCase() ||
            customer.receivableAccount.currencyCode,
          description: dto.description?.trim() || null,
          subtotalAmount: this.toAmount(totals.subtotalAmount),
          discountAmount: this.toAmount(totals.discountAmount),
          taxAmount: this.toAmount(totals.taxAmount),
          totalAmount: this.toAmount(totals.totalAmount),
          lines: {
            create: lines.map((line, index) =>
              this.buildQuotationLineCreateInput(line, index + 1),
            ),
          },
        },
        include: this.quotationInclude(),
      });

      return this.mapQuotation(created);
    } catch (error) {
      if (this.isUniqueConflict(error, "reference")) {
        throw new ConflictException(
          "A sales quotation with this reference already exists.",
        );
      }
      throw error;
    }
  }

  async updateQuotation(id: string, dto: UpdateSalesQuotationDto) {
    const quotation = await this.getQuotationOrThrow(id);
    if (quotation.status !== QuotationStatus.DRAFT) {
      throw new BadRequestException("Only draft quotations can be edited.");
    }

    const nextCustomerId = dto.customerId ?? quotation.customerId;
    await this.ensureActiveCustomer(nextCustomerId);

    const lines = dto.lines
      ? await this.resolveAndValidateLines(dto.lines, {
          requireRevenueAccount: false,
        })
      : null;
    const totals = lines ? this.computeTotals(lines) : null;

    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        if (lines) {
          await tx.salesQuotationLine.deleteMany({
            where: { salesQuotationId: id },
          });
        }

        return tx.salesQuotation.update({
          where: { id },
          data: {
            reference: dto.reference?.trim(),
            quotationDate: dto.quotationDate
              ? new Date(dto.quotationDate)
              : undefined,
            validityDate: dto.validityDate
              ? new Date(dto.validityDate)
              : undefined,
            customerId: nextCustomerId,
            currencyCode: dto.currencyCode?.trim().toUpperCase(),
            description:
              dto.description === undefined
                ? undefined
                : dto.description.trim() || null,
            subtotalAmount: totals
              ? this.toAmount(totals.subtotalAmount)
              : undefined,
            discountAmount: totals
              ? this.toAmount(totals.discountAmount)
              : undefined,
            taxAmount: totals ? this.toAmount(totals.taxAmount) : undefined,
            totalAmount: totals ? this.toAmount(totals.totalAmount) : undefined,
            lines: lines
              ? {
                  create: lines.map((line, index) =>
                    this.buildQuotationLineCreateInput(line, index + 1),
                  ),
                }
              : undefined,
          },
          include: this.quotationInclude(),
        });
      });

      return this.mapQuotation(updated);
    } catch (error) {
      if (this.isUniqueConflict(error, "reference")) {
        throw new ConflictException(
          "A sales quotation with this reference already exists.",
        );
      }
      throw error;
    }
  }

  async approveQuotation(id: string) {
    const quotation = await this.getQuotationOrThrow(id);
    if (quotation.status !== QuotationStatus.DRAFT) {
      throw new BadRequestException("Only draft quotations can be approved.");
    }

    const nextStatus =
      quotation.validityDate < this.startOfToday()
        ? QuotationStatus.EXPIRED
        : QuotationStatus.APPROVED;
    const updated = await this.prisma.salesQuotation.update({
      where: { id },
      data: { status: nextStatus },
      include: this.quotationInclude(),
    });
    return this.mapQuotation(updated);
  }

  async cancelQuotation(id: string) {
    const quotation = await this.getQuotationOrThrow(id);
    if (quotation.status === QuotationStatus.CONVERTED) {
      throw new BadRequestException(
        "Converted quotations cannot be cancelled.",
      );
    }

    const updated = await this.prisma.salesQuotation.update({
      where: { id },
      data: { status: QuotationStatus.CANCELLED },
      include: this.quotationInclude(),
    });
    return this.mapQuotation(updated);
  }

  async convertQuotationToOrder(id: string, dto: CreateSalesOrderDto) {
    const quotation = await this.prisma.salesQuotation.findUnique({
      where: { id },
      include: { lines: true },
    });
    if (!quotation) {
      throw new BadRequestException(`Sales quotation ${id} was not found.`);
    }
    if (quotation.status !== QuotationStatus.APPROVED) {
      throw new BadRequestException(
        "Only approved quotations can be converted.",
      );
    }
    if (quotation.validityDate < this.startOfToday()) {
      throw new BadRequestException("Expired quotations cannot be converted.");
    }

    const order = await this.createSalesOrder({
      ...dto,
      customerId: quotation.customerId,
      currencyCode: dto.currencyCode || quotation.currencyCode,
      sourceQuotationId: quotation.id,
      lines: dto.lines?.length
        ? dto.lines
        : quotation.lines.map((line) => ({
            itemName: line.itemName ?? undefined,
            description: line.description ?? undefined,
            quantity: Number(line.quantity),
            unitPrice: Number(line.unitPrice),
            discountAmount: Number(line.discountAmount),
            taxAmount: Number(line.taxAmount),
            revenueAccountId: line.revenueAccountId ?? undefined,
          })),
    });

    await this.prisma.salesQuotation.update({
      where: { id },
      data: { status: QuotationStatus.CONVERTED, convertedAt: new Date() },
    });

    return order;
  }

  async convertQuotationToInvoice(id: string, dto: CreateSalesInvoiceDto) {
    const quotation = await this.prisma.salesQuotation.findUnique({
      where: { id },
      include: { lines: true, customer: true },
    });
    if (!quotation) {
      throw new BadRequestException(`Sales quotation ${id} was not found.`);
    }
    if (quotation.status !== QuotationStatus.APPROVED) {
      throw new BadRequestException(
        "Only approved quotations can be converted.",
      );
    }
    if (quotation.validityDate < this.startOfToday()) {
      throw new BadRequestException("Expired quotations cannot be converted.");
    }

    const invoice = await this.createInvoice({
      ...dto,
      customerId: quotation.customerId,
      currencyCode: dto.currencyCode || quotation.currencyCode,
      sourceQuotationId: quotation.id,
      lines: dto.lines?.length
        ? dto.lines
        : quotation.lines.map((line) => ({
            itemName: line.itemName ?? undefined,
            description: line.description ?? undefined,
            quantity: Number(line.quantity),
            unitPrice: Number(line.unitPrice),
            discountAmount: Number(line.discountAmount),
            taxAmount: Number(line.taxAmount),
            revenueAccountId: line.revenueAccountId ?? undefined,
          })),
    });

    await this.prisma.salesQuotation.update({
      where: { id },
      data: { status: QuotationStatus.CONVERTED, convertedAt: new Date() },
    });

    return invoice;
  }

  async listSalesOrders(query: DocumentQuery = {}) {
    const search = query.search?.trim();
    const rows = await this.prisma.salesOrder.findMany({
      where: {
        customerId: query.customerId,
        status: this.parseSalesOrderStatus(query.status),
        orderDate: this.dateRangeFilter(query.dateFrom, query.dateTo),
        OR: search
          ? [
              { reference: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } },
              { shippingDetails: { contains: search, mode: "insensitive" } },
              { customer: { name: { contains: search, mode: "insensitive" } } },
              { customer: { code: { contains: search, mode: "insensitive" } } },
            ]
          : undefined,
      },
      include: this.salesOrderInclude(),
      orderBy: [{ orderDate: "desc" }, { createdAt: "desc" }],
    });

    return rows.map((row) => this.mapSalesOrder(row));
  }

  async createSalesOrder(dto: CreateSalesOrderDto) {
    const customer = await this.ensureActiveCustomer(dto.customerId);
    if (dto.sourceQuotationId) {
      await this.ensureQuotationBelongsToCustomer(
        dto.sourceQuotationId,
        dto.customerId,
      );
    }

    const lines = await this.resolveAndValidateLines(dto.lines, {
      requireRevenueAccount: false,
    });
    const totals = this.computeTotals(lines);
    const reference = dto.reference?.trim() || this.generateReference("SO");

    try {
      try {
        const dump = JSON.stringify(
          lines.map((l) => ({
            itemName: l.itemName,
            revenueAccountId: l.revenueAccountId,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
          })),
          null,
          2,
        );
        process.stderr.write(`DEBUG createSalesOrder - resolved lines: ${new Date().toISOString()}\n` + dump + "\n");
      } catch (e) {
        process.stderr.write(`DEBUG createSalesOrder - failed to stringify lines: ${String(e)}\n`);
      }
      const created = await this.prisma.salesOrder.create({
        data: {
          reference,
          orderDate: new Date(dto.orderDate),
          promisedDate: dto.promisedDate ? new Date(dto.promisedDate) : null,
          customerId: dto.customerId,
          currencyCode:
            dto.currencyCode?.trim().toUpperCase() ||
            customer.receivableAccount.currencyCode,
          shippingDetails: dto.shippingDetails?.trim() || null,
          description: dto.description?.trim() || null,
          sourceQuotationId: dto.sourceQuotationId ?? null,
          subtotalAmount: this.toAmount(totals.subtotalAmount),
          discountAmount: this.toAmount(totals.discountAmount),
          taxAmount: this.toAmount(totals.taxAmount),
          totalAmount: this.toAmount(totals.totalAmount),
          lines: {
            create: lines.map((line, index) =>
              this.buildSalesOrderLineCreateInput(line, index + 1),
            ),
          },
        },
        include: this.salesOrderInclude(),
      });

      return this.mapSalesOrder(created);
    } catch (error) {
      try {
        process.stderr.write(
          `ERROR createSalesOrder - ${new Date().toISOString()} - error: ${String(error)}\n`,
        );
        try {
          process.stderr.write(
            `ERROR createSalesOrder - last resolved lines: ${JSON.stringify(lines, null, 2)}\n`,
          );
        } catch (e) {
          process.stderr.write(`ERROR createSalesOrder - failed to stringify lines: ${String(e)}\n`);
        }
      } catch (e) {
        // ignore logging failures
      }
      if (this.isUniqueConflict(error, "reference")) {
        throw new ConflictException(
          "A sales order with this reference already exists.",
        );
      }
      throw error;
    }
  }

  async updateSalesOrder(id: string, dto: UpdateSalesOrderDto) {
    const order = await this.getSalesOrderOrThrow(id);
    if (order.status !== SalesOrderStatus.DRAFT) {
      throw new BadRequestException("Only draft sales orders can be edited.");
    }

    const nextCustomerId = dto.customerId ?? order.customerId;
    await this.ensureActiveCustomer(nextCustomerId);
    if (dto.sourceQuotationId) {
      await this.ensureQuotationBelongsToCustomer(
        dto.sourceQuotationId,
        nextCustomerId,
      );
    }

    const lines = dto.lines
      ? await this.resolveAndValidateLines(dto.lines, {
          requireRevenueAccount: false,
        })
      : null;
    const totals = lines ? this.computeTotals(lines) : null;

    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        if (lines) {
          await tx.salesOrderLine.deleteMany({ where: { salesOrderId: id } });
        }

        return tx.salesOrder.update({
          where: { id },
          data: {
            reference: dto.reference?.trim(),
            orderDate: dto.orderDate ? new Date(dto.orderDate) : undefined,
            promisedDate:
              dto.promisedDate === undefined
                ? undefined
                : dto.promisedDate
                  ? new Date(dto.promisedDate)
                  : null,
            customerId: nextCustomerId,
            currencyCode: dto.currencyCode?.trim().toUpperCase(),
            shippingDetails:
              dto.shippingDetails === undefined
                ? undefined
                : dto.shippingDetails.trim() || null,
            description:
              dto.description === undefined
                ? undefined
                : dto.description.trim() || null,
            sourceQuotationId:
              dto.sourceQuotationId === undefined
                ? undefined
                : dto.sourceQuotationId || null,
            subtotalAmount: totals
              ? this.toAmount(totals.subtotalAmount)
              : undefined,
            discountAmount: totals
              ? this.toAmount(totals.discountAmount)
              : undefined,
            taxAmount: totals ? this.toAmount(totals.taxAmount) : undefined,
            totalAmount: totals ? this.toAmount(totals.totalAmount) : undefined,
            lines: lines
              ? {
                  create: lines.map((line, index) =>
                    this.buildSalesOrderLineCreateInput(line, index + 1),
                  ),
                }
              : undefined,
          },
          include: this.salesOrderInclude(),
        });
      });

      return this.mapSalesOrder(updated);
    } catch (error) {
      if (this.isUniqueConflict(error, "reference")) {
        throw new ConflictException(
          "A sales order with this reference already exists.",
        );
      }
      throw error;
    }
  }

  async confirmSalesOrder(id: string) {
    const order = await this.getSalesOrderOrThrow(id);
    if (order.status !== SalesOrderStatus.DRAFT) {
      throw new BadRequestException(
        "Only draft sales orders can be confirmed.",
      );
    }

    const updated = await this.prisma.salesOrder.update({
      where: { id },
      data: { status: SalesOrderStatus.CONFIRMED },
      include: this.salesOrderInclude(),
    });
    return this.mapSalesOrder(updated);
  }

  async cancelSalesOrder(id: string) {
    const order = await this.getSalesOrderOrThrow(id);
    if (
      order.status === SalesOrderStatus.PARTIALLY_INVOICED ||
      order.status === SalesOrderStatus.FULLY_INVOICED
    ) {
      throw new BadRequestException(
        "Invoiced sales orders cannot be cancelled.",
      );
    }

    const updated = await this.prisma.salesOrder.update({
      where: { id },
      data: { status: SalesOrderStatus.CANCELLED },
      include: this.salesOrderInclude(),
    });
    return this.mapSalesOrder(updated);
  }

  async convertSalesOrderToInvoice(id: string, dto: CreateSalesInvoiceDto) {
    const order = await this.prisma.salesOrder.findUnique({
      where: { id },
      include: { lines: true },
    });
    if (!order) {
      throw new BadRequestException(`Sales order ${id} was not found.`);
    }
    if (
      order.status !== SalesOrderStatus.CONFIRMED &&
      order.status !== SalesOrderStatus.PARTIALLY_INVOICED
    ) {
      throw new BadRequestException(
        "Only confirmed sales orders can be converted to invoices.",
      );
    }

    const invoice = await this.createInvoice({
      ...dto,
      customerId: order.customerId,
      currencyCode: dto.currencyCode || order.currencyCode,
      sourceSalesOrderId: order.id,
      sourceQuotationId:
        dto.sourceQuotationId || order.sourceQuotationId || undefined,
      lines: dto.lines?.length
        ? dto.lines
        : order.lines.map((line) => ({
            itemName: line.itemName ?? undefined,
            description: line.description ?? undefined,
            quantity: Number(line.quantity),
            unitPrice: Number(line.unitPrice),
            discountAmount: Number(line.discountAmount),
            taxAmount: Number(line.taxAmount),
            revenueAccountId: line.revenueAccountId ?? undefined,
          })),
    });

    await this.refreshSalesOrderStatus(order.id);
    return invoice;
  }

  async listInvoices(query: DocumentQuery = {}) {
    const search = query.search?.trim();
    const rows = await this.prisma.salesInvoice.findMany({
      where: {
        customerId: query.customerId,
        status: this.parseSalesInvoiceStatus(query.status),
        invoiceDate: this.dateRangeFilter(query.dateFrom, query.dateTo),
        OR: search
          ? [
              { reference: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } },
              { customer: { name: { contains: search, mode: "insensitive" } } },
              { customer: { code: { contains: search, mode: "insensitive" } } },
            ]
          : undefined,
      },
      include: this.invoiceInclude(),
      orderBy: [{ invoiceDate: "desc" }, { createdAt: "desc" }],
    });

    return rows.map((row) => this.mapInvoice(row));
  }

  async createInvoice(dto: CreateSalesInvoiceDto) {
    const customer = await this.ensureActiveCustomer(dto.customerId);
    await this.ensureInvoiceSources(
      dto.sourceQuotationId,
      dto.sourceSalesOrderId,
      customer.id,
    );

    const lines = await this.resolveAndValidateLines(dto.lines, {
      requireRevenueAccount: true,
    });
    const totals = this.computeTotals(lines);
    if (totals.totalAmount <= 0) {
      throw new BadRequestException(
        "Sales invoices require a total amount greater than zero.",
      );
    }

    const dueDate = dto.dueDate
      ? new Date(dto.dueDate)
      : this.deriveDueDate(new Date(dto.invoiceDate), customer.paymentTerms);
    const reference = dto.reference?.trim() || this.generateReference("INV");

    try {
      const created = await this.prisma.salesInvoice.create({
        data: {
          reference,
          invoiceDate: new Date(dto.invoiceDate),
          dueDate,
          customerId: customer.id,
          currencyCode:
            dto.currencyCode?.trim().toUpperCase() ||
            customer.receivableAccount.currencyCode,
          description: dto.description?.trim() || null,
          sourceQuotationId: dto.sourceQuotationId ?? null,
          sourceSalesOrderId: dto.sourceSalesOrderId ?? null,
          subtotalAmount: this.toAmount(totals.subtotalAmount),
          discountAmount: this.toAmount(totals.discountAmount),
          taxAmount: this.toAmount(totals.taxAmount),
          totalAmount: this.toAmount(totals.totalAmount),
          outstandingAmount: this.toAmount(totals.totalAmount),
          lines: {
            create: lines.map((line, index) =>
              this.buildSalesInvoiceLineCreateInput(line, index + 1),
            ),
          },
        },
        include: this.invoiceInclude(),
      });

      await this.refreshSalesOrderStatus(
        created.sourceSalesOrderId ?? undefined,
      );
      return this.mapInvoice(created);
    } catch (error) {
      if (this.isUniqueConflict(error, "reference")) {
        throw new ConflictException(
          "A sales invoice with this reference already exists.",
        );
      }
      throw error;
    }
  }

  async updateInvoice(id: string, dto: UpdateSalesInvoiceDto) {
    const invoice = await this.getInvoiceOrThrow(id);
    if (invoice.status !== SalesInvoiceStatus.DRAFT) {
      throw new BadRequestException(
        "Posted or settled invoices are locked and cannot be edited.",
      );
    }

    const nextCustomerId = dto.customerId ?? invoice.customerId;
    const customer = await this.ensureActiveCustomer(nextCustomerId);
    await this.ensureInvoiceSources(
      dto.sourceQuotationId === undefined
        ? (invoice.sourceQuotationId ?? undefined)
        : dto.sourceQuotationId || undefined,
      dto.sourceSalesOrderId === undefined
        ? (invoice.sourceSalesOrderId ?? undefined)
        : dto.sourceSalesOrderId || undefined,
      nextCustomerId,
    );

    const lines = dto.lines
      ? await this.resolveAndValidateLines(dto.lines, {
          requireRevenueAccount: true,
        })
      : null;
    const totals = lines ? this.computeTotals(lines) : null;

    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        if (lines) {
          await tx.salesInvoiceLine.deleteMany({
            where: { salesInvoiceId: id },
          });
        }

        const nextDueDate =
          dto.dueDate === undefined
            ? (invoice.dueDate ??
              this.deriveDueDate(invoice.invoiceDate, customer.paymentTerms))
            : dto.dueDate
              ? new Date(dto.dueDate)
              : this.deriveDueDate(
                  dto.invoiceDate
                    ? new Date(dto.invoiceDate)
                    : invoice.invoiceDate,
                  customer.paymentTerms,
                );

        return tx.salesInvoice.update({
          where: { id },
          data: {
            reference: dto.reference?.trim(),
            invoiceDate: dto.invoiceDate
              ? new Date(dto.invoiceDate)
              : undefined,
            dueDate: nextDueDate,
            customerId: nextCustomerId,
            currencyCode: dto.currencyCode?.trim().toUpperCase(),
            description:
              dto.description === undefined
                ? undefined
                : dto.description.trim() || null,
            sourceQuotationId:
              dto.sourceQuotationId === undefined
                ? undefined
                : dto.sourceQuotationId || null,
            sourceSalesOrderId:
              dto.sourceSalesOrderId === undefined
                ? undefined
                : dto.sourceSalesOrderId || null,
            subtotalAmount: totals
              ? this.toAmount(totals.subtotalAmount)
              : undefined,
            discountAmount: totals
              ? this.toAmount(totals.discountAmount)
              : undefined,
            taxAmount: totals ? this.toAmount(totals.taxAmount) : undefined,
            totalAmount: totals ? this.toAmount(totals.totalAmount) : undefined,
            outstandingAmount: totals
              ? this.toAmount(totals.totalAmount)
              : undefined,
            lines: lines
              ? {
                  create: lines.map((line, index) =>
                    this.buildSalesInvoiceLineCreateInput(line, index + 1),
                  ),
                }
              : undefined,
          },
          include: this.invoiceInclude(),
        });
      });

      await this.refreshSalesOrderStatus(
        updated.sourceSalesOrderId ?? undefined,
      );
      return this.mapInvoice(updated);
    } catch (error) {
      if (this.isUniqueConflict(error, "reference")) {
        throw new ConflictException(
          "A sales invoice with this reference already exists.",
        );
      }
      throw error;
    }
  }

  async postInvoice(id: string) {
    const invoice = await this.prisma.salesInvoice.findUnique({
      where: { id },
      include: {
        customer: { include: { receivableAccount: true } },
        lines: { orderBy: { lineNumber: "asc" } },
      },
    });
    if (!invoice) {
      throw new BadRequestException(`Sales invoice ${id} was not found.`);
    }
    if (invoice.status !== SalesInvoiceStatus.DRAFT) {
      throw new BadRequestException("Only draft invoices can be posted.");
    }
    if (!invoice.customer.isActive) {
      throw new BadRequestException(
        "Deactivated customers cannot be selected for new transactions.",
      );
    }
    if (Number(invoice.totalAmount) <= 0) {
      throw new BadRequestException(
        "Sales invoices require a total amount greater than zero.",
      );
    }

    const totalAmount = Number(invoice.totalAmount);
    if (
      Number(invoice.customer.creditLimit) > 0 &&
      Number(invoice.customer.currentBalance) + totalAmount >
        Number(invoice.customer.creditLimit)
    ) {
      throw new BadRequestException(
        "Posting this invoice exceeds the customer credit limit.",
      );
    }

    const description = invoice.description
      ? `${invoice.reference} - ${invoice.description}`
      : invoice.reference;
    const taxAmount = Number(invoice.taxAmount);
    const taxAccountId =
      taxAmount > 0 ? await this.getSalesTaxAccountId() : null;

    const journal = await this.journalEntriesService.create({
      entryDate: invoice.invoiceDate.toISOString(),
      description,
      lines: [
        {
          accountId: invoice.customer.receivableAccountId,
          description,
          debitAmount: totalAmount,
          creditAmount: 0,
        },
        ...invoice.lines.map((line) => ({
          accountId: line.revenueAccountId,
          description: line.description ?? description,
          debitAmount: 0,
          creditAmount: Number(line.lineSubtotalAmount) + (taxAccountId ? 0 : Number(line.taxAmount)),
        })),
        ...(taxAccountId
          ? [
              {
                accountId: taxAccountId,
                description: `${description} tax`,
                debitAmount: 0,
                creditAmount: taxAmount,
              },
            ]
          : []),
      ],
    });

    const posted = await this.postingService.post(journal.id);
    const postedAt = posted.postedAt ? new Date(posted.postedAt) : new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.salesInvoice.update({
        where: { id: invoice.id },
        data: {
          status: this.deriveInvoiceStatus(
            totalAmount,
            0,
            invoice.dueDate,
            postedAt,
          ),
          journalEntryId: posted.id,
          postedAt,
        },
      });
      await tx.customer.update({
        where: { id: invoice.customerId },
        data: { currentBalance: { increment: this.toAmount(totalAmount) } },
      });
      await this.recomputeInvoiceAmounts(tx, invoice.id);
    });

    await this.refreshSalesOrderStatus(invoice.sourceSalesOrderId ?? undefined);
    const updated = await this.getInvoiceOrThrow(id);
    return this.mapInvoice(updated);
  }

  async listCreditNotes(query: DocumentQuery = {}) {
    const search = query.search?.trim();
    const rows = await this.prisma.creditNote.findMany({
      where: {
        customerId: query.customerId,
        status: this.parseCreditNoteStatus(query.status),
        noteDate: this.dateRangeFilter(query.dateFrom, query.dateTo),
        OR: search
          ? [
              { reference: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } },
              { customer: { name: { contains: search, mode: "insensitive" } } },
              { customer: { code: { contains: search, mode: "insensitive" } } },
            ]
          : undefined,
      },
      include: this.creditNoteInclude(),
      orderBy: [{ noteDate: "desc" }, { createdAt: "desc" }],
    });

    return rows.map((row) => this.mapCreditNote(row));
  }

  async createCreditNote(dto: CreateCreditNoteDto) {
    const customer = await this.ensureActiveCustomer(dto.customerId);
    await this.ensureCreditNoteInvoice(dto.salesInvoiceId, customer.id);

    const lines = await this.resolveAndValidateLines(dto.lines, {
      requireRevenueAccount: true,
    });
    const totals = this.computeTotals(lines);
    const reference = dto.reference?.trim() || this.generateReference("CN");

    try {
      const created = await this.prisma.creditNote.create({
        data: {
          reference,
          noteDate: new Date(dto.noteDate),
          customerId: customer.id,
          salesInvoiceId: dto.salesInvoiceId ?? null,
          currencyCode:
            dto.currencyCode?.trim().toUpperCase() ||
            customer.receivableAccount.currencyCode,
          description: dto.description?.trim() || null,
          subtotalAmount: this.toAmount(totals.subtotalAmount),
          discountAmount: this.toAmount(totals.discountAmount),
          taxAmount: this.toAmount(totals.taxAmount),
          totalAmount: this.toAmount(totals.totalAmount),
          lines: {
            create: lines.map((line, index) =>
              this.buildCreditNoteLineCreateInput(line, index + 1),
            ),
          },
        },
        include: this.creditNoteInclude(),
      });

      return this.mapCreditNote(created);
    } catch (error) {
      if (this.isUniqueConflict(error, "reference")) {
        throw new ConflictException(
          "A credit note with this reference already exists.",
        );
      }
      throw error;
    }
  }

  async updateCreditNote(id: string, dto: UpdateCreditNoteDto) {
    const note = await this.getCreditNoteOrThrow(id);
    if (note.status !== CreditNoteStatus.DRAFT) {
      throw new BadRequestException(
        "Posted credit notes are locked and cannot be edited.",
      );
    }

    const nextCustomerId = dto.customerId ?? note.customerId;
    await this.ensureActiveCustomer(nextCustomerId);
    await this.ensureCreditNoteInvoice(
      dto.salesInvoiceId === undefined
        ? (note.salesInvoiceId ?? undefined)
        : dto.salesInvoiceId || undefined,
      nextCustomerId,
    );

    const lines = dto.lines
      ? await this.resolveAndValidateLines(dto.lines, {
          requireRevenueAccount: true,
        })
      : null;
    const totals = lines ? this.computeTotals(lines) : null;
    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        if (lines) {
          await tx.creditNoteLine.deleteMany({ where: { creditNoteId: id } });
        }
        return tx.creditNote.update({
          where: { id },
          data: {
            reference: dto.reference?.trim(),
            noteDate: dto.noteDate ? new Date(dto.noteDate) : undefined,
            customerId: nextCustomerId,
            salesInvoiceId:
              dto.salesInvoiceId === undefined
                ? undefined
                : dto.salesInvoiceId || null,
            currencyCode: dto.currencyCode?.trim().toUpperCase(),
            description:
              dto.description === undefined
                ? undefined
                : dto.description.trim() || null,
            subtotalAmount: totals
              ? this.toAmount(totals.subtotalAmount)
              : undefined,
            discountAmount: totals
              ? this.toAmount(totals.discountAmount)
              : undefined,
            taxAmount: totals ? this.toAmount(totals.taxAmount) : undefined,
            totalAmount: totals ? this.toAmount(totals.totalAmount) : undefined,
            lines: lines
              ? {
                  create: lines.map((line, index) =>
                    this.buildCreditNoteLineCreateInput(line, index + 1),
                  ),
                }
              : undefined,
          },
          include: this.creditNoteInclude(),
        });
      });
      return this.mapCreditNote(updated);
    } catch (error) {
      if (this.isUniqueConflict(error, "reference")) {
        throw new ConflictException(
          "A credit note with this reference already exists.",
        );
      }
      throw error;
    }
  }

  async postCreditNote(id: string) {
    const note = await this.prisma.creditNote.findUnique({
      where: { id },
      include: {
        customer: { include: { receivableAccount: true } },
        lines: { orderBy: { lineNumber: "asc" } },
      },
    });
    if (!note) {
      throw new BadRequestException(`Credit note ${id} was not found.`);
    }
    if (note.status !== CreditNoteStatus.DRAFT) {
      throw new BadRequestException("Only draft credit notes can be posted.");
    }
    if (!note.customer.isActive) {
      throw new BadRequestException(
        "Deactivated customers cannot be selected for new transactions.",
      );
    }

    if (note.salesInvoiceId) {
      const invoice = await this.prisma.salesInvoice.findUnique({
        where: { id: note.salesInvoiceId },
      });
      if (!invoice) {
        throw new BadRequestException("Linked invoice was not found.");
      }
      if (Number(note.totalAmount) > Number(invoice.totalAmount)) {
        throw new BadRequestException(
          "Credit note amount cannot exceed the referenced invoice amount.",
        );
      }
    }

    const description = note.description
      ? `${note.reference} - ${note.description}`
      : note.reference;
    const taxAccountId =
      Number(note.taxAmount) > 0 ? await this.getSalesTaxAccountId() : null;

    const journal = await this.journalEntriesService.create({
      entryDate: note.noteDate.toISOString(),
      description,
      lines: [
        ...note.lines.map((line) => ({
          accountId: line.revenueAccountId,
          description: line.description ?? description,
          debitAmount: Number(line.lineSubtotalAmount),
          creditAmount: 0,
        })),
        ...(taxAccountId
          ? [
              {
                accountId: taxAccountId,
                description: `${description} tax`,
                debitAmount: Number(note.taxAmount),
                creditAmount: 0,
              },
            ]
          : []),
        {
          accountId: note.customer.receivableAccountId,
          description,
          debitAmount: 0,
          creditAmount: Number(note.totalAmount),
        },
      ],
    });

    const posted = await this.postingService.post(journal.id);
    const postedAt = posted.postedAt ? new Date(posted.postedAt) : new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.creditNote.update({
        where: { id: note.id },
        data: {
          status: note.salesInvoiceId
            ? CreditNoteStatus.APPLIED
            : CreditNoteStatus.POSTED,
          journalEntryId: posted.id,
          postedAt,
        },
      });
      await tx.customer.update({
        where: { id: note.customerId },
        data: {
          currentBalance: {
            decrement: this.toAmount(Number(note.totalAmount)),
          },
        },
      });
      if (note.salesInvoiceId) {
        await this.recomputeInvoiceAmounts(tx, note.salesInvoiceId);
      }
    });

    const updated = await this.getCreditNoteOrThrow(id);
    return this.mapCreditNote(updated);
  }

  async listCustomerReceipts(query: ReceiptQuery = {}) {
    const search = query.search?.trim();
    const rows = await this.prisma.bankCashTransaction.findMany({
      where: {
        kind: BankCashTransactionKind.RECEIPT,
        customerId: query.customerId,
        OR: search
          ? [
              { reference: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } },
              { counterpartyName: { contains: search, mode: "insensitive" } },
            ]
          : undefined,
      },
      include: {
        customer: { select: { id: true, code: true, name: true } },
        bankCashAccount: {
          include: { account: { select: this.accountSummarySelect() } },
        },
        receiptAllocations: { select: { amount: true } },
        journalEntry: { select: { id: true, reference: true } },
      },
      orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
    });

    return rows.map((row) => {
      const allocatedAmount = row.receiptAllocations.reduce(
        (sum, item) => sum + Number(item.amount),
        0,
      );
      const unappliedAmount = Math.max(0, Number(row.amount) - allocatedAmount);
      return {
        id: row.id,
        reference: row.reference,
        status: row.status,
        receiptDate: row.transactionDate.toISOString(),
        amount: row.amount.toString(),
        allocatedAmount: allocatedAmount.toFixed(2),
        unappliedAmount: unappliedAmount.toFixed(2),
        settlementReference: row.description,
        journalEntryId: row.journalEntryId,
        journalReference: row.journalEntry?.reference ?? null,
        postedAt: row.postedAt?.toISOString() ?? null,
        customer: row.customer,
        bankCashAccount: row.bankCashAccount
          ? {
              id: row.bankCashAccount.id,
              name: row.bankCashAccount.name,
              type: row.bankCashAccount.type,
              currencyCode: row.bankCashAccount.currencyCode,
              account: row.bankCashAccount.account,
            }
          : null,
      };
    });
  }

  async createCustomerReceipt(dto: CreateCustomerReceiptDto) {
    const customer = await this.ensureActiveCustomer(dto.customerId);
    const created = await this.bankCashTransactionsService.createReceipt({
      reference: dto.reference,
      transactionDate: dto.receiptDate,
      amount: dto.amount,
      bankCashAccountId: dto.bankCashAccountId,
      counterAccountId: customer.receivableAccountId,
      counterpartyName: customer.name,
      description:
        dto.settlementReference?.trim() || dto.description?.trim() || undefined,
      customerId: customer.id,
    });

    const posted = await this.bankCashTransactionsService.post(created.id);
    await this.prisma.customer.update({
      where: { id: customer.id },
      data: {
        currentBalance: {
          decrement: this.toAmount(dto.amount),
        },
      },
    });

    return posted;
  }

  async allocateReceipt(dto: AllocateReceiptDto) {
    const invoice = await this.prisma.salesInvoice.findUnique({
      where: { id: dto.salesInvoiceId },
      include: { customer: true },
    });
    if (!invoice) {
      throw new BadRequestException("Sales invoice was not found.");
    }
    if (
      invoice.status === SalesInvoiceStatus.DRAFT ||
      invoice.status === SalesInvoiceStatus.CANCELLED
    ) {
      throw new BadRequestException(
        "Receipt allocation is only allowed for posted invoices.",
      );
    }

    const receipt = await this.prisma.bankCashTransaction.findUnique({
      where: { id: dto.receiptTransactionId },
    });
    if (!receipt) {
      throw new BadRequestException("Receipt transaction was not found.");
    }
    if (
      receipt.kind !== BankCashTransactionKind.RECEIPT ||
      receipt.status !== BankCashTransactionStatus.POSTED
    ) {
      throw new BadRequestException(
        "Only posted receipt transactions can be allocated.",
      );
    }
    if (receipt.customerId && receipt.customerId !== invoice.customerId) {
      throw new BadRequestException(
        "Receipts can only be allocated to invoices for the same customer.",
      );
    }

    const requestedAmount = Number(dto.amount.toFixed(2));
    const receiptAllocations = await this.prisma.receiptAllocation.findMany({
      where: { bankCashTransactionId: dto.receiptTransactionId },
      select: { amount: true },
    });
    const allocatedFromReceipt = receiptAllocations.reduce(
      (sum, item) => sum + Number(item.amount),
      0,
    );
    const receiptAvailable = Number(receipt.amount) - allocatedFromReceipt;
    if (requestedAmount > Number(receiptAvailable.toFixed(2))) {
      throw new BadRequestException(
        "Allocation amount exceeds available receipt balance.",
      );
    }

    await this.recomputeInvoiceAmounts(this.prisma, invoice.id);
    const refreshedInvoice = await this.prisma.salesInvoice.findUnique({
      where: { id: invoice.id },
    });
    if (!refreshedInvoice) {
      throw new BadRequestException("Sales invoice was not found.");
    }
    if (requestedAmount > Number(refreshedInvoice.outstandingAmount)) {
      throw new BadRequestException(
        "Allocation amount exceeds invoice outstanding balance.",
      );
    }

    const updatedAllocation = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.receiptAllocation.findUnique({
        where: {
          salesInvoiceId_bankCashTransactionId: {
            salesInvoiceId: invoice.id,
            bankCashTransactionId: dto.receiptTransactionId,
          },
        },
      });

      const allocation = existing
        ? await tx.receiptAllocation.update({
            where: { id: existing.id },
            data: {
              amount: this.toAmount(Number(existing.amount) + requestedAmount),
              allocatedAt: new Date(),
            },
          })
        : await tx.receiptAllocation.create({
            data: {
              salesInvoiceId: invoice.id,
              bankCashTransactionId: dto.receiptTransactionId,
              amount: this.toAmount(requestedAmount),
            },
          });

      const invoiceSummary = await this.recomputeInvoiceAmounts(tx, invoice.id);
      return { allocation, invoice: invoiceSummary };
    });

    await this.refreshSalesOrderStatus(invoice.sourceSalesOrderId ?? undefined);

    return {
      allocation: {
        id: updatedAllocation.allocation.id,
        salesInvoiceId: updatedAllocation.allocation.salesInvoiceId,
        receiptTransactionId:
          updatedAllocation.allocation.bankCashTransactionId,
        amount: updatedAllocation.allocation.amount.toString(),
        allocatedAt: updatedAllocation.allocation.allocatedAt.toISOString(),
      },
      invoice: updatedAllocation.invoice,
    };
  }

  async getCustomerBalance(customerId: string) {
    const customer = await this.getCustomerOrThrow(customerId);
    const outstanding = await this.prisma.salesInvoice.aggregate({
      where: {
        customerId,
        status: {
          in: [
            SalesInvoiceStatus.POSTED,
            SalesInvoiceStatus.PARTIALLY_PAID,
            SalesInvoiceStatus.FULLY_PAID,
            SalesInvoiceStatus.OVERDUE,
          ],
        },
      },
      _sum: { outstandingAmount: true },
    });
    const outstandingBalance = Number(outstanding._sum.outstandingAmount ?? 0);
    const currentBalance = Number(customer.currentBalance);
    const creditLimit = Number(customer.creditLimit);

    return {
      customerId: customer.id,
      customerCode: customer.code,
      customerName: customer.name,
      currentBalance: currentBalance.toFixed(2),
      outstandingBalance: outstandingBalance.toFixed(2),
      creditLimit: creditLimit.toFixed(2),
      availableCredit: (creditLimit - currentBalance).toFixed(2),
    };
  }

  async getCustomerTransactions(customerId: string) {
    await this.getCustomerOrThrow(customerId);

    const [invoices, creditNotes, allocations, receipts] = await Promise.all([
      this.prisma.salesInvoice.findMany({
        where: {
          customerId,
          status: {
            in: [
              SalesInvoiceStatus.POSTED,
              SalesInvoiceStatus.PARTIALLY_PAID,
              SalesInvoiceStatus.FULLY_PAID,
              SalesInvoiceStatus.OVERDUE,
            ],
          },
        },
        select: {
          id: true,
          reference: true,
          invoiceDate: true,
          totalAmount: true,
          allocatedAmount: true,
          outstandingAmount: true,
          description: true,
        },
      }),
      this.prisma.creditNote.findMany({
        where: {
          customerId,
          status: { in: [CreditNoteStatus.POSTED, CreditNoteStatus.APPLIED] },
        },
        select: {
          id: true,
          reference: true,
          noteDate: true,
          totalAmount: true,
          description: true,
          salesInvoiceId: true,
        },
      }),
      this.prisma.receiptAllocation.findMany({
        where: { salesInvoice: { customerId } },
        include: {
          salesInvoice: { select: { id: true, reference: true } },
          bankCashTransaction: {
            select: { id: true, reference: true, transactionDate: true },
          },
        },
      }),
      this.prisma.bankCashTransaction.findMany({
        where: {
          kind: BankCashTransactionKind.RECEIPT,
          status: BankCashTransactionStatus.POSTED,
          customerId,
        },
        select: {
          id: true,
          reference: true,
          transactionDate: true,
          amount: true,
          description: true,
        },
      }),
    ]);

    return [
      ...invoices.map((item) => ({
        type: "INVOICE",
        id: item.id,
        reference: item.reference,
        date: item.invoiceDate.toISOString(),
        amount: item.totalAmount.toString(),
        allocatedAmount: item.allocatedAmount.toString(),
        outstandingAmount: item.outstandingAmount.toString(),
        description: item.description,
      })),
      ...creditNotes.map((item) => ({
        type: "CREDIT_NOTE",
        id: item.id,
        reference: item.reference,
        date: item.noteDate.toISOString(),
        amount: item.totalAmount.toString(),
        linkedInvoiceId: item.salesInvoiceId,
        description: item.description,
      })),
      ...receipts.map((item) => ({
        type: "RECEIPT",
        id: item.id,
        reference: item.reference,
        date: item.transactionDate.toISOString(),
        amount: item.amount.toString(),
        description: item.description,
      })),
      ...allocations.map((item) => ({
        type: "RECEIPT_ALLOCATION",
        id: item.id,
        reference: item.bankCashTransaction.reference,
        date: item.allocatedAt.toISOString(),
        amount: item.amount.toString(),
        salesInvoiceId: item.salesInvoice.id,
        salesInvoiceReference: item.salesInvoice.reference,
      })),
    ].sort((a, b) => (a.date < b.date ? 1 : -1));
  }

  async getAgingReport(asOfDate?: string) {
    const asOf = asOfDate ? new Date(asOfDate) : new Date();
    if (Number.isNaN(asOf.getTime())) {
      throw new BadRequestException("Invalid aging date.");
    }

    const invoices = await this.prisma.salesInvoice.findMany({
      where: {
        status: {
          in: [
            SalesInvoiceStatus.POSTED,
            SalesInvoiceStatus.PARTIALLY_PAID,
            SalesInvoiceStatus.FULLY_PAID,
            SalesInvoiceStatus.OVERDUE,
          ],
        },
        outstandingAmount: { gt: 0 },
        invoiceDate: { lte: asOf },
      },
      include: { customer: { select: { id: true, code: true, name: true } } },
      orderBy: [
        { customerId: "asc" },
        { dueDate: "asc" },
        { invoiceDate: "asc" },
      ],
    });

    const byCustomer = new Map<
      string,
      {
        customerId: string;
        customerCode: string;
        customerName: string;
        current: number;
        bucket31To60: number;
        bucket61To90: number;
        over90: number;
        total: number;
      }
    >();

    for (const invoice of invoices) {
      const agingDate = invoice.dueDate ?? invoice.invoiceDate;
      const days = Math.floor(
        (asOf.getTime() - agingDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      const amount = Number(invoice.outstandingAmount);
      const currentRow = byCustomer.get(invoice.customerId) ?? {
        customerId: invoice.customer.id,
        customerCode: invoice.customer.code,
        customerName: invoice.customer.name,
        current: 0,
        bucket31To60: 0,
        bucket61To90: 0,
        over90: 0,
        total: 0,
      };

      if (days <= 30) {
        currentRow.current += amount;
      } else if (days <= 60) {
        currentRow.bucket31To60 += amount;
      } else if (days <= 90) {
        currentRow.bucket61To90 += amount;
      } else {
        currentRow.over90 += amount;
      }
      currentRow.total += amount;
      byCustomer.set(invoice.customerId, currentRow);
    }

    const rows = [...byCustomer.values()].map((row) => ({
      ...row,
      current: row.current.toFixed(2),
      bucket31To60: row.bucket31To60.toFixed(2),
      bucket61To90: row.bucket61To90.toFixed(2),
      over90: row.over90.toFixed(2),
      total: row.total.toFixed(2),
    }));

    const totals = rows.reduce(
      (acc, row) => {
        acc.current += Number(row.current);
        acc.bucket31To60 += Number(row.bucket31To60);
        acc.bucket61To90 += Number(row.bucket61To90);
        acc.over90 += Number(row.over90);
        acc.total += Number(row.total);
        return acc;
      },
      { current: 0, bucket31To60: 0, bucket61To90: 0, over90: 0, total: 0 },
    );

    return {
      asOfDate: asOf.toISOString(),
      rows,
      totals: {
        current: totals.current.toFixed(2),
        bucket31To60: totals.bucket31To60.toFixed(2),
        bucket61To90: totals.bucket61To90.toFixed(2),
        over90: totals.over90.toFixed(2),
        total: totals.total.toFixed(2),
      },
    };
  }

  private async getCustomerOrThrow(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: { receivableAccount: { select: this.accountSummarySelect() } },
    });
    if (!customer) {
      throw new BadRequestException(`Customer ${id} was not found.`);
    }
    return customer;
  }

  private async ensureActiveCustomer(id: string) {
    const customer = await this.getCustomerOrThrow(id);
    if (!customer.isActive) {
      throw new BadRequestException(
        "Deactivated customers cannot be selected for new transactions.",
      );
    }
    await this.ensureReceivableAccount(customer.receivableAccountId);
    return customer;
  }

  private async getQuotationOrThrow(id: string) {
    const quotation = await this.prisma.salesQuotation.findUnique({
      where: { id },
      include: this.quotationInclude(),
    });
    if (!quotation) {
      throw new BadRequestException(`Sales quotation ${id} was not found.`);
    }
    return quotation;
  }

  private async getSalesOrderOrThrow(id: string) {
    const order = await this.prisma.salesOrder.findUnique({
      where: { id },
      include: this.salesOrderInclude(),
    });
    if (!order) {
      throw new BadRequestException(`Sales order ${id} was not found.`);
    }
    return order;
  }

  private async getInvoiceOrThrow(id: string) {
    const invoice = await this.prisma.salesInvoice.findUnique({
      where: { id },
      include: this.invoiceInclude(),
    });
    if (!invoice) {
      throw new BadRequestException(`Sales invoice ${id} was not found.`);
    }
    return invoice;
  }

  private async getCreditNoteOrThrow(id: string) {
    const note = await this.prisma.creditNote.findUnique({
      where: { id },
      include: this.creditNoteInclude(),
    });
    if (!note) {
      throw new BadRequestException(`Credit note ${id} was not found.`);
    }
    return note;
  }

  private async resolveCustomerReceivableAccount(dto: CreateCustomerDto, db: SalesReceivablesDb) {
    if (!dto.receivableAccountLinkMode) {
      throw new BadRequestException("يرجى تحديد طريقة ربط حساب الذمم.");
    }

    if (dto.receivableAccountLinkMode === "EXISTING") {
      if (!dto.receivableAccountId) {
        throw new BadRequestException("يرجى اختيار حساب ذمم العميل قبل الحفظ.");
      }

      await this.ensureReceivableAccount(dto.receivableAccountId, db);
      return dto.receivableAccountId;
    }

    const parentAccount = await this.getCustomerReceivablesParentAccount(db);
    await db.accountSubtype.upsert({
      where: { name: CUSTOMER_AUTO_RECEIVABLE_SUBTYPE },
      create: { name: CUSTOMER_AUTO_RECEIVABLE_SUBTYPE, isActive: true },
      update: { isActive: true },
    });

    const account = await this.accountsService.createWithinTransaction(
      {
        name: dto.name.trim(),
        nameAr: dto.name.trim(),
        type: "ASSET",
        subtype: CUSTOMER_AUTO_RECEIVABLE_SUBTYPE,
        isPosting: true,
        allowManualPosting: true,
        currencyCode: parentAccount.currencyCode,
        parentAccountId: parentAccount.id,
      },
      db as never,
    );

    return account.id;
  }

  private async getCustomerReceivablesParentAccount(db: SalesReceivablesDb) {
    const existingAccount = await db.account.findUnique({
      where: { code: CUSTOMER_RECEIVABLES_PARENT_CODE },
      select: {
        id: true,
        code: true,
        type: true,
        isActive: true,
        isPosting: true,
        currencyCode: true,
      },
    });

    if (existingAccount) {
      if (!existingAccount.isActive || existingAccount.isPosting || existingAccount.type !== "ASSET") {
        throw new BadRequestException(
          "Customer receivables parent account must be an active Asset header account.",
        );
      }

      return existingAccount;
    }

    const receivablesHeader = await db.account.findUnique({
      where: { code: RECEIVABLES_HEADER_CODE },
      select: {
        id: true,
        type: true,
        isActive: true,
        isPosting: true,
        currencyCode: true,
      },
    });

    if (!receivablesHeader) {
      throw new BadRequestException(
        `Receivables header account ${RECEIVABLES_HEADER_CODE} was not found.`,
      );
    }
    if (!receivablesHeader.isActive || receivablesHeader.isPosting || receivablesHeader.type !== "ASSET") {
      throw new BadRequestException(
        "Receivables header account must be an active Asset header account.",
      );
    }

    return db.account.create({
      data: {
        code: CUSTOMER_RECEIVABLES_PARENT_CODE,
        name: "Customer Receivables",
        nameAr: "ذمم عملاء",
        type: "ASSET",
        isPosting: false,
        isActive: true,
        allowManualPosting: true,
        currencyCode: receivablesHeader.currencyCode,
        parentAccountId: receivablesHeader.id,
      },
      select: {
        id: true,
        code: true,
        type: true,
        isActive: true,
        isPosting: true,
        currencyCode: true,
      },
    });
  }

  private async ensureReceivableAccount(accountId: string, db: SalesReceivablesDb = this.prisma) {
    const account = await db.account.findUnique({
      where: { id: accountId },
      select: {
        id: true,
        type: true,
        isActive: true,
        isPosting: true,
        allowManualPosting: true,
        parentAccountId: true,
      },
    });

    if (!account) {
      throw new BadRequestException(`Account ${accountId} was not found.`);
    }
    if (
      !account.isActive ||
      !account.isPosting ||
      !account.allowManualPosting
    ) {
      throw new BadRequestException(
        "Receivable account must be an active posting account that allows manual posting.",
      );
    }
    if (account.type !== "ASSET") {
      throw new BadRequestException(
        "Receivable account must be an Asset account.",
      );
    }
    if (!(await this.isDescendantOfCustomerReceivables(account.id, db))) {
      throw new BadRequestException(
        "Receivable account must be under Customer Receivables.",
      );
    }
  }

  private async isDescendantOfCustomerReceivables(accountId: string, db: SalesReceivablesDb) {
    let current = await db.account.findUnique({
      where: { id: accountId },
      select: { id: true, code: true, parentAccountId: true },
    });

    while (current) {
      if (current.code === CUSTOMER_RECEIVABLES_PARENT_CODE) {
        return current.id !== accountId;
      }
      if (!current.parentAccountId) {
        return false;
      }
      current = await db.account.findUnique({
        where: { id: current.parentAccountId },
        select: { id: true, code: true, parentAccountId: true },
      });
    }

    return false;
  }

  private async ensureRevenueAccount(accountId: string) {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      select: {
        id: true,
        type: true,
        isActive: true,
        isPosting: true,
        allowManualPosting: true,
      },
    });

    if (!account) {
      throw new BadRequestException(
        `Revenue account ${accountId} was not found.`,
      );
    }
    if (
      !account.isActive ||
      !account.isPosting ||
      !account.allowManualPosting
    ) {
      throw new BadRequestException(
        "Revenue line account must be an active posting account.",
      );
    }
    if (account.type !== "REVENUE") {
      throw new BadRequestException("Sales lines must use revenue accounts.");
    }
  }

  private async resolveAndValidateLines(
    lines: SalesLineDto[],
    options: { requireRevenueAccount: boolean },
  ): Promise<ResolvedLine[]> {
    if (!lines.length) {
      throw new BadRequestException("At least one line is required.");
    }

    const resolved: ResolvedLine[] = [];
    const taxIds = Array.from(new Set(lines.map((line) => line.taxId?.trim()).filter(Boolean))) as string[];
    const taxes = taxIds.length
      ? await this.prisma.tax.findMany({ where: { id: { in: taxIds }, isActive: true }, select: { id: true, rate: true } })
      : [];
    const taxById = new Map(taxes.map((tax) => [tax.id, Number(tax.rate)]));

    for (const [index, rawLine] of lines.entries()) {
      const revenueAccountId = rawLine.revenueAccountId?.trim() || null;
      const taxId = rawLine.taxId?.trim() || null;
      if (taxId && !taxById.has(taxId)) {
        throw new BadRequestException(`Line ${index + 1} tax must reference an active tax.`);
      }

      if (options.requireRevenueAccount) {
        if (!revenueAccountId) {
          throw new BadRequestException(
            `Line ${index + 1} requires a revenue account.`,
          );
        }
        await this.ensureRevenueAccount(revenueAccountId);
      } else if (revenueAccountId) {
        await this.ensureRevenueAccount(revenueAccountId);
      }

      const quantity = rawLine.quantity ?? 1; // Default quantity to 1 if not provided
      const unitPrice = rawLine.unitPrice; //
      const discountAmount = rawLine.discountAmount ?? 0;
      const taxAmount = taxId ? 0 : rawLine.taxAmount ?? 0;
      const lineAmount = rawLine.lineAmount;

      if (quantity <= 0) {
        throw new BadRequestException(
          `Line ${index + 1} quantity must be greater than zero.`,
        );
      }
      if (discountAmount < 0 || taxAmount < 0) {
        throw new BadRequestException(
          `Line ${index + 1} discount and tax amounts cannot be negative.`,
        );
      }
      if (unitPrice === undefined && lineAmount === undefined) {
        throw new BadRequestException(
          `Line ${index + 1} requires unit price or line amount.`,
        );
      }

      const computedSubtotal =
        unitPrice !== undefined
          ? Number((quantity * unitPrice - discountAmount).toFixed(2))
          : undefined;
      const lineSubtotalAmount =
        computedSubtotal ??
        Number(((lineAmount as number) - taxAmount).toFixed(2));
      const computedTaxAmount = taxId
        ? Number((lineSubtotalAmount * ((taxById.get(taxId) ?? 0) / 100)).toFixed(2))
        : taxAmount;

      if (lineSubtotalAmount < 0) {
        throw new BadRequestException(
          `Line ${index + 1} discount cannot exceed the extended line amount.`,
        );
      }

      const finalLineTotalAmount =
        lineAmount !== undefined
          ? Number(lineAmount.toFixed(2))
          : Number((lineSubtotalAmount + taxAmount).toFixed(2));
      const finalUnitPrice =
        unitPrice !== undefined
          ? Number(unitPrice.toFixed(2))
          : Number(
              ((lineSubtotalAmount + discountAmount) / quantity).toFixed(2),
            );

      if (finalLineTotalAmount <= 0) {
        throw new BadRequestException(
          `Line ${index + 1} amount must be greater than zero.`,
        );
      }

      resolved.push({
        itemName: rawLine.itemName?.trim() || null,
        description: rawLine.description?.trim() || null,
        revenueAccountId: revenueAccountId,
        taxId,
        quantity: Number(quantity.toFixed(4)),
        unitPrice: finalUnitPrice,
        discountAmount: Number(discountAmount.toFixed(2)),
        taxAmount: Number(computedTaxAmount.toFixed(2)),
        lineSubtotalAmount: Number(lineSubtotalAmount.toFixed(2)),
        lineTotalAmount: taxId ? Number((lineSubtotalAmount + computedTaxAmount).toFixed(2)) : finalLineTotalAmount,
      });
    }

    return resolved;
  }

  private computeTotals(lines: ResolvedLine[]) {
    return lines.reduce(
      (acc, line) => {
        acc.subtotalAmount += line.lineSubtotalAmount;
        acc.discountAmount += line.discountAmount;
        acc.taxAmount += line.taxAmount;
        acc.totalAmount += line.lineTotalAmount;
        return acc;
      },
      { subtotalAmount: 0, discountAmount: 0, taxAmount: 0, totalAmount: 0 },
    );
  }

  private buildQuotationLineCreateInput(
    line: ResolvedLine,
    lineNumber: number,
  ): Prisma.SalesQuotationLineUncheckedCreateWithoutSalesQuotationInput {
    return {
      lineNumber,
      itemName: line.itemName,
      description: line.description,
      quantity: this.toQuantity(line.quantity),
      unitPrice: this.toAmount(line.unitPrice),
      discountAmount: this.toAmount(line.discountAmount),
      taxId: line.taxId,
      taxAmount: this.toAmount(line.taxAmount),
      lineSubtotalAmount: this.toAmount(line.lineSubtotalAmount),
      lineTotalAmount: this.toAmount(line.lineTotalAmount),
      revenueAccountId: line.revenueAccountId,
    };
  }

  private buildSalesOrderLineCreateInput(
    line: ResolvedLine,
    lineNumber: number,
  ): Prisma.SalesOrderLineUncheckedCreateWithoutSalesOrderInput {
    return {
      lineNumber,
      itemName: line.itemName,
      description: line.description,
      quantity: this.toQuantity(line.quantity),
      unitPrice: this.toAmount(line.unitPrice),
      discountAmount: this.toAmount(line.discountAmount),
      taxId: line.taxId,
      taxAmount: this.toAmount(line.taxAmount),
      lineSubtotalAmount: this.toAmount(line.lineSubtotalAmount),
      lineTotalAmount: this.toAmount(line.lineTotalAmount),
      revenueAccountId: line.revenueAccountId,
    };
  }

  private buildSalesInvoiceLineCreateInput(
    line: ResolvedLine,
    lineNumber: number,
  ): Prisma.SalesInvoiceLineUncheckedCreateWithoutSalesInvoiceInput {
    return {
      lineNumber,
      itemName: line.itemName,
      description: line.description,
      quantity: this.toQuantity(line.quantity),
      unitPrice: this.toAmount(line.unitPrice),
      discountAmount: this.toAmount(line.discountAmount),
      taxId: line.taxId,
      taxAmount: this.toAmount(line.taxAmount),
      lineSubtotalAmount: this.toAmount(line.lineSubtotalAmount),
      lineAmount: this.toAmount(line.lineTotalAmount),
      revenueAccountId: line.revenueAccountId!,
    };
  }

  private buildCreditNoteLineCreateInput(
    line: ResolvedLine,
    lineNumber: number,
  ): Prisma.CreditNoteLineUncheckedCreateWithoutCreditNoteInput {
    return {
      lineNumber,
      itemName: line.itemName,
      description: line.description,
      quantity: this.toQuantity(line.quantity),
      unitPrice: this.toAmount(line.unitPrice),
      discountAmount: this.toAmount(line.discountAmount),
      taxId: line.taxId,
      taxAmount: this.toAmount(line.taxAmount),
      lineSubtotalAmount: this.toAmount(line.lineSubtotalAmount),
      lineAmount: this.toAmount(line.lineTotalAmount),
      revenueAccountId: line.revenueAccountId!,
    };
  }

  private async ensureQuotationBelongsToCustomer(
    quotationId: string,
    customerId: string,
  ) {
    const quotation = await this.prisma.salesQuotation.findUnique({
      where: { id: quotationId },
    });
    if (!quotation) {
      throw new BadRequestException("Linked quotation was not found.");
    }
    if (quotation.customerId !== customerId) {
      throw new BadRequestException(
        "The selected quotation belongs to a different customer.",
      );
    }
  }

  private async ensureInvoiceSources(
    quotationId: string | undefined,
    salesOrderId: string | undefined,
    customerId: string,
  ) {
    if (quotationId) {
      await this.ensureQuotationBelongsToCustomer(quotationId, customerId);
    }
    if (salesOrderId) {
      const order = await this.prisma.salesOrder.findUnique({
        where: { id: salesOrderId },
      });
      if (!order) {
        throw new BadRequestException("Linked sales order was not found.");
      }
      if (order.customerId !== customerId) {
        throw new BadRequestException(
          "The selected sales order belongs to a different customer.",
        );
      }
    }
  }

  private async ensureCreditNoteInvoice(
    invoiceId: string | undefined,
    customerId: string,
  ) {
    if (!invoiceId) {
      return;
    }

    const invoice = await this.prisma.salesInvoice.findUnique({
      where: { id: invoiceId },
    });
    if (!invoice) {
      throw new BadRequestException("Linked invoice was not found.");
    }
    if (invoice.customerId !== customerId) {
      throw new BadRequestException(
        "Credit notes and linked invoices must use the same customer.",
      );
    }
  }

  private deriveDueDate(invoiceDate: Date, paymentTerms: string | null) {
    const days = this.parsePaymentTermsDays(paymentTerms);
    return new Date(invoiceDate.getTime() + days * 24 * 60 * 60 * 1000);
  }

  private parsePaymentTermsDays(paymentTerms: string | null) {
    if (!paymentTerms) {
      return 0;
    }
    const match = paymentTerms.match(/(\d+)/);
    return match ? Number(match[1]) : 0;
  }

  private deriveInvoiceStatus(
    totalAmount: number,
    allocatedAmount: number,
    dueDate: Date | null,
    asOf: Date,
  ) {
    const outstanding = Math.max(
      0,
      Number((totalAmount - allocatedAmount).toFixed(2)),
    );
    if (outstanding <= 0) {
      return SalesInvoiceStatus.FULLY_PAID;
    }
    if (allocatedAmount > 0) {
      return SalesInvoiceStatus.PARTIALLY_PAID;
    }
    if (dueDate && dueDate < asOf) {
      return SalesInvoiceStatus.OVERDUE;
    }
    return SalesInvoiceStatus.POSTED;
  }

  private async recomputeInvoiceAmounts(
    tx: Prisma.TransactionClient | PrismaService,
    invoiceId: string,
  ) {
    const invoice = await tx.salesInvoice.findUnique({
      where: { id: invoiceId },
      select: {
        id: true,
        reference: true,
        totalAmount: true,
        dueDate: true,
        sourceSalesOrderId: true,
        status: true,
      },
    });
    if (!invoice) {
      throw new BadRequestException(
        `Sales invoice ${invoiceId} was not found.`,
      );
    }

    const [creditNotes, allocations] = await Promise.all([
      tx.creditNote.aggregate({
        where: {
          salesInvoiceId: invoiceId,
          status: { in: [CreditNoteStatus.POSTED, CreditNoteStatus.APPLIED] },
        },
        _sum: { totalAmount: true },
      }),
      tx.receiptAllocation.aggregate({
        where: { salesInvoiceId: invoiceId },
        _sum: { amount: true },
      }),
    ]);

    const total = Number(invoice.totalAmount);
    const postedCredits = Number(creditNotes._sum.totalAmount ?? 0);
    const allocated = Number(allocations._sum.amount ?? 0);
    const baseOutstanding = Math.max(
      0,
      Number((total - postedCredits).toFixed(2)),
    );
    const outstanding = Math.max(
      0,
      Number((baseOutstanding - allocated).toFixed(2)),
    );
    const allocationStatus =
      allocated <= 0
        ? "UNALLOCATED"
        : outstanding <= 0
          ? "FULLY_ALLOCATED"
          : "PARTIAL";

    const nextStatus =
      invoice.status === SalesInvoiceStatus.DRAFT ||
      invoice.status === SalesInvoiceStatus.CANCELLED
        ? invoice.status
        : this.deriveInvoiceStatus(
            baseOutstanding,
            allocated,
            invoice.dueDate,
            new Date(),
          );

    const updated = await tx.salesInvoice.update({
      where: { id: invoiceId },
      data: {
        allocatedAmount: this.toAmount(allocated),
        outstandingAmount: this.toAmount(outstanding),
        allocationStatus,
        status: nextStatus,
      },
      select: {
        id: true,
        reference: true,
        totalAmount: true,
        allocatedAmount: true,
        outstandingAmount: true,
        allocationStatus: true,
        status: true,
      },
    });

    return {
      id: updated.id,
      reference: updated.reference,
      totalAmount: updated.totalAmount.toString(),
      allocatedAmount: updated.allocatedAmount.toString(),
      outstandingAmount: updated.outstandingAmount.toString(),
      allocationStatus: updated.allocationStatus,
      status: updated.status,
    };
  }

  private async refreshSalesOrderStatus(orderId: string | null | undefined) {
    if (!orderId) {
      return;
    }

    const order = await this.prisma.salesOrder.findUnique({
      where: { id: orderId },
      include: {
        salesInvoices: {
          where: { status: { not: SalesInvoiceStatus.CANCELLED } },
          select: { totalAmount: true, status: true },
        },
      },
    });
    if (!order || order.status === SalesOrderStatus.CANCELLED) {
      return;
    }

    const invoicedAmount = order.salesInvoices.reduce(
      (sum, invoice) => sum + Number(invoice.totalAmount),
      0,
    );
    const totalAmount = Number(order.totalAmount);
    const nextStatus =
      invoicedAmount <= 0
        ? order.status === SalesOrderStatus.DRAFT
          ? SalesOrderStatus.DRAFT
          : SalesOrderStatus.CONFIRMED
        : invoicedAmount >= totalAmount
          ? SalesOrderStatus.FULLY_INVOICED
          : SalesOrderStatus.PARTIALLY_INVOICED;

    if (nextStatus !== order.status) {
      await this.prisma.salesOrder.update({
        where: { id: orderId },
        data: { status: nextStatus },
      });
    }
  }

  private async getSalesTaxAccountId() {
    const account = await this.prisma.account.findFirst({
      where: {
        type: "LIABILITY",
        isActive: true,
        isPosting: true,
        allowManualPosting: true,
        OR: [
          { subtype: { contains: "tax", mode: "insensitive" } },
          { subtype: { contains: "vat", mode: "insensitive" } },
          { name: { contains: "tax", mode: "insensitive" } },
          { name: { contains: "vat", mode: "insensitive" } },
        ],
      },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });

    return account?.id ?? null;
  }

  private quotationInclude() {
    return {
      customer: {
        include: { receivableAccount: { select: this.accountSummarySelect() } },
      },
      lines: {
        include: { revenueAccount: { select: this.accountSummarySelect() } },
        orderBy: { lineNumber: "asc" },
      },
    } satisfies Prisma.SalesQuotationInclude;
  }

  private salesOrderInclude() {
    return {
      customer: {
        include: { receivableAccount: { select: this.accountSummarySelect() } },
      },
      sourceQuotation: { select: { id: true, reference: true } },
      salesInvoices: {
        select: { id: true, reference: true, totalAmount: true, status: true },
      },
      lines: {
        include: { revenueAccount: { select: this.accountSummarySelect() } },
        orderBy: { lineNumber: "asc" },
      },
    } satisfies Prisma.SalesOrderInclude;
  }

  private invoiceInclude() {
    return {
      customer: {
        include: { receivableAccount: { select: this.accountSummarySelect() } },
      },
      sourceQuotation: { select: { id: true, reference: true } },
      sourceSalesOrder: { select: { id: true, reference: true } },
      lines: {
        include: { revenueAccount: { select: this.accountSummarySelect() } },
        orderBy: { lineNumber: "asc" },
      },
      journalEntry: { select: { id: true, reference: true } },
    } satisfies Prisma.SalesInvoiceInclude;
  }

  private creditNoteInclude() {
    return {
      customer: {
        include: { receivableAccount: { select: this.accountSummarySelect() } },
      },
      salesInvoice: { select: { id: true, reference: true } },
      lines: {
        include: { revenueAccount: { select: this.accountSummarySelect() } },
        orderBy: { lineNumber: "asc" },
      },
      journalEntry: { select: { id: true, reference: true } },
    } satisfies Prisma.CreditNoteInclude;
  }

  private mapQuotation(row: any) {
    const effectiveStatus =
      row.status === QuotationStatus.APPROVED &&
      row.validityDate < this.startOfToday()
        ? QuotationStatus.EXPIRED
        : row.status;

    return {
      id: row.id,
      reference: row.reference,
      status: effectiveStatus,
      quotationDate: row.quotationDate.toISOString(),
      validityDate: row.validityDate.toISOString(),
      currencyCode: row.currencyCode,
      description: row.description,
      subtotalAmount: row.subtotalAmount.toString(),
      discountAmount: row.discountAmount.toString(),
      taxAmount: row.taxAmount.toString(),
      totalAmount: row.totalAmount.toString(),
      convertedAt: row.convertedAt?.toISOString() ?? null,
      customer: {
        id: row.customer.id,
        code: row.customer.code,
        name: row.customer.name,
        isActive: row.customer.isActive,
        paymentTerms: row.customer.paymentTerms,
        creditLimit: row.customer.creditLimit.toString(),
        currentBalance: row.customer.currentBalance.toString(),
        receivableAccount: row.customer.receivableAccount,
      },
      lines: row.lines.map((line: any) => this.mapDocumentLine(line)),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private mapSalesOrder(row: any) {
    return {
      id: row.id,
      reference: row.reference,
      status: row.status,
      orderDate: row.orderDate.toISOString(),
      promisedDate: row.promisedDate?.toISOString() ?? null,
      currencyCode: row.currencyCode,
      shippingDetails: row.shippingDetails,
      description: row.description,
      subtotalAmount: row.subtotalAmount.toString(),
      discountAmount: row.discountAmount.toString(),
      taxAmount: row.taxAmount.toString(),
      totalAmount: row.totalAmount.toString(),
      sourceQuotation: row.sourceQuotation ?? null,
      customer: {
        id: row.customer.id,
        code: row.customer.code,
        name: row.customer.name,
        isActive: row.customer.isActive,
        paymentTerms: row.customer.paymentTerms,
        creditLimit: row.customer.creditLimit.toString(),
        currentBalance: row.customer.currentBalance.toString(),
        receivableAccount: row.customer.receivableAccount,
      },
      salesInvoices: row.salesInvoices.map((invoice: any) => ({
        ...invoice,
        totalAmount: invoice.totalAmount.toString(),
      })),
      lines: row.lines.map((line: any) => this.mapDocumentLine(line)),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private mapInvoice(row: any) {
    return {
      id: row.id,
      reference: row.reference,
      status: row.status,
      invoiceDate: row.invoiceDate.toISOString(),
      dueDate: row.dueDate?.toISOString() ?? null,
      currencyCode: row.currencyCode,
      description: row.description,
      subtotalAmount: row.subtotalAmount.toString(),
      discountAmount: row.discountAmount.toString(),
      taxAmount: row.taxAmount.toString(),
      totalAmount: row.totalAmount.toString(),
      allocatedAmount: row.allocatedAmount.toString(),
      outstandingAmount: row.outstandingAmount.toString(),
      allocationStatus: row.allocationStatus,
      postedAt: row.postedAt?.toISOString() ?? null,
      journalEntryId: row.journalEntryId,
      journalReference: row.journalEntry?.reference ?? null,
      sourceQuotation: row.sourceQuotation ?? null,
      sourceSalesOrder: row.sourceSalesOrder ?? null,
      customer: {
        id: row.customer.id,
        code: row.customer.code,
        name: row.customer.name,
        isActive: row.customer.isActive,
        paymentTerms: row.customer.paymentTerms,
        creditLimit: row.customer.creditLimit.toString(),
        currentBalance: row.customer.currentBalance.toString(),
        receivableAccount: row.customer.receivableAccount,
      },
      lines: row.lines.map((line: any) => this.mapDocumentLine(line)),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private mapCreditNote(row: any) {
    return {
      id: row.id,
      reference: row.reference,
      status: row.status,
      noteDate: row.noteDate.toISOString(),
      currencyCode: row.currencyCode,
      description: row.description,
      subtotalAmount: row.subtotalAmount.toString(),
      discountAmount: row.discountAmount.toString(),
      taxAmount: row.taxAmount.toString(),
      totalAmount: row.totalAmount.toString(),
      postedAt: row.postedAt?.toISOString() ?? null,
      journalEntryId: row.journalEntryId,
      journalReference: row.journalEntry?.reference ?? null,
      linkedInvoice: row.salesInvoice ?? null,
      customer: {
        id: row.customer.id,
        code: row.customer.code,
        name: row.customer.name,
        isActive: row.customer.isActive,
        paymentTerms: row.customer.paymentTerms,
        creditLimit: row.customer.creditLimit.toString(),
        currentBalance: row.customer.currentBalance.toString(),
        receivableAccount: row.customer.receivableAccount,
      },
      lines: row.lines.map((line: any) => this.mapDocumentLine(line)),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private mapDocumentLine(line: any) {
    return {
      id: line.id,
      lineNumber: line.lineNumber,
      itemName: line.itemName,
      description: line.description,
      quantity: line.quantity.toString(),
      unitPrice: line.unitPrice.toString(),
      discountAmount: line.discountAmount.toString(),
      taxId: line.taxId ?? null,
      taxAmount: line.taxAmount.toString(),
      lineSubtotalAmount: line.lineSubtotalAmount.toString(),
      lineAmount: (line.lineAmount ?? line.lineTotalAmount).toString(),
      revenueAccount: line.revenueAccount ?? null,
    };
  }

  private accountSummarySelect() {
    return {
      id: true,
      code: true,
      name: true,
      type: true,
      currencyCode: true,
      isActive: true,
      isPosting: true,
    };
  }

  private parseQuotationStatus(status?: string): QuotationStatus | undefined {
    if (!status) {
      return undefined;
    }
    if (status in QuotationStatus) {
      return status as QuotationStatus;
    }
    throw new BadRequestException("Invalid quotation status.");
  }

  private parseSalesOrderStatus(status?: string): SalesOrderStatus | undefined {
    if (!status) {
      return undefined;
    }
    if (status in SalesOrderStatus) {
      return status as SalesOrderStatus;
    }
    throw new BadRequestException("Invalid sales order status.");
  }

  private parseSalesInvoiceStatus(
    status?: string,
  ): SalesInvoiceStatus | undefined {
    if (!status) {
      return undefined;
    }
    if (status in SalesInvoiceStatus) {
      return status as SalesInvoiceStatus;
    }
    throw new BadRequestException("Invalid sales invoice status.");
  }

  private parseCreditNoteStatus(status?: string): CreditNoteStatus | undefined {
    if (!status) {
      return undefined;
    }
    if (status in CreditNoteStatus) {
      return status as CreditNoteStatus;
    }
    throw new BadRequestException("Invalid credit note status.");
  }

  private dateRangeFilter(dateFrom?: string, dateTo?: string) {
    return dateFrom || dateTo
      ? {
          gte: dateFrom ? new Date(dateFrom) : undefined,
          lte: dateTo ? new Date(dateTo) : undefined,
        }
      : undefined;
  }

  private toAmount(value: number) {
    return Number(value).toFixed(2);
  }

  private toQuantity(value: number) {
    return Number(value).toFixed(4);
  }

  private generateReference(prefix: string) {
    const compactDate = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const suffix =
      `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase();
    return `${prefix}-${compactDate}-${suffix}`;
  }

  private startOfToday() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  private isUniqueConflict(error: unknown, field: string) {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002" &&
      Array.isArray(error.meta?.target) &&
      error.meta.target.includes(field)
    );
  }
}
