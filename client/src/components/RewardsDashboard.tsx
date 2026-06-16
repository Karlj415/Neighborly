import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Trophy, Gift, Zap } from "lucide-react";

export default function RewardsDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();

  const redeemMutation = useMutation({
    mutationFn: async (data: { points: number; description: string }) => {
      await apiRequest("POST", "/api/rewards/transactions", {
        points: data.points,
        description: data.description,
        transactionType: "redeemed"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rewards/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Points Redeemed",
        description: "Your reward has been successfully redeemed!",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Redemption Failed",
        description: "Unable to redeem points. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleRedeem = (points: number, description: string) => {
    if (!user || (user.rewardPoints || 0) < points) {
      toast({
        title: "Insufficient Points",
        description: `You need ${points} points to redeem this reward.`,
        variant: "destructive",
      });
      return;
    }
    redeemMutation.mutate({ points, description });
  };

  const currentPoints = user?.rewardPoints || 0;

  return (
    <div className="space-y-6">
      {/* Recent Achievements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Trophy className="h-5 w-5 mr-2" />
            Recent Achievements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center p-3 bg-green-50 rounded-lg">
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center mr-3">
                <Trophy className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="font-medium text-gray-900">Search Master</div>
                <div className="text-sm text-gray-500">10 property searches</div>
              </div>
            </div>
            <div className="flex items-center p-3 bg-purple-50 rounded-lg">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center mr-3">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="font-medium text-gray-900">First Save</div>
                <div className="text-sm text-gray-500">Saved your first property</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Redemption Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Gift className="h-5 w-5 mr-2" />
            Redeem Points
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="border border-gray-200 rounded-lg p-4 hover:border-purple-600 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <h6 className="font-medium text-gray-900">$10 Rent Credit</h6>
                <span className="text-amber-600 font-bold">500 pts</span>
              </div>
              <p className="text-sm text-gray-600 mb-3">Apply towards your monthly rent payment</p>
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700" 
                disabled={currentPoints < 500 || redeemMutation.isPending}
                onClick={() => handleRedeem(500, "$10 Rent Credit")}
              >
                {currentPoints < 500 ? "Not Enough Points" : "Redeem"}
              </Button>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-4 hover:border-purple-600 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <h6 className="font-medium text-gray-900">Premium Features</h6>
                <span className="text-amber-600 font-bold">750 pts</span>
              </div>
              <p className="text-sm text-gray-600 mb-3">Unlock advanced search filters for 30 days</p>
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={currentPoints < 750 || redeemMutation.isPending}
                onClick={() => handleRedeem(750, "Premium Features (30 days)")}
              >
                {currentPoints < 750 ? "Not Enough Points" : "Redeem"}
              </Button>
            </div>

            <div className="border border-gray-200 rounded-lg p-4 hover:border-purple-600 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <h6 className="font-medium text-gray-900">$25 Rent Credit</h6>
                <span className="text-amber-600 font-bold">1200 pts</span>
              </div>
              <p className="text-sm text-gray-600 mb-3">Apply towards your monthly rent payment</p>
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={currentPoints < 1200 || redeemMutation.isPending}
                onClick={() => handleRedeem(1200, "$25 Rent Credit")}
              >
                {currentPoints < 1200 ? "Not Enough Points" : "Redeem"}
              </Button>
            </div>

            <div className="border border-gray-200 rounded-lg p-4 hover:border-purple-600 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <h6 className="font-medium text-gray-900">Credit Report</h6>
                <span className="text-amber-600 font-bold">300 pts</span>
              </div>
              <p className="text-sm text-gray-600 mb-3">Get a detailed credit report</p>
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={currentPoints < 300 || redeemMutation.isPending}
                onClick={() => handleRedeem(300, "Detailed Credit Report")}
              >
                {currentPoints < 300 ? "Not Enough Points" : "Redeem"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
