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
    const { dealer_id, user_id } = await req.json();

    if (!dealer_id || !user_id) {
      return new Response(
        JSON.stringify({ error: "dealer_id and user_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (user_id === callerId) {
      return new Response(
        JSON.stringify({ error: "Cannot remove yourself" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check caller is platform admin OR dealer owner/admin
    const { data: callerProfile } = await supabaseAdmin
      .from("profiles")
      .select("is_platform_admin")
      .eq("id", callerId)
      .single();

    const isPlatformAdmin = callerProfile?.is_platform_admin === true;

    if (!isPlatformAdmin) {
      const { data: membership } = await supabaseAdmin
        .from("dealer_memberships")
        .select("role")
        .eq("dealer_id", dealer_id)
        .eq("user_id", callerId)
        .eq("is_active", true)
        .single();

      if (!membership || !["dealer_owner", "dealer_admin"].includes(membership.role)) {
        return new Response(
          JSON.stringify({ error: "Forbidden: must be platform admin or dealer owner/admin" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const { data: targetMembership } = await supabaseAdmin
      .from("dealer_memberships")
      .select("user_id")
      .eq("dealer_id", dealer_id)
      .eq("user_id", user_id)
      .single();

    if (!targetMembership) {
      return new Response(
        JSON.stringify({ error: "User is not a member of this dealer" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { error: deleteError } = await supabaseAdmin
      .from("dealer_memberships")
      .delete()
      .eq("dealer_id", dealer_id)
      .eq("user_id", user_id);

    if (deleteError) {
      return new Response(JSON.stringify({ error: deleteError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ message: "User removed from dealer successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
