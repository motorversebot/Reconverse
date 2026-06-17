import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch, rvPost, rvPatch } from "@/lib/api";

// ── Types (consumed by TireWheelInspection) ───────────────────────────────
export type ConditionFlag =
  | "uneven_wear_inner" | "uneven_wear_center" | "uneven_wear_outer"
  | "cupping" | "dry_rot" | "sidewall_damage" | "puncture_plug"
  | "mismatched" | "cords_showing" | "low_tread";

export type WheelCheckStatus = "ok" | "attention" | "na";
export type WheelCheckKey = "alignment" | "vibration" | "lug_nuts" | "tpms" | "wheel_damage" | "brake_dust";
export type WheelCheck = { status: WheelCheckStatus; note?: string };
export type WheelChecks = Record<WheelCheckKey, WheelCheck>;
export type TireStatus = "ok" | "attention" | "fail";

export type TireMap = { lf: number | null; rf: number | null; lr: number | null; rr: number | null; spare: number | null };
export type LowestTread = { value: number; position: string } | null;

const POSITIONS: (keyof TireMap)[] = ["lf", "rf", "lr", "rr"];
const RED_FLAGS: ConditionFlag[] = ["sidewall_damage", "cords_showing"];

const EMPTY_MAP: TireMap = { lf: null, rf: null, lr: null, rr: null, spare: null };

const ALL_FLAGS: ConditionFlag[] = [
  "uneven_wear_inner", "uneven_wear_center", "uneven_wear_outer", "cupping",
  "dry_rot", "sidewall_damage", "puncture_plug", "mismatched", "cords_showing", "low_tread",
];
const EMPTY_FLAGS = () => ALL_FLAGS.reduce((acc, k) => { acc[k] = false; return acc; }, {} as Record<ConditionFlag, boolean>);

const WHEEL_KEYS: WheelCheckKey[] = ["alignment", "vibration", "lug_nuts", "tpms", "wheel_damage", "brake_dust"];
const EMPTY_WHEELS = (): WheelChecks =>
  WHEEL_KEYS.reduce((acc, k) => { acc[k] = { status: "ok" }; return acc; }, {} as WheelChecks);

function asMap(v: unknown): TireMap {
  const o = (v && typeof v === "object") ? v as Record<string, unknown> : {};
  const num = (x: unknown) => (x === null || x === undefined || x === "" ? null : Number(x));
  return { lf: num(o.lf), rf: num(o.rf), lr: num(o.lr), rr: num(o.rr), spare: num(o.spare) };
}
function asFlags(v: unknown): Record<ConditionFlag, boolean> {
  const o = (v && typeof v === "object") ? v as Record<string, unknown> : {};
  const out = EMPTY_FLAGS();
  for (const k of ALL_FLAGS) out[k] = !!o[k];
  return out;
}
function asWheels(v: unknown): WheelChecks {
  const o = (v && typeof v === "object") ? v as Record<string, { status?: WheelCheckStatus; note?: string }> : {};
  const out = EMPTY_WHEELS();
  for (const k of WHEEL_KEYS) {
    const c = o[k];
    if (c && (c.status === "ok" || c.status === "attention" || c.status === "na")) out[k] = { status: c.status, note: c.note };
  }
  return out;
}

function computeLowest(tread: TireMap): LowestTread {
  let best: LowestTread = null;
  for (const p of POSITIONS) {
    const v = tread[p];
    if (v === null || v === undefined || isNaN(v)) continue;
    if (best === null || v < best.value) best = { value: v, position: p.toUpperCase() };
  }
  return best;
}

function computeStatus(tread: TireMap, psi: TireMap, flags: Record<ConditionFlag, boolean>, wheels: WheelChecks): TireStatus {
  const treads = POSITIONS.map((p) => tread[p]).filter((v): v is number => v != null && !isNaN(v));
  const psis = POSITIONS.map((p) => psi[p]).filter((v): v is number => v != null && !isNaN(v));
  if (RED_FLAGS.some((f) => flags[f])) return "fail";
  if (treads.some((t) => t <= 2)) return "fail";
  if (psis.some((p) => p < 20)) return "fail";
  const anyYellowFlag = ALL_FLAGS.some((f) => f !== "low_tread" && !RED_FLAGS.includes(f) && flags[f]);
  const lowTread = treads.some((t) => t <= 4);
  const offPsi = psis.some((p) => Math.abs(p - 35) > 5);
  const wheelAttn = WHEEL_KEYS.some((k) => wheels[k]?.status === "attention");
  if (anyYellowFlag || lowTread || offPsi || wheelAttn) return "attention";
  return "ok";
}

