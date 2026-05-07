import { useMemo, useState } from "react";
import { Copy, FolderOpen, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select-native";
import { SavedBill, SavedBillStatus } from "@/types/bill";

type SavedBillsPanelProps = {
  savedBills: SavedBill[];
  activeBillId: string | null;
  isStorageReady: boolean;
  hasUnsavedChanges: boolean;
  onOpen: (billId: string) => void;
  onDuplicate: (billId: string) => void;
  onEditDetails: (billId: string, details: { title: string; notes: string }) => void;
  onDelete: (billId: string) => void;
  onStatusChange: (billId: string, status: SavedBillStatus) => void;
};

type SortMode =
  | "updated-desc"
  | "updated-asc"
  | "title-asc"
  | "title-desc"
  | "payment-desc"
  | "payment-asc";

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

function sortSavedBills(bills: SavedBill[], sortMode: SortMode): SavedBill[] {
  return [...bills].sort((a, b) => {
    switch (sortMode) {
      case "updated-asc":
        return a.updatedAt.localeCompare(b.updatedAt);
      case "updated-desc":
        return b.updatedAt.localeCompare(a.updatedAt);
      case "title-asc":
        return a.title.localeCompare(b.title);
      case "title-desc":
        return b.title.localeCompare(a.title);
      case "payment-asc":
        return getFinalPaymentTotal(a) - getFinalPaymentTotal(b);
      case "payment-desc":
        return getFinalPaymentTotal(b) - getFinalPaymentTotal(a);
      default:
        return 0;
    }
  });
}

export function SavedBillsPanel({
  savedBills,
  activeBillId,
  isStorageReady,
  hasUnsavedChanges,
  onOpen,
  onDuplicate,
  onEditDetails,
  onDelete,
  onStatusChange,
}: SavedBillsPanelProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | SavedBillStatus>("all");
  const [sortMode, setSortMode] = useState<SortMode>("updated-desc");
  const [editingBillId, setEditingBillId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftNotes, setDraftNotes] = useState("");

  const filteredBills = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    const baseFiltered = savedBills.filter((bill) => {
      if (statusFilter !== "all" && bill.status !== statusFilter) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const searchable = [
        bill.title,
        bill.metadata.referenceNumber,
        bill.metadata.preparedBy,
        bill.metadata.notes,
        bill.input.projectFunding,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(normalizedSearch);
    });

    return sortSavedBills(baseFiltered, sortMode);
  }, [savedBills, searchTerm, statusFilter, sortMode]);

  const beginEdit = (bill: SavedBill) => {
    setEditingBillId(bill.id);
    setDraftTitle(bill.title);
    setDraftNotes(bill.metadata.notes || bill.notes || "");
  };

  const cancelEdit = () => {
    setEditingBillId(null);
    setDraftTitle("");
    setDraftNotes("");
  };

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
          <>
            <div className="grid gap-2 rounded-md border p-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label className="text-xs text-muted-foreground">Search saved bills</Label>
                <Input
                  data-testid="saved-bill-search"
                  placeholder="Search title, reference, prepared by"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Filter status</Label>
                <Select
                  data-testid="saved-bill-filter-status"
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value as "all" | SavedBillStatus)
                  }
                >
                  <option value="all">All</option>
                  <option value="draft">Draft</option>
                  <option value="final">Final</option>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Sort by</Label>
                <Select
                  data-testid="saved-bill-sort"
                  value={sortMode}
                  onChange={(event) => setSortMode(event.target.value as SortMode)}
                >
                  <option value="updated-desc">Updated (Newest first)</option>
                  <option value="updated-asc">Updated (Oldest first)</option>
                  <option value="title-asc">Title (A to Z)</option>
                  <option value="title-desc">Title (Z to A)</option>
                  <option value="payment-desc">Final payment (High to low)</option>
                  <option value="payment-asc">Final payment (Low to high)</option>
                </Select>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Showing {filteredBills.length} of {savedBills.length}
            </p>

            {filteredBills.length === 0 ? (
              <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                No saved bills match the current search/filter.
              </p>
            ) : (
              <div className="space-y-3">
                {filteredBills.map((savedBill) => {
                  const isActive = savedBill.id === activeBillId;
                  const isEditing = editingBillId === savedBill.id;

                  return (
                    <div
                      key={savedBill.id}
                      data-testid={`saved-bill-card-${savedBill.id}`}
                      className={`rounded-md border p-3 ${
                        isActive ? "border-foreground/30 bg-accent/50" : "border-border"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        {isEditing ? (
                          <Input
                            data-testid={`saved-bill-edit-title-${savedBill.id}`}
                            value={draftTitle}
                            onChange={(event) => setDraftTitle(event.target.value)}
                            className="h-8 text-sm"
                          />
                        ) : (
                          <h3 className="text-sm font-semibold">{savedBill.title}</h3>
                        )}

                        <Select
                          className="h-8 min-w-24 text-xs"
                          data-testid={`saved-bill-status-${savedBill.id}`}
                          value={savedBill.status}
                          onChange={(event) =>
                            onStatusChange(savedBill.id, event.target.value as SavedBillStatus)
                          }
                        >
                          <option value="draft">Draft</option>
                          <option value="final">Final</option>
                        </Select>
                      </div>

                      {isEditing && (
                        <div className="mt-2 space-y-2">
                          <textarea
                            data-testid={`saved-bill-edit-notes-${savedBill.id}`}
                            value={draftNotes}
                            onChange={(event) => setDraftNotes(event.target.value)}
                            className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm shadow-black/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            placeholder="Notes"
                          />
                          <div className="flex gap-2">
                            <Button
                              data-testid={`saved-bill-save-edit-${savedBill.id}`}
                              size="sm"
                              onClick={() => {
                                onEditDetails(savedBill.id, {
                                  title: draftTitle,
                                  notes: draftNotes,
                                });
                                cancelEdit();
                              }}
                            >
                              Save edits
                            </Button>
                            <Button size="sm" variant="outline" onClick={cancelEdit}>
                              <X className="h-3.5 w-3.5" />
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}

                      <div className="mt-2 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                        <p>Updated: {formatUpdatedDate(savedBill.updatedAt)}</p>
                        <p>Funding: {formatFunding(savedBill.input.projectFunding)}</p>
                        <p>Total quantity: {getTotalQuantity(savedBill).toFixed(2)}</p>
                        <p>Final payment: {getFinalPaymentTotal(savedBill).toFixed(2)}</p>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          data-testid={`saved-bill-open-${savedBill.id}`}
                          size="sm"
                          variant="outline"
                          onClick={() => onOpen(savedBill.id)}
                        >
                          <FolderOpen className="h-3.5 w-3.5" />
                          Open
                        </Button>
                        <Button
                          data-testid={`saved-bill-duplicate-${savedBill.id}`}
                          size="sm"
                          variant="outline"
                          onClick={() => onDuplicate(savedBill.id)}
                        >
                          <Copy className="h-3.5 w-3.5" />
                          Duplicate
                        </Button>
                        <Button
                          data-testid={`saved-bill-edit-${savedBill.id}`}
                          size="sm"
                          variant="outline"
                          onClick={() => beginEdit(savedBill)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </Button>
                        <Button
                          data-testid={`saved-bill-delete-${savedBill.id}`}
                          size="sm"
                          variant="outline"
                          onClick={() => onDelete(savedBill.id)}
                        >
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
          </>
        )}
      </CardContent>
    </Card>
  );
}
