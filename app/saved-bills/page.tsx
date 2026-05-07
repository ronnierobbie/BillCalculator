"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, FilePlus2 } from "lucide-react";
import { BillArtifactsPanel } from "@/components/bill/BillArtifactsPanel";
import { SavedBillsPanel } from "@/components/bill/SavedBillsPanel";
import { Button } from "@/components/ui/button";
import { useSavedBills } from "@/hooks/useSavedBills";
import { BillArtifactRecord, SavedBillStatus } from "@/types/bill";

export default function SavedBillsPage() {
  const router = useRouter();
  const [savedArtifacts, setSavedArtifacts] = useState<BillArtifactRecord[]>([]);
  const [isArtifactsLoading, setIsArtifactsLoading] = useState(false);
  const [artifactsCursor, setArtifactsCursor] = useState<string | null>(null);
  const [hasMoreArtifacts, setHasMoreArtifacts] = useState(false);
  const [hasLoadedArtifacts, setHasLoadedArtifacts] = useState(false);
  const [artifactsError, setArtifactsError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const {
    savedBills,
    isStorageReady,
    updateSavedBillDetails,
    duplicateSavedBill,
    deleteSavedBill,
    setSavedBillStatus,
  } = useSavedBills();

  const clearMessages = () => {
    setValidationError(null);
    setInfoMessage(null);
  };

  const loadSavedArtifacts = useCallback(async (append = false) => {
    setIsArtifactsLoading(true);
    setArtifactsError(null);

    try {
      const query = new URLSearchParams();
      query.set("maxItems", "20");
      if (append && artifactsCursor) {
        query.set("cursor", artifactsCursor);
      }

      const response = await fetch(`/api/bill-artifacts/list?${query.toString()}`, {
        cache: "no-store",
      });
      const body = (await response.json()) as {
        artifacts?: BillArtifactRecord[];
        nextCursor?: string | null;
        hasMore?: boolean;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(body.error || "Unable to load saved files.");
      }

      const cleanedArtifacts = (body.artifacts || []).filter(
        (artifact) =>
          !artifact.billId.includes("runtime-check") &&
          !artifact.title.toLowerCase().includes("runtime check")
      );

      setSavedArtifacts((previous) => {
        if (!append) {
          return cleanedArtifacts;
        }

        const existing = new Set(previous.map((item) => item.manifestPathname));
        const incoming = cleanedArtifacts.filter(
          (item) => !existing.has(item.manifestPathname)
        );
        return [...previous, ...incoming];
      });
      setHasLoadedArtifacts(true);
      setHasMoreArtifacts(Boolean(body.hasMore));
      setArtifactsCursor(body.nextCursor || null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load saved files.";
      setArtifactsError(message);
    } finally {
      setIsArtifactsLoading(false);
    }
  }, [artifactsCursor]);

  const handleDownloadSavedArtifact = async (pathname: string) => {
    clearMessages();

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

  const handleOpenSavedBill = (billId: string) => {
    router.push(`/?openBillId=${encodeURIComponent(billId)}`);
  };

  const handleDuplicateSavedBill = (billId: string) => {
    clearMessages();
    const duplicate = duplicateSavedBill(billId);
    if (!duplicate) {
      setValidationError("Saved bill not found.");
      return;
    }

    setInfoMessage(`Duplicated as "${duplicate.title}".`);
  };

  const handleEditSavedBill = (
    billId: string,
    details: { title: string; notes: string }
  ) => {
    clearMessages();
    if (!details.title.trim()) {
      setValidationError("Bill title cannot be empty.");
      return;
    }

    const updated = updateSavedBillDetails(billId, details);
    if (!updated) {
      setValidationError("Unable to update saved bill details.");
      return;
    }

    setInfoMessage("Saved bill details updated.");
  };

  const handleDeleteSavedBill = (billId: string) => {
    clearMessages();
    const current = savedBills.find((item) => item.id === billId);
    if (!current) {
      return;
    }

    const confirmDelete = window.confirm(`Delete saved bill "${current.title}"?`);
    if (!confirmDelete) {
      return;
    }

    deleteSavedBill(billId);
    setInfoMessage("Saved bill deleted.");
  };

  const handleStatusChange = (billId: string, status: SavedBillStatus) => {
    clearMessages();
    setSavedBillStatus(billId, status);
  };

  const summaryText = useMemo(() => {
    const localCount = savedBills.length;
    const cloudCount = hasLoadedArtifacts ? savedArtifacts.length : 0;
    return `${localCount} local draft${localCount === 1 ? "" : "s"} • ${cloudCount} cloud artifact${cloudCount === 1 ? "" : "s"}`;
  }, [hasLoadedArtifacts, savedArtifacts.length, savedBills.length]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <div className="min-w-0">
            <p className="text-sm font-medium">Saved bill center</p>
            <p className="text-xs text-muted-foreground">{summaryText}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href="/?newBill=1">
                <FilePlus2 className="h-4 w-4" />
                New bill
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/">
                <ArrowLeft className="h-4 w-4" />
                Workspace
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl space-y-4 px-4 py-6 sm:px-6 lg:px-8">
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

        <div className="rounded-md border border-border/80 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
          Local drafts are editable bill snapshots stored in browser localStorage. Saved files
          are generated PDF/XLSX exports stored in Vercel Blob.
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <SavedBillsPanel
            savedBills={savedBills}
            activeBillId={null}
            isStorageReady={isStorageReady}
            hasUnsavedChanges={false}
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
              hasLoaded={hasLoadedArtifacts}
              error={artifactsError}
              onRefresh={() => {
                setArtifactsCursor(null);
                setHasMoreArtifacts(false);
                void loadSavedArtifacts(false);
              }}
              onDownloadPdf={handleDownloadSavedArtifact}
              onDownloadExcel={handleDownloadSavedArtifact}
            />
            {hasLoadedArtifacts && hasMoreArtifacts && (
              <div className="mt-3">
                <Button
                  variant="outline"
                  onClick={() => void loadSavedArtifacts(true)}
                  disabled={isArtifactsLoading}
                >
                  Load more files
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
