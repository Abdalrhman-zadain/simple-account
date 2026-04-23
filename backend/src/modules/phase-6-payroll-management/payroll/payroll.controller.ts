import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";

import { JwtAuthGuard } from "../../platform/auth/guards/jwt-auth.guard";
import {
  AssignEmployeeComponentDto,
  AssignGroupComponentDto,
  AdjustPayslipDto,
  CreateEmployeeDto,
  CreatePayrollGroupDto,
  CreatePayrollComponentDto,
  CreatePayrollPaymentDto,
  CreatePayrollPeriodDto,
  CreatePayrollRuleDto,
  GeneratePayslipsDto,
  UpdateEmployeeDto,
  UpdatePayrollGroupDto,
  UpdatePayrollComponentDto,
  UpdatePayrollPaymentDto,
  UpdatePayrollPeriodDto,
  UpdatePayrollRuleDto,
  UpdatePayslipDto,
} from "./dto/payroll.dto";
import { PayrollService } from "./payroll.service";

@UseGuards(JwtAuthGuard)
@Controller("payroll")
export class PayrollController {
  constructor(private readonly service: PayrollService) {}

  @Get("groups")
  listGroups(@Query("isActive") isActive?: string, @Query("search") search?: string) {
    return this.service.listGroups({ isActive, search });
  }

  @Post("groups")
  createGroup(@Body() dto: CreatePayrollGroupDto) {
    return this.service.createGroup(dto);
  }

  @Patch("groups/:id")
  updateGroup(@Param("id") id: string, @Body() dto: UpdatePayrollGroupDto) {
    return this.service.updateGroup(id, dto);
  }

  @Post("groups/:id/deactivate")
  deactivateGroup(@Param("id") id: string) {
    return this.service.deactivateGroup(id);
  }

  @Post("groups/:id/components")
  assignGroupComponent(@Param("id") id: string, @Body() dto: AssignGroupComponentDto) {
    return this.service.assignGroupComponent(id, dto);
  }

  @Get("employees")
  listEmployees(
    @Query("status") status?: string,
    @Query("department") department?: string,
    @Query("payrollGroup") payrollGroup?: string,
    @Query("search") search?: string,
  ) {
    return this.service.listEmployees({ status, department, payrollGroup, search });
  }

  @Get("employees/:id")
  getEmployee(@Param("id") id: string) {
    return this.service.getEmployee(id);
  }

  @Post("employees")
  createEmployee(@Body() dto: CreateEmployeeDto) {
    return this.service.createEmployee(dto);
  }

  @Patch("employees/:id")
  updateEmployee(@Param("id") id: string, @Body() dto: UpdateEmployeeDto) {
    return this.service.updateEmployee(id, dto);
  }

  @Post("employees/:id/deactivate")
  deactivateEmployee(@Param("id") id: string) {
    return this.service.deactivateEmployee(id);
  }

  @Post("employees/:id/components")
  assignEmployeeComponent(
    @Param("id") id: string,
    @Body() dto: AssignEmployeeComponentDto,
  ) {
    return this.service.assignEmployeeComponent(id, dto);
  }

  @Get("components")
  listComponents(
    @Query("type") type?: string,
    @Query("isActive") isActive?: string,
    @Query("search") search?: string,
  ) {
    return this.service.listComponents({ type, isActive, search });
  }

  @Post("components")
  createComponent(@Body() dto: CreatePayrollComponentDto) {
    return this.service.createComponent(dto);
  }

  @Patch("components/:id")
  updateComponent(
    @Param("id") id: string,
    @Body() dto: UpdatePayrollComponentDto,
  ) {
    return this.service.updateComponent(id, dto);
  }

  @Post("components/:id/deactivate")
  deactivateComponent(@Param("id") id: string) {
    return this.service.deactivateComponent(id);
  }

  @Get("rules")
  listRules(
    @Query("ruleType") ruleType?: string,
    @Query("payrollGroupId") payrollGroupId?: string,
    @Query("isActive") isActive?: string,
    @Query("search") search?: string,
  ) {
    return this.service.listRules({ ruleType, payrollGroupId, isActive, search });
  }

  @Post("rules")
  createRule(@Body() dto: CreatePayrollRuleDto) {
    return this.service.createRule(dto);
  }

