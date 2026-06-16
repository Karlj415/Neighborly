import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp } from "lucide-react";
import type { CreditReport } from "@shared/schema";

interface CreditDashboardProps {
  onVerifyExperian?: () => void;
}

export default function CreditDashboard({ onVerifyExperian }: CreditDashboardProps) {
  const { user } = useAuth();

  const { data: latestReport, isLoading } = useQuery<CreditReport>({
    queryKey: ["/api/credit/latest"],
  });

  // Check if user has verified with Experian (has any credit reports)
  const { data: reports = [] } = useQuery({
    queryKey: ["/api/credit/reports"],
  });

  const hasVerifiedExperian = reports.length > 0;

  const getCreditScoreColor = (score: number) => {
    if (score >= 800) return "text-green-600";
    if (score >= 740) return "text-green-500";
    if (score >= 670) return "text-yellow-500";
    if (score >= 580) return "text-orange-500";
    return "text-red-500";
  };

  const getCreditRating = (score: number) => {
    if (score >= 800) return "Excellent";
    if (score >= 740) return "Very Good";
    if (score >= 670) return "Good";
    if (score >= 580) return "Fair";
    return "Poor";
  };

  const currentScore = (user as any)?.creditScore || 720;
  const report = latestReport || {
    paymentHistory: 98,
    creditUtilization: 23,
    creditAge: 4.2,
  };

  if (isLoading) {
    return (
      <Card className="bg-gray-800 border-gray-600 animate-pulse">
        <CardContent className="p-6">
          <div className="h-8 bg-gray-600 rounded mb-4"></div>
          <div className="h-32 bg-gray-600 rounded mb-6"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-600 rounded"></div>
            <div className="h-4 bg-gray-600 rounded"></div>
            <div className="h-4 bg-gray-600 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-800 border-gray-600">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h4 className="text-xl font-semibold text-white">Credit Score</h4>
          <TrendingUp className="h-6 w-6 text-gray-400" />
        </div>
        
        {hasVerifiedExperian ? (
          <>
            {/* Credit Score Circle */}
            <div className="flex items-center justify-center mb-6">
              <div className="relative w-32 h-32 bg-gray-700 border border-gray-600 rounded-full flex items-center justify-center">
                <div className="text-center">
                  <div className="text-3xl font-bold text-white">{currentScore}</div>
                  <div className="text-sm text-gray-300">{getCreditRating(currentScore)}</div>
                </div>
              </div>
            </div>

            {/* Progress Info */}
            <div className="space-y-3 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Payment History</span>
                <span className="font-semibold text-white">{report.paymentHistory}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Credit Utilization</span>
                <span className="font-semibold text-white">{report.creditUtilization}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Credit Age</span>
                <span className="font-semibold text-white">{report.creditAge} years</span>
              </div>
            </div>

            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold">
              View Detailed Report
            </Button>
          </>
        ) : (
          <>
            {/* Unknown Credit Score Circle */}
            <div className="flex items-center justify-center mb-6">
              <div className="relative w-32 h-32 bg-gray-700 border border-gray-600 rounded-full flex items-center justify-center">
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-400">?</div>
                  <div className="text-sm text-gray-500">Unknown</div>
                </div>
              </div>
            </div>

            {/* Unknown Progress Info */}
            <div className="space-y-3 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Payment History</span>
                <span className="font-semibold text-gray-400">Unknown</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Credit Utilization</span>
                <span className="font-semibold text-gray-400">Unknown</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Credit Age</span>
                <span className="font-semibold text-gray-400">Unknown</span>
              </div>
            </div>

            <Button 
              onClick={onVerifyExperian}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >
              Verify with Experian
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
