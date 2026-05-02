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
import { PWAInstallPrompt } from "@/components/pwa-install-prompt";
import { FloatingChat } from "@/components/floating-chat";
import { FloatingChannChat } from "@/components/floating-chann-chat";
import { OnboardingTour } from "@/components/onboarding-tour";

// Pages
import AuthPage from "@/pages/auth-page";
import WorkPage from "@/pages/work-page";
import RosterPage from "@/pages/roster-page";
import SettingsPage from "@/pages/settings-page";
import AdminPage from "@/pages/admin-page";
import BorrowDashboardPage from "@/pages/borrow/dashboard-page";
import BorrowTransactionsPage from "@/pages/borrow/transactions-page";
import BorrowHistoryPage from "@/pages/borrow/History";
import BorrowBranchesPage from "@/pages/borrow/Branches";
import BorrowItemsPage from "@/pages/borrow/Items";
import BorrowSettingsPage from "@/pages/borrow/settings-page";
import BorrowHelpPage from "@/pages/borrow/help-page";
import BorrowAnalyticsPage from "@/pages/borrow/analytics-page";
import ManagerRequestsPage from "@/pages/manager-requests-page";
import HandbookPage from "@/pages/handbook-page";
import ManagerManualPage from "@/pages/manager-manual-page";
import DevToolboxPage from "@/pages/dev-toolbox-page";
import ForgotPasswordPage from "@/pages/forgot-password-page";
import DashboardPage from "@/pages/dashboard-page";
import RosterImportPage from "@/pages/roster-import-page";
import NotFound from "@/pages/not-found";
import AgentRequestsPage from "@/pages/agent-requests-page";
import AdminPermissionsPage from "@/pages/admin-permissions-page";
import AnnouncementsPage from "@/pages/announcements-page";

// Settings Pages
import DropdownSettingsPage from "@/pages/settings/dropdown-settings-page";

// Sales Pages
import SalesDashboardPage from "@/pages/sales/dashboard-page";
import DailySalesPage from "@/pages/sales/daily-sales-page";
import SalesReportsPage from "@/pages/sales/reports-page";
import SalesSettingsPage from "@/pages/sales/settings-page";
import SalesManualPage from "@/pages/sales/manual-page";
import ImportDBFPage from "@/pages/sales/import-dbf-page";
import WeeklySalesPage from "@/pages/sales/weekly-sales-page";
import CustomizeReportPage from "@/pages/sales/customize-report-page";

import { useEffect } from "react";

function AdminProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "admin")) {
      setLocation("/work");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) return <LoadingScreen />;
  if (!user || user.role !== "admin") return null;

  return <Component />;
}

const VIEWER_ALLOWED_PATHS = [
  "/sales",
  "/sales/daily",
  "/sales/weekly",
  "/sales/reports",
  "/sales/manual",
  "/handbook",
  "/announcements",
];

const PATH_TO_FEATURE: Record<string, string> = {
  "/dashboard": "dashboard",
  "/handbook": "handbook",
  "/manager-manual": "handbook",
  "/settings": "settings",
  "/settings/dropdowns": "settings",
  "/work": "work",
  "/roster": "roster",
  "/roster/import": "roster",
  "/requests": "requests",
  "/sales": "sales",
  "/sales/daily": "sales",
  "/sales/weekly": "sales",
  "/sales/reports": "sales",
  "/sales/manual": "sales",
  "/sales/settings": "sales_settings",
  "/sales/import": "sales_import",
  "/borrow": "borrow",
  "/borrow/transactions": "borrow",
  "/borrow/history": "borrow",
  "/borrow/branches": "borrow",
  "/borrow/items": "borrow",
  "/borrow/settings": "borrow",
  "/borrow/help": "borrow",
  "/admin": "admin",
  "/admin/permissions": "admin",
};

function ProtectedRoute({ component: Component, path }: { component: React.ComponentType, path: string }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  const featureKey = PATH_TO_FEATURE[path];

  const isViewerPath = user?.role === "viewer";
  const featureDenied = !!user?.allowedFeatures && !!featureKey && !user.allowedFeatures.includes(featureKey);
  const viewerPathDenied = isViewerPath && !VIEWER_ALLOWED_PATHS.includes(path);

  const getFirstAllowedRoute = () => {
    if (!user?.allowedFeatures) return user?.role === "viewer" ? "/sales" : "/work";
    const candidates = user.role === "viewer"
      ? [{ path: "/sales", key: "sales" }, { path: "/handbook", key: "handbook" }]
      : [
          { path: "/dashboard", key: "dashboard" },
          { path: "/work", key: "work" },
          { path: "/sales", key: "sales" },
          { path: "/roster", key: "roster" },
          { path: "/borrow", key: "borrow" },
          { path: "/handbook", key: "handbook" },
          { path: "/settings", key: "settings" },
        ];
    const first = candidates.find((c) => user.allowedFeatures!.includes(c.key));
    return first?.path || "/";
  };

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/");
    } else if (!isLoading && user && viewerPathDenied) {
      setLocation(getFirstAllowedRoute());
    } else if (!isLoading && user && !viewerPathDenied && featureDenied) {
      setLocation(getFirstAllowedRoute());
    }
  }, [user, isLoading, setLocation, path, featureDenied, viewerPathDenied]);

  if (isLoading) return <LoadingScreen />;
  if (!user) return null;
  if (viewerPathDenied) return null;
  if (featureDenied) return null;

  return <Component />;
}

