"use client";

import { useEffect, useMemo, useState } from "react";

import {
  adjustPayslip,
  assignPayrollEmployeeComponent,
  assignPayrollGroupComponent,
  cancelPayrollPayment,
  createPayrollComponent,
  createPayrollEmployee,
  createPayrollGroup,
  createPayrollPeriod,
  createPayrollPayment,
  createPayrollRule,
  generatePayrollPayslips,
  getAccountOptions,
  getBankCashAccounts,
  getPayrollComponents,
  getPayrollEmployees,
  getPayrollGroups,
  getPayrollPayments,
  getPayrollPeriods,
  getPayrollRules,
  getPayrollSummary,
  getPayslips,
  postPayrollPayment,
  postPayrollPeriod,
  reversePayrollPayment,
  reversePayrollPeriod,
} from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import type {
  AccountOption,
  BankCashAccount,
  PayrollComponent,
  PayrollEmployee,
  PayrollGroup,
  PayrollPayment,
  PayrollPeriod,
  PayrollRule,
  PayrollSummary,
  Payslip,
} from "@/types/api";
import { Button, Card, PageShell, SectionHeading, SidePanel, StatusPill } from "@/components/ui";
import { useTranslation } from "@/lib/i18n";

type Tab = "groups" | "rules" | "employees" | "components" | "periods" | "payslips" | "payments" | "summary";

const tabs: Array<{ id: Tab; labelKey: string }> = [
  { id: "groups", labelKey: "payroll.tab.groups" },
  { id: "rules", labelKey: "payroll.tab.rules" },
  { id: "employees", labelKey: "payroll.tab.employees" },
  { id: "components", labelKey: "payroll.tab.components" },
  { id: "periods", labelKey: "payroll.tab.periods" },
  { id: "payslips", labelKey: "payroll.tab.payslips" },
  { id: "payments", labelKey: "payroll.tab.payments" },
  { id: "summary", labelKey: "payroll.tab.summary" },
];

