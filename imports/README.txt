DROP YOUR EXPORT FILES HERE
============================

This folder is where the CSV importer looks for files.

Supported exports (the importer detects the format from the file's column
headers automatically):

1. Shopify  -> Customers -> Export (CSV)     becomes Vault client records
2. Shopify  -> Orders    -> Export (CSV)     becomes Vault payment records
3. MINDBODY -> client list export (CSV)      becomes Vault client records

How to run the import (ask Kimi in this project):

    "run the import"          -> dry run: shows counts, writes nothing
    "apply the import"        -> pushes to Supabase after you approve the report

Rules to keep in mind:

* Dry run first, always. Review the report before applying.
* The importer matches existing clients by email, then by phone number, so
  re-running a clients file updates records instead of duplicating them.
* Payment files are insert-only — import each payments/orders file exactly
  once, or rows will duplicate.
* Files that don't match a known export format are reported and skipped,
  never guessed.
