import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  LayoutDashboard,
  Building2,
  Users,
  Settings,
  LogOut,
  Shield,
  ChevronLeft,
  ChevronRight,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import motorverseLogo from "@/assets/motorverse-logo.webp";

const workspaceItems = [
  { to: "/platform", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "/platform/dealers", icon: Building2, label: "Dealers" },
];

const adminItems = [
  { to: "/platform/users", icon: Users, label: "Users" },
  { to: "/platform/settings", icon: Settings, label: "Settings" },
];

function SidebarNavItem({
  to,
  icon: Icon,
  label,
  end,
  collapsed,
}: {
  to: string;
  icon: React.ElementType;
  label: string;
  end?: boolean;
  collapsed: boolean;
}) {
  const inner = (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          "group relative flex items-center gap-3 rounded-xl text-sm font-semibold transition-all duration-200",
          collapsed ? "justify-center px-3 py-3" : "px-4 py-3",
          isActive
            ? "bg-primary/15 text-primary shadow-[0_0_20px_-4px_hsl(var(--primary)/0.35)]"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
        )
      }
    >
      {({ isActive }: { isActive: boolean }) => (
        <>
          {isActive && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-r-full bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.6)]" />
          )}
          <Icon className="h-5 w-5 shrink-0" />
          {!collapsed && <span>{label}</span>}
        </>
      )}
    </NavLink>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{inner}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={12}>
          {label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return inner;
}

function SidebarContent({
  collapsed,
  onCollapse,
  showCollapseBtn,
}: {
  collapsed: boolean;
  onCollapse?: () => void;
  showCollapseBtn: boolean;
}) {
  const { signOut, user } = useAuth();

  return (
    <div className="flex h-full flex-col glass-panel-strong border-0 border-r border-border/50">
      {/* Brand header */}
      <div className={cn("border-b border-border/30 flex flex-col items-center", collapsed ? "px-2 py-4" : "px-4 py-5")}>
        <img
          src={motorverseLogo}
          alt="Reconverse"
          className={cn("object-contain transition-all duration-300", collapsed ? "h-10 w-10" : "h-36 w-36")}
        />
        {!collapsed && (
          <div className="mt-2 text-center">
            <div className="flex items-center justify-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-accent" />
              <span className="text-[10px] font-bold tracking-widest uppercase text-accent">
                Platform Admin
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Nav sections */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        <div>
          {!collapsed && (
            <p className="px-4 mb-2 text-[10px] font-bold tracking-[0.15em] uppercase text-muted-foreground/60">
              Workspace
            </p>
          )}
          <div className="space-y-1">
            {workspaceItems.map((item) => (
              <SidebarNavItem key={item.to} {...item} collapsed={collapsed} />
            ))}
          </div>
        </div>

        <div>
          {!collapsed && (
            <p className="px-4 mb-2 text-[10px] font-bold tracking-[0.15em] uppercase text-muted-foreground/60">
              Admin
            </p>
          )}
          <div className="space-y-1">
            {adminItems.map((item) => (
              <SidebarNavItem key={item.to} {...item} collapsed={collapsed} />
            ))}
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-border/30 p-3 space-y-1">
        {!collapsed && (
          <p className="text-[11px] text-muted-foreground truncate px-3">{user?.email}</p>
        )}
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "w-full gap-2 text-muted-foreground hover:text-destructive",
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
            className="w-full justify-center text-muted-foreground/50 hover:text-foreground mt-1"
            onClick={onCollapse}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        )}
      </div>
    </div>
  );
}

export function PlatformLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (isMobile) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="flex items-center gap-3 px-4 py-3 border-b border-border/30 glass-panel-strong rounded-none">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 bg-sidebar border-r border-border/30">
              <SidebarContent collapsed={false} showCollapseBtn={false} />
            </SheetContent>
          </Sheet>
          <img src={motorverseLogo} alt="Reconverse" className="h-7 w-7 object-contain" />
          <span className="font-bold text-sm text-foreground/80 tracking-wide">Platform Admin</span>
        </header>

        <main className="flex-1 overflow-auto">
          <div className="p-4 max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <aside
        className={cn(
          "shrink-0 transition-all duration-300 ease-in-out",
          collapsed ? "w-[72px]" : "w-64"
        )}
      >
        <div className="sticky top-0 h-screen">
          <SidebarContent
            collapsed={collapsed}
            onCollapse={() => setCollapsed((c) => !c)}
            showCollapseBtn
          />
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
