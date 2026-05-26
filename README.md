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

Real keys live in `.env` (gitignored). The template is `.env.example`. Only the Supabase anon/publishable key belongs in the frontend env — service-role keys must never be committed and must only live in Edge Function secrets.

| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PROJECT_ID` | Project ref |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Anon publishable key |

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

## Project rules

- Audit before editing
- Multi-tenant: every dealer-scoped query must filter by `dealer_id`
- Mobile-first: users work from the lot
- Never hardcode secrets; use environment variables
- Run build / lint / tests when possible
- Report exact files changed after every implementation
