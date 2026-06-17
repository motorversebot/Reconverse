import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Camera, ArrowRight, RefreshCw, AlertTriangle, ClipboardList, ChevronRight } from "lucide-react";
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

const money = (n: unknown) => `$${(Number(n) || 0).toFixed(2)}`;

const STATUS_BADGE: Record<string, string> = {
  needs_pricing: "text-amber-600 border-amber-500/40 bg-amber-500/10",
  priced: "text-primary border-primary/40 bg-primary/10",
  approved: "text-green-600 border-green-500/40 bg-green-500/10",
  no_charge: "text-muted-foreground border-border bg-muted/40",
  deferred: "text-muted-foreground border-border bg-muted/40",
  declined: "text-red-500 border-red-500/40 bg-red-500/10",
};
const statusLabel = (s: string) => ESTIMATE_STATUS_OPTIONS.find((o) => o.value === s)?.label ?? s;

export default function EstimateItemsTable({ unitId, role, readOnly = false, onMoved }: Props) {
  const { toast } = useToast();
  const canEdit = canEditUnits(role) && !readOnly;

  const [items, setItems] = useState<EstimateItem[]>([]);
  const [summary, setSummary] = useState<EstimateSummary | null>(null);
  const [available, setAvailable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);

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
      return res.item;
    }
    toast({ title: "Couldn't save", variant: "destructive" });
    return null;
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
        <CardContent className="py-8 text-center text-sm text-muted-foreground">Estimate workflow is being set up. Check back shortly.</CardContent>
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

  const openItem = items.find((i) => i.id === openId) || null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">Estimate items <span className="text-muted-foreground font-normal">({items.length})</span></p>
        {canEdit && <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs text-muted-foreground" onClick={regenerate} disabled={busy}><RefreshCw className="h-3.5 w-3.5" /> Sync from MPI</Button>}
      </div>

      {/* Compact single-line rows — click to open detail */}
      <Card className="glass-panel border-border overflow-hidden">
        <ul className="divide-y divide-border/50">
          {items.map((it) => {
            const laborCost = it.labor_hours * it.labor_rate;
            return (
              <li key={it.id}>
                <button
                  type="button"
                  onClick={() => setOpenId(it.id)}
                  className="w-full text-left px-3 py-2.5 flex items-center gap-3 hover:bg-muted/40 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground truncate">{it.concern}</span>
                      {it.photo_count > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground"><Camera className="h-3 w-3" />{it.photo_count}</span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">
                      Labor {money(laborCost)} · Parts {money(it.parts_cost)}
                    </p>
                  </div>
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border shrink-0 ${STATUS_BADGE[it.status] || STATUS_BADGE.needs_pricing}`}>
                    {statusLabel(it.status)}
                  </span>
                  <span className="text-sm font-bold text-foreground tabular-nums shrink-0 w-20 text-right">{money(it.line_total)}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                </button>
              </li>
            );
          })}
        </ul>
      </Card>

      {/* Summary */}
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

      {/* Send to Approval (gated) */}
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

      {/* Detail modal */}
      <EstimateItemDialog
        item={openItem}
        canEdit={canEdit}
        onClose={() => setOpenId(null)}
        onPatch={patch}
      />
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

function EstimateItemDialog({ item, canEdit, onClose, onPatch }: {
  item: EstimateItem | null;
  canEdit: boolean;
  onClose: () => void;
  onPatch: (item: EstimateItem, fields: Partial<EstimateItem>) => Promise<EstimateItem | null>;
}) {
  const { toast } = useToast();
  const [notes, setNotes] = useState("");
  const [hours, setHours] = useState("0");
  const [rate, setRate] = useState("0");
  const [partsDesc, setPartsDesc] = useState("");
  const [partsCost, setPartsCost] = useState("0");
  const [status, setStatus] = useState<EstimateItemStatus>("needs_pricing");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!item) return;
    setNotes(item.notes ?? "");
    setHours(String(item.labor_hours ?? 0));
    setRate(String(item.labor_rate ?? 0));
    setPartsDesc(item.parts_description ?? "");
    setPartsCost(String(item.parts_cost ?? 0));
    setStatus(item.status);
  }, [item?.id]);

  if (!item) return null;
  const laborCost = (Number(hours) || 0) * (Number(rate) || 0);
  const lineTotal = laborCost + (Number(partsCost) || 0);

  const save = async () => {
    setSaving(true);
    const updated = await onPatch(item, {
      notes: notes || null, labor_hours: Number(hours) || 0, labor_rate: Number(rate) || 0,
      parts_description: partsDesc || null, parts_cost: Number(partsCost) || 0, status,
    });
    setSaving(false);
    if (updated) { toast({ title: "Saved" }); onClose(); }
  };

  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">{item.concern}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {item.mpi_category && (
            <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{item.mpi_category} · from MPI</p>
          )}

          {/* Photos */}
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">Photos</p>
            {item.photo_count > 0 ? (
              <div className="flex gap-2 flex-wrap">
                {Array.from({ length: item.photo_count }).map((_, i) => (
                  <div key={i} className="h-16 w-16 rounded-md border border-border bg-muted/40 flex items-center justify-center text-muted-foreground"><Camera className="h-5 w-5" /></div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Camera className="h-3.5 w-3.5" /> No photos attached.</p>
            )}
          </div>

          {/* Notes */}
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">Tech note / concern detail</p>
            <textarea
              value={notes} disabled={!canEdit}
              onChange={(e) => setNotes(e.target.value)} rows={3}
              placeholder="Describe the concern, parts needed, etc."
              className="w-full text-sm rounded-md border border-border bg-background p-2 resize-y"
            />
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Field label="Labor hrs"><Input type="number" min={0} step={0.1} value={hours} disabled={!canEdit} onChange={(e) => setHours(e.target.value)} className="h-9 text-sm" /></Field>
            <Field label="Labor rate"><Input type="number" min={0} step={1} value={rate} disabled={!canEdit} onChange={(e) => setRate(e.target.value)} className="h-9 text-sm" /></Field>
            <Field label="Labor cost"><div className="h-9 flex items-center text-sm font-mono text-muted-foreground">{money(laborCost)}</div></Field>
            <Field label="Parts cost"><Input type="number" min={0} step={0.01} value={partsCost} disabled={!canEdit} onChange={(e) => setPartsCost(e.target.value)} className="h-9 text-sm" /></Field>
          </div>
          <Field label="Parts description">
            <Input value={partsDesc} disabled={!canEdit} onChange={(e) => setPartsDesc(e.target.value)} placeholder="Part(s) needed" className="h-9 text-sm" />
          </Field>

          {/* Status + line total */}
          <div className="flex items-end justify-between gap-3 pt-1">
            <Field label="Status">
              <select value={status} disabled={!canEdit} onChange={(e) => setStatus(e.target.value as EstimateItemStatus)}
                className="h-9 text-sm rounded-md border border-border bg-background px-2 min-w-[140px]">
                {ESTIMATE_STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <div className="text-right">
              <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Line total</p>
              <p className="text-lg font-bold text-foreground">{money(lineTotal)}</p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>{canEdit ? "Cancel" : "Close"}</Button>
          {canEdit && (
            <Button size="sm" onClick={save} disabled={saving} className="gap-1.5">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Save
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
