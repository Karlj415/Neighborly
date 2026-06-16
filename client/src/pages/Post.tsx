import { useState, useEffect, lazy, Suspense } from 'react';
import { useLocation as useWouterLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

import SearchForm from "@/components/SearchForm";
import Header from "@/components/Header";
import AgentMessaging from "@/components/AgentMessaging";
import PropertyCard from "@/components/PropertyCard";
import PropertyShareModal from "@/components/PropertyShareModal";

// Lazy load the map component to avoid SSR issues
const PropertyMap = lazy(() => import("@/components/PropertyMap"));
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { PropertyListing } from "@shared/schema";
import { 
  MapPin, 
  Star, 
  Heart, 
  User, 
  MessageSquare, 
  MessageCircle,
  Send, 
  ChevronDown, 
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Plus,
  Building2,
  Users,
  Calendar,
  DollarSign,
  Home,
  Upload,
  X,
  Bed,
  Bath,
  Square,
  FileText,
  Camera,
  Edit,
  Trash2
} from "lucide-react";

interface CommunityPost {
  id: number;
  userId: string;
  title: string;
  content: string;
  zipCode: string;
  city?: string;
  state?: string;
  category: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  user?: {
    firstName: string;
    lastName: string;
    profileImageUrl: string;
  };
}

// PropertyListing type imported from schema

// Image Carousel Component for Property Listings
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
              className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-opacity"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={nextImage}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-opacity"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
        
        {/* Image counter */}
        {images.length > 1 && (
          <div className="absolute top-4 right-4 bg-black bg-opacity-60 text-white text-sm px-3 py-1 rounded-full">
            {currentImageIndex + 1} / {images.length}
          </div>
        )}
        
        {/* Thumbnail dots for navigation */}
        {images.length > 1 && images.length <= 8 && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
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

export default function Post() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [location] = useWouterLocation();
  
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    category: 'general'
  });
  const [temporaryListings, setTemporaryListings] = useState<PropertyListing[]>([]);

  // Clear temporary listings when component unmounts or navigating away
  useEffect(() => {
    return () => {
      setTemporaryListings([]);
    };
  }, []);

  // Property listing state
  const [isCreateListingOpen, setIsCreateListingOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("community");
  const [selectedProperty, setSelectedProperty] = useState<PropertyListing | null>(null);
  const [isPropertyDetailOpen, setIsPropertyDetailOpen] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [appliedProperties, setAppliedProperties] = useState<Set<number>>(new Set());
  const [showMessaging, setShowMessaging] = useState(false);
  const [messagingAnimating, setMessagingAnimating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingListing, setEditingListing] = useState<PropertyListing | null>(null);
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
    // Master Lease fields
    isMasterLease: false,
    maxTenants: 1,
    pricePerRoom: 0,
    // Amenities
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
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [addressInput, setAddressInput] = useState('');
  const [isCheckingAddress, setIsCheckingAddress] = useState(false);
  
  // Property sharing modal state
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareProperty, setShareProperty] = useState<any>(null);
  
  // Content moderation popup state
  const [showModerationModal, setShowModerationModal] = useState(false);
  const [moderationMessage, setModerationMessage] = useState('');

  // Map state for community properties
  const [mapCenter, setMapCenter] = useState<[number, number]>([40.7128, -74.0060]); // Default to NYC
  const [mapZoom, setMapZoom] = useState(12);

  // Document types available for requirements
  const documentTypes = [
    { value: 'w2', label: 'W2 Form' },
    { value: 'pay_stub', label: 'Pay Stub' },
    { value: 'bank_statement', label: 'Bank Statement' },
    { value: 'employment_letter', label: 'Employment Letter' },
    { value: 'id', label: 'ID/Driver\'s License' },
    { value: 'reference_letter', label: 'Reference Letter' }
  ];

  // Google Places autocomplete for addresses
  const fetchAddressSuggestions = async (input: string) => {
    if (input.length < 3) {
      setAddressSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      const response = await apiRequest('GET', `/api/google-places/autocomplete?input=${encodeURIComponent(input)}`);
      const data = await response.json();
      
      console.log('Google Places API suggestions:', data.predictions);
      
      if (data.predictions) {
        setAddressSuggestions(data.predictions);
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error('Error fetching address suggestions:', error);
    }
  };

  // Get place details and populate fields
  const selectAddress = async (placeId: string, description: string) => {
    try {
      const response = await apiRequest('GET', `/api/google-places/details?place_id=${placeId}`);
      const data = await response.json();
      
      if (data.result) {
        const addressComponents = data.result.address_components;
        let streetNumber = '';
        let route = '';
        let city = '';
        let state = '';
        let zipCode = '';

        addressComponents.forEach((component: any) => {
          const types = component.types;
          if (types.includes('street_number')) {
            streetNumber = component.long_name;
          } else if (types.includes('route')) {
            route = component.long_name;
          } else if (types.includes('locality')) {
            city = component.long_name;
          } else if (types.includes('administrative_area_level_1')) {
            state = component.short_name;
          } else if (types.includes('postal_code')) {
            zipCode = component.long_name;
          }
        });

        const fullAddress = `${streetNumber} ${route}`.trim();

        // Check for duplicate address before setting
        await checkDuplicateAddress(fullAddress, city, state, zipCode);

        setNewListing({
          ...newListing,
          address: fullAddress,
          city,
          state,
          zipCode
        });
        setAddressInput(fullAddress);
      }
    } catch (error) {
      console.error('Error getting place details:', error);
    }
    
    setShowSuggestions(false);
  };

  // Check if address already exists in database
  const checkDuplicateAddress = async (address: string, city: string, state: string, zipCode: string) => {
    if (!address || !city || !state || !zipCode) return;
    
    setIsCheckingAddress(true);
    try {
      const response = await apiRequest('POST', '/api/check-duplicate-address', {
        address,
        city,
        state,
        zipCode
      });
      
      const data = await response.json();
      
      if (data.exists) {
        toast({
          title: "Address Already Listed",
          description: `This property is already listed by ${data.listedBy}. Please choose a different address.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error checking duplicate address:', error);
    } finally {
      setIsCheckingAddress(false);
    }
  };

  // Property types
  const propertyTypes = [
    { value: 'apartment', label: 'Apartment' },
    { value: 'house', label: 'House' },
    { value: 'condo', label: 'Condo' },
    { value: 'townhouse', label: 'Townhouse' },
    { value: 'duplex', label: 'Duplex' },
    { value: 'studio', label: 'Studio' }
  ];

  // Get community posts
  const { data: communityPosts = [], isLoading: isLoadingPosts } = useQuery<CommunityPost[]>({
    queryKey: ['/api/posts'],
    enabled: !!user,
  });

  // Get property listings
  const { data: propertyListings = [], isLoading: isLoadingListings } = useQuery<PropertyListing[]>({
    queryKey: ['/api/property-listings'],
    enabled: !!user,
  });

  // Get user documents for application checking
  const { data: userDocuments = [] } = useQuery<any[]>({
    queryKey: ['/api/documents'],
    enabled: !!user,
  });

  // Get application status for properties using React Query for proper cache management
  const { data: applicationStatus = [] } = useQuery({
    queryKey: ['/api/applications/check', propertyListings.map((p: PropertyListing) => p.id)],
    queryFn: async () => {
      if (!isAuthenticated || propertyListings.length === 0) return [];
      const propertyIds = propertyListings.map((p: PropertyListing) => p.id);
      const response = await apiRequest('POST', '/api/applications/check', { propertyIds });
      return response.json();
    },
    enabled: isAuthenticated && propertyListings.length > 0,
  });

  // Update appliedProperties state when applicationStatus changes
  useEffect(() => {
    if (applicationStatus && applicationStatus.length > 0) {
      const appliedIds = applicationStatus
        .filter((item: { propertyId: number; hasApplied: boolean }) => item.hasApplied)
        .map((item: { propertyId: number; hasApplied: boolean }) => item.propertyId);
      setAppliedProperties(new Set([...appliedIds]));
    }
  }, [applicationStatus]);

  // Clear temporary listings when property listings are fetched
  useEffect(() => {
    if (propertyListings && propertyListings.length > 0) {
      setTemporaryListings([]);
    }
  }, [propertyListings]);

  // Auto-center map on property listings when they load
  useEffect(() => {
    const allProperties = [...(propertyListings || []), ...temporaryListings];
    
    if (allProperties.length > 0) {
      // Calculate bounds of all properties with valid coordinates
      const validProperties = allProperties.filter(p => p.latitude && p.longitude);
      
      if (validProperties.length > 0) {
        if (validProperties.length === 1) {
          // Single property - center on it
          const property = validProperties[0];
          setMapCenter([property.latitude, property.longitude]);
          setMapZoom(15);
        } else {
          // Multiple properties - calculate center and zoom to fit all
          const avgLat = validProperties.reduce((sum, p) => sum + p.latitude, 0) / validProperties.length;
          const avgLng = validProperties.reduce((sum, p) => sum + p.longitude, 0) / validProperties.length;
          
          setMapCenter([avgLat, avgLng]);
          
          // Calculate appropriate zoom based on property spread
          const latitudes = validProperties.map(p => p.latitude);
          const longitudes = validProperties.map(p => p.longitude);
          const latSpread = Math.max(...latitudes) - Math.min(...latitudes);
          const lngSpread = Math.max(...longitudes) - Math.min(...longitudes);
          const maxSpread = Math.max(latSpread, lngSpread);
          
          // Adjust zoom based on spread
          let zoom = 12;
          if (maxSpread < 0.01) zoom = 15;      // Very close properties
          else if (maxSpread < 0.05) zoom = 13;  // Neighborhood level
          else if (maxSpread < 0.1) zoom = 12;   // City area
          else if (maxSpread < 0.5) zoom = 10;   // City wide
          else zoom = 8;                         // Metropolitan area
          
          setMapZoom(zoom);
        }
      }
    } else if (user?.latitude && user?.longitude) {
      // No properties but user has location - center on user
      setMapCenter([user.latitude, user.longitude]);
      setMapZoom(12);
    }
  }, [propertyListings, temporaryListings, user?.latitude, user?.longitude]);

  // Check URL params to auto-open property listing form
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('openListing') === 'true') {
      setActiveTab("listings");
      setIsCreateListingOpen(true);
      // Clear the URL parameter without reloading
      const url = new URL(window.location.href);
      url.searchParams.delete('openListing');
      window.history.replaceState({}, '', url);
    }
  }, [location]);

  // Delete property listing mutation
  const deleteListingMutation = useMutation({
    mutationFn: async (listingId: number) => {
      await apiRequest("DELETE", `/api/property-listings/${listingId}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Property listing deleted successfully",
      });
      setIsPropertyDetailOpen(false);
      setSelectedProperty(null);
      setShowDeleteConfirm(false);
      queryClient.invalidateQueries({ queryKey: ['/api/property-listings'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete property listing",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsDeleting(false);
    }
  });

  // Create new post mutation
  const createPostMutation = useMutation({
    mutationFn: async (postData: {
      title?: string;
      content: string;
      category?: string;
    }) => {
      return apiRequest('POST', '/api/posts', postData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      resetPostForm();
      toast({
        title: "Success",
        description: "Your post has been created!",
      });
    },
    onError: (error: any) => {
      console.log('Post creation error:', error);
      // Check if this is a content moderation error
      if (error.message && (error.message.includes('inappropriate content') || error.message.includes('removed'))) {
        setModerationMessage("Your post has been removed for inappropriate content and has been taken down. Please review our community guidelines and try again with appropriate language.");
        setShowModerationModal(true);
        resetPostForm(); // Clear the form
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to create post. Please try again.",
          variant: "destructive",
        });
      }
    },
  });

  const handleCreatePost = () => {
    if (!newPost.content.trim()) {
      toast({
        title: "Error",
        description: "Please enter some content for your post.",
        variant: "destructive",
      });
      return;
    }

    let title = newPost.title.trim();
    if (!title) {
      // Generate title based on category if not provided
      switch (newPost.category) {
        case 'housing':
          title = 'Housing Post';
          break;
        case 'moving':
          title = 'Moving Post';
          break;
        case 'neighborhood':
          title = 'Neighborhood Update';
          break;
        case 'safety':
          title = 'Safety Notice';
          break;
        case 'recommendations':
          title = 'Recommendation';
          break;
        default:
          title = 'Community Post';
      }
    }

    const postData = {
      title,
      content: newPost.content,
      category: newPost.category
    };

    createPostMutation.mutate(postData);
  };

  const resetPostForm = () => {
    setNewPost({
      title: '',
      content: '',
      category: 'general'
    });
    setIsCreatePostOpen(false);
  };

  // Handle property listing click
  const handlePropertyClick = (property: PropertyListing) => {
    setSelectedProperty(property);
    setIsPropertyDetailOpen(true);
  };

  // Check if user has required documents
  const checkUserDocuments = (requiredDocs: string[]) => {
    const userDocTypes = userDocuments.map((doc: any) => doc.documentType);
    const missingDocs = requiredDocs.filter(docType => !userDocTypes.includes(docType));
    return { hasAllDocs: missingDocs.length === 0, missingDocs };
  };

  // Handle delete listing function
  const handleDeleteListing = (listingId: number) => {
    setSelectedProperty(propertyListings.find(p => p.id === listingId) || null);
    setShowDeleteConfirm(true);
  };

  // Apply to property mutation
  const applyToPropertyMutation = useMutation({
    mutationFn: async (propertyId: number) => {
      return apiRequest('POST', '/api/applications', { propertyId });
    },
    onSuccess: async (_, propertyId) => {
      // Award application points
      try {
        await apiRequest('POST', '/api/rewards/application');
      } catch (error) {
        console.error('Failed to award application points:', error);
      }
      
      // Add property to applied set
      setAppliedProperties(prev => new Set([...prev, propertyId]));
      
      toast({
        title: "Application Submitted!",
        description: "Your application has been submitted successfully. The landlord will review it soon. You earned 50 reward points!",
      });
      setIsPropertyDetailOpen(false);
      setIsApplying(false);
      
      // Refresh user data to show updated points
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    },
    onError: (error: any) => {
      setIsApplying(false);
      toast({
        title: "Application Failed",
        description: error.message || "Failed to submit application. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle sharing property
  const handleShareProperty = (listing: PropertyListing) => {
    setShareProperty(listing);
    setIsShareModalOpen(true);
  };

  const closeShareModal = () => {
    setIsShareModalOpen(false);
    setShareProperty(null);
  };

  // Create/Update property listing mutation
  const createListingMutation = useMutation({
    mutationFn: async (listingData: any) => {
      if (editingListing) {
        return apiRequest('PATCH', `/api/property-listings/${editingListing.id}`, listingData);
      } else {
        // If it's a master lease, create both property listing and master lease listing
        if (listingData.isMasterLease) {
          const propertyResponse = await apiRequest('POST', '/api/property-listings', listingData);
          const propertyData = await propertyResponse.json();
          
          // Create master lease listing with all required fields
          const masterLeaseData = {
            propertyAddress: listingData.address,
            city: listingData.city,
            state: listingData.state,
            zipCode: listingData.zipCode,
            propertyType: listingData.propertyType,
            bedrooms: listingData.bedrooms,
            bathrooms: listingData.bathrooms,
            squareFootage: listingData.squareFeet,
            maxTenants: listingData.maxTenants,
            pricePerRoom: listingData.pricePerRoom,
            totalRent: listingData.monthlyRent,
            securityDeposit: Math.round(listingData.monthlyRent), // Default to one month's rent
            availableDate: new Date().toISOString().split('T')[0], // Today's date
            leaseDurationMonths: listingData.leaseLengthMonths || 12,
            description: listingData.description,
            amenities: {},
            images: listingData.images || []
          };
          await apiRequest('POST', '/api/master-lease/listings', masterLeaseData);
          
          return propertyData;
        } else {
          return apiRequest('POST', '/api/property-listings', listingData);
        }
      }
    },
    onSuccess: (data: PropertyListing) => {
      queryClient.invalidateQueries({ queryKey: ['/api/property-listings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/property-listings/user'] });
      
      // Add new listing to temporary state for immediate visibility
      if (!editingListing) {
        setTemporaryListings(prev => [data, ...prev]);
      }
      
      resetListingForm();
      const listingType = newListing.isMasterLease ? "Master Lease" : "property listing";
      toast({
        title: "Success",
        description: editingListing ? `Your ${listingType} has been updated!` : `Your ${listingType} has been created!`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || `Failed to ${editingListing ? 'update' : 'create'} property listing. Please try again.`,
        variant: "destructive",
      });
    },
  });

  const handleCreateListing = () => {
    if (!newListing.address.trim() || !newListing.city.trim() || !newListing.state.trim() || !newListing.zipCode.trim() || !newListing.propertyType || !newListing.description.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields (address, city, state, zip code, property type, description).",
        variant: "destructive",
      });
      return;
    }

    // Check if we have images (either new files or existing images when editing)
    const totalImages = selectedFiles.length + (newListing.images?.length || 0);
    if (totalImages === 0) {
      toast({
        title: "Error",
        description: "Please upload at least 1 image for your property listing.",
        variant: "destructive",
      });
      return;
    }

    if (selectedFiles.length > 50) {
      toast({
        title: "Error",
        description: "Maximum 50 images allowed per listing.",
        variant: "destructive",
      });
      return;
    }

    if (newListing.monthlyRent < 1 || newListing.bedrooms < 0 || newListing.bathrooms < 0 || newListing.squareFeet < 1) {
      toast({
        title: "Error",
        description: "Please enter valid numbers for rent, bedrooms, bathrooms, and square feet.",
        variant: "destructive",
      });
      return;
    }

    // Convert files to base64 strings for storage (only if there are new files)
    const uploadImages = async () => {
      if (selectedFiles.length === 0) {
        return [];
      }
      
      const imagePromises = selectedFiles.map(file => {
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      });
      
      return await Promise.all(imagePromises);
    };

    uploadImages().then(newImages => {
      // Combine existing images with new ones when editing
      const allImages = editingListing 
        ? [...(newListing.images || []), ...newImages]
        : newImages;
        
      createListingMutation.mutate({
        address: newListing.address,
        city: newListing.city,
        state: newListing.state,
        zipCode: newListing.zipCode,
        propertyType: newListing.propertyType,
        bedrooms: newListing.bedrooms,
        bathrooms: newListing.bathrooms,
        squareFeet: newListing.squareFeet,
        monthlyRent: newListing.monthlyRent,
        description: newListing.description,
        images: allImages,
        requiredDocuments: newListing.requiredDocuments || [],
        isPetFriendly: newListing.isPetFriendly || false,
        leaseLengthMonths: newListing.leaseLengthMonths || 12,
        // Master Lease fields
        isMasterLease: newListing.isMasterLease || false,
        maxTenants: newListing.maxTenants || 1,
        pricePerRoom: newListing.pricePerRoom || 0,
        // Amenities
        hasWasherDryer: newListing.hasWasherDryer || false,
        hasElevator: newListing.hasElevator || false,
        hasOnsiteLaundry: newListing.hasOnsiteLaundry || false,
        hasHardwoodFloors: newListing.hasHardwoodFloors || false,
        hasParkingGarage: newListing.hasParkingGarage || false,
        hasSwimmingPool: newListing.hasSwimmingPool || false,
        allowsSubletting: newListing.allowsSubletting || false,
        isSmokeFree: newListing.isSmokeFree || false,
        hasGym: newListing.hasGym || false,
        hasLiveInSuper: newListing.hasLiveInSuper || false
      });
    }).catch(error => {
      toast({
        title: "Error",
        description: "Failed to process images. Please try again.",
        variant: "destructive",
      });
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length + selectedFiles.length > 50) {
      toast({
        title: "Error",
        description: "Maximum 50 images allowed per listing.",
        variant: "destructive",
      });
      return;
    }

    // Validate file types
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const invalidFiles = files.filter(file => !validTypes.includes(file.type));
    
    if (invalidFiles.length > 0) {
      toast({
        title: "Error",
        description: "Please upload only JPEG, PNG, or WebP images.",
        variant: "destructive",
      });
      return;
    }

    setSelectedFiles(prev => [...prev, ...files]);
  };

  const removeImage = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const resetListingForm = () => {
    setNewListing({
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
      images: [],
      requiredDocuments: [],
      isPetFriendly: false,
      leaseLengthMonths: 12,
      // Master Lease fields
      isMasterLease: false,
      maxTenants: 1,
      pricePerRoom: 0,
      // Amenities
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
    setSelectedFiles([]);
    setIsCreateListingOpen(false);
    setAddressInput('');
    setAddressSuggestions([]);
    setShowSuggestions(false);
    setEditingListing(null);
  };

  const handleDocumentToggle = (documentType: string, checked: boolean) => {
    setNewListing(prev => ({
      ...prev,
      requiredDocuments: checked 
        ? [...prev.requiredDocuments, documentType]
        : prev.requiredDocuments.filter(doc => doc !== documentType)
    }));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Handle property application
  const handleApplyToProperty = async (listing: PropertyListing) => {
    try {
      await apiRequest('POST', '/api/applications', {
        propertyId: listing.id,
        status: "submitted"
      });

      // Add property to applied set
      setAppliedProperties(prev => new Set([...Array.from(prev), listing.id]));

      toast({
        title: "Application Submitted",
        description: `Your application for ${listing.address} has been submitted successfully.`,
      });
    } catch (error) {
      console.error('Error submitting application:', error);
      toast({
        title: "Application Failed",
        description: "There was an error submitting your application. Please try again.",
        variant: "destructive",
      });
    }
  };



  return (
    <div className="min-h-screen bg-gray-900">
      <Header />
      
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="community" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Community Posts
              </TabsTrigger>
              <TabsTrigger value="listings" className="flex items-center gap-2">
                <Home className="h-4 w-4" />
                Property Listings
              </TabsTrigger>
            </TabsList>

            {/* Community Posts Tab */}
            <TabsContent value="community" className="space-y-6">
              {/* Animated Post Creation Card */}
              <Card 
                className={`bg-gray-800 border-gray-600 shadow-sm transition-all duration-300 ease-out ${
                  isCreatePostOpen 
                    ? 'shadow-lg scale-[1.02]' 
                    : 'hover:shadow-md cursor-pointer'
                }`}
                onClick={() => {
                  if (isCreatePostOpen) {
                    setIsCreatePostOpen(false);
                  } else {
                    setIsCreatePostOpen(true);
                  }
                }}
              >
                {/* Compact Post Prompt Bar */}
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 cursor-pointer">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-300 text-sm">Share with your community...</p>
                    </div>
                    {!isCreatePostOpen && <ChevronDown className="h-4 w-4 text-gray-400" />}
                    {isCreatePostOpen && <ChevronUp className="h-4 w-4 text-gray-400" />}
                  </div>
                </CardContent>

                {/* Expanded Post Creation - Animated */}
                <div 
                  className={`overflow-hidden transition-all duration-300 ease-out ${
                    isCreatePostOpen 
                      ? 'max-h-96 opacity-100' 
                      : 'max-h-0 opacity-0'
                  }`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <CardContent className="px-4 pb-4 pt-0">
                    <div className="space-y-4 border-t border-gray-600 pt-4">
                      <div>
                        <Input
                          placeholder="Post title (optional)"
                          value={newPost.title}
                          onChange={(e) => setNewPost({...newPost, title: e.target.value})}
                          className="h-8 text-sm"
                        />
                      </div>

                    <div>
                      <Textarea
                        placeholder="What's happening in your neighborhood?"
                        value={newPost.content}
                        onChange={(e) => setNewPost({...newPost, content: e.target.value})}
                        className="min-h-[80px] text-sm resize-none"
                        rows={3}
                      />
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="text-xs text-gray-400">
                        {newPost.content.length}/500 characters
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            resetPostForm();
                          }}
                          className="h-7 px-3 text-xs"
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCreatePost();
                          }}
                          disabled={createPostMutation.isPending || !newPost.content.trim()}
                          className="h-7 px-3 text-xs"
                        >
                          <Send className="h-3 w-3 mr-1" />
                          {createPostMutation.isPending ? 'Posting...' : 'Post'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </div>
            </Card>

            {/* Posts Feed */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Community Feed</h3>
                {user?.city && user?.state && (
                  <Badge variant="outline" className="text-xs border-gray-500 text-gray-300">
                    <MapPin className="h-3 w-3 mr-1" />
                    {user.city}, {user.state}
                  </Badge>
                )}
              </div>
              
              {user?.city && user?.state && (
                <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3 mb-4">
                  <p className="text-sm text-blue-400">
                    <strong>City-wide community:</strong> You're viewing posts from {user.city}, {user.state}. Connect with neighbors throughout your city.
                  </p>
                </div>
              )}
              
              {isLoadingPosts ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Card key={i} className="bg-gray-800 border-gray-600">
                      <CardContent className="p-4">
                        <div className="animate-pulse">
                          <div className="h-4 bg-gray-600 rounded w-1/4 mb-2"></div>
                          <div className="h-4 bg-gray-600 rounded w-3/4 mb-4"></div>
                          <div className="h-8 bg-gray-600 rounded"></div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : communityPosts.length === 0 ? (
                <Card className="bg-gray-800 border-gray-600">
                  <CardContent className="p-8 text-center">
                    <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-white mb-2">No posts yet</h3>
                    <p className="text-gray-300 mb-4">Be the first to share something with your community!</p>
                    <Button onClick={() => setIsCreatePostOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Post
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                communityPosts.map((post: CommunityPost) => (
                  <Card key={post.id} className="bg-gray-800 border-gray-600 hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        <div className="w-10 h-10 bg-blue-600/20 rounded-full flex items-center justify-center">
                          {post.user?.profileImageUrl ? (
                            <img 
                              src={post.user.profileImageUrl} 
                              alt="Profile" 
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <User className="h-5 w-5 text-blue-400" />
                          )}
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="font-medium text-white">
                              {post.user?.firstName} {post.user?.lastName}
                            </span>
                            <span className="text-xs text-gray-400">
                              {formatDate(post.createdAt)}
                            </span>
                          </div>
                          
                          <h4 className="font-medium text-white mb-2">{post.title}</h4>
                          
                          <p className="text-gray-300 mb-3 whitespace-pre-wrap">{post.content}</p>
                          
                          <div className="mb-3 flex gap-2">
                            {post.zipCode && (
                              <Badge variant="outline" className="text-xs border-gray-500 text-gray-300">
                                <MapPin className="h-3 w-3 mr-1" />
                                ZIP {post.zipCode}
                              </Badge>
                            )}
                            {post.city && post.state && (
                              <Badge variant="secondary" className="text-xs bg-gray-700 text-gray-300">
                                {post.city}, {post.state}
                              </Badge>
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-4 text-sm text-gray-400">
                            <Button variant="ghost" size="sm" className="h-8 px-2 text-gray-400 hover:text-white hover:bg-gray-700">
                              <Heart className="h-4 w-4 mr-1" />
                              Like
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 px-2 text-gray-400 hover:text-white hover:bg-gray-700">
                              <MessageSquare className="h-4 w-4 mr-1" />
                              Comment
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
            </TabsContent>

            {/* Property Listings Tab */}
            <TabsContent value="listings" className="space-y-6">
              {/* Map Container */}
              <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-600 overflow-hidden mb-6 relative z-10">
                <div className="h-64 relative">
                  <Suspense fallback={
                    <div className="h-full bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-3"></div>
                        <p className="text-gray-600">Loading property map...</p>
                      </div>
                    </div>
                  }>
                    <PropertyMap 
                      properties={[...propertyListings, ...temporaryListings].map(listing => ({
                        id: listing.id,
                        title: `${listing.bedrooms}BR/${listing.bathrooms}BA - $${listing.monthlyRent?.toLocaleString()}/mo`,
                        address: listing.address,
                        formattedAddress: `${listing.address}, ${listing.city}, ${listing.state} ${listing.zipCode}`,
                        latitude: listing.latitude || 0,
                        longitude: listing.longitude || 0,
                        rent: listing.monthlyRent,
                        rentEstimate: { rent: listing.monthlyRent },
                        bedrooms: listing.bedrooms,
                        bathrooms: listing.bathrooms,
                        squareFootage: listing.squareFeet,
                        propertyType: listing.propertyType
                      }))}
                      center={mapCenter}
                      zoom={mapZoom}
                      key={`listings-map-${mapCenter[0]}-${mapCenter[1]}-${mapZoom}`} // Force re-render when map state changes
                    />
                  </Suspense>
                  
                  {/* Map Header Overlay */}
                  <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/60 to-transparent p-4">
                    <div className="flex items-center justify-between text-white">
                      <div>
                        <h3 className="font-semibold text-lg">Property Listings Map</h3>
                        <p className="text-sm opacity-90">
                          {propertyListings.length + temporaryListings.length} listings in your area
                        </p>
                      </div>
                      <Badge className="bg-white/20 text-white border-white/30">
                        <MapPin className="h-3 w-3 mr-1" />
                        {user?.city && user?.state ? `${user.city}, ${user.state}` : 'Your Area'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
              {/* Create Property Listing Card */}
              <Card 
                className={`bg-gray-800 border-gray-600 shadow-sm transition-all duration-300 ease-out ${
                  isCreateListingOpen 
                    ? 'shadow-lg scale-[1.02]' 
                    : 'hover:shadow-md cursor-pointer'
                }`}
                onClick={() => {
                  if (isCreateListingOpen) {
                    setIsCreateListingOpen(false);
                  } else {
                    setIsCreateListingOpen(true);
                  }
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 cursor-pointer">
                    <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center">
                      <Home className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-300 text-sm">{editingListing ? 'Edit property listing...' : 'List a property for rent...'}</p>
                    </div>
                    {!isCreateListingOpen && <ChevronDown className="h-4 w-4 text-gray-400" />}
                    {isCreateListingOpen && <ChevronUp className="h-4 w-4 text-gray-400" />}
                  </div>
                </CardContent>

                {/* Expanded Property Listing Creation */}
                <div 
                  className={`transition-all duration-300 ease-out ${
                    isCreateListingOpen 
                      ? 'opacity-100' 
                      : 'max-h-0 opacity-0 overflow-hidden'
                  }`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <CardContent className="px-4 pb-4 pt-0">
                    <div className="space-y-4 border-t border-gray-600 pt-4">
                      {/* Property Address with Google Places Autocomplete */}
                      <div className="relative">
                        <Label htmlFor="address" className="text-sm font-medium text-white">Property Address *</Label>
                        <div className="relative">
                          <Input
                            id="address"
                            placeholder="Start typing an address..."
                            value={addressInput}
                            onChange={(e) => {
                              setAddressInput(e.target.value);
                              fetchAddressSuggestions(e.target.value);
                            }}
                            className="mt-1"
                          />
                          {isCheckingAddress && (
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                              <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full" />
                            </div>
                          )}
                        </div>
                        
                        {/* Address Suggestions Dropdown */}
                        {showSuggestions && addressSuggestions.length > 0 && (
                          <div className="absolute z-50 w-full mt-1 bg-gray-700 border border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                            {addressSuggestions.map((suggestion) => (
                              <div
                                key={suggestion.place_id}
                                className="px-4 py-2 hover:bg-gray-600 cursor-pointer text-sm"
                                onClick={() => selectAddress(suggestion.place_id, suggestion.description)}
                              >
                                <div className="font-medium text-white">{suggestion.structured_formatting?.main_text}</div>
                                <div className="text-gray-400 text-xs">{suggestion.structured_formatting?.secondary_text}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Address Fields (Auto-populated from autocomplete or manual entry) */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="city" className="text-sm font-medium text-white">City</Label>
                          <Input
                            id="city"
                            value={newListing.city}
                            onChange={(e) => setNewListing({...newListing, city: e.target.value})}
                            className="mt-1"
                            placeholder="Enter city or use autocomplete"
                          />
                        </div>
                        <div>
                          <Label htmlFor="state" className="text-sm font-medium text-white">State</Label>
                          <Input
                            id="state"
                            value={newListing.state}
                            onChange={(e) => setNewListing({...newListing, state: e.target.value})}
                            className="mt-1"
                            placeholder="Enter state or use autocomplete"
                          />
                        </div>
                        <div>
                          <Label htmlFor="zipCode" className="text-sm font-medium text-white">ZIP Code</Label>
                          <Input
                            id="zipCode"
                            value={newListing.zipCode}
                            onChange={(e) => setNewListing({...newListing, zipCode: e.target.value})}
                            className="mt-1"
                            placeholder="Enter ZIP code or use autocomplete"
                          />
                        </div>
                      </div>

                      {/* Property Images */}
                      <div>
                        <Label htmlFor="images" className="text-sm font-medium text-white">Property Images *</Label>
                        <p className="text-xs text-gray-400 mt-1">Upload 1-50 images (JPEG, PNG, WebP)</p>
                        <Input
                          id="images"
                          type="file"
                          multiple
                          accept="image/jpeg,image/jpg,image/png,image/webp"
                          onChange={handleImageUpload}
                          className="mt-2"
                        />
                        
                        {/* Existing Images (when editing) */}
                        {editingListing && newListing.images && newListing.images.length > 0 && (
                          <div className="mt-4">
                            <p className="text-sm font-medium mb-2 text-white">Current Images ({newListing.images.length})</p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              {newListing.images.map((imageUrl, index) => (
                                <div key={`existing-${index}`} className="relative group">
                                  <img
                                    src={imageUrl}
                                    alt={`Existing property ${index + 1}`}
                                    className="w-full h-20 object-cover rounded-lg border"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updatedImages = newListing.images.filter((_, i) => i !== index);
                                      setNewListing({...newListing, images: updatedImages});
                                    }}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                                  >
                                    ×
                                  </button>
                                  <div className="absolute bottom-1 left-1 bg-black bg-opacity-50 text-white text-xs px-1 rounded">
                                    {index + 1}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* New Image Preview Grid */}
                        {selectedFiles.length > 0 && (
                          <div className="mt-4">
                            <p className="text-sm font-medium mb-2 text-white">{editingListing ? 'New' : 'Selected'} Images ({selectedFiles.length}/50)</p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              {selectedFiles.map((file, index) => (
                                <div key={index} className="relative group">
                                  <img
                                    src={URL.createObjectURL(file)}
                                    alt={`Property ${index + 1}`}
                                    className="w-full h-20 object-cover rounded-lg border"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => removeImage(index)}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                                  >
                                    ×
                                  </button>
                                  <div className="absolute bottom-1 left-1 bg-black bg-opacity-50 text-white text-xs px-1 rounded">
                                    {(newListing.images?.length || 0) + index + 1}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Property Type */}
                      <div>
                        <Label htmlFor="propertyType" className="text-sm font-medium text-white">Property Type *</Label>
                        <Select value={newListing.propertyType} onValueChange={(value) => setNewListing({...newListing, propertyType: value})}>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select property type" />
                          </SelectTrigger>
                          <SelectContent>
                            {propertyTypes.map(type => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Property Details Row */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <Label htmlFor="bedrooms" className="text-sm font-medium text-white">Bedrooms</Label>
                          <Input
                            id="bedrooms"
                            type="number"
                            min="0"
                            value={newListing.bedrooms}
                            onChange={(e) => setNewListing({...newListing, bedrooms: parseInt(e.target.value) || 0})}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="bathrooms" className="text-sm font-medium text-white">Bathrooms</Label>
                          <Input
                            id="bathrooms"
                            type="number"
                            min="0"
                            step="0.5"
                            value={newListing.bathrooms}
                            onChange={(e) => setNewListing({...newListing, bathrooms: parseFloat(e.target.value) || 0})}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="squareFeet" className="text-sm font-medium text-white">Square Feet</Label>
                          <Input
                            id="squareFeet"
                            type="number"
                            min="1"
                            value={newListing.squareFeet || ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              const numValue = value === '' ? undefined : parseInt(value);
                              setNewListing({...newListing, squareFeet: numValue || undefined});
                            }}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="monthlyRent" className="text-sm font-medium text-white">Monthly Rent</Label>
                          <Input
                            id="monthlyRent"
                            type="number"
                            min="1"
                            value={newListing.monthlyRent}
                            onChange={(e) => setNewListing({...newListing, monthlyRent: parseInt(e.target.value) || 1000})}
                            className="mt-1"
                          />
                        </div>
                      </div>

                      {/* Description */}
                      <div>
                        <Label htmlFor="description" className="text-sm font-medium text-white">Description *</Label>
                        <Textarea
                          id="description"
                          placeholder="Describe the property, amenities, location highlights..."
                          value={newListing.description}
                          onChange={(e) => setNewListing({...newListing, description: e.target.value})}
                          className="mt-1 min-h-[100px] resize-none"
                          rows={4}
                        />
                      </div>

                      {/* Required Documents */}
                      <div>
                        <Label className="text-sm font-medium text-white">Required Documents</Label>
                        <div className="mt-2 grid grid-cols-2 gap-3">
                          {documentTypes.map(doc => (
                            <div key={doc.value} className="flex items-center space-x-2">
                              <Checkbox
                                id={doc.value}
                                checked={newListing.requiredDocuments.includes(doc.value)}
                                onCheckedChange={(checked) => handleDocumentToggle(doc.value, checked as boolean)}
                              />
                              <Label htmlFor={doc.value} className="text-sm cursor-pointer text-white">
                                {doc.label}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Pet Friendly and Lease Length */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="petFriendly"
                            checked={newListing.isPetFriendly}
                            onCheckedChange={(checked) => setNewListing({...newListing, isPetFriendly: checked as boolean})}
                          />
                          <Label htmlFor="petFriendly" className="text-sm cursor-pointer text-white">
                            Pet Friendly
                          </Label>
                        </div>
                        <div>
                          <Label htmlFor="leaseLengthMonths" className="text-sm font-medium text-white">Lease Length (months)</Label>
                          <Input
                            id="leaseLengthMonths"
                            type="number"
                            min="1"
                            max="60"
                            value={newListing.leaseLengthMonths}
                            onChange={(e) => setNewListing({...newListing, leaseLengthMonths: parseInt(e.target.value) || 12})}
                            className="mt-1"
                          />
                        </div>
                      </div>

                      {/* Master Lease Section */}
                      <div className="border-2 border-dashed border-blue-500/30 rounded-lg p-4 bg-blue-900/20">
                        <div className="space-y-4">
                          <div>
                            <Label className="text-sm font-medium text-left text-white">Listing Type</Label>
                            <Select
                              value={newListing.isMasterLease ? "master" : "standard"}
                              onValueChange={(value) => {
                                const isMaster = value === "master";
                                setNewListing({
                                  ...newListing, 
                                  isMasterLease: isMaster,
                                  maxTenants: isMaster ? Math.max(1, newListing.bedrooms) : 1,
                                  pricePerRoom: isMaster ? Math.round(newListing.monthlyRent / Math.max(1, newListing.bedrooms)) : 0
                                });
                              }}
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue placeholder="Select listing type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="standard" className="cursor-pointer">
                                  <div className="flex flex-col items-start text-left w-full">
                                    <span className="font-medium text-left">Standard Rental</span>
                                    <span className="text-xs text-gray-500 text-left">Traditional single-tenant lease</span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="master" className="cursor-pointer">
                                  <div className="flex flex-col items-start text-left w-full">
                                    <span className="font-medium text-left">Master Lease</span>
                                    <span className="text-xs text-gray-500 text-left">Rent individual rooms in your apartment</span>
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          {newListing.isMasterLease && (
                            <div className="space-y-4 pt-4 border-t border-gray-600">
                              <Alert>
                                <Home className="h-4 w-4" />
                                <AlertDescription>
                                  Master Lease allows you to rent out individual rooms in your apartment. Tenants can apply for specific rooms and share common areas like kitchen and living room. Each room gets its own lease with blockchain escrow protection.
                                </AlertDescription>
                              </Alert>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <Label htmlFor="maxTenants" className="text-sm font-medium text-white">Available Rooms</Label>
                                  <Input
                                    id="maxTenants"
                                    type="number"
                                    min="1"
                                    max={newListing.bedrooms}
                                    value={newListing.maxTenants}
                                    onChange={(e) => {
                                      const maxTenants = parseInt(e.target.value) || 1;
                                      setNewListing({
                                        ...newListing, 
                                        maxTenants,
                                        pricePerRoom: Math.round(newListing.monthlyRent / maxTenants)
                                      });
                                    }}
                                    className="mt-1"
                                    placeholder={`Max ${newListing.bedrooms} rooms`}
                                  />
                                  <div className="text-xs text-gray-400 mt-1">
                                    How many rooms are available for rent
                                  </div>
                                </div>
                                <div>
                                  <Label htmlFor="pricePerRoom" className="text-sm font-medium text-white">Price Per Room</Label>
                                  <Input
                                    id="pricePerRoom"
                                    type="number"
                                    min="1"
                                    value={newListing.pricePerRoom}
                                    onChange={(e) => setNewListing({...newListing, pricePerRoom: parseInt(e.target.value) || 0})}
                                    className="mt-1"
                                    placeholder="Monthly rent per room"
                                  />
                                  <div className="text-xs text-gray-400 mt-1">
                                    What each tenant pays monthly
                                  </div>
                                </div>
                              </div>
                              
                              <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3">
                                <div className="flex items-center text-green-400">
                                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                                  <span className="text-sm font-medium">Each room gets separate lease with blockchain escrow deposits</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Amenities Section */}
                      <div>
                        <Label className="text-sm font-medium mb-4 block text-white">Property Amenities</Label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="washerDryer"
                              checked={newListing.hasWasherDryer}
                              onCheckedChange={(checked) => setNewListing({...newListing, hasWasherDryer: checked as boolean})}
                            />
                            <Label htmlFor="washerDryer" className="text-sm cursor-pointer text-white">
                              Washer / Dryer
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="elevator"
                              checked={newListing.hasElevator}
                              onCheckedChange={(checked) => setNewListing({...newListing, hasElevator: checked as boolean})}
                            />
                            <Label htmlFor="elevator" className="text-sm cursor-pointer text-white">
                              Elevator in building
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="onsiteLaundry"
                              checked={newListing.hasOnsiteLaundry}
                              onCheckedChange={(checked) => setNewListing({...newListing, hasOnsiteLaundry: checked as boolean})}
                            />
                            <Label htmlFor="onsiteLaundry" className="text-sm cursor-pointer text-white">
                              On-site laundry
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="hardwoodFloors"
                              checked={newListing.hasHardwoodFloors}
                              onCheckedChange={(checked) => setNewListing({...newListing, hasHardwoodFloors: checked as boolean})}
                            />
                            <Label htmlFor="hardwoodFloors" className="text-sm cursor-pointer text-white">
                              Hardwood floors
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="parkingGarage"
                              checked={newListing.hasParkingGarage}
                              onCheckedChange={(checked) => setNewListing({...newListing, hasParkingGarage: checked as boolean})}
                            />
                            <Label htmlFor="parkingGarage" className="text-sm cursor-pointer text-white">
                              Parking garage / Valet
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="swimmingPool"
                              checked={newListing.hasSwimmingPool}
                              onCheckedChange={(checked) => setNewListing({...newListing, hasSwimmingPool: checked as boolean})}
                            />
                            <Label htmlFor="swimmingPool" className="text-sm cursor-pointer text-white">
                              Swimming pool
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="subletting"
                              checked={newListing.allowsSubletting}
                              onCheckedChange={(checked) => setNewListing({...newListing, allowsSubletting: checked as boolean})}
                            />
                            <Label htmlFor="subletting" className="text-sm cursor-pointer text-white">
                              Sub-letting allowed
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="smokeFree"
                              checked={newListing.isSmokeFree}
                              onCheckedChange={(checked) => setNewListing({...newListing, isSmokeFree: checked as boolean})}
                            />
                            <Label htmlFor="smokeFree" className="text-sm cursor-pointer text-white">
                              Smoke-Free
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="gym"
                              checked={newListing.hasGym}
                              onCheckedChange={(checked) => setNewListing({...newListing, hasGym: checked as boolean})}
                            />
                            <Label htmlFor="gym" className="text-sm cursor-pointer text-white">
                              Gym
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="liveInSuper"
                              checked={newListing.hasLiveInSuper}
                              onCheckedChange={(checked) => setNewListing({...newListing, hasLiveInSuper: checked as boolean})}
                            />
                            <Label htmlFor="liveInSuper" className="text-sm cursor-pointer text-white">
                              Live in super
                            </Label>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex justify-between items-center pt-4">
                        <div className="text-xs text-gray-400">
                          * Required fields
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              resetListingForm();
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCreateListing();
                            }}
                            disabled={createListingMutation.isPending}
                          >
                            <Home className="h-4 w-4 mr-2" />
                            {createListingMutation.isPending ? (editingListing ? 'Updating...' : 'Creating...') : (editingListing ? 'Update Listing' : 'Create Listing')}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </div>
              </Card>

              {/* Property Listings Feed */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Property Listings</h3>
                  {user?.city && user?.state && (
                    <Badge variant="outline" className="text-xs border-gray-500 text-gray-300">
                      <MapPin className="h-3 w-3 mr-1" />
                      {user.city}, {user.state}
                    </Badge>
                  )}
                </div>
                
                {isLoadingListings ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <Card key={i}>
                        <CardContent className="p-4">
                          <div className="animate-pulse">
                            <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                            <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                            <div className="h-20 bg-gray-200 rounded"></div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : propertyListings.length === 0 && temporaryListings.length === 0 ? (
                  <Card className="bilt-card border-white/10 bg-gray-800">
                    <CardContent className="p-8 text-center">
                      <Home className="h-12 w-12 text-white/40 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-white mb-2">No property listings yet</h3>
                      <p className="text-white/70 mb-4">Be the first to list a property in your area!</p>
                      <Button onClick={() => setIsCreateListingOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create First Listing
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  [...temporaryListings, ...propertyListings].map((listing: PropertyListing) => (
                    <PropertyCard
                      key={listing.id}
                      listing={listing}
                      user={user}
                      userDocuments={userDocuments}
                      appliedProperties={appliedProperties}
                      onApply={handleApplyToProperty}
                      onEdit={(listing) => {
                        setEditingListing(listing);
                        setAddressInput(listing.address || ''); // Set the address input field
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
                          hasLiveInSuper: listing.hasLiveInSuper || false,
                          images: listing.images || [],
                        });
                        setIsCreateListingOpen(true);
                      }}
                      onDelete={handleDeleteListing}
                      onShare={handleShareProperty}
                      onClick={handlePropertyClick}
                    />
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-[425px] bg-gray-800 border-gray-600">
          <DialogHeader>
            <DialogTitle className="text-white">Delete Property Listing</DialogTitle>
            <DialogDescription className="text-gray-300">
              Are you sure you want to delete this property listing? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => {
                if (selectedProperty) {
                  setIsDeleting(true);
                  deleteListingMutation.mutate(selectedProperty.id);
                }
              }}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Property Detail Modal */}
      <Dialog open={isPropertyDetailOpen} onOpenChange={(open) => {
        setIsPropertyDetailOpen(open);
        if (!open) {
          setShowMessaging(false);
          setMessagingAnimating(false);
        }
      }}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden p-0 bg-gray-800 border-gray-600 z-50">
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
                <div className="w-1/2 flex flex-col bg-gray-800">
                  {/* Header */}
                  <div className="p-6 border-b border-gray-600">
                    <div className="mb-2">
                      <h1 className="text-2xl font-bold text-white">{selectedProperty.address}</h1>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-gray-300">{selectedProperty.city}, {selectedProperty.state} {selectedProperty.zipCode}</p>
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
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-3xl font-bold text-green-600">
                          ${(selectedProperty.monthlyRent || 0).toLocaleString()}
                        </div>
                        <div className="text-gray-300">per month</div>
                      </div>
                      <Badge variant="secondary" className="text-sm px-3 py-1">
                        {selectedProperty.propertyType}
                      </Badge>
                    </div>

                    {/* Property Stats */}
                    <div className="grid grid-cols-3 gap-4 py-4 border-y border-gray-600">
                      <div className="text-center">
                        <div className="text-xl font-semibold text-white">{selectedProperty.bedrooms}</div>
                        <div className="text-sm text-gray-300 flex items-center justify-center">
                          <Bed className="h-4 w-4 mr-1" />
                          Bedrooms
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-semibold text-white">{selectedProperty.bathrooms}</div>
                        <div className="text-sm text-gray-300 flex items-center justify-center">
                          <Bath className="h-4 w-4 mr-1" />
                          Bathrooms
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-semibold text-white">{selectedProperty.squareFeet?.toLocaleString()}</div>
                        <div className="text-sm text-gray-300 flex items-center justify-center">
                          <Square className="h-4 w-4 mr-1" />
                          Sq Ft
                        </div>
                      </div>
                    </div>

                    {/* Property Features */}
                    <div className="grid grid-cols-2 gap-4 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="text-lg">🐕</div>
                        <div>
                          <div className="font-medium text-white">Pet Policy</div>
                          <div className="text-sm text-gray-300">
                            {selectedProperty.isPetFriendly ? 'Pet Friendly' : 'No Pets'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="text-lg">📅</div>
                        <div>
                          <div className="font-medium text-white">Lease Length</div>
                          <div className="text-sm text-gray-300">
                            {selectedProperty.leaseLengthMonths || 12} months
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Amenities */}
                    {(selectedProperty.hasWasherDryer || selectedProperty.hasElevator || selectedProperty.hasOnsiteLaundry || 
                      selectedProperty.hasHardwoodFloors || selectedProperty.hasParkingGarage || selectedProperty.hasSwimmingPool || 
                      selectedProperty.allowsSubletting || selectedProperty.isSmokeFree || selectedProperty.hasGym || 
                      selectedProperty.hasLiveInSuper) && (
                      <div>
                        <h3 className="text-lg font-semibold mb-3 text-white">Amenities</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {selectedProperty.hasWasherDryer && (
                            <div className="flex items-center space-x-2 text-sm text-gray-300">
                              <span className="text-lg">🧺</span>
                              <span>Washer / Dryer</span>
                            </div>
                          )}
                          {selectedProperty.hasElevator && (
                            <div className="flex items-center space-x-2 text-sm text-gray-300">
                              <span className="text-lg">🛗</span>
                              <span>Elevator</span>
                            </div>
                          )}
                          {selectedProperty.hasOnsiteLaundry && (
                            <div className="flex items-center space-x-2 text-sm text-gray-300">
                              <span className="text-lg">🧴</span>
                              <span>On-site laundry</span>
                            </div>
                          )}
                          {selectedProperty.hasHardwoodFloors && (
                            <div className="flex items-center space-x-2 text-sm text-gray-300">
                              <span className="text-lg">🪵</span>
                              <span>Hardwood floors</span>
                            </div>
                          )}
                          {selectedProperty.hasParkingGarage && (
                            <div className="flex items-center space-x-2 text-sm text-gray-300">
                              <span className="text-lg">🚗</span>
                              <span>Parking garage</span>
                            </div>
                          )}
                          {selectedProperty.hasSwimmingPool && (
                            <div className="flex items-center space-x-2 text-sm text-gray-300">
                              <span className="text-lg">🏊</span>
                              <span>Swimming pool</span>
                            </div>
                          )}
                          {selectedProperty.allowsSubletting && (
                            <div className="flex items-center space-x-2 text-sm text-gray-300">
                              <span className="text-lg">📋</span>
                              <span>Sub-letting allowed</span>
                            </div>
                          )}
                          {selectedProperty.isSmokeFree && (
                            <div className="flex items-center space-x-2 text-sm text-gray-300">
                              <span className="text-lg">🚭</span>
                              <span>Smoke-free</span>
                            </div>
                          )}
                          {selectedProperty.hasGym && (
                            <div className="flex items-center space-x-2 text-sm text-gray-300">
                              <span className="text-lg">💪</span>
                              <span>Gym</span>
                            </div>
                          )}
                          {selectedProperty.hasLiveInSuper && (
                            <div className="flex items-center space-x-2 text-sm text-gray-300">
                              <span className="text-lg">👨‍🔧</span>
                              <span>Live-in super</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Description */}
                    <div>
                      <h3 className="text-lg font-semibold mb-3 text-white">About this property</h3>
                      <p className="text-gray-300 leading-relaxed">{selectedProperty.description}</p>
                    </div>

                    {/* Show different content based on ownership */}
                    {user && selectedProperty.userId === String(user.id) ? (
                      // OWNER VIEW - Show owner-specific information
                      <>
                        {/* Listed by - Show for owner */}
                        <div>
                          <h3 className="text-lg font-semibold mb-3 text-white">Listed by</h3>
                          <div className="flex items-center space-x-3 p-3 bg-gray-700 rounded-lg">
                            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                              <User className="h-6 w-6 text-white" />
                            </div>
                            <div>
                              <div className="font-medium text-white">
                                {selectedProperty.user?.firstName} {selectedProperty.user?.lastName} (You)
                              </div>
                              <div className="text-sm text-gray-300">
                                Listed on {formatDate(selectedProperty.createdAt)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      // NON-OWNER VIEW - Show application-related information
                      <>
                        {/* Required Documents */}
                        {selectedProperty.requiredDocuments && selectedProperty.requiredDocuments.length > 0 && (
                          <div>
                            <h3 className="text-lg font-semibold mb-3 flex items-center text-white">
                              <FileText className="h-5 w-5 mr-2" />
                              Required Documents
                            </h3>
                            <div className="space-y-2">
                              {selectedProperty.requiredDocuments.map((doc, index) => {
                                const userHasDoc = userDocuments.some((userDoc: any) => userDoc.documentType === doc);
                                return (
                                  <div key={index} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                                    <span className="capitalize font-medium text-white">{doc.replace('_', ' ')}</span>
                                    {userHasDoc ? (
                                      <Badge className="bg-green-600 text-white border-green-500">
                                        ✓ Uploaded
                                      </Badge>
                                    ) : (
                                      <Badge variant="destructive">
                                        Missing
                                      </Badge>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Listed by */}
                        <div>
                          <h3 className="text-lg font-semibold mb-3 text-white">Listed by</h3>
                          <div className="flex items-center space-x-3 p-3 bg-gray-700 rounded-lg">
                            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                              <User className="h-6 w-6 text-white" />
                            </div>
                            <div>
                              <div className="font-medium text-white">
                                {selectedProperty.user?.firstName} {selectedProperty.user?.lastName}
                              </div>
                              <div className="text-sm text-gray-300">
                                Listed on {formatDate(selectedProperty.createdAt)}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Document Status Alert */}
                        {selectedProperty.requiredDocuments && selectedProperty.requiredDocuments.length > 0 && (
                          (() => {
                            const { hasAllDocs, missingDocs } = checkUserDocuments(selectedProperty.requiredDocuments);
                            if (!hasAllDocs) {
                              return (
                                <Alert className="border-red-600 bg-red-900/20">
                                  <AlertDescription className="text-red-300">
                                    <strong>Missing Documents:</strong> You need to upload {missingDocs.join(', ')} before applying.
                                  </AlertDescription>
                                </Alert>
                              );
                            }
                            return (
                              <Alert className="border-green-600 bg-green-900/20">
                                <AlertDescription className="text-green-300">
                                  ✓ You have all required documents and can apply to this property.
                                </AlertDescription>
                              </Alert>
                            );
                          })()
                        )}

                        {/* Apply Button */}
                        <div className="pt-4">
                          {(() => {
                            const hasApplied = appliedProperties.has(selectedProperty.id);
                            const { hasAllDocs } = selectedProperty.requiredDocuments && selectedProperty.requiredDocuments.length > 0 
                              ? checkUserDocuments(selectedProperty.requiredDocuments)
                              : { hasAllDocs: true };

                            if (hasApplied) {
                              return (
                                <Button 
                                  disabled 
                                  className="w-full bg-gray-600 text-gray-300 cursor-not-allowed"
                                >
                                  ✓ Applied
                                </Button>
                              );
                            }

                            if (!hasAllDocs) {
                              return (
                                <Button 
                                  disabled 
                                  className="w-full bg-gray-600 text-gray-300 cursor-not-allowed"
                                >
                                  Missing Required Documents
                                </Button>
                              );
                            }

                            return (
                              <Button 
                                onClick={() => {
                                  setIsApplying(true);
                                  applyToPropertyMutation.mutate(selectedProperty.id);
                                }}
                                disabled={isApplying}
                                className="w-full bg-green-600 hover:bg-green-700 text-white"
                              >
                                {isApplying ? 'Submitting...' : 'Apply to Property'}
                              </Button>
                            );
                          })()}
                        </div>

                      </>
                    )}
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
                        <p className="text-sm text-gray-600">{selectedProperty.user?.firstName ? `${selectedProperty.user.firstName} ${selectedProperty.user.lastName}` : "Property Agent"}</p>
                      </div>
                    </div>
                    
                    {/* Messaging Content */}
                    <div className="flex-1">
                      <AgentMessaging
                        propertyId={selectedProperty.id?.toString()}
                        propertyAddress={selectedProperty.address}
                        agentName={selectedProperty.user?.firstName ? `${selectedProperty.user.firstName} ${selectedProperty.user.lastName}` : "Property Agent"}
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

      {/* Content Moderation Error Modal */}
      <Dialog open={showModerationModal} onOpenChange={setShowModerationModal}>
        <DialogContent className="max-w-md mx-auto bg-gray-800 border-gray-600">
          <DialogHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-red-900/20 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="h-8 w-8 text-red-400" />
            </div>
            <DialogTitle className="text-xl font-semibold text-white text-center">
              Content Removed
            </DialogTitle>
            <DialogDescription className="text-gray-300 mt-3 leading-relaxed">
              {moderationMessage}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-6 flex justify-center">
            <Button 
              onClick={() => setShowModerationModal(false)}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              I Understand
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Property Share Modal */}
      <PropertyShareModal 
        isOpen={isShareModalOpen}
        onClose={closeShareModal}
        property={shareProperty}
        propertyType="listing"
      />
    </div>
  );
}