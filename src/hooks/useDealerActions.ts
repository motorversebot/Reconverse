import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

function useInvalidate() {
  const qc = useQueryClient();
  return (...keys: string[]) => keys.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
}

export function useCreateDealerUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { dealer_id: string; email: string; password: string; role: string; full_name?: string }) => {
      const attempt = async (extra: Record<string, unknown>) => {
        const res = await apiFetch("/api/v1/reconverse/dealer-users", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, ...extra }),
        });
        const j = await res.json().catch(() => null);
        if (!res.ok || !j?.ok) throw new Error(j?.error || "Failed");
        return j.data;
      };
      try {
        return await attempt({});
      } catch (e: any) {
        // Usernames are global; if the derived one is taken, retry with a unique suffix.
        if (String(e?.message) === "username_in_use") {
          const base = (payload.email.split("@")[0] || "user").toLowerCase().replace(/[^a-z0-9]/g, "");
          return await attempt({ username: `${base}.${Math.floor(100 + Math.random() * 900)}` });
        }
        throw e;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dealer-members"] }),
  });
}

export function useResetDealerUserPassword() {
  return useMutation({
    mutationFn: async ({ userId, newPassword }: { userId: string; newPassword: string }) => {
      const res = await apiFetch(`/api/v1/reconverse/dealer-users/${userId}/reset-password`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_password: newPassword }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) throw new Error(j?.error || "Failed");
      return j.data;
    },
  });
}

export function useUpdateDealerUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, ...patch }: { userId: string; role?: string; is_active?: boolean; full_name?: string; phone?: string }) => {
      const res = await apiFetch(`/api/v1/reconverse/dealer-users/${userId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) throw new Error(j?.error || "Failed");
      return j.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dealer-members"] }),
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
      if (!res.ok || !j?.ok) throw new Error(j?.error || "Couldn't create unit");
      // MC returns the created row directly at j.data (INSERT ... RETURNING *);
      // some endpoints wrap it as j.data.unit. Tolerate both so the caller
      // always receives the unit object (was reading j.data.unit -> undefined
      // -> "Cannot read properties of undefined (reading 'id')" after a
      // successful create).
      return (j.data?.unit ?? j.data) as Record<string, unknown>;
    },
    onSuccess: () => invalidate("dealer-units", "dashboard-command-center"),
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
      if (!res.ok || !j?.ok) throw new Error(j?.error || "Couldn't update unit");
      return j.data.unit;
    },
    onSuccess: () => invalidate("dealer-units", "dealer-unit", "dashboard-command-center"),
  });
}

/**
 * Move a unit to a recon lane (stage). Uses the dedicated MC endpoint that sets
 * current_stage_id by slug — NOT units.status (which is active/hold/sold/archived
 * and would be rejected for a stage slug like "estimate").
 */
export function useMoveUnitStage() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: string }) => {
      const res = await apiFetch(`/api/v1/reconverse/units/${id}/move-to-stage`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) throw new Error(j?.error || "move_failed");
      return j.data;
    },
    onSuccess: () => invalidate("dealer-units", "dealer-unit", "dashboard-command-center"),
  });
}

export function useArchiveUnit() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (unitId: string) => {
      // Archive = set lifecycle status 'archived' (MC ignores is_deleted).
      const res = await apiFetch(`/api/v1/reconverse/units/${unitId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "archived" }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) throw new Error(j?.error || "Couldn't archive unit");
    },
    onSuccess: () => invalidate("dealer-units", "dealer-archived-units", "dashboard-command-center"),
  });
}

export function useRestoreUnit() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (unitId: string) => {
      const res = await apiFetch(`/api/v1/reconverse/units/${unitId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "active" }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) throw new Error(j?.error || "Couldn't restore unit");
    },
    onSuccess: () => invalidate("dealer-units", "dealer-archived-units", "dashboard-command-center"),
  });
}

