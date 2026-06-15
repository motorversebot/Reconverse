import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  severity: string;
  unit_id: string | null;
  user_id: string | null;
  dealer_id: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  read_at: string | null;
}

export function useNotifications(dealerId: string | undefined, userId: string | undefined) {
  const qc = useQueryClient();

  const { data: notifications = [], ...query } = useQuery({
    queryKey: ["notifications", dealerId],
    queryFn: async () => {
      const res = await apiFetch(`/api/v1/reconverse/dealers/${dealerId}/notifications`);
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) return [];
      return j.data.notifications as Notification[];
    },
    enabled: !!dealerId && !!userId,
    refetchInterval: 30_000,
  });

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  const markRead = useMutation({
    mutationFn: async (notificationId: string) => {
      await apiFetch(`/api/v1/reconverse/notifications/${notificationId}/read`, { method: "POST" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      await apiFetch(`/api/v1/reconverse/dealers/${dealerId}/notifications/read-all`, { method: "POST" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  return {
    notifications,
    unreadCount,
    markRead: markRead.mutate,
    markAllRead: markAllRead.mutate,
    ...query,
  };
}
