"use client";

import { useEffect, useMemo, useState } from "react";
import { BillInput, BillResult } from "@/types/bill";
import { calculateBill } from "@/lib/calculator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select-native";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BookOpen,
  Calculator,
  ClipboardList,
  Download,
  FileText,
  LayoutGrid,
  Menu,
  Moon,
  RefreshCcw,
  Search,
  Settings,
  Sun,
} from "lucide-react";
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

const NAV_ITEMS = [
  { label: "Dashboard", icon: LayoutGrid },
  { label: "Bills", icon: FileText },
  { label: "Templates", icon: BookOpen },
  { label: "Audit Log", icon: ClipboardList },
  { label: "Settings", icon: Settings },
];

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
  const totalAlreadyPaid = useMemo(
    () => form.alreadyPaid.reduce((a, b) => a + b, 0),
    [form.alreadyPaid]
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

  useEffect(() => {
    if (validationError && totalQuantity > 0) {
      setValidationError(null);
    }
  }, [totalQuantity, validationError]);

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

  useEffect(() => {
    if (alreadyLying === "Yes" && paidType === "Collectively") {
      if (totalQuantity > 0) {
        const newAlreadyPaid = form.quantities.map((q) =>
          Number(((totalPaid * q) / totalQuantity).toFixed(2))
        ) as [number, number, number];
        setForm((prev) => ({ ...prev, alreadyPaid: newAlreadyPaid }));
      } else {
        setForm((prev) => ({ ...prev, alreadyPaid: [0, 0, 0] }));
      }
    }
  }, [totalPaid, form.quantities, paidType, alreadyLying, totalQuantity]);

  useEffect(() => {
    if (alreadyLying === "Yes") {
      const paid = form.alreadyPaid;
      const hasNonZero = paid.some((amount) => amount > 0);

      let newDesc = "Amount already available with HARTRON";
      if (hasNonZero) {
        const parts = STATES.map((state, i) =>
          paid[i] > 0 ? `${state}: ${paid[i].toFixed(2)}` : null
        ).filter(Boolean);
        newDesc = `Amount already available with HARTRON (${parts.join(", ")})`;
      }

      setForm((prev) => {
        if (prev.alreadyPaidDesc !== newDesc) {
          return { ...prev, alreadyPaidDesc: newDesc };
        }
        return prev;
      });
    }
  }, [form.alreadyPaid, alreadyLying]);

  const handleCalculate = () => {
    if (totalQuantity === 0) {
      setValidationError("Total quantity cannot be zero.");
      setResult(null);
      return;
    }
    setValidationError(null);
    setResult(calculateBill(form));
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
    <div className="relative min-h-screen text-foreground">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-24 -left-24 h-[420px] w-[420px] rounded-full bg-amber-200/50 blur-3xl" />
        <div className="absolute top-12 right-[-140px] h-[360px] w-[360px] rounded-full bg-sky-200/40 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.85),_transparent_60%)]" />
        <div className="absolute inset-0 opacity-30 [background-size:24px_24px] [background-image:linear-gradient(transparent_23px,rgba(0,0,0,0.04)_24px),linear-gradient(90deg,transparent_23px,rgba(0,0,0,0.04)_24px)]" />
      </div>

      <div className="flex min-h-screen">
        <aside className="hidden w-72 flex-col border-r bg-background/70 backdrop-blur lg:flex">
          <div className="flex items-center justify-between border-b px-4 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-200/70 text-sm font-semibold text-amber-900">
                HC
              </div>
              <div>
                <p className="text-sm font-semibold">Hartron Ops</p>
                <p className="text-xs text-muted-foreground">eCourt Workspace</p>
              </div>
            </div>
          </div>
          <div className="flex-1 px-3 py-4">
            <p className="notion-kicker px-3 pb-3">Workspace</p>
            <nav className="space-y-1">
              {NAV_ITEMS.map((item) => {
                const isActive = item.label === "Bills";
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                      isActive
                        ? "bg-muted/80 font-semibold text-foreground"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                    }`}
                    type="button"
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
          <div className="px-4 pb-6">
            <div className="rounded-xl border bg-card/80 p-3 text-xs text-muted-foreground">
              Syncing to HARTRON billing templates and approval flows.
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b bg-background/75 backdrop-blur">
            <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div className="flex-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Workspace</span>
                  <span>/</span>
                  <span>Billing</span>
                  <span>/</span>
                  <span className="text-foreground">Bill Calculator</span>
                </div>
                <div className="text-sm font-medium">
                  HARTRON Bill Calculator
                </div>
              </div>
              <div className="hidden items-center gap-2 md:flex">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="w-56 pl-9"
                    placeholder="Search pages..."
                    type="search"
                  />
                </div>
              </div>
              <Button variant="outline" className="hidden sm:inline-flex">
                Share
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsDark(!isDark)}
                aria-label="Toggle theme"
              >
                {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
            </div>
          </header>

          <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-4 pb-16 pt-8 sm:px-6 lg:px-8">
            <section className="relative overflow-hidden rounded-3xl border bg-card/90 p-6 shadow-sm sm:p-8 animate-[fade-in_0.6s_ease-out]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.9),_transparent_60%)]" />
              <div className="relative flex flex-col gap-6">
                <p className="notion-kicker">Hartron Billing Hub</p>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-200/80 bg-amber-200/70 text-amber-900">
                      <Calculator className="h-6 w-6" />
                    </div>
                    <div>
                      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                        HARTRON Bill Calculator
                      </h1>
                      <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                        A focused workspace for Hartron billing that mirrors a
                        Notion-style flow, with structured properties and a clean
                        breakdown table.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="rounded-full border bg-background/70 px-3 py-1">
                      Entry: {form.entryType === "BV" ? "Base Value" : "Product Value"}
                    </span>
                    <span className="rounded-full border bg-background/70 px-3 py-1">
                      Funding: {form.projectFunding === "state" ? "State Govt." : "eCommittee"}
                    </span>
                    <span className="rounded-full border bg-background/70 px-3 py-1">
                      GST: {form.gstPercent}%
                    </span>
                  </div>
                </div>
              </div>
            </section>

            <section
              className="grid gap-6 lg:grid-cols-[1.55fr_0.9fr] animate-[slide-up_0.6s_ease-out]"
              style={{ animationDelay: "120ms" }}
            >
              <div className="space-y-6">
                <Card className="notion-panel">
                  <CardHeader>
                    <CardTitle className="notion-title">Configuration</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Define the core properties for this billing cycle.
                    </p>
                  </CardHeader>
                  <CardContent className="grid gap-4">
                    <div className="notion-field">
                      <Label className="text-sm text-muted-foreground">Input Type</Label>
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

                    <div className="notion-field">
                      <Label className="text-sm text-muted-foreground">Value per Unit</Label>
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

                    <div className="notion-field">
                      <Label className="text-sm text-muted-foreground">GST Percentage</Label>
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

                    <div className="notion-field">
                      <Label className="text-sm text-muted-foreground">Project Funding</Label>
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
                  <Card className="notion-panel">
                    <CardHeader>
                      <CardTitle className="notion-title">Quantities</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        State-wise quantities supplied.
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {STATES.map((state, i) => (
                        <div
                          key={state}
                          className="grid items-center gap-3 rounded-xl border border-transparent px-2 py-1.5 transition hover:border-border/80 hover:bg-muted/50 sm:grid-cols-[1fr_140px]"
                        >
                          <Label className="text-sm text-muted-foreground">
                            {state}
                          </Label>
                          <Input
                            className="w-full text-right tabular-nums"
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

                  <Card className="notion-panel">
                    <CardHeader>
                      <CardTitle className="notion-title">Late Penalties</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Deductions for delayed delivery or installation.
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {STATES.map((state, i) => (
                        <div
                          key={state}
                          className="grid items-center gap-3 rounded-xl border border-transparent px-2 py-1.5 transition hover:border-border/80 hover:bg-muted/50 sm:grid-cols-[1fr_140px]"
                        >
                          <Label className="text-sm text-muted-foreground">
                            {state}
                          </Label>
                          <Input
                            className="w-full text-right tabular-nums"
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

                <Card className="notion-panel">
                  <CardHeader>
                    <CardTitle className="notion-title">Advanced Payments</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Record any advance amount already with HARTRON.
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">
                        Is any amount already lying with HARTRON?
                      </Label>
                      <div className="flex flex-wrap gap-2">
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
                            <span className="inline-flex items-center rounded-full border border-border/70 bg-background/80 px-4 py-1 text-xs font-medium text-muted-foreground transition peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground">
                              {value}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {alreadyLying === "Yes" && (
                      <div className="space-y-4 rounded-xl border bg-muted/40 p-4 animate-[fade-in_0.4s_ease-out]">
                        <div className="space-y-2">
                          <Label className="text-sm text-muted-foreground">Payment Mode</Label>
                          <div className="flex flex-wrap gap-2">
                            {(["Collectively", "Per State"] as const).map((value) => (
                              <label key={value} className="relative">
                                <input
                                  type="radio"
                                  name="paidType"
                                  className="peer sr-only"
                                  checked={paidType === value}
                                  onChange={() => setPaidType(value)}
                                />
                                <span className="inline-flex items-center rounded-full border border-border/70 bg-background/80 px-4 py-1 text-xs font-medium text-muted-foreground transition peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground">
                                  {value}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>

                        {paidType === "Collectively" ? (
                          <div className="space-y-2">
                            <Label className="text-sm text-muted-foreground">
                              Total Amount Paid
                            </Label>
                            <Input
                              type="number"
                              value={totalPaid}
                              onChange={(e) =>
                                setTotalPaid(parseFloat(e.target.value) || 0)
                              }
                            />
                            <p className="text-xs text-muted-foreground">
                              Amount is distributed based on quantity ratio.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {STATES.map((state, i) => (
                              <div
                                key={state}
                                className="grid items-center gap-3 sm:grid-cols-[1fr_140px]"
                              >
                                <Label className="text-sm text-muted-foreground">
                                  {state}
                                </Label>
                                <Input
                                  className="w-full text-right tabular-nums"
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

              <div className="space-y-6 lg:sticky lg:top-24 lg:self-start">
                <Card className="notion-panel">
                  <CardHeader>
                    <CardTitle className="notion-title">Quick Actions</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Calculate, reset, and preview totals instantly.
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-2">
                      <Button
                        size="lg"
                        className="w-full justify-between"
                        onClick={handleCalculate}
                      >
                        Calculate Bill
                        <Calculator className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full justify-between"
                        onClick={handleReset}
                      >
                        Reset Form
                        <RefreshCcw className="h-4 w-4" />
                      </Button>
                    </div>

                    {validationError && (
                      <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                        {validationError}
                      </div>
                    )}

                    <div className="space-y-3 border-t pt-4 text-sm">
                      <p className="notion-kicker">Snapshot</p>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Total Quantity</span>
                        <span className="font-semibold tabular-nums">
                          {totalQuantity}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Penalties</span>
                        <span className="font-semibold tabular-nums">
                          {numberFormatter.format(totalPenalties)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Already Paid</span>
                        <span className="font-semibold tabular-nums">
                          {numberFormatter.format(totalAlreadyPaid)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="notion-panel">
                  <CardHeader>
                    <CardTitle className="notion-title">Formula Notes</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Reference summary for billing computations.
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-muted-foreground">
                    <div className="flex items-start gap-3">
                      <span className="mt-1.5 h-2 w-2 rounded-full bg-amber-300" />
                      <p>Product total = Base value + GST on product.</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="mt-1.5 h-2 w-2 rounded-full bg-amber-300" />
                      <p>Consultancy charges = Base value x funding rate.</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="mt-1.5 h-2 w-2 rounded-full bg-amber-300" />
                      <p>Final payment = Total - deductions - penalties.</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </section>

            <section
              className="space-y-4 animate-[slide-up_0.6s_ease-out]"
              style={{ animationDelay: "220ms" }}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="notion-kicker">Bill Output</p>
                  <h2 className="text-xl font-semibold tracking-tight">
                    Bill Breakdown
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Export a clean table once calculations are complete.
                  </p>
                </div>
                {result && (
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={downloadExcel}>
                      <Download className="h-4 w-4" />
                      Export Excel
                    </Button>
                    <Button onClick={downloadPDF}>
                      <Download className="h-4 w-4" />
                      Export PDF
                    </Button>
                  </div>
                )}
              </div>

              {result ? (
                <div className="overflow-x-auto rounded-2xl border bg-card/80 shadow-sm">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 font-medium">Sr.</th>
                        <th className="px-4 py-3 font-medium">Item Description</th>
                        <th className="px-4 py-3 text-right font-medium">
                          Punjab
                        </th>
                        <th className="px-4 py-3 text-right font-medium">
                          Haryana
                        </th>
                        <th className="px-4 py-3 text-right font-medium">
                          Chandigarh
                        </th>
                        <th className="px-4 py-3 text-right font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.rows.map((row) => {
                        const isHighlight =
                          row.sr === 7 || row.sr === 15 || row.sr === 16;
                        const isSection = row.sr === 8;
                        const rowClassName = isSection
                          ? "bg-muted/70 text-xs uppercase tracking-wide text-muted-foreground"
                          : isHighlight
                          ? "bg-accent/60 font-semibold"
                          : "hover:bg-muted/40";

                        return (
                          <tr key={row.sr} className={`border-t ${rowClassName}`}>
                            <td className="px-4 py-3 text-center">{row.sr}</td>
                            <td className="px-4 py-3 max-w-xs">
                              {row.description}
                            </td>
                            {row.values.map((value, i) => (
                              <td
                                key={i}
                                className="px-4 py-3 text-right tabular-nums"
                              >
                                {isSection
                                  ? "-"
                                  : numberFormatter.format(value)}
                              </td>
                            ))}
                            <td className="px-4 py-3 text-right tabular-nums font-medium">
                              {isSection
                                ? "-"
                                : numberFormatter.format(row.total)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed bg-card/50 p-6 text-sm text-muted-foreground">
                  No bill calculated yet. Complete the inputs and press
                  &quot;Calculate Bill&quot; to generate the table.
                </div>
              )}
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
