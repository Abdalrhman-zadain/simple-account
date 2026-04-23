import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";

import { JwtAuthGuard } from "../../platform/auth/guards/jwt-auth.guard";
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
import { FixedAssetsService } from "./fixed-assets.service";

@UseGuards(JwtAuthGuard)
@Controller("fixed-assets")
export class FixedAssetsController {
  constructor(private readonly service: FixedAssetsService) {}

  @Get("categories")
  listCategories(@Query("isActive") isActive?: string, @Query("search") search?: string) {
    return this.service.listCategories({ isActive, search });
  }

  @Post("categories")
  createCategory(@Body() dto: CreateFixedAssetCategoryDto) {
    return this.service.createCategory(dto);
  }

  @Patch("categories/:id")
  updateCategory(@Param("id") id: string, @Body() dto: UpdateFixedAssetCategoryDto) {
    return this.service.updateCategory(id, dto);
  }

  @Post("categories/:id/deactivate")
  deactivateCategory(@Param("id") id: string) {
    return this.service.deactivateCategory(id);
  }

  @Get("assets")
  listAssets(
    @Query("status") status?: string,
    @Query("categoryId") categoryId?: string,
    @Query("search") search?: string,
  ) {
    return this.service.listAssets({ status, categoryId, search });
  }

  @Get("assets/:id")
  getAsset(@Param("id") id: string) {
    return this.service.getAsset(id);
  }

  @Post("assets")
  createAsset(@Body() dto: CreateFixedAssetDto) {
    return this.service.createAsset(dto);
  }

  @Patch("assets/:id")
  updateAsset(@Param("id") id: string, @Body() dto: UpdateFixedAssetDto) {
    return this.service.updateAsset(id, dto);
  }

  @Post("assets/:id/deactivate")
  deactivateAsset(@Param("id") id: string) {
    return this.service.deactivateAsset(id);
  }

  @Get("acquisitions")
  listAcquisitions(@Query("status") status?: string, @Query("assetId") assetId?: string, @Query("search") search?: string) {
    return this.service.listAcquisitions({ status, assetId, search });
  }

  @Post("acquisitions")
  createAcquisition(@Body() dto: CreateFixedAssetAcquisitionDto) {
    return this.service.createAcquisition(dto);
  }

  @Post("acquisitions/:id/post")
  postAcquisition(@Param("id") id: string) {
    return this.service.postAcquisition(id);
  }

  @Post("acquisitions/:id/reverse")
  reverseAcquisition(@Param("id") id: string) {
    return this.service.reverseAcquisition(id);
  }

  @Get("depreciation-runs")
  listDepreciationRuns(@Query("status") status?: string, @Query("assetId") assetId?: string, @Query("categoryId") categoryId?: string) {
    return this.service.listDepreciationRuns({ status, assetId, categoryId });
  }

  @Post("depreciation-runs")
  createDepreciationRun(@Body() dto: CreateFixedAssetDepreciationRunDto) {
    return this.service.createDepreciationRun(dto);
  }

  @Post("depreciation-runs/:id/post")
  postDepreciationRun(@Param("id") id: string) {
    return this.service.postDepreciationRun(id);
  }

  @Post("depreciation-runs/:id/reverse")
  reverseDepreciationRun(@Param("id") id: string) {
    return this.service.reverseDepreciationRun(id);
  }

  @Get("disposals")
  listDisposals(@Query("status") status?: string, @Query("assetId") assetId?: string, @Query("search") search?: string) {
    return this.service.listDisposals({ status, assetId, search });
  }

  @Post("disposals")
  createDisposal(@Body() dto: CreateFixedAssetDisposalDto) {
    return this.service.createDisposal(dto);
  }

  @Post("disposals/:id/post")
  postDisposal(@Param("id") id: string) {
    return this.service.postDisposal(id);
  }

  @Post("disposals/:id/reverse")
  reverseDisposal(@Param("id") id: string) {
    return this.service.reverseDisposal(id);
  }

  @Get("transfers")
  listTransfers(@Query("status") status?: string, @Query("assetId") assetId?: string, @Query("search") search?: string) {
    return this.service.listTransfers({ status, assetId, search });
  }

  @Post("transfers")
  createTransfer(@Body() dto: CreateFixedAssetTransferDto) {
    return this.service.createTransfer(dto);
  }

  @Post("transfers/:id/post")
  postTransfer(@Param("id") id: string) {
    return this.service.postTransfer(id);
  }

  @Post("transfers/:id/reverse")
  reverseTransfer(@Param("id") id: string) {
    return this.service.reverseTransfer(id);
  }

  @Get("reports/summary")
  getSummary() {
    return this.service.getSummary();
  }
}
