import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  Injectable,
} from "@nestjs/common";
import { InventoryItemType, Prisma } from "../../../../generated/prisma";

import { PrismaService } from "../../../../common/prisma/prisma.service";
import { ItemCategoriesService } from "../item-categories/item-categories.service";
import { ItemGroupsService } from "../item-groups/item-groups.service";
import { UnitsOfMeasureService } from "../units-of-measure/units-of-measure.service";
import { CreateInventoryItemDto, InventoryItemUnitConversionDto } from "./dto/create-inventory-item.dto";
import { UpdateInventoryItemDto } from "./dto/update-inventory-item.dto";

type InventoryItemListQuery = {
  isActive?: string;
  search?: string;
  type?: string;
  itemGroupId?: string;
  itemCategoryId?: string;
  page?: string;
  limit?: string;
};

type InventoryItemWithAccounts = Prisma.InventoryItemGetPayload<{
  include: {
    inventoryAccount: { select: ItemMasterService["accountSelect"] };
    expenseAccount: { select: ItemMasterService["accountSelect"] };
    cogsAccount: { select: ItemMasterService["accountSelect"] };
    salesAccount: { select: ItemMasterService["accountSelect"] };
    salesReturnAccount: { select: ItemMasterService["accountSelect"] };
    adjustmentAccount: { select: ItemMasterService["accountSelect"] };
    defaultTax: { select: ItemMasterService["taxSelect"] };
    preferredWarehouse: { select: ItemMasterService["warehouseSelect"] };
    itemGroup: { select: ItemMasterService["itemGroupSelect"] };
    itemCategory: { select: ItemMasterService["itemCategorySelect"] };
    unitOfMeasureRef: { select: ItemMasterService["unitOfMeasureSelect"] };
    unitConversions: {
      include: {
        unit: { select: ItemMasterService["unitOfMeasureSelect"] };
      };
    };
  };
}>;

type InventoryItemCodeDb = Pick<Prisma.TransactionClient, "inventoryItem" | "$queryRaw" | "$executeRaw">;

const ITEM_CODE_PREFIX = "ITM";
const ITEM_CODE_DIGITS = 6;
const ITEM_CREATE_MAX_ATTEMPTS = 5;

@Injectable()
export class ItemMasterService {
  readonly accountSelect = {
    id: true,
    code: true,
    name: true,
    type: true,
    currencyCode: true,
    isActive: true,
    isPosting: true,
  } as const;

  readonly warehouseSelect = {
    id: true,
    code: true,
    name: true,
    isActive: true,
    isTransit: true,
  } as const;

  readonly itemGroupSelect = {
    id: true,
    code: true,
    name: true,
    isActive: true,
  } as const;

  readonly itemCategorySelect = {
    id: true,
    code: true,
    name: true,
    itemGroupId: true,
    isActive: true,
  } as const;

  readonly unitOfMeasureSelect = {
    id: true,
    code: true,
    name: true,
    decimalPrecision: true,
    isActive: true,
  } as const;

  readonly taxSelect = {
    id: true,
    taxCode: true,
    taxName: true,
    rate: true,
    taxType: true,
    isActive: true,
  } as const;

  readonly itemInclude = {
    inventoryAccount: { select: this.accountSelect },
    expenseAccount: { select: this.accountSelect },
    cogsAccount: { select: this.accountSelect },
    salesAccount: { select: this.accountSelect },
    salesReturnAccount: { select: this.accountSelect },
    adjustmentAccount: { select: this.accountSelect },
    defaultTax: { select: this.taxSelect },
    preferredWarehouse: { select: this.warehouseSelect },
    itemGroup: { select: this.itemGroupSelect },
    itemCategory: { select: this.itemCategorySelect },
    unitOfMeasureRef: { select: this.unitOfMeasureSelect },
    unitConversions: {
      include: {
        unit: { select: this.unitOfMeasureSelect },
      },
    },
  } as const;

  constructor(
    private readonly prisma: PrismaService,
    private readonly itemGroupsService: ItemGroupsService,
    private readonly itemCategoriesService: ItemCategoriesService,
    private readonly unitsOfMeasureService: UnitsOfMeasureService,
  ) {}

