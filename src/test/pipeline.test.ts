import { describe, it, expect } from "vitest";
import {
  ALL_STATUSES,
  PIPELINE_STAGES,
  STATUS_TO_SLUG,
  SLUG_TO_STATUS,
  stageIndex,
  stageProgress,
  isStageBefore,
  type UnitStatus,
} from "@/lib/pipeline";

describe("recon pipeline", () => {
  it("slug mapping round-trips for every status", () => {
    for (const status of ALL_STATUSES) {
      const slug = STATUS_TO_SLUG[status];
      expect(slug).toBeTruthy();
      expect(SLUG_TO_STATUS[slug]).toBe(status);
    }
  });

  it("orders stages and ends with ready then sold", () => {
    expect(stageIndex("inspection")).toBe(0);
    expect(stageIndex("sold")).toBe(ALL_STATUSES.length - 1);
    expect(ALL_STATUSES.slice(-2)).toEqual(["ready", "sold"]);
    expect(PIPELINE_STAGES).not.toContain("sold" as UnitStatus);
  });

  it("progress increases monotonically and tops out at 100", () => {
    let prev = -1;
    for (const status of ALL_STATUSES) {
      const p = stageProgress(status);
      expect(p).toBeGreaterThan(prev);
      prev = p;
    }
    expect(stageProgress("sold")).toBe(100);
  });

  it("isStageBefore compares pipeline position", () => {
    expect(isStageBefore("inspection", "repair")).toBe(true);
    expect(isStageBefore("repair", "inspection")).toBe(false);
    expect(isStageBefore("qc", "qc")).toBe(false);
  });
});
