import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Home from "@/pages/Home";
import Post from "@/pages/Post";
import PropertyDetails from "@/pages/PropertyDetails";
import Rewards from "@/pages/Rewards";
import Credit from "@/pages/Credit";
import Saved from "@/pages/Saved";
import Profile from "@/pages/Profile";
import TenantProfile from "@/pages/TenantProfile";
import PreQualification from "@/pages/PreQualification";
import Applications from "@/pages/Applications";
import Viewings from "@/pages/Viewings";
import MovingTools from "@/pages/MovingTools";
import Admin from "@/pages/Admin";
import AdminPanel from "@/pages/AdminPanel";
import Friends from "@/pages/Friends";
import Messages from "@/pages/Messages";
import MasterLease from "@/pages/MasterLease";
import PayRent from "@/pages/PayRent";

import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import SearchResults from "@/pages/SearchResults";
import ChatProvider from "@/components/ChatProvider";
import ProgressNotification from "@/components/ProgressNotification";
import LossAversionNotification from "@/components/LossAversionNotification";
import DoublePointsChallenge from "@/components/DoublePointsChallenge";
import NotificationTester from "@/components/NotificationTester";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  // Add browser cache prevention for back button security
  useEffect(() => {
    // Prevent browser caching for authenticated pages
    if (typeof window !== 'undefined') {
      // Clear any cached authentication state on page load
      const handleBeforeUnload = () => {
        if (!isAuthenticated) {
          queryClient.removeQueries({ queryKey: ["/api/auth/user"] });
        }
      };

      // Clear auth cache when user navigates away from authenticated pages
      const handlePageHide = () => {
        if (!isAuthenticated) {
          queryClient.removeQueries({ queryKey: ["/api/auth/user"] });
          queryClient.clear();
        }
      };

      // Prevent back button access to authenticated pages after logout
      const handlePopState = (event: PopStateEvent) => {
        if (!isAuthenticated) {
          event.preventDefault();
          queryClient.clear();
          localStorage.clear();
          sessionStorage.clear();
          window.location.replace('/');
        } else {
          queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        }
      };

      window.addEventListener('beforeunload', handleBeforeUnload);
      window.addEventListener('pagehide', handlePageHide);
      window.addEventListener('popstate', handlePopState);

      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
        window.removeEventListener('pagehide', handlePageHide);
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, [isAuthenticated]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(220,20%,8%)]">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      <Route path="/search/:searchParams" component={SearchResults} />
      {!isAuthenticated ? (
        <>
          <Route path="/" component={Landing} />
          <Route component={Landing} />
        </>
      ) : (
        <>
          <Route path="/" component={Home} />
          <Route path="/post" component={Post} />
          <Route path="/property/:id" component={PropertyDetails} />
          <Route path="/rewards" component={Rewards} />
          <Route path="/credit" component={Credit} />
          <Route path="/saved" component={Saved} />
          <Route path="/applications" component={Applications} />
          <Route path="/viewings" component={Viewings} />
          <Route path="/moving" component={MovingTools} />
          <Route path="/profile" component={Profile} />
          <Route path="/tenant-profile" component={TenantProfile} />
          <Route path="/prequalification" component={PreQualification} />
          <Route path="/admin" component={Admin} />
          <Route path="/admin-panel" component={AdminPanel} />
          <Route path="/friends" component={Friends} />
          <Route path="/messages" component={Messages} />
          <Route path="/pay-rent" component={PayRent} />

          <Route component={NotFound} />
          <ProgressNotification />
          <LossAversionNotification />
          <DoublePointsChallenge />
          <NotificationTester />
        </>
      )}
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ChatProvider defaultUserType="tenant">
          <Toaster />
          <Router />
        </ChatProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
