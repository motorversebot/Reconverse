/**
 * Repairverse — technician repair-research page (runs inside Reconverse).
 *
 * Clean lookup for procedures, labor times, specs, DTCs, TSBs, recalls, wiring,
 * diagnostics, component locations, fluids, maintenance, and shop notes.
 * Data comes from lib/repairverse (MC -> repairverse schema), with a labeled
 * seed fallback so the page renders before the MC endpoints are live.
 */
import { useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import RepairverseLanding from "@/components/dealer/RepairverseLanding";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import {
  Search, Wrench, Clock, Gauge, Droplets, Cable, Activity, FileText,
  AlertTriangle, MapPin, CalendarClock, StickyNote, type LucideIcon,
} from "lucide-react";
import {
  getResearchBundle, getProcedureDetail, searchBundle, isKnownQuery, saveShopNote,
  type FitmentLevel, type ResearchBundle,
} from "@/lib/repairverse";

type View = "home" | "results" | "procedure" | "labor" | "tsb" | "wiring" | "notes";

const THEMES = {
  light: { bg:"#f7f8f9", surface:"#ffffff", surface2:"#eef0f2", border:"#e6e8eb", border2:"#d6dade", fg:"#15181c", fg2:"#586070", fg3:"#9aa1ab", accent:"#5f9a0c", accentDeep:"#4c7d09", accentFg:"#ffffff", accentSoft:"rgba(95,154,12,0.10)", exact:"#16a34a", possible:"#d97706", generic:"#9aa1ab", warn:"#dc2626", warnBg:"rgba(220,38,38,0.05)", shadow:"0 1px 2px rgba(15,23,42,0.06)", shMd:"0 6px 20px -8px rgba(15,23,42,0.14)", ring:"0 0 0 3px rgba(95,154,12,0.18)" },
  dark:  { bg:"#0e1011", surface:"#16191a", surface2:"#1f2223", border:"#2a2e2f", border2:"#363b3c", fg:"#eef0ee", fg2:"#a0a39f", fg3:"#6c706b", accent:"#84cc16", accentDeep:"#9ae600", accentFg:"#0e1011", accentSoft:"rgba(132,204,22,0.14)", exact:"#34d399", possible:"#fbbf24", generic:"#7c8079", warn:"#f87171", warnBg:"rgba(248,113,113,0.10)", shadow:"0 1px 2px rgba(0,0,0,0.5)", shMd:"0 6px 22px -8px rgba(0,0,0,0.6)", ring:"0 0 0 3px rgba(132,204,22,0.22)" },
};

const STYLE = `
@keyframes rvFade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.rv-fade{animation:rvFade .35s ease both}
.rv-input{transition:border-color .16s,box-shadow .16s,background .16s}
.rv-input:focus{border-color:var(--rv-accent)!important;box-shadow:var(--rv-ring)}
.rv-tab{transition:.14s}
.rv-tab:hover{background:var(--rv-surface2);color:var(--rv-fg)!important}
.rv-sugg{transition:.14s}
.rv-sugg:hover{border-color:var(--rv-accent)!important;color:var(--rv-accent)!important;background:var(--rv-accentSoft)!important}
.rv-tile{transition:transform .16s,border-color .16s,box-shadow .16s}
.rv-tile:hover{transform:translateY(-2px);border-color:var(--rv-accent)!important;box-shadow:var(--rv-shmd)}
.rv-tile:hover .rv-tile-ic{background:var(--rv-accent)!important;color:var(--rv-accentFg)!important}
.rv-card{transition:transform .16s,border-color .16s,box-shadow .16s}
.rv-card:hover{border-color:var(--rv-border2)!important;box-shadow:var(--rv-shmd);transform:translateY(-1px)}
.rv-btnp{transition:.14s}
.rv-btnp:hover{filter:brightness(1.04);transform:translateY(-1px);box-shadow:var(--rv-shmd)}
.rv-btng{transition:.14s}
.rv-btng:hover{border-color:var(--rv-accent)!important;color:var(--rv-accent)!important}
.rv-chip{transition:.14s}
.rv-chip:hover{border-color:var(--rv-accent)!important}
`;

function css(str: string): React.CSSProperties {
  const out: Record<string, string> = {};
  str.split(";").forEach((decl) => {
    if (!decl.trim()) return;
    const i = decl.indexOf(":");
    if (i < 0) return;
    const k = decl.slice(0, i).trim();
    const v = decl.slice(i + 1).trim();
    out[k.startsWith("--") ? k : k.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = v;
  });
  return out as React.CSSProperties;
}

export default function RepairResearchPage() {
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  const t = dark ? THEMES.dark : THEMES.light;

  const [view, setView] = useState<View>("home");
  const [query, setQuery] = useState("front brake replacement");
  const [filter, setFilter] = useState<string>("all");
  const [fitment, setFitment] = useState<"all" | FitmentLevel>("all");
  const [activeProc, setActiveProc] = useState(0);
  const [activeProcId, setActiveProcId] = useState<number | null>(null);
  const noteForm = useRef<{ pattern: string; term: string; body: string }>({ pattern: "", term: "", body: "" });

  const [searchParams] = useSearchParams();
  const vehicleId = searchParams.get("vehicle_id");
  const { data: bundle } = useQuery({
    queryKey: ["repairverse", "research", vehicleId],
    queryFn: () => getResearchBundle(vehicleId ?? undefined),
    enabled: !!vehicleId,
  });
  const { data: procDetail, isLoading: procLoading } = useQuery({
    queryKey: ["repairverse", "procedure", activeProcId],
    queryFn: () => getProcedureDetail(activeProcId as number),
    enabled: view === "procedure" && activeProcId != null,
  });

  const b: ResearchBundle | undefined = bundle;
  const v = b?.vehicle;

  const conf = (level: FitmentLevel) => {
    const map: Record<FitmentLevel, [string, string]> = { exact: [t.exact, "Exact match"], possible: [t.possible, "Possible match"], generic: [t.generic, "Generic ref"] };
    const [c, txt] = map[level];
    return { txt, style: css(`display:inline-flex;align-items:center;font-size:10.5px;font-weight:600;letter-spacing:.3px;text-transform:uppercase;padding:3px 8px;border-radius:6px;color:${c};background:${c}1f;white-space:nowrap`) };
  };
  const chip = (active: boolean) => css(`padding:8px 15px;border-radius:9px;font-size:13px;font-weight:600;border:1px solid ${active ? t.accent : t.border};background:${active ? t.accentSoft : t.surface};color:${active ? t.accent : t.fg2}`);

  const known = isKnownQuery(query);
  const groups = useMemo(() => (b ? searchBundle(b, query, fitment) : []), [b, query, fitment]);
  const shownGroups = groups.filter((g) => filter === "all" || g.category === filter);
  const totalResults = groups.reduce((a, g) => a + g.items.length, 0);
  const cats = ["all", ...groups.map((g) => g.category)];

  const runSearch = (q: string) => { if (!q.trim()) return; setQuery(q); setFilter("all"); setView("results"); };
  const onKey = (e: React.KeyboardEvent) => { if (e.key === "Enter") runSearch(query); };

  if (!vehicleId) return <RepairverseLanding />;

  if (!b || !v) {
    return <div style={{ ...css("min-height:60vh;display:flex;align-items:center;justify-content:center;font-size:13px"), color: t.fg3, background: t.bg }}>Loading repair research…</div>;
  }

  const proc = b.procedures.find((p) => p.id === activeProcId) || b.procedures[activeProc] || b.procedures[0];
  const torque = b.specs.filter((s) => s.kind === "torque");
  const fluids = b.specs.filter((s) => s.kind === "fluid");
  const navTabs: [View, string][] = [["home", "Home"], ["labor", "Labor & Specs"], ["tsb", "TSB / Recall"], ["wiring", "Wiring"], ["notes", "Shop Notes"]];

  const specStrip = [
    { label: "VIN", value: v.vin || "—" },
    { label: "Engine", value: v.engine || "—" },
    { label: "Mileage", value: v.mileage ? `${v.mileage.toLocaleString()} mi` : "—" },
    { label: "RO", value: v.ro_number || "—" },
    { label: "Stock", value: v.stock || "—" },
  ];
  const tiles: [string, string, () => void, LucideIcon][] = [
    ["Procedures", String(b.procedures.length), () => runSearch("procedure"), Wrench],
    ["Labor Times", String(b.labor.length), () => setView("labor"), Clock],
    ["Torque Specs", String(torque.length), () => setView("labor"), Gauge],
    ["Fluids", String(fluids.length), () => setView("labor"), Droplets],
    ["Wiring", String(b.wiring.length), () => setView("wiring"), Cable],
    ["Diagnostics", String(b.dtcs.length), () => runSearch("P0101"), Activity],
    ["TSBs", String(b.tsbs.length), () => setView("tsb"), FileText],
    ["Recalls", String(b.recalls.length), () => setView("tsb"), AlertTriangle],
    ["Component Locations", String(b.components.length), () => runSearch("blower"), MapPin],
    ["Maintenance", String(b.maintenance.length), () => setView("labor"), CalendarClock],
    ["Shop Notes", String(b.notes.length), () => setView("notes"), StickyNote],
  ];

  const root: React.CSSProperties = {
    ...css("min-height:100%;font-family:'IBM Plex Sans',system-ui,sans-serif"),
    background: t.bg, color: t.fg,
    ["--rv-accent" as string]: t.accent,
    ["--rv-accentFg" as string]: t.accentFg,
    ["--rv-accentSoft" as string]: t.accentSoft,
    ["--rv-surface2" as string]: t.surface2,
    ["--rv-fg" as string]: t.fg,
    ["--rv-border2" as string]: t.border2,
    ["--rv-shmd" as string]: t.shMd,
    ["--rv-ring" as string]: t.ring,
  } as React.CSSProperties;

  return (
    <div style={root}>
      <style dangerouslySetInnerHTML={{ __html: STYLE }} />
      {/* sub-header: vehicle + search + tabs */}
      <div style={{ ...css("position:sticky;top:0;z-index:5;display:flex;align-items:center;gap:14px;flex-wrap:wrap;padding:12px 22px;border-bottom:1px solid"), borderColor: t.border, background: t.surface }}>
        <button onClick={() => setView("home")} style={css("display:flex;align-items:center;gap:9px;background:none;border:none;cursor:pointer;padding:0")}>
          <span style={{ ...css("width:26px;height:26px;border-radius:8px;display:flex;align-items:center;justify-content:center"), background: `linear-gradient(150deg,${t.accent},${t.accentDeep})`, boxShadow: t.shadow, color: "#fff" }}>
            <Wrench size={15} strokeWidth={2.2} />
          </span>
          <span style={{ ...css("font-weight:700;font-size:14.5px;letter-spacing:-.3px"), color: t.fg }}>Repairverse</span>
        </button>
        <div style={{ ...css("padding:5px 11px;border-radius:9px;display:flex;gap:9px;align-items:center;border:1px solid"), background: t.surface2, borderColor: t.border }}>
          <span style={{ ...css("font-size:12px;font-weight:600"), color: t.fg }}>{v.short}</span>
          <span style={{ ...css("font-family:'IBM Plex Mono',monospace;font-size:11px"), color: t.fg2 }}>{v.engine}</span>
          {v.ro_number && <span style={{ ...css("font-family:'IBM Plex Mono',monospace;font-size:11px"), color: t.fg3 }}>{v.ro_number}</span>}
        </div>
        <div style={css("position:relative;flex:1;min-width:200px;max-width:440px")}>
          <Search size={15} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: t.fg3, pointerEvents: "none" }} />
          <input className="rv-input" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={onKey} placeholder="Search this vehicle…"
            style={{ ...css("width:100%;height:38px;padding:0 14px 0 36px;border-radius:10px;border:1px solid;font-size:13.5px;outline:none"), borderColor: t.border, background: t.bg, color: t.fg }} />
        </div>
        <nav style={css("display:flex;gap:2px;flex-wrap:wrap")}>
          {navTabs.map(([key, label]) => {
            const active = view === key || (key === "home" && view === "results");
            return <button key={key} className="rv-tab" onClick={() => setView(key)} style={{ ...css("height:34px;padding:0 13px;border-radius:9px;font-size:12.5px;font-weight:600;border:none;cursor:pointer"), color: active ? t.accent : t.fg2, background: active ? t.accentSoft : "transparent" }}>{label}</button>;
          })}
        </nav>
        {!b.available && (
          <span style={{ ...css("font-family:'IBM Plex Mono',monospace;font-size:10px;padding:3px 8px;border-radius:6px"), color: t.possible, background: `${t.possible}1f` }} title="MC endpoints not live yet — showing labeled seed data">SEED DATA</span>
        )}
      </div>

      {/* ===== HOME ===== */}
      {view === "home" && (
        <div className="rv-fade" style={css("max-width:1060px;margin:0 auto;padding:30px 22px 70px")}>
          <h1 style={{ ...css("font-size:30px;letter-spacing:-.9px;font-weight:700;margin:0"), color: t.fg }}>{v.short}</h1>
          <div style={{ ...css("display:flex;flex-wrap:wrap;margin-top:16px;border-radius:11px;overflow:hidden;border:1px solid"), borderColor: t.border, background: t.surface, boxShadow: t.shadow }}>
            {specStrip.map((s, i) => (
              <div key={i} style={{ ...css("padding:11px 18px;min-width:120px;border-right:1px solid"), borderColor: i === specStrip.length - 1 ? "transparent" : t.border }}>
                <span style={{ ...css("display:block;font-size:10px;font-weight:600;letter-spacing:.8px;text-transform:uppercase"), color: t.fg3 }}>{s.label}</span>
                <span style={{ ...css("display:block;font-family:'IBM Plex Mono',monospace;font-size:13.5px;margin-top:3px"), color: t.fg }}>{s.value}</span>
              </div>
            ))}
          </div>

          <div style={css("position:relative;margin:26px 0 12px")}>
            <Search size={20} style={{ position: "absolute", left: 20, top: "50%", transform: "translateY(-50%)", color: t.fg3, pointerEvents: "none" }} />
            <input className="rv-input" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={onKey}
              placeholder="Search procedures, DTCs, specs, parts — e.g. front brake replacement, P0101, oil capacity"
              style={{ ...css("width:100%;height:60px;padding:0 22px 0 52px;border-radius:16px;border:1.5px solid;font-size:16px;outline:none"), borderColor: t.border, background: t.surface, color: t.fg, boxShadow: t.shMd }} />
          </div>
          <div style={css("display:flex;flex-wrap:wrap;gap:7px;margin-bottom:36px")}>
            <span style={{ ...css("font-size:12px;align-self:center;margin-right:2px"), color: t.fg3 }}>Try:</span>
            {["front brake replacement", "P0101", "oil capacity", "water pump", "blower motor", "ADAS calibration"].map((s) => (
              <button key={s} className="rv-sugg" onClick={() => runSearch(s)} style={{ ...css("padding:6px 13px;border-radius:20px;border:1px solid;font-size:12.5px;cursor:pointer"), borderColor: t.border, background: t.surface, color: t.fg2 }}>{s}</button>
            ))}
          </div>

          <span style={{ ...css("font-size:11px;font-weight:600;letter-spacing:.9px;text-transform:uppercase"), color: t.fg3 }}>Quick lookups</span>
          <div style={css("display:grid;grid-template-columns:repeat(auto-fill,minmax(176px,1fr));gap:11px;margin-top:14px")}>
            {tiles.map(([label, count, go, Icon], i) => {
              const empty = count === "0";
              return (
                <button key={i} className="rv-tile" onClick={go} style={{ ...css("display:flex;flex-direction:column;gap:14px;text-align:left;padding:16px;height:118px;border-radius:14px;border:1px solid;cursor:pointer"), borderColor: t.border, background: t.surface, boxShadow: t.shadow, opacity: empty ? 0.55 : 1 }}>
                  <span className="rv-tile-ic" style={{ ...css("width:34px;height:34px;border-radius:10px;display:flex;align-items:center;justify-content:center"), background: empty ? t.surface2 : t.accentSoft, color: empty ? t.fg3 : t.accent }}>
                    <Icon size={18} strokeWidth={2} />
                  </span>
                  <span style={css("display:flex;align-items:baseline;justify-content:space-between;margin-top:auto")}>
                    <span style={{ ...css("font-size:14px;font-weight:600"), color: t.fg }}>{label}</span>
                    <span style={{ ...css("font-family:'IBM Plex Mono',monospace;font-size:12px"), color: t.fg3 }}>{count}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ===== RESULTS ===== */}
      {view === "results" && (
        <div className="rv-fade" style={css("max-width:940px;margin:0 auto;padding:26px 22px 70px")}>
          <h1 style={{ ...css("font-size:22px;letter-spacing:-.5px;font-weight:700;margin:0"), color: t.fg }}>Results for "{query}"</h1>
          <p style={{ ...css("font-size:13px;margin:4px 0 20px"), color: t.fg2 }}>{known ? `${totalResults} results · ${v.short}` : ""}</p>

          {!known || totalResults === 0 ? (
            <div style={{ ...css("text-align:center;padding:56px 20px;border:1px dashed;border-radius:16px"), borderColor: t.border, background: t.surface }}>
              <h2 style={{ ...css("font-size:18px;font-weight:600;margin:0 0 6px"), color: t.fg }}>No results on this vehicle</h2>
              <p style={{ ...css("font-size:13.5px;max-width:380px;margin:0 auto 18px"), color: t.fg2 }}>Nothing matched "{query}" for the {v.short}. Try a broader term.</p>
              <button className="rv-btnp" onClick={() => setView("home")} style={{ ...css("height:38px;padding:0 16px;border-radius:9px;border:none;font-weight:600;font-size:13px;cursor:pointer"), background: t.accent, color: t.accentFg }}>Back to vehicle</button>
            </div>
          ) : (
            <>
              <div style={css("display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;margin-bottom:20px")}>
                <div style={css("display:flex;gap:7px;flex-wrap:wrap")}>
                  {cats.map((c) => (
                    <button key={c} className="rv-chip" onClick={() => setFilter(c)} style={{ ...chip(filter === c), padding: "6px 13px", fontSize: "12px", cursor: "pointer" }}>{c === "all" ? "All" : c}</button>
                  ))}
                </div>
                <div style={css("display:flex;align-items:center;gap:9px")}>
                  <span style={{ ...css("font-size:11px;font-weight:600;letter-spacing:.6px;text-transform:uppercase"), color: t.fg3 }}>Fitment</span>
                  <div style={{ ...css("display:flex;border-radius:9px;padding:3px"), background: t.surface2 }}>
                    {(["all", "exact", "possible", "generic"] as const).map((k) => (
                      <button key={k} onClick={() => setFitment(k)} style={{ ...css("padding:5px 12px;border-radius:6px;font-size:12px;font-weight:600;border:none;cursor:pointer"), background: fitment === k ? t.surface : "transparent", color: fitment === k ? t.fg : t.fg2, boxShadow: fitment === k ? t.shadow : "none" }}>{k === "all" ? "All" : k[0].toUpperCase() + k.slice(1)}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div style={css("display:flex;flex-direction:column;gap:28px")}>
                {shownGroups.map((g, gi) => (
                  <section key={gi}>
                    <div style={css("display:flex;align-items:center;gap:10px;margin-bottom:13px")}>
                      <h2 style={{ ...css("font-size:12.5px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;margin:0"), color: t.fg }}>{g.category}</h2>
                      <span style={{ ...css("font-family:'IBM Plex Mono',monospace;font-size:11px"), color: t.fg3 }}>{g.items.length}</span>
                      <span style={{ ...css("flex:1;height:1px"), background: t.border }} />
                    </div>
                    <div style={css("display:flex;flex-direction:column;gap:9px")}>
                      {g.items.map((r, ri) => {
                        const c = conf(r.fitment);
                        return (
                          <div key={ri} className="rv-card" style={{ ...css("padding:16px 18px;border-radius:14px;border:1px solid"), borderColor: t.border, background: t.surface, boxShadow: t.shadow }}>
                            <div style={css("display:flex;align-items:flex-start;justify-content:space-between;gap:14px")}>
                              <div style={css("flex:1;min-width:0")}>
                                <div style={css("display:flex;align-items:center;gap:9px;margin-bottom:5px;flex-wrap:wrap")}>
                                  <span style={{ ...css("font-size:15px;font-weight:600"), color: t.fg }}>{r.title}</span>
                                  <span style={c.style}>{c.txt}</span>
                                </div>
                                <p style={{ ...css("font-size:13px;line-height:1.5;margin:0 0 9px"), color: t.fg2 }}>{r.summary}</p>
                                <div style={css("display:flex;gap:14px;flex-wrap:wrap")}>
                                  <span style={{ ...css("font-family:'IBM Plex Mono',monospace;font-size:11px"), color: t.fg3 }}>{r.source}</span>
                                  <span style={{ ...css("font-family:'IBM Plex Mono',monospace;font-size:11px"), color: t.fg3 }}>{r.meta}</span>
                                </div>
                              </div>
                              <div style={css("display:flex;flex-direction:column;gap:6px;flex:none")}>
                                <button className="rv-btnp" onClick={() => { if (r.procId != null) setActiveProcId(r.procId); setView(r.target as View); }} style={{ ...css("height:33px;padding:0 16px;border-radius:9px;border:none;font-weight:600;font-size:12.5px;cursor:pointer"), background: t.accent, color: t.accentFg, boxShadow: t.shadow }}>Open</button>
                                <button className="rv-btng" onClick={() => toast.success(`Saved to ${v.ro_number || "RO"}`)} style={{ ...css("height:33px;padding:0 12px;border-radius:9px;border:1px solid;font-weight:600;font-size:12px;cursor:pointer"), borderColor: t.border, background: t.surface, color: t.fg2 }}>Save to RO</button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ===== PROCEDURE ===== */}
      {view === "procedure" && proc && (
        <div className="rv-fade" style={css("max-width:900px;margin:0 auto;padding:26px 22px 70px")}>
          <button className="rv-btng" onClick={() => setView("results")} style={{ ...css("height:30px;padding:0 13px;border-radius:8px;border:1px solid;font-size:12px;font-weight:600;cursor:pointer;margin-bottom:14px"), borderColor: t.border, background: t.surface, color: t.fg2 }}>← Back to results</button>
          <div><span style={{ ...css("display:inline-flex;font-size:10.5px;font-weight:600;letter-spacing:.3px;text-transform:uppercase;padding:3px 9px;border-radius:6px"), color: t.exact, background: `${t.exact}1f` }}>Exact vehicle match</span></div>
          <h1 style={{ ...css("font-size:26px;letter-spacing:-.6px;font-weight:700;margin:11px 0 5px"), color: t.fg }}>{proc.title}</h1>
          <p style={{ ...css("font-size:13px;margin:0 0 4px"), color: t.fg2 }}>{v.full} · {proc.source || "OEM"} {proc.source_ref ? `· ${proc.source_ref}` : ""}</p>
          {proc.system ? <p style={{ ...css("font-size:11.5px;font-family:'IBM Plex Mono',monospace;margin:0 0 20px;line-height:1.5"), color: t.fg3 }}>{proc.system.replace(/\s*>\s*/g, " › ")}</p> : <div style={{ marginBottom: 16 }} />}

          <div style={css("display:flex;gap:11px;flex-wrap:wrap;margin:20px 0 22px")}>
            {[["Labor time", proc.labor_hours != null ? `${proc.labor_hours} hr` : "—"], ["Difficulty", proc.difficulty || "—"], ["Fitment", "Exact"]].map(([l, val], i) => (
              <div key={i} style={{ ...css("flex:1;min-width:140px;padding:14px 16px;border-radius:11px;border:1px solid"), background: t.surface, borderColor: t.border, boxShadow: t.shadow }}>
                <span style={{ ...css("display:block;font-size:10px;font-weight:600;letter-spacing:.8px;text-transform:uppercase"), color: t.fg3 }}>{l}</span>
                <span style={{ ...css("display:block;font-family:'IBM Plex Mono',monospace;font-size:20px;font-weight:600;margin-top:5px"), color: t.fg }}>{val}</span>
              </div>
            ))}
          </div>

          <div style={css("display:flex;gap:8px;flex-wrap:wrap;margin-bottom:24px")}>
            <button className="rv-btnp" onClick={() => toast.success(`Saved to ${v.ro_number || "RO"}`)} style={{ ...css("height:36px;padding:0 16px;border-radius:9px;border:none;font-weight:600;font-size:13px;cursor:pointer"), background: t.accent, color: t.accentFg, boxShadow: t.shadow }}>Save to RO</button>
            <button className="rv-btng" onClick={() => toast.success("Saved to Reconverse estimate")} style={{ ...css("height:36px;padding:0 16px;border-radius:9px;font-weight:600;font-size:13px;cursor:pointer;border:1px solid"), borderColor: t.accent, background: t.accentSoft, color: t.accent }}>Save to estimate</button>
            <button className="rv-btng" onClick={() => { navigator.clipboard?.writeText((procDetail?.steps ?? []).map((s) => `${s.step_no}. ${s.title}: ${s.body}`).join("\n")); toast.success("Procedure steps copied"); }} style={{ ...css("height:36px;padding:0 16px;border-radius:9px;font-weight:600;font-size:13px;cursor:pointer;border:1px solid"), borderColor: t.border, background: t.surface, color: t.fg }}>Copy steps</button>
          </div>

          {(procLoading || (procDetail?.warnings?.length ?? 0) > 0) ? (
            <div style={{ ...css("border:1px solid;border-radius:11px;padding:15px 17px;margin-bottom:24px"), borderColor: t.warn, background: t.warnBg }}>
              <span style={{ ...css("display:flex;align-items:center;gap:7px;font-size:11.5px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;margin-bottom:9px"), color: t.warn }}><AlertTriangle size={14} strokeWidth={2.2} /> Warnings / cautions</span>
              {procLoading ? (
                <span style={{ ...css("font-size:13px"), color: t.fg2 }}>Loading…</span>
              ) : (procDetail?.warnings ?? []).map((w, i) => (
                <div key={i} style={{ ...css("display:flex;gap:9px;font-size:13px;line-height:1.5;margin-bottom:5px"), color: t.fg }}>
                  <span style={{ ...css("font-weight:700"), color: t.warn }}>!</span><span>{w.body}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ ...css("border:1px solid;border-radius:11px;padding:12px 16px;margin-bottom:24px"), borderColor: t.border, background: t.surface }}>
              <span style={{ ...css("font-size:11.5px;font-weight:700;letter-spacing:.5px;text-transform:uppercase"), color: t.fg3 }}>Warnings / cautions</span>
              <span style={{ ...css("display:block;font-size:13px;margin-top:6px"), color: t.fg3 }}>No warnings or cautions recorded for this procedure.</span>
            </div>
          )}

          <div style={css("display:grid;grid-template-columns:1.5fr 1fr;gap:26px;align-items:start")}>
            <div>
              <h2 style={{ ...css("font-size:11.5px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;margin:0 0 14px"), color: t.fg }}>Procedure</h2>
              {procLoading ? (
                <div style={{ ...css("font-size:13px;padding:13px 0"), color: t.fg3 }}>Loading procedure steps…</div>
              ) : (procDetail?.steps?.length ?? 0) === 0 ? (
                <div style={{ ...css("font-size:13px;padding:13px 0"), color: t.fg3 }}>No step-by-step detail available for this procedure.</div>
              ) : (procDetail!.steps.map((s, i) => (
                <div key={i} style={{ ...css("display:flex;gap:14px;padding:14px 0;border-bottom:1px solid"), borderColor: t.border }}>
                  <span style={{ ...css("flex:none;width:28px;height:28px;border-radius:8px;font-family:'IBM Plex Mono',monospace;font-size:13px;font-weight:600;display:flex;align-items:center;justify-content:center"), background: t.accentSoft, color: t.accent }}>{s.step_no}</span>
                  <div>
                    <span style={{ ...css("display:block;font-size:14px;font-weight:600;margin-bottom:3px"), color: t.fg }}>{s.title}</span>
                    <span style={{ ...css("display:block;font-size:13px;line-height:1.55"), color: t.fg2 }}>{s.body}</span>
                  </div>
                </div>
              )))}
            </div>
            <div style={css("display:flex;flex-direction:column;gap:18px")}>
              <div style={{ ...css("border:1px solid;border-radius:11px;padding:15px 16px"), borderColor: t.border, background: t.surface, boxShadow: t.shadow }}>
                <span style={{ ...css("display:block;font-size:11.5px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;margin-bottom:11px"), color: t.fg }}>Torque specs</span>
                {torque.map((tq, i) => (
                  <div key={i} style={{ ...css("display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid"), borderColor: t.border }}>
                    <span style={{ ...css("font-size:12.5px"), color: t.fg2 }}>{tq.name}</span>
                    <span style={{ ...css("font-family:'IBM Plex Mono',monospace;font-size:12.5px;font-weight:600;white-space:nowrap"), color: t.fg }}>{tq.value}</span>
                  </div>
                ))}
              </div>
              <div style={{ ...css("border:1px solid;border-radius:11px;padding:15px 16px"), borderColor: t.border, background: t.surface, boxShadow: t.shadow }}>
                <span style={{ ...css("display:block;font-size:11.5px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;margin-bottom:11px"), color: t.fg }}>Parts needed</span>
                {procLoading ? (
                  <span style={{ ...css("font-size:12.5px"), color: t.fg3 }}>Loading…</span>
                ) : (procDetail?.parts?.length ?? 0) === 0 ? (
                  <span style={{ ...css("font-size:12.5px"), color: t.fg3 }}>No parts listed for this procedure.</span>
                ) : (procDetail!.parts.map((p, i) => (
                  <div key={i} style={css("display:flex;gap:8px;align-items:baseline;padding:6px 0")}>
                    <span style={{ ...css("width:5px;height:5px;border-radius:50%;flex:none"), background: t.accent }} />
                    <span style={{ ...css("font-size:12.5px"), color: t.fg2 }}>{p.description} {p.part_number ? `— ${p.part_number}` : ""}{p.qty && p.qty !== "1" ? ` (×${p.qty})` : ""}</span>
                  </div>
                )))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== LABOR & SPECS ===== */}
      {view === "labor" && (
        <div className="rv-fade" style={css("max-width:900px;margin:0 auto;padding:26px 22px 70px")}>
          <h1 style={{ ...css("font-size:24px;letter-spacing:-.5px;font-weight:700;margin:0 0 4px"), color: t.fg }}>Labor &amp; Specs</h1>
          <p style={{ ...css("font-size:13px;margin:0 0 24px"), color: t.fg2 }}>{v.full}</p>
          <h2 style={{ ...css("font-size:11.5px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;margin:0 0 12px"), color: t.fg }}>Labor operations</h2>
          <div style={{ ...css("border:1px solid;border-radius:13px;overflow:hidden;margin-bottom:28px"), borderColor: t.border, boxShadow: t.shadow }}>
            <div style={{ ...css("display:grid;grid-template-columns:1fr 90px 1.1fr;gap:12px;padding:11px 16px"), background: t.surface2 }}>
              {["Operation", "Hours", "Notes"].map((h, i) => <span key={i} style={{ ...css("font-size:10px;font-weight:700;letter-spacing:.8px;text-transform:uppercase"), color: t.fg3, textAlign: i === 1 ? "right" : "left" }}>{h}</span>)}
            </div>
            {b.labor.map((o, i) => (
              <div key={i} style={{ ...css("display:grid;grid-template-columns:1fr 90px 1.1fr;gap:12px;padding:13px 16px;border-top:1px solid;align-items:center"), borderColor: t.border, background: t.surface }}>
                <span style={{ ...css("font-size:13.5px;font-weight:500"), color: t.fg }}>{o.operation}</span>
                <span style={{ ...css("font-family:'IBM Plex Mono',monospace;font-size:14px;font-weight:600"), color: t.accent, textAlign: "right" }}>{o.hours}</span>
                <span style={{ ...css("font-size:12.5px"), color: t.fg2 }}>{o.note}</span>
              </div>
            ))}
          </div>
          <div style={css("display:grid;grid-template-columns:1fr 1fr;gap:22px;align-items:start")}>
            {[["Torque specs", torque], ["Fluid capacities", fluids]].map(([title, list], gi) => (
              <div key={gi}>
                <h2 style={{ ...css("font-size:11.5px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;margin:0 0 12px"), color: t.fg }}>{title as string}</h2>
                <div style={{ ...css("border:1px solid;border-radius:13px;padding:6px 16px"), borderColor: t.border, background: t.surface, boxShadow: t.shadow }}>
                  {(list as typeof torque).map((s, i) => (
                    <div key={i} style={{ ...css("display:flex;justify-content:space-between;gap:10px;padding:11px 0;border-bottom:1px solid"), borderColor: t.border }}>
                      <span style={{ ...css("font-size:13px"), color: t.fg }}>{s.name}</span>
                      <span style={{ ...css("font-family:'IBM Plex Mono',monospace;font-size:13px;font-weight:600;white-space:nowrap"), color: t.fg }}>{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {b.maintenance.length > 0 && (
            <>
              <h2 style={{ ...css("font-size:11.5px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;margin:26px 0 12px"), color: t.fg }}>Maintenance</h2>
              <div style={{ ...css("border:1px solid;border-radius:13px;padding:6px 16px"), borderColor: t.border, background: t.surface, boxShadow: t.shadow }}>
                {b.maintenance.map((m, i) => (
                  <div key={i} style={{ ...css("display:flex;justify-content:space-between;gap:10px;padding:11px 0;border-bottom:1px solid"), borderColor: t.border }}>
                    <span style={{ ...css("font-size:13px"), color: t.fg }}>{m.service}</span>
                    <span style={{ ...css("font-family:'IBM Plex Mono',monospace;font-size:12.5px"), color: t.fg2 }}>{[m.interval_miles ? `${m.interval_miles.toLocaleString()} mi` : "", m.interval_months ? `${m.interval_months} mo` : ""].filter(Boolean).join(" · ")}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ===== TSB / RECALL ===== */}
      {view === "tsb" && (
        <div className="rv-fade" style={css("max-width:840px;margin:0 auto;padding:26px 22px 70px")}>
          <h1 style={{ ...css("font-size:24px;letter-spacing:-.5px;font-weight:700;margin:0 0 4px"), color: t.fg }}>TSBs &amp; Recalls</h1>
          <p style={{ ...css("font-size:13px;margin:0 0 24px"), color: t.fg2 }}>{v.full}</p>
          <h2 style={{ ...css("font-size:11.5px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;margin:0 0 12px"), color: t.fg }}>Open recalls</h2>
          <div style={css("display:flex;flex-direction:column;gap:9px;margin-bottom:28px")}>
            {b.recalls.map((r, i) => {
              const open = (r.status || "").toLowerCase() === "open";
              return (
                <div key={i} className="rv-card" style={{ ...css("display:flex;align-items:center;gap:14px;padding:15px 17px;border-radius:12px;border:1px solid"), borderColor: t.border, background: t.surface, boxShadow: t.shadow }}>
                  <span style={{ ...css("font-size:10.5px;font-weight:700;letter-spacing:.3px;text-transform:uppercase;padding:4px 9px;border-radius:6px;white-space:nowrap"), color: open ? t.warn : t.generic, background: `${open ? t.warn : t.generic}1f` }}>{r.status}</span>
                  <div style={css("flex:1")}>
                    <span style={{ ...css("display:block;font-size:14px;font-weight:600"), color: t.fg }}>{r.title}</span>
                    <span style={{ ...css("display:block;font-size:12.5px;margin-top:2px"), color: t.fg2 }}>{r.summary}</span>
                  </div>
                  <span style={{ ...css("font-family:'IBM Plex Mono',monospace;font-size:11.5px"), color: t.fg3 }}>{r.recall_id}</span>
                </div>
              );
            })}
          </div>
          <h2 style={{ ...css("font-size:11.5px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;margin:0 0 12px"), color: t.fg }}>Technical service bulletins</h2>
          <div style={css("display:flex;flex-direction:column;gap:9px")}>
            {b.tsbs.map((tb, i) => {
              const c = conf(tb.fitment_level);
              return (
                <div key={i} className="rv-card" style={{ ...css("padding:15px 17px;border-radius:12px;border:1px solid"), borderColor: t.border, background: t.surface, boxShadow: t.shadow }}>
                  <div style={css("display:flex;align-items:center;gap:9px;margin-bottom:5px;flex-wrap:wrap")}>
                    <span style={{ ...css("font-size:14px;font-weight:600"), color: t.fg }}>{tb.title}</span>
                    <span style={c.style}>{c.txt}</span>
                  </div>
                  <p style={{ ...css("font-size:13px;line-height:1.5;margin:0 0 8px"), color: t.fg2 }}>{tb.summary}</p>
                  <div style={css("display:flex;gap:14px;flex-wrap:wrap")}>
                    <span style={{ ...css("font-family:'IBM Plex Mono',monospace;font-size:11px"), color: t.fg3 }}>{tb.tsb_number}</span>
                    <span style={{ ...css("font-family:'IBM Plex Mono',monospace;font-size:11px"), color: t.fg3 }}>Issued {tb.issued_date}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===== WIRING ===== */}
      {view === "wiring" && (
        <div className="rv-fade" style={css("max-width:940px;margin:0 auto;padding:26px 22px 70px")}>
          <h1 style={{ ...css("font-size:24px;letter-spacing:-.5px;font-weight:700;margin:0 0 4px"), color: t.fg }}>Wiring &amp; Diagrams</h1>
          <p style={{ ...css("font-size:13px;margin:0 0 20px"), color: t.fg2 }}>{v.full}</p>
          {b.wiring.map((w, wi) => (
            <div key={wi} style={css("display:grid;grid-template-columns:1.4fr .8fr;gap:20px;align-items:start;margin-bottom:20px")}>
              <div style={{ ...css("border:1px solid;border-radius:14px;overflow:hidden"), borderColor: t.border, background: t.surface, boxShadow: t.shadow }}>
                <div style={{ ...css("display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid"), borderColor: t.border }}>
                  <span style={{ ...css("font-size:13px;font-weight:600"), color: t.fg }}>{w.description}</span>
                  <span style={{ ...css("font-family:'IBM Plex Mono',monospace;font-size:11px"), color: t.fg3 }}>{w.drawing_ref}</span>
                </div>
                <div style={{ ...css("height:300px;display:flex;align-items:center;justify-content:center"), background: `repeating-linear-gradient(45deg,${t.surface2},${t.surface2} 11px,${t.bg} 11px,${t.bg} 22px)` }}>
                  <span style={{ ...css("font-family:'IBM Plex Mono',monospace;font-size:12px;padding:8px 14px;border-radius:8px;border:1px solid"), color: t.fg3, background: t.surface, borderColor: t.border }}>[ {w.circuit} — schematic ]</span>
                </div>
              </div>
              <div style={{ ...css("border:1px solid;border-radius:14px;padding:16px"), borderColor: t.border, background: t.surface, boxShadow: t.shadow }}>
                <span style={{ ...css("display:block;font-size:11.5px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;margin-bottom:12px"), color: t.fg }}>Circuit legend</span>
                {w.circuits.map((c, i) => (
                  <div key={i} style={{ ...css("display:flex;align-items:center;gap:11px;padding:9px 0;border-bottom:1px solid"), borderColor: t.border }}>
                    <span style={{ ...css("width:22px;height:5px;border-radius:3px;flex:none"), background: c.color || t.fg3 }} />
                    <div style={css("flex:1")}>
                      <span style={{ ...css("display:block;font-size:12.5px;font-weight:500"), color: t.fg }}>{c.name}</span>
                      <span style={{ ...css("display:block;font-family:'IBM Plex Mono',monospace;font-size:11px"), color: t.fg3 }}>{c.wire}</span>
                    </div>
                    <span style={{ ...css("font-family:'IBM Plex Mono',monospace;font-size:11.5px"), color: t.fg2 }}>{c.pin}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ===== SHOP NOTES ===== */}
      {view === "notes" && (
        <div className="rv-fade" style={css("max-width:860px;margin:0 auto;padding:26px 22px 70px")}>
          <h1 style={{ ...css("font-size:24px;letter-spacing:-.5px;font-weight:700;margin:0 0 4px"), color: t.fg }}>Shop Notes</h1>
          <p style={{ ...css("font-size:13px;margin:0 0 24px"), color: t.fg2 }}>Internal knowledge tied to vehicle, repair type, DTC, or component. Surfaces in search when relevant.</p>
          <div style={css("display:grid;grid-template-columns:1.3fr 1fr;gap:22px;align-items:start")}>
            <div style={css("display:flex;flex-direction:column;gap:10px")}>
              {b.notes.map((n, i) => (
                <div key={i} className="rv-card" style={{ ...css("padding:15px 17px;border-radius:13px;border:1px solid"), borderColor: t.border, background: t.surface, boxShadow: t.shadow }}>
                  <div style={css("display:flex;gap:7px;flex-wrap:wrap;margin-bottom:9px")}>
                    <span style={{ ...css("font-family:'IBM Plex Mono',monospace;font-size:11px;padding:3px 8px;border-radius:6px"), background: t.surface2, color: t.fg2 }}>{n.vehicle_pattern}</span>
                    <span style={{ ...css("font-family:'IBM Plex Mono',monospace;font-size:11px;padding:3px 8px;border-radius:6px"), background: t.accentSoft, color: t.accent }}>{n.related_term}</span>
                  </div>
                  <p style={{ ...css("font-size:13.5px;line-height:1.55;margin:0 0 10px"), color: t.fg }}>{n.body}</p>
                  <div style={css("display:flex;align-items:center;gap:10px")}>
                    <span style={{ ...css("font-size:12px;font-weight:600"), color: t.fg2 }}>{n.author}</span>
                    <span style={{ ...css("font-size:12px"), color: t.fg3 }}>{n.created_at}</span>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ ...css("border:1px solid;border-radius:14px;padding:18px"), borderColor: t.border, background: t.surface, boxShadow: t.shadow }}>
              <span style={{ ...css("display:block;font-size:13px;font-weight:700;margin-bottom:14px"), color: t.fg }}>Add a shop note</span>
              <div style={css("display:flex;flex-direction:column;gap:11px")}>
                <input className="rv-input" placeholder="Vehicle pattern — e.g. Camry 18-24 2.5L" onChange={(e) => (noteForm.current.pattern = e.target.value)} style={{ ...css("height:40px;padding:0 13px;border-radius:9px;border:1px solid;font-size:13px;outline:none"), borderColor: t.border, background: t.bg, color: t.fg }} />
                <input className="rv-input" placeholder="Related search term — e.g. front brakes" onChange={(e) => (noteForm.current.term = e.target.value)} style={{ ...css("height:40px;padding:0 13px;border-radius:9px;border:1px solid;font-size:13px;outline:none"), borderColor: t.border, background: t.bg, color: t.fg }} />
                <textarea className="rv-input" placeholder="Note…" onChange={(e) => (noteForm.current.body = e.target.value)} style={{ ...css("min-height:96px;padding:11px 13px;border-radius:9px;border:1px solid;font-size:13px;outline:none;resize:vertical"), borderColor: t.border, background: t.bg, color: t.fg }} />
                <button className="rv-btnp" onClick={async () => {
                  const f = noteForm.current;
                  if (!f.body.trim()) { toast.error("Add a note body first"); return; }
                  const res = await saveShopNote({ vehicle_id: v.id, vehicle_pattern: f.pattern || v.short, related_term: f.term || query, body: f.body });
                  toast[res.ok ? "success" : "message"](res.ok ? "Shop note saved" : "Saved locally — MC endpoint not live yet");
                }} style={{ ...css("height:42px;border-radius:9px;border:none;font-weight:600;font-size:13.5px;cursor:pointer"), background: t.accent, color: t.accentFg }}>Save note</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
