import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface TreadDepth {
  lf?: number | null;
  rf?: number | null;
  lr?: number | null;
  rr?: number | null;
  spare?: number | null;
}

export interface TirePressure {
  lf?: number | null;
  rf?: number | null;
  lr?: number | null;
  rr?: number | null;
  spare?: number | null;
}

export type ConditionFlag =
  | "uneven_wear_inner"
  | "uneven_wear_center"
  | "uneven_wear_outer"
  | "cupping"
  | "dry_rot"
  | "sidewall_damage"
  | "puncture_plug"
  | "mismatched"
  | "low_tread"
  | "cords_showing";

export type WheelCheckStatus = "ok" | "attention" | "na";

export interface WheelChecks {
  alignment?: { status: WheelCheckStatus; note?: string };
  vibration?: { status: WheelCheckStatus; note?: string };
  lug_nuts?: { status: WheelCheckStatus; note?: string };
  tpms?: { status: WheelCheckStatus; note?: string };
  wheel_damage?: { status: WheelCheckStatus; note?: string };
  brake_dust?: { status: WheelCheckStatus; note?: string };
}

export interface TireInspectionData {
  id?: string;
  unit_id: string;
  dealer_id: string;
  tread_depth: TreadDepth;
  tire_pressure: TirePressure;
  condition_flags: Record<ConditionFlag, boolean>;
  wheel_checks: WheelChecks;
  recommendations: string[];
}

export type TireStatus = "ok" | "attention" | "fail";

export function computeTireStatus(
  tread: TreadDepth,
  pressure: TirePressure,
  flags: Record<string, boolean>
): TireStatus {
  const depths = [tread.lf, tread.rf, tread.lr, tread.rr].filter(
    (d) => d != null
  ) as number[];
  const psis = [pressure.lf, pressure.rf, pressure.lr, pressure.rr].filter(
    (p) => p != null
  ) as number[];

  // Fail: any tire ≤ 2/32 OR cords showing OR sidewall damage
  if (depths.some((d) => d <= 2) || flags.cords_showing || flags.sidewall_damage) {
    return "fail";
  }
  // Attention: any tire ≤ 4/32 OR any condition flag OR PSI out of range
  if (
    depths.some((d) => d <= 4) ||
    psis.some((p) => p < 28 || p > 42) ||
    flags.uneven_wear_inner ||
    flags.uneven_wear_center ||
    flags.uneven_wear_outer ||
    flags.cupping ||
    flags.dry_rot ||
    flags.puncture_plug ||
    flags.mismatched
  ) {
    return "attention";
  }
  if (depths.length === 0) return "ok";
  return "ok";
}

export function computeLowestTread(tread: TreadDepth): { value: number; position: string } | null {
  const positions = ["lf", "rf", "lr", "rr"] as const;
  const labels: Record<string, string> = { lf: "LF", rf: "RF", lr: "LR", rr: "RR" };
  let lowest: { value: number; position: string } | null = null;
  for (const pos of positions) {
    const v = tread[pos];
    if (v != null && (lowest === null || v < lowest.value)) {
      lowest = { value: v, position: labels[pos] };
    }
  }
  return lowest;
}

export function computeRecommendations(
  tread: TreadDepth,
  flags: Record<string, boolean>
): string[] {
  const recs: string[] = [];
  const depths = [tread.lf, tread.rf, tread.lr, tread.rr].filter(
    (d) => d != null
  ) as number[];
  const lowCount = depths.filter((d) => d <= 4).length;

  if (lowCount >= 4) recs.push("Replace 4 tires");
  else if (lowCount >= 2) recs.push("Replace 2 tires");

  if (flags.puncture_plug) recs.push("Patch/Plug");

  // Check for uneven wear suggesting alignment
  if (
    flags.uneven_wear_inner ||
    flags.uneven_wear_outer ||
    flags.uneven_wear_center
  ) {
    recs.push("Alignment");
  }

  if (flags.cupping) recs.push("Balance");

  // If tread depths vary by > 2/32 suggest rotation
  if (depths.length >= 4) {
    const min = Math.min(...depths);
    const max = Math.max(...depths);
    if (max - min >= 2 && min > 4) recs.push("Rotate");
  }

  return recs;
}

