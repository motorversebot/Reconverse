import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentDealer } from "@/hooks/useDealerData";
import { useIsMobile } from "@/hooks/use-mobile";
import { canManageUsers, canAccessReconLane } from "@/lib/permissions";
import {
  LayoutDashboard, Car, Users, Settings, LogOut, ArrowLeft,
  ChevronLeft, ChevronRight, Menu, BarChart3,
  ClipboardCheck, Calculator, ThumbsUp, Wrench, ShieldCheck, Tag,
} from "lucide-react";
import { NotificationBell } from "@/components/dealer/notifications/NotificationBell";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const workspaceItems = [
  { to: "/dealer", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "/dealer/units", icon: Car, label: "Units" },
  { to: "/dealer/reports", icon: BarChart3, label: "Reports" },
];

const reconLaneItems = [
  { to: "/dealer/recon-lane/mpi", icon: ClipboardCheck, label: "MPI" },
  { to: "/dealer/recon-lane/estimate", icon: Calculator, label: "Estimate" },
  { to: "/dealer/recon-lane/approval", icon: ThumbsUp, label: "Approval" },
  { to: "/dealer/recon-lane/repair", icon: Wrench, label: "Repair" },
  { to: "/dealer/recon-lane/qc", icon: ShieldCheck, label: "QC" },
  { to: "/dealer/recon-lane/ready-for-sale", icon: Tag, label: "Ready for Sale" },
];

const adminItems = [
  { to: "/dealer/users", icon: Users, label: "Users" },
  { to: "/dealer/settings", icon: Settings, label: "Settings" },
];

function SidebarNavItem({
  to, icon: Icon, label, end, collapsed,
}: {
  to: string; icon: React.ElementType; label: string; end?: boolean; collapsed: boolean;
}) {
  const inner = (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          "group relative flex items-center gap-3 rounded-xl text-[13px] font-medium transition-all duration-200",
          collapsed ? "justify-center px-3 py-2.5" : "px-3.5 py-2.5",
          isActive
            ? "bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.08)] text-white/90"
            : "text-white/40 hover:text-white/70 hover:bg-[rgba(255,255,255,0.03)] border border-transparent"
        )
      }
    >
      {({ isActive }: { isActive: boolean }) => (
        <>
          {isActive && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-primary" />
          )}
          <Icon className={cn("shrink-0 h-[18px] w-[18px]", isActive ? "text-white/80" : "text-white/40")} />
          {!collapsed && <span>{label}</span>}
        </>
      )}
    </NavLink>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{inner}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={12}>{label}</TooltipContent>
      </Tooltip>
    );
  }
  return inner;
}

