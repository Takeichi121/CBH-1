import { Switch, Route, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { I18nProvider } from "@/hooks/use-i18n";
import { Layout } from "@/components/layout";
import { LoadingScreen } from "@/components/loading-screen";
import { CompleteProfileModal } from "@/components/complete-profile-modal";
import { ChangePasswordModal } from "@/components/change-password-modal";

// Pages
import AuthPage from "@/pages/auth-page";
import WorkIndexPage from "@/pages/work/index-page";
import WorkEmployeePage from "@/pages/work/employee-page";
import WorkManagerPage from "@/pages/work/manager-page";
import ManagerSchedulePage from "@/pages/work/manager-schedule-page";
import RosterPage from "@/pages/roster-page";
import SettingsPage from "@/pages/settings-page";
import AdminPage from "@/pages/admin-page";
import BorrowTrackerPage from "@/pages/borrow-tracker-page";
import ManagerRequestsPage from "@/pages/manager-requests-page";
import HandbookPage from "@/pages/handbook-page";
import DevToolboxPage from "@/pages/dev-toolbox-page";
import NotFound from "@/pages/not-found";

// Sales Pages
import SalesDashboardPage from "@/pages/sales/dashboard-page";
import DailySalesPage from "@/pages/sales/daily-sales-page";
import SalesReportsPage from "@/pages/sales/reports-page";
import SalesSettingsPage from "@/pages/sales/settings-page";

import { useEffect } from "react";

function ProtectedRoute({ component: Component, path }: { component: React.ComponentType, path: string }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) return <LoadingScreen />;
  if (!user) return null;

  return <Component />;
}

function Router() {
  return (
    <>
      <Layout>
        <Switch>
          <Route path="/" component={AuthPage} />
          
          <Route path="/work">
            <ProtectedRoute component={WorkIndexPage} path="/work" />
          </Route>
          
          <Route path="/work/employee">
            <ProtectedRoute component={WorkEmployeePage} path="/work/employee" />
          </Route>
          
          <Route path="/work/manager">
            <ProtectedRoute component={WorkManagerPage} path="/work/manager" />
          </Route>
          
          <Route path="/work/manager-schedule">
            <ProtectedRoute component={ManagerSchedulePage} path="/work/manager-schedule" />
          </Route>
          
          <Route path="/roster">
            <ProtectedRoute component={RosterPage} path="/roster" />
          </Route>
          
          <Route path="/settings">
            <ProtectedRoute component={SettingsPage} path="/settings" />
          </Route>
          
          <Route path="/admin">
            <ProtectedRoute component={AdminPage} path="/admin" />
          </Route>
          
          {/* Sales Routes */}
          <Route path="/sales">
            <ProtectedRoute component={SalesDashboardPage} path="/sales" />
          </Route>
          
          <Route path="/sales/daily">
            <ProtectedRoute component={DailySalesPage} path="/sales/daily" />
          </Route>
          
          <Route path="/sales/reports">
            <ProtectedRoute component={SalesReportsPage} path="/sales/reports" />
          </Route>
          
          <Route path="/sales/settings">
            <ProtectedRoute component={SalesSettingsPage} path="/sales/settings" />
          </Route>
          
          <Route path="/borrow">
            <ProtectedRoute component={BorrowTrackerPage} path="/borrow" />
          </Route>
          
          <Route path="/requests">
            <ProtectedRoute component={ManagerRequestsPage} path="/requests" />
          </Route>
          
          <Route path="/handbook">
            <ProtectedRoute component={HandbookPage} path="/handbook" />
          </Route>
          
          <Route path="/dev-toolbox">
            <ProtectedRoute component={DevToolboxPage} path="/dev-toolbox" />
          </Route>
          
          <Route component={NotFound} />
        </Switch>
      </Layout>
      <ChangePasswordModal />
      <CompleteProfileModal />
      <Toaster />
    </>
  );
}

import { ThemeProvider } from "next-themes";

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light">
      <QueryClientProvider client={queryClient}>
        <I18nProvider>
          <AuthProvider>
            <Router />
            <Toaster />
          </AuthProvider>
        </I18nProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
