/**
 * Dealer role permissions helper.
 *
 * Two concepts collapse into one `role` string here:
 *   1. Permission tier — what the user can do.
 *   2. Dealership job title — how the role is labelled.
 *
 * Permission tiers (highest → lowest):
 *   Dealer Admin  → manage users, settings, archive, everything below
 *   Manager       → recon lane, edit, advance stages / approve
 *   Staff         → recon lane, edit units (no advance / user mgmt)
 *   View-only     → read only (legacy "staff"/"viewer")
 *
 * Job titles map onto those tiers (see the groups below). The MC backend stores
 * the granular title in reconverse.users.settings.title and the permission tier
 * in reconverse.users.role, then returns the granular title as `role` so these
 * helpers gate on the specific title.
 *
 * "dealer_owner"/"dealer_admin" are legacy values treated as Dealer Admin.
 */

export type DealerRole =
  // legacy / generic
  | "dealer_owner" | "dealer_admin" | "manager" | "staff" | "viewer"
  // Dealer Admin tier
  | "owner" | "general_manager"
  // Manager tier
  | "service_manager" | "general_sales_manager" | "used_car_manager" | "parts_manager"
  // Staff tier (operational)
  | "technician" | "service_advisor" | "parts_advisor";

// ── Permission tier groups ──────────────────────────────────────
const ADMIN_ROLES: DealerRole[] = ["dealer_owner", "dealer_admin", "owner", "general_manager"];
const MANAGER_TITLES: DealerRole[] = ["manager", "service_manager", "general_sales_manager", "used_car_manager", "parts_manager"];
const STAFF_TITLES: DealerRole[] = ["technician", "service_advisor", "parts_advisor"];

/** Roles that can manage users, settings & archive units */
const USER_MGMT_ROLES: DealerRole[] = [...ADMIN_ROLES];
/** Roles that can move stages / approve / generate WO */
const ADVANCE_ROLES: DealerRole[] = [...ADMIN_ROLES, ...MANAGER_TITLES];
/** Roles that can access the full recon lane */
const RECON_ROLES: DealerRole[] = [...ADMIN_ROLES, ...MANAGER_TITLES, ...STAFF_TITLES];
/** Roles that can edit units (MPI, Estimate, Notes, Photos, Intake, etc.) */
const EDIT_ROLES: DealerRole[] = [...ADMIN_ROLES, ...MANAGER_TITLES, ...STAFF_TITLES];

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
  return role === "staff" || role === "viewer" || STAFF_TITLES.includes(role as DealerRole);
}

/** Human-readable label for display */
const ROLE_LABELS: Record<string, string> = {
  dealer_owner: "Owner",
  dealer_admin: "Admin",
  owner: "Owner",
  general_manager: "General Manager",
  general_sales_manager: "General Sales Manager",
  used_car_manager: "Used Car Manager",
  service_manager: "Service Manager",
  parts_manager: "Parts Manager",
  manager: "Manager",
  service_advisor: "Service Advisor",
  parts_advisor: "Parts Advisor",
  technician: "Technician",
  staff: "Staff",
  viewer: "Viewer",
};

export function roleLabel(role?: string): string {
  if (!role) return "Unknown";
  return ROLE_LABELS[role] ?? role;
}

/** All assignable roles (for create-user dropdown), ordered by seniority */
export const ASSIGNABLE_ROLES: { value: DealerRole; label: string }[] = [
  { value: "owner", label: "Owner" },
  { value: "general_manager", label: "General Manager" },
  { value: "general_sales_manager", label: "General Sales Manager" },
  { value: "used_car_manager", label: "Used Car Manager" },
  { value: "service_manager", label: "Service Manager" },
  { value: "parts_manager", label: "Parts Manager" },
  { value: "service_advisor", label: "Service Advisor" },
  { value: "parts_advisor", label: "Parts Advisor" },
  { value: "technician", label: "Technician" },
];