export function PayrollPage() {
  const { token } = useAuth();
  const { t, language } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>("employees");
  const [groups, setGroups] = useState<PayrollGroup[]>([]);
  const [rules, setRules] = useState<PayrollRule[]>([]);
  const [employees, setEmployees] = useState<PayrollEmployee[]>([]);
  const [components, setComponents] = useState<PayrollComponent[]>([]);
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [payments, setPayments] = useState<PayrollPayment[]>([]);
  const [summary, setSummary] = useState<PayrollSummary | null>(null);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [bankCashAccounts, setBankCashAccounts] = useState<BankCashAccount[]>([]);
  const [paymentAllocations, setPaymentAllocations] = useState<Array<{ payslipId: string; amount: string }>>([{ payslipId: "", amount: "" }]);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function refresh() {
    if (!token) return;
    setIsLoading(true);
    try {
      const [groupRows, ruleRows, employeeRows, componentRows, periodRows, payslipRows, paymentRows, summaryRow, accountRows, bankRows] =
        await Promise.all([
          getPayrollGroups({}, token),
          getPayrollRules({}, token),
          getPayrollEmployees({}, token),
          getPayrollComponents({}, token),
          getPayrollPeriods({}, token),
          getPayslips({}, token),
          getPayrollPayments({}, token),
          getPayrollSummary({}, token),
          getAccountOptions({ isPosting: "true", isActive: "true" }, token),
          getBankCashAccounts({ isActive: "true" }, token),
        ]);
      setGroups(groupRows);
      setRules(ruleRows);
      setEmployees(employeeRows);
      setComponents(componentRows);
      setPeriods(periodRows);
      setPayslips(payslipRows);
      setPayments(paymentRows);
      setSummary(summaryRow);
      setAccounts(accountRows);
      setBankCashAccounts(bankRows);
    } catch (error) {
      const detail = error instanceof Error ? error.message : t("payroll.error.loadFallback");
      setMessage(t("payroll.error.load", { detail }));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, [token]);

  const activePeriod = useMemo(() => periods.find((period) => period.status === "DRAFT") ?? periods[0], [periods]);

  async function submitForm(form: HTMLFormElement, action: (data: FormData) => Promise<void>) {
    setMessage(null);
    try {
      await action(new FormData(form));
      form.reset();
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("payroll.error.actionFailed"));
    }
  }

  const allocationTotal = paymentAllocations.reduce((total, row) => total + (Number(row.amount) || 0), 0);

  return (
    <PageShell>
      <SectionHeading
        title={t("payroll.title")}
        description={t("payroll.description")}
      />

      {message ? <Card className="mb-6 border border-orange-200 bg-orange-50 p-4 text-sm text-orange-800">{message}</Card> : null}

      <Card className="mb-6 flex flex-wrap gap-3 p-3">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            type="button"
            variant={activeTab === tab.id ? "primary" : "secondary"}
            onClick={() => setActiveTab(tab.id)}
          >
            {t(tab.labelKey)}
          </Button>
        ))}
      </Card>

      {isLoading ? <Card className="p-5 text-sm text-gray-600">{t("payroll.loading")}</Card> : null}

      {activeTab === "groups" ? (
        <WorkspaceGrid
          buttonLabel={t("payroll.action.createGroup")}
          title={t("payroll.group.title")}
          form={
            <div className="grid gap-6">
              <form
                className="grid gap-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  void submitForm(event.currentTarget, async (data) => {
                    await createPayrollGroup({ code: value(data, "code"), name: required(data, "name"), description: value(data, "description") }, token);
                  });
                }}
              >
                <h2 className="text-lg font-bold">{t("payroll.group.title")}</h2>
                <Input name="code" placeholder={t("payroll.field.code")} />
                <Input name="name" placeholder={t("payroll.field.name")} required />
                <Input name="description" placeholder={t("payroll.field.description")} />
                <Button type="submit">{t("payroll.action.createGroup")}</Button>
              </form>
              <form
                className="grid gap-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  void submitForm(event.currentTarget, async (data) => {
                  await assignPayrollGroupComponent(required(data, "groupId"), {
                      payrollComponentId: required(data, "payrollComponentId"),
                      amount: numberValue(data, "amount"),
                      percentage: numberValue(data, "percentage"),
                      quantity: numberValue(data, "quantity"),
                      installmentAmount: numberValue(data, "installmentAmount"),
                    }, token);
                  });
                }}
              >
                <h2 className="text-lg font-bold">{t("payroll.assignComponent.title")}</h2>
                <OptionSelect name="groupId" label={t("payroll.placeholder.group")} options={groups.map((group) => ({ value: group.id, label: `${group.code} - ${group.name}` }))} required />
                <OptionSelect name="payrollComponentId" label={t("payroll.placeholder.component")} options={componentOptions(components, language)} required />
                <Input name="amount" placeholder={t("payroll.field.amount")} type="number" step="0.01" />
                <Input name="percentage" placeholder={t("payroll.field.percentage")} type="number" step="0.01" />
                <Input name="quantity" placeholder={t("payroll.field.quantity")} type="number" step="0.0001" />
                <Input name="installmentAmount" placeholder={t("payroll.field.installmentAmount")} type="number" step="0.01" />
                <Button type="submit">{t("payroll.action.assign")}</Button>
              </form>
            </div>
          }
        >
          <DataTable
            columns={[t("payroll.column.code"), t("payroll.column.name"), t("payroll.column.employees"), t("payroll.column.rules"), t("payroll.column.components"), t("payroll.column.active")]}
            rows={groups.map((group) => [
              group.code,
              group.name,
              String(group.employeesCount),
              String(group.rulesCount),
              group.components.map((item) => localizedComponentName(item.payrollComponent, language)).filter(Boolean).join(", ") || "-",
              group.isActive ? t("payroll.boolean.yes") : t("payroll.boolean.no"),
            ])}
          />
        </WorkspaceGrid>
      ) : null}

      {activeTab === "rules" ? (
        <WorkspaceGrid
          buttonLabel={t("payroll.action.createRule")}
          title={t("payroll.rule.title")}
          form={
            <form
              className="grid gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                void submitForm(event.currentTarget, async (data) => {
                  await createPayrollRule({
                    code: value(data, "code"),
                    name: required(data, "name"),
                    ruleType: required(data, "ruleType") as PayrollRule["ruleType"],
                    payrollComponentId: required(data, "payrollComponentId"),
                    payrollGroupId: value(data, "payrollGroupId"),
                    calculationMethod: required(data, "calculationMethod") as PayrollRule["calculationMethod"],
                    amount: numberValue(data, "amount"),
                    percentage: numberValue(data, "percentage"),
                    formula: value(data, "formula"),
                  }, token);
                });
              }}
            >
              <h2 className="text-lg font-bold">{t("payroll.rule.title")}</h2>
              <Input name="code" placeholder={t("payroll.field.code")} />
              <Input name="name" placeholder={t("payroll.field.name")} required />
              <Select name="ruleType" options={["TAX", "INSURANCE", "LOAN", "STATUTORY_DEDUCTION", "OTHER"]} getLabel={(option) => t(`payroll.ruleType.${option}`)} />
              <OptionSelect name="payrollComponentId" label={t("payroll.placeholder.component")} options={componentOptions(components, language)} required />
              <OptionSelect name="payrollGroupId" label={t("payroll.placeholder.allGroups")} options={groups.map((group) => ({ value: group.id, label: `${group.code} - ${group.name}` }))} />
              <Select name="calculationMethod" options={["FIXED_AMOUNT", "PERCENTAGE", "QUANTITY", "FORMULA"]} getLabel={(option) => t(`payroll.calculationMethod.${option}`)} />
              <Input name="amount" placeholder={t("payroll.field.amountBase")} type="number" step="0.01" />
              <Input name="percentage" placeholder={t("payroll.field.percentage")} type="number" step="0.01" />
              <Input name="formula" placeholder={t("payroll.field.formulaGross")} />
              <Button type="submit">{t("payroll.action.createRule")}</Button>
            </form>
          }
        >
          <DataTable
            columns={[t("payroll.column.code"), t("payroll.column.name"), t("payroll.column.type"), t("payroll.column.group"), t("payroll.column.component"), t("payroll.column.method"), t("payroll.column.formula"), t("payroll.column.active")]}
            rows={rules.map((rule) => [
              rule.code,
              rule.name,
              t(`payroll.ruleType.${rule.ruleType}`),
              rule.payrollGroup?.name ?? t("payroll.value.all"),
              localizedComponentName(rule.payrollComponent, language) || "-",
              t(`payroll.calculationMethod.${rule.calculationMethod}`),
              rule.formula ?? "-",
              rule.isActive ? t("payroll.boolean.yes") : t("payroll.boolean.no"),
            ])}
          />
        </WorkspaceGrid>
      ) : null}

      {activeTab === "employees" ? (
        <WorkspaceGrid
          buttonLabel={t("payroll.action.createEmployee")}
          title={t("payroll.employee.title")}
          form={
            <div className="grid gap-6">
            <form
              className="grid gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                void submitForm(event.currentTarget, async (data) => {
                  await createPayrollEmployee(
                    {
                      code: value(data, "code"),
                      name: required(data, "name"),
                      department: value(data, "department"),
                      position: value(data, "position"),
                      joiningDate: required(data, "joiningDate"),
                      paymentMethod: (value(data, "paymentMethod") || "BANK") as "BANK",
                      payrollGroup: value(data, "payrollGroup"),
                      payrollGroupId: value(data, "payrollGroupId"),
                    },
                    token,
                  );
                });
              }}
            >
              <h2 className="text-lg font-bold">{t("payroll.employee.title")}</h2>
              <Input name="code" placeholder={t("payroll.field.code")} />
              <Input name="name" placeholder={t("payroll.field.name")} required />
              <Input name="department" placeholder={t("payroll.field.department")} />
              <Input name="position" placeholder={t("payroll.field.position")} />
              <Input name="joiningDate" type="date" required />
              <Select name="paymentMethod" options={["BANK", "CASH", "OTHER"]} getLabel={(option) => t(`payroll.paymentMethod.${option}`)} />
              <OptionSelect name="payrollGroupId" label={t("payroll.placeholder.payrollGroup")} options={groups.map((group) => ({ value: group.id, label: `${group.code} - ${group.name}` }))} />
              <Button type="submit">{t("payroll.action.createEmployee")}</Button>
            </form>
            <form
              className="grid gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                void submitForm(event.currentTarget, async (data) => {
                  await assignPayrollEmployeeComponent(required(data, "employeeId"), {
                    payrollComponentId: required(data, "payrollComponentId"),
                    amount: numberValue(data, "amount"),
                    percentage: numberValue(data, "percentage"),
                    quantity: numberValue(data, "quantity"),
                    installmentAmount: numberValue(data, "installmentAmount"),
                    outstandingBalance: numberValue(data, "outstandingBalance"),
                  }, token);
                });
              }}
            >
              <h2 className="text-lg font-bold">{t("payroll.employeeComponent.title")}</h2>
              <OptionSelect name="employeeId" label={t("payroll.placeholder.employee")} options={employees.map((employee) => ({ value: employee.id, label: `${employee.code} - ${employee.name}` }))} required />
              <OptionSelect name="payrollComponentId" label={t("payroll.placeholder.component")} options={componentOptions(components, language)} required />
              <Input name="amount" placeholder={t("payroll.field.amount")} type="number" step="0.01" />
              <Input name="percentage" placeholder={t("payroll.field.percentage")} type="number" step="0.01" />
              <Input name="quantity" placeholder={t("payroll.field.quantity")} type="number" step="0.0001" />
              <Input name="installmentAmount" placeholder={t("payroll.field.installmentAmount")} type="number" step="0.01" />
              <Input name="outstandingBalance" placeholder={t("payroll.field.loanBalance")} type="number" step="0.01" />
              <Button type="submit">{t("payroll.action.assign")}</Button>
            </form>
            </div>
          }
        >
          <DataTable
            columns={[t("payroll.column.code"), t("payroll.column.name"), t("payroll.column.department"), t("payroll.column.group"), t("payroll.column.balance"), t("payroll.column.status")]}
            rows={employees.map((employee) => [
              employee.code,
              employee.name,
              employee.department ?? "-",
              employee.payrollGroup ?? "-",
              employee.currentBalance,
              <StatusPill key={employee.id} label={t(`payroll.employeeStatus.${employee.status}`)} tone={employee.status === "ACTIVE" ? "positive" : "neutral"} />,
            ])}
          />
        </WorkspaceGrid>
      ) : null}

      {activeTab === "components" ? (
        <WorkspaceGrid
          buttonLabel={t("payroll.action.createComponent")}
          title={t("payroll.component.title")}
          form={
            <form
              className="grid gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                void submitForm(event.currentTarget, async (data) => {
                  await createPayrollComponent(
                    {
                      code: value(data, "code"),
                      name: required(data, "name"),
                      type: required(data, "type") as PayrollComponent["type"],
                      calculationMethod: required(data, "calculationMethod") as PayrollComponent["calculationMethod"],
                      defaultAmount: numberValue(data, "defaultAmount"),
                      defaultPercentage: numberValue(data, "defaultPercentage"),
                      formula: value(data, "formula"),
                      taxable: value(data, "taxable") === "on",
                      expenseAccountId: value(data, "expenseAccountId"),
                      liabilityAccountId: value(data, "liabilityAccountId"),
                    },
                    token,
                  );
                });
              }}
            >
              <h2 className="text-lg font-bold">{t("payroll.component.title")}</h2>
              <Input name="code" placeholder={t("payroll.field.code")} />
              <Input name="name" placeholder={t("payroll.field.name")} required />
              <Select name="type" options={["EARNING", "DEDUCTION", "EMPLOYER_CONTRIBUTION", "BENEFIT"]} getLabel={(option) => t(`payroll.componentType.${option}`)} />
              <Select name="calculationMethod" options={["FIXED_AMOUNT", "PERCENTAGE", "QUANTITY", "FORMULA"]} getLabel={(option) => t(`payroll.calculationMethod.${option}`)} />
              <Input name="defaultAmount" placeholder={t("payroll.field.defaultAmount")} type="number" step="0.01" />
              <Input name="defaultPercentage" placeholder={t("payroll.field.defaultPercentage")} type="number" step="0.01" />
              <Input name="formula" placeholder={t("payroll.field.formulaAmount")} />
              <AccountSelect name="expenseAccountId" accounts={accounts} label={t("payroll.placeholder.expenseAccount")} />
              <AccountSelect name="liabilityAccountId" accounts={accounts} label={t("payroll.placeholder.liabilityAccount")} />
              <label className="flex items-center gap-2 text-sm"><input name="taxable" type="checkbox" /> {t("payroll.field.taxable")}</label>
              <Button type="submit">{t("payroll.action.createComponent")}</Button>
            </form>
          }
        >
          <DataTable
            columns={[t("payroll.column.code"), t("payroll.column.name"), t("payroll.column.type"), t("payroll.column.method"), t("payroll.column.amount"), t("payroll.column.active")]}
            rows={components.map((component) => [
              component.code,
              localizedComponentName(component, language),
              t(`payroll.componentType.${component.type}`),
              t(`payroll.calculationMethod.${component.calculationMethod}`),
              component.defaultAmount,
              component.isActive ? t("payroll.boolean.yes") : t("payroll.boolean.no"),
            ])}
          />
        </WorkspaceGrid>
      ) : null}

      {activeTab === "periods" ? (
        <WorkspaceGrid
          buttonLabel={t("payroll.action.createPeriod")}
          title={t("payroll.period.title")}
          form={
            <form
              className="grid gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                void submitForm(event.currentTarget, async (data) => {
                  await createPayrollPeriod(
                    {
                      name: required(data, "name"),
                      payrollGroupId: value(data, "payrollGroupId"),
                      cycle: value(data, "cycle") || "MONTHLY",
                      startDate: required(data, "startDate"),
                      endDate: required(data, "endDate"),
                      paymentDate: required(data, "paymentDate"),
                      payrollPayableAccountId: required(data, "payrollPayableAccountId"),
                    },
                    token,
                  );
                });
              }}
            >
              <h2 className="text-lg font-bold">{t("payroll.period.title")}</h2>
              <Input name="name" placeholder={t("payroll.field.name")} required />
              <OptionSelect name="payrollGroupId" label={t("payroll.placeholder.payrollGroup")} options={groups.map((group) => ({ value: group.id, label: `${group.code} - ${group.name}` }))} />
              <Input name="cycle" placeholder={t("payroll.field.cycle")} defaultValue="MONTHLY" />
              <Input name="startDate" type="date" required />
              <Input name="endDate" type="date" required />
              <Input name="paymentDate" type="date" required />
              <AccountSelect name="payrollPayableAccountId" accounts={accounts} label={t("payroll.placeholder.payableAccount")} required />
              <Button type="submit">{t("payroll.action.createPeriod")}</Button>
            </form>
          }
        >
          <div className="mb-4 flex gap-2">
            <Button disabled={!activePeriod || activePeriod.status !== "DRAFT"} onClick={() => activePeriod && void submitAction(() => generatePayrollPayslips(activePeriod.id, undefined, token), refresh, setMessage, t)}>{t("payroll.action.generatePayslips")}</Button>
            <Button disabled={!activePeriod || activePeriod.status !== "DRAFT"} onClick={() => activePeriod && void submitAction(() => postPayrollPeriod(activePeriod.id, token), refresh, setMessage, t)}>{t("payroll.action.postPeriod")}</Button>
            <Button disabled={!activePeriod || (activePeriod.status !== "POSTED" && activePeriod.status !== "CLOSED")} onClick={() => activePeriod && void submitAction(() => reversePayrollPeriod(activePeriod.id, token), refresh, setMessage, t)}>{t("payroll.action.reversePeriod")}</Button>
          </div>
          <DataTable
            columns={[t("payroll.column.reference"), t("payroll.column.name"), t("payroll.column.dates"), t("payroll.column.payslips"), t("payroll.column.net"), t("payroll.column.status")]}
            rows={periods.map((period) => [
              period.reference,
              period.name,
              `${formatDate(period.startDate)} - ${formatDate(period.endDate)}`,
              String(period.payslipCount),
              period.netPay,
              <StatusPill key={period.id} label={t(`payroll.periodStatus.${period.status}`)} tone={period.status === "POSTED" ? "positive" : period.status === "DRAFT" ? "warning" : "neutral"} />,
            ])}
          />
        </WorkspaceGrid>
      ) : null}

      {activeTab === "payslips" ? (
        <WorkspaceGrid
          buttonLabel={t("payroll.action.postAdjustment")}
          title={t("payroll.payslipAdjustment.title")}
          form={
            <form
              className="grid gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                void submitForm(event.currentTarget, async (data) => {
                  const component = components.find((row) => row.id === required(data, "payrollComponentId"));
                  if (!component) throw new Error(t("payroll.error.componentRequired"));
                  await adjustPayslip(required(data, "payslipId"), {
                    description: value(data, "description"),
                    lines: [{
                      payrollComponentId: component.id,
                      componentCode: component.code,
                      componentName: component.name,
                      componentType: component.type,
                      calculationMethod: component.calculationMethod,
                      quantity: numberValue(data, "quantity") ?? 1,
                      rate: numberValue(data, "rate"),
                      amount: Number(required(data, "amount")),
                      accountId: component.expenseAccount?.id,
                      liabilityAccountId: component.liabilityAccount?.id,
                      description: value(data, "lineDescription"),
                    }],
                  }, token);
                });
              }}
            >
              <h2 className="text-lg font-bold">{t("payroll.payslipAdjustment.title")}</h2>
              <OptionSelect name="payslipId" label={t("payroll.placeholder.payslip")} options={payslips.filter((payslip) => ["POSTED", "PARTIALLY_PAID", "PAID"].includes(payslip.status)).map((payslip) => ({ value: payslip.id, label: `${payslip.reference} - ${payslip.employee?.name ?? ""}` }))} required />
              <OptionSelect name="payrollComponentId" label={t("payroll.placeholder.component")} options={componentOptions(components, language)} required />
              <Input name="amount" placeholder={t("payroll.field.adjustmentAmount")} type="number" step="0.01" required />
              <Input name="quantity" placeholder={t("payroll.field.quantity")} type="number" step="0.0001" />
              <Input name="rate" placeholder={t("payroll.field.rate")} type="number" step="0.01" />
              <Input name="description" placeholder={t("payroll.field.description")} />
              <Button type="submit">{t("payroll.action.postAdjustment")}</Button>
            </form>
          }
        >
          <DataTable
            columns={[t("payroll.column.reference"), t("payroll.column.employee"), t("payroll.column.period"), t("payroll.column.gross"), t("payroll.column.deductions"), t("payroll.column.net"), t("payroll.column.outstanding"), t("payroll.column.status")]}
            rows={payslips.map((payslip) => [
              payslip.reference,
              payslip.employee?.name ?? "-",
              payslip.payrollPeriod?.reference ?? "-",
              payslip.grossPay,
              payslip.totalDeductions,
              payslip.netPay,
              payslip.outstandingAmount,
              t(`payroll.payslipStatus.${payslip.status}`),
            ])}
          />
        </WorkspaceGrid>
      ) : null}

      {activeTab === "payments" ? (
        <WorkspaceGrid
          buttonLabel={t("payroll.action.createPayment")}
          title={t("payroll.payment.title")}
          form={
            <form
              className="grid gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                void submitForm(event.currentTarget, async (data) => {
                  const allocations = paymentAllocations
                    .filter((row) => row.payslipId && Number(row.amount) > 0)
                    .map((row) => ({ payslipId: row.payslipId, amount: Number(row.amount) }));
                  if (!allocations.length) throw new Error(t("payroll.error.allocationRequired"));
                  await createPayrollPayment({
                    paymentDate: required(data, "paymentDate"),
                    payrollPeriodId: required(data, "payrollPeriodId"),
                    employeeId: value(data, "employeeId"),
                    bankCashAccountId: required(data, "bankCashAccountId"),
                    amount: allocations.reduce((total, row) => total + row.amount, 0),
                    description: value(data, "description"),
                    allocations,
                  }, token);
                  setPaymentAllocations([{ payslipId: "", amount: "" }]);
                });
              }}
            >
              <h2 className="text-lg font-bold">{t("payroll.payment.title")}</h2>
              <Input name="paymentDate" type="date" required />
              <OptionSelect name="payrollPeriodId" label={t("payroll.placeholder.payrollPeriod")} options={periods.filter((period) => period.status === "POSTED" || period.status === "CLOSED").map((period) => ({ value: period.id, label: `${period.reference} - ${period.name}` }))} required />
              <OptionSelect name="employeeId" label={t("payroll.placeholder.batchPayment")} options={employees.map((employee) => ({ value: employee.id, label: `${employee.code} - ${employee.name}` }))} />
              <OptionSelect name="bankCashAccountId" label={t("payroll.placeholder.bankCashAccount")} options={bankCashAccounts.map((row) => ({ value: row.id, label: `${row.name} (${row.type})` }))} required />
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-700">{t("payroll.allocations.title")}</p>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setPaymentAllocations((rows) => [...rows, { payslipId: "", amount: "" }])}
                  >
                    {t("payroll.action.addRow")}
                  </Button>
                </div>
                {paymentAllocations.map((row, index) => (
                  <div key={`${index}-${row.payslipId}`} className="grid gap-2 md:grid-cols-[1fr_120px_auto]">
                    <OptionSelect
                      label={t("payroll.placeholder.payslip")}
                      options={payslips.filter((payslip) => Number(payslip.outstandingAmount) > 0).map((payslip) => ({ value: payslip.id, label: `${payslip.reference} - ${payslip.employee?.name ?? ""} (${payslip.outstandingAmount})` }))}
                      value={row.payslipId}
                      onChange={(event) => setPaymentAllocations((rows) => rows.map((item, currentIndex) => currentIndex === index ? { ...item, payslipId: event.target.value } : item))}
                    />
                    <Input
                      placeholder={t("payroll.field.amount")}
                      type="number"
                      step="0.01"
                      value={row.amount}
                      onChange={(event) => setPaymentAllocations((rows) => rows.map((item, currentIndex) => currentIndex === index ? { ...item, amount: event.target.value } : item))}
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setPaymentAllocations((rows) => rows.length > 1 ? rows.filter((_, currentIndex) => currentIndex !== index) : [{ payslipId: "", amount: "" }])}
                    >
                      {t("payroll.action.remove")}
                    </Button>
                  </div>
                ))}
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                {t("payroll.allocations.total", { amount: allocationTotal.toFixed(2) })}
              </div>
              <Input name="description" placeholder={t("payroll.field.description")} />
              <Button type="submit">{t("payroll.action.createPayment")}</Button>
            </form>
          }
        >
          <DataTable
            columns={[t("payroll.column.reference"), t("payroll.column.period"), t("payroll.column.employee"), t("payroll.column.amount"), t("payroll.column.allocated"), t("payroll.column.status"), t("payroll.column.action")]}
            rows={payments.map((payment) => [
              payment.reference,
              payment.payrollPeriod.reference,
              payment.employee?.name ?? t("payroll.value.batch"),
              payment.amount,
              payment.allocatedAmount,
              t(`payroll.paymentStatus.${payment.status}`),
              payment.status === "DRAFT" ? (
                <div key={payment.id} className="flex gap-2">
                  <Button size="sm" onClick={() => void submitAction(() => postPayrollPayment(payment.id, token), refresh, setMessage, t)}>{t("payroll.action.post")}</Button>
                  <Button size="sm" onClick={() => void submitAction(() => cancelPayrollPayment(payment.id, token), refresh, setMessage, t)}>{t("payroll.action.cancel")}</Button>
                </div>
              ) : payment.status === "POSTED" ? (
                <Button key={payment.id} size="sm" onClick={() => void submitAction(() => reversePayrollPayment(payment.id, token), refresh, setMessage, t)}>{t("payroll.action.reverse")}</Button>
              ) : "-",
            ])}
          />
        </WorkspaceGrid>
      ) : null}

      {activeTab === "summary" && summary ? (
        <div className="grid gap-6">
          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
            {[
              [t("payroll.metric.gross"), summary.grossPay],
              [t("payroll.metric.deductions"), summary.totalDeductions],
              [t("payroll.metric.employer"), summary.employerContributions],
              [t("payroll.metric.net"), summary.netPay],
              [t("payroll.metric.paid"), summary.paidAmount],
              [t("payroll.metric.outstanding"), summary.outstandingAmount],
            ].map(([label, amount]) => <Metric key={label} label={label} amount={amount} />)}
          </div>
          <Card>
            <DataTable columns={[t("payroll.column.component"), t("payroll.column.type"), t("payroll.column.amount")]} rows={summary.componentTotals.map((row) => [row.name, t(`payroll.componentType.${row.type}`), row.amount])} />
          </Card>
        </div>
      ) : null}
    </PageShell>
  );
}

