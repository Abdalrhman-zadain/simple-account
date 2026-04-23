import { BadRequestException, ConflictException, Injectable } from "@nestjs/common";
import {
  EmployeePaymentMethod,
  EmployeeStatus,
  PayrollCalculationMethod,
  PayrollAdjustmentType,
  PayrollComponentType,
  PayrollPaymentStatus,
  PayrollPeriodStatus,
  PayrollRuleType,
  PayslipStatus,
  Prisma,
} from "../../../generated/prisma";

import { PrismaService } from "../../../common/prisma/prisma.service";
import { BankCashTransactionsService } from "../../phase-2-bank-cash-management/bank-cash-transactions/bank-cash-transactions.service";
import { JournalEntriesService } from "../../phase-1-accounting-foundation/accounting-core/journal-entries/journal-entries.service";
import {
  AdjustPayslipDto,
  AssignEmployeeComponentDto,
  AssignGroupComponentDto,
  CreateEmployeeDto,
  CreatePayrollComponentDto,
  CreatePayrollGroupDto,
  CreatePayrollPaymentDto,
  CreatePayrollPeriodDto,
  CreatePayrollRuleDto,
  PayslipLineInputDto,
  UpdateEmployeeDto,
  UpdatePayrollComponentDto,
  UpdatePayrollGroupDto,
  UpdatePayrollPaymentDto,
  UpdatePayrollPeriodDto,
  UpdatePayrollRuleDto,
  UpdatePayslipDto,
} from "./dto/payroll.dto";

