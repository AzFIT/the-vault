# SPEC — Services & Products (owner catalog → POS)

**Status:** ready to build · **Route:** `/portal/services` · **Owner portal, Manage group**
**Effort estimate:** one phase, one commit

---

## 1. Goal

Give the owner a page to manage what the gym sells — passes, memberships,
PT packs, merch, and (new) services — and make the front-desk POS read from
that catalog instead of the hardcoded list in `src/lib/pos.ts`.

Today prices live in code (`PRODUCTS` in `src/lib/pos.ts`). Staff cannot
change a price without a code edit + redeploy. After this phase, the owner
edits the catalog in the portal and the POS updates immediately (same
browser; cross-device sync arrives with the later Supabase migration).

## 2. Current state (verified 2026-09-23)

- `src/lib/pos.ts` — `Product` interface, hardcoded `PRODUCTS` (10 items),
  `QUICK_SALE_ITEMS` (4 hardcoded picks for the shift dashboard),
  `recordSale()` which logs `'sale'` + `'stock'` shift events.
- Consumers (only two):
  - `src/pages/FrontDeskPOS.tsx` — filters `PRODUCTS` by category into
    pick-lists; `addToCart` looks up by id; categories rendered as
    `'Passes' | 'Memberships' | 'PT packs' | 'Merch'` (hardcoded filter list
    — check the actual render loop, don't assume).
  - `src/pages/FrontDesk.tsx` — imports `QUICK_SALE_ITEMS as SALE_ITEMS`,
    renders quick-add buttons; uses `formatHKD`.
- The `stock` boolean on merch items drives automatic `'stock'` shift events
  on sale (feeds the "Stock Adjustments" KPI). Preserve this behavior.

## 3. Data model

New store `src/lib/posCatalog.ts`, following the exact pattern of
`src/lib/gymSettings.ts` (localStorage + custom event + `storage` listener +
`useX()` hook):

```ts
export interface CatalogItem {
  id: string            // stable slug, e.g. 'day-pass' — never reused after delete
  label: string         // display name, e.g. 'Day pass'
  price: number         // HKD, integer; 0 allowed (trial class)
  category: string      // free-form from CATEGORIES below, owner can add new
  stockTracked: boolean // true = merch-like: logs 'stock' event on sale
  active: boolean       // false = hidden from POS but kept in history/sales
  createdAt: string     // ISO
  updatedAt: string     // ISO
}

export const DEFAULT_CATEGORIES = ['Passes', 'Memberships', 'PT packs', 'Merch']
// services (e.g. 'Assessment', 'Locker rental') can be added by the owner
```

- Storage key: `vault-pos-catalog`. Event name: `vault-pos-catalog-changed`.
- Seed on first read with the current 10 `PRODUCTS` (map `stock` →
  `stockTracked`, all `active: true`) so existing behavior is unchanged.
- API surface (mirror gymSettings naming):
  `getCatalog()`, `saveCatalog(items)`, `useCatalog()`,
  plus `listActiveCatalog()` helper for POS consumers.
- Keep `recordSale`, `cartTotal`, `formatHKD`, `CartLine`, `PaymentMethod`
  in `src/lib/pos.ts` unchanged — only the catalog moves.

**One-time migration:** `src/lib/pos.ts` re-exports `PRODUCTS` /
`QUICK_SALE_ITEMS` as derived from the new store for backward compat, OR
update the two consumers directly (preferred — only two files; delete the
hardcoded export in the same commit).

## 4. Page — `/portal/services` (new, `src/pages/ServicesProducts.tsx`)

Owner shell, match the visual language of `PortalSettings.tsx` /
`PortalClients.tsx` (dark surface cards, gold accents, `NavButtons` header).

Layout:
- Header: eyebrow "Manage", title "Services & Products", back/forward/home
  `NavButtons` (homeTo `/portal`).
- Category filter tabs (All + each existing category + archived view).
- Table: Label · Category · Price (HK$) · Stock-tracked badge · Active
  toggle · Edit / Archive actions. Search box filters by label.
- "Add item" button → inline form or modal: label, price (number input,
  HK$ prefix), category (datalist allowing new values), stock-tracked
  checkbox, active default true.
- Editing price must NOT affect past sales — sales are only shift-event
  strings, so nothing to migrate; note this in code comment.
- Archive = `active: false` (keeps history); a separate "Archived" tab lists
  them with Restore / Hard-delete (hard-delete only allowed if the item was
  never sold? — we can't know from event strings, so: allow delete with a
  confirm dialog that warns sales history strings will keep the old label).

## 5. Wiring

- `src/App.tsx`: lazy import + `<Route path="/portal/services">` inside the
  `PortalShell` group (owner-only shell already guards the route).
- `src/components/PortalShell.tsx`:
  - `NAV_MANAGE`: `{ label: 'Services & Products', to: '/portal/services' }`
    (replaces the `soon: true` entry — last-but-one "soon" item).
  - `PAGE_CHROME`: `'/portal/services': { eyebrow: 'Manage', title: 'Services & Products' }`.
- POS consumers read from the hook:
  - `FrontDeskPOS.tsx` — replace `PRODUCTS` with `listActiveCatalog()` (or
    the hook), derive category filter list from the catalog (no hardcoded
    categories).
  - `FrontDesk.tsx` quick-add — replace `QUICK_SALE_ITEMS` with the first 4
    active items (or add a `quickAdd: boolean` flag to `CatalogItem`, owner
    toggles it in the catalog table — preferred, small addition).

## 6. Acceptance criteria

1. `npm run build` passes clean (tsc strict — no `any` leaks).
2. Seeded catalog == today's 10 items at today's prices; POS renders
   identically to before for a staff user.
3. Owner changes a price → POS pick-list shows the new price immediately in
   the same browser (event sync), without reload.
4. Archived item disappears from POS but past sale strings in the shift log
   are unchanged.
5. Stock-tracked item still logs a `'stock'` event on sale (KPI intact).
6. No dead buttons; nav item un-greyed; route guard works (signed-out visit
   → vault-locked page, as other portal routes do).
7. One commit, labelled `feat: services & products — owner catalog drives
   POS`; push per workflow rules; Pages deploy green.

## 7. Out of scope (do NOT build in this phase)

- Supabase persistence (Tier 2 migration later — keep the localStorage
  pattern so the later swap is mechanical).
- Inventory counts / stock levels (only the existing stock-event logging).
- Barcodes, SKU codes, supplier fields.
- Payments-table integration (POS sales remain shift events for now).
