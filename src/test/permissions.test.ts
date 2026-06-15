import { describe, it, expect } from "vitest";
import {
  canManageUsers,
  canAccessReconLane,
  canEditUnits,
  canAdvanceStage,
  canArchiveUnits,
  isStaffOnly,
  roleLabel,
  ASSIGNABLE_ROLES,
} from "@/lib/permissions";

describe("role permissions", () => {
  it("only owner/admin manage users & archive", () => {
    expect(canManageUsers("dealer_owner")).toBe(true);
    expect(canManageUsers("dealer_admin")).toBe(true);
    expect(canManageUsers("manager")).toBe(false);
    expect(canManageUsers("staff")).toBe(false);
    expect(canArchiveUnits("manager")).toBe(false);
  });

  it("owner/admin/manager reach the recon lane, edit and advance; staff cannot", () => {
    for (const role of ["dealer_owner", "dealer_admin", "manager"]) {
      expect(canAccessReconLane(role)).toBe(true);
      expect(canEditUnits(role)).toBe(true);
      expect(canAdvanceStage(role)).toBe(true);
    }
    expect(canAccessReconLane("staff")).toBe(false);
    expect(canEditUnits("staff")).toBe(false);
    expect(canAdvanceStage("staff")).toBe(false);
  });

  it("identifies staff-only and handles undefined roles safely", () => {
    expect(isStaffOnly("staff")).toBe(true);
    expect(isStaffOnly("manager")).toBe(false);
    expect(canManageUsers(undefined)).toBe(false);
    expect(canAccessReconLane(undefined)).toBe(false);
  });

  it("labels roles and falls back for unknown", () => {
    expect(roleLabel("dealer_owner")).toBe("Owner");
    expect(roleLabel("staff")).toBe("Staff");
    expect(roleLabel(undefined)).toBe("Unknown");
    expect(roleLabel("weird")).toBe("weird");
  });

  it("exposes all four assignable roles", () => {
    expect(ASSIGNABLE_ROLES.map((r) => r.value)).toEqual([
      "dealer_owner",
      "dealer_admin",
      "manager",
      "staff",
    ]);
  });
});
