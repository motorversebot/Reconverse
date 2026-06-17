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

import { fetchDealerUnits } from "./useDealerData";
import { listEstimateItems } from "@/lib/estimateItems";

const DAY_MS = 1000 * 60 * 60 * 24;
const dayKey = (d: Date) => d.toISOString().split("T")[0];

function computeLocalDashboardData(dealerId: string, units: any[], openReconDollars: number) {
  const activeUnitsList = units.filter(u => !u.is_deleted && u.status !== "sold");
  
  const enrichedUnits: EnrichedUnit[] = activeUnitsList.map(u => {
    const hours = (Date.now() - new Date(u.stage_entered_at).getTime()) / (1000 * 60 * 60);
    const days = hours / 24;
    const totalDays = (Date.now() - new Date(u.created_at).getTime()) / (1000 * 60 * 60 * 24);
    
    const threshold = STAGE_THRESHOLDS[u.status] ?? 48;
    const isOverdue = hours > threshold;
    
    let isPromiseOverdue = false;
    if (u.promise_date) {
      const pDate = new Date(u.promise_date + "T00:00:00");
      isPromiseOverdue = Date.now() > pDate.getTime();
    }
    
    const blockers: string[] = [];
    if (isPromiseOverdue) blockers.push("Promise");
    if (u.status === "approval") blockers.push("Approval");
    
    if (u.notes?.toLowerCase().includes("blocker: parts") || u.notes?.toLowerCase().includes("waiting for parts")) {
      blockers.push("Parts");
    }
    
    return {
      ...u,
      hoursInStage: hours,
      daysInStage: days,
      totalDays,
      isOverdue,
      isPromiseOverdue,
      blockers,
    };
  });
  
  const activeUnitsCount = activeUnitsList.length;
  const readyCount = activeUnitsList.filter(u => u.status === "ready").length;
  const soldCount = units.filter(u => !u.is_deleted && u.status === "sold").length;
  
  const oldestUnitDays = activeUnitsList.reduce((max, u) => {
    const days = (Date.now() - new Date(u.created_at).getTime()) / (1000 * 60 * 60 * 24);
    return days > max ? days : max;
  }, 0);
  
  const blockedCount = enrichedUnits.filter(u => u.isOverdue || u.blockers.length > 0).length;
  const estimatesMissingCount = activeUnitsList.filter(u => u.status === "estimate").length;
  const promiseOverdueCount = enrichedUnits.filter(u => u.isPromiseOverdue).length;

  // Real avg recon cycle: completed units' created→done duration; if none done
  // yet, fall back to the average age of units still in recon. 0 when empty.
  const completedUnits = units.filter(u => !u.is_deleted && (u.status === "ready" || u.status === "sold"));
  const cycleSource = completedUnits.length ? completedUnits : activeUnitsList;
  const avgReconDays = cycleSource.length
    ? Math.round((cycleSource.reduce((sum, u) => {
        const end = (u.status === "ready" || u.status === "sold") && u.stage_entered_at
          ? new Date(u.stage_entered_at).getTime() : Date.now();
        return sum + (end - new Date(u.created_at).getTime()) / DAY_MS;
      }, 0) / cycleSource.length) * 10) / 10
    : 0;

  const kpis: DashboardKPIs = {
    activeUnits: activeUnitsCount,
    readyCount,
    soldCount,
    avgReconDays,
    oldestUnitDays,
    blockedCount,
    openReconDollars,
    estimatesMissingCount,
    promiseOverdueCount,
  };
  
  const pipelineCounts: Record<string, number> = {
    inspection: 0,
    estimate: 0,
    approval: 0,
    repair: 0,
    qc: 0,
    ready: 0,
    sold: 0,
  };
  units.filter(u => !u.is_deleted).forEach(u => {
    if (pipelineCounts[u.status] !== undefined) {
      pipelineCounts[u.status]++;
    }
  });
  
  const stages = ["inspection", "estimate", "approval", "repair", "qc"];
  const agingBuckets: AgingBucket[] = stages.map(stage => {
    const stageUnits = enrichedUnits.filter(u => u.status === stage);
    const threshold = STAGE_THRESHOLDS[stage] ?? 48;
    
    let green = 0;
    let yellow = 0;
    let red = 0;
    let totalHours = 0;
    let overdueCount = 0;
    
    stageUnits.forEach(u => {
      totalHours += u.hoursInStage;
      if (u.hoursInStage < threshold / 2) {
        green++;
      } else if (u.hoursInStage < threshold) {
        yellow++;
      } else {
        red++;
        overdueCount++;
      }
    });
    
    return {
      stage,
      green,
      yellow,
      red,
      total: stageUnits.length,
      avgHours: stageUnits.length > 0 ? totalHours / stageUnits.length : 0,
      overdueCount,
    };
  });
  
  // Real 14-day throughput: "added" by created_at; "completed" by units that
  // entered Ready/Sold (stage_entered_at) within the day.
  const addedByDay = new Map<string, number>();
  const completedByDay = new Map<string, number>();
  units.filter(u => !u.is_deleted).forEach(u => {
    if (u.created_at) {
      const k = dayKey(new Date(u.created_at));
      addedByDay.set(k, (addedByDay.get(k) ?? 0) + 1);
    }
    if ((u.status === "ready" || u.status === "sold") && u.stage_entered_at) {
      const k = dayKey(new Date(u.stage_entered_at));
      completedByDay.set(k, (completedByDay.get(k) ?? 0) + 1);
    }
  });
  const throughput: any[] = [];
  for (let i = 13; i >= 0; i--) {
    const dateStr = dayKey(new Date(Date.now() - i * DAY_MS));
    throughput.push({ date: dateStr, added: addedByDay.get(dateStr) ?? 0, completed: completedByDay.get(dateStr) ?? 0 });
  }
  
  return {
    kpis,
    agingBuckets,
    pipelineCounts,
    throughput,
    enrichedUnits,
  };
}

export function useDashboardData(dealerId?: string) {
  return useQuery({
    queryKey: ["dashboard-command-center", dealerId],
    queryFn: async () => {
      if (!dealerId) return null;
      const units = await fetchDealerUnits();
      // Real open recon $: sum of estimate grand totals for units that have an
      // estimate (estimate stage onward). Bounded + best-effort (never throws).
      const billable = units.filter(
        (u: any) => !u.is_deleted && ["estimate", "approval", "repair", "qc", "ready"].includes(u.status),
      );
      let openReconDollars = 0;
      try {
        const totals = await Promise.all(billable.map(async (u: any) => {
          try { const d = await listEstimateItems(u.id); return d.summary?.grand_total ?? 0; } catch { return 0; }
        }));
        openReconDollars = totals.reduce((a, b) => a + (Number(b) || 0), 0);
      } catch { openReconDollars = 0; }
      return computeLocalDashboardData(dealerId, units, openReconDollars);
    },
    enabled: !!dealerId,
  });
}

