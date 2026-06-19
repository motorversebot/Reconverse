import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Camera, ArrowRight, RefreshCw, AlertTriangle, ClipboardList, Plus, Trash2, X } from "lucide-react";
import { canEditUnits } from "@/lib/permissions";
import AuthImage from "@/components/dealer/AuthImage";
import { uploadUnitPhoto } from "@/lib/photos";
import {
  listEstimateItems, generateFromMpi, updateEstimateItem, moveToApproval,
  addEstimatePart, updateEstimatePart, deleteEstimatePart,
  needsPricingCount, ESTIMATE_STATUS_OPTIONS,
  type EstimateItem, type EstimateSummary, type EstimateItemStatus, type EstimatePart, type EstimateData,
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

  const apply = useCallback((data: EstimateData | null) => {
    if (!data) { toast({ title: "Couldn't save", variant: "destructive" }); return; }
    setItems(data.items);
    setSummary(data.summary);
  }, [toast]);

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

      <Card className="glass-panel border-border overflow-hidden">
        <ul className="divide-y divide-border/50">
          {items.map((it) => {
            const declined = it.status === "declined";
            return (
              <li key={it.id}>
                <button
                  type="button"
                  onClick={() => setOpenId(it.id)}
                  className={`w-full text-left px-3 py-2.5 flex items-center gap-3 hover:bg-muted/40 transition-colors ${declined ? "opacity-50" : ""}`}
                >
                  {it.photos.length > 0 ? (
                    <AuthImage src={it.photos[0].url} className="h-10 w-10 rounded object-cover border border-border shrink-0" />
                  ) : (
                    <div className="h-10 w-10 rounded bg-muted flex items-center justify-center shrink-0"><Camera className="h-4 w-4 text-muted-foreground/50" /></div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-medium text-foreground truncate ${declined ? "line-through" : ""}`}>{it.concern}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      Labor {money(it.labor_hours * it.labor_rate)} · Parts {money(it.parts_cost)}{it.misc_cost > 0 ? ` · Misc ${money(it.misc_cost)}` : ""}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-foreground">{money(it.line_total)}</p>
                    <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-full border ${STATUS_BADGE[it.status] || STATUS_BADGE.needs_pricing}`}>{statusLabel(it.status)}</span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </Card>

      {summary && (
        <Card className="glass-panel border-border">
          <CardContent className="py-3 px-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <Stat label="Labor total" value={money(summary.labor_total)} />
            <Stat label="Parts total" value={money(summary.parts_total)} />
            <Stat label="Misc total" value={money(summary.misc_total)} />
            <Stat label="Grand total" value={money(summary.grand_total)} strong />
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

      <EstimateLineEditor item={openItem} unitId={unitId} canEdit={canEdit} onClose={() => setOpenId(null)} onApply={apply} />
    </div>
  );
}

function Stat({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`${strong ? "text-base font-bold" : "text-sm font-semibold"} text-foreground`}>{value}</p>
    </div>
  );
}

function EstimateLineEditor({
  item, unitId, canEdit, onClose, onApply,
}: {
  item: EstimateItem | null;
  unitId: string;
  canEdit: boolean;
  onClose: () => void;
  onApply: (d: EstimateData | null) => void;
}) {
  const { toast } = useToast();
  const [tab, setTab] = useState("labor");
  const [hours, setHours] = useState("0");
  const [rate, setRate] = useState("0");
  const [notes, setNotes] = useState("");
  const [miscDesc, setMiscDesc] = useState("");
  const [miscCost, setMiscCost] = useState("0");
  const [miscNotes, setMiscNotes] = useState("");
  const [status, setStatus] = useState<EstimateItemStatus>("needs_pricing");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [busyPart, setBusyPart] = useState(false);

  useEffect(() => {
    if (!item) return;
    setTab("labor");
    setHours(String(item.labor_hours ?? 0));
    setRate(String(item.labor_rate ?? 0));
    setNotes(item.notes ?? "");
    setMiscDesc(item.misc_description ?? "");
    setMiscCost(String(item.misc_cost ?? 0));
    setMiscNotes(item.misc_notes ?? "");
    setStatus(item.status);
  }, [item?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!item) return null;

  const laborTotal = (Number(hours) || 0) * (Number(rate) || 0);
  const partsTotal = item.parts.reduce((s, p) => s + p.quantity * p.unit_price, 0);
  const miscTotal = Number(miscCost) || 0;
  const grand = laborTotal + partsTotal + miscTotal;

  const save = async () => {
    setSaving(true);
    try {
      const d = await updateEstimateItem(unitId, item.id, {
        labor_hours: Number(hours) || 0, labor_rate: Number(rate) || 0,
        notes: notes || null, status,
        misc_description: miscDesc || null, misc_cost: Number(miscCost) || 0, misc_notes: miscNotes || null,
      });
      onApply(d);
      if (d) { toast({ title: "Estimate line saved" }); onClose(); }
    } finally { setSaving(false); }
  };

  const addPart = async () => {
    if (!canEdit) return;
    setBusyPart(true);
    try { onApply(await addEstimatePart(unitId, item.id, { quantity: 1, unit_price: 0 })); }
    finally { setBusyPart(false); }
  };
  const savePart = async (partId: number, patch: any) => { onApply(await updateEstimatePart(unitId, item.id, partId, patch)); };
  const delPart = async (partId: number) => { onApply(await deleteEstimatePart(unitId, item.id, partId)); };

  const onAddPhoto = async (file: File | null) => {
    if (!file || !canEdit) return;
    setUploading(true);
    try {
      await uploadUnitPhoto(unitId, file, { context: "estimate", category: item.mpi_category, item_name: item.mpi_item_name });
      onApply(await updateEstimateItem(unitId, item.id, {}));
      toast({ title: "Photo added" });
    } catch { toast({ title: "Photo upload failed", variant: "destructive" }); }
    finally { setUploading(false); }
  };

  const Photos = () => (
    <div className="space-y-1.5">
      <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Photos</p>
      {item.photos.length === 0 && <p className="text-xs text-muted-foreground/70">No photos. MPI photos appear here automatically.</p>}
      <div className="flex flex-wrap gap-2">
        {item.photos.map((p) => (<AuthImage key={p.id} src={p.url} className="h-16 w-16 rounded object-cover border border-border" />))}
        {canEdit && (
          <label className="h-16 w-16 rounded border border-dashed border-border flex items-center justify-center cursor-pointer hover:bg-muted/40">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : <Camera className="h-4 w-4 text-muted-foreground" />}
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onAddPhoto(e.target.files?.[0] ?? null)} />
          </label>
        )}
      </div>
    </div>
  );

  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="p-0 gap-0 sm:max-w-lg max-h-[92vh] flex flex-col [&>button]:hidden">
        <DialogHeader className="px-4 pt-4 pb-2 shrink-0 flex-row items-start justify-between gap-2 space-y-0">
          <div className="min-w-0">
            <DialogTitle className="text-base truncate">{item.concern}</DialogTitle>
            <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mt-0.5">
              {item.mpi_category || "Manual"}{item.source === "mpi" ? " · From MPI" : ""}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded text-muted-foreground hover:text-foreground shrink-0"><X className="h-4 w-4" /></button>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="flex-1 min-h-0 flex flex-col">
          <TabsList className="mx-4 grid grid-cols-3">
            <TabsTrigger value="labor">Labor</TabsTrigger>
            <TabsTrigger value="parts">Parts{item.parts.length ? ` (${item.parts.length})` : ""}</TabsTrigger>
            <TabsTrigger value="misc">Misc</TabsTrigger>
          </TabsList>

          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-4">
            <TabsContent value="labor" className="mt-0 space-y-4">
              <Photos />
              <Field label="Note">
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} disabled={!canEdit}
                  placeholder="Concern detail / tech note…" className="w-full text-sm rounded-md border border-border bg-background p-2 resize-y" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Labor hrs"><Input type="number" inputMode="decimal" min={0} step={0.1} value={hours} disabled={!canEdit} onChange={(e) => setHours(e.target.value)} /></Field>
                <Field label="Labor rate"><Input type="number" inputMode="decimal" min={0} step={1} value={rate} disabled={!canEdit} onChange={(e) => setRate(e.target.value)} /></Field>
              </div>
              <p className="text-xs text-muted-foreground">Labor total = hrs × rate = <span className="font-semibold text-foreground">{money(laborTotal)}</span></p>
            </TabsContent>

            <TabsContent value="parts" className="mt-0 space-y-4">
              <Photos />
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Part lines</p>
                  {canEdit && <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={addPart} disabled={busyPart}><Plus className="h-3.5 w-3.5" /> Add part line</Button>}
                </div>
                {item.parts.length === 0 && <p className="text-xs text-muted-foreground/70">No parts yet. Add a line — quote OEM vs aftermarket, or multiple parts for one repair.</p>}
                {item.parts.map((p) => (
                  <PartLineRow key={p.id} part={p} canEdit={canEdit} onSave={(patch) => savePart(p.id, patch)} onDelete={() => delPart(p.id)} />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Parts total = <span className="font-semibold text-foreground">{money(partsTotal)}</span></p>
            </TabsContent>

            <TabsContent value="misc" className="mt-0 space-y-4">
              <Field label="Misc description"><Input value={miscDesc} disabled={!canEdit} onChange={(e) => setMiscDesc(e.target.value)} placeholder="Shop supplies, sublet, disposal…" /></Field>
              <Field label="Misc cost"><Input type="number" inputMode="decimal" min={0} step={1} value={miscCost} disabled={!canEdit} onChange={(e) => setMiscCost(e.target.value)} /></Field>
              <Field label="Notes">
                <textarea value={miscNotes} onChange={(e) => setMiscNotes(e.target.value)} rows={2} disabled={!canEdit}
                  placeholder="Misc notes…" className="w-full text-sm rounded-md border border-border bg-background p-2 resize-y" />
              </Field>
            </TabsContent>
          </div>
        </Tabs>

        <div className="shrink-0 border-t border-border bg-background px-4 pt-2.5 pb-[max(0.85rem,env(safe-area-inset-bottom))]">
          <div className="grid grid-cols-4 gap-2 text-center mb-2.5">
            <Tot label="Labor" v={laborTotal} />
            <Tot label="Parts" v={partsTotal} />
            <Tot label="Misc" v={miscTotal} />
            <Tot label="Grand" v={grand} strong />
          </div>
          {canEdit ? (
            <div className="flex items-center gap-2">
              <Select value={status} onValueChange={(v) => setStatus(v as EstimateItemStatus)}>
                <SelectTrigger className="h-11 flex-1"><SelectValue /></SelectTrigger>
                <SelectContent>{ESTIMATE_STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
              <Button onClick={save} disabled={saving} className="h-11 min-w-[110px] gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save
              </Button>
            </div>
          ) : (
            <p className="text-center text-xs text-muted-foreground py-1">Read-only</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}

function Tot({ label, v, strong }: { label: string; v: number; strong?: boolean }) {
  return (
    <div>
      <p className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`${strong ? "text-sm font-bold text-foreground" : "text-xs font-semibold text-foreground"}`}>${v.toFixed(2)}</p>
    </div>
  );
}

function PartLineRow({ part, canEdit, onSave, onDelete }: {
  part: EstimatePart; canEdit: boolean;
  onSave: (patch: any) => void; onDelete: () => void;
}) {
  const [pn, setPn] = useState(part.part_number ?? "");
  const [desc, setDesc] = useState(part.description ?? "");
  const [qty, setQty] = useState(String(part.quantity ?? 1));
  const [price, setPrice] = useState(String(part.unit_price ?? 0));
  const [kind, setKind] = useState<"oem" | "aftermarket" | "">(part.kind ?? "");

  useEffect(() => {
    setPn(part.part_number ?? ""); setDesc(part.description ?? "");
    setQty(String(part.quantity ?? 1)); setPrice(String(part.unit_price ?? 0)); setKind(part.kind ?? "");
  }, [part.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const flush = () => onSave({ part_number: pn || null, description: desc || null, quantity: Number(qty) || 0, unit_price: Number(price) || 0, kind: kind || null });
  const lineTotal = (Number(qty) || 0) * (Number(price) || 0);

  return (
    <div className="rounded-md border border-border bg-muted/20 p-2.5 space-y-2">
      <div className="flex items-center gap-2">
        <Input value={desc} disabled={!canEdit} onChange={(e) => setDesc(e.target.value)} onBlur={flush} placeholder="Part description" className="h-9 flex-1 text-sm" />
        {canEdit && <button onClick={onDelete} className="p-1.5 rounded text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 shrink-0"><Trash2 className="h-4 w-4" /></button>}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Input value={pn} disabled={!canEdit} onChange={(e) => setPn(e.target.value)} onBlur={flush} placeholder="Part #" className="h-9 text-xs" />
        <div className="flex rounded-md border border-border overflow-hidden">
          {(["oem", "aftermarket"] as const).map((k) => (
            <button key={k} disabled={!canEdit}
              onClick={() => { const nk = kind === k ? "" : k; setKind(nk); onSave({ part_number: pn || null, description: desc || null, quantity: Number(qty) || 0, unit_price: Number(price) || 0, kind: nk || null }); }}
              className={`flex-1 text-[10px] uppercase font-semibold py-1.5 transition-colors ${kind === k ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted"}`}>
              {k === "oem" ? "OEM" : "Aftmkt"}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 items-end">
        <Field label="Qty"><Input type="number" inputMode="decimal" min={0} step={1} value={qty} disabled={!canEdit} onChange={(e) => setQty(e.target.value)} onBlur={flush} className="h-9 text-xs" /></Field>
        <Field label="Price"><Input type="number" inputMode="decimal" min={0} step={1} value={price} disabled={!canEdit} onChange={(e) => setPrice(e.target.value)} onBlur={flush} className="h-9 text-xs" /></Field>
        <div className="text-right pb-1.5"><p className="text-[9px] font-mono uppercase text-muted-foreground">Line</p><p className="text-sm font-bold text-foreground">${lineTotal.toFixed(2)}</p></div>
      </div>
    </div>
  );
}
