import { useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useTireInspection,
  type ConditionFlag,
  type WheelCheckStatus,
  type WheelChecks,
  type TireStatus,
} from "@/hooks/useTireInspection";
import {
  ChevronDown, CheckCircle2, AlertTriangle, XOctagon,
  Loader2, Copy, Gauge,
} from "lucide-react";

const POS_LABELS: Record<string, string> = { lf: "LF", rf: "RF", lr: "LR", rr: "RR" };
const POSITIONS = ["lf", "rf", "lr", "rr"] as const;

type FlagSeverity = "yellow" | "red";

const CONDITION_FLAGS: { key: ConditionFlag; label: string; severity: FlagSeverity }[] = [
  { key: "uneven_wear_inner", label: "Uneven wear (inner)", severity: "yellow" },
  { key: "uneven_wear_center", label: "Uneven wear (center)", severity: "yellow" },
  { key: "uneven_wear_outer", label: "Uneven wear (outer)", severity: "yellow" },
  { key: "cupping", label: "Cupping", severity: "yellow" },
  { key: "dry_rot", label: "Dry rot / cracking", severity: "yellow" },
  { key: "sidewall_damage", label: "Sidewall damage", severity: "red" },
  { key: "puncture_plug", label: "Puncture / plug", severity: "yellow" },
  { key: "mismatched", label: "Mismatched tires", severity: "yellow" },
  { key: "cords_showing", label: "Cords showing", severity: "red" },
];

const WHEEL_CHECK_ITEMS: { key: keyof WheelChecks; label: string }[] = [
  { key: "alignment", label: "Alignment" },
  { key: "vibration", label: "Vibration" },
  { key: "lug_nuts", label: "Lug nuts" },
  { key: "tpms", label: "TPMS" },
  { key: "wheel_damage", label: "Wheel dmg" },
  { key: "brake_dust", label: "Brake dust" },
];

const STATUS_CYCLE: WheelCheckStatus[] = ["ok", "attention", "na"];

