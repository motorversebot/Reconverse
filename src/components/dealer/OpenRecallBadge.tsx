import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Red "OPEN RECALL" badge. Shown only when a unit has CONFIRMED open recalls
 * (open_recall_count > 0 — i.e. at least one campaign with repair_complete=NO).
 * Unknown / unconfirmed campaigns never trigger it (no false positives).
 */
export function OpenRecallBadge({
  count,
  size = "sm",
  className,
}: {
  count?: number | null;
  size?: "sm" | "xs";
  className?: string;
}) {
  const n = Number(count || 0);
  if (n <= 0) return null;
  return (
    <span
      title={`${n} open / not-completed recall${n === 1 ? "" : "s"}`}
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-bold uppercase tracking-wider",
        "bg-red-500/15 text-red-500 border border-red-500/40",
        size === "xs" ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]",
        className,
      )}
    >
      <AlertTriangle className={size === "xs" ? "h-2.5 w-2.5" : "h-3 w-3"} />
      {n === 1 ? "OPEN RECALL" : `${n} OPEN RECALLS`}
    </span>
  );
}
