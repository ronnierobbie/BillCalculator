"use client";

import { useEffect, useMemo, useState } from "react";
import { Calculator, Download, Moon, RefreshCcw, Save, Sun } from "lucide-react";
import { calculateBill } from "@/lib/calculator";
import {
  DEFAULT_BILL_INPUT,
  DEFAULT_BILL_METADATA,
  SUPPORTED_STATES,
} from "@/lib/bill-constants";
import { exportBillToExcel, exportBillToPdf } from "@/lib/bill-export";
import { useSavedBills } from "@/hooks/useSavedBills";
import { BillResult, BillWorkspaceState, SavedBill, SavedBillStatus } from "@/types/bill";
import { Button } from "@/components/ui/button";
import { BillMetadataCard } from "@/components/bill/BillMetadataCard";
import { ProjectSettingsCard } from "@/components/bill/ProjectSettingsCard";
import { StateQuantitiesCard } from "@/components/bill/StateQuantitiesCard";
import { PenaltiesCard } from "@/components/bill/PenaltiesCard";
import { AdvancePaymentCard } from "@/components/bill/AdvancePaymentCard";
import { BillSummaryCard } from "@/components/bill/BillSummaryCard";
import { BillOutputTable } from "@/components/bill/BillOutputTable";
import { BillExportActions } from "@/components/bill/BillExportActions";
import { SavedBillsPanel } from "@/components/bill/SavedBillsPanel";

const INITIAL_WORKSPACE: BillWorkspaceState = {
  metadata: DEFAULT_BILL_METADATA,
  input: DEFAULT_BILL_INPUT,
};

function createSnapshot(
  workspace: BillWorkspaceState,
  result: BillResult | null,
  status: SavedBillStatus
): string {
  return JSON.stringify({ workspace, result, status });
}

