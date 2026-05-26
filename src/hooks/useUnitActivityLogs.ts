import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ActivityLog {
  id: string;
  unit_id: string;
  dealer_id: string;
  user_id: string | null;
  stage: string;
  action_type: string;
  description: string;
  metadata: Record<string, any> | null;
  created_at: string;
  profiles?: { id: string; email: string | null; full_name: string | null } | null;
}

export function useUnitActivityLogs(unitId?: string, dealerId?: string) {
  return useQuery({
    queryKey: ["unit-activity-logs", unitId],
    queryFn: async (): Promise<ActivityLog[]> => {
      if (!unitId || !dealerId) return [];
      const { data, error } = await supabase
        .from("unit_activity_logs")
        .select("*, profiles(id, email, full_name)")
        .eq("unit_id", unitId)
        .eq("dealer_id", dealerId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as any) ?? [];
    },
    enabled: !!unitId && !!dealerId,
  });
}
