import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { getLocalMockUnits, saveLocalMockUnits } from "./useDealerData";

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
      try {
        const res = await apiFetch("/api/v1/reconverse/units", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const j = await res.json().catch(() => null);
        if (res.ok && j?.ok) return j.data.unit;
      } catch (err) {
        console.warn("apiFetch create unit failed, using local fallback", err);
      }
      
      const dealerId = (payload.dealer_id as string) || "1";
      const units = getLocalMockUnits(dealerId);
      const newUnit = {
        id: "unit-local-" + Math.random().toString(36).substr(2, 9),
        year: payload.year ? Number(payload.year) : null,
        make: payload.make || null,
        model: payload.model || null,
        trim: payload.trim || null,
        color: payload.color || null,
        vin: payload.vin || null,
        stock_number: payload.stock_number || null,
        status: payload.status || "inspection",
        stage_entered_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        dealer_id: dealerId,
        promise_date: payload.promise_date || null,
        notes: payload.notes || null,
        is_deleted: false,
      };
      units.unshift(newUnit);
      saveLocalMockUnits(dealerId, units);
      return newUnit;
    },
    onSuccess: () => invalidate("dealer-units", "dashboard-command-center"),
  });
}

export function useUpdateUnit() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: string } & Record<string, unknown>) => {
      try {
        const res = await apiFetch(`/api/v1/reconverse/units/${id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const j = await res.json().catch(() => null);
        if (res.ok && j?.ok) return j.data.unit;
      } catch (err) {
        console.warn("apiFetch update unit failed, using local fallback", err);
      }
      
      const dealerId = "1";
      const units = getLocalMockUnits(dealerId);
      const idx = units.findIndex(u => u.id === id);
      if (idx !== -1) {
        const updated = {
          ...units[idx],
          ...payload,
        };
        if (payload.status && payload.status !== units[idx].status) {
          updated.stage_entered_at = new Date().toISOString();
        }
        units[idx] = updated;
        saveLocalMockUnits(dealerId, units);
        return updated;
      }
      throw new Error("Unit not found");
    },
    onSuccess: () => invalidate("dealer-units", "dealer-unit", "dashboard-command-center"),
  });
}

export function useArchiveUnit() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (unitId: string) => {
      try {
        const res = await apiFetch(`/api/v1/reconverse/units/${unitId}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_deleted: true }),
        });
        const j = await res.json().catch(() => null);
        if (res.ok && j?.ok) return;
      } catch (err) {
        console.warn("apiFetch archive unit failed, using local fallback", err);
      }
      
      const dealerId = "1";
      const units = getLocalMockUnits(dealerId);
      const idx = units.findIndex(u => u.id === unitId);
      if (idx !== -1) {
        units[idx].is_deleted = true;
        saveLocalMockUnits(dealerId, units);
        return;
      }
      throw new Error("Unit not found");
    },
    onSuccess: () => invalidate("dealer-units", "dashboard-command-center"),
  });
}

export function useRestoreUnit() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (unitId: string) => {
      try {
        const res = await apiFetch(`/api/v1/reconverse/units/${unitId}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_deleted: false, deleted_at: null }),
        });
        const j = await res.json().catch(() => null);
        if (res.ok && j?.ok) return;
      } catch (err) {
        console.warn("apiFetch restore unit failed, using local fallback", err);
      }
      
      const dealerId = "1";
      const units = getLocalMockUnits(dealerId);
      const idx = units.findIndex(u => u.id === unitId);
      if (idx !== -1) {
        units[idx].is_deleted = false;
        saveLocalMockUnits(dealerId, units);
        return;
      }
      throw new Error("Unit not found");
    },
    onSuccess: () => invalidate("dealer-units", "dealer-archived-units", "dashboard-command-center"),
  });
}