function WorkspaceGrid({
  buttonLabel,
  children,
  form,
  title,
}: {
  buttonLabel: string;
  children: React.ReactNode;
  form: React.ReactNode;
  title: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button type="button" onClick={() => setIsOpen(true)}>
          {buttonLabel}
        </Button>
      </div>
      <Card className="overflow-x-auto p-5">{children}</Card>
      <SidePanel isOpen={isOpen} onClose={() => setIsOpen(false)} title={title}>
        {form}
      </SidePanel>
    </div>
  );
}

function DataTable({ columns, rows }: { columns: string[]; rows: React.ReactNode[][] }) {
  return (
    <table className="w-full min-w-[760px] text-left text-sm">
      <thead><tr className="border-b text-xs uppercase text-gray-500">{columns.map((column) => <th key={column} className="px-3 py-2">{column}</th>)}</tr></thead>
      <tbody>{rows.map((row, index) => <tr key={index} className="border-b last:border-0">{row.map((cell, cellIndex) => <td key={cellIndex} className="px-3 py-3 align-middle">{cell}</td>)}</tr>)}</tbody>
    </table>
  );
}

const controlClassName =
  "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none transition-all placeholder:text-gray-500 focus:border-teal-500 focus:bg-gray-50 focus:ring-4 focus:ring-teal-500/10";

