import { useState, useEffect, lazy, Suspense } from "react";
import Header from "@/components/Header";
import SearchForm from "@/components/SearchForm";
import PropertyCard from "@/components/PropertyCard";
// Property card imports removed - rebuilding from scratch
import ModernPropertyCard from "@/components/ModernPropertyCard";
import { PropertyFeed } from "@/components/PropertyFeed";
import MobileNavigation from "@/components/MobileNavigation";

// Lazy load the map component to avoid SSR issues
const PropertyMap = lazy(() => import("@/components/PropertyMap"));
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, TrendingUp, Heart, AlertCircle, MapPin, Bed, Bath, Square, CheckCircle, MessageCircle, Plus, Send, User, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import type { Property } from "@shared/schema";


// RentCastProperty interface now imported from component

interface Post {
  id: number;
  userId: string;
  title: string;
  content: string;
  zipCode: string;
  city: string;
  state: string;
  category: string;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export default function Home() {
  const { user } = useAuth();
  const [searchResults, setSearchResults] = useState<Property[]>([]);
  const [rentCastResults, setRentCastResults] = useState<RentCastProperty[]>([]);
  const [searchFilters, setSearchFilters] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isUsingRealData, setIsUsingRealData] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [defaultProperties, setDefaultProperties] = useState<Property[]>([]);
  const [userLocation, setUserLocation] = useState<{ city?: string; state?: string; lat?: number; lng?: number } | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const activeView = 'properties'; // Fixed to properties view only
  // const [activeView, setActiveView] = useState<'properties' | 'explore'>('properties'); // Removed explore view for now
  const [exploreProperties, setExploreProperties] = useState<Property[]>([]);
  