const DEFAULT_FLAGS: Record<ConditionFlag, boolean> = {
  uneven_wear_inner: false,
  uneven_wear_center: false,
  uneven_wear_outer: false,
  cupping: false,
  dry_rot: false,
  sidewall_damage: false,
  puncture_plug: false,
  mismatched: false,
  low_tread: false,
  cords_showing: false,
};

const DEFAULT_WHEEL_CHECKS: WheelChecks = {
  alignment: { status: "ok" },
  vibration: { status: "ok" },
  lug_nuts: { status: "ok" },
  tpms: { status: "ok" },
  wheel_damage: { status: "ok" },
  brake_dust: { status: "ok" },
};

export function useTireInspection(unitId: string, dealerId: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: saved, isLoading } = useQuery({
    queryKey: ["tire-inspection", unitId],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("unit_tire_inspections") as any)
        .select("*")
        .eq("unit_id", unitId)
        .maybeSingle();
      if (error) throw error;
      return data as TireInspectionData | null;
    },
    enabled: !!unitId && !!dealerId,
  });

  const [treadDepth, setTreadDepth] = useState<TreadDepth>({});
  const [tirePressure, setTirePressure] = useState<TirePressure>({});
  const [conditionFlags, setConditionFlags] = useState<Record<ConditionFlag, boolean>>(DEFAULT_FLAGS);
  const [wheelChecks, setWheelChecks] = useState<WheelChecks>(DEFAULT_WHEEL_CHECKS);

  useEffect(() => {
    if (saved) {
      setTreadDepth(saved.tread_depth || {});
      setTirePressure(saved.tire_pressure || {});
      setConditionFlags({ ...DEFAULT_FLAGS, ...(saved.condition_flags as any || {}) });
      setWheelChecks({ ...DEFAULT_WHEEL_CHECKS, ...(saved.wheel_checks as any || {}) });
    }
  }, [saved]);

  const status = computeTireStatus(treadDepth, tirePressure, conditionFlags);
  const lowestTread = computeLowestTread(treadDepth);
  const recommendations = computeRecommendations(treadDepth, conditionFlags);

  // Auto-flag low tread
  useEffect(() => {
    const depths = [treadDepth.lf, treadDepth.rf, treadDepth.lr, treadDepth.rr].filter(d => d != null) as number[];
    const hasLow = depths.some(d => d <= 4);
    if (hasLow !== conditionFlags.low_tread) {
      setConditionFlags(prev => ({ ...prev, low_tread: hasLow }));
    }
  }, [treadDepth]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        unit_id: unitId,
        dealer_id: dealerId,
        tread_depth: treadDepth,
        tire_pressure: tirePressure,
        condition_flags: conditionFlags,
        wheel_checks: wheelChecks,
        recommendations,
      };

      if (saved?.id) {
        const { error } = await (supabase
          .from("unit_tire_inspections") as any)
          .update(payload)
          .eq("id", saved.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase
          .from("unit_tire_inspections") as any)
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tire-inspection", unitId] });
    },
    onError: (err: any) => {
      toast({ title: "Error saving tire inspection", description: err.message, variant: "destructive" });
    },
  });

  // Auto-save debounced
  const [dirty, setDirty] = useState(false);
  useEffect(() => { setDirty(true); }, [treadDepth, tirePressure, conditionFlags, wheelChecks]);

  useEffect(() => {
    if (!dirty || isLoading) return;
    const timeout = setTimeout(() => {
      saveMutation.mutate();
      setDirty(false);
    }, 800);
    return () => clearTimeout(timeout);
  }, [dirty, treadDepth, tirePressure, conditionFlags, wheelChecks]);

  return {
    treadDepth, setTreadDepth,
    tirePressure, setTirePressure,
    conditionFlags, setConditionFlags,
    wheelChecks, setWheelChecks,
    status,
    lowestTread,
    recommendations,
    isLoading,
    isSaving: saveMutation.isPending,
  };
}