  @Patch("rules/:id")
  updateRule(@Param("id") id: string, @Body() dto: UpdatePayrollRuleDto) {
    return this.service.updateRule(id, dto);
  }

  @Post("rules/:id/deactivate")
  deactivateRule(@Param("id") id: string) {
    return this.service.deactivateRule(id);
  }

  @Get("periods")
  listPeriods(
    @Query("status") status?: string,
    @Query("payrollGroup") payrollGroup?: string,
    @Query("dateFrom") dateFrom?: string,
    @Query("dateTo") dateTo?: string,
    @Query("search") search?: string,
  ) {
    return this.service.listPeriods({
      status,
      payrollGroup,
      dateFrom,
      dateTo,
      search,
    });
  }

  @Get("periods/:id")
  getPeriod(@Param("id") id: string) {
    return this.service.getPeriod(id);
  }

  @Post("periods")
  createPeriod(@Body() dto: CreatePayrollPeriodDto) {
    return this.service.createPeriod(dto);
  }

  @Patch("periods/:id")
  updatePeriod(@Param("id") id: string, @Body() dto: UpdatePayrollPeriodDto) {
    return this.service.updatePeriod(id, dto);
  }

  @Post("periods/:id/generate-payslips")
  generatePayslips(@Param("id") id: string, @Body() dto: GeneratePayslipsDto) {
    return this.service.generatePayslips(id, dto);
  }

  @Post("periods/:id/post")
  postPeriod(@Param("id") id: string) {
    return this.service.postPeriod(id);
  }

  @Post("periods/:id/close")
  closePeriod(@Param("id") id: string) {
    return this.service.closePeriod(id);
  }

  @Post("periods/:id/reverse")
  reversePeriod(@Param("id") id: string) {
    return this.service.reversePeriod(id);
  }

  @Get("payslips")
  listPayslips(
    @Query("status") status?: string,
    @Query("employeeId") employeeId?: string,
    @Query("payrollPeriodId") payrollPeriodId?: string,
    @Query("department") department?: string,
    @Query("dateFrom") dateFrom?: string,
    @Query("dateTo") dateTo?: string,
    @Query("search") search?: string,
  ) {
    return this.service.listPayslips({
      status,
      employeeId,
      payrollPeriodId,
      department,
      dateFrom,
      dateTo,
      search,
    });
  }

  @Get("payslips/:id")
  getPayslip(@Param("id") id: string) {
    return this.service.getPayslip(id);
  }

  @Patch("payslips/:id")
  updatePayslip(@Param("id") id: string, @Body() dto: UpdatePayslipDto) {
    return this.service.updatePayslip(id, dto);
  }

  @Post("payslips/:id/adjust")
  adjustPayslip(@Param("id") id: string, @Body() dto: AdjustPayslipDto) {
    return this.service.adjustPayslip(id, dto);
  }

  @Get("payments")
  listPayments(
    @Query("status") status?: string,
    @Query("employeeId") employeeId?: string,
    @Query("payrollPeriodId") payrollPeriodId?: string,
    @Query("search") search?: string,
  ) {
    return this.service.listPayments({ status, employeeId, payrollPeriodId, search });
  }

  @Post("payments")
  createPayment(@Body() dto: CreatePayrollPaymentDto) {
    return this.service.createPayment(dto);
  }

  @Patch("payments/:id")
  updatePayment(@Param("id") id: string, @Body() dto: UpdatePayrollPaymentDto) {
    return this.service.updatePayment(id, dto);
  }

  @Post("payments/:id/post")
  postPayment(@Param("id") id: string) {
    return this.service.postPayment(id);
  }

  @Post("payments/:id/cancel")
  cancelPayment(@Param("id") id: string) {
    return this.service.cancelPayment(id);
  }

  @Post("payments/:id/reverse")
  reversePayment(@Param("id") id: string) {
    return this.service.reversePayment(id);
  }

  @Get("reports/summary")
  getSummary(
    @Query("payrollPeriodId") payrollPeriodId?: string,
    @Query("employeeId") employeeId?: string,
    @Query("department") department?: string,
  ) {
    return this.service.getSummary({ payrollPeriodId, employeeId, department });
  }
}