  // Community posts state
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [messageText, setMessageText] = useState('');
  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    category: 'general'
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: properties = [], isLoading: propertiesLoading } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const { data: savedPropertiesData = [] } = useQuery({
    queryKey: ["/api/saved-properties"],
  });

  // Community posts queries - Commented out for now
  // const { data: posts = [], isLoading: postsLoading, error: postsError } = useQuery({
  //   queryKey: ['/api/posts'],
  //   retry: false,
  //   enabled: activeView === 'explore',
  // });

  // Create new post mutation - Commented out for now
  // const createPostMutation = useMutation({
  //   mutationFn: async (postData: typeof newPost) => {
  //     const response = await apiRequest('POST', '/api/posts', postData);
  //     return response.json();
  //   },
  //   onSuccess: () => {
  //     queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
  //     setIsCreatePostOpen(false);
  //     setNewPost({ title: '', content: '', category: 'general' });
  //     toast({
  //       title: "Post created",
  //       description: "Your post has been shared with your community.",
  //     });
  //   },
  //   onError: (error: any) => {
  //     toast({
  //       title: "Error creating post",
  //       description: error.message || "Failed to create post",
  //       variant: "destructive",
  //     });
  //   }
  // });

  // Send direct message mutation - Commented out for now
  // const sendMessageMutation = useMutation({
  //   mutationFn: async ({ receiverId, content }: { receiverId: string; content: string }) => {
  //     const response = await apiRequest('POST', '/api/messages', {
  //       receiverId,
  //       content,
  //       messageType: 'text'
  //     });
  //     return response.json();
  //   },
  //   onSuccess: () => {
  //     setMessageText('');
  //     setSelectedPost(null);
  //     toast({
  //       title: "Message sent",
  //       description: "Your message has been sent successfully.",
  //     });
  //   },
  //   onError: (error: any) => {
  //     toast({
  //       title: "Error sending message",
  //       description: error.message || "Failed to send message",
  //       variant: "destructive",
  //     });
  //   }
  // });

  // Get user's location and load default properties
  useEffect(() => {
    const getUserLocation = async () => {
      try {
        // Try to get precise geolocation
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              const { latitude, longitude } = position.coords;
              
              // Reverse geocode to get city/state
              try {
                const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
                const locationData = await response.json();
                
                const location = {
                  lat: latitude,
                  lng: longitude,
                  city: locationData.city || locationData.locality,
                  state: locationData.principalSubdivision
                };
                
                setUserLocation(location);
                loadDefaultProperties(location);
              } catch (error) {
                console.log('Reverse geocoding failed, using coordinates only');
                const location = { lat: latitude, lng: longitude };
                setUserLocation(location);
                loadDefaultProperties(location);
              }
            },
            (error) => {
              console.log('Geolocation failed:', error);
              // Fallback to IP-based location
              loadLocationFromIP();
            },
            { timeout: 10000, enableHighAccuracy: true }
          );
        } else {
          // Fallback to IP-based location
          loadLocationFromIP();
        }
      } catch (error) {
        console.log('Location detection failed:', error);
        setIsLoadingLocation(false);
        // Load sample properties as final fallback
        setDefaultProperties(properties.slice(0, 6));
      }
    };

    const loadLocationFromIP = async () => {
      try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        
        const location = {
          city: data.city,
          state: data.region,
          lat: data.latitude,
          lng: data.longitude
        };
        
        setUserLocation(location);
        loadDefaultProperties(location);
      } catch (error) {
        console.log('IP location failed:', error);
        setIsLoadingLocation(false);
        // Load sample properties as final fallback
        setDefaultProperties(properties.slice(0, 6));
      }
    };

    const loadDefaultProperties = async (location: any) => {
      try {
        setIsLoadingLocation(true);
        
        // Try RentCast API first if user has access
        if (user) {
          const searchParams = new URLSearchParams({
            location: location.city && location.state ? `${location.city}, ${location.state}` : '',
            latitude: location.lat?.toString() || '',
            longitude: location.lng?.toString() || '',
            limit: '6'
          });

          const response = await fetch(`/api/search-properties?${searchParams}`);
          
          if (response.ok) {
            const data = await response.json();
            if (data.properties && data.properties.length > 0) {
              // Convert RentCast properties to our format
              const convertedProperties = data.properties.map((prop: any) => ({
                id: parseInt(prop.id) || Math.random(),
                title: prop.formattedAddress || prop.address,
                price: prop.rentEstimate?.rent || 2000,
                location: `${prop.city}, ${prop.state}`,
                bedrooms: prop.bedrooms || 2,
                bathrooms: prop.bathrooms || 2,
                squareFootage: prop.squareFootage || 1200,
                imageUrl: "/api/placeholder/400/300",
                propertyType: prop.propertyType || "Apartment",
                isPremium: false,
                isOffMarket: false,
                allowsPets: true,
                userId: "system",
                createdAt: new Date(),
                updatedAt: new Date()
              }));
              setDefaultProperties(convertedProperties);
              setIsLoadingLocation(false);
              return;
            }
          }
        }
        
        // Fallback to sample properties filtered by location
        let filteredProperties = properties;
        if (location.city) {
          // Filter sample properties that might match the city/state
          filteredProperties = properties.filter(prop => 
            prop.location.toLowerCase().includes(location.city.toLowerCase()) ||
            prop.location.toLowerCase().includes(location.state?.toLowerCase() || '')
          );
          
          // If no matches, just show all sample properties
          if (filteredProperties.length === 0) {
            filteredProperties = properties;
          }
        }
        
        setDefaultProperties(filteredProperties.slice(0, 6));
        setIsLoadingLocation(false);
        
      } catch (error) {
        console.log('Default property loading failed:', error);
        setIsLoadingLocation(false);
        setDefaultProperties(properties.slice(0, 6));
      }
    };

    if (properties.length > 0) {
      getUserLocation();
    }
  }, [properties, user]);

  const handleSearchComplete = (data: any, filters: any) => {
    setIsSearching(false);
    setSearchFilters(filters);
    setSearchError(null);
    
    console.log('Search complete - Raw data received:', data);
    console.log('Search filters:', filters);
    
    // Always using real data now
    setIsUsingRealData(true);
    
    // Handle RentCast API errors
    if (data && (data.error === 'subscription_inactive' || data.fallback || data.message?.includes('api-key-invalid'))) {
      let errorMessage = "Property search issue - ";
      if (data.message?.includes('api-key-invalid')) {
        errorMessage += "RentCast API key needs activation. Please contact support.";
      } else {
        errorMessage += data.message || "RentCast API subscription may be inactive.";
      }
      setSearchError(errorMessage);
      setRentCastResults([]);
      return;
    }
    
    // Handle RentCast response structure - the API returns { properties: [...] }
    if (data && data.properties && Array.isArray(data.properties)) {
      console.log('Setting RentCast results:', data.properties.length, 'properties');
      setRentCastResults(data.properties);
    } else {
      console.log('Invalid RentCast data structure:', data);
      setRentCastResults([]);
    }
  };
  
  // Removed filterSampleProperties - always use real data now

  // Load personalized explore properties based on user preferences
  const loadExploreProperties = async () => {
    if (!user || !userLocation) return;

    try {
      // Get user preferences from profile with better defaults for demo
      const userPrefs = {
        bedrooms: user.preferredBedrooms || 2,
        bathrooms: user.preferredBathrooms || 2,
        propertyType: user.preferredPropertyType || 'Apartment',
        maxRent: user.maxRent || 3000,
        amenities: user.preferredAmenities || ['pool', 'parking', 'laundry']
      };

      // Filter properties based on user preferences and location
      const filteredProps = properties.filter(property => {
        // Location preference (if user is in Dallas, show Dallas area properties)
        const locationMatch = userLocation.city ? 
          property.address.toLowerCase().includes(userLocation.city.toLowerCase()) ||
          property.address.toLowerCase().includes(userLocation.state?.toLowerCase() || '') : true;

        // Bedroom preference
        const bedroomMatch = property.bedrooms === userPrefs.bedrooms;
        
        // Rent preference
        const rentMatch = property.rent <= userPrefs.maxRent;

        // Property type preference
        const typeMatch = property.propertyType?.toLowerCase() === userPrefs.propertyType.toLowerCase();

        // At least match location and one other preference
        return locationMatch && (bedroomMatch || rentMatch || typeMatch);
      });

      // Add some variety - show top matches plus some alternatives
      const topMatches = filteredProps.slice(0, 4);
      const alternatives = properties.filter(p => !topMatches.includes(p)).slice(0, 2);
      
      setExploreProperties([...topMatches, ...alternatives]);
    } catch (error) {
      console.error('Error loading explore properties:', error);
      // Fallback to showing featured properties
      setExploreProperties(properties.slice(0, 6));
    }
  };

  // Load explore properties when view changes or data updates - Commented out for now
  // useEffect(() => {
  //   if (activeView === 'explore' && user && userLocation) {
  //     loadExploreProperties();
  //   }
  // }, [activeView, user, userLocation, properties]);

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      <Header />
      
      {/* View Toggle - Removed for now, keeping code for later implementation
      <section className="bg-white border-b border-gray-100 py-3 flex-shrink-0">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex justify-center">
            <div className="bg-gray-100 rounded-lg p-1 flex">
              <button
                onClick={() => setActiveView('properties')}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                  activeView === 'properties'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Properties
              </button>
              <button
                onClick={() => setActiveView('explore')}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                  activeView === 'explore'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Explore
              </button>
            </div>
          </div>
        </div>
      </section>
      */}

      {/* Compact Search Bar */}
      <section className="bg-white border-b border-gray-200 py-4 flex-shrink-0">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <SearchForm onSearchComplete={handleSearchComplete} setIsSearching={setIsSearching} />
          </div>
        </div>
      </section>

      {/* Split Layout: Properties & Map */}
      <div className="flex flex-1 overflow-hidden">
        {/* Properties List */}
        <div className="w-1/2 overflow-y-auto bg-white">
          <div className="p-4">
            {/* Properties Header */}
            <>
              {/* Search Results Header */}
              {rentCastResults.length > 0 && (
                <div className="mb-4 pb-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    Search Results
                  </h3>
                  <p className="text-sm text-gray-600">
                    {rentCastResults.length} properties found
                    {searchFilters?.location && ` in ${searchFilters.location}`}
                  </p>
                  <Badge className="mt-2 bg-blue-600 text-white">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    Live Property Data
                  </Badge>
                </div>
              )}

              {/* Default Properties Header */}
              {rentCastResults.length === 0 && (
                <div className="mb-4 pb-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {userLocation?.city && userLocation?.state 
                      ? `Properties Near You in ${userLocation.city}, ${userLocation.state}`
                      : userLocation?.city 
                      ? `Properties Near You in ${userLocation.city}`
                      : "Properties For You"
                    }
                  </h3>
                  <p className="text-sm text-gray-600">
                    {isLoadingLocation 
                      ? "Finding properties in your area..." 
                      : `${defaultProperties.length} properties found near your location`
                    }
                  </p>
                </div>
              )}
            </>

            {/* Explore Header - Commented out for now
            {activeView === 'explore' && (
              <div className="mb-4 pb-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  <div className="flex items-center gap-2">
                    <span>Explore & Connect</span>
                    <Badge className="bg-amber-100 text-amber-800 text-xs">
                      Featured
                    </Badge>
                  </div>
                </h3>
                <p className="text-sm text-gray-600">
                  Discover properties and connect with your community
                  {userLocation?.city && ` in ${userLocation.city}`}
                </p>
              </div>
            )}
            */}

            {isSearching && (
              <div className="text-center py-8">
                <div className="animate-spin w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-3"></div>
                <p className="text-gray-600">Searching properties...</p>
              </div>
            )}

            {/* Display API Error if present */}
            {searchError && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start">
                  <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 mr-2 flex-shrink-0" />
                  <div>
                    <h4 className="text-xs font-medium text-amber-800">API Notice</h4>
                    <p className="text-xs text-amber-700 mt-1">{searchError}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Property List */}
            <div className="space-y-4">
              {/* Properties View */}
              {activeView === 'properties' && (
                <>
                  {/* RentCast Properties */}
                  {isUsingRealData && rentCastResults.length > 0 && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {rentCastResults.map((property, index) => (
                        <div 
                          key={property.id || index}
                          className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 flex flex-col"
                        >
                          <div className="mb-4">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                              {property.formattedAddress || 'Address not available'}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {property.city}, {property.state} {property.zipCode}
                            </p>
                            <Badge variant="outline" className="mt-2">
                              {property.propertyType}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
                            {property.bedrooms && (
                              <div>
                                <span className="font-medium">Bedrooms:</span> {property.bedrooms}
                              </div>
                            )}
                            {property.bathrooms && (
                              <div>
                                <span className="font-medium">Bathrooms:</span> {property.bathrooms}
                              </div>
                            )}
                            {property.squareFootage && (
                              <div>
                                <span className="font-medium">Sq Ft:</span> {property.squareFootage.toLocaleString()}
                              </div>
                            )}
                            {property.yearBuilt && (
                              <div>
                                <span className="font-medium">Built:</span> {property.yearBuilt}
                              </div>
                            )}
                            {property.county && (
                              <div>
                                <span className="font-medium">County:</span> {property.county}
                              </div>
                            )}
                          </div>

                          {property.rentEstimate && (
                            <div className="bg-blue-50 rounded-lg p-3 mb-6">
                              <div className="text-xl font-bold text-blue-600">
                                ${property.rentEstimate.rent?.toLocaleString()}/mo
                              </div>
                              {property.rentEstimate.confidence && (
                                <div className="text-xs text-gray-500">
                                  Confidence: {Math.round(property.rentEstimate.confidence * 100)}%
                                </div>
                              )}
                            </div>
                          )}

                          {/* Spacer to push buttons to bottom */}
                          <div className="flex-1"></div>

                          {/* Buttons at the bottom */}
                          <div className="flex gap-3 mt-auto">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSaveProperty(property.id)}
                              className="flex-1"
                            >
                              Save
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleViewProperty(property.id)}
                              className="flex-1 bg-blue-600 hover:bg-blue-700"
                            >
                              View Details
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* No Sample Properties - Always use real data */}

                  {/* Default Properties */}
                  {rentCastResults.length === 0 && 
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {defaultProperties.map((property) => (
                        <ModernPropertyCard 
                          key={property.id} 
                          property={property}
                          isSaved={false}
                        />
                      ))}
                    </div>
                  }
                </>
              )}

              {/* Explore View - Side by Side Layout - Commented out for now
              {activeView === 'explore' && (
                <div className="flex gap-6 w-full">
                  {/* Left Side - Featured Properties (60% of the space) */}
                  <div className="w-3/5 space-y-6 min-w-0">
                    <div className="mb-4">
                      <h4 className="font-semibold text-gray-900 mb-2">Featured Properties</h4>
                      <div className="flex flex-wrap gap-1">
                        {user?.preferredBedrooms && (
                          <Badge variant="outline" className="text-xs">
                            {user.preferredBedrooms} bed
                          </Badge>
                        )}
                        {user?.preferredPropertyType && (
                          <Badge variant="outline" className="text-xs">
                            {user.preferredPropertyType}
                          </Badge>
                        )}
                        {user?.maxRent && (
                          <Badge variant="outline" className="text-xs">
                            Under ${user.maxRent}/mo
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    {/* Featured Properties Grid */}
                    <div className="space-y-6">
                      {exploreProperties.map((property, index) => {
                        const matchReasons = [];
                        if (property.bedrooms === user?.preferredBedrooms) {
                          matchReasons.push(`Matches your ${property.bedrooms}-bedroom preference`);
                        }
                        if ((property.rent || property.price) <= (user?.maxRent || 3000)) {
                          matchReasons.push(`Within your $${user?.maxRent || 3000}/month budget`);
                        }
                        if (property.propertyType?.toLowerCase() === user?.preferredPropertyType?.toLowerCase()) {
                          matchReasons.push(`Your preferred ${property.propertyType.toLowerCase()} type`);
                        }
                        if (property.allowsPets && user?.hasPets) {
                          matchReasons.push('Pet-friendly for your furry friend');
                        }

                        return (
                          <ModernPropertyCard 
                            key={`property-${property.id}`}
                            property={property}
                            isSaved={false}
                            isExploreMode={true}
                            matchReasons={matchReasons}
                          />
                        );
                      })}
                      
                      {exploreProperties.length === 0 && (
                        <div className="text-center py-12">
                          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">Set Your Preferences</h3>
                          <p className="text-gray-600 mb-4">Complete your profile to see personalized property recommendations</p>
                          <Button onClick={() => window.location.href = '/profile'} className="bg-blue-600 hover:bg-blue-700">
                            Update Preferences
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Sidebar - Community Post Creation (40% of the space) */}
                  <div className="w-2/5 flex-shrink-0">
                    <div className="sticky top-4">
                      {/* Animated Post Creation Card */}
                      <Card 
                        className={`shadow-sm border border-gray-200 transition-all duration-300 ease-out ${
                          isCreatePostOpen 
                            ? 'shadow-lg scale-[1.02]' 
                            : 'hover:shadow-md cursor-pointer'
                        }`}
                        onClick={() => !isCreatePostOpen && setIsCreatePostOpen(true)}
                      >
                        {/* Compact Post Prompt Bar */}
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                              <User className="h-4 w-4 text-white" />
                            </div>
                            <div className="flex-1">
                              <p className="text-gray-500 text-sm">Share with your community...</p>
                            </div>
                            {!isCreatePostOpen && <ChevronDown className="h-4 w-4 text-gray-400" />}
                            {isCreatePostOpen && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setIsCreatePostOpen(false);
                                  setNewPost({ title: '', content: '', category: 'general' });
                                }}
                                className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                              >
                                <ChevronUp className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </CardContent>

                        {/* Expanded Post Creation - Animated */}
                        <div 
                          className={`overflow-hidden transition-all duration-300 ease-out ${
                            isCreatePostOpen 
                              ? 'max-h-96 opacity-100' 
                              : 'max-h-0 opacity-0'
                          }`}
                        >
                          <CardContent className="px-4 pb-4 pt-0">
                            <div className="space-y-4 border-t border-gray-100 pt-4">
                              <div>
                                <Select value={newPost.category} onValueChange={(value) => setNewPost({...newPost, category: value})}>
                                  <SelectTrigger className="h-8 text-sm">
                                    <SelectValue placeholder="Category" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="general">💬 General</SelectItem>
                                    <SelectItem value="housing">🏠 Housing</SelectItem>
                                    <SelectItem value="moving">📦 Moving</SelectItem>
                                    <SelectItem value="neighborhood">🏘️ Neighborhood</SelectItem>
                                    <SelectItem value="safety">🛡️ Safety</SelectItem>
                                    <SelectItem value="recommendations">⭐ Recommendations</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              <div>
                                <Input
                                  value={newPost.title}
                                  onChange={(e) => setNewPost({...newPost, title: e.target.value})}
                                  placeholder="What's happening?"
                                  className="h-8 text-sm"
                                />
                              </div>
                              
                              <div>
                                <Textarea
                                  value={newPost.content}
                                  onChange={(e) => setNewPost({...newPost, content: e.target.value})}
                                  placeholder="Share your thoughts with the community..."
                                  rows={3}
                                  className="text-sm resize-none"
                                />
                              </div>

                              {/* Post Actions */}
                              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                                <div className="flex items-center gap-2">
                                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-gray-500">
                                    📎 Attach
                                  </Button>
                                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-gray-500">
                                    @ Mention
                                  </Button>
                                </div>
                                <Button 
                                  onClick={() => createPostMutation.mutate(newPost)}
                                  disabled={createPostMutation.isPending || !newPost.title || !newPost.content}
                                  size="sm"
                                  className="bg-blue-600 hover:bg-blue-700 h-7 px-3 text-xs"
                                >
                                  {createPostMutation.isPending ? 'Posting...' : 'Post'}
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </div>
                      </Card>

                      {/* Recent Community Posts - Compact View */}
                      {!isCreatePostOpen && (
                        <div className="mt-4">
                          <h5 className="font-medium text-gray-900 mb-3 text-sm">Community Activity</h5>
                          <div className="space-y-3">
                            {postsLoading ? (
                              <div className="text-center py-4">
                                <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                                <p className="text-xs text-gray-600">Loading...</p>
                              </div>
                            ) : postsError ? (
                              <div className="text-center py-4">
                                <MessageCircle className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                                <p className="text-xs text-gray-600">Update your profile to see community posts</p>
                              </div>
                            ) : (
                              <>
                                {posts.slice(0, 3).map((post) => (
                                  <Card key={`sidebar-post-${post.id}`} className="shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                                    <CardContent className="p-3">
                                      <div className="flex items-start gap-2">
                                        <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                                          <User className="h-3 w-3 text-white" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-1 mb-1">
                                            <h6 className="font-medium text-gray-900 text-xs truncate">
                                              {post.user?.firstName} {post.user?.lastName}
                                            </h6>
                                            <Badge variant="secondary" className="text-xs px-1 py-0">
                                              {post.category}
                                            </Badge>
                                          </div>
                                          <p className="text-xs text-gray-700 line-clamp-2 mb-2">{post.title}</p>
                                          <div className="flex items-center justify-between">
                                            <span className="text-xs text-gray-500">
                                              {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                                            </span>
                                            <Button 
                                              variant="ghost" 
                                              size="sm" 
                                              onClick={() => setSelectedPost(post)}
                                              className="h-5 px-2 text-xs text-blue-600 hover:text-blue-700"
                                            >
                                              Reply
                                            </Button>
                                          </div>
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                ))}
                                
                                {posts.length === 0 && (
                                  <div className="text-center py-4">
                                    <MessageCircle className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                                    <p className="text-xs text-gray-600">No posts yet. Be the first to share!</p>
                                  </div>
                                )}
                                
                                {posts.length > 3 && (
                                  <Button variant="ghost" size="sm" className="w-full text-xs text-blue-600 hover:text-blue-700">
                                    View all posts ({posts.length})
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Message Dialog (kept outside for proper z-index) */}
                      <Dialog open={selectedPost !== null} onOpenChange={(open) => !open && setSelectedPost(null)}>
                        <DialogContent className="sm:max-w-[425px]">
                          <DialogHeader>
                            <DialogTitle>
                              Send message to {selectedPost?.user?.firstName} {selectedPost?.user?.lastName}
                            </DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="p-3 bg-gray-50 rounded-lg">
                              <p className="text-sm text-gray-600">Re: {selectedPost?.title}</p>
                              <p className="text-sm text-gray-800 mt-1">{selectedPost?.content}</p>
                            </div>
                            
                            <div>
                              <Textarea
                                value={messageText}
                                onChange={(e) => setMessageText(e.target.value)}
                                placeholder="Type your message..."
                                rows={3}
                                className="w-full"
                              />
                            </div>
                            
                            <div className="flex gap-2">
                              <Button 
                                onClick={() => selectedPost && sendMessageMutation.mutate({
                                  receiverId: selectedPost.userId,
                                  content: messageText
                                })}
                                disabled={sendMessageMutation.isPending || !messageText.trim()}
                                className="flex-1 bg-blue-600 hover:bg-blue-700"
                              >
                                <Send className="h-4 w-4 mr-2" />
                                {sendMessageMutation.isPending ? 'Sending...' : 'Send'}
                              </Button>
                              <Button 
                                variant="outline" 
                                onClick={() => setSelectedPost(null)}
                                className="flex-1"
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </div>
              )}
              */}
            </div>

            {/* Empty state for Properties view */}
            {(!searchResults.length && !rentCastResults.length && !defaultProperties.length && !isSearching && !isLoadingLocation) && (
              <div className="text-center py-12">
                <p className="text-gray-500">No properties found. Try adjusting your search criteria.</p>
              </div>
            )}
          </div>
        </div>

        {/* Map View - Right Side */}
        <div className="w-1/2 relative bg-gray-100">
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
                    ...rentCastResults
                  ]}
                  center={userLocation?.lat && userLocation?.lng ? 
                    [userLocation.lat, userLocation.lng] : 
                    [32.7767, -96.7970] // Dallas default
                  }
                  zoom={12}
                />
              </Suspense>
            </div>
          </div>
        </div>
      </div>

      <MobileNavigation />
    </div>
  );
}
