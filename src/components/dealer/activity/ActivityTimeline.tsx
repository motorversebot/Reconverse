import { useState, useMemo } from "react";
import { format, isToday, isYesterday, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { STAGE_META, type UnitStatus } from "@/lib/pipeline";
import type { ActivityLog } from "@/hooks/useUnitActivityLogs";
import {
  ArrowRight, Plus, CheckCircle2, ClipboardCheck, FileText,
  Wrench, ShieldCheck, Package, CircleDot, Camera, XCircle, Send,
  MessageSquare, ChevronDown, ChevronRight, History,
} from "lucide-react";

/* ─── Stage color system ─── */
const STAGE_DOT_COLORS: Record<string, string> = {
  inspection: "bg-amber-400",
  estimate: "bg-blue-400",
  approval: "bg-orange-400",
  repair: "bg-purple-400",
  qc: "bg-teal-400",
  ready: "bg-emerald-500",
  sold: "bg-muted-foreground",
};

const STAGE_RING_COLORS: Record<string, string> = {
  inspection: "ring-amber-400/30",
  estimate: "ring-blue-400/30",
  approval: "ring-orange-400/30",
  repair: "ring-purple-400/30",
  qc: "ring-teal-400/30",
  ready: "ring-emerald-500/30",
  sold: "ring-muted-foreground/30",
};

/* ─── Action icons ─── */
const ACTION_ICONS: Record<string, typeof ArrowRight> = {
  stage_change: ArrowRight,
  unit_created: Plus,
  mpi_updated: ClipboardCheck,
  mpi_pass: CheckCircle2,
  mpi_fail: XCircle,
  mpi_repair_needed: Wrench,
  estimate_added: FileText,
  estimate_submitted: Send,
  estimate_approved: CheckCircle2,
  estimate_partial_approved: CheckCircle2,
  estimate_declined: XCircle,
  estimate_void: XCircle,
  operation_approved: CheckCircle2,
  operation_declined: XCircle,
  approval_decided: CheckCircle2,
  repair_item_done: Wrench,
  work_order_in_progress: Wrench,
  work_order_done: Wrench,
  qc_passed: ShieldCheck,
  comment_added: MessageSquare,
  marked_ready: Package,
  photo_uploaded: Camera,
};

/* ─── Event title mapping ─── */
function getEventTitle(log: ActivityLog): string {
  switch (log.action_type) {
    case "unit_created": return "Unit added to inventory";
    case "stage_change": return `Stage changed`;
    case "estimate_submitted": return "Estimate submitted";
    case "estimate_approved": return "Estimate approved";
    case "estimate_partial_approved": return "Estimate partially approved";
    case "estimate_declined": return "Estimate declined";
    case "estimate_void": return "Estimate voided";
    case "operation_approved": return "Operation approved";
    case "operation_declined": return "Operation declined";
    case "repair_item_done": return "Repair completed";
    case "work_order_in_progress": return "Work order started";
    case "work_order_done": return "All repairs completed";
    case "mpi_pass": return "MPI item passed";
    case "mpi_fail": return "MPI item failed";
    case "mpi_repair_needed": return "MPI item needs repair";
    case "photo_uploaded": return "Photo uploaded";
    case "comment_added": return "Note added";
    case "qc_passed": return "QC passed";
    case "marked_ready": return "Marked ready for sale";
    default: return log.action_type.replace(/_/g, " ");
  }
}

function getInitials(name?: string | null, email?: string | null): string {
  if (name) return name.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  if (email) return email[0].toUpperCase();
  return "S";
}

function formatDateGroup(date: Date): string {
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "EEEE, MMMM d, yyyy");
}