export function BillWorkspace() {
  const [workspace, setWorkspace] = useState<BillWorkspaceState>(INITIAL_WORKSPACE);
  const [result, setResult] = useState<BillResult | null>(null);
  const [hasAdvanceAmount, setHasAdvanceAmount] = useState<"No" | "Yes">("No");
  const [valueEnteredAs, setValueEnteredAs] = useState<"Collectively" | "Per State">(
    "Collectively"
  );
  const [totalPaid, setTotalPaid] = useState<number>(0);
  const [isDark, setIsDark] = useState(false);
  const [activeBillId, setActiveBillId] = useState<string | null>(null);
  const [activeBillStatus, setActiveBillStatus] = useState<SavedBillStatus>("draft");
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isPdfExporting, setIsPdfExporting] = useState(false);
  const [isExcelExporting, setIsExcelExporting] = useState(false);

  const {
    savedBills,
    isStorageReady,
    saveBill,
    saveBillAsCopy,
    openSavedBill,
    renameSavedBill,
    duplicateSavedBill,
    deleteSavedBill,
    setSavedBillStatus,
  } = useSavedBills();

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

  const totalQuantity = useMemo(
    () => workspace.input.quantities.reduce((sum, value) => sum + value, 0),
    [workspace.input.quantities]
  );

  const totalPenalties = useMemo(
    () => workspace.input.penalties.reduce((sum, value) => sum + value, 0),
    [workspace.input.penalties]
  );

  const effectiveAlreadyPaid = useMemo(() => {
    if (hasAdvanceAmount === "No") {
      return [0, 0, 0] as [number, number, number];
    }

    if (valueEnteredAs === "Collectively") {
      if (totalQuantity === 0) {
        return [0, 0, 0] as [number, number, number];
      }

      return workspace.input.quantities.map((quantity) =>
        Number(((totalPaid * quantity) / totalQuantity).toFixed(2))
      ) as [number, number, number];
    }

    return workspace.input.alreadyPaid;
  }, [hasAdvanceAmount, valueEnteredAs, workspace.input.alreadyPaid, workspace.input.quantities, totalPaid, totalQuantity]);

  const alreadyPaidDescription = useMemo(() => {
    const hasAny = effectiveAlreadyPaid.some((value) => value > 0);
    if (hasAdvanceAmount === "No" || !hasAny) {
      return "Amount already available with HARTRON";
    }

    const parts = SUPPORTED_STATES.map((state, index) =>
      effectiveAlreadyPaid[index] > 0 ? `${state}: ${effectiveAlreadyPaid[index].toFixed(2)}` : null
    ).filter(Boolean);

    return `Amount already available with HARTRON (${parts.join(", ")})`;
  }, [hasAdvanceAmount, effectiveAlreadyPaid]);

  const calculatedInput = useMemo(
    () => ({
      ...workspace.input,
      alreadyPaid: effectiveAlreadyPaid,
      alreadyPaidDesc: alreadyPaidDescription,
    }),
    [workspace.input, effectiveAlreadyPaid, alreadyPaidDescription]
  );

  const totalAlreadyPaid = useMemo(
    () => effectiveAlreadyPaid.reduce((sum, value) => sum + value, 0),
    [effectiveAlreadyPaid]
  );

  const hasUnsavedChanges = useMemo(() => {
    if (!activeBillId || !lastSavedSnapshot) {
      return false;
    }

    return createSnapshot(workspace, result, activeBillStatus) !== lastSavedSnapshot;
  }, [activeBillId, activeBillStatus, lastSavedSnapshot, workspace, result]);

  const clearMessages = () => {
    setValidationError(null);
    setInfoMessage(null);
  };

  const handleCalculate = () => {
    if (totalQuantity === 0) {
      setValidationError("Total quantity cannot be zero.");
      setResult(null);
      return;
    }

    clearMessages();
    setResult(calculateBill(calculatedInput));
  };

  const handleReset = () => {
    setWorkspace(INITIAL_WORKSPACE);
    setResult(null);
    setHasAdvanceAmount("No");
    setValueEnteredAs("Collectively");
    setTotalPaid(0);
    setActiveBillId(null);
    setActiveBillStatus("draft");
    setLastSavedSnapshot(null);
    clearMessages();
  };

  const handleSave = () => {
    if (totalQuantity === 0) {
      setValidationError("Total quantity cannot be zero.");
      return;
    }

    clearMessages();
    const resolvedResult = calculateBill(calculatedInput);
    setResult(resolvedResult);

    const savedBill = saveBill({
      workspace: {
        metadata: workspace.metadata,
        input: calculatedInput,
      },
      result: resolvedResult,
      activeBillId,
      status: activeBillStatus,
    });

    setActiveBillId(savedBill.id);
    setActiveBillStatus(savedBill.status);
    setWorkspace({ metadata: savedBill.metadata, input: savedBill.input });
    setLastSavedSnapshot(createSnapshot({ metadata: savedBill.metadata, input: savedBill.input }, savedBill.result, savedBill.status));
    setInfoMessage(`Saved "${savedBill.title}".`);
  };

  const handleSaveAsCopy = () => {
    if (totalQuantity === 0) {
      setValidationError("Total quantity cannot be zero.");
      return;
    }

    clearMessages();
    const resolvedResult = calculateBill(calculatedInput);
    setResult(resolvedResult);

    const savedBill = saveBillAsCopy({
      workspace: {
        metadata: workspace.metadata,
        input: calculatedInput,
      },
      result: resolvedResult,
      status: activeBillStatus,
    });

    setActiveBillId(savedBill.id);
    setActiveBillStatus(savedBill.status);
    setWorkspace({ metadata: savedBill.metadata, input: savedBill.input });
    setLastSavedSnapshot(createSnapshot({ metadata: savedBill.metadata, input: savedBill.input }, savedBill.result, savedBill.status));
    setInfoMessage(`Saved copy "${savedBill.title}".`);
  };

  const applyOpenedBill = (savedBill: SavedBill) => {
    setWorkspace({ metadata: savedBill.metadata, input: savedBill.input });
    setResult(savedBill.result);
    setActiveBillId(savedBill.id);
    setActiveBillStatus(savedBill.status);
    setLastSavedSnapshot(createSnapshot({ metadata: savedBill.metadata, input: savedBill.input }, savedBill.result, savedBill.status));

    const recoveredAdvance = savedBill.input.alreadyPaid.reduce((sum, value) => sum + value, 0);
    setHasAdvanceAmount(recoveredAdvance > 0 ? "Yes" : "No");
    setValueEnteredAs("Per State");
    setTotalPaid(recoveredAdvance);
    clearMessages();
  };

  const handleOpenSavedBill = (billId: string) => {
    const savedBill = openSavedBill(billId);
    if (!savedBill) {
      setValidationError("Saved bill not found.");
      return;
    }

    applyOpenedBill(savedBill);
    setInfoMessage(`Opened "${savedBill.title}".`);
  };

  const handleDuplicateSavedBill = (billId: string) => {
    const duplicate = duplicateSavedBill(billId);
    if (!duplicate) {
      setValidationError("Saved bill not found.");
      return;
    }

    applyOpenedBill(duplicate);
    setInfoMessage(`Duplicated as "${duplicate.title}".`);
  };

  const handleRenameSavedBill = (billId: string) => {
    const current = savedBills.find((item) => item.id === billId);
    if (!current) {
      setValidationError("Saved bill not found.");
      return;
    }

    const nextTitle = window.prompt("Rename bill", current.title);
    if (!nextTitle || !nextTitle.trim()) {
      return;
    }

    renameSavedBill(billId, nextTitle);

    if (activeBillId === billId) {
      const nextMetadata = {
        ...workspace.metadata,
        title: nextTitle.trim(),
      };
      setWorkspace((previous) => ({
        ...previous,
        metadata: nextMetadata,
      }));
      setLastSavedSnapshot(
        createSnapshot({ metadata: nextMetadata, input: workspace.input }, result, activeBillStatus)
      );
    }

    setInfoMessage("Bill renamed.");
  };

  const handleDeleteSavedBill = (billId: string) => {
    const current = savedBills.find((item) => item.id === billId);
    if (!current) {
      return;
    }

    const confirmDelete = window.confirm(`Delete saved bill "${current.title}"?`);
    if (!confirmDelete) {
      return;
    }

    deleteSavedBill(billId);

    if (activeBillId === billId) {
      setActiveBillId(null);
      setLastSavedSnapshot(null);
      setActiveBillStatus("draft");
    }

    setInfoMessage("Saved bill deleted.");
  };

  const handleStatusChange = (billId: string, status: SavedBillStatus) => {
    setSavedBillStatus(billId, status);

    if (activeBillId === billId) {
      setActiveBillStatus(status);
      setLastSavedSnapshot(createSnapshot(workspace, result, status));
    }
  };

  const handleExportPdf = async () => {
    if (!result) {
      return;
    }

    setIsPdfExporting(true);
    clearMessages();

    try {
      await exportBillToPdf({
        metadata: workspace.metadata,
        input: calculatedInput,
        result,
      });
    } catch {
      setValidationError("PDF export failed. Please try again.");
    } finally {
      setIsPdfExporting(false);
    }
  };

  const handleExportExcel = async () => {
    if (!result) {
      return;
    }

    setIsExcelExporting(true);
    clearMessages();

    try {
      await exportBillToExcel({
        metadata: workspace.metadata,
        input: calculatedInput,
        result,
      });
    } catch {
      setValidationError("Excel export failed. Please try again.");
    } finally {
      setIsExcelExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-24 md:pb-8">
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
          <div className="flex h-7 w-7 items-center justify-center rounded-md border bg-foreground text-background">
            <Calculator className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">HARTRON Bill Workspace</p>
          </div>
          <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
            <span className="rounded-md border px-2 py-1">
              {workspace.input.entryType === "BV" ? "Base Value" : "Product Value"}
            </span>
            <span className="rounded-md border px-2 py-1">
              {workspace.input.projectFunding === "state" ? "State Govt." : "eCommittee"}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsDark((current) => !current)}
            aria-label="Toggle theme"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 sm:px-6 xl:grid-cols-[minmax(0,1fr)_360px] lg:px-8">
        <section className="min-w-0 space-y-6">
          <div className="flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-end sm:justify-between animate-[fade-in_0.35s_ease-out]">
            <div className="space-y-2">
              <p className="vercel-kicker">Billing workspace</p>
              <h1 className="text-3xl font-semibold sm:text-4xl">HARTRON Bill Calculator</h1>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                Mobile-friendly bill workflow with local saved history and export-ready outputs.
              </p>
            </div>
            <div className="hidden gap-2 sm:flex">
              <Button variant="outline" onClick={handleReset}>
                <RefreshCcw className="h-4 w-4" />
                Reset
              </Button>
              <Button onClick={handleCalculate}>
                <Calculator className="h-4 w-4" />
                Calculate
              </Button>
              <Button variant="outline" onClick={handleSave}>
                <Save className="h-4 w-4" />
                Save
              </Button>
            </div>
          </div>

          {validationError && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {validationError}
            </div>
          )}

          {infoMessage && (
            <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
              {infoMessage}
            </div>
          )}

          <section className="grid gap-3 sm:grid-cols-3">
            {[
              ["Total Quantity", totalQuantity.toString()],
              ["Penalties", numberFormatter.format(totalPenalties)],
              ["Advance", numberFormatter.format(totalAlreadyPaid)],
            ].map(([label, value]) => (
              <div key={label} className="vercel-panel p-4">
                <p className="vercel-kicker">{label}</p>
                <p className="mt-2 font-mono text-2xl font-semibold tabular-nums">{value}</p>
              </div>
            ))}
          </section>

          <BillMetadataCard
            metadata={workspace.metadata}
            onChange={(metadata) => {
              clearMessages();
              setWorkspace((previous) => ({ ...previous, metadata }));
            }}
          />

          <ProjectSettingsCard
            input={workspace.input}
            onChange={(input) => {
              clearMessages();
              setWorkspace((previous) => ({ ...previous, input }));
            }}
          />

          <div className="grid gap-6 md:grid-cols-2">
            <StateQuantitiesCard
              quantities={workspace.input.quantities}
              onChange={(quantities) => {
                clearMessages();
                setWorkspace((previous) => ({
                  ...previous,
                  input: { ...previous.input, quantities },
                }));
              }}
            />

            <PenaltiesCard
              penalties={workspace.input.penalties}
              onChange={(penalties) => {
                clearMessages();
                setWorkspace((previous) => ({
                  ...previous,
                  input: { ...previous.input, penalties },
                }));
              }}
            />
          </div>

          <AdvancePaymentCard
            hasAdvanceAmount={hasAdvanceAmount}
            valueEnteredAs={valueEnteredAs}
            totalPaid={totalPaid}
            alreadyPaid={workspace.input.alreadyPaid}
            onHasAdvanceAmountChange={(value) => {
              clearMessages();
              setHasAdvanceAmount(value);
              if (value === "No") {
                setTotalPaid(0);
                setWorkspace((previous) => ({
                  ...previous,
                  input: {
                    ...previous.input,
                    alreadyPaid: [0, 0, 0],
                    alreadyPaidDesc: "Amount already available with HARTRON",
                  },
                }));
              }
            }}
            onValueEnteredAsChange={(value) => {
              clearMessages();
              setValueEnteredAs(value);
            }}
            onTotalPaidChange={(value) => {
              clearMessages();
              setTotalPaid(value);
            }}
            onAlreadyPaidChange={(alreadyPaid) => {
              clearMessages();
              setWorkspace((previous) => ({
                ...previous,
                input: { ...previous.input, alreadyPaid },
              }));
            }}
          />

          <section className="space-y-4">
            <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="vercel-kicker">Output</p>
                <h2 className="text-xl font-semibold">Bill breakdown</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={handleSaveAsCopy} disabled={!result}>
                  <Save className="h-4 w-4" />
                  Save as copy
                </Button>
                <BillExportActions
                  disabled={!result}
                  isPdfExporting={isPdfExporting}
                  isExcelExporting={isExcelExporting}
                  onExportPdf={handleExportPdf}
                  onExportExcel={handleExportExcel}
                />
              </div>
            </div>

            <BillOutputTable result={result} numberFormatter={numberFormatter} />
          </section>
        </section>

        <aside className="space-y-6 xl:sticky xl:top-20 xl:self-start">
          <BillSummaryCard
            input={workspace.input}
            totalQuantity={totalQuantity}
            totalPenalties={totalPenalties}
            totalAlreadyPaid={totalAlreadyPaid}
            status={activeBillStatus}
            hasUnsavedChanges={hasUnsavedChanges}
            numberFormatter={numberFormatter}
            onCalculate={handleCalculate}
            onReset={handleReset}
            onSave={handleSave}
          />

          <SavedBillsPanel
            savedBills={savedBills}
            activeBillId={activeBillId}
            isStorageReady={isStorageReady}
            hasUnsavedChanges={hasUnsavedChanges}
            onOpen={handleOpenSavedBill}
            onDuplicate={handleDuplicateSavedBill}
            onRename={handleRenameSavedBill}
            onDelete={handleDeleteSavedBill}
            onStatusChange={handleStatusChange}
          />

          <div className="vercel-panel p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Formula notes</p>
            <p className="mt-2 border-l-2 pl-3">Product total = Base value + GST on product.</p>
            <p className="mt-2 border-l-2 pl-3">Consultancy charges = Base value x funding rate.</p>
            <p className="mt-2 border-l-2 pl-3">Final payment = Total - deductions.</p>
          </div>
        </aside>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 p-3 backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-7xl grid-cols-4 gap-2">
          <Button size="sm" onClick={handleCalculate}>
            <Calculator className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={handleSave}>
            <Save className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={handleExportExcel} disabled={!result || isExcelExporting}>
            <Download className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={handleExportPdf} disabled={!result || isPdfExporting}>
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
