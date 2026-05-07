import { SUPPORTED_STATES } from "@/lib/bill-constants";
import { buildBillArtifactFilename } from "@/lib/bill-artifacts";
import { BillInput, BillMetadata, BillResult } from "@/types/bill";

export type ExportPayload = {
  metadata: BillMetadata;
  input: BillInput;
  result: BillResult;
};

export type GeneratedBillArtifact = {
  fileName: string;
  mimeType: string;
  blob: Blob;
};

function formatDateForDisplay(value: string): string {
  if (!value) {
    return "Not provided";
  }

  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.valueOf())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

function formatFundingType(projectFunding: BillInput["projectFunding"]): string {
  return projectFunding === "state" ? "State Govt. funded (4%)" : "eCommittee funded (2%)";
}

function getTotalQuantity(result: BillResult): number {
  const qtyRow = result.rows.find((row) => row.sr === 1);
  return qtyRow ? qtyRow.total : 0;
}

function getFinalPayment(result: BillResult): number {
  const paymentRow = result.rows.find((row) => row.sr === 15);
  return paymentRow ? paymentRow.total : 0;
}

function getGeneratedTimestamp(): string {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  window.URL.revokeObjectURL(url);
}

export async function generateBillPdfArtifact(
  payload: ExportPayload
): Promise<GeneratedBillArtifact> {
  const [jsPdfModule, autoTableModule] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const JsPdf = ((jsPdfModule as unknown as { default?: new () => unknown; jsPDF?: new () => unknown }).default ||
    (jsPdfModule as unknown as { jsPDF?: new () => unknown }).jsPDF) as new () => {
      setFontSize: (size: number) => void;
      text: (text: string, x: number, y: number) => void;
      output: (type: "arraybuffer") => ArrayBuffer;
    };

  const autoTable = ((autoTableModule as unknown as { autoTable?: (...args: unknown[]) => void; default?: (...args: unknown[]) => void }).autoTable ||
    (autoTableModule as unknown as { default?: (...args: unknown[]) => void }).default) as (
      doc: unknown,
      options: {
        head: string[][];
        body: string[][];
        startY: number;
        styles: { fontSize: number };
        headStyles: { fillColor: [number, number, number] };
      }
    ) => void;

  const doc = new JsPdf();

  const billTitle = payload.metadata.title || "Untitled Bill";
  const referenceNumber = payload.metadata.referenceNumber || "Not provided";

  doc.setFontSize(14);
  doc.text("HARTRON Bill Details", 14, 15);
  doc.setFontSize(10);
  doc.text(`Bill title: ${billTitle}`, 14, 23);
  doc.text(`Bill date: ${formatDateForDisplay(payload.metadata.billDate)}`, 14, 29);
  doc.text(`Reference number: ${referenceNumber}`, 14, 35);
  doc.text(`Funding type: ${formatFundingType(payload.input.projectFunding)}`, 14, 41);
  doc.text(`GST percentage: ${payload.input.gstPercent}%`, 14, 47);
  doc.text(`Total quantity: ${getTotalQuantity(payload.result).toFixed(2)}`, 14, 53);
  doc.text(`Final payment total: ${getFinalPayment(payload.result).toFixed(2)}`, 14, 59);
  doc.text(`Generated at: ${getGeneratedTimestamp()}`, 14, 65);

  const tableData = payload.result.rows.map((row) => [
    row.sr.toString(),
    row.description,
    row.values[0].toFixed(2),
    row.values[1].toFixed(2),
    row.values[2].toFixed(2),
    row.total.toFixed(2),
  ]);

  autoTable(doc, {
    head: [["Sr.", "Item Description", ...SUPPORTED_STATES, "Total"]],
    body: tableData,
    startY: 72,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [20, 20, 20] },
  });

  const arrayBuffer = doc.output("arraybuffer");
  const blob = new Blob([arrayBuffer], { type: "application/pdf" });

  return {
    fileName: buildBillArtifactFilename(payload.metadata, "pdf"),
    mimeType: "application/pdf",
    blob,
  };
}

export async function generateBillExcelArtifact(
  payload: ExportPayload
): Promise<GeneratedBillArtifact> {
  const excelModule = await import("exceljs");

  const WorkbookCtor = (excelModule as unknown as { Workbook?: new () => unknown }).Workbook;
  if (!WorkbookCtor) {
    throw new Error("Excel export is unavailable right now.");
  }

  const workbook = new WorkbookCtor() as {
    addWorksheet: (name: string) => {
      addRow: (row: unknown) => void;
      columns: Array<{ header: string; key: string; width: number }>;
      getCell: (address: string) => { font?: { bold?: boolean } };
    };
    xlsx: { writeBuffer: () => Promise<ArrayBuffer> };
  };

  const worksheet = workbook.addWorksheet("Bill");

  const metadataRows: Array<[string, string]> = [
    ["Bill title", payload.metadata.title || "Untitled Bill"],
    ["Bill date", formatDateForDisplay(payload.metadata.billDate)],
    ["Reference number", payload.metadata.referenceNumber || "Not provided"],
    ["Prepared by", payload.metadata.preparedBy || "Not provided"],
    ["Funding type", formatFundingType(payload.input.projectFunding)],
    ["GST percentage", `${payload.input.gstPercent}%`],
    ["Generated at", getGeneratedTimestamp()],
  ];

  metadataRows.forEach((row) => worksheet.addRow(row));
  worksheet.addRow([]);

  worksheet.columns = [
    { header: "Sr.", key: "sr", width: 8 },
    { header: "Item Description", key: "description", width: 56 },
    { header: "Punjab", key: "punjab", width: 16 },
    { header: "Haryana", key: "haryana", width: 16 },
    { header: "Chandigarh", key: "chandigarh", width: 16 },
    { header: "Total", key: "total", width: 16 },
  ];

  payload.result.rows.forEach((row) => {
    worksheet.addRow({
      sr: row.sr,
      description: row.description,
      punjab: row.values[0],
      haryana: row.values[1],
      chandigarh: row.values[2],
      total: row.total,
    });
  });

  worksheet.getCell("A1").font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  return {
    fileName: buildBillArtifactFilename(payload.metadata, "xlsx"),
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    blob,
  };
}

export async function exportBillToPdf(payload: ExportPayload): Promise<void> {
  const artifact = await generateBillPdfArtifact(payload);
  downloadBlob(artifact.blob, artifact.fileName);
}

export async function exportBillToExcel(payload: ExportPayload): Promise<void> {
  const artifact = await generateBillExcelArtifact(payload);
  downloadBlob(artifact.blob, artifact.fileName);
}

export function downloadGeneratedArtifact(artifact: GeneratedBillArtifact): void {
  downloadBlob(artifact.blob, artifact.fileName);
}
