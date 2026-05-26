import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

function getAuthHeaders() {
  return supabase.auth.getSession().then(({ data }) => ({
    Authorization: `Bearer ${data.session?.access_token}`,
    "Content-Type": "application/json",
    apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  }));
}

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

export function useCreateDealer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      dealer_name: string;
      admin_email: string;
      admin_full_name?: string;
      admin_username?: string;
      temp_password: string;
    }) => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${FUNCTIONS_URL}/create-dealer`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create dealer");
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform-dealers"] });
      qc.invalidateQueries({ queryKey: ["platform-dashboard-stats"] });
    },
  });
}

export function useCreateDealerUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      dealer_id: string;
      email: string;
      password: string;
      full_name?: string;
      role?: string;
    }) => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${FUNCTIONS_URL}/create-dealer-user`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create user");
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform-memberships"] });
      qc.invalidateQueries({ queryKey: ["platform-profiles"] });
    },
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: async (payload: { user_id: string; new_password: string }) => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${FUNCTIONS_URL}/reset-dealer-user-password`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reset password");
      return data;
    },
  });
}

export function useSuspendDealer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { dealer_id: string; suspend: boolean }) => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${FUNCTIONS_URL}/suspend-dealer`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update dealer status");
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform-dealers"] });
      qc.invalidateQueries({ queryKey: ["platform-dealer"] });
    },
  });
}

export function useUpdateMembershipRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { user_id: string; dealer_id: string; role: string }) => {
      // Platform admin has full RLS access to dealer_memberships
      const { error } = await supabase
        .from("dealer_memberships")
        .update({ role: payload.role as "dealer_admin" | "dealer_staff" })
        .eq("user_id", payload.user_id)
        .eq("dealer_id", payload.dealer_id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform-memberships"] });
      qc.invalidateQueries({ queryKey: ["platform-profiles"] });
    },
  });
}

export function useToggleUserActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { user_id: string; dealer_id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("dealer_memberships")
        .update({ is_active: payload.is_active })
        .eq("user_id", payload.user_id)
        .eq("dealer_id", payload.dealer_id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform-memberships"] });
      qc.invalidateQueries({ queryKey: ["platform-profiles"] });
    },
  });
}
