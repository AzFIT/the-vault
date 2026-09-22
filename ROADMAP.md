# The Vault — Build Roadmap (as of 2026-09-22)
**Status baseline:** enquiries pipeline live (intake → Supabase → CRM), exercise library fully synced with the upgraded workbook (221/221, zero drift), design phases 1–5 complete, workflow audit done (see WORKFLOW-AUDIT.md).

---

## TIER 1 — Do next (small, high value, unblocks everything else)

### 1. Homepage CTA rerouting 🔴 (from workflow audit)
- "Train With Us" cards, "Book a Personal Trainer", "Book now", "Programme", "Start Tracking", "Start Training" currently go to `/dashboard` (tester member app).
- Reroute: PT/Programme → `/intake?mode=training` · Book now/Start Training → `/intake?mode=trial` · Start Tracking → contact popup or `/login`.
- **Why first:** it feeds the enquiries pipeline we just built. Until this ships, the new cloud CRM gets no public traffic.
- Effort: ~30 min.

### 2. Decide the Supabase project question 🟡
- Code uses `gcurvjprfwecbchreieu` (65 tables, all data). Your keys file references `gnhfmjchnwgragquxbja` (fresh, Next.js quickstart).
- **Owner decision:** consolidate on one. Recommendation: keep the existing project; don't split data across two.
- Effort: a conversation, then 0–2h depending on the answer.

### 3. Unblock Phase D — Sheets sync 🟡
- The two-way Google Sheets sync is built and deployed but needs ONE owner action: enable the Google Drive API at console.cloud.google.com (project 182366152334) **or** share the target sheet with the service-account email.
- Effort: 2 minutes of clicking; then I finish the sync.

---

## TIER 2 — Portals on real data (migration plan Steps 0–1)

### 4. CRM upgrade: enquiries → working pipeline ✅ (done 2026-09-22)
- Status flow New → Contacted → Trial Booked → Converted / Cold in the enquiry drawer,
  with staff assignment and notes — all mirrored to Supabase through the edge function.
- Owner dashboard "New Enquiries" KPI, greeting line, and notifications rail read real
  cloud counts (merged cloud cache + local fallback).

### 5. Import real business data (CSV imports)
- **Owner action (time-critical per migration plan): export NOW before anything else** — Shopify customer list + order history; MINDBODY client list, memberships/packs with session counts, schedule template, attendance.
- I build the import mapping (clients matched by phone number) into the existing `clients`/`sessions` tables.
- Effort: owner 1–2h of exports; import build 1 day.

### 6. Schedule on Supabase
- `sessions` table exists (37 rows); PortalSchedule currently edits local state only.
- Wire owner + front-desk schedule views to read/write Supabase so both surfaces see one truth.
- Effort: half a day.

---

## TIER 3 — Program Builder (the Excel vision, in the app)

### 7. Recommendation engine in Coach studio
- Mirror the PROGRAM CREATOR logic: inputs (client, goal, session focus, equipment, grip, difficulty, type, exercise count) → score + rank from `exercise_library` → workout table with sets/reps/tempo/rest auto-set by goal.
- Data layer is ready (Supabase-backed library, `planBlueprint.ts`); taxonomy already matches the workbook.
- Effort: 2–3 days.

### 8. Finish Sheets two-way sync (needs #3)
- Trainer edits in Google Sheets or the app; both stay consistent via the deployed `sync-sheets` edge function.

---

## TIER 4 — Migration cutovers (weeks scale, per business plan)

| # | Build | Business plan step | Roughly |
|---|---|---|---|
| 9 | WhatsApp Business API shared team inbox (+ booking/renewal auto-messages) | Step 3 (weeks 7–9) | 1–2 weeks |
| 10 | Native booking engine: capacity, waitlist auto-promote, session decrement, check-in; 20-member pilot in parallel with MINDBODY | Step 4 (weeks 9–14) — the big one | 3–4 weeks |
| 11 | Drop-in day passes at full margin + "book direct" capture | Step 5 (weeks 12–15) | 1 week |
| 12 | Stripe checkout + subscription migration + Shopify archive mode | Step 6 (weeks 15–18) | 2 weeks |

---

## Standing rules going forward
- Approval gate before layout changes; per-phase labelled commits for revertability.
- Build retries: max attempts, flag-and-skip on repeated failure — no silent retry loops.
- The upgraded xlsx is read-only from the app side; taxonomy names stay identical to its SETTINGS tab.
- No real-auth or public cutovers until you say so — tester gates stay in place.