@Injectable()
export class PayrollService {
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
    private readonly journalEntriesService: JournalEntriesService,
    private readonly bankCashTransactionsService: BankCashTransactionsService,
  ) {}

  async listGroups(query: { isActive?: string; search?: string }) {
    const search = query.search?.trim();
    const rows = await this.prisma.payrollGroup.findMany({
      where: {
        isActive: query.isActive === undefined || query.isActive === "" ? undefined : query.isActive === "true",
        OR: search
          ? [
              { code: { contains: search, mode: "insensitive" } },
              { name: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } },
            ]
          : undefined,
      },
      include: this.groupInclude(),
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
    });
    return rows.map((row) => this.mapGroup(row));
  }

  async createGroup(dto: CreatePayrollGroupDto) {
    try {
      const row = await this.prisma.payrollGroup.create({
        data: {
          code: dto.code?.trim() || this.generateReference("PYG"),
          name: dto.name.trim(),
          description: this.nullable(dto.description),
        },
        include: this.groupInclude(),
      });
      return this.mapGroup(row);
    } catch (error) {
      if (this.isUniqueConflict(error, "code")) throw new ConflictException("A payroll group with this code already exists.");
      throw error;
    }
  }

  async updateGroup(id: string, dto: UpdatePayrollGroupDto) {
    await this.getGroupOrThrow(id);
    const row = await this.prisma.payrollGroup.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        description: dto.description === undefined ? undefined : this.nullable(dto.description),
        isActive: dto.isActive,
      },
      include: this.groupInclude(),
    });
    return this.mapGroup(row);
  }

  async deactivateGroup(id: string) {
    await this.getGroupOrThrow(id);
    const row = await this.prisma.payrollGroup.update({
      where: { id },
      data: { isActive: false },
      include: this.groupInclude(),
    });
    return this.mapGroup(row);
  }

  async assignGroupComponent(groupId: string, dto: AssignGroupComponentDto) {
    const group = await this.getGroupOrThrow(groupId);
    if (!group.isActive) throw new BadRequestException("Inactive payroll groups cannot receive new component assignments.");
    await this.getActiveComponentOrThrow(dto.payrollComponentId);
    const row = await this.prisma.payrollGroupComponent.upsert({
      where: { payrollGroupId_payrollComponentId: { payrollGroupId: groupId, payrollComponentId: dto.payrollComponentId } },
      update: {
        amount: this.amount(dto.amount ?? 0),
        percentage: this.amount(dto.percentage ?? 0),
        quantity: this.quantity(dto.quantity ?? 1),
        installmentAmount: dto.installmentAmount === undefined ? undefined : this.amount(dto.installmentAmount),
        isRecurring: dto.isRecurring ?? true,
        effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : null,
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
      },
      create: {
        payrollGroupId: groupId,
        payrollComponentId: dto.payrollComponentId,
        amount: this.amount(dto.amount ?? 0),
        percentage: this.amount(dto.percentage ?? 0),
        quantity: this.quantity(dto.quantity ?? 1),
        installmentAmount: dto.installmentAmount === undefined ? null : this.amount(dto.installmentAmount),
        isRecurring: dto.isRecurring ?? true,
        effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : null,
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
      },
      include: { payrollComponent: true },
    });
    return this.mapAssignment(row);
  }

  async listEmployees(query: { status?: string; department?: string; payrollGroup?: string; search?: string }) {
    const search = query.search?.trim();
    const rows = await this.prisma.employee.findMany({
      where: {
        status: this.parseEnum(EmployeeStatus, query.status, "employee status"),
        department: query.department?.trim() || undefined,
        payrollGroup: query.payrollGroup?.trim() || undefined,
        OR: search
          ? [
              { code: { contains: search, mode: "insensitive" } },
              { name: { contains: search, mode: "insensitive" } },
              { department: { contains: search, mode: "insensitive" } },
              { position: { contains: search, mode: "insensitive" } },
            ]
          : undefined,
      },
      include: this.employeeInclude(),
      orderBy: [{ status: "asc" }, { name: "asc" }],
    });
    return rows.map((row) => this.mapEmployee(row));
  }

  async getEmployee(id: string) {
    return this.mapEmployee(await this.getEmployeeOrThrow(id));
  }

  async createEmployee(dto: CreateEmployeeDto) {
    const group = dto.payrollGroupId ? await this.getGroupOrThrow(dto.payrollGroupId) : null;
    try {
      const row = await this.prisma.employee.create({
        data: {
          code: dto.code?.trim() || this.generateReference("EMP"),
          name: dto.name.trim(),
          department: this.nullable(dto.department),
          position: this.nullable(dto.position),
          joiningDate: new Date(dto.joiningDate),
          paymentMethod: dto.paymentMethod ?? EmployeePaymentMethod.BANK,
          defaultSalaryStructure: this.nullable(dto.defaultSalaryStructure),
          bankAccountNumber: this.nullable(dto.bankAccountNumber),
          payrollGroup: group?.code ?? this.nullable(dto.payrollGroup),
          payrollGroupId: dto.payrollGroupId || null,
        },
        include: this.employeeInclude(),
      });
      return this.mapEmployee(row);
    } catch (error) {
      if (this.isUniqueConflict(error, "code")) throw new ConflictException("An employee with this code already exists.");
      throw error;
    }
  }

  async updateEmployee(id: string, dto: UpdateEmployeeDto) {
    const existing = await this.getEmployeeOrThrow(id);
    if (existing.status === EmployeeStatus.INACTIVE && dto.status !== EmployeeStatus.ACTIVE) {
      throw new BadRequestException("Inactive employees cannot be edited unless reactivated.");
    }
    const group = dto.payrollGroupId ? await this.getGroupOrThrow(dto.payrollGroupId) : null;
    const row = await this.prisma.employee.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        department: dto.department === undefined ? undefined : this.nullable(dto.department),
        position: dto.position === undefined ? undefined : this.nullable(dto.position),
        joiningDate: dto.joiningDate ? new Date(dto.joiningDate) : undefined,
        paymentMethod: dto.paymentMethod,
        status: dto.status,
        defaultSalaryStructure: dto.defaultSalaryStructure === undefined ? undefined : this.nullable(dto.defaultSalaryStructure),
        bankAccountNumber: dto.bankAccountNumber === undefined ? undefined : this.nullable(dto.bankAccountNumber),
        payrollGroup: group ? group.code : dto.payrollGroup === undefined ? undefined : this.nullable(dto.payrollGroup),
        payrollGroupId: dto.payrollGroupId === undefined ? undefined : dto.payrollGroupId || null,
      },
      include: this.employeeInclude(),
    });
    return this.mapEmployee(row);
  }

  async deactivateEmployee(id: string) {
    await this.getEmployeeOrThrow(id);
    const row = await this.prisma.employee.update({ where: { id }, data: { status: EmployeeStatus.INACTIVE }, include: this.employeeInclude() });
    return this.mapEmployee(row);
  }

  async assignEmployeeComponent(employeeId: string, dto: AssignEmployeeComponentDto) {
    const employee = await this.getEmployeeOrThrow(employeeId);
    if (employee.status !== EmployeeStatus.ACTIVE) throw new BadRequestException("Inactive employees cannot receive new payroll component assignments.");
    await this.getActiveComponentOrThrow(dto.payrollComponentId);
    const row = await this.prisma.employeePayrollComponent.upsert({
      where: { employeeId_payrollComponentId: { employeeId, payrollComponentId: dto.payrollComponentId } },
      update: {
        amount: this.amount(dto.amount ?? 0),
        percentage: this.amount(dto.percentage ?? 0),
        quantity: this.quantity(dto.quantity ?? 1),
        isRecurring: dto.isRecurring ?? true,
        effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : null,
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
        outstandingBalance: dto.outstandingBalance === undefined ? undefined : this.amount(dto.outstandingBalance),
      },
      create: {
        employeeId,
        payrollComponentId: dto.payrollComponentId,
        amount: this.amount(dto.amount ?? 0),
        percentage: this.amount(dto.percentage ?? 0),
        quantity: this.quantity(dto.quantity ?? 1),
        installmentAmount: dto.installmentAmount === undefined ? null : this.amount(dto.installmentAmount),
        isRecurring: dto.isRecurring ?? true,
        effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : null,
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
        outstandingBalance: dto.outstandingBalance === undefined ? null : this.amount(dto.outstandingBalance),
      },
      include: { payrollComponent: true },
    });
    return this.mapAssignment(row);
  }

  async listComponents(query: { type?: string; isActive?: string; search?: string }) {
    const search = query.search?.trim();
    const rows = await this.prisma.payrollComponent.findMany({
      where: {
        type: this.parseEnum(PayrollComponentType, query.type, "payroll component type"),
        isActive: query.isActive === undefined || query.isActive === "" ? undefined : query.isActive === "true",
        OR: search
          ? [
              { code: { contains: search, mode: "insensitive" } },
              { name: { contains: search, mode: "insensitive" } },
              { nameAr: { contains: search, mode: "insensitive" } },
            ]
          : undefined,
      },
      include: this.componentInclude(),
      orderBy: [{ isActive: "desc" }, { type: "asc" }, { name: "asc" }],
    });
    return rows.map((row) => this.mapComponent(row));
  }

  async createComponent(dto: CreatePayrollComponentDto) {
    await this.validateComponentAccounts(dto);
    try {
      const row = await this.prisma.payrollComponent.create({
        data: {
          code: dto.code?.trim() || this.generateReference("PYC"),
          name: dto.name.trim(),
          nameAr: this.nullable(dto.nameAr),
          type: dto.type,
          calculationMethod: dto.calculationMethod,
          defaultAmount: this.amount(dto.defaultAmount ?? 0),
          defaultPercentage: this.amount(dto.defaultPercentage ?? 0),
          formula: this.nullable(dto.formula),
          taxable: dto.taxable ?? false,
          expenseAccountId: dto.expenseAccountId || null,
          liabilityAccountId: dto.liabilityAccountId || null,
        },
        include: this.componentInclude(),
      });
      return this.mapComponent(row);
    } catch (error) {
      if (this.isUniqueConflict(error, "code")) throw new ConflictException("A payroll component with this code already exists.");
      throw error;
    }
  }

  async updateComponent(id: string, dto: UpdatePayrollComponentDto) {
    const existing = await this.getComponentOrThrow(id);
    if (!existing.isActive && dto.isActive !== true) throw new BadRequestException("Inactive payroll components cannot be edited unless reactivated.");
    await this.validateComponentAccounts(dto);
    const row = await this.prisma.payrollComponent.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        nameAr: dto.nameAr === undefined ? undefined : this.nullable(dto.nameAr),
        type: dto.type,
        calculationMethod: dto.calculationMethod,
        defaultAmount: dto.defaultAmount === undefined ? undefined : this.amount(dto.defaultAmount),
        defaultPercentage: dto.defaultPercentage === undefined ? undefined : this.amount(dto.defaultPercentage),
        formula: dto.formula === undefined ? undefined : this.nullable(dto.formula),
        taxable: dto.taxable,
        expenseAccountId: dto.expenseAccountId === undefined ? undefined : dto.expenseAccountId || null,
        liabilityAccountId: dto.liabilityAccountId === undefined ? undefined : dto.liabilityAccountId || null,
        isActive: dto.isActive,
      },
      include: this.componentInclude(),
    });
    return this.mapComponent(row);
  }

  async deactivateComponent(id: string) {
    await this.getComponentOrThrow(id);
    const row = await this.prisma.payrollComponent.update({ where: { id }, data: { isActive: false }, include: this.componentInclude() });
    return this.mapComponent(row);
  }

  async listRules(query: { ruleType?: string; payrollGroupId?: string; isActive?: string; search?: string }) {
    const search = query.search?.trim();
    const rows = await this.prisma.payrollRule.findMany({
      where: {
        ruleType: this.parseEnum(PayrollRuleType, query.ruleType, "payroll rule type"),
        payrollGroupId: query.payrollGroupId || undefined,
        isActive: query.isActive === undefined || query.isActive === "" ? undefined : query.isActive === "true",
        OR: search
          ? [
              { code: { contains: search, mode: "insensitive" } },
              { name: { contains: search, mode: "insensitive" } },
            ]
          : undefined,
      },
      include: this.ruleInclude(),
      orderBy: [{ isActive: "desc" }, { ruleType: "asc" }, { name: "asc" }],
    });
    return rows.map((row) => this.mapRule(row));
  }

  async createRule(dto: CreatePayrollRuleDto) {
    await this.getActiveComponentOrThrow(dto.payrollComponentId);
    if (dto.payrollGroupId) await this.getGroupOrThrow(dto.payrollGroupId);
    try {
      const row = await this.prisma.payrollRule.create({
        data: {
          code: dto.code?.trim() || this.generateReference("PYR"),
          name: dto.name.trim(),
          ruleType: dto.ruleType,
          payrollComponentId: dto.payrollComponentId,
          payrollGroupId: dto.payrollGroupId || null,
          calculationMethod: dto.calculationMethod,
          amount: this.amount(dto.amount ?? 0),
          percentage: this.amount(dto.percentage ?? 0),
          formula: this.nullable(dto.formula),
        },
        include: this.ruleInclude(),
      });
      return this.mapRule(row);
    } catch (error) {
      if (this.isUniqueConflict(error, "code")) throw new ConflictException("A payroll rule with this code already exists.");
      throw error;
    }
  }

  async updateRule(id: string, dto: UpdatePayrollRuleDto) {
    await this.getRuleOrThrow(id);
    if (dto.payrollComponentId) await this.getActiveComponentOrThrow(dto.payrollComponentId);
    if (dto.payrollGroupId) await this.getGroupOrThrow(dto.payrollGroupId);
    const row = await this.prisma.payrollRule.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        ruleType: dto.ruleType,
        payrollComponentId: dto.payrollComponentId,
        payrollGroupId: dto.payrollGroupId === undefined ? undefined : dto.payrollGroupId || null,
        calculationMethod: dto.calculationMethod,
        amount: dto.amount === undefined ? undefined : this.amount(dto.amount),
        percentage: dto.percentage === undefined ? undefined : this.amount(dto.percentage),
        formula: dto.formula === undefined ? undefined : this.nullable(dto.formula),
        isActive: dto.isActive,
      },
      include: this.ruleInclude(),
    });
    return this.mapRule(row);
  }

  async deactivateRule(id: string) {
    await this.getRuleOrThrow(id);
    const row = await this.prisma.payrollRule.update({
      where: { id },
      data: { isActive: false },
      include: this.ruleInclude(),
    });
    return this.mapRule(row);
  }

  async listPeriods(query: { status?: string; payrollGroup?: string; dateFrom?: string; dateTo?: string; search?: string }) {
    const search = query.search?.trim();
    const rows = await this.prisma.payrollPeriod.findMany({
      where: {
        status: this.parseEnum(PayrollPeriodStatus, query.status, "payroll period status"),
        payrollGroup: query.payrollGroup?.trim() || undefined,
        OR: search ? [{ reference: { contains: search, mode: "insensitive" } }, { name: { contains: search, mode: "insensitive" } }] : undefined,
        startDate: query.dateFrom || query.dateTo ? { gte: query.dateFrom ? new Date(query.dateFrom) : undefined, lte: query.dateTo ? new Date(query.dateTo) : undefined } : undefined,
      },
      include: this.periodInclude(),
      orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
    });
    return rows.map((row) => this.mapPeriod(row));
  }

  async getPeriod(id: string) {
    return this.mapPeriod(await this.getPeriodOrThrow(id));
  }

  async createPeriod(dto: CreatePayrollPeriodDto) {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    const paymentDate = new Date(dto.paymentDate);
    this.validateDateRange(startDate, endDate, paymentDate);
    await this.validatePostingAccount(dto.payrollPayableAccountId, ["LIABILITY"], "Payroll payable account");
    const group = dto.payrollGroupId ? await this.getGroupOrThrow(dto.payrollGroupId) : null;
    const payrollGroup = group?.code ?? this.nullable(dto.payrollGroup);
    await this.ensureNoPeriodOverlap(startDate, endDate, payrollGroup ?? undefined);
    try {
      const row = await this.prisma.payrollPeriod.create({
        data: {
          reference: dto.reference?.trim() || this.generateReference("PAYRUN"),
          name: dto.name.trim(),
          payrollGroup,
          payrollGroupId: dto.payrollGroupId || null,
          cycle: dto.cycle?.trim() || "MONTHLY",
          startDate,
          endDate,
          paymentDate,
          payrollPayableAccountId: dto.payrollPayableAccountId,
        },
        include: this.periodInclude(),
      });
      return this.mapPeriod(row);
    } catch (error) {
      if (this.isUniqueConflict(error, "reference")) throw new ConflictException("A payroll period with this reference already exists.");
      throw error;
    }
  }

  async updatePeriod(id: string, dto: UpdatePayrollPeriodDto) {
    const existing = await this.getPeriodOrThrow(id);
    this.ensurePeriodDraft(existing.status);
    const startDate = dto.startDate ? new Date(dto.startDate) : existing.startDate;
    const endDate = dto.endDate ? new Date(dto.endDate) : existing.endDate;
    const paymentDate = dto.paymentDate ? new Date(dto.paymentDate) : existing.paymentDate;
    this.validateDateRange(startDate, endDate, paymentDate);
    if (dto.payrollPayableAccountId) await this.validatePostingAccount(dto.payrollPayableAccountId, ["LIABILITY"], "Payroll payable account");
    const group = dto.payrollGroupId ? await this.getGroupOrThrow(dto.payrollGroupId) : null;
    const payrollGroup = group ? group.code : dto.payrollGroup ?? existing.payrollGroup ?? undefined;
    await this.ensureNoPeriodOverlap(startDate, endDate, payrollGroup, id);
    const row = await this.prisma.payrollPeriod.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        payrollGroup: group ? group.code : dto.payrollGroup === undefined ? undefined : this.nullable(dto.payrollGroup),
        payrollGroupId: dto.payrollGroupId === undefined ? undefined : dto.payrollGroupId || null,
        cycle: dto.cycle?.trim(),
        startDate,
        endDate,
        paymentDate,
        payrollPayableAccountId: dto.payrollPayableAccountId,
      },
      include: this.periodInclude(),
    });
    return this.mapPeriod(row);
  }

  async generatePayslips(periodId: string, dto: { employeeIds?: string[] }) {
    const period = await this.getPeriodOrThrow(periodId);
    this.ensurePeriodDraft(period.status);
    const employees = await this.prisma.employee.findMany({
      where: {
        status: EmployeeStatus.ACTIVE,
        payrollGroup: period.payrollGroupId ? undefined : period.payrollGroup ?? undefined,
        payrollGroupId: period.payrollGroupId ?? undefined,
        id: dto.employeeIds?.length ? { in: dto.employeeIds } : undefined,
      },
      include: { componentAssignments: { include: { payrollComponent: true }, orderBy: { createdAt: "asc" } } },
      orderBy: { name: "asc" },
    });
    if (!employees.length) throw new BadRequestException("No active employees were found for this payroll period.");
    const created = [];
    for (const employee of employees) {
      const groupAssignments = employee.payrollGroupId
        ? await this.prisma.payrollGroupComponent.findMany({
            where: { payrollGroupId: employee.payrollGroupId },
            include: { payrollComponent: true },
            orderBy: { createdAt: "asc" },
          })
        : [];
      const rules = await this.prisma.payrollRule.findMany({
        where: {
          isActive: true,
          OR: [{ payrollGroupId: null }, ...(employee.payrollGroupId ? [{ payrollGroupId: employee.payrollGroupId }] : [])],
        },
        include: { payrollComponent: true },
        orderBy: { createdAt: "asc" },
      });
      const lines = [...groupAssignments, ...employee.componentAssignments]
        .filter((assignment) => this.assignmentApplies(assignment, period.startDate, period.endDate))
        .map((assignment, index) => this.assignmentToPayslipLine(assignment, index));
      let totals = this.calculateTotals(lines);
      for (const rule of rules) {
        if (!rule.payrollComponent.isActive) continue;
        lines.push(this.ruleToPayslipLine(rule, lines.length, totals));
        totals = this.calculateTotals(lines);
      }
      if (!lines.length) continue;
      const row = await this.prisma.payslip.upsert({
        where: { payrollPeriodId_employeeId: { payrollPeriodId: periodId, employeeId: employee.id } },
        update: {
          status: PayslipStatus.DRAFT,
          grossPay: this.amount(totals.grossPay),
          totalDeductions: this.amount(totals.totalDeductions),
          employerContributions: this.amount(totals.employerContributions),
          netPay: this.amount(totals.netPay),
          outstandingAmount: this.amount(totals.netPay),
          lines: { deleteMany: {}, create: lines },
        },
        create: {
          reference: this.generateReference("PS"),
          payrollPeriodId: periodId,
          employeeId: employee.id,
          grossPay: this.amount(totals.grossPay),
          totalDeductions: this.amount(totals.totalDeductions),
          employerContributions: this.amount(totals.employerContributions),
          netPay: this.amount(totals.netPay),
          outstandingAmount: this.amount(totals.netPay),
          lines: { create: lines },
        },
        include: this.payslipInclude(),
      });
      created.push(this.mapPayslip(row));
    }
    return created;
  }

  async listPayslips(query: { status?: string; employeeId?: string; payrollPeriodId?: string; department?: string; dateFrom?: string; dateTo?: string; search?: string }) {
    const search = query.search?.trim();
    const rows = await this.prisma.payslip.findMany({
      where: {
        status: this.parseEnum(PayslipStatus, query.status, "payslip status"),
        employeeId: query.employeeId,
        payrollPeriodId: query.payrollPeriodId,
        employee: { department: query.department?.trim() || undefined },
        payrollPeriod: { startDate: query.dateFrom || query.dateTo ? { gte: query.dateFrom ? new Date(query.dateFrom) : undefined, lte: query.dateTo ? new Date(query.dateTo) : undefined } : undefined },
        OR: search
          ? [
              { reference: { contains: search, mode: "insensitive" } },
              { employee: { code: { contains: search, mode: "insensitive" } } },
              { employee: { name: { contains: search, mode: "insensitive" } } },
            ]
          : undefined,
      },
      include: this.payslipInclude(),
      orderBy: [{ createdAt: "desc" }],
    });
    return rows.map((row) => this.mapPayslip(row));
  }

  async getPayslip(id: string) {
    return this.mapPayslip(await this.getPayslipOrThrow(id));
  }

  async updatePayslip(id: string, dto: UpdatePayslipDto) {
    const existing = await this.getPayslipOrThrow(id);
    if (existing.status !== PayslipStatus.DRAFT) throw new BadRequestException("Only draft payslips can be edited.");
    const lineCreates = dto.lines?.map((line, index) => this.manualPayslipLine(line, index));
    const totals = lineCreates ? this.calculateTotals(lineCreates) : null;
    const row = await this.prisma.payslip.update({
      where: { id },
      data: {
        notes: dto.notes === undefined ? undefined : this.nullable(dto.notes),
        grossPay: totals ? this.amount(totals.grossPay) : undefined,
        totalDeductions: totals ? this.amount(totals.totalDeductions) : undefined,
        employerContributions: totals ? this.amount(totals.employerContributions) : undefined,
        netPay: totals ? this.amount(totals.netPay) : undefined,
        outstandingAmount: totals ? this.amount(totals.netPay) : undefined,
        lines: lineCreates ? { deleteMany: {}, create: lineCreates } : undefined,
      },
      include: this.payslipInclude(),
    });
    return this.mapPayslip(row);
  }

  async postPeriod(id: string) {
    const period = await this.getPeriodOrThrow(id);
    this.ensurePeriodDraft(period.status);
    if (!period.payslips.length) throw new BadRequestException("Generate payslips before posting payroll.");
    if (period.payslips.some((payslip) => payslip.status !== PayslipStatus.DRAFT)) throw new BadRequestException("Only draft payslips can be posted with the payroll period.");
    const updated = await this.prisma.$transaction(async (tx) => {
      const { journalEntry, postedAt } = await this.createPostedJournalEntry(
        tx,
        period.paymentDate,
        `Payroll posting ${period.reference}`,
        this.buildPayrollPostingLines(period),
      );
      await tx.payrollPeriod.update({
        where: { id },
        data: { status: PayrollPeriodStatus.POSTED, journalEntryId: journalEntry.id, postedAt },
      });
      for (const payslip of period.payslips) {
        await tx.payslip.update({
          where: { id: payslip.id },
          data: { status: PayslipStatus.POSTED, postedAt, outstandingAmount: payslip.netPay },
        });
        await tx.employee.update({ where: { id: payslip.employeeId }, data: { currentBalance: { increment: payslip.netPay } } });
        for (const line of payslip.lines) {
          if (line.componentType === PayrollComponentType.DEDUCTION && line.payrollComponentId) {
            await tx.employeePayrollComponent.updateMany({
              where: { employeeId: payslip.employeeId, payrollComponentId: line.payrollComponentId, outstandingBalance: { not: null } },
              data: { outstandingBalance: { decrement: line.amount } },
            });
          }
        }
      }
      return tx.payrollPeriod.findUniqueOrThrow({ where: { id }, include: this.periodInclude() });
    });
    return this.mapPeriod(updated);
  }

  async closePeriod(id: string) {
    const period = await this.getPeriodOrThrow(id);
    if (period.status !== PayrollPeriodStatus.POSTED) throw new BadRequestException("Only posted payroll periods can be closed.");
    const row = await this.prisma.payrollPeriod.update({ where: { id }, data: { status: PayrollPeriodStatus.CLOSED, closedAt: new Date() }, include: this.periodInclude() });
    return this.mapPeriod(row);
  }

  async listPayments(query: { status?: string; employeeId?: string; payrollPeriodId?: string; search?: string }) {
    const search = query.search?.trim();
    const rows = await this.prisma.payrollPayment.findMany({
      where: {
        status: this.parseEnum(PayrollPaymentStatus, query.status, "payroll payment status"),
        employeeId: query.employeeId,
        payrollPeriodId: query.payrollPeriodId,
        OR: search
          ? [
              { reference: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } },
              { employee: { code: { contains: search, mode: "insensitive" } } },
              { employee: { name: { contains: search, mode: "insensitive" } } },
            ]
          : undefined,
      },
      include: this.paymentInclude(),
      orderBy: [{ paymentDate: "desc" }, { createdAt: "desc" }],
    });
    return rows.map((row) => this.mapPayment(row));
  }

  async createPayment(dto: CreatePayrollPaymentDto) {
    const period = await this.getPeriodOrThrow(dto.payrollPeriodId);
    if (period.status !== PayrollPeriodStatus.POSTED && period.status !== PayrollPeriodStatus.CLOSED) throw new BadRequestException("Salary payments require a posted payroll period.");
    if (dto.employeeId) await this.getEmployeeOrThrow(dto.employeeId);
    await this.validateBankCashAccount(dto.bankCashAccountId);
    await this.validatePaymentAllocations(dto.payrollPeriodId, dto.allocations ?? [], dto.amount);
    try {
      const allocationTotal = this.sum(dto.allocations?.map((a) => a.amount) ?? []);
      const row = await this.prisma.payrollPayment.create({
        data: {
          reference: dto.reference?.trim() || this.generateReference("PYP"),
          paymentDate: new Date(dto.paymentDate),
          payrollPeriodId: dto.payrollPeriodId,
          employeeId: dto.employeeId || null,
          bankCashAccountId: dto.bankCashAccountId,
          amount: this.amount(dto.amount),
          allocatedAmount: this.amount(allocationTotal),
          unappliedAmount: this.amount(dto.amount - allocationTotal),
          description: this.nullable(dto.description),
          allocations: { create: (dto.allocations ?? []).map((allocation) => ({ payslipId: allocation.payslipId, amount: this.amount(allocation.amount) })) },
        },
        include: this.paymentInclude(),
      });
      return this.mapPayment(row);
    } catch (error) {
      if (this.isUniqueConflict(error, "reference")) throw new ConflictException("A payroll payment with this reference already exists.");
      throw error;
    }
  }

  async updatePayment(id: string, dto: UpdatePayrollPaymentDto) {
    const existing = await this.getPaymentOrThrow(id);
    if (existing.status !== PayrollPaymentStatus.DRAFT) throw new BadRequestException("Only draft payroll payments can be edited.");
    if (dto.employeeId) await this.getEmployeeOrThrow(dto.employeeId);
    if (dto.bankCashAccountId) await this.validateBankCashAccount(dto.bankCashAccountId);
    if (dto.allocations || dto.amount !== undefined) {
      await this.validatePaymentAllocations(
        existing.payrollPeriodId,
        dto.allocations ?? existing.allocations.map((a) => ({ payslipId: a.payslipId, amount: Number(a.amount) })),
        dto.amount ?? Number(existing.amount),
      );
    }
    const allocationTotal = dto.allocations ? this.sum(dto.allocations.map((a) => a.amount)) : Number(existing.allocatedAmount);
    const amount = dto.amount ?? Number(existing.amount);
    const row = await this.prisma.$transaction(async (tx) => {
      if (dto.allocations) await tx.payrollPaymentAllocation.deleteMany({ where: { payrollPaymentId: id } });
      return tx.payrollPayment.update({
        where: { id },
        data: {
          paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : undefined,
          employeeId: dto.employeeId === undefined ? undefined : dto.employeeId || null,
          bankCashAccountId: dto.bankCashAccountId,
          amount: dto.amount === undefined ? undefined : this.amount(dto.amount),
          allocatedAmount: this.amount(allocationTotal),
          unappliedAmount: this.amount(amount - allocationTotal),
          description: dto.description === undefined ? undefined : this.nullable(dto.description),
          allocations: dto.allocations ? { create: dto.allocations.map((allocation) => ({ payslipId: allocation.payslipId, amount: this.amount(allocation.amount) })) } : undefined,
        },
        include: this.paymentInclude(),
      });
    });
    return this.mapPayment(row);
  }

  async postPayment(id: string) {
    const payment = await this.getPaymentOrThrow(id);
    if (payment.status !== PayrollPaymentStatus.DRAFT) throw new BadRequestException("Only draft payroll payments can be posted.");
    if (!payment.allocations.length) throw new BadRequestException("Allocate the payment to at least one posted payslip before posting.");
    const transaction = await this.bankCashTransactionsService.createPayment({
      reference: payment.reference,
      transactionDate: payment.paymentDate.toISOString(),
      amount: Number(payment.amount),
      bankCashAccountId: payment.bankCashAccountId,
      counterAccountId: payment.payrollPeriod.payrollPayableAccountId,
      counterpartyName: payment.employee?.name ?? "Payroll batch",
      description: payment.description ?? `Payroll payment ${payment.reference}`,
    });
    const postedTransaction = await this.bankCashTransactionsService.post(transaction.id);
    const row = await this.prisma.$transaction(async (tx) => {
      for (const allocation of payment.allocations) {
        const payslip = allocation.payslip;
        const nextPaid = Number(payslip.paidAmount) + Number(allocation.amount);
        const nextOutstanding = Number(payslip.outstandingAmount) - Number(allocation.amount);
        await tx.payslip.update({
          where: { id: payslip.id },
          data: {
            paidAmount: this.amount(nextPaid),
            outstandingAmount: this.amount(Math.max(0, nextOutstanding)),
            status: nextOutstanding <= 0 ? PayslipStatus.PAID : PayslipStatus.PARTIALLY_PAID,
            paidAt: nextOutstanding <= 0 ? new Date() : payslip.paidAt,
          },
        });
        await tx.employee.update({ where: { id: payslip.employeeId }, data: { currentBalance: { decrement: allocation.amount } } });
      }
      return tx.payrollPayment.update({
        where: { id },
        data: { status: PayrollPaymentStatus.POSTED, bankCashTransactionId: postedTransaction.id, postedAt: postedTransaction.postedAt ? new Date(postedTransaction.postedAt) : new Date() },
        include: this.paymentInclude(),
      });
    });
    return this.mapPayment(row);
  }

  async cancelPayment(id: string) {
    const payment = await this.getPaymentOrThrow(id);
    if (payment.status !== PayrollPaymentStatus.DRAFT) throw new BadRequestException("Only draft payroll payments can be cancelled.");
    const row = await this.prisma.payrollPayment.update({
      where: { id },
      data: { status: PayrollPaymentStatus.CANCELLED },
      include: this.paymentInclude(),
    });
    return this.mapPayment(row);
  }

  async reversePayment(id: string) {
    const payment = await this.getPaymentOrThrow(id);
    if (payment.status !== PayrollPaymentStatus.POSTED) throw new BadRequestException("Only posted payroll payments can be reversed.");
    const transaction = await this.bankCashTransactionsService.createReceipt({
      reference: this.generateReference("PYP-REV"),
      transactionDate: new Date().toISOString(),
      amount: Number(payment.amount),
      bankCashAccountId: payment.bankCashAccountId,
      counterAccountId: payment.payrollPeriod.payrollPayableAccountId,
      counterpartyName: payment.employee?.name ?? "Payroll batch",
      description: `Reversal of payroll payment ${payment.reference}`,
    });
    await this.bankCashTransactionsService.post(transaction.id);
    const row = await this.prisma.$transaction(async (tx) => {
      for (const allocation of payment.allocations) {
        const payslip = allocation.payslip;
        const nextPaid = Math.max(0, Number(payslip.paidAmount) - Number(allocation.amount));
        const nextOutstanding = Number(payslip.outstandingAmount) + Number(allocation.amount);
        await tx.payslip.update({
          where: { id: payslip.id },
          data: {
            paidAmount: this.amount(nextPaid),
            outstandingAmount: this.amount(nextOutstanding),
            status: nextPaid <= 0 ? PayslipStatus.POSTED : PayslipStatus.PARTIALLY_PAID,
            paidAt: nextPaid <= 0 ? null : payslip.paidAt,
          },
        });
        await tx.employee.update({ where: { id: payslip.employeeId }, data: { currentBalance: { increment: allocation.amount } } });
      }
      return tx.payrollPayment.update({
        where: { id },
        data: { status: PayrollPaymentStatus.REVERSED },
        include: this.paymentInclude(),
      });
    });
    return this.mapPayment(row);
  }

  async adjustPayslip(id: string, dto: AdjustPayslipDto) {
    const payslip = await this.getPayslipOrThrow(id);
    const adjustableStatuses: PayslipStatus[] = [PayslipStatus.POSTED, PayslipStatus.PARTIALLY_PAID, PayslipStatus.PAID];
    if (!adjustableStatuses.includes(payslip.status)) {
      throw new BadRequestException("Only posted or paid payslips can be adjusted.");
    }
    if (!dto.lines.length) throw new BadRequestException("Payroll adjustments require at least one line.");
    const period = await this.getPeriodOrThrow(payslip.payrollPeriodId);
    const lines = dto.lines.map((line, index) => this.manualPayslipLine(line, index));
    const totals = this.calculateTotals(lines);
    const row = await this.prisma.$transaction(async (tx) => {
      const { journalEntry, postedAt } = await this.createPostedJournalEntry(
        tx,
        new Date(),
        dto.description ?? `Payroll adjustment ${payslip.reference}`,
        this.buildAdjustmentPostingLines(period.payrollPayableAccountId, lines, totals.netPay),
      );
      await tx.payrollAdjustment.create({
        data: {
          reference: this.generateReference("PYA"),
          type: PayrollAdjustmentType.ADJUSTMENT,
          payrollPeriodId: payslip.payrollPeriodId,
          payslipId: payslip.id,
          employeeId: payslip.employeeId,
          amount: this.amount(totals.netPay),
          description: this.nullable(dto.description),
          journalEntryId: journalEntry.id,
        },
      });
      const nextPayslip = await tx.payslip.update({
        where: { id: payslip.id },
        data: {
          grossPay: { increment: this.amount(totals.grossPay) },
          totalDeductions: { increment: this.amount(totals.totalDeductions) },
          employerContributions: { increment: this.amount(totals.employerContributions) },
          netPay: { increment: this.amount(totals.netPay) },
          outstandingAmount: { increment: this.amount(totals.netPay) },
          status: PayslipStatus.PARTIALLY_PAID,
          notes: dto.description ?? payslip.notes,
          postedAt: postedAt,
        },
        include: this.payslipInclude(),
      });
      await tx.employee.update({ where: { id: payslip.employeeId }, data: { currentBalance: { increment: this.amount(totals.netPay) } } });
      return nextPayslip;
    });
    return this.mapPayslip(row);
  }

  async reversePeriod(id: string) {
    const period = await this.getPeriodOrThrow(id);
    if (period.status !== PayrollPeriodStatus.POSTED && period.status !== PayrollPeriodStatus.CLOSED) throw new BadRequestException("Only posted or closed payroll periods can be reversed.");
    if (!period.journalEntryId) throw new BadRequestException("Payroll period has no journal entry to reverse.");
    const postedPayment = await this.prisma.payrollPayment.findFirst({ where: { payrollPeriodId: id, status: PayrollPaymentStatus.POSTED } });
    if (postedPayment) throw new BadRequestException("Reverse posted payroll payments before reversing the payroll period.");
    const row = await this.prisma.$transaction(async (tx) => {
      const originalEntry = await tx.journalEntry.findUnique({
        where: { id: period.journalEntryId! },
        include: { lines: { orderBy: { lineNumber: "asc" } } },
      });
      if (!originalEntry) throw new BadRequestException("Payroll period journal entry was not found.");
      const reversalLines = originalEntry.lines.map((line, index) => ({
        accountId: line.accountId,
        description: `Reversal of line ${line.lineNumber}`,
        debitAmount: Number(line.creditAmount),
        creditAmount: Number(line.debitAmount),
      }));
      const { journalEntry, postedAt } = await this.createPostedJournalEntry(
        tx,
        new Date(),
        `Reversal of payroll period ${period.reference}`,
        reversalLines,
        originalEntry.id,
      );
      await tx.payrollAdjustment.create({
        data: {
          reference: this.generateReference("PYA-REV"),
          type: PayrollAdjustmentType.REVERSAL,
          payrollPeriodId: period.id,
          amount: this.amount(-this.sum(period.payslips.map((p) => Number(p.netPay)))),
          description: `Reversal of payroll period ${period.reference}`,
          journalEntryId: journalEntry.id,
        },
      });
      for (const payslip of period.payslips) {
        await tx.employee.update({ where: { id: payslip.employeeId }, data: { currentBalance: { decrement: payslip.outstandingAmount } } });
        await tx.payslip.update({ where: { id: payslip.id }, data: { status: PayslipStatus.REVERSED, outstandingAmount: this.amount(0), paidAt: null, postedAt: postedAt } });
      }
      return tx.payrollPeriod.update({
        where: { id },
        data: { status: PayrollPeriodStatus.REVERSED, closedAt: postedAt, postedAt },
        include: this.periodInclude(),
      });
    });
    return this.mapPeriod(row);
  }

  async getSummary(query: { payrollPeriodId?: string; employeeId?: string; department?: string }) {
    const payslips = await this.prisma.payslip.findMany({
      where: { payrollPeriodId: query.payrollPeriodId, employeeId: query.employeeId, employee: { department: query.department?.trim() || undefined } },
      include: this.payslipInclude(),
      orderBy: [{ createdAt: "desc" }],
    });
    const componentTotals = new Map<string, { type: string; amount: number }>();
    for (const payslip of payslips) {
      for (const line of payslip.lines) {
        const key = `${line.componentType}:${line.componentName}`;
        const current = componentTotals.get(key) ?? { type: line.componentType, amount: 0 };
        current.amount += Number(line.amount);
        componentTotals.set(key, current);
      }
    }
    return {
      grossPay: this.format(this.sum(payslips.map((p) => Number(p.grossPay)))),
      totalDeductions: this.format(this.sum(payslips.map((p) => Number(p.totalDeductions)))),
      employerContributions: this.format(this.sum(payslips.map((p) => Number(p.employerContributions)))),
      netPay: this.format(this.sum(payslips.map((p) => Number(p.netPay)))),
      paidAmount: this.format(this.sum(payslips.map((p) => Number(p.paidAmount)))),
      outstandingAmount: this.format(this.sum(payslips.map((p) => Number(p.outstandingAmount)))),
      payslipCount: payslips.length,
      componentTotals: [...componentTotals.entries()].map(([name, total]) => ({ name: name.split(":").slice(1).join(":"), type: total.type, amount: this.format(total.amount) })),
      rows: payslips.map((payslip) => this.mapPayslip(payslip)),
    };
  }

  private buildPayrollPostingLines(period: Awaited<ReturnType<PayrollService["getPeriodOrThrow"]>>) {
    const bucket = new Map<string, { debit: number; credit: number; description: string }>();
    const add = (accountId: string | null, debit: number, credit: number, description: string) => {
      if (!accountId) throw new BadRequestException(`Missing posting account for ${description}.`);
      const current = bucket.get(accountId) ?? { debit: 0, credit: 0, description };
      current.debit += debit;
      current.credit += credit;
      bucket.set(accountId, current);
    };
    for (const payslip of period.payslips) {
      for (const line of payslip.lines) {
        const amount = Number(line.amount);
        if (line.componentType === PayrollComponentType.EARNING || line.componentType === PayrollComponentType.BENEFIT) add(line.accountId, amount, 0, line.componentName);
        if (line.componentType === PayrollComponentType.DEDUCTION) add(line.liabilityAccountId, 0, amount, line.componentName);
        if (line.componentType === PayrollComponentType.EMPLOYER_CONTRIBUTION) {
          add(line.accountId, amount, 0, `${line.componentName} expense`);
          add(line.liabilityAccountId, 0, amount, `${line.componentName} liability`);
        }
      }
      add(period.payrollPayableAccountId, 0, Number(payslip.netPay), "Net payroll payable");
    }
    const lines: Array<{ accountId: string; description: string; debitAmount: number; creditAmount: number }> = [];
    for (const [accountId, value] of bucket.entries()) {
      if (value.debit > 0) lines.push({ accountId, description: value.description, debitAmount: value.debit, creditAmount: 0 });
      if (value.credit > 0) lines.push({ accountId, description: value.description, debitAmount: 0, creditAmount: value.credit });
    }
    return lines;
  }

  private async createPostedJournalEntry(
    tx: Prisma.TransactionClient,
    entryDate: Date,
    description: string,
    lines: Array<{ accountId: string; description: string; debitAmount: number; creditAmount: number }>,
    reversalOfId?: string | null,
  ) {
    this.journalEntriesService.validateLines(
      lines.map((line) => ({
        accountId: line.accountId,
        description: line.description,
        debitAmount: line.debitAmount,
        creditAmount: line.creditAmount,
      })),
    );

    const accountIds = [...new Set(lines.map((line) => line.accountId))];
    await this.validatePostingAccountsInTransaction(tx, accountIds);

    const postedAt = new Date();
    const batch = await tx.postingBatch.create({
      data: { postedAt },
    });

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

  private async validatePostingAccountsInTransaction(
    tx: Prisma.TransactionClient,
    accountIds: string[],
  ) {
    const uniqueAccountIds = [...new Set(accountIds)];
    if (!uniqueAccountIds.length) return;
    const accounts = await tx.account.findMany({
      where: { id: { in: uniqueAccountIds } },
    });
    if (accounts.length !== uniqueAccountIds.length) {
      const foundIds = new Set(accounts.map((account) => account.id));
      const missingId = uniqueAccountIds.find((accountId) => !foundIds.has(accountId));
      throw new BadRequestException(`Account ${missingId} was not found.`);
    }
    for (const account of accounts) {
      if (!account.isActive || !account.isPosting || account.allowManualPosting === false) {
        throw new BadRequestException(`Account ${account.code} is not available for payroll posting.`);
      }
    }
  }

  private async updateAccountBalancesInTransaction(
    tx: Prisma.TransactionClient,
    lines: Array<{ accountId: string; debitAmount: { toString(): string }; creditAmount: { toString(): string } }>,
  ) {
    const netByAccount = new Map<string, number>();
    for (const line of lines) {
      const current = netByAccount.get(line.accountId) ?? 0;
      const next = current + Number(line.debitAmount.toString()) - Number(line.creditAmount.toString());
      netByAccount.set(line.accountId, next);
    }
    for (const [accountId, amount] of [...netByAccount.entries()].filter(([, amount]) => amount !== 0)) {
      await tx.account.update({
        where: { id: accountId },
        data: { currentBalance: { increment: Number(amount.toFixed(2)) } },
      });
    }
  }

  private buildAdjustmentPostingLines(
    payrollPayableAccountId: string,
    payslipLines: Array<{ componentType: PayrollComponentType; amount?: Prisma.Decimal | string | number | Prisma.DecimalJsLike; accountId?: string | null; liabilityAccountId?: string | null; componentName: string }>,
    netPay: number,
  ) {
    const bucket = new Map<string, { debit: number; credit: number; description: string }>();
    const add = (accountId: string | null | undefined, debit: number, credit: number, description: string) => {
      if (!accountId) throw new BadRequestException(`Missing posting account for ${description}.`);
      const current = bucket.get(accountId) ?? { debit: 0, credit: 0, description };
      current.debit += debit;
      current.credit += credit;
      bucket.set(accountId, current);
    };
    for (const line of payslipLines) {
      const amount = Number(line.amount);
      if (line.componentType === PayrollComponentType.EARNING || line.componentType === PayrollComponentType.BENEFIT) add(line.accountId, amount, 0, line.componentName);
      if (line.componentType === PayrollComponentType.DEDUCTION) add(line.liabilityAccountId, 0, amount, line.componentName);
      if (line.componentType === PayrollComponentType.EMPLOYER_CONTRIBUTION) {
        add(line.accountId, amount, 0, `${line.componentName} expense`);
        add(line.liabilityAccountId, 0, amount, `${line.componentName} liability`);
      }
    }
    if (netPay >= 0) add(payrollPayableAccountId, 0, netPay, "Net payroll adjustment payable");
    if (netPay < 0) add(payrollPayableAccountId, Math.abs(netPay), 0, "Net payroll adjustment payable");
    const lines: Array<{ accountId: string; description: string; debitAmount: number; creditAmount: number }> = [];
    for (const [accountId, value] of bucket.entries()) {
      if (value.debit > 0) lines.push({ accountId, description: value.description, debitAmount: value.debit, creditAmount: 0 });
      if (value.credit > 0) lines.push({ accountId, description: value.description, debitAmount: 0, creditAmount: value.credit });
    }
    return lines;
  }

  private async validatePaymentAllocations(payrollPeriodId: string, allocations: Array<{ payslipId: string; amount: number }>, paymentAmount: number) {
    const total = this.sum(allocations.map((a) => a.amount));
    if (total > paymentAmount) throw new BadRequestException("Payment allocations cannot exceed the payment amount.");
    if (!allocations.length) return;
    const ids = allocations.map((a) => a.payslipId);
    const payslips = await this.prisma.payslip.findMany({ where: { id: { in: ids }, payrollPeriodId } });
    if (payslips.length !== ids.length) throw new BadRequestException("All payment allocations must target payslips in the selected payroll period.");
    for (const allocation of allocations) {
      const payslip = payslips.find((row) => row.id === allocation.payslipId);
      if (!payslip || payslip.status === PayslipStatus.DRAFT || payslip.status === PayslipStatus.CANCELLED) throw new BadRequestException("Payments can only settle posted payroll payslips.");
      if (allocation.amount > Number(payslip.outstandingAmount)) throw new BadRequestException(`Allocation exceeds outstanding amount for payslip ${payslip.reference}.`);
    }
  }

  private assignmentToPayslipLine(assignment: any, index: number): Prisma.PayslipLineUncheckedCreateWithoutPayslipInput {
    const component = assignment.payrollComponent;
    const amount = this.resolveComponentAmount(component, assignment);
    return {
      lineNumber: index + 1,
      payrollComponentId: component.id,
      componentCode: component.code,
      componentName: component.name,
      componentType: component.type,
      calculationMethod: component.calculationMethod,
      quantity: this.quantity(Number(assignment.quantity)),
      rate: this.quantity(Number(assignment.installmentAmount ?? assignment.amount ?? component.defaultAmount ?? 0)),
      amount: this.amount(amount),
      accountId: component.expenseAccountId,
      liabilityAccountId: component.liabilityAccountId,
    };
  }

  private ruleToPayslipLine(rule: any, index: number, totals: ReturnType<PayrollService["calculateTotals"]>): Prisma.PayslipLineUncheckedCreateWithoutPayslipInput {
    const component = rule.payrollComponent;
    const amount = this.resolvePayrollAmount(
      rule.calculationMethod,
      {
        amount: Number(rule.amount || component.defaultAmount || 0),
        percentage: Number(rule.percentage || component.defaultPercentage || 0),
        quantity: 1,
        formula: rule.formula || component.formula,
      },
      totals,
    );
    return {
      lineNumber: index + 1,
      payrollComponentId: component.id,
      componentCode: component.code,
      componentName: rule.name || component.name,
      componentType: component.type,
      calculationMethod: rule.calculationMethod,
      quantity: this.quantity(1),
      rate: this.quantity(Number(rule.amount || component.defaultAmount || 0)),
      amount: this.amount(amount),
      accountId: component.expenseAccountId,
      liabilityAccountId: component.liabilityAccountId,
      description: `${rule.ruleType} rule ${rule.code}`,
    };
  }

  private manualPayslipLine(line: PayslipLineInputDto, index: number): Prisma.PayslipLineUncheckedCreateWithoutPayslipInput {
    return {
      lineNumber: index + 1,
      payrollComponentId: line.payrollComponentId || null,
      componentCode: line.componentCode.trim(),
      componentName: line.componentName.trim(),
      componentType: line.componentType,
      calculationMethod: line.calculationMethod,
      quantity: this.quantity(line.quantity ?? 1),
      rate: this.quantity(line.rate ?? 0),
      amount: this.amount(line.amount),
      accountId: line.accountId || null,
      liabilityAccountId: line.liabilityAccountId || null,
      description: this.nullable(line.description),
    };
  }

  private resolveComponentAmount(component: any, assignment: any) {
    return this.resolvePayrollAmount(component.calculationMethod, {
      amount: Number(assignment.installmentAmount ?? assignment.amount ?? component.defaultAmount ?? 0),
      percentage: Number(assignment.percentage || component.defaultPercentage || 0),
      quantity: Number(assignment.quantity || 1),
      formula: component.formula,
    });
  }

  private resolvePayrollAmount(
    method: PayrollCalculationMethod,
    input: { amount: number; percentage: number; quantity: number; formula?: string | null },
    totals: Partial<ReturnType<PayrollService["calculateTotals"]>> = {},
  ) {
    const context = {
      amount: input.amount,
      base: input.amount,
      percentage: input.percentage,
      quantity: input.quantity,
      grossPay: totals.grossPay ?? 0,
      totalEarnings: totals.grossPay ?? 0,
      deductions: totals.totalDeductions ?? 0,
      totalDeductions: totals.totalDeductions ?? 0,
      employerContributions: totals.employerContributions ?? 0,
      netPay: totals.netPay ?? 0,
    };
    if (method === PayrollCalculationMethod.PERCENTAGE) return input.amount * (input.percentage / 100);
    if (method === PayrollCalculationMethod.QUANTITY) return input.amount * input.quantity;
    if (method === PayrollCalculationMethod.FORMULA) return this.evaluateFormula(input.formula, context);
    return input.amount;
  }

  private evaluateFormula(formula: string | null | undefined, context: Record<string, number>) {
    if (!formula?.trim()) return 0;
    const tokens = formula.match(/[A-Za-z_][A-Za-z0-9_]*|\d+(?:\.\d+)?|[()+\-*/]/g);
    if (!tokens || tokens.join("") !== formula.replace(/\s+/g, "")) throw new BadRequestException(`Unsupported payroll formula: ${formula}`);
    let position = 0;
    const parseExpression = (): number => {
      let value = parseTerm();
      while (tokens[position] === "+" || tokens[position] === "-") {
        const op = tokens[position++];
        const right = parseTerm();
        value = op === "+" ? value + right : value - right;
      }
      return value;
    };
    const parseTerm = (): number => {
      let value = parseFactor();
      while (tokens[position] === "*" || tokens[position] === "/") {
        const op = tokens[position++];
        const right = parseFactor();
        if (op === "/" && right === 0) throw new BadRequestException("Payroll formula cannot divide by zero.");
        value = op === "*" ? value * right : value / right;
      }
      return value;
    };
    const parseFactor = (): number => {
      const token = tokens[position++];
      if (!token) throw new BadRequestException(`Invalid payroll formula: ${formula}`);
      if (token === "(") {
        const value = parseExpression();
        if (tokens[position++] !== ")") throw new BadRequestException(`Invalid payroll formula: ${formula}`);
        return value;
      }
      if (token === "-") return -parseFactor();
      if (/^\d/.test(token)) return Number(token);
      if (Object.prototype.hasOwnProperty.call(context, token)) return Number(context[token] ?? 0);
      throw new BadRequestException(`Unknown payroll formula variable: ${token}`);
    };
    const value = parseExpression();
    if (position !== tokens.length) throw new BadRequestException(`Invalid payroll formula: ${formula}`);
    return value;
  }

  private calculateTotals(lines: Array<{ componentType: PayrollComponentType; amount?: Prisma.Decimal | string | number | Prisma.DecimalJsLike }>) {
    let grossPay = 0;
    let totalDeductions = 0;
    let employerContributions = 0;
    for (const line of lines) {
      const amount = Number(line.amount);
      if (line.componentType === PayrollComponentType.EARNING || line.componentType === PayrollComponentType.BENEFIT) grossPay += amount;
      if (line.componentType === PayrollComponentType.DEDUCTION) totalDeductions += amount;
      if (line.componentType === PayrollComponentType.EMPLOYER_CONTRIBUTION) employerContributions += amount;
    }
    return { grossPay, totalDeductions, employerContributions, netPay: grossPay - totalDeductions };
  }

  private assignmentApplies(assignment: any, startDate: Date, endDate: Date) {
    if (!assignment.payrollComponent.isActive) return false;
    if (assignment.effectiveFrom && assignment.effectiveFrom > endDate) return false;
    if (assignment.effectiveTo && assignment.effectiveTo < startDate) return false;
    if (assignment.outstandingBalance !== null && Number(assignment.outstandingBalance) <= 0) return false;
    return true;
  }

  private async ensureNoPeriodOverlap(startDate: Date, endDate: Date, payrollGroup?: string, exceptId?: string) {
    const existing = await this.prisma.payrollPeriod.findFirst({
      where: {
        id: exceptId ? { not: exceptId } : undefined,
        payrollGroup: payrollGroup?.trim() || null,
        status: { notIn: [PayrollPeriodStatus.CLOSED, PayrollPeriodStatus.REVERSED] },
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
    });
    if (existing) throw new BadRequestException("Payroll periods cannot overlap within the same payroll group.");
  }

  private validateDateRange(startDate: Date, endDate: Date, paymentDate: Date) {
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || Number.isNaN(paymentDate.getTime())) throw new BadRequestException("Payroll period dates are invalid.");
    if (startDate > endDate) throw new BadRequestException("Payroll period start date must be on or before the end date.");
  }

  private async validateComponentAccounts(dto: { expenseAccountId?: string; liabilityAccountId?: string }) {
    if (dto.expenseAccountId) await this.validatePostingAccount(dto.expenseAccountId, ["EXPENSE"], "Payroll expense account");
    if (dto.liabilityAccountId) await this.validatePostingAccount(dto.liabilityAccountId, ["LIABILITY"], "Payroll liability account");
  }

  private async validatePostingAccount(id: string, allowedTypes: Array<"ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE">, label: string) {
    const account = await this.prisma.account.findUnique({ where: { id }, select: this.accountSelect });
    if (!account) throw new BadRequestException(`${label} was not found.`);
    if (!account.isActive || !account.isPosting) throw new BadRequestException(`${label} must be active and posting.`);
    if (!allowedTypes.includes(account.type)) throw new BadRequestException(`${label} must use one of these account types: ${allowedTypes.join(", ")}.`);
  }

  private async validateBankCashAccount(id: string) {
    const row = await this.prisma.bankCashAccount.findUnique({ where: { id }, include: { account: true } });
    if (!row || !row.isActive || !row.account.isActive || !row.account.isPosting) throw new BadRequestException("Payroll payments require an active bank/cash account.");
  }

  private ensurePeriodDraft(status: PayrollPeriodStatus) {
    if (status !== PayrollPeriodStatus.DRAFT) throw new BadRequestException("Only draft payroll periods can be edited or posted.");
  }

  private async getEmployeeOrThrow(id: string) {
    const row = await this.prisma.employee.findUnique({ where: { id }, include: this.employeeInclude() });
    if (!row) throw new BadRequestException(`Employee ${id} was not found.`);
    return row;
  }

  private async getComponentOrThrow(id: string) {
    const row = await this.prisma.payrollComponent.findUnique({ where: { id }, include: this.componentInclude() });
    if (!row) throw new BadRequestException(`Payroll component ${id} was not found.`);
    return row;
  }

  private async getActiveComponentOrThrow(id: string) {
    const row = await this.getComponentOrThrow(id);
    if (!row.isActive) throw new BadRequestException("Inactive payroll components cannot be assigned.");
    return row;
  }

  private async getPeriodOrThrow(id: string) {
    const row = await this.prisma.payrollPeriod.findUnique({ where: { id }, include: this.periodInclude() });
    if (!row) throw new BadRequestException(`Payroll period ${id} was not found.`);
    return row;
  }

  private async getPayslipOrThrow(id: string) {
    const row = await this.prisma.payslip.findUnique({ where: { id }, include: this.payslipInclude() });
    if (!row) throw new BadRequestException(`Payslip ${id} was not found.`);
    return row;
  }

  private async getPaymentOrThrow(id: string) {
    const row = await this.prisma.payrollPayment.findUnique({ where: { id }, include: this.paymentInclude() });
    if (!row) throw new BadRequestException(`Payroll payment ${id} was not found.`);
    return row;
  }

  private async getGroupOrThrow(id: string) {
    const row = await this.prisma.payrollGroup.findUnique({ where: { id }, include: this.groupInclude() });
    if (!row) throw new BadRequestException(`Payroll group ${id} was not found.`);
    return row;
  }

  private async getRuleOrThrow(id: string) {
    const row = await this.prisma.payrollRule.findUnique({ where: { id }, include: this.ruleInclude() });
    if (!row) throw new BadRequestException(`Payroll rule ${id} was not found.`);
    return row;
  }

  private groupInclude() {
    return {
      componentAssignments: { include: { payrollComponent: true }, orderBy: { createdAt: "asc" as const } },
      _count: { select: { employees: true, periods: true, rules: true } },
    };
  }

  private ruleInclude() {
    return {
      payrollComponent: { include: this.componentInclude() },
      payrollGroup: true,
    };
  }

  private employeeInclude() {
    return {
      payrollGroupRecord: true,
      componentAssignments: { include: { payrollComponent: true }, orderBy: { createdAt: "asc" as const } },
    };
  }

  private componentInclude() {
    return { expenseAccount: { select: this.accountSelect }, liabilityAccount: { select: this.accountSelect } };
  }

  private periodInclude() {
    return {
      payrollGroupRecord: true,
      payrollPayableAccount: { select: this.accountSelect },
      journalEntry: { select: { id: true, reference: true } },
      payslips: { include: this.payslipInclude(), orderBy: { createdAt: "asc" as const } },
    };
  }

  private payslipInclude() {
    return {
      employee: true,
      payrollPeriod: { select: { id: true, reference: true, name: true, status: true, startDate: true, endDate: true, paymentDate: true } },
      lines: { orderBy: { lineNumber: "asc" as const } },
      paymentAllocations: true,
    };
  }

  private paymentInclude() {
    return {
      payrollPeriod: { include: { payrollPayableAccount: { select: this.accountSelect } } },
      employee: true,
      bankCashAccount: { include: { account: { select: this.accountSelect } } },
      bankCashTransaction: { select: { id: true, reference: true, status: true, postedAt: true } },
      allocations: { include: { payslip: { include: { employee: true } } }, orderBy: { createdAt: "asc" as const } },
    };
  }

  private mapGroup(row: any) {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      isActive: row.isActive,
      employeesCount: row._count?.employees ?? 0,
      periodsCount: row._count?.periods ?? 0,
      rulesCount: row._count?.rules ?? 0,
      components: row.componentAssignments?.map((assignment: any) => this.mapAssignment(assignment)) ?? [],
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private mapRule(row: any) {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      ruleType: row.ruleType,
      payrollComponentId: row.payrollComponentId,
      payrollComponent: row.payrollComponent ? this.mapComponent(row.payrollComponent) : null,
      payrollGroupId: row.payrollGroupId,
      payrollGroup: row.payrollGroup,
      calculationMethod: row.calculationMethod,
      amount: row.amount.toString(),
      percentage: row.percentage.toString(),
      formula: row.formula,
      isActive: row.isActive,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private mapEmployee(row: any) {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      department: row.department,
      position: row.position,
      joiningDate: row.joiningDate.toISOString(),
      paymentMethod: row.paymentMethod,
      status: row.status,
      defaultSalaryStructure: row.defaultSalaryStructure,
      bankAccountNumber: row.bankAccountNumber,
      payrollGroup: row.payrollGroup,
      payrollGroupId: row.payrollGroupId,
      payrollGroupRecord: row.payrollGroupRecord,
      currentBalance: row.currentBalance.toString(),
      components: row.componentAssignments?.map((assignment: any) => this.mapAssignment(assignment)) ?? [],
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private mapAssignment(row: any) {
    return {
      id: row.id,
      payrollComponentId: row.payrollComponentId,
      payrollComponent: row.payrollComponent ? this.mapComponent(row.payrollComponent) : null,
      amount: row.amount.toString(),
      percentage: row.percentage.toString(),
      quantity: row.quantity.toString(),
      installmentAmount: row.installmentAmount?.toString() ?? null,
      isRecurring: row.isRecurring,
      effectiveFrom: row.effectiveFrom?.toISOString() ?? null,
      effectiveTo: row.effectiveTo?.toISOString() ?? null,
      outstandingBalance: row.outstandingBalance?.toString() ?? null,
    };
  }

  private mapComponent(row: any) {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      nameAr: row.nameAr,
      type: row.type,
      calculationMethod: row.calculationMethod,
      defaultAmount: row.defaultAmount.toString(),
      defaultPercentage: row.defaultPercentage.toString(),
      formula: row.formula,
      taxable: row.taxable,
      isActive: row.isActive,
      expenseAccount: row.expenseAccount ?? null,
      liabilityAccount: row.liabilityAccount ?? null,
      createdAt: row.createdAt?.toISOString(),
      updatedAt: row.updatedAt?.toISOString(),
    };
  }

  private mapPeriod(row: any) {
    return {
      id: row.id,
      reference: row.reference,
      name: row.name,
      payrollGroup: row.payrollGroup,
      payrollGroupId: row.payrollGroupId,
      payrollGroupRecord: row.payrollGroupRecord,
      cycle: row.cycle,
      startDate: row.startDate.toISOString(),
      endDate: row.endDate.toISOString(),
      paymentDate: row.paymentDate.toISOString(),
      status: row.status,
      payrollPayableAccount: row.payrollPayableAccount,
      journalEntryId: row.journalEntryId,
      journalReference: row.journalEntry?.reference ?? null,
      grossPay: this.format(this.sum(row.payslips?.map((p: any) => Number(p.grossPay)) ?? [])),
      totalDeductions: this.format(this.sum(row.payslips?.map((p: any) => Number(p.totalDeductions)) ?? [])),
      employerContributions: this.format(this.sum(row.payslips?.map((p: any) => Number(p.employerContributions)) ?? [])),
      netPay: this.format(this.sum(row.payslips?.map((p: any) => Number(p.netPay)) ?? [])),
      payslipCount: row.payslips?.length ?? 0,
      payslips: row.payslips?.map((payslip: any) => this.mapPayslip(payslip)) ?? [],
      postedAt: row.postedAt?.toISOString() ?? null,
      closedAt: row.closedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private mapPayslip(row: any) {
    return {
      id: row.id,
      reference: row.reference,
      status: row.status,
      payrollPeriod: row.payrollPeriod,
      employee: row.employee ? this.mapEmployee({ ...row.employee, componentAssignments: [] }) : null,
      grossPay: row.grossPay.toString(),
      totalDeductions: row.totalDeductions.toString(),
      employerContributions: row.employerContributions.toString(),
      netPay: row.netPay.toString(),
      paidAmount: row.paidAmount.toString(),
      outstandingAmount: row.outstandingAmount.toString(),
      notes: row.notes,
      lines: row.lines?.map((line: any) => ({
        id: line.id,
        lineNumber: line.lineNumber,
        payrollComponentId: line.payrollComponentId,
        componentCode: line.componentCode,
        componentName: line.componentName,
        componentType: line.componentType,
        calculationMethod: line.calculationMethod,
        quantity: line.quantity.toString(),
        rate: line.rate.toString(),
        amount: line.amount.toString(),
        accountId: line.accountId,
        liabilityAccountId: line.liabilityAccountId,
        description: line.description,
      })) ?? [],
      postedAt: row.postedAt?.toISOString() ?? null,
      paidAt: row.paidAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private mapPayment(row: any) {
    return {
      id: row.id,
      reference: row.reference,
      status: row.status,
      paymentDate: row.paymentDate.toISOString(),
      payrollPeriod: { id: row.payrollPeriod.id, reference: row.payrollPeriod.reference, name: row.payrollPeriod.name, status: row.payrollPeriod.status },
      employee: row.employee ? this.mapEmployee({ ...row.employee, componentAssignments: [] }) : null,
      bankCashAccount: row.bankCashAccount,
      amount: row.amount.toString(),
      allocatedAmount: row.allocatedAmount.toString(),
      unappliedAmount: row.unappliedAmount.toString(),
      description: row.description,
      bankCashTransaction: row.bankCashTransaction,
      allocations: row.allocations?.map((allocation: any) => ({
        id: allocation.id,
        payslipId: allocation.payslipId,
        payslipReference: allocation.payslip?.reference,
        employeeName: allocation.payslip?.employee?.name,
        amount: allocation.amount.toString(),
        allocatedAt: allocation.allocatedAt.toISOString(),
      })) ?? [],
      postedAt: row.postedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
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

  private quantity(value: number | string | Prisma.Decimal) {
    return new Prisma.Decimal(value).toDecimalPlaces(4);
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
