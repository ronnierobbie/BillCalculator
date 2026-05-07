"use client";

import { useCallback, useEffect, useState } from "react";
import { createDefaultBillTitle } from "@/lib/bill-constants";
import {
  createSavedBillId,
  loadSavedBillsFromStorage,
  writeSavedBillsToStorage,
} from "@/lib/bill-storage";
import {
  BillMetadata,
  BillResult,
  BillWorkspaceState,
  SavedBill,
  SavedBillStatus,
} from "@/types/bill";

type SaveBillParams = {
  workspace: BillWorkspaceState;
  result: BillResult;
  activeBillId: string | null;
  status: SavedBillStatus;
};

function resolveTitle(metadata: BillMetadata): string {
  return metadata.title.trim() || createDefaultBillTitle();
}

function withPersistedUpdate(
  current: SavedBill[],
  updater: (previous: SavedBill[]) => SavedBill[]
): SavedBill[] {
  const next = updater(current);
  writeSavedBillsToStorage(next);
  return next;
}

export function useSavedBills() {
  const [savedBills, setSavedBills] = useState<SavedBill[]>([]);
  const [isStorageReady, setIsStorageReady] = useState(false);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setSavedBills(loadSavedBillsFromStorage());
      setIsStorageReady(true);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, []);

  const saveBill = useCallback((params: SaveBillParams): SavedBill => {
    const now = new Date().toISOString();
    const title = resolveTitle(params.workspace.metadata);

    let savedBill: SavedBill;

    setSavedBills((previous) =>
      withPersistedUpdate(previous, (items) => {
        const existing = params.activeBillId
          ? items.find((item) => item.id === params.activeBillId)
          : undefined;

        savedBill = {
          id: existing?.id ?? createSavedBillId(),
          title,
          status: params.status,
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
          formulaVersion: "hartron-v1",
          metadata: params.workspace.metadata,
          input: params.workspace.input,
          result: params.result,
          notes: params.workspace.metadata.notes || undefined,
        };

        const withoutCurrent = items.filter((item) => item.id !== savedBill.id);
        return [savedBill, ...withoutCurrent];
      })
    );

    return savedBill!;
  }, []);

  const saveBillAsCopy = useCallback(
    (params: Omit<SaveBillParams, "activeBillId">): SavedBill => {
      const copyTitle = params.workspace.metadata.title.trim()
        ? `${params.workspace.metadata.title.trim()} (Copy)`
        : `${createDefaultBillTitle()} (Copy)`;

      return saveBill({
        ...params,
        activeBillId: null,
        workspace: {
          ...params.workspace,
          metadata: {
            ...params.workspace.metadata,
            title: copyTitle,
          },
        },
      });
    },
    [saveBill]
  );

  const openSavedBill = useCallback(
    (billId: string): SavedBill | null => {
      const match = savedBills.find((bill) => bill.id === billId);
      return match || null;
    },
    [savedBills]
  );

  const renameSavedBill = useCallback((billId: string, newTitle: string): void => {
    const title = newTitle.trim();
    if (!title) {
      return;
    }

    setSavedBills((previous) =>
      withPersistedUpdate(previous, (items) =>
        items.map((item) => {
          if (item.id !== billId) {
            return item;
          }

          return {
            ...item,
            title,
            metadata: {
              ...item.metadata,
              title,
            },
            updatedAt: new Date().toISOString(),
          };
        })
      )
    );
  }, []);

  const duplicateSavedBill = useCallback((billId: string): SavedBill | null => {
    const current = savedBills.find((bill) => bill.id === billId);
    if (!current) {
      return null;
    }

    const now = new Date().toISOString();
    const clone: SavedBill = {
      ...current,
      id: createSavedBillId(),
      title: `${current.title} (Copy)`,
      status: "draft",
      createdAt: now,
      updatedAt: now,
      metadata: {
        ...current.metadata,
        title: `${current.title} (Copy)`,
      },
    };

    setSavedBills((previous) =>
      withPersistedUpdate(previous, (items) => [clone, ...items])
    );

    return clone;
  }, [savedBills]);

  const deleteSavedBill = useCallback((billId: string): void => {
    setSavedBills((previous) =>
      withPersistedUpdate(previous, (items) => items.filter((item) => item.id !== billId))
    );
  }, []);

  const setSavedBillStatus = useCallback((billId: string, status: SavedBillStatus): void => {
    setSavedBills((previous) =>
      withPersistedUpdate(previous, (items) =>
        items.map((item) =>
          item.id === billId
            ? { ...item, status, updatedAt: new Date().toISOString() }
            : item
        )
      )
    );
  }, []);

  return {
    savedBills,
    isStorageReady,
    saveBill,
    saveBillAsCopy,
    openSavedBill,
    renameSavedBill,
    duplicateSavedBill,
    deleteSavedBill,
    setSavedBillStatus,
  };
}
