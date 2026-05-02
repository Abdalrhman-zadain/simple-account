import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import { AuditAction, Prisma } from "../../../generated/prisma";

import { PrismaService } from "../../../common/prisma/prisma.service";
import {
  CreateReportDefinitionDto,
  CreateReportSnapshotDto,
  CreateReportSnapshotVersionDto,
  ExportReportDto,
  ReportingAuditQueryDto,
  ReportingGeneralLedgerQueryDto,
  ReportingQueryDto,
  UpdateReportDefinitionDto,
} from "./dto/reporting.dto";

type AccountRow = {
  id: string;
  code: string;
  name: string;
  nameAr: string | null;
  type: "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";
  currencyCode: string;
  segment3: string | null;
  segment4: string | null;
  segment5: string | null;
  isActive: boolean;
  isPosting: boolean;
};

type AmountMap = Map<string, { debit: number; credit: number }>;
type AuthUser = { userId: string; email?: string; role?: string };
type RawRow = Record<string, unknown>;
type ExportSection = { headers: string[]; rows: Array<Array<string | number | null | undefined>> };
type WorkbookCell = { value: string | number; kind?: "title" | "meta" | "header" | "currency" | "text" };
type WorkbookSheet = { name: string; rows: WorkbookCell[][] };

@Injectable()
export class ReportingService {
  private persistenceReady = false;
  private persistenceReadyPromise: Promise<void> | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async getSummary(query: ReportingQueryDto, user?: AuthUser, shouldLog = true) {
    const canSeeAudit = user?.role === "ADMIN" || user?.role === "MANAGER";
    const [trialBalance, balanceSheet, profitLoss, cashMovement, audit, warnings] = await Promise.all([
      this.getTrialBalance(query, user, false),
      this.getBalanceSheet(query, user, false),
      this.getProfitLoss(query, user, false),
      this.getCashMovement(query, user, false),
      canSeeAudit ? this.getAudit({ ...query, limit: 50 }, user, false) : Promise.resolve({ totalEvents: 0 }),
      this.getWarnings(user),
    ]);

    const totalAssets = Number(balanceSheet.totals.assets.amount);
    const comparisonAssets = Number(balanceSheet.totals.assets.comparisonAmount);
    const totalLiabilities = Number(balanceSheet.totals.liabilities.amount);
    const comparisonLiabilities = Number(balanceSheet.totals.liabilities.comparisonAmount);
    const totalEquity = Number(balanceSheet.totals.equity.amount);
    const comparisonEquity = Number(balanceSheet.totals.equity.comparisonAmount);
    const netIncome = Number(profitLoss.totals.netIncome.amount);
    const comparisonNetIncome = Number(profitLoss.totals.netIncome.comparisonAmount);
    const netCashMovement = Number(cashMovement.totals.netMovement.amount);
    const comparisonNetCashMovement = Number(cashMovement.totals.netMovement.comparisonAmount);
    const trialBalanceDifference = Number(trialBalance.totals.difference);

    const payload = {
      generatedAt: new Date().toISOString(),
      basis: this.getBasis(query),
      period: this.buildPeriodLabel(query.dateFrom, query.dateTo),
      comparisonPeriod: this.buildPeriodLabel(query.comparisonFrom, query.comparisonTo),
      metrics: [
        this.metric("assets", "Total assets", totalAssets, comparisonAssets),
        this.metric("liabilities", "Total liabilities", totalLiabilities, comparisonLiabilities),
        this.metric("equity", "Total equity", totalEquity, comparisonEquity),
        this.metric("netIncome", "Net income", netIncome, comparisonNetIncome),
        this.metric("netCashMovement", "Net cash movement", netCashMovement, comparisonNetCashMovement),
        {
          key: "trialBalanceDifference",
          label: "Trial balance difference",
          amount: this.toAmount(trialBalanceDifference),
          comparisonAmount: "0.00",
          varianceAmount: this.toAmount(trialBalanceDifference),
        },
      ],
      operational: {
        trialBalanceRowCount: trialBalance.rows.length,
        cashAccountCount: cashMovement.rows.length,
        auditEventCount: audit.totalEvents,
      },
      warnings,
    };

    if (shouldLog) await this.logReportEvent(user, "ReportingSummary", "VIEW", { query, metricCount: payload.metrics.length });
    return payload;
  }

  async getTrialBalance(query: ReportingQueryDto, user?: AuthUser, shouldLog = true) {
    const includeZeroBalance = this.shouldIncludeZeroBalance(query.includeZeroBalance);
    const accounts = await this.getPostingAccounts(query);
    const accountIds = accounts.map((account) => account.id);
    const [openingMap, periodMap] = await Promise.all([
      this.aggregateLedger(accountIds, query, undefined, query.dateFrom, true),
      this.aggregateLedger(accountIds, query, query.dateFrom, query.dateTo, false),
    ]);

    const rows = accounts
      .map((account) => {
        const opening = this.net(openingMap.get(account.id));
        const period = periodMap.get(account.id) ?? { debit: 0, credit: 0 };
        const closing = opening + period.debit - period.credit;

        return {
          accountId: account.id,
          accountCode: account.code,
          accountName: account.name,
          accountNameAr: account.nameAr,
          accountType: account.type,
          currencyCode: account.currencyCode,
          openingBalance: this.toAmount(opening),
          debitTotal: this.toAmount(period.debit),
          creditTotal: this.toAmount(period.credit),
          closingBalance: this.toAmount(Math.abs(closing)),
          closingSide: closing > 0 ? "DEBIT" : closing < 0 ? "CREDIT" : "ZERO",
          drillDownPath: this.buildGeneralLedgerPath(account.id, query),
        };
      })
      .filter((row) => {
        if (includeZeroBalance) return true;
        return !(
          Number(row.openingBalance) === 0 &&
          Number(row.debitTotal) === 0 &&
          Number(row.creditTotal) === 0 &&
          Number(row.closingBalance) === 0
        );
      });

    const totals = rows.reduce(
      (acc, row) => {
        acc.opening += Number(row.openingBalance);
        acc.debit += Number(row.debitTotal);
        acc.credit += Number(row.creditTotal);
        if (row.closingSide === "DEBIT") acc.closingDebit += Number(row.closingBalance);
        if (row.closingSide === "CREDIT") acc.closingCredit += Number(row.closingBalance);
        return acc;
      },
      { opening: 0, debit: 0, credit: 0, closingDebit: 0, closingCredit: 0 },
    );

    const payload = {
      generatedAt: new Date().toISOString(),
      basis: this.getBasis(query),
      period: this.buildPeriodLabel(query.dateFrom, query.dateTo),
      totals: {
        opening: this.toAmount(totals.opening),
        debit: this.toAmount(totals.debit),
        credit: this.toAmount(totals.credit),
        closingDebit: this.toAmount(totals.closingDebit),
        closingCredit: this.toAmount(totals.closingCredit),
        difference: this.toAmount(totals.closingDebit - totals.closingCredit),
      },
      rows,
    };

    if (shouldLog) await this.logReportEvent(user, "ReportingTrialBalance", "VIEW", { query, rowCount: rows.length });
    return payload;
  }

  async getBalanceSheet(query: ReportingQueryDto, user?: AuthUser, shouldLog = true) {
    const accounts = await this.getPostingAccounts(query, ["ASSET", "LIABILITY", "EQUITY"]);
    const accountIds = accounts.map((account) => account.id);
    const [currentMap, comparisonMap] = await Promise.all([
      this.aggregateLedger(accountIds, query, undefined, query.dateTo, false),
      this.aggregateLedger(accountIds, query, undefined, query.comparisonTo, false),
    ]);

    const buildSection = (types: AccountRow["type"][]) => {
      const rows = accounts
        .filter((account) => types.includes(account.type))
        .map((account) => {
          const currentAmount = this.normalizeByType(account.type, this.net(currentMap.get(account.id)));
          const comparisonAmount = this.normalizeByType(account.type, this.net(comparisonMap.get(account.id)));
          return {
            accountId: account.id,
            accountCode: account.code,
            accountName: account.name,
            accountNameAr: account.nameAr,
            accountType: account.type,
            amount: this.toAmount(currentAmount),
            comparisonAmount: this.toAmount(comparisonAmount),
            varianceAmount: this.toAmount(currentAmount - comparisonAmount),
            drillDownPath: this.buildGeneralLedgerPath(account.id, query),
          };
        })
        .filter((row) => Number(row.amount) !== 0 || Number(row.comparisonAmount) !== 0);

      const totalAmount = rows.reduce((sum, row) => sum + Number(row.amount), 0);
      const totalComparisonAmount = rows.reduce((sum, row) => sum + Number(row.comparisonAmount), 0);

      return {
        rows,
        total: {
          amount: this.toAmount(totalAmount),
          comparisonAmount: this.toAmount(totalComparisonAmount),
          varianceAmount: this.toAmount(totalAmount - totalComparisonAmount),
        },
      };
    };

    const assets = buildSection(["ASSET"]);
    const liabilities = buildSection(["LIABILITY"]);
    const equity = buildSection(["EQUITY"]);

    const payload = {
      generatedAt: new Date().toISOString(),
      asOfDate: query.dateTo ?? new Date().toISOString().slice(0, 10),
      comparisonAsOfDate: query.comparisonTo ?? null,
      assets: assets.rows,
      liabilities: liabilities.rows,
      equity: equity.rows,
      totals: {
        assets: assets.total,
        liabilities: liabilities.total,
        equity: equity.total,
      },
    };

    if (shouldLog) await this.logReportEvent(user, "ReportingBalanceSheet", "VIEW", { query, rowCount: payload.assets.length + payload.liabilities.length + payload.equity.length });
    return payload;
  }

