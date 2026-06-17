import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { resolveCarfax } from "@/lib/carfax";

export interface ActivityLog {
  id: string;
  action_type: string;
  stage: string; // frontend stage slug (inspection|estimate|…) or ""
  created_at: string;
  description?: string;
  metadata?: Record<string, unknown>;
  profiles?: { full_name?: string | null; email?: string | null };
  user_role?: string | null;
  synthetic?: boolean;
}

// MC stage display name → frontend slug (for dot coloring).
function stageSlug(name?: string | null): string {
  switch (String(name || "").toLowerCase()) {
    case "intake":
    case "mpi": return "inspection";
    case "estimate": return "estimate";
    case "approval": return "approval";
    case "repair": return "repair";
    case "qc": return "qc";
    case "ready for sale":
    case "ready": return "ready";
    case "sold": return "sold";
    default: return "";
  }
}

function asObj(v: unknown): Record<string, unknown> | undefined {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : undefined;
}

// Normalize an MC activity_logs row → ActivityLog.
function normalizeRow(r: Record<string, unknown>): ActivityLog {
  const action = String(r.action ?? r.action_type ?? "system");
  const details = asObj(r.details);
  const toName = (r.to_stage_name as string) || "";
  const fromName = (r.from_stage_name as string) || "";
  let description = "";
  if (action === "stage_change") description = `${fromName || "—"} → ${toName || "—"}`;
  else if (details && typeof details.note === "string") description = details.note;
  return {
    id: String(r.id ?? `${action}-${r.created_at ?? Math.random()}`),
    action_type: action,
    stage: stageSlug(toName) || stageSlug(r.stage as string),
    created_at: String(r.created_at ?? new Date().toISOString()),
    description,
    metadata: details,
    profiles: { full_name: (r.user_name as string) || null, email: (r.user_email as string) || null },
    user_role: (r.user_role as string) || null,
  };
}

async function fetchLogs(unitId: string): Promise<ActivityLog[]> {
  // Try the documented endpoint first, then the existing MC route.
  for (const path of [`/units/${unitId}/activity-logs`, `/activity/${unitId}`]) {
    try {
      const res = await apiFetch(`/api/v1/reconverse${path}`);
      if (res.status === 404) continue;
      const j = await res.json().catch(() => null);
      if (res.ok && j?.ok) {
        const rows = (j.data?.logs ?? j.data ?? []) as Record<string, unknown>[];
        if (Array.isArray(rows)) return rows.map(normalizeRow);
      }
    } catch { /* try next */ }
  }
  return [];
}

export function useUnitActivityLogs(unitId: string | undefined, dealerId: string | undefined) {
  return useQuery({
    queryKey: ["unit-activity-logs", unitId],
    queryFn: () => fetchLogs(unitId as string),
    enabled: !!unitId && !!dealerId,
  });
}

export function useActivityCount(unitId?: string, dealerId?: string) {
  const { data } = useUnitActivityLogs(unitId, dealerId);
  return data?.length ?? 0;
}

/**
 * Build a safe fallback timeline from the unit's own fields when the activity
 * log is empty (e.g. demo/imported units). Never throws.
 */
export function buildFallbackActivity(
  unit: Record<string, unknown> | null | undefined,
  currentStatus: string,
  dealerId?: string,
): ActivityLog[] {
  if (!unit) return [];
  const out: ActivityLog[] = [];
  const push = (e: Partial<ActivityLog> & { action_type: string; created_at?: unknown }) => {
    const t = e.created_at;
    const iso = typeof t === "string" && !isNaN(new Date(t).getTime()) ? t : null;
    if (!iso) return;
    out.push({
      id: `synth-${e.action_type}-${iso}`,
      action_type: e.action_type,
      stage: e.stage ?? "",
      created_at: iso,
      description: e.description,
      metadata: e.metadata,
      profiles: { full_name: "System" },
      user_role: "system",
      synthetic: true,
    });
  };

  push({ action_type: "unit_created", created_at: unit.created_at, stage: "",
    description: [unit.year, unit.make, unit.model].filter(Boolean).join(" ") || undefined });
  push({ action_type: "stage_change", created_at: unit.stage_entered_at, stage: currentStatus,
    description: `In ${currentStatus} stage` });
  if (unit.promise_date) push({ action_type: "promise_date_set", created_at: unit.updated_at ?? unit.created_at,
    description: `Promise date: ${unit.promise_date}` });
  if (unit.notes) push({ action_type: "comment_added", created_at: unit.updated_at ?? unit.created_at,
    description: String(unit.notes) });
  try {
    const cf = resolveCarfax(unit as { vin?: string | null }, dealerId);
    if (cf.carfax_link_status === "attached") {
      push({ action_type: "carfax_link", created_at: cf.carfax_last_checked_at ?? unit.updated_at ?? unit.created_at,
        description: "CARFAX report attached" });
    }
  } catch { /* ignore */ }
  push({ action_type: "system", created_at: unit.updated_at, description: "Last updated" });

  return out.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}
