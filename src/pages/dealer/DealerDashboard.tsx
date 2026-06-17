import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Car, CheckCircle, Activity, Clock, AlertTriangle, DollarSign,
  TrendingUp, TrendingDown, Plus, Download, Users, ExternalLink,
  ChevronRight, Search, Filter, Eye, CalendarClock, ShieldAlert,
  ArrowRight,
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
  AreaChart, Area, CartesianGrid
} from "recharts";

// ── Stage accent colors ──
const STAGE_COLORS: Record<string, string> = {
  inspection: "bg-amber-400",
  estimate: "bg-blue-400",
  approval: "bg-orange-400",
  repair: "bg-purple-400",
  qc: "bg-teal-400",
  ready: "bg-accent",
  sold: "bg-muted-foreground",
};

const STAGE_TEXT: Record<string, string> = {
  inspection: "text-amber-500",
  estimate: "text-blue-400",
  approval: "text-orange-500",
  repair: "text-purple-400",
  qc: "text-teal-400",
  ready: "text-accent",
  sold: "text-muted-foreground",
};

const STAGE_BG: Record<string, string> = {
  inspection: "bg-amber-400/10",
  estimate: "bg-blue-400/10",
  approval: "bg-orange-400/10",
  repair: "bg-purple-400/10",
  qc: "bg-teal-400/10",
  ready: "bg-accent/10",
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

  // Onboarding key
  const onboardingKey = dealerId ? `mv_onboarding_dismissed_${dealerId}` : null;
  const [onboardingDismissed, setOnboardingDismissed] = useState(() => {
    if (!onboardingKey) return true;
    return localStorage.getItem(onboardingKey) === "1";
  });
  const dismissOnboarding = useCallback(() => {
    if (onboardingKey) localStorage.setItem(onboardingKey, "1");
    setOnboardingDismissed(true);
  }, [onboardingKey]);

  // Filtered units
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
          label: `${meta?.label ?? b.stage} over limit (> ${thresholdDays}d)`,
          count: b.overdueCount,
          stage: b.stage,
        });
      }
    });
    if (data.kpis.promiseOverdueCount > 0) {
      items.push({
        label: "Exceeded Promised Target",
        count: data.kpis.promiseOverdueCount,
        type: "promise",
      });
    }
    // Open safety recalls (confirmed not-completed) across active inventory.
    const openRecallUnits = data.enrichedUnits.filter(
      (u) => u.status !== "sold" && Number((u as any).open_recall_count || 0) > 0,
    ).length;
    if (openRecallUnits > 0) {
      items.unshift({ label: "Open safety recalls", count: openRecallUnits, type: "recall" });
    }
    return items;
  }, [data]);

  if (isLoading || !data) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-6 w-36 rounded-lg bg-muted/20" />
            <div className="h-4 w-48 rounded-lg bg-muted/20" />
          </div>
          <div className="h-8 w-24 rounded-lg bg-muted/20" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass-panel h-28" />
          ))}
        </div>
        <div className="glass-panel h-48" />
      </div>
    );
  }

  const { kpis, agingBuckets, pipelineCounts, throughput } = data;

  return (
    <div className="space-y-6">
      {/* Top command bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight uppercase">Command Center</h1>
          <p className="text-[10px] font-mono text-muted-foreground mt-1 uppercase tracking-widest">
            {membership?.dealers?.name ?? "Dealer Room"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 sm:flex-initial gap-2 h-11 sm:h-9 text-[10px] font-mono uppercase tracking-wider border-border bg-transparent text-muted-foreground hover:text-foreground rounded-none"
            onClick={() => navigate("/dealer/units")}
          >
            <Car className="h-3.5 w-3.5" /> All Units
          </Button>
          <Button
            size="sm"
            className="flex-1 sm:flex-initial gap-1.5 h-11 sm:h-9 text-[10px] font-mono uppercase tracking-wider bg-foreground text-background hover:bg-background hover:text-foreground border border-foreground rounded-none"
            onClick={() => navigate("/dealer/units?add=1")}
          >
            <Plus className="h-4 w-4" /> Add Unit
          </Button>
        </div>
      </div>

      {/* Onboarding trigger */}
      {!onboardingDismissed && kpis.activeUnits === 0 && (
        <WelcomeOnboarding
          shopName={membership?.dealers?.name ?? "Apex Operations"}
          onDismiss={dismissOnboarding}
        />
      )}

      {/* ── 1. Modern KPI Overlays ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <KPICard
          label="Active Units"
          value={kpis.activeUnits}
          sub="Lot Inventory"
          icon={<Car className="h-4 w-4 text-foreground" />}
          onClick={() => navigate("/dealer/units")}
        />
        <KPICard
          label="Ready for Sale"
          value={kpis.readyCount}
          sub="Finished Cycle"
          icon={<CheckCircle className="h-4 w-4 text-foreground" />}
          accent="text-foreground"
          onClick={() => navigate(`/dealer/recon-lane/ready-for-sale`)}
        />
        <KPICard
          label="Avg Recon Cycle"
          value={kpis.avgReconDays > 0 ? `${kpis.avgReconDays}d` : "—"}
          sub="30d rolling avg"
          icon={<Activity className="h-4 w-4 text-foreground" />}
        />
        <KPICard
          label="Oldest Unit"
          value={kpis.oldestUnitDays > 0 ? `${Math.round(kpis.oldestUnitDays)}d` : "—"}
          sub="Maximum age"
          icon={<Clock className="h-4 w-4 text-foreground" />}
          accent={kpis.oldestUnitDays > 10 ? "text-red-500" : kpis.oldestUnitDays > 5 ? "text-amber-500" : undefined}
        />
        <KPICard
          label="Overdue Alerts"
          value={kpis.blockedCount}
          sub="Action needed"
          icon={<AlertTriangle className="h-4 w-4 text-foreground" />}
          accent={kpis.blockedCount > 0 ? "text-amber-500" : undefined}
          onClick={kpis.blockedCount > 0 ? () => { setOverdueOnly(true); setStageFilter("all"); } : undefined}
        />
        <KPICard
          label="Recon Pipeline $"
          value={kpis.openReconDollars !== null ? `$${Math.round(kpis.openReconDollars).toLocaleString()}` : "—"}
          sub={kpis.estimatesMissingCount > 0 ? `${kpis.estimatesMissingCount} missing bills` : "Approved works"}
          icon={<DollarSign className="h-4 w-4 text-foreground" />}
        />
      </div>

      {/* ── 2. Interactive Pipeline Stages ── */}
      <div className="border border-border p-5 space-y-4 bg-card rounded-none">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <p className="text-[10px] font-mono tracking-widest uppercase text-muted-foreground">
              Pipeline Stages
            </p>
            <h3 className="text-xs font-mono uppercase text-foreground/80 mt-0.5">Distribution across lanes</h3>
          </div>
          <span className="text-[10px] font-mono text-foreground border border-border bg-muted px-2.5 py-0.5 rounded-none tabular-nums">
            {kpis.activeUnits - kpis.readyCount} pending
          </span>
        </div>

        <div className={cn(
          "grid gap-3",
          isMobile ? "grid-cols-2" : "grid-cols-7"
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
                disabled={stage === "sold"}
                className={cn(
                  "border p-4 text-left transition-colors duration-150 rounded-none relative group border-border",
                  count > 0 ? "hover:border-foreground hover:bg-muted" : "opacity-40 cursor-default",
                  stage === "sold" && "cursor-default"
                )}
              >
                <div className="flex items-center gap-2">
                  <span className={cn("h-1.5 w-1.5 rounded-none shrink-0", STAGE_COLORS[stage])} />
                  <span className="text-[9px] font-mono tracking-wider text-muted-foreground uppercase truncate">
                    {meta.label}
                  </span>
                </div>
                <p className={cn("text-2xl font-bold font-mono tracking-tight mt-2.5 tabular-nums", count > 0 ? "text-foreground" : "text-muted-foreground/35")}>
                  {count}
                </p>
                <div className="flex items-center justify-between mt-2 pt-1 border-t border-border">
                  {avgDays && count > 0 ? (
                    <span className="text-[9px] font-mono text-muted-foreground/45 tabular-nums">
                      {avgDays}d avg
                    </span>
                  ) : <span />}
                  {overdue > 0 && (
                    <span className="text-[9px] font-mono font-bold text-red-500 bg-red-950/20 border border-red-950 px-1 py-0.5 rounded-none tabular-nums">
                      {overdue} overdue
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 3. Action Panel & Aging side by side ── */}
      <div className={cn("grid gap-5", isMobile ? "grid-cols-1" : "grid-cols-2")}>
        {/* Active Alerts */}
        <div className="border border-border p-5 space-y-4 bg-card rounded-none">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <AlertTriangle className="h-4 w-4 text-foreground/80" />
            <div>
              <p className="text-[10px] font-mono tracking-widest uppercase text-muted-foreground">
                Action Alerts
              </p>
            </div>
          </div>
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground/45 gap-2">
              <CheckCircle className="h-6 w-6 text-foreground/40" />
              <p className="text-xs font-mono uppercase tracking-wider">All lanes green. No blockers found.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {alerts.map((a, i) => (
                <button
                  key={i}
                  onClick={() => {
                    if (a.stage) { setStageFilter(a.stage); setOverdueOnly(true); }
                  }}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-none bg-muted border border-border hover:border-foreground transition-colors text-left"
                >
                  <span className="text-xs font-mono uppercase text-foreground/80">{a.label}</span>
                  <div className="flex items-center gap-2.5">
                    <Badge className="bg-red-950/20 text-red-500 hover:bg-red-950/30 border border-red-950 text-[9px] font-mono font-bold px-2 rounded-none">
                      {a.count} units
                    </Badge>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Aging Buckets list */}
        <div className="border border-border p-5 space-y-4 bg-card rounded-none">
          <div className="border-b border-border pb-3">
            <p className="text-[10px] font-mono tracking-widest uppercase text-muted-foreground">
              Aging Analysis
            </p>
          </div>
          <div className="space-y-1">
            {/* Header row */}
            <div className="grid grid-cols-[1fr_60px_60px_60px] gap-2 px-2 pb-1.5 border-b border-border">
              <span className="text-[9px] font-mono text-muted-foreground/40 uppercase">Lane</span>
              <span className="text-[9px] font-mono text-foreground text-center uppercase tracking-wider">0–2d</span>
              <span className="text-[9px] font-mono text-foreground text-center uppercase tracking-wider">3–5d</span>
              <span className="text-[9px] font-mono text-foreground text-center uppercase tracking-wider">6d+</span>
            </div>
            
            {agingBuckets.filter(b => b.total > 0).map(b => {
              const meta = STAGE_META[b.stage as UnitStatus];
              return (
                <div key={b.stage} className="grid grid-cols-[1fr_60px_60px_60px] gap-2 items-center px-2 py-2.5 border-b border-border/10 hover:bg-muted/40 transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={cn("h-1.5 w-1.5 rounded-none shrink-0", STAGE_COLORS[b.stage])} />
                    <span className="text-xs font-mono uppercase text-foreground/80 truncate">{meta?.label}</span>
                    <span className="text-[9px] font-mono text-muted-foreground/50 bg-muted border border-border px-1.5 py-0.5 rounded-none">{b.total}</span>
                  </div>
                  <BucketCell count={b.green} color="emerald" onClick={() => setStageFilter(b.stage)} />
                  <BucketCell count={b.yellow} color="amber" onClick={() => setStageFilter(b.stage)} />
                  <BucketCell count={b.red} color="red" onClick={() => setStageFilter(b.stage)} />
                </div>
              );
            })}
            {agingBuckets.every(b => b.total === 0) && (
              <p className="text-xs font-mono uppercase text-muted-foreground/45 py-8 text-center">Empty lanes. Add cars to trigger logs.</p>
            )}
          </div>
        </div>
      </div>

      {/* ── 4. Charting Modules (Stark Monochrome) ── */}
      <div className={cn("grid gap-5", isMobile ? "grid-cols-1" : "grid-cols-2")}>
        <div className="border border-border p-5 space-y-4 bg-card rounded-none">
          <p className="text-[10px] font-mono tracking-widest uppercase text-muted-foreground">
            Intake vs Completes (14d)
          </p>
          <div className="h-[150px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={throughput} barGap={3}>
                <defs>
                  <linearGradient id="addedBarGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="completedBarGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--foreground))" stopOpacity={0.8} />
                    <stop offset="100%" stopColor="hsl(var(--foreground))" stopOpacity={0.2} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tick={false}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                  tickLine={false}
                />
                <YAxis hide />
                <RechartsTooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "0px",
                    fontSize: "10px",
                    fontFamily: "JetBrains Mono"
                  }}
                  labelFormatter={(v) => new Date(v).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                />
                <Bar dataKey="added" fill="url(#addedBarGrad)" stroke="hsl(var(--border))" name="Added" />
                <Bar dataKey="completed" fill="url(#completedBarGrad)" stroke="hsl(var(--foreground))" name="Completed" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-4 px-1 pt-2 border-t border-border">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-none bg-muted-foreground" />
              <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">Vehicles Added</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-none bg-foreground" />
              <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">Vehicles Completed</span>
            </div>
          </div>
        </div>

        <div className="border border-border p-5 space-y-4 bg-card rounded-none">
          <p className="text-[10px] font-mono tracking-widest uppercase text-muted-foreground">
            Completes Trend Volume
          </p>
          <div className="h-[150px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={throughput}>
                <defs>
                  <linearGradient id="trendAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--foreground))" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="hsl(var(--foreground))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={false} axisLine={{ stroke: "hsl(var(--border))" }} tickLine={false} />
                <YAxis hide />
                <RechartsTooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "0px",
                    fontSize: "10px",
                    fontFamily: "JetBrains Mono"
                  }}
                  labelFormatter={(v) => new Date(v).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                />
                <Area
                  type="monotone"
                  dataKey="completed"
                  stroke="hsl(var(--foreground))"
                  strokeWidth={1.5}
                  fill="url(#trendAreaGrad)"
                  name="Completed"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-1 px-1 pt-2 border-t border-border">
            <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground/50">14-day completion trend mapping</span>
          </div>
        </div>
      </div>

      {/* ── 5. Priority Units Table Redesign ── */}
      <div className="border border-border p-5 space-y-4 bg-card rounded-none">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <p className="text-[10px] font-mono tracking-widest uppercase text-muted-foreground">
              Priority Inventory lane
            </p>
          </div>
          <span className="text-[10px] font-mono text-muted-foreground/60 border border-border px-2 py-0.5 rounded-none">
            {filteredUnits.length} matches
          </span>
        </div>

        {/* Filters and Searches */}
        <div className={cn("flex gap-3 flex-wrap items-center", isMobile && "flex-col items-stretch")}>
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/45" />
            <Input
              placeholder="Search VIN, stock number, make model..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs font-mono bg-muted border-border rounded-none focus-visible:ring-foreground focus-visible:border-foreground"
            />
          </div>
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="w-[150px] h-9 text-[10px] font-mono uppercase tracking-wider bg-muted border-border rounded-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover border border-border text-[10px] font-mono uppercase tracking-wider rounded-none">
              <SelectItem value="all">All Stages</SelectItem>
              {PIPELINE_STAGES.map(s => (
                <SelectItem key={s} value={s}>{STAGE_META[s].label}</SelectItem>
              ))}
              <SelectItem value="ready">Ready</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2 bg-muted px-3 py-1.5 border border-border h-9 shrink-0 rounded-none">
            <Switch
              checked={overdueOnly}
              onCheckedChange={setOverdueOnly}
              className="scale-[0.8]"
            />
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/60 select-none">Overdue only</span>
          </div>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto border border-border rounded-none">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-border bg-muted/50 select-none font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60">
                <th className="py-3 px-4">Vehicle Details</th>
                <th className="py-3 px-4">VIN Identifier</th>
                <th className="py-3 px-4">Stock Num</th>
                <th className="py-3 px-4">Active Stage</th>
                <th className="py-3 px-4 text-right">Time in Stage</th>
                <th className="py-3 px-4 text-right">Total Recon</th>
                <th className="py-3 px-4">Promise Date</th>
                <th className="py-3 px-4 text-center">Blockers</th>
              </tr>
            </thead>
            <tbody>
              {filteredUnits.slice(0, 20).map(u => {
                const meta = STAGE_META[u.status];
                return (
                  <tr
                    key={u.id}
                    onClick={() => navigate(`/dealer/units/${u.id}`)}
                    className="border-b border-border/10 hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="font-bold text-foreground">
                        {u.year} {u.make} {u.model}
                      </div>
                      {u.trim && (
                        <div className="text-[10px] text-muted-foreground/50 font-semibold">{u.trim}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-muted-foreground/60">
                      {u.vin ? `${u.vin.slice(-6).toUpperCase()}` : "—"}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground/75 font-mono">
                      {u.stock_number ?? "—"}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 border border-border text-[9px] font-mono uppercase bg-muted text-foreground">
                        <span className={cn("h-1 w-1 rounded-none shrink-0", STAGE_COLORS[u.status])} />
                        {meta.label}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums">
                      <span className={cn(
                        "font-bold",
                        u.daysInStage >= 6 ? "text-red-500" :
                        u.daysInStage >= 3 ? "text-amber-500" : "text-foreground"
                      )}>
                        {formatAgingDuration(u.hoursInStage)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-muted-foreground/60 tabular-nums">
                      {Math.round(u.totalDays)}d
                    </td>
                    <td className="py-3 px-4 font-mono">
                      {u.promise_date ? (
                        <span className={cn(
                          "tabular-nums",
                          u.isPromiseOverdue ? "text-red-500" : "text-muted-foreground/50"
                        )}>
                          {new Date(u.promise_date + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" }).toUpperCase()}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/20">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1 flex-wrap font-mono text-[8px]">
                        {u.blockers.map(b => (
                          <span
                            key={b}
                            className={cn(
                              "inline-block px-1.5 py-0.5 border uppercase",
                              b === "Promise" ? "bg-red-950/20 text-red-500 border-red-950" :
                              b === "Approval" ? "bg-orange-950/20 text-orange-500 border-orange-950" :
                              "bg-muted text-foreground border-border"
                            )}
                          >
                            {b}
                          </span>
                        ))}
                        {u.isOverdue && !u.blockers.includes("Promise") && (
                          <span className="inline-block px-1.5 py-0.5 border bg-amber-950/20 text-amber-500 border-amber-950 uppercase">
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
                  <td colSpan={8} className="py-12 text-center text-xs font-mono uppercase text-muted-foreground/40">
                    No matching units found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {filteredUnits.length > 20 && (
          <button
            onClick={() => navigate("/dealer/units")}
            className="w-full text-center text-[10px] font-mono uppercase text-muted-foreground/80 hover:text-foreground py-1"
          >
            Show all {filteredUnits.length} lot units →
          </button>
        )}
      </div>
    </div>
  );
}

// ── KPICard Sub-component ──
function KPICard({
  label, value, sub, icon, accent, waveColor, onClick,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  waveColor?: string;
  accent?: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        "border border-border p-5 text-left transition-colors duration-150 bg-card rounded-none relative group",
        onClick ? "hover:border-foreground cursor-pointer" : "cursor-default"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[9px] font-mono tracking-widest uppercase text-muted-foreground truncate">{label}</span>
        <span className="text-muted-foreground shrink-0">{icon}</span>
      </div>
      <p className={cn("text-2xl font-bold font-mono tracking-tight mt-3 tabular-nums text-foreground", accent)}>
        {value}
      </p>
      {sub && (
        <p className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground/60 mt-1.5">{sub}</p>
      )}
    </button>
  );
}

// ── BucketCell Sub-component ──
function BucketCell({ count, color, onClick }: { count: number; color: string; onClick?: () => void }) {
  if (count === 0) return <span className="text-center text-[11px] text-muted-foreground/20 font-mono select-none">—</span>;
  const colorMap: Record<string, string> = {
    emerald: "border border-border text-foreground hover:border-foreground bg-muted",
    amber: "border border-border text-muted-foreground hover:border-foreground bg-muted",
    red: "border border-red-950 text-red-500 hover:border-red-500 bg-muted/40",
  };
  return (
    <button
      onClick={onClick}
      className={cn("text-center rounded-none py-1 text-[10px] font-mono font-bold tabular-nums transition-colors", colorMap[color])}
    >
      {count}
    </button>
  );
}
