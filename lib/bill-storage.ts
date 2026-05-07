import { SavedBill } from "@/types/bill";

export const SAVED_BILLS_STORAGE_KEY = "consbill.savedBills.v1";

function isValidSavedBill(value: unknown): value is SavedBill {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as SavedBill;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.title === "string" &&
    (candidate.status === "draft" || candidate.status === "final") &&
    typeof candidate.createdAt === "string" &&
    typeof candidate.updatedAt === "string" &&
    candidate.formulaVersion === "hartron-v1" &&
    !!candidate.input &&
    !!candidate.result &&
    !!candidate.metadata
  );
}

function normalizeSavedBills(savedBills: SavedBill[]): SavedBill[] {
  return [...savedBills].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function loadSavedBillsFromStorage(): SavedBill[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(SAVED_BILLS_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return normalizeSavedBills(parsed.filter(isValidSavedBill));
  } catch {
    return [];
  }
}

export function writeSavedBillsToStorage(savedBills: SavedBill[]): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    SAVED_BILLS_STORAGE_KEY,
    JSON.stringify(normalizeSavedBills(savedBills))
  );
}

export function createSavedBillId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `saved-bill-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}
