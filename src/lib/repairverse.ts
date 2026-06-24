/**
 * Repairverse — technician repair-research client.
 *
 * Data lives in the `repairverse` schema of motorverse_pg (Mission Control's
 * Postgres) and is proxied to MC by api/proxy.ts (same-origin).
 *
 * Scalable model:
 *   GET  /api/v1/reconverse/repairverse/vehicles/:id/research  -> ResearchBundle
 *        (procedures are HEADERS only — id/title/system/summary/labor/counts)
 *   GET  /api/v1/reconverse/repairverse/procedures/:id         -> RVProcedureDetail
 *        (steps + warnings + parts + related specs — lazy-loaded when opened)
 *   POST /api/v1/reconverse/repairverse/shop-notes             { ...ShopNoteInput }
 *
 * Until those endpoints are reachable, getters fall back to clearly-LABELED seed
 * data (`available:false`) so the UI renders — never silent demo data.
 */
import { apiFetch } from "@/lib/api";

// --- Types ---------------------------------------------------------------

export type FitmentLevel = "exact" | "possible" | "generic";

export interface RVVehicle {
  id: number | null;
  year: number | null;
  make: string | null;
  model: string | null;
  trim: string | null;
  engine: string | null;
  drivetrain: string | null;
  vin: string | null;
  ro_number: string | null;
  stock: string | null;
  mileage: number | null;
  short: string;
  full: string;
}

export interface RVStep { step_no: number; title: string; body: string; }
export interface RVWarning { severity: string; body: string; }
export interface RVPart { part_number: string | null; description: string | null; qty: string | null; source: string | null; }
export interface RVSpec { kind: "torque" | "fluid" | "general"; name: string; value: string | null; }

/** Procedure HEADER — returned in the research bundle (lightweight + counts). */
export interface RVProcedure {
  id: number;
  title: string;
  system: string | null;
  summary: string | null;
  difficulty: string | null;
  fitment_level: FitmentLevel;
  labor_hours: number | null;
  source: string | null;
  source_ref: string | null;
  step_count: number;
  warning_count: number;
  part_count: number;
}

/** Procedure DETAIL — lazy-loaded when a procedure is opened. */
export interface RVProcedureDetail {
  id: number;
  title: string;
  system: string | null;
  summary: string | null;
  difficulty: string | null;
  fitment_level: FitmentLevel;
  labor_hours: number | null;
  source: string | null;
  source_ref: string | null;
  vehicle: RVVehicle | null;
  steps: RVStep[];
  warnings: RVWarning[];
  parts: RVPart[];
  specs: RVSpec[];
  images: { id: number; seq: number; mime: string; url: string }[];
}

export interface RVLaborOp { operation: string; hours: number | null; note: string | null; source: string | null; }
export interface RVDtc { code: string; description: string | null; system: string | null; causes: string | null; diagnostic_steps: string | null; }
export interface RVTsb { tsb_number: string | null; title: string | null; summary: string | null; issued_date: string | null; fitment_level: FitmentLevel; }
export interface RVRecall { recall_id: string | null; status: string | null; title: string | null; summary: string | null; }
export interface RVCircuit { name: string | null; wire: string | null; pin: string | null; color: string | null; }
export interface RVWiringDiagram { circuit: string | null; drawing_ref: string | null; description: string | null; circuits: RVCircuit[]; images: { id: number; seq: number; mime: string; url: string }[]; }
export interface RVComponentLocation { component: string; location: string | null; notes: string | null; }
export interface RVMaintenanceItem { service: string; interval_miles: number | null; interval_months: number | null; note: string | null; }
export interface RVShopNote { vehicle_pattern: string | null; related_term: string | null; dtc: string | null; body: string; author: string | null; created_at?: string | null; }

export interface ResearchBundle {
  available: boolean;
  vehicle: RVVehicle;
  procedures: RVProcedure[];
  labor: RVLaborOp[];
  parts: RVPart[];
  specs: RVSpec[];
  dtcs: RVDtc[];
  tsbs: RVTsb[];
  recalls: RVRecall[];
  wiring: RVWiringDiagram[];
  components: RVComponentLocation[];
  maintenance: RVMaintenanceItem[];
  notes: RVShopNote[];
}

export interface ShopNoteInput {
  vehicle_id?: number | null;
  vehicle_pattern: string;
  related_term: string;
  dtc?: string | null;
  body: string;
  author?: string | null;
}

// --- Helpers -------------------------------------------------------------

const num = (v: unknown): number | null => { const n = Number(v); return Number.isFinite(n) ? n : null; };
const str = (v: unknown): string | null => (v === null || v === undefined ? null : String(v));

