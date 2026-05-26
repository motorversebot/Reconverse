import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Returns the current user's first active dealer membership + dealer info */
export function useCurrentDealer() {
  return useQuery({
    queryKey: ["current-dealer"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("dealer_memberships")
        .select("*, dealers(id, name, is_active)")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });
}

/** Dashboard stats for the current dealer */
export function useDealerDashboardStats(dealerId?: string) {
  return useQuery({
    queryKey: ["dealer-dashboard-stats", dealerId],
    queryFn: async () => {
      if (!dealerId) return null;
      const [units, recentUnits, memberships] = await Promise.all([
        (supabase.from("units").select("id", { count: "exact", head: true }).eq("dealer_id", dealerId) as any).eq("is_deleted", false),
        (supabase
          .from("units")
          .select("id", { count: "exact", head: true })
          .eq("dealer_id", dealerId) as any)
          .eq("is_deleted", false)
          .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
        supabase
          .from("dealer_memberships")
          .select("user_id", { count: "exact", head: true })
          .eq("dealer_id", dealerId)
          .eq("is_active", true),
      ]);
      return {
        totalUnits: units.count ?? 0,
        recentUnits: recentUnits.count ?? 0,
        totalUsers: memberships.count ?? 0,
      };
    },
    enabled: !!dealerId,
  });
}

/** Recent units for the current dealer */
export function useDealerRecentUnits(dealerId?: string) {
  return useQuery({
    queryKey: ["dealer-recent-units", dealerId],
    queryFn: async () => {
      if (!dealerId) return [];
      const { data, error } = await (supabase
        .from("units")
        .select("*")
        .eq("dealer_id", dealerId) as any)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!dealerId,
  });
}

/** All active units for a dealer */
export function useDealerUnits(dealerId?: string) {
  return useQuery({
    queryKey: ["dealer-units", dealerId],
    queryFn: async () => {
      if (!dealerId) return [];
      const { data, error } = await (supabase
        .from("units")
        .select("*")
        .eq("dealer_id", dealerId) as any)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!dealerId,
  });
}

/** All archived units for a dealer */
export function useDealerArchivedUnits(dealerId?: string) {
  return useQuery({
    queryKey: ["dealer-archived-units", dealerId],
    queryFn: async () => {
      if (!dealerId) return [];
      const { data, error } = await (supabase
        .from("units")
        .select("*")
        .eq("dealer_id", dealerId) as any)
        .eq("is_deleted", true)
        .order("deleted_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!dealerId,
  });
}

/** Members of a dealer with profile info */
export function useDealerMembers(dealerId?: string) {
  return useQuery({
    queryKey: ["dealer-members", dealerId],
    queryFn: async () => {
      if (!dealerId) return [];
      const { data, error } = await supabase
        .from("dealer_memberships")
        .select("*, profiles!dealer_memberships_user_id_profiles_fkey(id, email, full_name)")
        .eq("dealer_id", dealerId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!dealerId,
  });
}
