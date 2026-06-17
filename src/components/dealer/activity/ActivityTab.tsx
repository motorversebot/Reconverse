import { useState, useMemo } from "react";
import { Loader2, History, Info } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useUnitActivityLogs, buildFallbackActivity, type ActivityLog } from "@/hooks/useUnitActivityLogs";
import { STAGE_META, type UnitStatus } from "@/lib/pipeline";
import ActivityPipelineBar from "./ActivityPipelineBar";
import ActivityTimeline from "./ActivityTimeline";

/* ─── Event categories for filter ─── */
const CATEGORIES: { value: string; label: string }[] = [
  { value: "all", label: "All Events" },
  { value: "stage", label: "Stage Changes" },
  { value: "estimate", label: "Estimate" },
  { value: "mpi", label: "MPI" },
  { value: "photo", label: "Photos" },
  { value: "note", label: "Notes" },
  { value: "carfax", label: "CARFAX / Recalls" },
  { value: "system", label: "System" },
];

function categoryOf(actionType: string): string {
  if (actionType === "stage_change") return "stage";
  if (actionType === "comment_added" || actionType === "note_added") return "note";
  if (actionType.startsWith("photo")) return "photo";
  if (actionType.startsWith("carfax") || actionType.startsWith("recall")) return "carfax";
  if (actionType.startsWith("mpi")) return "mpi";
  if (actionType.startsWith("estimate") || actionType === "moved_to_estimate"
    || actionType.startsWith("operation") || actionType.startsWith("work_order") || actionType === "repair_item_done")
    return "estimate";
  return "system";
}

interface Props {
  unitId: string;
  dealerId: string;
  currentStatus: UnitStatus;
  unit?: Record<string, unknown> | null;
}

export default function ActivityTab({ unitId, dealerId, currentStatus, unit }: Props) {
  const { data: serverLogs, isLoading, error } = useUnitActivityLogs(unitId, dealerId);
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [userFilter, setUserFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Real logs if present, else a safe fallback reconstructed from unit fields.
  const { activities, isSynthetic } = useMemo(() => {
    const logs = serverLogs ?? [];
    if (logs.length) return { activities: logs as ActivityLog[], isSynthetic: false };
    return { activities: buildFallbackActivity(unit, currentStatus, dealerId), isSynthetic: true };
  }, [serverLogs, unit, currentStatus, dealerId]);

  // Unique users (by name)
  const users = useMemo(() => {
    const set = new Set<string>();
    activities.forEach((a) => { const n = a.profiles?.full_name; if (n) set.add(n); });
    return Array.from(set);
  }, [activities]);

  const filtered = useMemo(() => {
    let result = activities;
    if (selectedStage) result = result.filter((a) => a.stage === selectedStage);
    if (userFilter !== "all") result = result.filter((a) => a.profiles?.full_name === userFilter);
    if (categoryFilter !== "all") result = result.filter((a) => categoryOf(a.action_type) === categoryFilter);
    return result;
  }, [activities, selectedStage, userFilter, categoryFilter]);

  const totalCount = activities.length;

  // Only offer category filters that actually have matching events.
  const availableCategories = useMemo(() => {
    const present = new Set(activities.map((a) => categoryOf(a.action_type)));
    return CATEGORIES.filter((c) => c.value === "all" || present.has(c.value));
  }, [activities]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Loading activity…
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-destructive text-sm">
        Failed to load activity: {(error as Error).message}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Pipeline visualization */}
      <ActivityPipelineBar
        currentStatus={currentStatus}
        activities={activities}
        selectedStage={selectedStage}
        onSelectStage={setSelectedStage}
      />

      {isSynthetic && totalCount > 0 && (
        <div className="flex items-start gap-2 text-[11px] text-muted-foreground bg-muted/40 rounded-md px-3 py-2">
          <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>Reconstructed from this unit's data — detailed activity logging will appear here as actions are recorded.</span>
        </div>
      )}

      {/* Filter controls */}
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={selectedStage ?? "all"} onValueChange={(v) => setSelectedStage(v === "all" ? null : v)}>
          <SelectTrigger className="w-[140px] h-7 text-xs"><SelectValue placeholder="All Stages" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            {Object.entries(STAGE_META).map(([key, meta]) => (
              <SelectItem key={key} value={key}>{meta.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {users.length > 1 && (
          <Select value={userFilter} onValueChange={setUserFilter}>
            <SelectTrigger className="w-[140px] h-7 text-xs"><SelectValue placeholder="All Users" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              {users.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
            </SelectContent>
          </Select>
        )}

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[150px] h-7 text-xs"><SelectValue placeholder="All Events" /></SelectTrigger>
          <SelectContent>
            {availableCategories.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center gap-1.5">
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground border-border">
            <History className="h-2.5 w-2.5 mr-0.5" />
            {filtered.length}{filtered.length !== totalCount ? ` / ${totalCount}` : ""} events
          </Badge>
        </div>
      </div>

      {/* Timeline */}
      <ActivityTimeline activities={filtered} />
    </div>
  );
}

/** Export activity count hook for tab label */
export function useActivityCount(unitId?: string, dealerId?: string) {
  const { data } = useUnitActivityLogs(unitId, dealerId);
  return data?.length ?? 0;
}
