import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, X, Trophy, Zap } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";

export default function ProgressNotification() {
  const [isVisible, setIsVisible] = useState(false);
  const [hasClicked, setHasClicked] = useState(false);
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: notificationData } = useQuery({
    queryKey: ["/api/user/progress-notification"],
    enabled: isAuthenticated && !hasClicked,
    refetchInterval: 30000, // Check every 30 seconds
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error)) {
        return false;
      }
      return failureCount < 2;
    },
  });

  const trackClick = useMutation({
    mutationFn: () => apiRequest('POST', '/api/user/track-progress-click'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/rewards/transactions'] });
      toast({
        title: "Engagement Bonus!",
        description: "+5 points for staying engaged!",
      });
      setHasClicked(true);
      setIsVisible(false);
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        return;
      }
      console.error("Error tracking progress click:", error);
    },
  });

  useEffect(() => {
    if (notificationData?.shouldShow && !hasClicked) {
      setIsVisible(true);
    }
  }, [notificationData, hasClicked]);

  const handleClick = () => {
    trackClick.mutate();
  };

  const handleDismiss = () => {
    setIsVisible(false);
  };

  if (!isVisible || !notificationData?.shouldShow) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg shadow-lg p-4 border border-blue-300">
      <div className="flex items-start gap-3">
        <div className="bg-yellow-400 rounded-full p-1">
          <Trophy className="h-4 w-4 text-blue-900" />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-sm mb-1">Almost There! 🎯</h4>
          <p className="text-xs text-blue-100 mb-3">
            {notificationData.message}
          </p>
          <button
            onClick={handleClick}
            disabled={trackClick.isPending}
            className="bg-yellow-400 text-blue-900 px-3 py-1 rounded-md text-xs font-medium hover:bg-yellow-300 transition-colors flex items-center gap-1"
          >
            <Zap className="h-3 w-3" />
            {trackClick.isPending ? "Tracking..." : "Track Progress (+5 pts)"}
          </button>
        </div>
        <button
          onClick={handleDismiss}
          className="text-blue-200 hover:text-white transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}