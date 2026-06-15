import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export interface ActivityLog {
  id: string;
  action_type: string;
  stage: string;
  user_id: string | null;
  description: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
  profiles?: { full_name?: string | null; email?: string | null } | null;
}

export function useUnitActivityLogs(unitId: string | undefined, dealerId: string | undefined) {
  return useQuery({
    queryKey: ["unit-activity-logs", unitId],
    queryFn: async () => {
      const res = await apiFetch(`/api/v1/reconverse/units/${unitId}/activity-logs`);
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) return [] as ActivityLog[];
      return j.data.logs as ActivityLog[];
    },
    enabled: !!unitId && !!dealerId,
  });
}
