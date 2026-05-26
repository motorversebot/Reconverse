import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export function PlatformGuard({ children }: { children: React.ReactNode }) {
  const { user, isPlatformAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground animate-pulse">Loading…</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!isPlatformAdmin) return <Navigate to="/" replace />;

  return <>{children}</>;
}
