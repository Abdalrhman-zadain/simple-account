"use client";

import { LuFileDown as FileDown, LuFileSpreadsheet as FileSpreadsheet, LuPrinter as Printer } from "react-icons/lu";

import { Button } from "@/components/ui";
import type { ExportMode, ExportPermissions } from "@/lib/export-print";

type ExportActionsProps = {
  onAction: (mode: ExportMode) => void;
  permissions?: ExportPermissions;
  disabled?: boolean;
  className?: string;
};

export function ExportActions({ onAction, permissions, disabled, className }: ExportActionsProps) {
  const canPrint = permissions?.canPrint ?? true;
  const canExportPdf = permissions?.canExportPdf ?? true;
  const canExportExcel = permissions?.canExportExcel ?? true;

  return (
    <div className={className ?? "flex flex-wrap items-center gap-2"}>
      <Button type="button" variant="secondary" size="sm" disabled={disabled || !canPrint} onClick={() => onAction("print")}>
        <Printer className="h-4 w-4" />
        <span className="ms-2">طباعة</span>
      </Button>
      <Button type="button" variant="secondary" size="sm" disabled={disabled || !canExportPdf} onClick={() => onAction("pdf")}>
        <FileDown className="h-4 w-4" />
        <span className="ms-2">PDF</span>
      </Button>
      <Button type="button" variant="secondary" size="sm" disabled={disabled || !canExportExcel} onClick={() => onAction("excel")}>
        <FileSpreadsheet className="h-4 w-4" />
        <span className="ms-2">Excel</span>
      </Button>
    </div>
  );
}
