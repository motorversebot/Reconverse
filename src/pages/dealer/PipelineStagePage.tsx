import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, Search } from "lucide-react";
import { useCurrentDealer, useDealerUnits } from "@/hooks/useDealerData";
import { SLUG_TO_STATUS, STAGE_META, type UnitStatus } from "@/lib/pipeline";
import { format } from "date-fns";
import { useState } from "react";

interface PipelineUnit {
  id: string;
  status: string;
  vin?: string | null;
  stock_number?: string | null;
  make?: string | null;
  model?: string | null;
  year?: number | string | null;
  updated_at: string;
}

export default function PipelineStagePage() {
  const { stage } = useParams<{ stage: string }>();
  const navigate = useNavigate();
  const { data: membership } = useCurrentDealer();
  const dealerId = membership?.dealer_id;
  const { data: units } = useDealerUnits(dealerId);
  const [search, setSearch] = useState("");

  // Resolve slug to DB status
  const status = stage ? SLUG_TO_STATUS[stage] : undefined;
  const meta = status ? STAGE_META[status] : undefined;

  if (!meta || !status) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        Invalid recon lane stage
      </div>
    );
  }

  const filtered = ((units ?? []) as PipelineUnit[]).filter((u) => {
    if (u.status !== status) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      u.vin?.toLowerCase().includes(q) ||
      u.stock_number?.toLowerCase().includes(q) ||
      u.make?.toLowerCase().includes(q) ||
      u.model?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className={`h-3 w-3 rounded-full ${meta.color}`} />
        <h1 className="text-2xl font-bold text-foreground">{meta.label}</h1>
        <Badge variant="outline" className="ml-2 text-xs font-mono">
          {filtered.length}
        </Badge>
      </div>

      <div className="relative w-full sm:w-72">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search VIN, stock, make…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9"
        />
      </div>

      {filtered.length === 0 ? (
        <Card className="glass-panel border-border p-12 text-center">
          <p className="text-muted-foreground">No units in {meta.label}</p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((unit) => {
            const title = [unit.year, unit.make, unit.model].filter(Boolean).join(" ") || "Untitled";
            return (
              <Card
                key={unit.id}
                className="glass-panel border-border p-4 flex items-center gap-4 cursor-pointer hover:border-primary/30 transition-colors"
                onClick={() => navigate(`/dealer/units/${unit.id}`)}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{title}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    {unit.stock_number && <span>#{unit.stock_number}</span>}
                    {unit.vin && (
                      <span className="font-mono text-[10px]">
                        …{unit.vin.slice(-6)}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-xs text-muted-foreground/60">
                  {format(new Date(unit.updated_at), "MMM d")}
                </span>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                </Button>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
