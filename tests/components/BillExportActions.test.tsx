import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { BillExportActions } from "@/components/bill/BillExportActions";

describe("BillExportActions", () => {
  it("triggers download and cloud save callbacks when enabled", async () => {
    const user = userEvent.setup();
    const onDownloadPdf = vi.fn();
    const onDownloadExcel = vi.fn();
    const onSaveCloud = vi.fn();
    const onOpenSavedFiles = vi.fn();

    render(
      <BillExportActions
        disabled={false}
        isPdfExporting={false}
        isExcelExporting={false}
        isCloudSaving={false}
        onDownloadPdf={onDownloadPdf}
        onDownloadExcel={onDownloadExcel}
        onSaveCloud={onSaveCloud}
        onOpenSavedFiles={onOpenSavedFiles}
      />
    );

    await user.click(screen.getByRole("button", { name: "Download Excel" }));
    await user.click(screen.getByRole("button", { name: "Download PDF" }));
    await user.click(screen.getByRole("button", { name: "Save PDF & Excel" }));
    await user.click(screen.getByRole("button", { name: "Open saved files" }));

    expect(onDownloadExcel).toHaveBeenCalledTimes(1);
    expect(onDownloadPdf).toHaveBeenCalledTimes(1);
    expect(onSaveCloud).toHaveBeenCalledTimes(1);
    expect(onOpenSavedFiles).toHaveBeenCalledTimes(1);
  });

  it("shows exporting/saving state labels", () => {
    render(
      <BillExportActions
        disabled={false}
        isPdfExporting
        isExcelExporting
        isCloudSaving
        onDownloadPdf={vi.fn()}
        onDownloadExcel={vi.fn()}
        onSaveCloud={vi.fn()}
        onOpenSavedFiles={vi.fn()}
      />
    );

    const exportingButtons = screen.getAllByRole("button", { name: "Exporting..." });
    expect(exportingButtons).toHaveLength(2);
    expect(exportingButtons[0]).toBeDisabled();
    expect(exportingButtons[1]).toBeDisabled();
    expect(screen.getByRole("button", { name: "Saving..." })).toBeDisabled();
  });
});