function vehicleShort(v: Partial<RVVehicle>): string {
  return [v.year, v.make, v.model, v.trim].filter(Boolean).join(" ").trim() || "Vehicle";
}
function normVehicle(v: any): RVVehicle {
  const base = {
    id: v?.id ?? null, year: num(v?.year), make: str(v?.make), model: str(v?.model),
    trim: str(v?.trim), engine: str(v?.engine), drivetrain: str(v?.drivetrain),
    vin: str(v?.vin), ro_number: str(v?.ro_number), stock: str(v?.stock), mileage: num(v?.mileage),
  };
  const short = vehicleShort(base);
  return { ...base, short, full: base.engine ? `${short} · ${base.engine}` : short };
}

// --- Seed fallback (LABELED sample data — mirrors repairverse_seed.sql) ---

const SEED_VEHICLE: RVVehicle = normVehicle({
  id: 1, year: 2019, make: "Toyota", model: "Camry", trim: "LE",
  engine: "2.5L I4", drivetrain: "FWD", vin: "4T1B11HK9KU812345",
  ro_number: "RO-44827", stock: "T-0912", mileage: 78412,
});

const SEED_SPECS: RVSpec[] = [
  { kind: "torque", name: "Caliper guide-pin bolt", value: "25 ft-lb · 34 Nm" },
  { kind: "torque", name: "Caliper bracket bolt", value: "77 ft-lb · 105 Nm" },
  { kind: "torque", name: "Wheel lug nut", value: "76 ft-lb · 103 Nm" },
  { kind: "torque", name: "Master cyl. to booster", value: "18 ft-lb" },
  { kind: "fluid", name: "Brake fluid", value: "DOT 3" },
  { kind: "fluid", name: "Engine oil (w/ filter)", value: "0W-16 · 4.6 qt" },
  { kind: "fluid", name: "Engine coolant", value: "SLLC · 6.6 qt" },
  { kind: "fluid", name: "Trans fluid (drain/fill)", value: "Toyota WS · 3.4 qt" },
  { kind: "general", name: "Brake bleed sequence", value: "RR-LR-RF-LF" },
];

const SEED_PROC_DETAILS: RVProcedureDetail[] = [
  {
    id: 1, title: "Front Brake Pads & Rotors — Replace", system: "brakes",
    summary: "Remove calipers, retract pistons, replace pads and rotors, torque to spec, bed-in.",
    difficulty: "moderate", fitment_level: "exact", labor_hours: 1.6,
    source: "Seed — OEM Service", source_ref: "Updated Mar 2024", vehicle: SEED_VEHICLE,
    steps: [
      { step_no: 1, title: "Raise & support", body: "Loosen front lug nuts, raise the vehicle, support on stands, and remove both front wheels." },
      { step_no: 2, title: "Remove caliper", body: "Remove the two caliper guide-pin bolts (12mm). Lift the caliper off and suspend it with wire — never let it hang by the hose." },
      { step_no: 3, title: "Remove bracket & pads", body: "Remove the caliper mounting bracket bolts (17mm). Take out the old pads, shims, and anti-rattle hardware." },
      { step_no: 4, title: "Remove rotor", body: "Remove the rotor retaining screw if present and pull the rotor. Apply penetrant or use the M8 jack-screw holes if seized." },
      { step_no: 5, title: "Prep & rotor", body: "Wire-brush the hub face clean. Mount the new rotor and snug the retaining screw." },
      { step_no: 6, title: "Retract piston", body: "Crack the bleeder, then compress the caliper piston with a C-clamp or piston tool. Close the bleeder." },
      { step_no: 7, title: "Install pads", body: "Fit new hardware and pads, lubricating the contact points and slide pins. Reinstall the bracket — 77 ft-lb." },
      { step_no: 8, title: "Reassemble & bed-in", body: "Reinstall caliper guide bolts (25 ft-lb). Pump the pedal firm before moving. Mount wheels (76 ft-lb), top off fluid, road-test and bed the pads in." },
    ],
    warnings: [
      { severity: "warning", body: "Do not press the brake pedal while calipers are removed — pistons can pop out." },
      { severity: "warning", body: "Open the bleeder screw before retracting the piston to avoid backfeeding fluid into the ABS modulator." },
    ],
    parts: [
      { part_number: "04465-33471", description: "Front Brake Pad Set (incl. shims & hardware)", qty: "1" },
      { part_number: "43512-06200", description: "Front Disc Rotor, 305mm vented", qty: "2" },
    ],
    specs: SEED_SPECS.filter((s) => s.kind === "torque"),
  },
  {
    id: 2, title: "Front Brake Pads Only — Replace", system: "brakes",
    summary: "Pad replacement with hardware; rotor measurement and cleaning included.",
    difficulty: "moderate", fitment_level: "exact", labor_hours: 1.2,
    source: "Seed — OEM Service", source_ref: "Updated Mar 2024", vehicle: SEED_VEHICLE,
    steps: [], warnings: [], parts: [], specs: SEED_SPECS.filter((s) => s.kind === "torque"),
  },
];

