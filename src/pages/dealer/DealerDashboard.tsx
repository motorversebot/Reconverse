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
  inspection: "text-amber-400",
  estimate: "text-blue-400",
  approval: "text-orange-400",
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Command Center</h1>
          <p className="text-xs font-semibold text-primary mt-1 uppercase tracking-wider">
            {membership?.dealers?.name ?? "Dealer Room"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="outline"
            className="gap-2 h-9 text-xs font-bold border-border/40 text-muted-foreground hover:text-foreground bg-background/30"
            onClick={() => navigate("/dealer/units")}
          >
            <Car className="h-3.5 w-3.5" /> All Units
          </Button>
          <Button
            size="sm"
            className="gap-1.5 h-9 text-xs font-bold shadow-lg shadow-primary/10"
            onClick={() => navigate("/dealer/units")}
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
          icon={<Car className="h-4 w-4 text-primary" />}
          waveColor="#8b5cf6"
          onClick={() => navigate("/dealer/units")}
        />
        <KPICard
          label="Ready for Sale"
          value={kpis.readyCount}
          sub="Finished Cycle"
          icon={<CheckCircle className="h-4 w-4 text-accent" />}
          accent="text-accent"
          waveColor="#06b6d4"
          onClick={() => navigate(`/dealer/recon-lane/ready-for-sale`)}
        />
        <KPICard
          label="Avg Recon Cycle"
          value={kpis.avgReconDays > 0 ? `${kpis.avgReconDays}d` : "—"}
          sub="30d rolling avg"
          icon={<Activity className="h-4 w-4 text-primary" />}
          waveColor="#8b5cf6"
        />
        <KPICard
          label="Oldest Unit"
          value={kpis.oldestUnitDays > 0 ? `${Math.round(kpis.oldestUnitDays)}d` : "—"}
          sub="Maximum age"
          icon={<Clock className="h-4 w-4 text-red-400" />}
          waveColor="#f87171"
          accent={kpis.oldestUnitDays > 10 ? "text-red-400" : kpis.oldestUnitDays > 5 ? "text-amber-400" : undefined}
        />
        <KPICard
          label="Overdue Alerts"
          value={kpis.blockedCount}
          sub="Action needed"
          icon={<AlertTriangle className="h-4 w-4 text-amber-400" />}
          waveColor="#fbbf24"
          accent={kpis.blockedCount > 0 ? "text-amber-400" : undefined}
          onClick={kpis.blockedCount > 0 ? () => { setOverdueOnly(true); setStageFilter("all"); } : undefined}
        />
        <KPICard
          label="Recon Pipeline $"
          value={kpis.openReconDollars !== null ? `$${Math.round(kpis.openReconDollars).toLocaleString()}` : "—"}
          sub={kpis.estimatesMissingCount > 0 ? `${kpis.estimatesMissingCount} missing bills` : "Approved works"}
          icon={<DollarSign className="h-4 w-4 text-accent" />}
          waveColor="#06b6d4"
          accent="text-accent"
        />
      </div>

      {/* ── 2. Interactive Pipeline Stages ── */}
      <div className="glass-panel-strong p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-border/10 pb-3">
          <div>
            <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-muted-foreground/50">
              Pipeline Stages
            </p>
            <h3 className="text-xs font-semibold text-foreground/80 mt-0.5">Distribution across lanes</h3>
          </div>
          <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20 tabular-nums">
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
                  "glass-panel p-4 text-left transition-all duration-300 relative group border-border/40 hover:scale-[1.01]",
                  count > 0 ? "hover:border-primary/20 hover:bg-primary/5" : "opacity-45 cursor-default",
                  stage === "sold" && "cursor-default"
                )}
              >
                <div className="flex items-center gap-2">
                  <span className={cn("h-2 w-2 rounded-full shrink-0 animate-pulse", STAGE_COLORS[stage])} />
                  <span className="text-[10px] font-bold tracking-wider text-muted-foreground/70 uppercase truncate">
                    {meta.label}
                  </span>
                </div>
                <p className={cn("text-2xl font-extrabold tracking-tight mt-2.5 tabular-nums", count > 0 ? "text-foreground" : "text-muted-foreground/35")}>
                  {count}
                </p>
                <div className="flex items-center justify-between mt-2 pt-1 border-t border-border/10">
                  {avgDays && count > 0 ? (
                    <span className="text-[9px] font-bold text-muted-foreground/45 tabular-nums">
                      ~{avgDays}d avg
                    </span>
                  ) : <span />}
                  {overdue > 0 && (
                    <span className="text-[9px] font-extrabold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded tabular-nums">
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
        <div className="glass-panel p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-border/10 pb-3">
            <AlertTriangle className="h-4 w-4 text-amber-500/80" />
            <div>
              <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-muted-foreground/50">
                Action Alerts
              </p>
            </div>
          </div>
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground/40 gap-2">
              <CheckCircle className="h-7 w-7 text-emerald-500/40" />
              <p className="text-xs font-semibold">All lanes green. No blockers found.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {alerts.map((a, i) => (
                <button
                  key={i}
                  onClick={() => {
                    if (a.stage) { setStageFilter(a.stage); setOverdueOnly(true); }
                  }}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-muted/5 border border-border/40 hover:border-primary/20 hover:bg-primary/5 transition-all text-left"
                >
                  <span className="text-xs font-semibold text-foreground/80">{a.label}</span>
                  <div className="flex items-center gap-2.5">
                    <Badge className="bg-red-500/10 text-red-400 hover:bg-red-500/15 border-0 text-[10px] font-bold px-2.5">
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
        <div className="glass-panel p-5 space-y-4">
          <div className="border-b border-border/10 pb-3">
            <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-muted-foreground/50">
              Aging Analysis
            </p>
          </div>
          <div className="space-y-1">
            {/* Header row */}
            <div className="grid grid-cols-[1fr_60px_60px_60px] gap-2 px-2 pb-1.5 border-b border-border/10">
              <span className="text-[9px] font-bold text-muted-foreground/40 uppercase">Lane</span>
              <span className="text-[9px] font-bold text-emerald-400 text-center uppercase tracking-wider">0–2d</span>
              <span className="text-[9px] font-bold text-amber-400 text-center uppercase tracking-wider">3–5d</span>
              <span className="text-[9px] font-bold text-red-400 text-center uppercase tracking-wider">6d+</span>
            </div>
            
            {agingBuckets.filter(b => b.total > 0).map(b => {
              const meta = STAGE_META[b.stage as UnitStatus];
              return (
                <div key={b.stage} className="grid grid-cols-[1fr_60px_60px_60px] gap-2 items-center px-2 py-2.5 rounded-xl hover:bg-muted/10 transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={cn("h-2 w-2 rounded-full shrink-0", STAGE_COLORS[b.stage])} />
                    <span className="text-xs font-bold text-foreground/80 truncate">{meta?.label}</span>
                    <span className="text-[10px] font-bold text-muted-foreground/35 bg-muted/40 px-1.5 py-0.5 rounded">{b.total}</span>
                  </div>
                  <BucketCell count={b.green} color="emerald" onClick={() => setStageFilter(b.stage)} />
                  <BucketCell count={b.yellow} color="amber" onClick={() => setStageFilter(b.stage)} />
                  <BucketCell count={b.red} color="red" onClick={() => setStageFilter(b.stage)} />
                </div>
              );
            })}
            {agingBuckets.every(b => b.total === 0) && (
              <p className="text-xs text-muted-foreground/45 py-8 text-center">Empty lanes. Add cars to trigger logs.</p>
            )}
          </div>
        </div>
      </div>

      {/* ── 4. Charting Modules (Gloss Fills) ── */}
      <div className={cn("grid gap-5", isMobile ? "grid-cols-1" : "grid-cols-2")}>
        <div className="glass-panel p-5 space-y-4">
          <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-muted-foreground/50">
            Intake vs Completes (14d)
          </p>
          <div className="h-[150px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={throughput} barGap={3}>
                <defs>
                  <linearGradient id="addedBarGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.8} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.2} />
                  </linearGradient>
                  <linearGradient id="completedBarGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.8} />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.2} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tick={false}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide />
                <RechartsTooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border) / 0.8)",
                    borderRadius: "12px",
                    fontSize: "11px",
                    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)"
                  }}
                  labelFormatter={(v) => new Date(v).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                />
                <Bar dataKey="added" fill="url(#addedBarGrad)" radius={[3, 3, 0, 0]} name="Added" />
                <Bar dataKey="completed" fill="url(#completedBarGrad)" radius={[3, 3, 0, 0]} name="Completed" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-4 px-1 pt-1 border-t border-border/10">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded bg-primary" />
              <span className="text-[10px] font-semibold text-muted-foreground/60">Vehicles Added</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded bg-accent" />
              <span className="text-[10px] font-semibold text-muted-foreground/60">Vehicles Completed</span>
            </div>
          </div>
        </div>

        <div className="glass-panel p-5 space-y-4">
          <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-muted-foreground/50">
            Completes Trend Volume
          </p>
          <div className="h-[150px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={throughput}>
                <defs>
                  <linearGradient id="trendAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={false} axisLine={false} tickLine={false} />
                <YAxis hide />
                <RechartsTooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border) / 0.8)",
                    borderRadius: "12px",
                    fontSize: "11px",
                    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)"
                  }}
                  labelFormatter={(v) => new Date(v).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                />
                <Area
                  type="monotone"
                  dataKey="completed"
                  stroke="#06b6d4"
                  strokeWidth={2.5}
                  fill="url(#trendAreaGrad)"
                  name="Completed"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-1 px-1 pt-1 border-t border-border/10">
            <span className="text-[10px] font-semibold text-muted-foreground/50">14-day completion trend mapping</span>
          </div>
        </div>
      </div>

      {/* ── 5. Priority Units Table Redesign ── */}
      <div className="glass-panel p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-border/10 pb-3">
          <div>
            <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-muted-foreground/50">
              Priority Inventory lane
            </p>
          </div>
          <span className="text-xs font-bold text-muted-foreground/50 tabular-nums bg-muted/20 px-2 py-0.5 rounded">
            {filteredUnits.length} matches
          </span>
        </div>

        {/* Filters and Searches */}
        <div className={cn("flex gap-3 flex-wrap items-center", isMobile && "flex-col items-stretch")}>
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/45" />
            <Input
              placeholder="Search VIN, stock number, make model..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs bg-muted/5 border-border/40 focus-visible:ring-primary focus-visible:border-primary rounded-xl"
            />
          </div>
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="w-[150px] h-9 text-xs bg-muted/5 border-border/40 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover border border-border/80 text-xs">
              <SelectItem value="all">All Stages</SelectItem>
              {PIPELINE_STAGES.map(s => (
                <SelectItem key={s} value={s}>{STAGE_META[s].label}</SelectItem>
              ))}
              <SelectItem value="ready">Ready</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2 bg-muted/5 px-3 py-1.5 rounded-xl border border-border/40 h-9 shrink-0">
            <Switch
              checked={overdueOnly}
              onCheckedChange={setOverdueOnly}
              className="scale-[0.8]"
            />
            <span className="text-xs font-semibold text-muted-foreground/60 select-none">Overdue only</span>
          </div>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto rounded-xl border border-border/20">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/30 bg-muted/5 select-none">
                <th className="text-left font-bold uppercase tracking-wider text-muted-foreground/50 py-3 px-3">Vehicle Details</th>
                <th className="text-left font-bold uppercase tracking-wider text-muted-foreground/50 py-3 px-3">VIN Identifier</th>
                <th className="text-left font-bold uppercase tracking-wider text-muted-foreground/50 py-3 px-3">Stock Num</th>
                <th className="text-left font-bold uppercase tracking-wider text-muted-foreground/50 py-3 px-3">Active Stage</th>
                <th className="text-right font-bold uppercase tracking-wider text-muted-foreground/50 py-3 px-3">Time in Stage</th>
                <th className="text-right font-bold uppercase tracking-wider text-muted-foreground/50 py-3 px-3">Total Recon</th>
                <th className="text-left font-bold uppercase tracking-wider text-muted-foreground/50 py-3 px-3">Promise Date</th>
                <th className="text-center font-bold uppercase tracking-wider text-muted-foreground/50 py-3 px-3">Blockers</th>
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
                    <td className="py-3 px-3">
                      <div className="font-bold text-foreground/90">
                        {u.year} {u.make} {u.model}
                      </div>
                      {u.trim && (
                        <div className="text-[10px] text-muted-foreground/50 font-semibold">{u.trim}</div>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono text-muted-foreground/60">
                      {u.vin ? `...${u.vin.slice(-6).toUpperCase()}` : "—"}
                    </td>
                    <td className="py-3 px-3 text-muted-foreground/70 font-semibold">
                      {u.stock_number ?? "—"}
                    </td>
                    <td className="py-3 px-3">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border",
                        STAGE_BG[u.status], STAGE_TEXT[u.status], "border-transparent"
                      )}>
                        <span className={cn("h-1.5 w-1.5 rounded-full animate-pulse", STAGE_COLORS[u.status])} />
                        {meta.label}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className={cn(
                        "font-bold tabular-nums",
                        u.daysInStage >= 6 ? "text-red-400" :
                        u.daysInStage >= 3 ? "text-amber-400" : "text-emerald-400"
                      )}>
                        {formatAgingDuration(u.hoursInStage)}
                      </span>
                    </td>
                    {/* Fixed Total Days cell alignment and insertion */}
                    <td className="py-3 px-3 text-right font-bold text-muted-foreground/60 tabular-nums">
                      {Math.round(u.totalDays)}d
                    </td>
                    <td className="py-3 px-3">
                      {u.promise_date ? (
                        <span className={cn(
                          "tabular-nums font-semibold",
                          u.isPromiseOverdue ? "text-red-400" : "text-muted-foreground/50"
                        )}>
                          {new Date(u.promise_date + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/20">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1 flex-wrap">
                        {u.blockers.map(b => (
                          <span
                            key={b}
                            className={cn(
                              "inline-block px-1.5 py-0.5 rounded text-[9px] font-bold border",
                              b === "Promise" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                              b === "Approval" ? "bg-orange-400/10 text-orange-400 border-orange-500/20" :
                              "bg-teal-400/10 text-teal-400 border-teal-500/20"
                            )}
                          >
                            {b}
                          </span>
                        ))}
                        {u.isOverdue && !u.blockers.includes("Promise") && (
                          <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
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
                  <td colSpan={8} className="py-12 text-center text-xs text-muted-foreground/40 font-semibold">
                    No matching units found inside filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {filteredUnits.length > 20 && (
          <button
            onClick={() => navigate("/dealer/units")}
            className="w-full text-center text-xs font-bold text-primary hover:underline py-1"
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
  label, value, sub, icon, accent, waveColor = "#10b981", onClick,
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
        "glass-panel p-4 text-left transition-all duration-300 relative overflow-hidden group hover:scale-[1.02]",
        onClick ? "hover:border-primary/20 cursor-pointer" : "cursor-default"
      )}
    >
      {/* Visual background wave sparkline */}
      <svg className="absolute bottom-0 inset-x-0 h-10 w-full opacity-10 pointer-events-none group-hover:opacity-20 transition-opacity" preserveAspectRatio="none" viewBox="0 0 100 20">
        <path d="M0,20 Q15,5 30,12 T60,5 T90,15 L100,20 Z" fill={waveColor} />
        <path d="M0,20 Q15,5 30,12 T60,5 T90,15" fill="none" stroke={waveColor} strokeWidth="0.5" />
      </svg>

      <div className="flex items-center justify-between gap-2 z-10 relative">
        <span className="text-[9px] font-bold tracking-wider uppercase text-muted-foreground/55 truncate">{label}</span>
        <span className="text-muted-foreground/45 bg-muted/20 p-1 rounded-lg shrink-0">{icon}</span>
      </div>
      <p className={cn("text-2xl font-extrabold tracking-tight mt-2.5 tabular-nums z-10 relative", accent ?? "text-foreground")}>
        {value}
      </p>
      {sub && (
        <p className="text-[10px] font-bold text-muted-foreground/40 mt-1 z-10 relative">{sub}</p>
      )}
    </button>
  );
}

// ── BucketCell Sub-component ──
function BucketCell({ count, color, onClick }: { count: number; color: string; onClick?: () => void }) {
  if (count === 0) return <span className="text-center text-[11px] text-muted-foreground/20 tabular-nums select-none">—</span>;
  const colorMap: Record<string, string> = {
    emerald: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
    amber: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
    red: "bg-red-500/10 text-red-400 border border-red-500/20",
  };
  return (
    <button
      onClick={onClick}
      className={cn("text-center rounded-lg py-1 text-[10px] font-bold tabular-nums transition-colors", colorMap[color], "hover:opacity-85")}
    >
      {count}
    </button>
  );
}
