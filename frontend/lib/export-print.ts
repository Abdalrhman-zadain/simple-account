export type ExportMode = "print" | "pdf" | "excel";
export type ExportEntityType = "report" | "table" | "document";

export type ExportColumn<T> = {
  key: string;
  label: string;
  align?: "start" | "center" | "end";
  value: (row: T) => string | number | null | undefined;
};

export type ExportFilter = {
  label: string;
  value?: string | number | null;
};

export type ExportTotal = {
  label: string;
  value: string | number;
};

export type ExportPermissions = {
  canPrint?: boolean;
  canExportPdf?: boolean;
  canExportExcel?: boolean;
};

export type ExportOrPrintInput<T> = {
  mode: ExportMode;
  entityType: ExportEntityType;
  title: string;
  fileName?: string;
  companyName?: string;
  currency?: string;
  generatedBy?: string | null;
  metadata?: ExportFilter[];
  filters?: ExportFilter[];
  columns: ExportColumn<T>[];
  rows: T[];
  totals?: ExportTotal[];
  permissions?: ExportPermissions;
};

const MESSAGES = {
  noData: "لا توجد بيانات للتصدير حسب الفلاتر الحالية.",
  failed: "تعذر تجهيز الملف. يرجى المحاولة مرة أخرى.",
  forbidden: "ليس لديك صلاحية لتنفيذ هذا الإجراء.",
};

export function formatExportMoney(value: string | number | null | undefined, currency = "JOD") {
  const amount = typeof value === "number" ? value : Number(value ?? 0);

  return `${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0)} ${currency}`;
}

export function formatExportDateTime(value: string | Date | null | undefined = new Date()) {
  const date = value instanceof Date ? value : new Date(value ?? Date.now());
  if (Number.isNaN(date.getTime())) return "";

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const period = hours >= 12 ? "مساءً" : "صباحًا";
  const hour12 = String(hours % 12 || 12).padStart(2, "0");

  return `${day}/${month}/${year} - ${hour12}:${minutes} ${period}`;
}

export function formatExportDate(value: string | Date | null | undefined) {
  const date = value instanceof Date ? value : new Date(value ?? "");
  if (Number.isNaN(date.getTime())) return "";

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
}

export function exportOrPrint<T>(input: ExportOrPrintInput<T>) {
  try {
    if (!hasPermission(input.mode, input.permissions)) {
      window.alert(MESSAGES.forbidden);
      return;
    }

    if (!input.rows.length) {
      window.alert(MESSAGES.noData);
      return;
    }

    if (input.mode === "excel") {
      downloadExcel(input);
      return;
    }

    openPrintableDocument(input);
  } catch {
    window.alert(MESSAGES.failed);
  }
}

function hasPermission(mode: ExportMode, permissions?: ExportPermissions) {
  if (mode === "print") return permissions?.canPrint ?? true;
  if (mode === "pdf") return permissions?.canExportPdf ?? true;
  return permissions?.canExportExcel ?? true;
}

function openPrintableDocument<T>(input: ExportOrPrintInput<T>) {
  const popup = window.open("", "_blank");
  if (!popup) {
    window.alert(MESSAGES.failed);
    return;
  }

  popup.document.open();
  popup.document.write(buildHtmlDocument(input, false));
  popup.document.close();
  popup.focus();
  popup.onload = () => popup.print();
}