function toHeader(d: RVProcedureDetail): RVProcedure {
  return {
    id: d.id, title: d.title, system: d.system, summary: d.summary, difficulty: d.difficulty,
    fitment_level: d.fitment_level, labor_hours: d.labor_hours, source: d.source, source_ref: d.source_ref,
    step_count: d.steps.length, warning_count: d.warnings.length, part_count: d.parts.length,
  };
}

const SEED_BUNDLE: ResearchBundle = {
  available: false,
  parts: [],
  vehicle: SEED_VEHICLE,
  procedures: SEED_PROC_DETAILS.map(toHeader),
  labor: [
    { operation: "Brake Pads & Rotors, Front — Replace", hours: 1.6, note: "Includes hardware and bed-in" },
    { operation: "Brake Pads, Front — Replace", hours: 1.2, note: "Pads only, both sides" },
    { operation: "Brake Rotor, Front — Refinish (ea)", hours: 0.4, note: "On-car lathe" },
    { operation: "Brake System — Flush & Bleed", hours: 0.8, note: "Pressure bleed, 4 corners" },
  ],
  specs: SEED_SPECS,
  dtcs: [
    { code: "P0101", description: "Mass Air Flow Circuit Range/Performance", system: "engine",
      causes: "Loose intake snorkel clamp; torn accordion boot; dirty/failed MAF sensor.",
      diagnostic_steps: "Inspect intake for unmetered air; check snorkel clamp and accordion boot before condemning the MAF. Compare MAF g/s to spec at idle and 2500 rpm." },
  ],
  tsbs: [
    { tsb_number: "T-SB-0123-19", title: "Front Brake Judder / Vibration", summary: "Steering-wheel shimmy under braking — resurface or replace rotors and install the updated pad kit.", issued_date: "2019", fitment_level: "possible" },
    { tsb_number: "T-SB-0045-22", title: "Brake Pedal Feel / Long Pedal", summary: "Revised bleeding sequence and master-cylinder inspection for spongy pedal complaints.", issued_date: "2022", fitment_level: "possible" },
    { tsb_number: "T-SB-0210-20", title: "HVAC Blower Noise", summary: "Blower motor tick at low speed — inspect for debris, replace motor if noise persists.", issued_date: "2020", fitment_level: "generic" },
    { tsb_number: "T-SB-0078-21", title: "MIL P0101 MAF Performance", summary: "Reprogram ECM and inspect intake for unmetered air on P0101 complaints.", issued_date: "2021", fitment_level: "possible" },
  ],
  recalls: [
    { recall_id: "21V-XXX", status: "open", title: "Engine wire-harness chafing", summary: "Inspect and add protective tape to the engine harness near the brake booster." },
    { recall_id: "19V-585", status: "closed", title: "Fuel pump impeller", summary: "Low-pressure fuel pump may fail. Remedy completed on this VIN." },
  ],
  wiring: [
    { circuit: "Front ABS / Wheel speed sensor", drawing_ref: "DWG 04-118", description: "ABS Speed Sensor — Front L/R",
      circuits: [
        { name: "Front L speed sensor (+)", wire: "GR / 0.5mm²", pin: "A12", color: "#6b7280" },
        { name: "Front L speed sensor (–)", wire: "BR / 0.5mm²", pin: "A13", color: "#92400e" },
        { name: "Front R speed sensor (+)", wire: "LG / 0.5mm²", pin: "A24", color: "#65a30d" },
        { name: "Front R speed sensor (–)", wire: "BK / 0.5mm²", pin: "A25", color: "#1f2937" },
        { name: "ABS ECU ground", wire: "W-B / 1.25mm²", pin: "E1", color: "#9ca3af" },
      ] },
  ],
  components: [
    { component: "Blower motor", location: "Under passenger-side dash, behind the glovebox", notes: "Access by dropping the lower glovebox panel" },
    { component: "Mass air flow sensor", location: "Intake duct between air box and throttle body", notes: "" },
    { component: "ABS modulator / actuator", location: "Engine bay, driver side near the master cylinder", notes: "" },
  ],
  maintenance: [
    { service: "Engine oil & filter", interval_miles: 10000, interval_months: 12, note: "0W-16 full synthetic" },
    { service: "Tire rotation", interval_miles: 5000, interval_months: 6, note: "" },
    { service: "Brake fluid flush", interval_miles: 30000, interval_months: 36, note: "DOT 3" },
    { service: "Engine coolant (SLLC)", interval_miles: 100000, interval_months: 120, note: "First change at 100k mi" },
  ],
  notes: [
    { vehicle_pattern: "Camry 18-24 · 2.5L", related_term: "front brakes", dtc: null, author: "Mike R.", created_at: "3 weeks ago",
      body: "Crack the bleeder before retracting the caliper pistons on this platform — pushing fluid backward muddies the ABS modulator and we've had two come back with soft pedal." },
    { vehicle_pattern: "Camry 18-24", related_term: "P0101", dtc: "P0101", author: "Dana K.", created_at: "2 months ago",
      body: "P0101 on these is almost always the intake snorkel clamp loose or a torn accordion boot. Check before condemning the MAF." },
    { vehicle_pattern: "Camry 18-24 · ADAS", related_term: "ADAS calibration", dtc: null, author: "Luis T.", created_at: "5 months ago",
      body: "Front camera needs a level floor and the full 6m target distance. Our bay 3 is too short — use the alignment bay for these." },
  ],
};

