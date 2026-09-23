import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toPng, toJpeg, toSvg } from "html-to-image";

export interface ExportColumn {
  key: string;
  label: string;
}

function triggerDownload(filename: string, url: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportToCSV(
  filename: string,
  columns: ExportColumn[],
  rows: Record<string, any>[],
) {
  const header = columns.map((c) => `"${c.label}"`).join(",");
  const body = rows
    .map((row) =>
      columns
        .map((c) => {
          const v = row[c.key];
          if (v == null) return '""';
          return `"${String(v).replace(/"/g, '""')}"`;
        })
        .join(","),
    )
    .join("\n");
  const blob = new Blob([`${header}\n${body}`], {
    type: "text/csv;charset=utf-8;",
  });
  triggerDownload(filename, URL.createObjectURL(blob));
}

export function exportToJSON(filename: string, rows: Record<string, any>[]) {
  const blob = new Blob([JSON.stringify(rows, null, 2)], {
    type: "application/json",
  });
  triggerDownload(filename, URL.createObjectURL(blob));
}

export function exportToXLSX(
  filename: string,
  columns: ExportColumn[],
  rows: Record<string, any>[],
) {
  const sheetData = rows.map((row) =>
    Object.fromEntries(columns.map((c) => [c.label, row[c.key] ?? ""])),
  );
  const ws = XLSX.utils.json_to_sheet(sheetData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  XLSX.writeFile(wb, filename);
}

export function exportToPDF(
  filename: string,
  columns: ExportColumn[],
  rows: Record<string, any>[],
  title?: string,
) {
  const doc = new jsPDF();
  if (title) {
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(title, 14, 15);
  }
  autoTable(doc, {
    head: [columns.map((c) => c.label)],
    body: rows.map((row) =>
      columns.map((c) => {
        const v = row[c.key];
        return v == null ? "" : String(v);
      }),
    ),
    startY: title ? 25 : 15,
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [17, 24, 39], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    margin: { left: 14, right: 14 },
  });
  doc.save(filename);
}

export async function exportChartAsPNG(
  element: HTMLElement,
  filename: string,
  pixelRatio = 2,
) {
  const url = await toPng(element, {
    backgroundColor: "#ffffff",
    pixelRatio,
    style: { borderRadius: "0" },
  });
  triggerDownload(filename, url);
}

export async function exportChartAsJPEG(
  element: HTMLElement,
  filename: string,
  pixelRatio = 2,
) {
  const url = await toJpeg(element, {
    backgroundColor: "#ffffff",
    quality: 0.95,
    pixelRatio,
  });
  triggerDownload(filename, url);
}

export async function exportChartAsSVG(
  element: HTMLElement,
  filename: string,
) {
  const dataUrl = await toSvg(element, { backgroundColor: "#ffffff" });
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  triggerDownload(filename, URL.createObjectURL(blob));
}