/* ─── Metadata detail renderer ─── */
function MetadataDetails({ metadata }: { metadata: Record<string, unknown> }) {
  const entries = Object.entries(metadata).filter(
    ([k]) => !["comment_id"].includes(k)
  );
  if (entries.length === 0) return null;

  return (
    <div className="mt-1.5 space-y-0.5 text-[11px] text-muted-foreground">
      {entries.map(([key, value]) => (
        <div key={key} className="flex gap-1.5">
          <span className="text-muted-foreground/60 min-w-[80px]">
            {key.replace(/_/g, " ")}
          </span>
          <span className="text-foreground/70">
            {typeof value === "object" ? JSON.stringify(value) : String(value)}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ─── Single Event Row ─── */
function EventRow({ log, isLast }: { log: ActivityLog; isLast: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = ACTION_ICONS[log.action_type] ?? CircleDot;
  const stageMeta = STAGE_META[log.stage as UnitStatus];
  const user = log.profiles;
  const userName = user?.full_name || user?.email?.split("@")[0] || "System";
  const hasDetails = log.metadata && Object.keys(log.metadata).length > 0;
  const dotColor = STAGE_DOT_COLORS[log.stage] ?? "bg-muted-foreground";
  const ringColor = STAGE_RING_COLORS[log.stage] ?? "ring-muted-foreground/30";

  return (
    <div className="relative flex gap-3 pl-6">
      {/* Vertical line */}
      {!isLast && (
        <div className="absolute left-[11px] top-6 bottom-0 w-px bg-border/20" />
      )}

      {/* Stage dot */}
      <div className={cn(
        "absolute left-0 top-1 h-[22px] w-[22px] rounded-full flex items-center justify-center ring-2 z-10",
        dotColor + "/20",
        ringColor,
        "bg-background"
      )}>
        <div className={cn("h-2 w-2 rounded-full", dotColor)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pb-4">
        <div className="flex items-start gap-2.5">
          {/* Avatar */}
          <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-[9px] font-bold text-secondary-foreground">
              {getInitials(user?.full_name, user?.email)}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            {/* Header row */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[13px] font-semibold text-foreground leading-tight">
                {getEventTitle(log)}
              </span>
            </div>

            {/* Meta row */}
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <span className="text-[11px] text-muted-foreground/70">{userName}</span>
              <span className="text-[11px] text-muted-foreground/30">·</span>
              <span className="text-[11px] text-muted-foreground/50">
                {format(new Date(log.created_at), "h:mm a")}
              </span>
            </div>

            {/* Description */}
            {log.description && log.description !== getEventTitle(log) && (
              <p className="text-[12px] text-muted-foreground mt-0.5 leading-snug">
                {log.description}
              </p>
            )}

            {/* Chips */}
            <div className="flex items-center gap-1 mt-1">
              {stageMeta && (
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[9px] px-1.5 py-0 h-[18px] border-transparent",
                    dotColor + "/15",
                  )}
                  style={{
                    color: `var(--tw-${log.stage}-color, hsl(var(--muted-foreground)))`,
                  }}
                >
                  {stageMeta.label}
                </Badge>
              )}
              {hasDetails && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="flex items-center gap-0.5 text-[10px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                >
                  {expanded ? <ChevronDown className="h-2.5 w-2.5" /> : <ChevronRight className="h-2.5 w-2.5" />}
                  Details
                </button>
              )}
            </div>

            {/* Expandable details */}
            {expanded && log.metadata && (
              <div className="mt-1.5 p-2 rounded-lg bg-muted/20 border border-border/30">
                <MetadataDetails metadata={log.metadata} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Timeline ─── */
interface Props {
  activities: ActivityLog[];
}

export default function ActivityTimeline({ activities }: Props) {
  // Group by date — must be before any early return
  const groups = useMemo(() => {
    const map = new Map<string, ActivityLog[]>();
    activities.forEach((log) => {
      const dayKey = startOfDay(new Date(log.created_at)).toISOString();
      if (!map.has(dayKey)) map.set(dayKey, []);
      map.get(dayKey)!.push(log);
    });
    return Array.from(map.entries()).map(([key, logs]) => ({
      date: new Date(key),
      label: formatDateGroup(new Date(key)),
      logs,
    }));
  }, [activities]);

  if (!activities.length) {
    return (
      <div className="glass-panel flex flex-col items-center justify-center py-14 text-center">
        <History className="h-7 w-7 text-muted-foreground/30 mb-2" />
        <p className="text-sm font-medium text-foreground/70">No activity recorded yet.</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          System events and user actions will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {groups.map((group, gi) => (
        <div key={group.date.toISOString()}>
          {/* Date separator */}
          <div className="flex items-center gap-3 py-2 px-1">
            <div className="h-px flex-1 bg-border/20" />
            <span className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider whitespace-nowrap">
              {group.label}
            </span>
            <div className="h-px flex-1 bg-border/20" />
          </div>

          {/* Events */}
          <div className="pl-2">
            {group.logs.map((log, li) => (
              <EventRow
                key={log.id}
                log={log}
                isLast={gi === groups.length - 1 && li === group.logs.length - 1}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
