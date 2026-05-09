"use client";

import { useMemo } from "react";
import {
  LuFileText as FileText,
  LuPackage2 as Package2,
  LuSave as Save,
  LuTrash2 as Trash2,
  LuX as X,
  LuBarcode as Barcode,
  LuQrCode as QrCode,
  LuImage as ImageIcon,
  LuPaperclip as Paperclip,
  LuSettings as Settings,
  LuCalculator as Calculator,
} from "react-icons/lu";

import { Button } from "@/components/ui";
import { Field, Input, Select, Textarea } from "@/components/ui/forms";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type {
  InventoryItem,
  InventoryItemCategory,
  InventoryItemGroup,
  InventoryItemUnitConversion,
  InventoryItemType,
  InventoryUnitOfMeasure,
  InventoryWarehouse,
  AccountOption,
  Tax,
} from "@/types/api";

export type ItemUnitConversionEditorState = {
  key: string;
  unitId: string;
  conversionFactorToBaseUnit: string;
  barcode: string;
  defaultSalesPrice: string;
  defaultPurchasePrice: string;
  isBaseUnit: boolean;
};

export type ItemEditorState = {
  id?: string;
  code: string;
  name: string;
  description: string;
  internalNotes: string;
  itemImageUrl: string;
  attachmentsText: string;
  barcode: string;
  qrCodeValue: string;
  unitOfMeasure: string;
  unitOfMeasureId: string;
  category: string;
  itemGroupId: string;
  itemCategoryId: string;
  type: InventoryItemType;
  defaultSalesPrice: string;
  defaultPurchasePrice: string;
  currencyCode: string;
  taxable: boolean;
  defaultTaxId: string;
  trackInventory: boolean;
  inventoryAccountId: string;
  cogsAccountId: string;
  salesAccountId: string;
  salesReturnAccountId: string;
  adjustmentAccountId: string;
  reorderLevel: string;
  reorderQuantity: string;
  preferredWarehouseId: string;
  unitConversions: ItemUnitConversionEditorState[];
};

type ItemEditorModalProps = {
  isOpen: boolean;
  title: string;
  editor: ItemEditorState;
  onClose: () => void;
  onChange: (editor: ItemEditorState | ((current: ItemEditorState) => ItemEditorState)) => void;
  onSave: (mode: "save" | "saveAndClose") => void;
  isSaving: boolean;
  validationError?: string | null;
  activeItemGroups: InventoryItemGroup[];
  activeItemCategories: InventoryItemCategory[];
  activeUnitsOfMeasure: InventoryUnitOfMeasure[];
  activeTaxes: Tax[];
  warehouses: InventoryWarehouse[];
  inventoryAccounts: AccountOption[];
  salesAccounts: AccountOption[];
  cogsAccounts: AccountOption[];
  adjustmentAccounts: AccountOption[];
  generateBarcode: () => void;
  isGeneratingBarcode: boolean;
  generateQr: () => void;
  previewCodes: () => void;
  printLabel: () => void;
  showCodePreview: boolean;
  getBarcodePreviewSvg: (value: string) => string;
  getQrPreviewSvg: (value: string) => string;
};

const ITEM_TYPE_OPTIONS: { value: InventoryItemType; label: string }[] = [
  { value: "RAW_MATERIAL", label: "مادة خام" },
  { value: "FINISHED_GOOD", label: "مادة جاهزة للبيع" },
  { value: "SERVICE", label: "خدمة" },
  { value: "MANUFACTURED_ITEM", label: "مادة مصنّعة" },
];

function formatCodeName(code: string, name: string, isArabic: boolean) {
  return isArabic ? `${name} · ${code}` : `${code} · ${name}`;
}

