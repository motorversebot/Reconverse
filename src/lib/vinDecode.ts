// VIN decode via NHTSA vPIC (free, official, CORS-friendly, VIN-only).
//
// MC doesn't implement /api/v1/reconverse/vin-decode yet (returns not_found),
// so we decode client-side against vPIC — the same public source the bulk
// recall checker uses. Only the VIN is sent; no customer data.

export interface DecodedVin {
  year: number | null;
  make: string | null;
  model: string | null;
  trim: string | null;
  engine: string | null;
  body: string | null;
  drive_type: string | null;
  transmission: string | null;
}

export async function decodeVinNhtsa(
  vin: string,
): Promise<{ decoded: DecodedVin; raw: Record<string, string> }> {
  const res = await fetch(
    `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${encodeURIComponent(vin)}?format=json`,
  );
  if (!res.ok) throw new Error("decode_http_" + res.status);
  const j = await res.json();
  const row: Record<string, string> = (j?.Results && j.Results[0]) || {};

  const engine = [
    row.EngineCylinders ? `${row.EngineCylinders}-cyl` : "",
    row.DisplacementL ? `${Number(row.DisplacementL).toFixed(1)}L` : "",
    row.FuelTypePrimary && row.FuelTypePrimary !== "Gasoline" ? row.FuelTypePrimary : "",
  ].filter(Boolean).join(" ").trim();

  const transmission = [row.TransmissionStyle, row.TransmissionSpeeds ? `${row.TransmissionSpeeds}-spd` : ""]
    .filter(Boolean).join(" ").trim();

  const decoded: DecodedVin = {
    year: row.ModelYear ? parseInt(row.ModelYear, 10) : null,
    make: row.Make || null,
    model: row.Model || null,
    trim: row.Trim || row.Series || null,
    engine: engine || null,
    body: row.BodyClass || null,
    drive_type: row.DriveType || null,
    transmission: transmission || null,
  };

  // Keep only meaningful raw fields (drop empties / "Not Applicable").
  const raw: Record<string, string> = {};
  for (const [k, v] of Object.entries(row)) {
    if (typeof v === "string" && v.trim() && v !== "Not Applicable" && v !== "0") raw[k] = v;
  }

  return { decoded, raw };
}