  async getProfitLoss(query: ReportingQueryDto, user?: AuthUser, shouldLog = true) {
    const accounts = await this.getPostingAccounts(query, ["REVENUE", "EXPENSE"]);
    const accountIds = accounts.map((account) => account.id);
    const [currentMap, comparisonMap] = await Promise.all([
      this.aggregateLedger(accountIds, query, query.dateFrom, query.dateTo, false),
      this.aggregateLedger(accountIds, query, query.comparisonFrom, query.comparisonTo, false),
    ]);

    const revenueRows = accounts
      .filter((account) => account.type === "REVENUE")
      .map((account) => this.profitLossRow(account, currentMap, comparisonMap))
      .filter((row) => Number(row.amount) !== 0 || Number(row.comparisonAmount) !== 0);

    const expenseRows = accounts
      .filter((account) => account.type === "EXPENSE")
      .map((account) => this.profitLossRow(account, currentMap, comparisonMap))
      .filter((row) => Number(row.amount) !== 0 || Number(row.comparisonAmount) !== 0);

    const revenueAmount = revenueRows.reduce((sum, row) => sum + Number(row.amount), 0);
    const revenueComparison = revenueRows.reduce((sum, row) => sum + Number(row.comparisonAmount), 0);
    const expenseAmount = expenseRows.reduce((sum, row) => sum + Number(row.amount), 0);
    const expenseComparison = expenseRows.reduce((sum, row) => sum + Number(row.comparisonAmount), 0);
    const netIncome = revenueAmount - expenseAmount;
    const comparisonNetIncome = revenueComparison - expenseComparison;

    const payload = {
      generatedAt: new Date().toISOString(),
      period: this.buildPeriodLabel(query.dateFrom, query.dateTo),
      comparisonPeriod: this.buildPeriodLabel(query.comparisonFrom, query.comparisonTo),
      revenue: revenueRows,
      expenses: expenseRows,
      totals: {
        revenue: {
          amount: this.toAmount(revenueAmount),
          comparisonAmount: this.toAmount(revenueComparison),
          varianceAmount: this.toAmount(revenueAmount - revenueComparison),
        },
        expenses: {
          amount: this.toAmount(expenseAmount),
          comparisonAmount: this.toAmount(expenseComparison),
          varianceAmount: this.toAmount(expenseAmount - expenseComparison),
        },
        netIncome: {
          amount: this.toAmount(netIncome),
          comparisonAmount: this.toAmount(comparisonNetIncome),
          varianceAmount: this.toAmount(netIncome - comparisonNetIncome),
        },
      },
    };

    if (shouldLog) await this.logReportEvent(user, "ReportingProfitLoss", "VIEW", { query, revenueCount: revenueRows.length, expenseCount: expenseRows.length });
    return payload;
  }

  async getCashMovement(query: ReportingQueryDto, user?: AuthUser, shouldLog = true) {
    const bankCashAccounts = await this.prisma.bankCashAccount.findMany({
      where: { isActive: true },
      include: {
        account: {
          select: {
            id: true,
            code: true,
            name: true,
            nameAr: true,
            type: true,
            currencyCode: true,
            segment3: true,
            segment4: true,
            segment5: true,
            isActive: true,
            isPosting: true,
          },
        },
      },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    });

    const filteredBankCashAccounts = bankCashAccounts.filter((row) => this.matchesAccountFilters(row.account, query));
    const accountIds = filteredBankCashAccounts.map((row) => row.accountId);
    const [openingMap, currentMap, comparisonOpeningMap, comparisonMap, currentTransactions, comparisonTransactions] = await Promise.all([
      this.aggregateLedger(accountIds, query, undefined, query.dateFrom, true),
      this.aggregateLedger(accountIds, query, query.dateFrom, query.dateTo, false),
      this.aggregateLedger(accountIds, query, undefined, query.comparisonFrom, true),
      this.aggregateLedger(accountIds, query, query.comparisonFrom, query.comparisonTo, false),
      this.getCashLedgerTransactions(accountIds, query.dateFrom, query.dateTo, query),
      this.getCashLedgerTransactions(accountIds, query.comparisonFrom, query.comparisonTo, query),
    ]);

    const rows = filteredBankCashAccounts.map((row) => {
      const opening = this.net(openingMap.get(row.accountId));
      const current = currentMap.get(row.accountId) ?? { debit: 0, credit: 0 };
      const comparisonOpening = this.net(comparisonOpeningMap.get(row.accountId));
      const comparison = comparisonMap.get(row.accountId) ?? { debit: 0, credit: 0 };
      const currentClosing = opening + current.debit - current.credit;
      const comparisonClosing = comparisonOpening + comparison.debit - comparison.credit;
      const currentMovement = current.debit - current.credit;
      const comparisonMovement = comparison.debit - comparison.credit;

      return {
        bankCashAccountId: row.id,
        accountId: row.accountId,
        code: row.account.code,
        name: row.name,
        nameAr: row.account.nameAr,
        type: row.type,
        currencyCode: row.currencyCode,
        openingBalance: this.toAmount(opening),
        debitTotal: this.toAmount(current.debit),
        creditTotal: this.toAmount(current.credit),
        netMovement: this.toAmount(currentMovement),
        closingBalance: this.toAmount(currentClosing),
        comparisonNetMovement: this.toAmount(comparisonMovement),
        comparisonClosingBalance: this.toAmount(comparisonClosing),
        varianceAmount: this.toAmount(currentMovement - comparisonMovement),
        drillDownPath: this.buildGeneralLedgerPath(row.accountId, query),
      };
    });

    const totals = rows.reduce(
      (acc, row) => {
        acc.opening += Number(row.openingBalance);
        acc.debit += Number(row.debitTotal);
        acc.credit += Number(row.creditTotal);
        acc.netMovement += Number(row.netMovement);
        acc.closing += Number(row.closingBalance);
        acc.comparisonNetMovement += Number(row.comparisonNetMovement);
        return acc;
      },
      { opening: 0, debit: 0, credit: 0, netMovement: 0, closing: 0, comparisonNetMovement: 0 },
    );

    const payload = {
      generatedAt: new Date().toISOString(),
      period: this.buildPeriodLabel(query.dateFrom, query.dateTo),
      comparisonPeriod: this.buildPeriodLabel(query.comparisonFrom, query.comparisonTo),
      rows,
      classified: this.classifyCashFlow(currentTransactions, comparisonTransactions, new Set(accountIds)),
      totals: {
        openingBalance: {
          amount: this.toAmount(totals.opening),
          comparisonAmount: "0.00",
          varianceAmount: this.toAmount(totals.opening),
        },
        debit: {
          amount: this.toAmount(totals.debit),
          comparisonAmount: "0.00",
          varianceAmount: this.toAmount(totals.debit),
        },
        credit: {
          amount: this.toAmount(totals.credit),
          comparisonAmount: "0.00",
          varianceAmount: this.toAmount(totals.credit),
        },
        netMovement: {
          amount: this.toAmount(totals.netMovement),
          comparisonAmount: this.toAmount(totals.comparisonNetMovement),
          varianceAmount: this.toAmount(totals.netMovement - totals.comparisonNetMovement),
        },
        closingBalance: {
          amount: this.toAmount(totals.closing),
          comparisonAmount: "0.00",
          varianceAmount: this.toAmount(totals.closing),
        },
      },
    };

    if (shouldLog) await this.logReportEvent(user, "ReportingCashMovement", "VIEW", { query, rowCount: rows.length });
    return payload;
  }

  async getGeneralLedger(query: ReportingGeneralLedgerQueryDto, user?: AuthUser, shouldLog = true) {
    const selectedAccount = query.accountId
      ? await this.prisma.account.findUnique({
          where: { id: query.accountId },
          select: {
            id: true,
            code: true,
            name: true,
            nameAr: true,
            type: true,
            currencyCode: true,
            segment3: true,
            segment4: true,
            segment5: true,
            isPosting: true,
            isActive: true,
          },
        })
      : null;

    if (selectedAccount && !this.matchesAccountFilters(selectedAccount, query)) {
      throw new BadRequestException("Selected account does not match the active reporting filters.");
    }

    if (!selectedAccount) {
      const emptyPayload = {
        generatedAt: new Date().toISOString(),
        account: null,
        openingBalance: "0.00",
        totalDebit: "0.00",
        totalCredit: "0.00",
        closingBalance: "0.00",
        transactions: [],
      };
      if (shouldLog) await this.logReportEvent(user, "ReportingGeneralLedger", "VIEW", { query, rowCount: 0 });
      return emptyPayload;
    }

    const [openingMap, transactions] = await Promise.all([
      this.aggregateLedger([query.accountId!], query, undefined, query.dateFrom, true),
      this.prisma.ledgerTransaction.findMany({
        where: {
          accountId: query.accountId,
          entryDate: this.dateRange(query.dateFrom, query.dateTo),
          journalEntry: this.buildJournalEntryWhere(query),
        },
        include: {
          journalEntry: {
            select: {
              id: true,
              reference: true,
              description: true,
              bankCashTransaction: { select: { id: true, reference: true } },
              salesInvoice: { select: { id: true, reference: true } },
              purchaseInvoice: { select: { id: true, reference: true } },
              creditNote: { select: { id: true, reference: true } },
              debitNote: { select: { id: true, reference: true } },
              inventoryGoodsReceipt: { select: { id: true, reference: true } },
              inventoryGoodsIssue: { select: { id: true, reference: true } },
              inventoryAdjustment: { select: { id: true, reference: true } },
              payrollPeriod: { select: { id: true, reference: true } },
              payrollAdjustment: { select: { id: true, reference: true } },
              fixedAssetAcquisition: { select: { id: true, reference: true } },
              fixedAssetDepreciationRun: { select: { id: true, reference: true } },
              fixedAssetDisposal: { select: { id: true, reference: true } },
            },
          },
        },
        orderBy: [{ entryDate: "asc" }, { createdAt: "asc" }],
      }),
    ]);

    const openingBalance = this.net(openingMap.get(query.accountId!));
    let runningBalance = openingBalance;

    const rows = transactions.map((transaction) => {
      const debit = Number(transaction.debitAmount);
      const credit = Number(transaction.creditAmount);
      runningBalance += debit - credit;

      return {
        id: transaction.id,
        reference: transaction.reference,
        journalEntryId: transaction.journalEntryId,
        journalReference: transaction.journalEntry.reference,
        journalDescription: transaction.journalEntry.description,
        entryDate: transaction.entryDate.toISOString(),
        postedAt: transaction.postedAt.toISOString(),
        description: transaction.description ?? "",
        debitAmount: this.toAmount(debit),
        creditAmount: this.toAmount(credit),
        runningBalance: this.toAmount(runningBalance),
        sourceDocument: this.resolveSourceDocument(transaction.journalEntry),
      };
    });

    const totalDebit = rows.reduce((sum, row) => sum + Number(row.debitAmount), 0);
    const totalCredit = rows.reduce((sum, row) => sum + Number(row.creditAmount), 0);

    const payload = {
      generatedAt: new Date().toISOString(),
      account: selectedAccount,
      openingBalance: this.toAmount(openingBalance),
      totalDebit: this.toAmount(totalDebit),
      totalCredit: this.toAmount(totalCredit),
      closingBalance: this.toAmount(runningBalance),
      transactions: rows,
    };

    if (shouldLog) await this.logReportEvent(user, "ReportingGeneralLedger", "VIEW", { query, rowCount: rows.length, accountId: selectedAccount.id });
    return payload;
  }

