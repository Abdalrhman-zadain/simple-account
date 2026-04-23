import { BadRequestException, ConflictException, Injectable } from "@nestjs/common";
import {
  AuditAction,
  FixedAssetDepreciationMethod,
  FixedAssetDisposalMethod,
  FixedAssetStatus,
  FixedAssetTransactionStatus,
  Prisma,
} from "../../../generated/prisma";

import { PrismaService } from "../../../common/prisma/prisma.service";
import { AuditService } from "../../phase-1-accounting-foundation/accounting-core/audit/audit.service";
import { JournalEntriesService } from "../../phase-1-accounting-foundation/accounting-core/journal-entries/journal-entries.service";
import {
  CreateFixedAssetAcquisitionDto,
  CreateFixedAssetCategoryDto,
  CreateFixedAssetDepreciationRunDto,
  CreateFixedAssetDisposalDto,
  CreateFixedAssetDto,
  CreateFixedAssetTransferDto,
  UpdateFixedAssetCategoryDto,
  UpdateFixedAssetDto,
} from "./dto/fixed-assets.dto";

type PostingLine = {
  accountId: string;
  description: string;
  debitAmount: number;
  creditAmount: number;
};

@Injectable()
export class FixedAssetsService {
  private readonly accountSelect = {
    id: true,
    code: true,
    name: true,
    type: true,
    currencyCode: true,
    isActive: true,
    isPosting: true,
  } as const;

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly journalEntriesService: JournalEntriesService,
  ) {}

  async listCategories(query: { isActive?: string; search?: string }) {
    const rows = await this.prisma.fixedAssetCategory.findMany({
      where: {
        isActive: query.isActive === undefined || query.isActive === "" ? undefined : query.isActive === "true",
        OR: this.search(query.search, ["code", "name", "nameAr", "description"]),
      },
      include: this.categoryInclude(),
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
    });
    return rows.map((row) => this.mapCategory(row));
  }

  async createCategory(dto: CreateFixedAssetCategoryDto) {
    await this.validateCategoryAccounts(dto);
    try {
      const row = await this.prisma.fixedAssetCategory.create({
        data: {
          code: dto.code?.trim() || this.generateReference("FAC"),
          name: dto.name.trim(),
          nameAr: this.nullable(dto.nameAr),
          description: this.nullable(dto.description),
          assetAccountId: dto.assetAccountId,
          accumulatedDepreciationAccountId: dto.accumulatedDepreciationAccountId,
          depreciationExpenseAccountId: dto.depreciationExpenseAccountId,
          disposalGainAccountId: dto.disposalGainAccountId || null,
          disposalLossAccountId: dto.disposalLossAccountId || null,
        },
        include: this.categoryInclude(),
      });
      await this.logAudit("FixedAssetCategory", row.id, AuditAction.CREATE, { code: row.code, name: row.name });
      return this.mapCategory(row);
    } catch (error) {
      if (this.isUniqueConflict(error, "code")) throw new ConflictException("A fixed asset category with this code already exists.");
      throw error;
    }
  }

  async updateCategory(id: string, dto: UpdateFixedAssetCategoryDto) {
    await this.getCategoryOrThrow(id);
    await this.validateCategoryAccounts(dto);
    const row = await this.prisma.fixedAssetCategory.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        nameAr: dto.nameAr === undefined ? undefined : this.nullable(dto.nameAr),
        description: dto.description === undefined ? undefined : this.nullable(dto.description),
        isActive: dto.isActive,
        assetAccountId: dto.assetAccountId,
        accumulatedDepreciationAccountId: dto.accumulatedDepreciationAccountId,
        depreciationExpenseAccountId: dto.depreciationExpenseAccountId,
        disposalGainAccountId: dto.disposalGainAccountId === undefined ? undefined : dto.disposalGainAccountId || null,
        disposalLossAccountId: dto.disposalLossAccountId === undefined ? undefined : dto.disposalLossAccountId || null,
      },
      include: this.categoryInclude(),
    });
    await this.logAudit("FixedAssetCategory", row.id, AuditAction.UPDATE, dto);
    return this.mapCategory(row);
  }

  async deactivateCategory(id: string) {
    const category = await this.getCategoryOrThrow(id);
    if (category._count?.assets > 0) {
      throw new BadRequestException("Deactivate or reclassify fixed assets before deactivating the category.");
    }
    const row = await this.prisma.fixedAssetCategory.update({
      where: { id },
      data: { isActive: false },
      include: this.categoryInclude(),
    });
    await this.logAudit("FixedAssetCategory", row.id, AuditAction.UPDATE, { action: "deactivate" });
    return this.mapCategory(row);
  }

  async listAssets(query: { status?: string; categoryId?: string; search?: string }) {
    const rows = await this.prisma.fixedAsset.findMany({
      where: {
        status: this.parseEnum(FixedAssetStatus, query.status, "asset status"),
        categoryId: query.categoryId || undefined,
        OR: this.search(query.search, ["code", "name", "department", "costCenter", "employee", "location", "branch"]),
      },
      include: this.assetInclude(),
      orderBy: [{ status: "asc" }, { name: "asc" }],
    });
    return rows.map((row) => this.mapAsset(row));
  }

  async getAsset(id: string) {
    const row = await this.getAssetOrThrow(id);
    return {
      ...this.mapAsset(row),
      auditHistory: await this.getAssetAuditHistory(row),
    };
  }

  async createAsset(dto: CreateFixedAssetDto) {
    const category = await this.getCategoryOrThrow(dto.categoryId);
    if (!category.isActive) throw new BadRequestException("Fixed assets require an active category.");
    if (new Date(dto.depreciationStartDate) < new Date(dto.acquisitionDate)) {
      throw new BadRequestException("Depreciation start date cannot be earlier than acquisition date.");
    }
    try {
      const row = await this.prisma.fixedAsset.create({
        data: {
          code: dto.code?.trim() || this.generateReference("FA"),
          name: dto.name.trim(),
          categoryId: dto.categoryId,
          acquisitionDate: new Date(dto.acquisitionDate),
          depreciationStartDate: new Date(dto.depreciationStartDate),
          usefulLifeMonths: dto.usefulLifeMonths,
          depreciationMethod: dto.depreciationMethod,
          residualValue: this.amount(dto.residualValue ?? 0),
          department: this.nullable(dto.department),
          costCenter: this.nullable(dto.costCenter),
          employee: this.nullable(dto.employee),
          location: this.nullable(dto.location),
          branch: this.nullable(dto.branch),
        },
        include: this.assetInclude(),
      });
      await this.logAudit("FixedAsset", row.id, AuditAction.CREATE, { code: row.code, name: row.name });
      return this.mapAsset(row);
    } catch (error) {
      if (this.isUniqueConflict(error, "code")) throw new ConflictException("A fixed asset with this code already exists.");
      throw error;
    }
  }

  async updateAsset(id: string, dto: UpdateFixedAssetDto) {
    const existing = await this.getAssetOrThrow(id);
    this.ensureAssetEditable(existing);
    if (dto.categoryId) {
      const category = await this.getCategoryOrThrow(dto.categoryId);
      if (!category.isActive) throw new BadRequestException("Fixed assets require an active category.");
    }
    const nextAcquisitionDate = dto.acquisitionDate ? new Date(dto.acquisitionDate) : existing.acquisitionDate;
    const nextDepreciationStartDate = dto.depreciationStartDate ? new Date(dto.depreciationStartDate) : existing.depreciationStartDate;
    if (nextDepreciationStartDate < nextAcquisitionDate) {
      throw new BadRequestException("Depreciation start date cannot be earlier than acquisition date.");
    }
    const row = await this.prisma.fixedAsset.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        categoryId: dto.categoryId,
        acquisitionDate: dto.acquisitionDate ? new Date(dto.acquisitionDate) : undefined,
        depreciationStartDate: dto.depreciationStartDate ? new Date(dto.depreciationStartDate) : undefined,
        usefulLifeMonths: dto.usefulLifeMonths,
        depreciationMethod: dto.depreciationMethod,
        residualValue: dto.residualValue === undefined ? undefined : this.amount(dto.residualValue),
        status: dto.status,
        department: dto.department === undefined ? undefined : this.nullable(dto.department),
        costCenter: dto.costCenter === undefined ? undefined : this.nullable(dto.costCenter),
        employee: dto.employee === undefined ? undefined : this.nullable(dto.employee),
        location: dto.location === undefined ? undefined : this.nullable(dto.location),
        branch: dto.branch === undefined ? undefined : this.nullable(dto.branch),
      },
      include: this.assetInclude(),
    });
    await this.logAudit("FixedAsset", row.id, AuditAction.UPDATE, dto);
    return this.mapAsset(row);
  }

  async deactivateAsset(id: string) {
    const asset = await this.getAssetOrThrow(id);
    if (asset.status === FixedAssetStatus.DISPOSED) throw new BadRequestException("Disposed assets are already blocked from new transactions.");
    const row = await this.prisma.fixedAsset.update({
      where: { id },
      data: { status: FixedAssetStatus.INACTIVE },
      include: this.assetInclude(),
    });
    await this.logAudit("FixedAsset", row.id, AuditAction.UPDATE, { action: "deactivate" });
    return this.mapAsset(row);
  }

  async listAcquisitions(query: { status?: string; assetId?: string; search?: string }) {
    const rows = await this.prisma.fixedAssetAcquisition.findMany({
      where: {
        status: this.parseEnum(FixedAssetTransactionStatus, query.status, "acquisition status"),
        assetId: query.assetId,
        OR: this.search(query.search, ["reference", "supplierReference", "purchaseInvoiceReference", "paymentReference", "description"]),
      },
      include: this.acquisitionInclude(),
      orderBy: [{ acquisitionDate: "desc" }, { createdAt: "desc" }],
    });
    return rows.map((row) => this.mapAcquisition(row));
  }

  async createAcquisition(dto: CreateFixedAssetAcquisitionDto) {
    const asset = await this.getAssetOrThrow(dto.assetId);
    this.ensureAssetOperational(asset);
    await this.validatePostingAccount(dto.clearingAccountId, ["ASSET", "LIABILITY"], "Acquisition clearing account");
    const totalCost = (dto.acquisitionCost ?? 0) + (dto.capitalizedCost ?? 0);
    if (totalCost <= 0) throw new BadRequestException("Acquisition total cost must be greater than zero.");
    try {
      const row = await this.prisma.fixedAssetAcquisition.create({
        data: {
          reference: dto.reference?.trim() || this.generateReference("FAA"),
          assetId: dto.assetId,
          acquisitionDate: new Date(dto.acquisitionDate),
          acquisitionCost: this.amount(dto.acquisitionCost),
          capitalizedCost: this.amount(dto.capitalizedCost ?? 0),
          totalCost: this.amount(totalCost),
          supplierReference: this.nullable(dto.supplierReference),
          purchaseInvoiceReference: this.nullable(dto.purchaseInvoiceReference),
          paymentReference: this.nullable(dto.paymentReference),
          clearingAccountId: dto.clearingAccountId,
          description: this.nullable(dto.description),
        },
        include: this.acquisitionInclude(),
      });
      await this.logAudit("FixedAssetAcquisition", row.id, AuditAction.CREATE, { reference: row.reference, assetId: row.assetId });
      return this.mapAcquisition(row);
    } catch (error) {
      if (this.isUniqueConflict(error, "reference")) throw new ConflictException("A fixed asset acquisition with this reference already exists.");
      throw error;
    }
  }

  async postAcquisition(id: string) {
    const acquisition = await this.getAcquisitionOrThrow(id);
    if (acquisition.status !== FixedAssetTransactionStatus.DRAFT) throw new BadRequestException("Only draft asset acquisitions can be posted.");
    this.ensureAssetOperational(acquisition.asset);
    const lines: PostingLine[] = [
      {
        accountId: acquisition.asset.category.assetAccountId,
        description: `Asset acquisition ${acquisition.reference}`,
        debitAmount: Number(acquisition.totalCost),
        creditAmount: 0,
      },
      {
        accountId: acquisition.clearingAccountId,
        description: `Asset acquisition clearing ${acquisition.reference}`,
        debitAmount: 0,
        creditAmount: Number(acquisition.totalCost),
      },
    ];
    const row = await this.prisma.$transaction(async (tx) => {
      const { journalEntry, postedAt } = await this.createPostedJournalEntry(tx, acquisition.acquisitionDate, `Fixed asset acquisition ${acquisition.reference}`, lines);
      await tx.fixedAsset.update({
        where: { id: acquisition.assetId },
        data: {
          acquisitionCost: { increment: acquisition.totalCost },
          bookValue: { increment: acquisition.totalCost },
        },
      });
      return tx.fixedAssetAcquisition.update({
        where: { id },
        data: { status: FixedAssetTransactionStatus.POSTED, journalEntryId: journalEntry.id, postedAt },
        include: this.acquisitionInclude(),
      });
    });
    await this.logAudit("FixedAssetAcquisition", row.id, AuditAction.POST, { reference: row.reference, journalEntryId: row.journalEntryId });
    return this.mapAcquisition(row);
  }

  async reverseAcquisition(id: string) {
    const acquisition = await this.getAcquisitionOrThrow(id);
    if (acquisition.status !== FixedAssetTransactionStatus.POSTED) throw new BadRequestException("Only posted asset acquisitions can be reversed.");
    if (!acquisition.journalEntryId) throw new BadRequestException("The acquisition has no journal entry to reverse.");
    if (Number(acquisition.asset.accumulatedDepreciation) > 0 || acquisition.asset.status === FixedAssetStatus.DISPOSED) {
      throw new BadRequestException("Reverse depreciation and disposal activity before reversing this acquisition.");
    }
    const row = await this.prisma.$transaction(async (tx) => {
      const { postedAt } = await this.createReversalJournalEntry(tx, acquisition.journalEntryId!, `Reversal of fixed asset acquisition ${acquisition.reference}`);
      await tx.fixedAsset.update({
        where: { id: acquisition.assetId },
        data: {
          acquisitionCost: { decrement: acquisition.totalCost },
          bookValue: { decrement: acquisition.totalCost },
        },
      });
      return tx.fixedAssetAcquisition.update({
        where: { id },
        data: { status: FixedAssetTransactionStatus.REVERSED, reversedAt: postedAt },
        include: this.acquisitionInclude(),
      });
    });
    await this.logAudit("FixedAssetAcquisition", row.id, AuditAction.REVERSE, { reference: row.reference });
    return this.mapAcquisition(row);
  }

  async listDepreciationRuns(query: { status?: string; assetId?: string; categoryId?: string }) {
    const rows = await this.prisma.fixedAssetDepreciationRun.findMany({
      where: {
        status: this.parseEnum(FixedAssetTransactionStatus, query.status, "depreciation run status"),
        assetId: query.assetId,
        categoryId: query.categoryId,
      },
      include: this.depreciationRunInclude(),
      orderBy: [{ periodEnd: "desc" }, { createdAt: "desc" }],
    });
    return rows.map((row) => this.mapDepreciationRun(row));
  }

  async createDepreciationRun(dto: CreateFixedAssetDepreciationRunDto) {
    const periodStart = new Date(dto.periodStart);
    const periodEnd = new Date(dto.periodEnd);
    if (periodStart > periodEnd) throw new BadRequestException("Depreciation period start must be on or before period end.");
    if (dto.assetId && dto.categoryId) throw new BadRequestException("Depreciation can run for an asset or a category, not both.");
    const assets = await this.prisma.fixedAsset.findMany({
      where: {
        id: dto.assetId,
        categoryId: dto.categoryId,
        status: FixedAssetStatus.ACTIVE,
        acquisitionCost: { gt: 0 },
        depreciationStartDate: { lte: periodEnd },
      },
      include: this.assetInclude(),
      orderBy: { code: "asc" },
    });
    const lines = [];
    for (const asset of assets) {
      const duplicate = await this.prisma.fixedAssetDepreciationLine.findFirst({
        where: {
          assetId: asset.id,
          run: {
            status: { in: [FixedAssetTransactionStatus.DRAFT, FixedAssetTransactionStatus.POSTED] },
            periodStart,
            periodEnd,
          },
        },
      });
      if (duplicate) continue;
      const depreciationAmount = this.calculateDepreciationForPeriod(asset, periodStart, periodEnd);
      if (depreciationAmount <= 0) continue;
      const accumulatedBefore = Number(asset.accumulatedDepreciation);
      const bookValueBefore = Number(asset.bookValue);
      lines.push({
        assetId: asset.id,
        depreciationAmount: this.amount(depreciationAmount),
        accumulatedBefore: this.amount(accumulatedBefore),
        accumulatedAfter: this.amount(accumulatedBefore + depreciationAmount),
        bookValueBefore: this.amount(bookValueBefore),
        bookValueAfter: this.amount(bookValueBefore - depreciationAmount),
      });
    }
    if (!lines.length) throw new BadRequestException("No eligible assets were found for this depreciation period.");
    const totalAmount = lines.reduce((sum, line) => sum + Number(line.depreciationAmount), 0);
    const row = await this.prisma.fixedAssetDepreciationRun.create({
      data: {
        reference: dto.reference?.trim() || this.generateReference("FAD"),
        periodStart,
        periodEnd,
        scope: dto.assetId ? "ASSET" : dto.categoryId ? "CATEGORY" : "ALL",
        categoryId: dto.categoryId || null,
        assetId: dto.assetId || null,
        description: this.nullable(dto.description),
        totalAmount: this.amount(totalAmount),
        lines: { create: lines },
      },
      include: this.depreciationRunInclude(),
    });
    await this.logAudit("FixedAssetDepreciationRun", row.id, AuditAction.CREATE, { reference: row.reference, scope: row.scope });
    return this.mapDepreciationRun(row);
  }

  async postDepreciationRun(id: string) {
    const run = await this.getDepreciationRunOrThrow(id);
    if (run.status !== FixedAssetTransactionStatus.DRAFT) throw new BadRequestException("Only draft depreciation runs can be posted.");
    for (const line of run.lines) {
      this.ensureAssetOperational(line.asset);
      if (Number(line.asset.acquisitionCost) <= 0) {
        throw new BadRequestException(`Asset ${line.asset.code} cannot be depreciated before acquisition is posted.`);
      }
    }
    const lines = this.buildDepreciationPostingLines(run);
    const row = await this.prisma.$transaction(async (tx) => {
      const { journalEntry, postedAt } = await this.createPostedJournalEntry(tx, run.periodEnd, `Fixed asset depreciation ${run.reference}`, lines);
      for (const line of run.lines) {
        await tx.fixedAsset.update({
          where: { id: line.assetId },
          data: {
            accumulatedDepreciation: { increment: line.depreciationAmount },
            bookValue: { decrement: line.depreciationAmount },
          },
        });
      }
      return tx.fixedAssetDepreciationRun.update({
        where: { id },
        data: { status: FixedAssetTransactionStatus.POSTED, journalEntryId: journalEntry.id, postedAt },
        include: this.depreciationRunInclude(),
      });
    });
    await this.logAudit("FixedAssetDepreciationRun", row.id, AuditAction.POST, { reference: row.reference, journalEntryId: row.journalEntryId });
    return this.mapDepreciationRun(row);
  }

  async reverseDepreciationRun(id: string) {
    const run = await this.getDepreciationRunOrThrow(id);
    if (run.status !== FixedAssetTransactionStatus.POSTED) throw new BadRequestException("Only posted depreciation runs can be reversed.");
    if (!run.journalEntryId) throw new BadRequestException("The depreciation run has no journal entry to reverse.");
    const row = await this.prisma.$transaction(async (tx) => {
      const { postedAt } = await this.createReversalJournalEntry(tx, run.journalEntryId!, `Reversal of fixed asset depreciation ${run.reference}`);
      for (const line of run.lines) {
        await tx.fixedAsset.update({
          where: { id: line.assetId },
          data: {
            accumulatedDepreciation: { decrement: line.depreciationAmount },
            bookValue: { increment: line.depreciationAmount },
          },
        });
      }
      return tx.fixedAssetDepreciationRun.update({
        where: { id },
        data: { status: FixedAssetTransactionStatus.REVERSED, reversedAt: postedAt },
        include: this.depreciationRunInclude(),
      });
    });
    await this.logAudit("FixedAssetDepreciationRun", row.id, AuditAction.REVERSE, { reference: row.reference });
    return this.mapDepreciationRun(row);
  }

  async listDisposals(query: { status?: string; assetId?: string; search?: string }) {
    const rows = await this.prisma.fixedAssetDisposal.findMany({
      where: {
        status: this.parseEnum(FixedAssetTransactionStatus, query.status, "disposal status"),
        assetId: query.assetId,
        OR: this.search(query.search, ["reference", "description"]),
      },
      include: this.disposalInclude(),
      orderBy: [{ disposalDate: "desc" }, { createdAt: "desc" }],
    });
    return rows.map((row) => this.mapDisposal(row));
  }

  async createDisposal(dto: CreateFixedAssetDisposalDto) {
    const asset = await this.getAssetOrThrow(dto.assetId);
    this.ensureAssetOperational(asset);
    if (Number(asset.acquisitionCost) <= 0) throw new BadRequestException("Only acquired assets can be disposed.");
    const existingPostedDisposal = await this.prisma.fixedAssetDisposal.findFirst({
      where: { assetId: dto.assetId, status: FixedAssetTransactionStatus.POSTED },
      select: { id: true },
    });
    if (existingPostedDisposal) throw new BadRequestException("This asset has already been disposed.");
    if ((dto.proceedsAmount ?? 0) > 0 && !dto.proceedsAccountId) throw new BadRequestException("Disposal proceeds account is required when proceeds are recorded.");
    if (dto.proceedsAccountId) await this.validatePostingAccount(dto.proceedsAccountId, ["ASSET"], "Disposal proceeds account");
    if ((dto.disposalExpense ?? 0) > 0 && !dto.disposalExpenseAccountId) {
      throw new BadRequestException("Disposal expense clearing account is required when disposal expenses are recorded.");
    }
    if (dto.disposalExpenseAccountId) {
      await this.validatePostingAccount(dto.disposalExpenseAccountId, ["ASSET", "LIABILITY"], "Disposal expense clearing account");
    }
    const bookValue = Number(asset.bookValue);
    const gainLoss = (dto.proceedsAmount ?? 0) - (dto.disposalExpense ?? 0) - bookValue;
    const row = await this.prisma.fixedAssetDisposal.create({
      data: {
        reference: dto.reference?.trim() || this.generateReference("FAS"),
        assetId: dto.assetId,
        disposalDate: new Date(dto.disposalDate),
        method: dto.method,
        proceedsAmount: this.amount(dto.proceedsAmount ?? 0),
        disposalExpense: this.amount(dto.disposalExpense ?? 0),
        bookValueAtDisposal: this.amount(bookValue),
        gainLossAmount: this.amount(gainLoss),
        proceedsAccountId: dto.proceedsAccountId || null,
        disposalExpenseAccountId: dto.disposalExpenseAccountId || null,
        description: this.nullable(dto.description),
      },
      include: this.disposalInclude(),
    });
    await this.logAudit("FixedAssetDisposal", row.id, AuditAction.CREATE, { reference: row.reference, assetId: row.assetId });
    return this.mapDisposal(row);
  }

  async postDisposal(id: string) {
    const disposal = await this.getDisposalOrThrow(id);
    if (disposal.status !== FixedAssetTransactionStatus.DRAFT) throw new BadRequestException("Only draft asset disposals can be posted.");
    this.ensureAssetOperational(disposal.asset);
    const lines = this.buildDisposalPostingLines(disposal);
    const row = await this.prisma.$transaction(async (tx) => {
      const { journalEntry, postedAt } = await this.createPostedJournalEntry(tx, disposal.disposalDate, `Fixed asset disposal ${disposal.reference}`, lines);
      await tx.fixedAsset.update({
        where: { id: disposal.assetId },
        data: { status: FixedAssetStatus.DISPOSED, bookValue: this.amount(0) },
      });
      return tx.fixedAssetDisposal.update({
        where: { id },
        data: { status: FixedAssetTransactionStatus.POSTED, journalEntryId: journalEntry.id, postedAt },
        include: this.disposalInclude(),
      });
    });
    await this.logAudit("FixedAssetDisposal", row.id, AuditAction.POST, { reference: row.reference, journalEntryId: row.journalEntryId });
    return this.mapDisposal(row);
  }

  async reverseDisposal(id: string) {
    const disposal = await this.getDisposalOrThrow(id);
    if (disposal.status !== FixedAssetTransactionStatus.POSTED) throw new BadRequestException("Only posted asset disposals can be reversed.");
    if (!disposal.journalEntryId) throw new BadRequestException("The disposal has no journal entry to reverse.");
    const row = await this.prisma.$transaction(async (tx) => {
      const { postedAt } = await this.createReversalJournalEntry(tx, disposal.journalEntryId!, `Reversal of fixed asset disposal ${disposal.reference}`);
      await tx.fixedAsset.update({
        where: { id: disposal.assetId },
        data: { status: FixedAssetStatus.ACTIVE, bookValue: disposal.bookValueAtDisposal },
      });
      return tx.fixedAssetDisposal.update({
        where: { id },
        data: { status: FixedAssetTransactionStatus.REVERSED, reversedAt: postedAt },
        include: this.disposalInclude(),
      });
    });
    await this.logAudit("FixedAssetDisposal", row.id, AuditAction.REVERSE, { reference: row.reference });
    return this.mapDisposal(row);
  }

  async listTransfers(query: { status?: string; assetId?: string; search?: string }) {
    const rows = await this.prisma.fixedAssetTransfer.findMany({
      where: {
        status: this.parseEnum(FixedAssetTransactionStatus, query.status, "transfer status"),
        assetId: query.assetId,
        OR: this.search(query.search, ["reference", "reason", "fromDepartment", "toDepartment", "fromLocation", "toLocation"]),
      },
      include: this.transferInclude(),
      orderBy: [{ transferDate: "desc" }, { createdAt: "desc" }],
    });
    return rows.map((row) => this.mapTransfer(row));
  }

  async createTransfer(dto: CreateFixedAssetTransferDto) {
    const asset = await this.getAssetOrThrow(dto.assetId);
    this.ensureAssetOperational(asset);
    const hasDestination =
      Boolean(this.nullable(dto.toDepartment)) ||
      Boolean(this.nullable(dto.toCostCenter)) ||
      Boolean(this.nullable(dto.toEmployee)) ||
      Boolean(this.nullable(dto.toLocation)) ||
      Boolean(this.nullable(dto.toBranch));
    if (!hasDestination) {
      throw new BadRequestException("A transfer requires at least one destination assignment.");
    }
    if (
      this.nullable(dto.toDepartment) === asset.department &&
      this.nullable(dto.toCostCenter) === asset.costCenter &&
      this.nullable(dto.toEmployee) === asset.employee &&
      this.nullable(dto.toLocation) === asset.location &&
      this.nullable(dto.toBranch) === asset.branch
    ) {
      throw new BadRequestException("Transfer destination must change at least one asset assignment.");
    }
    const row = await this.prisma.fixedAssetTransfer.create({
      data: {
        reference: dto.reference?.trim() || this.generateReference("FAT"),
        assetId: dto.assetId,
        transferDate: new Date(dto.transferDate),
        fromDepartment: asset.department,
        toDepartment: this.nullable(dto.toDepartment),
        fromCostCenter: asset.costCenter,
        toCostCenter: this.nullable(dto.toCostCenter),
        fromEmployee: asset.employee,
        toEmployee: this.nullable(dto.toEmployee),
        fromLocation: asset.location,
        toLocation: this.nullable(dto.toLocation),
        fromBranch: asset.branch,
        toBranch: this.nullable(dto.toBranch),
        reason: this.nullable(dto.reason),
      },
      include: this.transferInclude(),
    });
    await this.logAudit("FixedAssetTransfer", row.id, AuditAction.CREATE, { reference: row.reference, assetId: row.assetId });
    return this.mapTransfer(row);
  }

  async postTransfer(id: string) {
    const transfer = await this.getTransferOrThrow(id);
    if (transfer.status !== FixedAssetTransactionStatus.DRAFT) throw new BadRequestException("Only draft fixed asset transfers can be posted.");
    this.ensureAssetOperational(transfer.asset);
    const row = await this.prisma.$transaction(async (tx) => {
      await tx.fixedAsset.update({
        where: { id: transfer.assetId },
        data: {
          department: transfer.toDepartment ?? transfer.fromDepartment,
          costCenter: transfer.toCostCenter ?? transfer.fromCostCenter,
          employee: transfer.toEmployee ?? transfer.fromEmployee,
          location: transfer.toLocation ?? transfer.fromLocation,
          branch: transfer.toBranch ?? transfer.fromBranch,
        },
      });
      return tx.fixedAssetTransfer.update({
        where: { id },
        data: { status: FixedAssetTransactionStatus.POSTED, postedAt: new Date() },
        include: this.transferInclude(),
      });
    });
    await this.logAudit("FixedAssetTransfer", row.id, AuditAction.POST, { reference: row.reference });
    return this.mapTransfer(row);
  }

  async reverseTransfer(id: string) {
    const transfer = await this.getTransferOrThrow(id);
    if (transfer.status !== FixedAssetTransactionStatus.POSTED) {
      throw new BadRequestException("Only posted fixed asset transfers can be reversed.");
    }
    const laterPostedTransfer = await this.prisma.fixedAssetTransfer.findFirst({
      where: {
        assetId: transfer.assetId,
        status: FixedAssetTransactionStatus.POSTED,
        postedAt: { gt: transfer.postedAt ?? transfer.createdAt },
      },
      select: { id: true },
    });
    if (laterPostedTransfer) {
      throw new BadRequestException("Reverse later posted transfers for this asset before reversing this transfer.");
    }
    const reversedAt = new Date();
    const row = await this.prisma.$transaction(async (tx) => {
      await tx.fixedAsset.update({
        where: { id: transfer.assetId },
        data: {
          department: transfer.fromDepartment,
          costCenter: transfer.fromCostCenter,
          employee: transfer.fromEmployee,
          location: transfer.fromLocation,
          branch: transfer.fromBranch,
        },
      });
      return tx.fixedAssetTransfer.update({
        where: { id },
        data: { status: FixedAssetTransactionStatus.REVERSED, reversedAt },
        include: this.transferInclude(),
      });
    });
    await this.logAudit("FixedAssetTransfer", row.id, AuditAction.REVERSE, { reference: row.reference });
    return this.mapTransfer(row);
  }

  async getSummary() {
    const [assets, acquisitions, depreciationRuns, disposals, transfers] = await Promise.all([
      this.prisma.fixedAsset.findMany(),
      this.prisma.fixedAssetAcquisition.findMany(),
      this.prisma.fixedAssetDepreciationRun.findMany(),
      this.prisma.fixedAssetDisposal.findMany(),
      this.prisma.fixedAssetTransfer.findMany(),
    ]);
    return {
      assetCount: assets.length,
      activeAssetCount: assets.filter((asset) => asset.status === FixedAssetStatus.ACTIVE).length,
      acquisitionCost: this.format(this.sum(assets.map((asset) => Number(asset.acquisitionCost)))),
      accumulatedDepreciation: this.format(this.sum(assets.map((asset) => Number(asset.accumulatedDepreciation)))),
      bookValue: this.format(this.sum(assets.map((asset) => Number(asset.bookValue)))),
      postedAcquisitions: acquisitions.filter((row) => row.status === FixedAssetTransactionStatus.POSTED).length,
      postedDepreciationRuns: depreciationRuns.filter((row) => row.status === FixedAssetTransactionStatus.POSTED).length,
      postedDisposals: disposals.filter((row) => row.status === FixedAssetTransactionStatus.POSTED).length,
      postedTransfers: transfers.filter((row) => row.status === FixedAssetTransactionStatus.POSTED).length,
    };
  }

  private buildDepreciationPostingLines(run: Awaited<ReturnType<FixedAssetsService["getDepreciationRunOrThrow"]>>) {
    const bucket = new Map<string, { debit: number; credit: number; description: string }>();
    const add = (accountId: string, debit: number, credit: number, description: string) => {
      const current = bucket.get(accountId) ?? { debit: 0, credit: 0, description };
      current.debit += debit;
      current.credit += credit;
      bucket.set(accountId, current);
    };
    for (const line of run.lines) {
      const amount = Number(line.depreciationAmount);
      add(line.asset.category.depreciationExpenseAccountId, amount, 0, `Depreciation expense ${line.asset.code}`);
      add(line.asset.category.accumulatedDepreciationAccountId, 0, amount, `Accumulated depreciation ${line.asset.code}`);
    }
    return [...bucket.entries()].flatMap(([accountId, value]) => [
      ...(value.debit ? [{ accountId, description: value.description, debitAmount: value.debit, creditAmount: 0 }] : []),
      ...(value.credit ? [{ accountId, description: value.description, debitAmount: 0, creditAmount: value.credit }] : []),
    ]);
  }

  private buildDisposalPostingLines(disposal: Awaited<ReturnType<FixedAssetsService["getDisposalOrThrow"]>>) {
    const category = disposal.asset.category;
    const lines: PostingLine[] = [
      {
        accountId: category.accumulatedDepreciationAccountId,
        description: `Clear accumulated depreciation ${disposal.asset.code}`,
        debitAmount: Number(disposal.asset.accumulatedDepreciation),
        creditAmount: 0,
      },
      {
        accountId: category.assetAccountId,
        description: `Remove asset cost ${disposal.asset.code}`,
        debitAmount: 0,
        creditAmount: Number(disposal.asset.acquisitionCost),
      },
    ];
    if (Number(disposal.proceedsAmount) > 0 && disposal.proceedsAccountId) {
      lines.push({
        accountId: disposal.proceedsAccountId,
        description: `Disposal proceeds ${disposal.reference}`,
        debitAmount: Number(disposal.proceedsAmount),
        creditAmount: 0,
      });
    }
    if (Number(disposal.disposalExpense) > 0 && disposal.disposalExpenseAccountId) {
      lines.push({
        accountId: disposal.disposalExpenseAccountId,
        description: `Disposal expense clearing ${disposal.reference}`,
        debitAmount: 0,
        creditAmount: Number(disposal.disposalExpense),
      });
    }
    const gainLoss = Number(disposal.gainLossAmount);
    if (gainLoss > 0) {
      if (!category.disposalGainAccountId) throw new BadRequestException("Disposal gain account is required for gain disposals.");
      lines.push({ accountId: category.disposalGainAccountId, description: `Gain on disposal ${disposal.reference}`, debitAmount: 0, creditAmount: gainLoss });
    }
    if (gainLoss < 0) {
      if (!category.disposalLossAccountId) throw new BadRequestException("Disposal loss account is required for loss disposals.");
      lines.push({ accountId: category.disposalLossAccountId, description: `Loss on disposal ${disposal.reference}`, debitAmount: Math.abs(gainLoss), creditAmount: 0 });
    }
    return lines.filter((line) => line.debitAmount > 0 || line.creditAmount > 0);
  }

  private calculateDepreciationForPeriod(asset: any, periodStart: Date, periodEnd: Date) {
    const cost = Number(asset.acquisitionCost);
    const residual = Number(asset.residualValue);
    const accumulated = Number(asset.accumulatedDepreciation);
    const depreciableBase = Math.max(0, cost - residual);
    const remainingDepreciable = Math.max(0, depreciableBase - accumulated);
    if (remainingDepreciable <= 0) return 0;
    const eligibleStart = new Date(Math.max(periodStart.getTime(), new Date(asset.depreciationStartDate).getTime()));
    const periodCount = this.countInclusiveMonths(eligibleStart, periodEnd);
    if (periodCount <= 0) return 0;
    let amount = remainingDepreciable;
    if (asset.depreciationMethod === FixedAssetDepreciationMethod.DECLINING_BALANCE) {
      amount = Number(asset.bookValue) * (2 / Math.max(asset.usefulLifeMonths, 1)) * periodCount;
    } else {
      amount = (depreciableBase / Math.max(asset.usefulLifeMonths, 1)) * periodCount;
    }
    return Math.min(remainingDepreciable, Number(amount.toFixed(2)));
  }

  private countInclusiveMonths(start: Date, end: Date) {
    const normalizedStart = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
    const normalizedEnd = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));
    if (normalizedStart > normalizedEnd) return 0;
    return (normalizedEnd.getUTCFullYear() - normalizedStart.getUTCFullYear()) * 12 + (normalizedEnd.getUTCMonth() - normalizedStart.getUTCMonth()) + 1;
  }

  private async createReversalJournalEntry(tx: Prisma.TransactionClient, journalEntryId: string, description: string) {
    const originalEntry = await tx.journalEntry.findUnique({
      where: { id: journalEntryId },
      include: { lines: { orderBy: { lineNumber: "asc" } } },
    });
    if (!originalEntry) throw new BadRequestException("Original fixed asset journal entry was not found.");
    return this.createPostedJournalEntry(
      tx,
      new Date(),
      description,
      originalEntry.lines.map((line) => ({
        accountId: line.accountId,
        description: `Reversal of line ${line.lineNumber}`,
        debitAmount: Number(line.creditAmount),
        creditAmount: Number(line.debitAmount),
      })),
      originalEntry.id,
    );
  }

  private async createPostedJournalEntry(
    tx: Prisma.TransactionClient,
    entryDate: Date,
    description: string,
    lines: PostingLine[],
    reversalOfId?: string | null,
  ) {
    this.journalEntriesService.validateLines(lines);
    await this.validatePostingAccountsInTransaction(tx, [...new Set(lines.map((line) => line.accountId))]);
    const postedAt = new Date();
    const batch = await tx.postingBatch.create({ data: { postedAt } });
    const journalEntry = await tx.journalEntry.create({
      data: {
        reference: this.generateReference("JE"),
        entryDate,
        description,
        status: "POSTED",
        postedAt,
        postingBatchId: batch.id,
        reversalOfId: reversalOfId ?? undefined,
        lines: {
          create: lines.map((line, index) => ({
            accountId: line.accountId,
            lineNumber: index + 1,
            description: line.description,
            debitAmount: this.amount(line.debitAmount),
            creditAmount: this.amount(line.creditAmount),
          })),
        },
      },
    });
    const journalLines = await tx.journalEntryLine.findMany({
      where: { journalEntryId: journalEntry.id },
      orderBy: { lineNumber: "asc" },
    });
    await tx.ledgerTransaction.createMany({
      data: journalLines.map((line) => ({
        postingBatchId: batch.id,
        journalEntryId: journalEntry.id,
        journalEntryLineId: line.id,
        accountId: line.accountId,
        reference: journalEntry.reference,
        entryDate: journalEntry.entryDate,
        postedAt,
        description: line.description ?? journalEntry.description,
        debitAmount: line.debitAmount,
        creditAmount: line.creditAmount,
      })),
    });
    await this.updateAccountBalancesInTransaction(tx, journalLines);
    return { journalEntry, postedAt };
  }

  private async validatePostingAccountsInTransaction(tx: Prisma.TransactionClient, accountIds: string[]) {
    const accounts = await tx.account.findMany({ where: { id: { in: accountIds } } });
    if (accounts.length !== accountIds.length) throw new BadRequestException("One or more fixed asset posting accounts were not found.");
    for (const account of accounts) {
      if (!account.isActive || !account.isPosting || account.allowManualPosting === false) {
        throw new BadRequestException(`Account ${account.code} is not available for fixed asset posting.`);
      }
    }
  }

  private async updateAccountBalancesInTransaction(
    tx: Prisma.TransactionClient,
    lines: Array<{ accountId: string; debitAmount: { toString(): string }; creditAmount: { toString(): string } }>,
  ) {
    const netByAccount = new Map<string, number>();
    for (const line of lines) {
      netByAccount.set(line.accountId, (netByAccount.get(line.accountId) ?? 0) + Number(line.debitAmount) - Number(line.creditAmount));
    }
    for (const [accountId, amount] of [...netByAccount.entries()].filter(([, amount]) => amount !== 0)) {
      await tx.account.update({ where: { id: accountId }, data: { currentBalance: { increment: Number(amount.toFixed(2)) } } });
    }
  }

  private async validateCategoryAccounts(dto: Partial<CreateFixedAssetCategoryDto>) {
    if (dto.assetAccountId) await this.validatePostingAccount(dto.assetAccountId, ["ASSET"], "Fixed asset account");
    if (dto.accumulatedDepreciationAccountId) await this.validatePostingAccount(dto.accumulatedDepreciationAccountId, ["ASSET"], "Accumulated depreciation account");
    if (dto.depreciationExpenseAccountId) await this.validatePostingAccount(dto.depreciationExpenseAccountId, ["EXPENSE"], "Depreciation expense account");
    if (dto.disposalGainAccountId) await this.validatePostingAccount(dto.disposalGainAccountId, ["REVENUE"], "Disposal gain account");
    if (dto.disposalLossAccountId) await this.validatePostingAccount(dto.disposalLossAccountId, ["EXPENSE"], "Disposal loss account");
  }

  private async validatePostingAccount(id: string, allowedTypes: Array<"ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE">, label: string) {
    const account = await this.prisma.account.findUnique({ where: { id }, select: this.accountSelect });
    if (!account) throw new BadRequestException(`${label} was not found.`);
    if (!account.isActive || !account.isPosting) throw new BadRequestException(`${label} must be active and posting.`);
    if (!allowedTypes.includes(account.type)) throw new BadRequestException(`${label} must use one of these account types: ${allowedTypes.join(", ")}.`);
  }

  private ensureAssetEditable(asset: any) {
    if (asset.status === FixedAssetStatus.DISPOSED || Number(asset.accumulatedDepreciation) > 0) {
      throw new BadRequestException("Fixed asset details cannot be edited after depreciation or disposal activity.");
    }
  }

  private ensureAssetOperational(asset: any) {
    if (asset.status !== FixedAssetStatus.ACTIVE) throw new BadRequestException("Only active fixed assets can be used in new transactions.");
  }

  private async getCategoryOrThrow(id: string) {
    const row = await this.prisma.fixedAssetCategory.findUnique({ where: { id }, include: this.categoryInclude() });
    if (!row) throw new BadRequestException(`Fixed asset category ${id} was not found.`);
    return row;
  }

  private async getAssetOrThrow(id: string) {
    const row = await this.prisma.fixedAsset.findUnique({ where: { id }, include: this.assetInclude() });
    if (!row) throw new BadRequestException(`Fixed asset ${id} was not found.`);
    return row;
  }

  private async getAcquisitionOrThrow(id: string) {
    const row = await this.prisma.fixedAssetAcquisition.findUnique({ where: { id }, include: this.acquisitionInclude() });
    if (!row) throw new BadRequestException(`Fixed asset acquisition ${id} was not found.`);
    return row;
  }

  private async getDepreciationRunOrThrow(id: string) {
    const row = await this.prisma.fixedAssetDepreciationRun.findUnique({ where: { id }, include: this.depreciationRunInclude() });
    if (!row) throw new BadRequestException(`Fixed asset depreciation run ${id} was not found.`);
    return row;
  }

  private async getDisposalOrThrow(id: string) {
    const row = await this.prisma.fixedAssetDisposal.findUnique({ where: { id }, include: this.disposalInclude() });
    if (!row) throw new BadRequestException(`Fixed asset disposal ${id} was not found.`);
    return row;
  }

  private async getTransferOrThrow(id: string) {
    const row = await this.prisma.fixedAssetTransfer.findUnique({ where: { id }, include: this.transferInclude() });
    if (!row) throw new BadRequestException(`Fixed asset transfer ${id} was not found.`);
    return row;
  }

  private categoryInclude() {
    return {
      assetAccount: { select: this.accountSelect },
      accumulatedDepreciationAccount: { select: this.accountSelect },
      depreciationExpenseAccount: { select: this.accountSelect },
      disposalGainAccount: { select: this.accountSelect },
      disposalLossAccount: { select: this.accountSelect },
      _count: { select: { assets: true } },
    };
  }

  private assetInclude() {
    return {
      category: { include: this.categoryInclude() },
      acquisitions: { orderBy: { createdAt: "desc" as const } },
      depreciationLines: { include: { run: true }, orderBy: { createdAt: "desc" as const } },
      disposals: { orderBy: { createdAt: "desc" as const } },
      transfers: { orderBy: { createdAt: "desc" as const } },
    };
  }

  private acquisitionInclude() {
    return {
      asset: { include: { category: { include: this.categoryInclude() } } },
      clearingAccount: { select: this.accountSelect },
      journalEntry: { select: { id: true, reference: true } },
    };
  }

  private depreciationRunInclude() {
    return {
      journalEntry: { select: { id: true, reference: true } },
      lines: { include: { asset: { include: { category: { include: this.categoryInclude() } } } }, orderBy: { createdAt: "asc" as const } },
    };
  }

  private disposalInclude() {
    return {
      asset: { include: { category: { include: this.categoryInclude() } } },
      proceedsAccount: { select: this.accountSelect },
      disposalExpenseAccount: { select: this.accountSelect },
      journalEntry: { select: { id: true, reference: true } },
    };
  }

  private transferInclude() {
    return { asset: { include: { category: { include: this.categoryInclude() } } } };
  }

  private mapCategory(row: any) {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      nameAr: row.nameAr,
      description: row.description,
      isActive: row.isActive,
      assetAccount: row.assetAccount,
      accumulatedDepreciationAccount: row.accumulatedDepreciationAccount,
      depreciationExpenseAccount: row.depreciationExpenseAccount,
      disposalGainAccount: row.disposalGainAccount,
      disposalLossAccount: row.disposalLossAccount,
      assetCount: row._count?.assets ?? 0,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private mapAsset(row: any) {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      categoryId: row.categoryId,
      category: row.category ? this.mapCategory(row.category) : null,
      acquisitionDate: row.acquisitionDate.toISOString(),
      depreciationStartDate: row.depreciationStartDate.toISOString(),
      usefulLifeMonths: row.usefulLifeMonths,
      depreciationMethod: row.depreciationMethod,
      residualValue: row.residualValue.toString(),
      acquisitionCost: row.acquisitionCost.toString(),
      accumulatedDepreciation: row.accumulatedDepreciation.toString(),
      bookValue: row.bookValue.toString(),
      status: row.status,
      department: row.department,
      costCenter: row.costCenter,
      employee: row.employee,
      location: row.location,
      branch: row.branch,
      acquisitions: row.acquisitions?.map((item: any) => ({ id: item.id, reference: item.reference, status: item.status, totalCost: item.totalCost.toString(), postedAt: item.postedAt?.toISOString() ?? null })) ?? [],
      depreciationHistory: row.depreciationLines?.map((line: any) => ({ id: line.id, reference: line.run?.reference, amount: line.depreciationAmount.toString(), periodEnd: line.run?.periodEnd?.toISOString() })) ?? [],
      depreciationSchedule: this.buildDepreciationSchedule(row),
      disposals: row.disposals?.map((item: any) => ({ id: item.id, reference: item.reference, status: item.status, gainLossAmount: item.gainLossAmount.toString() })) ?? [],
      transfers: row.transfers?.map((item: any) => ({ id: item.id, reference: item.reference, status: item.status, toLocation: item.toLocation, toDepartment: item.toDepartment })) ?? [],
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private mapAcquisition(row: any) {
    return {
      id: row.id,
      reference: row.reference,
      status: row.status,
      asset: this.mapAsset({ ...row.asset, acquisitions: [], depreciationLines: [], disposals: [], transfers: [] }),
      acquisitionDate: row.acquisitionDate.toISOString(),
      acquisitionCost: row.acquisitionCost.toString(),
      capitalizedCost: row.capitalizedCost.toString(),
      totalCost: row.totalCost.toString(),
      supplierReference: row.supplierReference,
      purchaseInvoiceReference: row.purchaseInvoiceReference,
      paymentReference: row.paymentReference,
      clearingAccount: row.clearingAccount,
      description: row.description,
      journalEntryId: row.journalEntryId,
      journalReference: row.journalEntry?.reference ?? null,
      postedAt: row.postedAt?.toISOString() ?? null,
      reversedAt: row.reversedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private mapDepreciationRun(row: any) {
    return {
      id: row.id,
      reference: row.reference,
      status: row.status,
      periodStart: row.periodStart.toISOString(),
      periodEnd: row.periodEnd.toISOString(),
      scope: row.scope,
      categoryId: row.categoryId,
      assetId: row.assetId,
      description: row.description,
      totalAmount: row.totalAmount.toString(),
      journalEntryId: row.journalEntryId,
      journalReference: row.journalEntry?.reference ?? null,
      postedAt: row.postedAt?.toISOString() ?? null,
      reversedAt: row.reversedAt?.toISOString() ?? null,
      lines: row.lines?.map((line: any) => ({
        id: line.id,
        asset: this.mapAsset({ ...line.asset, acquisitions: [], depreciationLines: [], disposals: [], transfers: [] }),
        depreciationAmount: line.depreciationAmount.toString(),
        accumulatedBefore: line.accumulatedBefore.toString(),
        accumulatedAfter: line.accumulatedAfter.toString(),
        bookValueBefore: line.bookValueBefore.toString(),
        bookValueAfter: line.bookValueAfter.toString(),
      })) ?? [],
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private mapDisposal(row: any) {
    return {
      id: row.id,
      reference: row.reference,
      status: row.status,
      asset: this.mapAsset({ ...row.asset, acquisitions: [], depreciationLines: [], disposals: [], transfers: [] }),
      disposalDate: row.disposalDate.toISOString(),
      method: row.method,
      proceedsAmount: row.proceedsAmount.toString(),
      disposalExpense: row.disposalExpense.toString(),
      bookValueAtDisposal: row.bookValueAtDisposal.toString(),
      gainLossAmount: row.gainLossAmount.toString(),
      proceedsAccount: row.proceedsAccount,
      disposalExpenseAccount: row.disposalExpenseAccount,
      description: row.description,
      journalEntryId: row.journalEntryId,
      journalReference: row.journalEntry?.reference ?? null,
      postedAt: row.postedAt?.toISOString() ?? null,
      reversedAt: row.reversedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private mapTransfer(row: any) {
    return {
      id: row.id,
      reference: row.reference,
      status: row.status,
      asset: this.mapAsset({ ...row.asset, acquisitions: [], depreciationLines: [], disposals: [], transfers: [] }),
      transferDate: row.transferDate.toISOString(),
      fromDepartment: row.fromDepartment,
      toDepartment: row.toDepartment,
      fromCostCenter: row.fromCostCenter,
      toCostCenter: row.toCostCenter,
      fromEmployee: row.fromEmployee,
      toEmployee: row.toEmployee,
      fromLocation: row.fromLocation,
      toLocation: row.toLocation,
      fromBranch: row.fromBranch,
      toBranch: row.toBranch,
      reason: row.reason,
      postedAt: row.postedAt?.toISOString() ?? null,
      reversedAt: row.reversedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private buildDepreciationSchedule(asset: any) {
    const cost = Number(asset.acquisitionCost);
    const residual = Number(asset.residualValue);
    const depreciableBase = Math.max(0, cost - residual);
    if (depreciableBase <= 0 || asset.usefulLifeMonths <= 0) return [];
    const monthlyAmount = asset.depreciationMethod === FixedAssetDepreciationMethod.DECLINING_BALANCE
      ? null
      : Number((depreciableBase / asset.usefulLifeMonths).toFixed(2));
    const start = new Date(asset.depreciationStartDate);
    let projectedAccumulated = 0;
    return Array.from({ length: asset.usefulLifeMonths }, (_, index) => {
      const periodDate = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + index, 1));
      const amount = Math.min(depreciableBase - projectedAccumulated, monthlyAmount ?? Number((((cost - projectedAccumulated) * (2 / asset.usefulLifeMonths))).toFixed(2)));
      projectedAccumulated = Number((projectedAccumulated + Math.max(0, amount)).toFixed(2));
      return {
        periodStart: periodDate.toISOString(),
        amount: Math.max(0, amount).toFixed(2),
        projectedAccumulated: projectedAccumulated.toFixed(2),
        projectedBookValue: Math.max(residual, Number((cost - projectedAccumulated).toFixed(2))).toFixed(2),
      };
    });
  }

  private async getAssetAuditHistory(asset: any) {
    const entityIdGroups = [
      { entity: "FixedAsset", ids: [asset.id] },
      { entity: "FixedAssetAcquisition", ids: asset.acquisitions?.map((item: any) => item.id) ?? [] },
      { entity: "FixedAssetDepreciationRun", ids: asset.depreciationLines?.map((line: any) => line.runId) ?? [] },
      { entity: "FixedAssetDisposal", ids: asset.disposals?.map((item: any) => item.id) ?? [] },
      { entity: "FixedAssetTransfer", ids: asset.transfers?.map((item: any) => item.id) ?? [] },
    ].filter((group) => group.ids.length > 0);
    const logs = await this.prisma.auditLog.findMany({
      where: {
        OR: entityIdGroups.map((group) => ({
          entity: group.entity,
          entityId: { in: group.ids },
        })),
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return logs.map((log) => ({
      id: log.id,
      entity: log.entity,
      entityId: log.entityId,
      action: log.action,
      details: log.details,
      createdAt: log.createdAt.toISOString(),
    }));
  }

  private async logAudit(entity: string, entityId: string, action: AuditAction, details?: object) {
    await this.auditService.log({ entity, entityId, action, details });
  }

  private search(value: string | undefined, fields: string[]) {
    const search = value?.trim();
    return search ? fields.map((field) => ({ [field]: { contains: search, mode: "insensitive" as const } })) : undefined;
  }

  private parseEnum<T extends Record<string, string>>(enumObj: T, value: string | undefined, label: string) {
    if (!value?.trim()) return undefined;
    if (!Object.values(enumObj).includes(value)) throw new BadRequestException(`Unsupported ${label} ${value}.`);
    return value as T[keyof T];
  }

  private nullable(value?: string | null) {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }

  private amount(value: number | string | Prisma.Decimal) {
    return new Prisma.Decimal(value).toDecimalPlaces(2);
  }

  private format(value: number) {
    return value.toFixed(2);
  }

  private sum(values: number[]) {
    return values.reduce((total, value) => total + value, 0);
  }

  private generateReference(prefix: string) {
    const compactDate = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase();
    return `${prefix}-${compactDate}-${suffix}`;
  }

  private isUniqueConflict(error: unknown, target: string) {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002" && Array.isArray(error.meta?.target) && error.meta.target.includes(target);
  }
}
