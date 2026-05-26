import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export function useCurrentDealer() {
  return useQuery({
    queryKey: ["current-dealer"],
    queryFn: async () => {
      const res = await apiFetch("/api/v1/reconverse/me/membership");
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) throw new Error(j?.error || "Failed to load membership");
      return j.data as {
        dealer_id: string;
        dealer_name: string;
        role: string;
        is_active: boolean;
      };
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
