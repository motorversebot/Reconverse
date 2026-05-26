import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export function useDealers() {
  return useQuery({
    queryKey: ["platform-dealers"],
    queryFn: async () => {
      const res = await apiFetch("/api/v1/reconverse/platform/dealers");
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) return [];
      return j.data.dealers as any[];
    },
  });
}

export function useDealerDetail(dealerId: string) {
  return useQuery({
    queryKey: ["platform-dealer", dealerId],
    queryFn: async () => {
      const res = await apiFetch(`/api/v1/reconverse/platform/dealers/${dealerId}`);
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) throw new Error(j?.error || "Failed");
      return j.data.dealer as any;
    },
    enabled: !!dealerId,
  });
}

export function useDealerMemberships(dealerId?: string) {
  return useQuery({
    queryKey: ["platform-memberships", dealerId],
    queryFn: async () => {
      const res = await apiFetch(`/api/v1/reconverse/platform/dealers/${dealerId}/memberships`);
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) return [];
      return j.data.memberships as any[];
    },
    enabled: !!dealerId,
  });
}

export function useUnits(dealerId?: string) {
  return useQuery({
    queryKey: ["platform-units", dealerId],
    queryFn: async () => {
      const res = await apiFetch(`/api/v1/reconverse/platform/dealers/${dealerId}/units`);
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) return [];
      return j.data.units as any[];
    },
    enabled: !!dealerId,
  });
}

export function useProfiles() {
  return useQuery({
    queryKey: ["platform-profiles"],
    queryFn: async () => {
      const res = await apiFetch("/api/v1/reconverse/platform/users");
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) return [];
      return j.data.users as any[];
    },
  });
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ["platform-stats"],
    queryFn: async () => {
      const res = await apiFetch("/api/v1/reconverse/platform/stats");
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) return { dealerCount: 0, userCount: 0, unitCount: 0 };
      return j.data;
    },
  });
}

export function useRecentActivity() {
  return useQuery({
    queryKey: ["platform-recent-activity"],
    queryFn: async () => {
      const res = await apiFetch("/api/v1/reconverse/platform/recent-activity");
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) return [];
      return j.data.activity as any[];
    },
  });
}
