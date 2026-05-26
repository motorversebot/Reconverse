import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Car, CheckCircle, Activity, Clock, AlertTriangle, DollarSign,
  TrendingUp, TrendingDown, Plus, Download, Users, ExternalLink,
  ChevronRight, Search, Filter, Eye, CalendarClock,
} from "lucide-react";
import WelcomeOnboarding from "@/components/dealer/WelcomeOnboarding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useCurrentDealer } from "@/hooks/useDealerData";
import { useDashboardData, STAGE_THRESHOLDS, type EnrichedUnit, type AgingBucket } from "@/hooks/useDashboardData";
import { STAGE_META, PIPELINE_STAGES, STATUS_TO_SLUG, type UnitStatus } from "@/lib/pipeline";
import { formatAgingDuration } from "@/hooks/useStageAging";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip as RechartsTooltip,
  AreaChart, Area,
} from "recharts";

// ── Stage accent colors ──
const STAGE_COLORS: Record<string, string> = {
  inspection: "bg-amber-400",
  estimate: "bg-blue-400",
  approval: "bg-orange-400",
  repair: "bg-purple-400",
  qc: "bg-teal-400",
  ready: "bg-emerald-500",
  sold: "bg-muted-foreground",
};

const STAGE_TEXT: Record<string, string> = {
  inspection: "text-amber-400",
  estimate: "text-blue-400",
  approval: "text-orange-400",
  repair: "text-purple-400",
  qc: "text-teal-400",
  ready: "text-emerald-400",
  sold: "text-muted-foreground",
};

const STAGE_BG: Record<string, string> = {
  inspection: "bg-amber-400/10",
  estimate: "bg-blue-400/10",
  approval: "bg-orange-400/10",
  repair: "bg-purple-400/10",
  qc: "bg-teal-400/10",
  ready: "bg-emerald-500/10",
  sold: "bg-muted/20",
};

