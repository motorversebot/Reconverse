import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

/**
 * Notifications client — talks to MC:
 *   GET  /api/v1/reconverse/notifications?limit=N   → { ok, data:[rows], meta:{ unread } }
 *   POST /api/v1/reconverse/notifications/read       { ids?:number[], all?:boolean }
 *
 * MC stores the text in `message` (we expose it as `body`) and has no `severity`
 * column, so severity is derived from `type` for the bell's coloring.
 */
export interface Notification {
  id: number;
  title: string;
  body: string;
  type: string;
  severity: "critical" | "warning" | "info";
  unit_id: number | null;
  link: string | null;
  created_at: string;
  read_at: string | null;
  is_read: boolean;
}

function severityFor(type: string): Notification["severity"] {
  if (type === "alert") return "critical";
  if (type === "warning" || type === "estimate") return "warning";
  return "info";
}

export function useNotifications(limit = 20) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["notifications"],
    queryFn: async (): Promise<Notification[]> => {
      const res = await apiFetch(`/api/v1/reconverse/notifications?limit=${limit}`);
      if (res.status === 404) return [];
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) return [];
      const rows = (j.data as any[]) || [];
      return rows.map((r) => ({
        id: r.id,
        title: r.title,
        body: r.message ?? r.body ?? "",
        type: r.type ?? "info",
        severity: severityFor(r.type ?? "info"),
        unit_id: r.unit_id ?? null,
        link: r.link ?? null,
        created_at: r.created_at,
        read_at: r.read_at ?? null,
        is_read: !!r.is_read,
      }));
    },
    refetchInterval: 20_000,
  });

  const items = query.data ?? [];
  const unreadCount = items.filter((n) => !n.read_at && !n.is_read).length;

  const markRead = useMutation({
    mutationFn: async (id: number) => {
      await apiFetch(`/api/v1/reconverse/notifications/read`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id] }),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      await apiFetch(`/api/v1/reconverse/notifications/read`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  return { data: items, unreadCount, markRead, markAllRead, ...query };
}
