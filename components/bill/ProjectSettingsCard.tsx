import { BillInput } from "@/types/bill";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select-native";

type ProjectSettingsCardProps = {
  input: BillInput;
  onChange: (nextInput: BillInput) => void;
};

export function ProjectSettingsCard({ input, onChange }: ProjectSettingsCardProps) {
  return (
    <Card className="vercel-panel">
      <CardHeader>
        <CardTitle className="vercel-title">Project settings</CardTitle>
        <p className="text-sm text-muted-foreground">Core billing properties</p>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="vercel-field">
          <Label className="text-sm text-muted-foreground">Value entered as</Label>
          <Select
            value={input.entryType}
            onChange={(event) =>
              onChange({
                ...input,
                entryType: event.target.value as BillInput["entryType"],
              })
            }
          >
            <option value="BV">Base Value</option>
            <option value="PV">Product Value</option>
          </Select>
        </div>

        <div className="vercel-field">
          <Label className="text-sm text-muted-foreground">
            {input.entryType === "BV" ? "Base Value" : "Product Value"} per unit
          </Label>
          <Input
            type="number"
            min="0"
            value={input.valuePerUnit}
            onChange={(event) =>
              onChange({
                ...input,
                valuePerUnit: parseFloat(event.target.value) || 0,
              })
            }
          />
        </div>

        <div className="vercel-field">
          <Label className="text-sm text-muted-foreground">GST percentage</Label>
          <Input
            type="number"
            min="0"
            value={input.gstPercent}
            onChange={(event) =>
              onChange({
                ...input,
                gstPercent: parseFloat(event.target.value) || 0,
              })
            }
          />
        </div>

        <div className="vercel-field">
          <Label className="text-sm text-muted-foreground">Funding type</Label>
          <Select
            value={input.projectFunding}
            onChange={(event) =>
              onChange({
                ...input,
                projectFunding: event.target.value as BillInput["projectFunding"],
              })
            }
          >
            <option value="state">State Govt. funded (4%)</option>
            <option value="ecommittee">eCommittee funded (2%)</option>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
