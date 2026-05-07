export type BillInput = {
  entryType: "BV" | "PV";
  valuePerUnit: number;
  gstPercent: number;
  projectFunding: "state" | "ecommittee";
  quantities: [number, number, number];
  penalties: [number, number, number];
  alreadyPaid: [number, number, number];
  alreadyPaidDesc: string;
};

export type BillRow = {
  sr: number;
  description: string;
  values: [number, number, number];
  total: number;
};

export type BillResult = {
  rows: BillRow[];
};

export type BillMetadata = {
  title: string;
  billDate: string;
  referenceNumber: string;
  preparedBy: string;
  notes: string;
};

export type BillWorkspaceState = {
  metadata: BillMetadata;
  input: BillInput;
};

export type SavedBillStatus = "draft" | "final";

export type SavedBill = {
  id: string;
  title: string;
  status: SavedBillStatus;
  createdAt: string;
  updatedAt: string;
  formulaVersion: "hartron-v1";
  metadata: BillMetadata;
  input: BillInput;
  result: BillResult;
  notes?: string;
};

export type BillArtifactManifest = {
  billId: string;
  title: string;
  billDate: string;
  referenceNumber: string | null;
  generatedAt: string;
  pdfPathname: string;
  excelPathname: string;
  pdfUrl?: string;
  excelUrl?: string;
  totalQuantity?: number;
  finalPaymentTotal?: number;
};

export type BillArtifactRecord = BillArtifactManifest & {
  manifestPathname: string;
  manifestUrl?: string;
};
