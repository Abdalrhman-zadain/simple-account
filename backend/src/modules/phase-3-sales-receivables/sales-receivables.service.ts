import {
  BadRequestException,
  ConflictException,
  Injectable,
} from "@nestjs/common";
import {
  AuditAction,
  BankCashTransactionKind,
  BankCashTransactionStatus,
  CreditNoteStatus,
  InventoryStockMovementType,
  Prisma,
  QuotationStatus,
  SalesInvoiceStatus,
  SalesOrderStatus,
  SalesRepStatus,
} from "../../generated/prisma";

import { PrismaService } from "../../common/prisma/prisma.service";
import { AuditService } from "../phase-1-accounting-foundation/accounting-core/audit/audit.service";
import { BankCashTransactionsService } from "../phase-2-bank-cash-management/bank-cash-transactions/bank-cash-transactions.service";
import { AccountsService } from "../phase-1-accounting-foundation/accounting-core/chart-of-accounts/accounts.service";
import { JournalEntriesService } from "../phase-1-accounting-foundation/accounting-core/journal-entries/journal-entries.service";
import { PostingService } from "../phase-1-accounting-foundation/accounting-core/posting-logic/posting.service";
import { InventoryPostingService } from "../phase-5-inventory-management/inventory/shared/inventory-posting.service";
import {
  AllocateReceiptDto,
  CreateCreditNoteDto,
  CreateCustomerDto,
  CreateCustomerReceiptDto,
  PostSalesInvoiceDto,
  CreateSalesRepresentativeDto,
  CreateSalesInvoiceDto,
  CreateSalesOrderDto,
  CreateSalesQuotationDto,
  SalesLineDto,
  UpdateCreditNoteDto,
  UpdateCustomerDto,
  UpdateSalesRepresentativeDto,
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
type AuthUser = { userId?: string; email?: string; role?: string };

const CUSTOMER_RECEIVABLES_PARENT_CODE = "1121000";
const RECEIVABLES_HEADER_CODE = "1120000";
const EMPLOYEE_PAYABLES_PARENT_CODE = "2130000";
const CUSTOMER_AUTO_RECEIVABLE_SUBTYPE = "Current Assets";

type ResolvedLine = {
  itemId: string | null;
  warehouseId: string | null;
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
    private readonly auditService: AuditService,
    private readonly bankCashTransactionsService: BankCashTransactionsService,
    private readonly accountsService: AccountsService,
    private readonly journalEntriesService: JournalEntriesService,
    private readonly postingService: PostingService,
    private readonly inventoryPostingService: InventoryPostingService,
  ) {}

  async listCustomers(query: { isActive?: string; search?: string; salesRepId?: string } = {}) {
    const search = query.search?.trim();
    return this.prisma.customer.findMany({
      where: {
        salesRepId: query.salesRepId?.trim() || undefined,
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
              { taxTreatment: { code: { contains: search, mode: "insensitive" } } },
              { taxTreatment: { arabicName: { contains: search, mode: "insensitive" } } },
              { taxTreatment: { englishName: { contains: search, mode: "insensitive" } } },
              {
                salesRepresentative: { contains: search, mode: "insensitive" },
              },
              { salesRep: { name: { contains: search, mode: "insensitive" } } },
              { salesRep: { code: { contains: search, mode: "insensitive" } } },
            ]
          : undefined,
      },
      include: this.customerInclude(),
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    });
  }

  async createCustomer(dto: CreateCustomerDto) {
    return await this.prisma.$transaction(async (tx) => {
      const code = dto.code?.trim() || (await this.generateSequentialCustomerCode(tx));

      try {
        if (dto.receivableAccountLinkMode === "AUTO" && !dto.name?.trim()) {
          throw new BadRequestException("يرجى إدخال اسم العميل قبل إنشاء حساب ذمم تلقائي.");
        }
        await this.ensureUniqueCustomerName(dto.name, tx);
        const receivableAccountId = await this.resolveCustomerReceivableAccount(dto, tx);
        const salesRep = await this.resolveActiveSalesRep(dto.salesRepId, tx);
        const taxTreatmentId = await this.resolveActiveTaxTreatment(dto.taxTreatmentId, tx);

        return await tx.customer.create({
          data: {
            code,
            name: dto.name.trim(),
            contactInfo: dto.contactInfo?.trim() || null,
            taxTreatmentId,
            salesRepresentative: salesRep?.name ?? dto.salesRepresentative?.trim() ?? null,
            salesRepId: salesRep?.id ?? null,
            paymentTerms: dto.paymentTerms?.trim() || null,
            creditLimit: this.toAmount(dto.creditLimit),
            receivableAccountId,
          },
          include: this.customerInclude(),
        });
      } catch (error) {
        if (this.isUniqueConflict(error, "code")) {
          throw new ConflictException(`رمز العميل "${code}" مستخدم بالفعل.`);
        }
        throw error;
      }
    });
  }

  private async generateSequentialCustomerCode(tx?: any) {
    const prisma = tx || this.prisma;
    const lastCustomer = await prisma.customer.findFirst({
      where: { code: { startsWith: "CUS-" } },
      orderBy: { code: "desc" },
      select: { code: true },
    });

    if (!lastCustomer) {
      return "CUS-000001";
    }

    const lastNumberStr = lastCustomer.code.replace("CUS-", "");
    const lastNumber = parseInt(lastNumberStr, 10);
    if (isNaN(lastNumber)) {
      return "CUS-000001";
    }

    const nextNumber = lastNumber + 1;
    return `CUS-${nextNumber.toString().padStart(6, "0")}`;
  }

  async updateCustomer(id: string, dto: UpdateCustomerDto) {
    const current = await this.getCustomerOrThrow(id);
    if (!current.isActive) {
      throw new BadRequestException("Deactivated customers cannot be edited.");
    }
    if (dto.receivableAccountId) {
      await this.ensureReceivableAccount(dto.receivableAccountId);
    }
    const salesRep = await this.resolveActiveSalesRep(dto.salesRepId, this.prisma);
    const taxTreatmentId =
      dto.taxTreatmentId === undefined
        ? current.taxTreatmentId
        : await this.resolveActiveTaxTreatment(dto.taxTreatmentId, this.prisma);
    if (dto.name !== undefined) {
      await this.ensureUniqueCustomerName(dto.name, this.prisma, id);
    }
    const salesRepresentative =
      salesRep
        ? salesRep.name
        : dto.salesRepId === ""
          ? null
          : dto.salesRepresentative === undefined
            ? undefined
            : dto.salesRepresentative.trim() || null;

    return this.prisma.customer.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        contactInfo:
          dto.contactInfo === undefined
            ? undefined
            : dto.contactInfo.trim() || null,
        taxTreatmentId,
        salesRepresentative,
        salesRepId:
          dto.salesRepId === undefined
            ? undefined
            : salesRep?.id ?? null,
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
      include: this.customerInclude(),
    });
  }

  async deactivateCustomer(id: string) {
    await this.getCustomerOrThrow(id);
    return this.prisma.customer.update({
      where: { id },
      data: { isActive: false },
      include: this.customerInclude(),
    });
  }

  async listSalesRepresentatives(query: { status?: string; search?: string } = {}) {
    const search = query.search?.trim();
    return this.prisma.salesRepresentative.findMany({
      where: {
        status: this.parseSalesRepStatus(query.status),
        OR: search
          ? [
              { code: { contains: search, mode: "insensitive" } },
              { name: { contains: search, mode: "insensitive" } },
              { phone: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ]
          : undefined,
      },
      include: this.salesRepInclude(),
      orderBy: [{ status: "asc" }, { name: "asc" }],
    });
  }

  async createSalesRepresentative(dto: CreateSalesRepresentativeDto) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const employeeReceivableAccountId = await this.resolveSalesRepEmployeeReceivableAccount(dto, tx);

        return tx.salesRepresentative.create({
          data: {
            code: dto.code?.trim() || this.generateReference("REP"),
            name: dto.name.trim(),
            phone: dto.phone?.trim() || null,
            email: dto.email?.trim() || null,
            defaultCommissionRate: this.toAmount(dto.defaultCommissionRate ?? 0),
            employeeReceivableAccountId,
            status: dto.status as SalesRepStatus,
          },
          include: this.salesRepInclude(),
        });
      });
    } catch (error) {
      if (this.isUniqueConflict(error, "code")) {
        throw new ConflictException("A sales representative with this code already exists.");
      }
      throw error;
    }
  }

  async updateSalesRepresentative(id: string, dto: UpdateSalesRepresentativeDto) {
    const current = await this.getSalesRepOrThrow(id);
    if (current.status === SalesRepStatus.INACTIVE && dto.status !== SalesRepStatus.ACTIVE) {
      throw new BadRequestException("Inactive sales representatives cannot be edited unless reactivated.");
    }

    return this.prisma.$transaction(async (tx) => {
      const employeeReceivableAccountId = await this.resolveSalesRepEmployeeReceivableAccount(dto, tx, {
        preserveWhenMissing: true,
      });

      return tx.salesRepresentative.update({
        where: { id },
        data: {
          name: dto.name === undefined ? undefined : dto.name.trim(),
          phone: dto.phone === undefined ? undefined : dto.phone.trim() || null,
          email: dto.email === undefined ? undefined : dto.email.trim() || null,
          defaultCommissionRate:
            dto.defaultCommissionRate === undefined
              ? undefined
              : this.toAmount(dto.defaultCommissionRate),
          employeeReceivableAccountId,
          status: dto.status as SalesRepStatus | undefined,
        },
        include: this.salesRepInclude(),
      });
    });
  }

  async deactivateSalesRepresentative(id: string) {
    await this.getSalesRepOrThrow(id);
    return this.prisma.salesRepresentative.update({
      where: { id },
      data: { status: SalesRepStatus.INACTIVE },
      include: this.salesRepInclude(),
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

  async createInvoice(dto: CreateSalesInvoiceDto, user?: AuthUser) {
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

      await this.auditService.log({
        userId: user?.userId,
        entity: "SalesInvoice",
        entityId: created.id,
        action: AuditAction.CREATE,
        details: {
          reference: created.reference,
          status: created.status,
          savedAsDraft: true,
          sourceAction: "SAVE_DRAFT",
        },
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

  async updateInvoice(id: string, dto: UpdateSalesInvoiceDto, user?: AuthUser) {
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

      await this.auditService.log({
        userId: user?.userId,
        entity: "SalesInvoice",
        entityId: updated.id,
        action: AuditAction.UPDATE,
        details: {
          reference: updated.reference,
          status: updated.status,
          savedAsDraft: updated.status === SalesInvoiceStatus.DRAFT,
          sourceAction: "SAVE_DRAFT",
        },
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

  async postInvoice(id: string, dto: PostSalesInvoiceDto = {}, user?: AuthUser) {
    const existingInvoice = await this.prisma.salesInvoice.findUnique({
      where: { id },
      include: {
        customer: { include: { receivableAccount: true } },
        lines: {
          include: {
            item: {
              select: {
                id: true,
                code: true,
                name: true,
                type: true,
                trackInventory: true,
                inventoryAccountId: true,
                cogsAccountId: true,
                isActive: true,
              },
            },
          },
          orderBy: { lineNumber: "asc" },
        },
      },
    });
    if (!existingInvoice) {
      throw new BadRequestException(`Sales invoice ${id} was not found.`);
    }
    if (existingInvoice.journalEntryId) {
      throw new BadRequestException("Sales invoice is already posted.");
    }
    if (existingInvoice.status !== SalesInvoiceStatus.DRAFT) {
      throw new BadRequestException("Only draft invoices can be posted.");
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const invoice = await tx.salesInvoice.findUnique({
        where: { id },
        include: {
          customer: { include: { receivableAccount: true } },
          lines: {
            include: {
              item: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  type: true,
                  trackInventory: true,
                  inventoryAccountId: true,
                  cogsAccountId: true,
                  isActive: true,
                },
              },
            },
            orderBy: { lineNumber: "asc" },
          },
        },
      });
      if (!invoice) {
        throw new BadRequestException(`Sales invoice ${id} was not found.`);
      }
      if (invoice.journalEntryId || invoice.status !== SalesInvoiceStatus.DRAFT) {
        throw new BadRequestException("Sales invoice is already posted.");
      }
      if (!invoice.customerId) {
        throw new BadRequestException("Customer is required.");
      }
      if (!invoice.invoiceDate) {
        throw new BadRequestException("Invoice date is required.");
      }
      if (!invoice.currencyCode?.trim()) {
        throw new BadRequestException("Currency is required.");
      }
      if (!invoice.customer.isActive) {
        throw new BadRequestException(
          "Deactivated customers cannot be selected for new transactions.",
        );
      }
      if (!invoice.customer.receivableAccountId) {
        throw new BadRequestException("Customer receivable account is not configured.");
      }
      if (!invoice.lines.length) {
        throw new BadRequestException("At least one invoice line is required.");
      }

      for (const line of invoice.lines) {
        if (!line.itemName?.trim() && !line.description?.trim() && !line.itemId) {
          throw new BadRequestException(
            `Line ${line.lineNumber} requires an item/service or description.`,
          );
        }
        if (Number(line.quantity) <= 0) {
          throw new BadRequestException(`Quantity must be greater than zero for line ${line.lineNumber}.`);
        }
        if (Number(line.unitPrice) < 0) {
          throw new BadRequestException(`Unit price must be greater than or equal to zero for line ${line.lineNumber}.`);
        }
        if (!line.revenueAccountId) {
          throw new BadRequestException(`Revenue account is required for line ${line.lineNumber}.`);
        }
        if (this.lineTracksInventory(line.item)) {
          if (!line.item?.isActive) {
            throw new BadRequestException(
              `Line ${line.lineNumber} inventory item must reference an active item.`,
            );
          }
          if (!line.warehouseId) {
            throw new BadRequestException(
              `Warehouse is required for inventory item line ${line.lineNumber}.`,
            );
          }
        }
      }

      const totalAmount = Number(invoice.totalAmount);
      if (totalAmount <= 0) {
        throw new BadRequestException(
          "Sales invoices require a total amount greater than zero.",
        );
      }
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
      const inventoryPosting = await this.applySalesInvoiceInventoryPosting(
        tx,
        invoice,
      );
      const journalLines = await this.buildSalesInvoiceJournalLines(tx, invoice, description);
      journalLines.push(...inventoryPosting.accountingLines);
      this.ensureBalancedJournal(journalLines);

      const journal = await this.journalEntriesService.create(
        {
          entryDate: invoice.invoiceDate.toISOString(),
          description,
          lines: journalLines,
        },
        { tx },
      );

      const posted = await this.postingService.post(journal.id, tx as never);
      const postedAt = posted.postedAt ? new Date(posted.postedAt) : new Date();
      const nextStatus = this.deriveInvoiceStatus(totalAmount, 0, invoice.dueDate, postedAt);

      await tx.salesInvoice.update({
        where: { id: invoice.id },
        data: {
          status: nextStatus,
          journalEntryId: posted.id,
          postedAt,
        },
      });
      await tx.customer.update({
        where: { id: invoice.customerId },
        data: { currentBalance: { increment: this.toAmount(totalAmount) } },
      });
      await this.recomputeInvoiceAmounts(tx, invoice.id);

      return {
        invoiceId: invoice.id,
        invoiceReference: invoice.reference,
        sourceSalesOrderId: invoice.sourceSalesOrderId,
        journalEntryId: posted.id,
        status: nextStatus,
      };
    });

    await this.auditService.log({
      userId: user?.userId,
      entity: "SalesInvoice",
      entityId: result.invoiceId,
      action: AuditAction.POST,
      details: {
        reference: result.invoiceReference,
        status: result.status,
        journalEntryId: result.journalEntryId,
        sourceAction: dto.sourceAction ?? "STANDARD_POST",
      },
    });

    await this.refreshSalesOrderStatus(result.sourceSalesOrderId ?? undefined);
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

    return rows.map((row) => this.mapCustomerReceiptTransaction(row));
  }

  async createCustomerReceipt(dto: CreateCustomerReceiptDto, user?: AuthUser) {
    if (!dto.customerId) {
      throw new BadRequestException("Customer is required.");
    }
    if (!dto.receiptDate) {
      throw new BadRequestException("Receipt date is required.");
    }
    if (dto.amount <= 0) {
      throw new BadRequestException("Receipt amount must be greater than zero.");
    }
    if (!dto.bankCashAccountId) {
      throw new BadRequestException("Bank/Cash account is required to post the receipt.");
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findUnique({
        where: { id: dto.customerId },
        include: { receivableAccount: true },
      });
      if (!customer || !customer.isActive) {
        throw new BadRequestException("Customer is required.");
      }
      if (!customer.receivableAccountId) {
        throw new BadRequestException("Customer receivable account is not configured.");
      }

      const bankCashAccount = await tx.bankCashAccount.findUnique({
        where: { id: dto.bankCashAccountId },
        include: {
          account: {
            select: {
              id: true,
              code: true,
              name: true,
              currencyCode: true,
              isActive: true,
              isPosting: true,
            },
          },
        },
      });
      if (!bankCashAccount || !bankCashAccount.isActive || !bankCashAccount.account.isActive || !bankCashAccount.account.isPosting) {
        throw new BadRequestException("Bank/Cash account is required to post the receipt.");
      }

      const reference = dto.reference?.trim() || this.generateReference("RCPT");
      const description = dto.settlementReference?.trim() || dto.description?.trim() || null;
      const amount = Number(dto.amount.toFixed(2));

      const created = await tx.bankCashTransaction.create({
        data: {
          kind: BankCashTransactionKind.RECEIPT,
          status: BankCashTransactionStatus.DRAFT,
          reference,
          transactionDate: new Date(dto.receiptDate),
          amount: this.toAmount(amount),
          customerId: customer.id,
          bankCashAccountId: bankCashAccount.id,
          counterAccountId: customer.receivableAccountId,
          counterpartyName: customer.name,
          description,
        },
        include: {
          customer: { select: { id: true, code: true, name: true } },
          bankCashAccount: {
            include: { account: { select: this.accountSummarySelect() } },
          },
        },
      });

      const journalLines = [
        {
          accountId: bankCashAccount.account.id,
          description: description ?? reference,
          debitAmount: amount,
          creditAmount: 0,
        },
        {
          accountId: customer.receivableAccountId,
          description: description ?? reference,
          debitAmount: 0,
          creditAmount: amount,
        },
      ];
      this.ensureBalancedJournal(journalLines);

      const journal = await this.journalEntriesService.create(
        {
          entryDate: new Date(dto.receiptDate).toISOString(),
          description: description ?? reference,
          lines: journalLines,
        },
        { tx },
      );
      const postedJournal = await this.postingService.post(journal.id, tx as never);
      const postedAt = postedJournal.postedAt ? new Date(postedJournal.postedAt) : new Date();

      const updatedReceipt = await tx.bankCashTransaction.update({
        where: { id: created.id },
        data: {
          status: BankCashTransactionStatus.POSTED,
          journalEntryId: postedJournal.id,
          postedAt,
        },
        include: {
          customer: { select: { id: true, code: true, name: true } },
          bankCashAccount: {
            include: { account: { select: this.accountSummarySelect() } },
          },
          receiptAllocations: { select: { amount: true } },
          journalEntry: { select: { id: true, reference: true } },
        },
      });

      await tx.customer.update({
        where: { id: customer.id },
        data: {
          currentBalance: {
            decrement: this.toAmount(amount),
          },
        },
      });

      let allocationResult: Awaited<ReturnType<SalesReceivablesService["recomputeInvoiceAmounts"]>> | null = null;
      let allocationId: string | null = null;
      let linkedInvoiceReference: string | null = null;
      if (dto.linkedInvoiceId) {
        const linkedInvoice = await tx.salesInvoice.findUnique({
          where: { id: dto.linkedInvoiceId },
          select: {
            id: true,
            customerId: true,
            reference: true,
            outstandingAmount: true,
            sourceSalesOrderId: true,
          },
        });
        if (!linkedInvoice) {
          throw new BadRequestException("Linked invoice was not found.");
        }
        if (linkedInvoice.customerId !== customer.id) {
          throw new BadRequestException("Receipt and linked invoice must belong to the same customer.");
        }
        if (Number(linkedInvoice.outstandingAmount) <= 0) {
          throw new BadRequestException("Linked invoice does not have any outstanding balance.");
        }

        const requestedAllocation = Number(
          (dto.allocationAmount ?? Math.min(amount, Number(linkedInvoice.outstandingAmount))).toFixed(2),
        );
        if (requestedAllocation > amount) {
          throw new BadRequestException("Allocation amount cannot be greater than the receipt amount.");
        }
        if (requestedAllocation > Number(linkedInvoice.outstandingAmount)) {
          throw new BadRequestException("Allocation amount exceeds invoice outstanding balance.");
        }

        if (requestedAllocation > 0) {
          const allocation = await tx.receiptAllocation.create({
            data: {
              salesInvoiceId: linkedInvoice.id,
              bankCashTransactionId: created.id,
              amount: this.toAmount(requestedAllocation),
            },
          });
          allocationId = allocation.id;
          linkedInvoiceReference = linkedInvoice.reference;
          allocationResult = await this.recomputeInvoiceAmounts(tx, linkedInvoice.id);
        }
      }

      return {
        receipt: updatedReceipt,
        allocationResult,
        allocationId,
        linkedInvoiceReference,
      };
    });

    await this.auditService.log({
      userId: user?.userId,
      entity: "CustomerReceipt",
      entityId: result.receipt.id,
      action: AuditAction.POST,
      details: {
        reference: result.receipt.reference,
        amount: result.receipt.amount.toString(),
        customerId: result.receipt.customer?.id ?? dto.customerId,
        linkedInvoiceId: dto.linkedInvoiceId ?? null,
        sourceAction: dto.sourceAction ?? "STANDARD_RECEIPT",
        journalEntryId: result.receipt.journalEntryId ?? null,
        allocationId: result.allocationId,
      },
    });

    if (dto.linkedInvoiceId && result.receipt.id) {
      await this.auditService.log({
        userId: user?.userId,
        entity: "SalesInvoice",
        entityId: dto.linkedInvoiceId,
        action: AuditAction.UPDATE,
        details: {
          receiptTransactionId: result.receipt.id,
          receiptReference: result.receipt.reference,
          linkedInvoiceReference: result.linkedInvoiceReference,
          allocationId: result.allocationId,
        },
      });
    }

    return this.mapCustomerReceiptTransaction(result.receipt);
  }

  async allocateReceipt(dto: AllocateReceiptDto, user?: AuthUser) {
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

    await this.auditService.log({
      userId: user?.userId,
      entity: "SalesInvoice",
      entityId: invoice.id,
      action: AuditAction.UPDATE,
      details: {
        reference: invoice.reference,
        receiptTransactionId: receipt.id,
        receiptReference: receipt.reference,
        allocationId: updatedAllocation.allocation.id,
        allocationAmount: requestedAmount.toFixed(2),
        linkedFrom: "CustomerReceipt",
      },
    });

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
      include: this.customerInclude(),
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
    await this.ensureUniqueCustomerReceivableAccountName(dto.name, parentAccount.id, db);
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

  private async ensureUniqueCustomerName(
    name: string,
    db: SalesReceivablesDb,
    excludeCustomerId?: string,
  ) {
    const normalizedName = name.trim();
    if (!normalizedName) {
      throw new BadRequestException("Customer name is required.");
    }

    const existingCustomer = await db.customer.findFirst({
      where: {
        name: { equals: normalizedName, mode: "insensitive" },
        id: excludeCustomerId ? { not: excludeCustomerId } : undefined,
      },
      select: { id: true },
    });

    if (existingCustomer) {
      throw new ConflictException("لا يمكن تعريف عميلين بنفس الاسم.");
    }
  }

  private async ensureUniqueCustomerReceivableAccountName(
    name: string,
    parentAccountId: string,
    db: SalesReceivablesDb,
  ) {
    const normalizedName = name.trim();
    const existingAccount = await db.account.findFirst({
      where: {
        parentAccountId,
        OR: [
          { name: { equals: normalizedName, mode: "insensitive" } },
          { nameAr: { equals: normalizedName, mode: "insensitive" } },
        ],
      },
      select: { id: true },
    });

    if (existingAccount) {
      throw new ConflictException("يوجد حساب ذمم بنفس اسم العميل تحت ذمم عملاء.");
    }
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
    return this.isDescendantOfAccountCode(accountId, CUSTOMER_RECEIVABLES_PARENT_CODE, db, {
      excludeRoot: true,
    });
  }

  private async isDescendantOfAccountCode(
    accountId: string,
    ancestorCode: string,
    db: SalesReceivablesDb,
    options: { excludeRoot?: boolean } = {},
  ) {
    let current = await db.account.findUnique({
      where: { id: accountId },
      select: { id: true, code: true, parentAccountId: true },
    });

    while (current) {
      if (current.code === ancestorCode) {
        return options.excludeRoot ? current.id !== accountId : true;
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

  private lineTracksInventory(
    item:
      | {
          type: string;
          trackInventory: boolean;
        }
      | null
      | undefined,
  ) {
    return Boolean(item && item.type !== "SERVICE" && item.trackInventory);
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
    const itemIds = Array.from(new Set(lines.map((line) => line.itemId?.trim()).filter(Boolean))) as string[];
    const taxes = taxIds.length
      ? await this.prisma.tax.findMany({ where: { id: { in: taxIds }, isActive: true }, select: { id: true, rate: true } })
      : [];
    const items = itemIds.length
      ? await this.prisma.inventoryItem.findMany({
          where: { id: { in: itemIds }, isActive: true },
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
            trackInventory: true,
            preferredWarehouseId: true,
          },
        })
      : [];
    const warehouseCandidateIds = Array.from(
      new Set(
        [
          ...lines.map((line) => line.warehouseId?.trim()),
          ...items.map((item) => item.preferredWarehouseId?.trim()),
        ].filter(Boolean),
      ),
    ) as string[];
    const warehouses = warehouseCandidateIds.length
      ? await this.prisma.inventoryWarehouse.findMany({
          where: { id: { in: warehouseCandidateIds }, isActive: true },
          select: { id: true },
        })
      : [];
    const taxById = new Map(taxes.map((tax) => [tax.id, Number(tax.rate)]));
    const itemById = new Map(items.map((item) => [item.id, item]));
    const warehouseIds = new Set(warehouses.map((warehouse) => warehouse.id));

    for (const [index, rawLine] of lines.entries()) {
      const itemId = rawLine.itemId?.trim() || null;
      const revenueAccountId = rawLine.revenueAccountId?.trim() || null;
      const taxId = rawLine.taxId?.trim() || null;
      const item = itemId ? itemById.get(itemId) ?? null : null;
      if (itemId && !item) {
        throw new BadRequestException(`Line ${index + 1} item/service must reference an active inventory item.`);
      }
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
      const tracksInventory = this.lineTracksInventory(item);
      const warehouseId = tracksInventory
        ? rawLine.warehouseId?.trim() || item?.preferredWarehouseId || null
        : null;

      if (lineSubtotalAmount < 0) {
        throw new BadRequestException(
          `Line ${index + 1} discount cannot exceed the extended line amount.`,
        );
      }
      if (tracksInventory && !warehouseId) {
        throw new BadRequestException(
          `Line ${index + 1} requires a warehouse because the selected item tracks inventory.`,
        );
      }
      if (warehouseId && !warehouseIds.has(warehouseId)) {
        throw new BadRequestException(
          `Line ${index + 1} warehouse must reference an active warehouse.`,
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
        itemId,
        warehouseId,
        itemName: rawLine.itemName?.trim() || item?.name || null,
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
      itemId: line.itemId,
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
      itemId: line.itemId,
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
      itemId: line.itemId,
      warehouseId: line.warehouseId,
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

  private async buildSalesInvoiceJournalLines(
    tx: Prisma.TransactionClient,
    invoice: {
      id: string;
      reference: string;
      customerId: string;
      customer: { receivableAccountId: string };
      lines: Array<{
        lineNumber: number;
        description: string | null;
        revenueAccountId: string;
        taxId: string | null;
        taxAmount: Prisma.Decimal | number;
        lineSubtotalAmount: Prisma.Decimal | number;
      }>;
      totalAmount: Prisma.Decimal | number;
    },
    description: string,
  ) {
    const revenueByAccount = new Map<string, number>();
    for (const line of invoice.lines) {
      const current = revenueByAccount.get(line.revenueAccountId) ?? 0;
      revenueByAccount.set(
        line.revenueAccountId,
        Number((current + Number(line.lineSubtotalAmount)).toFixed(2)),
      );
    }

    const taxIds = Array.from(
      new Set(invoice.lines.map((line) => line.taxId).filter(Boolean)),
    ) as string[];
    const taxes = taxIds.length
      ? await tx.tax.findMany({
          where: { id: { in: taxIds }, isActive: true },
          select: {
            id: true,
            taxName: true,
            taxAccountId: true,
            taxAccount: {
              select: {
                id: true,
                isActive: true,
                isPosting: true,
                allowManualPosting: true,
              },
            },
          },
        })
      : [];
    const taxMap = new Map(taxes.map((tax) => [tax.id, tax]));
    const taxByAccount = new Map<string, number>();
    for (const line of invoice.lines) {
      const taxAmount = Number(line.taxAmount);
      if (taxAmount <= 0) {
        continue;
      }
      if (!line.taxId) {
        const fallbackTaxAccountId = await this.getSalesTaxAccountId();
        if (!fallbackTaxAccountId) {
          throw new BadRequestException("Output VAT account is required because tax is applied.");
        }
        const current = taxByAccount.get(fallbackTaxAccountId) ?? 0;
        taxByAccount.set(
          fallbackTaxAccountId,
          Number((current + taxAmount).toFixed(2)),
        );
        continue;
      }

      const tax = taxMap.get(line.taxId);
      if (!tax?.taxAccountId || !tax.taxAccount?.isActive || !tax.taxAccount.isPosting || !tax.taxAccount.allowManualPosting) {
        throw new BadRequestException("Output VAT account is required because tax is applied.");
      }
      const current = taxByAccount.get(tax.taxAccountId) ?? 0;
      taxByAccount.set(
        tax.taxAccountId,
        Number((current + taxAmount).toFixed(2)),
      );
    }

    return [
      {
        accountId: invoice.customer.receivableAccountId,
        description,
        debitAmount: Number(invoice.totalAmount),
        creditAmount: 0,
      },
      ...Array.from(revenueByAccount.entries()).map(([accountId, amount]) => ({
        accountId,
        description,
        debitAmount: 0,
        creditAmount: Number(amount.toFixed(2)),
      })),
      ...Array.from(taxByAccount.entries()).map(([accountId, amount]) => ({
        accountId,
        description: `${description} tax`,
        debitAmount: 0,
        creditAmount: Number(amount.toFixed(2)),
      })),
    ];
  }

  private async applySalesInvoiceInventoryPosting(
    tx: Prisma.TransactionClient,
    invoice: {
      id: string;
      reference: string;
      invoiceDate: Date;
      description: string | null;
      lines: Array<{
        id: string;
        lineNumber: number;
        itemId: string | null;
        warehouseId: string | null;
        quantity: Prisma.Decimal;
        description: string | null;
        item?: {
          id: string;
          code: string;
          name: string;
          type: string;
          trackInventory: boolean;
          inventoryAccountId: string | null;
          cogsAccountId: string | null;
          isActive: boolean;
        } | null;
      }>;
    },
  ) {
    const accountingLines: Array<{
      accountId: string;
      description: string;
      debitAmount: number;
      creditAmount: number;
    }> = [];
    const costingMethod = await this.inventoryPostingService.getCostingMethod();
    const preventNegativeStock = this.inventoryPostingService.preventNegativeStock();

    for (const line of invoice.lines) {
      if (!line.itemId || !this.lineTracksInventory(line.item)) {
        continue;
      }
      if (!line.warehouseId) {
        throw new BadRequestException(
          `Warehouse is required for inventory item line ${line.lineNumber}.`,
        );
      }
      if (!line.item?.inventoryAccountId || !line.item.cogsAccountId) {
        throw new BadRequestException(
          `Item ${line.item?.code ?? line.itemId} requires inventory and COGS accounts before invoice posting.`,
        );
      }

      const existingMovement = await tx.inventoryStockMovement.findFirst({
        where: {
          transactionType: "SalesInvoice",
          transactionLineId: line.id,
        },
        select: { id: true },
      });
      if (existingMovement) {
        continue;
      }

      const currentBalance = await tx.inventoryWarehouseBalance.findUnique({
        where: {
          itemId_warehouseId: {
            itemId: line.itemId,
            warehouseId: line.warehouseId,
          },
        },
      });
      const currentQuantity = currentBalance?.onHandQuantity ?? new Prisma.Decimal(0);
      const currentValuation =
        currentBalance?.valuationAmount ?? new Prisma.Decimal(0);

      if (preventNegativeStock && currentQuantity.lt(line.quantity)) {
        throw new BadRequestException(
          `Item ${line.item.code} does not have enough available stock in the selected warehouse for line ${line.lineNumber}.`,
        );
      }

      const fallbackUnitCost = this.inventoryPostingService.averageUnitCost(
        currentQuantity,
        currentValuation,
      );
      const valuation = await this.inventoryPostingService.resolveIssueCost({
        tx,
        itemId: line.itemId,
        warehouseId: line.warehouseId,
        quantity: line.quantity,
        fallbackUnitCost,
        reference: invoice.reference,
        sourceType: "SalesInvoice",
        sourceId: invoice.id,
        sourceLineId: line.id,
        sourceDate: invoice.invoiceDate,
        costingMethod,
      });

      await tx.inventoryItem.update({
        where: { id: line.itemId },
        data: {
          onHandQuantity: {
            decrement: line.quantity,
          },
          valuationAmount: {
            decrement: valuation.totalAmount,
          },
        },
      });

      const warehouseBalance =
        await this.inventoryPostingService.applyWarehouseBalance(tx, {
          itemId: line.itemId,
          warehouseId: line.warehouseId,
          quantityDelta: line.quantity.neg(),
          valueDelta: valuation.totalAmount.neg(),
        });

      await this.inventoryPostingService.createMovement(tx, {
        movementType: InventoryStockMovementType.SALES_ISSUE,
        transactionType: "SalesInvoice",
        transactionId: invoice.id,
        transactionLineId: line.id,
        transactionReference: invoice.reference,
        transactionDate: invoice.invoiceDate,
        itemId: line.itemId,
        warehouseId: line.warehouseId,
        quantityIn: new Prisma.Decimal(0),
        quantityOut: line.quantity,
        unitCost: valuation.unitCost,
        valueIn: new Prisma.Decimal(0),
        valueOut: valuation.totalAmount,
        balanceId: warehouseBalance.id,
        runningQuantity: warehouseBalance.onHandQuantity,
        runningValuation: warehouseBalance.valuationAmount,
        description: line.description ?? invoice.description,
      });

      const amount = Number(valuation.totalAmount.toFixed(2));
      if (amount > 0) {
        accountingLines.push({
          accountId: line.item.cogsAccountId,
          description: `COGS ${invoice.reference}`,
          debitAmount: amount,
          creditAmount: 0,
        });
        accountingLines.push({
          accountId: line.item.inventoryAccountId,
          description: `Inventory relief ${invoice.reference}`,
          debitAmount: 0,
          creditAmount: amount,
        });
      }
    }

    return { accountingLines };
  }

  private ensureBalancedJournal(
    lines: Array<{
      debitAmount: number;
      creditAmount: number;
    }>,
  ) {
    const totalDebit = Number(
      lines.reduce((sum, line) => sum + Number(line.debitAmount), 0).toFixed(2),
    );
    const totalCredit = Number(
      lines.reduce((sum, line) => sum + Number(line.creditAmount), 0).toFixed(2),
    );
    if (totalDebit !== totalCredit) {
      throw new BadRequestException("Journal entry is not balanced.");
    }
  }

  private mapCustomerReceiptTransaction(row: any) {
    const allocatedAmount = row.receiptAllocations.reduce(
      (sum: number, item: { amount: Prisma.Decimal | number }) =>
        sum + Number(item.amount),
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
  }

  private quotationInclude() {
    return {
      customer: {
        include: {
          receivableAccount: { select: this.accountSummarySelect() },
          taxTreatment: {
            include: { defaultTax: { select: this.taxSummarySelect() } },
          },
        },
      },
      lines: {
        include: {
          revenueAccount: { select: this.accountSummarySelect() },
          item: {
            select: {
              id: true,
              code: true,
              name: true,
              description: true,
              type: true,
              isActive: true,
              salesAccount: { select: this.accountSummarySelect() },
            },
          },
        },
        orderBy: { lineNumber: "asc" },
      },
    } satisfies Prisma.SalesQuotationInclude;
  }

  private salesOrderInclude() {
    return {
      customer: {
        include: {
          receivableAccount: { select: this.accountSummarySelect() },
          taxTreatment: {
            include: { defaultTax: { select: this.taxSummarySelect() } },
          },
        },
      },
      sourceQuotation: { select: { id: true, reference: true } },
      salesInvoices: {
        select: { id: true, reference: true, totalAmount: true, status: true },
      },
      lines: {
        include: {
          revenueAccount: { select: this.accountSummarySelect() },
          item: {
            select: {
              id: true,
              code: true,
              name: true,
              description: true,
              type: true,
              isActive: true,
              trackInventory: true,
              preferredWarehouseId: true,
              preferredWarehouse: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  isActive: true,
                },
              },
              salesAccount: { select: this.accountSummarySelect() },
            },
          },
        },
        orderBy: { lineNumber: "asc" },
      },
    } satisfies Prisma.SalesOrderInclude;
  }

  private invoiceInclude() {
    return {
      customer: {
        include: {
          receivableAccount: { select: this.accountSummarySelect() },
          taxTreatment: {
            include: { defaultTax: { select: this.taxSummarySelect() } },
          },
        },
      },
      sourceQuotation: { select: { id: true, reference: true } },
      sourceSalesOrder: { select: { id: true, reference: true } },
      lines: {
        include: {
          revenueAccount: { select: this.accountSummarySelect() },
          item: {
            select: {
              id: true,
              code: true,
              name: true,
              description: true,
              type: true,
              isActive: true,
              salesAccount: { select: this.accountSummarySelect() },
            },
          },
        },
        orderBy: { lineNumber: "asc" },
      },
      journalEntry: { select: { id: true, reference: true } },
    } satisfies Prisma.SalesInvoiceInclude;
  }

  private creditNoteInclude() {
    return {
      customer: {
        include: {
          receivableAccount: { select: this.accountSummarySelect() },
          taxTreatment: {
            include: { defaultTax: { select: this.taxSummarySelect() } },
          },
        },
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
        taxTreatment: row.customer.taxTreatment
          ? {
              id: row.customer.taxTreatment.id,
              code: row.customer.taxTreatment.code,
              arabicName: row.customer.taxTreatment.arabicName,
              englishName: row.customer.taxTreatment.englishName,
              description: row.customer.taxTreatment.description,
              isActive: row.customer.taxTreatment.isActive,
              defaultTax: row.customer.taxTreatment.defaultTax
                ? {
                    id: row.customer.taxTreatment.defaultTax.id,
                    taxCode: row.customer.taxTreatment.defaultTax.taxCode,
                    taxName: row.customer.taxTreatment.defaultTax.taxName,
                    rate: row.customer.taxTreatment.defaultTax.rate.toString(),
                    taxType: row.customer.taxTreatment.defaultTax.taxType,
                    taxAccountId: row.customer.taxTreatment.defaultTax.taxAccountId,
                    isActive: row.customer.taxTreatment.defaultTax.isActive,
                    createdAt: row.customer.taxTreatment.defaultTax.createdAt.toISOString(),
                    updatedAt: row.customer.taxTreatment.defaultTax.updatedAt.toISOString(),
                  }
                : null,
              createdAt: row.customer.taxTreatment.createdAt.toISOString(),
              updatedAt: row.customer.taxTreatment.updatedAt.toISOString(),
            }
          : null,
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
        taxTreatment: row.customer.taxTreatment
          ? {
              id: row.customer.taxTreatment.id,
              code: row.customer.taxTreatment.code,
              arabicName: row.customer.taxTreatment.arabicName,
              englishName: row.customer.taxTreatment.englishName,
              description: row.customer.taxTreatment.description,
              isActive: row.customer.taxTreatment.isActive,
              defaultTax: row.customer.taxTreatment.defaultTax
                ? {
                    id: row.customer.taxTreatment.defaultTax.id,
                    taxCode: row.customer.taxTreatment.defaultTax.taxCode,
                    taxName: row.customer.taxTreatment.defaultTax.taxName,
                    rate: row.customer.taxTreatment.defaultTax.rate.toString(),
                    taxType: row.customer.taxTreatment.defaultTax.taxType,
                    taxAccountId: row.customer.taxTreatment.defaultTax.taxAccountId,
                    isActive: row.customer.taxTreatment.defaultTax.isActive,
                    createdAt: row.customer.taxTreatment.defaultTax.createdAt.toISOString(),
                    updatedAt: row.customer.taxTreatment.defaultTax.updatedAt.toISOString(),
                  }
                : null,
              createdAt: row.customer.taxTreatment.createdAt.toISOString(),
              updatedAt: row.customer.taxTreatment.updatedAt.toISOString(),
            }
          : null,
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
        taxTreatment: row.customer.taxTreatment
          ? {
              id: row.customer.taxTreatment.id,
              code: row.customer.taxTreatment.code,
              arabicName: row.customer.taxTreatment.arabicName,
              englishName: row.customer.taxTreatment.englishName,
              description: row.customer.taxTreatment.description,
              isActive: row.customer.taxTreatment.isActive,
              defaultTax: row.customer.taxTreatment.defaultTax
                ? {
                    id: row.customer.taxTreatment.defaultTax.id,
                    taxCode: row.customer.taxTreatment.defaultTax.taxCode,
                    taxName: row.customer.taxTreatment.defaultTax.taxName,
                    rate: row.customer.taxTreatment.defaultTax.rate.toString(),
                    taxType: row.customer.taxTreatment.defaultTax.taxType,
                    taxAccountId: row.customer.taxTreatment.defaultTax.taxAccountId,
                    isActive: row.customer.taxTreatment.defaultTax.isActive,
                    createdAt: row.customer.taxTreatment.defaultTax.createdAt.toISOString(),
                    updatedAt: row.customer.taxTreatment.defaultTax.updatedAt.toISOString(),
                  }
                : null,
              createdAt: row.customer.taxTreatment.createdAt.toISOString(),
              updatedAt: row.customer.taxTreatment.updatedAt.toISOString(),
            }
          : null,
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
        taxTreatment: row.customer.taxTreatment
          ? {
              id: row.customer.taxTreatment.id,
              code: row.customer.taxTreatment.code,
              arabicName: row.customer.taxTreatment.arabicName,
              englishName: row.customer.taxTreatment.englishName,
              description: row.customer.taxTreatment.description,
              isActive: row.customer.taxTreatment.isActive,
              defaultTax: row.customer.taxTreatment.defaultTax
                ? {
                    id: row.customer.taxTreatment.defaultTax.id,
                    taxCode: row.customer.taxTreatment.defaultTax.taxCode,
                    taxName: row.customer.taxTreatment.defaultTax.taxName,
                    rate: row.customer.taxTreatment.defaultTax.rate.toString(),
                    taxType: row.customer.taxTreatment.defaultTax.taxType,
                    taxAccountId: row.customer.taxTreatment.defaultTax.taxAccountId,
                    isActive: row.customer.taxTreatment.defaultTax.isActive,
                    createdAt: row.customer.taxTreatment.defaultTax.createdAt.toISOString(),
                    updatedAt: row.customer.taxTreatment.defaultTax.updatedAt.toISOString(),
                  }
                : null,
              createdAt: row.customer.taxTreatment.createdAt.toISOString(),
              updatedAt: row.customer.taxTreatment.updatedAt.toISOString(),
            }
          : null,
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
      itemId: line.itemId ?? null,
      warehouseId: line.warehouseId ?? null,
      itemName: line.itemName,
      item: line.item ?? null,
      warehouse: line.warehouse ?? null,
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
      nameAr: true,
      type: true,
      currencyCode: true,
      isActive: true,
      isPosting: true,
    };
  }

  private customerInclude() {
    return {
      receivableAccount: { select: this.accountSummarySelect() },
      taxTreatment: {
        include: { defaultTax: { select: this.taxSummarySelect() } },
      },
      salesRep: {
        select: {
          id: true,
          code: true,
          name: true,
          status: true,
        },
      },
    };
  }

  private salesRepInclude() {
    return {
      employeeReceivableAccount: { select: this.accountSummarySelect() },
      _count: { select: { customers: true } },
    };
  }

  private taxSummarySelect() {
    return {
      id: true,
      taxCode: true,
      taxName: true,
      rate: true,
      taxType: true,
      taxAccountId: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    };
  }

  private async getSalesRepOrThrow(id: string) {
    const salesRep = await this.prisma.salesRepresentative.findUnique({
      where: { id },
      include: this.salesRepInclude(),
    });
    if (!salesRep) {
      throw new BadRequestException(`Sales representative ${id} was not found.`);
    }
    return salesRep;
  }

  private async resolveSalesRepEmployeeReceivableAccount(
    dto: {
      name?: string;
      employeeReceivableAccountId?: string;
      employeeReceivableAccountLinkMode?: "NONE" | "AUTO" | "EXISTING";
    },
    db: SalesReceivablesDb,
    options: { preserveWhenMissing?: boolean } = {},
  ) {
    const linkMode = dto.employeeReceivableAccountLinkMode;
    if (!linkMode) {
      if (options.preserveWhenMissing && dto.employeeReceivableAccountId === undefined) {
        return undefined;
      }
      const existingAccountId = dto.employeeReceivableAccountId?.trim();
      if (!existingAccountId) {
        return null;
      }
      await this.ensureEmployeePayableAccount(existingAccountId, db);
      return existingAccountId;
    }

    if (linkMode === "NONE") {
      return null;
    }

    if (linkMode === "EXISTING") {
      if (!dto.employeeReceivableAccountId?.trim()) {
        throw new BadRequestException("يرجى اختيار حساب ذمم الموظف قبل الحفظ.");
      }
      const accountId = dto.employeeReceivableAccountId.trim();
      await this.ensureEmployeePayableAccount(accountId, db);
      return accountId;
    }

    if (!dto.name?.trim()) {
      throw new BadRequestException("يرجى إدخال اسم المندوب قبل إنشاء حساب ذمم تلقائي.");
    }

    const parentAccount = await this.getEmployeePayablesParentAccount(db);
    await this.ensureUniqueEmployeePayableAccountName(dto.name, parentAccount.id, db);

    const account = await this.accountsService.createWithinTransaction(
      {
        name: dto.name.trim(),
        nameAr: dto.name.trim(),
        type: "LIABILITY",
        subtype: "Payable",
        isPosting: true,
        allowManualPosting: true,
        currencyCode: parentAccount.currencyCode,
        parentAccountId: parentAccount.id,
      },
      db as never,
    );

    return account.id;
  }

  private async resolveActiveSalesRep(salesRepId: string | undefined, db: SalesReceivablesDb) {
    const normalizedId = salesRepId?.trim();
    if (salesRepId === undefined || normalizedId === "") {
      return null;
    }

    const salesRep = await db.salesRepresentative.findUnique({
      where: { id: normalizedId },
      select: {
        id: true,
        code: true,
        name: true,
        status: true,
      },
    });

    if (!salesRep) {
      throw new BadRequestException("مندوب المبيعات المحدد غير موجود.");
    }
    if (salesRep.status !== SalesRepStatus.ACTIVE) {
      throw new BadRequestException("مندوب المبيعات المحدد غير نشط.");
    }

    return salesRep;
  }

  private async resolveActiveTaxTreatment(
    taxTreatmentId: string | undefined,
    db: SalesReceivablesDb,
  ) {
    const normalizedId = taxTreatmentId?.trim();
    if (!normalizedId) {
      throw new BadRequestException("Tax treatment is required.");
    }

    const taxTreatment = await db.taxTreatment.findUnique({
      where: { id: normalizedId },
      select: { id: true, isActive: true },
    });

    if (!taxTreatment) {
      throw new BadRequestException("The selected tax treatment does not exist.");
    }
    if (!taxTreatment.isActive) {
      throw new BadRequestException("The selected tax treatment is inactive.");
    }

    return taxTreatment.id;
  }

  private async ensureEmployeePayableAccount(accountId: string, db: SalesReceivablesDb = this.prisma) {
    const account = await db.account.findUnique({
      where: { id: accountId },
      select: {
        id: true,
        type: true,
        isActive: true,
        isPosting: true,
      },
    });

    if (!account) {
      throw new BadRequestException(`Account ${accountId} was not found.`);
    }
    if (!account.isActive || !account.isPosting || account.type !== "LIABILITY") {
      throw new BadRequestException("حساب ذمم الموظف يجب أن يكون حساب خصوم نشط وقابل للترحيل.");
    }
    if (!(await this.isDescendantOfAccountCode(account.id, EMPLOYEE_PAYABLES_PARENT_CODE, db))) {
      throw new BadRequestException("حساب ذمم الموظف يجب أن يكون تحت ذمم الموظفين.");
    }
  }

  private async getEmployeePayablesParentAccount(db: SalesReceivablesDb) {
    const account = await db.account.findUnique({
      where: { code: EMPLOYEE_PAYABLES_PARENT_CODE },
      select: {
        id: true,
        code: true,
        type: true,
        isActive: true,
        isPosting: true,
        currencyCode: true,
      },
    });

    if (!account) {
      throw new BadRequestException(`Employee payables account ${EMPLOYEE_PAYABLES_PARENT_CODE} was not found.`);
    }
    if (!account.isActive || account.isPosting || account.type !== "LIABILITY") {
      throw new BadRequestException("Employee payables parent account must be an active Liability header account.");
    }

    return account;
  }

  private async ensureUniqueEmployeePayableAccountName(
    name: string,
    parentAccountId: string,
    db: SalesReceivablesDb,
  ) {
    const normalizedName = name.trim();
    const existingAccount = await db.account.findFirst({
      where: {
        parentAccountId,
        OR: [
          { name: { equals: normalizedName, mode: "insensitive" } },
          { nameAr: { equals: normalizedName, mode: "insensitive" } },
        ],
      },
      select: { id: true },
    });

    if (existingAccount) {
      throw new ConflictException("يوجد حساب ذمم موظف بنفس اسم المندوب تحت ذمم الموظفين.");
    }
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

  private parseSalesRepStatus(status?: string): SalesRepStatus | undefined {
    if (!status) {
      return undefined;
    }
    if (status in SalesRepStatus) {
      return status as SalesRepStatus;
    }
    throw new BadRequestException("Invalid sales representative status.");
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
