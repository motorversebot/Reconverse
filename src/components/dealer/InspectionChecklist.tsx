import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2, XCircle, AlertTriangle, Circle,
  ChevronDown, MessageSquare, Loader2, Clock, User,
  Filter,
} from "lucide-react";
import TireWheelInspection from "./TireWheelInspection";

const INSPECTION_TEMPLATE: Record<string, string[]> = {
  Exterior: [
    "Body panels – dents/dings", "Paint condition", "Bumpers – front & rear",
    "Windshield", "Side/rear glass", "Mirrors", "Headlights & taillights",
    "Turn signals & markers", "Trim & moldings", "Wheels & wheel covers",
  ],
  Interior: [
    "Seats – condition & operation", "Carpet & floor mats", "Headliner",
    "Dashboard & gauges", "Center console & storage", "Door panels & handles",
    "Steering wheel", "Seat belts", "Rearview mirror", "Sun visors",
  ],
  Mechanical: [
    "Engine – starts & idles", "Transmission – shifts", "Brakes – pedal feel",
    "Suspension – ride quality", "Exhaust system", "Steering – play/noise",
    "Cooling system", "Battery & charging", "Belts & hoses", "Fluid levels & leaks",
  ],
  Electrical: [
    "Power windows", "Power locks", "A/C & heater", "Radio & speakers",
    "Backup camera", "Infotainment system", "Instrument cluster",
    "Horn", "Wipers & washers", "USB/Aux ports",
  ],
  "Tires & Wheels": [],
  "Under Vehicle": [
    "Frame/subframe condition", "Exhaust – leaks/damage", "CV boots/axles",
    "Brake lines", "Fuel lines", "Oil pan", "Transmission pan", "Shocks/struts",
  ],
};

type ItemStatus = "pending" | "pass" | "fail" | "repair_needed";
type FilterMode = "all" | "attention" | "fail" | "pending";

interface InspectionItem {
  id?: string;
  unit_id: string;
  dealer_id: string;
  category: string;
  item_name: string;
  status: ItemStatus;
  notes: string | null;
  inspected_by: string | null;
  updated_at?: string;
}

interface Props {
  unitId: string;
  dealerId: string;
  readOnly?: boolean;
}

type SectionSeverity = "pass" | "attention" | "fail" | "pending";

const STATUS_CONFIG: Record<ItemStatus, { icon: typeof Circle; color: string; label: string }> = {
  pending: { icon: Circle, color: "text-muted-foreground", label: "Pending" },
  pass: { icon: CheckCircle2, color: "text-emerald-500", label: "Pass" },
  fail: { icon: XCircle, color: "text-destructive", label: "Fail" },
  repair_needed: { icon: AlertTriangle, color: "text-amber-500", label: "Needs Repair" },
};

