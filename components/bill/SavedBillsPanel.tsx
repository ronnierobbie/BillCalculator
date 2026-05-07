import { Copy, FolderOpen, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select-native";
import { SavedBill, SavedBillStatus } from "@/types/bill";

type SavedBillsPanelProps = {
  savedBills: SavedBill[];
  activeBillId: string | null;
  isStorageReady: boolean;
  hasUnsavedChanges: boolean;
  onOpen: (billId: string) => void;
  onDuplicate: (billId: string) => void;
  onRename: (billId: string) => void;
  onDelete: (billId: string) => void;
  onStatusChange: (billId: string, status: SavedBillStatus) => void;
};

function formatUpdatedDate(timestamp: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

function getTotalQuantity(savedBill: SavedBill): number {
  const quantityRow = savedBill.result.rows.find((row) => row.sr === 1);
  return quantityRow ? quantityRow.total : 0;
}

function getFinalPaymentTotal(savedBill: SavedBill): number {
  const paymentRow = savedBill.result.rows.find((row) => row.sr === 15);
  return paymentRow ? paymentRow.total : 0;
}

function formatFunding(projectFunding: SavedBill["input"]["projectFunding"]): string {
  return projectFunding === "state" ? "State Govt." : "eCommittee";
}

export function SavedBillsPanel({
  savedBills,
  activeBillId,
  isStorageReady,
  hasUnsavedChanges,
  onOpen,
  onDuplicate,
  onRename,
  onDelete,
  onStatusChange,
}: SavedBillsPanelProps) {
  return (
    <Card className="vercel-panel">
      <CardHeader>
        <CardTitle className="vercel-title">Saved bills</CardTitle>
        <p className="text-sm text-muted-foreground">
          Local history stored in this browser only
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {!isStorageReady && (
          <p className="text-sm text-muted-foreground">Loading saved bills...</p>
        )}

        {isStorageReady && savedBills.length === 0 && (
          <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            No saved bills yet. Calculate and save your current bill to start a history.
          </p>
        )}

        {isStorageReady && savedBills.length > 0 && (
          <div className="space-y-3">
            {savedBills.map((savedBill) => {
              const isActive = savedBill.id === activeBillId;
              return (
                <div
                  key={savedBill.id}
                  className={`rounded-md border p-3 ${
                    isActive ? "border-foreground/30 bg-accent/50" : "border-border"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold">{savedBill.title}</h3>
                    <Select
                      className="h-8 min-w-24 text-xs"
                      value={savedBill.status}
                      onChange={(event) =>
                        onStatusChange(savedBill.id, event.target.value as SavedBillStatus)
                      }
                    >
                      <option value="draft">Draft</option>
                      <option value="final">Final</option>
                    </Select>
                  </div>

                  <div className="mt-2 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                    <p>Updated: {formatUpdatedDate(savedBill.updatedAt)}</p>
                    <p>Funding: {formatFunding(savedBill.input.projectFunding)}</p>
                    <p>Total quantity: {getTotalQuantity(savedBill).toFixed(2)}</p>
                    <p>Final payment: {getFinalPaymentTotal(savedBill).toFixed(2)}</p>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => onOpen(savedBill.id)}>
                      <FolderOpen className="h-3.5 w-3.5" />
                      Open
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => onDuplicate(savedBill.id)}>
                      <Copy className="h-3.5 w-3.5" />
                      Duplicate
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => onRename(savedBill.id)}>
                      <Pencil className="h-3.5 w-3.5" />
                      Rename
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => onDelete(savedBill.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </Button>
                  </div>

                  {isActive && hasUnsavedChanges && (
                    <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                      Open bill has unsaved changes.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
