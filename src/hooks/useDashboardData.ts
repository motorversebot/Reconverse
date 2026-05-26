import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { type UnitStatus } from "@/lib/pipeline";

export const STAGE_THRESHOLDS: Record<string, number> = {
  inspection: 48,
  estimate: 48,
  approval: 72,
  repair: 120,
  qc: 48,
};

export interface DashboardUnit {
  id: string;
  year: number | null;
  make: string | null;
  model: string | null;
  trim: string | null;
  color: string | null;
  vin: string | null;
  stock_number: string | null;
  status: UnitStatus;
  stage_entered_at: string;
  created_at: string;
  dealer_id: string;
  promise_date: string | null;
}

export interface AgingBucket {
  stage: string;
  green: number;
  yellow: number;
  red: number;
  total: number;
  avgHours: number;
  overdueCount: number;
}

export interface DashboardKPIs {
  activeUnits: number;
  readyCount: number;
  soldCount: number;
  avgReconDays: number;
  oldestUnitDays: number;
  blockedCount: number;
  openReconDollars: number | null;
  estimatesMissingCount: number;
  promiseOverdueCount: number;
}

function hoursInStage(stageEnteredAt: string): number {
  return (Date.now() - new Date(stageEnteredAt).getTime()) / (1000 * 60 * 60);
}

function totalDaysInRecon(createdAt: string): number {
  return (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24);
}

export interface EnrichedUnit extends DashboardUnit {
  hoursInStage: number;
  daysInStage: number;
  totalDays: number;
  isOverdue: boolean;
  isPromiseOverdue: boolean;
  blockers: string[];
}

export function useDashboardData(dealerId?: string) {
  return useQuery({
    queryKey: ["dashboard-command-center", dealerId],
    queryFn: async () => {
      if (!dealerId) return null;
      const res = await apiFetch(`/api/v1/reconverse/dealers/${dealerId}/dashboard`);
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) throw new Error(j?.error || "Failed");
      return j.data;
    },
    enabled: !!dealerId,
  });
}
