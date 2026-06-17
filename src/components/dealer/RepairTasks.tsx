import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Camera, ArrowRight, RefreshCw, AlertTriangle, Wrench, CheckCircle2,
  Clock, Package, ChevronDown, ChevronRight, MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { canEditUnits } from "@/lib/permissions";
import {
  listRepairTasks, generateRepairFromApproved, updateRepairTask, addRepairNote, addRepairPhoto,
  moveToQc, qcBlockers, REPAIR_STATUS_LABEL, PARTS_STATUS_OPTIONS,
  type RepairTask, type RepairSummary, type RepairStatus,
} from "@/lib/repairTasks";

interface Props {
  unitId: string;
  dealerId?: string;
  unit?: any;
  role?: string;
  readOnly?: boolean;
  onMoved?: () => void;
}

const money = (n: unknown) => `$${(Number(n) || 0).toFixed(2)}`;

function timeInStage(since?: string): string {
  if (!since) return "—";
  const h = (Date.now() - new Date(since).getTime()) / 3.6e6;
  if (isNaN(h)) return "—";
  if (h < 1) return "< 1h";
  if (h < 24) return `${Math.round(h)}h`;
  return `${Math.round(h / 24)}d`;
}

// Quick-action buttons (the common tech flow). 44px tap targets.
const ACTIONS: { status: RepairStatus; label: string }[] = [
  { status: "in_progress", label: "Start" },
  { status: "waiting_parts", label: "Parts" },
  { status: "waiting_vendor", label: "Vendor" },
  { status: "done", label: "Done" },
];