const SEVERITY_CONFIG: Record<SectionSeverity, { label: string; color: string; bg: string; strip: string }> = {
  pass: { label: "PASS", color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/30", strip: "bg-emerald-500" },
  attention: { label: "ATTENTION", color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/30", strip: "bg-amber-500" },
  fail: { label: "FAIL", color: "text-destructive", bg: "bg-destructive/10 border-destructive/30", strip: "bg-destructive" },
  pending: { label: "PENDING", color: "text-muted-foreground", bg: "bg-muted border-border", strip: "bg-muted-foreground" },
};

function computeSectionSeverity(items: InspectionItem[]): SectionSeverity {
  if (items.length === 0) return "pending";
  const hasNonPending = items.some(i => i.status !== "pending");
  if (!hasNonPending) return "pending";
  if (items.some(i => i.status === "fail")) return "fail";
  if (items.some(i => i.status === "repair_needed")) return "attention";
  const allDone = items.every(i => i.status !== "pending");
  if (allDone) return "pass";
  return "pending";
}

function matchesFilter(item: InspectionItem, filter: FilterMode): boolean {
  if (filter === "all") return true;
  if (filter === "fail") return item.status === "fail";
  if (filter === "attention") return item.status === "repair_needed";
  if (filter === "pending") return item.status === "pending";
  return true;
}

const FILTER_OPTIONS: { value: FilterMode; label: string }[] = [
  { value: "all", label: "Show All" },
  { value: "attention", label: "Attention Only" },
  { value: "fail", label: "Failures Only" },
  { value: "pending", label: "Pending Only" },
];

export default function InspectionChecklist({ unitId, dealerId, readOnly = false }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});
  const [noteValues, setNoteValues] = useState<Record<string, string>>({});
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const { data: savedItems, isLoading } = useQuery({
    queryKey: ["inspection-items", unitId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("unit_inspection_items" as any)
        .select("*")
        .eq("unit_id", unitId);
      if (error) throw error;
      return data as any[] as InspectionItem[];
    },
  });

  const categories = useMemo(() => {
    const savedMap = new Map<string, InspectionItem>();
    savedItems?.forEach((item) => {
      savedMap.set(`${item.category}::${item.item_name}`, item);
    });

    return Object.entries(INSPECTION_TEMPLATE)
      .filter(([, items]) => items.length > 0)
      .map(([category, items]) => ({
        category,
        items: items.map((itemName) => {
          const saved = savedMap.get(`${category}::${itemName}`);
          return {
            category,
            item_name: itemName,
            id: saved?.id,
            status: (saved?.status as ItemStatus) || "pending",
            notes: saved?.notes || null,
            inspected_by: saved?.inspected_by || null,
            updated_at: saved?.updated_at || null,
            unit_id: unitId,
            dealer_id: dealerId,
          } as InspectionItem;
        }),
      }));
  }, [savedItems, unitId, dealerId]);

  // Compute auto-expand: sections with fail/attention open, rest collapsed
  const resolvedExpanded = useMemo(() => {
    const result: Record<string, boolean> = {};
    categories.forEach(({ category, items }) => {
      if (category in expandedSections) {
        result[category] = expandedSections[category];
      } else {
        const severity = computeSectionSeverity(items);
        result[category] = severity === "fail" || severity === "attention";
      }
    });
    // Always auto-expand Tires & Wheels by default
    if (!("Tires & Wheels" in expandedSections)) {
      result["Tires & Wheels"] = true;
    } else {
      result["Tires & Wheels"] = expandedSections["Tires & Wheels"];
    }
    return result;
  }, [categories, expandedSections]);

  const toggleSection = useCallback((cat: string) => {
    setExpandedSections(prev => ({ ...prev, [cat]: !resolvedExpanded[cat] }));
  }, [resolvedExpanded]);

  // Stats across ALL checklist items (not tires)
  const allItems = categories.flatMap((c) => c.items);
  const total = allItems.length;
  const completed = allItems.filter((i) => i.status !== "pending").length;
  const passed = allItems.filter((i) => i.status === "pass").length;
  const failed = allItems.filter((i) => i.status === "fail").length;
  const repairs = allItems.filter((i) => i.status === "repair_needed").length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  const upsert = useMutation({
    mutationFn: async (item: { category: string; item_name: string; status: ItemStatus; notes?: string | null }) => {
      const _upsertRes = await apiFetch("/api/v1/reconverse/inspection-items/upsert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unit_id: unitId,
          dealer_id: dealerId,
          category: item.category,
          item_name: item.item_name,
          status: item.status,
          notes: item.notes ?? null,
        }),
      });
      const _upsertJ = await _upsertRes.json().catch(() => null);
      if (!_upsertRes.ok || !_upsertJ?.ok) throw new Error(_upsertJ?.error || "Failed to save");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inspection-items", unitId] });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const bulkUpsert = useMutation({
    mutationFn: async (items: { category: string; item_name: string; status: ItemStatus; notes?: string | null }[]) => {
      // auth handled by API
      const payloads = items.map(item => ({
        unit_id: unitId,
        dealer_id: dealerId,
        category: item.category,
        item_name: item.item_name,
        status: item.status,
        notes: item.notes ?? null,
        inspected_by: user?.id ?? null,
      }));
      const _bulkRes = await apiFetch("/api/v1/reconverse/inspection-items/upsert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: payloads }),
      });
      const _bulkJ = await _bulkRes.json().catch(() => null);
      if (!_bulkRes.ok || !_bulkJ?.ok) throw new Error(_bulkJ?.error || "Failed to save");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inspection-items", unitId] });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const cycleStatus = (item: InspectionItem) => {
    const order: ItemStatus[] = ["pending", "pass", "fail", "repair_needed"];
    const next = order[(order.indexOf(item.status) + 1) % order.length];
    upsert.mutate({ category: item.category, item_name: item.item_name, status: next, notes: item.notes });
  };

  const setStatus = (item: InspectionItem, status: ItemStatus) => {
    upsert.mutate({ category: item.category, item_name: item.item_name, status, notes: item.notes });
  };

  const saveNote = (item: InspectionItem, note: string) => {
    upsert.mutate({
      category: item.category,
      item_name: item.item_name,
      status: item.status === "pending" ? "pending" : item.status,
      notes: note || null,
    });
  };

  const toggleNote = (key: string, currentNotes: string | null) => {
    setExpandedNotes((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      if (!prev[key] && !(key in noteValues)) {
        setNoteValues((nv) => ({ ...nv, [key]: currentNotes || "" }));
      }
      return next;
    });
  };

  const markSectionOk = (categoryItems: InspectionItem[]) => {
    bulkUpsert.mutate(categoryItems.map(i => ({
      category: i.category,
      item_name: i.item_name,
      status: "pass" as ItemStatus,
      notes: i.notes,
    })));
  };

  const markSectionPending = (categoryItems: InspectionItem[]) => {
    bulkUpsert.mutate(categoryItems.map(i => ({
      category: i.category,
      item_name: i.item_name,
      status: "pending" as ItemStatus,
      notes: i.notes,
    })));
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

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-3">
        {/* Progress + filters */}
        <Card className="glass-panel border-border">
          <CardContent className="py-3 px-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">Inspection Progress</span>
              <span className="text-xs font-mono text-muted-foreground">
                {completed}/{total} items · {progress}%
              </span>
            </div>
            <Progress value={progress} className="h-1.5" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-[11px]">
                <span className="flex items-center gap-1 text-emerald-500">
                  <CheckCircle2 className="h-3 w-3" /> {passed}
                </span>
                <span className="flex items-center gap-1 text-destructive">
                  <XCircle className="h-3 w-3" /> {failed}
                </span>
                <span className="flex items-center gap-1 text-amber-500">
                  <AlertTriangle className="h-3 w-3" /> {repairs}
                </span>
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Circle className="h-3 w-3" /> {total - completed}
                </span>
              </div>
              {/* Filters */}
              <div className="flex items-center gap-1">
                <Filter className="h-3 w-3 text-muted-foreground mr-0.5" />
                {FILTER_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setFilterMode(opt.value)}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all border ${
                      filterMode === opt.value
                        ? "bg-primary/10 border-primary/30 text-primary"
                        : "bg-transparent border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Category sections */}
        {Object.keys(INSPECTION_TEMPLATE).map((category) => {
          // Tires & Wheels gets dedicated component
          if (category === "Tires & Wheels") {
            return (
              <TireWheelInspection
                key={category}
                unitId={unitId}
                dealerId={dealerId}
                readOnly={readOnly}
              />
            );
          }

          const catData = categories.find(c => c.category === category);
          if (!catData) return null;
          const { items } = catData;

          const filteredItems = items.filter(i => matchesFilter(i, filterMode));
          const severity = computeSectionSeverity(items);
          const sevCfg = SEVERITY_CONFIG[severity];
          const isOpen = resolvedExpanded[category] ?? false;

          const catPassed = items.filter(i => i.status === "pass").length;
          const catFailed = items.filter(i => i.status === "fail").length;
          const catRepairs = items.filter(i => i.status === "repair_needed").length;
          const catPending = items.filter(i => i.status === "pending").length;
          const catTotal = items.length;
          const sectionComplete = catPending === 0 && catTotal > 0;

          // Hide section entirely if filter yields no items
          if (filterMode !== "all" && filteredItems.length === 0) return null;

          return (
            <Card key={category} className="glass-panel border-border overflow-hidden relative">
              {/* Color strip */}
              <div className={`absolute left-0 top-0 bottom-0 w-1 ${sevCfg.strip} rounded-l-2xl`} />

              <div
                className="cursor-pointer hover:bg-muted/20 transition-colors py-2 px-4 pl-5"
                onClick={() => toggleSection(category)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm font-semibold">{category}</CardTitle>
                    <Badge className={`text-[9px] px-1.5 py-0 font-bold uppercase tracking-wider border ${sevCfg.bg} ${sevCfg.color}`}>
                      {sevCfg.label}
                    </Badge>
                    {sectionComplete && (
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-emerald-500 border-emerald-500/30">
                        ✔ Complete
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Mini counts */}
                    <div className="flex items-center gap-1.5 text-[10px]">
                      {catPassed > 0 && <span className="text-emerald-500">{catPassed}P</span>}
                      {catFailed > 0 && <span className="text-destructive">{catFailed}F</span>}
                      {catRepairs > 0 && <span className="text-amber-500">{catRepairs}A</span>}
                      {catPending > 0 && <span className="text-muted-foreground">{catPending}?</span>}
                    </div>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </div>
                </div>
              </div>

              {isOpen && (
                <CardContent className="p-0">
                  {/* Section actions */}
                  {!readOnly && (
                    <div className="flex items-center gap-1 px-4 pl-5 py-1.5 border-t border-border/30">
                      <Button
                        variant="ghost" size="sm"
                        className="h-6 text-[10px] px-2"
                        onClick={(e) => { e.stopPropagation(); markSectionOk(items); }}
                      >
                        Mark Section OK
                      </Button>
                      <Button
                        variant="ghost" size="sm"
                        className="h-6 text-[10px] px-2"
                        onClick={(e) => { e.stopPropagation(); markSectionPending(items); }}
                      >
                        Mark All Pending
                      </Button>
                    </div>
                  )}
                  <div className="divide-y divide-border/30">
                    {filteredItems.map((item) => {
                      const key = `${item.category}::${item.item_name}`;
                      const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.pending;
                      const Icon = cfg.icon;
                      const noteOpen = expandedNotes[key] ?? false;
                      const noteVal = noteValues[key] ?? item.notes ?? "";

                      return (
                        <div key={key} className="px-4 pl-5 py-1.5">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => !readOnly && cycleStatus(item)}
                              className={`shrink-0 transition-colors ${cfg.color} ${readOnly ? "cursor-default opacity-60" : "hover:opacity-80"}`}
                              title={readOnly ? cfg.label : `Status: ${cfg.label} — click to cycle`}
                              disabled={readOnly}
                            >
                              <Icon className="h-4 w-4" />
                            </button>

                            <span className="flex-1 text-[13px] text-foreground leading-tight">{item.item_name}</span>

                            {/* Quick status buttons */}
                            {!readOnly && (
                              <div className="hidden sm:flex items-center gap-0.5">
                                {(["pass", "fail", "repair_needed"] as ItemStatus[]).map((s) => {
                                  const sc = STATUS_CONFIG[s];
                                  const SIcon = sc.icon;
                                  const active = item.status === s;
                                  return (
                                    <button
                                      key={s}
                                      onClick={() => setStatus(item, active ? "pending" : s)}
                                      className={`p-0.5 rounded transition-all ${
                                        active ? `${sc.color} bg-muted/50` : "text-muted-foreground/30 hover:text-muted-foreground"
                                      }`}
                                      title={sc.label}
                                    >
                                      <SIcon className="h-3 w-3" />
                                    </button>
                                  );
                                })}
                              </div>
                            )}

                            {/* Metadata hover */}
                            {item.inspected_by && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button className="p-0.5 text-muted-foreground/40 hover:text-muted-foreground">
                                    <User className="h-3 w-3" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs">
                                  <div className="flex items-center gap-1.5">
                                    <User className="h-3 w-3" />
                                    <span>Inspector: {item.inspected_by?.slice(0, 8)}…</span>
                                  </div>
                                  {item.updated_at && (
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                      <Clock className="h-3 w-3" />
                                      <span>{new Date(item.updated_at).toLocaleString()}</span>
                                    </div>
                                  )}
                                </TooltipContent>
                              </Tooltip>
                            )}

                            {/* Notes toggle */}
                            <button
                              onClick={() => toggleNote(key, item.notes)}
                              className={`p-0.5 rounded transition-colors ${
                                item.notes ? "text-primary" : "text-muted-foreground/30 hover:text-muted-foreground"
                              }`}
                              title="Notes"
                            >
                              <MessageSquare className="h-3 w-3" />
                            </button>
                          </div>

                          {noteOpen && (
                            <div className="flex items-center gap-2 mt-1.5 ml-6">
                              <Input
                                value={noteVal}
                                onChange={(e) =>
                                  setNoteValues((prev) => ({ ...prev, [key]: e.target.value }))
                                }
                                placeholder="Add a note…"
                                className="h-7 text-xs"
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    saveNote(item, noteVal);
                                    setExpandedNotes((prev) => ({ ...prev, [key]: false }));
                                  }
                                }}
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs px-2"
                                onClick={() => {
                                  saveNote(item, noteVal);
                                  setExpandedNotes((prev) => ({ ...prev, [key]: false }));
                                }}
                              >
                                Save
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
