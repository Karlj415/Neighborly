import { Badge } from "@/components/ui/badge";
import { Shield, ShieldCheck } from "lucide-react";

interface VerificationBadgeProps {
  isVerified?: boolean;
  neighborlyVerified?: boolean;
  trustScore?: number;
  size?: "sm" | "md" | "lg";
  showScore?: boolean;
}

export function VerificationBadge({ 
  isVerified = false, 
  neighborlyVerified = false, 
  trustScore = 0,
  size = "md",
  showScore = false 
}: VerificationBadgeProps) {
  if (!isVerified && !neighborlyVerified) {
    return null;
  }

  const sizeClasses = {
    sm: "text-xs px-1.5 py-0.5",
    md: "text-sm px-2 py-1",
    lg: "text-base px-3 py-1.5"
  };

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16
  };

  return (
    <div className="flex items-center gap-1.5">
      {neighborlyVerified ? (
        <Badge 
          variant="secondary" 
          className={`bg-green-100 text-green-800 border-green-200 ${sizeClasses[size]} flex items-center gap-1`}
        >
          <ShieldCheck size={iconSizes[size]} />
          Verified
        </Badge>
      ) : isVerified ? (
        <Badge 
          variant="secondary" 
          className={`bg-blue-100 text-blue-800 border-blue-200 ${sizeClasses[size]} flex items-center gap-1`}
        >
          <Shield size={iconSizes[size]} />
          Verified
        </Badge>
      ) : null}
      
      {showScore && trustScore > 0 && (
        <Badge 
          variant="outline" 
          className={`${sizeClasses[size]} ${
            trustScore >= 80 
              ? 'bg-green-50 text-green-700 border-green-200' 
              : trustScore >= 60 
              ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
              : 'bg-red-50 text-red-700 border-red-200'
          }`}
        >
          Trust: {Math.round(trustScore)}
        </Badge>
      )}
    </div>
  );
}