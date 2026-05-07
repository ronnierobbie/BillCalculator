import { Download, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BillArtifactRecord } from "@/types/bill";

type BillArtifactsPanelProps = {
  artifacts: BillArtifactRecord[];
  isLoading: boolean;
  hasLoaded: boolean;
  error: string | null;
  onRefresh: () => void;
  onDownloadPdf: (pathname: string) => void;
  onDownloadExcel: (pathname: string) => void;
};

function formatDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

export function BillArtifactsPanel({
  artifacts,
  isLoading,
  hasLoaded,
  error,
  onRefresh,
  onDownloadPdf,
  onDownloadExcel,
}: BillArtifactsPanelProps) {
  return (
    <Card className="vercel-panel">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle className="vercel-title">Saved files</CardTitle>
          <p className="text-sm text-muted-foreground">Blob PDF/XLSX artifacts</p>
        </div>
        <Button variant="outline" size="sm" onClick={onRefresh}>
          <RefreshCcw className="h-3.5 w-3.5" />
          {hasLoaded ? "Refresh" : "Load files"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {isLoading && <p className="text-sm text-muted-foreground">Loading files...</p>}

        {!isLoading && !hasLoaded && !error && (
          <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            Files are not loaded yet. Tap &quot;Load files&quot;.
          </p>
        )}

        {!isLoading && hasLoaded && artifacts.length === 0 && !error && (
          <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            No cloud artifacts saved yet.
          </p>
        )}

        {!isLoading && artifacts.length > 0 && (
          <div className="space-y-3">
            {artifacts.map((artifact) => (
              <div key={artifact.manifestPathname} className="rounded-md border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{artifact.title}</p>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(artifact.generatedAt)}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onDownloadPdf(artifact.pdfPathname)}
                  >
                    <Download className="h-3.5 w-3.5" />
                    PDF
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onDownloadExcel(artifact.excelPathname)}
                  >
                    <Download className="h-3.5 w-3.5" />
                    Excel
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
