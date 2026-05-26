import { useNavigate } from "react-router-dom";
import { STAGE_META, PIPELINE_STAGES, STATUS_TO_SLUG, type UnitStatus } from "@/lib/pipeline";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

/** Stage accent dots — consistent with pipeline color system */
const STAGE_DOTS: Record<string, string> = {
  inspection: "bg-amber-400",
  estimate:   "bg-blue-400",
  approval:   "bg-orange-400",
  repair:     "bg-purple-400",
  qc:         "bg-teal-400",
  ready:      "bg-emerald-500",
};

const STAGE_ROUTES: Record<string, string> = Object.fromEntries(
  [...PIPELINE_STAGES, "ready" as const].map((s) => [
    s,
    `/dealer/recon-lane/${STATUS_TO_SLUG[s]}`,
  ])
);

const BAR_STAGES: UnitStatus[] = [...PIPELINE_STAGES, "ready"];

interface Props {
  statusCounts: Record<string, number>;
  totalActive: number;
  avgDays?: Record<string, number>;
}

export default function ReconPipelineBar({ statusCounts, totalActive, avgDays }: Props) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const readyAndSold = (statusCounts["ready"] ?? 0) + (statusCounts["sold"] ?? 0);
  const completionPct = totalActive > 0 ? Math.round((readyAndSold / totalActive) * 100) : 0;

  return (
    <div className="glass-panel p-4 space-y-3">
      <p className="text-[10px] font-semibold tracking-[0.1em] uppercase text-muted-foreground/50">
        Recon Lane
      </p>

      {/* Capsule stage bar */}
      <div className={cn(
        "flex items-center gap-2",
        isMobile && "flex-wrap"
      )}>
        {BAR_STAGES.map((stage) => {
          const count = statusCounts[stage] ?? 0;
          const meta = STAGE_META[stage];
          const dotClass = STAGE_DOTS[stage];

          const capsule = (
            <button
              key={stage}
              onClick={() => navigate(STAGE_ROUTES[stage])}
              className={cn(
                "flex items-center gap-2 px-3.5 py-2 rounded-full text-sm font-medium transition-all duration-200",
                "border border-transparent",
                count > 0
                  ? "glass-panel-strong hover:border-[rgba(0,0,0,0.06)]"
                  : "bg-muted/30 text-muted-foreground/40 hover:bg-muted/50",
                isMobile && "flex-1 min-w-[100px] justify-center"
              )}
            >
              <span className={cn("h-2 w-2 rounded-full shrink-0", dotClass)} />
              <span className={cn(
                "text-xs font-medium",
                count > 0 ? "text-foreground/80" : "text-muted-foreground/40"
              )}>
                {meta.label}
              </span>
              <span className={cn(
                "text-xs font-semibold ml-auto tabular-nums",
                count > 0 ? "text-foreground" : "text-muted-foreground/30"
              )}>
                {count}
              </span>
            </button>
          );

          if (isMobile) return capsule;

          return (
            <Tooltip key={stage}>
              <TooltipTrigger asChild>{capsule}</TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {count} unit{count !== 1 ? "s" : ""} in {meta.label}
                {avgDays?.[stage] !== undefined && ` · ~${avgDays[stage]}d avg`}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      {/* Completion progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-medium text-muted-foreground/50">
            Recon Completion
          </p>
          <p className="text-xs font-semibold text-foreground/70">{completionPct}%</p>
        </div>
        <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted/20">
          <div
            className="h-full rounded-full transition-all duration-1000 ease-out"
            style={{
              width: `${completionPct}%`,
              background: "linear-gradient(90deg, hsl(var(--primary) / 0.7), hsl(152 70% 65% / 0.8))",
            }}
          />
        </div>
      </div>
    </div>
  );
}
