import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Circle } from "lucide-react";

export default function GoLiveButton() {
  const [isHolding, setIsHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isLive, setIsLive] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const startHold = () => {
    if (isLive) return;
    
    setIsHolding(true);
    setProgress(0);
    
    // Update progress every 30ms for smooth animation
    intervalRef.current = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + (100 / (3000 / 30)); // 3 seconds = 3000ms
        if (newProgress >= 100) {
          completeAction();
          return 100;
        }
        return newProgress;
      });
    }, 30);

    // Complete after 3 seconds
    timeoutRef.current = setTimeout(() => {
      completeAction();
    }, 3000);
  };

  const stopHold = () => {
    setIsHolding(false);
    setProgress(0);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const completeAction = () => {
    // Just reset the button - no live state for now
    setIsHolding(false);
    setProgress(0);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <div className="relative">
      <Button
        size="sm"
        variant="outline"
        className={`
          relative overflow-hidden transition-all duration-200 font-bold min-w-[80px] h-10
          ${isHolding 
            ? 'border-2 border-blue-500 text-blue-600 shadow-md' 
            : 'border-2 border-blue-500 text-blue-600 hover:bg-blue-50 shadow-sm'
          }
        `}
        onMouseDown={startHold}
        onMouseUp={stopHold}
        onMouseLeave={stopHold}
        onTouchStart={startHold}
        onTouchEnd={stopHold}
        disabled={false}
      >
        {/* Fill animation background */}
        <div 
          className="absolute top-0 left-0 h-full transition-all duration-100 ease-linear bg-blue-500"
          style={{ 
            width: `${progress}%`,
            opacity: isHolding ? 0.3 : 0
          }}
        />
        
        {/* Button content */}
        <div className="relative z-10 flex items-center gap-1">
          <Circle 
            className="h-3 w-3 text-blue-600"
            fill="none"
          />
          <span className="text-xs">
            Go Live
          </span>
        </div>
      </Button>
      

    </div>
  );
}