// --- Normalizers ---------------------------------------------------------

function normSpec(s: any): RVSpec { return { kind: (s.kind ?? "general"), name: str(s.name) ?? "", value: str(s.value) }; }

function normProcedure(p: any): RVProcedure {
  return {
    id: Number(p.id), title: str(p.title) ?? "", system: str(p.system), summary: str(p.summary),
    difficulty: str(p.difficulty), fitment_level: (p.fitment_level ?? "exact"),
    labor_hours: num(p.labor_hours), source: str(p.source), source_ref: str(p.source_ref),
    step_count: num(p.step_count) ?? 0, warning_count: num(p.warning_count) ?? 0, part_count: num(p.part_count) ?? 0,
  };
}

function normProcedureDetail(p: any): RVProcedureDetail {
  return {
    id: Number(p.id), title: str(p.title) ?? "", system: str(p.system), summary: str(p.summary),
    difficulty: str(p.difficulty), fitment_level: (p.fitment ?? p.fitment_level ?? "exact"),
    labor_hours: num(p.labor_hours), source: str(p.source), source_ref: str(p.source_ref),
    vehicle: p.vehicle ? normVehicle(p.vehicle) : null,
    steps: Array.isArray(p.steps) ? p.steps.map((s: any) => ({ step_no: num(s.step_no) ?? 0, title: str(s.title) ?? "", body: str(s.body) ?? "" })) : [],
    warnings: Array.isArray(p.warnings) ? p.warnings.map((w: any) => ({ severity: str(w.severity) ?? "warning", body: str(w.body) ?? "" })) : [],
    parts: Array.isArray(p.parts) ? p.parts.map((pt: any) => ({ part_number: str(pt.part_number), description: str(pt.description), qty: str(pt.qty) })) : [],
    specs: Array.isArray(p.specs) ? p.specs.map(normSpec) : [],
    images: Array.isArray(p.images) ? p.images.map((im: any) => ({ id: Number(im.id), seq: num(im.seq) ?? 0, mime: str(im.mime) ?? "image/jpeg", url: str(im.url) ?? "" })) : [],
  };
}

function normNote(n: any): RVShopNote {
  return { vehicle_pattern: str(n.vehicle_pattern), related_term: str(n.related_term), dtc: str(n.dtc), body: str(n.body) ?? "", author: str(n.author), created_at: str(n.created_at) };
}

function normBundle(d: any): ResearchBundle {
  if (!d || typeof d !== "object") return { ...SEED_BUNDLE };
  return {
    available: true,
    vehicle: normVehicle(d.vehicle ?? {}),
    procedures: Array.isArray(d.procedures) ? d.procedures.map(normProcedure) : [],
    labor: Array.isArray(d.labor) ? d.labor.map((o: any) => ({ operation: str(o.operation) ?? "", hours: num(o.hours), note: str(o.note), source: str(o.source) ?? "ALLDATA" })) : [],
    parts: Array.isArray(d.parts) ? d.parts.map((p: any) => ({ part_number: str(p.part_number), description: str(p.description), qty: str(p.qty), source: str(p.source) ?? "ALLDATA" })) : [],
    specs: Array.isArray(d.specs) ? d.specs.map(normSpec) : [],
    dtcs: Array.isArray(d.dtcs) ? d.dtcs.map((x: any) => ({ code: str(x.code) ?? "", description: str(x.description), system: str(x.system), causes: str(x.causes), diagnostic_steps: str(x.diagnostic_steps) })) : [],
    tsbs: Array.isArray(d.tsbs) ? d.tsbs.map((x: any) => ({ tsb_number: str(x.tsb_number), title: str(x.title), summary: str(x.summary), issued_date: str(x.issued_date), fitment_level: (x.fitment_level ?? "possible") })) : [],
    recalls: Array.isArray(d.recalls) ? d.recalls.map((x: any) => ({ recall_id: str(x.recall_id), status: str(x.status), title: str(x.title), summary: str(x.summary) })) : [],
    wiring: Array.isArray(d.wiring) ? d.wiring.map((w: any) => ({ circuit: str(w.circuit), drawing_ref: str(w.drawing_ref), description: str(w.description), circuits: Array.isArray(w.circuits) ? w.circuits.map((c: any) => ({ name: str(c.name), wire: str(c.wire), pin: str(c.pin), color: str(c.color) })) : [], images: Array.isArray(w.images) ? w.images.map((im: any) => ({ id: Number(im.id), seq: num(im.seq) ?? 0, mime: str(im.mime) ?? 'image/jpeg', url: str(im.url) ?? '' })) : [] })) : [],
    components: Array.isArray(d.components) ? d.components.map((c: any) => ({ component: str(c.component) ?? "", location: str(c.location), notes: str(c.notes) })) : [],
    maintenance: Array.isArray(d.maintenance) ? d.maintenance.map((m: any) => ({ service: str(m.service) ?? "", interval_miles: num(m.interval_miles), interval_months: num(m.interval_months), note: str(m.note) })) : [],
    notes: Array.isArray(d.notes) ? d.notes.map(normNote) : [],
  };
}

