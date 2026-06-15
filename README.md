# Reconverse

Dealer vehicle reconditioning SaaS — part of the Motorverse ecosystem.

The live prototype runs at **motorverserecon.com**. The product direction is **Reconverse.app**. The rebrand is in progress; see `docs/REBRAND.md` (TBD) for the migration plan.

## What it does

Tracks used vehicles from intake to frontline-ready through a defined recon pipeline:

Vehicle Intake → MPI → Estimate → Approval → Repair → QC → Ready for Sale → Sold

Core modules: Dealer Dashboard · Units · Add Unit · Unit Detail · MPI Inspection · Estimate · Approval · Repair · QC · Ready for Sale · Sold · Photos · Notes · Activity Log · Users/Roles · Dealer Settings.

## Stack

- Vite + React 18 + TypeScript
- Tailwind CSS + shadcn/ui (Radix primitives)
- React Router v6
- TanStack Query
- Supabase (Postgres + Auth + Storage + Edge Functions) — multi-tenant via `dealer_id` with RLS

## Local development

Prereqs: Node 20+ and npm.

```sh
npm install
cp .env.example .env   # then fill in real values
npm run dev            # http://localhost:8080
```

Other scripts:

```sh
npm run build          # production build
npm run build:dev      # development-mode build
npm run lint           # eslint
npm test               # vitest run
npm run test:watch     # vitest watch mode
npm run preview        # preview production build
```

## Environment

Reconverse has **no client-side environment variables**. The frontend always
talks to same-origin `/api/v1/*` paths. A Vercel serverless function at
`api/proxy.ts` reverse-proxies those to Motorverse Mission Control.

Configure transport on Vercel:

| Var (Production)   | Where           | Purpose                                  |
|--------------------|-----------------|------------------------------------------|
| `MC_API_INTERNAL`  | Vercel project  | Public URL of MC (e.g. https://mc.example) |

The `supabase/` directory in this repo is legacy — Reconverse no longer uses
Supabase auth, storage, or edge functions. All identity + data flows through
MC's `/api/v1/auth/*` and `/api/v1/reconverse/*` endpoints.

## Supabase

- Migrations live in `supabase/migrations/`
- Edge functions in `supabase/functions/`
- Config in `supabase/config.toml`

Schema highlights: `dealers`, `dealer_memberships`, `profiles`, `units`, `unit_inspection_items`, `unit_tire_inspections`, `unit_photos`, `unit_comments`, `unit_activity_logs`, `stage_history`, `estimates` + `estimate_operations` + `estimate_items`, `work_orders` + `work_order_items`, `notifications` + `notification_reads`.

Every tenant-scoped table is gated by RLS via `is_dealer_member(dealer_id)` / `is_dealer_admin(dealer_id)` / `is_platform_admin()` security-definer functions.

## Roles

`dealer_owner` · `dealer_admin` · `manager` · `staff` (plus legacy `dealer_staff`). Permission helpers are in `src/lib/permissions.ts`. The active route guards are `DealerGuard` and `PlatformGuard`.

## Routing

- `/` — marketing landing (`pages/Index.tsx`)
- `/login` — sign-in
- `/platform/*` — platform admin (god mode)
- `/dealer/*` — dealer workspace
- `/dealer/recon-lane/:stage` — Recon Lane stage views (`mpi`, `estimate`, `approval`, `repair`, `qc`, `ready-for-sale`)
- `/dealer/billing` — subscription management (owner/admin only)

## Billing

Reconverse sells per-rooftop subscriptions via **Square**. The plan catalog +
entitlement logic live in `src/lib/plans.ts`; the in-app billing page is at
`/dealer/billing` and a public pricing section is on the landing page. Checkout,
webhook, and "manage" run as Vercel serverless functions in `api/billing/*`.
See `docs/BILLING.md` for the env vars and the MC contract.

## Project rules

- Audit before editing
- Multi-tenant: every dealer-scoped query must filter by `dealer_id`
- Mobile-first: users work from the lot
- Never hardcode secrets; use environment variables
- Run build / lint / tests when possible
- Report exact files changed after every implementation
