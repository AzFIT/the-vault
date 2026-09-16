# The Vault Fitness

Marketing site + client/coach web app for **The Vault Fitness**, a personal
training gym in Sheung Wan, Hong Kong. Black/gold brand theme (`#d4af37`).

Built with React 19, TypeScript, Vite 7, Tailwind CSS 3.4, shadcn/ui,
Framer Motion and Recharts.

## Routes

| Route              | Shell              | Description                                        |
| ------------------ | ------------------ | -------------------------------------------------- |
| `/`                | Marketing (Navbar/Footer) | Home — gym, PT, classes, women's health, memberships, enquiry modals |
| `*`                | Marketing          | Vault-styled 404                                   |
| `/dashboard`       | App (sidebar)      | Client dashboard — plan, streaks, next 1:1 session |
| `/sheets`          | App                | Tracking sheets — daily log, workouts, nutrition   |
| `/analytics`       | App                | Client analytics — trends, PRs, heatmap            |
| `/coach`           | App                | Coach dashboard — roster, program builder, revenue |
| `/plan-summary`    | App                | Printable plan summary                             |
| `/admin/enquiries` | App (staff)        | Staff inbox for membership/pass enquiries          |

## Commands

```bash
npm run dev      # local dev server (Vite)
npm run build    # type-check (tsc -b) + production build
npm run lint     # eslint
npm run preview  # serve the production build locally
```

There is no automated test suite in this repo yet.

## Mock data & persistence — read before wiring a backend

There is **no backend**. Everything runs on mock data from
`src/data/mock.ts`, plus localStorage for anything the user writes:

- **Enquiry submissions** — `submitEnquiry()` in `src/lib/enquiries.ts`
  appends to `localStorage['vault-enquiries']`; the staff inbox at
  `/admin/enquiries` reads from there.
  **Swap point:** replace the body of `submitEnquiry` (and
  `listEnquiries` / `markContacted`) with a real API call — the `Enquiry`
  shape and all call sites stay the same.
- **Tracking-sheet edits** — the sheets store
  (`src/components/sheets/store.ts`) persists edits to
  `localStorage['vault-sheet-store']` so the "Saved" indicator is honest.
- **Newsletter signups** — `subscribeNewsletter()` in
  `src/lib/enquiries.ts` writes to `localStorage['vault-newsletter']`.

All of the above are the intended seams for a future API/Supabase
integration.

## Photo credits

Photography in `public/` is sourced from The Vault Fitness' own brand
assets (thevault-fitness.com) for this concept build; replace with
licensed assets before any public launch.
