// Scheduled detector for stage stalls + promise date risk.
// Runs via pg_cron every 30 minutes. Uses service role to bypass RLS.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STALL_HOURS = 6 * 24; // red threshold from useStageAging.ts

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const stallCutoff = new Date(Date.now() - STALL_HOURS * 3600_000).toISOString();
  const today = new Date().toISOString().slice(0, 10);
  const dedupCutoff = new Date(Date.now() - 24 * 3600_000).toISOString();

  let stallCount = 0;
  let promiseCount = 0;

  // ── Stage stalls ──
  const { data: stalled } = await supabase
    .from("units")
    .select("id, dealer_id, stock_number, status, stage_entered_at")
    .eq("is_deleted", false)
    .not("status", "in", '("ready","sold")')
    .lte("stage_entered_at", stallCutoff);

  for (const u of stalled ?? []) {
    const { data: existing } = await supabase
      .from("notifications")
      .select("id")
      .eq("dealer_id", u.dealer_id)
      .eq("type", "stage_stall")
      .eq("unit_id", u.id)
      .gte("created_at", dedupCutoff)
      .limit(1);
    if (existing && existing.length > 0) continue;

    const days = Math.floor(
      (Date.now() - new Date(u.stage_entered_at).getTime()) / (1000 * 60 * 60 * 24),
    );
    await supabase.from("notifications").insert({
      dealer_id: u.dealer_id,
      user_id: null,
      type: "stage_stall",
      severity: "warning",
      title: "Unit stalled in stage",
      body: `Stock #${u.stock_number ?? "—"} has been in ${u.status} for ${days}d.`,
      unit_id: u.id,
      metadata: { stage: u.status, days_in_stage: days },
    });
    stallCount++;
  }

  // ── Promise date risk ──
  const { data: atRisk } = await supabase
    .from("units")
    .select("id, dealer_id, stock_number, promise_date, status")
    .eq("is_deleted", false)
    .not("status", "in", '("ready","sold")')
    .not("promise_date", "is", null)
    .lte("promise_date", today);

  for (const u of atRisk ?? []) {
    const { data: existing } = await supabase
      .from("notifications")
      .select("id")
      .eq("dealer_id", u.dealer_id)
      .eq("type", "promise_risk")
      .eq("unit_id", u.id)
      .gte("created_at", dedupCutoff)
      .limit(1);
    if (existing && existing.length > 0) continue;

    const overdue = u.promise_date < today;
    await supabase.from("notifications").insert({
      dealer_id: u.dealer_id,
      user_id: null,
      type: "promise_risk",
      severity: overdue ? "critical" : "warning",
      title: overdue ? "Promise date overdue" : "Promise date today",
      body: `Stock #${u.stock_number ?? "—"} ${overdue ? "is past its promise date" : "is due today"} (${u.promise_date}).`,
      unit_id: u.id,
      metadata: { promise_date: u.promise_date, overdue },
    });
    promiseCount++;
  }

  return new Response(
    JSON.stringify({ ok: true, stallCount, promiseCount }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
