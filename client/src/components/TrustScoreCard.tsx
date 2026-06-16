import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Shield, TrendingUp, AlertCircle, ExternalLink } from "lucide-react";
import { VerificationBadge } from "./VerificationBadge";
import { apiRequest } from "@/lib/queryClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface TrustScoreCardProps {
  trustScore?: number;
  isVerified?: boolean;
  neighborlyVerified?: boolean;
  onTimeRentScore?: number;
  complaintScore?: number;
  leaseCompletionScore?: number;
  lastUpdated?: string;
}

export function TrustScoreCard({
  trustScore = 50,
  isVerified = false,
  neighborlyVerified = false,
  onTimeRentScore = 0,
  complaintScore = 100,
  leaseCompletionScore = 0,
  lastUpdated
}: TrustScoreCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const verifyWithNeighborly = useMutation({
    mutationFn: () => apiRequest("POST", "/api/verification/neighborly-sync"),
    onSuccess: (data) => {
      toast({
        title: "Verification Successful",
        description: `Profile verified with trust score: ${data.trustScore}`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/roommate/profile'] });
    },
    onError: (error: any) => {
      toast({
        title: "Verification Failed",
        description: error.message || "Unable to verify with Neighborly API",
        variant: "destructive",
      });
    },
  });

  const addSampleData = useMutation({
    mutationFn: () => apiRequest("POST", "/api/verification/add-sample-data"),
    onSuccess: (data) => {
      toast({
        title: "Sample Data Added",
        description: `Trust score updated to: ${data.trustScore}`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/roommate/profile'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add sample data",
        variant: "destructive",
      });
    },
  });

  const updateTrustScore = useMutation({
    mutationFn: () => apiRequest("POST", "/api/verification/calculate-trust-score"),
    onSuccess: (data) => {
      toast({
        title: "Trust Score Updated",
        description: `New trust score: ${data.trustScore}`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/roommate/profile'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update trust score",
        variant: "destructive",
      });
    },
  });

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-400";
    if (score >= 60) return "text-yellow-400";
    return "text-red-400";
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return "bg-green-500/20 text-green-400 border-green-500/30";
    if (score >= 60) return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    return "bg-red-500/20 text-red-400 border-red-500/30";
  };

  return (
    <Card className="max-w-2xl mx-auto bg-gray-800/50 border-gray-700/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-white">
            <Shield className="h-5 w-5 text-blue-500" />
            Trust Score
          </CardTitle>
          <VerificationBadge 
            isVerified={isVerified}
            neighborlyVerified={neighborlyVerified}
            trustScore={trustScore}
            showScore={false}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Trust Score Display */}
        <div className="text-center">
          <div className={`text-4xl font-bold ${getScoreColor(trustScore)}`}>
            {Math.round(trustScore)}
          </div>
          <div className="text-sm text-gray-400">out of 100</div>
          <Progress 
            value={trustScore} 
            className="mt-2"
          />
        </div>

        {/* Score Breakdown */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm text-white">Score Breakdown</h4>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-300">On-time Rent Payments (60%)</span>
              <Badge variant="outline" className={getScoreBgColor(onTimeRentScore)}>
                {Math.round(onTimeRentScore)}%
              </Badge>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-300">No Complaints (25%)</span>
              <Badge variant="outline" className={getScoreBgColor(complaintScore)}>
                {Math.round(complaintScore)}%
              </Badge>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-300">Lease Completion (15%)</span>
              <Badge variant="outline" className={getScoreBgColor(leaseCompletionScore)}>
                {Math.round(leaseCompletionScore)}%
              </Badge>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2 pt-3 border-t border-gray-700/50">
          {!neighborlyVerified && (
            <Button 
              onClick={() => verifyWithNeighborly.mutate()}
              disabled={verifyWithNeighborly.isPending}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              size="sm"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              {verifyWithNeighborly.isPending ? "Verifying..." : "Verify with Neighborly"}
            </Button>
          )}
          
          <Button 
            onClick={() => addSampleData.mutate()}
            disabled={addSampleData.isPending}
            variant="outline"
            className="w-full border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
            size="sm"
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            {addSampleData.isPending ? "Adding..." : "Add Sample Data"}
          </Button>
          
          <Button 
            onClick={() => updateTrustScore.mutate()}
            disabled={updateTrustScore.isPending}
            variant="ghost"
            className="w-full text-gray-400 hover:text-white hover:bg-gray-700/50"
            size="sm"
          >
            <AlertCircle className="h-4 w-4 mr-2" />
            {updateTrustScore.isPending ? "Calculating..." : "Recalculate Score"}
          </Button>
        </div>

        {lastUpdated && (
          <div className="text-xs text-gray-400 text-center">
            Last updated: {new Date(lastUpdated).toLocaleDateString()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}