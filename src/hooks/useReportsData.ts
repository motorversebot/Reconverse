import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentDealer } from "@/hooks/useDealerData";
import { startOfWeek, format, eachWeekOfInterval } from "date-fns";

export type DateRange = { from: Date; to: Date };

export function useReportsData(range: DateRange) {
  const { data: membership } = useCurrentDealer();
  const dealerId = membership?.dealer_id;

  return useQuery({
    queryKey: ["reports", dealerId, range.from.toISOString(), range.to.toISOString()],
    enabled: !!dealerId,
    queryFn: async () => {
      const fromIso = range.from.toISOString();
      const toIso = range.to.toISOString();

      // Pull data in parallel
      const [unitsRes, stageRes, estRes, itemsRes, opsRes, logsRes, profilesRes] = await Promise.all([
        (supabase.from("units").select("id, status, created_at, stage_entered_at, promise_date") as any)
          .eq("dealer_id", dealerId)
          .eq("is_deleted", false),
        (supabase.from("stage_history").select("unit_id, stage, entered_at, exited_at") as any)
          .eq("dealer_id", dealerId)
          .gte("entered_at", fromIso),
        (supabase.from("estimates").select("id, unit_id, status, created_at") as any)
          .eq("dealer_id", dealerId)
          .gte("created_at", fromIso)
          .lte("created_at", toIso),
        (supabase.from("estimate_items").select("operation_id, type, qty, unit_price, hours, labor_rate, status, created_at") as any)
          .eq("dealer_id", dealerId)
          .gte("created_at", fromIso)
          .lte("created_at", toIso),
        (supabase.from("estimate_operations").select("id, estimate_id, approval_status, created_at") as any)
          .eq("dealer_id", dealerId)
          .gte("created_at", fromIso)
          .lte("created_at", toIso),
        (supabase.from("unit_activity_logs").select("user_id, action_type, created_at") as any)
          .eq("dealer_id", dealerId)
          .gte("created_at", fromIso)
          .lte("created_at", toIso),
        supabase.from("profiles").select("id, full_name, email"),
      ]);

      const units = unitsRes.data ?? [];
      const stage = stageRes.data ?? [];
      const estimates = estRes.data ?? [];
      const items = itemsRes.data ?? [];
      const ops = opsRes.data ?? [];
      const logs = logsRes.data ?? [];
      const profiles = profilesRes.data ?? [];

      // ── Cycle time & throughput ──
      const completedInRange = units.filter(
        (u: any) =>
          (u.status === "ready" || u.status === "sold") &&
          new Date(u.stage_entered_at) >= range.from &&
          new Date(u.stage_entered_at) <= range.to,
      );

      const cycleTimes = completedInRange
        .map((u: any) => (new Date(u.stage_entered_at).getTime() - new Date(u.created_at).getTime()) / 3600_000)
        .sort((a: number, b: number) => a - b);
      const avgCycle = cycleTimes.length ? cycleTimes.reduce((s: number, n: number) => s + n, 0) / cycleTimes.length : 0;
      const medianCycle = cycleTimes.length ? cycleTimes[Math.floor(cycleTimes.length / 2)] : 0;

      // Weekly throughput
      const weeks = eachWeekOfInterval({ start: range.from, end: range.to }, { weekStartsOn: 1 });
      const weekly = weeks.map((w) => ({
        week: format(w, "MMM d"),
        completed: completedInRange.filter(
          (u: any) => format(startOfWeek(new Date(u.stage_entered_at), { weekStartsOn: 1 }), "MMM d") === format(w, "MMM d"),
        ).length,
      }));

      // ── Bottleneck: avg time per stage from stage_history ──
      const stageMap: Record<string, { total: number; count: number }> = {};
      for (const s of stage) {
        if (!s.exited_at) continue;
        const hrs = (new Date(s.exited_at).getTime() - new Date(s.entered_at).getTime()) / 3600_000;
        if (!stageMap[s.stage]) stageMap[s.stage] = { total: 0, count: 0 };
        stageMap[s.stage].total += hrs;
        stageMap[s.stage].count += 1;
      }
      const stageAvgs = Object.entries(stageMap).map(([stage, v]) => ({
        stage,
        avgHours: v.count ? v.total / v.count : 0,
      }));

      // Aged units per current stage
      const now = Date.now();
      const agedByStage: Record<string, { yellow: number; red: number }> = {};
      for (const u of units) {
        if (u.status === "ready" || u.status === "sold") continue;
        const days = (now - new Date(u.stage_entered_at).getTime()) / 86_400_000;
        if (!agedByStage[u.status]) agedByStage[u.status] = { yellow: 0, red: 0 };
        if (days >= 6) agedByStage[u.status].red++;
        else if (days >= 3) agedByStage[u.status].yellow++;
      }

      // ── Financial ──
      const opStatusById = new Map(ops.map((o: any) => [o.id, o.approval_status]));
      let totalEstimated = 0;
      let totalApproved = 0;
      let partsTotal = 0;
      for (const it of items) {
        const lineTotal =
          it.type === "labor"
            ? Number(it.hours) * Number(it.labor_rate)
            : Number(it.qty) * Number(it.unit_price);
        totalEstimated += lineTotal;
        if (it.type === "part") partsTotal += lineTotal;
        const opStatus = opStatusById.get(it.operation_id);
        if (opStatus === "approved") totalApproved += lineTotal;
      }
      const approvalRate =
        ops.length > 0 ? ops.filter((o: any) => o.approval_status === "approved").length / ops.length : 0;
      const avgPerUnit = estimates.length ? totalEstimated / estimates.length : 0;

      const weeklyApproved = weeks.map((w) => {
        const wk = format(w, "MMM d");
        const wkItems = items.filter((it: any) => {
          const itemWeek = format(startOfWeek(new Date(it.created_at), { weekStartsOn: 1 }), "MMM d");
          return itemWeek === wk && opStatusById.get(it.operation_id) === "approved";
        });
        const total = wkItems.reduce(
          (s: number, it: any) =>
            s + (it.type === "labor" ? Number(it.hours) * Number(it.labor_rate) : Number(it.qty) * Number(it.unit_price)),
          0,
        );
        return { week: wk, approved: Math.round(total) };
      });

      // ── Productivity ──
      const profileMap = new Map(profiles.map((p: any) => [p.id, p.full_name || p.email || "Unknown"]));
      const userStats: Record<string, { name: string; mpi: number; repairs: number; estimates: number; photos: number }> = {};
      for (const l of logs) {
        if (!l.user_id) continue;
        if (!userStats[l.user_id]) {
          userStats[l.user_id] = {
            name: (profileMap.get(l.user_id) as string) ?? "Unknown",
            mpi: 0, repairs: 0, estimates: 0, photos: 0,
          };
        }
        const t = l.action_type as string;
        if (t.startsWith("mpi_")) userStats[l.user_id].mpi++;
        else if (t === "repair_item_done") userStats[l.user_id].repairs++;
        else if (t === "estimate_submitted") userStats[l.user_id].estimates++;
        else if (t === "photo_uploaded") userStats[l.user_id].photos++;
      }
      const productivity = Object.values(userStats).sort(
        (a, b) => b.mpi + b.repairs + b.estimates + b.photos - (a.mpi + a.repairs + a.estimates + a.photos),
      );

      return {
        cycle: {
          avgHours: avgCycle,
          medianHours: medianCycle,
          completedCount: completedInRange.length,
          weekly,
        },
        bottleneck: { stageAvgs, agedByStage },
        financial: {
          totalEstimated,
          totalApproved,
          partsTotal,
          avgPerUnit,
          approvalRate,
          weeklyApproved,
          estimateCount: estimates.length,
        },
        productivity,
      };
    },
  });
}

export function downloadCSV(filename: string, rows: Record<string, any>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => JSON.stringify(r[h] ?? "")).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
