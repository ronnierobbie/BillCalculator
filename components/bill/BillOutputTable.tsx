import { BillResult } from "@/types/bill";

type BillOutputTableProps = {
  result: BillResult | null;
  numberFormatter: Intl.NumberFormat;
};

export function BillOutputTable({ result, numberFormatter }: BillOutputTableProps) {
  if (!result) {
    return (
      <div className="vercel-panel flex min-h-40 items-center justify-center border-dashed p-6 text-center text-sm text-muted-foreground">
        No bill calculated yet.
      </div>
    );
  }

  return (
    <div className="vercel-panel overflow-x-auto">
      <table className="w-full min-w-[780px] text-left text-sm">
        <thead className="border-b bg-muted/50 text-xs text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium">Sr.</th>
            <th className="px-4 py-3 font-medium">Item Description</th>
            <th className="px-4 py-3 text-right font-medium">Punjab</th>
            <th className="px-4 py-3 text-right font-medium">Haryana</th>
            <th className="px-4 py-3 text-right font-medium">Chandigarh</th>
            <th className="px-4 py-3 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {result.rows.map((row) => {
            const isHighlight = row.sr === 7 || row.sr === 15 || row.sr === 16;
            const isSection = row.sr === 8;
            const rowClassName = isSection
              ? "bg-muted/60 text-xs font-medium text-muted-foreground"
              : isHighlight
                ? "bg-accent font-semibold"
                : "hover:bg-muted/45";

            return (
              <tr key={row.sr} className={`border-b last:border-b-0 ${rowClassName}`}>
                <td className="px-4 py-3 text-center font-mono tabular-nums">{row.sr}</td>
                <td className="max-w-sm px-4 py-3">{row.description}</td>
                {row.values.map((value, index) => (
                  <td
                    key={`${row.sr}-${index}`}
                    className="px-4 py-3 text-right font-mono tabular-nums"
                  >
                    {isSection ? "-" : numberFormatter.format(value)}
                  </td>
                ))}
                <td className="px-4 py-3 text-right font-mono font-medium tabular-nums">
                  {isSection ? "-" : numberFormatter.format(row.total)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
