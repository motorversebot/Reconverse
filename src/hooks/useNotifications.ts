import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentDealer } from "@/hooks/useDealerData";

export type Notification = {
  id: string;
  dealer_id: string;
  user_id: string | null;
  type: string;
  severity: "info" | "warning" | "critical" | string;
  title: string;
  body: string;
  unit_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  read_at?: string | null;
};

function attachReadStatus(
  rows: any[],
  reads: { notification_id: string; read_at: string }[],
): Notification[] {
  const readMap = new Map(reads.map((r) => [r.notification_id, r.read_at]));
  return rows.map((n) => ({ ...n, read_at: readMap.get(n.id) ?? null }));
}

export function useNotifications(limit = 50) {
  const { user } = useAuth();
  const { data: membership } = useCurrentDealer();
  const dealerId = membership?.dealer_id;
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["notifications", dealerId, limit],
    enabled: !!dealerId && !!user,
    queryFn: async () => {
      const { data: notes, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("dealer_id", dealerId!)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;

      const ids = (notes ?? []).map((n: any) => n.id);
      let reads: any[] = [];
      if (ids.length) {
        const { data } = await supabase
          .from("notification_reads")
          .select("notification_id, read_at")
          .eq("user_id", user!.id)
          .in("notification_id", ids);
        reads = data ?? [];
      }
      return attachReadStatus(notes ?? [], reads);
    },
  });

  // Realtime subscription
  useEffect(() => {
    if (!dealerId) return;
    const channel = supabase
      .channel(`notifications-${dealerId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `dealer_id=eq.${dealerId}` },
        () => qc.invalidateQueries({ queryKey: ["notifications", dealerId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [dealerId, qc]);

  const unreadCount = (query.data ?? []).filter((n) => !n.read_at).length;

  const markRead = useMutation({
    mutationFn: async (notificationId: string) => {
      if (!user || !dealerId) return;
      await supabase
        .from("notification_reads")
        .upsert(
          { notification_id: notificationId, user_id: user.id, dealer_id: dealerId },
          { onConflict: "notification_id,user_id" },
        );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications", dealerId] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      if (!user || !dealerId) return;
      const unread = (query.data ?? []).filter((n) => !n.read_at);
      if (!unread.length) return;
      await supabase.from("notification_reads").upsert(
        unread.map((n) => ({
          notification_id: n.id,
          user_id: user.id,
          dealer_id: dealerId,
        })),
        { onConflict: "notification_id,user_id" },
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications", dealerId] }),
  });

  return { ...query, unreadCount, markRead, markAllRead };
}
