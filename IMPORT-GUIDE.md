# The Vault — Data Import Guide (Shopify / MINDBODY)

This is the one-off migration tooling for pulling your existing customer and
payment data out of Shopify and MINDBODY and into The Vault's Supabase
database. It is **dry-run first**: nothing is written until you review the
report and explicitly say "apply the import".

## What the importer supports

| Export source                     | Where it lands in The Vault            |
| --------------------------------- | -------------------------------------- |
| Shopify → Customers → Export CSV  | Client records (matched by email/phone) |
| Shopify → Orders → Export CSV     | Payment records (amount, date, order ref) |
| MINDBODY → Client list export CSV | Client records (name, phone, DOB)      |

Files that don't match a known export layout are **reported and skipped** —
the importer never guesses.

## Step 1 — Export your data

### Shopify customers

1. Shopify admin → **Customers**
2. Click **Export** (top right)
3. Choose **All customers** (or the segment you want) → **Export as CSV**
4. Save the downloaded file

### Shopify orders

1. Shopify admin → **Orders**
2. Click **Export** (top right)
3. Choose the date range that covers your paid orders → **Export as CSV**
4. Save the downloaded file

### MINDBODY client list

1. MINDBODY Manager → **Clients** (or **Reports → Client List**, depending on
   your MINDBODY version — menu names vary by version)
2. Export / download the client list as CSV
3. Save the downloaded file

> MINDBODY's exact menu path differs between versions, which is why the
> importer sniffs the column headers instead of requiring an exact file name.

## Step 2 — Drop the files in `imports/`

Put every export file (`.csv`) into the `imports/` folder at the repo root.
You can drop several files at once — each is detected and reported
separately.

## Step 3 — Run the dry run

Tell Kimi (in this project):

> run the import

You get a report like:

```
=== shopify-customers-2026-09.csv ===
  rows: 148
  detected: shopify_customers
  mapped: 146  (skipped 2 empty/invalid)
=== mindbody-clients.csv ===
  rows: 310
  detected: mindbody_clients
  mapped: 305  (skipped 5 empty/invalid)
DRY RUN — nothing was written.
```

Review the numbers. Anything unrecognized is listed under PROBLEMS.

## Step 4 — Apply

Only when the dry-run report looks right, say:

> apply the import

The importer pushes batches of 500 rows through the staff-gated
`import-batch` Edge Function and prints per-file counts
(`inserted / updated / skipped`).

## What "safe to re-run" means

- **Clients files are safe to re-run.** Existing clients are matched by email
  first, then by phone number (digits-only comparison), and updated in place.
- **Orders/payments files are NOT safe to re-run.** Payments are insert-only —
  importing the same orders file twice will duplicate payment rows. Import
  each payments file exactly once.

## Who imported clients are assigned to

Imported clients are assigned to the owner trainer profile by default
(Azwar Nusantara). The assignment can be changed later from the portal, or a
different run can use `--trainer-id <uuid>`.

## Files involved

- `tools/import_csv.py` — the importer (run from the repo root)
- `imports/` — drop zone for export files
- `supabase/functions/import-batch/` — the Edge Function that writes to the
  database (staff-key gated, same model as the enquiries pipeline)

## Current status

- Edge Function `import-batch`: **deployed and smoke-tested** (insert,
  idempotent re-run, package update, payment insert, unauthorized rejection,
  unknown-format rejection all verified green 2026-09-22; test rows cleaned up).
- Importer: **tested in dry-run mode** against sample Shopify customer/order
  and unknown-format files.
- Not yet run against real exports — waiting for you to drop the files.
