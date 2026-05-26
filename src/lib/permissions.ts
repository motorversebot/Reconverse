/**
 * Dealer role permissions helper.
 *
 * Role hierarchy (highest → lowest):
 *   dealer_owner > dealer_admin > manager > staff
 *
 * "dealer_admin" is the legacy value kept for backwards compatibility
 * and is treated identically to "dealer_owner" where applicable.
 */

export type DealerRole = "dealer_owner" | "dealer_admin" | "manager" | "staff";

/** Roles that can manage users & settings */
const USER_MGMT_ROLES: DealerRole[] = ["dealer_owner", "dealer_admin"];

/** Roles that can access the full recon lane */
const RECON_ROLES: DealerRole[] = ["dealer_owner", "dealer_admin", "manager"];

/** Roles that can edit units (MPI, Estimate, Notes, Photos, Intake, etc.) */
const EDIT_ROLES: DealerRole[] = ["dealer_owner", "dealer_admin", "manager"];

/** Roles that can move stages / approve / generate WO */
const ADVANCE_ROLES: DealerRole[] = ["dealer_owner", "dealer_admin", "manager"];

// ── Public helpers ──────────────────────────────────────────────

export function canManageUsers(role?: string): boolean {
  return USER_MGMT_ROLES.includes(role as DealerRole);
}

export function canAccessReconLane(role?: string): boolean {
  return RECON_ROLES.includes(role as DealerRole);
}

export function canEditUnits(role?: string): boolean {
  return EDIT_ROLES.includes(role as DealerRole);
}

export function canAdvanceStage(role?: string): boolean {
  return ADVANCE_ROLES.includes(role as DealerRole);
}

export function canArchiveUnits(role?: string): boolean {
  return USER_MGMT_ROLES.includes(role as DealerRole);
}

export function isStaffOnly(role?: string): boolean {
  return role === "staff";
}

/** Human-readable label for display */
export function roleLabel(role?: string): string {
  switch (role) {
    case "dealer_owner": return "Owner";
    case "dealer_admin": return "Admin";
    case "manager": return "Manager";
    case "staff": return "Staff";
    default: return role ?? "Unknown";
  }
}

/** All assignable roles (for create-user dropdown) */
export const ASSIGNABLE_ROLES: { value: DealerRole; label: string }[] = [
  { value: "dealer_owner", label: "Owner" },
  { value: "dealer_admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "staff", label: "Staff" },
];