// --- Getters -------------------------------------------------------------

export async function getResearchBundle(vehicleId?: number | string): Promise<ResearchBundle> {
  const id = vehicleId ?? SEED_VEHICLE.id ?? 1;
  try {
    const res = await apiFetch(`/api/v1/reconverse/repairverse/vehicles/${id}/research`);
    if (!res.ok) return { ...SEED_BUNDLE };
    const j = await res.json().catch(() => null);
    if (!j?.ok) return { ...SEED_BUNDLE };
    return normBundle(j.data);
  } catch {
    return { ...SEED_BUNDLE };
  }
}

/** Lazy-load full procedure detail (steps/warnings/parts/specs) when opened. */
export async function getProcedureDetail(procedureId: number | string): Promise<RVProcedureDetail | null> {
  const seed = () => SEED_PROC_DETAILS.find((p) => String(p.id) === String(procedureId)) ?? null;
  try {
    const res = await apiFetch(`/api/v1/reconverse/repairverse/procedures/${procedureId}`);
    if (!res.ok) return seed();
    const j = await res.json().catch(() => null);
    if (!j?.ok || !j.data) return seed();
    return normProcedureDetail(j.data);
  } catch {
    return seed();
  }
}

export type RVCompareSource = { id: number; name: string; kind: string; labor: number; procedures: number; specs: number };
export type RVCompareLabor = { operation: string; by: Record<string, number>; sources: number; spread: number };
export type RVCompareProc = { src: string; n: number; systems: number };
export type RVCompare = {
  vehicle: { id: number; year: number; make: string; model: string; engine?: string | null; label: string };
  sibling_count: number;
  sources: RVCompareSource[];
  labor: RVCompareLabor[];
  procedures: RVCompareProc[];
};

export async function getCompare(vehicleId: number | string): Promise<RVCompare | null> {
  try {
    const res = await apiFetch(`/api/v1/reconverse/repairverse/vehicles/${vehicleId}/compare`);
    if (!res.ok) return null;
    const j = await res.json().catch(() => null);
    return j?.ok && j.data ? (j.data as RVCompare) : null;
  } catch {
    return null;
  }
}

export async function saveShopNote(input: ShopNoteInput): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await apiFetch(`/api/v1/reconverse/repairverse/shop-notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const j = await res.json().catch(() => null);
    if (!res.ok || !j?.ok) return { ok: false, error: j?.error || `http_${res.status}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: "network_error" };
  }
}

