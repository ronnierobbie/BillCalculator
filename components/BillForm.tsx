"use client";

import { useState, useEffect } from "react";
import { BillInput, BillResult, BillRow } from "@/types/bill";
import { calculateBill } from "@/lib/calculator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select-native";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Calculator, Moon, Sun, RefreshCcw } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useTheme } from "next-themes";
import * as ExcelJS from "exceljs";

const INITIAL_STATE: BillInput = {
  entryType: "BV",
  valuePerUnit: 0,
  gstPercent: 18,
  projectFunding: "state",
  quantities: [0, 0, 0],
  penalties: [0, 0, 0],
  alreadyPaid: [0, 0, 0],
  alreadyPaidDesc: "Amount already available with HARTRON",
};

export default function BillForm() {
  const [form, setForm] = useState<BillInput>(INITIAL_STATE);
  const [result, setResult] = useState<BillResult | null>(null);
  const [alreadyLying, setAlreadyLying] = useState<"No" | "Yes">("No");
  const [paidType, setPaidType] = useState<"Collectively" | "Per State">("Collectively");
  const [totalPaid, setTotalPaid] = useState<number>(0);

  // Theme logic manually since we are not wrapping in provider yet in layout, 
  // but to keep it simple I will rely on class strategy or just default dark mode for 'vercel' feel.
  // Actually, I'll add a simple toggle.
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDark]);

  const updateArrayField = (
    field: "quantities" | "penalties" | "alreadyPaid",
    index: number,
    value: number
  ) => {
    setForm((prev) => {
      const updated = [...prev[field]] as [number, number, number];
      updated[index] = value;
      return { ...prev, [field]: updated };
    });
  };

  // Logic to distribute "Total Paid" if "Collectively" is selected
  useEffect(() => {
    if (alreadyLying === "Yes" && paidType === "Collectively") {
      const totalQuantity = form.quantities.reduce((a, b) => a + b, 0);
      if (totalQuantity > 0) {
        const newAlreadyPaid = form.quantities.map(q =>
          Number(((totalPaid * q) / totalQuantity).toFixed(2))
        ) as [number, number, number];

        setForm(prev => ({ ...prev, alreadyPaid: newAlreadyPaid }));
      } else {
        setForm(prev => ({ ...prev, alreadyPaid: [0, 0, 0] }));
      }
    }
  }, [totalPaid, form.quantities, paidType, alreadyLying]);

  // Logic to update description for "Already Paid"
  useEffect(() => {
    if (alreadyLying === "Yes") {
      const states = ['Punjab', 'Haryana', 'Chandigarh'];
      const paid = form.alreadyPaid;
      const hasNonZero = paid.some(p => p > 0);

      let newDesc = "Amount already available with HARTRON";
      if (hasNonZero) {
        const parts = states.map((s, i) => paid[i] > 0 ? `${s}: ${paid[i].toFixed(2)}` : null).filter(Boolean);
        newDesc = `Amount already available with HARTRON (${parts.join(", ")})`;
      }

      setForm(prev => {
        if (prev.alreadyPaidDesc !== newDesc) {
          return { ...prev, alreadyPaidDesc: newDesc };
        }
        return prev;
      });
    }
  }, [form.alreadyPaid[0], form.alreadyPaid[1], form.alreadyPaid[2], alreadyLying]);
  const handleCalculate = () => {
    const res = calculateBill(form);
    setResult(res);
  };

  const handleReset = () => {
    setForm(INITIAL_STATE);
    setResult(null);
    setAlreadyLying("No");
    setPaidType("Collectively");
    setTotalPaid(0);
  };

  const downloadPDF = () => {
    if (!result) return;
    const doc = new jsPDF();

    doc.setFontSize(14);
    doc.text("HARTRON Bill Details", 14, 15);

    const tableData = result.rows.map(row => [
      row.sr,
      row.description,
      row.values[0].toFixed(2),
      row.values[1].toFixed(2),
      row.values[2].toFixed(2),
      row.total.toFixed(2)
    ]);

    autoTable(doc, {
      head: [['Sr.', 'Item Description', 'Punjab', 'Haryana', 'Chandigarh', 'Total']],
      body: tableData,
      startY: 20,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [20, 20, 20] },
    });

    doc.save("bill.pdf");
  };

  const downloadExcel = async () => {
    if (!result) return;
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Bill');

    worksheet.columns = [
      { header: 'Sr.', key: 'sr', width: 10 },
      { header: 'Item Description', key: 'desc', width: 60 },
      { header: '(A) Punjab', key: 'punjab', width: 15 },
      { header: '(B) Haryana', key: 'haryana', width: 15 },
      { header: '(C) Chandigarh', key: 'chandigarh', width: 15 },
      { header: 'D = A+B+C', key: 'total', width: 15 },
    ];

    result.rows.forEach(row => {
      worksheet.addRow({
        sr: row.sr,
        desc: row.description,
        punjab: row.values[0],
        haryana: row.values[1],
        chandigarh: row.values[2],
        total: row.total
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bill.xlsx";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      {/* Header */}
      <header className="border-b sticky top-0 bg-background/80 backdrop-blur-md z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Calculator className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">HARTRON Bill Calculator</h1>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setIsDark(!isDark)}>
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">

        {/* Input Configuration Card */}
        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Input Type</Label>
              <Select
                value={form.entryType}
                onChange={(e) => setForm({ ...form, entryType: e.target.value as "BV" | "PV" })}
              >
                <option value="BV">Base Value (BV)</option>
                <option value="PV">Product Value (PV)</option>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Value per Unit</Label>
              <Input
                type="number"
                min="0"
                value={form.valuePerUnit}
                onChange={(e) => setForm({ ...form, valuePerUnit: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div className="space-y-2">
              <Label>GST Percentage (%)</Label>
              <Input
                type="number"
                min="0"
                value={form.gstPercent}
                onChange={(e) => setForm({ ...form, gstPercent: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div className="space-y-2">
              <Label>Project Funding</Label>
              <Select
                value={form.projectFunding}
                onChange={(e) => setForm({ ...form, projectFunding: e.target.value as "state" | "ecommittee" })}
              >
                <option value="state">State Govt. funded (4%)</option>
                <option value="ecommittee">eCommittee Funded (2%)</option>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Quantities & Penalties Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Quantities</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {["Punjab", "Haryana", "Chandigarh"].map((state, i) => (
                <div key={state} className="grid grid-cols-3 gap-4 items-center">
                  <Label className="col-span-1">{state}</Label>
                  <Input
                    className="col-span-2"
                    type="number"
                    min="0"
                    value={form.quantities[i]}
                    onChange={(e) => updateArrayField("quantities", i, parseFloat(e.target.value) || 0)}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Late Penalties</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {["Punjab", "Haryana", "Chandigarh"].map((state, i) => (
                <div key={state} className="grid grid-cols-3 gap-4 items-center">
                  <Label className="col-span-1">{state}</Label>
                  <Input
                    className="col-span-2"
                    type="number"
                    min="0"
                    value={form.penalties[i]}
                    onChange={(e) => updateArrayField("penalties", i, parseFloat(e.target.value) || 0)}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Advanced Payment Section */}
        <Card>
          <CardHeader>
            <CardTitle>Advanced Payments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Is any amount already lying with HARTRON?</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="alreadyLying"
                    checked={alreadyLying === "Yes"}
                    onChange={() => setAlreadyLying("Yes")}
                    className="accent-primary"
                  /> Yes
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="alreadyLying"
                    checked={alreadyLying === "No"}
                    onChange={() => {
                      setAlreadyLying("No");
                      setForm(prev => ({ ...prev, alreadyPaid: [0, 0, 0], alreadyPaidDesc: "Amount already available with HARTRON" }));
                    }}
                    className="accent-primary"
                  /> No
                </label>
              </div>
            </div>

            {alreadyLying === "Yes" && (
              <div className="p-4 rounded-lg bg-muted/50 border space-y-4 animate-in fade-in slide-in-from-top-2">
                <div className="space-y-2">
                  <Label>Payment Mode</Label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="paidType"
                        checked={paidType === "Collectively"}
                        onChange={() => setPaidType("Collectively")}
                        className="accent-primary"
                      /> Collectively
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="paidType"
                        checked={paidType === "Per State"}
                        onChange={() => setPaidType("Per State")}
                        className="accent-primary"
                      /> Per State
                    </label>
                  </div>
                </div>

                {paidType === "Collectively" ? (
                  <div className="space-y-2">
                    <Label>Total Amount Paid</Label>
                    <Input
                      type="number"
                      value={totalPaid}
                      onChange={(e) => setTotalPaid(parseFloat(e.target.value) || 0)}
                    />
                    <p className="text-xs text-muted-foreground">Amount will be distributed based on quantity ratio.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {["Punjab", "Haryana", "Chandigarh"].map((state, i) => (
                      <div key={state} className="grid grid-cols-3 gap-4 items-center">
                        <Label className="col-span-1">{state}</Label>
                        <Input
                          className="col-span-2"
                          type="number"
                          value={form.alreadyPaid[i]}
                          onChange={(e) => updateArrayField("alreadyPaid", i, parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-end">
          <Button variant="outline" onClick={handleReset} className="gap-2">
            <RefreshCcw className="w-4 h-4" /> Reset
          </Button>
          <Button size="lg" onClick={handleCalculate} className="gap-2">
            <Calculator className="w-4 h-4" /> Calculate Bill
          </Button>
        </div>

        {/* Results Section */}
        {result && (
          <Card className="animate-in fade-in slide-in-from-bottom-4">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Bill Breakdown</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={downloadExcel} className="gap-2">
                  <Download className="w-4 h-4" /> Excel
                </Button>
                <Button variant="default" size="sm" onClick={downloadPDF} className="gap-2">
                  <Download className="w-4 h-4" /> PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted text-muted-foreground text-xs uppercase">
                    <tr>
                      <th className="px-4 py-3 font-medium">Sr.</th>
                      <th className="px-4 py-3 font-medium">Item Description</th>
                      <th className="px-4 py-3 font-medium text-right">Punjab</th>
                      <th className="px-4 py-3 font-medium text-right">Haryana</th>
                      <th className="px-4 py-3 font-medium text-right">Chandigarh</th>
                      <th className="px-4 py-3 font-medium text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows.map((row, idx) => (
                      <tr
                        key={row.sr}
                        className={`border-t hover:bg-muted/50 transition-colors ${
                          // Highlight critical rows like Total or Payment
                          (row.sr === 7 || row.sr === 15 || row.sr === 16)
                            ? "bg-primary/5 font-semibold"
                            : ""
                          }`}
                      >
                        <td className="px-4 py-3 text-center">{row.sr}</td>
                        <td className="px-4 py-3 max-w-xs">{row.description}</td>
                        {row.values.map((v, i) => (
                          <td key={i} className="px-4 py-3 text-right tabular-nums">
                            {v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        ))}
                        <td className="px-4 py-3 text-right tabular-nums font-medium">
                          {row.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

      </main>
    </div>
  );
}
