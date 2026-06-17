/**
 * CARFAX Link Reports — Phase 1 (frontend).
 *
 * The dealer pastes their official CARFAX "Link Reports" template once (from
 * carfaxonline.com → Resources → Link Reports). The template contains a {VIN}
 * placeholder; Reconverse generates a per-VIN report URL from it. No CARFAX
 * credentials or scraping are involved — only the dealer's own link format.
 *
 * Phase 1 stores config + per-unit links in localStorage (dealer-scoped) so we
 * don't need a schema migration. Phase 2 can move these onto the unit/dealer
 * records in MC (carfax_report_url, carfax_link_status, …) with the same shape.
 */
import { normalizeVin, isValidVin } from "@/lib/recalls";
import { apiFetch } from "@/lib/api";

export type CarfaxLinkStatus = "not_configured" | "attached" | "missing" | "expired";

/** Per-unit CARFAX state (mirrors the intended persisted columns). */
export interface CarfaxInfo {
  vin: string;
  carfax_report_url: string | null;
  carfax_badge_type: string | null;
  carfax_link_status: CarfaxLinkStatus;
  carfax_last_checked_at: string | null;
}

/** Dealer-level CARFAX configuration (from the Link Reports page). */
export interface CarfaxConfig {
  enabled: boolean;
  /** URL template with a {VIN} placeholder, e.g.
   *  https://www.carfax.com/VehicleHistory/p/Report.cfx?partner=ABC_0&vin={VIN} */
  linkTemplate: string;
  /** Optional default badge label (e.g. "CARFAX Report", "1-Owner"). */
  badgeType: string;
}

const CFG_KEY = (dealerId: string) => `rv_carfax_cfg_${dealerId}`;
const UNIT_KEY = (dealerId: string, vin: string) => `rv_carfax_unit_${dealerId}_${vin}`;

const DEFAULT_CONFIG: CarfaxConfig = { enabled: false, linkTemplate: "", badgeType: "CARFAX Report" };

// Suggested template hint shown in Settings (placeholder only — dealer supplies
// their real partner code). Do NOT treat as a working link.
export const CARFAX_TEMPLATE_HINT =
  "https://www.carfax.com/VehicleHistory/p/Report.cfx?partner=YOUR_PARTNER_CODE&vin={VIN}";

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...(JSON.parse(raw) as object) } as T : fallback;
  } catch {
    return fallback;
  }
}

export function getCarfaxConfig(dealerId?: string): CarfaxConfig {
  if (!dealerId) return DEFAULT_CONFIG;
  return readJson<CarfaxConfig>(CFG_KEY(dealerId), DEFAULT_CONFIG);
}

export function saveCarfaxConfig(dealerId: string, cfg: CarfaxConfig): void {
  try { localStorage.setItem(CFG_KEY(dealerId), JSON.stringify(cfg)); } catch { /* ignore */ }
}

/** Substitute the VIN into the dealer's link template. */
export function buildCarfaxUrl(template: string, vin: string): string {
  const v = normalizeVin(vin);
  if (!template) return "";
  if (/\{vin\}/i.test(template)) return template.replace(/\{vin\}/gi, encodeURIComponent(v));
  // No placeholder — append as a query param.
  const sep = template.includes("?") ? "&" : "?";
  return `${template}${sep}vin=${encodeURIComponent(v)}`;
}

// ── Per-unit stored link (manual attach or generated) ──
interface StoredUnitLink {
  url: string;
  badgeType?: string;
  status?: CarfaxLinkStatus;
  lastCheckedAt?: string;
}

function getUnitLink(dealerId: string, vin: string): StoredUnitLink | null {
  if (!dealerId || !vin) return null;
  try {
    const raw = localStorage.getItem(UNIT_KEY(dealerId, vin));
    return raw ? (JSON.parse(raw) as StoredUnitLink) : null;
  } catch { return null; }
}

export function attachCarfaxLink(dealerId: string, vin: string, url: string, badgeType?: string): void {
  const v = normalizeVin(vin);
  if (!dealerId || !v) return;
  const rec: StoredUnitLink = { url, badgeType, status: "attached", lastCheckedAt: new Date().toISOString() };
  try { localStorage.setItem(UNIT_KEY(dealerId, v), JSON.stringify(rec)); } catch { /* ignore */ }
}

export function clearCarfaxLink(dealerId: string, vin: string): void {
  const v = normalizeVin(vin);
  if (!dealerId || !v) return;
  try { localStorage.removeItem(UNIT_KEY(dealerId, v)); } catch { /* ignore */ }
}

/** Generate + persist a link for this VIN from the dealer template. */
export function generateCarfaxLink(dealerId: string, vin: string): string | null {
  const cfg = getCarfaxConfig(dealerId);
  const v = normalizeVin(vin);
  if (!cfg.enabled || !cfg.linkTemplate || !isValidVin(v)) return null;
  const url = buildCarfaxUrl(cfg.linkTemplate, v);
  attachCarfaxLink(dealerId, v, url, cfg.badgeType);
  return url;
}

/**
 * Resolve the CARFAX state for a unit, combining any stored per-unit link with
 * the dealer config. Pure read — does not persist.
 */