// Client-side search over a loaded bundle.
export interface ResultItem { title: string; summary: string; fitment: FitmentLevel; source: string; meta: string; target: string; procId?: number; }
export function searchBundle(b: ResearchBundle, query: string, fitment: "all" | FitmentLevel = "all", source: SourceKey | "all" = "all") {
  const q = (query || "").toLowerCase().trim();
  const srcOk = (name: string | null | undefined) => source === "all" || srcBucket(name) === source;
  const hit = (s: string) => !q || s.toLowerCase().includes(q);
  const groups: { category: string; items: ResultItem[] }[] = [];
  const push = (category: string, items: ResultItem[]) => { const f = items.filter(i => fitment === "all" || i.fitment === fitment); if (f.length) groups.push({ category, items: f }); };

  const procRank = (p: RVProcedure): number => {
    const t = (p.title || "").toLowerCase();
    let sc = p.step_count ? Math.min(p.step_count, 40) : 0;
    if (/removal|installation|replace|overhaul|disassembl|assembl|adjust/.test(t)) sc += 120;
    else if (/inspection|diagnos|test/.test(t)) sc += 60;
    if (/service data|description|precaution|exploded|component parts|reference|how to/.test(t)) sc -= 80;
    if (q && t.startsWith(q)) sc += 40;
    return sc;
  };
  const segs = (sys: string | null) => (sys || "").split(/\s*>\s*/).map((x) => x.trim()).filter(Boolean);
  const GENERIC_T = /^(dtc )?diagnosis procedure$|^description$|^removal( and| &amp;| &)? installation$|^inspection$|^component parts$|^exploded view$|^adjustment$|^reference$/i;
  const procTitle = (p: RVProcedure) => {
    const parts = segs(p.system); const last = parts[parts.length - 1] || ""; const t = (p.title || "").trim();
    if (last && (GENERIC_T.test(t) || /\b[PCBU][0-9]{3,4}\b/.test(last)) && !t.toLowerCase().includes(last.toLowerCase())) return `${last} — ${t}`;
    return t;
  };
  const procPath = (p: RVProcedure) => segs(p.system).slice(0, -1).join(" › ");
  const procItem = (p: RVProcedure): ResultItem => ({
    title: procTitle(p), summary: procPath(p) || p.summary || "", fitment: p.fitment_level, source: p.source || "—",
    meta: p.source_ref || (p.step_count ? `${p.step_count} steps` : ""), target: "procedure", procId: p.id,
  });
  const allProcQuery = /^procedures?$/.test(q);
  const procMatches = b.procedures.filter(p => srcOk(p.source) && (allProcQuery || hit(p.title) || hit(p.summary || "") || hit(p.system || "")));
  const bySys: Record<string, RVProcedure[]> = {};
  const flatProcs: RVProcedure[] = [];
  for (const p of procMatches) {
    const parts = segs(p.system);
    const sys = (parts[0] || "").replace(/&amp;/g, "&").trim();
    if (sys && parts.length > 1) (bySys[sys] = bySys[sys] || []).push(p);
    else flatProcs.push(p);
  }
  for (const sys of Object.keys(bySys).sort((a, b2) => bySys[b2].length - bySys[a].length)) {
    push(sys, bySys[sys].slice().sort((a, b2) => procRank(b2) - procRank(a)).map(procItem));
  }
  if (flatProcs.length) push("Procedures", flatProcs.slice().sort((a, b2) => procRank(b2) - procRank(a)).map(procItem));
  push("Labor", b.labor.filter(o => srcOk(o.source) && hit(o.operation)).map(o => ({
    title: o.operation, summary: o.note || "", fitment: "exact", source: "Labor Guide", meta: o.hours != null ? `${o.hours} hr` : "", target: "labor",
  })));
  push("Specs", b.specs.filter(s => srcOk("ALLDATA") && hit(s.name)).map(s => ({
    title: s.name, summary: s.value || "", fitment: "exact", source: "OEM", meta: s.kind, target: "labor",
  })));
  push("DTCs", b.dtcs.filter(d => srcOk("ALLDATA") && (hit(d.code) || hit(d.description || ""))).map(d => ({
    title: `${d.code} — ${d.description || ""}`.trim(), summary: d.causes || "", fitment: "possible", source: "OEM", meta: d.system || "", target: "results",
  })));
  push("TSBs", b.tsbs.filter(t => srcOk("ALLDATA") && (hit(t.title || "") || hit(t.tsb_number || ""))).map(t => ({
    title: t.title || t.tsb_number || "", summary: t.summary || "", fitment: t.fitment_level, source: "TSB", meta: t.tsb_number || "", target: "tsb",
  })));
  push("Wiring", b.wiring.filter(w => srcOk((w as any).source) && (hit(w.description || "") || hit(w.circuit || ""))).map(w => ({
    title: w.description || w.circuit || "", summary: "ABS speed sensor wiring, connector pinout, and resistance values.", fitment: "generic", source: "OEM Wiring", meta: w.drawing_ref || "", target: "wiring",
  })));
  push("Shop Notes", b.notes.filter(n => srcOk("internal") && (hit(n.body) || hit(n.related_term || ""))).map(n => ({
    title: n.related_term || "Shop note", summary: n.body, fitment: "exact", source: `Shop Note · ${n.author || ""}`.trim(), meta: n.created_at || "", target: "notes",
  })));
  return groups;
}

export const RV_KNOWN_TERMS = ["brake", "rotor", "pad", "caliper", "oil", "fluid", "coolant", "p010",
  "water pump", "blower", "adas", "torque", "transmission", "spec", "wheel", "sensor", "filter",
  "recall", "tsb", "maintenance", "procedure", "diagnos", "bumper", "battery", "calibrat"];