export function createEmptyItemEditor(): ItemEditorState {
  return {
    code: "",
    name: "",
    description: "",
    internalNotes: "",
    itemImageUrl: "",
    attachmentsText: "",
    barcode: "",
    qrCodeValue: "",
    unitOfMeasure: "",
    unitOfMeasureId: "",
    category: "",
    itemGroupId: "",
    itemCategoryId: "",
    type: "FINISHED_GOOD",
    defaultSalesPrice: "",
    defaultPurchasePrice: "",
    currencyCode: "JOD",
    taxable: false,
    defaultTaxId: "",
    trackInventory: true,
    inventoryAccountId: "",
    cogsAccountId: "",
    salesAccountId: "",
    salesReturnAccountId: "",
    adjustmentAccountId: "",
    reorderLevel: "0",
    reorderQuantity: "0",
    preferredWarehouseId: "",
    unitConversions: [],
  };
}

export function createUnitConversionEditor(
  partial: Partial<ItemUnitConversionEditorState> = {},
): ItemUnitConversionEditorState {
  return {
    key: Math.random().toString(36).slice(2, 10),
    unitId: "",
    conversionFactorToBaseUnit: "",
    barcode: "",
    defaultSalesPrice: "",
    defaultPurchasePrice: "",
    isBaseUnit: false,
    ...partial,
  };
}

