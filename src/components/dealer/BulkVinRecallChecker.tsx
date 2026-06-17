import { Fragment, useCallback, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Upload, FileSpreadsheet, ShieldCheck, AlertTriangle, Download,
  RotateCcw, Loader2, CheckCircle2, ChevronDown, Save,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  checkVin, normalizeVin, vinValidation, vinValidationLabel, exportRows,
  type RecallSource, type VinRecallResult,
} from "@/lib/recalls";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useCurrentDealer } from "@/hooks/useDealerData";
import { saveRecallReport } from "@/lib/recallReports";

type Step = "upload" | "configure" | "running" | "results";
type Row = Record<string, unknown>;

// Generic spreadsheet parse (CSV + XLSX via SheetJS). No row data is logged.
async function parseSpreadsheet(file: File): Promise<{ headers: string[]; rows: Row[] }> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(new Uint8Array(buf), { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) return { headers: [], rows: [] };
  const rows = XLSX.utils.sheet_to_json<Row>(ws, { defval: "", raw: false });
  let headers: string[] = rows.length ? Object.keys(rows[0]) : [];
  if (!headers.length) {
    const aoa = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 });
    headers = (aoa[0] as string[] | undefined)?.map(String) ?? [];
  }
  return { headers, rows };
}

// Limited-concurrency pool so bulk jobs stay responsive without hammering the provider.
async function runPool<T>(items: T[], worker: (t: T, i: number) => Promise<void>, concurrency = 5) {
  let idx = 0;
  const next = async (): Promise<void> => {
    while (idx < items.length) {
      const i = idx++;
      await worker(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, next));
}

function guessVinColumn(headers: string[]): string {
  return (
    headers.find((h) => h.replace(/[^a-z]/gi, "").toLowerCase() === "vin") ||
    headers.find((h) => /vin/i.test(h)) ||
    ""
  );
}

export default function BulkVinRecallChecker({ onSaved }: { onSaved?: () => void } = {}) {
  const { toast } = useToast();
  const { data: membership } = useCurrentDealer();
  const [step, setStep] = useState<Step>("upload");
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [vinColumn, setVinColumn] = useState("");
  const [keepCols, setKeepCols] = useState<Set<string>>(new Set());
  const [source, setSource] = useState<RecallSource>("nhtsa");
  const [dragOver, setDragOver] = useState(false);
  const [parseError, setParseError] = useState("");

  // Lookup state — keyed by normalized VIN (deduplicated).
  const [resultsByVin, setResultsByVin] = useState<Map<string, VinRecallResult>>(new Map());
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const fileRef = useRef<HTMLInputElement>(null);

  // Expandable per-VIN detail + save-report flow.
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [saveOpen, setSaveOpen] = useState(false);
  const [reportName, setReportName] = useState("");
  const [saving, setSaving] = useState(false);
  const toggleExpand = (vin: string) =>
    setExpanded((prev) => { const n = new Set(prev); n.has(vin) ? n.delete(vin) : n.add(vin); return n; });

  const reset = useCallback(() => {
    setStep("upload"); setFileName(""); setHeaders([]); setRows([]);
    setVinColumn(""); setKeepCols(new Set()); setParseError("");
    setResultsByVin(new Map()); setProgress({ done: 0, total: 0 });
    setExpanded(new Set());
  }, []);

  const onFile = useCallback(async (file: File) => {
    setParseError("");
    try {
      const { headers, rows } = await parseSpreadsheet(file);
      if (!headers.length || !rows.length) { setParseError("Could not read any rows from this file."); return; }
      const vinCol = guessVinColumn(headers);
      setFileName(file.name);
      setHeaders(headers);
      setRows(rows);
      setVinColumn(vinCol);
      // Default: keep everything except the VIN column (VIN is always included).
      setKeepCols(new Set(headers.filter((h) => h !== vinCol)));
      setStep("configure");
    } catch {
      setParseError("Unsupported or corrupt file. Use .csv, .xlsx, or .xls.");
    }
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) onFile(f);
  }, [onFile]);

  // ── Derived VIN stats ──
  const vinStats = useMemo(() => {
    if (!vinColumn) return { unique: [] as string[], invalidRows: 0, totalRows: rows.length };
    const unique = new Set<string>();
    let invalidRows = 0;
    for (const r of rows) {
      const vin = normalizeVin(r[vinColumn]);
      if (vinValidation(vin) === "valid") unique.add(vin);
      else invalidRows++;
    }
    return { unique: [...unique], invalidRows, totalRows: rows.length };
  }, [rows, vinColumn]);

  // ── Run the recall check (only VINs leave the browser) ──
  const run = useCallback(async () => {
    if (!vinColumn || vinStats.unique.length === 0) return;
    setStep("running");
    const map = new Map<string, VinRecallResult>();
    setProgress({ done: 0, total: vinStats.unique.length });
    let done = 0;
    await runPool(vinStats.unique, async (vin) => {
      const res = await checkVin(vin, source); // VIN-only; never customer data
      map.set(vin, res);
      done++;
      setProgress({ done, total: vinStats.unique.length });
    }, 5);
    setResultsByVin(map);
    setStep("results");
  }, [vinColumn, vinStats.unique, source]);

  const toggleKeep = (h: string) =>
    setKeepCols((prev) => { const n = new Set(prev); n.has(h) ? n.delete(h) : n.add(h); return n; });

  // ── Build export rows (merges kept original columns back in, client-side) ──
  const buildSummary = useCallback((): Row[] => {
    return rows.map((r) => {
      const vin = normalizeVin(r[vinColumn]);
      const res = resultsByVin.get(vin);
      const kept: Row = {};
      for (const h of headers) if (keepCols.has(h)) kept[h] = r[h];
      return {
        ...kept,
        VIN: vin,
        vin_status: vinValidationLabel(vinValidation(vin)),
        decoded_year: res?.decodedYear ?? "",
        decoded_make: res?.decodedMake ?? "",
        decoded_model: res?.decodedModel ?? "",
        open_recall_count: res?.recallCount ?? "",
        recall_campaigns: res?.recalls.map((x) => x.campaignNumber).join(" | ") ?? "",
        recall_components: res?.recalls.map((x) => x.component).join(" | ") ?? "",
        recall_source: res?.source ?? "",
        lookup_error: res?.lookupError ?? "",
        checked_at: res?.checkedAt ?? "",
      };
    });
  }, [rows, headers, keepCols, vinColumn, resultsByVin]);

  const buildDetailed = useCallback((): Row[] => {
    const out: Row[] = [];
    for (const r of rows) {
      const vin = normalizeVin(r[vinColumn]);
      const res = resultsByVin.get(vin);
      const kept: Row = {};
      for (const h of headers) if (keepCols.has(h)) kept[h] = r[h];
      const baseDecode = {
        decoded_year: res?.decodedYear ?? "", decoded_make: res?.decodedMake ?? "", decoded_model: res?.decodedModel ?? "",
        open_recall_count: res?.recallCount ?? "", recall_source: res?.source ?? "", checked_at: res?.checkedAt ?? "",
      };
      if (res && res.recalls.length) {
        for (const rec of res.recalls) {
          out.push({
            ...kept, VIN: vin, vin_status: vinValidationLabel(vinValidation(vin)), ...baseDecode,
            recall_campaign_number: rec.campaignNumber, recall_component: rec.component,
            recall_summary: rec.summary, recall_consequence: rec.consequence, recall_remedy: rec.remedy,
            recall_date: rec.recallDate, recall_status: rec.status,
          });
        }
      } else {
        out.push({
          ...kept, VIN: vin, vin_status: vinValidationLabel(vinValidation(vin)), ...baseDecode,
          recall_campaign_number: "", recall_component: res?.lookupError ? "Lookup failed" : "No open recalls",
          recall_summary: "", recall_consequence: "", recall_remedy: "", recall_date: "", recall_status: "",
        });
      }
    }
    return out;
  }, [rows, headers, keepCols, vinColumn, resultsByVin]);

  const buildInvalid = useCallback((): Row[] => {
    return rows
      .filter((r) => vinValidation(normalizeVin(r[vinColumn])) !== "valid")
      .map((r) => {
        const kept: Row = {};
        for (const h of headers) if (keepCols.has(h)) kept[h] = r[h];
        const vin = normalizeVin(r[vinColumn]);
        return { ...kept, VIN: vin, vin_status: vinValidationLabel(vinValidation(vin)) };
      });
  }, [rows, headers, keepCols, vinColumn]);

  const stamp = new Date().toISOString().slice(0, 10);

  // Build + persist a saved report (preserves file, columns, results, invalid).
  const handleSaveReport = useCallback(async () => {
    setSaving(true);
    try {
      const summaryRows = buildSummary();
      const detailedRows = buildDetailed();
      const invalidRows = buildInvalid();
      const results = [...resultsByVin.values()];
      const openRecallCount = results.reduce((n, r) => n + (r.recallCount || 0), 0);
      const { persistence } = await saveRecallReport({
        name: reportName.trim() || `Bulk Recall Check - ${stamp}`,
        created_by: membership?.user_id ?? null,
        dealer_id: membership?.dealer_id ?? null,
        file_name: fileName,
        vin_count: results.length,
        open_recall_count: openRecallCount,
        kept_columns: headers.filter((h) => keepCols.has(h)),
        summary: {
          checked: results.length,
          withRecalls: results.filter((r) => r.recallCount > 0).length,
          totalRecalls: openRecallCount,
          failed: results.filter((r) => r.lookupError).length,
          invalid: invalidRows.length,
        },
        results,
        summary_rows: summaryRows,
        detailed_rows: detailedRows,
        invalid_rows: invalidRows,
      }, membership?.dealer_id);
      setSaveOpen(false);
      toast({
        title: "Report saved",
        description: persistence === "local" ? "Saved on this device — MC report endpoint pending." : undefined,
      });
      onSaved?.();
    } catch {
      toast({ title: "Couldn't save report", variant: "destructive" });
    } finally { setSaving(false); }
  }, [reportName, stamp, membership, fileName, headers, keepCols, resultsByVin, buildSummary, buildDetailed, buildInvalid, onSaved, toast]);

  // ── Results summary numbers ──
  const resultStats = useMemo(() => {
    let withRecalls = 0, totalRecalls = 0, failed = 0;
    for (const res of resultsByVin.values()) {
      if (res.lookupError) failed++;
      if (res.recallCount > 0) { withRecalls++; totalRecalls += res.recallCount; }
    }
    return { checked: resultsByVin.size, withRecalls, totalRecalls, failed };
  }, [resultsByVin]);

  return (
    <Card className="p-5 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 grid place-items-center border border-border rounded-none bg-muted shrink-0">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide">Bulk VIN Recall Checker</h3>
            <p className="text-xs text-muted-foreground mt-0.5 max-w-prose">
              Upload a CSV/Excel of VINs, check open recalls, and export a merged report.
              Only VINs are sent to the recall provider — customer columns never leave your browser.
            </p>
          </div>
        </div>
        {step !== "upload" && (
          <Button size="sm" variant="outline" onClick={reset} className="gap-1.5 shrink-0">
            <RotateCcw className="h-3.5 w-3.5" /> Start over
          </Button>
        )}
      </div>

      {/* STEP 1 — Upload */}
      {step === "upload" && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          className={cn(
            "border border-dashed rounded-none p-10 text-center cursor-pointer transition-colors",
            dragOver ? "border-foreground bg-muted" : "border-border hover:bg-muted/50",
          )}
        >
          <input
            ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }}
          />
          <Upload className="h-7 w-7 mx-auto text-muted-foreground" />
          <p className="mt-3 text-sm font-semibold">Drop a CSV or Excel file here</p>
          <p className="text-xs text-muted-foreground mt-1">or click to browse · .csv, .xlsx, .xls</p>
          {parseError && (
            <p className="mt-3 text-xs text-red-600 flex items-center justify-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" /> {parseError}
            </p>
          )}
        </div>
      )}

      {/* STEP 2 — Configure (preview + mapping + column select) */}
      {step === "configure" && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <FileSpreadsheet className="h-4 w-4" />
            <span className="font-mono text-foreground">{fileName}</span>
            <span>·</span><span>{rows.length} rows</span>
            <span>·</span><span>{headers.length} columns</span>
          </div>

          {/* Preview first rows */}
          <div className="overflow-x-auto border border-border rounded-none">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/50 border-b border-border text-left font-mono uppercase tracking-wider text-muted-foreground">
                  {headers.map((h) => (
                    <th key={h} className={cn("py-2 px-3 whitespace-nowrap", h === vinColumn && "text-foreground")}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 5).map((r, i) => (
                  <tr key={i} className="border-b border-border/40">
                    {headers.map((h) => (
                      <td key={h} className={cn("py-1.5 px-3 whitespace-nowrap max-w-[180px] truncate", h === vinColumn ? "font-mono text-foreground" : "text-muted-foreground")}>
                        {String(r[h] ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* VIN column + source */}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">VIN column</span>
              <select
                value={vinColumn}
                onChange={(e) => setVinColumn(e.target.value)}
                className="w-full h-9 text-xs font-mono bg-muted border border-border rounded-none px-2"
              >
                <option value="">— select —</option>
                {headers.map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">Recall source</span>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value as RecallSource)}
                className="w-full h-9 text-xs font-mono bg-muted border border-border rounded-none px-2"
              >
                <option value="nhtsa">Live — NHTSA (official)</option>
                <option value="mock">Demo — mock data</option>
              </select>
            </label>
          </div>

          {/* Columns to keep */}
          <div className="space-y-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">Columns to keep in export</span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {headers.map((h) => (
                <label key={h} className={cn("flex items-center gap-2 border border-border rounded-none px-2.5 py-1.5 cursor-pointer hover:bg-muted/50", h === vinColumn && "opacity-60")}>
                  <Checkbox
                    checked={h === vinColumn ? true : keepCols.has(h)}
                    disabled={h === vinColumn}
                    onCheckedChange={() => h !== vinColumn && toggleKeep(h)}
                  />
                  <span className="text-xs truncate">{h}{h === vinColumn && " (VIN — always kept)"}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Stats + run */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="outline" className="rounded-none font-mono">{vinStats.unique.length} unique VINs</Badge>
              {vinStats.invalidRows > 0 && (
                <Badge variant="outline" className="rounded-none font-mono text-amber-600 border-amber-300">{vinStats.invalidRows} invalid rows</Badge>
              )}
            </div>
            <Button onClick={run} disabled={!vinColumn || vinStats.unique.length === 0} className="gap-1.5">
              <ShieldCheck className="h-4 w-4" /> Run recall check
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3 — Running */}
      {step === "running" && (
        <div className="py-8 space-y-4 text-center">
          <Loader2 className="h-7 w-7 mx-auto animate-spin text-muted-foreground" />
          <p className="text-sm font-semibold">Checking recalls…</p>
          <div className="max-w-sm mx-auto space-y-2">
            <Progress value={progress.total ? (progress.done / progress.total) * 100 : 0} />
            <p className="text-xs font-mono text-muted-foreground tabular-nums">{progress.done} / {progress.total} VINs</p>
          </div>
        </div>
      )}

      {/* STEP 4 — Results */}
      {step === "results" && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="VINs checked" value={resultStats.checked} />
            <Stat label="With open recalls" value={resultStats.withRecalls} accent={resultStats.withRecalls ? "text-red-600" : undefined} />
            <Stat label="Total recalls" value={resultStats.totalRecalls} />
            <Stat label="Invalid / failed" value={vinStats.invalidRows + resultStats.failed} accent={(vinStats.invalidRows + resultStats.failed) ? "text-amber-600" : undefined} />
          </div>

          <div className="overflow-x-auto border border-border rounded-none max-h-[420px] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0">
                <tr className="bg-muted border-b border-border text-left font-mono uppercase tracking-wider text-muted-foreground">
                  <th className="py-2 px-2 w-8"></th>
                  <th className="py-2 px-3">VIN</th>
                  <th className="py-2 px-3">Year/Make/Model</th>
                  <th className="py-2 px-3 text-center">Recalls</th>
                  <th className="py-2 px-3">Top component</th>
                  <th className="py-2 px-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {[...resultsByVin.values()].map((res) => {
                  const isOpen = expanded.has(res.vin);
                  const hasDetail = res.recalls.length > 0;
                  return (
                    <Fragment key={res.vin}>
                      <tr
                        className={cn("border-b border-border/40", hasDetail && "cursor-pointer hover:bg-muted/40")}
                        onClick={() => hasDetail && toggleExpand(res.vin)}
                      >
                        <td className="py-1.5 px-2 text-center text-muted-foreground">
                          {hasDetail && <ChevronDown className={cn("h-3.5 w-3.5 transition-transform inline", isOpen && "rotate-180")} />}
                        </td>
                        <td className="py-1.5 px-3 font-mono">{res.vin}</td>
                        <td className="py-1.5 px-3 text-muted-foreground">{[res.decodedYear, res.decodedMake, res.decodedModel].filter(Boolean).join(" ") || "—"}</td>
                        <td className="py-1.5 px-3 text-center font-mono">
                          {res.lookupError ? "—" : (
                            <span className={cn("font-bold", res.recallCount > 0 ? "text-red-600" : "text-emerald-600")}>{res.recallCount}</span>
                          )}
                        </td>
                        <td className="py-1.5 px-3 text-muted-foreground truncate max-w-[260px]">{res.recalls[0]?.component ?? (res.lookupError ? "—" : "No open recalls")}</td>
                        <td className="py-1.5 px-3">
                          {res.lookupError
                            ? <span className="text-amber-600 inline-flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Failed</span>
                            : res.recallCount > 0
                              ? <span className="text-red-600">Open</span>
                              : <span className="text-emerald-600 inline-flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Clear</span>}
                        </td>
                      </tr>
                      {isOpen && hasDetail && (
                        <tr key={`${res.vin}-detail`} className="border-b border-border/40 bg-muted/20">
                          <td />
                          <td colSpan={5} className="py-3 px-3">
                            <div className="space-y-2">
                              {res.recalls.map((rc, i) => (
                                <div key={i} className="border border-border rounded-none p-3 space-y-1.5 bg-background">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-mono text-xs font-bold">{rc.campaignNumber || "—"}</span>
                                    {rc.recallDate && <span className="text-[11px] text-muted-foreground">· {rc.recallDate}</span>}
                                    {rc.status && <Badge variant="outline" className="rounded-none text-[10px]">{rc.status}</Badge>}
                                    {rc.source && <span className="text-[10px] text-muted-foreground ml-auto">{rc.source}</span>}
                                  </div>
                                  <p className="text-xs font-semibold">{rc.component || "—"}</p>
                                  {rc.summary && <Detail label="Summary" text={rc.summary} />}
                                  {rc.consequence && <Detail label="Consequence" text={rc.consequence} />}
                                  {rc.remedy && <Detail label="Remedy" text={rc.remedy} />}
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2 border-t pt-4">
            <Button size="sm" className="gap-1.5" onClick={() => { setReportName(`Bulk Recall Check - ${stamp}`); setSaveOpen(true); }}>
              <Save className="h-3.5 w-3.5" /> Save Report
            </Button>
            <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground mx-1">Export</span>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => exportRows(buildSummary(), `recall-summary-${stamp}`, "xlsx")}>
              <Download className="h-3.5 w-3.5" /> Summary (XLSX)
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => exportRows(buildSummary(), `recall-summary-${stamp}`, "csv")}>
              <Download className="h-3.5 w-3.5" /> Summary (CSV)
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => exportRows(buildDetailed(), `recall-detailed-${stamp}`, "xlsx")}>
              <Download className="h-3.5 w-3.5" /> Detailed (XLSX)
            </Button>
            {vinStats.invalidRows > 0 && (
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => exportRows(buildInvalid(), `recall-invalid-vins-${stamp}`, "csv")}>
                <Download className="h-3.5 w-3.5" /> Invalid VINs (CSV)
              </Button>
            )}
            <Button size="sm" variant="ghost" className="gap-1.5 ml-auto" onClick={reset}>
              <RotateCcw className="h-3.5 w-3.5" /> Start Over
            </Button>
          </div>
        </div>
      )}

      {/* Save report dialog */}
      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save recall report</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Report name</label>
            <Input value={reportName} onChange={(e) => setReportName(e.target.value)} placeholder={`Bulk Recall Check - ${stamp}`} />
            <p className="text-[11px] text-muted-foreground">
              Saves the checked VINs, recall results, kept columns, invalid VINs, and summary counts.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setSaveOpen(false)} disabled={saving}>Cancel</Button>
            <Button size="sm" onClick={handleSaveReport} disabled={saving} className="gap-1.5">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              {saving ? "Saving…" : "Save Report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function Detail({ label, text }: { label: string; text: string }) {
  return (
    <p className="text-[11px] leading-relaxed">
      <span className="font-mono uppercase tracking-wider text-muted-foreground">{label}: </span>
      <span className="text-foreground">{text}</span>
    </p>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="border border-border rounded-none p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn("text-xl font-bold font-mono tabular-nums mt-1", accent)}>{value}</p>
    </div>
  );
}
