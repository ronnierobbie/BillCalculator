"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Calculator, Download, Moon, RefreshCcw, Save, Sun } from "lucide-react";
import { calculateBill } from "@/lib/calculator";
import {
  DEFAULT_BILL_INPUT,
  DEFAULT_BILL_METADATA,
  SUPPORTED_STATES,
} from "@/lib/bill-constants";
import {
  ExportPayload,
  downloadGeneratedArtifact,
  generateBillExcelArtifact,
  generateBillPdfArtifact,
} from "@/lib/bill-export";
import { createBillArtifactId } from "@/lib/bill-artifacts";
import { useSavedBills } from "@/hooks/useSavedBills";
import {
  BillArtifactRecord,
  BillResult,
  BillWorkspaceState,
  SavedBill,
  SavedBillStatus,
} from "@/types/bill";
import { Button } from "@/components/ui/button";
import { BillMetadataCard } from "@/components/bill/BillMetadataCard";
import { ProjectSettingsCard } from "@/components/bill/ProjectSettingsCard";
import { StateQuantitiesCard } from "@/components/bill/StateQuantitiesCard";
import { PenaltiesCard } from "@/components/bill/PenaltiesCard";
import { AdvancePaymentCard } from "@/components/bill/AdvancePaymentCard";
import { BillSummaryCard } from "@/components/bill/BillSummaryCard";
import { BillOutputTable } from "@/components/bill/BillOutputTable";
import { BillExportActions } from "@/components/bill/BillExportActions";
import { BillArtifactsPanel } from "@/components/bill/BillArtifactsPanel";
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
  const [isCloudSaving, setIsCloudSaving] = useState(false);
  const [savedArtifacts, setSavedArtifacts] = useState<BillArtifactRecord[]>([]);
  const [isArtifactsLoading, setIsArtifactsLoading] = useState(false);
  const [artifactsError, setArtifactsError] = useState<string | null>(null);

  const {
    savedBills,
    isStorageReady,
    saveBill,
    saveBillAsCopy,
    openSavedBill,
    updateSavedBillDetails,
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

  const createExportPayload = useCallback(
    (resolvedResult: BillResult): ExportPayload => ({
      metadata: workspace.metadata,
      input: calculatedInput,
      result: resolvedResult,
    }),
    [workspace.metadata, calculatedInput]
  );

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

  const handleEditSavedBill = (
    billId: string,
    details: { title: string; notes: string }
  ) => {
    const current = savedBills.find((item) => item.id === billId);
    if (!current) {
      setValidationError("Saved bill not found.");
      return;
    }

    if (!details.title.trim()) {
      setValidationError("Bill title cannot be empty.");
      return;
    }

    const updated = updateSavedBillDetails(billId, details);
    if (!updated) {
      setValidationError("Unable to update saved bill details.");
      return;
    }

    if (activeBillId === billId) {
      setWorkspace((previous) => ({ ...previous, metadata: updated.metadata }));
      setLastSavedSnapshot(
        createSnapshot(
          { metadata: updated.metadata, input: workspace.input },
          result,
          activeBillStatus
        )
      );
    }

    setInfoMessage("Saved bill details updated.");
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

  const loadSavedArtifacts = useCallback(async () => {
    setIsArtifactsLoading(true);
    setArtifactsError(null);

    try {
      const response = await fetch("/api/bill-artifacts/list", { cache: "no-store" });
      const body = (await response.json()) as {
        artifacts?: BillArtifactRecord[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(body.error || "Unable to load saved files.");
      }

      setSavedArtifacts(body.artifacts || []);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load saved files.";
      setArtifactsError(message);
    } finally {
      setIsArtifactsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSavedArtifacts();
  }, [loadSavedArtifacts]);

  const handleDownloadPdf = async () => {
    if (!result) {
      return;
    }

    setIsPdfExporting(true);
    clearMessages();

    try {
      const pdfArtifact = await generateBillPdfArtifact(createExportPayload(result));
      downloadGeneratedArtifact(pdfArtifact);
    } catch {
      setValidationError("PDF export failed. Please try again.");
    } finally {
      setIsPdfExporting(false);
    }
  };

  const handleDownloadExcel = async () => {
    if (!result) {
      return;
    }

    setIsExcelExporting(true);
    clearMessages();

    try {
      const excelArtifact = await generateBillExcelArtifact(createExportPayload(result));
      downloadGeneratedArtifact(excelArtifact);
    } catch {
      setValidationError("Excel export failed. Please try again.");
    } finally {
      setIsExcelExporting(false);
    }
  };

  const handleCloudSaveArtifacts = async () => {
    if (!result) {
      setValidationError("Calculate the bill before saving artifacts.");
      return;
    }

    setIsCloudSaving(true);
    clearMessages();

    try {
      const payload = createExportPayload(result);
      const [pdfArtifact, excelArtifact] = await Promise.all([
        generateBillPdfArtifact(payload),
        generateBillExcelArtifact(payload),
      ]);

      const billId = activeBillId || createBillArtifactId();
      const generatedAt = new Date().toISOString();

      const formData = new FormData();
      formData.append(
        "pdf",
        new File([pdfArtifact.blob], pdfArtifact.fileName, {
          type: pdfArtifact.mimeType,
        })
      );
      formData.append(
        "excel",
        new File([excelArtifact.blob], excelArtifact.fileName, {
          type: excelArtifact.mimeType,
        })
      );
      formData.append(
        "metadata",
        JSON.stringify({
          billId,
          title: workspace.metadata.title,
          billDate: workspace.metadata.billDate,
          referenceNumber: workspace.metadata.referenceNumber || null,
          generatedAt,
          result,
        })
      );

      const response = await fetch("/api/bill-artifacts/upload", {
        method: "POST",
        body: formData,
      });

      const body = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(body.error || "Unable to save artifacts to cloud.");
      }

      setInfoMessage("Saved PDF and Excel artifacts to Blob.");
      await loadSavedArtifacts();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to save artifacts to cloud.";
      setValidationError(message);
    } finally {
      setIsCloudSaving(false);
    }
  };

  const handleDownloadSavedArtifact = async (pathname: string) => {
    try {
      const response = await fetch(
        `/api/bill-artifacts/download?pathname=${encodeURIComponent(pathname)}`
      );

      if (!response.ok) {
        const maybeError = (await response.text()) || "Unable to download file.";
        throw new Error(maybeError);
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get("content-disposition");
      const fileNameMatch = contentDisposition?.match(/filename=\"?([^\";]+)\"?/i);
      const fileName = fileNameMatch?.[1] || pathname.split("/").pop() || "artifact";

      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      anchor.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to download saved file.";
      setValidationError(message);
    }
  };

  const scrollToSavedFiles = () => {
    document.getElementById("saved-files-panel")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
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
                  isCloudSaving={isCloudSaving}
                  onDownloadPdf={handleDownloadPdf}
                  onDownloadExcel={handleDownloadExcel}
                  onSaveCloud={handleCloudSaveArtifacts}
                  onOpenSavedFiles={scrollToSavedFiles}
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
            onEditDetails={handleEditSavedBill}
            onDelete={handleDeleteSavedBill}
            onStatusChange={handleStatusChange}
          />

          <div id="saved-files-panel">
            <BillArtifactsPanel
              artifacts={savedArtifacts}
              isLoading={isArtifactsLoading}
              error={artifactsError}
              onRefresh={loadSavedArtifacts}
              onDownloadPdf={handleDownloadSavedArtifact}
              onDownloadExcel={handleDownloadSavedArtifact}
            />
          </div>

          <div className="vercel-panel p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Formula notes</p>
            <p className="mt-2 border-l-2 pl-3">Product total = Base value + GST on product.</p>
            <p className="mt-2 border-l-2 pl-3">Consultancy charges = Base value x funding rate.</p>
            <p className="mt-2 border-l-2 pl-3">Final payment = Total - deductions.</p>
          </div>
        </aside>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 p-3 backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-7xl grid-cols-5 gap-2">
          <Button size="sm" onClick={handleCalculate}>
            <Calculator className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={handleSave}>
            <Save className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleDownloadExcel}
            disabled={!result || isExcelExporting}
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={handleDownloadPdf} disabled={!result || isPdfExporting}>
            <Download className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleCloudSaveArtifacts}
            disabled={!result || isCloudSaving}
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
