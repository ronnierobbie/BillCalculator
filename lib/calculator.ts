import { BillInput, BillResult, BillRow } from "@/types/bill";

export function calculateBill(input: BillInput): BillResult {
  const {
    entryType,
    valuePerUnit,
    gstPercent,
    projectFunding,
    quantities,
    penalties,
    alreadyPaid,
    alreadyPaidDesc,
  } = input;

  const entryTypeShort = entryType;
  let bv_unit = 0;
  let pv_unit = 0;

  // Calculations per unit
  if (entryTypeShort === 'PV') {
    pv_unit = valuePerUnit;
    const gst_product_unit = pv_unit * (gstPercent / (100 + gstPercent));
    bv_unit = pv_unit - gst_product_unit;
  } else {
    bv_unit = valuePerUnit;
    const gst_product_unit = bv_unit * (gstPercent / 100);
    pv_unit = bv_unit + gst_product_unit;
  }

  const hartron_percent = projectFunding === 'state' ? 4 : 2;

  // HARTRON Consultancy charges per unit
  const hartron_unit = bv_unit * (hartron_percent / 100);
  const gst_hartron_unit = hartron_unit * 0.18;

  // Calculate state-wise values
  const base_values = quantities.map((q) => q * bv_unit);
  const gst_products = base_values.map((bv) => bv * (gstPercent / 100));
  const product_totals = base_values.map((bv, i) => bv + gst_products[i]);
  const hartrons = base_values.map((bv) => bv * (hartron_percent / 100));
  const gst_hartrons = hartrons.map((h) => h * 0.18);
  const totals = product_totals.map(
    (pt, i) => pt + hartrons[i] + gst_hartrons[i]
  );

  const gst_tds_products = base_values.map((bv) => bv * 0.02);
  const gst_tds_hartrons = hartrons.map((h) => h * 0.02);
  const tds_hartrons = hartrons.map((h) => h * 0.10);

  const deductions = gst_tds_products.map(
    (gtp, i) =>
      gtp +
      gst_tds_hartrons[i] +
      tds_hartrons[i] +
      penalties[i] +
      alreadyPaid[i]
  );

  const payments = totals.map((t, i) => t - deductions[i]);

  // Widthraws: Payment + TDS amounts (reversed logic from Python row 96)
  // Python: withdraws = [p + gtp + gth + th for p, gtp, gth, th in zip(payments, gst_tds_products, gst_tds_hartrons, tds_hartrons)]
  const withdraws = payments.map(
    (p, i) =>
      p + gst_tds_products[i] + gst_tds_hartrons[i] + tds_hartrons[i]
  );

  // Helper to round
  const r = (n: number) => {
    // Python's round is mostly standard, but JS needs care with floating point.
    // We will just keep raw numbers here and format in UI/Excel
    return n;
  }

  // Helper to sum
  const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

  // Construct Rows
  const rows: BillRow[] = [];

  const addRow = (sr: number, desc: string, vals: number[]) => {
    rows.push({
      sr,
      description: desc,
      values: [vals[0], vals[1], vals[2]] as [number, number, number],
      total: sum(vals),
    });
  };

  addRow(1, "Total qty supplied", quantities);
  addRow(2, `Base value of product (i.e. ${bv_unit.toFixed(2)} per unit * #1)`, base_values);
  addRow(3, `${gstPercent}% GST on base value of product (# 2)`, gst_products);
  addRow(4, "Total product cost inclusive of GST(# 2+3)", product_totals);
  addRow(5, `Hartron consultancy Charges @${hartron_percent}% on the base value of product at #2`, hartrons);
  addRow(6, "GST on Hartron Consultancy Charges @ 18% on # 5", gst_hartrons);
  addRow(7, "Total (# 4+5+6)", totals);
  addRow(8, "Deductions", [0, 0, 0]); // Blank row in functionality but we can just show 0s or empty string in UI
  addRow(9, "2% GST TDS required to be deducted on base value of product #2", gst_tds_products);
  addRow(10, "2% GST TDS required to be deducted on Hartron Consultancy Charges #5", gst_tds_hartrons);
  addRow(11, "10% TDS required to be deducted on base value of Hartron consultancy charges #5", tds_hartrons);
  addRow(12, "Statewise Late delivery/installation penalty", penalties);
  addRow(13, alreadyPaidDesc, alreadyPaid);
  addRow(14, "Total deductions (#9+10+11+12+13)", deductions);
  addRow(15, "Payment to be made to HARTRON (#7-14)", payments);
  addRow(16, "Statewise Amount to be withdrawn", withdraws);

  return { rows };
}
