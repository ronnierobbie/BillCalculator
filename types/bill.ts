export type BillInput = {
    entryType: "BV" | "PV";
    valuePerUnit: number;
    gstPercent: number;
    projectFunding: "state" | "ecommittee";
    quantities: [number, number, number]; // Punjab, Haryana, Chandigarh
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
