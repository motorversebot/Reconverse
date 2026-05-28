import { useQuery } from "@tanstack/react-query";
import { apiFetch, getMe } from "@/lib/api";

/**
 * Current dealer membership for the signed-in user.
 *
 * MC's /api/v1/reconverse/me/membership endpoint isn't implemented yet, so we
 * derive membership from /api/v1/auth/me (which DOES authenticate the user).
 * MC's global auth user doesn't currently carry tenant-scoped dealer_id/role,
 * so we fall back to safe defaults (dealer_id "1", role "owner") when those
 * fields aren't populated.
 *
 * Without this fallback, DealerGuard throws, redirects to /, Index redirects
 * back to /dealer, and the page hammers /auth/me in a render loop until MC
 * exposes the proper membership endpoint.
 *
 * TODO(MC): replace this with a real /api/v1/reconverse/me/membership call
 * once MC implements the endpoint.
 */
export function useCurrentDealer() {
  return useQuery({
    queryKey: ["current-dealer"],
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes — don't refetch on every mount
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const user = await getMe();
      if (!user) throw new Error("not_authenticated");
      return {
        dealer_id: user.dealer_id ?? "1",
        dealer_name: "",
        role: user.role ?? "dealer_owner",
        is_active: true,
      } as { dealer_id: string; dealer_name: string; role: string; is_active: boolean };
    },
  });
}

export function useDealerDashboardStats(dealerId?: string) {
  return useQuery({
    queryKey: ["dealer-dashboard-stats", dealerId],
    queryFn: async () => {
      const res = await apiFetch(`/api/v1/reconverse/dealers/${dealerId}/stats`);
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) throw new Error(j?.error || "Failed");
      return j.data;
    },
    enabled: !!dealerId,
  });
}

export function useDealerRecentUnits(dealerId?: string) {
  return useQuery({
    queryKey: ["dealer-recent-units", dealerId],
    queryFn: async () => {
      const res = await apiFetch(`/api/v1/reconverse/dealers/${dealerId}/units?recent=true&limit=10`);
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) return [];
      return j.data.units as any[];
    },
    enabled: !!dealerId,
  });
}

export function useDealerUnits(dealerId?: string) {
  return useQuery({
    queryKey: ["dealer-units", dealerId],
    queryFn: async () => {
      const res = await apiFetch(`/api/v1/reconverse/dealers/${dealerId}/units`);
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) return [];
      return j.data.units as any[];
    },
    enabled: !!dealerId,
  });
}

export function useDealerArchivedUnits(dealerId?: string) {
  return useQuery({
    queryKey: ["dealer-archived-units", dealerId],
    queryFn: async () => {
      const res = await apiFetch(`/api/v1/reconverse/dealers/${dealerId}/units?archived=true`);
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) return [];
      return j.data.units as any[];
    },
    enabled: !!dealerId,
  });
}

export function useDealerMembers(dealerId?: string) {
  return useQuery({
    queryKey: ["dealer-members", dealerId],
    queryFn: async () => {
      const res = await apiFetch(`/api/v1/reconverse/dealers/${dealerId}/members`);
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) return [];
      return j.data.members as any[];
    },
    enabled: !!dealerId,
  });
}
