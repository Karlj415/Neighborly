import { useState, useEffect } from "react";
import { Zap, Clock, X, Target } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function DoublePointsChallenge() {
  const [isVisible, setIsVisible] = useState(false);
  const [timeLeft, setTimeLeft] = useState("23:45:12");
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) return;

    // Show challenge notification randomly (80% chance for testing)
    const shouldShow = Math.random() > 0.2;
    if (shouldShow) {
      setIsVisible(true);
    }

    // Update countdown timer
    const timer = setInterval(() => {
      const now = new Date();
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      
      const timeRemaining = endOfDay.getTime() - now.getTime();
      const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
      const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);
      
      setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    }, 1000);

    return () => clearInterval(timer);
  }, [isAuthenticated]);

  const handleDismiss = () => {
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed top-20 left-4 right-4 z-40 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg shadow-lg p-4 border border-blue-300">
      <div className="flex items-start gap-3">
        <div className="bg-yellow-400 rounded-full p-1 animate-pulse">
          <Zap className="h-4 w-4 text-blue-900" />
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-sm mb-1 flex items-center gap-1">
            <Target className="h-3 w-3" />
            🔥 2X POINTS CHALLENGE!
          </h4>
          <p className="text-xs text-blue-100 mb-2">
            Complete any action and earn DOUBLE points! Limited time only.
          </p>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-3 w-3 text-yellow-400" />
            <span className="text-xs font-mono bg-black/20 px-2 py-1 rounded">
              {timeLeft}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => window.location.href = '/post'}
              className="bg-yellow-400 text-blue-900 px-3 py-1 rounded-md text-xs font-medium hover:bg-yellow-300 transition-colors"
            >
              Create Post (+60 pts)
            </button>
            <button
              onClick={() => window.location.href = '/'}
              className="bg-white/20 text-white px-3 py-1 rounded-md text-xs hover:bg-white/30 transition-colors"
            >
              Search Properties (+100 pts)
            </button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="text-purple-200 hover:text-white transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}