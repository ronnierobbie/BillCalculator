"use client";

import { useEffect, useMemo, useState } from "react";
import { BillInput, BillResult } from "@/types/bill";
import { calculateBill } from "@/lib/calculator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select-native";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calculator, Download, Moon, RefreshCcw, Sun } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as ExcelJS from "exceljs";

const STATES = ["Punjab", "Haryana", "Chandigarh"] as const;

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
  const [paidType, setPaidType] = useState<"Collectively" | "Per State">(
    "Collectively"
  );
  const [totalPaid, setTotalPaid] = useState<number>(0);
  const [isDark, setIsDark] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const totalQuantity = useMemo(
    () => form.quantities.reduce((a, b) => a + b, 0),
    [form.quantities]
  );
  const totalPenalties = useMemo(
    () => form.penalties.reduce((a, b) => a + b, 0),
    [form.penalties]
  );
  const numberFormatter = useMemo(
    () =>
      new Intl.NumberFormat("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    []
  );

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDark]);

  const effectiveAlreadyPaid = useMemo(() => {
    if (alreadyLying === "No") {
      return [0, 0, 0] as [number, number, number];
    }

    if (paidType === "Collectively") {
      if (totalQuantity === 0) {
        return [0, 0, 0] as [number, number, number];
      }

      return form.quantities.map((q) =>
        Number(((totalPaid * q) / totalQuantity).toFixed(2))
      ) as [number, number, number];
    }

    return form.alreadyPaid;
  }, [alreadyLying, paidType, form.alreadyPaid, form.quantities, totalPaid, totalQuantity]);

  const alreadyPaidDesc = useMemo(() => {
    const hasNonZero = effectiveAlreadyPaid.some((amount) => amount > 0);

    if (alreadyLying === "No" || !hasNonZero) {
      return "Amount already available with HARTRON";
    }

    const parts = STATES.map((state, i) =>
      effectiveAlreadyPaid[i] > 0
        ? `${state}: ${effectiveAlreadyPaid[i].toFixed(2)}`
        : null
    ).filter(Boolean);

    return `Amount already available with HARTRON (${parts.join(", ")})`;
  }, [alreadyLying, effectiveAlreadyPaid]);

  const totalAlreadyPaid = useMemo(
    () => effectiveAlreadyPaid.reduce((a, b) => a + b, 0),
    [effectiveAlreadyPaid]
  );

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

    if (field === "quantities" && validationError) {
      setValidationError(null);
    }
  };

  const handleCalculate = () => {
    if (totalQuantity === 0) {
      setValidationError("Total quantity cannot be zero.");
      setResult(null);
      return;
    }
    setValidationError(null);
    setResult(
      calculateBill({
        ...form,
        alreadyPaid: effectiveAlreadyPaid,
        alreadyPaidDesc,
      })
    );
  };

  const handleReset = () => {
    setForm(INITIAL_STATE);
    setResult(null);
    setAlreadyLying("No");
    setPaidType("Collectively");
    setTotalPaid(0);
    setValidationError(null);
  };

  const downloadPDF = () => {
    if (!result) return;
    const doc = new jsPDF();

    doc.setFontSize(14);
    doc.text("HARTRON Bill Details", 14, 15);

    const tableData = result.rows.map((row) => [
      row.sr,
      row.description,
      row.values[0].toFixed(2),
      row.values[1].toFixed(2),
      row.values[2].toFixed(2),
      row.total.toFixed(2),
    ]);

    autoTable(doc, {
      head: [["Sr.", "Item Description", "Punjab", "Haryana", "Chandigarh", "Total"]],
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
    const worksheet = workbook.addWorksheet("Bill");

    worksheet.columns = [
      { header: "Sr.", key: "sr", width: 10 },
      { header: "Item Description", key: "desc", width: 60 },
      { header: "(A) Punjab", key: "punjab", width: 15 },
      { header: "(B) Haryana", key: "haryana", width: 15 },
      { header: "(C) Chandigarh", key: "chandigarh", width: 15 },
      { header: "D = A+B+C", key: "total", width: 15 },
    ];

    result.rows.forEach((row) => {
      worksheet.addRow({
        sr: row.sr,
        desc: row.description,
        punjab: row.values[0],
        haryana: row.values[1],
        chandigarh: row.values[2],
        total: row.total,
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bill.xlsx";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
          <div className="flex h-7 w-7 items-center justify-center rounded-md border bg-foreground text-background">
            <Calculator className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">HARTRON Bill Calculator</p>
          </div>
          <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
            <span className="rounded-md border px-2 py-1">
              {form.entryType === "BV" ? "Base Value" : "Product Value"}
            </span>
            <span className="rounded-md border px-2 py-1">
              {form.projectFunding === "state" ? "State Govt." : "eCommittee"}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsDark(!isDark)}
            aria-label="Toggle theme"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:px-8">
        <aside className="hidden lg:block">
          <nav className="sticky top-20 space-y-1 text-sm">
            <a className="flex items-center justify-between rounded-md bg-accent px-3 py-2 font-medium" href="#inputs">
              Inputs
              <span className="text-xs text-muted-foreground">3 states</span>
            </a>
            <a className="flex items-center justify-between rounded-md px-3 py-2 text-muted-foreground hover:bg-accent hover:text-foreground" href="#payments">
              Payments
              <span className="text-xs">{alreadyLying}</span>
            </a>
            <a className="flex items-center justify-between rounded-md px-3 py-2 text-muted-foreground hover:bg-accent hover:text-foreground" href="#output">
              Output
              <span className="text-xs">{result ? "Ready" : "Draft"}</span>
            </a>
          </nav>
        </aside>

        <div className="min-w-0 space-y-6">
          <section className="flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-end sm:justify-between animate-[fade-in_0.35s_ease-out]">
            <div className="space-y-2">
              <p className="vercel-kicker">Billing workspace</p>
              <h1 className="text-3xl font-semibold sm:text-4xl">
                HARTRON Bill Calculator
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                Prepare state-wise quantities, penalties, and advance payments in a focused calculation console.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={handleReset}>
                <RefreshCcw className="h-4 w-4" />
                Reset
              </Button>
              <Button onClick={handleCalculate}>
                <Calculator className="h-4 w-4" />
                Calculate
              </Button>
            </div>
          </section>

          {validationError && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {validationError}
            </div>
          )}

          <section className="grid gap-3 sm:grid-cols-3">
            {[
              ["Total Quantity", totalQuantity.toString()],
              ["Penalties", numberFormatter.format(totalPenalties)],
              ["Already Paid", numberFormatter.format(totalAlreadyPaid)],
            ].map(([label, value]) => (
              <div key={label} className="vercel-panel p-4">
                <p className="vercel-kicker">{label}</p>
                <p className="mt-2 font-mono text-2xl font-semibold tabular-nums">
                  {value}
                </p>
              </div>
            ))}
          </section>

          <section
            id="inputs"
            className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px] animate-[slide-up_0.45s_ease-out]"
          >
            <div className="space-y-6">
              <Card className="vercel-panel">
                <CardHeader>
                  <CardTitle className="vercel-title">Project settings</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Core billing properties
                  </p>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <div className="vercel-field">
                    <Label className="text-sm text-muted-foreground">Input type</Label>
                    <Select
                      value={form.entryType}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          entryType: e.target.value as "BV" | "PV",
                        })
                      }
                    >
                      <option value="BV">Base Value (BV)</option>
                      <option value="PV">Product Value (PV)</option>
                    </Select>
                  </div>

                  <div className="vercel-field">
                    <Label className="text-sm text-muted-foreground">Value per unit</Label>
                    <Input
                      type="number"
                      min="0"
                      value={form.valuePerUnit}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          valuePerUnit: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>

                  <div className="vercel-field">
                    <Label className="text-sm text-muted-foreground">GST percentage</Label>
                    <Input
                      type="number"
                      min="0"
                      value={form.gstPercent}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          gstPercent: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>

                  <div className="vercel-field">
                    <Label className="text-sm text-muted-foreground">Project funding</Label>
                    <Select
                      value={form.projectFunding}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          projectFunding: e.target.value as "state" | "ecommittee",
                        })
                      }
                    >
                      <option value="state">State Govt. funded (4%)</option>
                      <option value="ecommittee">eCommittee Funded (2%)</option>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-6 md:grid-cols-2">
                <Card className="vercel-panel">
                  <CardHeader>
                    <CardTitle className="vercel-title">Quantities</CardTitle>
                    <p className="text-sm text-muted-foreground">State-wise supply</p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {STATES.map((state, i) => (
                      <div
                        key={state}
                        className="grid items-center gap-3 rounded-md px-1 py-1 transition hover:bg-accent sm:grid-cols-[1fr_132px]"
                      >
                        <Label className="text-sm text-muted-foreground">
                          {state}
                        </Label>
                        <Input
                          className="w-full text-right font-mono tabular-nums"
                          type="number"
                          min="0"
                          value={form.quantities[i]}
                          onChange={(e) =>
                            updateArrayField(
                              "quantities",
                              i,
                              parseFloat(e.target.value) || 0
                            )
                          }
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="vercel-panel">
                  <CardHeader>
                    <CardTitle className="vercel-title">Late penalties</CardTitle>
                    <p className="text-sm text-muted-foreground">Deductions by state</p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {STATES.map((state, i) => (
                      <div
                        key={state}
                        className="grid items-center gap-3 rounded-md px-1 py-1 transition hover:bg-accent sm:grid-cols-[1fr_132px]"
                      >
                        <Label className="text-sm text-muted-foreground">
                          {state}
                        </Label>
                        <Input
                          className="w-full text-right font-mono tabular-nums"
                          type="number"
                          min="0"
                          value={form.penalties[i]}
                          onChange={(e) =>
                            updateArrayField(
                              "penalties",
                              i,
                              parseFloat(e.target.value) || 0
                            )
                          }
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              <Card id="payments" className="vercel-panel">
                <CardHeader>
                  <CardTitle className="vercel-title">Advance payments</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Amount already available with HARTRON
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <Label className="text-sm text-muted-foreground">
                      Already lying with HARTRON
                    </Label>
                    <div className="vercel-segment">
                      {(["No", "Yes"] as const).map((value) => (
                        <label key={value} className="relative">
                          <input
                            type="radio"
                            name="alreadyLying"
                            className="peer sr-only"
                            checked={alreadyLying === value}
                            onChange={() => {
                              setAlreadyLying(value);
                              if (value === "No") {
                                setForm((prev) => ({
                                  ...prev,
                                  alreadyPaid: [0, 0, 0],
                                  alreadyPaidDesc:
                                    "Amount already available with HARTRON",
                                }));
                              }
                            }}
                          />
                          <span className="inline-flex h-8 min-w-14 items-center justify-center rounded-[5px] px-3 text-sm text-muted-foreground transition peer-checked:bg-foreground peer-checked:text-background">
                            {value}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {alreadyLying === "Yes" && (
                    <div className="space-y-4 border-t pt-4 animate-[fade-in_0.25s_ease-out]">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <Label className="text-sm text-muted-foreground">Payment mode</Label>
                        <div className="vercel-segment">
                          {(["Collectively", "Per State"] as const).map((value) => (
                            <label key={value} className="relative">
                              <input
                                type="radio"
                                name="paidType"
                                className="peer sr-only"
                                checked={paidType === value}
                                onChange={() => setPaidType(value)}
                              />
                              <span className="inline-flex h-8 items-center justify-center rounded-[5px] px-3 text-sm text-muted-foreground transition peer-checked:bg-foreground peer-checked:text-background">
                                {value}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {paidType === "Collectively" ? (
                        <div className="vercel-field">
                          <Label className="text-sm text-muted-foreground">
                            Total amount paid
                          </Label>
                          <Input
                            type="number"
                            value={totalPaid}
                            onChange={(e) =>
                              setTotalPaid(parseFloat(e.target.value) || 0)
                            }
                          />
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {STATES.map((state, i) => (
                            <div
                              key={state}
                              className="grid items-center gap-3 sm:grid-cols-[1fr_160px]"
                            >
                              <Label className="text-sm text-muted-foreground">
                                {state}
                              </Label>
                              <Input
                                className="w-full text-right font-mono tabular-nums"
                                type="number"
                                value={form.alreadyPaid[i]}
                                onChange={(e) =>
                                  updateArrayField(
                                    "alreadyPaid",
                                    i,
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6 xl:sticky xl:top-20 xl:self-start">
              <Card className="vercel-panel">
                <CardHeader>
                  <CardTitle className="vercel-title">Summary</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Current calculation state
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Input</span>
                      <span className="font-medium">
                        {form.entryType === "BV" ? "Base Value" : "Product Value"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Funding</span>
                      <span className="font-medium">
                        {form.projectFunding === "state" ? "State Govt." : "eCommittee"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">GST</span>
                      <span className="font-mono font-medium tabular-nums">
                        {form.gstPercent}%
                      </span>
                    </div>
                  </div>
                  <div className="grid gap-2 border-t pt-4">
                    <Button className="w-full justify-between" onClick={handleCalculate}>
                      Calculate bill
                      <Calculator className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-between"
                      onClick={handleReset}
                    >
                      Reset form
                      <RefreshCcw className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="vercel-panel">
                <CardHeader>
                  <CardTitle className="vercel-title">Formula notes</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Calculation reference
                  </p>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <p className="border-l-2 pl-3">Product total = Base value + GST on product.</p>
                  <p className="border-l-2 pl-3">Consultancy charges = Base value x funding rate.</p>
                  <p className="border-l-2 pl-3">Final payment = Total - deductions - penalties.</p>
                </CardContent>
              </Card>
            </div>
          </section>

          <section
            id="output"
            className="space-y-4 animate-[slide-up_0.45s_ease-out]"
            style={{ animationDelay: "90ms" }}
          >
            <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="vercel-kicker">Output</p>
                <h2 className="text-xl font-semibold">Bill breakdown</h2>
              </div>
              {result && (
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={downloadExcel}>
                    <Download className="h-4 w-4" />
                    Excel
                  </Button>
                  <Button onClick={downloadPDF}>
                    <Download className="h-4 w-4" />
                    PDF
                  </Button>
                </div>
              )}
            </div>

            {result ? (
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
                      const isHighlight =
                        row.sr === 7 || row.sr === 15 || row.sr === 16;
                      const isSection = row.sr === 8;
                      const rowClassName = isSection
                        ? "bg-muted/60 text-xs font-medium text-muted-foreground"
                        : isHighlight
                        ? "bg-accent font-semibold"
                        : "hover:bg-muted/45";

                      return (
                        <tr key={row.sr} className={`border-b last:border-b-0 ${rowClassName}`}>
                          <td className="px-4 py-3 text-center font-mono tabular-nums">
                            {row.sr}
                          </td>
                          <td className="max-w-sm px-4 py-3">
                            {row.description}
                          </td>
                          {row.values.map((value, i) => (
                            <td
                              key={i}
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
            ) : (
              <div className="vercel-panel flex min-h-40 items-center justify-center border-dashed p-6 text-center text-sm text-muted-foreground">
                No bill calculated yet.
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