export default function RepairTasks({ unitId, unit, role, readOnly = false, onMoved }: Props) {
  const { toast } = useToast();
  const canEdit = canEditUnits(role) && !readOnly;

  const [tasks, setTasks] = useState<RepairTask[]>([]);
  const [summary, setSummary] = useState<RepairSummary | null>(null);
  const [available, setAvailable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);

  const load = useCallback(async (autoGen = false) => {
    setLoading(true);
    let d = await listRepairTasks(unitId);
    if (autoGen && d.available && d.tasks.length === 0 && !readOnly) d = await generateRepairFromApproved(unitId);
    setTasks(d.tasks); setSummary(d.summary); setAvailable(d.available);
    setLoading(false);
  }, [unitId, readOnly]);

  useEffect(() => { void load(true); }, [load]);

  const apply = (d: { tasks: RepairTask[]; summary: RepairSummary }) => { setTasks(d.tasks); setSummary(d.summary); };

  const setStatus = async (t: RepairTask, status: RepairStatus) => {
    const next = t.status === status && status !== "done" ? "not_started" : status;
    apply(await updateRepairTask(unitId, t.id, { status: next }));
  };
  const setParts = async (t: RepairTask, parts_status: any) => apply(await updateRepairTask(unitId, t.id, { parts_status }));
  const note = async (t: RepairTask, body: string) => { apply(await addRepairNote(unitId, t.id, body)); toast({ title: "Note added" }); };
  const photo = async (t: RepairTask) => { apply(await addRepairPhoto(unitId, t.id)); };

  const regenerate = async () => {
    setBusy(true);
    try { apply(await generateRepairFromApproved(unitId)); toast({ title: "Synced from approved estimate" }); }
    finally { setBusy(false); }
  };

  const sendToQc = async () => {
    setSending(true);
    try {
      const r = await moveToQc(unitId);
      if (r.ok) { toast({ title: "Moved to QC" }); onMoved?.(); }
      else toast({ title: "Not ready for QC", description: r.message, variant: "destructive" });
    } finally { setSending(false); }
  };

  if (loading) return <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center"><Loader2 className="h-4 w-4 animate-spin" /> Loading repair tasks…</div>;
  if (!available) return <Card className="glass-panel border-border"><CardContent className="py-8 text-center text-sm text-muted-foreground">Repair workflow is being set up. Check back shortly.</CardContent></Card>;

  if (tasks.length === 0) {
    return (
      <Card className="glass-panel border-border">
        <CardContent className="py-10 text-center space-y-3">
          <Wrench className="h-7 w-7 mx-auto text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No repair tasks yet.</p>
          <p className="text-xs text-muted-foreground/70">Approved estimate lines become repair tasks. Approve the estimate first.</p>
          {canEdit && <Button variant="outline" size="sm" className="gap-2" onClick={regenerate} disabled={busy}><RefreshCw className="h-4 w-4" /> Sync from approved estimate</Button>}
        </CardContent>
      </Card>
    );
  }

  const blockers = qcBlockers(tasks);

  return (
    <div className="space-y-3">
      {/* Summary */}
      {summary && (
        <Card className="glass-panel border-border">
          <CardContent className="py-3 px-4 grid grid-cols-3 sm:grid-cols-6 gap-3 text-sm">
            <Stat label="Tasks" value={`${summary.completed}/${summary.total}`} />
            <Stat label="Open" value={String(summary.open)} warn={summary.open > 0} />
            <Stat label="Waiting parts" value={String(summary.waiting_parts)} warn={summary.waiting_parts > 0} />
            <Stat label="Waiting vendor" value={String(summary.waiting_vendor)} warn={summary.waiting_vendor > 0} />
            <Stat label="Approved" value={money(summary.approved_total)} strong />
            <Stat label="In repair" value={timeInStage(unit?.stage_entered_at)} />
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">Repair tasks <span className="text-muted-foreground font-normal">({tasks.length})</span></p>
        {canEdit && <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs text-muted-foreground" onClick={regenerate} disabled={busy}><RefreshCw className="h-3.5 w-3.5" /> Sync</Button>}
      </div>

      {tasks.map((t) => (
        <TaskCard key={t.id} task={t} canEdit={canEdit} onStatus={setStatus} onParts={setParts} onNote={note} onPhoto={photo} />
      ))}

      {/* Move to QC (gated) */}
      {canEdit && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2 pt-1">
          {blockers > 0 && (
            <span className="text-xs text-amber-600 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" /> {blockers} repair task{blockers === 1 ? "" : "s"} still open.
            </span>
          )}
          <Button onClick={sendToQc} disabled={sending || blockers > 0} className="gap-2 w-full sm:w-auto min-h-[44px]">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />} Move to QC
          </Button>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, strong, warn }: { label: string; value: string; strong?: boolean; warn?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn(strong ? "text-base font-bold" : "text-sm font-semibold", warn ? "text-amber-600" : "text-foreground")}>{value}</p>
    </div>
  );
}

function TaskCard({ task, canEdit, onStatus, onParts, onNote, onPhoto }: {
  task: RepairTask; canEdit: boolean;
  onStatus: (t: RepairTask, s: RepairStatus) => void;
  onParts: (t: RepairTask, p: string) => void;
  onNote: (t: RepairTask, body: string) => void;
  onPhoto: (t: RepairTask) => void;
}) {
  const [open, setOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const done = task.status === "done";
  const blocked = task.status === "cannot_complete";

  return (
    <Card className={cn("glass-panel border-border", done && "opacity-70")}>
      <CardContent className="p-3 space-y-2.5">
        {/* Title + status */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className={cn("text-sm font-semibold text-foreground", done && "line-through")}>{task.title}</p>
            {task.mpi_category && <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{task.mpi_category} · from MPI</p>}
          </div>
          <span className={cn(
            "text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border shrink-0",
            done ? "bg-foreground text-background border-foreground"
              : blocked ? "bg-red-500/10 text-red-500 border-red-500/40"
              : task.status === "not_started" ? "text-muted-foreground border-border"
              : "bg-muted text-foreground border-border",
          )}>{REPAIR_STATUS_LABEL[task.status]}</span>
        </div>

        {task.tech_note && <p className="text-xs text-muted-foreground">{task.tech_note}</p>}

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {task.labor_hours} hr</span>
          <span className="font-semibold text-foreground">{money(task.approved_amount)}</span>
          {task.assigned_to_name && <span>Tech: {task.assigned_to_name}</span>}
        </div>

        {/* Parts */}
        {task.parts_description && (
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <Package className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">{task.parts_description}</span>
            <select
              value={task.parts_status ?? "needed"} disabled={!canEdit}
              onChange={(e) => onParts(task, e.target.value)}
              className="text-[11px] rounded-md border border-border bg-background px-1.5 py-1 ml-auto"
            >
              {PARTS_STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        )}

        {/* Quick actions */}
        {canEdit && (
          <div className="grid grid-cols-4 gap-1.5">
            {ACTIONS.map((a) => {
              const active = task.status === a.status;
              return (
                <button
                  key={a.status}
                  onClick={() => onStatus(task, a.status)}
                  className={cn(
                    "min-h-[44px] rounded-md border text-xs font-semibold transition-colors px-1",
                    active ? "bg-foreground text-background border-foreground"
                      : "border-border text-foreground hover:bg-muted",
                  )}
                >{a.label}</button>
              );
            })}
          </div>
        )}

        {/* Notes / photos / can't complete */}
        <div className="flex items-center gap-3 pt-0.5">
          <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground">
            {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            <MessageSquare className="h-3.5 w-3.5" /> Notes{task.repair_notes.length ? ` (${task.repair_notes.length})` : ""}
          </button>
          {canEdit && (
            <button onClick={() => onPhoto(task)} className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground">
              <Camera className="h-3.5 w-3.5" /> Add photo{task.photo_count ? ` (${task.photo_count})` : ""}
            </button>
          )}
          {canEdit && !blocked && (
            <button onClick={() => onStatus(task, "cannot_complete")} className="ml-auto text-[11px] text-red-500/80 hover:text-red-500">Can't complete</button>
          )}
        </div>

        {open && (
          <div className="rounded-md border border-border/50 bg-muted/20 p-2 space-y-2">
            {task.repair_notes.length === 0 && <p className="text-[11px] text-muted-foreground">No repair notes yet.</p>}
            {task.repair_notes.map((n, i) => (
              <div key={i} className="text-[11px]">
                <p className="text-foreground/80">{n.body}</p>
                <p className="text-muted-foreground/60">{n.by || "Tech"} · {n.at ? new Date(n.at).toLocaleString() : ""}</p>
              </div>
            ))}
            {canEdit && (
              <div className="flex gap-2">
                <input
                  value={noteText} onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Add a repair note…"
                  className="flex-1 text-xs rounded-md border border-border bg-background px-2 py-1.5"
                  onKeyDown={(e) => { if (e.key === "Enter" && noteText.trim()) { onNote(task, noteText.trim()); setNoteText(""); } }}
                />
                <Button size="sm" className="h-8" disabled={!noteText.trim()} onClick={() => { onNote(task, noteText.trim()); setNoteText(""); }}>Add</Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
