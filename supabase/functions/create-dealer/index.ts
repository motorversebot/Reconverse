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

    const callerId = claimsData.claims.sub;

    // Verify platform admin
    const { data: callerProfile } = await supabaseAdmin
      .from("profiles")
      .select("is_platform_admin")
      .eq("id", callerId)
      .single();

    if (!callerProfile?.is_platform_admin) {
      return new Response(JSON.stringify({ error: "Forbidden: platform admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { dealer_name, admin_email, admin_password, admin_full_name, admin_username, temp_password } = await req.json();

    // Support both old field names and new ones
    const password = temp_password || admin_password;
    const usernameValue = admin_username?.trim();

    if (!dealer_name || !admin_email || !password) {
      return new Response(
        JSON.stringify({ error: "dealer_name, admin_email, and password are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate username format if provided
    if (usernameValue) {
      if (usernameValue.length < 3 || usernameValue.length > 30) {
        return new Response(
          JSON.stringify({ error: "Username must be 3–30 characters" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (!/^[a-zA-Z0-9_.-]+$/.test(usernameValue)) {
        return new Response(
          JSON.stringify({ error: "Username may only contain letters, numbers, dots, hyphens, and underscores" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check uniqueness (case-insensitive)
      const { data: existing } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .ilike("username", usernameValue)
        .maybeSingle();

      if (existing) {
        return new Response(
          JSON.stringify({ error: "Username is already taken" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // 1. Create dealer
    const { data: dealer, error: dealerError } = await supabaseAdmin
      .from("dealers")
      .insert({ name: dealer_name })
      .select()
      .single();

    if (dealerError) {
      return new Response(JSON.stringify({ error: dealerError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Create auth user (auto-confirm)
    const { data: authData, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email: admin_email,
      password,
      email_confirm: true,
      user_metadata: { full_name: admin_full_name || "" },
    });

    if (createUserError) {
      await supabaseAdmin.from("dealers").delete().eq("id", dealer.id);
      return new Response(JSON.stringify({ error: createUserError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Set username on profile if provided
    if (usernameValue) {
      const { error: usernameError } = await supabaseAdmin
        .from("profiles")
        .update({ username: usernameValue })
        .eq("id", authData.user.id);

      if (usernameError) {
        // Non-fatal but log it — the profile trigger already created the row
        console.error("Failed to set username:", usernameError.message);
      }
    }

    // 4. Create dealer_membership as dealer_admin
    const { error: membershipError } = await supabaseAdmin
      .from("dealer_memberships")
      .insert({
        dealer_id: dealer.id,
        user_id: authData.user.id,
        role: "dealer_admin",
        is_active: true,
      });

    if (membershipError) {
      return new Response(JSON.stringify({ error: membershipError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        dealer_id: dealer.id,
        user_id: authData.user.id,
        message: "Dealer and admin user created successfully",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
