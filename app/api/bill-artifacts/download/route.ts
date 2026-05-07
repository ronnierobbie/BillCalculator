import { get } from "@vercel/blob";
import { isAllowedArtifactPathname } from "@/lib/bill-artifacts";

function inferContentType(pathname: string): string {
  if (pathname.endsWith(".pdf")) {
    return "application/pdf";
  }

  if (pathname.endsWith(".xlsx")) {
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  }

  return "application/octet-stream";
}

export async function GET(request: Request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return Response.json(
      { error: "Blob storage is not configured. Missing BLOB_READ_WRITE_TOKEN." },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const pathname = searchParams.get("pathname");

  if (!pathname || !isAllowedArtifactPathname(pathname)) {
    return Response.json({ error: "Invalid pathname." }, { status: 400 });
  }

  const result = await get(pathname, { access: "private" });

  if (!result || result.statusCode !== 200 || !result.stream) {
    return new Response("Not found", { status: 404 });
  }

  const fileName = pathname.split("/").pop() || "artifact";

  return new Response(result.stream, {
    headers: {
      "Content-Type": result.blob.contentType || inferContentType(pathname),
      "Content-Disposition": `attachment; filename=\"${fileName}\"`,
      "Cache-Control": "private, no-cache",
    },
  });
}
