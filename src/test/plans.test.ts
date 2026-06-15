import { describe, it, expect } from "vitest";
import {
  PLANS,
  getPlan,
  isEntitled,
  isLockedOut,
  needsBillingAttention,
  statusLabel,
  daysRemaining,
  type Subscription,
} from "@/lib/plans";

describe("plan catalog", () => {
  it("exposes three plans with unique keys", () => {
    expect(PLANS).toHaveLength(3);
    const keys = PLANS.map((p) => p.key);
    expect(new Set(keys).size).toBe(3);
  });

  it("resolves a plan by key and returns undefined for unknown", () => {
    expect(getPlan("pro")?.name).toBe("Pro");
    expect(getPlan("nope")).toBeUndefined();
    expect(getPlan(null)).toBeUndefined();
  });

  it("marks exactly one plan as popular", () => {
    expect(PLANS.filter((p) => p.popular)).toHaveLength(1);
  });
});

describe("entitlement", () => {
  const sub = (status: Subscription["status"]): Subscription => ({ status, planKey: "pro" });

  it("treats unknown/none billing as entitled (no lockout for existing dealers)", () => {
    expect(isEntitled(null)).toBe(true);
    expect(isEntitled(undefined)).toBe(true);
    expect(isEntitled(sub("none"))).toBe(true);
  });

  it("entitles active and trialing", () => {
    expect(isEntitled(sub("active"))).toBe(true);
    expect(isEntitled(sub("trialing"))).toBe(true);
  });

  it("keeps past_due entitled (grace) but flags attention", () => {
    expect(isEntitled(sub("past_due"))).toBe(true);
    expect(needsBillingAttention(sub("past_due"))).toBe(true);
  });

  it("locks out canceled and paused", () => {
    expect(isEntitled(sub("canceled"))).toBe(false);
    expect(isEntitled(sub("paused"))).toBe(false);
    expect(isLockedOut(sub("canceled"))).toBe(true);
    expect(isLockedOut(sub("paused"))).toBe(true);
  });

  it("flags attention for trial and pending cancellation", () => {
    expect(needsBillingAttention(sub("trialing"))).toBe(true);
    expect(needsBillingAttention({ status: "active", planKey: "pro", cancelAtPeriodEnd: true })).toBe(true);
    expect(needsBillingAttention(sub("active"))).toBe(false);
  });
});

describe("status + period helpers", () => {
  it("labels statuses", () => {
    expect(statusLabel("active")).toBe("Active");
    expect(statusLabel("past_due")).toBe("Past due");
  });

  it("computes days remaining, clamping past dates to 0", () => {
    const future = new Date(Date.now() + 3.2 * 24 * 60 * 60 * 1000).toISOString();
    expect(daysRemaining({ status: "active", planKey: "pro", currentPeriodEnd: future })).toBe(4);

    const past = new Date(Date.now() - 1000).toISOString();
    expect(daysRemaining({ status: "active", planKey: "pro", currentPeriodEnd: past })).toBe(0);

    expect(daysRemaining({ status: "active", planKey: "pro" })).toBeNull();
    expect(daysRemaining(null)).toBeNull();
  });
});
