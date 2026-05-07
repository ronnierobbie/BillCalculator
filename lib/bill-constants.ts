import { BillInput, BillMetadata } from "@/types/bill";

export const SUPPORTED_STATES = ["Punjab", "Haryana", "Chandigarh"] as const;

export const DEFAULT_BILL_INPUT: BillInput = {
  entryType: "BV",
  valuePerUnit: 0,
  gstPercent: 18,
  projectFunding: "state",
  quantities: [0, 0, 0],
  penalties: [0, 0, 0],
  alreadyPaid: [0, 0, 0],
  alreadyPaidDesc: "Amount already available with HARTRON",
};

export const DEFAULT_BILL_METADATA: BillMetadata = {
  title: "",
  billDate: "",
  referenceNumber: "",
  preparedBy: "",
  notes: "",
};

export function createDefaultBillTitle(date = new Date()): string {
  const datePart = new Intl.DateTimeFormat("en-CA").format(date);
  return `Bill ${datePart}`;
}
