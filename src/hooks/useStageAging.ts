import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export function formatAgingDuration(hours: number): string {
  if (hours < 1) return "<1h";
  const days = Math.floor(hours / 24);
  const h = Math.round(hours % 24);
  if (days === 0) return `${h}h`;
  if (h === 0) return `${days}d`;
  return `${days}d ${h}h`;
}

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

export function hoursInStage(stageEnteredAt: string): number {
  return (Date.now() - new Date(stageEnteredAt).getTime()) / (1000 * 60 * 60);
}

export function useDealerAgingStats(dealerId?: string) {
  return useQuery({
    queryKey: ["dealer-aging-stats", dealerId],
    queryFn: async () => {
      const res = await apiFetch(`/api/v1/reconverse/dealers/${dealerId}/stage-aging`);
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) return [];
      return j.data.stats as any[];
    },
    enabled: !!dealerId,
  });
}
