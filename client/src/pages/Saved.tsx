import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import PropertyCard from "@/components/PropertyCard";
import ZillowPropertyCard from "@/components/ZillowPropertyCard";
import { Card, CardContent } from "@/components/ui/card";
import { Heart } from "lucide-react";
import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function Saved() {
  const { data: savedProperties = [], isLoading } = useQuery({
    queryKey: ["/api/saved-properties"],
  });

  const [zillowProperties, setZillowProperties] = useState<any[]>([]);
  const [loadingZillow, setLoadingZillow] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Handle unsaving a property
  const handleUnsaveProperty = async (propertyId: string) => {
    try {
      await apiRequest('DELETE', `/api/saved-properties/${propertyId}`);
      toast({
        title: "Property Removed",
        description: "Property has been removed from your saved list.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/saved-properties'] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove property. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Extract property data from saved properties  
  useEffect(() => {
    if (savedProperties.length > 0) {
      // Use the stored property data
      const propertyDataList = savedProperties.map((saved: any) => ({
        ...saved.propertyData, // Full Zillow property data
        savedId: saved.id,
        savedAt: saved.createdAt
      })).filter(prop => prop.zpid); // Only include properties with valid data
      
      setZillowProperties(propertyDataList);
    } else {
      setZillowProperties([]);
    }
  }, [savedProperties]);

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Saved Properties</h1>
          <p className="text-gray-300">Your favorite properties in one place</p>
        </div>

        {isLoading || loadingZillow ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <div className="h-48 bg-gray-200 rounded-t-lg"></div>
                <CardContent className="p-4 space-y-2">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : zillowProperties.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {zillowProperties.map((property) => (
              <ZillowPropertyCard 
                key={property.savedId} 
                property={property} 
                isSaved={true}
                onSave={() => handleUnsaveProperty(property.zpid)}
              />
            ))}
          </div>
        ) : savedProperties.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {savedProperties.map((saved: any) => (
              <PropertyCard key={saved.id} property={saved.property} isSaved={true} />
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center bg-gray-800 border-gray-600">
            <CardContent className="flex flex-col items-center space-y-4">
              <Heart className="h-16 w-16 text-gray-400" />
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">No Saved Properties</h3>
                <p className="text-gray-300">Start exploring properties and save your favorites here!</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      
    </div>
  );
}
