import { Calculator, RefreshCcw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BillInput, SavedBillStatus } from "@/types/bill";

type BillSummaryCardProps = {
  input: BillInput;
  totalQuantity: number;
  totalPenalties: number;
  totalAlreadyPaid: number;
  status: SavedBillStatus;
  hasUnsavedChanges: boolean;
  numberFormatter: Intl.NumberFormat;
  onCalculate: () => void;
  onReset: () => void;
  onSave: () => void;
};

export function BillSummaryCard({
  input,
  totalQuantity,
  totalPenalties,
  totalAlreadyPaid,
  status,
  hasUnsavedChanges,
  numberFormatter,
  onCalculate,
  onReset,
  onSave,
}: BillSummaryCardProps) {
  return (
    <Card className="vercel-panel">
      <CardHeader>
        <CardTitle className="vercel-title">Workspace summary</CardTitle>
        <p className="text-sm text-muted-foreground">Current calculation state</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Value entered as</span>
            <span className="font-medium">
              {input.entryType === "BV" ? "Base Value" : "Product Value"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Funding type</span>
            <span className="font-medium">
              {input.projectFunding === "state" ? "State Govt." : "eCommittee"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">GST</span>
            <span className="font-mono font-medium tabular-nums">{input.gstPercent}%</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Status</span>
            <span className="font-medium capitalize">{status}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 rounded-md border bg-muted/35 p-2 text-center text-xs">
            <div>
              <p className="text-muted-foreground">Qty</p>
              <p className="font-mono text-sm font-semibold">{totalQuantity}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Penalty</p>
              <p className="font-mono text-sm font-semibold">
                {numberFormatter.format(totalPenalties)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Advance</p>
              <p className="font-mono text-sm font-semibold">
                {numberFormatter.format(totalAlreadyPaid)}
              </p>
            </div>
          </div>
        </div>

        {hasUnsavedChanges && (
          <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
            Unsaved changes in the current bill.
          </div>
        )}

        <div className="grid gap-2 border-t pt-4">
          <Button className="w-full justify-between" onClick={onCalculate}>
            Calculate
            <Calculator className="h-4 w-4" />
          </Button>
          <Button variant="outline" className="w-full justify-between" onClick={onSave}>
            Save
            <Save className="h-4 w-4" />
          </Button>
          <Button variant="outline" className="w-full justify-between" onClick={onReset}>
            Reset
            <RefreshCcw className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
