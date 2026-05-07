import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const STATES = ["Punjab", "Haryana", "Chandigarh"] as const;

type StateQuantitiesCardProps = {
  quantities: [number, number, number];
  onChange: (nextQuantities: [number, number, number]) => void;
};

export function StateQuantitiesCard({ quantities, onChange }: StateQuantitiesCardProps) {
  const updateAt = (index: number, value: number) => {
    const next = [...quantities] as [number, number, number];
    next[index] = Math.max(0, value);
    onChange(next);
  };

  return (
    <Card className="vercel-panel">
      <CardHeader>
        <CardTitle className="vercel-title">State quantities</CardTitle>
        <p className="text-sm text-muted-foreground">Total units supplied by state</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {STATES.map((state, index) => (
          <div
            key={state}
            className="grid items-center gap-3 rounded-md px-1 py-1 transition hover:bg-accent sm:grid-cols-[1fr_172px]"
          >
            <Label className="text-sm text-muted-foreground">{state}</Label>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                className="h-10 w-10 px-0"
                onClick={() => updateAt(index, quantities[index] - 1)}
                aria-label={`Decrease ${state} quantity`}
              >
                -
              </Button>
              <Input
                className="w-full text-right font-mono tabular-nums"
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                value={quantities[index]}
                onChange={(event) => {
                  updateAt(index, parseFloat(event.target.value) || 0);
                }}
              />
              <Button
                type="button"
                variant="outline"
                className="h-10 w-10 px-0"
                onClick={() => updateAt(index, quantities[index] + 1)}
                aria-label={`Increase ${state} quantity`}
              >
                +
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
