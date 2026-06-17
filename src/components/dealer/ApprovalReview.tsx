import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, XCircle, Undo2, Camera, AlertTriangle } from "lucide-react";
import { canAdvanceStage } from "@/lib/permissions";
import {
  getSubmittedEstimate, approveEstimate, declineEstimate, sendBackEstimate,
  type SubmittedEstimate,
} from "@/lib/approval";

interface Props {
  unitId: string;
  dealerId?: string;
  unit?: any;
  role?: string;
  onMoved?: () => void;
}

const money = (n: unknown) => `$${(Number(n) || 0).toFixed(2)}`;

const STATUS_BADGE: Record<string, string> = {
  submitted: "text-primary border-primary/40",
  approved: "text-green-600 border-green-500/40",
  declined: "text-red-500 border-red-500/40",
  sent_back: "text-amber-600 border-amber-500/40",
  draft: "text-muted-foreground",
};

export default function ApprovalReview({ unitId, role, onMoved }: Props) {
  const { toast } = useToast();
  const canDecide = canAdvanceStage(role);

  const [data, setData] = useState<SubmittedEstimate | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<null | "decline" | "send_back">(null);
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setData(await getSubmittedEstimate(unitId));
    setLoading(false);
  }, [unitId]);

  useEffect(() => { void load(); }, [load]);

  const lines = data?.items ?? [];
  const missingPrice = lines.filter((l) => l.status === "needs_pricing").length;
  const noLines = lines.length === 0;
  const approveBlockReason = noLines ? "Estimate has no lines"
    : missingPrice > 0 ? `${missingPrice} line${missingPrice === 1 ? "" : "s"} missing price` : null;

  const doApprove = async () => {
    setBusy(true);
    try {
      const r = await approveEstimate(unitId);
      if (r.ok) { toast({ title: "Estimate approved", description: "Moved to Repair." }); onMoved?.(); await load(); }
      else toast({ title: "Can't approve", description: r.message, variant: "destructive" });
    } finally { setBusy(false); }
  };

  const submitReason = async () => {
    if (!reason.trim()) return;
    setBusy(true);
    try {
      const r = mode === "decline" ? await declineEstimate(unitId, reason.trim()) : await sendBackEstimate(unitId, reason.trim());
      if (r.ok) {
        toast({ title: mode === "decline" ? "Estimate declined" : "Sent back to Estimate" });
        setMode(null); setReason("");
        if (mode === "send_back") onMoved?.();
        await load();
      } else toast({ title: "Couldn't submit", description: r.message, variant: "destructive" });
    } finally { setBusy(false); }
  };

  if (loading) {
    return <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center"><Loader2 className="h-4 w-4 animate-spin" /> Loading estimate…</div>;
  }
  if (!data) {
    return (
      <Card className="glass-panel border-border">
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Approval is being set up, or no estimate has been submitted yet.
        </CardContent>
      </Card>
    );
  }

  const u = data.unit;
  const vehicle = [u.year, u.make, u.model].filter(Boolean).join(" ") || "Unit";
  const decided = data.estimate_status === "approved" || data.estimate_status === "declined";

  return (
    <div className="space-y-3">
      {/* Submitted-estimate header */}
      <Card className="glass-panel border-border">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <p className="text-sm font-semibold text-foreground">{vehicle}</p>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground mt-0.5">
                {u.vin && <span className="font-mono break-all">VIN {u.vin}</span>}
                <span>Stock #{u.stock_number || "—"}</span>
                <span>RO #{u.repair_order_number || "—"}</span>
                {u.promise_date && <span>Promise {u.promise_date}</span>}
              </div>
            </div>
            <Badge variant="outline" className={`text-[10px] uppercase ${STATUS_BADGE[data.estimate_status] || STATUS_BADGE.draft}`}>
              {data.estimate_status.replace("_", " ")}
            </Badge>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <Stat label="Labor total" value={money(data.summary.labor_total)} />
            <Stat label="Parts total" value={money(data.summary.parts_total)} />
            <Stat label="Grand total" value={money(data.summary.grand_total)} strong />
            <Stat label="Lines" value={String(lines.length)} />
          </div>
          <div className="text-[11px] text-muted-foreground">
            {data.submitted_by ? `Submitted by ${data.submitted_by}` : "Submitted"}
            {data.submitted_at ? ` · ${new Date(data.submitted_at).toLocaleString()}` : ""}
          </div>
        </CardContent>
      </Card>

      {/* Line review (read-only) */}
      {noLines ? (
        <Card className="glass-panel border-border"><CardContent className="py-8 text-center text-sm text-muted-foreground">No estimate lines submitted.</CardContent></Card>
      ) : lines.map((l) => (
        <Card key={l.id} className="glass-panel border-border">
          <CardContent className="p-3 space-y-1.5">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold text-foreground">{l.concern}</p>
              <Badge variant="outline" className={`text-[10px] uppercase ${l.status === "needs_pricing" ? "text-amber-600 border-amber-500/40" : "text-muted-foreground"}`}>
                {l.status.replace("_", " ")}
              </Badge>
            </div>
            {l.notes && <p className="text-xs text-muted-foreground">{l.notes}</p>}
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Camera className="h-3.5 w-3.5" />{l.photo_count > 0 ? `${l.photo_count} photo${l.photo_count === 1 ? "" : "s"}` : "No photos"}
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-xs pt-1">
              <Cell label="Labor hrs" value={String(l.labor_hours)} />
              <Cell label="Rate" value={money(l.labor_rate)} />
              <Cell label="Labor" value={money(l.labor_hours * l.labor_rate)} />
              <Cell label="Parts" value={money(l.parts_cost)} />
              <Cell label="Parts desc" value={l.parts_description || "—"} />
              <Cell label="Line total" value={money(l.line_total)} strong />
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Decision summary */}
      <Card className="glass-panel border-border">
        <CardContent className="py-3 px-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <Stat label="Labor total" value={money(data.summary.labor_total)} />
          <Stat label="Parts total" value={money(data.summary.parts_total)} />
          <Stat label="Grand total" value={money(data.summary.grand_total)} strong />
          <Stat label="Decision" value={data.estimate_status.replace("_", " ")} />
        </CardContent>
      </Card>

      {/* Prior decision note */}
      {data.decision_note && (
        <div className="text-xs rounded-md border border-border bg-muted/30 px-3 py-2">
          <span className="font-semibold">{data.estimate_status === "declined" ? "Decline" : "Send-back"} note:</span> {data.decision_note}
          {data.decided_by ? ` — ${data.decided_by}` : ""}
        </div>
      )}

      {/* Actions */}
      {canDecide && !decided && (
        <div className="space-y-2">
          {mode === null ? (
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <Button onClick={doApprove} disabled={busy || !!approveBlockReason} className="gap-2 min-h-[44px] flex-1">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Approve Estimate
              </Button>
              <Button variant="outline" onClick={() => { setMode("send_back"); setReason(""); }} disabled={busy} className="gap-2 min-h-[44px] flex-1">
                <Undo2 className="h-4 w-4" /> Send Back
              </Button>
              <Button variant="outline" onClick={() => { setMode("decline"); setReason(""); }} disabled={busy} className="gap-2 min-h-[44px] flex-1 text-red-500 hover:text-red-500">
                <XCircle className="h-4 w-4" /> Decline
              </Button>
            </div>
          ) : (
            <div className="rounded-md border border-border bg-muted/20 p-3 space-y-2">
              <p className="text-xs font-semibold">{mode === "decline" ? "Decline reason" : "Send-back reason"} <span className="text-red-500">*</span></p>
              <textarea
                value={reason} onChange={(e) => setReason(e.target.value)} rows={3} autoFocus
                placeholder={mode === "decline" ? "Why is this estimate declined?" : "What needs correcting?"}
                className="w-full text-xs rounded-md border border-border bg-background p-2 resize-y"
              />
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={() => { setMode(null); setReason(""); }} disabled={busy}>Cancel</Button>
                <Button size="sm" onClick={submitReason} disabled={busy || !reason.trim()} className="gap-1.5">
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  {mode === "decline" ? "Confirm Decline" : "Confirm Send Back"}
                </Button>
              </div>
              {!reason.trim() && <p className="text-[11px] text-amber-600">{mode === "decline" ? "Decline reason required" : "Send-back reason required"}</p>}
            </div>
          )}
          {mode === null && approveBlockReason && (
            <p className="text-xs text-amber-600 flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5" /> {approveBlockReason} — fix in Estimate before approving.</p>
          )}
        </div>
      )}

      {decided && (
        <div className={`text-sm font-semibold flex items-center gap-2 ${data.estimate_status === "approved" ? "text-green-600" : "text-red-500"}`}>
          {data.estimate_status === "approved" ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          Estimate {data.estimate_status}{data.decided_by ? ` by ${data.decided_by}` : ""}.
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`${strong ? "text-base font-bold" : "text-sm font-semibold"} text-foreground capitalize`}>{value}</p>
    </div>
  );
}

function Cell({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`truncate ${strong ? "font-bold text-foreground" : "text-muted-foreground"}`}>{value}</p>
    </div>
  );
}
