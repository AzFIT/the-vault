# The Vault — Complete Workflow Path Audit
**First audit:** 2026-09-22 · commit `61a6725` · **Re-verified:** 2026-09-23 · commit `0f83df4`

---

## Re-verification results (2026-09-23)

| Prior finding | Status at `0f83df4` | Evidence |
|---|---|---|
| 🔴 7 uncommitted source files breaking CI | ✅ **FIXED & stays fixed** — pushed in `61a6725`, every deploy since green | git log + Actions |
| 🟠 6 homepage CTAs → `/dashboard` | ✅ **ALL FIXED** (Tier 1 #1) — verified in `Home.tsx`: Train With Us card → `intake?mode=trial` · Start Tracking → `trial` · Book a Personal Trainer → `training` · Book now (class card) → `trial` · Programme → `training` · Start Training → `trial` | source lines 279/450/574/731/779/1041 |
| 🟡 Desktop navbar Login skipped vault gate | ✅ **FIXED** (`271da2e`) — desktop + mobile Login both → `/enter` | `Navbar.tsx` lines 92, 99, 184, 187 |
| 🟡 Owner portal "soon" placeholders | ⚠️ **STILL OPEN — now a decision, not a bug.** Six items: Check In, Rooms, Point of Sale, Marketing, Services & Products, Settings. Routes now exist for Check In (`/portal/check-in`) and POS (`/portal/pos`) — they can be wired to the owner nav immediately. Rooms / Marketing / Services & Products / Settings have no pages yet — genuinely "soon". | `PortalShell.tsx` lines 41–54 |

### New-surface sweep (everything built after the first audit)

- CRM Enquiries page (17 buttons): status flow, assignment, notes — all wired, verified during build. No navigation links — correct, it's a work surface.
- Owner dashboard cloud-enquiry counts, notification rows → `/admin/enquiries` — ✅ valid target.
- Front-desk pages (Check-In / POS / Follow-Ups): no internal links — they live in the FrontDeskShell nav, all five items map to real routes. ✅
- Dashboard cards (RingCard → `/analytics`, ActivityTimeline → `/analytics`, Today's Plan → `/sheets?tab=workouts`, fullscreen toggle) — ✅ all wired.
- NavButtons back/forward/home — history nav + role home, ✅.
- PortalGate destinations (7) — all valid routes. ✅
- Repo-wide search for empty handlers `onClick={() => {}}` — **zero matches**. ✅
- No `/dashboard` links remain on any public/marketing surface (Home, Navbar, Footer, WhatsAppFloat). ✅

### Verdict

**No dead buttons and no wrong destinations found in current code.** The workflow is fully connected end-to-end: public site → intake/contact → vault gate → role portals, with every nav item resolving. The only open item is a product decision on the four not-yet-built owner-portal sections (and optionally wiring the two that already have routes).

---

## 1. Route Inventory (23 routes — all valid)

| Route | Page | Surface |
|---|---|---|
| `/` | Home (marketing) | Public site |
| `/enter` | PortalGate — vault intro video → destination menu | Public |
| `/intake?mode=…` | Intake (choose / contact / membership / training / trial) | Public, no login |
| `/login` | MemberLogin — golden-steel tester sign-in | Members |
| `/portal/login` | PortalLogin — staff tester sign-in | Staff |
| `/dashboard` | Dashboard (client view) | App shell |
| `/sheets` (+ `?tab=`) | Tracking sheets (daily / workouts / measurements / testing) | App shell |
| `/analytics` | Analytics | App shell |
| `/coach` | Coach studio + program builder | App shell |
| `/plan-summary` | Plan summary | App shell |
| `/admin/enquiries` | Enquiries inbox (CRM) | App shell |
| `/portal` | Owner dashboard (KPIs, notifications) | Owner shell |
| `/portal/staff` | Staff directory | Owner shell |
| `/portal/clients` | Client list | Owner shell |
| `/portal/schedule` | Schedule editor | Owner + front desk |
| `/portal/insights` | Revenue & performance | Owner shell |
| `/portal/insights/report` | Printable monthly report | Unguarded (print) |
| `/portal/front-desk` | Rachel's shift dashboard | Front desk shell |
| `/portal/check-in` | Check-in | Front desk shell |
| `/portal/pos` | Point of sale | Front desk shell |
| `/portal/follow-ups` | Calls & messages log | Front desk shell |
| `/portal/desk-schedule` | Schedule (shared PortalSchedule) | Front desk shell |
| `/manage` | → redirects to `/portal` | — |
| `*` | NotFound → "Back to homepage" → `/` | — |

`/style-guide` exists in dev mode only (no links point to it — no dead links).

---

## 2. Public Site → Conversion Paths

| Button (location) | Triggers | Leads to | Verdict |
|---|---|---|---|
| Navbar logo | Link | `/` | ✅ correct |
| Navbar nav links (The Gym, PT, Group Classes, Women's Health, Gym Memberships) | anchor scroll | `#the-gym` `#personal-training` `#group-classes` `#womens-health` `#memberships` | ✅ all anchors exist |
| Navbar **Contact** (desktop + mobile) | popup | ContactLauncher: 4 intent cards + WhatsApp link | ✅ |
| Navbar **Staff** | Link | `/enter` (vault gate intro → menu) | ✅ |
| Navbar **Login** (desktop) | Link | `/dashboard` ⚠️ skips the vault gate | ⚠️ inconsistent — mobile Login goes to `/enter` |
| Navbar **Join Now** | anchor | `/#memberships` | ✅ |
| Footer "The Gym" column | anchors | `#memberships` `#personal-training` `#group-classes` `#womens-health` | ✅ |
| Footer **Contact Us** (Help) | popup | ContactLauncher | ✅ |
| Footer Help external links | new tab | thevault-fitness.com (referral / about / rules / privacy / T&Cs) | ✅ live URLs |
| Footer phone / map / socials | — | tel: / Google Maps / FB / IG | ✅ |
| Hero slideshow arrows + dots | JS timer / manual | cycles 5 slides, timer resets | ✅ |
| **"Train With Us" class cards** | Link | `/dashboard` | ❌ **wrong — public visitor lands in tester member app** |
| "Start Tracking" (progress section) | Link | `/dashboard` | ⚠️ wrong intent for non-members |
| **"Book a Personal Trainer"** | Link | `/dashboard` | ❌ should be `/intake?mode=training` |
| **"Book now" (group class cards)** | Link | `/dashboard` | ❌ should be `/intake?mode=trial` |
| "Classes" (women's health) | scroll | `#group-classes` | ✅ |
| **"Programme" (women's health)** | Link | `/dashboard` | ❌ should be `/intake?mode=training` |
| **"Start Training" (final CTA)** | Link | `/dashboard` | ❌ should be `/intake?mode=trial` or contact popup |
| "Join Gym" (final CTA) | scroll | `#memberships` | ✅ |

### Vault Gate (`/enter`)
| Destination | Leads to | Verdict |
|---|---|---|
| Management Portal | `/portal/login` | ✅ |
| Member Dashboard | `/login` | ✅ |
| Coach's Studio | `/coach` | ✅ |
| Tracking Sheets | `/sheets` | ✅ |
| Book a Trial | `/intake?mode=trial` | ✅ |
| Memberships | `/#memberships` | ✅ |
| Homepage | `/` | ✅ |

### ContactLauncher cards
| Card | Leads to | Verdict |
|---|---|---|
| Get in touch | `/intake?mode=contact` | ✅ |
| Membership | `/intake?mode=membership` | ✅ |
| Personal or group training | `/intake?mode=training` | ✅ |
| Book your trial session | `/intake?mode=trial` | ✅ |
| "WhatsApp us directly" | `wa.me/85228859300` | ✅ |

### Intake form endpoints
- `mode=contact` → ContactForm ✅ · `membership`/`training` → IntakeWizard ✅ · `trial` → TrialFlow (printable/PDF summary) ✅ · invalid mode falls back to chooser ✅
- Intake header "Back to homepage" → `/` ✅

---

## 3. Member App (`/login` → `/dashboard`)

| Button | Leads to | Verdict |
|---|---|---|
| Sign in (tester profiles: 4 members) | `/dashboard` | ✅ |
| Logo / "Back to homepage" | `/` | ✅ |
| App sidebar: Dashboard / Sheets / Analytics / Coach / Plan Summary | matching routes | ✅ |
| Sidebar command palette (⌘K) | pages + clients → `/coach` + programs | ✅ |
| Sidebar bell notifications | mark-read only | ✅ (no destinations yet) |
| Back / Forward / Home buttons | history nav / role home | ✅ |
| **Dashboard RingCard** | `/analytics` | ✅ |
| **Today's Plan "Open in Sheets"** | `/sheets?tab=workouts` | ✅ deep-link honoured |
| Activity Timeline | `/analytics` | ✅ |
| DayDrawer (analytics) | `/sheets` | ✅ |
| Sheets "Back to dashboard" | `/dashboard` | ✅ |
| Coach QuickActions | `/plan-summary` | ✅ |
| Analytics "Plan summary" | `/plan-summary` | ✅ |
| Coach ClientDrawer | `/analytics` | ✅ |
| Owner notification row | `/admin/enquiries` | ✅ |

---

## 4. Staff Portals

### Staff sign-in (`/portal/login`) — tester profiles
| Profile | Role | Lands on | Verdict |
|---|---|---|---|
| Dan (owner) | owner | `/portal` | ✅ |
| Rachel | front-desk | `/portal/front-desk` | ✅ |
| Coach account | coach | `/coach` | ✅ |
| "Back to homepage" | — | `/` | ✅ |

### Owner portal (`/portal` shell)
| Nav item | Leads to | Verdict |
|---|---|---|
| Dashboard / Schedule / Clients / Enquiries / Insights / Staff | matching routes | ✅ |
| Check In, Rooms, Point of Sale, Marketing, Services & Products, Settings | — | ⚠️ **"soon" placeholders — no destination (dead by design)**. POS & Check In routes exist but are front-desk-gated |
| KPI cards (6) | KpiSheet full-sheet view with sort/categories | ✅ |
| KPI hide/show toggle, privacy blur | local state | ✅ |
| KPI-sheet back / Home icon | back to portal | ✅ |
| Notifications | `/admin/enquiries` | ✅ |

### Front desk (`/portal/front-desk` shell)
| Nav item | Leads to | Verdict |
|---|---|---|
| My shift / Check In / POS / Follow-ups / Schedule / Enquiries | matching routes | ✅ |
| Clients | — | ⚠️ "soon" placeholder — `/portal/clients` is owner-gated, so intentional |
| KPI cards | KpiSheet view | ✅ |

---

## 5. Findings Summary

### 🔴 Critical (fixed this session)
1. **7 source files were never committed** (`PortalGate.tsx`, `MemberLogin.tsx`, `member.ts`, `programSave.ts`, `sheetsSync.ts`, `supabase.ts`, `sync-sheets` edge fn) — CI builds failed twice because of this. Fixed in `61a6725`; deploy verified green, all assets live.

### 🟠 Wrong destinations — RESOLVED 2026-09-23
2. ~~Every public homepage CTA routes to `/dashboard`~~ **Fixed in Tier 1 #1** — all six CTAs now route to `/intake?mode=…`. See re-verification table at top.

### 🟡 Inconsistencies / dead-ends by design
3. ~~Desktop navbar "Login" skips the vault gate~~ **Fixed** (`271da2e`).
4. Six owner-portal nav items are "soon" placeholders with no destination — **open decision**: two (Check In, POS) have live routes and can be wired now; four await their pages.
5. Scratch working files (xlsx/py/tsv) remain untracked in the repo — intentionally not pushed.

### ✅ Verified correct
All 23 routes resolve, every anchor exists, all intake modes valid, all role homes valid, ContactLauncher fully wired, gate destinations valid, KPI sheets + privacy toggles wired, deep links (`?tab=workouts`) honoured.
