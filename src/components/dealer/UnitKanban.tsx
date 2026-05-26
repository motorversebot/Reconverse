import { useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useUpdateUnit } from "@/hooks/useDealerActions";
import { useToast } from "@/hooks/use-toast";
import { GripVertical, Search, Eye } from "lucide-react";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";

const PIPELINE_STAGES = [
  "Inspection",
  "Estimate",
  "Approval",
  "Parts Ordered",
  "In Service",
  "QC",
  "Ready For Sale",
  "Sold",
] as const;

type Unit = {
  id: string;
  year: number | null;
  make: string | null;
  model: string | null;
  stock_number: string | null;
  vin: string | null;
  color: string | null;
  status: string;
  notes: string | null;
  updated_at: string;
  dealer_id: string;
};

const STAGE_COLORS: Record<string, { dot: string; count: string }> = {
  Inspection: { dot: "bg-amber-400", count: "text-amber-400" },
  Estimate: { dot: "bg-orange-400", count: "text-orange-400" },
  Approval: { dot: "bg-yellow-400", count: "text-yellow-400" },
  "Parts Ordered": { dot: "bg-cyan-400", count: "text-cyan-400" },
  "In Service": { dot: "bg-indigo-400", count: "text-indigo-400" },
  QC: { dot: "bg-teal-400", count: "text-teal-400" },
  "Ready For Sale": { dot: "bg-[hsl(var(--primary))]", count: "text-primary" },
  Sold: { dot: "bg-muted-foreground", count: "text-muted-foreground" },
};

interface Props {
  units: Unit[];
  onViewUnit?: (unit: Unit) => void;
}

export default function UnitKanban({ units, onViewUnit }: Props) {
  const updateUnit = useUpdateUnit();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showSold, setShowSold] = useState(false);
  const [activeStage, setActiveStage] = useState<string>("All");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Filter units
  const filtered = units.filter((u) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      u.vin?.toLowerCase().includes(q) ||
      u.stock_number?.toLowerCase().includes(q) ||
      u.make?.toLowerCase().includes(q) ||
      u.model?.toLowerCase().includes(q);
    const matchesSold = showSold || u.status !== "Sold";
    const matchesStage = activeStage === "All" || u.status === activeStage;
    return matchesSearch && matchesSold && matchesStage;
  });

  const visibleStages = PIPELINE_STAGES.filter(
    (s) => (showSold || s !== "Sold") && (activeStage === "All" || s === activeStage)
  );

  const columns = visibleStages.map((stage) => ({
    stage,
    units: filtered.filter((u) => u.status === stage),
  }));

  const handleDragStart = (e: React.DragEvent, unitId: string) => {
    e.dataTransfer.setData("text/plain", unitId);
    setDragging(unitId);
  };

  const handleDrop = async (e: React.DragEvent, targetStage: string) => {
    e.preventDefault();
    setDragOver(null);
    setDragging(null);
    const unitId = e.dataTransfer.getData("text/plain");
    const unit = units.find((u) => u.id === unitId);
    if (!unit || unit.status === targetStage) return;

    // Optimistic update
    const previousUnits = queryClient.getQueryData(["dealer-units", unit.dealer_id as string]);
    queryClient.setQueryData(["dealer-units", (unit as any).dealer_id], (old: any[]) =>
      old?.map((u: any) => (u.id === unitId ? { ...u, status: targetStage, updated_at: new Date().toISOString() } : u))
    );

    try {
      await updateUnit.mutateAsync({ id: unitId, status: targetStage });
      toast({ title: `Moved to ${targetStage}` });
    } catch (err: any) {
      // Rollback
      if (previousUnits) {
        queryClient.setQueryData(["dealer-units", (unit as any).dealer_id], previousUnits);
      }
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const vinLast6 = (vin: string | null) => (vin && vin.length >= 6 ? `…${vin.slice(-6)}` : vin || "—");

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search VIN, stock, make, model…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={showSold} onCheckedChange={setShowSold} />
          <span className="text-xs text-muted-foreground">Show Sold</span>
        </div>
      </div>

      {/* Stage filter chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
        {["All", ...PIPELINE_STAGES].map((stage) => {
          if (stage === "Sold" && !showSold) return null;
          const isActive = activeStage === stage;
          const colors = stage !== "All" ? STAGE_COLORS[stage] : null;
          return (
            <button
              key={stage}
              onClick={() => setActiveStage(stage)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                isActive
                  ? "glass-panel-strong text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--glass-bg)/0.3)]"
              }`}
            >
              {colors && <span className={`h-1.5 w-1.5 rounded-full ${colors.dot}`} />}
              {stage}
            </button>
          );
        })}
      </div>

      {/* Kanban columns - horizontally scrollable */}
      <div
        ref={scrollRef}
        className="overflow-x-auto pb-4 -mx-2 px-2 snap-x snap-mandatory scroll-smooth"
      >
        <div className="flex gap-4" style={{ minWidth: `${columns.length * 320}px` }}>
          {columns.map(({ stage, units: stageUnits }) => {
            const colors = STAGE_COLORS[stage] ?? { dot: "bg-muted-foreground", count: "text-muted-foreground" };
            return (
              <div
                key={stage}
                className={`w-[304px] shrink-0 snap-start rounded-2xl transition-all duration-200 ${
                  dragOver === stage
                    ? "bg-primary/10 border-2 border-dashed border-primary/40"
                    : "bg-[hsl(var(--glass-bg)/0.3)] border border-[hsl(var(--glass-border)/0.06)]"
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(stage);
                }}
                onDragLeave={() => setDragOver(null)}
                onDrop={(e) => handleDrop(e, stage)}
              >
                {/* Sticky column header */}
                <div className="sticky top-0 z-10 flex items-center gap-2 px-3 py-2.5 rounded-t-2xl bg-[hsl(var(--glass-bg)/0.6)] backdrop-blur-md border-b border-[hsl(var(--glass-border)/0.06)]">
                  <span className={`h-2.5 w-2.5 rounded-full ${colors.dot}`} />
                  <span className="text-sm font-semibold text-foreground">{stage}</span>
                  <span className={`text-xs font-mono ml-auto ${colors.count}`}>
                    {stageUnits.length}
                  </span>
                </div>

                <div className="p-2 space-y-2 min-h-[120px]">
                  {stageUnits.map((unit) => (
                    <Card
                      key={unit.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, unit.id)}
                      onDragEnd={() => {
                        setDragging(null);
                        setDragOver(null);
                      }}
                      className={`glass-panel cursor-grab active:cursor-grabbing p-3 transition-all duration-200 hover:border-[hsl(var(--glass-border)/0.2)] group ${
                        dragging === unit.id ? "opacity-40 scale-95" : ""
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground/40 mt-0.5 shrink-0 group-hover:text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {[unit.year, unit.make, unit.model].filter(Boolean).join(" ") || "Untitled"}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            {unit.stock_number && (
                              <span className="text-xs text-muted-foreground">#{unit.stock_number}</span>
                            )}
                            <span className="text-[10px] font-mono text-muted-foreground/70">
                              {vinLast6(unit.vin)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 border-border text-muted-foreground"
                            >
                              {unit.status}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground/60">
                              {format(new Date(unit.updated_at), "MMM d")}
                            </span>
                          </div>
                        </div>
                        {onViewUnit && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onViewUnit(unit);
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-[hsl(var(--glass-bg)/0.5)]"
                          >
                            <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                        )}
                      </div>
                    </Card>
                  ))}
                  {stageUnits.length === 0 && (
                    <p className="text-xs text-muted-foreground/50 text-center py-8">
                      Drop units here
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
