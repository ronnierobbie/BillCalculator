import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const STATES = ["Punjab", "Haryana", "Chandigarh"] as const;

type PenaltiesCardProps = {
  penalties: [number, number, number];
  onChange: (nextPenalties: [number, number, number]) => void;
};

export function PenaltiesCard({ penalties, onChange }: PenaltiesCardProps) {
  return (
    <Card className="vercel-panel">
      <CardHeader>
        <CardTitle className="vercel-title">State-wise penalty</CardTitle>
        <p className="text-sm text-muted-foreground">Late delivery / installation deductions</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {STATES.map((state, index) => (
          <div
            key={state}
            className="grid items-center gap-3 rounded-md px-1 py-1 transition hover:bg-accent sm:grid-cols-[1fr_132px]"
          >
            <Label className="text-sm text-muted-foreground">{state}</Label>
            <Input
              className="w-full text-right font-mono tabular-nums"
              type="number"
              min="0"
              value={penalties[index]}
              onChange={(event) => {
                const next = [...penalties] as [number, number, number];
                next[index] = parseFloat(event.target.value) || 0;
                onChange(next);
              }}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
