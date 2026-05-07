import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const STATES = ["Punjab", "Haryana", "Chandigarh"] as const;

type AdvancePaymentCardProps = {
  hasAdvanceAmount: "No" | "Yes";
  valueEnteredAs: "Collectively" | "Per State";
  totalPaid: number;
  alreadyPaid: [number, number, number];
  onHasAdvanceAmountChange: (value: "No" | "Yes") => void;
  onValueEnteredAsChange: (value: "Collectively" | "Per State") => void;
  onTotalPaidChange: (value: number) => void;
  onAlreadyPaidChange: (next: [number, number, number]) => void;
};

export function AdvancePaymentCard({
  hasAdvanceAmount,
  valueEnteredAs,
  totalPaid,
  alreadyPaid,
  onHasAdvanceAmountChange,
  onValueEnteredAsChange,
  onTotalPaidChange,
  onAlreadyPaidChange,
}: AdvancePaymentCardProps) {
  return (
    <Card className="vercel-panel">
      <CardHeader>
        <CardTitle className="vercel-title">Advance amount</CardTitle>
        <p className="text-sm text-muted-foreground">
          Amount already available with HARTRON?
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Label className="text-sm text-muted-foreground">Amount already available with HARTRON?</Label>
          <div className="vercel-segment">
            {(["No", "Yes"] as const).map((value) => (
              <label key={value} className="relative">
                <input
                  type="radio"
                  name="hasAdvanceAmount"
                  className="peer sr-only"
                  checked={hasAdvanceAmount === value}
                  onChange={() => onHasAdvanceAmountChange(value)}
                />
                <span className="inline-flex h-8 min-w-14 items-center justify-center rounded-[5px] px-3 text-sm text-muted-foreground transition peer-checked:bg-foreground peer-checked:text-background">
                  {value}
                </span>
              </label>
            ))}
          </div>
        </div>

        {hasAdvanceAmount === "Yes" && (
          <div className="space-y-4 border-t pt-4 animate-[fade-in_0.25s_ease-out]">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <Label className="text-sm text-muted-foreground">Value entered as</Label>
              <div className="vercel-segment">
                {(["Collectively", "Per State"] as const).map((value) => (
                  <label key={value} className="relative">
                    <input
                      type="radio"
                      name="valueEnteredAs"
                      className="peer sr-only"
                      checked={valueEnteredAs === value}
                      onChange={() => onValueEnteredAsChange(value)}
                    />
                    <span className="inline-flex h-8 items-center justify-center rounded-[5px] px-3 text-sm text-muted-foreground transition peer-checked:bg-foreground peer-checked:text-background">
                      {value}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {valueEnteredAs === "Collectively" ? (
              <div className="vercel-field">
                <Label className="text-sm text-muted-foreground">Advance amount</Label>
                <Input
                  type="number"
                  min="0"
                  value={totalPaid}
                  onChange={(event) => onTotalPaidChange(parseFloat(event.target.value) || 0)}
                />
              </div>
            ) : (
              <div className="space-y-3">
                {STATES.map((state, index) => (
                  <div
                    key={state}
                    className="grid items-center gap-3 sm:grid-cols-[1fr_160px]"
                  >
                    <Label className="text-sm text-muted-foreground">{state}</Label>
                    <Input
                      className="w-full text-right font-mono tabular-nums"
                      type="number"
                      min="0"
                      value={alreadyPaid[index]}
                      onChange={(event) => {
                        const next = [...alreadyPaid] as [number, number, number];
                        next[index] = parseFloat(event.target.value) || 0;
                        onAlreadyPaidChange(next);
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