function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={[controlClassName, className].filter(Boolean).join(" ")} />;
}

function Select({ options, getLabel, className, ...props }: { options: string[]; getLabel?: (option: string) => string } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={[controlClassName, "[&>option]:bg-white", className].filter(Boolean).join(" ")}>{options.map((option) => <option key={option} value={option}>{getLabel ? getLabel(option) : option}</option>)}</select>;
}

function OptionSelect({ options, label, className, ...props }: { options: Array<{ value: string; label: string }>; label: string } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={[controlClassName, "[&>option]:bg-white", className].filter(Boolean).join(" ")}>
      <option value="">{label}</option>
      {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  );
}

function AccountSelect({ accounts, label, required, name }: { accounts: AccountOption[]; label: string; required?: boolean; name: string }) {
  return <select name={name} required={required} className={`${controlClassName} [&>option]:bg-white`}><option value="">{label}</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.code} - {account.name}</option>)}</select>;
}

function localizedComponentName(component: PayrollComponent | null | undefined, language: string) {
  if (!component) return "";
  return language === "ar" && component.nameAr ? component.nameAr : component.name;
}

function componentOptions(components: PayrollComponent[], language: string) {
  return components.map((component) => ({
    value: component.id,
    label: `${component.code} - ${localizedComponentName(component, language)}`,
  }));
}

function Metric({ label, amount }: { label: string; amount: string }) {
  return <Card className="p-5"><p className="text-xs uppercase text-gray-500">{label}</p><p className="mt-2 text-2xl font-black text-gray-900">{amount}</p></Card>;
}

function value(data: FormData, key: string) {
  return String(data.get(key) ?? "").trim() || undefined;
}

function required(data: FormData, key: string) {
  const next = value(data, key);
  if (!next) throw new Error(`${key} is required.`);
  return next;
}

function numberValue(data: FormData, key: string) {
  const next = value(data, key);
  return next ? Number(next) : undefined;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}

async function submitAction(
  action: () => Promise<unknown>,
  refresh: () => Promise<void>,
  setMessage: (message: string | null) => void,
  t: (key: string, vars?: Record<string, string | number>) => string,
) {
  setMessage(null);
  try {
    await action();
    await refresh();
  } catch (error) {
    setMessage(error instanceof Error ? error.message : t("payroll.error.actionFailed"));
  }
}
