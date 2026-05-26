import { corsHeaders } from "../_shared/cors.ts";

const NHTSA_URL = "https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { vin } = await req.json();
    if (!vin || typeof vin !== "string" || vin.length !== 17) {
      return new Response(JSON.stringify({ error: "VIN must be exactly 17 characters" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const res = await fetch(`${NHTSA_URL}/${encodeURIComponent(vin)}?format=json`);
    if (!res.ok) {
      return new Response(JSON.stringify({ error: "NHTSA API unavailable" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    const result = data?.Results?.[0];
    if (!result) {
      return new Response(JSON.stringify({ error: "No decode results" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check for errors from NHTSA
    const errorCode = result.ErrorCode;
    // NHTSA error codes: "0" = success, can be comma-separated like "0,6"
    const errorCodes = (errorCode || "0").split(",").map((c: string) => c.trim());
    const hasData = errorCodes.includes("0");
    
    if (!hasData && !result.Make && !result.Model) {
      return new Response(JSON.stringify({
        error: result.ErrorText || "VIN could not be decoded",
        error_code: errorCode,
      }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Normalize fields
    const decoded = {
      year: result.ModelYear ? parseInt(result.ModelYear) || null : null,
      make: result.Make || null,
      model: result.Model || null,
      trim: result.Trim || null,
      engine: [result.EngineConfiguration, result.DisplacementL ? `${result.DisplacementL}L` : null, result.EngineCylinders ? `${result.EngineCylinders}cyl` : null]
        .filter(Boolean).join(" ") || result.EngineModel || null,
      body: result.BodyClass || null,
      drive_type: result.DriveType || null,
      transmission: result.TransmissionStyle || null,
    };

    // Build full raw response (filter out empty values)
    const raw: Record<string, string> = {};
    for (const [key, value] of Object.entries(result)) {
      if (value && typeof value === "string" && value.trim() !== "" && key !== "ErrorCode" && key !== "ErrorText") {
        raw[key] = value;
      }
    }

    return new Response(JSON.stringify({ decoded, raw }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
