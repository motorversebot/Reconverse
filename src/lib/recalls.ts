// Bulk VIN Recall Checker — service wrapper.
//
// PRIVACY: only VINs (and the NHTSA-decoded year/make/model) ever leave the
// browser to a recall provider. Customer / contact columns from the uploaded
// file stay in component state and are only merged back into the final export.
// This module never logs row data, and lookup errors carry generic codes only.
//
// Data sources (in priority order, see `checkVin`):
//   1. MC server-side jobs  — preferred, behind apiFetch (see `mcRecalls`).
//      NOT yet implemented in Motorverse Core; endpoints listed in
//      MC_RECALL_ENDPOINTS. The exact Nissan VIN lookup belongs here
//      (server-side avoids CORS and keeps any keys off the client).
//   2. NHTSA (live default) — official US gov recall data, CORS-friendly,
//      VIN-only. Used now so the tool returns real results without backend work.
//   3. Mock adapter         — clearly-named demo data, used only as a fallback.

import { apiFetch, rvFetch, rvPost, rvDelete } from "@/lib/api";
import * as XLSX from "xlsx";

// ── Types ────────────────────────────────────────────────────────────────
export type VinValidation = "valid" | "invalid_length" | "invalid_chars" | "empty";
export type RecallSource = "nhtsa" | "mock";

export interface RecallCampaign {
  campaignNumber: string;
  component: string;   // recall title / component
  summary: string;
  consequence: string;
  remedy: string;
  recallDate: string;
  status: string;
  source: string;      // NHTSA | Nissan | Mock
}

export interface VinRecallResult {
  vin: string;
  validation: VinValidation;
  decodedYear?: string;
  decodedMake?: string;
  decodedModel?: string;
  recallCount: number;
  recalls: RecallCampaign[];
  checkedAt: string;       // ISO timestamp
  source: string;
  lookupError?: string;    // generic code only — never customer data
}

// ── VIN normalization & validation ─────────────────────────────────────────
// VIN chars exclude I, O, Q to avoid confusion with 1/0.
const VIN_RE = /^[A-HJ-NPR-Z0-9]{17}$/;

export function normalizeVin(raw: unknown): string {
  return String(raw ?? "").replace(/\s+/g, "").trim().toUpperCase();
}

export function vinValidation(vin: string): VinValidation {
  if (!vin) return "empty";
  if (vin.length !== 17) return "invalid_length";
  if (!VIN_RE.test(vin)) return "invalid_chars";
  return "valid";
}

export function isValidVin(vin: string): boolean {
  return vinValidation(vin) === "valid";
}

export function vinValidationLabel(v: VinValidation): string {
  switch (v) {
    case "valid": return "Valid";
    case "invalid_length": return "Invalid — not 17 chars";
    case "invalid_chars": return "Invalid — bad characters";
    case "empty": return "Empty";
  }
}

// ── NHTSA live adapter (official US gov recall data) ────────────────────────
async function nhtsaDecode(vin: string): Promise<{ year: string; make: string; model: string }> {
  const r = await fetch(
    `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${encodeURIComponent(vin)}?format=json`,
  );
  if (!r.ok) throw new Error("decode_http_" + r.status);
  const j = await r.json();
  const row = (j?.Results && j.Results[0]) || {};
  return { year: row.ModelYear || "", make: row.Make || "", model: row.Model || "" };
}

