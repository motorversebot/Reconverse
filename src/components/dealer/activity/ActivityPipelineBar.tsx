import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { STAGE_META, ALL_STATUSES, type UnitStatus } from "@/lib/pipeline";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { ActivityLog } from "@/hooks/useUnitActivityLogs";
import { formatDistanceToNow } from "date-fns";

const DISPLAY_STAGES: UnitStatus[] = ["inspection", "estimate", "approval", "repair", "qc", "ready"];

const STAGE_DOT: Record<string, string> = {
  inspection: "bg-amber-400",
  estimate: "bg-blue-400",
  approval: "bg-orange-400",
  repair: "bg-purple-400",
  qc: "bg-teal-400",
  ready: "bg-emerald-500",
};

function getInitials(name?: string | null, email?: string | null): string {
  if (name) return name.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  if (email) return email[0].toUpperCase();
  return "?";
}

interface Props {
  currentStatus: UnitStatus;
  activities: ActivityLog[];
  selectedStage: string | null;
  onSelectStage: (stage: string | null) => void;
}

export default function ActivityPipelineBar({ currentStatus, activities, selectedStage, onSelectStage }: Props) {
  const currentIdx = ALL_STATUSES.indexOf(currentStatus);

  return (
    <div className="glass-panel p-3">
      <div className="flex items-center gap-1 overflow-x-auto">
        {DISPLAY_STAGES.map((stage, i) => {
          const stageIdx = ALL_STATUSES.indexOf(stage);
          const isCompleted = stageIdx < currentIdx;
          const isActive = stage === currentStatus;
          const isFuture = stageIdx > currentIdx;
          const isSelected = selectedStage === stage;
          const meta = STAGE_META[stage];

          const count = activities.filter((a) => a.stage === stage).length;
          const lastActivity = activities.filter((a) => a.stage === stage)[0];

          return (
            <div key={stage} className="flex items-center flex-1 min-w-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onSelectStage(isSelected ? null : stage)}
                    className={cn(
                      "flex flex-col items-center gap-1 px-2 py-2 rounded-lg w-full transition-all duration-200",
                      isSelected && "ring-1 ring-primary/40 bg-muted/20",
                      isActive && "bg-muted/15",
                      isFuture && "opacity-30",
                      !isFuture && "hover:bg-muted/20 cursor-pointer"
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      {isCompleted ? (
                        <div className="h-4 w-4 rounded-full bg-primary/20 flex items-center justify-center">
                          <Check className="h-2.5 w-2.5 text-primary" />
                        </div>
                      ) : (
                        <span className={cn("h-2 w-2 rounded-full", STAGE_DOT[stage] ?? "bg-muted")} />
                      )}
                      <span className={cn(
                        "text-[11px] font-semibold whitespace-nowrap",
                        isActive ? "text-foreground" : "text-muted-foreground"
                      )}>
                        {meta.label}
                      </span>
                    </div>

                    {count > 0 && (
                      <span className="text-[9px] font-medium text-muted-foreground/60 tabular-nums">
                        {count}
                      </span>
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  {count} event{count !== 1 ? "s" : ""} in {meta.label}
                  {lastActivity && (
                    <span className="text-muted-foreground ml-1">
                      · {formatDistanceToNow(new Date(lastActivity.created_at), { addSuffix: true })}
                    </span>
                  )}
                </TooltipContent>
              </Tooltip>

              {i < DISPLAY_STAGES.length - 1 && (
                <div className={cn(
                  "h-px w-3 shrink-0",
                  stageIdx < currentIdx ? "bg-primary/30" : "bg-border/20"
                )} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
