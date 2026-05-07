import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { BillExportActions } from "@/components/bill/BillExportActions";

describe("BillExportActions", () => {
  it("triggers export callbacks when enabled", async () => {
    const user = userEvent.setup();
    const onExportPdf = vi.fn();
    const onExportExcel = vi.fn();

    render(
      <BillExportActions
        disabled={false}
        isPdfExporting={false}
        isExcelExporting={false}
        onExportPdf={onExportPdf}
        onExportExcel={onExportExcel}
      />
    );

    await user.click(screen.getByRole("button", { name: "Export Excel" }));
    await user.click(screen.getByRole("button", { name: "Export PDF" }));

    expect(onExportExcel).toHaveBeenCalledTimes(1);
    expect(onExportPdf).toHaveBeenCalledTimes(1);
  });

  it("shows exporting state labels", () => {
    render(
      <BillExportActions
        disabled={false}
        isPdfExporting
        isExcelExporting
        onExportPdf={vi.fn()}
        onExportExcel={vi.fn()}
      />
    );

    const exportingButtons = screen.getAllByRole("button", { name: "Exporting..." });
    expect(exportingButtons).toHaveLength(2);
    expect(exportingButtons[0]).toBeDisabled();
    expect(exportingButtons[1]).toBeDisabled();
  });
});
