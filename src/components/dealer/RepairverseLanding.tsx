/**
 * Repairverse landing — general repair-lookup entry.
 * Enter a VIN or select a vehicle manually to pull repair procedures, labor
 * times, wiring, and specs. If the vehicle isn't ingested yet, offer to queue it.
 */
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiFetch } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Car, Loader2, Wrench } from "lucide-react";
import { toast } from "sonner";

type NF = { vin?: string; year?: string; make?: string; model?: string; engine?: string };

export default function RepairverseLanding({ onResolved }: { onResolved?: (id: number) => void }) {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const [vin, setVin] = useState(sp.get("vin") ?? "");
  const [year, setYear] = useState(sp.get("year") ?? "");
  const [make, setMake] = useState(sp.get("make") ?? "");
  const [model, setModel] = useState(sp.get("model") ?? "");
  const [engine, setEngine] = useState(sp.get("engine") ?? "");
  const [busy, setBusy] = useState(false);
  const [notFound, setNotFound] = useState<NF | null>(null);
  const [ingesting, setIngesting] = useState(false);

  // Arrived with vehicle params (e.g. from a unit's 3-dot menu)? Auto-look up.
  useEffect(() => {
    if (sp.get("vin")) void lookupVin();
    else if (sp.get("year") && sp.get("make") && sp.get("model")) void lookupManual();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function resolve(p: NF): Promise<number | null> {
    const q = new URLSearchParams();
    if (p.vin) q.set("vin", p.vin);
    if (p.year) q.set("year", p.year);
    if (p.make) q.set("make", p.make);
    if (p.model) q.set("model", p.model);
    try {
      const res = await apiFetch(`/api/v1/reconverse/repairverse/resolve-vehicle?${q.toString()}`);
      const j = await res.json().catch(() => null);
      return j?.ok ? (j.data?.vehicle_id ?? null) : null;
    } catch {
      return null;
    }
  }

  function go(id: number) {
    if (onResolved) onResolved(id);
    else navigate(`/dealer/research?vehicle_id=${id}`);
  }

  async function lookupVin() {
    const v = vin.trim().toUpperCase();
    if (v.length < 11) { toast.error("Enter a full VIN"); return; }
    setBusy(true); setNotFound(null);
    try {
      const id = await resolve({ vin: v });
      if (id) go(id); else setNotFound({ vin: v });
    } finally { setBusy(false); }
  }

  async function lookupManual() {
    if (!year.trim() || !make.trim() || !model.trim()) { toast.error("Enter year, make, and model"); return; }
    setBusy(true); setNotFound(null);
    try {
      const id = await resolve({ year: year.trim(), make: make.trim(), model: model.trim() });
      if (id) go(id); else setNotFound({ year: year.trim(), make: make.trim(), model: model.trim(), engine: engine.trim() });
    } finally { setBusy(false); }
  }

  async function ingest() {
    if (!notFound) return;
    setIngesting(true);
    try {
      const body = notFound.vin
        ? { vin: notFound.vin }
        : { year: Number(notFound.year), make: notFound.make, model: notFound.model, engine: notFound.engine || null };
      const res = await apiFetch(`/api/v1/reconverse/repairverse/ingest-queue`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const j = await res.json().catch(() => null);
      if (j?.ok) toast.success("Queued for Repairverse ingestion. Check back in a few minutes.");
      else toast.error("Couldn't queue this vehicle.");
    } catch {
      toast.error("Couldn't queue this vehicle.");
    } finally { setIngesting(false); }
  }

  const lbl = "text-xs font-medium text-muted-foreground";

  return (
    <div className="mx-auto max-w-2xl px-5 py-10">
      <div className="mb-7 text-center">
        <div className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          <Wrench className="h-3 w-3" /> Repairverse
        </div>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">Repair lookup</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter a VIN or pick a vehicle to pull procedures, labor times, wiring diagrams, and specs.
        </p>
      </div>

      <Card className="space-y-5 p-6">
        {/* VIN */}
        <div>
          <label className={lbl}>VIN</label>
          <div className="mt-1.5 flex gap-2">
            <Input
              value={vin}
              onChange={(e) => setVin(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && lookupVin()}
              maxLength={17}
              placeholder="e.g. 4T1B11HK9KU812345"
              className="font-mono"
            />
            <Button onClick={lookupVin} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              <span className="ml-1.5 hidden sm:inline">Look up</span>
            </Button>
          </div>
        </div>

        {/* divider */}
        <div className="flex items-center gap-3 text-[11px] uppercase tracking-wider text-muted-foreground">
          <div className="h-px flex-1 bg-border" /> or select manually <div className="h-px flex-1 bg-border" />
        </div>

        {/* manual */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={lbl}>Year</label>
            <Input className="mt-1.5" inputMode="numeric" value={year} onChange={(e) => setYear(e.target.value)} placeholder="2018" />
          </div>
          <div>
            <label className={lbl}>Make</label>
            <Input className="mt-1.5" value={make} onChange={(e) => setMake(e.target.value)} placeholder="Toyota" />
          </div>
          <div>
            <label className={lbl}>Model</label>
            <Input className="mt-1.5" value={model} onChange={(e) => setModel(e.target.value)} placeholder="Camry" />
          </div>
          <div>
            <label className={lbl}>Engine <span className="opacity-60">(optional)</span></label>
            <Input className="mt-1.5" value={engine} onChange={(e) => setEngine(e.target.value)} placeholder="2.5L" />
          </div>
        </div>
        <Button className="w-full" onClick={lookupManual} disabled={busy}>
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Car className="mr-2 h-4 w-4" />}
          Look up repair info
        </Button>

        {notFound && (
          <div className="rounded-lg border border-dashed p-4 text-center">
            <p className="text-sm text-muted-foreground">
              {notFound.vin ? `VIN ${notFound.vin}` : `${notFound.year} ${notFound.make} ${notFound.model}`} isn&apos;t in Repairverse yet.
            </p>
            <Button variant="outline" size="sm" className="mt-3" onClick={ingest} disabled={ingesting}>
              {ingesting ? "Queuing…" : "Ingest this vehicle"}
            </Button>
          </div>
        )}
      </Card>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        Tip: opening a unit from the Repair lane brings you straight here with its vehicle pre-filled.
      </p>
    </div>
  );
}