  async list(query: InventoryItemListQuery = {}) {
    const page = this.parsePaginationNumber(query.page, {
      fallback: 1,
      min: 1,
      max: 10_000,
      label: "Page",
    });
    const limit = this.parsePaginationNumber(query.limit, {
      fallback: 20,
      min: 1,
      max: 100,
      label: "Limit",
    });
    const skip = (page - 1) * limit;
    const search = query.search?.trim();
    const where: Prisma.InventoryItemWhereInput = {
      isActive:
        query.isActive === undefined || query.isActive === ""
          ? undefined
          : query.isActive === "true",
      type: this.parseType(query.type),
      itemGroupId: query.itemGroupId || undefined,
      itemCategoryId: query.itemCategoryId || undefined,
      OR: search
        ? [
            { code: { contains: search, mode: "insensitive" } },
            { name: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
            { barcode: { contains: search, mode: "insensitive" } },
            { qrCodeValue: { contains: search, mode: "insensitive" } },
            { unitOfMeasure: { contains: search, mode: "insensitive" } },
            { category: { contains: search, mode: "insensitive" } },
            { itemGroup: { code: { contains: search, mode: "insensitive" } } },
            { itemGroup: { name: { contains: search, mode: "insensitive" } } },
            { itemCategory: { code: { contains: search, mode: "insensitive" } } },
            { itemCategory: { name: { contains: search, mode: "insensitive" } } },
            {
              preferredWarehouseCode: { contains: search, mode: "insensitive" },
            },
            {
              preferredWarehouse: {
                code: { contains: search, mode: "insensitive" },
              },
            },
            {
              preferredWarehouse: {
                name: { contains: search, mode: "insensitive" },
              },
            },
          ]
        : undefined,
    };

    const [total, rows] = await Promise.all([
      this.prisma.inventoryItem.count({ where }),
      this.prisma.inventoryItem.findMany({
        where,
        include: this.itemInclude,
        orderBy: [{ isActive: "desc" }, { name: "asc" }],
        skip,
        take: limit,
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return {
      data: rows.map((row: InventoryItemWithAccounts) => this.mapItem(row)),
      page,
      limit,
      total,
      totalPages,
    };
  }

  async getById(id: string) {
    const item = await this.getItemWithAccountsOrThrow(id);
    return this.mapItem(item);
  }

  async generateBarcode() {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const barcode = this.buildBarcodeCandidate();
      const existing = await this.prisma.inventoryItem.findUnique({
        where: { barcode },
        select: { id: true },
      });

      if (!existing) {
        return { barcode };
      }
    }

    throw new InternalServerErrorException(
      "Could not generate a unique barcode.",
    );
  }

  async create(dto: CreateInventoryItemDto) {
    for (let attempt = 0; attempt < ITEM_CREATE_MAX_ATTEMPTS; attempt += 1) {
      try {
        const created = await this.prisma.$transaction(async (tx) => {
          const code = await this.allocateNextItemCode(tx);
          const barcode = this.normalizeOptionalText(dto.barcode);
          const qrCodeValue = this.normalizeOptionalText(dto.qrCodeValue);
          const trackInventory = this.resolveTrackInventory(dto.type, dto.trackInventory);
          const [
            inventoryAccountId,
            expenseAccountId,
            cogsAccountId,
            salesAccountId,
            salesReturnAccountId,
            adjustmentAccountId,
            defaultTaxId,
            preferredWarehouse,
            itemGroup,
            itemCategory,
            unitOfMeasure,
            uniqueBarcode,
          ] = await Promise.all([
            this.validateInventoryAccount(dto.inventoryAccountId),
            this.validateExpenseAccount(dto.expenseAccountId),
            this.validateCogsAccount(dto.cogsAccountId),
            this.validateSalesAccount(dto.salesAccountId),
            this.validateSalesReturnAccount(dto.salesReturnAccountId),
            this.validateAdjustmentAccount(dto.adjustmentAccountId),
            this.validateTax(dto.taxable ? dto.defaultTaxId : undefined),
            this.validateWarehouse(dto.preferredWarehouseId),
            this.itemGroupsService.ensureActiveGroup(dto.itemGroupId),
            this.itemCategoriesService.ensureActiveCategoryInGroup(dto.itemCategoryId, dto.itemGroupId),
            this.unitsOfMeasureService.ensureActiveUnit(dto.unitOfMeasureId),
            this.ensureUniqueBarcode(barcode),
          ]);
          const unitConversions = await this.validateUnitConversions(
            dto.unitConversions,
            unitOfMeasure.id,
            uniqueBarcode,
          );

          return tx.inventoryItem.create({
            data: {
              code,
              name: dto.name.trim(),
              description: dto.description?.trim() || null,
              internalNotes: dto.internalNotes?.trim() || null,
              itemImageUrl: dto.itemImageUrl?.trim() || null,
              attachmentsText: dto.attachmentsText?.trim() || null,
              barcode: uniqueBarcode,
              qrCodeValue,
              unitOfMeasure: dto.unitOfMeasure?.trim() || unitOfMeasure.code,
              unitOfMeasureId: unitOfMeasure.id,
              category: dto.category?.trim() || itemCategory.name,
              itemGroupId: itemGroup.id,
              itemCategoryId: itemCategory.id,
              type: dto.type,
              inventoryAccountId,
              expenseAccountId,
              cogsAccountId,
              salesAccountId,
              salesReturnAccountId,
              adjustmentAccountId,
              defaultSalesPrice: this.parseNullableDecimal(dto.defaultSalesPrice, "Default sales price"),
              defaultPurchasePrice: this.parseNullableDecimal(dto.defaultPurchasePrice, "Default purchase price"),
              currencyCode: dto.currencyCode?.trim().toUpperCase() || null,
              taxable: dto.taxable ?? false,
              defaultTaxId: defaultTaxId ?? null,
              trackInventory,
              reorderLevel: this.parseDecimal(dto.reorderLevel, "Reorder level"),
              reorderQuantity: this.parseDecimal(
                dto.reorderQuantity,
                "Reorder quantity",
              ),
              preferredWarehouseId: preferredWarehouse?.id ?? null,
              preferredWarehouseCode: preferredWarehouse?.code ?? null,
              unitConversions: {
                create: unitConversions.map((row) => ({
                  unitId: row.unitId,
                  conversionFactorToBaseUnit: row.conversionFactorToBaseUnit,
                  barcode: row.barcode,
                  defaultSalesPrice: row.defaultSalesPrice,
                  defaultPurchasePrice: row.defaultPurchasePrice,
                  isBaseUnit: row.isBaseUnit,
                })),
              },
            },
            include: this.itemInclude,
          });
        });

        return this.mapItem(created);
      } catch (error) {
        if (this.isCodeConflict(error) && attempt < ITEM_CREATE_MAX_ATTEMPTS - 1) {
          continue;
        }
        if (this.isCodeConflict(error)) {
          throw new ConflictException("Unable to generate a unique item/service code. Please try again.");
        }
        if (this.isBarcodeConflict(error)) {
          throw new ConflictException("هذا الباركود مستخدم مسبقًا لمادة أخرى");
        }
        throw error;
      }
    }

    throw new ConflictException("Unable to generate a unique item/service code. Please try again.");
  }

  async update(id: string, dto: UpdateInventoryItemDto) {
    const current = await this.getItemOrThrow(id);
    if (!current.isActive) {
      throw new BadRequestException(
        "Deactivated inventory items cannot be edited.",
      );
    }

    const barcode =
      dto.barcode === undefined
        ? undefined
        : this.normalizeOptionalText(dto.barcode);
    const qrCodeValue =
      dto.qrCodeValue === undefined
        ? undefined
        : this.normalizeOptionalText(dto.qrCodeValue);
    const nextType = dto.type ?? current.type;
    const nextTrackInventory = this.resolveTrackInventory(
      nextType,
      dto.trackInventory ?? current.trackInventory,
    );

    const [
      inventoryAccountId,
      expenseAccountId,
      cogsAccountId,
      salesAccountId,
      salesReturnAccountId,
      adjustmentAccountId,
      defaultTaxId,
      preferredWarehouse,
      nextGroup,
      nextCategory,
      nextUnit,
      uniqueBarcode,
    ] = await Promise.all([
      dto.inventoryAccountId !== undefined
        ? this.validateInventoryAccount(dto.inventoryAccountId || undefined)
        : Promise.resolve(undefined),
      dto.expenseAccountId !== undefined
        ? this.validateExpenseAccount(dto.expenseAccountId || undefined)
        : Promise.resolve(undefined),
      dto.cogsAccountId !== undefined
        ? this.validateCogsAccount(dto.cogsAccountId || undefined)
        : Promise.resolve(undefined),
      dto.salesAccountId !== undefined
        ? this.validateSalesAccount(dto.salesAccountId || undefined)
        : Promise.resolve(undefined),
      dto.salesReturnAccountId !== undefined
        ? this.validateSalesReturnAccount(dto.salesReturnAccountId || undefined)
        : Promise.resolve(undefined),
      dto.adjustmentAccountId !== undefined
        ? this.validateAdjustmentAccount(dto.adjustmentAccountId || undefined)
        : Promise.resolve(undefined),
      dto.taxable !== undefined || dto.defaultTaxId !== undefined
        ? this.validateTax(
            (dto.taxable ?? current.taxable)
              ? dto.defaultTaxId === undefined
                ? current.defaultTaxId ?? undefined
                : dto.defaultTaxId || undefined
              : undefined,
          )
        : Promise.resolve(undefined),
      dto.preferredWarehouseId !== undefined
        ? this.validateWarehouse(dto.preferredWarehouseId || undefined)
        : Promise.resolve(undefined),
      dto.itemGroupId !== undefined
        ? this.itemGroupsService.ensureActiveGroup(dto.itemGroupId)
        : Promise.resolve(undefined),
      dto.itemCategoryId !== undefined || dto.itemGroupId !== undefined
        ? this.itemCategoriesService.ensureActiveCategoryInGroup(
            dto.itemCategoryId ?? current.itemCategoryId ?? "",
            dto.itemGroupId ?? current.itemGroupId ?? "",
          )
        : Promise.resolve(undefined),
      dto.unitOfMeasureId !== undefined
        ? this.unitsOfMeasureService.ensureActiveUnit(dto.unitOfMeasureId)
        : Promise.resolve(undefined),
      dto.barcode !== undefined
        ? this.ensureUniqueBarcode(barcode, id)
        : Promise.resolve(undefined),
    ]);
    const nextBaseUnitId = nextUnit?.id ?? current.unitOfMeasureId ?? "";
    const nextItemBarcode = dto.barcode === undefined ? current.barcode : uniqueBarcode;
    const unitConversions =
      dto.unitConversions === undefined
        ? undefined
        : await this.validateUnitConversions(dto.unitConversions, nextBaseUnitId, nextItemBarcode ?? null, id);

    const updated = await this.prisma.inventoryItem
      .update({
        where: { id },
        data: {
          name: dto.name?.trim(),
          description:
            dto.description === undefined
              ? undefined
              : dto.description.trim() || null,
          internalNotes:
            dto.internalNotes === undefined
              ? undefined
              : dto.internalNotes.trim() || null,
          itemImageUrl:
            dto.itemImageUrl === undefined
              ? undefined
              : dto.itemImageUrl.trim() || null,
          attachmentsText:
            dto.attachmentsText === undefined
              ? undefined
              : dto.attachmentsText.trim() || null,
          barcode: dto.barcode === undefined ? undefined : (uniqueBarcode ?? null),
          qrCodeValue:
            dto.qrCodeValue === undefined ? undefined : (qrCodeValue ?? null),
          unitOfMeasure: dto.unitOfMeasure?.trim() || nextUnit?.code,
          unitOfMeasureId:
            dto.unitOfMeasureId === undefined ? undefined : nextUnit?.id,
          category:
            dto.category === undefined
              ? nextCategory?.name
              : dto.category.trim() || nextCategory?.name || null,
          itemGroupId: dto.itemGroupId === undefined ? undefined : nextGroup?.id,
          itemCategoryId:
            dto.itemCategoryId === undefined ? undefined : nextCategory?.id,
          type: dto.type,
          inventoryAccountId,
          expenseAccountId,
          cogsAccountId,
          salesAccountId,
          salesReturnAccountId,
          adjustmentAccountId,
          defaultSalesPrice:
            dto.defaultSalesPrice === undefined
              ? undefined
              : this.parseNullableDecimal(dto.defaultSalesPrice, "Default sales price"),
          defaultPurchasePrice:
            dto.defaultPurchasePrice === undefined
              ? undefined
              : this.parseNullableDecimal(dto.defaultPurchasePrice, "Default purchase price"),
          currencyCode:
            dto.currencyCode === undefined
              ? undefined
              : dto.currencyCode.trim().toUpperCase() || null,
          taxable: dto.taxable,
          defaultTaxId:
            dto.taxable === undefined && dto.defaultTaxId === undefined
              ? undefined
              : (defaultTaxId ?? null),
          trackInventory: nextTrackInventory,
          reorderLevel:
            dto.reorderLevel === undefined
              ? undefined
              : this.parseDecimal(dto.reorderLevel, "Reorder level"),
          reorderQuantity:
            dto.reorderQuantity === undefined
              ? undefined
              : this.parseDecimal(dto.reorderQuantity, "Reorder quantity"),
          preferredWarehouseId:
            dto.preferredWarehouseId === undefined
              ? undefined
              : (preferredWarehouse?.id ?? null),
          preferredWarehouseCode:
            dto.preferredWarehouseId === undefined
              ? undefined
              : (preferredWarehouse?.code ?? null),
          isActive: dto.isActive,
          unitConversions:
            unitConversions === undefined
              ? undefined
              : {
                  deleteMany: {},
                  create: unitConversions.map((row) => ({
                    unitId: row.unitId,
                    conversionFactorToBaseUnit: row.conversionFactorToBaseUnit,
                    barcode: row.barcode,
                    defaultSalesPrice: row.defaultSalesPrice,
                    defaultPurchasePrice: row.defaultPurchasePrice,
                    isBaseUnit: row.isBaseUnit,
                  })),
                },
        },
        include: this.itemInclude,
      })
      .catch((error: unknown) => {
        if (this.isBarcodeConflict(error)) {
          throw new ConflictException("هذا الباركود مستخدم مسبقًا لمادة أخرى");
        }
        throw error;
      });

    return this.mapItem(updated);
  }

  async deactivate(id: string) {
    await this.getItemOrThrow(id);
    const updated = await this.prisma.inventoryItem.update({
      where: { id },
      data: { isActive: false },
      include: this.itemInclude,
    });

    return this.mapItem(updated);
  }

  async ensureActiveItem(id: string) {
    const item = await this.getItemOrThrow(id);
    if (!item.isActive) {
      throw new BadRequestException(
        "Deactivated inventory items cannot be used in new transactions.",
      );
    }
    return item;
  }

  private async getItemOrThrow(id: string) {
    const item = await this.prisma.inventoryItem.findUnique({ where: { id } });
    if (!item) {
      throw new BadRequestException(`Inventory item ${id} was not found.`);
    }
    return item;
  }

  private async getItemWithAccountsOrThrow(id: string) {
    const item = await this.prisma.inventoryItem.findUnique({
      where: { id },
      include: this.itemInclude,
    });
    if (!item) {
      throw new BadRequestException(`Inventory item ${id} was not found.`);
    }
    return item;
  }

  private async validateInventoryAccount(id?: string) {
    return this.validateAccount(id, {
      label: "Inventory account",
      allowedTypes: ["ASSET"],
    });
  }

  private async validateExpenseAccount(id?: string) {
    return this.validateAccount(id, {
      label: "Expense account",
      allowedTypes: ["EXPENSE"],
    });
  }

  private async validateCogsAccount(id?: string) {
    return this.validateAccount(id, {
      label: "Cost of goods sold account",
      allowedTypes: ["EXPENSE"],
    });
  }

  private async validateSalesAccount(id?: string) {
    return this.validateAccount(id, {
      label: "Sales account",
      allowedTypes: ["REVENUE"],
    });
  }

  private async validateSalesReturnAccount(id?: string) {
    return this.validateAccount(id, {
      label: "Sales return account",
      allowedTypes: ["REVENUE"],
    });
  }

  private async validateAdjustmentAccount(id?: string) {
    return this.validateAccount(id, {
      label: "Adjustment account",
      allowedTypes: undefined,
    });
  }

  private async validateWarehouse(id?: string) {
    if (!id) {
      return null;
    }

    const warehouse = await this.prisma.inventoryWarehouse.findUnique({
      where: { id },
      select: this.warehouseSelect,
    });

    if (!warehouse) {
      throw new BadRequestException("Preferred warehouse was not found.");
    }
    if (!warehouse.isActive) {
      throw new BadRequestException("Preferred warehouse must be active.");
    }

    return warehouse;
  }

  private async validateTax(id?: string) {
    if (!id) {
      return null;
    }

    const tax = await this.prisma.tax.findUnique({
      where: { id },
      select: this.taxSelect,
    });

    if (!tax) {
      throw new BadRequestException("Tax was not found.");
    }
    if (!tax.isActive) {
      throw new BadRequestException("Tax must be active.");
    }

    return tax.id;
  }

  private async validateAccount(
    id: string | undefined,
    options: {
      label: string;
      allowedTypes?: Array<
        "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE"
      >;
    },
  ) {
    if (!id) {
      return null;
    }

    const account = await this.prisma.account.findUnique({
      where: { id },
      select: this.accountSelect,
    });

    if (!account) {
      throw new BadRequestException(`${options.label} was not found.`);
    }
    if (!account.isActive || !account.isPosting) {
      throw new BadRequestException(
        `${options.label} must be active and posting.`,
      );
    }
    if (options.allowedTypes && !options.allowedTypes.includes(account.type)) {
      throw new BadRequestException(
        `${options.label} must be one of the following types: ${options.allowedTypes.join(", ")}.`,
      );
    }

    return account.id;
  }

  private parseType(value?: string) {
    if (!value?.trim()) {
      return undefined;
    }

    if (
      !Object.values(InventoryItemType).includes(value as InventoryItemType)
    ) {
      throw new BadRequestException(
        `Unsupported inventory item type ${value}.`,
      );
    }

    return value as InventoryItemType;
  }

  private parsePaginationNumber(
    value: string | undefined,
    options: { fallback: number; min: number; max: number; label: string },
  ) {
    if (!value?.trim()) {
      return options.fallback;
    }

    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || Number.isNaN(parsed)) {
      throw new BadRequestException(
        `${options.label} must be a valid integer.`,
      );
    }
    if (parsed < options.min || parsed > options.max) {
      throw new BadRequestException(
        `${options.label} must be between ${options.min} and ${options.max}.`,
      );
    }

    return parsed;
  }

  private parseDecimal(value: string | undefined, label: string) {
    if (!value || !value.trim()) {
      return new Prisma.Decimal(0);
    }

    try {
      return new Prisma.Decimal(value);
    } catch {
      throw new BadRequestException(`${label} is invalid.`);
    }
  }

  private parseNullableDecimal(value: string | undefined, label: string) {
    if (!value || !value.trim()) {
      return null;
    }

    try {
      return new Prisma.Decimal(value);
    } catch {
      throw new BadRequestException(`${label} is invalid.`);
    }
  }

  private resolveTrackInventory(type: InventoryItemType, requested?: boolean | null) {
    if (type === "SERVICE") {
      return false;
    }

    return requested ?? true;
  }

  private async validateUnitConversions(
    rows: InventoryItemUnitConversionDto[] | undefined,
    baseUnitId: string,
    itemBarcode?: string | null,
    excludeItemId?: string,
  ) {
    if (!baseUnitId) {
      throw new BadRequestException("Base unit of measure is required.");
    }

    const inputRows =
      rows && rows.length > 0
        ? rows
        : [{ unitId: baseUnitId, conversionFactorToBaseUnit: "1", isBaseUnit: true }];

    const normalizedRows = inputRows.map((row) => ({
      unitId: row.unitId,
      conversionFactorToBaseUnit: row.conversionFactorToBaseUnit,
      barcode: this.normalizeOptionalText(row.barcode),
      defaultSalesPrice: row.defaultSalesPrice,
      defaultPurchasePrice: row.defaultPurchasePrice,
      isBaseUnit: row.isBaseUnit ?? false,
    }));

    const seenUnits = new Set<string>();
    const seenBarcodes = new Set<string>();
    let hasBaseUnit = false;

    for (const row of normalizedRows) {
      if (!row.unitId) {
        throw new BadRequestException("Each unit conversion row must select a unit.");
      }
      if (seenUnits.has(row.unitId)) {
        throw new BadRequestException("لا يمكن تكرار نفس الوحدة أكثر من مرة لنفس المادة");
      }
      seenUnits.add(row.unitId);

      const factor = this.parseNullableDecimal(
        row.conversionFactorToBaseUnit,
        "Conversion factor to base unit",
      );
      if (!factor || factor.lte(0)) {
        throw new BadRequestException("معامل التحويل إلى الوحدة الأساسية يجب أن يكون أكبر من صفر");
      }

      if (row.barcode) {
        if (row.barcode === itemBarcode) {
          throw new BadRequestException("لا يمكن تكرار نفس الباركود بين المادة ووحداتها");
        }
        if (seenBarcodes.has(row.barcode)) {
          throw new BadRequestException("باركود الوحدة مكرر داخل نفس بطاقة المادة");
        }
        seenBarcodes.add(row.barcode);
      }

      if (row.unitId === baseUnitId) {
        hasBaseUnit = true;
        if (!factor.eq(1)) {
          throw new BadRequestException("الوحدة الأساسية يجب أن يكون معامل التحويل لها 1");
        }
      }
    }

    if (!hasBaseUnit) {
      throw new BadRequestException("يجب أن تتضمن التحويلات صف الوحدة الأساسية");
    }

    const units = await Promise.all(
      normalizedRows.map(async (row) => ({
        ...row,
        unit: await this.unitsOfMeasureService.ensureActiveUnit(row.unitId),
      })),
    );

    await Promise.all(
      units.map((row) => this.ensureUniqueBarcode(row.barcode, excludeItemId)),
    );

    return units.map((row) => ({
      unitId: row.unit.id,
      conversionFactorToBaseUnit: this.parseNullableDecimal(
        row.conversionFactorToBaseUnit,
        "Conversion factor to base unit",
      )!,
      barcode: row.barcode,
      defaultSalesPrice: this.parseNullableDecimal(row.defaultSalesPrice, "Unit default sales price"),
      defaultPurchasePrice: this.parseNullableDecimal(row.defaultPurchasePrice, "Unit default purchase price"),
      isBaseUnit: row.unit.id === baseUnitId,
    }));
  }

  private mapItem(row: InventoryItemWithAccounts) {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      internalNotes: row.internalNotes,
      itemImageUrl: row.itemImageUrl,
      attachmentsText: row.attachmentsText,
      barcode: row.barcode,
      qrCodeValue: row.qrCodeValue,
      unitOfMeasure: row.unitOfMeasure,
      unitOfMeasureId: row.unitOfMeasureId,
      unitOfMeasureRef: row.unitOfMeasureRef,
      category: row.category,
      itemGroupId: row.itemGroupId,
      itemGroup: row.itemGroup,
      itemCategoryId: row.itemCategoryId,
      itemCategory: row.itemCategory,
      type: row.type,
      defaultSalesPrice: row.defaultSalesPrice?.toString() ?? "",
      defaultPurchasePrice: row.defaultPurchasePrice?.toString() ?? "",
      currencyCode: row.currencyCode,
      taxable: row.taxable,
      defaultTaxId: row.defaultTaxId,
      defaultTax: row.defaultTax,
      trackInventory: row.trackInventory,
      reorderLevel: row.reorderLevel.toString(),
      reorderQuantity: row.reorderQuantity.toString(),
      preferredWarehouseId: row.preferredWarehouseId,
      preferredWarehouseCode: row.preferredWarehouseCode,
      preferredWarehouse: row.preferredWarehouse,
      onHandQuantity: row.onHandQuantity.toString(),
      valuationAmount: row.valuationAmount.toString(),
      isActive: row.isActive,
      status: row.isActive ? "ACTIVE" : "INACTIVE",
      inventoryAccount: row.inventoryAccount,
      expenseAccount: row.expenseAccount,
      cogsAccount: row.cogsAccount,
      salesAccount: row.salesAccount,
      salesReturnAccount: row.salesReturnAccount,
      adjustmentAccount: row.adjustmentAccount,
      unitConversions: row.unitConversions.map((conversion) => ({
        id: conversion.id,
        unitId: conversion.unitId,
        unit: conversion.unit,
        conversionFactorToBaseUnit: conversion.conversionFactorToBaseUnit.toString(),
        barcode: conversion.barcode,
        defaultSalesPrice: conversion.defaultSalesPrice?.toString() ?? "",
        defaultPurchasePrice: conversion.defaultPurchasePrice?.toString() ?? "",
        isBaseUnit: conversion.isBaseUnit,
      })),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private async allocateNextItemCode(tx: InventoryItemCodeDb) {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(847120531)`;
    const rows = await tx.$queryRaw<Array<{ code: string }>>`
      SELECT code
      FROM "InventoryItem"
      WHERE code ~ ${`^${ITEM_CODE_PREFIX}-[0-9]{${ITEM_CODE_DIGITS}}$`}
      ORDER BY code DESC
      LIMIT 1
    `;

    const lastCode = rows[0]?.code ?? null;
    const lastNumber = lastCode
      ? Number.parseInt(lastCode.slice(ITEM_CODE_PREFIX.length + 1), 10)
      : 0;
    const nextNumber = Number.isFinite(lastNumber) ? lastNumber + 1 : 1;

    return `${ITEM_CODE_PREFIX}-${nextNumber.toString().padStart(ITEM_CODE_DIGITS, "0")}`;
  }

  private isCodeConflict(error: unknown) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
      return false;
    }

    return (
      error.code === "P2002" &&
      Array.isArray(error.meta?.target) &&
      error.meta.target.includes("code")
    );
  }

  private async ensureUniqueBarcode(barcode?: string | null, excludeId?: string) {
    const normalized = this.normalizeOptionalText(barcode);
    if (!normalized) {
      return null;
    }

    const existing = await this.prisma.inventoryItem.findFirst({
      where: {
        barcode: normalized,
        id: excludeId ? { not: excludeId } : undefined,
      },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException("هذا الباركود مستخدم مسبقًا لمادة أخرى");
    }

    const existingConversion =
      await this.prisma.inventoryItemUnitConversion.findFirst({
        where: {
          barcode: normalized,
          inventoryItemId: excludeId ? { not: excludeId } : undefined,
        },
        select: { id: true },
      });

    if (existingConversion) {
      throw new ConflictException("هذا الباركود مستخدم مسبقًا لمادة أخرى");
    }

    return normalized;
  }

  private normalizeOptionalText(value?: string | null) {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  private buildBarcodeCandidate() {
    const epoch = Date.now().toString().slice(-11);
    const random = Math.floor(Math.random() * 90 + 10).toString();
    return `29${epoch}${random}`;
  }

  private isBarcodeConflict(error: unknown) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
      return false;
    }

    return (
      error.code === "P2002" &&
      Array.isArray(error.meta?.target) &&
      error.meta.target.includes("barcode")
    );
  }
}
