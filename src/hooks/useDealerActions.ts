import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

function useInvalidate() {
  const qc = useQueryClient();
  return (...keys: string[]) => keys.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
}

export function useCreateDealerUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { dealer_id: string; email: string; role: string; full_name?: string }) => {
      const res = await apiFetch("/api/v1/reconverse/dealer-users", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) throw new Error(j?.error || "Failed");
      return j.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dealer-members"] }),
  });
}

export function useResetDealerUserPassword() {
  return useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiFetch(`/api/v1/reconverse/dealer-users/${userId}/reset-password`, { method: "POST" });
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) throw new Error(j?.error || "Failed");
      return j.data;
    },
  });
}

export function useRemoveDealerUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, dealerId }: { userId: string; dealerId: string }) => {
      const res = await apiFetch(`/api/v1/reconverse/dealer-users/${userId}`, {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealer_id: dealerId }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) throw new Error(j?.error || "Failed");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dealer-members"] }),
  });
}

export function useCreateUnit() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await apiFetch("/api/v1/reconverse/units", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) throw new Error(j?.error || "Failed");
      return j.data.unit;
    },
    onSuccess: () => invalidate("dealer-units"),
  });
}

export function useUpdateUnit() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: string } & Record<string, unknown>) => {
      const res = await apiFetch(`/api/v1/reconverse/units/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) throw new Error(j?.error || "Failed");
      return j.data.unit;
    },
    onSuccess: () => invalidate("dealer-units", "dealer-unit"),
  });
}

export function useArchiveUnit() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (unitId: string) => {
      const res = await apiFetch(`/api/v1/reconverse/units/${unitId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_deleted: true }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) throw new Error(j?.error || "Failed");
    },
    onSuccess: () => invalidate("dealer-units"),
  });
}

export function useRestoreUnit() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (unitId: string) => {
      const res = await apiFetch(`/api/v1/reconverse/units/${unitId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_deleted: false, deleted_at: null }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) throw new Error(j?.error || "Failed");
    },
    onSuccess: () => invalidate("dealer-units", "dealer-archived-units"),
  });
}
