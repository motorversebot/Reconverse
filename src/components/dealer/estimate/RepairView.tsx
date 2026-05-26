import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import {
  Wrench, ArrowRight, ChevronDown, Clock, Play, Square,
  CalendarIcon, User, StickyNote, Filter, CheckCircle2,
  AlertTriangle, Package,
} from "lucide-react";
import {
  useWorkOrder, useEstimate, useEstimateOperations,
  useUpdateWorkOrderItem, calculateEstimateTotals,
  type WorkOrderItem,
} from "@/hooks/useEstimateData";
import { useUpdateUnit } from "@/hooks/useDealerActions";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Props {
  unitId: string;
  dealerId: string;
  onStageAdvance?: () => void;
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

const WO_STATUS_STYLE: Record<string, { label: string; className: string }> = {
  open: { label: "Open", className: "bg-blue-500/15 text-blue-400 border-blue-500/20" },
  in_progress: { label: "In Progress", className: "bg-amber-500/15 text-amber-400 border-amber-500/20" },
  done: { label: "Complete", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" },
};

const PARTS_STATUSES = ["Ordered", "Received", "Installed"] as const;

const TYPE_LABEL: Record<string, string> = {
  labor: "Labor",
  part: "Part",
  misc: "Misc",
  sublet: "Sublet",
};

const TYPE_ICON: Record<string, string> = {
  labor: "🔧",
  part: "📦",
  misc: "📝",
  sublet: "🏗️",
};

// ── Timer hook (local state only) ──
function useTimer() {
  const [timers, setTimers] = useState<Record<string, { start: number; elapsed: number; running: boolean }>>({});

  const toggle = useCallback((id: string) => {
    setTimers((prev) => {
      const t = prev[id];
      if (!t || !t.running) {
        return { ...prev, [id]: { start: Date.now(), elapsed: t?.elapsed ?? 0, running: true } };
      }
      return { ...prev, [id]: { ...t, elapsed: t.elapsed + (Date.now() - t.start), running: false } };
    });
  }, []);

  const getHours = useCallback((id: string) => {
    const t = timers[id];
    if (!t) return 0;
    const total = t.running ? t.elapsed + (Date.now() - t.start) : t.elapsed;
    return total / 3_600_000;
  }, [timers]);

  const isRunning = useCallback((id: string) => timers[id]?.running ?? false, [timers]);

  return { toggle, getHours, isRunning };
}

export default function RepairView({ unitId, dealerId, onStageAdvance }: Props) {
  const { data: workOrder, isLoading } = useWorkOrder(unitId, dealerId);
  const { data: estimate } = useEstimate(unitId, dealerId);
  const { data: operations = [] } = useEstimateOperations(estimate?.id);
  const updateItem = useUpdateWorkOrderItem();
  const updateUnit = useUpdateUnit();
  const { toast } = useToast();
  const timer = useTimer();

  // Local UI state (not persisted)
  const [promisedDate, setPromisedDate] = useState<Date | undefined>();
  const [assignedTech, setAssignedTech] = useState("unassigned");
  const [overrideEnabled, setOverrideEnabled] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const [overrideDialogOpen, setOverrideDialogOpen] = useState(false);
  const [filterMode, setFilterMode] = useState<"all" | "open" | "done">("all");
  const [inlineNotes, setInlineNotes] = useState<Record<string, string>>({});
  const [noteOpen, setNoteOpen] = useState<string | null>(null);
  const [partsStatus, setPartsStatus] = useState<Record<string, string>>({});
  const [openOps, setOpenOps] = useState<Record<string, boolean>>({});

  // Group WO items by their source operation (must be before early returns)
  const items = workOrder?.items || [];
  const groupedItems = useMemo(() => {
    const opMap = new Map<string, { name: string; category: string; items: WorkOrderItem[] }>();

    for (const item of items) {
      let opName = "General";
      let opCategory = "";
      let opKey = "general";

      if (item.source_estimate_item_id) {
        for (const op of operations) {
          const match = op.items?.find((ei) => ei.id === item.source_estimate_item_id);
          if (match) {
            opName = op.name;
            opCategory = op.category;
            opKey = op.id;
            break;
          }
        }
      }

      if (!opMap.has(opKey)) {
        opMap.set(opKey, { name: opName, category: opCategory, items: [] });
      }
      opMap.get(opKey)!.items.push(item);
    }

    return Array.from(opMap.entries());
  }, [items, operations]);

  if (isLoading) {
    return <div className="glass-panel p-8 text-center text-muted-foreground text-sm">Loading work order…</div>;
  }

  if (!workOrder) {
    return (
      <div className="glass-panel p-8 text-center text-muted-foreground text-sm">
        No work order found. Complete the approval stage first.
      </div>
    );
  }

  const doneCount = items.filter((i) => i.status === "done").length;
  const totalCount = items.length;
  const progress = totalCount > 0 ? (doneCount / totalCount) * 100 : 0;
  const allDone = doneCount === totalCount && totalCount > 0;
  const canMoveToQC = allDone || (overrideEnabled && overrideReason.trim().length > 0);

  const effectiveStatus = allDone ? "done" : doneCount > 0 ? "in_progress" : "open";
  const statusInfo = WO_STATUS_STYLE[effectiveStatus];

  // Totals
  const woTotal = items.reduce((sum, item) => {
    return sum + (item.type === "labor" ? item.hours * item.labor_rate : item.qty * item.unit_price);
  }, 0);

  const toggleItem = async (item: WorkOrderItem) => {
    await updateItem.mutateAsync({
      id: item.id,
      status: item.status === "done" ? "open" : "done",
    });
  };

  const handleMoveToQC = async () => {
    if (!allDone && overrideEnabled) {
      setOverrideDialogOpen(true);
      return;
    }
    await updateUnit.mutateAsync({ id: unitId, status: "qc" });
    toast({ title: "Moved to QC" });
    onStageAdvance?.();
  };

  const confirmOverrideMove = async () => {
    await updateUnit.mutateAsync({ id: unitId, status: "qc" });
    toast({ title: "Moved to QC (Manager Override)" });
    setOverrideDialogOpen(false);
    onStageAdvance?.();
  };

  const isOpOpen = (key: string) => openOps[key] !== false; // default open

  return (
    <div className="space-y-4">
      {/* ── Work Order Header ── */}
      <div className="glass-panel-strong p-5 sticky top-0 z-20">
        <div className="flex flex-col gap-4">
          {/* Row 1: title + status + total */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-primary/10 shrink-0">
              <Wrench className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-base font-bold text-foreground">Work Order</h2>
            <Badge className={`text-xs font-semibold border ${statusInfo.className}`}>{statusInfo.label}</Badge>
            <span className="ml-auto text-lg font-bold text-foreground">{fmt(woTotal)}</span>
          </div>

          {/* Row 2: meta fields */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Assigned Tech */}
            <div className="flex items-center gap-2 glass-panel px-3 py-2 rounded-xl">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              <Select value={assignedTech} onValueChange={setAssignedTech}>
                <SelectTrigger className="h-7 w-[140px] border-0 bg-transparent text-xs p-0 shadow-none focus:ring-0">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  <SelectItem value="tech-1">Technician 1</SelectItem>
                  <SelectItem value="tech-2">Technician 2</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Promised Date */}
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-2 glass-panel px-3 py-2 rounded-xl text-xs hover:bg-muted/20 transition-colors">
                  <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  {promisedDate ? format(promisedDate, "MMM d, yyyy") : "Set promise date"}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={promisedDate}
                  onSelect={setPromisedDate}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>

            {/* Filter */}
            <div className="flex items-center gap-1 ml-auto">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              <Select value={filterMode} onValueChange={(v) => setFilterMode(v as any)}>
                <SelectTrigger className="h-7 w-[100px] border-0 bg-transparent text-xs p-0 shadow-none focus:ring-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Items</SelectItem>
                  <SelectItem value="open">Open Only</SelectItem>
                  <SelectItem value="done">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Progress bar */}
          <div className="flex items-center gap-3">
            <Progress value={progress} className="flex-1 h-2.5" />
            <span className="text-xs text-muted-foreground font-semibold tabular-nums">{doneCount}/{totalCount}</span>
            <span className="text-xs font-bold text-primary tabular-nums">{progress.toFixed(0)}%</span>
          </div>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Operations list */}
        <div className="lg:col-span-2 space-y-3">
          {groupedItems.map(([opKey, group]) => {
            const filteredItems = group.items.filter((item) => {
              if (filterMode === "open") return item.status !== "done";
              if (filterMode === "done") return item.status === "done";
              return true;
            });

            if (filteredItems.length === 0 && filterMode !== "all") return null;

            const opDone = group.items.filter((i) => i.status === "done").length;

            return (
              <Collapsible key={opKey} open={isOpOpen(opKey)} onOpenChange={(v) => setOpenOps((p) => ({ ...p, [opKey]: v }))}>
                <div className="glass-panel overflow-hidden">
                  <CollapsibleTrigger asChild>
                    <button className="w-full flex items-center gap-3 p-4 hover:bg-muted/20 transition-colors text-left">
                      <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${isOpOpen(opKey) ? "" : "-rotate-90"}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-foreground">{group.name}</span>
                          {group.category && <Badge variant="outline" className="text-[10px]">{group.category}</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {opDone}/{group.items.length} complete
                        </p>
                      </div>
                      <Progress value={group.items.length > 0 ? (opDone / group.items.length) * 100 : 0} className="w-20 h-1.5" />
                    </button>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="border-t border-border/30 divide-y divide-border/20">
                      {(filterMode === "all" ? group.items : filteredItems).map((item) => {
                        const lineTotal = item.type === "labor" ? item.hours * item.labor_rate : item.qty * item.unit_price;
                        const isPartOrSublet = item.type === "part" || item.type === "sublet";
                        const actualHrs = timer.getHours(item.id);
                        const running = timer.isRunning(item.id);

                        return (
                          <div
                            key={item.id}
                            className={`px-4 py-3 transition-colors ${item.status === "done" ? "bg-primary/5 opacity-70" : "hover:bg-muted/20"}`}
                          >
                            <div className="flex items-center gap-3">
                              <Checkbox
                                checked={item.status === "done"}
                                onCheckedChange={() => toggleItem(item)}
                                className="shrink-0"
                              />
                              <span className="text-sm shrink-0">{TYPE_ICON[item.type]}</span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className={`text-sm font-medium ${item.status === "done" ? "line-through text-muted-foreground" : "text-foreground"}`}>
                                    {item.description}
                                  </span>
                                  <Badge variant="outline" className="text-[10px] shrink-0">{TYPE_LABEL[item.type]}</Badge>
                                </div>
                                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                  <span className="tabular-nums">{item.type === "labor" ? `${item.hours}h est.` : `×${item.qty}`}</span>
                                  <span className="tabular-nums font-medium">{fmt(lineTotal)}</span>

                                  {/* Parts status for parts/sublet */}
                                  {isPartOrSublet && (
                                    <Select
                                      value={partsStatus[item.id] || ""}
                                      onValueChange={(v) => setPartsStatus((p) => ({ ...p, [item.id]: v }))}
                                    >
                                      <SelectTrigger className="h-5 w-[90px] border-0 bg-muted/30 text-[10px] px-1.5 py-0 shadow-none focus:ring-0 rounded">
                                        <SelectValue placeholder="Status">
                                          {partsStatus[item.id] ? (
                                            <span className="flex items-center gap-1">
                                              <Package className="h-2.5 w-2.5" /> {partsStatus[item.id]}
                                            </span>
                                          ) : (
                                            <span className="flex items-center gap-1">
                                              <Package className="h-2.5 w-2.5" /> Parts
                                            </span>
                                          )}
                                        </SelectValue>
                                      </SelectTrigger>
                                      <SelectContent>
                                        {PARTS_STATUSES.map((s) => (
                                          <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  )}
                                </div>
                              </div>

                              {/* Labor timer */}
                              {item.type === "labor" && (
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <Button
                                    variant={running ? "destructive" : "outline"}
                                    size="sm"
                                    className="h-7 w-7 p-0"
                                    onClick={() => timer.toggle(item.id)}
                                  >
                                    {running ? <Square className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                                  </Button>
                                  <div className="text-right">
                                    <p className="text-[10px] text-muted-foreground tabular-nums">{actualHrs.toFixed(1)}h actual</p>
                                    <p className="text-[10px] text-muted-foreground tabular-nums">{item.hours}h est.</p>
                                  </div>
                                </div>
                              )}

                              {/* Notes */}
                              <Button
                                variant="ghost" size="sm"
                                className="h-7 w-7 p-0 shrink-0"
                                onClick={() => setNoteOpen(noteOpen === item.id ? null : item.id)}
                              >
                                <StickyNote className={`h-3.5 w-3.5 ${inlineNotes[item.id] ? "text-primary" : "text-muted-foreground"}`} />
                              </Button>
                            </div>

                            {/* Inline note */}
                            {noteOpen === item.id && (
                              <div className="mt-2 ml-10">
                                <Textarea
                                  className="text-xs min-h-[40px]"
                                  placeholder="Internal work note..."
                                  value={inlineNotes[item.id] || ""}
                                  onChange={(e) => setInlineNotes((p) => ({ ...p, [item.id]: e.target.value }))}
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>

        {/* ── Right-side Summary Panel ── */}
        <div className="self-start lg:sticky lg:top-4 space-y-4">
          {/* Totals */}
          <div className="glass-panel p-4 space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Work Order Summary</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Value</span>
                <span className="font-bold text-foreground">{fmt(woTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="h-3 w-3 text-emerald-400" /> Completed
                </span>
                <span className="font-semibold text-foreground">{doneCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-3 w-3 text-amber-400" /> Open
                </span>
                <span className="font-semibold text-foreground">{totalCount - doneCount}</span>
              </div>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Manager Override */}
          {!allDone && (
            <div className="glass-panel p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                  <span className="text-xs font-semibold text-foreground">Manager Override</span>
                </div>
                <Switch checked={overrideEnabled} onCheckedChange={setOverrideEnabled} />
              </div>
              {overrideEnabled && (
                <Textarea
                  className="text-xs min-h-[60px]"
                  placeholder="Reason for override (required)..."
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Footer Actions ── */}
      <div className="glass-panel p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:justify-end lg:sticky lg:bottom-4 z-10">
        <Button
          size="sm"
          className="gap-1.5 text-xs"
          disabled={!canMoveToQC}
          onClick={handleMoveToQC}
        >
          Move to QC <ArrowRight className="h-3.5 w-3.5" />
        </Button>
        {!allDone && !overrideEnabled && (
          <p className="text-[10px] text-muted-foreground sm:mr-auto sm:order-first">
            Complete all items or enable Manager Override to continue
          </p>
        )}
      </div>

      {/* Override confirmation dialog */}
      <AlertDialog open={overrideDialogOpen} onOpenChange={setOverrideDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Manager Override — Move to QC?</AlertDialogTitle>
            <AlertDialogDescription>
              {totalCount - doneCount} item(s) are still open. Moving to QC with override reason:
              <span className="block mt-2 text-foreground font-medium">"{overrideReason}"</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmOverrideMove}>Override & Move to QC</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
