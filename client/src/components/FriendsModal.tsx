import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Users, Check, X, Trash2, Search } from "lucide-react";
import type { FriendRequest, User } from "@shared/schema";

interface FriendsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FriendsModal({ isOpen, onClose }: FriendsModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [receiverId, setReceiverId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch friend requests
  const { data: friendRequests = [], isLoading: loadingRequests } = useQuery({
    queryKey: ["/api/friends/requests"],
    enabled: !!user && isOpen,
  });

  // Fetch sent friend requests
  const { data: sentRequests = [], isLoading: loadingSent } = useQuery({
    queryKey: ["/api/friends/requests/sent"],
    enabled: !!user && isOpen,
  });

  // Fetch friends list
  const { data: friends = [], isLoading: loadingFriends } = useQuery({
    queryKey: ["/api/friends"],
    enabled: !!user && isOpen,
  });

  // Send friend request mutation
  const sendRequestMutation = useMutation({
    mutationFn: async (receiverId: string) => {
      return await apiRequest("POST", "/api/friends/request", { receiverId });
    },
    onSuccess: () => {
      toast({
        title: "Friend Request Sent",
        description: "Your friend request has been sent successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/friends/requests/sent"] });
      setReceiverId("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send friend request.",
        variant: "destructive",
      });
    },
  });

  // Respond to friend request mutation
  const respondMutation = useMutation({
    mutationFn: async ({ requestId, status }: { requestId: number; status: "accepted" | "rejected" }) => {
      return await apiRequest("PATCH", `/api/friends/requests/${requestId}/respond`, { status });
    },
    onSuccess: (_, { status }) => {
      toast({
        title: status === "accepted" ? "Friend Request Accepted" : "Friend Request Rejected",
        description: status === "accepted" ? "You are now friends!" : "Friend request has been rejected.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/friends/requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to respond to friend request.",
        variant: "destructive",
      });
    },
  });

  // Remove friend mutation
  const removeFriendMutation = useMutation({
    mutationFn: async (friendId: string) => {
      return await apiRequest("DELETE", `/api/friends/${friendId}`);
    },
    onSuccess: () => {
      toast({
        title: "Friend Removed",
        description: "Friend has been removed from your friends list.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove friend.",
        variant: "destructive",
      });
    },
  });

  const handleSendRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (receiverId.trim()) {
      sendRequestMutation.mutate(receiverId.trim());
    }
  };

  const handleRespond = (requestId: number, status: "accepted" | "rejected") => {
    respondMutation.mutate({ requestId, status });
  };

  const handleRemoveFriend = (friendId: string) => {
    if (confirm("Are you sure you want to remove this friend?")) {
      removeFriendMutation.mutate(friendId);
    }
  };

  // Search users effect with LinkedIn-style real-time search
  useEffect(() => {
    const searchUsers = async () => {
      if (searchQuery.length >= 1) { // Start searching after 1 character like LinkedIn
        setIsSearching(true);
        setShowSuggestions(true);
        try {
          const response = await apiRequest("GET", `/api/users/search?query=${encodeURIComponent(searchQuery)}`);
          const data = await response.json();
          // Ensure response is an array and filter out current user
          const filteredData = Array.isArray(data) ? data.filter((searchUser: User) => searchUser.id !== user?.id) : [];
          setSearchResults(filteredData);
        } catch (error) {
          console.error("Search error:", error);
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
        setShowSuggestions(false);
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(searchUsers, 300); // Debounce search
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleSendFriendRequest = (userId: string) => {
    sendRequestMutation.mutate(userId);
    setSearchQuery("");
    setSearchResults([]);
    setShowSuggestions(false);
    setIsSearching(false);
  };

  // Helper function to check if user already has a sent request
  const isRequestSent = (userId: string) => {
    return sentRequests.some((request: FriendRequest) => request.receiverId === userId);
  };

  // Helper function to check if user is already a friend
  const isAlreadyFriend = (userId: string) => {
    return friends.some((friend: User) => friend.id === userId);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            Friends
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="friends" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="friends">
              Friends ({friends.length})
            </TabsTrigger>
            <TabsTrigger value="requests">
              Requests ({friendRequests.length})
            </TabsTrigger>
            <TabsTrigger value="sent">
              Sent ({sentRequests.length})
            </TabsTrigger>
            <TabsTrigger value="add">Add Friend</TabsTrigger>
          </TabsList>

          <TabsContent value="friends" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Your Friends</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingFriends ? (
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded animate-pulse" />
                    <div className="h-4 bg-gray-200 rounded animate-pulse" />
                  </div>
                ) : friends.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">
                    No friends yet. Send some friend requests to get started!
                  </p>
                ) : (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {friends.map((friend: User) => (
                      <div key={friend.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-semibold">
                              {(friend.firstName?.charAt(0) || 'U').toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">{friend.firstName} {friend.lastName}</p>
                            <p className="text-sm text-gray-500">{friend.email}</p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveFriend(friend.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="requests" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Friend Requests</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingRequests ? (
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded animate-pulse" />
                    <div className="h-4 bg-gray-200 rounded animate-pulse" />
                  </div>
                ) : friendRequests.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">
                    No pending friend requests.
                  </p>
                ) : (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {friendRequests.map((request: any) => {
                      console.log('Modal incoming friend request data:', request); // Debug log
                      const senderName = request.senderFirstName && request.senderLastName 
                        ? `${request.senderFirstName} ${request.senderLastName}`
                        : request.senderEmail || `${request.senderId}`;
                      const firstLetter = request.senderFirstName 
                        ? request.senderFirstName.charAt(0).toUpperCase()
                        : request.senderEmail?.charAt(0).toUpperCase() || request.senderId.toString().charAt(0).toUpperCase();
                      
                      return (
                        <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                              <span className="text-green-600 font-semibold">
                                {firstLetter}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium">{senderName}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleRespond(request.id, "accepted")}
                              disabled={respondMutation.isPending}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRespond(request.id, "rejected")}
                              disabled={respondMutation.isPending}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sent" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Sent Requests</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingSent ? (
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded animate-pulse" />
                    <div className="h-4 bg-gray-200 rounded animate-pulse" />
                  </div>
                ) : sentRequests.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">
                    No pending sent requests.
                  </p>
                ) : (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {sentRequests.map((request: any) => {
                      const receiverName = request.receiverFirstName && request.receiverLastName 
                        ? `${request.receiverFirstName} ${request.receiverLastName}`
                        : request.receiverEmail || `${request.receiverId}`;
                      const firstLetter = request.receiverFirstName 
                        ? request.receiverFirstName.charAt(0).toUpperCase()
                        : request.receiverId.charAt(0).toUpperCase();
                      
                      return (
                        <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                              <span className="text-yellow-600 font-semibold">
                                {firstLetter}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium">{receiverName}</p>
                            </div>
                          </div>
                          <Badge variant="secondary">Pending</Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="add" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Find Friends</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 min-h-96">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    type="text"
                    placeholder="Start typing a name to find friends..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                  {isSearching && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                    </div>
                  )}
                </div>
                
                {/* LinkedIn-style suggestions dropdown */}
                {showSuggestions && searchQuery.length >= 1 && (
                  <div className="relative">
                    <div className="absolute top-2 left-0 right-0 bg-white border rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
                      {isSearching ? (
                        <div className="p-4 text-center">
                          <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                          <p className="text-gray-500 text-sm">Searching...</p>
                        </div>
                      ) : searchResults.length === 0 ? (
                        <div className="p-4 text-center">
                          <p className="text-gray-500">No users found matching "{searchQuery}"</p>
                        </div>
                      ) : (
                        <div className="py-2">
                          {searchResults.map((user: User) => (
                            <div 
                              key={user.id} 
                              className="flex items-center justify-between p-3 hover:bg-gray-50 border-b last:border-b-0 cursor-pointer"
                              onClick={() => handleSendFriendRequest(user.id)}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                  <span className="text-blue-600 font-semibold">
                                    {user.firstName?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'U'}
                                  </span>
                                </div>
                                <div>
                                  <p className="font-medium">
                                    {user.firstName && user.lastName 
                                      ? `${user.firstName} ${user.lastName}`
                                      : user.email || `User ${user.id}`}
                                  </p>
                                  {user.email && (user.firstName || user.lastName) && (
                                    <p className="text-sm text-gray-500">{user.email}</p>
                                  )}
                                </div>
                              </div>
                              {isAlreadyFriend(user.id) ? (
                                <Badge variant="secondary">Friends</Badge>
                              ) : isRequestSent(user.id) ? (
                                <Badge variant="outline">Requested</Badge>
                              ) : (
                                <Button
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSendFriendRequest(user.id);
                                  }}
                                  disabled={sendRequestMutation.isPending}
                                  className="bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                  <UserPlus className="h-4 w-4 mr-1" />
                                  Connect
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {searchQuery.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-lg font-medium mb-1">Find Your Friends</p>
                    <p className="text-sm">Start typing to search for people you know</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}