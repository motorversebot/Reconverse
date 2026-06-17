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

  // Reconverse access granted in Identity, but not assigned to any dealer yet.
  // Block dealer screens with a clear message instead of a redirect loop.
  if (membership?.needs_dealer_assignment && !membership.is_platform_admin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-lg font-semibold text-foreground">No dealership assigned yet</h1>
          <p className="text-sm text-muted-foreground">
            Your account has Reconverse access, but you haven't been added to a dealership.
            Ask your administrator to assign you to a dealer in Mission Control, then sign in again.
          </p>
        </div>
      </div>
    );
  }

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
