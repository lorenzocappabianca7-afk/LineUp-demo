import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "@/components/ErrorBoundary";
import AppShell from "@/components/AppShell";
import AppHome from "@/pages/AppHome";
import AppCalendar from "@/pages/AppCalendar";
import AppEventDetail from "@/pages/AppEventDetail";
import AppChatList from "@/pages/AppChatList";
import AppChatDetail from "@/pages/AppChatDetail";
import AppProfile from "@/pages/AppProfile";
import AppImpostazioni from "@/pages/AppImpostazioni";
import Admin from "@/pages/Admin";
import Analytics from "@/pages/Analytics";
import AppAddContact from "@/pages/AppAddContact";
import AppPianificaDemo from "@/pages/AppPianificaDemo";
import PianificaDemoFeedbackAdmin from "@/pages/PianificaDemoFeedbackAdmin";
import NotFound from "@/pages/not-found";

function AppRouter() {
  return (
    <Switch>
      <Route path="/admin" component={Admin} />
      <Route path="/prova-pianifica/riscontri" component={PianificaDemoFeedbackAdmin} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/add-contact" component={AppAddContact} />
      <Route>
        <AppShell>
          <Switch>
            <Route path="/" component={AppHome} />
            <Route path="/calendar" component={AppCalendar} />
            <Route path="/impostazioni" component={AppImpostazioni} />
            <Route path="/events/:id/chat" component={AppChatDetail} />
            <Route path="/events/:id" component={AppEventDetail} />
            <Route path="/chat" component={AppChatList} />
            <Route path="/profile" component={AppProfile} />
            <Route path="/prova-pianifica" component={AppPianificaDemo} />
            <Route component={NotFound} />
          </Switch>
        </AppShell>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ErrorBoundary>
            <div className="gpu-smooth">
              <AppRouter />
            </div>
          </ErrorBoundary>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