export function isKnownQuery(q: string): boolean {
  const l = (q || "").toLowerCase().trim();
  if (/^[pbcu][0-9][0-9a-f]{2,3}$/i.test(l)) return true; // DTC code (P0420, B0020, U1000...)
  return RV_KNOWN_TERMS.some(w => l.includes(w));
}


// ---- Source attribution + cross-source comparison (ALLDATA vs ProDemand vs OEM) ----
export type SourceKey = "alldata" | "prodemand" | "oem" | "internal";
export const SOURCE_LABELS: Record<SourceKey, string> = { alldata: "ALLDATA", prodemand: "ProDemand", oem: "OEM / ESM", internal: "Internal" };
export function srcBucket(name: string | null | undefined): SourceKey {
  const n = (name || "").toLowerCase();
  if (/prodemand|mitchell/.test(n)) return "prodemand";
  if (/esm|oem|nissan|factory/.test(n)) return "oem";
  if (/shop|internal|note/.test(n)) return "internal";
  return "alldata"; // default: current aftermarket data
}
const STOP = new Set(["and","or","the","a","of","to","for","with","r","&","-"]);
export function normalizeOp(op: string): string {
  const toks = (op || "").toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").split(/\s+/)
    .map((t) => t.replace(/s$/, "")).filter((t) => t && !STOP.has(t));
  return Array.from(new Set(toks)).sort().join(" ");
}
export type LaborCompareRow = { operation: string; alldata: number | null; prodemand: number | null; oem: number | null; diff: number | null; diffPct: number | null; status: string };
// Canonical operation type — collapses ALLDATA/ProDemand synonyms (R&R/Remove & Replace, Reface/Refinish, ...).
function opCanon(w: string): string {
  const t = (w || "").toLowerCase();
  if (/\br\s*&\s*i\b|remove\s*&?\s*and?\s*install|reinstall/.test(t)) return "r&i";
  if (/\br\s*&\s*r\b|remove\s*&?\s*and?\s*replace|\breplace\b/.test(t)) return "replace";
  if (/overhaul/.test(t)) return "overhaul";
  if (/reface|refinish|resurface|machine/.test(t)) return "refinish";
  if (/inspect/.test(t)) return "inspect";
  if (/adjust/.test(t)) return "adjust";
  if (/bleed/.test(t)) return "bleed";
  if (/align/.test(t)) return "align";
  if (/test|check/.test(t)) return "test";
  if (/service|flush|drain|fill/.test(t)) return "service";
  return t.replace(/[^a-z]+/g, " ").trim().split(" ")[0] || "other";
}
const COMP_STOP = new Set(["system","assembly","assy","kit","the","and","or","of","with","w","complete","type","unit","both","side","one","each","note","add","to","front","rear","left","right","lh","rh","upper","lower"]);
function compTokens(comp: string): string[] {
  return Array.from(new Set((comp || "").toLowerCase().replace(/\([^)]*\)/g, " ").replace(/[^a-z0-9]+/g, " ").split(/\s+/).map((x) => x.replace(/s$/, "")).filter((x) => x.length > 1 && !COMP_STOP.has(x)))).sort();
}
// Pull {component, operation} out of each source's distinct naming convention.
//   ALLDATA   "Operation - System - Component, Abbrev - Qualifier"
//   ProDemand "Group - Subgroup - COMPONENT - Operation"
function parseOp(o: RVLaborOp): { comp: string; op: string } {
  const segs = (o.operation || "").split(/\s+-\s+/).map((x) => x.trim()).filter(Boolean);
  if (srcBucket(o.source) === "prodemand") return { op: segs[segs.length - 1] || "", comp: segs[segs.length - 2] || "" };
  const op = segs[0] || "";
  const cseg = segs.find((x) => x.includes(","));
  const comp = cseg ? cseg.split(",")[0].trim() : (segs[2] || segs[segs.length - 1] || "");
  return { comp, op };
}
const titleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

