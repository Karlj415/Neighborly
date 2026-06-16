import { useState, useEffect } from "react";
import { AlertTriangle, X, Clock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function LossAversionNotification() {
  const [isVisible, setIsVisible] = useState(false);
  const [pointsAtRisk, setPointsAtRisk] = useState(0);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) return;

    // Simulate checking for expiring points (in real app, this would be an API call)
    const checkExpiringPoints = () => {
      // Mock data - simulate user has points that expire in 3 days
      const simulatedExpiringPoints = Math.random() > 0.7 ? Math.floor(Math.random() * 200) + 50 : 0;
      
      if (simulatedExpiringPoints > 0) {
        setPointsAtRisk(simulatedExpiringPoints);
        setIsVisible(true);
      }
    };

    // Check on mount and then every 10 seconds for testing
    checkExpiringPoints();
    const interval = setInterval(checkExpiringPoints, 10000);

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const handleDismiss = () => {
    setIsVisible(false);
  };

  if (!isVisible || !pointsAtRisk) {
    return null;
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-lg shadow-lg p-4 border border-red-300">
      <div className="flex items-start gap-3">
        <div className="bg-yellow-400 rounded-full p-1">
          <AlertTriangle className="h-4 w-4 text-red-900" />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-sm mb-1 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Points Expiring Soon! ⏰
          </h4>
          <p className="text-xs text-red-100 mb-3">
            You have {pointsAtRisk} points expiring in 3 days. Use them before you lose them!
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => window.location.href = '/rewards'}
              className="bg-yellow-400 text-red-900 px-3 py-1 rounded-md text-xs font-medium hover:bg-yellow-300 transition-colors"
            >
              Redeem Now
            </button>
            <button
              onClick={handleDismiss}
              className="bg-transparent border border-red-200 text-red-100 px-3 py-1 rounded-md text-xs hover:bg-red-400 transition-colors"
            >
              Remind Later
            </button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="text-red-200 hover:text-white transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}