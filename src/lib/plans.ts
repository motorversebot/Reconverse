/**
 * Subscription plan catalog + status helpers.
 *
 * This is the single source of truth for what Reconverse sells. The pricing
 * page, the in-app billing page, and plan-gating logic all read from here.
 *
 * Square is the system of record for the actual subscription. Each plan maps to
 * a Square catalog subscription-plan variation via `planKey`; the server-side
 * `api/billing/checkout.ts` function resolves `planKey` -> Square plan id from
 * environment variables (see docs/BILLING.md). We intentionally keep Square
 * catalog ids OUT of the client bundle.
 */

export type PlanKey = "starter" | "pro" | "enterprise";

/** Lifecycle of a dealer's subscription, mirrored from Square via MC. */
export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "paused"
  | "none"; // no subscription on record (e.g. brand-new dealer)

export interface Plan {
  key: PlanKey;
  name: string;
  /** Monthly price in USD, billed per dealer rooftop. */
  priceMonthly: number;
  tagline: string;
  /** Marketing bullet points. */
  features: string[];
  /** Max active reconditioning units; null = unlimited. */
  unitLimit: number | null;
  /** Max staff seats; null = unlimited. */
  seatLimit: number | null;
  /** Highlighted as the recommended plan on pricing surfaces. */
  popular?: boolean;
}

export const PLANS: Plan[] = [
  {
    key: "starter",
    name: "Starter",
    priceMonthly: 199,
    tagline: "For single rooftops getting recon under control.",
    unitLimit: 50,
    seatLimit: 5,
    features: [
      "Up to 50 active units",
      "Up to 5 staff seats",
      "Full recon pipeline (MPI → Ready)",
      "Estimates & approvals",
      "Photos, notes & activity log",
      "Email support",
    ],
  },
  {
    key: "pro",
    name: "Pro",
    priceMonthly: 449,
    tagline: "For growing dealers who live in the recon lane.",
    unitLimit: 250,
    seatLimit: 25,
    popular: true,
    features: [
      "Up to 250 active units",
      "Up to 25 staff seats",
      "Everything in Starter",
      "Reporting & cycle-time analytics",
      "VIN decode & bulk intake",
      "Priority support",
    ],
  },
  {
    key: "enterprise",
    name: "Enterprise",
    priceMonthly: 999,
    tagline: "For groups running multiple rooftops at volume.",
    unitLimit: null,
    seatLimit: null,
    features: [
      "Unlimited units",
      "Unlimited staff seats",
      "Everything in Pro",
      "Multi-rooftop rollups",
      "Dedicated onboarding",
      "SLA & phone support",
    ],
  },
];

export function getPlan(key: PlanKey | string | null | undefined): Plan | undefined {
  return PLANS.find((p) => p.key === key);
}

/**
 * The subscription record the app reasons about. Sourced from MC's billing
 * endpoint (which in turn mirrors Square). All fields optional so the UI can
 * degrade gracefully when MC hasn't implemented billing yet.
 */
export interface Subscription {
  status: SubscriptionStatus;
  planKey: PlanKey | null;
  /** ISO timestamp the current period (or trial) ends. */
  currentPeriodEnd?: string | null;
  /** True when the subscription will not renew at period end. */
  cancelAtPeriodEnd?: boolean;
}

/** Statuses that grant full access to the workspace. */
const ENTITLED_STATUSES: SubscriptionStatus[] = ["trialing", "active"];

/**
 * Whether the dealer should have working access to the paid product.
 *
 * `past_due` stays entitled so a billing hiccup doesn't instantly lock a paying
 * dealer out of their lot — we surface a banner instead and only hard-block on
 * `canceled`/`paused`. `none`/`unknown` defaults to entitled so existing
 * dealers aren't locked out before MC reports real billing data.
 */
export function isEntitled(sub: Subscription | null | undefined): boolean {
  if (!sub) return true; // unknown billing state -> don't block
  if (sub.status === "none") return true; // not yet provisioned -> don't block
  if (sub.status === "past_due") return true; // grace period (banner shown)
  return ENTITLED_STATUSES.includes(sub.status);
}

/** Whether we should nudge the dealer about a billing problem (non-blocking). */
export function needsBillingAttention(sub: Subscription | null | undefined): boolean {
  if (!sub) return false;
  return sub.status === "past_due" || sub.status === "trialing" || !!sub.cancelAtPeriodEnd;
}

/** Whether the workspace should be hard-blocked behind a paywall. */
export function isLockedOut(sub: Subscription | null | undefined): boolean {
  if (!sub) return false;
  return sub.status === "canceled" || sub.status === "paused";
}

const STATUS_LABELS: Record<SubscriptionStatus, string> = {
  trialing: "Trial",
  active: "Active",
  past_due: "Past due",
  canceled: "Canceled",
  paused: "Paused",
  none: "No subscription",
};

export function statusLabel(status: SubscriptionStatus): string {
  return STATUS_LABELS[status] ?? status;
}

/** Days remaining until the period/trial ends, or null if unknown/expired. */
export function daysRemaining(sub: Subscription | null | undefined): number | null {
  if (!sub?.currentPeriodEnd) return null;
  const end = new Date(sub.currentPeriodEnd).getTime();
  if (Number.isNaN(end)) return null;
  const diff = end - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / (24 * 60 * 60 * 1000));
}
