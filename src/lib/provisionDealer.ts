import { apiFetch } from "@/lib/api";

export async function provisionDealerIfNeeded(): Promise<void> {
  try {
    await apiFetch("/api/v1/reconverse/provision-dealer", { method: "POST" });
  } catch {
    // best-effort; dealer may already exist
  }
}