function SidebarContent({
  collapsed, onCollapse, showCollapseBtn,
}: {
  collapsed: boolean; onCollapse?: () => void; showCollapseBtn: boolean;
}) {
  const { signOut, user, isPlatformAdmin } = useAuth();
  const { data: membership } = useCurrentDealer();
  const role = membership?.role as string | undefined;

  const showReconLane = canAccessReconLane(role);
  const showAdmin = canManageUsers(role);

  return (
    <div
      className="flex h-full flex-col sidebar-chrome border-0"
      style={{
        background: "linear-gradient(180deg, #111315 0%, #15181c 100%)",
        backdropFilter: "blur(24px)",
      }}
    >
      {/* Brand header */}
      <div className={cn(
        "flex flex-col items-center",
        collapsed ? "px-2 py-5" : "px-5 py-6",
        "border-b border-[rgba(255,255,255,0.05)]"
      )}>
        <div className={cn(
          "flex items-center justify-center font-black text-white/80 tracking-tight",
          collapsed ? "text-xl" : "text-3xl"
        )}>
          M
        </div>
        {!collapsed && (
          <div className="mt-2 text-center">
            <p className="text-[12px] font-medium text-primary/80 truncate max-w-[180px]">
              {membership?.dealers?.name ?? "Dealer"}
            </p>
          </div>
        )}
      </div>

      {/* Nav sections */}
      <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-6">
        {/* Workspace */}
        <div>
          {!collapsed && (
            <p className="px-3.5 mb-2.5 text-[10px] font-semibold tracking-[0.12em] uppercase text-white/25">
              Workspace
            </p>
          )}
          <div className="space-y-0.5">
            {workspaceItems.map((item) => (
              <SidebarNavItem key={item.to} {...item} collapsed={collapsed} />
            ))}
          </div>
        </div>

        {/* Recon Lane — hidden for Staff */}
        {showReconLane && (
          <div>
            {!collapsed && (
              <p className="px-3.5 mb-2.5 text-[10px] font-semibold tracking-[0.12em] uppercase text-white/25">
                Recon Lane
              </p>
            )}
            <div className="space-y-0.5">
              {reconLaneItems.map((item) => (
                <SidebarNavItem key={item.to} {...item} collapsed={collapsed} />
              ))}
            </div>
          </div>
        )}

        {/* Admin — hidden for Manager and Staff */}
        {showAdmin && (
          <div>
            {!collapsed && (
              <p className="px-3.5 mb-2.5 text-[10px] font-semibold tracking-[0.12em] uppercase text-white/25">
                Admin
              </p>
            )}
            <div className="space-y-0.5">
              {adminItems.map((item) => (
                <SidebarNavItem key={item.to} {...item} collapsed={collapsed} />
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="border-t border-[rgba(255,255,255,0.05)] p-3 space-y-1">
        {isPlatformAdmin && (
          <NavLink
            to="/platform"
            className={cn(
              "flex items-center gap-2 rounded-lg text-xs text-white/35 hover:text-white/60 hover:bg-[rgba(255,255,255,0.03)] transition-colors",
              collapsed ? "justify-center px-2 py-2" : "px-3 py-2"
            )}
          >
            <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
            {!collapsed && <span>Back to Platform</span>}
          </NavLink>
        )}
        {!collapsed && (
          <p className="text-[11px] text-white/30 truncate px-3">{user?.email}</p>
        )}
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "w-full gap-2 text-white/30 hover:text-red-400 hover:bg-[rgba(255,255,255,0.03)]",
            collapsed ? "justify-center px-0" : "justify-start"
          )}
          onClick={signOut}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </Button>

        {showCollapseBtn && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-center text-white/20 hover:text-white/50 hover:bg-[rgba(255,255,255,0.03)] mt-1"
            onClick={onCollapse}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        )}
      </div>
    </div>
  );
}

export function DealerLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (isMobile) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="flex items-center gap-3 px-4 py-3 border-b border-border/30 bg-background">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="w-72 p-0 border-r border-[rgba(255,255,255,0.06)]"
              style={{ background: "linear-gradient(180deg, #111315 0%, #15181c 100%)" }}
            >
              <SidebarContent collapsed={false} showCollapseBtn={false} />
            </SheetContent>
          </Sheet>
          <span className="font-bold text-lg text-foreground tracking-tight">R</span>
          <span className="font-semibold text-sm text-foreground/60 flex-1">Reconverse</span>
          <NotificationBell />
        </header>
        <main className="flex-1 overflow-auto">
          <div className="p-3 max-w-7xl mx-auto"><Outlet /></div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <aside className={cn("shrink-0 transition-all duration-300 ease-in-out", collapsed ? "w-[72px]" : "w-60")}>
        <div className="sticky top-0 h-screen">
          <SidebarContent collapsed={collapsed} onCollapse={() => setCollapsed((c) => !c)} showCollapseBtn />
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="sticky top-0 z-10 flex justify-end px-5 py-2 bg-background/80 backdrop-blur border-b border-border/30">
          <NotificationBell />
        </div>
        <div className="p-5 max-w-7xl mx-auto"><Outlet /></div>
      </main>
    </div>
  );
}
