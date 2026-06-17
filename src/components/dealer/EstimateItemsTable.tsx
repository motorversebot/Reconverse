import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Camera, ArrowRight, RefreshCw, AlertTriangle, ClipboardList } from "lucide-react";
import { canEditUnits } from "@/lib/permissions";
import {
  listEstimateItems, generateFromMpi, updateEstimateItem, moveToApproval,
  needsPricingCount, ESTIMATE_STATUS_OPTIONS,
  type EstimateItem, type EstimateSummary, type EstimateItemStatus,
} from "@/lib/estimateItems";

interface Props {
  unitId: string;
  dealerId?: string;
  role?: string;
  readOnly?: boolean;
  onMoved?: () => void;
}

const money = (n: number) => `$${(Number(n) || 0).toFixed(2)}`;

export default function EstimateItemsTable({ unitId, role, readOnly = false, onMoved }: Props) {
  const { toast } = useToast();
  const canEdit = canEditUnits(role) && !readOnly;

  const [items, setItems] = useState<EstimateItem[]>([]);
  const [summary, setSummary] = useState<EstimateSummary | null>(null);
  const [available, setAvailable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);

  const load = useCallback(async (autoGen = false) => {
    setLoading(true);
    let data = await listEstimateItems(unitId);
    if (autoGen && data.available && data.items.length === 0 && !readOnly) {
      data = await generateFromMpi(unitId);
    }
    setItems(data.items);
    setSummary(data.summary);
    setAvailable(data.available);
    setLoading(false);
  }, [unitId, readOnly]);

  useEffect(() => { void load(true); }, [load]);

  const patch = useCallback(async (item: EstimateItem, fields: Partial<EstimateItem>) => {
    const res = await updateEstimateItem(unitId, item.id, fields as any);
    if (res) {
      setItems((prev) => prev.map((i) => (i.id === item.id ? res.item : i)));
      setSummary(res.summary);
    } else {
      toast({ title: "Couldn't save", variant: "destructive" });
    }
  }, [unitId, toast]);

  const regenerate = async () => {
    setBusy(true);
    try { const d = await generateFromMpi(unitId); setItems(d.items); setSummary(d.summary); toast({ title: "Synced from MPI" }); }
    finally { setBusy(false); }
  };

  const sendToApproval = async () => {
    setSending(true);
    try {
      const r = await moveToApproval(unitId);
      if (r.ok) { toast({ title: "Sent to Approval" }); onMoved?.(); }
      else toast({ title: "Not ready", description: r.message || "Some items still need pricing.", variant: "destructive" });
    } finally { setSending(false); }
  };

  if (loading) {
    return <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center"><Loader2 className="h-4 w-4 animate-spin" /> Loading estimate…</div>;
  }

  if (!available) {
    return (
      <Card className="glass-panel border-border">
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Estimate workflow is being set up. Check back shortly.
        </CardContent>
      </Card>
    );
  }

  const pending = needsPricingCount(items);

  if (items.length === 0) {
    return (
      <Card className="glass-panel border-border">
        <CardContent className="py-10 text-center space-y-3">
          <ClipboardList className="h-7 w-7 mx-auto text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No failed or attention items from the MPI yet.</p>
          <p className="text-xs text-muted-foreground/70">Mark items Fail or Repair on the MPI tab — they'll appear here for pricing.</p>
          {canEdit && <Button variant="outline" size="sm" className="gap-2" onClick={regenerate} disabled={busy}><RefreshCw className="h-4 w-4" /> Sync from MPI</Button>}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">Estimate items <span className="text-muted-foreground font-normal">({items.length})</span></p>
        {canEdit && <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs text-muted-foreground" onClick={regenerate} disabled={busy}><RefreshCw className="h-3.5 w-3.5" /> Sync from MPI</Button>}
      </div>

      {items.map((it) => (
        <EstimateRow key={it.id} item={it} canEdit={canEdit} onPatch={patch} />
      ))}

      {summary && (
        <Card className="glass-panel border-border">
          <CardContent className="py-3 px-4 grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm">
            <Stat label="Labor total" value={money(summary.labor_total)} />
            <Stat label="Parts total" value={money(summary.parts_total)} />
            <Stat label="Grand total" value={money(summary.grand_total)} strong />
            <Stat label="Needs pricing" value={String(summary.open_items)} warn={summary.open_items > 0} />
            <Stat label="Completed" value={String(summary.completed_items)} />
          </CardContent>
        </Card>
      )}

      {canEdit && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2 pt-1">
          {pending > 0 && (
            <span className="text-xs text-amber-600 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" /> {pending} item{pending === 1 ? "" : "s"} still need pricing.
            </span>
          )}
          <Button onClick={sendToApproval} disabled={sending || pending > 0} className="gap-2 w-full sm:w-auto min-h-[44px]">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />} Send to Approval
          </Button>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, strong, warn }: { label: string; value: string; strong?: boolean; warn?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`${strong ? "text-base font-bold" : "text-sm font-semibold"} ${warn ? "text-amber-600" : "text-foreground"}`}>{value}</p>
    </div>
  );
}

function EstimateRow({ item, canEdit, onPatch }: {
  item: EstimateItem; canEdit: boolean;
  onPatch: (item: EstimateItem, fields: Partial<EstimateItem>) => void;
}) {
  const [notes, setNotes] = useState(item.notes ?? "");
  const [hours, setHours] = useState(String(item.labor_hours ?? 0));
  const [rate, setRate] = useState(String(item.labor_rate ?? 0));
  const [partsDesc, setPartsDesc] = useState(item.parts_description ?? "");
  const [partsCost, setPartsCost] = useState(String(item.parts_cost ?? 0));

  useEffect(() => {
    setNotes(item.notes ?? ""); setHours(String(item.labor_hours ?? 0));
    setRate(String(item.labor_rate ?? 0)); setPartsDesc(item.parts_description ?? "");
    setPartsCost(String(item.parts_cost ?? 0));
  }, [item.id, item.labor_hours, item.labor_rate, item.parts_cost, item.parts_description, item.notes]);

  const laborCost = (Number(hours) || 0) * (Number(rate) || 0);

  const commit = () => onPatch(item, {
    notes: notes || null, labor_hours: Number(hours) || 0, labor_rate: Number(rate) || 0,
    parts_description: partsDesc || null, parts_cost: Number(partsCost) || 0,
  });

  return (
    <Card className="glass-panel border-border">
      <CardContent className="p-3 space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">{item.concern}</p>
            {item.mpi_category && <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{item.mpi_category}</p>}
          </div>
          <select
            value={item.status}
            disabled={!canEdit}
            onChange={(e) => onPatch(item, { status: e.target.value as EstimateItemStatus })}
            className="text-xs rounded-md border border-border bg-background px-2 py-1.5 shrink-0"
          >
            {ESTIMATE_STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <Camera className="h-3.5 w-3.5" />
          {item.photo_count > 0 ? `${item.photo_count} photo${item.photo_count === 1 ? "" : "s"}` : "No photos"}
        </div>
        <textarea
          value={notes} disabled={!canEdit}
          onChange={(e) => setNotes(e.target.value)} onBlur={commit}
          placeholder="Tech note / concern detail…" rows={2}
          className="w-full text-xs rounded-md border border-border bg-background p-2 resize-y"
        />

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Field label="Labor hrs">
            <Input type="number" min={0} step={0.1} value={hours} disabled={!canEdit}
              onChange={(e) => setHours(e.target.value)} onBlur={commit} className="h-9 text-xs" />
          </Field>
          <Field label="Labor rate">
            <Input type="number" min={0} step={1} value={rate} disabled={!canEdit}
              onChange={(e) => setRate(e.target.value)} onBlur={commit} className="h-9 text-xs" />
          </Field>
          <Field label="Labor cost">
            <div className="h-9 flex items-center text-xs font-mono text-muted-foreground">{money(laborCost)}</div>
          </Field>
          <Field label="Parts cost">
            <Input type="number" min={0} step={0.01} value={partsCost} disabled={!canEdit}
              onChange={(e) => setPartsCost(e.target.value)} onBlur={commit} className="h-9 text-xs" />
          </Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Field label="Parts description">
            <Input value={partsDesc} disabled={!canEdit}
              onChange={(e) => setPartsDesc(e.target.value)} onBlur={commit} placeholder="Part(s) needed" className="h-9 text-xs" />
          </Field>
          <Field label="Line total">
            <div className="h-9 flex items-center text-sm font-bold text-foreground">{money(laborCost + (Number(partsCost) || 0))}</div>
          </Field>
        </div>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
