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
  Layers, Home, Bell
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
          "group relative flex items-center gap-3 rounded-full text-xs font-semibold tracking-wide transition-all duration-300",
          collapsed ? "justify-center px-3 py-3 mx-1" : "px-4 py-3 mx-2",
          isActive
            ? "bg-gradient-to-r from-primary/15 to-accent/5 border border-primary/20 text-foreground shadow-[0_0_15px_-3px_hsl(var(--primary)/0.15)]"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/5 border border-transparent"
        )
      }
    >
      {({ isActive }: { isActive: boolean }) => (
        <>
          {isActive && (
            <span className="absolute left-1 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-full bg-gradient-to-b from-primary to-accent shadow-[0_0_10px_hsl(var(--ring)/0.8)]" />
          )}
          <Icon className={cn("shrink-0 h-[17px] w-[17px] transition-transform group-hover:scale-105", isActive ? "text-accent" : "text-muted-foreground/60 group-hover:text-foreground")} />
          {!collapsed && <span>{label}</span>}
        </>
      )}
    </NavLink>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{inner}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={12} className="bg-popover border border-border/80 text-xs font-semibold text-foreground px-3 py-1.5 shadow-xl">
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

  return (
    <div
      className={cn(
        "flex h-full flex-col",
        className ? className : "border-r border-border/20"
      )}
      style={!className ? {
        background: "linear-gradient(180deg, hsl(var(--sidebar-background)) 0%, hsl(222, 47%, 2%) 100%)",
      } : undefined}
    >
      {/* Brand header */}
      <div className={cn(
        "flex flex-col items-center",
        collapsed ? "px-2 py-5" : "px-5 py-6",
        "border-b border-border/10"
      )}>
        <Link to="/" className="flex items-center justify-center gap-2.5 group">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-accent grid place-items-center text-foreground font-black text-base shadow-[0_0_20px_hsl(var(--primary)/0.25)] transition-transform group-hover:scale-105">
            R
          </div>
          {!collapsed && (
            <span className="font-extrabold tracking-tight text-foreground text-base group-hover:text-primary transition-colors">Reconverse</span>
          )}
        </Link>
        {!collapsed && (
          <div className="mt-3.5 px-3 py-1 bg-primary/5 rounded-full border border-primary/10 max-w-[190px] w-full text-center">
            <p className="text-[10px] font-bold text-primary/80 uppercase tracking-wider truncate">
              {membership?.dealers?.name ?? "Dealer Portal"}
            </p>
          </div>
        )}
      </div>

      {/* Nav sections */}
      <nav className="flex-1 overflow-y-auto py-6 space-y-6">
        {/* Workspace */}
        <div>
          {!collapsed && (
            <p className="px-5 mb-2.5 text-[9px] font-bold tracking-[0.15em] uppercase text-muted-foreground/35">
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
              <p className="px-5 mb-2.5 text-[9px] font-bold tracking-[0.15em] uppercase text-muted-foreground/35">
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
              <p className="px-5 mb-2.5 text-[9px] font-bold tracking-[0.15em] uppercase text-muted-foreground/35">
                Admin Settings
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
      <div className="border-t border-border/10 p-3.5 space-y-1 bg-black/20">
        {isPlatformAdmin && (
          <NavLink
            to="/platform"
            className={cn(
              "flex items-center gap-2 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:bg-muted/10 transition-colors",
              collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2.5"
            )}
          >
            <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
            {!collapsed && <span className="font-semibold">Platform God Mode</span>}
          </NavLink>
        )}
        {!collapsed && (
          <p className="text-[10px] text-muted-foreground/50 truncate px-3 font-mono">{user?.email}</p>
        )}
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "w-full gap-2 text-muted-foreground/70 hover:text-red-400 hover:bg-red-500/5 rounded-xl font-medium",
            collapsed ? "justify-center px-0" : "justify-start px-3"
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
            className="w-full justify-center text-muted-foreground/30 hover:text-foreground hover:bg-muted/10 mt-1.5 rounded-xl"
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
