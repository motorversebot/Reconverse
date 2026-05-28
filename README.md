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
- Motorverse Mission Control backend — auth + data via a same-origin API proxy (`/api/v1/*` → MC gateway). Multi-tenant via `dealer_id`.

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

The frontend needs **no** environment variables — browser requests stay same-origin (`/api/v1/*`) and are forwarded to Mission Control by the serverless proxy `api/v1/[...path].ts`.

| Variable | Scope | Purpose |
|---|---|---|
| `MC_API_INTERNAL` | Server (Vercel) | Mission Control gateway base URL the proxy forwards to. Optional; defaults to `http://motorverse.genesis.lan`. |

## Backend — Mission Control

Auth and all data live in Motorverse Mission Control, reached through a same-origin proxy:

`browser → /api/v1/* → api/v1/[...path].ts → MC gateway`

- **Auth**: JWT access/refresh tokens issued by Mission Control. Client is `src/lib/api.ts`; session lives in `src/hooks/useAuth.tsx`. Backend/"god-mode" access at `/platform` is gated on the `is_platform_admin` flag returned by MC (see `src/components/platform/PlatformGuard.tsx`).
- **Data**: the `src/hooks/use*Data.ts` / `use*Actions.ts` hooks call `/api/v1/reconverse/*` via `rvFetch` / `apiFetch`.

Domain entities (managed by Mission Control): `dealers`, `dealer_memberships`, `profiles`, `units`, `unit_inspection_items`, `unit_tire_inspections`, `unit_photos`, `unit_comments`, `unit_activity_logs`, `stage_history`, `estimates` + `estimate_operations` + `estimate_items`, `work_orders` + `work_order_items`, `notifications` + `notification_reads`.

> The `supabase/` directory (migrations, edge functions, config) is **legacy** from before the Mission Control migration and is no longer used by the running app. It is kept for schema/history reference only.

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
