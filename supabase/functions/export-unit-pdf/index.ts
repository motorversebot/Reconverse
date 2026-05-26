import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerId = claimsData.claims.sub;
    const { unit_id } = await req.json();

    if (!unit_id) {
      return new Response(JSON.stringify({ error: "unit_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch unit
    const { data: unit, error: unitErr } = await supabaseAdmin
      .from("units")
      .select("*")
      .eq("id", unit_id)
      .single();
    if (unitErr || !unit) {
      return new Response(JSON.stringify({ error: "Unit not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller membership or platform admin
    const { data: membership } = await supabaseAdmin
      .from("dealer_memberships")
      .select("role")
      .eq("dealer_id", unit.dealer_id)
      .eq("user_id", callerId)
      .eq("is_active", true)
      .single();

    if (!membership) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("is_platform_admin")
        .eq("id", callerId)
        .single();
      if (!profile?.is_platform_admin) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Fetch all related data in parallel
    const [dealerRes, estimateRes, mpiRes, commentsRes, activityRes, photosRes, tireRes] = await Promise.all([
      supabaseAdmin.from("dealers").select("name").eq("id", unit.dealer_id).single(),
      supabaseAdmin.from("estimates").select("*").eq("unit_id", unit_id).eq("dealer_id", unit.dealer_id).order("version_number", { ascending: false }).limit(1).maybeSingle(),
      supabaseAdmin.from("unit_inspection_items").select("*").eq("unit_id", unit_id).eq("dealer_id", unit.dealer_id).order("category").order("item_name"),
      supabaseAdmin.from("unit_comments").select("*, profiles(id, email, full_name)").eq("unit_id", unit_id).eq("dealer_id", unit.dealer_id).order("created_at", { ascending: false }),
      supabaseAdmin.from("unit_activity_logs").select("*, profiles(id, email, full_name)").eq("unit_id", unit_id).eq("dealer_id", unit.dealer_id).order("created_at", { ascending: false }),
      supabaseAdmin.from("unit_photos").select("id, file_name, category, created_at").eq("unit_id", unit_id).eq("dealer_id", unit.dealer_id).order("created_at"),
      supabaseAdmin.from("unit_tire_inspections").select("*").eq("unit_id", unit_id).maybeSingle(),
    ]);

    const dealer = dealerRes.data;
    const estimate = estimateRes.data;
    const mpiItems = mpiRes.data || [];
    const comments = commentsRes.data || [];
    const activityLogs = activityRes.data || [];
    const photos = photosRes.data || [];
    const tireInspection = tireRes.data;

    // Fetch estimate operations + items if estimate exists
    let operations: any[] = [];
    if (estimate) {
      const { data: ops } = await supabaseAdmin
        .from("estimate_operations")
        .select("*")
        .eq("estimate_id", estimate.id)
        .order("sort_order");

      if (ops && ops.length > 0) {
        const opIds = ops.map((o: any) => o.id);
        const { data: items } = await supabaseAdmin
          .from("estimate_items")
          .select("*")
          .in("operation_id", opIds)
          .order("sort_order");

        operations = ops.map((op: any) => ({
          ...op,
          items: (items || []).filter((i: any) => i.operation_id === op.id),
        }));
      }
    }

    // Build filename
    const slug = [unit.stock_number || unit.vin || "unit", unit.year, unit.make, unit.model]
      .filter(Boolean)
      .join("_")
      .replace(/[^a-zA-Z0-9_-]/g, "");
    const filename = `${slug}_ReconPacket.pdf`;

    const html = buildPdfHtml(unit, dealer, estimate, operations, mpiItems, comments, activityLogs, photos, tireInspection);

    return new Response(JSON.stringify({ html, filename }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

/* ── Helpers ── */

function fmt(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function fmtDateShort(d: string): string {
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function esc(s: string | null | undefined): string {
  if (!s) return "";
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function statusLabel(s: string): string {
  const map: Record<string, string> = {
    inspection: "MPI", estimate: "Estimate", approval: "Approval",
    repair: "Repair", qc: "QC", ready: "Ready for Sale", sold: "Sold",
  };
  return map[s] || s;
}

function mpiStatusBadge(s: string): string {
  const colors: Record<string, string> = {
    pass: "background:#dcfce7;color:#166534",
    fail: "background:#fef2f2;color:#991b1b",
    repair_needed: "background:#fef9c3;color:#854d0e",
    pending: "background:#f3f4f6;color:#6b7280",
  };
  const labels: Record<string, string> = {
    pass: "Pass", fail: "Fail", repair_needed: "Attention", pending: "Pending",
  };
  const style = colors[s] || colors.pending;
  return `<span class="mpi-badge" style="${style}">${labels[s] || s}</span>`;
}

/* ── Option lists ── */
const SAFETY_MECHANICAL = ["ABS", "Driver Airbag", "Front Airbag", "Side Airbag", "Child Safety Door Locks", "Power Steering", "Tilt Wheel"];
const COMFORT_CONVENIENCE = ["AC", "AM/FM Radio", "CD Player", "CD Changer", "Cassette", "TV", "VCR", "Cruise Control", "Power Windows", "Power Door Locks", "Power Seat Driver", "Power Seat Passenger", "Rear Air"];
const EXTERIOR_ADDONS = ["Alloy Wheels", "Sunroof", "Running Boards", "Bed Liner", "Roof Rack", "Fog Lights", "Alarm", "Front Grill"];

function getEnabledOptions(intakeMeta: any): { safety: string[]; comfort: string[]; exterior: string[]; seating: string } {
  const meta = intakeMeta || {};
  const safety = SAFETY_MECHANICAL.filter((o) => meta[`opt_${o.replace(/[^a-zA-Z0-9]/g, "")}`]);
  const comfort = COMFORT_CONVENIENCE.filter((o) => meta[`opt_${o.replace(/[^a-zA-Z0-9]/g, "")}`]);
  const exterior = EXTERIOR_ADDONS.filter((o) => meta[`opt_${o.replace(/[^a-zA-Z0-9]/g, "")}`]);
  const seating = meta.seating || "";
  return { safety, comfort, exterior, seating };
}

function infoRow(label: string, value: any, mono = false): string {
  const v = esc(value?.toString()) || "—";
  return `<div class="info-row"><span class="info-label">${esc(label)}</span><span class="info-value${mono ? " mono" : ""}">${v}</span></div>`;
}

/* ── Tire Inspection HTML ── */

const CONDITION_FLAG_LABELS: Record<string, string> = {
  uneven_wear_inner: "Uneven wear (inner)", uneven_wear_center: "Uneven wear (center)",
  uneven_wear_outer: "Uneven wear (outer)", cupping: "Cupping", dry_rot: "Dry rot / cracking",
  sidewall_damage: "Sidewall damage", puncture_plug: "Puncture / plug",
  mismatched: "Mismatched tires", low_tread: "Low tread (auto)", cords_showing: "Cords showing",
};

const WHEEL_CHECK_LABELS: Record<string, string> = {
  alignment: "Wheel alignment", vibration: "Vibration at speed", lug_nuts: "Lug nuts torqued",
  tpms: "TPMS light on", wheel_damage: "Wheel damage", brake_dust: "Brake dust / corrosion",
};

function tireStatusLabel(tread: any, flags: any): string {
  const depths = [tread?.lf, tread?.rf, tread?.lr, tread?.rr].filter((d: any) => d != null) as number[];
  if (depths.some((d) => d <= 3) || flags?.sidewall_damage || flags?.cords_showing) return "REPLACE";
  if (depths.some((d) => d <= 5) || flags?.cupping || flags?.dry_rot || flags?.puncture_plug || flags?.mismatched ||
      flags?.uneven_wear_inner || flags?.uneven_wear_center || flags?.uneven_wear_outer) return "ATTENTION";
  return "OK";
}

function buildTireInspectionHtml(tire: any): string {
  if (!tire) return "";
  const tread = tire.tread_depth || {};
  const psi = tire.tire_pressure || {};
  const flags = tire.condition_flags || {};
  const wheels = tire.wheel_checks || {};
  const recs = tire.recommendations || [];

  const statusText = tireStatusLabel(tread, flags);
  const statusStyle = statusText === "OK" ? "background:#dcfce7;color:#166534"
    : statusText === "ATTENTION" ? "background:#fef9c3;color:#854d0e"
    : "background:#fef2f2;color:#991b1b";

  const posLabels = ["LF", "RF", "LR", "RR", "Spare"];
  const posKeys = ["lf", "rf", "lr", "rr", "spare"];

  const activeFlags = Object.entries(flags).filter(([_, v]) => v).map(([k]) => CONDITION_FLAG_LABELS[k] || k);

  const wheelRows = Object.entries(wheels).map(([k, v]: [string, any]) => {
    const label = WHEEL_CHECK_LABELS[k] || k;
    const st = v?.status || "ok";
    const badge = st === "attention"
      ? `<span class="mpi-badge" style="background:#fef9c3;color:#854d0e">Attn</span>`
      : st === "na"
      ? `<span class="mpi-badge" style="background:#f3f4f6;color:#6b7280">N/A</span>`
      : `<span class="mpi-badge" style="background:#dcfce7;color:#166534">OK</span>`;
    return `<tr><td>${esc(label)}</td><td>${badge}</td><td class="mpi-notes">${esc(v?.note) || "—"}</td></tr>`;
  }).join("");

  return `
    <div style="margin-bottom:14px">
      <div class="sub-section-title" style="display:flex;align-items:center;gap:8px">
        Tires &amp; Wheels
        <span class="mpi-badge" style="${statusStyle}">${statusText}</span>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:10px">
        <div>
          <div style="font-size:10px;font-weight:600;text-transform:uppercase;color:#888;margin-bottom:4px">Tread Depth (32nds)</div>
          <table class="data-table">
            <thead><tr>${posLabels.map(l => `<th style="text-align:center">${l}</th>`).join("")}</tr></thead>
            <tbody><tr>${posKeys.map(k => `<td style="text-align:center;font-weight:600">${tread[k] != null ? tread[k] : "—"}</td>`).join("")}</tr></tbody>
          </table>
        </div>
        <div>
          <div style="font-size:10px;font-weight:600;text-transform:uppercase;color:#888;margin-bottom:4px">Tire Pressure (PSI)</div>
          <table class="data-table">
            <thead><tr>${posLabels.map(l => `<th style="text-align:center">${l}</th>`).join("")}</tr></thead>
            <tbody><tr>${posKeys.map(k => `<td style="text-align:center;font-weight:600">${psi[k] != null ? psi[k] : "—"}</td>`).join("")}</tr></tbody>
          </table>
        </div>
      </div>

      ${activeFlags.length > 0 ? `
        <div style="margin-bottom:8px">
          <div style="font-size:10px;font-weight:600;text-transform:uppercase;color:#888;margin-bottom:4px">Condition Flags</div>
          <div class="options-grid">${activeFlags.map(f => `<span class="option-tag" style="background:#fef2f2;color:#991b1b">⚠ ${esc(f)}</span>`).join("")}</div>
        </div>
      ` : ""}

      ${Object.keys(wheels).length > 0 ? `
        <div style="margin-bottom:8px">
          <div style="font-size:10px;font-weight:600;text-transform:uppercase;color:#888;margin-bottom:4px">Wheel &amp; Alignment Checks</div>
          <table class="data-table">
            <thead><tr><th style="width:45%">Check</th><th style="width:15%">Status</th><th>Notes</th></tr></thead>
            <tbody>${wheelRows}</tbody>
          </table>
        </div>
      ` : ""}

      ${recs.length > 0 ? `
        <div>
          <div style="font-size:10px;font-weight:600;text-transform:uppercase;color:#888;margin-bottom:4px">Recommendations</div>
          <div class="options-grid">${recs.map((r: string) => `<span class="option-tag" style="background:#eff6ff;color:#1e40af">→ ${esc(r)}</span>`).join("")}</div>
        </div>
      ` : ""}
    </div>`;
}

/* ── Main HTML builder ── */

function buildPdfHtml(
  unit: any, dealer: any, estimate: any, operations: any[],
  mpiItems: any[], comments: any[], activityLogs: any[], photos: any[],
  tireInspection: any
): string {
  const title = [unit.year, unit.make, unit.model].filter(Boolean).join(" ") || "Vehicle";
  const exportDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const dealerName = dealer?.name || "Dealership";
  const meta = unit.intake_meta || {};
  const options = getEnabledOptions(meta);

  // Recon totals
  let laborTotal = 0, partsTotal = 0, subletTotal = 0, miscTotal = 0;
  const approvedOps: any[] = [];
  for (const op of operations) {
    const approvedItems = (op.items || []).filter((i: any) => i.status === "approved");
    if (approvedItems.length === 0) continue;
    approvedOps.push({ ...op, items: approvedItems });
    for (const item of approvedItems) {
      const lineTotal = item.type === "labor" ? item.hours * item.labor_rate : item.qty * item.unit_price;
      if (item.type === "labor") laborTotal += lineTotal;
      else if (item.type === "part") partsTotal += lineTotal;
      else if (item.type === "sublet") subletTotal += lineTotal;
      else miscTotal += lineTotal;
    }
  }
  const subtotal = laborTotal + partsTotal + subletTotal + miscTotal;
  const shopSupplies = subtotal * (estimate?.shop_supplies_percent ?? 0);
  const grandTotal = subtotal + shopSupplies;
  const hasReconData = approvedOps.length > 0;
  const hasOptions = options.safety.length > 0 || options.comfort.length > 0 || options.exterior.length > 0 || !!options.seating;

  // MPI grouped by category
  const mpiByCategory: Record<string, any[]> = {};
  for (const item of mpiItems) {
    if (!mpiByCategory[item.category]) mpiByCategory[item.category] = [];
    mpiByCategory[item.category].push(item);
  }

  const renderOptionTags = (items: string[]) =>
    items.map((i) => `<span class="option-tag">✔ ${esc(i)}</span>`).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)} - Recon Packet</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; color: #1a1a1a; background: #fff; font-size: 12px; line-height: 1.5; }
  .page { max-width: 800px; margin: 0 auto; padding: 32px 40px; }

  /* Header */
  .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 20px; border-bottom: 2px solid #111; margin-bottom: 24px; }
  .header-left h1 { font-size: 18px; font-weight: 700; letter-spacing: -0.02em; }
  .header-left p { font-size: 11px; color: #666; margin-top: 2px; }
  .header-right { text-align: right; }
  .header-right .unit-title { font-size: 16px; font-weight: 700; }
  .header-right .meta { font-size: 10px; color: #666; margin-top: 3px; }
  .header-right .meta span { display: inline-block; margin-left: 10px; }
  .status-badge { display: inline-block; font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; padding: 2px 8px; border-radius: 3px; background: #f0f0f0; color: #333; margin-top: 4px; }
  .status-ready { background: #dcfce7; color: #166534; }
  .status-sold { background: #e0e7ff; color: #3730a3; }

  /* Sections */
  .section { margin-bottom: 22px; }
  .section-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #333; padding-bottom: 5px; border-bottom: 1px solid #ddd; margin-bottom: 10px; }
  .sub-section-title { font-size: 11px; font-weight: 600; color: #555; margin: 10px 0 6px; text-transform: uppercase; letter-spacing: 0.04em; }

  /* Info grid */
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 28px; }
  .info-row { display: flex; justify-content: space-between; padding: 3px 0; border-bottom: 1px dotted #e5e5e5; }
  .info-label { color: #888; font-size: 11px; }
  .info-value { font-weight: 500; font-size: 11px; }
  .info-value.mono { font-family: 'SF Mono', 'Fira Code', monospace; font-size: 10px; }

  /* Recon Snapshot */
  .snapshot-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 8px; }
  .snapshot-item { background: #f8f8f8; border-radius: 4px; padding: 8px 10px; text-align: center; }
  .snapshot-item .snap-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em; color: #888; }
  .snapshot-item .snap-value { font-size: 13px; font-weight: 700; margin-top: 2px; }

  /* Tables */
  .data-table { width: 100%; border-collapse: collapse; font-size: 11px; }
  .data-table th { text-align: left; padding: 6px 8px; background: #f8f8f8; border-bottom: 1px solid #ddd; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; color: #555; }
  .data-table td { padding: 5px 8px; border-bottom: 1px solid #f0f0f0; vertical-align: top; }
  .data-table .op-header td { background: #fafafa; font-weight: 600; padding-top: 8px; border-bottom: 1px solid #e5e5e5; }
  .data-table .amount { text-align: right; font-family: 'SF Mono', monospace; font-size: 10px; }
  .data-table .type-badge { font-size: 9px; text-transform: uppercase; color: #888; font-weight: 500; }

  /* MPI */
  .mpi-badge { display: inline-block; font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; padding: 1px 6px; border-radius: 3px; }
  .mpi-summary { display: flex; gap: 12px; margin-bottom: 8px; }
  .mpi-summary span { font-size: 10px; color: #666; }
  .mpi-summary strong { font-weight: 600; }
  .mpi-notes { font-size: 10px; color: #666; font-style: italic; margin-left: 8px; }

  /* Totals */
  .totals-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3px 36px; max-width: 340px; margin-left: auto; margin-top: 12px; padding-top: 10px; border-top: 2px solid #111; }
  .totals-row { display: flex; justify-content: space-between; padding: 2px 0; font-size: 11px; }
  .totals-row.grand { font-weight: 700; font-size: 13px; padding-top: 6px; border-top: 1px solid #ddd; margin-top: 4px; }
  .totals-label { color: #666; }
  .totals-value { font-family: 'SF Mono', monospace; }

  /* Options */
  .options-grid { display: flex; flex-wrap: wrap; gap: 4px; }
  .option-tag { display: inline-block; font-size: 10px; padding: 2px 8px; background: #f5f5f5; border-radius: 3px; color: #333; }
  .options-section { margin-bottom: 10px; }

  /* Notes block */
  .notes-block { background: #fafafa; border: 1px solid #eee; border-radius: 4px; padding: 12px 14px; font-size: 11px; white-space: pre-wrap; min-height: 40px; color: #333; }

  /* Comments */
  .comment-item { padding: 6px 0; border-bottom: 1px solid #f0f0f0; }
  .comment-header { font-size: 10px; color: #888; }
  .comment-header strong { color: #333; }
  .comment-text { font-size: 11px; margin-top: 2px; }

  /* Footer */
  .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e5e5e5; text-align: center; font-size: 9px; color: #aaa; }

  /* Page breaks */
  .page-break { page-break-before: always; }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { padding: 16px; }
    .page-break { page-break-before: always; }
  }
</style>
</head>
<body>
<div class="page">

  <!-- ═══ PAGE 1: VEHICLE SUMMARY ═══ -->
  <div class="header">
    <div class="header-left">
      <h1>${esc(dealerName)}</h1>
      <p>Recon Packet</p>
    </div>
    <div class="header-right">
      <div class="unit-title">${esc(title)}</div>
      <div class="meta">
        ${unit.vin ? `<span>VIN: ${esc(unit.vin)}</span>` : ""}
        ${unit.stock_number ? `<span>Stock #${esc(unit.stock_number)}</span>` : ""}
      </div>
      <div class="status-badge ${unit.status === "ready" ? "status-ready" : unit.status === "sold" ? "status-sold" : ""}">${statusLabel(unit.status)}</div>
      <div class="meta" style="margin-top:4px"><span>${exportDate}</span></div>
    </div>
  </div>

  <!-- Recon Snapshot -->
  <div class="section">
    <div class="section-title">Recon Snapshot</div>
    <div class="snapshot-grid">
      <div class="snapshot-item"><div class="snap-label">Stage</div><div class="snap-value">${statusLabel(unit.status)}</div></div>
      <div class="snapshot-item"><div class="snap-label">Date In</div><div class="snap-value">${fmtDateShort(unit.created_at)}</div></div>
      <div class="snapshot-item"><div class="snap-label">Keys</div><div class="snap-value">${esc(meta.keys) || "—"}</div></div>
      <div class="snapshot-item"><div class="snap-label">Source</div><div class="snap-value">${esc(meta.acquisition_source || meta.from) || "—"}</div></div>
      <div class="snapshot-item"><div class="snap-label">CARFAX</div><div class="snap-value">${meta.carfax ? "Yes" : "No"}</div></div>
      <div class="snapshot-item"><div class="snap-label">Frame Damage</div><div class="snap-value">${meta.frame_damage ? "⚠ Yes" : "No"}</div></div>
      <div class="snapshot-item"><div class="snap-label">Mileage Type</div><div class="snap-value">${esc(meta.mileage_type) || "—"}</div></div>
      <div class="snapshot-item"><div class="snap-label">Condition</div><div class="snap-value">${esc(meta.condition_rating) || "—"}</div></div>
    </div>
  </div>

  <!-- Vehicle Information -->
  <div class="section">
    <div class="section-title">Vehicle Information</div>
    <div class="info-grid">
      ${infoRow("VIN", unit.vin, true)}
      ${infoRow("Stock #", unit.stock_number)}
      ${infoRow("Year", unit.year)}
      ${infoRow("Make", unit.make)}
      ${infoRow("Model", unit.model)}
      ${infoRow("Trim", unit.trim)}
      ${infoRow("Color", unit.color)}
      ${infoRow("Engine", unit.engine)}
      ${infoRow("Body", unit.body)}
      ${infoRow("Drive Type", unit.drive_type)}
      ${infoRow("Transmission", unit.transmission)}
    </div>
  </div>

  ${hasReconData ? `
  <!-- Reconditioning Summary -->
  <div class="section">
    <div class="section-title">Reconditioning Summary</div>
    <table class="data-table">
      <thead><tr><th>Description</th><th>Type</th><th class="amount">Amount</th></tr></thead>
      <tbody>
        ${approvedOps.map((op: any) => `
          <tr class="op-header"><td colspan="3">${esc(op.name)}</td></tr>
          ${op.items.map((item: any) => {
            const amt = item.type === "labor" ? item.hours * item.labor_rate : item.qty * item.unit_price;
            return `<tr><td>${esc(item.description) || "—"}</td><td><span class="type-badge">${item.type}</span></td><td class="amount">$${fmt(amt)}</td></tr>`;
          }).join("")}
        `).join("")}
      </tbody>
    </table>
    <div class="totals-grid">
      <div class="totals-row"><span class="totals-label">Labor</span><span class="totals-value">$${fmt(laborTotal)}</span></div>
      <div class="totals-row"><span class="totals-label">Parts</span><span class="totals-value">$${fmt(partsTotal)}</span></div>
      <div class="totals-row"><span class="totals-label">Sublet</span><span class="totals-value">$${fmt(subletTotal)}</span></div>
      ${miscTotal > 0 ? `<div class="totals-row"><span class="totals-label">Misc</span><span class="totals-value">$${fmt(miscTotal)}</span></div>` : ""}
      ${shopSupplies > 0 ? `<div class="totals-row"><span class="totals-label">Shop Supplies</span><span class="totals-value">$${fmt(shopSupplies)}</span></div>` : ""}
      <div class="totals-row grand" style="grid-column:1/-1"><span class="totals-label">Total</span><span class="totals-value">$${fmt(grandTotal)}</span></div>
    </div>
  </div>
  ` : ""}

  <!-- ═══ INTAKE ═══ -->
  <div class="section page-break">
    <div class="section-title">Intake Details</div>

    <div class="sub-section-title">Source &amp; History</div>
    <div class="info-grid">
      ${infoRow("Source", meta.acquisition_source || meta.from)}
      ${infoRow("Keys", meta.keys)}
      ${infoRow("Books/Manuals", meta.books ? "Yes" : "No")}
      ${infoRow("CARFAX", meta.carfax ? "Yes" : "No")}
      ${infoRow("Frame Damage", meta.frame_damage ? "Yes" : "No")}
      ${infoRow("Mileage Type", meta.mileage_type)}
      ${infoRow("Condition Rating", meta.condition_rating)}
      ${infoRow("Smog Required", meta.smog_required ? "Yes" : "No")}
    </div>

    <div class="sub-section-title">Vehicle Configuration</div>
    <div class="info-grid">
      ${infoRow("Body Type", meta.body_type || unit.body)}
      ${infoRow("Engine Cylinders", meta.engine_cylinders)}
      ${infoRow("Engine Displacement", meta.engine_displacement)}
      ${infoRow("Fuel Type", meta.fuel_type)}
      ${infoRow("Transmission Type", meta.transmission_type || unit.transmission)}
      ${infoRow("Drive Type", meta.drive_type || unit.drive_type)}
      ${infoRow("Seating", meta.seating)}
    </div>

    ${hasOptions ? `
    <div class="sub-section-title">Vehicle Options &amp; Equipment</div>
    ${options.safety.length > 0 ? `<div class="options-section"><div class="sub-section-title" style="margin-top:4px">Safety &amp; Mechanical</div><div class="options-grid">${renderOptionTags(options.safety)}</div></div>` : ""}
    ${options.comfort.length > 0 ? `<div class="options-section"><div class="sub-section-title" style="margin-top:4px">Comfort &amp; Convenience</div><div class="options-grid">${renderOptionTags(options.comfort)}</div></div>` : ""}
    ${options.exterior.length > 0 ? `<div class="options-section"><div class="sub-section-title" style="margin-top:4px">Exterior &amp; Add-ons</div><div class="options-grid">${renderOptionTags(options.exterior)}</div></div>` : ""}
    ` : ""}
  </div>

  <!-- ═══ MPI ═══ -->
  <div class="section page-break">
    <div class="section-title">Multi-Point Inspection (MPI)</div>
    ${Object.keys(mpiByCategory).length === 0 ? `<p style="color:#888;font-size:11px">No inspection items recorded.</p>` :
      Object.entries(mpiByCategory).map(([category, items]) => {
        const counts = { pass: 0, fail: 0, repair_needed: 0, pending: 0 };
        for (const it of items) counts[it.status as keyof typeof counts] = (counts[it.status as keyof typeof counts] || 0) + 1;
        return `
          <div style="margin-bottom:14px">
            <div class="sub-section-title">${esc(category)}</div>
            <div class="mpi-summary">
              <span><strong>${counts.pass}</strong> Pass</span>
              <span><strong>${counts.fail}</strong> Fail</span>
              <span><strong>${counts.repair_needed}</strong> Attention</span>
              <span><strong>${counts.pending}</strong> Pending</span>
            </div>
            <table class="data-table">
              <thead><tr><th style="width:45%">Item</th><th style="width:15%">Status</th><th>Notes</th></tr></thead>
              <tbody>
                ${items.map((it: any) => `<tr>
                  <td>${esc(it.item_name)}</td>
                  <td>${mpiStatusBadge(it.status)}</td>
                  <td class="mpi-notes">${esc(it.notes) || "—"}</td>
                </tr>`).join("")}
              </tbody>
            </table>
          </div>`;
      }).join("")
    }
    ${buildTireInspectionHtml(tireInspection)}
  </div>

  <!-- ═══ INTERNAL NOTES ═══ -->
  <div class="section">
    <div class="section-title">Internal Notes</div>
    <div class="notes-block">${esc(unit.notes) || "—"}</div>
  </div>

  <!-- ═══ COMMENTS ═══ -->
  <div class="section">
    <div class="section-title">Comments (${comments.length})</div>
    ${comments.length === 0 ? `<p style="color:#888;font-size:11px">No comments.</p>` :
      comments.map((c: any) => {
        const name = c.profiles?.full_name || c.profiles?.email?.split("@")[0] || "System";
        return `<div class="comment-item">
          <div class="comment-header"><strong>${esc(name)}</strong> · ${fmtDate(c.created_at)}</div>
          <div class="comment-text">${esc(c.comment)}</div>
        </div>`;
      }).join("")
    }
  </div>

  <!-- ═══ PHOTOS ═══ -->
  ${photos.length > 0 ? `
  <div class="section">
    <div class="section-title">Photos (${photos.length} attached)</div>
    <table class="data-table">
      <thead><tr><th>File</th><th>Category</th><th>Date</th></tr></thead>
      <tbody>
        ${photos.map((p: any) => `<tr><td>${esc(p.file_name)}</td><td>${esc(p.category)}</td><td>${fmtDateShort(p.created_at)}</td></tr>`).join("")}
      </tbody>
    </table>
  </div>
  ` : ""}

  <!-- ═══ ACTIVITY LOG ═══ -->
  <div class="section page-break">
    <div class="section-title">Activity Log (${activityLogs.length})</div>
    ${activityLogs.length === 0 ? `<p style="color:#888;font-size:11px">No activity recorded.</p>` : `
    <table class="data-table">
      <thead><tr><th style="width:22%">Date/Time</th><th style="width:20%">User</th><th style="width:20%">Action</th><th>Details</th></tr></thead>
      <tbody>
        ${activityLogs.map((log: any) => {
          const name = log.profiles?.full_name || log.profiles?.email?.split("@")[0] || "System";
          return `<tr>
            <td>${fmtDate(log.created_at)}</td>
            <td>${esc(name)}</td>
            <td><span class="type-badge">${esc(log.action_type.replace(/_/g, " "))}</span></td>
            <td>${esc(log.description)}</td>
          </tr>`;
        }).join("")}
      </tbody>
    </table>
    `}
  </div>

  <div class="footer">
    ${esc(dealerName)} &bull; Generated ${exportDate} &bull; Confidential
  </div>
</div>
</body>
</html>`;
}
