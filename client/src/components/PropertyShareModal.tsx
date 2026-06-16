import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Send, Users, X } from "lucide-react";

interface PropertyShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  property: any; // Zillow property or community listing
  propertyType: "zillow" | "listing";
}

export default function PropertyShareModal({ isOpen, onClose, property, propertyType }: PropertyShareModalProps) {
  const [selectedFriendId, setSelectedFriendId] = useState<string>("");
  const [message, setMessage] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get user's friends list
  const { data: friends = [], isLoading: loadingFriends } = useQuery({
    queryKey: ["/api/friends"],
    enabled: isOpen,
  });

  // Share property mutation using unified conversation system
  const shareMutation = useMutation({
    mutationFn: async ({ receiverId, propertyData, message }: {
      receiverId: string;
      propertyData: any;
      message?: string;
    }) => {
      return await apiRequest("POST", "/api/conversations/property-share", {
        receiverId,
        propertyData,
        message,
      });
    },
    onSuccess: () => {
      toast({
        title: "Property Shared!",
        description: "Property has been shared with your friend. You can continue the conversation in Messages.",
      });
      onClose();
      setSelectedFriendId("");
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to share property.",
        variant: "destructive",
      });
    },
  });

  const handleShare = () => {
    if (!selectedFriendId) {
      toast({
        title: "Select a Friend",
        description: "Please select a friend to share this property with.",
        variant: "destructive",
      });
      return;
    }
    
    shareMutation.mutate({
      receiverId: selectedFriendId,
      propertyData: property,
      message: message.trim() || undefined,
    });
  };

  if (!property) return null;

  const propertyAddress = propertyType === "zillow" ? property.address : property.address;
  const propertyImage = propertyType === "zillow" ? property.imgSrc : property.images?.[0];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-gray-800 border-gray-600">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Send className="h-5 w-5" />
            Share Property
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Property Preview */}
          <div className="border border-gray-600 rounded-lg p-3 bg-gray-700">
            <div className="flex gap-3">
              {propertyImage && (
                <img
                  src={propertyImage}
                  alt="Property"
                  className="w-16 h-16 object-cover rounded"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate text-white">{propertyAddress}</p>
                {propertyType === "zillow" && property.rentZestimate && (
                  <p className="text-green-400 font-semibold">${property.rentZestimate}/mo</p>
                )}
                {propertyType === "listing" && property.monthlyRent && (
                  <p className="text-green-400 font-semibold">${property.monthlyRent}/mo</p>
                )}
                <div className="flex gap-3 text-xs text-gray-400 mt-1">
                  {property.bedrooms && <span>{property.bedrooms} bed</span>}
                  {property.bathrooms && <span>{property.bathrooms} bath</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Friend Selection */}
          <div>
            <label className="block text-sm font-medium mb-2 text-white">Select Friend</label>
            {loadingFriends ? (
              <div className="h-32 bg-gray-700 rounded animate-pulse" />
            ) : friends.length === 0 ? (
              <div className="text-center py-6 text-gray-400">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No friends to share with</p>
                <p className="text-xs">Add friends to share properties!</p>
              </div>
            ) : (
              <div className="max-h-32 overflow-y-auto border border-gray-600 rounded space-y-1 p-2 bg-gray-700">
                {friends.map((friend: any) => (
                  <button
                    key={friend.id}
                    onClick={() => setSelectedFriendId(friend.id)}
                    className={`w-full text-left p-2 rounded flex items-center gap-3 transition-colors ${
                      selectedFriendId === friend.id
                        ? "bg-blue-600/20 border-blue-500 border"
                        : "hover:bg-gray-600"
                    }`}
                  >
                    <div className="w-8 h-8 bg-blue-600/20 rounded-full flex items-center justify-center">
                      <span className="text-blue-400 font-semibold text-sm">
                        {friend.email?.charAt(0)?.toUpperCase() || friend.id.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-sm text-white">
                        {friend.firstName && friend.lastName 
                          ? `${friend.firstName} ${friend.lastName}`
                          : friend.email || `User ${friend.id}`}
                      </p>
                      {friend.email && (friend.firstName || friend.lastName) && (
                        <p className="text-xs text-gray-400">{friend.email}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Optional Message */}
          <div>
            <label className="block text-sm font-medium mb-2 text-white">Message (Optional)</label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a message about this property..."
              rows={3}
              className="resize-none bg-gray-700 border-gray-600 text-white placeholder-gray-400"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleShare}
              disabled={!selectedFriendId || shareMutation.isPending}
              className="flex-1"
            >
              {shareMutation.isPending ? "Sharing..." : "Share Property"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}