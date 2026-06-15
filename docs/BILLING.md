# Billing (Square)

Reconverse sells per-rooftop subscriptions. Square is the system of record for
payments; the app reads subscription state back through Mission Control (MC).

## Pieces

| Piece | Location | Responsibility |
|-------|----------|----------------|
| Plan catalog | `src/lib/plans.ts` | The plans we sell + entitlement/status helpers. Single source of truth for pricing UI and gating. |
| Subscription read | `src/hooks/useSubscription.ts` → `GET /api/v1/reconverse/billing/subscription` | Current dealer's subscription, mirrored from Square by MC. Falls back to "unknown → don't block" if MC hasn't implemented it. |
| Checkout | `api/billing/checkout.ts` | Creates a Square hosted payment link for the chosen plan and returns its URL. |
| Webhook | `api/billing/webhook.ts` | Verifies Square's signature and forwards verified events to MC for persistence. |
| Manage | `api/billing/portal.ts` | Redirects to an operator-configured "manage billing" destination. |
| Billing UI | `src/pages/dealer/DealerBillingPage.tsx` (`/dealer/billing`) | Shows current plan/status and the plan cards. Owner/admin only. |

## Environment variables (set in Vercel, server-side only)

| Var | Used by | Purpose |
|-----|---------|---------|
| `SQUARE_ACCESS_TOKEN` | checkout | Square API token (sandbox or production) |
| `SQUARE_ENVIRONMENT` | checkout | `sandbox` or `production` (default `production`) |
| `SQUARE_LOCATION_ID` | checkout | Location the sale belongs to |
| `SQUARE_PLAN_STARTER` / `SQUARE_PLAN_PRO` / `SQUARE_PLAN_ENTERPRISE` | checkout | Plan price in **cents** (e.g. `19900`) |
| `APP_URL` | checkout | Public app origin for the post-checkout redirect |
| `SQUARE_WEBHOOK_SIGNATURE_KEY` | webhook | Signature key from the Square webhook subscription |
| `SQUARE_WEBHOOK_URL` | webhook | The exact public URL Square calls (this function) |
| `MC_API_INTERNAL` | checkout, webhook | MC base URL (identify dealer / forward events) |
| `MC_WEBHOOK_TOKEN` | webhook | Shared secret MC trusts the forwarder with |
| `SQUARE_BILLING_PORTAL_URL` | portal | Where "Manage billing" sends dealers (optional) |

No client-side env vars are added — the browser only calls same-origin
`/api/billing/*` and `/api/v1/*`.

## Flow

1. Owner/admin opens **/dealer/billing** and clicks **Subscribe** on a plan.
2. The browser POSTs `/api/billing/checkout` with the bearer token; the function
   resolves the dealer (via MC `/auth/me`), creates a Square payment link, and
   returns its URL. The browser redirects there.
3. Square collects payment and redirects back to `/dealer/billing?status=success`.
4. Square calls `/api/billing/webhook`. We verify the signature and forward the
   event to MC, which updates the dealer's subscription record.
5. `useSubscription()` re-reads `GET /api/v1/reconverse/billing/subscription`
   and the UI reflects the new plan/status.

## What MC must provide

This repo owns the frontend + the Vercel edge functions. MC owns persistence:

- `GET /api/v1/reconverse/billing/subscription` → `{ ok, data: { status, planKey,
  currentPeriodEnd?, cancelAtPeriodEnd? } }` where `status` is one of
  `trialing | active | past_due | canceled | paused | none`.
- `POST /api/v1/reconverse/billing/webhook` → accepts the forwarded Square event
  (trusted via `X-MC-Webhook-Token`), creates/links the Square customer +
  recurring subscription, and updates the dealer's record idempotently.

Until those exist, the app degrades gracefully: `useSubscription` resolves to
`null`, which the entitlement helpers treat as "unknown → don't block", so no
existing dealer is locked out. Checkout returns `billing_not_configured` (clean
JSON) until the Square env vars are set.

## Recurring subscriptions

`api/billing/checkout.ts` uses Square **payment links** as the hosted checkout
entry point. To make billing truly recurring, the operator:

1. Creates subscription plans in the Square Catalog.
2. Has MC's `billing/webhook` handler create the Square `Subscription` (customer
   + card-on-file + plan variation) when payment completes, and mirror its
   lifecycle back to the `billing/subscription` read endpoint.
