import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Heart, 
  Bed, 
  Bath, 
  Square, 
  MapPin,
  DollarSign,
  Share2
} from "lucide-react";

interface ZillowProperty {
  zpid: string;
  streetAddress?: string;
  address?: string;
  city: string;
  state: string;
  zipcode?: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  livingArea?: number;
  propertyType: string;
  homeStatus: string;
  zestimate?: number;
  rentZestimate?: number;
  latitude: number;
  longitude: number;
  photos?: string[];
  imgSrc?: string;
  description?: string;
  yearBuilt?: number;
  lotSize?: number;
  pricePerSqft?: number;
}

interface ZillowPropertyCardProps {
  property: ZillowProperty;
  onSave?: () => void;
  onShare?: () => void;
  onClick?: () => void;
  isSaved?: boolean;
}

export default function ZillowPropertyCard({ 
  property, 
  onSave, 
  onShare,
  onClick,
  isSaved = false 
}: ZillowPropertyCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const formatPrice = (price: number) => {
    if (!price || price === 0) return "Price on request";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatPropertyType = (type: string) => {
    if (!type) return "Property";
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getDisplayPrice = () => {
    // For rentals, prefer rentZestimate, otherwise use price
    if (property.rentZestimate && property.rentZestimate > 0) {
      return `${formatPrice(property.rentZestimate)}/month`;
    }
    if (property.price && property.price > 0) {
      return formatPrice(property.price);
    }
    return "Price on request";
  };

  const getPropertyImage = () => {
    return property.imgSrc || property.photos?.[0] || null;
  };

  return (
    <Card 
      className="hover:shadow-lg transition-all duration-300 overflow-hidden cursor-pointer bg-gray-800/50 border-gray-700/50 rounded-xl"
      onClick={onClick}
    >
      {/* Property Image */}
      <div className="relative h-48 bg-gray-700">
        {getPropertyImage() && !imageError ? (
          <img
            src={getPropertyImage()}
            alt={`Property at ${property.streetAddress || property.address}`}
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-600">
            <div className="text-center text-gray-300">
              <MapPin className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">No Image Available</p>
            </div>
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="absolute top-3 right-3 flex gap-2">
          {/* Share Button */}
          <Button
            variant="ghost"
            size="sm"
            className="p-2 rounded-full bg-white/80 hover:bg-white text-gray-600 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onShare?.();
            }}
          >
            <Share2 className="h-4 w-4" />
          </Button>
          
          {/* Save Button */}
          <Button
            variant="ghost"
            size="sm"
            className={`p-2 rounded-full transition-colors ${
              isSaved 
                ? 'bg-red-100 hover:bg-red-200 text-red-600' 
                : 'bg-white/80 hover:bg-white text-gray-600'
            }`}
            onClick={(e) => {
              e.stopPropagation();
              onSave?.();
            }}
          >
            <Heart className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`} />
          </Button>
        </div>

        {/* Property Type Badge */}
        <Badge className="absolute bottom-3 left-3 bg-blue-600 text-white">
          {formatPropertyType(property.propertyType)}
        </Badge>
      </div>

      <CardContent className="p-4">
        {/* Address */}
        <div className="mb-3">
          <h3 className="font-semibold text-white mb-1">
            {property.streetAddress || property.address || `${property.city}, ${property.state}`}
          </h3>
          <p className="text-sm text-gray-400 flex items-center">
            <MapPin className="h-3 w-3 mr-1" />
            {property.city}, {property.state} {property.zipcode}
          </p>
        </div>

        {/* Property Details */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-4 text-sm text-gray-400">
            {property.bedrooms && (
              <div className="flex items-center">
                <Bed className="h-4 w-4 mr-1" />
                <span>{property.bedrooms}</span>
              </div>
            )}
            {property.bathrooms && (
              <div className="flex items-center">
                <Bath className="h-4 w-4 mr-1" />
                <span>{property.bathrooms}</span>
              </div>
            )}
            {property.livingArea && (
              <div className="flex items-center">
                <Square className="h-4 w-4 mr-1" />
                <span>{property.livingArea.toLocaleString()} sqft</span>
              </div>
            )}
          </div>
        </div>

        {/* Price */}
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <DollarSign className="h-4 w-4 text-green-600 mr-1" />
            <span className="text-lg font-bold text-green-600">
              {getDisplayPrice()}
            </span>
          </div>
          
          {/* Status Badge */}
          <Badge variant="outline" className="text-xs border-blue-500/50 text-blue-400">
            {property.homeStatus === 'FOR_SALE' ? 'For Sale' : 'Available'}
          </Badge>
        </div>

        {/* Additional Info */}
        {(property.zestimate || property.yearBuilt) && (
          <div className="mt-3 pt-3 border-t border-gray-600">
            <div className="flex justify-between text-xs text-gray-400">
              {property.zestimate && (
                <span>Est. Value: {formatPrice(property.zestimate)}</span>
              )}
              {property.yearBuilt && (
                <span>Built: {property.yearBuilt}</span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}