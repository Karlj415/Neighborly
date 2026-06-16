import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import FriendsModal from "@/components/FriendsModal";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { User, Calendar, Trophy, TrendingUp, Star, Building, Phone, Eye, FileText, Home, ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Camera, MessageCircle } from "lucide-react";
import { VerificationBadge } from "@/components/VerificationBadge";
import { TrustScoreCard } from "@/components/TrustScoreCard";
import { RoommateQuiz } from "@/components/RoommateQuiz";
import { SplitRentReporting } from "@/components/SplitRentReporting";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PropertyListing } from "@shared/schema";
import { useState, useRef, useEffect } from "react";

export default function Profile() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

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
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [uploadingDocument, setUploadingDocument] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPropertyDetailOpen, setIsPropertyDetailOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<PropertyListing | null>(null);
  const [showMessaging, setShowMessaging] = useState(false);
  const [messagingAnimating, setMessagingAnimating] = useState(false);

  // Fetch user listings
  const { data: userListings, isLoading: isLoadingListings } = useQuery({
    queryKey: ['/api/property-listings/user'],
    enabled: !!user,
  });

  // Fetch tenant profile and documents
  const { data: tenantProfile } = useQuery({
    queryKey: ['/api/tenant/profile'],
    enabled: !!user,
  });

  const { data: documents } = useQuery({
    queryKey: ['/api/documents'],
    enabled: !!user,
  });

  const { data: prequalificationData } = useQuery({
    queryKey: ['/api/tenant/prequalification'],
    enabled: !!user,
  });

  // Define required document types
  const documentTypes = [
    { value: "w2", label: "W-2 Tax Form", required: true },
    { value: "pay_stub", label: "Recent Pay Stub", required: true },
    { value: "bank_statement", label: "Bank Statement", required: true },
    { value: "employment_letter", label: "Employment Verification Letter", required: true },
    { value: "id", label: "Government ID", required: true },
    { value: "reference_letter", label: "Reference Letter", required: false },
  ];

  // Create document status map
  const getDocumentStatus = () => {
    const uploadedDocs = (documents as any[]) || [];
    const statusMap = new Map();
    
    // Initialize all required docs as missing
    documentTypes.forEach(docType => {
      statusMap.set(docType.value, {
        ...docType,
        status: 'missing',
        uploadedDoc: null
      });
    });
    
    // Update status for uploaded documents
    uploadedDocs.forEach(doc => {
      if (statusMap.has(doc.documentType)) {
        let status = 'pending'; // Default to pending for admin review
        if (doc.isVerified === true) status = 'verified';
        else if (doc.isDeclined === true) status = 'declined'; // Show declined status
        
        // Removed document logging to prevent base64 data in console
        
        statusMap.set(doc.documentType, {
          ...statusMap.get(doc.documentType),
          status,
          uploadedDoc: doc
        });
      }
    });
    
    return Array.from(statusMap.values());
  };

  // Handle window focus to detect file picker cancel
  useEffect(() => {
    const handleWindowFocus = () => {
      // If we're uploading and the file input has no value, user probably canceled
      if (uploadingDocument && fileInputRef.current && !fileInputRef.current.value) {
        setTimeout(() => {
          setUploadingDocument(null);
        }, 100);
      }
    };

    window.addEventListener('focus', handleWindowFocus);
    return () => window.removeEventListener('focus', handleWindowFocus);
  }, [uploadingDocument]);

  // Handle document upload
  const handleDocumentClick = (documentType: string) => {
    if (uploadingDocument) return; // Prevent multiple uploads
    
    setUploadingDocument(documentType);
    if (fileInputRef.current) {
      fileInputRef.current.setAttribute('data-document-type', documentType);
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const documentType = event.target.getAttribute('data-document-type');
    
    // Reset upload state first
    setUploadingDocument(null);
    
    if (!file || !documentType) {
      return;
    }
    
    // Set uploading state for the actual upload process
    setUploadingDocument(documentType);

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload PDF, JPG, PNG, or DOCX files only.",
        variant: "destructive",
      });
      setUploadingDocument(null);
      event.target.value = '';
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload files smaller than 10MB.",
        variant: "destructive",
      });
      setUploadingDocument(null);
      event.target.value = '';
      return;
    }

    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        
        try {
          await apiRequest('POST', '/api/documents', {
            documentType,
            fileName: file.name,
            fileData: base64,
            mimeType: file.type
          });

          toast({
            title: "Document uploaded",
            description: `${documentTypes.find(d => d.value === documentType)?.label} uploaded successfully.`,
          });

          // Refresh documents list and reset state
          queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
          setUploadingDocument(null);
        } catch (error) {
          toast({
            title: "Upload failed",
            description: "Failed to upload document. Please try again.",
            variant: "destructive",
          });
          setUploadingDocument(null);
        }
      };
      
      reader.onerror = () => {
        toast({
          title: "Upload failed",
          description: "Failed to read file. Please try again.",
          variant: "destructive",
        });
        setUploadingDocument(null);
      };
      
      reader.readAsDataURL(file);
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to process file. Please try again.",
        variant: "destructive",
      });
      setUploadingDocument(null);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Roommate/Social carousel items
  const carouselItems = [
    {
      title: "Trust Score",
      component: <TrustScoreCard />
    },
    {
      title: "Split Rent Reporting",
      component: <SplitRentReporting />
    },
    {
      title: "Roommate Quiz",
      component: <RoommateQuiz />
    }
  ];

  const nextCarouselItem = () => {
    setCarouselIndex((prev) => (prev + 1) % carouselItems.length);
  };

  const prevCarouselItem = () => {
    setCarouselIndex((prev) => (prev - 1 + carouselItems.length) % carouselItems.length);
  };

  // Handle property click to open detail modal
  const handlePropertyClick = (property: PropertyListing) => {
    setSelectedProperty(property);
    setIsPropertyDetailOpen(true);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const memberSince = new Date((user as any)?.createdAt || Date.now()).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header />
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">My Profile</h1>
          <p className="text-gray-400">Manage your personal information and settings</p>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Section 1: Personal Details */}
          <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700/50 hover:border-blue-500/50 transition-all duration-300">
            <CardHeader>
              <CardTitle className="text-xl text-white flex items-center gap-2">
                <User className="h-5 w-5 text-blue-500" />
                Personal Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Profile Picture and Basic Info */}
              <div className="flex items-center space-x-4">
                <Avatar className="h-20 w-20 ring-2 ring-blue-500/20">
                  <AvatarImage src={(user as any)?.profileImageUrl || ''} />
                  <AvatarFallback className="bg-blue-500/20 text-white text-lg">
                    {(user as any)?.firstName?.[0] || (user as any)?.email?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-xl font-semibold text-white">
                      {(user as any).firstName} {(user as any).lastName}
                    </h3>
                    {(user as any).isEmailVerified && <VerificationBadge />}
                  </div>
                  <p className="text-gray-400 text-sm">{(user as any).email}</p>
                </div>
              </div>

              <Separator className="bg-gray-700/50" />

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-800/80 p-4 rounded-lg border border-gray-700/50">
                  <div className="flex items-center gap-2 mb-1">
                    <Trophy className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm text-gray-400">Points</span>
                  </div>
                  <p className="text-xl font-bold text-white">{(user as any).rewardPoints || 0}</p>
                </div>
                
                <div className="bg-gray-800/80 p-4 rounded-lg border border-gray-700/50">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-gray-400">Credit Score</span>
                  </div>
                  <p className="text-xl font-bold text-white">
                    {(prequalificationData as any)?.creditScoreRange || 'Not Set'}
                  </p>
                </div>
              </div>

              {/* Member Since */}
              <div className="bg-gray-800/80 p-4 rounded-lg border border-gray-700/50">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="h-4 w-4 text-blue-500" />
                  <span className="text-sm text-gray-400">Member Since</span>
                </div>
                <p className="text-lg font-semibold text-white">{memberSince}</p>
              </div>
            </CardContent>
          </Card>

          

          {/* Section 3: Friends / Roommate Carousel */}
          <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700/50 hover:border-blue-500/50 transition-all duration-300">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl text-white flex items-center gap-2">
                  <User className="h-5 w-5 text-blue-500" />
                  Social & Roommate
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={prevCarouselItem}
                    className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-gray-700/50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-gray-400">
                    {carouselIndex + 1} / {carouselItems.length}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={nextCarouselItem}
                    className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-gray-700/50"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <CardDescription className="text-gray-400">
                {carouselItems[carouselIndex].title}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="min-h-[300px]">
                {carouselItems[carouselIndex].component}
              </div>
              
              {/* Carousel Dots */}
              <div className="flex justify-center gap-2 mt-4">
                {carouselItems.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCarouselIndex(index)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      index === carouselIndex ? 'bg-blue-500' : 'bg-gray-600'
                    }`}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Section 4: My Listings */}
          <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700/50 hover:border-blue-500/50 transition-all duration-300">
            <CardHeader>
              <CardTitle className="text-xl text-white flex items-center gap-2">
                <Building className="h-5 w-5 text-blue-500" />
                My Listings
              </CardTitle>
              <CardDescription className="text-gray-400">
                Properties you've listed for rent
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingListings ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full" />
                </div>
              ) : userListings && (userListings as any)?.length > 0 ? (
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {(userListings as any)?.map((listing: any) => (
                    <div key={listing.id} className="p-3 bg-gray-800/80 rounded-lg border border-gray-700/50 hover:border-blue-500/30 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-white font-medium mb-1">
                            {listing.address}, {listing.city}
                          </h4>
                          <div className="flex items-center gap-4 text-sm text-gray-400 mb-2">
                            <span>{listing.bedrooms} bed • {listing.bathrooms} bath</span>
                            <span>{listing.squareFeet} sq ft</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-green-400">
                              ${listing.monthlyRent}/mo
                            </span>
                            {listing.isPetFriendly && (
                              <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30">
                                Pet Friendly
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePropertyClick(listing)}
                          className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                        >
                          View
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Home className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400 mb-4">No listings yet</p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setLocation('/post')}
                    className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
                  >
                    Create Listing
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      {showFriendsModal && (
        <FriendsModal isOpen={showFriendsModal} onClose={() => setShowFriendsModal(false)} />
      )}

      {/* Property Detail Modal */}
      <Dialog open={isPropertyDetailOpen} onOpenChange={(open) => {
        setIsPropertyDetailOpen(open);
        if (!open) {
          setShowMessaging(false);
          setMessagingAnimating(false);
        }
      }}>
        <DialogContent className="w-full h-full max-w-none max-h-none sm:max-w-4xl sm:max-h-[90vh] md:max-w-6xl overflow-hidden p-0 bg-gray-800 border-gray-600">
          {selectedProperty && (
            <div className="flex flex-col h-screen sm:h-[85vh] relative overflow-hidden">
              {/* Property Details Panel */}
              <div className={`flex flex-col lg:flex-row transition-transform duration-300 ease-in-out ${messagingAnimating ? '-translate-x-full' : 'translate-x-0'}`}>
                {/* Image Section - Full width on mobile, half on desktop */}
                <div className="w-full lg:w-1/2 h-64 sm:h-80 lg:h-full bg-gray-100">
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

                {/* Property Info Section - Full width on mobile, half on desktop */}
                <div className="w-full lg:w-1/2 p-4 sm:p-6 overflow-y-auto bg-gray-800 text-white flex-1">
                  {/* Header with Contact Button */}
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-6 gap-4">
                    <div className="flex-1">
                      <h2 className="text-xl sm:text-2xl font-bold mb-2">
                        {selectedProperty.propertyType === 'apartment' ? 'Apartment' : 
                         selectedProperty.propertyType === 'house' ? 'House' : 
                         selectedProperty.propertyType === 'condo' ? 'Condominium' : 
                         selectedProperty.propertyType === 'townhouse' ? 'Townhouse' : 'Property'} in {selectedProperty.city}, {selectedProperty.state}
                      </h2>
                      <p className="text-base sm:text-lg text-gray-300">{selectedProperty.address}</p>
                    </div>
                    {/* Show Edit button for property owners in My Listings */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setIsPropertyDetailOpen(false);
                          setLocation('/post?edit=' + selectedProperty.id);
                        }}
                        className="border-blue-500 text-blue-400 hover:bg-blue-500/10 w-full sm:w-auto"
                      >
                        Edit
                      </Button>
                    </div>
                  </div>

                  {/* Property Stats */}
                  <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6 p-3 sm:p-4 bg-gray-700/50 rounded-lg">
                    <div className="text-center">
                      <div className="text-xl sm:text-2xl font-bold text-blue-400">{selectedProperty.bedrooms}</div>
                      <div className="text-xs sm:text-sm text-gray-400">Bedrooms</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl sm:text-2xl font-bold text-blue-400">{selectedProperty.bathrooms}</div>
                      <div className="text-xs sm:text-sm text-gray-400">Bathrooms</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl sm:text-2xl font-bold text-blue-400">{selectedProperty.squareFeet}</div>
                      <div className="text-xs sm:text-sm text-gray-400">Sq Ft</div>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="mb-6">
                    <div className="text-2xl sm:text-3xl font-bold text-green-400 mb-2">
                      ${selectedProperty.monthlyRent}/month
                    </div>
                    {selectedProperty.leaseLengthMonths && (
                      <p className="text-sm sm:text-base text-gray-400">
                        {selectedProperty.leaseLengthMonths} month lease
                      </p>
                    )}
                  </div>

                  {/* Amenities */}
                  {(selectedProperty.isPetFriendly || 
                    selectedProperty.hasWasherDryer || 
                    selectedProperty.hasElevator || 
                    selectedProperty.hasOnsiteLaundry || 
                    selectedProperty.hasHardwoodFloors || 
                    selectedProperty.hasParkingGarage || 
                    selectedProperty.hasSwimmingPool || 
                    selectedProperty.allowsSubletting || 
                    selectedProperty.isSmokeFree || 
                    selectedProperty.hasGym || 
                    selectedProperty.hasLiveInSuper) && (
                    <div className="mb-6">
                      <h3 className="text-base sm:text-lg font-semibold mb-3">Amenities</h3>
                      <div className="flex flex-wrap gap-1 sm:gap-2">
                        {selectedProperty.isPetFriendly && (
                          <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30">Pet Friendly</Badge>
                        )}
                        {selectedProperty.hasWasherDryer && (
                          <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 border-blue-500/30">Washer/Dryer</Badge>
                        )}
                        {selectedProperty.hasElevator && (
                          <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 border-blue-500/30">Elevator</Badge>
                        )}
                        {selectedProperty.hasOnsiteLaundry && (
                          <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 border-blue-500/30">Laundry</Badge>
                        )}
                        {selectedProperty.hasHardwoodFloors && (
                          <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 border-blue-500/30">Hardwood Floors</Badge>
                        )}
                        {selectedProperty.hasParkingGarage && (
                          <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 border-blue-500/30">Parking</Badge>
                        )}
                        {selectedProperty.hasSwimmingPool && (
                          <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 border-blue-500/30">Pool</Badge>
                        )}
                        {selectedProperty.allowsSubletting && (
                          <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 border-blue-500/30">Subletting OK</Badge>
                        )}
                        {selectedProperty.isSmokeFree && (
                          <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 border-blue-500/30">Smoke Free</Badge>
                        )}
                        {selectedProperty.hasGym && (
                          <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 border-blue-500/30">Gym</Badge>
                        )}
                        {selectedProperty.hasLiveInSuper && (
                          <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 border-blue-500/30">Live-in Super</Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Description */}
                  {selectedProperty.description && (
                    <div className="mb-6">
                      <h3 className="text-base sm:text-lg font-semibold mb-3">Description</h3>
                      <p className="text-sm sm:text-base text-gray-300 leading-relaxed whitespace-pre-wrap">
                        {selectedProperty.description}
                      </p>
                    </div>
                  )}

                  {/* Required Documents */}
                  {selectedProperty.requiredDocuments && selectedProperty.requiredDocuments.length > 0 && (
                    <div>
                      <h3 className="text-base sm:text-lg font-semibold mb-3">Required Documents</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {selectedProperty.requiredDocuments.map((doc: string) => (
                          <div key={doc} className="flex items-center gap-2 p-2 bg-blue-500/20 rounded-lg">
                            <FileText className="h-4 w-4 text-blue-400 flex-shrink-0" />
                            <span className="text-xs sm:text-sm capitalize text-blue-400">
                              {doc.replace(/_/g, ' ')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}