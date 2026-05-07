import { BillMetadata, BillResult } from "@/types/bill";

export const BILL_ARTIFACT_PREFIX = "bills/";
export const MAX_ARTIFACT_FILE_BYTES = 10 * 1024 * 1024;

export function sanitizePathSegment(value: string, fallback: string): string {
  const cleaned = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return cleaned || fallback;
}

export function createBillArtifactId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `bill-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

export function formatBillDateOrToday(billDate: string): string {
  if (!billDate) {
    return new Intl.DateTimeFormat("en-CA").format(new Date());
  }

  const parsed = new Date(`${billDate}T00:00:00`);
  if (Number.isNaN(parsed.valueOf())) {
    return new Intl.DateTimeFormat("en-CA").format(new Date());
  }

  return new Intl.DateTimeFormat("en-CA").format(parsed);
}

export function buildBillArtifactFilename(
  metadata: BillMetadata,
  extension: "pdf" | "xlsx",
  billId?: string
): string {
  const fallbackDate = new Intl.DateTimeFormat("en-CA").format(new Date());
  const billDate = sanitizePathSegment(
    metadata.billDate || fallbackDate,
    fallbackDate
  );

  const title = sanitizePathSegment(
    metadata.title,
    billId ? `bill-${billId.slice(0, 8)}` : `bill-${fallbackDate}`
  );

  return `HARTRON-Bill-${title}-${billDate}.${extension}`;
}

export function buildArtifactPathnames(params: {
  billId: string;
  metadata: BillMetadata;
  generatedAt: Date;
}): {
  pdfPathname: string;
  excelPathname: string;
  manifestPathname: string;
  pdfFileName: string;
  excelFileName: string;
} {
  const year = params.generatedAt.getUTCFullYear();
  const month = String(params.generatedAt.getUTCMonth() + 1).padStart(2, "0");
  const billIdSegment = sanitizePathSegment(params.billId, "bill");

  const pdfFileName = buildBillArtifactFilename(params.metadata, "pdf", params.billId);
  const excelFileName = buildBillArtifactFilename(params.metadata, "xlsx", params.billId);

  const folder = `${BILL_ARTIFACT_PREFIX}${year}/${month}/${billIdSegment}`;

  return {
    pdfPathname: `${folder}/${pdfFileName}`,
    excelPathname: `${folder}/${excelFileName}`,
    manifestPathname: `${folder}/manifest.json`,
    pdfFileName,
    excelFileName,
  };
}

export function getTotalsFromResult(result: BillResult): {
  totalQuantity: number;
  finalPaymentTotal: number;
} {
  const quantityRow = result.rows.find((row) => row.sr === 1);
  const paymentRow = result.rows.find((row) => row.sr === 15);

  return {
    totalQuantity: quantityRow?.total ?? 0,
    finalPaymentTotal: paymentRow?.total ?? 0,
  };
}

export function isAllowedArtifactPathname(pathname: string): boolean {
  if (!pathname.startsWith(BILL_ARTIFACT_PREFIX)) {
    return false;
  }

  return /\.(pdf|xlsx|json)$/i.test(pathname);
}

export function normalizeString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}
