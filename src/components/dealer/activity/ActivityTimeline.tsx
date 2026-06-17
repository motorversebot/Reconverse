import { useState, useMemo } from "react";
import { format, isToday, isYesterday, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { STAGE_META, type UnitStatus } from "@/lib/pipeline";
import type { ActivityLog } from "@/hooks/useUnitActivityLogs";
import {
  ArrowRight, Plus, CheckCircle2, ClipboardCheck, FileText, Wrench, ShieldCheck,
  Package, CircleDot, Camera, XCircle, Send, MessageSquare, ChevronDown, ChevronRight,
  History, Calendar, Download, AlertTriangle, Undo2, Calculator,
} from "lucide-react";

function safeDate(v: unknown): Date {
  const d = new Date(v as string);
  return isNaN(d.getTime()) ? new Date(0) : d;
}

const STAGE_DOT_COLORS: Record<string, string> = {
  inspection: "bg-amber-400", estimate: "bg-blue-400", approval: "bg-orange-400",
  repair: "bg-purple-400", qc: "bg-teal-400", ready: "bg-emerald-500", sold: "bg-muted-foreground",
};

const ACTION_ICONS: Record<string, typeof ArrowRight> = {
  stage_change: ArrowRight, unit_created: Plus,
  moved_to_estimate: Calculator, estimate_line_priced: FileText,
  estimate_sent_to_approval: Send, estimate_approved: CheckCircle2,
  estimate_declined: XCircle, estimate_sent_back: Undo2,
  mpi_item_failed: AlertTriangle, mpi_completed: ClipboardCheck, mpi_updated: ClipboardCheck,
  carfax_check: ShieldCheck, carfax_attached: ShieldCheck, carfax_link: ShieldCheck,
  recall_check: ShieldCheck, comment_added: MessageSquare, photo_uploaded: Camera,
  promise_date_set: Calendar, qc_passed: ShieldCheck, marked_ready: Package,
  repair_item_done: Wrench, export: Download, system: CircleDot,
};

// Clean, human title per raw action type.
const TITLES: Record<string, string> = {
  unit_created: "Unit added to inventory",
  stage_change: "Stage moved",
  moved_to_estimate: "Moved to Estimate",
  estimate_line_priced: "Estimate line priced",
  estimate_sent_to_approval: "Estimate sent to Approval",
  estimate_approved: "Estimate approved",
  estimate_declined: "Estimate declined",
  estimate_sent_back: "Estimate sent back",
  mpi_item_failed: "MPI item flagged",
  mpi_completed: "MPI completed",
  mpi_updated: "MPI updated",
  carfax_check: "CARFAX checked",
  carfax_attached: "CARFAX report attached",
  carfax_link: "CARFAX report attached",
  recall_check: "Recall check",
  comment_added: "Note added",
  photo_uploaded: "Photo uploaded",
  promise_date_set: "Promise date set",
  qc_passed: "QC passed",
  marked_ready: "Marked ready for sale",
  export: "Report exported",
  system: "Unit updated",
};
function titleFor(action: string): string {
  return TITLES[action] || (action || "event").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// Event-type weight to pick a group's headline + ordering.
const PRIORITY: Record<string, number> = {
  estimate_approved: 9, estimate_declined: 9, estimate_sent_back: 8, stage_change: 7,
  recall_check: 6, mpi_completed: 6, estimate_sent_to_approval: 5, moved_to_estimate: 5,
  unit_created: 5, mpi_item_failed: 4, carfax_attached: 4, estimate_line_priced: 3,
  comment_added: 2, photo_uploaded: 2, carfax_check: 2,
};
// Subtle-accent (important) events.
const IMPORTANT = new Set([
  "stage_change", "estimate_approved", "estimate_declined", "estimate_sent_back",
  "mpi_completed", "photo_required",
]);
function isImportant(logs: ActivityLog[]): boolean {
  return logs.some((l) => IMPORTANT.has(l.action_type)
    || (l.action_type === "recall_check" && Number((l.metadata as any)?.open || 0) > 0));
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
function userOf(log: ActivityLog): string {
  return log.profiles?.full_name || log.profiles?.email?.split("@")[0] || "System";
}

interface Group {
  id: string;
  bucket: number;        // minute bucket
  user: string;
  logs: ActivityLog[];
  date: Date;
  stage: string;
}

// Group consecutive events that share the same minute + user.
function buildGroups(activities: ActivityLog[]): Group[] {
  const sorted = [...activities].sort((a, b) => safeDate(b.created_at).getTime() - safeDate(a.created_at).getTime());
  const groups: Group[] = [];
  for (const log of sorted) {
    const bucket = Math.floor(safeDate(log.created_at).getTime() / 60000);
    const user = userOf(log);
    const last = groups[groups.length - 1];
    if (last && last.bucket === bucket && last.user === user) {
      last.logs.push(log);
    } else {
      groups.push({ id: log.id, bucket, user, logs: [log], date: safeDate(log.created_at), stage: log.stage });
    }
  }
  // headline stage = stage of the highest-priority log
  for (const g of groups) {
    const primary = [...g.logs].sort((a, b) => (PRIORITY[b.action_type] || 0) - (PRIORITY[a.action_type] || 0))[0];
    g.stage = primary.stage || g.stage;
  }
  return groups;
}

/* ─── Detail rows (raw audit data) ─── */
function DetailBlock({ log }: { log: ActivityLog }) {
  const meta = (log.metadata && typeof log.metadata === "object") ? log.metadata : {};
  const entries = Object.entries(meta).filter(([k]) => !["comment_id"].includes(k));
  return (
    <div className="space-y-1 text-[11px]">
      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
        <span className="text-muted-foreground/60">type</span>
        <span className="font-mono text-foreground/70">{log.action_type}</span>
        <span className="text-muted-foreground/60">at</span>
        <span className="text-foreground/70">{format(safeDate(log.created_at), "MMM d, yyyy · h:mm:ss a")}</span>
      </div>
      {log.description && (
        <div className="flex gap-2"><span className="text-muted-foreground/60 min-w-[64px]">detail</span><span className="text-foreground/70">{log.description}</span></div>
      )}
      {entries.map(([k, v]) => (
        <div key={k} className="flex gap-2">
          <span className="text-muted-foreground/60 min-w-[64px]">{k.replace(/_/g, " ")}</span>
          <span className="text-foreground/70 break-all">{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
        </div>
      ))}
      <div className="flex gap-2"><span className="text-muted-foreground/60 min-w-[64px]">by</span><span className="text-foreground/70">{userOf(log)}{log.user_role ? ` · ${String(log.user_role).replace(/_/g, " ")}` : ""}</span></div>
    </div>
  );
}

/* ─── A single grouped card ─── */
function GroupCard({ group, isLast }: { group: Group; isLast: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const logs = useMemo(
    () => [...group.logs].sort((a, b) => (PRIORITY[b.action_type] || 0) - (PRIORITY[a.action_type] || 0)),
    [group.logs],
  );
  const primary = logs[0];
  const Icon = ACTION_ICONS[primary.action_type] ?? CircleDot;
  const dot = STAGE_DOT_COLORS[group.stage] ?? "bg-muted-foreground";
  const stageMeta = STAGE_META[group.stage as UnitStatus];
  const important = isImportant(logs);
  const multi = logs.length > 1;

  // Short summary line.
  const summary = multi
    ? logs.slice(1).map((l) => titleFor(l.action_type)).join(" · ")
    : (primary.description && primary.description !== titleFor(primary.action_type) ? primary.description : "");

  return (
    <div className="relative flex gap-3 pl-6">
      {!isLast && <div className="absolute left-[11px] top-7 bottom-0 w-px bg-border/25" />}
      <div className="absolute left-0 top-1.5 h-[22px] w-[22px] rounded-full flex items-center justify-center ring-2 ring-border/40 bg-background z-10">
        <Icon className="h-3 w-3 text-muted-foreground" />
        <span className={cn("absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-background", dot)} />
      </div>

      <div className={cn(
        "flex-1 min-w-0 mb-2.5 rounded-lg border px-3 py-2.5",
        important ? "border-l-2 border-l-primary/60 border-border bg-muted/20" : "border-border/50",
      )}>
        <div className="flex items-start gap-2.5">
          <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-[9px] font-bold text-secondary-foreground">{getInitials(group.user, primary.profiles?.email)}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[13px] font-semibold text-foreground leading-tight">{titleFor(primary.action_type)}</span>
              {multi && <span className="text-[10px] font-medium text-muted-foreground bg-muted rounded-full px-1.5 py-0.5">+{logs.length - 1} more</span>}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap text-[11px] text-muted-foreground/70">
              <span>{group.user}</span>
              <span className="text-muted-foreground/30">·</span>
              <span>{format(group.date, "h:mm a")}</span>
              {stageMeta && (
                <>
                  <span className="text-muted-foreground/30">·</span>
                  <span className="inline-flex items-center gap-1"><span className={cn("h-1.5 w-1.5 rounded-full", dot)} />{stageMeta.label}</span>
                </>
              )}
            </div>
            {summary && <p className="text-[12px] text-muted-foreground mt-1 leading-snug break-words">{summary}</p>}

            <button
              onClick={() => setExpanded((e) => !e)}
              className="mt-1.5 flex items-center gap-0.5 text-[11px] text-muted-foreground/70 hover:text-foreground transition-colors"
            >
              {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              {expanded ? "Hide details" : "Show details"}
            </button>

            {expanded && (
              <div className="mt-2 space-y-2">
                {logs.map((l, i) => (
                  <div key={l.id + i} className="rounded-md bg-muted/30 border border-border/40 p-2">
                    <p className="text-[11px] font-semibold text-foreground/80 mb-1">{titleFor(l.action_type)}</p>
                    <DetailBlock log={l} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface Props { activities: ActivityLog[]; }

export default function ActivityTimeline({ activities }: Props) {
  const days = useMemo(() => {
    const groups = buildGroups(activities);
    const map = new Map<string, Group[]>();
    for (const g of groups) {
      const key = startOfDay(g.date).toISOString();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(g);
    }
    return Array.from(map.entries()).map(([key, gs]) => ({ date: new Date(key), label: formatDateGroup(new Date(key)), groups: gs }));
  }, [activities]);

  if (!activities.length) {
    return (
      <div className="glass-panel flex flex-col items-center justify-center py-14 text-center px-6">
        <History className="h-7 w-7 text-muted-foreground/30 mb-2" />
        <p className="text-sm font-medium text-foreground/70">No activity yet.</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm">
          Stage changes, MPI updates, estimates, photos, notes, CARFAX, and recall checks will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {days.map((day, di) => (
        <div key={day.date.toISOString()}>
          <div className="flex items-center gap-3 py-2 px-1">
            <div className="h-px flex-1 bg-border/20" />
            <span className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider whitespace-nowrap">{day.label}</span>
            <div className="h-px flex-1 bg-border/20" />
          </div>
          <div className="pl-2">
            {day.groups.map((g, gi) => (
              <GroupCard key={g.id} group={g} isLast={di === days.length - 1 && gi === day.groups.length - 1} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
