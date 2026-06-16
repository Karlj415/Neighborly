import { useState, useEffect, Suspense, lazy } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import SearchForm from "@/components/SearchForm";
import ModernPropertyCard from "@/components/ModernPropertyCard";
import PropertyCard from "@/components/PropertyCard";
import SimplePropertyCard from "@/components/SimplePropertyCard";
import ZillowPropertyCard from "@/components/ZillowPropertyCard";
import PropertyShareModal from "@/components/PropertyShareModal";
import Header from "@/components/Header";
import AgentMessaging from "@/components/AgentMessaging";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

import { 
  TrendingUp, 
  AlertCircle, 
  MapPin, 
  Star, 
  Heart, 
  User, 
  MessageSquare, 
  MessageCircle,
  Send, 
  ChevronDown, 
  ChevronUp,
  X,
  Camera,
  Bed,
  Bath,
  Square,
  FileText,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

// Lazy load the map component
const PropertyMap = lazy(() => import("@/components/PropertyMap"));

// Image Carousel Component for Property Details
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

interface Property {
  id: number;
  title: string;
  description: string;
  price: number;
  rent?: number;
  bedrooms: number;
  bathrooms: number;
  squareFootage: number;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  propertyType: string;
  imageUrl?: string;
  latitude?: number;
  longitude?: number;
  allowsPets?: boolean;
  features?: string[];
}

interface ZillowProperty {
  zpid: string;
  streetAddress: string;
  city: string;
  state: string;
  zipcode: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  livingArea: number;
  propertyType: string;
  homeStatus: string;
  zestimate: number;
  rentZestimate: number;
  latitude: number;
  longitude: number;
  photos: string[];
  description: string;
  yearBuilt: number;
  lotSize: number;
  pricePerSqft: number;
}

export default function Home() {
  const { user } = useAuth();
  const [searchResults, setSearchResults] = useState<ZillowProperty[]>([]);
  const [zillowResults, setZillowResults] = useState<ZillowProperty[]>([]);
  const [searchFilters, setSearchFilters] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalResults, setTotalResults] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [defaultProperties, setDefaultProperties] = useState<Property[]>([]);
  const [userLocation, setUserLocation] = useState<{ city?: string; state?: string; lat?: number; lng?: number } | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [mapCenter, setMapCenter] = useState<[number, number]>([32.7767, -96.7970]); // Dallas default
  const [mapZoom, setMapZoom] = useState(12);
  
  // Property detail modal state
  const [isPropertyDetailOpen, setIsPropertyDetailOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<ZillowProperty | null>(null);
  const [propertyImages, setPropertyImages] = useState<string[]>([]);
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const [showMessaging, setShowMessaging] = useState(false);
  const [messagingAnimating, setMessagingAnimating] = useState(false);

  // Property sharing modal state
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareProperty, setShareProperty] = useState<any>(null);
  const [sharePropertyType, setSharePropertyType] = useState<"zillow" | "listing">("zillow");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query for saved properties
  const { data: savedProperties = [] } = useQuery({
    queryKey: ['/api/saved-properties'],
    enabled: !!user,
  });

  // Helper function to check if a property is saved
  const isPropertySaved = (propertyId: string) => {
    return savedProperties.some((saved: any) => saved.propertyId === propertyId);
  };

  // Update user location in their profile
  const updateUserLocation = async (location: { city?: string; state?: string; lat?: number; lng?: number }) => {
    try {
      if (!user || !location.city || !location.state) return;
      
      // Get zipcode from coordinates if available
      let zipCode = null;
      if (location.lat && location.lng) {
        try {
          const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${location.lat}&longitude=${location.lng}&localityLanguage=en`);
          const geocodeData = await response.json();
          zipCode = geocodeData.postcode;
          console.log('Detected ZIP code:', zipCode);
        } catch (error) {
          console.log('Could not get zipcode from coordinates:', error);
        }
      }
      
      // Only update if we have valid data
      if (zipCode && zipCode !== '00000') {
        await apiRequest('PATCH', '/api/users/location', {
          city: location.city,
          state: location.state,
          zipCode: zipCode
        });
        
        console.log(`Updated user location: ${location.city}, ${location.state} (${zipCode})`);
        
        // Force refresh user data to get updated ZIP code
        queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      }
    } catch (error) {
      console.error('Failed to update user location:', error);
    }
  };

  const { data: properties = [], isLoading: propertiesLoading } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const { data: savedPropertiesData = [] } = useQuery({
    queryKey: ["/api/saved-properties"],
  });

  // Force location update for users with invalid ZIP codes
  useEffect(() => {
    if (user && (user.zipCode === '00000' || !user.zipCode)) {
      console.log('User has invalid ZIP code, forcing location detection...');
      // Trigger location detection immediately for users with bad ZIP codes
      setTimeout(() => {
        setIsLoadingLocation(true);
        getUserLocationForced();
      }, 1000);
    }
  }, [user]);

  // Get user's location and load default properties
  useEffect(() => {
    getUserLocationForced();
  }, []);

  const getUserLocationForced = async () => {
    try {
      // Try to get precise geolocation
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            
            // Reverse geocode to get city/state/ZIP
            try {
              const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
              const locationData = await response.json();
              
              const location = {
                city: locationData.city,
                state: locationData.principalSubdivision,
                lat: latitude,
                lng: longitude
              };
              
              setUserLocation(location);
              setIsLoadingLocation(false);
              
              // Update user's profile with detected location (especially ZIP code)
              await updateUserLocation(location);
              
              // Auto-search properties in user's location
              await performAutoSearch(location);
            } catch (error) {
              console.error('Error reverse geocoding:', error);
              setIsLoadingLocation(false);
            }
          },
          async (error) => {
            console.warn('Geolocation failed, falling back to IP location:', error);
            // Fallback to IP-based location
            try {
              const response = await fetch('https://ipapi.co/json/');
              const locationData = await response.json();
              
              const location = {
                city: locationData.city,
                state: locationData.region,
                lat: parseFloat(locationData.latitude),
                lng: parseFloat(locationData.longitude)
              };
              
              setUserLocation(location);
              setIsLoadingLocation(false);
              
              // Update user's profile with detected location
              await updateUserLocation(location);
              
              // Auto-search properties in user's location
              await performAutoSearch(location);
            } catch (ipError) {
              console.error('IP location failed:', ipError);
              setIsLoadingLocation(false);
            }
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000 // 5 minutes
          }
        );
      } else {
        console.warn('Geolocation not supported');
        setIsLoadingLocation(false);
      }
    } catch (error) {
      console.error('Error getting user location:', error);
      setIsLoadingLocation(false);
    }
  };

  // Load default properties based on user location
  const loadDefaultProperties = async (location: { city?: string; state?: string; lat?: number; lng?: number }) => {
    try {
      if (!location.city || !location.state) return;
      
      // Use same Zillow API endpoint with propertyExtendedSearch
      const searchParams = new URLSearchParams();
      searchParams.append('city', location.city);
      searchParams.append('state', location.state);
      searchParams.append('limit', '41');
      searchParams.append('homeStatus', 'FOR_RENT');
      
      const response = await apiRequest('GET', `/api/zillow/search?${searchParams.toString()}`);
      const data = await response.json();
      
      if (data.properties && Array.isArray(data.properties)) {
        // Convert Zillow properties to our Property format for consistency
        const convertedProperties = data.properties.map((prop: ZillowProperty) => ({
          id: parseInt(prop.zpid) || Math.random() * 1000000,
          title: prop.streetAddress,
          description: `${prop.propertyType} in ${prop.city}, ${prop.state}`,
          price: prop.rentZestimate || prop.price || 0,
          rent: prop.rentZestimate || prop.price || 0,
          bedrooms: prop.bedrooms || 0,
          bathrooms: prop.bathrooms || 0,
          squareFootage: prop.livingArea || 0,
          address: prop.streetAddress,
          city: prop.city,
          state: prop.state,
          zipCode: prop.zipcode,
          propertyType: prop.propertyType,
          latitude: prop.latitude,
          longitude: prop.longitude,
          imageUrl: prop.photos && prop.photos.length > 0 ? prop.photos[0] : undefined,
          allowsPets: false,
          features: []
        }));
        
        setDefaultProperties(convertedProperties);
      }
    } catch (error) {
      console.error('Default property loading failed:', error);
    }
  };

  // Auto-search properties based on user location
  const performAutoSearch = async (location: { city?: string; state?: string; lat?: number; lng?: number }) => {
    try {
      if (!location.city && !location.state) return;
      
      setIsSearching(true);
      
      // Create search parameters using the user's location
      const searchParams = new URLSearchParams();
      if (location.city && location.state) {
        searchParams.append('city', location.city);
        searchParams.append('state', location.state);
      }
      searchParams.append('limit', '20'); // Use pagination of 20 properties per page
      searchParams.append('page', '1');
      searchParams.append('homeStatus', 'FOR_RENT');
      
      // Store search filters for infinite scrolling
      setSearchFilters({
        city: location.city,
        state: location.state,
        homeStatus: 'FOR_RENT'
      });
      
      console.log(`Auto-searching properties in ${location.city}, ${location.state}`);
      
      const response = await apiRequest("GET", `/api/zillow/search?${searchParams.toString()}`);
      const data = await response.json();
      
      console.log('Auto-search results:', data);
      
      // Use the same handler as manual searches
      await handleSearchComplete(data);
      
      // Show toast notification about auto-search
      const propertyCount = Array.isArray(data.properties) ? data.properties.length : 0;
      const totalCount = data.totalResultCount || propertyCount;
      toast({
        title: "Properties Found Near You",
        description: `Found ${propertyCount} of ${totalCount} rental properties in ${location.city}, ${location.state}`,
      });
      
    } catch (error) {
      console.error('Auto-search failed:', error);
      setIsSearching(false);
      
      // Still load default properties as fallback
      await loadDefaultProperties(location);
    }
  };

  const handleSearchComplete = async (data: any, searchLocation?: { lat: number; lng: number }, isLoadMore = false) => {
    console.log('handleSearchComplete called with:', data, 'isLoadMore:', isLoadMore);
    setIsSearching(false);
    setIsLoadingMore(false);
    
    if (!data || !data.properties) {
      console.log('No Zillow data received');
      if (!isLoadMore) {
        setZillowResults([]);
        setCurrentPage(1);
        setTotalPages(0);
        setTotalResults(0);
      }
      return;
    }
    
    // Handle Zillow response structure - the API returns { properties: [...] }
    if (data && data.properties && Array.isArray(data.properties)) {
      console.log('Setting Zillow results:', data.properties.length, 'properties');
      
      // Update pagination data
      setCurrentPage(data.currentPage || 1);
      setTotalPages(data.totalPages || 0);
      setTotalResults(data.totalResultCount || 0);
      
      if (isLoadMore) {
        // Append new properties to existing results
        setZillowResults(prev => [...prev, ...data.properties]);
      } else {
        // Replace results for new search
        setZillowResults(data.properties);
        
        // Auto-center map on search results or provided location
        if (searchLocation?.lat && searchLocation?.lng) {
          console.log('Centering map on search location:', searchLocation);
          setMapCenter([searchLocation.lat, searchLocation.lng]);
          setMapZoom(13);
        } else if (data.properties.length > 0) {
          // Calculate center from first few properties if no explicit location provided
          const validProperties = data.properties.filter((p: ZillowProperty) => p.latitude && p.longitude);
          if (validProperties.length > 0) {
            const avgLat = validProperties.slice(0, 5).reduce((sum: number, p: ZillowProperty) => sum + p.latitude, 0) / Math.min(validProperties.length, 5);
            const avgLng = validProperties.slice(0, 5).reduce((sum: number, p: ZillowProperty) => sum + p.longitude, 0) / Math.min(validProperties.length, 5);
            console.log('Centering map on property results:', avgLat, avgLng);
            setMapCenter([avgLat, avgLng]);
            setMapZoom(12);
          }
        }
      }
    } else {
      console.log('Invalid Zillow data structure:', data);
      if (!isLoadMore) {
        setZillowResults([]);
        setCurrentPage(1);
        setTotalPages(0);
        setTotalResults(0);
      }
    }
  };

  const handleSaveProperty = async (propertyId: number | string) => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in to save properties.",
        variant: "destructive",
      });
      return;
    }

    const propertyIdStr = propertyId.toString();
    const isSaved = isPropertySaved(propertyIdStr);

    try {
      if (isSaved) {
        // Unsave the property
        await apiRequest('DELETE', `/api/saved-properties/${propertyIdStr}`);
        toast({
          title: "Property Removed",
          description: "Property has been removed from your saved list.",
        });
      } else {
        // Find the property data from current results
        const propertyData = zillowResults.find(p => p.zpid === propertyIdStr);
        
        // Save the property with full data
        await apiRequest('POST', '/api/saved-properties', { 
          propertyId: propertyIdStr,
          propertyData: propertyData
        });
        toast({
          title: "Property Saved",
          description: "Property has been added to your saved list.",
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/saved-properties'] });
    } catch (error) {
      toast({
        title: "Error",
        description: isSaved ? "Failed to remove property. Please try again." : "Failed to save property. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleViewProperty = (propertyId: number | string) => {
    window.location.href = `/property/${propertyId}`;
  };

  // Property sharing handlers
  const handleShareZillowProperty = (property: ZillowProperty) => {
    setShareProperty(property);
    setSharePropertyType("zillow");
    setIsShareModalOpen(true);
  };

  const handleShareListingProperty = (listing: any) => {
    setShareProperty(listing);
    setSharePropertyType("listing");
    setIsShareModalOpen(true);
  };

  const closeShareModal = () => {
    setIsShareModalOpen(false);
    setShareProperty(null);
  };

  // Load more properties for infinite scrolling
  const loadMoreProperties = async () => {
    if (isLoadingMore || currentPage >= totalPages || !searchFilters) return;
    
    setIsLoadingMore(true);
    const nextPage = currentPage + 1;
    
    try {
      // Recreate the search parameters with the next page
      const searchParams = new URLSearchParams();
      
      // Add all existing search filters
      Object.keys(searchFilters).forEach(key => {
        if (searchFilters[key] && searchFilters[key] !== 'any') {
          searchParams.append(key, searchFilters[key]);
        }
      });
      
      // Add page parameter
      searchParams.append('page', nextPage.toString());
      searchParams.append('limit', '20'); // Changed to 20 properties per page
      
      console.log(`Loading more properties - page ${nextPage}/${totalPages}`);
      
      const response = await apiRequest("GET", `/api/zillow/search?${searchParams.toString()}`);
      const data = await response.json();
      
      console.log(`Loaded page ${nextPage}:`, data);
      
      // Use handleSearchComplete with isLoadMore flag
      await handleSearchComplete(data, undefined, true);
      
    } catch (error) {
      console.error('Failed to load more properties:', error);
      setIsLoadingMore(false);
      toast({
        title: "Error",
        description: "Failed to load more properties. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Scroll detection for infinite scrolling
  useEffect(() => {
    const propertiesContainer = document.querySelector('.properties-scroll-container');
    if (!propertiesContainer) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = propertiesContainer;
      const isNearBottom = scrollTop + clientHeight >= scrollHeight - 200; // Trigger 200px before bottom
      
      if (isNearBottom && !isLoadingMore && currentPage < totalPages && zillowResults.length > 0) {
        loadMoreProperties();
      }
    };

    propertiesContainer.addEventListener('scroll', handleScroll);
    return () => propertiesContainer.removeEventListener('scroll', handleScroll);
  }, [isLoadingMore, currentPage, totalPages, zillowResults.length, searchFilters]);

  // Property Image Carousel Component
  const PropertyImageCarousel = ({ images }: { images: string[] }) => {
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
  };

  // Format property type helper
  const formatPropertyType = (type: string) => {
    const formatted = type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
    return `${formatted} home`;
  };

  // Handle property click to show details
  const handlePropertyClick = async (property: ZillowProperty) => {
    // Extract city and state from address if not directly available
    let propertyWithLocation = { ...property };
    
    console.log('Original property data:', property);
    
    // If city/state are empty, try to extract from address
    if ((!property.city || !property.state) && property.streetAddress) {
      const addressParts = property.streetAddress.split(',');
      console.log('Address parts:', addressParts);
      if (addressParts.length >= 3) {
        // Format: "Street, City, State ZIP"
        propertyWithLocation.city = addressParts[1]?.trim() || '';
        const stateZip = addressParts[2]?.trim().split(' ');
        propertyWithLocation.state = stateZip[0] || '';
        console.log('Extracted city:', propertyWithLocation.city, 'state:', propertyWithLocation.state);
      }
    }
    
    console.log('Final property with location:', propertyWithLocation);
    setSelectedProperty(propertyWithLocation);
    setIsLoadingImages(true);
    
    try {
      // Load property images
      const response = await apiRequest('GET', `/api/zillow/images/${property.zpid}`);
      const data = await response.json();
      setPropertyImages(data.images || []);
    } catch (error) {
      console.error('Failed to load property images:', error);
      setPropertyImages([]);
    } finally {
      setIsLoadingImages(false);
    }
    
    setIsPropertyDetailOpen(true);
  };

  // Format date helper
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      <Header />
      

      
      {/* Compact Search Bar */}
      <section className="glass-card border-b border-white/10 py-4 flex-shrink-0 relative z-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <SearchForm 
              onSearchComplete={(data, searchLocation) => {
                // Extract filters from the search for infinite scrolling
                const filters: any = {};
                
                // Try to extract location info from data if available
                if (data?.city && data?.state) {
                  filters.city = data.city;
                  filters.state = data.state;
                } else if (searchLocation) {
                  // If we have coordinates, we'll need to reverse geocode or use the search location
                  filters.searchLocation = searchLocation;
                }
                
                // Store the basic search filters for pagination
                setSearchFilters(filters);
                
                // Call the main search handler
                handleSearchComplete(data, searchLocation);
              }}
              setIsSearching={setIsSearching}
            />
          </div>
        </div>
      </section>

      {/* Split Layout: Properties & Map (hide map on mobile) */}
      <div className="flex flex-1 overflow-hidden">
        {/* Properties List */}
        <div className="w-full md:w-1/2 overflow-y-auto bg-gray-900 properties-scroll-container">
          <div className="p-4">
            {/* Properties Header */}
            <>
              {/* Search Results Header */}
              {zillowResults.length > 0 && (
                <div className="mb-4 pb-4 border-b border-gray-600">
                  <h3 className="text-lg font-semibold text-white mb-1">
                    Search Results
                  </h3>
                  <p className="text-sm text-gray-300">
                    Showing {zillowResults.length} of {totalResults} properties
                    {searchFilters?.city && searchFilters?.state && ` in ${searchFilters.city}, ${searchFilters.state}`}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className="bg-blue-600 text-white">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      Live Property Data
                    </Badge>
                    {currentPage < totalPages && (
                      <Badge variant="outline" className="text-xs">
                        Page {currentPage} of {totalPages}
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Default Properties Header */}
              {zillowResults.length === 0 && (
                <div className="mb-4 pb-4 border-b border-gray-600">
                  <h3 className="text-lg font-semibold text-white mb-1">
                    {userLocation?.city && userLocation?.state 
                      ? `Properties Near You in ${userLocation.city}, ${userLocation.state}`
                      : userLocation?.city 
                      ? `Properties Near You in ${userLocation.city}`
                      : "Properties For You"
                    }
                  </h3>
                  <p className="text-sm text-gray-300">
                    {isLoadingLocation 
                      ? "Finding properties in your area..." 
                      : `${defaultProperties.length} properties found near your location`
                    }
                  </p>
                </div>
              )}
            </>

            {isSearching && (
              <div className="text-center py-8">
                <div className="animate-spin w-6 h-6 border-4 border-blue-400 border-t-transparent rounded-full mx-auto mb-3"></div>
                <p className="text-gray-300">Searching properties...</p>
              </div>
            )}



            {/* Display API Error if present */}
            {searchError && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start">
                  <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 mr-2 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-medium text-amber-800">Search Error</h4>
                    <p className="text-sm text-amber-700 mt-1">{searchError}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Zillow Search Results */}
            {!isSearching && zillowResults.length > 0 && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {zillowResults.map((property) => (
                    <ZillowPropertyCard
                      key={property.zpid}
                      property={property}
                      isSaved={isPropertySaved(property.zpid)}
                      onSave={() => handleSaveProperty(property.zpid)}
                      onShare={() => handleShareZillowProperty(property)}
                      onClick={() => handlePropertyClick(property)}
                    />
                  ))}
                </div>
                
                {/* Load More Indicator */}
                {isLoadingMore && (
                  <div className="text-center py-6">
                    <div className="animate-spin w-6 h-6 border-4 border-blue-400 border-t-transparent rounded-full mx-auto mb-3"></div>
                    <p className="text-gray-300">Loading more properties...</p>
                  </div>
                )}
                
                {/* End of Results Indicator */}
                {currentPage >= totalPages && zillowResults.length > 0 && (
                  <div className="text-center py-6 border-t border-gray-600">
                    <p className="text-gray-400">You've seen all {totalResults} properties</p>
                  </div>
                )}
              </>
            )}

            {/* Default Properties */}
            {zillowResults.length === 0 && 
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {defaultProperties.map((property) => (
                  <SimplePropertyCard
                    key={property.id} 
                    property={property}
                    onSave={() => handleSaveProperty(property.id)}
                    onClick={() => {
                      // Convert default property to ZillowProperty format for modal
                      const zillowProperty: ZillowProperty = {
                        zpid: property.id.toString(),
                        streetAddress: property.address,
                        city: property.city,
                        state: property.state,
                        zipcode: property.zipCode,
                        price: property.price || property.rent || 0,
                        bedrooms: property.bedrooms,
                        bathrooms: property.bathrooms,
                        livingArea: property.squareFootage,
                        propertyType: property.propertyType,
                        homeStatus: 'FOR_RENT',
                        zestimate: property.price || property.rent || 0,
                        rentZestimate: property.rent || property.price || 0,
                        latitude: property.latitude || 0,
                        longitude: property.longitude || 0,
                        photos: property.imageUrl ? [property.imageUrl] : [],
                        description: property.description,
                        yearBuilt: 0,
                        lotSize: 0,
                        pricePerSqft: 0
                      };
                      handlePropertyClick(zillowProperty);
                    }}
                  />
                ))}
              </div>
            }

            {/* Empty state for Properties view */}
            {(!searchResults.length && !zillowResults.length && !defaultProperties.length && !isSearching && !isLoadingLocation) && (
              <div className="text-center py-12">
                <p className="text-gray-400">No properties found. Try adjusting your search criteria.</p>
              </div>
            )}
          </div>
        </div>

        {/* Map View - Right Side (hidden on mobile) */}
        <div className="hidden md:block md:w-1/2 relative bg-gray-100">
          <div className="h-screen sticky top-0 p-4">
            <div className="h-full rounded-lg overflow-hidden">
              <Suspense fallback={
                <div className="h-full bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-3"></div>
                    <p className="text-gray-600">Loading map...</p>
                  </div>
                </div>
              }>
                <PropertyMap 
                  properties={[
                    ...defaultProperties,
                    ...searchResults,
                    ...zillowResults
                  ]}
                  center={mapCenter}
                  zoom={mapZoom}
                  key={`${mapCenter[0]}-${mapCenter[1]}-${mapZoom}`} // Force re-render when center changes
                />
              </Suspense>
            </div>
          </div>
        </div>
      </div>

      {/* Property Detail Modal */}
      <Dialog open={isPropertyDetailOpen} onOpenChange={(open) => {
        setIsPropertyDetailOpen(open);
        if (!open) {
          setShowMessaging(false);
          setMessagingAnimating(false);
        }
      }}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden p-0 bg-gray-800 border-gray-600" aria-describedby="property-details">
          <div className="sr-only" id="property-details">Property details modal</div>
          {selectedProperty && (
            <div className="flex h-[85vh] relative overflow-hidden">
              {/* Property Details Panel */}
              <div className={`flex transition-transform duration-300 ease-in-out ${messagingAnimating ? '-translate-x-full' : 'translate-x-0'}`}>
                {/* Left Side - Image */}
              <div className="w-1/2 bg-gray-100">
                {isLoadingImages ? (
                  <div className="h-full flex items-center justify-center bg-gray-200">
                    <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
                  </div>
                ) : propertyImages && propertyImages.length > 0 ? (
                  <div className="relative h-full">
                    <PropertyImageCarousel images={propertyImages} />
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
                    <h1 className="text-2xl font-bold text-white">
                      {formatPropertyType(selectedProperty.propertyType)} in {selectedProperty.city}, {selectedProperty.state}
                    </h1>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-gray-300">{selectedProperty.streetAddress}</p>
                    {/* Contact Agent Button - Next to address for Zillow properties */}
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
                  </div>
                </div>

                {/* Content - Scrollable */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-800">
                  {/* Price */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-3xl font-bold text-green-400">
                        ${(selectedProperty.rentZestimate || selectedProperty.price).toLocaleString()}
                      </div>
                      <div className="text-gray-300">per month</div>
                    </div>
                    <Badge variant="secondary" className="text-sm px-3 py-1 bg-gray-700 text-gray-300">
                      {formatPropertyType(selectedProperty.propertyType)}
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
                      <div className="text-xl font-semibold text-white">{selectedProperty.livingArea?.toLocaleString()}</div>
                      <div className="text-sm text-gray-300 flex items-center justify-center">
                        <Square className="h-4 w-4 mr-1" />
                        Sq Ft
                      </div>
                    </div>
                  </div>
                </div>


              </div>
              </div>

              {/* Messaging Panel */}
              {showMessaging && (
                <div className={`w-full absolute left-0 top-0 h-full bg-gray-800 transition-transform duration-300 ease-in-out z-10 ${
                  messagingAnimating ? 'translate-x-0' : 'translate-x-full'
                }`}>
                  <div className="h-full flex flex-col">
                    {/* Header with Back Button */}
                    <div className="flex flex-col p-4 border-b border-gray-600 bg-gray-800">
                      <Button 
                        variant="ghost" 
                        onClick={() => {
                          setMessagingAnimating(false);
                          setTimeout(() => setShowMessaging(false), 250);
                        }}
                        className="self-start mb-2 p-2 text-gray-300 hover:bg-gray-700"
                      >
                        <ChevronLeft className="h-5 w-5 mr-1" />
                        Back
                      </Button>
                      <div>
                        <h2 className="text-lg font-semibold text-white">Message Agent</h2>
                        <p className="text-sm text-gray-300">Property Agent</p>
                      </div>
                    </div>
                    
                    {/* Messaging Content */}
                    <div className="flex-1">
                      <AgentMessaging
                        zpid={selectedProperty.zpid}
                        propertyAddress={selectedProperty.streetAddress || `${selectedProperty.city}, ${selectedProperty.state}`}
                        agentName="Property Agent"
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

      {/* Property Share Modal */}
      <PropertyShareModal
        isOpen={isShareModalOpen}
        onClose={closeShareModal}
        property={shareProperty}
        propertyType={sharePropertyType}
      />
    </div>
  );
}