function Router() {
  return (
    <>
      <Layout>
        <Switch>
          <Route path="/" component={AuthPage} />
          <Route path="/auth" component={AuthPage} />
          <Route path="/forgot-password" component={ForgotPasswordPage} />
          
          <Route path="/work">
            <ProtectedRoute component={WorkPage} path="/work" />
          </Route>
          
          <Route path="/roster">
            <ProtectedRoute component={RosterPage} path="/roster" />
          </Route>
          
          <Route path="/roster/import">
            <ProtectedRoute component={RosterImportPage} path="/roster/import" />
          </Route>
          
          <Route path="/settings">
            <ProtectedRoute component={SettingsPage} path="/settings" />
          </Route>
          
          <Route path="/settings/dropdowns">
            <ProtectedRoute component={DropdownSettingsPage} path="/settings/dropdowns" />
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
          
          <Route path="/sales/manual">
            <ProtectedRoute component={SalesManualPage} path="/sales/manual" />
          </Route>
          
          <Route path="/sales/import">
            <ProtectedRoute component={ImportDBFPage} path="/sales/import" />
          </Route>
          
          <Route path="/sales/weekly">
            <ProtectedRoute component={WeeklySalesPage} path="/sales/weekly" />
          </Route>

          <Route path="/sales/customize">
            <AdminProtectedRoute component={CustomizeReportPage} />
          </Route>
          
          {/* Borrow Routes */}
          <Route path="/borrow">
            <ProtectedRoute component={BorrowDashboardPage} path="/borrow" />
          </Route>
          
          <Route path="/borrow/transactions">
            <ProtectedRoute component={BorrowTransactionsPage} path="/borrow/transactions" />
          </Route>

          <Route path="/borrow/history">
            <ProtectedRoute component={BorrowHistoryPage} path="/borrow/history" />
          </Route>

          <Route path="/borrow/branches">
            <ProtectedRoute component={BorrowBranchesPage} path="/borrow/branches" />
          </Route>

          <Route path="/borrow/items">
            <ProtectedRoute component={BorrowItemsPage} path="/borrow/items" />
          </Route>
          
          <Route path="/borrow/settings">
            <ProtectedRoute component={BorrowSettingsPage} path="/borrow/settings" />
          </Route>
          
          <Route path="/borrow/help">
            <ProtectedRoute component={BorrowHelpPage} path="/borrow/help" />
          </Route>

          <Route path="/borrow/analytics">
            <ProtectedRoute component={BorrowAnalyticsPage} path="/borrow/analytics" />
          </Route>
          
          <Route path="/requests">
            <ProtectedRoute component={ManagerRequestsPage} path="/requests" />
          </Route>
          
          <Route path="/handbook">
            <ProtectedRoute component={HandbookPage} path="/handbook" />
          </Route>
          
          <Route path="/manager-manual">
            <ProtectedRoute component={ManagerManualPage} path="/manager-manual" />
          </Route>
          
          <Route path="/dev-toolbox">
            <ProtectedRoute component={DevToolboxPage} path="/dev-toolbox" />
          </Route>
          
          <Route path="/dashboard">
            <ProtectedRoute component={DashboardPage} path="/dashboard" />
          </Route>
          
          <Route path="/agent-requests">
            <AdminProtectedRoute component={AgentRequestsPage} />
          </Route>
          
          <Route path="/admin/permissions">
            <ProtectedRoute component={AdminPermissionsPage} path="/admin/permissions" />
          </Route>

          <Route path="/announcements">
            <ProtectedRoute component={AnnouncementsPage} path="/announcements" />
          </Route>
          
          <Route component={NotFound} />
        </Switch>
      </Layout>
      <ChangePasswordModal />
      <CompleteProfileModal />
      <FloatingChat />
      <FloatingChannChat />
      <OnboardingTour />
      <Toaster />
    </>
  );
}

import { ThemeProvider } from "next-themes";
import { ErrorBoundary } from "@/components/error-boundary";

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
        <QueryClientProvider client={queryClient}>
          <I18nProvider>
            <AuthProvider>
              <Router />
              <PWAInstallPrompt />
            </AuthProvider>
          </I18nProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
