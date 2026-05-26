import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export function useUnitActivityLogs(unitId: string | undefined, dealerId: string | undefined) {
  return useQuery({
    queryKey: ["unit-activity-logs", unitId],
    queryFn: async () => {
      const res = await apiFetch(`/api/v1/reconverse/units/${unitId}/activity-logs`);
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) return [];
      return j.data.logs as any[];
    },
    enabled: !!unitId && !!dealerId,
  });
}
