import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  ShieldCheck, ExternalLink, Link2, RefreshCw, X, Settings2, Loader2,
  AlertTriangle, CheckCircle2, ChevronDown, ChevronRight,
} from "lucide-react";
import {
  resolveCarfax, canGenerateCarfax, generateCarfaxLink,
  attachCarfaxLink, clearCarfaxLink, extractCarfaxUrl, patchUnitCarfax,
} from "@/lib/carfax";
import {
  getUnitChecks, runUnitChecks, EMPTY_CHECKS,
  type UnitChecks, type UnitRecallRecord,
} from "@/lib/unitChecks";
import { canEditUnits } from "@/lib/permissions";

interface Props {
  unit: { id?: string; vin?: string | null };
  unitId?: string;
  dealerId?: string;
  role?: string;
}

export default function CarfaxCard({ unit, unitId, dealerId, role }: Props) {
  const { toast } = useToast();
  const id = unitId || unit?.id || "";
  const canEdit = canEditUnits(role);

  const [checks, setChecks] = useState<UnitChecks>(EMPTY_CHECKS);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [attachInput, setAttachInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    let next: UnitChecks | null = id ? await getUnitChecks(id) : null;
    if (!next) {
      // MC checks not available yet → show local CARFAX, recalls "not checked".
      const cf = resolveCarfax(unit ?? {}, dealerId);
      next = {
        ...EMPTY_CHECKS,
        carfax_status: cf.carfax_report_url ? "available"
          : cf.carfax_link_status === "not_configured" ? "provider_not_configured" : "available_not_attached",
        carfax_report_url: cf.carfax_report_url,
        carfax_last_checked_at: cf.carfax_last_checked_at,
      };
    }
    setChecks(next);
    setLoading(false);
  }, [unit, dealerId, id]);

  useEffect(() => { void load(); }, [load]);

  const runChecks = useCallback(async () => {
    setRunning(true);
    try {
      const result = await runUnitChecks({ id, vin: unit?.vin ?? null }, dealerId);
      setChecks(result);
      toast({ title: "Checks updated", description: result.open_recall_summary || undefined });
    } catch {
      toast({ title: "Check failed", description: "Couldn't run CARFAX / recall checks.", variant: "destructive" });
    } finally { setRunning(false); }
  }, [id, unit, dealerId, toast]);

  const handleAttach = useCallback(async () => {
    const { url, error } = extractCarfaxUrl(attachInput);
    if (error || !url) { toast({ title: "Couldn't attach link", description: error || "Invalid link", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const where = id ? await patchUnitCarfax(id, url, "view_report") : "local";
      if (where === "local") attachCarfaxLink(dealerId || "", unit?.vin || "", url);
      setAttachOpen(false); setAttachInput("");
      toast({ title: "CARFAX report attached", description: where === "local" ? "Saved on this device — MC endpoint pending." : undefined });
      await load();
    } catch {
      toast({ title: "Couldn't attach link", variant: "destructive" });
    } finally { setSaving(false); }
  }, [attachInput, id, dealerId, unit, toast, load]);

  const handleGenerate = () => {
    const url = generateCarfaxLink(dealerId || "", unit?.vin || "");
    if (url) { toast({ title: "CARFAX link generated" }); void load(); }
    else toast({ title: "Couldn't generate link", description: "Check the VIN and your CARFAX setup in Settings.", variant: "destructive" });
  };

  const handleRemove = () => {
    clearCarfaxLink(dealerId || "", unit?.vin || "");
    toast({ title: "CARFAX link removed" });
    void load();
  };

  const openModal = (replace: boolean) => { setAttachInput(replace ? (checks.carfax_report_url || "") : ""); setAttachOpen(true); };

  const carfaxStatus = checks.carfax_status;
  const url = checks.carfax_report_url;
  const recallStatus = checks.recall_status;
  const openCount = checks.open_recall_count;
  const recalls = checks.recalls || [];

  return (
    <Card className="glass-panel border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center justify-between gap-2 flex-wrap">
          <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> Vehicle History &amp; Recalls</span>
          <div className="flex items-center gap-2">
            {canEdit && (
              <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs text-muted-foreground" onClick={runChecks} disabled={running}>
                {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                {running ? "Checking…" : "Run check again"}
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading checks…</div>
        ) : (
          <>
            {/* ── CARFAX ───────────────────────────────────────────── */}
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">CARFAX</span>
                <CarfaxStatusBadge status={carfaxStatus} hasUrl={!!url} />
              </div>
              {url ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button asChild variant="hero" size="sm" className="gap-2">
                      <a href={url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /> Open CARFAX Report</a>
                    </Button>
                    {canEdit && <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={() => openModal(true)}><RefreshCw className="h-3.5 w-3.5" /> Replace</Button>}
                    {canEdit && <Button variant="ghost" size="sm" className="gap-1.5 text-destructive hover:text-destructive" onClick={handleRemove}><X className="h-3.5 w-3.5" /> Remove</Button>}
                  </div>
                  {checks.carfax_last_checked_at && <p className="text-[11px] text-muted-foreground">Last checked {new Date(checks.carfax_last_checked_at).toLocaleString()}</p>}
                </div>
              ) : carfaxStatus === "provider_not_configured" ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">CARFAX provider not configured.</p>
                  {canEdit && (
                    <div className="flex flex-wrap items-center gap-2">
                      <Button asChild variant="outline" size="sm" className="gap-2"><Link to="/dealer/settings"><Settings2 className="h-4 w-4" /> Set up CARFAX</Link></Button>
                      <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" onClick={() => openModal(false)}><Link2 className="h-4 w-4" /> Attach link</Button>
                    </div>
                  )}
                </div>
              ) : carfaxStatus === "failed" ? (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-red-500">CARFAX check failed.</span>
                  {canEdit && <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={runChecks} disabled={running}><RefreshCw className="h-3.5 w-3.5" /> Retry</Button>}
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">No CARFAX report attached.</p>
                  {canEdit && (
                    <div className="flex flex-wrap items-center gap-2">
                      {canGenerateCarfax(unit ?? {}, dealerId) && <Button variant="hero" size="sm" className="gap-2" onClick={handleGenerate}><RefreshCw className="h-4 w-4" /> Generate link</Button>}
                      <Button variant="outline" size="sm" className="gap-2" onClick={() => openModal(false)}><Link2 className="h-4 w-4" /> Attach link</Button>
                    </div>
                  )}
                </div>
              )}
            </section>

            <div className="border-t border-border/50" />

            {/* ── Open recalls ─────────────────────────────────────── */}
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Open Recalls</span>
                {checks.open_recall_last_checked_at && (
                  <span className="text-[11px] text-muted-foreground">Checked {new Date(checks.open_recall_last_checked_at).toLocaleDateString()}</span>
                )}
              </div>

              {recallStatus === "not_checked" ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  Recalls not checked yet.
                  {canEdit && <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={runChecks} disabled={running}><RefreshCw className="h-3.5 w-3.5" /> Run check</Button>}
                </div>
              ) : recallStatus === "failed" ? (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-red-500">Recall check failed.</span>
                  {canEdit && <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={runChecks} disabled={running}><RefreshCw className="h-3.5 w-3.5" /> Retry</Button>}
                </div>
              ) : openCount > 0 ? (
                <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2">
                  <div className="flex items-center gap-2 text-red-500 font-semibold text-sm">
                    <AlertTriangle className="h-4 w-4" /> Open Recalls: {openCount}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle2 className="h-4 w-4" /> Open Recalls: 0
                </div>
              )}

              {/* Unconfirmed campaigns note */}
              {recallStatus === "recalls_unconfirmed" && recalls.length > 0 && (
                <p className="text-[11px] text-amber-600">
                  {recalls.length} recall campaign{recalls.length === 1 ? "" : "s"} on file for this year/make/model — per-VIN completion not confirmed, so not counted as open.
                </p>
              )}

              {/* Expandable campaign details */}
              {recalls.length > 0 && (
                <div>
                  <button
                    type="button"
                    onClick={() => setShowDetails((s) => !s)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    {showDetails ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                    {showDetails ? "Hide" : "Show"} campaign details ({recalls.length})
                  </button>
                  {showDetails && (
                    <ul className="mt-2 space-y-2">
                      {recalls.map((r, i) => <RecallRow key={r.id ?? i} r={r} />)}
                    </ul>
                  )}
                </div>
              )}
            </section>
          </>
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

function CarfaxStatusBadge({ status, hasUrl }: { status: string; hasUrl: boolean }) {
  const label = hasUrl ? "Available"
    : status === "provider_not_configured" ? "Not configured"
    : status === "failed" ? "Failed"
    : status === "checking" ? "Checking…"
    : "Not attached";
  const cls = hasUrl ? "text-primary border-primary/40"
    : status === "failed" ? "text-red-500 border-red-500/40"
    : "text-muted-foreground";
  return <Badge variant="outline" className={cls}>{label}</Badge>;
}

function RecallRow({ r }: { r: UnitRecallRecord }) {
  const open = r.repair_complete === false;
  const completed = r.repair_complete === true;
  return (
    <li className="rounded-md border border-border/60 px-2.5 py-2 text-xs space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-foreground">{r.campaign_id || r.nhtsa_campaign_id || "—"}</span>
        <span className={open ? "text-red-500 font-semibold" : completed ? "text-green-600" : "text-muted-foreground"}>
          {open ? "OPEN" : completed ? "Completed" : "Unknown"}
        </span>
      </div>
      {r.description && <p className="text-muted-foreground leading-snug">{r.description}</p>}
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground/80">
        {r.source && <span>Source: {r.source}</span>}
        {r.campaign_start && <span>Campaign: {r.campaign_start}</span>}
        {r.remedy_available && <span>Remedy available</span>}
        {r.stop_sale && <span className="text-red-500">Stop sale</span>}
        {r.parts_restriction && <span className="text-amber-600">Parts restriction</span>}
      </div>
    </li>
  );
}
