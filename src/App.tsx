import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PlatformGuard } from "@/components/platform/PlatformGuard";
import { PlatformLayout } from "@/components/platform/PlatformLayout";
import { DealerGuard } from "@/components/dealer/DealerGuard";
import { DealerLayout } from "@/components/dealer/DealerLayout";

// Marketing + auth load eagerly (first paint); app surfaces are code-split so a
// dealer never downloads the platform-admin bundle and vice versa.
import Index from "./pages/Index";
import Login from "./pages/Login";

const Dashboard = lazy(() => import("./pages/platform/Dashboard"));
const Dealers = lazy(() => import("./pages/platform/Dealers"));
const DealerDetail = lazy(() => import("./pages/platform/DealerDetail"));
const UsersPage = lazy(() => import("./pages/platform/UsersPage"));
const SettingsPage = lazy(() => import("./pages/platform/SettingsPage"));
const DealerDashboard = lazy(() => import("./pages/dealer/DealerDashboard"));
const DealerUnitsPage = lazy(() => import("./pages/dealer/DealerUnitsPage"));
const DealerUsersPage = lazy(() => import("./pages/dealer/DealerUsersPage"));
const DealerSettingsPage = lazy(() => import("./pages/dealer/DealerSettingsPage"));
const DealerBillingPage = lazy(() => import("./pages/dealer/DealerBillingPage"));
const UnitDetailPage = lazy(() => import("./pages/dealer/UnitDetailPage"));
const PipelineStagePage = lazy(() => import("./pages/dealer/PipelineStagePage"));
const ReportsPage = lazy(() => import("./pages/dealer/ReportsPage"));
const NotificationsPage = lazy(() => import("./pages/dealer/NotificationsPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-foreground" />
    </div>
  );
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />

                {/* Platform Admin routes */}
                <Route
                  path="/platform"
                  element={
                    <PlatformGuard>
                      <PlatformLayout />
                    </PlatformGuard>
                  }
                >
                  <Route index element={<Dashboard />} />
                  <Route path="dealers" element={<Dealers />} />
                  <Route path="dealers/:dealerId" element={<DealerDetail />} />
                  <Route path="users" element={<UsersPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                </Route>

                {/* Dealer portal routes */}
                <Route
                  path="/dealer"
                  element={
                    <DealerGuard>
                      <DealerLayout />
                    </DealerGuard>
                  }
                >
                  <Route index element={<DealerDashboard />} />
                  <Route path="units" element={<DealerUnitsPage />} />
                  <Route path="units/:unitId" element={<UnitDetailPage />} />
                  <Route path="recon-lane/:stage" element={<PipelineStagePage />} />
                  <Route path="reports" element={<ReportsPage />} />
                  <Route path="notifications" element={<NotificationsPage />} />
                  <Route path="users" element={<DealerUsersPage />} />
                  <Route path="billing" element={<DealerBillingPage />} />
                  <Route path="settings" element={<DealerSettingsPage />} />
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
