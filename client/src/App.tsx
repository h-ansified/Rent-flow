import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationsMenu } from "@/components/notifications-menu";
import { ProtectedRoute } from "@/components/protected-route";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Properties from "@/pages/properties";
import Tenants from "@/pages/tenants";
import Payments from "@/pages/payments";
import Maintenance from "@/pages/maintenance";
import Expenses from "@/pages/expenses";
import Settings from "@/pages/settings";
import Help from "@/pages/help";
import Login from "@/pages/login";
import Signup from "@/pages/signup";
import Welcome from "@/pages/welcome";
import ForgotPassword from "@/pages/forgot-password";

function ProtectedRouter() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/properties" component={Properties} />
      <Route path="/tenants" component={Tenants} />
      <Route path="/payments" component={Payments} />
      <Route path="/maintenance" component={Maintenance} />
      <Route path="/expenses" component={Expenses} />
      <Route path="/settings" component={Settings} />
      <Route path="/help" component={Help} />
      <Route component={NotFound} />
    </Switch>
  );
}

function Router() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/welcome" component={Welcome} />
      {/* Protected routes */}
      <Route>
        <ProtectedRoute>
          <SidebarProvider style={{
            "--sidebar-width": "16rem",
            "--sidebar-width-icon": "3rem",
          } as React.CSSProperties}>
            <div className="flex h-screen w-full">
              <AppSidebar />
              <div className="flex flex-col flex-1 overflow-hidden">
                <header className="flex items-center justify-between gap-4 p-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
                  <SidebarTrigger data-testid="button-sidebar-toggle" />
                  <div className="flex items-center gap-2">
                    <NotificationsMenu />
                    <ThemeToggle />
                  </div>
                </header>
                <main className="flex-1 overflow-auto">
                  <ProtectedRouter />
                </main>
              </div>
            </div>
          </SidebarProvider>
        </ProtectedRoute>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
