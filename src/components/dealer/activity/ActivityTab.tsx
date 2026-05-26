import { useState, useMemo } from "react";
import { Loader2, History } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useUnitActivityLogs } from "@/hooks/useUnitActivityLogs";
import { STAGE_META, type UnitStatus } from "@/lib/pipeline";
import ActivityPipelineBar from "./ActivityPipelineBar";
import ActivityTimeline from "./ActivityTimeline";

/* ─── Event type labels for filter ─── */
const EVENT_TYPES: { value: string; label: string }[] = [
  { value: "unit_created", label: "Unit Created" },
  { value: "stage_change", label: "Stage Changed" },
  { value: "estimate_submitted", label: "Estimate Submitted" },
  { value: "estimate_approved", label: "Estimate Approved" },
  { value: "estimate_declined", label: "Estimate Declined" },
  { value: "operation_approved", label: "Op Approved" },
  { value: "operation_declined", label: "Op Declined" },
  { value: "repair_item_done", label: "Repair Done" },
  { value: "work_order_in_progress", label: "WO Started" },
  { value: "work_order_done", label: "WO Completed" },
  { value: "photo_uploaded", label: "Photo Upload" },
  { value: "comment_added", label: "Note Added" },
  { value: "mpi_pass", label: "MPI Pass" },
  { value: "mpi_fail", label: "MPI Fail" },
  { value: "mpi_repair_needed", label: "MPI Repair Needed" },
];

interface Props {
  unitId: string;
  dealerId: string;
  currentStatus: UnitStatus;
}

export default function ActivityTab({ unitId, dealerId, currentStatus }: Props) {
  const { data: activities, isLoading, error } = useUnitActivityLogs(unitId, dealerId);
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [userFilter, setUserFilter] = useState<string>("all");
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("all");

  // Unique users
  const users = useMemo(() => {
    if (!activities) return [];
    const map = new Map<string, string>();
    activities.forEach((a) => {
      if (a.user_id && a.profiles) {
        map.set(a.user_id, a.profiles.full_name || a.profiles.email || a.user_id);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [activities]);

  // Filtered
  const filtered = useMemo(() => {
    if (!activities) return [];
    let result = activities;
    if (selectedStage) result = result.filter((a) => a.stage === selectedStage);
    if (userFilter !== "all") result = result.filter((a) => a.user_id === userFilter);
    if (eventTypeFilter !== "all") result = result.filter((a) => a.action_type === eventTypeFilter);
    return result;
  }, [activities, selectedStage, userFilter, eventTypeFilter]);

  const totalCount = activities?.length ?? 0;

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
        activities={activities ?? []}
        selectedStage={selectedStage}
        onSelectStage={setSelectedStage}
      />

      {/* Filter controls */}
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={selectedStage ?? "all"} onValueChange={(v) => setSelectedStage(v === "all" ? null : v)}>
          <SelectTrigger className="w-[140px] h-7 text-xs">
            <SelectValue placeholder="All Stages" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            {Object.entries(STAGE_META).map(([key, meta]) => (
              <SelectItem key={key} value={key}>{meta.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {users.length > 1 && (
          <Select value={userFilter} onValueChange={setUserFilter}>
            <SelectTrigger className="w-[140px] h-7 text-xs">
              <SelectValue placeholder="All Users" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
          <SelectTrigger className="w-[150px] h-7 text-xs">
            <SelectValue placeholder="Event Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Events</SelectItem>
            {EVENT_TYPES.map((et) => (
              <SelectItem key={et.value} value={et.value}>{et.label}</SelectItem>
            ))}
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
