import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PIPELINE_STAGES, type UnitStatus } from "@/lib/pipeline";

// ── Stage overdue thresholds (hours) ──
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
  green: number; // 0-2d
  yellow: number; // 3-5d
  red: number; // 6+d
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

/** Enriched unit with computed fields */
export interface EnrichedUnit extends DashboardUnit {
  hoursInStage: number;
  daysInStage: number;
  totalDays: number;
  isOverdue: boolean;
  isPromiseOverdue: boolean;
  blockers: string[];
}

/** Core dashboard data hook — fetches units + estimates in parallel */
export function useDashboardData(dealerId?: string) {
  return useQuery({
    queryKey: ["dashboard-command-center", dealerId],
    queryFn: async () => {
      if (!dealerId) return null;

      const [unitsRes, estimatesRes, membersRes, completedRes] = await Promise.all([
        // All active (non-deleted) units
        (supabase
          .from("units")
          .select("id, year, make, model, trim, color, vin, stock_number, status, stage_entered_at, created_at, dealer_id, promise_date")
          .eq("dealer_id", dealerId) as any)
          .eq("is_deleted", false),
        // Approved estimate totals (sum of approved ops' items)
        supabase
          .from("estimates")
          .select("id, unit_id, status")
          .eq("dealer_id", dealerId)
          .in("status", ["approved", "partial_approved", "submitted", "draft"]),
        // Team count
        supabase
          .from("dealer_memberships")
          .select("user_id", { count: "exact", head: true })
          .eq("dealer_id", dealerId)
          .eq("is_active", true),
        // Units completed in last 30 days (moved to ready or sold)
        supabase
          .from("stage_history")
          .select("unit_id, stage, entered_at")
          .eq("dealer_id", dealerId)
          .in("stage", ["ready", "sold"])
          .gte("entered_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
      ]);

      if (unitsRes.error) throw unitsRes.error;
      const units: DashboardUnit[] = unitsRes.data ?? [];

      // Get estimate item totals for open recon $
      let openReconDollars: number | null = null;
      let estimatesMissingCount = 0;
      const estimateData = estimatesRes.data ?? [];

      // Units not sold with approved estimates
      const activeUnitIds = new Set(
        units.filter(u => u.status !== "sold").map(u => u.id)
      );
      const unitsWithEstimates = new Set(
        estimateData.filter((e: any) => activeUnitIds.has(e.unit_id)).map((e: any) => e.unit_id)
      );

      // Get approved estimate items for financial calc
      const approvedEstimateIds = estimateData
        .filter((e: any) => activeUnitIds.has(e.unit_id) && ["approved", "partial_approved"].includes(e.status))
        .map((e: any) => e.id);

      if (approvedEstimateIds.length > 0) {
        const { data: items } = await supabase
          .from("estimate_items")
          .select("unit_price, qty, hours, labor_rate, type, operation_id")
          .eq("dealer_id", dealerId)
          .in("operation_id", await getApprovedOpIds(dealerId, approvedEstimateIds));

        if (items && items.length > 0) {
          openReconDollars = items.reduce((sum: number, item: any) => {
            if (item.type === "labor") {
              return sum + (item.hours * item.labor_rate);
            }
            return sum + (item.qty * item.unit_price);
          }, 0);
        }
      }

      estimatesMissingCount = activeUnitIds.size - unitsWithEstimates.size;

      // Enrich units
      const enriched: EnrichedUnit[] = units.map(u => {
        const hrs = hoursInStage(u.stage_entered_at);
        const days = hrs / 24;
        const totalD = totalDaysInRecon(u.created_at);
        const threshold = STAGE_THRESHOLDS[u.status];
        const isOverdue = threshold ? hrs > threshold : false;

        const blockers: string[] = [];
        if (u.status === "approval") blockers.push("Approval");
        if (u.status === "qc") blockers.push("QC");

        const today = new Date().toISOString().slice(0, 10);
        const isPromiseOverdue = !!(u.promise_date && u.promise_date < today && u.status !== "ready" && u.status !== "sold");
        if (isPromiseOverdue) blockers.push("Promise");

        return {
          ...u,
          hoursInStage: hrs,
          daysInStage: days,
          totalDays: totalD,
          isOverdue,
          isPromiseOverdue,
          blockers,
        };
      });

      // KPIs
      const activeUnits = units.filter(u => u.status !== "sold").length;
      const readyCount = units.filter(u => u.status === "ready").length;
      const soldCount = units.filter(u => u.status === "sold").length;

      // Avg recon days from completed units (stage_history)
      const completedUnits = completedRes.data ?? [];
      let avgReconDays = 0;
      if (completedUnits.length > 0) {
        // Get the creation dates for completed units
        const completedUnitIds = [...new Set(completedUnits.map((c: any) => c.unit_id))];
        const completedUnitData = units.filter(u => completedUnitIds.includes(u.id));
        if (completedUnitData.length > 0) {
          const totalDays = completedUnitData.reduce((sum, u) => sum + totalDaysInRecon(u.created_at), 0);
          avgReconDays = totalDays / completedUnitData.length;
        }
      }

      const oldestUnitDays = enriched
        .filter(u => u.status !== "sold" && u.status !== "ready")
        .reduce((max, u) => Math.max(max, u.totalDays), 0);

      const blockedCount = enriched.filter(u => u.isOverdue || u.blockers.length > 0).length;
      const promiseOverdueCount = enriched.filter(u => u.isPromiseOverdue).length;

      // Aging buckets
      const agingBuckets: AgingBucket[] = PIPELINE_STAGES.map(stage => {
        const stageUnits = enriched.filter(u => u.status === stage);
        let green = 0, yellow = 0, red = 0, totalHrs = 0;
        const threshold = STAGE_THRESHOLDS[stage] ?? 48;
        let overdueCount = 0;

        stageUnits.forEach(u => {
          totalHrs += u.hoursInStage;
          const d = u.daysInStage;
          if (d < 3) green++;
          else if (d < 6) yellow++;
          else red++;
          if (u.hoursInStage > threshold) overdueCount++;
        });

        return {
          stage,
          green,
          yellow,
          red,
          total: stageUnits.length,
          avgHours: stageUnits.length > 0 ? totalHrs / stageUnits.length : 0,
          overdueCount,
        };
      });

      // Pipeline counts (include ready + sold)
      const pipelineCounts: Record<string, number> = {};
      units.forEach(u => {
        pipelineCounts[u.status] = (pipelineCounts[u.status] || 0) + 1;
      });

      // Throughput data (last 14 days)
      const throughput = await computeThroughput(dealerId);

      const kpis: DashboardKPIs = {
        activeUnits,
        readyCount,
        soldCount,
        avgReconDays: Math.round(avgReconDays * 10) / 10,
        oldestUnitDays: Math.round(oldestUnitDays * 10) / 10,
        blockedCount,
        openReconDollars,
        estimatesMissingCount,
        promiseOverdueCount,
      };

      return {
        kpis,
        enrichedUnits: enriched,
        agingBuckets,
        pipelineCounts,
        throughput,
        teamCount: membersRes.count ?? 0,
      };
    },
    enabled: !!dealerId,
    refetchInterval: 60_000,
  });
}

async function getApprovedOpIds(dealerId: string, estimateIds: string[]): Promise<string[]> {
  const { data } = await supabase
    .from("estimate_operations")
    .select("id")
    .eq("dealer_id", dealerId)
    .in("estimate_id", estimateIds)
    .eq("approval_status", "approved");
  return (data ?? []).map((o: any) => o.id);
}

async function computeThroughput(dealerId: string) {
  const days = 14;
  const now = new Date();
  const result: { date: string; added: number; completed: number }[] = [];

  // Get units created in last 14 days
  const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
  const [addedRes, completedRes] = await Promise.all([
    (supabase
      .from("units")
      .select("created_at")
      .eq("dealer_id", dealerId) as any)
      .eq("is_deleted", false)
      .gte("created_at", since),
    supabase
      .from("stage_history")
      .select("entered_at")
      .eq("dealer_id", dealerId)
      .eq("stage", "ready")
      .gte("entered_at", since),
  ]);

  const addedDates = (addedRes.data ?? []).map((u: any) => u.created_at.slice(0, 10));
  const completedDates = (completedRes.data ?? []).map((s: any) => s.entered_at.slice(0, 10));

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().slice(0, 10);
    result.push({
      date: dateStr,
      added: addedDates.filter((dd: string) => dd === dateStr).length,
      completed: completedDates.filter((dd: string) => dd === dateStr).length,
    });
  }

  return result;
}