export default function DealerDashboard() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { data: membership } = useCurrentDealer();
  const dealerId = membership?.dealer_id;
  const { data, isLoading } = useDashboardData(dealerId);

  const [stageFilter, setStageFilter] = useState<string>("all");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [search, setSearch] = useState("");

  // Welcome onboarding — show on first visit when no units exist
  const onboardingKey = dealerId ? `mv_onboarding_dismissed_${dealerId}` : null;
  const [onboardingDismissed, setOnboardingDismissed] = useState(() => {
    if (!onboardingKey) return true;
    return localStorage.getItem(onboardingKey) === "1";
  });
  const dismissOnboarding = useCallback(() => {
    if (onboardingKey) localStorage.setItem(onboardingKey, "1");
    setOnboardingDismissed(true);
  }, [onboardingKey]);

  // Filtered units for priority table
  const filteredUnits = useMemo(() => {
    if (!data) return [];
    let units = data.enrichedUnits.filter(u => u.status !== "sold");
    if (stageFilter !== "all") units = units.filter(u => u.status === stageFilter);
    if (overdueOnly) units = units.filter(u => u.isOverdue);
    if (search) {
      const q = search.toLowerCase();
      units = units.filter(u =>
        (u.vin?.toLowerCase().includes(q)) ||
        (u.stock_number?.toLowerCase().includes(q)) ||
        (`${u.year} ${u.make} ${u.model}`.toLowerCase().includes(q))
      );
    }
    return units.sort((a, b) => b.hoursInStage - a.hoursInStage);
  }, [data, stageFilter, overdueOnly, search]);

  // Alerts
  const alerts = useMemo(() => {
    if (!data) return [];
    const items: { label: string; count: number; stage?: string; type?: string }[] = [];
    data.agingBuckets.forEach(b => {
      if (b.overdueCount > 0) {
        const meta = STAGE_META[b.stage as UnitStatus];
        const thresholdDays = Math.round((STAGE_THRESHOLDS[b.stage] ?? 48) / 24);
        items.push({
          label: `${meta?.label ?? b.stage} > ${thresholdDays}d`,
          count: b.overdueCount,
          stage: b.stage,
        });
      }
    });
    // Promise overdue alert
    if (data.kpis.promiseOverdueCount > 0) {
      items.push({
        label: "Past Promise Date",
        count: data.kpis.promiseOverdueCount,
        type: "promise",
      });
    }
    return items;
  }, [data]);

  if (isLoading || !data) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 rounded-lg bg-muted/20" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass-panel h-24" />
          ))}
        </div>
        <div className="glass-panel h-32" />
      </div>
    );
  }

  const { kpis, agingBuckets, pipelineCounts, throughput } = data;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Command Center</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{membership?.dealers?.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs border-border/40 text-muted-foreground hover:text-foreground"
            onClick={() => navigate("/dealer/units")}
          >
            <Car className="h-3.5 w-3.5" /> Units
          </Button>
          <Button
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => navigate("/dealer/units")}
          >
            <Plus className="h-3.5 w-3.5" /> Add Unit
          </Button>
        </div>
      </div>

      {/* Welcome onboarding for new dealers */}
      {!onboardingDismissed && kpis.activeUnits === 0 && (
        <WelcomeOnboarding
          shopName={membership?.dealers?.name ?? "Your Shop"}
          onDismiss={dismissOnboarding}
        />
      )}

      {/* ── 1. KPI Grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPICard
          label="Active Units"
          value={kpis.activeUnits}
          icon={<Car className="h-4 w-4" />}
          onClick={() => navigate("/dealer/units")}
        />
        <KPICard
          label="Ready for Sale"
          value={kpis.readyCount}
          icon={<CheckCircle className="h-4 w-4" />}
          accent="text-emerald-400"
          onClick={() => navigate(`/dealer/recon-lane/ready-for-sale`)}
        />
        <KPICard
          label="Avg Recon Days"
          value={kpis.avgReconDays > 0 ? `${kpis.avgReconDays}` : "—"}
          sub="30-day rolling"
          icon={<Activity className="h-4 w-4" />}
        />
        <KPICard
          label="Oldest Unit"
          value={kpis.oldestUnitDays > 0 ? `${Math.round(kpis.oldestUnitDays)}d` : "—"}
          icon={<Clock className="h-4 w-4" />}
          accent={kpis.oldestUnitDays > 10 ? "text-red-400" : kpis.oldestUnitDays > 5 ? "text-amber-400" : undefined}
        />
        <KPICard
          label="Overdue"
          value={kpis.blockedCount}
          icon={<AlertTriangle className="h-4 w-4" />}
          accent={kpis.blockedCount > 0 ? "text-amber-400" : undefined}
          onClick={kpis.blockedCount > 0 ? () => { setOverdueOnly(true); setStageFilter("all"); } : undefined}
        />
        <KPICard
          label="Open Recon $"
          value={kpis.openReconDollars !== null ? `$${Math.round(kpis.openReconDollars).toLocaleString()}` : "—"}
          sub={kpis.estimatesMissingCount > 0 ? `${kpis.estimatesMissingCount} missing` : undefined}
          icon={<DollarSign className="h-4 w-4" />}
          accent="text-primary"
        />
      </div>

      {/* ── 2. Recon Pipeline ── */}
      <div className="glass-panel p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold tracking-[0.1em] uppercase text-muted-foreground/50">
            Recon Pipeline
          </p>
          <p className="text-xs text-muted-foreground/40">
            {kpis.activeUnits - kpis.readyCount} in pipeline
          </p>
        </div>

        <div className={cn(
          "grid gap-2",
          isMobile ? "grid-cols-3" : "grid-cols-7"
        )}>
          {([...PIPELINE_STAGES, "ready", "sold"] as UnitStatus[]).map(stage => {
            const count = pipelineCounts[stage] ?? 0;
            const meta = STAGE_META[stage];
            const bucket = agingBuckets.find(b => b.stage === stage);
            const avgDays = bucket ? (bucket.avgHours / 24).toFixed(1) : null;
            const overdue = bucket?.overdueCount ?? 0;

            return (
              <button
                key={stage}
                onClick={() => {
                  if (stage === "sold") return;
                  navigate(`/dealer/recon-lane/${STATUS_TO_SLUG[stage]}`);
                }}
                className={cn(
                  "glass-panel p-3 text-left transition-all duration-200 space-y-2",
                  count > 0 ? "hover:border-[rgba(255,255,255,0.1)]" : "opacity-50",
                  stage === "sold" && "cursor-default"
                )}
              >
                <div className="flex items-center gap-2">
                  <span className={cn("h-2 w-2 rounded-full shrink-0", STAGE_COLORS[stage])} />
                  <span className="text-[11px] font-medium text-muted-foreground/60 truncate">
                    {meta.label}
                  </span>
                </div>
                <p className={cn("text-xl font-bold tabular-nums", count > 0 ? "text-foreground" : "text-muted-foreground/30")}>
                  {count}
                </p>
                <div className="flex items-center justify-between">
                  {avgDays && count > 0 ? (
                    <span className="text-[10px] text-muted-foreground/40 tabular-nums">
                      ~{avgDays}d avg
                    </span>
                  ) : <span />}
                  {overdue > 0 && (
                    <span className="text-[10px] font-semibold text-red-400 tabular-nums">
                      {overdue} late
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 3. Alerts + 4. Aging Buckets side by side ── */}
      <div className={cn("grid gap-4", isMobile ? "grid-cols-1" : "grid-cols-2")}>
        {/* Alerts */}
        <div className="glass-panel p-4 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400/60" />
            <p className="text-[10px] font-semibold tracking-[0.1em] uppercase text-muted-foreground/50">
              Alerts
            </p>
          </div>
          {alerts.length === 0 ? (
            <p className="text-xs text-muted-foreground/40 py-2">No overdue units — all clear.</p>
          ) : (
            <div className="space-y-1.5">
              {alerts.map((a, i) => (
                <button
                  key={i}
                  onClick={() => {
                    if (a.stage) { setStageFilter(a.stage); setOverdueOnly(true); }
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-muted/10 hover:bg-muted/20 transition-colors"
                >
                  <span className="text-xs font-medium text-foreground/70">{a.label}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-red-500/15 text-red-400 border-0 text-[11px]">
                      {a.count}
                    </Badge>
                    <ChevronRight className="h-3 w-3 text-muted-foreground/30" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Aging Buckets */}
        <div className="glass-panel p-4 space-y-3">
          <p className="text-[10px] font-semibold tracking-[0.1em] uppercase text-muted-foreground/50">
            Aging by Stage
          </p>
          <div className="space-y-1">
            {/* Header */}
            <div className="grid grid-cols-[1fr_50px_50px_50px] gap-1 px-2 pb-1">
              <span />
              <span className="text-[9px] font-semibold text-emerald-400/60 text-center">0–2d</span>
              <span className="text-[9px] font-semibold text-amber-400/60 text-center">3–5d</span>
              <span className="text-[9px] font-semibold text-red-400/60 text-center">6+d</span>
            </div>
            {agingBuckets.filter(b => b.total > 0).map(b => {
              const meta = STAGE_META[b.stage as UnitStatus];
              return (
                <div key={b.stage} className="grid grid-cols-[1fr_50px_50px_50px] gap-1 items-center px-2 py-1.5 rounded-md hover:bg-muted/10 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className={cn("h-1.5 w-1.5 rounded-full", STAGE_COLORS[b.stage])} />
                    <span className="text-xs font-medium text-foreground/70">{meta?.label}</span>
                    <span className="text-[10px] text-muted-foreground/40">{b.total}</span>
                  </div>
                  <BucketCell count={b.green} color="emerald" onClick={() => setStageFilter(b.stage)} />
                  <BucketCell count={b.yellow} color="amber" onClick={() => setStageFilter(b.stage)} />
                  <BucketCell count={b.red} color="red" onClick={() => setStageFilter(b.stage)} />
                </div>
              );
            })}
            {agingBuckets.every(b => b.total === 0) && (
              <p className="text-xs text-muted-foreground/40 py-2 text-center">No active units in pipeline.</p>
            )}
          </div>
        </div>
      </div>

      {/* ── 5. Throughput Charts ── */}
      <div className={cn("grid gap-4", isMobile ? "grid-cols-1" : "grid-cols-2")}>
        <div className="glass-panel p-4 space-y-3">
          <p className="text-[10px] font-semibold tracking-[0.1em] uppercase text-muted-foreground/50">
            Units Added vs Completed (14d)
          </p>
          <div className="h-[120px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={throughput} barGap={1}>
                <XAxis
                  dataKey="date"
                  tick={false}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide />
                <RechartsTooltip
                  contentStyle={{
                    background: "hsl(224 45% 8%)",
                    border: "1px solid hsl(224 25% 14%)",
                    borderRadius: "8px",
                    fontSize: "11px",
                  }}
                  labelFormatter={(v) => new Date(v).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                />
                <Bar dataKey="added" fill="hsl(220 60% 50% / 0.5)" radius={[2, 2, 0, 0]} name="Added" />
                <Bar dataKey="completed" fill="hsl(152 60% 52% / 0.6)" radius={[2, 2, 0, 0]} name="Completed" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-4 px-1">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm" style={{ background: "hsl(220 60% 50% / 0.5)" }} />
              <span className="text-[10px] text-muted-foreground/50">Added</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm" style={{ background: "hsl(152 60% 52% / 0.6)" }} />
              <span className="text-[10px] text-muted-foreground/50">Completed</span>
            </div>
          </div>
        </div>

        <div className="glass-panel p-4 space-y-3">
          <p className="text-[10px] font-semibold tracking-[0.1em] uppercase text-muted-foreground/50">
            Daily Throughput Trend (14d)
          </p>
          <div className="h-[120px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={throughput}>
                <defs>
                  <linearGradient id="throughputGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(152 60% 52%)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(152 60% 52%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={false} axisLine={false} tickLine={false} />
                <YAxis hide />
                <RechartsTooltip
                  contentStyle={{
                    background: "hsl(224 45% 8%)",
                    border: "1px solid hsl(224 25% 14%)",
                    borderRadius: "8px",
                    fontSize: "11px",
                  }}
                  labelFormatter={(v) => new Date(v).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                />
                <Area
                  type="monotone"
                  dataKey="completed"
                  stroke="hsl(152 60% 52%)"
                  strokeWidth={2}
                  fill="url(#throughputGrad)"
                  name="Completed"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── 6. Priority Units Table ── */}
      <div className="glass-panel p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold tracking-[0.1em] uppercase text-muted-foreground/50">
            Priority Units
          </p>
          <span className="text-[11px] text-muted-foreground/40 tabular-nums">
            {filteredUnits.length} unit{filteredUnits.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Filters */}
        <div className={cn("flex gap-2 flex-wrap", isMobile && "flex-col")}>
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40" />
            <Input
              placeholder="Search VIN, stock, model..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs bg-muted/10 border-border/30"
            />
          </div>
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="w-[140px] h-8 text-xs bg-muted/10 border-border/30">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              {PIPELINE_STAGES.map(s => (
                <SelectItem key={s} value={s}>{STAGE_META[s].label}</SelectItem>
              ))}
              <SelectItem value="ready">Ready</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Switch
              checked={overdueOnly}
              onCheckedChange={setOverdueOnly}
              className="scale-[0.8]"
            />
            <span className="text-[11px] text-muted-foreground/50">Overdue only</span>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/20">
                <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/40 py-2 px-2">Vehicle</th>
                <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/40 py-2 px-2">VIN</th>
                <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/40 py-2 px-2">Stock</th>
                <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/40 py-2 px-2">Stage</th>
                <th className="text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/40 py-2 px-2">In Stage</th>
                <th className="text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/40 py-2 px-2">Total</th>
                <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/40 py-2 px-2">Promise</th>
                <th className="text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/40 py-2 px-2">Blockers</th>
              </tr>
            </thead>
            <tbody>
              {filteredUnits.slice(0, 20).map(u => {
                const meta = STAGE_META[u.status];
                return (
                  <tr
                    key={u.id}
                    onClick={() => navigate(`/dealer/units/${u.id}`)}
                    className="border-b border-border/10 hover:bg-muted/10 cursor-pointer transition-colors"
                  >
                    <td className="py-2.5 px-2">
                      <span className="text-xs font-medium text-foreground/80">
                        {u.year} {u.make} {u.model}
                      </span>
                      {u.trim && (
                        <span className="text-[10px] text-muted-foreground/40 ml-1">{u.trim}</span>
                      )}
                    </td>
                    <td className="py-2.5 px-2">
                      <span className="text-xs text-muted-foreground/60 font-mono">
                        {u.vin ? `...${u.vin.slice(-6)}` : "—"}
                      </span>
                    </td>
                    <td className="py-2.5 px-2">
                      <span className="text-xs text-muted-foreground/60">{u.stock_number ?? "—"}</span>
                    </td>
                    <td className="py-2.5 px-2">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium",
                        STAGE_BG[u.status], STAGE_TEXT[u.status]
                      )}>
                        <span className={cn("h-1.5 w-1.5 rounded-full", STAGE_COLORS[u.status])} />
                        {meta.label}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-right">
                      <span className={cn(
                        "text-xs font-semibold tabular-nums",
                        u.daysInStage >= 6 ? "text-red-400" :
                        u.daysInStage >= 3 ? "text-amber-400" : "text-emerald-400"
                      )}>
                        {formatAgingDuration(u.hoursInStage)}
                      </span>
                    </td>
                    <td className="py-2.5 px-2">
                      {u.promise_date ? (
                        <span className={cn(
                          "text-xs tabular-nums",
                          u.isPromiseOverdue ? "text-red-400 font-semibold" : "text-muted-foreground/50"
                        )}>
                          {new Date(u.promise_date + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </span>
                      ) : (
                        <span className="text-[11px] text-muted-foreground/20">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <div className="flex items-center justify-center gap-1 flex-wrap">
                        {u.blockers.map(b => (
                          <span
                            key={b}
                            className={cn(
                              "inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold",
                              b === "Promise" ? "bg-red-500/15 text-red-400" :
                              b === "Approval" ? "bg-orange-400/15 text-orange-400" :
                              "bg-teal-400/15 text-teal-400"
                            )}
                          >
                            {b}
                          </span>
                        ))}
                        {u.isOverdue && !u.blockers.includes("Promise") && (
                          <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-500/15 text-amber-400">
                            Late
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredUnits.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-xs text-muted-foreground/40">
                    No units match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {filteredUnits.length > 20 && (
          <button
            onClick={() => navigate("/dealer/units")}
            className="w-full text-center text-xs text-primary/60 hover:text-primary transition-colors py-1"
          >
            View all {filteredUnits.length} units →
          </button>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ──

function KPICard({
  label, value, sub, icon, accent, onClick,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  accent?: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        "glass-panel px-4 py-4 text-left transition-all duration-200 space-y-2",
        onClick && "hover:border-[rgba(255,255,255,0.08)] cursor-pointer",
        !onClick && "cursor-default"
      )}
    >
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground/40">{icon}</span>
        <span className="text-[10px] font-semibold tracking-wide uppercase text-muted-foreground/40 truncate">{label}</span>
      </div>
      <p className={cn("text-2xl font-bold tracking-tight tabular-nums", accent ?? "text-foreground")}>
        {value}
      </p>
      {sub && (
        <p className="text-[10px] text-muted-foreground/40">{sub}</p>
      )}
    </button>
  );
}

function BucketCell({ count, color, onClick }: { count: number; color: string; onClick?: () => void }) {
  if (count === 0) return <span className="text-center text-[11px] text-muted-foreground/20 tabular-nums">—</span>;
  const colorMap: Record<string, string> = {
    emerald: "bg-emerald-500/15 text-emerald-400",
    amber: "bg-amber-500/15 text-amber-400",
    red: "bg-red-500/15 text-red-400",
  };
  return (
    <button
      onClick={onClick}
      className={cn("text-center rounded-md py-0.5 text-[11px] font-semibold tabular-nums transition-colors", colorMap[color], "hover:opacity-80")}
    >
      {count}
    </button>
  );
}
