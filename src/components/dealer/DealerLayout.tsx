import { useState } from "react";
import { NavLink, Outlet, useLocation, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentDealer } from "@/hooks/useDealerData";
import { useIsMobile } from "@/hooks/use-mobile";
import { canManageUsers, canAccessReconLane } from "@/lib/permissions";
import {
  LayoutDashboard, Car, Users, Settings, LogOut, ArrowLeft,
  ChevronLeft, ChevronRight, Menu, BarChart3,
  ClipboardCheck, Calculator, ThumbsUp, Wrench, ShieldCheck, Tag,
  Layers, Home, Bell, MessageSquare
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
  { to: "/dealer/messages", icon: MessageSquare, label: "Messages" },
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
          "group relative flex items-center gap-3 rounded-none text-[11px] font-mono uppercase tracking-wider transition-colors duration-150",
          collapsed ? "justify-center px-3 py-3" : "px-4 py-3 border-l-2",
          isActive
            ? "border-foreground text-foreground bg-muted"
            : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
        )
      }
    >
      {({ isActive }: { isActive: boolean }) => (
        <>
          <Icon className={cn("shrink-0 h-[15px] w-[15px] transition-transform", isActive ? "text-foreground" : "text-muted-foreground/60 group-hover:text-foreground")} />
          {!collapsed && <span>{label}</span>}
        </>
      )}
    </NavLink>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{inner}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={12} className="bg-popover border border-border text-[10px] font-mono uppercase tracking-wider text-foreground px-3 py-1.5 shadow-xl rounded-none">
          {label}
        </TooltipContent>
      </Tooltip>
    );
  }
  return inner;
}

function SidebarContent({
  collapsed, onCollapse, showCollapseBtn, className,
}: {
  collapsed: boolean; onCollapse?: () => void; showCollapseBtn: boolean; className?: string;
}) {
  const { signOut, user, isPlatformAdmin } = useAuth();
  const { data: membership } = useCurrentDealer();
  const role = membership?.role as string | undefined;

  const showReconLane = canAccessReconLane(role);
  const showAdmin = canManageUsers(role);

  // Filter adminItems to exclude units page to keep list clean
  const filteredAdminItems = adminItems.filter(item => item.to !== "/dealer/units");

  return (
    <div
      className={cn(
        "flex h-full flex-col",
        className ? className : "border-r border-border"
      )}
      style={!className ? {
        background: "hsl(var(--background))",
      } : undefined}
    >
      {/* Brand header */}
      <div className={cn(
        "flex flex-col items-center",
        collapsed ? "px-2 py-5" : "px-5 py-6",
        "border-b border-border/10"
      )}>
        <Link to="/" className="flex items-center justify-center gap-2 group">
          <div className="h-7 w-7 rounded-none border border-foreground bg-foreground text-background flex items-center justify-center font-mono font-bold text-xs transition-transform group-hover:scale-105">
            R
          </div>
          {!collapsed && (
            <span className="font-mono font-bold tracking-widest text-foreground text-sm uppercase">Reconverse</span>
          )}
        </Link>
        {!collapsed && (
          <div className="mt-3.5 px-3 py-1 bg-card border border-border rounded-none max-w-[190px] w-full text-center">
            <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider truncate">
              {membership?.dealer_name?.trim() || "Dealer Portal"}
            </p>
          </div>
        )}
      </div>

      {/* Nav sections */}
      <nav className="flex-1 overflow-y-auto py-6 space-y-6">
        {/* Workspace */}
        <div>
          {!collapsed && (
            <p className="px-5 mb-2 text-[9px] font-mono tracking-widest uppercase text-muted-foreground/45">
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
              <p className="px-5 mb-2 text-[9px] font-mono tracking-widest uppercase text-muted-foreground/45">
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
              <p className="px-5 mb-2 text-[9px] font-mono tracking-widest uppercase text-muted-foreground/45">
                Admin Settings
              </p>
            )}
            <div className="space-y-0.5">
              {filteredAdminItems.map((item) => (
                <SidebarNavItem key={item.to} {...item} collapsed={collapsed} />
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-3.5 space-y-2 bg-muted/20">
        {isPlatformAdmin && (
          <NavLink
            to="/platform"
            className={cn(
              "flex items-center gap-2 rounded-none text-xs text-muted-foreground hover:text-foreground hover:bg-muted/10 transition-colors",
              collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2.5"
            )}
          >
            <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
            {!collapsed && <span className="font-mono uppercase text-[10px] tracking-wider font-semibold">Platform God Mode</span>}
          </NavLink>
        )}
        {!collapsed && (
          <p className="text-[9px] text-muted-foreground/40 truncate px-3 font-mono">{user?.email}</p>
        )}
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "w-full gap-2 text-muted-foreground/70 hover:text-foreground hover:bg-muted rounded-none font-mono uppercase text-[10px] tracking-wider border border-border h-8",
            collapsed ? "justify-center px-0" : "justify-start px-3"
          )}
          onClick={signOut}
        >
          <LogOut className="h-3.5 w-3.5 shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </Button>

        {showCollapseBtn && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-center text-muted-foreground/30 hover:text-foreground hover:bg-muted mt-1 rounded-none h-7"
            onClick={onCollapse}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        )}
      </div>
    </div>
  );
}

