import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useDealers() {
  return useQuery({
    queryKey: ["platform-dealers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dealers")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useDealerDetail(dealerId: string) {
  return useQuery({
    queryKey: ["platform-dealer", dealerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dealers")
        .select("*")
        .eq("id", dealerId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!dealerId,
  });
}

export function useDealerMemberships(dealerId?: string) {
  return useQuery({
    queryKey: ["platform-memberships", dealerId],
    queryFn: async () => {
      let query = supabase
        .from("dealer_memberships")
        .select("*, profiles(id, email, full_name, is_platform_admin)")
        .order("created_at", { ascending: false });
      if (dealerId) query = query.eq("dealer_id", dealerId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useUnits(dealerId?: string) {
  return useQuery({
    queryKey: ["platform-units", dealerId],
    queryFn: async () => {
      let query = (supabase
        .from("units")
        .select("*, dealers(name)") as any)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });
      if (dealerId) query = query.eq("dealer_id", dealerId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useProfiles() {
  return useQuery({
    queryKey: ["platform-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*, dealer_memberships(dealer_id, role, is_active, dealers(name))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ["platform-dashboard-stats"],
    queryFn: async () => {
      const [dealers, profiles, units, recentUnits] = await Promise.all([
        supabase.from("dealers").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        (supabase.from("units").select("id", { count: "exact", head: true }) as any).eq("is_deleted", false),
        (supabase
          .from("units")
          .select("id", { count: "exact", head: true }) as any)
          .eq("is_deleted", false)
          .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      ]);
      return {
        totalDealers: dealers.count ?? 0,
        totalUsers: profiles.count ?? 0,
        totalUnits: units.count ?? 0,
        recentUnits: recentUnits.count ?? 0,
      };
    },
  });
}

export function useRecentActivity() {
  return useQuery({
    queryKey: ["platform-recent-activity"],
    queryFn: async () => {
      const [units, profiles, dealers] = await Promise.all([
        (supabase
          .from("units")
          .select("id, make, model, year, created_at, dealers(name)") as any)
          .eq("is_deleted", false)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("profiles")
          .select("id, email, full_name, created_at")
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("dealers")
          .select("id, name, created_at")
          .order("created_at", { ascending: false })
          .limit(5),
      ]);
      return {
        recentUnits: units.data ?? [],
        recentUsers: profiles.data ?? [],
        recentDealers: dealers.data ?? [],
      };
    },
  });
}
