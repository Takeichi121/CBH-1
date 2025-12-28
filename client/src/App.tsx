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
import WorkPage from "@/pages/work-page";
import RosterPage from "@/pages/roster-page";
import SettingsPage from "@/pages/settings-page";
import AdminPage from "@/pages/admin-page";
import NotFound from "@/pages/not-found";
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
            <ProtectedRoute component={WorkPage} path="/work" />
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
