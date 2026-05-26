import { DollarSign, TrendingUp, Percent } from "lucide-react";

interface Props {
  totals: {
    laborTotal: number;
    partsTotal: number;
    miscTotal: number;
    subletTotal: number;
    subtotal: number;
    taxTotal: number;
    shopSupplies: number;
    discountTotal: number;
    grandTotal: number;
    costTotal: number;
    gross: number;
    grossPercent: number;
  };
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

export default function EstimateTotals({ totals }: Props) {
  return (
    <div className="glass-panel p-4 space-y-3">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <DollarSign className="h-4 w-4 text-primary" /> Estimate Totals
      </h3>

      <div className="space-y-1.5 text-sm">
        <Row label="Labor" value={fmt(totals.laborTotal)} />
        <Row label="Parts" value={fmt(totals.partsTotal)} />
        <Row label="Misc" value={fmt(totals.miscTotal)} />
        <Row label="Sublet" value={fmt(totals.subletTotal)} />
        <div className="border-t border-border/40 my-2" />
        <Row label="Subtotal" value={fmt(totals.subtotal)} bold />
        <Row label="Tax" value={fmt(totals.taxTotal)} />
        <Row label="Shop Supplies" value={fmt(totals.shopSupplies)} />
        {totals.discountTotal > 0 && (
          <Row label="Discount" value={`-${fmt(totals.discountTotal)}`} className="text-destructive" />
        )}
        <div className="border-t border-border/40 my-2" />
        <Row label="Total" value={fmt(totals.grandTotal)} bold large />
      </div>

      <div className="border-t border-border/40 pt-2 space-y-1 text-xs text-muted-foreground">
        <div className="flex justify-between items-center">
          <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Gross (Revenue − Cost)</span>
          <span className="font-medium text-foreground">{fmt(totals.gross)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="flex items-center gap-1"><Percent className="h-3 w-3" /> Margin (Gross / Revenue)</span>
          <span className="font-medium text-foreground">{totals.grossPercent.toFixed(1)}%</span>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bold, large, className }: { label: string; value: string; bold?: boolean; large?: boolean; className?: string }) {
  return (
    <div className={`flex justify-between ${className || ""}`}>
      <span className={`text-muted-foreground ${bold ? "font-medium text-foreground" : ""}`}>{label}</span>
      <span className={`${bold ? "font-semibold text-foreground" : ""} ${large ? "text-base" : ""}`}>{value}</span>
    </div>
  );
}
