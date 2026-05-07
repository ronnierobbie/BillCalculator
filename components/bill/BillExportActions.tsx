import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

type BillExportActionsProps = {
  disabled: boolean;
  isPdfExporting: boolean;
  isExcelExporting: boolean;
  isCloudSaving: boolean;
  onDownloadPdf: () => void;
  onDownloadExcel: () => void;
  onSaveCloud: () => void;
  onOpenSavedFiles: () => void;
};

export function BillExportActions({
  disabled,
  isPdfExporting,
  isExcelExporting,
  isCloudSaving,
  onDownloadPdf,
  onDownloadExcel,
  onSaveCloud,
  onOpenSavedFiles,
}: BillExportActionsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="outline"
        onClick={onDownloadExcel}
        disabled={disabled || isExcelExporting}
      >
        <Download className="h-4 w-4" />
        {isExcelExporting ? "Exporting..." : "Download Excel"}
      </Button>
      <Button onClick={onDownloadPdf} disabled={disabled || isPdfExporting}>
        <Download className="h-4 w-4" />
        {isPdfExporting ? "Exporting..." : "Download PDF"}
      </Button>
      <Button variant="outline" onClick={onSaveCloud} disabled={disabled || isCloudSaving}>
        <Download className="h-4 w-4" />
        {isCloudSaving ? "Saving..." : "Save PDF & Excel"}
      </Button>
      <Button variant="outline" onClick={onOpenSavedFiles}>
        Saved files
      </Button>
    </div>
  );
}
