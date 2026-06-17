import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { PlatformGuard } from "@/components/platform/PlatformGuard";
import { PlatformLayout } from "@/components/platform/PlatformLayout";
import { DealerGuard } from "@/components/dealer/DealerGuard";
import { DealerLayout } from "@/components/dealer/DealerLayout";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Dashboard from "./pages/platform/Dashboard";
import Dealers from "./pages/platform/Dealers";
import DealerDetail from "./pages/platform/DealerDetail";
import UsersPage from "./pages/platform/UsersPage";
import SettingsPage from "./pages/platform/SettingsPage";
import DealerDashboard from "./pages/dealer/DealerDashboard";
import DealerUnitsPage from "./pages/dealer/DealerUnitsPage";
import DealerUsersPage from "./pages/dealer/DealerUsersPage";
import DealerSettingsPage from "./pages/dealer/DealerSettingsPage";
import UnitDetailPage from "./pages/dealer/UnitDetailPage";
import PipelineStagePage from "./pages/dealer/PipelineStagePage";
import ReportsPage from "./pages/dealer/ReportsPage";
import MessagesPage from "./pages/dealer/MessagesPage";
import NotificationsPage from "./pages/dealer/NotificationsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
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
              <Route path="messages" element={<MessagesPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="users" element={<DealerUsersPage />} />
              <Route path="settings" element={<DealerSettingsPage />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