function downloadExcel<T>(input: ExportOrPrintInput<T>) {
  const html = buildHtmlDocument(input, true);
  const blob = new Blob(["\ufeff", html], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = `${safeFileName(input.fileName || input.title)}.xls`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function buildHtmlDocument<T>(input: ExportOrPrintInput<T>, forExcel: boolean) {
  const generatedAt = formatExportDateTime(new Date());
  const filters = [...(input.metadata ?? []), ...(input.filters ?? [])].filter((item) => hasValue(item.value));
  const title = escapeHtml(input.title);
  const direction = "rtl";

  return `<!doctype html>
<html lang="ar" dir="${direction}">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    @page { size: A4 landscape; margin: 14mm; }
    * { box-sizing: border-box; }
    body {
      direction: rtl;
      margin: 0;
      color: #111827;
      font-family: Arial, Tahoma, sans-serif;
      background: #ffffff;
      font-size: 12px;
    }
    .sheet { width: 100%; }
    .header {
      display: flex;
      justify-content: space-between;
      gap: 24px;
      border-bottom: 2px solid #111827;
      padding-bottom: 14px;
      margin-bottom: 14px;
    }
    h1 { margin: 0 0 8px; font-size: 22px; }
    .company { font-size: 15px; font-weight: 700; color: #0f766e; }
    .meta, .filters { display: grid; gap: 6px; color: #374151; }
    .meta { text-align: left; direction: rtl; }
    .filters {
      grid-template-columns: repeat(3, minmax(0, 1fr));
      border: 1px solid #d1d5db;
      background: #f9fafb;
      padding: 10px;
      margin-bottom: 14px;
    }
    .label { color: #6b7280; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; direction: rtl; }
    th, td { border: 1px solid #d1d5db; padding: 8px; vertical-align: top; }
    th { background: #f3f4f6; color: #111827; font-weight: 800; }
    td.end, th.end { text-align: left; direction: ltr; }
    td.center, th.center { text-align: center; }
    td.start, th.start { text-align: right; }
    .totals {
      margin-top: 14px;
      width: 45%;
      margin-right: auto;
    }
    .footer {
      margin-top: 18px;
      padding-top: 10px;
      border-top: 1px solid #d1d5db;
      color: #6b7280;
      display: flex;
      justify-content: space-between;
    }
    ${forExcel ? "" : ".page-number:after { content: counter(page); }"}
  </style>
</head>
<body>
  <main class="sheet">
    <section class="header">
      <div>
        <div class="company">${escapeHtml(input.companyName || "Simple Account")}</div>
        <h1>${title}</h1>
        <div>${escapeHtml(entityTypeLabel(input.entityType))}</div>
      </div>
      <div class="meta">
        ${input.currency ? `<div><span class="label">العملة:</span> ${escapeHtml(input.currency)}</div>` : ""}
        <div><span class="label">تاريخ ووقت الإنشاء:</span> ${escapeHtml(generatedAt)}</div>
        ${input.generatedBy ? `<div><span class="label">اسم المستخدم:</span> ${escapeHtml(input.generatedBy)}</div>` : ""}
      </div>
    </section>
    ${filters.length ? `<section class="filters">${filters.map((item) => `<div><span class="label">${escapeHtml(item.label)}:</span> ${escapeHtml(String(item.value))}</div>`).join("")}</section>` : ""}
    <table>
      <thead>
        <tr>${input.columns.map((column) => `<th class="${column.align || "start"}">${escapeHtml(column.label)}</th>`).join("")}</tr>
      </thead>
      <tbody>
        ${input.rows.map((row) => `<tr>${input.columns.map((column) => `<td class="${column.align || "start"}">${escapeHtml(column.value(row) ?? "")}</td>`).join("")}</tr>`).join("")}
      </tbody>
    </table>
    ${input.totals?.length ? `<table class="totals"><tbody>${input.totals.map((total) => `<tr><th>${escapeHtml(total.label)}</th><td class="end">${escapeHtml(total.value)}</td></tr>`).join("")}</tbody></table>` : ""}
    <section class="footer">
      <div>تم إنشاء هذا التقرير بواسطة النظام</div>
      <div>${forExcel ? "" : "رقم الصفحة: "}<span class="page-number"></span></div>
    </section>
  </main>
</body>
</html>`;
}

function entityTypeLabel(entityType: ExportEntityType) {
  if (entityType === "report") return "تقرير";
  if (entityType === "document") return "مستند";
  return "قائمة";
}

function hasValue(value: ExportFilter["value"]) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function safeFileName(value: string) {
  return value
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .slice(0, 90);
}

function escapeHtml(value: string | number) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