export function ItemEditorModal({
  isOpen,
  title,
  editor,
  onClose,
  onChange,
  onSave,
  isSaving,
  validationError,
  activeItemGroups,
  activeItemCategories,
  activeUnitsOfMeasure,
  activeTaxes,
  warehouses,
  inventoryAccounts,
  salesAccounts,
  cogsAccounts,
  adjustmentAccounts,
  generateBarcode,
  isGeneratingBarcode,
  generateQr,
  previewCodes,
  printLabel,
  showCodePreview,
  getBarcodePreviewSvg,
  getQrPreviewSvg,
}: ItemEditorModalProps) {
  const { t, language } = useTranslation();
  const isArabic = language === "ar";

  if (!isOpen) return null;

  const updateEditor = (updater: (current: ItemEditorState) => ItemEditorState) => {
    onChange(updater);
  };

  const itemEditorCategories = activeItemCategories.filter((row) => row.itemGroupId === editor.itemGroupId);
  const inventorySettingsDisabled = editor.type === "SERVICE" || !editor.trackInventory;

  const addUnitConversionRow = () => {
    updateEditor((current) => ({
      ...current,
      unitConversions: [...current.unitConversions, createUnitConversionEditor()],
    }));
  };

  const removeUnitConversionRow = (key: string) => {
    updateEditor((current) => ({
      ...current,
      unitConversions: current.unitConversions.filter((row) => row.key !== key),
    }));
  };

  const updateUnitConversionRow = (
    key: string,
    updater: (row: ItemUnitConversionEditorState) => ItemUnitConversionEditorState,
  ) => {
    updateEditor((current) => ({
      ...current,
      unitConversions: current.unitConversions.map((row) => (row.key === key ? updater(row) : row)),
    }));
  };

  return (
    <div className="fixed inset-0 z-50 p-3 sm:p-6">
      <div className="absolute inset-0 bg-slate-950/35 backdrop-blur-sm" onClick={onClose} />
      <div
        dir="rtl"
        className={cn(
          "relative mx-auto flex h-full max-w-[1480px] flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-[#fcfcfb] shadow-[0_30px_80px_rgba(15,23,42,0.18)]",
          isArabic && "arabic-ui",
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-white/90 px-5 py-5 backdrop-blur sm:px-8">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
          >
            <span className="sr-only">{t("inventory.button.cancel")}</span>
            <X className="h-6 w-6" />
          </button>
          <div className="flex items-center gap-3">
            <div className="space-y-1 text-right">
              <div className="text-3xl font-black tracking-tight text-slate-900 arabic-ui-heading">
                {title}
              </div>
              <div className="text-sm text-slate-500">{t("inventory.description.items")}</div>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <Package2 className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.06),_transparent_30%),linear-gradient(180deg,_#fcfcfb_0%,_#f7f8f7_100%)] px-4 py-4 sm:px-8 sm:py-6">
          <div className="space-y-5">
            {validationError ? (
              <div className="rounded-[1.5rem] border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700 shadow-[0_10px_24px_rgba(239,68,68,0.08)] text-right">
                {validationError}
              </div>
            ) : null}

            {/* Section 1: البيانات الأساسية */}
            <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.05)] sm:p-6">
              <div className="mb-5 flex items-center justify-end gap-3">
                <div className="text-right">
                  <div className="text-lg font-extrabold text-slate-900 arabic-ui-heading">
                    1. البيانات الأساسية
                  </div>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                  <FileText className="h-5 w-5" />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="رمز المادة" required labelAlign="end">
                  <Input
                    value={editor.code}
                    onChange={(e) => updateEditor((current) => ({ ...current, code: e.target.value }))}
                    className="text-right border-slate-200 bg-slate-50/70"
                    placeholder="سيتم التوليد تلقائياً في حال تركه فارغاً"
                  />
                </Field>
                <Field label="اسم المادة" required labelAlign="end">
                  <Input
                    value={editor.name}
                    onChange={(e) => updateEditor((current) => ({ ...current, name: e.target.value }))}
                    className="text-right border-slate-200 bg-slate-50/70"
                  />
                </Field>
                <Field label="مجموعة المواد" required labelAlign="end">
                  <Select
                    value={editor.itemGroupId}
                    onChange={(e) => updateEditor((current) => ({ ...current, itemGroupId: e.target.value, itemCategoryId: "" }))}
                    className="text-right border-slate-200 bg-slate-50/70"
                  >
                    <option value="">{t("inventory.placeholder.selectItemGroup")}</option>
                    {activeItemGroups.map((g) => (
                      <option key={g.id} value={g.id}>{formatCodeName(g.code, g.name, isArabic)}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="فئة المادة" required labelAlign="end">
                  <Select
                    value={editor.itemCategoryId}
                    onChange={(e) => {
                      const category = activeItemCategories.find((row) => row.id === e.target.value);
                      updateEditor((current) => ({
                        ...current,
                        itemCategoryId: e.target.value,
                        category: category?.name ?? current.category,
                      }));
                    }}
                    className="text-right border-slate-200 bg-slate-50/70"
                  >
                    <option value="">{t("inventory.placeholder.selectItemCategory")}</option>
                    {itemEditorCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{formatCodeName(cat.code, cat.name, isArabic)}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="نوع المادة" required labelAlign="end">
                  <Select
                    value={editor.type}
                    onChange={(e) => {
                      const newType = e.target.value as InventoryItemType;
                      updateEditor((current) => {
                        let nextUnitOfMeasureId = current.unitOfMeasureId;
                        let nextUnitOfMeasure = current.unitOfMeasure;

                        if (newType === "SERVICE" && !nextUnitOfMeasureId) {
                          const serviceUnit = activeUnitsOfMeasure.find((u) => u.name === "خدمة" || u.name === "Service");
                          if (serviceUnit) {
                            nextUnitOfMeasureId = serviceUnit.id;
                            nextUnitOfMeasure = serviceUnit.code;
                          }
                        }

                        return {
                          ...current,
                          type: newType,
                          trackInventory: newType === "SERVICE" ? false : true,
                          unitOfMeasureId: nextUnitOfMeasureId,
                          unitOfMeasure: nextUnitOfMeasure,
                        };
                      });
                    }}
                    className="text-right border-slate-200 bg-slate-50/70"
                  >
                    {ITEM_TYPE_OPTIONS.map((type) => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="وحدة القياس الأساسية" required labelAlign="end">
                  <Select
                    value={editor.unitOfMeasureId}
                    onChange={(e) => {
                      const unit = activeUnitsOfMeasure.find((row) => row.id === e.target.value);
                      updateEditor((current) => ({
                        ...current,
                        unitOfMeasureId: e.target.value,
                        unitOfMeasure: unit?.code ?? current.unitOfMeasure,
                      }));
                    }}
                    className="text-right border-slate-200 bg-slate-50/70"
                  >
                    <option value="">{t("inventory.placeholder.selectUnit")}</option>
                    {activeUnitsOfMeasure.map((u) => (
                      <option key={u.id} value={u.id}>{formatCodeName(u.code, u.name, isArabic)}</option>
                    ))}
                  </Select>
                </Field>
              </div>
            </section>

            {/* Section 2: الوحدات والأسعار */}
            <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.05)] sm:p-6">
              <div className="mb-5 flex items-center justify-end gap-3">
                <div className="text-right">
                  <div className="text-lg font-extrabold text-slate-900 arabic-ui-heading">
                    2. الوحدات والأسعار
                  </div>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                  <Calculator className="h-5 w-5" />
                </div>
              </div>

              <div className="mb-8 rounded-[1.5rem] border border-slate-100 bg-slate-50/45 p-5">
                <div className="mb-4 text-sm font-bold text-slate-900 text-right">الأسعار الافتراضية</div>
                <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
                  <Field label="سعر البيع الافتراضي" labelAlign="end">
                    <Input value={editor.defaultSalesPrice} onChange={(e) => updateEditor((current) => ({ ...current, defaultSalesPrice: e.target.value }))} className="text-right bg-white" inputMode="decimal" />
                  </Field>
                  <Field label="سعر الشراء الافتراضي" labelAlign="end">
                    <Input value={editor.defaultPurchasePrice} onChange={(e) => updateEditor((current) => ({ ...current, defaultPurchasePrice: e.target.value }))} className="text-right bg-white" inputMode="decimal" />
                  </Field>
                  <Field label="العملة" labelAlign="end">
                    <Input value={editor.currencyCode} onChange={(e) => updateEditor((current) => ({ ...current, currencyCode: e.target.value.toUpperCase() }))} className="text-right bg-white uppercase" maxLength={3} />
                  </Field>
                  <Field label="خاضع للضريبة" labelAlign="end">
                    <label className="flex h-[42px] items-center justify-end gap-3 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800">
                      <span>نعم</span>
                      <input
                        type="checkbox"
                        checked={editor.taxable}
                        onChange={(e) => updateEditor((current) => ({ ...current, taxable: e.target.checked, defaultTaxId: e.target.checked ? current.defaultTaxId : "" }))}
                        className="h-4 w-4 accent-emerald-600"
                      />
                    </label>
                  </Field>
                  <Field label="فئة الضريبة" labelAlign="end">
                    <Select
                      value={editor.defaultTaxId}
                      onChange={(e) => updateEditor((current) => ({ ...current, defaultTaxId: e.target.value }))}
                      disabled={!editor.taxable}
                      className="text-right bg-white"
                    >
                      <option value="">اختر</option>
                      {activeTaxes.map((tax) => (
                        <option key={tax.id} value={tax.id}>{tax.taxCode} · {tax.taxName}</option>
                      ))}
                    </Select>
                  </Field>
                </div>
                <div className="mt-3 text-sm font-medium text-slate-500 text-right">
                  هذه الأسعار افتراضية فقط وتظهر كمقترح في الفواتير، ولا تمثل تكلفة المخزون الفعلية.
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={addUnitConversionRow}
                    className="rounded-2xl border-emerald-200 px-4 text-emerald-700 hover:bg-emerald-50"
                  >
                    + إضافة وحدة
                  </Button>
                  <div className="text-right">
                    <div className="text-sm font-extrabold text-slate-900">الوحدات والتحويلات</div>
                    <div className="text-xs text-slate-500">حدد الوحدات الإضافية للمادة ومعامل تحويل كل وحدة إلى وحدة القياس الأساسية.</div>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-slate-50/30 p-1">
                  <table className="min-w-[1000px] w-full border-separate border-spacing-0 text-sm">
                    <thead>
                      <tr className="text-right text-slate-900">
                        <th className="px-4 py-3 font-bold">الوحدة</th>
                        <th className="px-4 py-3 font-bold">
                          معامل التحويل
                          <span className="ms-1 text-slate-400 group relative inline-block">
                            ⓘ
                            <span className="invisible group-hover:visible absolute bottom-full right-0 w-64 p-2 bg-slate-800 text-white text-xs rounded shadow-lg mb-2 z-10 font-normal">
                              كم تساوي هذه الوحدة من وحدة القياس الأساسية؟ مثال: إذا كانت الوحدة الأساسية حبة والكرتونة تحتوي 24 حبة، أدخل 24.
                            </span>
                          </span>
                        </th>
                        <th className="px-4 py-3 font-bold">باركود الوحدة</th>
                        <th className="px-4 py-3 font-bold">سعر البيع</th>
                        <th className="px-4 py-3 font-bold">سعر الشراء</th>
                        <th className="px-4 py-3 font-bold text-center">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {editor.unitConversions.map((row) => (
                        <tr key={row.key} className="group">
                          <td className="px-2 py-2">
                            <Select
                              value={row.unitId}
                              onChange={(e) => updateUnitConversionRow(row.key, (r) => ({
                                ...r,
                                unitId: e.target.value,
                                isBaseUnit: e.target.value === editor.unitOfMeasureId,
                                conversionFactorToBaseUnit: e.target.value === editor.unitOfMeasureId ? "1" : r.conversionFactorToBaseUnit,
                              }))}
                              className="text-right bg-white border-slate-200"
                            >
                              <option value="">اختر وحدة</option>
                              {activeUnitsOfMeasure.map((u) => (
                                <option key={u.id} value={u.id}>{formatCodeName(u.code, u.name, isArabic)}</option>
                              ))}
                            </Select>
                          </td>
                          <td className="px-2 py-2">
                            <Input
                              value={row.conversionFactorToBaseUnit}
                              onChange={(e) => updateUnitConversionRow(row.key, (r) => ({ ...r, conversionFactorToBaseUnit: e.target.value }))}
                              disabled={row.isBaseUnit}
                              className="text-right bg-white border-slate-200 disabled:bg-slate-50"
                              inputMode="decimal"
                              placeholder="1"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <Input
                              value={row.barcode}
                              onChange={(e) => updateUnitConversionRow(row.key, (r) => ({ ...r, barcode: e.target.value }))}
                              className="text-right bg-white border-slate-200"
                              placeholder="باركود الوحدة"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <Input
                              value={row.defaultSalesPrice}
                              onChange={(e) => updateUnitConversionRow(row.key, (r) => ({ ...r, defaultSalesPrice: e.target.value }))}
                              className="text-right bg-white border-slate-200"
                              inputMode="decimal"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <Input
                              value={row.defaultPurchasePrice}
                              onChange={(e) => updateUnitConversionRow(row.key, (r) => ({ ...r, defaultPurchasePrice: e.target.value }))}
                              className="text-right bg-white border-slate-200"
                              inputMode="decimal"
                            />
                          </td>
                          <td className="px-2 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => removeUnitConversionRow(row.key)}
                              disabled={row.isBaseUnit}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition disabled:opacity-20"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="rounded-2xl bg-amber-50 px-5 py-4 text-sm text-amber-900 text-right">
                  <strong>مثال:</strong> إذا كانت وحدة القياس الأساسية حبة، والكرتونة تحتوي 24 حبة، يكون معامل التحويل للكرتونة = 24.
                </div>
              </div>
            </section>

            {/* Section 3: الرموز والملصقات */}
            <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.05)] sm:p-6">
              <div className="mb-5 flex items-center justify-end gap-3">
                <div className="text-right">
                  <div className="text-lg font-extrabold text-slate-900 arabic-ui-heading">
                    3. الرموز والملصقات
                  </div>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                  <Barcode className="h-5 w-5" />
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <Field label="الباركود" labelAlign="end">
                    <div className="relative">
                      <Input
                        value={editor.barcode}
                        onChange={(e) => updateEditor((current) => ({ ...current, barcode: e.target.value }))}
                        className="text-right border-slate-200 bg-slate-50/70"
                        placeholder="أدخل الباركود أو امسحه"
                      />
                    </div>
                  </Field>
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button variant="secondary" size="sm" className="rounded-xl" onClick={previewCodes}>معاينة الباركود</Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="rounded-xl"
                      onClick={generateBarcode}
                      disabled={isGeneratingBarcode}
                    >
                      توليد باركود
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <Field label="رمز QR" labelAlign="end">
                    <Input
                      value={editor.qrCodeValue}
                      readOnly
                      className="text-right border-slate-200 bg-slate-100"
                    />
                  </Field>
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button variant="secondary" size="sm" className="rounded-xl" onClick={printLabel}>طباعة الملصق</Button>
                    <Button variant="secondary" size="sm" className="rounded-xl" onClick={previewCodes}>معاينة QR</Button>
                    <Button variant="secondary" size="sm" className="rounded-xl" onClick={generateQr}>توليد QR</Button>
                  </div>
                </div>
              </div>

              {showCodePreview && (
                <div className="mt-6 grid gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/30 p-4 text-center">
                    <div className="mb-3 text-sm font-bold text-slate-700">معاينة الباركود</div>
                    {editor.barcode.trim() ? (
                      <div className="mx-auto max-w-[300px] overflow-hidden rounded-xl border border-white bg-white p-4 shadow-sm" dangerouslySetInnerHTML={{ __html: getBarcodePreviewSvg(editor.barcode.trim()) }} />
                    ) : (
                      <div className="py-8 text-sm text-slate-400">أدخل باركود للمعاينة</div>
                    )}
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/30 p-4 text-center">
                    <div className="mb-3 text-sm font-bold text-slate-700">معاينة QR</div>
                    {editor.qrCodeValue.trim() ? (
                      <div className="mx-auto h-[160px] w-[160px] overflow-hidden rounded-xl border border-white bg-white p-4 shadow-sm" dangerouslySetInnerHTML={{ __html: getQrPreviewSvg(editor.qrCodeValue.trim()) }} />
                    ) : (
                      <div className="py-8 text-sm text-slate-400">توليد QR للمعاينة</div>
                    )}
                  </div>
                </div>
              )}
            </section>

            {/* Section 4: إعدادات المخزون */}
            <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.05)] sm:p-6">
              <div className="mb-5 flex items-center justify-end gap-3">
                <div className="text-right">
                  <div className="text-lg font-extrabold text-slate-900 arabic-ui-heading">
                    4. إعدادات المخزون
                  </div>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                  <Settings className="h-5 w-5" />
                </div>
              </div>

              {editor.type === "SERVICE" && (
                <div className="mb-5 rounded-2xl bg-slate-50 px-5 py-4 text-sm text-slate-500 text-right">
                  سيتم تعطيل إعدادات المخزون لأن نوع المادة خدمة.
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="تتبع المخزون" labelAlign="end">
                  <label className="flex h-[42px] items-center justify-end gap-3 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 disabled:opacity-50">
                    <span>تتبع</span>
                    <input
                      type="checkbox"
                      checked={editor.trackInventory}
                      onChange={(e) => updateEditor((current) => ({ ...current, trackInventory: e.target.checked }))}
                      disabled={editor.type === "SERVICE"}
                      className="h-4 w-4 accent-emerald-600"
                    />
                  </label>
                </Field>
                <Field label="المستودع المفضل" labelAlign="end">
                  <Select
                    value={editor.preferredWarehouseId}
                    onChange={(e) => updateEditor((current) => ({ ...current, preferredWarehouseId: e.target.value }))}
                    disabled={inventorySettingsDisabled}
                    className="text-right border-slate-200 bg-slate-50/70"
                  >
                    <option value="">{t("inventory.placeholder.selectWarehouse")}</option>
                    {warehouses.filter(w => w.isActive).map((w) => (
                      <option key={w.id} value={w.id}>{formatCodeName(w.code, w.name, isArabic)}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="حد إعادة الطلب" labelAlign="end">
                  <Input
                    value={editor.reorderLevel}
                    onChange={(e) => updateEditor((current) => ({ ...current, reorderLevel: e.target.value }))}
                    disabled={inventorySettingsDisabled}
                    className="text-right border-slate-200 bg-slate-50/70"
                    inputMode="decimal"
                  />
                </Field>
                <Field label="كمية إعادة الطلب" labelAlign="end">
                  <Input
                    value={editor.reorderQuantity}
                    onChange={(e) => updateEditor((current) => ({ ...current, reorderQuantity: e.target.value }))}
                    disabled={inventorySettingsDisabled}
                    className="text-right border-slate-200 bg-slate-50/70"
                    inputMode="decimal"
                  />
                </Field>
              </div>
            </section>

            {/* Section 5: الحسابات المحاسبية */}
            <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.05)] sm:p-6">
              <div className="mb-5 flex items-center justify-end gap-3">
                <div className="text-right">
                  <div className="text-lg font-extrabold text-slate-900 arabic-ui-heading">
                    5. الحسابات المحاسبية
                  </div>
                  <div className="text-xs text-slate-500">إذا لم يتم اختيار حسابات هنا، سيتم استخدام الحسابات المحددة في مجموعة المواد.</div>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <FileText className="h-5 w-5" />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="حساب المخزون" labelAlign="end">
                  <Select
                    value={editor.inventoryAccountId}
                    onChange={(e) => updateEditor((current) => ({ ...current, inventoryAccountId: e.target.value }))}
                    disabled={editor.type === "SERVICE"}
                    className="text-right border-slate-200 bg-slate-50/70"
                  >
                    <option value="">{t("inventory.placeholder.selectAccount")}</option>
                    {inventoryAccounts.map((a) => (
                      <option key={a.id} value={a.id}>{formatCodeName(a.code, a.name, isArabic)}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="حساب المبيعات" labelAlign="end">
                  <Select
                    value={editor.salesAccountId}
                    onChange={(e) => updateEditor((current) => ({ ...current, salesAccountId: e.target.value }))}
                    className="text-right border-slate-200 bg-slate-50/70"
                  >
                    <option value="">{t("inventory.placeholder.selectAccount")}</option>
                    {salesAccounts.map((a) => (
                      <option key={a.id} value={a.id}>{formatCodeName(a.code, a.name, isArabic)}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="حساب تكلفة البضاعة المباعة" labelAlign="end">
                  <Select
                    value={editor.cogsAccountId}
                    onChange={(e) => updateEditor((current) => ({ ...current, cogsAccountId: e.target.value }))}
                    disabled={editor.type === "SERVICE"}
                    className="text-right border-slate-200 bg-slate-50/70"
                  >
                    <option value="">{t("inventory.placeholder.selectAccount")}</option>
                    {cogsAccounts.map((a) => (
                      <option key={a.id} value={a.id}>{formatCodeName(a.code, a.name, isArabic)}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="حساب مردودات المبيعات" labelAlign="end">
                  <Select
                    value={editor.salesReturnAccountId}
                    onChange={(e) => updateEditor((current) => ({ ...current, salesReturnAccountId: e.target.value }))}
                    className="text-right border-slate-200 bg-slate-50/70"
                  >
                    <option value="">{t("inventory.placeholder.selectAccount")}</option>
                    {salesAccounts.map((a) => (
                      <option key={a.id} value={a.id}>{formatCodeName(a.code, a.name, isArabic)}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="حساب تسويات المخزون" labelAlign="end" className="md:col-span-2">
                  <Select
                    value={editor.adjustmentAccountId}
                    onChange={(e) => updateEditor((current) => ({ ...current, adjustmentAccountId: e.target.value }))}
                    disabled={editor.type === "SERVICE"}
                    className="text-right border-slate-200 bg-slate-50/70"
                  >
                    <option value="">{t("inventory.placeholder.selectAccount")}</option>
                    {adjustmentAccounts.map((a) => (
                      <option key={a.id} value={a.id}>{formatCodeName(a.code, a.name, isArabic)}</option>
                    ))}
                  </Select>
                </Field>
              </div>
            </section>

            {/* Section 6: الوصف والملاحظات */}
            <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.05)] sm:p-6">
              <div className="mb-5 flex items-center justify-end gap-3">
                <div className="text-right">
                  <div className="text-lg font-extrabold text-slate-900 arabic-ui-heading">
                    6. الوصف والملاحظات
                  </div>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                  <Paperclip className="h-5 w-5" />
                </div>
              </div>

              <div className="grid gap-6">
                <Field label="الوصف" labelAlign="end">
                  <Textarea
                    value={editor.description}
                    rows={3}
                    onChange={(e) => updateEditor((current) => ({ ...current, description: e.target.value }))}
                    className="text-right border-slate-200 bg-slate-50/70"
                  />
                </Field>
                <Field label="ملاحظات داخلية" labelAlign="end">
                  <Textarea
                    value={editor.internalNotes}
                    rows={3}
                    onChange={(e) => updateEditor((current) => ({ ...current, internalNotes: e.target.value }))}
                    className="text-right border-slate-200 bg-slate-50/70"
                  />
                </Field>
                <div className="grid gap-6 md:grid-cols-2">
                  <Field label="رابط صورة المادة" labelAlign="end">
                    <div className="flex gap-2">
                      <Input
                        value={editor.itemImageUrl}
                        onChange={(e) => updateEditor((current) => ({ ...current, itemImageUrl: e.target.value }))}
                        className="text-right border-slate-200 bg-slate-50/70"
                        placeholder="https://..."
                      />
                      <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-400">
                        <ImageIcon className="h-5 w-5" />
                      </div>
                    </div>
                  </Field>
                  <Field label="المرفقات" labelAlign="end">
                    <div className="flex gap-2">
                      <Textarea
                        value={editor.attachmentsText}
                        rows={1}
                        onChange={(e) => updateEditor((current) => ({ ...current, attachmentsText: e.target.value }))}
                        className="text-right border-slate-200 bg-slate-50/70 min-h-[42px]"
                        placeholder="روابط المرفقات..."
                      />
                      <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-400">
                        <Paperclip className="h-5 w-5" />
                      </div>
                    </div>
                  </Field>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 bg-white px-5 py-4 sm:px-8">
          <div className="flex flex-col gap-3 sm:flex-row-reverse">
            <Button
              onClick={() => onSave("saveAndClose")}
              disabled={isSaving}
              className="rounded-2xl bg-emerald-600 px-6 hover:bg-emerald-700 font-bold"
            >
              <Save className="h-4 w-4" />
              حفظ وإغلاق
            </Button>
            <Button
              variant="secondary"
              onClick={() => onSave("save")}
              disabled={isSaving}
              className="rounded-2xl border-emerald-200 px-6 text-emerald-700 hover:bg-emerald-50 font-bold"
            >
              <Save className="h-4 w-4" />
              حفظ
            </Button>
            <Button variant="secondary" onClick={onClose} className="rounded-2xl px-6 font-bold mr-auto sm:mr-0">
              إلغاء
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
