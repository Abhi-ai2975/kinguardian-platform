/**
 * @file export-utils.ts
 * @description Pure utility functions for exporting table data to CSV, Excel
 * (.xlsx), and JSON. No React dependencies — these can be called from any
 * component or server action.
 *
 * Excel export uses SheetJS (`xlsx`) which is dynamically imported so the
 * library is only bundled when the user actually triggers an Excel export.
 * CSV and JSON use only the browser's built-in APIs (Blob + URL.createObjectURL).
 *
 * @layer shared/tables
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** All supported export formats */
export type ExportFormat = "csv" | "excel" | "json" | "pdf";

/** A single column descriptor used to map row values to export columns */
export interface ExportColumn {
  /** The field key — must match a key in ExportRow */
  id: string;
  /** Human-readable header label written to the output file */
  label: string;
}

/** A single data row — keys are column ids, values are raw cell values */
export type ExportRow = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Triggers a browser file download for the given content string.
 *
 * @param content - File content as a string.
 * @param filename - Full filename including extension.
 * @param mimeType - MIME type for the Blob.
 */
function downloadString(
  content: string,
  filename: string,
  mimeType: string,
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  // Defer revocation so the download can start
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Escapes a single CSV cell value.
 * Wraps in double-quotes and escapes any internal double-quotes.
 *
 * @param value - Raw cell value.
 * @returns A safely-quoted CSV cell string.
 */
function csvCell(value: unknown): string {
  const str = value == null ? "" : String(value);
  // Must quote if the value contains commas, quotes, or newlines
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// ---------------------------------------------------------------------------
// Public export functions
// ---------------------------------------------------------------------------

/**
 * Exports rows to a CSV file and triggers a browser download.
 *
 * @param rows - Array of row objects keyed by column id.
 * @param columns - Ordered list of columns to include.
 * @param filename - Base filename (without extension).
 */
export function exportToCSV(
  rows: ExportRow[],
  columns: ExportColumn[],
  filename: string,
): void {
  const header = columns.map((c) => csvCell(c.label)).join(",");
  const body = rows
    .map((row) => columns.map((c) => csvCell(row[c.id])).join(","))
    .join("\n");

  // BOM (0xFEFF) makes Excel correctly detect UTF-8 when opening the CSV
  downloadString(
    `﻿${header}\n${body}`,
    `${filename}.csv`,
    "text/csv;charset=utf-8;",
  );
}

/**
 * Exports rows to a JSON file and triggers a browser download.
 * Each row is an object with label-keyed properties (not id-keyed) so the
 * output is human-readable without knowing the column schema.
 *
 * @param rows - Array of row objects keyed by column id.
 * @param columns - Ordered list of columns to include.
 * @param filename - Base filename (without extension).
 */
export function exportToJSON(
  rows: ExportRow[],
  columns: ExportColumn[],
  filename: string,
): void {
  const data = rows.map((row) =>
    Object.fromEntries(columns.map((c) => [c.label, row[c.id] ?? null])),
  );

  downloadString(
    JSON.stringify(data, null, 2),
    `${filename}.json`,
    "application/json",
  );
}

/**
 * Exports rows to an Excel (.xlsx) file and triggers a browser download.
 * SheetJS is dynamically imported so the bundle cost is deferred until use.
 *
 * @param rows - Array of row objects keyed by column id.
 * @param columns - Ordered list of columns to include.
 * @param filename - Base filename (without extension).
 * @returns Promise that resolves when the file has been triggered for download.
 */
export async function exportToExcel(
  rows: ExportRow[],
  columns: ExportColumn[],
  filename: string,
): Promise<void> {
  // Dynamic import — only fetched when this function is first called
  const { utils, writeFile } = await import("xlsx");

  // Build a 2-D array: first row = headers, remaining rows = data
  const sheetData: unknown[][] = [
    columns.map((c) => c.label),
    ...rows.map((row) => columns.map((c) => row[c.id] ?? "")),
  ];

  const worksheet = utils.aoa_to_sheet(sheetData);

  // Auto-size columns based on the widest cell in each column
  const colWidths = columns.map((c, colIdx) => {
    const maxLen = Math.max(
      c.label.length,
      ...rows.map((row) => String(row[c.id] ?? "").length),
    );
    void colIdx;
    return { wch: Math.min(maxLen + 2, 50) }; // cap at 50 chars wide
  });
  worksheet["!cols"] = colWidths;

  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, worksheet, "Export");
  writeFile(workbook, `${filename}.xlsx`);
}

/**
 * Exports rows to a PDF file and triggers a browser download.
 * Uses jsPDF + jspdf-autotable — both dynamically imported to keep the
 * initial bundle small.
 *
 * @param rows - Array of row objects keyed by column id.
 * @param columns - Ordered list of columns to include.
 * @param filename - Base filename (without extension).
 * @param title - Optional document title printed above the table.
 * @returns Promise that resolves when the file has been triggered for download.
 */
export async function exportToPDF(
  rows: ExportRow[],
  columns: ExportColumn[],
  filename: string,
  title?: string,
): Promise<void> {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const doc = new jsPDF({ orientation: "landscape" });

  if (title) {
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text(title, 14, 14);
  }

  autoTable(doc, {
    startY: title ? 22 : 14,
    head: [columns.map((c) => c.label)],
    body: rows.map((row) =>
      columns.map((c) => {
        const v = row[c.id];
        return v == null ? "" : String(v);
      }),
    ),
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [30, 30, 30], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 248, 248] },
  });

  doc.save(`${filename}.pdf`);
}

// ---------------------------------------------------------------------------
// Dispatcher
// ---------------------------------------------------------------------------

/**
 * Routes an export request to the correct format handler.
 * Returns a Promise for all formats so callers can await uniformly.
 *
 * @param format - Target export format.
 * @param rows - Array of row objects keyed by column id.
 * @param columns - Ordered list of columns to include.
 * @param filename - Base filename (without extension).
 * @param title - Optional title used by the PDF export.
 */
export async function exportTable(
  format: ExportFormat,
  rows: ExportRow[],
  columns: ExportColumn[],
  filename: string,
  title?: string,
): Promise<void> {
  switch (format) {
    case "csv":
      exportToCSV(rows, columns, filename);
      break;
    case "json":
      exportToJSON(rows, columns, filename);
      break;
    case "excel":
      await exportToExcel(rows, columns, filename);
      break;
    case "pdf":
      await exportToPDF(rows, columns, filename, title);
      break;
  }
}
