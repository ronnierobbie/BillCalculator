import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

type BillExportActionsProps = {
  disabled: boolean;
  isPdfExporting: boolean;
  isExcelExporting: boolean;
  onExportPdf: () => void;
  onExportExcel: () => void;
};

export function BillExportActions({
  disabled,
  isPdfExporting,
  isExcelExporting,
  onExportPdf,
  onExportExcel,
}: BillExportActionsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="outline"
        onClick={onExportExcel}
        disabled={disabled || isExcelExporting}
      >
        <Download className="h-4 w-4" />
        {isExcelExporting ? "Exporting..." : "Export Excel"}
      </Button>
      <Button onClick={onExportPdf} disabled={disabled || isPdfExporting}>
        <Download className="h-4 w-4" />
        {isPdfExporting ? "Exporting..." : "Export PDF"}
      </Button>
    </div>
  );
}
