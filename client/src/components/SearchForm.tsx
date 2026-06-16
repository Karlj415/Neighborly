import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Search, MapPin, Building2, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";

interface SearchFormProps {
  onSearchComplete?: (data: any, searchLocation?: { lat: number; lng: number }) => void;
  setIsSearching?: (loading: boolean) => void;
}

export default function SearchForm({ onSearchComplete, setIsSearching }: SearchFormProps) {
  const [location, setLocation] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [priceRange, setPriceRange] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [searchLocationCoords, setSearchLocationCoords] = useState<{ lat: number; lng: number } | null>(null);
  // Always use real data now
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const [, setLocationPath] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Address autocomplete query using Google Places API
  const { data: suggestions = [], isLoading: suggestionsLoading } = useQuery({
    queryKey: [`/api/google-places/autocomplete?input=${encodeURIComponent(location.trim())}`],
    enabled: location.length >= 3 && showSuggestions,
    refetchOnWindowFocus: false,
    staleTime: 0, // No cache - always fresh Google Places API results
    cacheTime: 0, // Don't cache results
    retry: false, // Don't retry on failure
  });

  // Debug logging
  useEffect(() => {
    if (suggestions) {
      console.log('Google Places API suggestions:', suggestions);
    }
  }, [suggestions]);

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node) &&
          inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || !suggestions.predictions) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev < suggestions.predictions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedSuggestionIndex >= 0 && suggestions.predictions[selectedSuggestionIndex]) {
          const suggestion = suggestions.predictions[selectedSuggestionIndex];
          setLocation(suggestion.description);
          setShowSuggestions(false);
          setSelectedSuggestionIndex(-1);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
        break;
    }
  };

  const handleSuggestionClick = async (suggestion: any) => {
    try {
      // Get detailed address information including ZIP code using authenticated endpoint
      const response = await apiRequest('GET', `/api/google-places/details?place_id=${suggestion.place_id}`);
      const data = await response.json();
      
      if (data.result && data.result.address_components) {
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

        // Build complete address with ZIP code
        const streetAddress = `${streetNumber} ${route}`.trim();
        const fullAddress = zipCode 
          ? `${streetAddress}, ${city}, ${state} ${zipCode}`
          : `${streetAddress}, ${city}, ${state}`;

        console.log('Setting complete address with ZIP:', fullAddress);
        setLocation(fullAddress);
        
        // Extract and store coordinates for map navigation
        if (data.result.geometry && data.result.geometry.location) {
          const coords = {
            lat: data.result.geometry.location.lat,
            lng: data.result.geometry.location.lng
          };
          setSearchLocationCoords(coords);
          console.log('Stored search coordinates:', coords);
        }
      } else {
        // Fallback to original description
        setLocation(suggestion.description);
        setSearchLocationCoords(null);
      }
    } catch (error) {
      console.error('Error getting place details:', error);
      // Fallback to original description
      setLocation(suggestion.description);
    }
    
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
  };

  const searchMutation = useMutation({
    mutationFn: async () => {
      if (!isAuthenticated) {
        throw new Error("Please log in to search properties");
      }

      // Always use RentCast API for real properties
      const searchParams = new URLSearchParams();
      
      if (location) {
        // Check if it's a zipcode format (contains "(Zipcode)" or is 5 digits)
        const isZipcode = location.includes('(Zipcode)') || /^\d{5}$/.test(location.trim());
        
        if (isZipcode) {
          // Extract zipcode from the formatted string
          const zipcode = location.replace(' (Zipcode)', '').trim();
          searchParams.append('zipCode', zipcode);
        } else {
          // Handle different address formats
          const locationParts = location.split(',').map(part => part.trim());
          
          if (locationParts.length >= 2) {
            // For address formats like "Street Address, City, State, Country"
            const lastPart = locationParts[locationParts.length - 1];
            const secondToLastPart = locationParts[locationParts.length - 2];
            const thirdToLastPart = locationParts.length >= 3 ? locationParts[locationParts.length - 3] : null;
            
            // Check if last part is "USA" or if second to last looks like a state
            if (lastPart === 'USA' && thirdToLastPart) {
              // Format: "Street, City, State, USA" - use city and state for broader results
              searchParams.append('city', thirdToLastPart);
              searchParams.append('state', secondToLastPart);
            } else if (secondToLastPart && secondToLastPart.match(/^[A-Z]{2}(\s+\d{5})?$/)) {
              // Format: "Street, City, State" - use city and state
              const state = secondToLastPart.split(' ')[0]; // Extract state without zip
              const city = locationParts[locationParts.length - 3] || lastPart;
              searchParams.append('city', city);
              searchParams.append('state', state);
            } else if (lastPart.match(/^[A-Z]{2}(\s+\d{5})?$/)) {
              // Format: "City, State" - use city and state
              searchParams.append('city', secondToLastPart);
              searchParams.append('state', lastPart.split(' ')[0]); // Extract state without zip
            } else {
              // For specific addresses, try the full address first, but also extract city/state as fallback
              searchParams.append('location', location);
            }
          } else {
            // For single terms, try as city first
            // Handle special cases for major cities
            if (location.toLowerCase() === 'austin') {
              searchParams.append('city', 'Austin');
              searchParams.append('state', 'TX'); // Default Austin to Texas
            } else {
              searchParams.append('city', location);
            }
          }
        }
      }
      
      if (propertyType) searchParams.append('propertyType', propertyType);
      if (bedrooms) searchParams.append('minBedrooms', bedrooms);
      
      // Parse price range if provided (e.g., "1000-2000")
      if (priceRange) {
        const [minPrice, maxPrice] = priceRange.split('-').map(p => p.trim());
        if (minPrice) searchParams.append('minRent', minPrice);
        if (maxPrice && maxPrice !== '+') searchParams.append('maxRent', maxPrice);
      }

      // Add pagination parameters  
      searchParams.append('limit', '20');
      searchParams.append('page', '1');
      
      const response = await apiRequest("GET", `/api/zillow/search?${searchParams.toString()}`);
      const data = await response.json();
      console.log('API Response received in SearchForm:', data);
      return data;
    },
    onSuccess: (data) => {
      console.log('SearchForm onSuccess - data received:', data);
      const propertyCount = Array.isArray(data) ? data.length : (data.properties?.length || data.count || 0);
      toast({
        title: "Property Search Complete",
        description: `Found ${propertyCount} properties matching your criteria.`,
      });
      
      // Trigger search results callback if provided
      console.log('Calling onSearchComplete with data:', data);
      console.log('Search location coordinates:', searchLocationCoords);
      if (onSearchComplete) {
        onSearchComplete(data, searchLocationCoords || undefined);
      }
    },
    onError: (error: any) => {
      console.error('Search error:', error);
      
      // Check if it's an authentication error (401) or service unavailable (503)
      if (error.message?.includes('401') || error.message?.includes('authentication')) {
        toast({
          title: "Zillow Authentication Issue",
          description: "Please contact support to check your Zillow API access.",
          variant: "destructive",
        });
      } else if (error.message?.includes('503')) {
        toast({
          title: "Property Search Unavailable",
          description: "Zillow API is temporarily unavailable. Please try again later.",
          variant: "destructive",
        });
      } else if (error.message?.includes("Please log in")) {
        toast({
          title: "Login Required",
          description: "Please log in to search properties.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Property Search Failed",
          description: "Unable to search properties. Please try again later.",
          variant: "destructive",
        });
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearchComplete) {
      setIsSearching && setIsSearching(true);
    }
    searchMutation.mutate();
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex flex-col lg:flex-row gap-3 items-center">
        {/* Location Search with Autocomplete */}
        <div className="relative flex-1 min-w-0">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
            <MapPin className="h-4 w-4 text-gray-400" />
          </div>
          <Input
            ref={inputRef}
            type="text"
            placeholder="Enter address (e.g., 123 Main St, Dallas, TX)"
            value={location}
            onChange={(e) => {
              setLocation(e.target.value);
              setShowSuggestions(true);
              setSelectedSuggestionIndex(-1);
            }}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={handleKeyDown}
            className="pl-9 h-10 bg-gray-800 border-gray-600 text-white placeholder:text-gray-400"
            autoComplete="off"
          />
          
          {/* Autocomplete Suggestions Dropdown */}
          {showSuggestions && location.length >= 3 && suggestions?.predictions?.length > 0 && (
            <div
              ref={suggestionsRef}
              className="absolute top-full left-0 right-0 bg-gray-800 border border-gray-600 rounded-md shadow-lg z-20 max-h-60 overflow-y-auto mt-1"
            >
              {suggestions.predictions.map((suggestion: any, index: number) => (
                <div
                  key={suggestion.place_id || index}
                  className={`px-3 py-2 cursor-pointer text-sm border-b border-gray-600 last:border-b-0 ${
                    index === selectedSuggestionIndex
                      ? 'bg-blue-600 text-white'
                      : 'hover:bg-gray-700 text-gray-300'
                  }`}
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3 w-3 text-gray-400 flex-shrink-0" />
                    <span className="truncate">{suggestion.description}</span>
                  </div>
                </div>
              ))}
              
              {/* Helpful hint */}
              <div className="px-3 py-2 text-xs text-gray-400 bg-gray-700 border-t border-gray-600">
                💡 Search by address, city, or state for properties
              </div>
            </div>
          )}
          

        </div>

        {/* Filters */}
        <div className="flex gap-2 items-center">
          <Select value={propertyType} onValueChange={setPropertyType}>
            <SelectTrigger className="w-32 h-10">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="apartment">Apartment</SelectItem>
              <SelectItem value="house">House</SelectItem>
              <SelectItem value="condo">Condo</SelectItem>
              <SelectItem value="studio">Studio</SelectItem>
            </SelectContent>
          </Select>

            <Select value={priceRange} onValueChange={setPriceRange}>
            <SelectTrigger className="w-32 h-10">
              <SelectValue placeholder="Price" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="500-1000">$500-1K</SelectItem>
              <SelectItem value="1000-2000">$1K-2K</SelectItem>
              <SelectItem value="2000-3000">$2K-3K</SelectItem>
              <SelectItem value="3000+">$3K+</SelectItem>
            </SelectContent>
          </Select>

          <Select value={bedrooms} onValueChange={setBedrooms}>
            <SelectTrigger className="w-28 h-10">
              <SelectValue placeholder="Beds" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Studio</SelectItem>
              <SelectItem value="1">1 Bed</SelectItem>
              <SelectItem value="2">2 Bed</SelectItem>
              <SelectItem value="3">3+ Bed</SelectItem>
            </SelectContent>
          </Select>



          <Button 
            type="submit" 
            className="bg-blue-600 hover:bg-blue-700 h-10 px-6"
            disabled={searchMutation.isPending}
          >
            <Search className="h-4 w-4 mr-2" />
            {searchMutation.isPending ? "Searching..." : "Search"}
          </Button>
        </div>
      </div>
    </form>
  );
}
