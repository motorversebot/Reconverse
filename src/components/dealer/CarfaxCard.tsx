import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, ExternalLink, Link2, RefreshCw, X, Settings2 } from "lucide-react";
import {
  resolveCarfax, canGenerateCarfax, generateCarfaxLink,
  attachCarfaxLink, clearCarfaxLink,
} from "@/lib/carfax";
import { canEditUnits } from "@/lib/permissions";

interface Props {
  unit: { vin?: string | null };
  dealerId?: string;
  role?: string;
}

export default function CarfaxCard({ unit, dealerId, role }: Props) {
  const { toast } = useToast();
  const [version, setVersion] = useState(0); // bump to re-resolve after writes
  const [attaching, setAttaching] = useState(false);
  const [urlInput, setUrlInput] = useState("");

  const canEdit = canEditUnits(role);
  const info = useMemo(() => resolveCarfax(unit, dealerId), [unit, dealerId, version]);
  const canGen = useMemo(() => canGenerateCarfax(unit, dealerId), [unit, dealerId, version]);
  const refresh = () => setVersion((v) => v + 1);

  const handleGenerate = () => {
    const url = generateCarfaxLink(dealerId || "", unit.vin || "");
    if (url) { toast({ title: "CARFAX link generated" }); refresh(); }
    else toast({ title: "Couldn't generate link", description: "Check the VIN and your CARFAX setup in Settings.", variant: "destructive" });
  };

  const handleAttach = () => {
    const u = urlInput.trim();
    if (!u) return;
    attachCarfaxLink(dealerId || "", unit.vin || "", u);
    setAttaching(false); setUrlInput("");
    toast({ title: "CARFAX link attached" });
    refresh();
  };

  const handleRemove = () => {
    clearCarfaxLink(dealerId || "", unit.vin || "");
    toast({ title: "CARFAX link removed" });
    refresh();
  };

  const statusBadge = () => {
    switch (info.carfax_link_status) {
      case "available": return <Badge variant="outline" className="text-primary border-primary/40">Linked</Badge>;
      case "expired": return <Badge variant="outline" className="text-amber-600 border-amber-500/40">Expired</Badge>;
      case "missing": return <Badge variant="outline" className="text-muted-foreground">Not attached</Badge>;
      default: return <Badge variant="outline" className="text-muted-foreground">Not configured</Badge>;
    }
  };

  return (
    <Card className="glass-panel border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center justify-between">
          <span className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            CARFAX Report
          </span>
          {statusBadge()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Available / expired → open report */}
        {info.carfax_report_url && (info.carfax_link_status === "available" || info.carfax_link_status === "expired") && (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild variant="hero" size="sm" className="gap-2">
                <a href={info.carfax_report_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" /> Open CARFAX Report
                </a>
              </Button>
              {canEdit && canGen && (
                <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={handleGenerate} title="Regenerate from template">
                  <RefreshCw className="h-3.5 w-3.5" /> Regenerate
                </Button>
              )}
              {canEdit && (
                <Button variant="ghost" size="sm" className="gap-1.5 text-destructive hover:text-destructive" onClick={handleRemove}>
                  <X className="h-3.5 w-3.5" /> Remove
                </Button>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground break-all">{info.carfax_report_url}</p>
            {info.carfax_last_checked_at && (
              <p className="text-[11px] text-muted-foreground">
                Last updated {new Date(info.carfax_last_checked_at).toLocaleDateString()}
              </p>
            )}
          </div>
        )}

        {/* Missing → not attached; offer generate / attach */}
        {info.carfax_link_status === "missing" && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">CARFAX link not attached.</p>
            {canEdit && (
              <div className="flex flex-wrap items-center gap-2">
                {canGen && (
                  <Button variant="hero" size="sm" className="gap-2" onClick={handleGenerate}>
                    <RefreshCw className="h-4 w-4" /> Generate CARFAX Link
                  </Button>
                )}
                <Button variant="outline" size="sm" className="gap-2" onClick={() => setAttaching((a) => !a)}>
                  <Link2 className="h-4 w-4" /> Attach link
                </Button>
              </div>
            )}
            {!canGen && canEdit && (
              <p className="text-[11px] text-muted-foreground">Add a valid 17-character VIN to auto-generate, or attach a link manually.</p>
            )}
          </div>
        )}

        {/* Not configured → point to Settings */}
        {info.carfax_link_status === "not_configured" && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">CARFAX isn't set up yet.</p>
            {canEdit && (
              <div className="flex flex-wrap items-center gap-2">
                <Button asChild variant="outline" size="sm" className="gap-2">
                  <Link to="/dealer/settings"><Settings2 className="h-4 w-4" /> Set up CARFAX</Link>
                </Button>
                <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" onClick={() => setAttaching((a) => !a)}>
                  <Link2 className="h-4 w-4" /> Attach link
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Manual attach input */}
        {attaching && canEdit && (
          <div className="flex items-center gap-2 pt-1">
            <Input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="Paste CARFAX report URL"
              className="text-xs"
            />
            <Button size="sm" onClick={handleAttach} disabled={!urlInput.trim()}>Save</Button>
            <Button size="sm" variant="ghost" onClick={() => { setAttaching(false); setUrlInput(""); }}>Cancel</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
