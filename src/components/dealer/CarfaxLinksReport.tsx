import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, ExternalLink } from "lucide-react";
import { useCurrentDealer, useDealerUnits } from "@/hooks/useDealerData";
import { resolveCarfax, type CarfaxLinkStatus } from "@/lib/carfax";
import { exportRows } from "@/lib/recalls";

const STATUS_LABEL: Record<CarfaxLinkStatus, string> = {
  available: "Linked",
  expired: "Expired",
  missing: "Not attached",
  not_configured: "Not configured",
};

export default function CarfaxLinksReport() {
  const { data: membership } = useCurrentDealer();
  const dealerId = membership?.dealer_id;
  const { data: units, isLoading } = useDealerUnits(dealerId);

  const rows = useMemo(() => {
    return (units || []).map((u: any) => {
      const info = resolveCarfax(u, dealerId);
      const vehicle = [u.year, u.make, u.model].filter(Boolean).join(" ") || "—";
      return {
        stock_number: u.stock_number || "",
        vehicle,
        vin: info.vin || u.vin || "",
        carfax_link_status: info.carfax_link_status,
        carfax_report_url: info.carfax_report_url || "",
        carfax_badge_type: info.carfax_badge_type || "",
        carfax_last_checked_at: info.carfax_last_checked_at || "",
      };
    });
  }, [units, dealerId]);

  const counts = useMemo(() => {
    const c = { available: 0, missing: 0, not_configured: 0, expired: 0 } as Record<CarfaxLinkStatus, number>;
    rows.forEach((r) => { c[r.carfax_link_status as CarfaxLinkStatus]++; });
    return c;
  }, [rows]);

  const handleExport = (fmt: "csv" | "xlsx") => exportRows(rows, "carfax_links", fmt, "CARFAX Links");

  const badge = (s: CarfaxLinkStatus) => {
    const cls = s === "available" ? "text-primary border-primary/40"
      : s === "expired" ? "text-amber-600 border-amber-500/40"
      : "text-muted-foreground";
    return <Badge variant="outline" className={`text-xs ${cls}`}>{STATUS_LABEL[s]}</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span className="text-primary">{counts.available} linked</span>
          <span>· {counts.missing} not attached</span>
          <span>· {counts.not_configured} not configured</span>
          {counts.expired > 0 && <span>· {counts.expired} expired</span>}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => handleExport("csv")} disabled={!rows.length}>
            <Download className="h-4 w-4" /> CSV
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => handleExport("xlsx")} disabled={!rows.length}>
            <Download className="h-4 w-4" /> Excel
          </Button>
        </div>
      </div>

      <Card className="glass-panel border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Stock #</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead>VIN</TableHead>
              <TableHead>CARFAX</TableHead>
              <TableHead>Report</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Loading…</TableCell></TableRow>
            )}
            {!isLoading && rows.map((r, i) => (
              <TableRow key={i}>
                <TableCell className="text-muted-foreground">{r.stock_number || "—"}</TableCell>
                <TableCell className="font-medium">{r.vehicle}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{r.vin || "—"}</TableCell>
                <TableCell>{badge(r.carfax_link_status as CarfaxLinkStatus)}</TableCell>
                <TableCell>
                  {r.carfax_report_url ? (
                    <a href={r.carfax_report_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary text-xs hover:underline">
                      Open <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : <span className="text-muted-foreground text-xs">—</span>}
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && !rows.length && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No units</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
