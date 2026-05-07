import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BillMetadata } from "@/types/bill";

type BillMetadataCardProps = {
  metadata: BillMetadata;
  onChange: (nextMetadata: BillMetadata) => void;
};

export function BillMetadataCard({ metadata, onChange }: BillMetadataCardProps) {
  return (
    <Card className="vercel-panel">
      <CardHeader>
        <CardTitle className="vercel-title">Bill identity</CardTitle>
        <p className="text-sm text-muted-foreground">Metadata for saved history and exports</p>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="vercel-field">
          <Label className="text-sm text-muted-foreground">Bill title</Label>
          <Input
            value={metadata.title}
            onChange={(event) =>
              onChange({
                ...metadata,
                title: event.target.value,
              })
            }
            placeholder="Quarterly Hardware Bill"
          />
        </div>

        <div className="vercel-field">
          <Label className="text-sm text-muted-foreground">Bill date</Label>
          <Input
            type="date"
            value={metadata.billDate}
            onChange={(event) =>
              onChange({
                ...metadata,
                billDate: event.target.value,
              })
            }
          />
        </div>

        <div className="vercel-field">
          <Label className="text-sm text-muted-foreground">Reference number / work order reference</Label>
          <Input
            value={metadata.referenceNumber}
            onChange={(event) =>
              onChange({
                ...metadata,
                referenceNumber: event.target.value,
              })
            }
            placeholder="WO-2026-042"
          />
        </div>

        <div className="vercel-field">
          <Label className="text-sm text-muted-foreground">Prepared by</Label>
          <Input
            value={metadata.preparedBy}
            onChange={(event) =>
              onChange({
                ...metadata,
                preparedBy: event.target.value,
              })
            }
            placeholder="Name / Team"
          />
        </div>

        <div className="grid gap-2">
          <Label className="text-sm text-muted-foreground">Notes</Label>
          <textarea
            value={metadata.notes}
            onChange={(event) =>
              onChange({
                ...metadata,
                notes: event.target.value,
              })
            }
            className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm shadow-black/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            placeholder="Optional internal notes"
          />
        </div>
      </CardContent>
    </Card>
  );
}
