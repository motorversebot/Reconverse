import { Badge } from "@/components/ui/badge";
import { ShieldCheck, TrendingUp, DollarSign, Percent } from "lucide-react";

interface Props {
  title: string;
  stockNumber?: string | null;
  vin?: string | null;
  grandTotal: number;
  gross: number;
  grossPercent: number;
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function getMarginColor(pct: number) {
  if (pct >= 30) return "bg-emerald-500/15 text-emerald-400 border-emerald-500/20";
  if (pct >= 15) return "bg-amber-500/15 text-amber-400 border-amber-500/20";
  return "bg-red-500/15 text-red-400 border-red-500/20";
}

function getMarginLabel(pct: number) {
  if (pct >= 30) return "Healthy";
  if (pct >= 15) return "Moderate";
  return "Low";
}

export default function ApprovalSummaryHeader({ title, stockNumber, vin, grandTotal, gross, grossPercent }: Props) {
  const marginColor = getMarginColor(grossPercent);

  return (
    <div className="glass-panel-strong p-5 sticky top-0 z-20">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Vehicle identity */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-primary/10 shrink-0">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-foreground truncate">{title}</h2>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
              {stockNumber && <span>#{stockNumber}</span>}
              {vin && <span className="font-mono">{vin.slice(-8)}</span>}
            </div>
          </div>
        </div>

        {/* KPI strip */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2 glass-panel px-3 py-2 rounded-xl">
            <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Total</p>
              <p className="text-sm font-bold text-foreground">{fmt(grandTotal)}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 glass-panel px-3 py-2 rounded-xl">
            <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Gross</p>
              <p className="text-sm font-bold text-foreground">{fmt(gross)}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 glass-panel px-3 py-2 rounded-xl">
            <Percent className="h-3.5 w-3.5 text-muted-foreground" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Margin</p>
              <p className="text-sm font-bold text-foreground">{grossPercent.toFixed(1)}%</p>
            </div>
          </div>

          <Badge className={`text-xs font-semibold border px-3 py-1 ${marginColor}`}>
            {getMarginLabel(grossPercent)}
          </Badge>
        </div>
      </div>
    </div>
  );
}