/* Breadcrumbs generator based on pathname */
function Breadcrumbs() {
  const location = useLocation();
  const pathnames = location.pathname.split("/").filter(x => x);

  return (
    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground/60 select-none">
      <Home className="h-3 w-3" />
      {pathnames.map((val, idx) => {
        const routeTo = `/${pathnames.slice(0, idx + 1).join("/")}`;
        const isLast = idx === pathnames.length - 1;
        const formattedLabel = val.charAt(0).toUpperCase() + val.slice(1).replace("-", " ");
        
        return (
          <div key={routeTo} className="flex items-center gap-1.5">
            <span className="text-muted-foreground/30">/</span>
            {isLast ? (
              <span className="text-foreground/80 font-bold">{formattedLabel}</span>
            ) : (
              <NavLink to={routeTo} className="hover:text-foreground transition-colors">{formattedLabel}</NavLink>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function DealerLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (isMobile) {
    return (
      <div className="min-h-screen bg-background flex flex-col selection:bg-primary/20 selection:text-primary">
        <header className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 border-b border-border/30 bg-background/60 backdrop-blur-xl">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0 rounded-xl hover:bg-muted/10">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="w-72 p-0 border-r border-border/10"
            >
              <SidebarContent collapsed={false} showCollapseBtn={false} />
            </SheetContent>
          </Sheet>
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-primary to-accent grid place-items-center text-foreground font-black text-xs shadow-[0_0_12px_hsl(var(--primary)/0.25)]">
            R
          </div>
          <span className="font-extrabold text-sm text-foreground flex-1 tracking-tight">Reconverse</span>
          <NotificationBell />
        </header>
        <main className="flex-1 overflow-auto">
          <div className="p-4 max-w-7xl mx-auto"><Outlet /></div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex selection:bg-primary/20 selection:text-primary">
      <aside className={cn("shrink-0 transition-all duration-300 ease-in-out z-30", collapsed ? "w-20" : "w-64")}>
        <div className="sticky top-0 h-screen py-3 pl-3">
          <SidebarContent 
            collapsed={collapsed} 
            onCollapse={() => setCollapsed((c) => !c)} 
            showCollapseBtn 
            className="floating-sidebar m-0 h-full" 
          />
        </div>
      </aside>
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-14 shrink-0 flex items-center justify-between px-6 bg-background/55 backdrop-blur-xl border-b border-border/20 z-20">
          <Breadcrumbs />
          <div className="flex items-center gap-4">
            <NotificationBell />
          </div>
        </header>
        <div className="flex-1 overflow-y-auto bg-background/40">
          <div className="p-6 max-w-7xl mx-auto"><Outlet /></div>
        </div>
      </main>
    </div>
  );
}
