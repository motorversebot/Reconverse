import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "@/hooks/useNotifications";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { AlertTriangle, AlertCircle, Info, ThumbsUp, Tag, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

const typeIcon: Record<string, LucideIcon> = {
  stage_stall: AlertTriangle,
  promise_risk: AlertCircle,
  approval_requested: ThumbsUp,
  ready_for_sale: Tag,
};
const sevTone: Record<string, string> = {
  critical: "text-red-400",
  warning: "text-amber-400",
  info: "text-primary",
};
const TYPE_LABELS: Record<string, string> = {
  stage_stall: "Stage stall",
  promise_risk: "Promise date",
  approval_requested: "Approval requested",
  ready_for_sale: "Ready for sale",
};

export default function NotificationsPage() {
  const { data, unreadCount, markRead, markAllRead } = useNotifications(200);
  const navigate = useNavigate();
  const [type, setType] = useState<string>("all");
  const [sev, setSev] = useState<string>("all");

  const items = useMemo(() => {
    return (data ?? []).filter(
      (n) => (type === "all" || n.type === type) && (sev === "all" || n.severity === sev),
    );
  }, [data, type, sev]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            {unreadCount} unread of {data?.length ?? 0}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-[170px] h-9"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {Object.entries(TYPE_LABELS).map(([v, l]) => (
                <SelectItem key={v} value={v}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sev} onValueChange={setSev}>
            <SelectTrigger className="w-[150px] h-9"><SelectValue placeholder="Severity" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All severities</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={() => markAllRead.mutate()}>
              Mark all read
            </Button>
          )}
        </div>
      </div>

      <Card className="divide-y">
        {items.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            <Info className="h-6 w-6 mx-auto mb-2 opacity-50" />
            No notifications.
          </div>
        ) : (
          items.map((n) => {
            const Icon = typeIcon[n.type] ?? Info;
            return (
              <div
                key={n.id}
                role="button"
                onClick={() => {
                  if (!n.read_at) markRead.mutate(n.id);
                  if (n.unit_id) navigate(`/dealer/units/${n.unit_id}`);
                }}
                className={cn(
                  "flex gap-4 px-4 py-3 cursor-pointer hover:bg-muted/40",
                  !n.read_at && "bg-primary/5",
                )}
              >
                <Icon className={cn("h-5 w-5 mt-0.5 shrink-0", sevTone[n.severity] ?? "text-muted-foreground")} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{n.title}</p>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                      {TYPE_LABELS[n.type] ?? n.type}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{n.body}</p>
                  <p className="text-xs text-muted-foreground/70 mt-1 font-mono">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                  </p>
                </div>
                {!n.read_at && <span className="h-2 w-2 rounded-full bg-primary mt-2 shrink-0" />}
              </div>
            );
          })
        )}
      </Card>
    </div>
  );
}
