import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import MobileNavigation from "@/components/MobileNavigation";
import AgentMessaging from "@/components/AgentMessaging";
import FriendsModal from "@/components/FriendsModal";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { User, Mail, Calendar, Trophy, TrendingUp, LogOut, Settings, Home, Bed, Bath, MapPin, ChevronRight, Square, Camera, Edit, Trash2, MessageSquare, MessageCircle, ChevronLeft, Edit2, Users, DollarSign, Plus } from "lucide-react";
import { VerificationBadge } from "@/components/VerificationBadge";
import { TrustScoreCard } from "@/components/TrustScoreCard";
import { RoommateQuiz } from "@/components/RoommateQuiz";
import { RoommateDiscovery } from "@/components/RoommateDiscovery";
import { SplitRentReporting } from "@/components/SplitRentReporting";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PropertyListing } from "@shared/schema";
import { useState } from "react";

export default function Profile() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showMyListings, setShowMyListings] = useState(false);
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [activeSection, setActiveSection] = useState('profile');

  
  // Property detail modal state
  const [selectedProperty, setSelectedProperty] = useState<PropertyListing | null>(null);
  const [isPropertyDetailOpen, setIsPropertyDetailOpen] = useState(false);
  const [showMessaging, setShowMessaging] = useState(false);
  const [messagingAnimating, setMessagingAnimating] = useState(false);
  
  // Property listing editing state
  const [editingListing, setEditingListing] = useState<PropertyListing | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [newListing, setNewListing] = useState({
    address: '',
    city: '',
    state: '',
    zipCode: '',
    propertyType: '',
    bedrooms: 1,
    bathrooms: 1,
    squareFeet: 500,
    monthlyRent: 1000,
    description: '',
    images: [] as string[],
    requiredDocuments: [] as string[],
    isPetFriendly: false,
    leaseLengthMonths: 12,
    hasWasherDryer: false,
    hasElevator: false,
    hasOnsiteLaundry: false,
    hasHardwoodFloors: false,
    hasParkingGarage: false,
    hasSwimmingPool: false,
    allowsSubletting: false,
    isSmokeFree: false,
    hasGym: false,
    hasLiveInSuper: false
  });

  // Property Image Carousel Component
  function PropertyImageCarousel({ images }: { images: string[] }) {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    const nextImage = () => {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    };

    const prevImage = () => {
      setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
    };

    if (!images || images.length === 0) return null;

    return (
      <div className="relative h-full w-full">
        <div className="relative h-full w-full overflow-hidden bg-gray-100">
          <img
            src={images[currentImageIndex]}
            alt={`Property image ${currentImageIndex + 1}`}
            className="w-full h-full object-cover"
          />
          
          {/* Navigation arrows - only show if more than 1 image */}
          {images.length > 1 && (
            <>
              <button
                onClick={prevImage}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-opacity z-10"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={nextImage}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-opacity z-10"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}
          
          {/* Image counter */}
          {images.length > 1 && (
            <div className="absolute top-4 right-4 bg-black bg-opacity-60 text-white text-sm px-3 py-1 rounded-full z-10">
              {currentImageIndex + 1} / {images.length}
            </div>
          )}
          
          {/* Thumbnail dots for navigation */}
          {images.length > 1 && images.length <= 8 && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2 z-10">
              {images.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImageIndex(index)}
                  className={`w-3 h-3 rounded-full transition-all duration-200 ${
                    index === currentImageIndex 
                      ? 'bg-white shadow-lg' 
                      : 'bg-white bg-opacity-50 hover:bg-opacity-80'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Get user's property listings
  const { data: userListings = [], isLoading: isLoadingListings } = useQuery({
    queryKey: ['/api/property-listings/user'],
    enabled: !!user && showMyListings,
  });

  // Query for roommate profile with verification data
  const { data: roommateProfile } = useQuery({
    queryKey: ['/api/roommate/profile'],
    enabled: !!user,
  });

  // Handle property listing click
  const handlePropertyClick = (property: PropertyListing) => {
    setSelectedProperty(property);
    setIsPropertyDetailOpen(true);
  };

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/auth/logout", {});
      return response.json();
    },
    onMutate: () => {
      // Immediately set auth state to null to prevent flash
      queryClient.setQueryData(["/api/auth/user"], null);
    },
    onSuccess: () => {
      // Clear all React Query cache
      queryClient.clear();
      
      // Clear browser storage
      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
      }
      
      toast({
        title: "Logged out successfully",
        description: "You have been securely logged out.",
      });
      
      // Navigate to landing page
      setLocation("/");
    },
    onError: (error: Error) => {
      // Restore auth state if logout failed
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      
      toast({
        title: "Logout failed",
        description: error.message || "Failed to logout",
        variant: "destructive",
      });
    },
  });

  const handleLogout = async () => {
    try {
      // First clear local state immediately
      queryClient.setQueryData(["/api/auth/user"], null);
      
      // Then perform logout on server
      logoutMutation.mutate();
    } catch (error) {
      console.error("Logout error:", error);
      // Use router navigation even if logout fails
      setLocation("/");
    }
  };

  // Delete listing mutation
  const deleteListingMutation = useMutation({
    mutationFn: async (listingId: number) => {
      const response = await apiRequest("DELETE", `/api/property-listings/${listingId}`, {});
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Listing deleted",
        description: "Your property listing has been removed.",
      });
      queryClient.invalidateQueries(['/api/property-listings/user']);
      setShowDeleteConfirm(false);
      setSelectedProperty(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete listing",
        variant: "destructive",
      });
    },
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-[hsl(220,20%,8%)]">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-gray-500">Loading user profile...</p>
            </CardContent>
          </Card>
        </div>
        <MobileNavigation />
      </div>
    );
  }

  // Render function for active section content
  const renderActiveSection = () => {
    switch (activeSection) {
      case 'profile':
        return renderProfileSection();
      case 'listings':
        return renderListingsSection();
      case 'roommate':
        return renderRoommateSection();
      case 'rent':
        return renderRentSection();
      default:
        return renderProfileSection();
    }
  };

  // Profile Section Component
  const renderProfileSection = () => (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="flex items-center space-x-6 p-6 bilt-card rounded-lg">
        <Avatar className="h-24 w-24">
          <AvatarImage src={user.profileImageUrl || ""} alt={user.firstName || "User"} />
          <AvatarFallback className="text-lg">
            {user.firstName?.[0]}{user.lastName?.[0]}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white mb-2">
            {user.firstName} {user.lastName}
          </h1>
          <p className="text-white/70 mb-4">{user.email}</p>
          
          <div className="flex flex-wrap gap-2 mb-4">
            <Badge variant="secondary" className="flex items-center">
              <Trophy className="h-3 w-3 mr-1" />
              {user.rewardPoints} Points
            </Badge>
            <Badge variant="secondary" className="flex items-center">
              <TrendingUp className="h-3 w-3 mr-1" />
              {user.creditScore} Credit Score
            </Badge>
            <Badge variant="outline" className="flex items-center">
              <Calendar className="h-3 w-3 mr-1" />
              Member since {new Date(user.createdAt!).toLocaleDateString()}
            </Badge>
            {roommateProfile && (
              <VerificationBadge 
                isVerified={roommateProfile.isVerified}
                neighborlyVerified={roommateProfile.neighborlyVerified}
                trustScore={roommateProfile.trustScore}
                size="sm"
                showScore={false}
              />
            )}
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowFriendsModal(true)} className="flex items-center">
              <Users className="h-4 w-4 mr-2" />
              Friends
            </Button>
            <Button variant="outline" className="flex items-center">
              <Settings className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
            <Button variant="outline" onClick={handleLogout} className="flex items-center">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* Account Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Details */}
        <Card className="bilt-card">
          <CardHeader>
            <CardTitle className="text-white">Personal Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-white/70">Full Name</label>
                <p className="text-white font-medium">{user.firstName} {user.lastName}</p>
              </div>
              <div>
                <label className="text-sm text-white/70">Email</label>
                <p className="text-white font-medium">{user.email}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-white/70">Phone Number</label>
                <p className="text-white font-medium">{user.phoneNumber || 'Not provided'}</p>
              </div>
              <div>
                <label className="text-sm text-white/70">Location</label>
                <p className="text-white font-medium">{user.city && user.state ? `${user.city}, ${user.state}` : 'Not set'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Settings */}
        <Card className="bilt-card">
          <CardHeader>
            <CardTitle className="text-white">Account Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm text-white/70">Account Status</label>
              <p className="text-green-400 font-medium">Active</p>
            </div>
            <div>
              <label className="text-sm text-white/70">Member Since</label>
              <p className="text-white font-medium">{new Date(user.createdAt!).toLocaleDateString()}</p>
            </div>
            <div>
              <label className="text-sm text-white/70">Verification Status</label>
              <p className="text-white font-medium">
                {roommateProfile?.isVerified ? 'Verified' : 'Pending Verification'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  // Listings Section Component  
  const renderListingsSection = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">My Property Listings</h2>
        <Button onClick={() => setLocation('/post')} className="bilt-gradient">
          <Plus className="h-4 w-4 mr-2" />
          Create Listing
        </Button>
      </div>
      <Card>
        <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={user.profileImageUrl || ""} alt={user.firstName || "User"} />
                  <AvatarFallback className="text-lg">
                    {user.firstName?.[0]}{user.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 text-center sm:text-left">
                  <h1 className="text-2xl font-bold text-gray-900 mb-1">
                    {user.firstName} {user.lastName}
                  </h1>
                  <p className="text-gray-600 mb-4">{user.email}</p>
                  
                  <div className="flex flex-wrap justify-center sm:justify-start gap-2 mb-4">
                    <Badge variant="secondary" className="flex items-center">
                      <Trophy className="h-3 w-3 mr-1" />
                      {user.rewardPoints} Points
                    </Badge>
                    <Badge variant="secondary" className="flex items-center">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      {user.creditScore} Credit Score
                    </Badge>
                    <Badge variant="outline" className="flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      Member since {new Date(user.createdAt!).toLocaleDateString()}
                    </Badge>
                    {roommateProfile && (
                      <VerificationBadge 
                        isVerified={roommateProfile.isVerified}
                        neighborlyVerified={roommateProfile.neighborlyVerified}
                        trustScore={roommateProfile.trustScore}
                        size="sm"
                        showScore={false}
                      />
                    )}
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button variant="outline" onClick={() => setShowFriendsModal(true)} className="flex items-center">
                      <Users className="h-4 w-4 mr-2" />
                      Friends
                    </Button>
                    <Button variant="outline" className="flex items-center">
                      <Settings className="h-4 w-4 mr-2" />
                      Edit Profile
                    </Button>
                    <Button variant="outline" onClick={handleLogout} className="flex items-center">
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign Out
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* My Listings Section */}
          <Card className="mb-8">
            <CardHeader className="cursor-pointer" onClick={() => setShowMyListings(!showMyListings)}>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <Home className="h-5 w-5 mr-2" />
                  My Listings
                </div>
                <ChevronRight className={`h-5 w-5 transition-transform ${showMyListings ? 'rotate-90' : ''}`} />
              </CardTitle>
            </CardHeader>
            
            {showMyListings && (
              <CardContent>
                {isLoadingListings ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                        <div className="h-20 bg-gray-200 rounded"></div>
                      </div>
                    ))}
                  </div>
                ) : userListings.length === 0 ? (
                  <div className="text-center py-8">
                    <Home className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No listings yet</h3>
                    <p className="text-gray-600 mb-4">You haven't created any property listings.</p>
                    <Button onClick={() => setLocation("/post?openListing=true")}>
                      Create Your First Listing
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {userListings.map((listing: PropertyListing) => (
                      <Card 
                        key={listing.id} 
                        className="hover:shadow-md transition-shadow"
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start space-x-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <Home className="h-5 w-5 text-blue-600" />
                            </div>
                            
                            <div 
                              className="flex-1 cursor-pointer"
                              onClick={() => handlePropertyClick(listing)}
                            >
                              <h4 className="font-semibold text-gray-900 mb-1">{listing.address}</h4>
                              
                              <div className="flex items-center gap-4 mb-2 text-sm text-gray-600">
                                <div className="flex items-center gap-1">
                                  <Bed className="h-4 w-4" />
                                  {listing.bedrooms} bed
                                </div>
                                <div className="flex items-center gap-1">
                                  <Bath className="h-4 w-4" />
                                  {listing.bathrooms} bath
                                </div>
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-4 w-4" />
                                  {listing.city}, {listing.state}
                                </div>
                              </div>
                              
                              <div className="flex items-center">
                                <span className="text-lg font-bold text-green-600">
                                  ${listing.monthlyRent}/month
                                </span>
                              </div>
                            </div>

                            {/* Listed date and buttons section */}
                            <div className="flex flex-col items-end gap-2">
                              <span className="text-xs text-gray-500">
                                Listed {new Date(listing.createdAt!).toLocaleDateString()}
                              </span>
                              
                              {/* Edit and Delete buttons - horizontal */}
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingListing(listing);
                                    setNewListing({
                                      address: listing.address,
                                      city: listing.city,
                                      state: listing.state,
                                      zipCode: listing.zipCode,
                                      propertyType: listing.propertyType,
                                      bedrooms: listing.bedrooms,
                                      bathrooms: listing.bathrooms,
                                      squareFeet: listing.squareFeet,
                                      monthlyRent: listing.monthlyRent,
                                      description: listing.description,
                                      images: listing.images || [],
                                      requiredDocuments: listing.requiredDocuments || [],
                                      isPetFriendly: listing.isPetFriendly || false,
                                      leaseLengthMonths: listing.leaseLengthMonths || 12,
                                      hasWasherDryer: listing.hasWasherDryer || false,
                                      hasElevator: listing.hasElevator || false,
                                      hasOnsiteLaundry: listing.hasOnsiteLaundry || false,
                                      hasHardwoodFloors: listing.hasHardwoodFloors || false,
                                      hasParkingGarage: listing.hasParkingGarage || false,
                                      hasSwimmingPool: listing.hasSwimmingPool || false,
                                      allowsSubletting: listing.allowsSubletting || false,
                                      isSmokeFree: listing.isSmokeFree || false,
                                      hasGym: listing.hasGym || false,
                                      hasLiveInSuper: listing.hasLiveInSuper || false
                                    });
                                    setLocation("/post?openListing=true");
                                  }}
                                  className="h-7 px-3 text-xs rounded-full"
                                >
                                  <Edit2 className="h-3 w-3 mr-1" />
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedProperty(listing);
                                    setShowDeleteConfirm(true);
                                  }}
                                  className="h-7 px-3 text-xs text-red-600 border-red-200 hover:bg-red-50 rounded-full"
                                >
                                  <Trash2 className="h-3 w-3 mr-1" />
                                  Delete
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            )}
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Account Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Account Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">First Name</label>
                  <p className="text-gray-900">{user.firstName || "Not provided"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Last Name</label>
                  <p className="text-gray-900">{user.lastName || "Not provided"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <p className="text-gray-900">{user.email || "Not provided"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Account Created</label>
                  <p className="text-gray-900">{new Date(user.createdAt!).toLocaleDateString()}</p>
                </div>
              </CardContent>
            </Card>

            {/* Stats & Achievements */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Trophy className="h-5 w-5 mr-2" />
                  Stats & Achievements
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Reward Points</span>
                  <span className="font-bold text-amber-600">{user.rewardPoints}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Credit Score</span>
                  <span className="font-bold text-green-600">{user.creditScore}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Account Level</span>
                  <Badge variant="default">
                    {user.rewardPoints && user.rewardPoints >= 1000 ? "Gold" : 
                     user.rewardPoints && user.rewardPoints >= 500 ? "Silver" : "Bronze"}
                  </Badge>
                </div>
                <div className="pt-4 border-t">
                  <h4 className="font-medium text-gray-900 mb-2">Recent Achievements</h4>
                  <div className="space-y-2">
                    <div className="flex items-center text-sm">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                      <span className="text-gray-600">Account Created</span>
                    </div>
                    {user.rewardPoints && user.rewardPoints > 0 && (
                      <div className="flex items-center text-sm">
                        <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                        <span className="text-gray-600">First Points Earned</span>
                      </div>
                    )}
                    {user.creditScore && user.creditScore > 0 && (
                      <div className="flex items-center text-sm">
                        <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                        <span className="text-gray-600">Credit Score Tracked</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Trust Score and Verification */}
            {roommateProfile && (
              <TrustScoreCard
                trustScore={roommateProfile.trustScore}
                isVerified={roommateProfile.isVerified}
                neighborlyVerified={roommateProfile.neighborlyVerified}
                onTimeRentScore={roommateProfile.onTimeRentScore}
                complaintScore={roommateProfile.complaintScore}
                leaseCompletionScore={roommateProfile.leaseCompletionScore}
                lastUpdated={roommateProfile.lastTrustUpdate}
              />
            )}
          </div>

          {/* Roommate Matching Section */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Roommate Matching
              </CardTitle>
              <CardDescription>
                Find your perfect roommate match with our compatibility quiz
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Tabs defaultValue="quiz" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="quiz">Compatibility Quiz</TabsTrigger>
                  <TabsTrigger value="discover">Discover Roommates</TabsTrigger>
                </TabsList>
                
                <TabsContent value="quiz" className="mt-6">
                  <RoommateQuiz />
                </TabsContent>
                
                <TabsContent value="discover" className="mt-6">
                  <RoommateDiscovery />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Split Rent Reporting Section */}
          <div className="mt-8">
            <SplitRentReporting />
          </div>

          {/* Privacy & Legal */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Privacy & Legal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <Button variant="outline" className="text-left justify-start">
                  Privacy Policy
                </Button>
                <Button variant="outline" className="text-left justify-start">
                  Terms of Service
                </Button>
                <Button variant="outline" className="text-left justify-start">
                  FAIR Act Compliance
                </Button>
                <Button variant="outline" className="text-left justify-start">
                  Cookie Policy
                </Button>
              </div>
              <div className="text-sm text-gray-500 pt-4 border-t">
                <p>
                  Your data is protected under our privacy policy and FAIR Act compliance measures. 
                  We are committed to fair housing practices and non-discriminatory lending.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <MobileNavigation />

      {/* Property Detail Modal */}
      <Dialog open={isPropertyDetailOpen} onOpenChange={(open) => {
        setIsPropertyDetailOpen(open);
        if (!open) {
          setShowMessaging(false);
          setMessagingAnimating(false);
        }
      }}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden p-0">
          {selectedProperty && (
            <div className="flex h-[85vh] relative overflow-hidden">
              {/* Property Details Panel */}
              <div className={`flex transition-transform duration-300 ease-in-out ${messagingAnimating ? '-translate-x-full' : 'translate-x-0'}`}>
                {/* Left Side - Image */}
                <div className="w-1/2 bg-gray-100">
                  {selectedProperty.images && selectedProperty.images.length > 0 ? (
                    <div className="relative h-full">
                      <PropertyImageCarousel images={selectedProperty.images} />
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center bg-gray-200">
                      <Camera className="h-16 w-16 text-gray-400" />
                    </div>
                  )}
                </div>

                {/* Right Side - Details */}
                <div className="w-1/2 flex flex-col">
                  {/* Header */}
                  <div className="p-6 border-b">
                    <div className="mb-2">
                      <h1 className="text-2xl font-bold text-gray-900">{selectedProperty.address}</h1>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-gray-600">{selectedProperty.city}, {selectedProperty.state} {selectedProperty.zipCode}</p>
                      {/* Contact Agent Button - Next to zip code for non-owners */}
                      {user && selectedProperty.userId !== String(user.id) && (
                        <button
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-full shadow-lg border border-blue-500 flex items-center gap-2 transition-all"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowMessaging(true);
                            setTimeout(() => setMessagingAnimating(true), 10);
                          }}
                        >
                          <MessageCircle className="h-3 w-3" />
                          Contact
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Content - Scrollable */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Price */}
                    <div>
                      <span className="text-3xl font-bold text-green-600">${selectedProperty.monthlyRent}</span>
                      <span className="text-gray-600 ml-2">per month</span>
                    </div>

                    {/* Property Details */}
                    <div className="grid grid-cols-3 gap-4 pb-4 border-b">
                      <div className="flex items-center gap-2">
                        <Bed className="h-5 w-5 text-gray-400" />
                        <span className="font-medium">{selectedProperty.bedrooms}</span>
                        <span className="text-gray-600">bed</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Bath className="h-5 w-5 text-gray-400" />
                        <span className="font-medium">{selectedProperty.bathrooms}</span>
                        <span className="text-gray-600">bath</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Square className="h-5 w-5 text-gray-400" />
                        <span className="font-medium">{selectedProperty.squareFeet}</span>
                        <span className="text-gray-600">sq ft</span>
                      </div>
                    </div>

                    {/* Pet Policy and Lease Length */}
                    <div className="grid grid-cols-2 gap-4 pb-4 border-b">
                      <div className="text-sm">
                        <div className="font-medium text-gray-900">Pet Policy</div>
                        <div className={`text-sm ${selectedProperty.isPetFriendly ? 'text-green-600' : 'text-red-600'}`}>
                          {selectedProperty.isPetFriendly ? '🐕 Pet Friendly' : '🚫 No Pets'}
                        </div>
                      </div>
                      <div className="text-sm">
                        <div className="font-medium text-gray-900">Lease Length</div>
                        <div className="text-sm text-gray-600">
                          {selectedProperty.leaseLengthMonths || 12} months
                        </div>
                      </div>
                    </div>

                    {/* Amenities */}
                    {(selectedProperty.hasWasherDryer || selectedProperty.hasElevator || selectedProperty.hasOnsiteLaundry || 
                      selectedProperty.hasHardwoodFloors || selectedProperty.hasParkingGarage || selectedProperty.hasSwimmingPool || 
                      selectedProperty.allowsSubletting || selectedProperty.isSmokeFree || selectedProperty.hasGym || 
                      selectedProperty.hasLiveInSuper) && (
                      <div>
                        <h3 className="text-lg font-semibold mb-3">Amenities</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {selectedProperty.hasWasherDryer && (
                            <div className="flex items-center space-x-2 text-sm">
                              <span className="text-lg">🧺</span>
                              <span>Washer / Dryer</span>
                            </div>
                          )}
                          {selectedProperty.hasElevator && (
                            <div className="flex items-center space-x-2 text-sm">
                              <span className="text-lg">🛗</span>
                              <span>Elevator</span>
                            </div>
                          )}
                          {selectedProperty.hasOnsiteLaundry && (
                            <div className="flex items-center space-x-2 text-sm">
                              <span className="text-lg">🧴</span>
                              <span>On-site laundry</span>
                            </div>
                          )}
                          {selectedProperty.hasHardwoodFloors && (
                            <div className="flex items-center space-x-2 text-sm">
                              <span className="text-lg">🪵</span>
                              <span>Hardwood floors</span>
                            </div>
                          )}
                          {selectedProperty.hasParkingGarage && (
                            <div className="flex items-center space-x-2 text-sm">
                              <span className="text-lg">🚗</span>
                              <span>Parking garage</span>
                            </div>
                          )}
                          {selectedProperty.hasSwimmingPool && (
                            <div className="flex items-center space-x-2 text-sm">
                              <span className="text-lg">🏊</span>
                              <span>Swimming pool</span>
                            </div>
                          )}
                          {selectedProperty.allowsSubletting && (
                            <div className="flex items-center space-x-2 text-sm">
                              <span className="text-lg">📋</span>
                              <span>Sub-letting allowed</span>
                            </div>
                          )}
                          {selectedProperty.isSmokeFree && (
                            <div className="flex items-center space-x-2 text-sm">
                              <span className="text-lg">🚭</span>
                              <span>Smoke-free</span>
                            </div>
                          )}
                          {selectedProperty.hasGym && (
                            <div className="flex items-center space-x-2 text-sm">
                              <span className="text-lg">💪</span>
                              <span>Gym</span>
                            </div>
                          )}
                          {selectedProperty.hasLiveInSuper && (
                            <div className="flex items-center space-x-2 text-sm">
                              <span className="text-lg">👨‍🔧</span>
                              <span>Live-in super</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Description */}
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Description</h3>
                      <p className="text-gray-700 leading-relaxed">{selectedProperty.description}</p>
                    </div>

                    {/* Contact information or additional details could go here */}
                    <div className="text-center text-gray-500 text-sm">
                      Use the Edit and Delete buttons on the listing card to manage this property.
                    </div>
                  </div>
                </div>
              </div>

              {/* Messaging Panel */}
              {showMessaging && (
                <div className={`w-full absolute left-0 top-0 h-full bg-white transition-transform duration-300 ease-in-out z-10 ${
                  messagingAnimating ? 'translate-x-0' : 'translate-x-full'
                }`}>
                  <div className="h-full flex flex-col">
                    {/* Header with Back Button */}
                    <div className="flex flex-col p-4 border-b bg-white">
                      <Button 
                        variant="ghost" 
                        onClick={() => {
                          setMessagingAnimating(false);
                          setTimeout(() => setShowMessaging(false), 250);
                        }}
                        className="self-start mb-2 p-2"
                      >
                        <ChevronLeft className="h-5 w-5 mr-1" />
                        Back
                      </Button>
                      <div>
                        <h2 className="text-lg font-semibold">Message Agent</h2>
                        <p className="text-sm text-gray-600">{selectedProperty?.user?.firstName ? `${selectedProperty.user.firstName} ${selectedProperty.user.lastName}` : "Property Agent"}</p>
                      </div>
                    </div>
                    
                    {/* Messaging Content */}
                    <div className="flex-1">
                      <AgentMessaging
                        propertyId={selectedProperty?.id?.toString()}
                        propertyAddress={selectedProperty?.address || ''}
                        agentName={selectedProperty?.user?.firstName ? `${selectedProperty.user.firstName} ${selectedProperty.user.lastName}` : "Property Agent"}
                        onClose={() => setShowMessaging(false)}
                        hideHeader={true}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Property Listing</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this property listing? This action cannot be undone.
              {selectedProperty && (
                <div className="mt-2 p-2 bg-gray-50 rounded">
                  <strong>{selectedProperty.address}</strong><br />
                  {selectedProperty.city}, {selectedProperty.state} {selectedProperty.zipCode}
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedProperty?.id) {
                  deleteListingMutation.mutate(selectedProperty.id);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteListingMutation.isPending}
            >
              {deleteListingMutation.isPending ? "Deleting..." : "Delete Listing"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Friends Modal */}
      <FriendsModal isOpen={showFriendsModal} onClose={() => setShowFriendsModal(false)} />

    </div>
  );
}
