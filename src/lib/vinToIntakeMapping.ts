/**
 * Maps NHTSA VIN decode raw payload → intake_meta toggle keys.
 * Returns only the keys that can be determined from the decode.
 * Unknown/blank fields are omitted (caller keeps existing values).
 */

// NHTSA field → intake toggle key mapping
const FEATURE_MAP: Record<string, { intakeKey: string; presentValues?: string[] }> = {
  ABS: { intakeKey: "opt_ABS", presentValues: ["Standard", "Optional"] },
  AirBagLocFront: { intakeKey: "opt_Front Airbag" },
  AirBagLocSide: { intakeKey: "opt_Side Airbag" },
  AirBagLocDriver: { intakeKey: "opt_Driver Airbag" },
  PowerSteering: { intakeKey: "opt_Power Steering" },
  TiltWheel: { intakeKey: "opt_Tilt Wheel" },
  AirConditioningType: { intakeKey: "opt_AC" },
  CruiseControl: { intakeKey: "opt_Cruise Control" },
  PowerWindows: { intakeKey: "opt_Power Windows" },
  PowerDoorLocks: { intakeKey: "opt_Power Door Locks" },
  SeatBeltsAll: { intakeKey: "opt_Child Safety Door Locks" }, // rough proxy
  EntertainmentSystem: { intakeKey: "opt_AM/FM Radio" },
  SunroofType: { intakeKey: "opt_Sunroof" },
  RunningBoards: { intakeKey: "opt_Running Boards" },
  WheelType: { intakeKey: "opt_Alloy Wheels", presentValues: ["Alloy", "Aluminum", "Chrome"] },
  FogLights: { intakeKey: "opt_Fog Lights" },
  RoofType: { intakeKey: "opt_Roof Rack" },
  AntiTheft: { intakeKey: "opt_Alarm" },
  BedLinerType: { intakeKey: "opt_Bed Liner" },
};

function isPresent(value: string | undefined | null, presentValues?: string[]): boolean | null {
  if (!value || value.trim() === "" || value === "Not Applicable") return null; // unknown
  if (presentValues) {
    return presentValues.some((pv) => value.toLowerCase().includes(pv.toLowerCase()));
  }
  // If the field has any non-empty value that isn't "Not Applicable", consider it present
  return true;
}

export interface IntakeMappingResult {
  /** Toggle keys to set, with true/false values */
  toggles: Record<string, boolean>;
  /** Vehicle configuration fields */
  config: Record<string, string>;
}

export function mapVinDecodeToIntake(raw: Record<string, string> | null | undefined): IntakeMappingResult {
  const result: IntakeMappingResult = { toggles: {}, config: {} };
  if (!raw) return result;

  // Map feature toggles
  for (const [nhtsaKey, mapping] of Object.entries(FEATURE_MAP)) {
    const value = raw[nhtsaKey];
    const present = isPresent(value, mapping.presentValues);
    if (present !== null) {
      result.toggles[mapping.intakeKey] = present;
    }
  }

  // Map vehicle configuration
  const bodyClass = raw.BodyClass || "";
  if (bodyClass) {
    if (bodyClass.includes("Truck")) result.config.body_type = "Truck";
    else if (bodyClass.includes("SUV") || bodyClass.includes("Sport Utility")) result.config.body_type = "SUV";
    else if (bodyClass.includes("Van") || bodyClass.includes("Minivan")) result.config.body_type = "Van";
    else if (bodyClass.includes("Coupe") || raw.Doors === "2") result.config.body_type = "2 Door";
    else if (raw.Doors === "3") result.config.body_type = "3 Door";
    else if (raw.Doors === "4" || bodyClass.includes("Sedan")) result.config.body_type = "4 Door";
  }

  const cyl = raw.EngineCylinders;
  if (cyl === "4") result.config.engine_type = "4 Cyl";
  else if (cyl === "6") result.config.engine_type = "V6";
  else if (cyl === "8") result.config.engine_type = "V8";
  else if (cyl === "10") result.config.engine_type = "V10";

  const trans = raw.TransmissionStyle || "";
  if (trans.toLowerCase().includes("automatic") || trans.toLowerCase().includes("cvt")) {
    result.config.transmission_type = "Automatic";
  } else if (trans.toLowerCase().includes("manual")) {
    const speeds = raw.TransmissionSpeeds;
    if (speeds === "4") result.config.transmission_type = "4 Speed";
    else if (speeds === "5") result.config.transmission_type = "5 Speed";
    else if (speeds === "6") result.config.transmission_type = "6 Speed";
    else result.config.transmission_type = "5 Speed"; // default manual
  }

  // Seating
  const seats = raw.Seats;
  if (seats) {
    const n = parseInt(seats);
    if (n <= 5) result.config.seating_capacity = "5 Passenger";
    else if (n <= 7) result.config.seating_capacity = "7 Passenger";
    else result.config.seating_capacity = "15 Passenger";
  }

  // Interior
  const trim = (raw.Trim || "").toLowerCase();
  if (trim.includes("leather")) result.config.interior_material = "Leather";

  return result;
}

/**
 * Merges decoded mapping into existing intake_meta, respecting manual overrides.
 * @param existing Current intake_meta
 * @param mapping Result from mapVinDecodeToIntake
 * @param overrides Set of keys the user has manually changed
 * @param force If true, overwrite even manual overrides
 */
export function mergeDecodeIntoIntake(
  existing: Record<string, unknown>,
  mapping: IntakeMappingResult,
  overrides: Set<string>,
  force = false,
): Record<string, unknown> {
  const merged = { ...existing };

  // Apply toggles
  for (const [key, value] of Object.entries(mapping.toggles)) {
    if (force || !overrides.has(key)) {
      merged[key] = value;
    }
  }

  // Apply config
  for (const [key, value] of Object.entries(mapping.config)) {
    if (force || !overrides.has(key)) {
      merged[key] = value;
    }
  }

  return merged;
}
