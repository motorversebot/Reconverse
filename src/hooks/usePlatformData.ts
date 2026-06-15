import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export interface PlatformDealer {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface RecentActivityUnit {
  id: string;
  year: number | null;
  make: string | null;
  model: string | null;
  created_at: string;
  dealers?: { name?: string | null } | null;
}

export interface RecentActivityUser {
  id: string;
  email?: string | null;
  full_name?: string | null;
  created_at: string;
}

export interface RecentActivity {
  recentUnits: RecentActivityUnit[];
  recentUsers: RecentActivityUser[];
}

export function useDealers() {
  return useQuery({
    queryKey: ["platform-dealers"],
    queryFn: async () => {
      const res = await apiFetch("/api/v1/reconverse/platform/dealers");
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) return [] as PlatformDealer[];
      return j.data.dealers as PlatformDealer[];
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
      return j.data.dealer as PlatformDealer;
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
      return j.data.memberships as unknown[];
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
      return j.data.units as unknown[];
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
      return j.data.users as unknown[];
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
      if (!res.ok || !j?.ok) return [] as unknown as RecentActivity;
      return j.data.activity as RecentActivity;
    },
  });
}
