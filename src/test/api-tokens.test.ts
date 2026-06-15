import { describe, it, expect, beforeEach } from "vitest";
import {
  getAccess,
  getRefresh,
  setTokens,
  getRememberPreference,
  setRememberSession,
} from "@/lib/api";

describe("token storage", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("defaults remember-me to true when unset", () => {
    expect(getRememberPreference()).toBe(true);
  });

  it("persists remember preference", () => {
    setRememberSession(false);
    expect(getRememberPreference()).toBe(false);
    setRememberSession(true);
    expect(getRememberPreference()).toBe(true);
  });

  it("stores tokens in localStorage when remember is on", () => {
    setRememberSession(true);
    setTokens("acc", "ref");
    expect(getAccess()).toBe("acc");
    expect(getRefresh()).toBe("ref");
    expect(localStorage.getItem("rv_access")).toBe("acc");
    expect(sessionStorage.getItem("rv_access")).toBeNull();
  });

  it("stores tokens in sessionStorage when remember is off", () => {
    setRememberSession(false);
    setTokens("acc2", "ref2");
    expect(getAccess()).toBe("acc2");
    expect(sessionStorage.getItem("rv_access")).toBe("acc2");
    expect(localStorage.getItem("rv_access")).toBeNull();
  });

  it("clears tokens from both stores when set to null", () => {
    setRememberSession(true);
    setTokens("a", "b");
    setTokens(null, null);
    expect(getAccess()).toBeNull();
    expect(getRefresh()).toBeNull();
    expect(localStorage.getItem("rv_access")).toBeNull();
    expect(sessionStorage.getItem("rv_access")).toBeNull();
  });
});