export function resolveCarfax(unit: { vin?: string | null }, dealerId?: string): CarfaxInfo {
  const vin = normalizeVin(unit?.vin);
  const cfg = getCarfaxConfig(dealerId);
  const stored = dealerId ? getUnitLink(dealerId, vin) : null;

  if (stored?.url) {
    return {
      vin,
      carfax_report_url: stored.url,
      carfax_badge_type: stored.badgeType || cfg.badgeType || "CARFAX Report",
      carfax_link_status: stored.status || "attached",
      carfax_last_checked_at: stored.lastCheckedAt || null,
    };
  }

  // No stored link yet.
  if (!cfg.enabled || !cfg.linkTemplate) {
    return { vin, carfax_report_url: null, carfax_badge_type: cfg.badgeType || null, carfax_link_status: "not_configured", carfax_last_checked_at: null };
  }
  // Configured but nothing attached for this unit → "missing" (not attached).
  return { vin, carfax_report_url: null, carfax_badge_type: cfg.badgeType || "CARFAX Report", carfax_link_status: "missing", carfax_last_checked_at: null };
}

/** Can a link be generated right now (config on + valid VIN)? */
export function canGenerateCarfax(unit: { vin?: string | null }, dealerId?: string): boolean {
  const cfg = getCarfaxConfig(dealerId);
  return !!dealerId && cfg.enabled && !!cfg.linkTemplate && isValidVin(normalizeVin(unit?.vin));
}

// ── URL extraction & host validation ───────────────────────────────────────
// Only carfax.com / carfaxonline.com links are accepted. Pasted HTML is parsed
// for its href (DOMParser does NOT execute scripts) — nothing is ever executed.
export const ALLOWED_CARFAX_HOSTS = [
  "carfax.com", "www.carfax.com",
  "carfaxonline.com", "www.carfaxonline.com",
];

function hostAllowed(hostname: string): boolean {
  return ALLOWED_CARFAX_HOSTS.includes(String(hostname || "").toLowerCase());
}

/**
 * Accepts a raw CARFAX report URL OR an HTML snippet from CARFAX Link Reports.
 * Safely extracts the first allowed href and validates the hostname.
 * Returns { url } on success or { error } with a friendly message.
 */
export function extractCarfaxUrl(input: string): { url: string | null; error: string | null } {
  const raw = String(input || "").trim();
  if (!raw) return { url: null, error: "Paste a CARFAX report link." };

  let candidate = raw;
  // HTML snippet → parse out the first allowed href (no execution).
  if (/[<>]/.test(raw) && /href\s*=/i.test(raw)) {
    try {
      const doc = new DOMParser().parseFromString(raw, "text/html");
      const hrefs = Array.from(doc.querySelectorAll("a[href]")).map((a) => a.getAttribute("href") || "");
      const match = hrefs.find((h) => { try { return hostAllowed(new URL(h).hostname); } catch { return false; } });
      if (!match) return { url: null, error: "No CARFAX link found in that snippet." };
      candidate = match;
    } catch {
      return { url: null, error: "Could not read that snippet." };
    }
  }

  let u: URL;
  try { u = new URL(candidate); } catch { return { url: null, error: "That doesn't look like a valid link." }; }
  if (u.protocol !== "https:" && u.protocol !== "http:") return { url: null, error: "Link must start with http(s)." };
  if (!hostAllowed(u.hostname)) return { url: null, error: "Link must be a carfax.com or carfaxonline.com URL." };
  return { url: u.toString(), error: null };
}

// ── MC unit-level CARFAX (with local fallback) ─────────────────────────────
// Expected MC endpoints:
//   GET   /api/v1/reconverse/units/:unitId/carfax
//   PATCH /api/v1/reconverse/units/:unitId/carfax  { carfax_report_url, carfax_badge_type }
export interface UnitCarfax {
  carfax_report_url: string | null;
  carfax_badge_type: string | null;
  carfax_link_status: CarfaxLinkStatus;
  carfax_last_checked_at: string | null;
}

export async function getUnitCarfax(unitId: string): Promise<{ data: UnitCarfax | null; providerConfigured: boolean; persistence: "server" | "local" }> {
  try {
    const res = await apiFetch(`/api/v1/reconverse/units/${unitId}/carfax`);
    if (res.status === 404) return { data: null, providerConfigured: false, persistence: "local" };
    const j = await res.json().catch(() => null);
    if (res.ok && j?.ok && j.data) {
      const d = j.data as Record<string, unknown>;
      const url = (d.carfax_report_url as string) || null;
      return {
        data: {
          carfax_report_url: url,
          carfax_badge_type: (d.carfax_badge_type as string) || null,
          carfax_link_status: (d.carfax_link_status as CarfaxLinkStatus) || (url ? "attached" : "missing"),
          carfax_last_checked_at: (d.carfax_last_checked_at as string) || null,
        },
        providerConfigured: true,
        persistence: "server",
      };
    }
    // provider_not_configured or any soft failure → fall back to local
    return { data: null, providerConfigured: false, persistence: "local" };
  } catch {
    return { data: null, providerConfigured: false, persistence: "local" };
  }
}

export async function patchUnitCarfax(unitId: string, url: string, badgeType = "view_report"): Promise<"server" | "local"> {
  try {
    const res = await apiFetch(`/api/v1/reconverse/units/${unitId}/carfax`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ carfax_report_url: url, carfax_badge_type: badgeType }),
    });
    if (res.status !== 404) {
      const j = await res.json().catch(() => null);
      if (res.ok && j?.ok) return "server";
    }
  } catch { /* fall through to local */ }
  return "local";
}
