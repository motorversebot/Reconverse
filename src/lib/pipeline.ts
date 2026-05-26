/** Recon Lane stage definitions */

export const PIPELINE_STAGES = [
  "inspection",
  "estimate",
  "approval",
  "repair",
  "qc",
] as const;

export const ALL_STATUSES = [
  ...PIPELINE_STAGES,
  "ready",
  "sold",
] as const;

export type UnitStatus = (typeof ALL_STATUSES)[number];

/** Map from DB status to route slug used in /dealer/recon-lane/:slug */
export const STATUS_TO_SLUG: Record<UnitStatus, string> = {
  inspection: "mpi",
  estimate: "estimate",
  approval: "approval",
  repair: "repair",
  qc: "qc",
  ready: "ready-for-sale",
  sold: "sold",
};

export const SLUG_TO_STATUS: Record<string, UnitStatus> = Object.fromEntries(
  Object.entries(STATUS_TO_SLUG).map(([k, v]) => [v, k as UnitStatus])
) as Record<string, UnitStatus>;

/** Map from status to the default tab to show in Unit Detail */
export const STAGE_DEFAULT_TAB: Record<UnitStatus, string> = {
  inspection: "mpi",
  estimate: "estimate",
  approval: "approval",
  repair: "repair",
  qc: "qc",
  ready: "summary",
  sold: "summary",
};

export const STAGE_META: Record<
  UnitStatus,
  { label: string; color: string; next?: UnitStatus }
> = {
  inspection: { label: "MPI", color: "bg-amber-400", next: "estimate" },
  estimate:   { label: "Estimate",   color: "bg-orange-400", next: "approval" },
  approval:   { label: "Approval",   color: "bg-yellow-400", next: "repair" },
  repair:     { label: "Repair",     color: "bg-indigo-400", next: "qc" },
  qc:         { label: "QC",         color: "bg-teal-400",   next: "ready" },
  ready:      { label: "Ready for Sale", color: "bg-primary" },
  sold:       { label: "Sold",       color: "bg-muted-foreground" },
};

/** Ordered index for progress bar */
export function stageIndex(status: UnitStatus): number {
  return ALL_STATUSES.indexOf(status);
}

export function stageProgress(status: UnitStatus): number {
  const idx = stageIndex(status);
  return Math.round(((idx + 1) / ALL_STATUSES.length) * 100);
}

/** Check if a stage is before another (for read-only gating) */
export function isStageBefore(stage: UnitStatus, current: UnitStatus): boolean {
  return stageIndex(stage) < stageIndex(current);
}
