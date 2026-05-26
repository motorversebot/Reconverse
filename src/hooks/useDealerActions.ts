import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session?.access_token}`,
    apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  };
}

export function useCreateDealerUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      dealer_id: string;
      email: string;
      password: string;
      full_name?: string;
      role: string;
    }) => {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/create-dealer-user`, {
        method: "POST",
        headers: await getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create user");
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dealer-members"] });
      qc.invalidateQueries({ queryKey: ["dealer-dashboard-stats"] });
    },
  });
}

export function useResetDealerUserPassword() {
  return useMutation({
    mutationFn: async (payload: { user_id: string; new_password: string; dealer_id: string }) => {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/reset-dealer-user-password`, {
        method: "POST",
        headers: await getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reset password");
      return data;
    },
  });
}

export function useRemoveDealerUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { dealer_id: string; user_id: string }) => {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/dealer-remove-user`, {
        method: "POST",
        headers: await getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to remove user");
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dealer-members"] });
      qc.invalidateQueries({ queryKey: ["dealer-dashboard-stats"] });
    },
  });
}

export function useCreateUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      dealer_id: string;
      vin?: string | null;
      stock_number?: string | null;
      make?: string | null;
      model?: string | null;
      year?: number | null;
      color?: string | null;
      notes?: string | null;
      status?: string;
      trim?: string | null;
      engine?: string | null;
      body?: string | null;
      drive_type?: string | null;
      transmission?: string | null;
      vin_decode_raw?: Record<string, string> | null;
    }) => {
      const { data, error } = await supabase.from("units").insert(payload as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dealer-units"] });
      qc.invalidateQueries({ queryKey: ["dealer-recent-units"] });
      qc.invalidateQueries({ queryKey: ["dealer-dashboard-stats"] });
    },
  });
}

export function useUpdateUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: {
      id: string;
      vin?: string | null;
      stock_number?: string | null;
      make?: string | null;
      model?: string | null;
      year?: number | null;
      color?: string | null;
      notes?: string | null;
      status?: string;
      trim?: string | null;
      engine?: string | null;
      body?: string | null;
      drive_type?: string | null;
      transmission?: string | null;
      vin_decode_raw?: Record<string, string> | null;
      promise_date?: string | null;
    }) => {
      const { data, error } = await supabase.from("units").update(payload as any).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dealer-units"] });
      qc.invalidateQueries({ queryKey: ["dealer-recent-units"] });
    },
  });
}

export function useArchiveUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await (supabase
        .from("units")
        .update({ is_deleted: true, deleted_at: new Date().toISOString() } as any)
        .eq("id", id) as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dealer-units"] });
      qc.invalidateQueries({ queryKey: ["dealer-archived-units"] });
      qc.invalidateQueries({ queryKey: ["dealer-recent-units"] });
      qc.invalidateQueries({ queryKey: ["dealer-dashboard-stats"] });
    },
  });
}

export function useRestoreUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await (supabase
        .from("units")
        .update({ is_deleted: false, deleted_at: null } as any)
        .eq("id", id) as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dealer-units"] });
      qc.invalidateQueries({ queryKey: ["dealer-archived-units"] });
      qc.invalidateQueries({ queryKey: ["dealer-recent-units"] });
      qc.invalidateQueries({ queryKey: ["dealer-dashboard-stats"] });
    },
  });
}
