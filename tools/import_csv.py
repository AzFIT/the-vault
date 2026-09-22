#!/usr/bin/env python3
"""
The Vault — CSV import tool (Shopify / MINDBODY migration).

Reads every .csv file dropped into the repo's `imports/` folder, detects which
export it is from the column headers, maps rows to the normalized shape the
`import-batch` Supabase Edge Function expects, and either:

  * prints a DRY-RUN report (default) — nothing is written, or
  * pushes batches of up to 500 rows to the edge function (`--apply`).

Run from the repo root:

    python tools/import_csv.py            # dry run — safe, writes nothing
    python tools/import_csv.py --apply    # pushes to Supabase

Design rules:
  * Header-based format detection only — unknown layouts are reported and
    skipped, never guessed.
  * Clients are matched by email first, then digits-only phone, so re-running
    an already-imported file updates instead of duplicating.
  * payments/sessions are insert-only: re-running those WILL duplicate rows,
    so each file should be applied exactly once. The dry run tells you counts
    first.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
import urllib.request
from pathlib import Path

# ---------------------------------------------------------------- configuration

EDGE_URL = (
    "https://gcurvjprfwecbchreieu.supabase.co/functions/v1/import-batch"
)
STAFF_KEY = "vault_enq_3d8b52f1a947c60e"

# Default owner profile that imported clients are assigned to (Azwar Nusantara,
# role=trainer in public.profiles). Override with --trainer-id.
DEFAULT_TRAINER_ID = "86325302-704c-4f32-bd19-1a4dfa484228"

IMPORTS_DIR = Path("imports")
BATCH_SIZE = 500

VALID_PAYMENT_KINDS = {"package", "package_session", "single_session", "other"}

# ------------------------------------------------------------------ helpers


def norm(s: str | None) -> str:
    return re.sub(r"\s+", " ", (s or "").strip()).lower()


def digits(s: str | None) -> str:
    return re.sub(r"\D", "", s or "")


def money_to_cents(raw: str | None) -> int | None:
    """Parse '1,234.50' / 'HK$1,234.50' / '$12' into integer cents."""
    if raw is None:
        return None
    m = re.sub(r"[^\d.,-]", "", raw).replace(",", "")
    if not m:
        return None
    try:
        return int(round(float(m) * 100))
    except ValueError:
        return None


def parse_dt(raw: str | None) -> str | None:
    """Normalize a Shopify/MINDBODY date-ish string to ISO (best effort)."""
    if not raw:
        return None
    raw = raw.strip()
    for fmt in ("%Y-%m-%d %H:%M:%S %z", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M",
                "%d/%m/%Y %H:%M", "%m/%d/%Y %H:%M", "%d/%m/%Y", "%m/%d/%Y",
                "%Y-%m-%d", "%d %b %Y", "%d %B %Y"):
        try:
            from datetime import datetime
            dt = datetime.strptime(raw, fmt)
            return dt.isoformat()
        except ValueError:
            continue
    return raw  # pass through; PostgREST will reject clearly if unusable


def to_date(raw: str | None) -> str | None:
    if not raw:
        return None
    m = re.match(r"(\d{4})-(\d{2})-(\d{2})", raw.strip())
    if m:
        return m.group(0)
    d = parse_dt(raw)
    return d[:10] if d and re.match(r"\d{4}-\d{2}-\d{2}", d) else None


def normalize_phone(raw: str | None) -> str | None:
    """Keep the display form but add the HK country code if missing."""
    if not raw:
        return None
    d = digits(raw)
    if not d:
        return None
    if d.startswith("852") and len(d) >= 11:
        return "+" + d
    if len(d) == 8:
        return "+852 " + d[:4] + " " + d[4:]
    return raw.strip()


# ------------------------------------------------------------ format detection


def detect(headers: list[str]) -> str | None:
    h = {norm(x) for x in headers}
    # Shopify customer export
    if {"email", "first name"} <= h:
        return "shopify_customers"
    # Shopify order export (has order Name + financial columns)
    if {"name", "financial status"} <= h or ({"name"} <= h and {"total", "created at"} <= h):
        return "shopify_orders"
    # MINDBODY client list
    if ({"first name", "last name"} <= h and
            ({"mobile phone", "birth date"} & h or {"email"} <= h)):
        return "mindbody_clients"
    return None


# --------------------------------------------------------------- row mappers


def map_shopify_customers(rows: list[dict], trainer_id: str) -> list[dict]:
    out = []
    for r in rows:
        name = " ".join(x for x in [r.get("First Name"), r.get("Last Name")] if x and x.strip())
        email = (r.get("Email") or "").strip() or None
        phone = normalize_phone(r.get("Phone"))
        if not name and not email and not phone:
            continue
        out.append({
            "trainer_id": trainer_id,
            "full_name": name or email or phone,
            "email": email,
            "phone": phone,
            "notes": "Imported from Shopify customers export",
        })
    return out


def map_shopify_orders(rows: list[dict]) -> list[dict]:
    out = []
    for r in rows:
        total = money_to_cents(r.get("Total"))
        if total is None:
            continue
        kind = "other"
        note_bits = [f"Shopify order {r.get('Name', '').strip()}"]
        if r.get("Financial Status"):
            note_bits.append(r["Financial Status"].strip())
        out.append({
            "client_email": (r.get("Email") or "").strip() or None,
            "client_phone": normalize_phone(r.get("Phone") or r.get("Billing Phone")),
            "amount_cents": total,
            "kind": kind if kind in VALID_PAYMENT_KINDS else "other",
            "note": " · ".join(note_bits),
            "paid_at": parse_dt(r.get("Created at") or r.get("Processed at")),
        })
    return out


def map_mindbody_clients(rows: list[dict], trainer_id: str) -> list[dict]:
    out = []
    for r in rows:
        low = {norm(k): v for k, v in r.items()}
        name = " ".join(x for x in [low.get("first name"), low.get("last name")]
                        if x and str(x).strip())
        email = (low.get("email") or "").strip() or None
        phone = normalize_phone(low.get("mobile phone") or low.get("home phone") or low.get("phone"))
        if not name and not email and not phone:
            continue
        out.append({
            "trainer_id": trainer_id,
            "full_name": name or email or phone,
            "email": email,
            "phone": phone,
            "date_of_birth": to_date(low.get("birth date") or low.get("birthdate")),
            "notes": "Imported from MINDBODY client list",
        })
    return out


MAPPERS = {
    "shopify_customers": ("upsert_clients", map_shopify_customers),
    "shopify_orders": ("import_payments", map_shopify_orders),
    "mindbody_clients": ("upsert_clients", map_mindbody_clients),
}


# --------------------------------------------------------------------- pushing


def push_batch(action: str, rows: list[dict]) -> dict:
    payload = json.dumps({"action": action, "rows": rows}).encode()
    req = urllib.request.Request(
        EDGE_URL,
        data=payload,
        headers={"Content-Type": "application/json", "x-staff-key": STAFF_KEY},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        return {"error": f"HTTP {e.code}: {e.read().decode()[:300]}"}


# ------------------------------------------------------------------------ main


def main() -> int:
    ap = argparse.ArgumentParser(description="The Vault CSV importer (dry-run by default)")
    ap.add_argument("--apply", action="store_true", help="actually push to Supabase")
    ap.add_argument("--trainer-id", default=DEFAULT_TRAINER_ID,
                    help="profiles.id to assign imported clients to")
    args = ap.parse_args()

    files = sorted(IMPORTS_DIR.glob("*.csv"))
    if not files:
        print(f"No .csv files found in ./{IMPORTS_DIR}/ — drop your exports there and re-run.")
        return 0

    grand = {}
    problems = []
    for f in files:
        with f.open(newline="", encoding="utf-8-sig") as fh:
            reader = csv.DictReader(fh)
            headers = reader.fieldnames or []
            rows = [r for r in reader if any((v or "").strip() for v in r.values())]

        kind = detect(headers)
        print(f"\n=== {f.name} ===")
        print(f"  rows: {len(rows)}")
        if kind is None:
            print("  UNRECOGNIZED format — skipped (headers not matched).")
            print(f"  headers seen: {', '.join(headers[:12])}{' …' if len(headers) > 12 else ''}")
            problems.append(f"{f.name}: unrecognized format")
            continue
        print(f"  detected: {kind}")

        action, mapper = MAPPERS[kind]
        needs_trainer = action == "upsert_clients"
        mapped = mapper(rows, args.trainer_id) if needs_trainer else mapper(rows)
        mapped = [m for m in mapped if m.get("client_email") or m.get("client_phone")
                  or m.get("full_name")]
        print(f"  mapped: {len(mapped)}  (skipped {len(rows) - len(mapped)} empty/invalid)")

        if not args.apply:
            continue

        ok = {"inserted": 0, "updated": 0, "skipped": 0}
        for i in range(0, len(mapped), BATCH_SIZE):
            res = push_batch(action, mapped[i:i + BATCH_SIZE])
            if "error" in res:
                print(f"  BATCH ERROR at row {i}: {res['error']}")
                problems.append(f"{f.name}: batch at row {i} failed — {res['error']}")
                break
            for k in ok:
                ok[k] += res.get(k, 0)
        print(f"  applied: {ok}")
        grand[f.name] = ok

    print("\n=== SUMMARY ===")
    if args.apply:
        for name, counts in grand.items():
            print(f"  {name}: {counts}")
    else:
        print("  DRY RUN — nothing was written. Re-run with --apply to push.")
    if problems:
        print("  PROBLEMS:")
        for p in problems:
            print(f"   - {p}")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
