import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, ExternalLink, Link2, RefreshCw, X, Settings2, Loader2 } from "lucide-react";
import {
  resolveCarfax, canGenerateCarfax, generateCarfaxLink,
  attachCarfaxLink, clearCarfaxLink, extractCarfaxUrl,
  getUnitCarfax, patchUnitCarfax,
  type CarfaxInfo,
} from "@/lib/carfax";
import { canEditUnits } from "@/lib/permissions";

interface Props {
  unit: { id?: string; vin?: string | null };
  unitId?: string;
  dealerId?: string;
  role?: string;
}

const EMPTY: CarfaxInfo = {
  vin: "", carfax_report_url: null, carfax_badge_type: null,
  carfax_link_status: "not_configured", carfax_last_checked_at: null,
};

export default function CarfaxCard({ unit, unitId, dealerId, role }: Props) {
  const { toast } = useToast();
  const id = unitId || unit?.id || "";
  const canEdit = canEditUnits(role);

  const [info, setInfo] = useState<CarfaxInfo>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [persistence, setPersistence] = useState<"server" | "local">("local");
  const [attachOpen, setAttachOpen] = useState(false);
  const [attachInput, setAttachInput] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    // Local baseline (never throws).
    let resolved = resolveCarfax(unit ?? {}, dealerId);
    try {
      if (id) {
        const mc = await getUnitCarfax(id);
        if (mc.data?.carfax_report_url) {
          resolved = {
            ...resolved,
            carfax_report_url: mc.data.carfax_report_url,
            carfax_badge_type: mc.data.carfax_badge_type || resolved.carfax_badge_type,
            carfax_link_status: "attached",
            carfax_last_checked_at: mc.data.carfax_last_checked_at,
          };
          setPersistence("server");
        } else if (mc.providerConfigured) {
          if (resolved.carfax_link_status !== "attached") resolved = { ...resolved, carfax_link_status: "missing" };
          setPersistence("server");
        } else {
          setPersistence("local");
        }
      }
    } catch {
      // API failure → keep local baseline, never crash the page.
    }
    setInfo(resolved || EMPTY);
    setLoading(false);
  }, [unit, dealerId, id]);

  useEffect(() => { void load(); }, [load]);

  const handleAttach = useCallback(async () => {
    const { url, error } = extractCarfaxUrl(attachInput);
    if (error || !url) { toast({ title: "Couldn't attach link", description: error || "Invalid link", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const where = id ? await patchUnitCarfax(id, url, "view_report") : "local";
      if (where === "local") attachCarfaxLink(dealerId || "", info.vin || unit?.vin || "", url);
      setAttachOpen(false); setAttachInput("");
      toast({ title: "CARFAX report attached", description: where === "local" ? "Saved on this device — MC CARFAX endpoint pending." : undefined });
      await load();
    } catch {
      toast({ title: "Couldn't attach link", variant: "destructive" });
    } finally { setSaving(false); }
  }, [attachInput, id, dealerId, info.vin, unit, toast, load]);

  const handleGenerate = () => {
    const url = generateCarfaxLink(dealerId || "", unit?.vin || "");
    if (url) { toast({ title: "CARFAX link generated" }); void load(); }
    else toast({ title: "Couldn't generate link", description: "Check the VIN and your CARFAX setup in Settings.", variant: "destructive" });
  };

  const handleRemove = () => {
    clearCarfaxLink(dealerId || "", info.vin || unit?.vin || "");
    toast({ title: "CARFAX link removed" });
    void load();
  };

  const openModal = (replace: boolean) => { setAttachInput(replace ? (info.carfax_report_url || "") : ""); setAttachOpen(true); };

  const status = info.carfax_link_status;
  const url = info.carfax_report_url;

  return (
    <Card className="glass-panel border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center justify-between">
          <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> CARFAX Report</span>
          <Badge variant="outline" className={
            status === "attached" ? "text-primary border-primary/40"
            : status === "expired" ? "text-amber-600 border-amber-500/40"
            : "text-muted-foreground"
          }>
            {status === "attached" ? "Attached" : status === "expired" ? "Expired" : status === "missing" ? "Not attached" : "Not configured"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Checking CARFAX…</div>
        ) : (status === "attached" || status === "expired") && url ? (
          <div className="space-y-3">
            {/* CARFAX-style text badge (no official logo assets) */}
            <a
              href={url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border-2 border-foreground rounded-md px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-foreground hover:bg-foreground hover:text-background transition-colors"
            >
              <ShieldCheck className="h-4 w-4" /> View CARFAX Report
            </a>
            <p className="text-sm text-muted-foreground">CARFAX report attached.</p>
            {info.vin && <p className="text-[11px] text-muted-foreground font-mono">VIN: {info.vin}</p>}
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild variant="hero" size="sm" className="gap-2">
                <a href={url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /> Open CARFAX Report</a>
              </Button>
              {canEdit && (
                <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={() => openModal(true)}>
                  <RefreshCw className="h-3.5 w-3.5" /> Replace link
                </Button>
              )}
              {canEdit && (
                <Button variant="ghost" size="sm" className="gap-1.5 text-destructive hover:text-destructive" onClick={handleRemove}>
                  <X className="h-3.5 w-3.5" /> Remove
                </Button>
              )}
            </div>
            {info.carfax_last_checked_at && (
              <p className="text-[11px] text-muted-foreground">Attached {new Date(info.carfax_last_checked_at).toLocaleDateString()}</p>
            )}
          </div>
        ) : status === "missing" ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">CARFAX link not attached.</p>
            {canEdit && (
              <div className="flex flex-wrap items-center gap-2">
                {canGenerateCarfax(unit ?? {}, dealerId) && (
                  <Button variant="hero" size="sm" className="gap-2" onClick={handleGenerate}><RefreshCw className="h-4 w-4" /> Generate CARFAX Link</Button>
                )}
                <Button variant="outline" size="sm" className="gap-2" onClick={() => openModal(false)}><Link2 className="h-4 w-4" /> Attach link</Button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">CARFAX link reports are not configured yet.</p>
            {canEdit && (
              <div className="flex flex-wrap items-center gap-2">
                <Button asChild variant="outline" size="sm" className="gap-2">
                  <Link to="/dealer/settings"><Settings2 className="h-4 w-4" /> Set up CARFAX</Link>
                </Button>
                <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" onClick={() => openModal(false)}><Link2 className="h-4 w-4" /> Attach link</Button>
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* Attach / Replace modal */}
      <Dialog open={attachOpen} onOpenChange={setAttachOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Attach CARFAX report link</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Paste the official CARFAX report URL or the link snippet from CARFAX Link Reports.</label>
            <textarea
              value={attachInput}
              onChange={(e) => setAttachInput(e.target.value)}
              placeholder="https://www.carfax.com/VehicleHistory/p/Report.cfx?...   or   <a href=...>"
              rows={3}
              className="w-full text-xs font-mono rounded-md border border-border bg-background p-2 resize-y"
            />
            <p className="text-[11px] text-muted-foreground">Only carfax.com / carfaxonline.com links are accepted. The link opens in a new tab — nothing is executed or logged in.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setAttachOpen(false)} disabled={saving}>Cancel</Button>
            <Button size="sm" onClick={handleAttach} disabled={saving || !attachInput.trim()} className="gap-1.5">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
              {saving ? "Saving…" : "Attach link"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
