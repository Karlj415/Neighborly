import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Building2, Bell, User, Settings, LogOut, MessageCircle, DollarSign, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import GoLiveButton from "./GoLiveButton";
import MessagesModal from "./MessagesModalNew";
import { IMessageChat } from "./IMessageChat";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Header() {
  const { user } = useAuth() as { user: any };
  const [location, setLocation] = useLocation();
  const [showMessagesModal, setShowMessagesModal] = useState(false);
  const { toast } = useToast();

  // Check if user is a tenant (has approved application) to show Pay Rent button
  const { data: rentInfo } = useQuery({
    queryKey: ["/api/tenant/rent-info"],
    enabled: !!user,
    retry: false, // Don't retry on 404 errors
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const isTenant = !!rentInfo;

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/auth/logout", {});
      return response.json();
    },
    onMutate: () => {
      // Immediately clear auth state to prevent flash
      queryClient.setQueryData(["/api/auth/user"], null);
    },
    onSuccess: () => {
      // Clear all React Query cache
      queryClient.clear();
      
      // Clear browser storage
      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
        
        // Clear browser cache by forcing reload
        window.location.replace("/");
      }
      
      toast({
        title: "Logged out successfully",
        description: "You have been securely logged out.",
      });
    },
    onError: (error: Error) => {
      // Even if logout fails on server, clear local state and redirect
      queryClient.clear();
      
      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
        window.location.replace("/");
      }
      
      toast({
        title: "Logout completed",
        description: "You have been logged out.",
        variant: "destructive",
      });
    },
  });

  const handleLogout = async () => {
    try {
      // Clear local state immediately
      queryClient.setQueryData(["/api/auth/user"], null);
      
      // Clear browser storage immediately
      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
        
        // Clear browser history to prevent back button access
        window.history.replaceState(null, '', '/');
        
        // Add multiple history entries to prevent back button navigation
        for (let i = 0; i < 10; i++) {
          window.history.pushState(null, '', '/');
        }
      }
      
      // Perform logout on server
      logoutMutation.mutate();
    } catch (error) {
      console.error("Logout error:", error);
      // Force logout even if there's an error
      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
        window.location.replace("/");
      }
    }
  };

  return (
    <header className="glass-card sticky top-0 z-50 border-b border-white/10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Mobile Menu + Logo */}
          <div className="flex items-center gap-2">
            {/* Hamburger (mobile only) */}
            <div className="md:hidden">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" className="p-2">
                    <Menu className="h-5 w-5 text-white" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="bg-card text-foreground w-72">
                  <nav className="mt-6 flex flex-col space-y-1">
                    <Link href="/" className={`px-3 py-2 rounded-md text-sm ${location === '/' ? 'text-primary' : 'text-foreground/80 hover:text-foreground'}`}>Search</Link>
                    <Link href="/post" className={`px-3 py-2 rounded-md text-sm ${location === '/post' ? 'text-primary' : 'text-foreground/80 hover:text-foreground'}`}>Community</Link>
                    <Link href="/saved" className={`px-3 py-2 rounded-md text-sm ${location === '/saved' ? 'text-primary' : 'text-foreground/80 hover:text-foreground'}`}>Saved</Link>
                    <Link href="/rewards" className={`px-3 py-2 rounded-md text-sm ${location === '/rewards' ? 'text-primary' : 'text-foreground/80 hover:text-foreground'}`}>Rewards</Link>
                    <Link href="/credit" className={`px-3 py-2 rounded-md text-sm ${location === '/credit' ? 'text-primary' : 'text-foreground/80 hover:text-foreground'}`}>Credit</Link>
                  </nav>
                </SheetContent>
              </Sheet>
            </div>

            <Link href="/" className="hidden md:flex items-center">
              <div className="w-8 h-8 bilt-gradient rounded-full flex items-center justify-center mr-3 shadow-lg">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-xl font-semibold text-white">Proptech</h1>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-8">
            <Link href="/" className={`transition-colors ${location === '/' ? 'text-primary font-medium' : 'text-white/80 hover:text-primary'}`}>
              Search
            </Link>
            <Link href="/post" className={`transition-colors ${location === '/post' ? 'text-primary font-medium' : 'text-white/80 hover:text-primary'}`}>
              Community
            </Link>
            <Link href="/saved" className={`transition-colors ${location === '/saved' ? 'text-primary font-medium' : 'text-white/80 hover:text-primary'}`}>
              Saved
            </Link>
            <Link href="/rewards" className={`transition-colors ${location === '/rewards' ? 'text-primary font-medium' : 'text-white/80 hover:text-primary'}`}>
              Rewards
            </Link>
            <Link href="/credit" className={`transition-colors ${location === '/credit' ? 'text-primary font-medium' : 'text-white/80 hover:text-primary'}`}>
              Credit
            </Link>
          </nav>

          {/* User Menu */}
          <div className="flex items-center space-x-3">
            {/* Go Live Button (desktop only) */}
            <div className="hidden md:block">
              <GoLiveButton />
            </div>
            
            {/* Notification Button */}
            <Button variant="ghost" size="sm" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                2
              </span>
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 rounded-full p-0">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.profileImageUrl || ""} alt={user?.firstName || "User"} />
                    <AvatarFallback className="bg-primary text-white">
                      {user?.firstName?.[0] || "U"}{user?.lastName?.[0] || ""}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <div className="flex flex-col space-y-1 p-2">
                  <p className="text-sm font-medium leading-none">{user?.firstName} {user?.lastName}</p>
                  <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="flex items-center">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>
                
                {isTenant && (
                  <DropdownMenuItem asChild>
                    <Link href="/pay-rent" className="flex items-center">
                      <DollarSign className="mr-2 h-4 w-4" />
                      <span>Pay Rent</span>
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem 
                  className="flex items-center cursor-pointer"
                  onClick={() => setShowMessagesModal(true)}
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  <span>Messages</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="flex items-center text-red-600 focus:text-red-600"
                  onClick={handleLogout}
                  disabled={logoutMutation.isPending}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{logoutMutation.isPending ? "Logging out..." : "Log out"}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
      
      {/* Messages Modal */}
      <IMessageChat 
        isOpen={showMessagesModal} 
        onClose={() => setShowMessagesModal(false)} 
        currentUserId={user?.id || ''}
      />
    </header>
  );
}