export function useTireInspection(unitId: string | undefined, dealerId: string | undefined) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["tire-inspection", unitId],
    queryFn: async () => {
      const res = await apiFetch(`/api/v1/reconverse/units/${unitId}/tire-inspection`);
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) return null;
      return j.data as Record<string, unknown> | null;
    },
    enabled: !!unitId && !!dealerId,
  });

  const [treadDepth, setTreadDepth] = useState<TireMap>(EMPTY_MAP);
  const [tirePressure, setTirePressure] = useState<TireMap>(EMPTY_MAP);
  const [conditionFlags, setConditionFlags] = useState<Record<ConditionFlag, boolean>>(EMPTY_FLAGS);
  const [wheelChecks, setWheelChecks] = useState<WheelChecks>(EMPTY_WHEELS);

  // Seed local state once the record loads (or resets when switching units).
  const hydratedFor = useRef<string | null>(null);
  const skipNextSave = useRef(false);
  useEffect(() => {
    if (query.isLoading) return;
    if (hydratedFor.current === unitId) return;
    const d = query.data || {};
    setTreadDepth(asMap(d.tread_depth ?? (d as any).treadDepth));
    setTirePressure(asMap(d.tire_pressure ?? (d as any).tirePressure));
    setConditionFlags(asFlags(d.condition_flags ?? (d as any).conditionFlags));
    setWheelChecks(asWheels(d.wheel_checks ?? (d as any).wheelChecks));
    hydratedFor.current = unitId ?? null;
    skipNextSave.current = true; // don't auto-save the freshly-hydrated state
  }, [query.isLoading, query.data, unitId]);

  const lowestTread = useMemo(() => computeLowest(treadDepth), [treadDepth]);

  // low_tread is auto-derived from the lowest tread reading.
  const autoLowTread = !!lowestTread && lowestTread.value <= 4;
  const flagsWithAuto = useMemo<Record<ConditionFlag, boolean>>(
    () => ({ ...conditionFlags, low_tread: autoLowTread }),
    [conditionFlags, autoLowTread],
  );

  const status = useMemo(
    () => computeStatus(treadDepth, tirePressure, flagsWithAuto, wheelChecks),
    [treadDepth, tirePressure, flagsWithAuto, wheelChecks],
  );

  const save = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const existing = query.data as { id?: string | number } | null;
      if (existing?.id) {
        const result = await rvPatch(`/tire-inspections/${existing.id}`, payload);
        if (!result.ok) throw new Error(result.error);
      } else {
        const result = await rvPost("/tire-inspections", { ...payload, unit_id: unitId, dealer_id: dealerId });
        if (!result.ok) throw new Error(result.error);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tire-inspection", unitId] }),
  });

  // Debounced auto-save after the user changes anything (post-hydration).
  const saveRef = useRef(save);
  saveRef.current = save;
  useEffect(() => {
    if (hydratedFor.current !== unitId) return; // not hydrated yet
    if (skipNextSave.current) { skipNextSave.current = false; return; } // skip post-hydration
    const t = setTimeout(() => {
      saveRef.current.mutate({
        tread_depth: treadDepth,
        tire_pressure: tirePressure,
        condition_flags: flagsWithAuto,
        wheel_checks: wheelChecks,
        lowest_tread: lowestTread,
        status,
      });
    }, 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [treadDepth, tirePressure, conditionFlags, wheelChecks]);

  return {
    treadDepth, setTreadDepth,
    tirePressure, setTirePressure,
    conditionFlags: flagsWithAuto, setConditionFlags,
    wheelChecks, setWheelChecks,
    status,
    lowestTread,
    isLoading: query.isLoading,
    isSaving: save.isPending,
    save: save.mutate,
    saving: save.isPending,
  };
}
