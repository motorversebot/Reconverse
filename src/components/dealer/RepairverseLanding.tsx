/**
 * Repairverse landing — general repair-lookup entry.
 * Enter a VIN, or pick from the vehicles already in Repairverse (Make → Model →
 * Year). If a VIN isn't ingested yet, offer to queue it.
 */
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiFetch } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Loader2, Wrench } from "lucide-react";
import { toast } from "sonner";

type AvailVeh = { id: number | string; year: number; make: string; model: string; engine: string | null };

export default function RepairverseLanding({ onResolved }: { onResolved?: (id: number) => void }) {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const [vin, setVin] = useState(sp.get("vin") ?? "");
  const [busy, setBusy] = useState(false);
  const [notFoundVin, setNotFoundVin] = useState<string | null>(null);
  const [ingesting, setIngesting] = useState(false);

  // Vehicles already in Repairverse (for the picker)
  const [vehicles, setVehicles] = useState<AvailVeh[]>([]);
  const [makeSel, setMakeSel] = useState("");
  const [modelSel, setModelSel] = useState("");

  useEffect(() => {
    apiFetch("/api/v1/reconverse/repairverse/vehicles")
      .then((r) => r.json())
      .then((j) => { if (j?.ok) setVehicles(j.data?.vehicles ?? []); })
      .catch(() => {});
  }, []);

  // Arrived with vehicle params (e.g. from a unit's 3-dot menu)? Auto-resolve.
  useEffect(() => {
    if (sp.get("vin")) void lookupVin(sp.get("vin")!);
    else if (sp.get("year") && sp.get("make") && sp.get("model")) {
      void resolveAndGo({ year: sp.get("year")!, make: sp.get("make")!, model: sp.get("model")! });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function go(id: number | string) {
    const n = Number(id);
    if (onResolved) onResolved(n);
    else navigate(`/dealer/research?vehicle_id=${n}`);
  }

  async function resolveAndGo(p: { vin?: string; year?: string; make?: string; model?: string }): Promise<number | null> {
    const q = new URLSearchParams();
    if (p.vin) q.set("vin", p.vin);
    if (p.year) q.set("year", p.year);
    if (p.make) q.set("make", p.make);
    if (p.model) q.set("model", p.model);
    try {
      const res = await apiFetch(`/api/v1/reconverse/repairverse/resolve-vehicle?${q.toString()}`);
      const j = await res.json().catch(() => null);
      const id = j?.ok ? (j.data?.vehicle_id ?? null) : null;
      if (id) go(id);
      return id;
    } catch { return null; }
  }

  async function lookupVin(vinArg?: string) {
    const v = (vinArg ?? vin).trim().toUpperCase();
    if (v.length < 11) { toast.error("Enter a full VIN"); return; }
    setBusy(true); setNotFoundVin(null);
    try {
      const id = await resolveAndGo({ vin: v });
      if (!id) setNotFoundVin(v);
    } finally { setBusy(false); }
  }

  async function ingest() {
    if (!notFoundVin) return;
    setIngesting(true);
    try {
      const res = await apiFetch(`/api/v1/reconverse/repairverse/ingest-queue`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ vin: notFoundVin }),
      });
      const j = await res.json().catch(() => null);
      if (j?.ok) toast.success("Queued for Repairverse ingestion. Check back in a few minutes.");
      else toast.error("Couldn't queue this vehicle.");
    } catch { toast.error("Couldn't queue this vehicle."); }
    finally { setIngesting(false); }
  }

  const makes = [...new Set(vehicles.map((v) => v.make))].sort();
  const models = [...new Set(vehicles.filter((v) => v.make === makeSel).map((v) => v.model))].sort();
  const variants = vehicles
    .filter((v) => v.make === makeSel && v.model === modelSel)
    .sort((a, b) => b.year - a.year);

  const lbl = "text-xs font-medium text-muted-foreground";

  return (
    <div className="mx-auto max-w-2xl px-5 py-10">
      <div className="mb-7 text-center">
        <div className="inline-flex items-center gap-2">
          <span style={{ width: 30, height: 30, borderRadius: 9, display: "inline-flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(150deg,#5f9a0c,#4c7d09)", color: "#fff", boxShadow: "0 1px 2px rgba(15,23,42,.14)" }}>
            <Wrench className="h-4 w-4" />
          </span>
          <span style={{ fontFamily: "'IBM Plex Sans',system-ui,sans-serif", fontWeight: 700, fontSize: 16, letterSpacing: "-.3px" }}>Repairverse</span>
        </div>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight" style={{ fontFamily: "'IBM Plex Sans',system-ui,sans-serif" }}>Repair lookup</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter a VIN, or pick a vehicle to pull procedures, labor times, wiring diagrams, and specs.
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
            <Button onClick={() => lookupVin()} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              <span className="ml-1.5 hidden sm:inline">Look up</span>
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3 text-[11px] uppercase tracking-wider text-muted-foreground">
          <div className="h-px flex-1 bg-border" /> or pick a vehicle <div className="h-px flex-1 bg-border" />
        </div>

        {/* Pick from vehicles already in Repairverse */}
        {makes.length === 0 ? (
          <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
            No vehicles ingested into Repairverse yet — use the VIN lookup above to add one.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className={lbl}>Make</label>
              <Select value={makeSel} onValueChange={(v) => { setMakeSel(v); setModelSel(""); }}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Make" /></SelectTrigger>
                <SelectContent>
                  {makes.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className={lbl}>Model</label>
              <Select value={modelSel} onValueChange={setModelSel} disabled={!makeSel}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Model" /></SelectTrigger>
                <SelectContent>
                  {models.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className={lbl}>Year</label>
              <Select value="" onValueChange={(id) => go(id)} disabled={!modelSel}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Year" /></SelectTrigger>
                <SelectContent>
                  {variants.map((v) => (
                    <SelectItem key={v.id} value={String(v.id)}>
                      {v.year}{v.engine ? ` · ${v.engine}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {notFoundVin && (
          <div className="rounded-lg border border-dashed p-4 text-center">
            <p className="text-sm text-muted-foreground">VIN {notFoundVin} isn&apos;t in Repairverse yet.</p>
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
