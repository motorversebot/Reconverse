import { useEffect, useRef } from "react";
import { ALL_STATUSES, STAGE_META, stageIndex, type UnitStatus } from "@/lib/pipeline";
import { cn } from "@/lib/utils";

interface Props {
  status: UnitStatus;
}

export default function StageProgressBar({ status }: Props) {
  const currentIdx = stageIndex(status);
  const activeRef = useRef<HTMLDivElement>(null);

  // Keep the active stage visible on small screens.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [currentIdx]);

  return (
    <div className="flex items-center gap-1 w-full overflow-x-auto no-scrollbar pb-1">
      {ALL_STATUSES.map((s, idx) => {
        const meta = STAGE_META[s];
        const isCompleted = idx < currentIdx;
        const isCurrent = idx === currentIdx;

        return (
          <div
            key={s}
            ref={isCurrent ? activeRef : undefined}
            className="flex-1 min-w-[64px] flex flex-col items-center gap-1.5"
          >
            <div
              className={cn(
                "h-2 w-full rounded-full transition-all",
                isCompleted
                  ? "bg-primary"
                  : isCurrent
                  ? `${meta.color} shadow-[0_0_12px_-2px_hsl(var(--primary)/0.4)]`
                  : "bg-muted/50"
              )}
            />
            <span
              className={cn(
                "text-[10px] font-medium whitespace-nowrap",
                isCurrent ? "text-foreground" : "text-muted-foreground/60"
              )}
            >
              {meta.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
