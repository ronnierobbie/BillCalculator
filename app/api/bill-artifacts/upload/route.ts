import { put } from "@vercel/blob";
import {
  MAX_ARTIFACT_FILE_BYTES,
  buildArtifactPathnames,
  createBillArtifactId,
  getTotalsFromResult,
  normalizeString,
  sanitizePathSegment,
} from "@/lib/bill-artifacts";
import { BillArtifactManifest, BillResult } from "@/types/bill";

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

type UploadMetadata = {
  billId?: string;
  title?: string;
  billDate?: string;
  referenceNumber?: string | null;
  generatedAt?: string;
  result?: BillResult;
};

function parseMetadata(raw: string): UploadMetadata | null {
  try {
    return JSON.parse(raw) as UploadMetadata;
  } catch {
    return null;
  }
}

function isValidPdfFile(file: File): boolean {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

function isValidExcelFile(file: File): boolean {
  return file.type === XLSX_MIME || file.name.toLowerCase().endsWith(".xlsx");
}

function invalid(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return invalid("Blob storage is not configured. Missing BLOB_READ_WRITE_TOKEN.", 500);
  }

  const form = await request.formData();
  const pdfFile = form.get("pdf");
  const excelFile = form.get("excel");
  const metadataRaw = normalizeString(form.get("metadata"));

  if (!(pdfFile instanceof File) || !(excelFile instanceof File)) {
    return invalid("Both PDF and Excel files are required.");
  }

  if (!isValidPdfFile(pdfFile)) {
    return invalid("Invalid PDF file.");
  }

  if (!isValidExcelFile(excelFile)) {
    return invalid("Invalid Excel file.");
  }

  if (pdfFile.size > MAX_ARTIFACT_FILE_BYTES || excelFile.size > MAX_ARTIFACT_FILE_BYTES) {
    return invalid("File exceeds maximum allowed size.");
  }

  const metadata = parseMetadata(metadataRaw);
  if (!metadata) {
    return invalid("Invalid metadata payload.");
  }

  const generatedAt = metadata.generatedAt ? new Date(metadata.generatedAt) : new Date();
  if (Number.isNaN(generatedAt.valueOf())) {
    return invalid("Invalid generatedAt value.");
  }

  const billId = sanitizePathSegment(metadata.billId || createBillArtifactId(), createBillArtifactId());
  const title = normalizeString(metadata.title || "Untitled Bill");
  const billDate = normalizeString(metadata.billDate || "");
  const referenceNumber = metadata.referenceNumber ? String(metadata.referenceNumber) : null;

  const pathnames = buildArtifactPathnames({
    billId,
    metadata: {
      title,
      billDate,
      referenceNumber: referenceNumber || "",
      preparedBy: "",
      notes: "",
    },
    generatedAt,
  });

  const [pdfBlob, excelBlob] = await Promise.all([
    put(pathnames.pdfPathname, pdfFile, {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/pdf",
    }),
    put(pathnames.excelPathname, excelFile, {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: XLSX_MIME,
    }),
  ]);

  const totals = metadata.result ? getTotalsFromResult(metadata.result) : undefined;

  const manifest: BillArtifactManifest = {
    billId,
    title,
    billDate,
    referenceNumber,
    generatedAt: generatedAt.toISOString(),
    pdfPathname: pdfBlob.pathname,
    excelPathname: excelBlob.pathname,
    pdfUrl: pdfBlob.url,
    excelUrl: excelBlob.url,
    totalQuantity: totals?.totalQuantity,
    finalPaymentTotal: totals?.finalPaymentTotal,
  };

  const manifestBlob = await put(
    pathnames.manifestPathname,
    JSON.stringify(manifest, null, 2),
    {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
    }
  );

  return Response.json({
    ok: true,
    manifest,
    manifestPathname: manifestBlob.pathname,
    manifestUrl: manifestBlob.url,
  });
}
