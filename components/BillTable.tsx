import { BillResult } from "@/types/bill";

interface Props {
  result: BillResult;
}

export default function BillTable({ result }: Props) {
  return (
    <div className="overflow-x-auto mt-8">
      <table className="border-collapse border w-full text-sm">
        <thead>
          <tr>
            <th className="border p-2">Sr.</th>
            <th className="border p-2">Item Description</th>
            <th className="border p-2">Punjab</th>
            <th className="border p-2">Haryana</th>
            <th className="border p-2">Chandigarh</th>
            <th className="border p-2">Total</th>
          </tr>
        </thead>
        <tbody>
          {result.rows.map(row => (
            <tr key={row.sr}>
              <td className="border p-2 text-center">{row.sr}</td>
              <td className="border p-2">{row.description}</td>
              {row.values.map((v, i) => (
                <td key={i} className="border p-2 text-right">
                  {v.toFixed(2)}
                </td>
              ))}
              <td className="border p-2 text-right">
                {row.total.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
