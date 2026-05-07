import { get, list } from "@vercel/blob";
import { BILL_ARTIFACT_PREFIX } from "@/lib/bill-artifacts";
import { BillArtifactRecord } from "@/types/bill";

function toRecord(
  value: unknown,
  manifestPathname: string,
  manifestUrl?: string
): BillArtifactRecord | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const item = value as Record<string, unknown>;
  if (
    typeof item.billId !== "string" ||
    typeof item.title !== "string" ||
    typeof item.generatedAt !== "string" ||
    typeof item.pdfPathname !== "string" ||
    typeof item.excelPathname !== "string"
  ) {
    return null;
  }

  return {
    billId: item.billId,
    title: item.title,
    billDate: typeof item.billDate === "string" ? item.billDate : "",
    referenceNumber:
      typeof item.referenceNumber === "string" || item.referenceNumber === null
        ? item.referenceNumber
        : null,
    generatedAt: item.generatedAt,
    pdfPathname: item.pdfPathname,
    excelPathname: item.excelPathname,
    pdfUrl: typeof item.pdfUrl === "string" ? item.pdfUrl : undefined,
    excelUrl: typeof item.excelUrl === "string" ? item.excelUrl : undefined,
    totalQuantity:
      typeof item.totalQuantity === "number" ? item.totalQuantity : undefined,
    finalPaymentTotal:
      typeof item.finalPaymentTotal === "number" ? item.finalPaymentTotal : undefined,
    manifestPathname,
    manifestUrl,
  };
}

export async function GET() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return Response.json(
      { error: "Blob storage is not configured. Missing BLOB_READ_WRITE_TOKEN." },
      { status: 500 }
    );
  }

  const manifestBlobs: Array<{ pathname: string; url: string }> = [];

  let cursor: string | undefined;
  let hasMore = true;

  while (hasMore) {
    const page = await list({
      prefix: BILL_ARTIFACT_PREFIX,
      limit: 1000,
      cursor,
    });

    for (const blob of page.blobs) {
      if (blob.pathname.endsWith("/manifest.json")) {
        manifestBlobs.push({ pathname: blob.pathname, url: blob.url });
      }
    }

    hasMore = page.hasMore;
    cursor = page.cursor;
  }

  const records = await Promise.all(
    manifestBlobs.map(async (manifestBlob) => {
      const blobResult = await get(manifestBlob.pathname, { access: "private" });
      if (!blobResult || blobResult.statusCode !== 200 || !blobResult.stream) {
        return null;
      }

      const text = await new Response(blobResult.stream).text();
      try {
        const parsed = JSON.parse(text);
        return toRecord(parsed, manifestBlob.pathname, manifestBlob.url);
      } catch {
        return null;
      }
    })
  );

  const artifacts = records
    .filter((record): record is BillArtifactRecord => !!record)
    .sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));

  const groupedByBillId = artifacts.reduce<Record<string, BillArtifactRecord[]>>(
    (grouped, item) => {
      if (!grouped[item.billId]) {
        grouped[item.billId] = [];
      }

      grouped[item.billId].push(item);
      return grouped;
    },
    {}
  );

  return Response.json({
    artifacts,
    groupedByBillId,
  });
}
