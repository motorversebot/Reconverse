import { useQuery } from "@tanstack/react-query";
import { rvFetch } from "@/lib/api";
import type { Subscription, PlanKey } from "@/lib/plans";

/**
 * Current dealer's subscription, mirrored from Square via MC.
 *
 * MC exposes this at GET /api/v1/reconverse/billing/subscription. If MC hasn't
 * implemented billing yet (404/501/etc.) we resolve to `null`, which the plan
 * helpers treat as "unknown -> don't block" so we never lock a dealer out
 * before real billing data exists.
 */
export function useSubscription() {
  return useQuery<Subscription | null>({
    queryKey: ["subscription"],
    retry: false,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const res = await rvFetch<Subscription>("/billing/subscription");
      if (!res.ok) return null; // MC billing not available yet -> unknown
      return res.data;
    },
  });
}

export type { Subscription, PlanKey };
