import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SavedBillsPanel } from "@/components/bill/SavedBillsPanel";
import { SavedBill } from "@/types/bill";

function createSavedBill(overrides: Partial<SavedBill>): SavedBill {
  return {
    id: overrides.id || "bill-1",
    title: overrides.title || "Alpha Bill",
    status: overrides.status || "draft",
    createdAt: overrides.createdAt || "2026-05-01T10:00:00.000Z",
    updatedAt: overrides.updatedAt || "2026-05-02T10:00:00.000Z",
    formulaVersion: "hartron-v1",
    metadata: {
      title: overrides.metadata?.title || overrides.title || "Alpha Bill",
      billDate: overrides.metadata?.billDate || "2026-05-01",
      referenceNumber: overrides.metadata?.referenceNumber || "REF-1",
      preparedBy: overrides.metadata?.preparedBy || "Ops Team",
      notes: overrides.metadata?.notes || "",
    },
    input: {
      entryType: "BV",
      valuePerUnit: 100,
      gstPercent: 18,
      projectFunding: "state",
      quantities: [5, 2, 1],
      penalties: [0, 0, 0],
      alreadyPaid: [0, 0, 0],
      alreadyPaidDesc: "Amount already available with HARTRON",
    },
    result: {
      rows: [
        { sr: 1, description: "Total qty supplied", values: [5, 2, 1], total: 8 },
        { sr: 15, description: "Payment to be made to HARTRON", values: [100, 80, 20], total: 200 },
      ],
    },
    notes: overrides.notes,
  };
}

describe("SavedBillsPanel", () => {
  it("supports lifecycle actions and inline non-modal editing", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    const onDuplicate = vi.fn();
    const onEditDetails = vi.fn();
    const onDelete = vi.fn();
    const onStatusChange = vi.fn();

    const bills = [
      createSavedBill({ id: "bill-1", title: "Alpha Bill", status: "draft" }),
      createSavedBill({ id: "bill-2", title: "Beta Bill", status: "final", updatedAt: "2026-05-03T10:00:00.000Z" }),
    ];

    render(
      <SavedBillsPanel
        savedBills={bills}
        activeBillId={"bill-1"}
        isStorageReady
        hasUnsavedChanges={false}
        onOpen={onOpen}
        onDuplicate={onDuplicate}
        onEditDetails={onEditDetails}
        onDelete={onDelete}
        onStatusChange={onStatusChange}
      />
    );

    await user.click(screen.getByTestId("saved-bill-open-bill-1"));
    await user.click(screen.getByTestId("saved-bill-duplicate-bill-1"));
    await user.click(screen.getByTestId("saved-bill-delete-bill-1"));

    expect(onOpen).toHaveBeenCalledWith("bill-1");
    expect(onDuplicate).toHaveBeenCalledWith("bill-1");
    expect(onDelete).toHaveBeenCalledWith("bill-1");

    fireEvent.change(screen.getByTestId("saved-bill-status-bill-1"), {
      target: { value: "final" },
    });
    expect(onStatusChange).toHaveBeenCalledWith("bill-1", "final");

    await user.click(screen.getByTestId("saved-bill-edit-bill-1"));
    await user.clear(screen.getByTestId("saved-bill-edit-title-bill-1"));
    await user.type(screen.getByTestId("saved-bill-edit-title-bill-1"), "Alpha Bill Updated");
    await user.type(screen.getByTestId("saved-bill-edit-notes-bill-1"), " revised notes");
    await user.click(screen.getByTestId("saved-bill-save-edit-bill-1"));

    expect(onEditDetails).toHaveBeenCalledWith("bill-1", {
      title: "Alpha Bill Updated",
      notes: " revised notes",
    });
  });

  it("supports search, filter, and sort controls", async () => {
    const user = userEvent.setup();

    const bills = [
      createSavedBill({ id: "bill-1", title: "Gamma Bill", status: "draft", updatedAt: "2026-05-01T10:00:00.000Z" }),
      createSavedBill({ id: "bill-2", title: "Alpha Bill", status: "final", updatedAt: "2026-05-03T10:00:00.000Z" }),
    ];

    render(
      <SavedBillsPanel
        savedBills={bills}
        activeBillId={null}
        isStorageReady
        hasUnsavedChanges={false}
        onOpen={vi.fn()}
        onDuplicate={vi.fn()}
        onEditDetails={vi.fn()}
        onDelete={vi.fn()}
        onStatusChange={vi.fn()}
      />
    );

    await user.type(screen.getByTestId("saved-bill-search"), "Gamma");
    expect(screen.getByText("Showing 1 of 2")).toBeInTheDocument();
    expect(screen.getByText("Gamma Bill")).toBeInTheDocument();

    await user.clear(screen.getByTestId("saved-bill-search"));
    fireEvent.change(screen.getByTestId("saved-bill-filter-status"), {
      target: { value: "final" },
    });

    expect(screen.getByText("Showing 1 of 2")).toBeInTheDocument();
    expect(screen.getByText("Alpha Bill")).toBeInTheDocument();

    fireEvent.change(screen.getByTestId("saved-bill-filter-status"), {
      target: { value: "all" },
    });
    fireEvent.change(screen.getByTestId("saved-bill-sort"), {
      target: { value: "title-asc" },
    });

    const cards = screen.getAllByTestId(/saved-bill-card-/);
    expect(within(cards[0]).getByText("Alpha Bill")).toBeInTheDocument();
  });
});
