import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Header from "@/components/Header";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Clock, Gift, Coins, ShoppingCart, MapPin, Users, Zap, Star, Target, DollarSign, Crown, Medal } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { RewardTransaction } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { isUnauthorizedError } from "@/lib/authUtils";

// Leaderboard Section Component
function LeaderboardSection() {
  const { data: leaderboard = [], isLoading } = useQuery({
    queryKey: ["/api/rewards/leaderboard"],
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="text-center py-4">
        <div className="animate-spin w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full mx-auto" />
      </div>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <div className="text-center py-8 text-gray-300">
        <Trophy className="h-16 w-16 mx-auto mb-4 text-gray-500" />
        <p>No leaderboard data yet</p>
        <p className="text-sm">Be the first to earn points!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {leaderboard.map((user: any, index: number) => (
        <div key={user.id} className="flex items-center gap-3 p-3 bg-gray-700 rounded-lg border border-gray-600">
          <div className="flex-shrink-0">
            {index === 0 && <Crown className="h-5 w-5 text-yellow-400" />}
            {index === 1 && <Medal className="h-5 w-5 text-gray-300" />}
            {index === 2 && <Medal className="h-5 w-5 text-amber-500" />}
            {index > 2 && <span className="text-sm font-bold text-gray-300">#{index + 1}</span>}
          </div>
          <div className="flex-1">
            <p className="font-medium text-sm text-white">
              {user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Anonymous User'}
            </p>
            <p className="text-xs text-gray-400">
              {user.city && user.state ? `${user.city}, ${user.state}` : 'Location not shared'}
            </p>
          </div>
          <div className="text-right">
            <p className="font-bold text-sm text-blue-400">{user.rewardPoints || 0} pts</p>
            <p className="text-xs text-gray-400">{user.tier || 'Newbie'}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Rewards() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
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
  }, [isAuthenticated, authLoading, toast]);

  const { data: transactions = [], isLoading } = useQuery<RewardTransaction[]>({
    queryKey: ["/api/rewards/transactions"],
    enabled: isAuthenticated,
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error)) {
        return false;
      }
      return failureCount < 2;
    },
  });

  const { data: tierInfo, isLoading: tierLoading } = useQuery({
    queryKey: ["/api/user/tier"],
    enabled: isAuthenticated,
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error)) {
        return false;
      }
      return failureCount < 2;
    },
  });

  const recentTransactions = transactions.slice(0, 10);
  const totalEarned = transactions
    .filter(t => t.transactionType === 'earned')
    .reduce((sum, t) => sum + t.points, 0);
  const totalRedeemed = transactions
    .filter(t => t.transactionType === 'redeemed')
    .reduce((sum, t) => sum + t.points, 0);

  // Mutation for redeeming rewards
  const redeemReward = useMutation({
    mutationFn: async (data: { type: string; amount?: number; perkName?: string }) => {
      if (data.type === 'rent-discount') {
        return apiRequest('POST', '/api/rewards/redeem/rent-discount', { discountAmount: data.amount });
      } else if (data.type === 'local-perks') {
        return apiRequest('POST', '/api/rewards/redeem/local-perks', { perkName: data.perkName });
      } else if (data.type === 'bid-token') {
        return apiRequest('POST', '/api/rewards/redeem/bid-token');
      }
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/rewards/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      
      if (variables.type === 'rent-discount') {
        toast({
          title: "Rent Discount Redeemed!",
          description: `$${variables.amount} rent discount has been applied to your account.`,
        });
      } else if (variables.type === 'local-perks') {
        toast({
          title: "Local Perk Redeemed!",
          description: `${variables.perkName} has been added to your account.`,
        });
      } else if (variables.type === 'bid-token') {
        toast({
          title: "Bid Token Purchased!",
          description: "You now have access to exclusive off-market properties.",
        });
      }
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
        description: "Unable to redeem reward. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleRedeem = (type: string, amount?: number, perkName?: string) => {
    redeemReward.mutate({ type, amount, perkName });
  };

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-[hsl(220,20%,8%)] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Rewards Program</h1>
          <p className="text-gray-300">Earn points for every action and redeem for exclusive benefits</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Rewards Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Points Balance Card */}
            <Card className="bg-gray-800 border-gray-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-300 text-sm font-medium">Current Balance</p>
                    <p className="text-3xl font-bold">{user?.rewardPoints || 0} pts</p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-300 text-sm font-medium">Bid Tokens</p>
                    <p className="text-2xl font-bold flex items-center gap-1">
                      <Coins className="h-6 w-6" />
                      {user?.bidTokens || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tier Status Card */}
            {!tierLoading && tierInfo && (
              <Card className="bg-gray-800 border-gray-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-gray-300 text-sm font-medium">Current Tier</p>
                      <p className="text-2xl font-bold">{tierInfo.currentTier.name}</p>
                    </div>
                    <div className="text-right">
                      <Star className="h-8 w-8 text-yellow-300 mb-1" />
                      <p className="text-sm text-gray-300">{tierInfo.points} pts</p>
                    </div>
                  </div>
                  
                  <p className="text-gray-300 text-sm mb-4">{tierInfo.currentTier.description}</p>
                  
                  {tierInfo.nextTier && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-300">Progress to {tierInfo.nextTier.tier.name}</span>
                        <span className="text-gray-300">{tierInfo.nextTier.pointsNeeded} points needed</span>
                      </div>
                      <div className="w-full bg-gray-600 rounded-full h-2">
                        <div 
                          className="bg-yellow-300 h-2 rounded-full transition-all duration-300" 
                          style={{ width: `${tierInfo.progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                  
                  {tierInfo.currentTier.name === "Ambassador" && (
                    <div className="text-center">
                      <p className="text-yellow-300 font-semibold">🏆 Maximum Tier Achieved!</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Earn Points Section */}
            <Card className="bg-gray-800 border-gray-600">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2 text-white">
                  <Trophy className="h-5 w-5 text-amber-500" />
                  Earn Points
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-700 p-4 rounded-lg border-l-4 border-green-400">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="h-5 w-5 text-green-400" />
                      <h3 className="font-semibold text-white">Apply to Properties</h3>
                    </div>
                    <p className="text-sm text-green-300 mb-2">+50 pts per application</p>
                    <p className="text-xs text-gray-300">Submit applications to earn points</p>
                  </div>
                  
                  <div className="bg-gray-700 p-4 rounded-lg border-l-4 border-blue-400">
                    <div className="flex items-center gap-2 mb-2">
                      <Star className="h-5 w-5 text-blue-400" />
                      <h3 className="font-semibold text-white">Leave Reviews</h3>
                    </div>
                    <p className="text-sm text-blue-300 mb-2">+30 pts per review</p>
                    <p className="text-xs text-gray-300">Share your rental experience</p>
                  </div>
                  
                  <div className="bg-gray-700 p-4 rounded-lg border-l-4 border-purple-400">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="h-5 w-5 text-purple-400" />
                      <h3 className="font-semibold text-white">Refer Friends</h3>
                    </div>
                    <p className="text-sm text-purple-300 mb-2">+250 pts per referral</p>
                    <p className="text-xs text-gray-300">When friends sign a lease</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Redeem Points Section */}
            <Card className="bg-gray-800 border-gray-600">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2 text-white">
                  <Gift className="h-5 w-5 text-amber-500" />
                  Redeem Points
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-700 p-4 rounded-xl border border-gray-600 hover:border-amber-400 transition-colors flex flex-col h-full">
                    <div className="flex items-center justify-between mb-3 flex-grow">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-amber-400" />
                        <span className="text-sm font-medium text-white">Rent Discount</span>
                      </div>
                      <span className="text-xs text-gray-400">1,000 pts</span>
                    </div>
                    <Button 
                      className="w-full h-8 bg-amber-400 hover:bg-amber-500 text-black font-medium text-sm rounded-lg transition-colors mt-auto"
                      disabled={!user || (user.rewardPoints || 0) < 1000 || redeemReward.isPending}
                      onClick={() => handleRedeem('rent-discount', 100)}
                    >
                      {redeemReward.isPending ? 'Redeeming...' : 'Redeem $100'}
                    </Button>
                  </div>
                  
                  <div className="bg-gray-700 p-4 rounded-xl border border-gray-600 hover:border-green-400 transition-colors flex flex-col h-full">
                    <div className="flex items-center justify-between mb-3 flex-grow">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-green-400" />
                        <span className="text-sm font-medium text-white">Local Perks</span>
                      </div>
                      <span className="text-xs text-gray-400">500 pts</span>
                    </div>
                    <Button 
                      className="w-full h-8 bg-green-400 hover:bg-green-500 text-black font-medium text-sm rounded-lg transition-colors mt-auto"
                      disabled={!user || (user.rewardPoints || 0) < 500 || redeemReward.isPending}
                      onClick={() => handleRedeem('local-perks', undefined, 'Local Business Discount')}
                    >
                      {redeemReward.isPending ? 'Redeeming...' : 'Redeem Perks'}
                    </Button>
                  </div>
                  
                  <div className="bg-gray-700 p-4 rounded-xl border border-gray-600 hover:border-blue-400 transition-colors flex flex-col h-full">
                    <div className="flex items-center justify-between mb-3 flex-grow">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-blue-400" />
                        <span className="text-sm font-medium text-white">Bid Token</span>
                      </div>
                      <span className="text-xs text-gray-400">200 pts</span>
                    </div>
                    <Button 
                      className="w-full h-8 bg-blue-400 hover:bg-blue-500 text-black font-medium text-sm rounded-lg transition-colors mt-auto"
                      disabled={!user || (user.rewardPoints || 0) < 200 || redeemReward.isPending}
                      onClick={() => handleRedeem('bid-token')}
                    >
                      {redeemReward.isPending ? 'Redeeming...' : 'Buy Token'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bid Tokens Info */}
            <Card className="bg-gray-800 border-gray-600">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Coins className="h-6 w-6 text-blue-400" />
                  <h3 className="text-xl font-bold text-white">Bid Tokens</h3>
                </div>
                <p className="text-gray-300 mb-4">
                  Use Bid Tokens to access exclusive off-market properties before they're listed publicly. 
                  Get first access to premium rentals and hidden gems!
                </p>
                <div className="bg-gray-700 p-4 rounded-lg">
                  <p className="text-sm text-white">
                    <strong>You have {user?.bidTokens || 0} Bid Tokens</strong>
                  </p>
                  <p className="text-xs text-gray-300 mt-1">
                    Each token gives you 24-hour early access to off-market properties
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Stats Sidebar */}
          <div className="space-y-6">
            {/* Earn Stats */}
            <Card className="bg-gray-800 border-gray-600">
              <CardHeader>
                <CardTitle className="text-lg text-white">Earning Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Trophy className="h-4 w-4 text-amber-500" />
                    <span className="text-sm text-gray-300">Total Earned</span>
                  </div>
                  <span className="font-semibold text-white">{totalEarned} pts</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Gift className="h-4 w-4 text-blue-500" />
                    <span className="text-sm text-gray-300">Total Redeemed</span>
                  </div>
                  <span className="font-semibold text-white">{totalRedeemed} pts</span>
                </div>
              </CardContent>
            </Card>

            {/* Tier Benefits */}
            {!tierLoading && tierInfo && (
              <Card className="bg-gray-800 border-gray-600">
                <CardHeader>
                  <CardTitle className="text-lg text-white">Tier Benefits</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm text-gray-700">Current ({tierInfo.currentTier.name})</h4>
                    <ul className="space-y-1">
                      {tierInfo.currentTier.perks.map((perk: string, index: number) => (
                        <li key={index} className="text-xs text-gray-600 flex items-center gap-1">
                          <Star className="h-3 w-3 text-yellow-500" />
                          {perk}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  {tierInfo.nextTier && (
                    <div className="space-y-2 pt-3 border-t">
                      <h4 className="font-semibold text-sm text-gray-700">Next Level ({tierInfo.nextTier.tier.name})</h4>
                      <ul className="space-y-1">
                        {tierInfo.nextTier.tier.perks.map((perk: string, index: number) => (
                          <li key={index} className="text-xs text-gray-500 flex items-center gap-1">
                            <Target className="h-3 w-3 text-gray-400" />
                            {perk}
                          </li>
                        ))}
                      </ul>
                      <p className="text-xs text-blue-600 font-medium">
                        {tierInfo.nextTier.pointsNeeded} more points to unlock!
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Leaderboard */}
            <Card className="bg-gray-800 border-gray-600">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-white">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  Top Renters in Your City
                </CardTitle>
              </CardHeader>
              <CardContent>
                <LeaderboardSection />
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="bg-gray-800 border-gray-600">
              <CardHeader>
                <CardTitle className="text-lg text-white">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-4">
                    <div className="animate-spin w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full mx-auto" />
                  </div>
                ) : recentTransactions.length > 0 ? (
                  <div className="space-y-3">
                    {recentTransactions.map((transaction) => (
                      <div key={transaction.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="text-sm text-gray-300">{transaction.description}</p>
                            <p className="text-xs text-gray-400">
                              {formatDistanceToNow(new Date(transaction.createdAt), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                        <div className={`font-semibold ${transaction.transactionType === 'earned' ? 'text-green-400' : 'text-red-400'}`}>
                          {transaction.transactionType === 'earned' ? '+' : '-'}{transaction.points} pts
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-300">
                    <Trophy className="h-16 w-16 mx-auto mb-4 text-gray-500" />
                    <p>No reward activity yet</p>
                    <p className="text-sm">Start applying to properties to earn your first points!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
    </div>
  );
}