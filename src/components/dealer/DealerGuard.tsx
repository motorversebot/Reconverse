import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentDealer } from "@/hooks/useDealerData";
import { canManageUsers, canAccessReconLane, isStaffOnly } from "@/lib/permissions";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useRef } from "react";

export function DealerGuard({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { data: membership, isLoading: membershipLoading } = useCurrentDealer();
  const location = useLocation();
  const { toast } = useToast();
  const toastShownRef = useRef("");

  const role = membership?.role as string;
  const path = location.pathname;

  // Show toast once when staff tries blocked routes
  const staffBlocked =
    role &&
    isStaffOnly(role) &&
    (path.match(/^\/dealer\/units\/[^/]+/) || path.startsWith("/dealer/recon-lane"));

  useEffect(() => {
    if (staffBlocked && toastShownRef.current !== path) {
      toastShownRef.current = path;
      toast({
        title: "Access restricted",
        description: "Inventory view only.",
        variant: "destructive",
      });
    }
  }, [staffBlocked, path, toast]);

  if (authLoading || membershipLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground animate-pulse">Loading…</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!membership) return <Navigate to="/" replace />;

  // Staff cannot access unit detail or recon lane pages
  if (staffBlocked) {
    return <Navigate to="/dealer/units" replace />;
  }

  // Staff cannot access recon lane pages (redundant but safe)
  if (path.startsWith("/dealer/recon-lane") && !canAccessReconLane(role)) {
    return <Navigate to="/dealer/units" replace />;
  }

  // Only owner/admin can access users & settings
  if ((path === "/dealer/users" || path === "/dealer/settings") && !canManageUsers(role)) {
    return <Navigate to="/dealer/units" replace />;
  }

  return <>{children}</>;
}
