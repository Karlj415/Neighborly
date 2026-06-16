import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, MapPin, Bed, Bath, Square, Phone, Calendar, MessageCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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

interface PropertyFeedProps {
  properties: Property[];
  isLoading?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

export function PropertyFeed({ properties, isLoading, onLoadMore, hasMore }: PropertyFeedProps) {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [savedProperties, setSavedProperties] = useState<Set<number>>(new Set());

  const savePropertyMutation = useMutation({
    mutationFn: async (propertyId: number) => {
      await apiRequest("POST", "/api/saved-properties", { propertyId });
    },
    onSuccess: (_, propertyId) => {
      setSavedProperties(prev => new Set([...prev, propertyId]));
      queryClient.invalidateQueries({ queryKey: ["/api/saved-properties"] });
      toast({
        title: "Property Saved",
        description: "Property added to your saved list. +5 points earned!",
      });
    },
    onError: () => {
      toast({
        title: "Save Failed",
        description: "Unable to save property. Please try again.",
        variant: "destructive",
      });
    },
  });

  const unsavePropertyMutation = useMutation({
    mutationFn: async (propertyId: number) => {
      await apiRequest("DELETE", `/api/saved-properties/${propertyId}`);
    },
    onSuccess: (_, propertyId) => {
      setSavedProperties(prev => {
        const newSet = new Set(prev);
        newSet.delete(propertyId);
        return newSet;
      });
      queryClient.invalidateQueries({ queryKey: ["/api/saved-properties"] });
      toast({
        title: "Property Removed",
        description: "Property removed from your saved list.",
      });
    },
  });

  const handleSaveToggle = (propertyId: number) => {
    if (!isAuthenticated) {
      toast({
        title: "Login Required",
        description: "Please log in to save properties.",
        variant: "destructive",
      });
      return;
    }

    if (savedProperties.has(propertyId)) {
      unsavePropertyMutation.mutate(propertyId);
    } else {
      savePropertyMutation.mutate(propertyId);
    }
  };

  if (isLoading && properties.length === 0) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <div className="h-64 bg-gray-200 rounded-t-lg"></div>
            <CardContent className="p-4">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="flex space-x-4">
                <div className="h-8 bg-gray-200 rounded w-20"></div>
                <div className="h-8 bg-gray-200 rounded w-20"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {properties.map((property) => (
        <Card key={property.id} className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
          {/* Property Image */}
          <div className="relative h-64 sm:h-80 bg-gray-200">
            {property.imageUrl ? (
              <img
                src={property.imageUrl}
                alt={property.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                <div className="text-center">
                  <MapPin className="h-12 w-12 text-blue-400 mx-auto mb-2" />
                  <p className="text-blue-600 font-medium">{property.title}</p>
                </div>
              </div>
            )}
            
            {/* Premium/Off-Market Badges */}
            <div className="absolute top-3 left-3 flex gap-2">
              {property.isPremium && (
                <Badge className="bg-yellow-500 text-white">Premium</Badge>
              )}
              {property.isOffMarket && (
                <Badge className="bg-orange-500 text-white">Off Market</Badge>
              )}
            </div>

            {/* Save Button */}
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-3 right-3 bg-white/80 hover:bg-white"
              onClick={() => handleSaveToggle(property.id)}
            >
              <Heart
                className={`h-5 w-5 ${
                  savedProperties.has(property.id)
                    ? "fill-red-500 text-red-500"
                    : "text-gray-600"
                }`}
              />
            </Button>
          </div>

          <CardContent className="p-4">
            {/* Property Title & Price */}
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-lg font-semibold text-gray-900 flex-1">
                {property.title}
              </h3>
              <div className="text-right ml-4">
                <p className="text-2xl font-bold text-blue-600">
                  ${property.price.toLocaleString()}
                </p>
                <p className="text-sm text-gray-500">per month</p>
              </div>
            </div>

            {/* Address */}
            <div className="flex items-center text-gray-600 mb-3">
              <MapPin className="h-4 w-4 mr-1" />
              <span className="text-sm">
                {property.address}, {property.city}, {property.state} {property.zipCode}
              </span>
            </div>

            {/* Property Details */}
            <div className="flex items-center gap-4 mb-4 text-sm text-gray-600">
              <div className="flex items-center">
                <Bed className="h-4 w-4 mr-1" />
                <span>{property.bedrooms} bed</span>
              </div>
              <div className="flex items-center">
                <Bath className="h-4 w-4 mr-1" />
                <span>{property.bathrooms} bath</span>
              </div>
              <div className="flex items-center">
                <Square className="h-4 w-4 mr-1" />
                <span>{property.squareFootage?.toLocaleString()} sq ft</span>
              </div>
              <Badge variant="outline" className="text-xs">
                {property.propertyType}
              </Badge>
            </div>

            {/* Description */}
            {property.description && (
              <p className="text-gray-700 text-sm mb-4 line-clamp-2">
                {property.description}
              </p>
            )}

            {/* Amenities */}
            {property.amenities && property.amenities.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-4">
                {property.amenities.slice(0, 3).map((amenity) => (
                  <Badge key={amenity} variant="secondary" className="text-xs">
                    {amenity}
                  </Badge>
                ))}
                {property.amenities.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{property.amenities.length - 3} more
                  </Badge>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button 
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                disabled={!isAuthenticated}
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Contact
              </Button>
              <Button 
                variant="outline" 
                className="flex-1"
                disabled={!isAuthenticated}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Schedule Tour
              </Button>
              <Button 
                variant="outline"
                size="sm"
                disabled={!isAuthenticated}
              >
                <Phone className="h-4 w-4" />
              </Button>
            </div>

            {!isAuthenticated && (
              <p className="text-xs text-gray-500 mt-2 text-center">
                Log in to contact property owners and schedule tours
              </p>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Load More Button */}
      {hasMore && (
        <div className="text-center py-6">
          <Button
            variant="outline"
            onClick={onLoadMore}
            disabled={isLoading}
            className="w-full max-w-sm"
          >
            {isLoading ? "Loading..." : "Load More Properties"}
          </Button>
        </div>
      )}

      {/* No Properties Found */}
      {properties.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <MapPin className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Properties Found</h3>
          <p className="text-gray-500">
            Try adjusting your search filters to find more properties.
          </p>
        </div>
      )}
    </div>
  );
}