import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Heart, X, MessageSquare, Loader2, Users, Calendar, Home, DollarSign } from "lucide-react";

interface RoommateProfile {
  id: number;
  userId: string;
  cleanlinessRating: number;
  sleepSchedule: string;
  budgetRange: string;
  guestsAllowed: boolean;
  petsAllowed: boolean;
  matchScore: string;
  trustScore: string;
  isVerified: boolean;
  matchPercentage?: number;
  user: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    profileImageUrl?: string;
  };
}

export function RoommateDiscovery() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentIndex, setCurrentIndex] = useState(0);

  // Fetch potential roommates with match scores
  const { data: roommates = [], isLoading } = useQuery<RoommateProfile[]>({
    queryKey: ["/api/roommate/discover"],
  });

  // Create match mutation
  const createMatchMutation = useMutation({
    mutationFn: async (targetUserId: string) => {
      await apiRequest("POST", "/api/roommate/match", { 
        targetUserId,
        compatibilityScore: roommates[currentIndex]?.matchPercentage || 0
      });
    },
    onSuccess: () => {
      toast({
        title: "Match Created!",
        description: "You've liked this roommate. If they like you back, you'll be matched!",
      });
      handleNext();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create match. Please try again.",
        variant: "destructive",
      });
    },
  });

  const currentRoommate = roommates[currentIndex];

  const handleLike = () => {
    if (currentRoommate) {
      createMatchMutation.mutate(currentRoommate.userId);
    }
  };

  const handlePass = () => {
    handleNext();
  };

  const handleNext = () => {
    if (currentIndex < roommates.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setCurrentIndex(0); // Loop back to start
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (roommates.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Roommates Found</CardTitle>
          <CardDescription>
            Complete your roommate quiz to find compatible matches!
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!currentRoommate) {
    return null;
  }

  const getMatchColor = (percentage: number) => {
    if (percentage >= 80) return "text-green-600 bg-green-50 border-green-300";
    if (percentage >= 60) return "text-blue-600 bg-blue-50 border-blue-300";
    if (percentage >= 40) return "text-yellow-600 bg-yellow-50 border-yellow-300";
    return "text-red-600 bg-red-50 border-red-300";
  };

  const getSleepScheduleLabel = (schedule: string) => {
    const labels: Record<string, string> = {
      early: "Early Riser 🌅",
      moderate: "Moderate Schedule 🌤️",
      late: "Night Owl 🦉",
    };
    return labels[schedule] || schedule;
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Discover Roommates</CardTitle>
        <CardDescription>
          Swipe to find your perfect roommate match
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Match Percentage Badge */}
        <div className="text-center">
          <div className={`inline-flex items-center px-6 py-3 rounded-full border-2 ${getMatchColor(currentRoommate.matchPercentage || 0)}`}>
            <span className="text-3xl font-bold">{currentRoommate.matchPercentage || 0}%</span>
            <span className="ml-2 text-lg">Match</span>
          </div>
        </div>

        {/* Profile Info */}
        <div className="flex items-center space-x-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src={currentRoommate.user.profileImageUrl} />
            <AvatarFallback>
              {currentRoommate.user.firstName?.[0]}{currentRoommate.user.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="text-xl font-semibold">
              {currentRoommate.user.firstName} {currentRoommate.user.lastName}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              {currentRoommate.isVerified && (
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Verified
                </Badge>
              )}
              <Badge variant="outline">
                Trust Score: {parseFloat(currentRoommate.trustScore).toFixed(0)}%
              </Badge>
            </div>
          </div>
        </div>

        {/* Key Details */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span className="text-sm">{getSleepScheduleLabel(currentRoommate.sleepSchedule)}</span>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-gray-500" />
              <span className="text-sm">Budget: ${currentRoommate.budgetRange}/month</span>
            </div>
            <div className="flex items-center gap-2">
              <Home className="h-4 w-4 text-gray-500" />
              <span className="text-sm">Cleanliness: {currentRoommate.cleanlinessRating}/10</span>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-500" />
              <span className="text-sm">
                Guests: {currentRoommate.guestsAllowed ? "Allowed ✓" : "Not Preferred ✗"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm">🐾</span>
              <span className="text-sm">
                Pets: {currentRoommate.petsAllowed ? "Allowed ✓" : "No Pets ✗"}
              </span>
            </div>
          </div>
        </div>

        {/* Match Explanation */}
        {currentRoommate.matchPercentage && currentRoommate.matchPercentage >= 60 && (
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Why you match:</strong> Similar sleep schedules, compatible cleanliness standards, 
              and aligned preferences on guests and pets.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-center gap-4 pt-4">
          <Button
            size="lg"
            variant="outline"
            onClick={handlePass}
            className="rounded-full h-16 w-16"
          >
            <X className="h-6 w-6" />
          </Button>
          
          <Button
            size="lg"
            variant="outline"
            className="rounded-full h-16 w-16"
            onClick={() => {
              toast({
                title: "Coming Soon",
                description: "Direct messaging will be available soon!",
              });
            }}
          >
            <MessageSquare className="h-6 w-6" />
          </Button>
          
          <Button
            size="lg"
            onClick={handleLike}
            disabled={createMatchMutation.isPending}
            className="rounded-full h-16 w-16 bg-green-500 hover:bg-green-600 text-white"
          >
            {createMatchMutation.isPending ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <Heart className="h-6 w-6" />
            )}
          </Button>
        </div>

        {/* Navigation Info */}
        <p className="text-center text-sm text-gray-500">
          {currentIndex + 1} of {roommates.length} potential roommates
        </p>
      </CardContent>
    </Card>
  );
}