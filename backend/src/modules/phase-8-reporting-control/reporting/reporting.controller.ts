import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";

import { JwtAuthGuard } from "../../platform/auth/guards/jwt-auth.guard";
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
import { ReportingService } from "./reporting.service";

@UseGuards(JwtAuthGuard)
@Controller("reporting")
export class ReportingController {
  constructor(private readonly service: ReportingService) {}

  @Get("summary")
  getSummary(@Req() req: Request & { user?: any }, @Query() query: ReportingQueryDto) {
    return this.service.getSummary(query, req.user);
  }

  @Get("trial-balance")
  getTrialBalance(@Req() req: Request & { user?: any }, @Query() query: ReportingQueryDto) {
    return this.service.getTrialBalance(query, req.user);
  }

  @Get("balance-sheet")
  getBalanceSheet(@Req() req: Request & { user?: any }, @Query() query: ReportingQueryDto) {
    return this.service.getBalanceSheet(query, req.user);
  }

  @Get("profit-loss")
  getProfitLoss(@Req() req: Request & { user?: any }, @Query() query: ReportingQueryDto) {
    return this.service.getProfitLoss(query, req.user);
  }

  @Get("cash-movement")
  getCashMovement(@Req() req: Request & { user?: any }, @Query() query: ReportingQueryDto) {
    return this.service.getCashMovement(query, req.user);
  }

  @Get("general-ledger")
  getGeneralLedger(@Req() req: Request & { user?: any }, @Query() query: ReportingGeneralLedgerQueryDto) {
    return this.service.getGeneralLedger(query, req.user);
  }

  @Get("audit")
  getAudit(@Req() req: Request & { user?: any }, @Query() query: ReportingAuditQueryDto) {
    return this.service.getAudit(query, req.user);
  }

  @Get("catalog")
  getCatalog(@Req() req: Request & { user?: any }) {
    return this.service.getCatalog(req.user);
  }

  @Get("warnings")
  getWarnings(@Req() req: Request & { user?: any }) {
    return this.service.getWarnings(req.user);
  }

  @Get("definitions")
  getDefinitions(@Req() req: Request & { user?: any }) {
    return this.service.listDefinitions(req.user);
  }

  @Post("definitions")
  createDefinition(@Req() req: Request & { user?: any }, @Body() dto: CreateReportDefinitionDto) {
    return this.service.createDefinition(dto, req.user);
  }

  @Patch("definitions/:id")
  updateDefinition(@Req() req: Request & { user?: any }, @Param("id") id: string, @Body() dto: UpdateReportDefinitionDto) {
    return this.service.updateDefinition(id, dto, req.user);
  }

  @Post("definitions/:id/deactivate")
  deactivateDefinition(@Req() req: Request & { user?: any }, @Param("id") id: string) {
    return this.service.deactivateDefinition(id, req.user);
  }

  @Get("snapshots")
  getSnapshots(@Req() req: Request & { user?: any }) {
    return this.service.listSnapshots(req.user);
  }

  @Post("snapshots")
  createSnapshot(@Req() req: Request & { user?: any }, @Body() dto: CreateReportSnapshotDto) {
    return this.service.createSnapshot(dto, req.user);
  }

  @Post("snapshots/:id/lock")
  lockSnapshot(@Req() req: Request & { user?: any }, @Param("id") id: string) {
    return this.service.lockSnapshot(id, req.user);
  }

  @Post("snapshots/:id/unlock")
  unlockSnapshot(@Req() req: Request & { user?: any }, @Param("id") id: string) {
    return this.service.unlockSnapshot(id, req.user);
  }

  @Post("snapshots/:id/version")
  createSnapshotVersion(@Req() req: Request & { user?: any }, @Param("id") id: string, @Body() dto: CreateReportSnapshotVersionDto) {
    return this.service.createSnapshotVersion(id, dto, req.user);
  }

  @Get("activity")
  getActivity(@Req() req: Request & { user?: any }, @Query("limit") limit?: string) {
    return this.service.getActivity(req.user, limit ? parseInt(limit, 10) : undefined);
  }

  @Post("export")
  exportReport(@Req() req: Request & { user?: any }, @Body() dto: ExportReportDto) {
    return this.service.exportReport(dto, req.user);
  }
}