async function nhtsaRecalls(year: string, make: string, model: string): Promise<RecallCampaign[]> {
  if (!year || !make || !model) return [];
  const url =
    `https://api.nhtsa.gov/recalls/recallsByVehicle` +
    `?make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}&modelYear=${encodeURIComponent(year)}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error("recalls_http_" + r.status);
  const j = await r.json();
  const results: unknown[] = Array.isArray(j?.results) ? j.results : [];
  return results.map((x): RecallCampaign => {
    const c = x as Record<string, string>;
    return {
      campaignNumber: c.NHTSACampaignNumber || "",
      component: c.Component || "",
      summary: c.Summary || "",
      consequence: c.Consequence || "",
      remedy: c.Remedy || "",
      recallDate: c.ReportReceivedDate || "",
      status: "Open (NHTSA campaign)",
      source: "NHTSA",
    };
  });
}

async function nhtsaCheckVin(vin: string): Promise<VinRecallResult> {
  const checkedAt = new Date().toISOString();
  const dec = await nhtsaDecode(vin);
  const recalls = await nhtsaRecalls(dec.year, dec.make, dec.model);
  return {
    vin,
    validation: "valid",
    decodedYear: dec.year,
    decodedMake: dec.make,
    decodedModel: dec.model,
    recallCount: recalls.length,
    recalls,
    checkedAt,
    source: "NHTSA",
  };
}

// ── Mock adapter (DEMO ONLY — clearly named) ────────────────────────────────
async function mockCheckVin(vin: string): Promise<VinRecallResult> {
  const checkedAt = new Date().toISOString();
  const seed = [...vin].reduce((a, c) => a + c.charCodeAt(0), 0);
  const n = seed % 3; // 0..2 demo recalls
  const COMPONENTS = ["AIR BAGS", "SERVICE BRAKES, HYDRAULIC", "ELECTRICAL SYSTEM"];
  const recalls: RecallCampaign[] = Array.from({ length: n }).map((_, i) => ({
    campaignNumber: `MOCK-${(seed + i) % 9999}`,
    component: COMPONENTS[(seed + i) % COMPONENTS.length],
    summary: "DEMO recall record — mock adapter, not real safety data.",
    consequence: "DEMO consequence text for development preview.",
    remedy: "DEMO remedy — contact dealer. (mock)",
    recallDate: "2024-01-15",
    status: "Open (mock)",
    source: "Mock",
  }));
  return {
    vin,
    validation: "valid",
    decodedYear: "",
    decodedMake: "",
    decodedModel: "",
    recallCount: n,
    recalls,
    checkedAt,
    source: "Mock",
  };
}

// ── MC server-side job client (preferred; wire when MC implements these) ─────
// All calls are same-origin and authed via apiFetch / rvFetch (the MC proxy).
export const MC_RECALL_ENDPOINTS = [
  "POST   /api/v1/reconverse/recalls/jobs",
  "POST   /api/v1/reconverse/recalls/jobs/:id/upload",
  "POST   /api/v1/reconverse/recalls/jobs/:id/run",
  "GET    /api/v1/reconverse/recalls/jobs/:id",
  "GET    /api/v1/reconverse/recalls/jobs/:id/results",
  "GET    /api/v1/reconverse/recalls/jobs/:id/export",
  "DELETE /api/v1/reconverse/recalls/jobs/:id",
] as const;

export const mcRecalls = {
  createJob: (body: unknown) => rvPost("/recalls/jobs", body),
  uploadFile: (id: string, form: FormData) =>
    apiFetch(`/api/v1/reconverse/recalls/jobs/${id}/upload`, { method: "POST", body: form }),
  runJob: (id: string) => rvPost(`/recalls/jobs/${id}/run`, {}),
  getJob: (id: string) => rvFetch(`/recalls/jobs/${id}`),
  getResults: (id: string) => rvFetch(`/recalls/jobs/${id}/results`),
  exportJob: (id: string, format: "csv" | "xlsx") =>
    apiFetch(`/api/v1/reconverse/recalls/jobs/${id}/export?format=${format}`),
  deleteJob: (id: string) => rvDelete(`/recalls/jobs/${id}`),
};

// ── Dispatcher ──────────────────────────────────────────────────────────────
// Validates/normalizes first, then routes a single VIN to the chosen provider.
// Invalid VINs are flagged (never throw) so one bad row can't fail the job.
export async function checkVin(rawVin: string, source: RecallSource = "nhtsa"): Promise<VinRecallResult> {
  const vin = normalizeVin(rawVin);
  const validation = vinValidation(vin);
  const base: VinRecallResult = {
    vin,
    validation,
    recallCount: 0,
    recalls: [],
    checkedAt: new Date().toISOString(),
    source: "none",
  };
  if (validation !== "valid") return base;

  try {
    return source === "mock" ? await mockCheckVin(vin) : await nhtsaCheckVin(vin);
  } catch {
    // Generic failure only — no row/customer data in the error path.
    return { ...base, validation: "valid", source: source === "mock" ? "Mock" : "NHTSA", lookupError: "lookup_failed" };
  }
}

// ── Export helpers (client-side, SheetJS) ───────────────────────────────────
export function exportRows(
  rows: Record<string, unknown>[],
  filename: string,
  format: "csv" | "xlsx",
  sheetName = "Report",
): void {
  const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ note: "no rows" }]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  XLSX.writeFile(wb, `${filename}.${format}`, { bookType: format });
}