const GENERIC = new Set(["brake","cover","system","component","control","module","unit","kit","set","assembly","housing","bracket","mount","shield","guard","panel","plate","clip","bolt","nut","seal","gasket","line","pipe","tube","hose","switch","sensor","valve","bearing","pump","motor","relay","actuator","cable","solenoid","heater"]);
// component-token overlap, but only "confident" if a non-generic token is shared (so
// "Caliper"~"CALIPER" matches, while generic "Brakes"~"BRAKE PEDAL" does not).
function overlapScore(a: string[], b: string[]): number {
  const B = new Set(b); const shared = a.filter((t) => B.has(t)); const sh = shared.length;
  if (!sh || !shared.some((t) => !GENERIC.has(t))) return 0;
  const sm = Math.min(a.length, b.length), un = a.length + b.length - sh;
  return sh === sm ? 0.9 + sh * 0.01 : sh / un;
}
// device-class guard: a component naming an electrical/auxiliary device (sensor, solenoid,
// switch, relay, heater, motor, pump, actuator, valve, module) is a DIFFERENT part from the
// bare mechanical component of the same name. If one side names such a device and the other
// does not, they must not match ("Camshaft" vs "Camshaft Position Sensor").
const DEVICE = new Set(["sensor","solenoid","switch","relay","heater","motor","pump","actuator","valve","module"]);
const hasDevice = (t: string[]): boolean => t.some((x) => DEVICE.has(x));
const deviceMismatch = (a: string[], b: string[]): boolean => hasDevice(a) !== hasDevice(b);
// backstop: reject a confident pairing whose labor hours are wildly divergent (>=4x),
// which signals a different application/variant rather than the same job.
const hoursDivergent = (a: number | null, b: number | null): boolean => a != null && b != null && a > 0 && b > 0 && Math.max(a, b) / Math.min(a, b) >= 4;
const OP_LABEL: Record<string, string> = { replace: "Replace", "r&i": "R & I", overhaul: "Overhaul", refinish: "Refinish", inspect: "Inspect", adjust: "Adjust", bleed: "Bleed", align: "Align", test: "Test", service: "Service" };
const cmpLabel = (comp: string, oc: string) => titleCase(comp) + " \u2014 " + (OP_LABEL[oc] || titleCase(oc));

export function buildLaborComparison(labor: RVLaborOp[]): LaborCompareRow[] {
  type It = { tokens: string[]; oc: string; comp: string; hours: number | null };
  const mk = (o: RVLaborOp): It | null => { const { comp, op } = parseOp(o); const tokens = compTokens(comp); return tokens.length ? { tokens, oc: opCanon(op), comp, hours: o.hours } : null; };
  const by = (b: SourceKey): It[] => labor.filter((o) => srcBucket(o.source) === b).map(mk).filter((x): x is It => !!x);
  const ad = by("alldata"), pd = by("prodemand"), oem = by("oem");
  const usedAd = new Set<number>();
  const row = (operation: string, a: number | null, p: number | null, om: number | null): LaborCompareRow => {
    let status = "Needs Review", diff: number | null = null, diffPct: number | null = null;
    if (a != null && p != null) { diff = Math.round((a - p) * 100) / 100; diffPct = p ? Math.round(((a - p) / p) * 100) : null; status = Math.abs(a - p) <= 0.1 ? "Same" : a > p ? "Higher in ALLDATA" : "Higher in ProDemand"; }
    else if (a != null) status = "Missing ProDemand";
    else if (p != null) status = "Missing ALLDATA";
    return { operation, alldata: a, prodemand: p, oem: om, diff, diffPct, status };
  };
  const rows: LaborCompareRow[] = [];
  for (const p of pd) {
    let best = -1, bestS = 0.5;
    for (let i = 0; i < ad.length; i++) { if (usedAd.has(i) || ad[i].oc !== p.oc) continue; if (deviceMismatch(p.tokens, ad[i].tokens) || hoursDivergent(ad[i].hours, p.hours)) continue; const sc = overlapScore(p.tokens, ad[i].tokens); if (sc >= bestS) { bestS = sc; best = i; } }
    if (best >= 0) { usedAd.add(best); rows.push(row(cmpLabel(ad[best].comp, ad[best].oc), ad[best].hours, p.hours, null)); }
    else rows.push(row(cmpLabel(p.comp, p.oc), null, p.hours, null));
  }
  for (let i = 0; i < ad.length; i++) if (!usedAd.has(i)) rows.push(row(cmpLabel(ad[i].comp, ad[i].oc), ad[i].hours, null, null));
  for (const o of oem) rows.push(row(cmpLabel(o.comp, o.oc), null, null, o.hours));
  return rows.sort((x, y) => (srcCount(y) - srcCount(x)) || x.operation.localeCompare(y.operation));
}
function srcCount(r: { alldata: number | null; prodemand: number | null; oem: number | null }): number {
  return (r.alldata != null ? 1 : 0) + (r.prodemand != null ? 1 : 0) + (r.oem != null ? 1 : 0);
}
// which source buckets actually have data in this bundle
export function sourcesPresent(b: ResearchBundle): Set<SourceKey> {
  const set = new Set<SourceKey>();
  for (const o of b.labor) set.add(srcBucket(o.source));
  for (const p of b.parts) set.add(srcBucket(p.source));
  for (const pr of b.procedures) set.add(srcBucket(pr.source));
  for (const w of b.wiring) set.add(srcBucket((w as any).source));
  if (b.notes && b.notes.length) set.add("internal");
  return set;
}
