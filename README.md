# HARTRON Bill Workspace (Next.js)

A mobile-friendly HARTRON bill calculator workspace built with Next.js.

Supported billing states:
- Punjab
- Haryana
- Chandigarh

## What the app does

- Calculates HARTRON billing rows from state-wise quantities, penalties, and advance inputs.
- Keeps bill metadata (title, date, reference number, prepared by, notes).
- Stores working bill history in browser `localStorage` (`consbill.savedBills.v1`).
- Provides a dedicated `/saved-bills` page for saved draft management and cloud file retrieval.
- Exports bill output to PDF and Excel.
- Saves generated PDF/XLSX artifacts to Vercel Blob (private storage) through server routes.
- Lists previously saved artifacts and allows server-mediated file download.

## Formula assumptions

Formula logic remains in `lib/calculator.ts`.

- Entry type: `BV` (Base Value) or `PV` (Product Value)
- GST default: 18%
- Consultancy rate by funding:
  - State Govt. funded: 4%
  - eCommittee funded: 2%
- Deductions include GST TDS, TDS, state penalty, and amount already available with HARTRON.

## Export and cloud artifact flow

Local export actions remain available:
- Download PDF
- Download Excel

Additional cloud action:
- Save PDF & Excel
- Open saved files (navigates to `/saved-bills`)

Cloud save uploads three private Blob objects per bill artifact set:
- `bills/{yyyy}/{mm}/{billId}/{safeBillTitle}.pdf`
- `bills/{yyyy}/{mm}/{billId}/{safeBillTitle}.xlsx`
- `bills/{yyyy}/{mm}/{billId}/manifest.json`

API routes:
- `POST /api/bill-artifacts/upload`
- `GET /api/bill-artifacts/list`
- `GET /api/bill-artifacts/download?pathname=...`

## Vercel Blob configuration

Required environment variable (server-side only):
- `BLOB_READ_WRITE_TOKEN`

Do not expose this token in client code.

## Local setup

```bash
vercel link
vercel env pull .env.local
npm install
npm run dev
```

Open `http://localhost:3000`.

## Validation

```bash
npm run lint
npm run build
```

## Deployment

```bash
vercel deploy
vercel deploy --prod
```

## Scope notes

- Web-only Next.js app.
- No Android/APK/mobile-native work.
- No backend auth/database sync added in this packet.
