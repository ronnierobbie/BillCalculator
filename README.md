# HARTRON Bill Workspace (Next.js)

A mobile-friendly HARTRON bill calculator workspace built with Next.js.

It supports state-wise bill preparation for:
- Punjab
- Haryana
- Chandigarh

The app keeps the existing HARTRON calculation formulas, adds local saved bill history, and improves export quality for PDF/Excel handoff.

## What The App Does

- Calculates HARTRON billing rows from state-wise quantities, penalties, and advance amount inputs.
- Lets users manage bill metadata (title, date, reference number, prepared by, notes).
- Stores saved bills in browser `localStorage` (no backend, no auth).
- Exports bill outputs to PDF and Excel with metadata-aware filenames.

## Formula Assumptions

Formula logic remains in `lib/calculator.ts`.

- Entry type can be `BV` (Base Value) or `PV` (Product Value).
- GST can be configured (default: 18%).
- Consultancy rate is based on funding type:
  - State Govt. funded: 4%
  - eCommittee funded: 2%
- Deductions include:
  - GST TDS on product base value (2%)
  - GST TDS on consultancy charges (2%)
  - TDS on consultancy charges (10%)
  - State-wise penalty
  - Amount already available with HARTRON

Saved bills are marked with `formulaVersion: hartron-v1`.

## Saved Bills

Saved bills are local to the current browser profile.

- Storage key: `consbill.savedBills.v1`
- Includes both `input` and `result` for each saved bill.
- Includes metadata and status (`draft` or `final`).

Supported actions:
- Save current bill
- Save as copy
- Open saved bill
- Rename saved bill
- Duplicate saved bill
- Delete saved bill
- Mark draft/final

Unsaved changes indicator appears when an opened saved bill has edits not yet re-saved.

## Exports

Exports are generated client-side using dynamic imports (loaded only when needed):
- `jspdf`
- `jspdf-autotable`
- `exceljs`

Filename format:
- `HARTRON-Bill-{billTitle}-{billDate}.pdf`
- `HARTRON-Bill-{billTitle}-{billDate}.xlsx`

Export content includes:
- Bill title
- Bill date
- Reference number
- Funding type
- GST percentage
- Generated timestamp
- Calculated bill table

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Validation

Run:

```bash
npm run lint
npm run build
```

## Scope Notes

- This app is web-only (Next.js).
- No Android/APK/mobile-native workflow.
- No backend/auth/database/cloud sync in this version.
