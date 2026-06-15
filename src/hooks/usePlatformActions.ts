import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

/** Payload to provision a new dealership + its initial admin user. */
export interface CreateDealerPayload {
  dealer_name: string;
  admin_email: string;
  admin_username: string;
  admin_full_name?: string;
  /** Initial password; MC auto-generates one if omitted. */
  temp_password?: string;
}

export function useCreateDealer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateDealerPayload) => {
      const res = await apiFetch("/api/v1/reconverse/platform/dealers", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) throw new Error(j?.error || "Failed");
      return j.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["platform-dealers"] }),
  });
}

export function useCreateDealerUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { dealer_id: string; email: string; role: string; full_name?: string }) => {
      const res = await apiFetch("/api/v1/reconverse/platform/users", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) throw new Error(j?.error || "Failed");
      return j.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["platform"] }),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiFetch(`/api/v1/reconverse/platform/users/${userId}/reset-password`, { method: "POST" });
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) throw new Error(j?.error || "Failed");
      return j.data;
    },
  });
}

export function useSuspendDealer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dealerId: string) => {
      const res = await apiFetch(`/api/v1/reconverse/platform/dealers/${dealerId}/suspend`, { method: "POST" });
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) throw new Error(j?.error || "Failed");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["platform-dealers"] }),
  });
}

export function useUpdateMembershipRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, dealerId, role }: { userId: string; dealerId: string; role: string }) => {
      const res = await apiFetch(`/api/v1/reconverse/platform/memberships/${userId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealer_id: dealerId, role }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) throw new Error(j?.error || "Failed");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["platform-memberships"] }),
  });
}

export function useToggleUserActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, active }: { userId: string; active: boolean }) => {
      const res = await apiFetch(`/api/v1/reconverse/platform/users/${userId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) throw new Error(j?.error || "Failed");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["platform"] }),
  });
}
