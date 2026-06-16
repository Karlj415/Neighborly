import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    staleTime: 30 * 1000, // Cache for 30 seconds only
    gcTime: 60 * 1000, // Keep in cache for 1 minute
    refetchOnWindowFocus: true, // Always check on focus
    refetchOnMount: true, // Always check on mount
    refetchOnReconnect: true,
  });

  const isAuthenticated = !!user && !error;

  return {
    user,
    isLoading,
    isAuthenticated,
  };
}
