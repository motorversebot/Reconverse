import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download, Trash2, Eye, FolderOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCurrentDealer } from "@/hooks/useDealerData";
import { listRecallReports, deleteRecallReport, type SavedRecallReport } from "@/lib/recallReports";
import { exportRows } from "@/lib/recalls";

export default function SavedRecallReports({ reloadKey = 0 }: { reloadKey?: number }) {
  const { toast } = useToast();
  const { data: membership } = useCurrentDealer();
  const dealerId = membership?.dealer_id;
  const [reports, setReports] = useState<SavedRecallReport[]>([]);
  const [persistence, setPersistence] = useState<"server" | "local">("local");
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<SavedRecallReport | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, persistence } = await listRecallReports(dealerId);
    setReports(data);
    setPersistence(persistence);
    setLoading(false);
  }, [dealerId]);

  useEffect(() => { void load(); }, [load, reloadKey]);

  const fmtDate = (v: string) => {
    const d = new Date(v);
    return isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
  };

  const handleDelete = async (r: SavedRecallReport) => {
    if (!confirm(`Delete "${r.name}"?`)) return;
    await deleteRecallReport(r.id, dealerId);
    toast({ title: "Report deleted" });
    void load();
  };

  if (!loading && reports.length === 0) {
    return (
      <Card className="p-6 text-center text-sm text-muted-foreground">
        <FolderOpen className="h-6 w-6 mx-auto mb-2 opacity-60" />
        No saved recall reports yet. Run a check and click <span className="font-medium">Save Report</span>.
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wide">Saved Recall Reports</h3>
        {persistence === "local" && (
          <Badge variant="outline" className="rounded-none text-[10px] text-amber-600 border-amber-300">on this device</Badge>
        )}
      </div>
      <Card className="glass-panel border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Report</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-center">VINs</TableHead>
              <TableHead className="text-center">Open recalls</TableHead>
              <TableHead>By</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reports.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell className="text-muted-foreground text-xs">{fmtDate(r.created_at)}</TableCell>
                <TableCell className="text-center font-mono">{r.vin_count}</TableCell>
                <TableCell className="text-center font-mono">
                  <span className={r.open_recall_count > 0 ? "text-red-600 font-bold" : "text-emerald-600"}>{r.open_recall_count}</span>
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">{r.created_by || "—"}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => setView(r)}><Eye className="h-3.5 w-3.5" /> View</Button>
                    <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => exportRows(r.detailed_rows, `${r.name}`.replace(/[^\w.-]+/g, "_"), "xlsx", "Recalls")}>
                      <Download className="h-3.5 w-3.5" /> Export
                    </Button>
                    <Button variant="ghost" size="sm" className="gap-1.5 text-destructive hover:text-destructive" onClick={() => handleDelete(r)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* View dialog */}
      <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{view?.name}</DialogTitle></DialogHeader>
          {view && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span>{view.file_name || "—"}</span>
                <span>· {view.summary.checked} VINs</span>
                <span>· {view.summary.withRecalls} with recalls</span>
                <span>· {view.summary.totalRecalls} total recalls</span>
                {view.summary.invalid > 0 && <span>· {view.summary.invalid} invalid</span>}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => exportRows(view.summary_rows, `${view.name}-summary`.replace(/[^\w.-]+/g, "_"), "xlsx")}>
                  <Download className="h-3.5 w-3.5" /> Summary
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => exportRows(view.detailed_rows, `${view.name}-detailed`.replace(/[^\w.-]+/g, "_"), "xlsx")}>
                  <Download className="h-3.5 w-3.5" /> Detailed
                </Button>
              </div>
              <div className="space-y-2">
                {view.results.filter((res) => res.recalls.length > 0).map((res) => (
                  <div key={res.vin} className="border border-border rounded-none p-3 space-y-2">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-mono font-bold">{res.vin}</span>
                      <span className="text-muted-foreground">{[res.decodedYear, res.decodedMake, res.decodedModel].filter(Boolean).join(" ")}</span>
                      <Badge variant="outline" className="rounded-none text-[10px] text-red-600 border-red-300 ml-auto">{res.recallCount} recalls</Badge>
                    </div>
                    {res.recalls.map((rc, i) => (
                      <div key={i} className="border-l-2 border-border pl-2 text-[11px] space-y-0.5">
                        <p><span className="font-mono font-bold">{rc.campaignNumber}</span> · {rc.component}</p>
                        {rc.summary && <p className="text-muted-foreground">{rc.summary}</p>}
                        {rc.remedy && <p className="text-muted-foreground"><span className="uppercase">Remedy:</span> {rc.remedy}</p>}
                      </div>
                    ))}
                  </div>
                ))}
                {view.results.every((res) => res.recalls.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">No open recalls in this report.</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
