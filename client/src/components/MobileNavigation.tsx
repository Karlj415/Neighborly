import { Link, useLocation } from "wouter";
import { Search, Heart, Star, Trophy, FileText, Calendar, Truck, MessageCircle, Plus, Users, User, Home, DollarSign } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";

export default function MobileNavigation() {
  const [location] = useLocation();
  const { user } = useAuth() as { user: any };

  // Check if user is a tenant (has approved application) to show Pay Rent button
  const { data: rentInfo } = useQuery({
    queryKey: ["/api/tenant/rent-info"],
    enabled: !!user,
    retry: false, // Don't retry on 404 errors
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const isTenant = !!rentInfo;

  const baseNavItems = [
    { href: "/", label: "Search" },
    { href: "/post", label: "Community" },
    { href: "/saved", label: "Saved" },
  ];

  const tenantNavItems = isTenant 
    ? [{ href: "/pay-rent", label: "Pay Rent" }]
    : [];

  const profileNavItems = [
    { href: "/profile", label: "Profile" },
  ];

  const navItems = [...baseNavItems, ...tenantNavItems, ...profileNavItems];

  return (
    <nav className="fixed bottom-0 left-0 right-0 glass-card border-t border-white/10 md:hidden z-50">
      <div className={`flex items-center justify-center h-16`}>
        {navItems.map(({ href, label }) => {
          const isActive = location === href;
          return (
            <Link key={href} href={href}>
              <button className={`px-3 sm:px-4 py-2 mx-1 sm:mx-2 rounded-md transition-colors text-sm font-medium ${
                isActive ? "text-primary" : "text-white/80 hover:text-white"
              }`}>
                {label}
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
