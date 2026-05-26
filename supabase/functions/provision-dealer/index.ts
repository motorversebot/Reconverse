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

    // Validate JWT
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

    const userId = claimsData.claims.sub as string;

    // Check if user already has a dealer membership
    const { data: existingMembership } = await supabaseAdmin
      .from("dealer_memberships")
      .select("dealer_id")
      .eq("user_id", userId)
      .eq("is_active", true)
      .maybeSingle();

    if (existingMembership) {
      return new Response(
        JSON.stringify({ dealer_id: existingMembership.dealer_id, already_exists: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user metadata for shop name
    const { data: authUser, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (userError || !authUser?.user) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const shopName = authUser.user.user_metadata?.shop_name;
    if (!shopName) {
      return new Response(
        JSON.stringify({ error: "No shop name in user metadata. This endpoint is for self-service signups only." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create dealer
    const { data: dealer, error: dealerError } = await supabaseAdmin
      .from("dealers")
      .insert({ name: shopName })
      .select("id")
      .single();

    if (dealerError) {
      return new Response(JSON.stringify({ error: dealerError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create dealer_owner membership
    const { error: membershipError } = await supabaseAdmin
      .from("dealer_memberships")
      .insert({
        dealer_id: dealer.id,
        user_id: userId,
        role: "dealer_owner",
        is_active: true,
      });

    if (membershipError) {
      // Rollback dealer
      await supabaseAdmin.from("dealers").delete().eq("id", dealer.id);
      return new Response(JSON.stringify({ error: membershipError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ dealer_id: dealer.id, provisioned: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
