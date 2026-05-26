import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Format a duration in hours to human-readable "2d 4h", "18h", "5d" */
export function formatAgingDuration(hours: number): string {
  if (hours < 1) return "<1h";
  const days = Math.floor(hours / 24);
  const h = Math.round(hours % 24);
  if (days === 0) return `${h}h`;
  if (h === 0) return `${days}d`;
  return `${days}d ${h}h`;
}

/** Get aging color class based on days */
export function agingColor(hours: number): "green" | "yellow" | "red" {
  const days = hours / 24;
  if (days < 3) return "green";
  if (days < 6) return "yellow";
  return "red";
}

export const AGING_COLORS = {
  green: "text-emerald-400",
  yellow: "text-amber-400",
  red: "text-red-400",
} as const;

export const AGING_BG = {
  green: "bg-emerald-500/10 border-l-emerald-500",
  yellow: "bg-amber-500/10 border-l-amber-500",
  red: "bg-red-500/10 border-l-red-500",
} as const;

/** Calculate hours in current stage from stage_entered_at */
export function hoursInStage(stageEnteredAt: string): number {
  return (Date.now() - new Date(stageEnteredAt).getTime()) / (1000 * 60 * 60);
}

/** Dashboard aging stats: avg duration per stage for active units */
export function useDealerAgingStats(dealerId?: string) {
  return useQuery({
    queryKey: ["dealer-aging-stats", dealerId],
    queryFn: async () => {
      if (!dealerId) return [];
      // Get all active units with their stage_entered_at
      const { data, error } = await (supabase
        .from("units")
        .select("status, stage_entered_at")
        .eq("dealer_id", dealerId) as any)
        .eq("is_deleted", false)
        .not("status", "in", '("ready","sold")');
      if (error) throw error;

      // Group by stage and calculate avg hours
      const stageMap: Record<string, { total: number; count: number }> = {};
      for (const u of data ?? []) {
        const hours = hoursInStage(u.stage_entered_at);
        if (!stageMap[u.status]) stageMap[u.status] = { total: 0, count: 0 };
        stageMap[u.status].total += hours;
        stageMap[u.status].count += 1;
      }

      return Object.entries(stageMap).map(([stage, { total, count }]) => ({
        stage,
        count,
        avgHours: total / count,
      }));
    },
    enabled: !!dealerId,
    refetchInterval: 60_000, // refresh every minute
  });
}
