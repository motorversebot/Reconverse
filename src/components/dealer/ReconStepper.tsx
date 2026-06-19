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
            <span className="font-mono tabular-nums text-sm font-bold text-foreground leading-none">{pad(c.v)}</span>
            <span className="mt-1 text-[7px] font-mono uppercase tracking-[0.12em] text-muted-foreground/70">{c.label}</span>
          </div>
          {i < cells.length - 1 && (
            <span className="font-mono text-sm font-bold leading-none text-muted-foreground/30 animate-pulse">:</span>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Recon pipeline stepper + live "time in current stage" timer.
 * Steps are spread evenly across the full width (labels sit below the
 * indicators, out of flow, so every step takes equal width with equal connector
 * lines). Display-only: controlled to the unit's current stage.
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
        {/* pb leaves room for the absolutely-positioned labels below each step */}
        <StepperNav className="w-full pb-7">
          {STAGES.map((s, i) => {
            const step = i + 1;
            const isActive = step === activeStep;
            return (
              <StepperItem key={s.status} step={step} completed={step < activeStep} className="flex-1 last:flex-none min-w-0">
                <StepperTrigger className="relative" tabIndex={-1}>
                  {/* pulsing ring on the current step */}
                  {isActive && (
                    <span className="pointer-events-none absolute left-0 top-0 size-6 rounded-full bg-primary/30 animate-ping" />
                  )}
                  <StepperIndicator
                    className="relative z-10 size-6 border text-[11px] font-semibold transition-all duration-300
                      data-[state=inactive]:bg-muted data-[state=inactive]:text-muted-foreground/70 data-[state=inactive]:border-border
                      data-[state=active]:border-primary
                      data-[state=completed]:border-primary"
                  >
                    {step}
                  </StepperIndicator>
                  <StepperTitle className="absolute left-1/2 top-8 -translate-x-1/2 hidden whitespace-nowrap text-[10px] md:block data-[state=inactive]:text-muted-foreground data-[state=active]:font-semibold data-[state=active]:text-foreground">
                    {s.label}
                  </StepperTitle>
                </StepperTrigger>
                {i < STAGES.length - 1 && (
                  <StepperSeparator className="mx-1.5 bg-border transition-colors duration-500" />
                )}
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