  async getAudit(query: ReportingAuditQueryDto, user?: AuthUser, shouldLog = true) {
    if (user?.role === "USER") {
      throw new ForbiddenException("Audit reporting is restricted to manager or admin users.");
    }

    const entries = await this.prisma.auditLog.findMany({
      where: {
        entity: query.entity?.trim() || undefined,
        createdAt: this.dateRange(query.dateFrom, query.dateTo),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: query.limit ?? 100,
    });

    const actionTotals = new Map<string, number>();
    for (const entry of entries) {
      actionTotals.set(entry.action, (actionTotals.get(entry.action) ?? 0) + 1);
    }

    const payload = {
      generatedAt: new Date().toISOString(),
      totalEvents: entries.length,
      actionTotals: Array.from(actionTotals.entries())
        .map(([action, count]) => ({ action, count }))
        .sort((a, b) => a.action.localeCompare(b.action)),
      exceptions: this.buildAuditExceptions(entries),
      compliancePackage: {
        generatedAt: new Date().toISOString(),
        entryCount: entries.length,
        highRiskCount: entries.filter((entry) => entry.action === "DELETE" || entry.action === "REVERSE").length,
        systemEventCount: entries.filter((entry) => !entry.userId).length,
      },
      entries: entries.map((entry) => ({
        id: entry.id,
        entity: entry.entity,
        entityId: entry.entityId,
        action: entry.action,
        details: entry.details,
        createdAt: entry.createdAt.toISOString(),
        user: entry.user,
      })),
    };

    if (shouldLog) await this.logReportEvent(user, "ReportingAudit", "VIEW", { query, rowCount: entries.length });
    return payload;
  }

  async getCatalog(user?: AuthUser) {
    this.ensureUser(user);
    const canSeeAudit = user!.role === "ADMIN" || user!.role === "MANAGER";
    const canManageShared = this.canShare(user!);

    return [
      { reportType: "summary", canView: true, canSaveDefinition: true, canSnapshot: true, canExport: true },
      { reportType: "trialBalance", canView: true, canSaveDefinition: true, canSnapshot: true, canExport: true },
      { reportType: "balanceSheet", canView: true, canSaveDefinition: true, canSnapshot: true, canExport: true },
      { reportType: "profitLoss", canView: true, canSaveDefinition: true, canSnapshot: true, canExport: true },
      { reportType: "cashMovement", canView: true, canSaveDefinition: true, canSnapshot: true, canExport: true },
      { reportType: "generalLedger", canView: true, canSaveDefinition: true, canSnapshot: true, canExport: true },
      { reportType: "audit", canView: canSeeAudit, canSaveDefinition: canSeeAudit, canSnapshot: canSeeAudit, canExport: canSeeAudit },
      { reportType: "activity", canView: canSeeAudit, canSaveDefinition: false, canSnapshot: false, canExport: false },
      { reportType: "sharedDefinitions", canView: canManageShared, canSaveDefinition: canManageShared, canSnapshot: false, canExport: false },
    ];
  }

  async getWarnings(user?: AuthUser) {
    this.ensureUser(user);

    const [activeBankCashAccounts, journalEntryTypes, segmentDefinitions, fiscalPeriods] = await Promise.all([
      this.prisma.bankCashAccount.count({ where: { isActive: true } }),
      this.prisma.journalEntryType.count({ where: { isActive: true } }),
      this.prisma.segmentDefinition.findMany({ select: { index: true, name: true }, orderBy: { index: "asc" } }),
      this.prisma.fiscalPeriod.count(),
    ]);

    const warnings: Array<{ code: string; severity: "warning" | "info"; message: string; reportTypes: string[] }> = [];

    if (activeBankCashAccounts === 0) {
      warnings.push({
        code: "BANK_CASH_ACCOUNTS_MISSING",
        severity: "warning",
        message: "No active bank/cash accounts are configured, so cash movement reporting may be empty.",
        reportTypes: ["cashMovement", "summary"],
      });
    }

    if (journalEntryTypes === 0) {
      warnings.push({
        code: "JOURNAL_ENTRY_TYPES_MISSING",
        severity: "info",
        message: "No active journal entry types are configured, so report filtering by journal type is unavailable.",
        reportTypes: ["summary", "trialBalance", "balanceSheet", "profitLoss", "cashMovement", "generalLedger"],
      });
    }

    if (segmentDefinitions.length < 5) {
      const missingIndexes = [1, 2, 3, 4, 5].filter((index) => !segmentDefinitions.some((definition) => definition.index === index));
      warnings.push({
        code: "SEGMENT_DEFINITIONS_INCOMPLETE",
        severity: "warning",
        message: `Segment definitions are incomplete. Missing indexes: ${missingIndexes.join(", ")}.`,
        reportTypes: ["summary", "trialBalance", "balanceSheet", "profitLoss", "cashMovement", "generalLedger"],
      });
    }

    if (fiscalPeriods === 0) {
      warnings.push({
        code: "FISCAL_PERIODS_MISSING",
        severity: "warning",
        message: "No fiscal periods are configured yet, so period controls depend on manual date entry only.",
        reportTypes: ["summary", "trialBalance", "balanceSheet", "profitLoss", "cashMovement", "generalLedger", "audit"],
      });
    }

    return warnings;
  }

  async listDefinitions(user?: AuthUser) {
    this.ensureUser(user);
    await this.ensurePersistence();

    const rows = (await this.prisma.$queryRawUnsafe(`
      SELECT id, name, report_type AS "reportType", parameters::text AS "parametersText",
             created_by_id AS "createdById", updated_by_id AS "updatedById",
             is_shared AS "isShared", is_active AS "isActive",
             created_at AS "createdAt", updated_at AS "updatedAt"
      FROM "ReportDefinition"
      WHERE is_active = TRUE AND (created_by_id = $1 OR is_shared = TRUE OR $2 IN ('ADMIN','MANAGER'))
      ORDER BY updated_at DESC
    `, user!.userId, user!.role ?? "USER")) as RawRow[];

    return rows.map((row) => this.mapDefinition(row));
  }

  async createDefinition(dto: CreateReportDefinitionDto, user?: AuthUser) {
    this.ensureUser(user);
    await this.ensurePersistence();

    const id = crypto.randomUUID();
    const parameters = this.normalizeStoredParameters(dto.parameters);

    await this.prisma.$executeRawUnsafe(
      `
      INSERT INTO "ReportDefinition" (
        id, name, report_type, parameters, created_by_id, updated_by_id, is_shared, is_active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4::jsonb, $5, $5, $6, TRUE, NOW(), NOW())
      `,
      id,
      dto.name.trim(),
      dto.reportType.trim(),
      JSON.stringify(parameters),
      user!.userId,
      Boolean(dto.isShared && this.canShare(user!)),
    );

    await this.logReportEvent(user, "ReportDefinition", "CREATE", { id, reportType: dto.reportType, name: dto.name });
    return this.getDefinitionById(id);
  }

  async updateDefinition(id: string, dto: UpdateReportDefinitionDto, user?: AuthUser) {
    this.ensureUser(user);
    await this.ensurePersistence();
    const existing = await this.getDefinitionById(id);
    this.ensureOwnsDefinition(existing, user!);

    const name = dto.name?.trim() || existing.name;
    const reportType = dto.reportType?.trim() || existing.reportType;
    const parameters = this.normalizeStoredParameters(dto.parameters ?? existing.parameters);
    const isShared = dto.isShared === undefined ? existing.isShared : Boolean(dto.isShared && this.canShare(user!));

    await this.prisma.$executeRawUnsafe(
      `
      UPDATE "ReportDefinition"
      SET name = $2, report_type = $3, parameters = $4::jsonb, is_shared = $5, updated_by_id = $6, updated_at = NOW()
      WHERE id = $1
      `,
      id,
      name,
      reportType,
      JSON.stringify(parameters),
      isShared,
      user!.userId,
    );

    await this.logReportEvent(user, "ReportDefinition", "UPDATE", { id, reportType, name });
    return this.getDefinitionById(id);
  }

  async deactivateDefinition(id: string, user?: AuthUser) {
    this.ensureUser(user);
    await this.ensurePersistence();
    const existing = await this.getDefinitionById(id);
    this.ensureOwnsDefinition(existing, user!);

    await this.prisma.$executeRawUnsafe(
      `
      UPDATE "ReportDefinition"
      SET is_active = FALSE, updated_by_id = $2, updated_at = NOW()
      WHERE id = $1
      `,
      id,
      user!.userId,
    );

    await this.logReportEvent(user, "ReportDefinition", "DELETE", { id, reportType: existing.reportType, name: existing.name });
    return { id, deactivated: true };
  }

  async listSnapshots(user?: AuthUser) {
    this.ensureUser(user);
    await this.ensurePersistence();

    const rows = (await this.prisma.$queryRawUnsafe(
      `
      SELECT id, name, report_type AS "reportType", parameters::text AS "parametersText",
             snapshot_data::text AS "snapshotDataText",
             period_label AS "periodLabel", comparison_period_label AS "comparisonPeriodLabel",
             generated_at AS "generatedAt", created_by_id AS "createdById", created_at AS "createdAt",
             version, is_locked AS "isLocked", locked_at AS "lockedAt", locked_by_id AS "lockedById",
             replaces_snapshot_id AS "replacesSnapshotId", root_snapshot_id AS "rootSnapshotId"
      FROM "ReportSnapshot"
      WHERE created_by_id = $1 OR $2 IN ('ADMIN','MANAGER')
      ORDER BY created_at DESC
      `,
      user!.userId,
      user!.role ?? "USER",
    )) as RawRow[];

    return rows.map((row) => this.mapSnapshot(row));
  }

  async createSnapshot(dto: CreateReportSnapshotDto, user?: AuthUser) {
    this.ensureUser(user);
    await this.ensurePersistence();
    const parameters = this.normalizeStoredParameters(dto.parameters);
    const reportData = await this.generateReportByType(dto.reportType, parameters, user, false);
    const id = crypto.randomUUID();
    const rootSnapshotId = id;
    const periodLabel = this.buildPeriodLabel(this.pickString(parameters.dateFrom), this.pickString(parameters.dateTo));
    const comparisonPeriodLabel = this.buildPeriodLabel(this.pickString(parameters.comparisonFrom), this.pickString(parameters.comparisonTo));

    await this.prisma.$executeRawUnsafe(
      `
      INSERT INTO "ReportSnapshot" (
        id, name, report_type, parameters, snapshot_data, period_label, comparison_period_label,
        generated_at, created_by_id, created_at, version, is_locked, replaces_snapshot_id, root_snapshot_id
      ) VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6, $7, NOW(), $8, NOW(), 1, FALSE, NULL, $9)
      `,
      id,
      dto.name.trim(),
      dto.reportType.trim(),
      JSON.stringify(parameters),
      JSON.stringify(reportData),
      periodLabel,
      comparisonPeriodLabel,
      user!.userId,
      rootSnapshotId,
    );

    await this.logReportEvent(user, "ReportSnapshot", "CREATE", { id, reportType: dto.reportType, name: dto.name });
    const created = await this.getSnapshotById(id);
    return created;
  }

  async lockSnapshot(id: string, user?: AuthUser) {
    this.ensureUser(user);
    await this.ensurePersistence();
    const existing = await this.getSnapshotById(id);
    this.ensureOwnsSnapshot(existing, user!);

    await this.prisma.$executeRawUnsafe(
      `
      UPDATE "ReportSnapshot"
      SET is_locked = TRUE, locked_at = NOW(), locked_by_id = $2
      WHERE id = $1
      `,
      id,
      user!.userId,
    );

    await this.logReportEvent(user, "ReportSnapshot", "UPDATE", { id, action: "lock" });
    return this.getSnapshotById(id);
  }

  async unlockSnapshot(id: string, user?: AuthUser) {
    this.ensureUser(user);
    await this.ensurePersistence();
    const existing = await this.getSnapshotById(id);
    this.ensureOwnsSnapshot(existing, user!);

    await this.prisma.$executeRawUnsafe(
      `
      UPDATE "ReportSnapshot"
      SET is_locked = FALSE, locked_at = NULL, locked_by_id = NULL
      WHERE id = $1
      `,
      id,
    );

    await this.logReportEvent(user, "ReportSnapshot", "UPDATE", { id, action: "unlock" });
    return this.getSnapshotById(id);
  }

  async createSnapshotVersion(id: string, dto: CreateReportSnapshotVersionDto, user?: AuthUser) {
    this.ensureUser(user);
    await this.ensurePersistence();
    const existing = await this.getSnapshotById(id);
    this.ensureOwnsSnapshot(existing, user!);

    const rootSnapshotId = existing.rootSnapshotId ?? existing.id;
    const latestVersionRows = (await this.prisma.$queryRawUnsafe(
      `
      SELECT COALESCE(MAX(version), 1) AS "maxVersion"
      FROM "ReportSnapshot"
      WHERE COALESCE(root_snapshot_id, id) = $1
      `,
      rootSnapshotId,
    )) as RawRow[];
    const nextVersion = Number(latestVersionRows[0]?.maxVersion ?? 1) + 1;
    const snapshotId = crypto.randomUUID();
    const name = dto.name?.trim() || `${existing.name} v${nextVersion}`;

    await this.prisma.$executeRawUnsafe(
      `
      INSERT INTO "ReportSnapshot" (
        id, name, report_type, parameters, snapshot_data, period_label, comparison_period_label,
        generated_at, created_by_id, created_at, version, is_locked, replaces_snapshot_id, root_snapshot_id
      ) VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6, $7, NOW(), $8, NOW(), $9, FALSE, $10, $11)
      `,
      snapshotId,
      name,
      existing.reportType,
      JSON.stringify(existing.parameters),
      JSON.stringify(existing.snapshotData),
      existing.periodLabel,
      existing.comparisonPeriodLabel,
      user!.userId,
      nextVersion,
      existing.id,
      rootSnapshotId,
    );

    await this.logReportEvent(user, "ReportSnapshot", "CREATE", { id: snapshotId, action: "version", replacesSnapshotId: existing.id, version: nextVersion });
    return this.getSnapshotById(snapshotId);
  }

  async getActivity(user?: AuthUser, limit = 100) {
    this.ensureUser(user);
    const rows = await this.prisma.auditLog.findMany({
      where: {
        entity: {
          in: [
            "ReportingSummary",
            "ReportingTrialBalance",
            "ReportingBalanceSheet",
            "ReportingProfitLoss",
            "ReportingCashMovement",
            "ReportingGeneralLedger",
            "ReportingAudit",
            "ReportDefinition",
            "ReportSnapshot",
            "ReportExport",
          ],
        },
        userId: user!.role === "USER" ? user!.userId : undefined,
      },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return rows.map((row) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  async exportReport(dto: ExportReportDto, user?: AuthUser) {
    this.ensureUser(user);
    const parameters = this.normalizeStoredParameters(dto.parameters);
    const reportData = await this.generateReportByType(dto.reportType, parameters, user, false);
    const title = dto.title?.trim() || `${dto.reportType}-${new Date().toISOString().slice(0, 10)}`;
    const generatedAt = new Date().toISOString();
    const fileBase = this.slugify(title);

    let content = "";
    let fileName = "";
    let mimeType = "";
    let encoding: "utf8" | "base64" = "utf8";

    if (dto.format === "EXCEL") {
      content = this.renderXlsxExport(title, dto.reportType, reportData, generatedAt);
      fileName = `${fileBase}.xlsx`;
      mimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      encoding = "base64";
    } else if (dto.format === "PDF") {
      content = this.renderPdfExport(title, dto.reportType, reportData, generatedAt);
      fileName = `${fileBase}.pdf`;
      mimeType = "application/pdf";
      encoding = "base64";
    } else {
      content = this.renderHtmlExport(title, dto.reportType, reportData, generatedAt);
      fileName = `${fileBase}.html`;
      mimeType = "text/html;charset=utf-8";
    }

    await this.logReportEvent(user, "ReportExport", "CREATE", { reportType: dto.reportType, format: dto.format, title });

    return {
      title,
      reportType: dto.reportType,
      format: dto.format,
      generatedAt,
      fileName,
      mimeType,
      encoding,
      content,
    };
  }

  private async getPostingAccounts(query: ReportingQueryDto, types?: AccountRow["type"][]) {
    return this.prisma.account.findMany({
      where: this.buildAccountWhere(query, types),
      select: {
        id: true,
        code: true,
        name: true,
        nameAr: true,
        type: true,
        currencyCode: true,
        segment3: true,
        segment4: true,
        segment5: true,
        isActive: true,
        isPosting: true,
      },
      orderBy: { code: "asc" },
    }) as Promise<AccountRow[]>;
  }

  private async aggregateLedger(accountIds: string[], query: ReportingQueryDto, dateFrom?: string, dateTo?: string, exclusiveDateTo?: boolean) {
    if (!accountIds.length) return new Map();

    const rows = await this.prisma.ledgerTransaction.groupBy({
      by: ["accountId"],
      where: {
        accountId: { in: accountIds },
        entryDate: this.dateRange(dateFrom, dateTo, exclusiveDateTo),
        journalEntry: this.buildJournalEntryWhere(query),
      },
      _sum: {
        debitAmount: true,
        creditAmount: true,
      },
    });

    return new Map(
      rows.map((row) => [
        row.accountId,
        {
          debit: Number(row._sum.debitAmount ?? 0),
          credit: Number(row._sum.creditAmount ?? 0),
        },
      ]),
    ) as AmountMap;
  }

  private buildAccountWhere(query: ReportingQueryDto, types?: AccountRow["type"][]) {
    return {
      isPosting: true,
      isActive: true,
      type: query.accountType ? query.accountType : types ? { in: types } : undefined,
      currencyCode: query.currencyCode?.trim() || undefined,
      segment3: query.segment3?.trim() || undefined,
      segment4: query.segment4?.trim() || undefined,
      segment5: query.segment5?.trim() || undefined,
    };
  }

  private matchesAccountFilters(account: Pick<AccountRow, "type" | "currencyCode" | "segment3" | "segment4" | "segment5">, query: ReportingQueryDto) {
    return (
      (!query.accountType || account.type === query.accountType) &&
      (!query.currencyCode || account.currencyCode === query.currencyCode) &&
      (!query.segment3 || account.segment3 === query.segment3) &&
      (!query.segment4 || account.segment4 === query.segment4) &&
      (!query.segment5 || account.segment5 === query.segment5)
    );
  }

  private buildJournalEntryWhere(query: ReportingQueryDto) {
    return query.journalEntryTypeId
      ? {
          journalEntryTypeId: query.journalEntryTypeId,
        }
      : undefined;
  }

  private buildGeneralLedgerPath(accountId: string, query: ReportingQueryDto) {
    const searchParams = new URLSearchParams();
    searchParams.set("tab", "generalLedger");
    searchParams.set("accountId", accountId);
    if (query.dateFrom) searchParams.set("dateFrom", query.dateFrom);
    if (query.dateTo) searchParams.set("dateTo", query.dateTo);
    if (query.comparisonFrom) searchParams.set("comparisonFrom", query.comparisonFrom);
    if (query.comparisonTo) searchParams.set("comparisonTo", query.comparisonTo);
    if (query.basis) searchParams.set("basis", query.basis);
    if (query.includeZeroBalance) searchParams.set("includeZeroBalance", query.includeZeroBalance);
    if (query.accountType) searchParams.set("accountType", query.accountType);
    if (query.currencyCode) searchParams.set("currencyCode", query.currencyCode);
    if (query.segment3) searchParams.set("segment3", query.segment3);
    if (query.segment4) searchParams.set("segment4", query.segment4);
    if (query.segment5) searchParams.set("segment5", query.segment5);
    if (query.journalEntryTypeId) searchParams.set("journalEntryTypeId", query.journalEntryTypeId);
    return `/reporting?${searchParams.toString()}`;
  }

  private resolveSourceDocument(journalEntry: Record<string, unknown>) {
    const candidates: Array<{ key: string; label: string; path: string }> = [
      { key: "bankCashTransaction", label: "Bank/Cash Transaction", path: "/bank-cash-transactions" },
      { key: "salesInvoice", label: "Sales Invoice", path: "/sales-receivables" },
      { key: "purchaseInvoice", label: "Purchase Invoice", path: "/purchases" },
      { key: "creditNote", label: "Credit Note", path: "/sales-receivables" },
      { key: "debitNote", label: "Debit Note", path: "/purchases" },
      { key: "inventoryGoodsReceipt", label: "Inventory Goods Receipt", path: "/inventory" },
      { key: "inventoryGoodsIssue", label: "Inventory Goods Issue", path: "/inventory" },
      { key: "inventoryAdjustment", label: "Inventory Adjustment", path: "/inventory" },
      { key: "payrollPeriod", label: "Payroll Period", path: "/payroll" },
      { key: "payrollAdjustment", label: "Payroll Adjustment", path: "/payroll" },
      { key: "fixedAssetAcquisition", label: "Fixed Asset Acquisition", path: "/fixed-assets" },
      { key: "fixedAssetDepreciationRun", label: "Fixed Asset Depreciation", path: "/fixed-assets" },
      { key: "fixedAssetDisposal", label: "Fixed Asset Disposal", path: "/fixed-assets" },
    ];

    for (const candidate of candidates) {
      const value = journalEntry[candidate.key];
      if (value && typeof value === "object" && "id" in value) {
        const reference = (value as { reference?: string; code?: string }).reference ?? (value as { code?: string }).code ?? String((value as { id: string }).id);
        return {
          type: candidate.key,
          id: String((value as { id: string }).id),
          reference,
          label: candidate.label,
          path: `${candidate.path}?sourceId=${String((value as { id: string }).id)}`,
        };
      }
    }

    return {
      type: "journalEntry",
      id: String(journalEntry.id),
      reference: String(journalEntry.reference),
      label: "Journal Entry",
      path: `/journal-entries?reference=${encodeURIComponent(String(journalEntry.reference))}`,
    };
  }

  private dateRange(dateFrom?: string, dateTo?: string, exclusiveDateTo = false) {
    if (!dateFrom && !dateTo) return undefined;

    return {
      gte: dateFrom ? this.startOfDay(dateFrom) : undefined,
      [exclusiveDateTo ? "lt" : "lte"]: dateTo ? (exclusiveDateTo ? this.startOfDay(dateTo) : this.endOfDay(dateTo)) : undefined,
    };
  }

  private startOfDay(value: string) {
    const date = new Date(value);
    date.setUTCHours(0, 0, 0, 0);
    return date;
  }

  private endOfDay(value: string) {
    const date = new Date(value);
    date.setUTCHours(23, 59, 59, 999);
    return date;
  }

  private net(values?: { debit: number; credit: number }) {
    return (values?.debit ?? 0) - (values?.credit ?? 0);
  }

  private normalizeByType(type: AccountRow["type"], amount: number) {
    if (type === "ASSET" || type === "EXPENSE") return amount;
    return -amount;
  }

  private profitLossRow(account: AccountRow, currentMap: AmountMap, comparisonMap: AmountMap) {
    const currentNet = this.normalizeByType(account.type, this.net(currentMap.get(account.id)));
    const comparisonNet = this.normalizeByType(account.type, this.net(comparisonMap.get(account.id)));

    return {
      accountId: account.id,
      accountCode: account.code,
      accountName: account.name,
      accountNameAr: account.nameAr,
      accountType: account.type,
      amount: this.toAmount(currentNet),
      comparisonAmount: this.toAmount(comparisonNet),
      varianceAmount: this.toAmount(currentNet - comparisonNet),
    };
  }

  private shouldIncludeZeroBalance(value?: string) {
    return value === "true";
  }

  private getBasis(query: ReportingQueryDto) {
    return query.basis ?? "ACCRUAL";
  }

  private metric(key: string, label: string, amount: number, comparisonAmount: number) {
    return {
      key,
      label,
      amount: this.toAmount(amount),
      comparisonAmount: this.toAmount(comparisonAmount),
      varianceAmount: this.toAmount(amount - comparisonAmount),
    };
  }

  private buildPeriodLabel(dateFrom?: string, dateTo?: string) {
    if (!dateFrom && !dateTo) return "All posted periods";
    if (dateFrom && dateTo) return `${dateFrom} to ${dateTo}`;
    if (dateFrom) return `From ${dateFrom}`;
    return `Until ${dateTo}`;
  }

  private toAmount(value: number) {
    return value.toFixed(2);
  }

  private ensureUser(user?: AuthUser) {
    if (!user?.userId) {
      throw new ForbiddenException("Authenticated user context is required.");
    }
  }

  private canShare(user: AuthUser) {
    return user.role === "ADMIN" || user.role === "MANAGER";
  }

  private async ensurePersistence() {
    if (this.persistenceReady) return;
    if (!this.persistenceReadyPromise) {
      this.persistenceReadyPromise = (async () => {
        await this.prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "ReportDefinition" (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            report_type TEXT NOT NULL,
            parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
            created_by_id TEXT NOT NULL,
            updated_by_id TEXT NOT NULL,
            is_shared BOOLEAN NOT NULL DEFAULT FALSE,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          )
        `);

        await this.prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "ReportSnapshot" (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            report_type TEXT NOT NULL,
            parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
            snapshot_data JSONB NOT NULL,
            period_label TEXT,
            comparison_period_label TEXT,
            generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            created_by_id TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          )
        `);

        await this.prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_report_definition_type_active" ON "ReportDefinition"(report_type, is_active)`);
        await this.prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_report_definition_creator" ON "ReportDefinition"(created_by_id)`);
        await this.prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_report_snapshot_type_created" ON "ReportSnapshot"(report_type, created_at DESC)`);
        await this.prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_report_snapshot_creator" ON "ReportSnapshot"(created_by_id)`);
        await this.prisma.$executeRawUnsafe(`ALTER TABLE "ReportSnapshot" ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1`);
        await this.prisma.$executeRawUnsafe(`ALTER TABLE "ReportSnapshot" ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT FALSE`);
        await this.prisma.$executeRawUnsafe(`ALTER TABLE "ReportSnapshot" ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ`);
        await this.prisma.$executeRawUnsafe(`ALTER TABLE "ReportSnapshot" ADD COLUMN IF NOT EXISTS locked_by_id TEXT`);
        await this.prisma.$executeRawUnsafe(`ALTER TABLE "ReportSnapshot" ADD COLUMN IF NOT EXISTS replaces_snapshot_id TEXT`);
        await this.prisma.$executeRawUnsafe(`ALTER TABLE "ReportSnapshot" ADD COLUMN IF NOT EXISTS root_snapshot_id TEXT`);
        await this.prisma.$executeRawUnsafe(`UPDATE "ReportSnapshot" SET root_snapshot_id = id WHERE root_snapshot_id IS NULL`);
        await this.prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_report_snapshot_root_version" ON "ReportSnapshot"(root_snapshot_id, version DESC)`);

        this.persistenceReady = true;
      })().catch((error) => {
        this.persistenceReadyPromise = null;
        throw error;
      });
    }

    await this.persistenceReadyPromise;
  }

  private async getDefinitionById(id: string) {
    const rows = (await this.prisma.$queryRawUnsafe(
      `
      SELECT id, name, report_type AS "reportType", parameters::text AS "parametersText",
             created_by_id AS "createdById", updated_by_id AS "updatedById",
             is_shared AS "isShared", is_active AS "isActive",
             created_at AS "createdAt", updated_at AS "updatedAt"
      FROM "ReportDefinition"
      WHERE id = $1
      `,
      id,
    )) as RawRow[];

    if (!rows.length) {
      throw new BadRequestException("Report definition was not found.");
    }

    return this.mapDefinition(rows[0]);
  }

  private async getSnapshotById(id: string) {
    const rows = (await this.prisma.$queryRawUnsafe(
      `
      SELECT id, name, report_type AS "reportType", parameters::text AS "parametersText",
             snapshot_data::text AS "snapshotDataText",
             period_label AS "periodLabel", comparison_period_label AS "comparisonPeriodLabel",
             generated_at AS "generatedAt", created_by_id AS "createdById", created_at AS "createdAt",
             version, is_locked AS "isLocked", locked_at AS "lockedAt", locked_by_id AS "lockedById",
             replaces_snapshot_id AS "replacesSnapshotId", root_snapshot_id AS "rootSnapshotId"
      FROM "ReportSnapshot"
      WHERE id = $1
      `,
      id,
    )) as RawRow[];

    if (!rows.length) {
      throw new BadRequestException("Report snapshot was not found.");
    }

    return this.mapSnapshot(rows[0]);
  }

  private mapDefinition(row: RawRow) {
    return {
      id: String(row.id),
      name: String(row.name),
      reportType: String(row.reportType),
      parameters: this.parseJsonField(row.parametersText),
      createdById: String(row.createdById),
      updatedById: String(row.updatedById),
      isShared: Boolean(row.isShared),
      isActive: Boolean(row.isActive),
      createdAt: new Date(String(row.createdAt)).toISOString(),
      updatedAt: new Date(String(row.updatedAt)).toISOString(),
    };
  }

  private mapSnapshot(row: RawRow) {
    return {
      id: String(row.id),
      name: String(row.name),
      reportType: String(row.reportType),
      parameters: this.parseJsonField(row.parametersText),
      snapshotData: this.parseJsonField(row.snapshotDataText),
      periodLabel: row.periodLabel ? String(row.periodLabel) : null,
      comparisonPeriodLabel: row.comparisonPeriodLabel ? String(row.comparisonPeriodLabel) : null,
      generatedAt: new Date(String(row.generatedAt)).toISOString(),
      version: Number(row.version ?? 1),
      isLocked: Boolean(row.isLocked),
      lockedAt: row.lockedAt ? new Date(String(row.lockedAt)).toISOString() : null,
      lockedById: row.lockedById ? String(row.lockedById) : null,
      replacesSnapshotId: row.replacesSnapshotId ? String(row.replacesSnapshotId) : null,
      rootSnapshotId: row.rootSnapshotId ? String(row.rootSnapshotId) : String(row.id),
      createdById: String(row.createdById),
      createdAt: new Date(String(row.createdAt)).toISOString(),
    };
  }

  private ensureOwnsDefinition(
    definition: { createdById: string },
    user: AuthUser,
  ) {
    if (definition.createdById !== user.userId && !this.canShare(user)) {
      throw new ForbiddenException("You do not have permission to modify this report definition.");
    }
  }

  private ensureOwnsSnapshot(
    snapshot: { createdById: string; isLocked?: boolean },
    user: AuthUser,
  ) {
    if (snapshot.createdById !== user.userId && !this.canShare(user)) {
      throw new ForbiddenException("You do not have permission to modify this report snapshot.");
    }
  }

  private normalizeStoredParameters(parameters?: Record<string, unknown>) {
    const value = parameters ?? {};
    return JSON.parse(JSON.stringify(value));
  }

  private parseJsonField(value: unknown) {
    if (typeof value !== "string") return {};
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }

  private async logReportEvent(user: AuthUser | undefined, entity: string, action: AuditAction, details: Record<string, unknown>) {
    if (process.env.REPORTING_ACTIVITY_LOG_ENABLED === "false") return;
    if (!user?.userId) return;

    const existingUser = await this.prisma.user.findUnique({
      where: { id: user.userId },
      select: { id: true },
    });
    const userId = existingUser?.id ?? null;
    const auditDetails = userId
      ? details
      : {
          ...details,
          skippedUserId: user.userId,
          loggingWarning: "Audit log user reference was missing at write time.",
        };

    try {
      await this.prisma.auditLog.create({
        data: {
          userId,
          entity,
          action,
          details: auditDetails as never,
        },
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2003"
      ) {
        await this.prisma.auditLog.create({
          data: {
            userId: null,
            entity,
            action,
            details: {
              ...details,
              skippedUserId: user.userId,
              loggingWarning: "Audit log user reference was missing at write time.",
            } as never,
          },
        });
        return;
      }

      throw error;
    }
  }

  private async generateReportByType(reportType: string, parameters: Record<string, unknown>, user?: AuthUser, shouldLog = false) {
    const query = this.toQueryDto(parameters);
    switch (reportType) {
      case "summary":
        return this.getSummary(query, user, shouldLog);
      case "trialBalance":
        return this.getTrialBalance(query, user, shouldLog);
      case "balanceSheet":
        return this.getBalanceSheet(query, user, shouldLog);
      case "profitLoss":
        return this.getProfitLoss(query, user, shouldLog);
      case "cashMovement":
        return this.getCashMovement(query, user, shouldLog);
      case "generalLedger":
        return this.getGeneralLedger(this.toLedgerQueryDto(parameters), user, shouldLog);
      case "audit":
        return this.getAudit(this.toAuditQueryDto(parameters), user, shouldLog);
      default:
        throw new BadRequestException(`Unsupported report type: ${reportType}`);
    }
  }

  private toQueryDto(parameters: Record<string, unknown>): ReportingQueryDto {
    return {
      dateFrom: this.pickString(parameters.dateFrom),
      dateTo: this.pickString(parameters.dateTo),
      comparisonFrom: this.pickString(parameters.comparisonFrom),
      comparisonTo: this.pickString(parameters.comparisonTo),
      basis: this.pickString(parameters.basis) as "ACCRUAL" | "CASH" | undefined,
      includeZeroBalance: this.pickBoolean(parameters.includeZeroBalance) ? "true" : undefined,
      accountType: this.pickString(parameters.accountType) as ReportingQueryDto["accountType"],
      currencyCode: this.pickString(parameters.currencyCode),
      segment3: this.pickString(parameters.segment3),
      segment4: this.pickString(parameters.segment4),
      segment5: this.pickString(parameters.segment5),
      journalEntryTypeId: this.pickString(parameters.journalEntryTypeId),
    };
  }

  private toLedgerQueryDto(parameters: Record<string, unknown>): ReportingGeneralLedgerQueryDto {
    return {
      ...this.toQueryDto(parameters),
      accountId: this.pickString(parameters.accountId),
    };
  }

  private toAuditQueryDto(parameters: Record<string, unknown>): ReportingAuditQueryDto {
    return {
      ...this.toQueryDto(parameters),
      entity: this.pickString(parameters.entity),
      limit: this.pickNumber(parameters.limit),
    };
  }

  private pickString(value: unknown) {
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
  }

  private pickBoolean(value: unknown) {
    return value === true || value === "true";
  }

  private pickNumber(value: unknown) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
  }

  private renderCsvExport(reportType: string, reportData: any) {
    const sections = this.flattenExportRows(reportType, reportData);
    return sections
      .map((section) => {
        const lines = [section.headers.join(",")];
        for (const row of section.rows) {
          lines.push(row.map((cell: string | number | null | undefined) => this.escapeCsv(cell)).join(","));
        }
        return lines.join("\n");
      })
      .join("\n\n");
  }

  private flattenExportRows(reportType: string, reportData: any): ExportSection[] {
    if (reportType === "trialBalance") {
      return [
        {
          headers: ["Code", "Name", "OpeningBalance", "Debit", "Credit", "ClosingBalance", "Side"],
          rows: reportData.rows.map((row: any) => [row.accountCode, row.accountName, row.openingBalance, row.debitTotal, row.creditTotal, row.closingBalance, row.closingSide]),
        },
      ];
    }

    if (reportType === "balanceSheet") {
      return [
        { headers: ["Section", "Code", "Name", "Amount", "Comparison", "Variance"], rows: reportData.assets.map((row: any) => ["Assets", row.accountCode, row.accountName, row.amount, row.comparisonAmount, row.varianceAmount]) },
        { headers: ["Section", "Code", "Name", "Amount", "Comparison", "Variance"], rows: reportData.liabilities.map((row: any) => ["Liabilities", row.accountCode, row.accountName, row.amount, row.comparisonAmount, row.varianceAmount]) },
        { headers: ["Section", "Code", "Name", "Amount", "Comparison", "Variance"], rows: reportData.equity.map((row: any) => ["Equity", row.accountCode, row.accountName, row.amount, row.comparisonAmount, row.varianceAmount]) },
      ];
    }

    if (reportType === "profitLoss") {
      return [
        { headers: ["Section", "Code", "Name", "Amount", "Comparison", "Variance"], rows: reportData.revenue.map((row: any) => ["Revenue", row.accountCode, row.accountName, row.amount, row.comparisonAmount, row.varianceAmount]) },
        { headers: ["Section", "Code", "Name", "Amount", "Comparison", "Variance"], rows: reportData.expenses.map((row: any) => ["Expenses", row.accountCode, row.accountName, row.amount, row.comparisonAmount, row.varianceAmount]) },
      ];
    }

    if (reportType === "cashMovement") {
      return [
        {
          headers: ["Code", "Name", "Type", "OpeningBalance", "Debit", "Credit", "NetMovement", "ClosingBalance"],
          rows: reportData.rows.map((row: any) => [row.code, row.name, row.type, row.openingBalance, row.debitTotal, row.creditTotal, row.netMovement, row.closingBalance]),
        },
        {
          headers: ["Classification", "Amount", "Comparison", "Variance"],
          rows: Object.entries(reportData.classified ?? {}).map(([key, value]: [string, any]) => [key, value.amount, value.comparisonAmount, value.varianceAmount]),
        },
      ];
    }

    if (reportType === "generalLedger") {
      return [
        {
          headers: ["Date", "Reference", "Journal", "Description", "Debit", "Credit", "RunningBalance"],
          rows: reportData.transactions.map((row: any) => [row.entryDate, row.reference, row.journalReference, row.description ?? row.journalDescription ?? "", row.debitAmount, row.creditAmount, row.runningBalance]),
        },
      ];
    }

    if (reportType === "audit") {
      return [
        {
          headers: ["Date", "Entity", "Action", "User", "EntityId"],
          rows: reportData.entries.map((row: any) => [row.createdAt, row.entity, row.action, row.user?.email ?? row.user?.name ?? "", row.entityId ?? ""]),
        },
        {
          headers: ["Exception", "Count", "Description"],
          rows: (reportData.exceptions ?? []).map((row: any) => [row.code, row.count, row.description]),
        },
      ];
    }

    return [
      {
        headers: ["Key", "Amount", "Comparison", "Variance"],
        rows: (reportData.metrics ?? []).map((row: any) => [row.label, row.amount, row.comparisonAmount, row.varianceAmount]),
      },
    ];
  }

  private renderHtmlExport(title: string, reportType: string, reportData: any, generatedAt: string) {
    const sections = this.flattenExportRows(reportType, reportData);
    const tables = sections
      .map(
        (section) => `
          <table>
            <thead><tr>${section.headers.map((header) => `<th>${this.escapeHtml(header)}</th>`).join("")}</tr></thead>
            <tbody>
              ${section.rows
                .map((row: Array<string | number | null | undefined>) => `<tr>${row.map((cell: string | number | null | undefined) => `<td>${this.escapeHtml(String(cell ?? ""))}</td>`).join("")}</tr>`)
                .join("")}
            </tbody>
          </table>
        `,
      )
      .join("");

    return `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${this.escapeHtml(title)}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 24px; color: #111827; }
            h1 { margin-bottom: 8px; }
            p { color: #4b5563; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; font-size: 12px; }
            th { background: #f3f4f6; text-transform: uppercase; letter-spacing: 0.04em; font-size: 11px; }
          </style>
        </head>
        <body>
          <h1>${this.escapeHtml(title)}</h1>
          <p>Report type: ${this.escapeHtml(reportType)}<br/>Generated at: ${this.escapeHtml(generatedAt)}</p>
          ${tables}
        </body>
      </html>
    `;
  }

  private renderPdfExport(title: string, reportType: string, reportData: any, generatedAt: string) {
    const sections = this.flattenExportRows(reportType, reportData);
    const lines = this.wrapPdfLines(title, 80, true);
    lines.push(...this.wrapPdfLines(`Report type: ${reportType}`, 95));
    lines.push(...this.wrapPdfLines(`Generated at: ${generatedAt}`, 95), "");

    for (const section of sections) {
      lines.push(...this.wrapPdfLines(section.headers.join(" | "), 95));
      for (const row of section.rows) {
        lines.push(...this.wrapPdfLines(row.map((cell) => String(cell ?? "")).join(" | "), 95));
      }
      lines.push("");
    }

    const stream = `BT
/F1 10 Tf
50 790 Td
14 TL
${lines.map((line) => `(${this.escapePdf(line)}) Tj\nT*`).join("\n")}
ET`;

    const objects = [
      "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj",
      "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj",
      "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj",
      `4 0 obj\n<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}\nendstream\nendobj`,
      "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj",
    ];

    let pdf = "%PDF-1.4\n";
    const offsets = [0];

    for (const object of objects) {
      offsets.push(Buffer.byteLength(pdf, "utf8"));
      pdf += `${object}\n`;
    }

    const xrefOffset = Buffer.byteLength(pdf, "utf8");
    pdf += `xref\n0 ${objects.length + 1}\n`;
    pdf += "0000000000 65535 f \n";

    for (let index = 1; index <= objects.length; index += 1) {
      pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
    }

    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    return Buffer.from(pdf, "utf8").toString("base64");
  }

  private renderXlsxExport(title: string, reportType: string, reportData: any, generatedAt: string) {
    const sections = this.flattenExportRows(reportType, reportData);
    const sheets = this.buildWorkbookSheets(title, reportType, generatedAt, sections);
    const files = [
      { name: "[Content_Types].xml", content: this.buildContentTypesXml(sheets.length) },
      { name: "_rels/.rels", content: this.buildRootRelsXml() },
      { name: "xl/workbook.xml", content: this.buildWorkbookXml(sheets) },
      { name: "xl/_rels/workbook.xml.rels", content: this.buildWorkbookRelsXml(sheets.length) },
      { name: "xl/styles.xml", content: this.buildStylesXml() },
      ...sheets.map((sheet, index) => ({
        name: `xl/worksheets/sheet${index + 1}.xml`,
        content: this.buildWorksheetXml(sheet.rows),
      })),
    ];

    return this.buildZipArchive(files).toString("base64");
  }

  private buildWorkbookSheets(title: string, reportType: string, generatedAt: string, sections: ExportSection[]): WorkbookSheet[] {
    const overviewRows: WorkbookCell[][] = [
      [{ value: title, kind: "title" } as WorkbookCell],
      [{ value: `Report type: ${reportType}`, kind: "meta" } as WorkbookCell],
      [{ value: `Generated at: ${generatedAt}`, kind: "meta" } as WorkbookCell],
      [],
    ];

    sections.forEach((section, index) => {
      overviewRows.push(section.headers.map((value): WorkbookCell => ({ value, kind: "header" })));
      section.rows.slice(0, 15).forEach((row) => {
        overviewRows.push(row.map((cell) => this.toWorkbookCell(cell)));
      });
      if (section.rows.length > 15) {
        overviewRows.push([{ value: `See sheet ${index + 2} for full detail`, kind: "meta" } as WorkbookCell]);
      }
      overviewRows.push([]);
    });

    return [
      { name: "Overview", rows: overviewRows },
      ...sections.map((section, index): WorkbookSheet => ({
        name: this.sanitizeSheetName(`Detail ${index + 1}`),
        rows: [
          [{ value: title, kind: "title" } as WorkbookCell],
          [{ value: `Section ${index + 1}`, kind: "meta" } as WorkbookCell],
          [{ value: `Generated at: ${generatedAt}`, kind: "meta" } as WorkbookCell],
          [],
          section.headers.map((value): WorkbookCell => ({ value, kind: "header" })),
          ...section.rows.map((row) => row.map((cell) => this.toWorkbookCell(cell))),
        ],
      })),
    ];
  }

  private buildWorksheetXml(rows: WorkbookCell[][]) {
    const maxColumns = rows.reduce((max, row) => Math.max(max, row.length), 0);
    const columns = Array.from({ length: maxColumns }, (_, index) => {
      const width = rows.reduce((currentWidth, row) => {
        const value = row[index]?.value;
        const textLength = value === undefined ? 0 : String(value).length;
        return Math.max(currentWidth, Math.min(40, Math.max(12, textLength + 2)));
      }, 12);
      return `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`;
    }).join("");

    const xmlRows = rows
      .map((row, rowIndex) => {
        const cells = row
          .map((value, columnIndex) => {
            const cellRef = `${this.toExcelColumn(columnIndex + 1)}${rowIndex + 1}`;
            const styleId = this.getWorkbookStyleId(value.kind, columnIndex);
            if (typeof value.value === "number") {
              return `<c r="${cellRef}" s="${styleId}"><v>${value.value}</v></c>`;
            }
            return `<c r="${cellRef}" s="${styleId}" t="inlineStr"><is><t>${this.escapeXml(String(value.value))}</t></is></c>`;
          })
          .join("");
        return `<row r="${rowIndex + 1}"${rowIndex === 0 ? ` ht="24" customHeight="1"` : ""}>${cells}</row>`;
      })
      .join("");

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetViews><sheetView workbookViewId="0"><pane ySplit="4" topLeftCell="A5" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
  <cols>${columns}</cols>
  <sheetData>${xmlRows}</sheetData>
  <autoFilter ref="A5:${this.toExcelColumn(Math.max(maxColumns, 1))}5"/>
</worksheet>`;
  }

  private buildContentTypesXml(sheetCount: number) {
    const sheetOverrides = Array.from({ length: sheetCount }, (_, index) =>
      `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
    ).join("");
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  ${sheetOverrides}
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;
  }

  private buildRootRelsXml() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;
  }

  private buildWorkbookXml(sheets: WorkbookSheet[]) {
    const sheetXml = sheets
      .map((sheet, index) => `<sheet name="${this.escapeXml(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`)
      .join("");
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>${sheetXml}</sheets>
</workbook>`;
  }

  private buildWorkbookRelsXml(sheetCount: number) {
    const sheetRelationships = Array.from({ length: sheetCount }, (_, index) =>
      `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`,
    ).join("");
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${sheetRelationships}
  <Relationship Id="rId${sheetCount + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;
  }

  private buildStylesXml() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="3">
    <font><sz val="11"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><name val="Calibri"/></font>
    <font><b/><sz val="14"/><name val="Calibri"/></font>
  </fonts>
  <fills count="3">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFEFF6FF"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF3F4F6"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border/>
    <border><left style="thin"/><right style="thin"/><top style="thin"/><bottom style="thin"/></border>
  </borders>
  <numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0.00"/></numFmts>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="5">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyFont="1"/>
    <xf numFmtId="0" fontId="1" fillId="1" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>
    <xf numFmtId="164" fontId="0" fillId="2" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyBorder="1"/>
  </cellXfs>
</styleSheet>`;
  }

  private buildZipArchive(files: Array<{ name: string; content: string }>) {
    const localParts: Buffer[] = [];
    const centralParts: Buffer[] = [];
    let offset = 0;

    for (const file of files) {
      const fileName = Buffer.from(file.name, "utf8");
      const content = Buffer.from(file.content, "utf8");
      const crc = this.crc32(content);
      const dos = this.toDosDateTime(new Date());

      const localHeader = Buffer.alloc(30);
      localHeader.writeUInt32LE(0x04034b50, 0);
      localHeader.writeUInt16LE(20, 4);
      localHeader.writeUInt16LE(0, 6);
      localHeader.writeUInt16LE(0, 8);
      localHeader.writeUInt16LE(dos.time, 10);
      localHeader.writeUInt16LE(dos.date, 12);
      localHeader.writeUInt32LE(crc, 14);
      localHeader.writeUInt32LE(content.length, 18);
      localHeader.writeUInt32LE(content.length, 22);
      localHeader.writeUInt16LE(fileName.length, 26);
      localHeader.writeUInt16LE(0, 28);

      localParts.push(localHeader, fileName, content);

      const centralHeader = Buffer.alloc(46);
      centralHeader.writeUInt32LE(0x02014b50, 0);
      centralHeader.writeUInt16LE(20, 4);
      centralHeader.writeUInt16LE(20, 6);
      centralHeader.writeUInt16LE(0, 8);
      centralHeader.writeUInt16LE(0, 10);
      centralHeader.writeUInt16LE(dos.time, 12);
      centralHeader.writeUInt16LE(dos.date, 14);
      centralHeader.writeUInt32LE(crc, 16);
      centralHeader.writeUInt32LE(content.length, 20);
      centralHeader.writeUInt32LE(content.length, 24);
      centralHeader.writeUInt16LE(fileName.length, 28);
      centralHeader.writeUInt16LE(0, 30);
      centralHeader.writeUInt16LE(0, 32);
      centralHeader.writeUInt16LE(0, 34);
      centralHeader.writeUInt16LE(0, 36);
      centralHeader.writeUInt32LE(0, 38);
      centralHeader.writeUInt32LE(offset, 42);
      centralParts.push(centralHeader, fileName);

      offset += localHeader.length + fileName.length + content.length;
    }

    const centralDirectory = Buffer.concat(centralParts);
    const localDirectory = Buffer.concat(localParts);
    const end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50, 0);
    end.writeUInt16LE(0, 4);
    end.writeUInt16LE(0, 6);
    end.writeUInt16LE(files.length, 8);
    end.writeUInt16LE(files.length, 10);
    end.writeUInt32LE(centralDirectory.length, 12);
    end.writeUInt32LE(localDirectory.length, 16);
    end.writeUInt16LE(0, 20);

    return Buffer.concat([localDirectory, centralDirectory, end]);
  }

  private toWorkbookCell(value: string | number | null | undefined): WorkbookCell {
    if (typeof value === "number") {
      return { value, kind: "currency" };
    }

    const text = String(value ?? "");
    const numeric = Number(text);
    if (text !== "" && Number.isFinite(numeric) && /^-?\d+(\.\d+)?$/.test(text)) {
      return { value: numeric, kind: "currency" };
    }

    return { value: text, kind: "text" };
  }

  private getWorkbookStyleId(kind: WorkbookCell["kind"], columnIndex: number) {
    if (kind === "title") return 1;
    if (kind === "header") return 3;
    if (kind === "currency") return 4;
    if (kind === "meta" && columnIndex === 0) return 2;
    return 0;
  }

  private sanitizeSheetName(value: string) {
    return value.replace(/[\\/*?:[\]]/g, "").slice(0, 31) || "Sheet";
  }

  private escapeCsv(value: unknown) {
    const text = String(value ?? "");
    if (text.includes(",") || text.includes("\"") || text.includes("\n")) {
      return `"${text.replace(/"/g, "\"\"")}"`;
    }
    return text;
  }

  private buildAuditExceptions(entries: Array<{ action: string; userId?: string | null; entityId?: string | null; entity: string }>) {
    const exceptions = [
      {
        code: "DELETES",
        description: "Delete actions recorded in the audit window.",
        count: entries.filter((entry) => entry.action === "DELETE").length,
      },
      {
        code: "REVERSALS",
        description: "Reverse actions recorded in the audit window.",
        count: entries.filter((entry) => entry.action === "REVERSE").length,
      },
      {
        code: "SYSTEM_EVENTS",
        description: "Entries created without a linked user context.",
        count: entries.filter((entry) => !entry.userId).length,
      },
      {
        code: "MISSING_ENTITY_IDS",
        description: "Audit entries missing a source entity identifier.",
        count: entries.filter((entry) => !entry.entityId).length,
      },
      {
        code: "SENSITIVE_FINANCIAL_EVENTS",
        description: "Delete or reverse actions on financial entities.",
        count: entries.filter((entry) => (entry.action === "DELETE" || entry.action === "REVERSE") && ["JournalEntry", "SalesInvoice", "PurchaseInvoice", "BankCashTransaction", "PayrollPeriod", "FixedAssetDisposal"].includes(entry.entity)).length,
      },
    ];

    return exceptions.filter((entry) => entry.count > 0);
  }

  private async getCashLedgerTransactions(accountIds: string[], dateFrom?: string, dateTo?: string, query?: ReportingQueryDto) {
    if (!accountIds.length) return [];

    return this.prisma.ledgerTransaction.findMany({
      where: {
        accountId: { in: accountIds },
        entryDate: this.dateRange(dateFrom, dateTo),
        journalEntry: query ? this.buildJournalEntryWhere(query) : undefined,
      },
      include: {
        journalEntry: {
          include: {
            lines: {
              include: {
                account: {
                  select: {
                    id: true,
                    code: true,
                    name: true,
                    type: true,
                    currencyCode: true,
                    segment3: true,
                    segment4: true,
                    segment5: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  private classifyCashFlow(currentTransactions: any[], comparisonTransactions: any[], bankCashAccountIds: Set<string>) {
    const current = this.reduceCashFlowClassification(currentTransactions, bankCashAccountIds);
    const comparison = this.reduceCashFlowClassification(comparisonTransactions, bankCashAccountIds);
    const keys = ["operating", "investing", "financing", "unclassified"];

    return Object.fromEntries(
      keys.map((key) => {
        const amount = current[key] ?? 0;
        const comparisonAmount = comparison[key] ?? 0;
        return [
          key,
          {
            amount: this.toAmount(amount),
            comparisonAmount: this.toAmount(comparisonAmount),
            varianceAmount: this.toAmount(amount - comparisonAmount),
          },
        ];
      }),
    );
  }

  private reduceCashFlowClassification(transactions: any[], bankCashAccountIds: Set<string>) {
    return transactions.reduce<Record<string, number>>((acc, transaction) => {
      const amount = Number(transaction.debitAmount) - Number(transaction.creditAmount);
      const counterpartyTypes = Array.from(
        new Set(
          transaction.journalEntry.lines
            .filter((line: any) => !bankCashAccountIds.has(line.accountId))
            .map((line: any) => line.account.type),
        ),
      ) as string[];

      const bucket = this.classifyCounterpartyTypes(counterpartyTypes);
      acc[bucket] = (acc[bucket] ?? 0) + amount;
      return acc;
    }, { operating: 0, investing: 0, financing: 0, unclassified: 0 });
  }

  private classifyCounterpartyTypes(types: string[]) {
    if (!types.length) return "unclassified";
    if (types.every((type) => type === "ASSET")) return "investing";
    if (types.every((type) => type === "LIABILITY" || type === "EQUITY")) return "financing";
    if (types.some((type) => type === "REVENUE" || type === "EXPENSE")) return "operating";
    return "unclassified";
  }

  private escapeHtml(value: string) {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  private escapePdf(value: string) {
    return value
      .replace(/\\/g, "\\\\")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)");
  }

  private escapeXml(value: string) {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  private toExcelColumn(index: number) {
    let value = index;
    let column = "";
    while (value > 0) {
      const remainder = (value - 1) % 26;
      column = String.fromCharCode(65 + remainder) + column;
      value = Math.floor((value - 1) / 26);
    }
    return column;
  }

  private toDosDateTime(date: Date) {
    const year = Math.max(date.getFullYear(), 1980);
    return {
      date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
      time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    };
  }

  private crc32(buffer: Buffer) {
    let crc = 0 ^ -1;
    for (const byte of buffer) {
      crc ^= byte;
      for (let index = 0; index < 8; index += 1) {
        const mask = -(crc & 1);
        crc = (crc >>> 1) ^ (0xedb88320 & mask);
      }
    }
    return (crc ^ -1) >>> 0;
  }

  private wrapPdfLines(value: string, maxLength: number, title = false) {
    const source = title ? value.toUpperCase() : value;
    if (source.length <= maxLength) return [source];

    const words = source.split(" ");
    const lines: string[] = [];
    let current = "";
    for (const word of words) {
      const next = current ? `${current} ${word}` : word;
      if (next.length > maxLength) {
        if (current) lines.push(current);
        current = word;
      } else {
        current = next;
      }
    }
    if (current) lines.push(current);
    return lines;
  }

  private slugify(value: string) {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "report";
  }
}
