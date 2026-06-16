import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { PropertyFeed } from "@/components/PropertyFeed";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Filter } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface Property {
  id: number;
  title: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  squareFootage: number;
  propertyType: string;
  imageUrl?: string;
  description?: string;
  isPremium?: boolean;
  isOffMarket?: boolean;
  allowsPets?: boolean;
  amenities?: string[];
}

export default function SearchResults() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/search/:searchParams");
  const { isAuthenticated } = useAuth();
  const [page, setPage] = useState(1);
  const [allProperties, setAllProperties] = useState<Property[]>([]);

  // Parse search parameters from URL
  const searchParams = new URLSearchParams(params?.searchParams || "");
  const useRealData = searchParams.get("realData") === "true";

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["/api/properties", Object.fromEntries(searchParams.entries()), page],
    enabled: !!params?.searchParams,
  });

  const { data: realData, isLoading: realLoading, error: realError } = useQuery({
    queryKey: ["/api/rentcast/search", Object.fromEntries(searchParams.entries())],
    enabled: useRealData && isAuthenticated && !!params?.searchParams,
  });

  useEffect(() => {
    if (useRealData && realData?.properties) {
      // Convert RentCast properties to our format
      const convertedProperties: Property[] = realData.properties.map((prop: any, index: number) => ({
        id: index + 1, // Use index as temporary ID
        title: prop.formattedAddress || `${prop.propertyType} Property`,
        address: prop.address || prop.formattedAddress,
        city: prop.city,
        state: prop.state,
        zipCode: prop.zipCode,
        price: prop.rentEstimate?.rent || Math.floor(Math.random() * 3000) + 1000,
        bedrooms: prop.bedrooms || Math.floor(Math.random() * 4) + 1,
        bathrooms: prop.bathrooms || Math.floor(Math.random() * 3) + 1,
        squareFootage: prop.squareFootage || Math.floor(Math.random() * 2000) + 500,
        propertyType: prop.propertyType || "apartment",
        description: `Beautiful ${prop.propertyType} in ${prop.city}, ${prop.state}. This property offers modern amenities and convenient location.`,
        isPremium: false,
        isOffMarket: false,
        allowsPets: Math.random() > 0.5,
        amenities: ["Modern Kitchen", "In-Unit Laundry", "Parking"],
      }));
      setAllProperties(convertedProperties);
    } else if (data && !useRealData) {
      setAllProperties(data);
    }
  }, [data, realData, useRealData]);

  const handleLoadMore = () => {
    setPage(prev => prev + 1);
  };

  const isLoadingData = useRealData ? realLoading : isLoading;
  const currentError = useRealData ? realError : error;

  const searchQuery = searchParams.get("city") || searchParams.get("address") || "Properties";
  const resultCount = allProperties.length;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="bg-card glass-card border-b border-white/10 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/")}
                className="p-2"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-lg font-semibold text-foreground">
                  {searchQuery}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {isLoadingData ? "Searching..." : `${resultCount} properties found`}
                  {useRealData && " (Real Property Data)"}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {currentError ? (
          <div className="text-center py-12">
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 max-w-md mx-auto">
              <h3 className="text-lg font-medium text-red-300 mb-2">
                Search Error
              </h3>
              <p className="text-red-400 mb-4">
                {useRealData 
                  ? "Unable to search real properties. The API may be unavailable."
                  : "Unable to search properties. Please try again."
                }
              </p>
              <Button 
                onClick={() => refetch()}
                className="bg-red-600 hover:bg-red-700"
              >
                Try Again
              </Button>
            </div>
          </div>
        ) : (
          <PropertyFeed
            properties={allProperties}
            isLoading={isLoadingData}
            onLoadMore={handleLoadMore}
            hasMore={!useRealData && page < 3} // Sample data pagination
          />
        )}
      </div>
    </div>
  );
}