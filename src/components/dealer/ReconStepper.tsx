import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import {
  Stepper, StepperItem, StepperNav, StepperTrigger, StepperIndicator, StepperSeparator, StepperTitle,
} from "@/components/ui/stepper";
import { ALL_STATUSES, STAGE_META, stageIndex, type UnitStatus } from "@/lib/pipeline";

const STAGES = ALL_STATUSES.map((status) => ({ status, label: STAGE_META[status].label }));

/** Live seconds elapsed since `since`, ticking every second. */
function useElapsedSeconds(since?: string | null): number | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  if (!since) return null;
  const start = new Date(since).getTime();
  if (isNaN(start)) return null;
  return Math.max(0, Math.floor((now - start) / 1000));
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Compact, centered, animated Days : Hours : Minutes : Seconds counter. */
function StageTimer({ since }: { since?: string | null }) {
  const total = useElapsedSeconds(since);
  if (total == null) return null;
  const cells = [
    { v: Math.floor(total / 86400), label: "Days" },
    { v: Math.floor((total % 86400) / 3600), label: "Hours" },
    { v: Math.floor((total % 3600) / 60), label: "Min" },
    { v: total % 60, label: "Sec" },
  ];
  return (
    <div className="flex items-start justify-center gap-1.5" role="timer" aria-label="Time in current stage">
      {cells.map((c, i) => (
        <div key={c.label} className="flex items-start gap-1.5">
          <div className="flex flex-col items-center min-w-[1.6rem]">
            <span className="font-mono tabular-nums text-sm font-bold text-foreground leading-none">
              {pad(c.v)}
            </span>
            <span className="mt-1 text-[7px] font-mono uppercase tracking-[0.12em] text-muted-foreground/70">
              {c.label}
            </span>
          </div>
          {i < cells.length - 1 && (
            <span className="font-mono text-sm font-bold leading-none text-muted-foreground/30 animate-pulse">
              :
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Recon pipeline stepper + live "time in current stage" timer.
 * Display-only: controlled to the unit's current stage, so clicking a step does
 * not change the unit's lane (stage moves stay gated elsewhere).
 */
export default function ReconStepper({
  status,
  since,
}: {
  status: UnitStatus;
  since?: string | null;
}) {
  const activeStep = stageIndex(status) + 1; // 1-based

  return (
    <div className="rounded-lg border border-border bg-card/40 px-4 py-4 space-y-4">
      <Stepper
        value={activeStep}
        orientation="horizontal"
        indicators={{ completed: <Check className="size-3" /> }}
      >
        <StepperNav className="gap-1 overflow-x-auto pb-1">
          {STAGES.map((s, i) => {
            const step = i + 1;
            return (
              <StepperItem key={s.status} step={step} completed={step < activeStep}>
                <StepperTrigger className="gap-2 px-1" tabIndex={-1}>
                  <StepperIndicator
                    className="size-6 border text-[11px] font-semibold
                      data-[state=inactive]:bg-muted data-[state=inactive]:text-muted-foreground/70 data-[state=inactive]:border-border
                      data-[state=active]:border-primary data-[state=active]:ring-2 data-[state=active]:ring-primary/20
                      data-[state=completed]:border-primary"
                  >
                    {step}
                  </StepperIndicator>
                  <StepperTitle className="hidden lg:inline whitespace-nowrap text-xs data-[state=inactive]:text-muted-foreground data-[state=active]:text-foreground data-[state=active]:font-semibold">
                    {s.label}
                  </StepperTitle>
                </StepperTrigger>
                {i < STAGES.length - 1 && <StepperSeparator className="bg-border" />}
              </StepperItem>
            );
          })}
        </StepperNav>
      </Stepper>

      {status !== "sold" && (
        <div className="border-t border-border/60 pt-3">
          <p className="text-center text-[8px] font-mono uppercase tracking-[0.2em] text-muted-foreground/60 mb-2">
            Time in {STAGE_META[status].label}
          </p>
          <StageTimer since={since} />
        </div>
      )}
    </div>
  );
}