const STATUS_CONFIG: Record<TireStatus, { label: string; color: string; bg: string; icon: typeof CheckCircle2 }> = {
  ok: { label: "PASS", color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/30", icon: CheckCircle2 },
  attention: { label: "ATTENTION", color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/30", icon: AlertTriangle },
  fail: { label: "FAIL", color: "text-destructive", bg: "bg-destructive/10 border-destructive/30", icon: XOctagon },
};

const TARGET_PSI = 35;

function getPsiColor(psi: number | null | undefined): string {
  if (psi == null) return "";
  if (psi < 20) return "text-destructive border-destructive/50";
  const diff = Math.abs(psi - TARGET_PSI);
  if (diff > 5) return "text-amber-500 border-amber-500/50";
  return "";
}

// Dealership tread range: 2/32 … 12/32 plus a "12+/32" (stored as 13).
const TREAD_OPTIONS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

function treadLabel(v: number | null | undefined): string {
  if (v == null) return "—";
  if (v >= 13) return "12+/32";
  return `${v}/32`;
}

// Color rules: red 2–3, yellow 4–5, green 6+, neutral when blank.
function treadColorClasses(v: number | null | undefined): string {
  if (v == null) return "border-border text-muted-foreground";
  if (v <= 3) return "border-destructive/50 text-destructive";
  if (v <= 5) return "border-amber-500/50 text-amber-500";
  return "border-emerald-500/50 text-emerald-500";
}

function treadTextColor(v: number | null | undefined): string {
  if (v == null) return "text-muted-foreground";
  if (v <= 3) return "text-destructive";
  if (v <= 5) return "text-amber-500";
  return "text-emerald-500";
}

interface Props {
  unitId: string;
  dealerId: string;
  readOnly?: boolean;
}

export default function TireWheelInspection({ unitId, dealerId, readOnly = false }: Props) {
  const {
    treadDepth, setTreadDepth,
    tirePressure, setTirePressure,
    conditionFlags, setConditionFlags,
    wheelChecks, setWheelChecks,
    status, lowestTread, isLoading, isSaving,
  } = useTireInspection(unitId, dealerId);

  const [defaultPsi, setDefaultPsi] = useState("35");

  const psiRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const statusCfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.ok;
  const StatusIcon = statusCfg.icon;

  const advanceToNextField = useCallback((
    currentRefs: React.MutableRefObject<Record<string, HTMLInputElement | null>>,
    currentPos: string,
    nextRefs?: React.MutableRefObject<Record<string, HTMLInputElement | null>>
  ) => {
    const idx = POSITIONS.indexOf(currentPos as any);
    if (idx < POSITIONS.length - 1) {
      currentRefs.current[POSITIONS[idx + 1]]?.focus();
    } else if (nextRefs) {
      // After last position, jump to first of next section
      nextRefs.current[POSITIONS[0]]?.focus();
    }
  }, []);

  const updatePressure = (pos: string, val: string) => {
    const num = val === "" ? null : parseFloat(val);
    setTirePressure(prev => ({ ...prev, [pos]: num }));
  };

  const copyLfToAll = () => {
    if (treadDepth.lf == null) return;
    setTreadDepth({ lf: treadDepth.lf, rf: treadDepth.lf, lr: treadDepth.lf, rr: treadDepth.lf, spare: treadDepth.spare });
  };

  const setAllPsi = () => {
    const v = parseFloat(defaultPsi);
    if (isNaN(v)) return;
    setTirePressure({ lf: v, rf: v, lr: v, rr: v, spare: tirePressure.spare });
  };

  const markAllOk = () => {
    const resetFlags = Object.fromEntries(
      Object.keys(conditionFlags).map(k => [k, false])
    ) as Record<ConditionFlag, boolean>;
    setConditionFlags(resetFlags);
    setWheelChecks({
      alignment: { status: "ok" },
      vibration: { status: "ok" },
      lug_nuts: { status: "ok" },
      tpms: { status: "ok" },
      wheel_damage: { status: "ok" },
      brake_dust: { status: "ok" },
    });
  };

  const clearFlags = () => {
    const resetFlags = Object.fromEntries(
      Object.keys(conditionFlags).map(k => [k, false])
    ) as Record<ConditionFlag, boolean>;
    setConditionFlags(resetFlags);
  };

  const toggleFlag = (key: ConditionFlag) => {
    if (readOnly || key === "low_tread") return;
    setConditionFlags(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const cycleWheelCheck = (key: keyof WheelChecks) => {
    if (readOnly) return;
    setWheelChecks(prev => {
      const current = prev[key]?.status || "ok";
      const idx = STATUS_CYCLE.indexOf(current);
      const next = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
      return { ...prev, [key]: { ...prev[key], status: next } };
    });
  };

  const setWheelStatus = (key: keyof WheelChecks, s: WheelCheckStatus) => {
    if (readOnly) return;
    setWheelChecks(prev => ({
      ...prev,
      [key]: { ...prev[key], status: s },
    }));
  };

  const setWheelNote = (key: keyof WheelChecks, note: string) => {
    setWheelChecks(prev => ({
      ...prev,
      [key]: { ...prev[key]!, note },
    }));
  };

  const markAllWheelsOk = () => {
    setWheelChecks({
      alignment: { status: "ok" },
      vibration: { status: "ok" },
      lug_nuts: { status: "ok" },
      tpms: { status: "ok" },
      wheel_damage: { status: "ok" },
      brake_dust: { status: "ok" },
    });
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    refs: React.MutableRefObject<Record<string, HTMLInputElement | null>>,
    pos: string,
    nextRefs?: React.MutableRefObject<Record<string, HTMLInputElement | null>>
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      advanceToNextField(refs, pos, nextRefs);
    }
  };

  if (isLoading) {
    return (
      <Card className="glass-panel border-border">
        <CardContent className="flex items-center justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const filledFlags = Object.values(conditionFlags).filter(Boolean).length;

  return (
    <Collapsible defaultOpen>
      <Card className="glass-panel border-border overflow-hidden">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors py-3 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-semibold">Tires & Wheels</CardTitle>
                <Badge className={`text-[10px] px-2 py-0.5 font-bold uppercase tracking-wider border ${statusCfg.bg} ${statusCfg.color} border-0`}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {statusCfg.label}
                </Badge>
                {isSaving && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
              </div>
              <div className="flex items-center gap-2">
                {lowestTread && (
                  <span className={`text-[11px] font-mono font-medium ${treadTextColor(lowestTread.value)}`}>
                    Lowest: {treadLabel(lowestTread.value)} ({lowestTread.position})
                  </span>
                )}
                {!readOnly && (
                  <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={(e) => { e.stopPropagation(); markAllOk(); }}>
                    Mark All OK
                  </Button>
                )}
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="p-4 pt-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* LEFT: Measurements */}
              <div className="space-y-5">
                {/* Tread Depth */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tread Depth</h4>
                    {!readOnly && (
                      <Button variant="ghost" size="sm" className="h-5 text-[10px] px-1.5 gap-1" onClick={copyLfToAll}>
                        <Copy className="h-2.5 w-2.5" /> Copy LF → All
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {POSITIONS.map(pos => {
                      const val = treadDepth[pos];
                      return (
                        <div key={pos} className="space-y-1">
                          <span className="text-[11px] font-medium text-muted-foreground">{POS_LABELS[pos]}</span>
                          <Select
                            value={val == null ? "none" : String(val)}
                            onValueChange={(v) => setTreadDepth(prev => ({ ...prev, [pos]: v === "none" ? null : Number(v) }))}
                            disabled={readOnly}
                          >
                            <SelectTrigger className={`min-h-[44px] h-11 w-full text-sm font-semibold border ${treadColorClasses(val)}`}>
                              <SelectValue placeholder="—" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">—</SelectItem>
                              {TREAD_OPTIONS.map(o => (
                                <SelectItem key={o} value={String(o)}>{treadLabel(o)}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      );
                    })}
                  </div>
                  <p className={`text-[11px] mt-2 font-medium ${treadTextColor(lowestTread ? lowestTread.value : null)}`}>
                    {lowestTread
                      ? `Lowest tread: ${treadLabel(lowestTread.value)} (${lowestTread.position})`
                      : "Lowest tread: —"}
                  </p>
                </div>

                {/* Tire Pressure */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      <Gauge className="h-3 w-3" /> Tire Pressure
                    </h4>
                    {!readOnly && (
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          value={defaultPsi}
                          onChange={e => setDefaultPsi(e.target.value)}
                          className="h-5 w-10 text-[10px] px-1 text-center"
                        />
                        <Button variant="ghost" size="sm" className="h-5 text-[10px] px-1.5" onClick={setAllPsi}>
                          Set All
                        </Button>
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground mb-2">Target: {defaultPsi} PSI (Cold)</p>
                  <div className="grid grid-cols-2 gap-2">
                    {POSITIONS.map(pos => {
                      const val = tirePressure[pos];
                      const colorCls = getPsiColor(val);
                      return (
                        <div key={pos} className="flex items-center gap-1.5">
                          <span className="text-xs font-medium text-muted-foreground w-6">{POS_LABELS[pos]}</span>
                          <div className="flex items-center gap-0">
                            <Input
                              ref={el => { psiRefs.current[pos] = el; }}
                              type="number"
                              min={0}
                              max={100}
                              step={1}
                              value={val ?? ""}
                              onChange={e => updatePressure(pos, e.target.value)}
                              onKeyDown={e => handleKeyDown(e, psiRefs, pos)}
                              className={`h-8 text-sm w-16 rounded-r-none border-r-0 text-center ${colorCls}`}
                              placeholder="—"
                              disabled={readOnly}
                            />
                            <span className="h-8 flex items-center px-1.5 text-[10px] text-muted-foreground bg-muted border border-l-0 border-border rounded-r-md font-mono">
                              PSI
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* RIGHT: Condition + Wheel Checks */}
              <div className="space-y-5">
                {/* Condition Flags */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tire Condition</h4>
                    {!readOnly && filledFlags > 0 && (
                      <Button variant="ghost" size="sm" className="h-5 text-[10px] px-1.5" onClick={clearFlags}>
                        Clear flags
                      </Button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {CONDITION_FLAGS.map(({ key, label, severity }) => {
                      const active = conditionFlags[key];
                      const isAuto = key === "low_tread";
                      const activeBg = severity === "red"
                        ? "bg-destructive/10 border-destructive/40 text-destructive"
                        : "bg-amber-500/10 border-amber-500/40 text-amber-500";
                      return (
                        <button
                          key={key}
                          onClick={() => toggleFlag(key)}
                          disabled={readOnly || isAuto}
                          className={`
                            px-2.5 py-1 rounded-full text-[11px] font-medium transition-all border
                            ${active
                              ? activeBg
                              : "bg-muted/30 border-border text-muted-foreground hover:border-muted-foreground/50"}
                            ${(readOnly || isAuto) ? "cursor-default opacity-70" : "cursor-pointer"}
                          `}
                        >
                          {active ? "✕ " : ""}{label}
                          {isAuto && " (auto)"}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Wheel & Alignment Checks — Compact Tri-State Grid */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Wheel & Alignment</h4>
                    {!readOnly && (
                      <Button variant="ghost" size="sm" className="h-5 text-[10px] px-1.5" onClick={markAllWheelsOk}>
                        Mark All OK
                      </Button>
                    )}
                  </div>
                  {/* Column headers */}
                  <div className="flex items-center justify-end gap-0 mb-1 pr-0.5">
                    <span className="w-10 text-center text-[9px] font-semibold text-muted-foreground uppercase">OK</span>
                    <span className="w-10 text-center text-[9px] font-semibold text-muted-foreground uppercase">Attn</span>
                    <span className="w-10 text-center text-[9px] font-semibold text-muted-foreground uppercase">N/A</span>
                  </div>
                  <div className="space-y-0.5">
                    {WHEEL_CHECK_ITEMS.map(({ key, label }) => {
                      const check = wheelChecks[key] || { status: "ok" as WheelCheckStatus };
                      return (
                        <div key={key}>
                          <div className="flex items-center justify-between py-0.5">
                            <span className="text-xs text-foreground flex-1">{label}</span>
                            <div className="flex items-center gap-0">
                              {(["ok", "attention", "na"] as WheelCheckStatus[]).map(s => {
                                const isActive = check.status === s;
                                let cls = "text-muted-foreground/30 hover:text-muted-foreground/60";
                                if (isActive) {
                                  if (s === "ok") cls = "bg-emerald-500/15 text-emerald-500 border-emerald-500/30";
                                  else if (s === "attention") cls = "bg-amber-500/15 text-amber-500 border-amber-500/30";
                                  else cls = "bg-muted text-muted-foreground border-border";
                                }
                                return (
                                  <button
                                    key={s}
                                    onClick={() => setWheelStatus(key, s)}
                                    disabled={readOnly}
                                    className={`w-10 h-6 text-[10px] font-semibold rounded border transition-all ${cls} ${
                                      readOnly ? "cursor-default" : "cursor-pointer"
                                    }`}
                                  >
                                    {s === "ok" ? "OK" : s === "attention" ? "⚠" : "—"}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                          {check.status === "attention" && (
                            <Input
                              value={check.note || ""}
                              onChange={e => setWheelNote(key, e.target.value)}
                              placeholder="Details…"
                              className="h-6 text-[11px] mt-0.5 ml-0"
                              disabled={readOnly}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
