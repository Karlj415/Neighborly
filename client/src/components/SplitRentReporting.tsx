import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Users, DollarSign, Trophy, Calendar, CreditCard, Sparkles, Home, Search, Check, UserPlus, Trash2, LogOut } from "lucide-react";
import type { SharedRentGroup, RentPayment, GroupReward, RewardRedemption, AuthUser } from "@shared/schema";

export function SplitRentReporting() {
  const { toast } = useToast();
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<SharedRentGroup | null>(null);
  const [newGroup, setNewGroup] = useState({
    groupName: "",
    rentAmount: "",
    propertyId: ""
  });
  const [selectedFriends, setSelectedFriends] = useState<AuthUser[]>([]);
  const [friendSearch, setFriendSearch] = useState("");

  // Get current user
  const { data: currentUser } = useQuery({
    queryKey: ["/api/auth/user"],
  });

  // Fetch user's rent groups
  const { data: rentGroups = [], isLoading: loadingGroups } = useQuery({
    queryKey: ["/api/rent-groups"],
  });

  // Auto-select first group when groups load
  useEffect(() => {
    if (rentGroups && rentGroups.length > 0 && !selectedGroup) {
      setSelectedGroup(rentGroups[0]);
    }
  }, [rentGroups, selectedGroup]);

  // Fetch payments for selected group
  const { data: groupPayments = [] } = useQuery({
    queryKey: selectedGroup?.groupId ? [`/api/rent-payments/group/${selectedGroup.groupId}`] : null,
    enabled: !!selectedGroup,
  });

  // Fetch rewards for selected group
  const { data: groupRewards } = useQuery({
    queryKey: selectedGroup?.groupId ? [`/api/group-rewards/${selectedGroup.groupId}`] : null,
    enabled: !!selectedGroup,
  });

  // Fetch redemptions for selected group
  const { data: redemptions = [] } = useQuery({
    queryKey: selectedGroup?.groupId ? [`/api/group-rewards/redemptions/${selectedGroup.groupId}`] : null,
    enabled: !!selectedGroup,
  });

  const [searchResults, setSearchResults] = useState<AuthUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Search functionality - same implementation as FriendsModal
  useEffect(() => {
    const searchUsers = async () => {
      if (friendSearch.length >= 1) {
        setIsSearching(true);
        try {
          const response = await apiRequest("GET", `/api/users/search?query=${encodeURIComponent(friendSearch)}`);
          const data = await response.json();
          // Filter out current user and users already selected
          const filteredData = Array.isArray(data) 
            ? data.filter((searchUser: AuthUser) => 
                searchUser.id && 
                !selectedFriends.find(f => f.id === searchUser.id)
              ) 
            : [];
          setSearchResults(filteredData);
        } catch (error) {
          console.error("Search error:", error);
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(searchUsers, 300);
    return () => clearTimeout(timeoutId);
  }, [friendSearch, selectedFriends]);

  // Create rent group mutation
  const createGroupMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/rent-groups", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Rent group created successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/rent-groups"] });
      setShowCreateGroup(false);
      setNewGroup({ groupName: "", rentAmount: "", propertyId: "" });
      setSelectedFriends([]);
      setFriendSearch("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Make payment mutation
  const makePaymentMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/rent-payments", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Payment recorded successfully! Credit bureaus have been notified.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/rent-payments/group/${selectedGroup?.groupId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/group-rewards/${selectedGroup?.groupId}`] });
      setShowPaymentModal(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Redeem rewards mutation
  const redeemRewardsMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/group-rewards/redeem", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Cleaning service scheduled for your group!",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/group-rewards/${selectedGroup?.groupId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/group-rewards/redemptions/${selectedGroup?.groupId}`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete group mutation
  const deleteGroupMutation = useMutation({
    mutationFn: async (groupId: string) => {
      const response = await apiRequest("DELETE", `/api/rent-groups/${groupId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Group deleted successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/rent-groups"] });
      setSelectedGroup(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete group",
        variant: "destructive",
      });
    },
  });

  // Leave group mutation
  const leaveGroupMutation = useMutation({
    mutationFn: async (groupId: string) => {
      const response = await apiRequest("POST", `/api/rent-groups/${groupId}/leave`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Left group successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/rent-groups"] });
      setSelectedGroup(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to leave group",
        variant: "destructive",
      });
    },
  });

  const handleCreateGroup = () => {
    const rentAmountNum = parseFloat(newGroup.rentAmount);
    if (!newGroup.groupName || !rentAmountNum || selectedFriends.length === 0) {
      toast({
        title: "Error",
        description: "Please fill in all required fields and select at least one friend",
        variant: "destructive",
      });
      return;
    }

    createGroupMutation.mutate({
      groupName: newGroup.groupName,
      memberUserIds: selectedFriends.map(friend => String(friend.id)),
      rentAmount: rentAmountNum,
      propertyId: newGroup.propertyId || undefined
    });
  };

  const handleAddFriend = (friend: AuthUser) => {
    if (!selectedFriends.find(f => f.id === friend.id)) {
      setSelectedFriends([...selectedFriends, friend]);
      setFriendSearch("");
    }
  };

  const handleRemoveFriend = (friendId: number) => {
    setSelectedFriends(selectedFriends.filter(f => f.id !== friendId));
  };

  const handleMakePayment = () => {
    if (!selectedGroup) return;
    
    const shareAmount = selectedGroup.rentAmount / selectedGroup.memberUserIds.length / 100;
    
    makePaymentMutation.mutate({
      groupId: selectedGroup.groupId,
      amount: shareAmount,
      paymentMethod: "manual"
    });
  };

  const handleRedeemCleaning = () => {
    if (!selectedGroup || !groupRewards) return;
    
    redeemRewardsMutation.mutate({
      groupId: selectedGroup.groupId,
      redemptionType: "cleaning_service",
      pointsToUse: 500
    });
  };

  const availablePoints = groupRewards ? groupRewards.totalPoints - groupRewards.redeemedPoints : 0;

  return (
    <Card className="bg-gray-800/50 border-gray-700/50">
      <CardHeader>
        <CardTitle className="flex items-center text-white">
          <Users className="h-5 w-5 mr-2 text-blue-500" />
          Split Rent Reporting
        </CardTitle>
        <CardDescription className="text-gray-400">
          Track shared rent payments and build credit together
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loadingGroups ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : !rentGroups || rentGroups.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">No rent groups yet</p>
            <Button onClick={() => setShowCreateGroup(true)}>
              Create Your First Group
            </Button>
          </div>
        ) : (
          <Tabs 
            defaultValue={rentGroups && rentGroups.length > 0 ? rentGroups[0]?.groupId : ""} 
            onValueChange={(value) => {
              const group = rentGroups.find((g: SharedRentGroup) => g.groupId === value);
              setSelectedGroup(group || null);
            }}
          >
            <div className="flex justify-between items-center mb-4">
              <TabsList>
                {rentGroups && rentGroups.map((group: SharedRentGroup) => (
                  <TabsTrigger key={group.groupId} value={group.groupId}>
                    {group.groupName}
                  </TabsTrigger>
                ))}
              </TabsList>
              <div className="flex gap-2">
                {selectedGroup && (
                  <>
                    {selectedGroup.creatorUserId === String(currentUser?.id) ? (
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => deleteGroupMutation.mutate(selectedGroup.groupId)}
                        disabled={deleteGroupMutation.isPending}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors"
                      >
                        {deleteGroupMutation.isPending ? (
                          <div className="animate-spin w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full mr-1" />
                        ) : (
                          <Trash2 className="h-4 w-4 mr-1" />
                        )}
                        Delete Group
                      </Button>
                    ) : (
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => leaveGroupMutation.mutate(selectedGroup.groupId)}
                        disabled={leaveGroupMutation.isPending}
                        className="text-gray-600 hover:text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        {leaveGroupMutation.isPending ? (
                          <div className="animate-spin w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full mr-1" />
                        ) : (
                          <LogOut className="h-4 w-4 mr-1" />
                        )}
                        Leave Group
                      </Button>
                    )}
                  </>
                )}
                <Button size="sm" onClick={() => setShowCreateGroup(true)}>
                  New Group
                </Button>
              </div>
            </div>

            {rentGroups && rentGroups.map((group: SharedRentGroup) => (
              <TabsContent key={group.groupId} value={group.groupId} className="space-y-6">
                {/* Group Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Monthly Rent</p>
                          <p className="text-2xl font-bold">${group.rentAmount / 100}</p>
                          <p className="text-xs text-gray-500">
                            ${group.rentAmount / group.memberUserIds.length / 100} per person
                          </p>
                        </div>
                        <DollarSign className="h-8 w-8 text-green-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Group Members</p>
                          <p className="text-2xl font-bold">{group.memberUserIds.length}</p>
                          <p className="text-xs text-gray-500">Sharing rent</p>
                        </div>
                        <Users className="h-8 w-8 text-blue-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Group Points</p>
                          <p className="text-2xl font-bold">{availablePoints}</p>
                          <p className="text-xs text-gray-500">Available to redeem</p>
                        </div>
                        <Trophy className="h-8 w-8 text-yellow-600" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Quick Actions */}
                <div className="flex gap-4">
                  <Button onClick={() => setShowPaymentModal(true)} className="flex-1">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Record Payment
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleRedeemCleaning}
                    disabled={availablePoints < 500}
                    className="flex-1"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Redeem Cleaning (500 pts)
                  </Button>
                </div>

                {/* Recent Payments */}
                <div>
                  <h3 className="font-semibold mb-3">Recent Payments</h3>
                  <div className="space-y-2">
                    {groupPayments.length === 0 ? (
                      <p className="text-gray-500 text-sm">No payments recorded yet</p>
                    ) : (
                      groupPayments.slice(0, 5).map((payment: RentPayment) => (
                        <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium">${payment.amount / 100}</p>
                            <p className="text-sm text-gray-600">
                              {new Date(payment.paymentDate).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {payment.reportedToCreditBureau && (
                              <Badge variant="secondary" className="text-xs">
                                Credit Reported
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {payment.paymentMethod}
                            </Badge>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Redemption History */}
                {redemptions.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3">Reward Redemptions</h3>
                    <div className="space-y-2">
                      {redemptions.map((redemption: RewardRedemption) => (
                        <div key={redemption.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium capitalize">
                              {redemption.redemptionType.replace('_', ' ')}
                            </p>
                            <p className="text-sm text-gray-600">
                              {redemption.scheduledDate && new Date(redemption.scheduledDate).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge variant={redemption.status === 'completed' ? 'default' : 'secondary'}>
                            {redemption.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        )}

        {/* Create Group Dialog */}
        <Dialog open={showCreateGroup} onOpenChange={setShowCreateGroup}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Rent Group</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="groupName">Group Name</Label>
                <Input
                  id="groupName"
                  value={newGroup.groupName}
                  onChange={(e) => setNewGroup({ ...newGroup, groupName: e.target.value })}
                  placeholder="e.g., 123 Main St Roommates"
                />
              </div>
              <div>
                <Label htmlFor="rentAmount">Total Monthly Rent</Label>
                <Input
                  id="rentAmount"
                  type="number"
                  value={newGroup.rentAmount}
                  onChange={(e) => setNewGroup({ ...newGroup, rentAmount: e.target.value })}
                  placeholder="2000"
                />
              </div>
              <div>
                <Label>Group Members</Label>
                
                {/* Friend Search */}
                <div className="mt-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      value={friendSearch}
                      onChange={(e) => setFriendSearch(e.target.value)}
                      placeholder="Search friends to add..."
                      className="pl-10"
                    />
                  </div>
                  
                  {/* Search Results */}
                  {friendSearch && (isSearching || searchResults.length > 0) && (
                    <div className="mt-2 border rounded-md bg-white shadow-lg max-h-48 overflow-y-auto">
                      {isSearching ? (
                        <div className="p-4 text-center text-gray-500">
                          <div className="animate-pulse">Searching friends...</div>
                        </div>
                      ) : searchResults.length > 0 ? (
                        searchResults.map((friend: AuthUser) => (
                          <button
                            key={friend.id}
                            onClick={() => handleAddFriend(friend)}
                            className="w-full p-3 text-left hover:bg-gray-50 flex items-center justify-between"
                          >
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                                <span className="text-sm font-medium text-gray-600">
                                  {friend.firstName?.[0] || friend.email[0].toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium text-sm">
                                  {friend.firstName && friend.lastName 
                                    ? `${friend.firstName} ${friend.lastName}` 
                                    : friend.email}
                                </p>
                                {friend.firstName && (
                                  <p className="text-xs text-gray-500">{friend.email}</p>
                                )}
                              </div>
                            </div>
                            <UserPlus className="h-4 w-4 text-gray-400" />
                          </button>
                        ))
                      ) : (
                        <div className="p-4 text-center text-gray-500">
                          No friends found matching "{friendSearch}"
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Selected Friends */}
                {selectedFriends.length > 0 && (
                  <div className="mt-4">
                    <Label className="text-sm font-medium">Selected Members ({selectedFriends.length})</Label>
                    <div className="mt-2 space-y-2">
                      {selectedFriends.map((friend) => (
                        <div key={friend.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div className="flex items-center space-x-2">
                            <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                              <span className="text-xs font-medium text-gray-600">
                                {friend.firstName?.[0] || friend.email[0].toUpperCase()}
                              </span>
                            </div>
                            <span className="text-sm">
                              {friend.firstName && friend.lastName 
                                ? `${friend.firstName} ${friend.lastName}` 
                                : friend.email}
                            </span>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveFriend(friend.id)}
                            className="h-6 w-6 p-0"
                          >
                            ×
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateGroup(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateGroup} disabled={createGroupMutation.isPending}>
                Create Group
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Payment Modal */}
        <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Rent Payment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="text-center py-4">
                <p className="text-2xl font-bold">
                  ${selectedGroup ? selectedGroup.rentAmount / selectedGroup.memberUserIds.length / 100 : 0}
                </p>
                <p className="text-gray-600">Your share this month</p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-blue-900">Benefits of recording payment:</p>
                <ul className="text-sm text-blue-800 mt-2 space-y-1">
                  <li>• Automatic credit bureau reporting</li>
                  <li>• Earn 50 reward points</li>
                  <li>• Build payment history</li>
                </ul>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPaymentModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleMakePayment} disabled={makePaymentMutation.isPending}>
                Record Payment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}