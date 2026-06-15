import { Bell, AlertTriangle, AlertCircle, Info, ThumbsUp, Tag, type LucideIcon } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useNotifications, type Notification } from "@/hooks/useNotifications";
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

export function NotificationBell() {
  const { data, unreadCount, markRead, markAllRead } = useNotifications(20);
  const navigate = useNavigate();
  const items = data ?? [];

  const onClick = (n: Notification) => {
    if (!n.read_at) markRead.mutate(n.id);
    if (n.unit_id) navigate(`/dealer/units/${n.unit_id}`);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-[18px] w-[18px]" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] p-0">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <p className="text-sm font-semibold">Notifications</p>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => markAllRead.mutate()}>
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-[420px]">
          {items.length === 0 ? (
            <div className="py-10 text-center text-xs text-muted-foreground">
              <Info className="h-5 w-5 mx-auto mb-2 opacity-50" />
              You're all caught up.
            </div>
          ) : (
            <ul className="divide-y">
              {items.map((n) => {
                const Icon = typeIcon[n.type] ?? Info;
                return (
                  <li
                    key={n.id}
                    role="button"
                    onClick={() => onClick(n)}
                    className={cn(
                      "flex gap-3 px-3 py-2.5 cursor-pointer hover:bg-muted/40 transition-colors",
                      !n.read_at && "bg-primary/5",
                    )}
                  >
                    <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", sevTone[n.severity] ?? "text-muted-foreground")} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium leading-tight">{n.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.body}</p>
                      <p className="text-[10px] text-muted-foreground/70 mt-1 font-mono">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    {!n.read_at && <span className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />}
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
        <div className="border-t p-2">
          <Link
            to="/dealer/notifications"
            className="block text-center text-xs text-muted-foreground hover:text-foreground py-1"
          >
            View all notifications
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
