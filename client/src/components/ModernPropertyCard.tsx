import { useState, useRef } from "react";
import { Heart, MapPin, Bed, Bath, Square, Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Property } from "@shared/schema";

// Extended property type to handle both database and API properties
interface PropertyCardData extends Partial<Property> {
  id: string | number;
  title?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  price?: number | string;
  rent?: number;
  bedrooms?: number;
  bathrooms?: number | string;
  squareFeet?: number;
  squareFootage?: number; // For RentCast API data
  propertyType?: string;
  allowsPets?: boolean;
  parkingSpaces?: number;
  createdAt?: string | Date;
  location?: string; // For API data
}

interface ModernPropertyCardProps {
  property: PropertyCardData;
  isSaved?: boolean;
  onSave?: () => void;
  isExploreMode?: boolean;
  matchReasons?: string[];
}

export default function ModernPropertyCard({
  property,
  isSaved = false,
  onSave,
  isExploreMode = false,
  matchReasons = [],
}: ModernPropertyCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isExploreMode || !cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setMousePosition({ x, y });
  };

  const handleMouseEnter = () => {
    if (isExploreMode) {
      setIsHovered(true);
    }
  };

  const handleMouseLeave = () => {
    if (isExploreMode) {
      setIsHovered(false);
      setMousePosition({ x: 0, y: 0 });
    }
  };

  const getTransform = () => {
    if (!isExploreMode || !isHovered || !cardRef.current) return "";

    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Calculate rotation based on mouse position (max 4 degrees)
    const rotateX = ((mousePosition.y - centerY) / centerY) * -3;
    const rotateY = ((mousePosition.x - centerX) / centerX) * 3;

    // Calculate elevation based on distance from center
    const distance = Math.sqrt(
      Math.pow(mousePosition.x - centerX, 2) +
        Math.pow(mousePosition.y - centerY, 2),
    );
    const maxDistance = Math.sqrt(centerX * centerX + centerY * centerY);
    const elevation = Math.max(0, (1 - distance / maxDistance) * 8);

    return `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(${elevation}px)`;
  };

  return (
    <div
      ref={cardRef}
      className={`bg-white rounded-xl overflow-hidden shadow-sm transition-all duration-300 group ${
        isExploreMode ? "transform-gpu" : ""
      } ${
        isExploreMode && isHovered
          ? "shadow-2xl shadow-blue-200/50"
          : "hover:shadow-lg"
      }`}
      style={{
        transform: getTransform(),
        transformStyle: "preserve-3d",
        transition:
          isExploreMode && isHovered
            ? "transform 0.1s ease-out, box-shadow 0.3s ease"
            : "transform 0.3s ease-out, box-shadow 0.3s ease",
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Property Image */}
      <div className="relative h-64 bg-gradient-to-br from-blue-50 to-blue-100">
        {/* Property Status Badge */}
        <div className="absolute top-4 left-4 z-10">
          <Badge className="bg-green-600 text-white text-xs font-medium px-3 py-1">
            For Sale
          </Badge>
        </div>

        {/* Perfect Match Badge for Explore Mode */}
        {isExploreMode && matchReasons.length > 0 && (
          <div className="absolute top-4 right-4 z-10">
            <Badge className="bg-gradient-to-r from-amber-400 to-yellow-500 text-white text-xs font-medium px-3 py-1 shadow-md">
              ✨ Perfect Match
            </Badge>
          </div>
        )}

        {/* Save Button */}
        <div className="absolute top-4 right-4 z-10">
          <Button
            variant="ghost"
            size="sm"
            onClick={onSave}
            className={`h-10 w-10 rounded-full bg-white/90 hover:bg-white transition-colors ${
              isSaved ? "text-red-500" : "text-gray-600"
            }`}
          >
            <Heart className={`h-4 w-4 ${isSaved ? "fill-current" : ""}`} />
          </Button>
        </div>

        {/* Property Image Placeholder */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-blue-400 text-8xl opacity-20">🏠</div>
        </div>

        {/* Property Details Overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
          <div className="flex items-center text-white text-sm mb-2">
            <div className="flex items-center bg-white/20 rounded-full px-2 py-1 mr-2">
              <Bed className="h-3 w-3 mr-1" />
              <span className="font-medium">{property.bedrooms}</span>
            </div>
            <div className="flex items-center bg-white/20 rounded-full px-2 py-1 mr-2">
              <Bath className="h-3 w-3 mr-1" />
              <span className="font-medium">{property.bathrooms}</span>
            </div>
            {(property.squareFeet || property.squareFootage) && (
              <div className="flex items-center bg-white/20 rounded-full px-2 py-1 mr-2">
                <Square className="h-3 w-3 mr-1" />
                <span className="font-medium">
                  {(
                    property.squareFeet || property.squareFootage
                  )?.toLocaleString()}
                </span>
                <span className="text-xs ml-1">Sq Ft</span>
              </div>
            )}
            {property.parkingSpaces && property.parkingSpaces > 0 && (
              <div className="flex items-center bg-white/20 rounded-full px-2 py-1">
                <Car className="h-3 w-3 mr-1" />
                <span className="font-medium">{property.parkingSpaces}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Property Content */}
      <div className="p-6">
        {/* Property Title and Location */}
        <div className="mb-4">
          <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
            {property.title}
          </h3>
          <div className="flex items-center text-gray-600 text-sm">
            <MapPin className="h-4 w-4 mr-1 text-blue-500" />
            <span>
              {property.location ||
                `${property.address}${property.city ? `, ${property.city}` : ""}${property.state ? `, ${property.state}` : ""} ${property.zipCode || ""}`}
            </span>
          </div>
        </div>

        {/* Added Date */}
        {property.createdAt && (
          <div className="text-xs text-gray-500 mb-3">
            Added:{" "}
            {new Date(property.createdAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>
        )}

        {/* Property Features Grid */}
        <div className="grid grid-cols-4 gap-4 mb-4 text-center">
          <div className="flex flex-col items-center">
            <div className="flex items-center text-gray-600 mb-1">
              <Bed className="h-4 w-4 mr-1" />
            </div>
            <span className="text-lg font-bold text-gray-900">
              {property.bedrooms}
            </span>
            <span className="text-xs text-gray-500">Bedrooms</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="flex items-center text-gray-600 mb-1">
              <Bath className="h-4 w-4 mr-1" />
            </div>
            <span className="text-lg font-bold text-gray-900">
              {property.bathrooms}
            </span>
            <span className="text-xs text-gray-500">Bathrooms</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="flex items-center text-gray-600 mb-1">
              <Square className="h-4 w-4 mr-1" />
            </div>
            <span className="text-lg font-bold text-gray-900">
              {property.squareFeet || property.squareFootage
                ? (
                    property.squareFeet || property.squareFootage
                  )?.toLocaleString()
                : "N/A"}
            </span>
            <span className="text-xs text-gray-500">Sq Ft</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="flex items-center text-gray-600 mb-1">
              <Car className="h-4 w-4 mr-1" />
            </div>
            <span className="text-lg font-bold text-gray-900">
              {property.parkingSpaces || 0}
            </span>
            <span className="text-xs text-gray-500">Garage</span>
          </div>
        </div>

        {/* Property Type and Status */}
        <div className="flex items-center gap-2 mb-4">
          <Badge
            variant="secondary"
            className="bg-blue-50 text-blue-700 border-blue-200"
          >
            {property.propertyType}
          </Badge>
          {property.isPremium && (
            <Badge className="bg-purple-100 text-purple-800">Premium</Badge>
          )}
          {property.allowsPets && (
            <Badge
              variant="outline"
              className="text-green-600 border-green-200"
            >
              Pet Friendly
            </Badge>
          )}
        </div>

        {/* Match Reasons for Explore Mode */}
        {isExploreMode && matchReasons.length > 0 && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-3 border border-green-200 mb-4">
            <h5 className="text-xs font-semibold text-green-800 mb-2 flex items-center">
              <span className="text-green-600 mr-1">✓</span>
              Why this is perfect for you
            </h5>
            <div className="text-xs text-green-700 space-y-1">
              {matchReasons.map((reason, index) => (
                <div key={index} className="flex items-center">
                  <span className="text-green-600 mr-1">•</span>
                  {reason}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Price and Actions */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold text-green-600">
              {formatPrice(property.rent || Number(property.price) || 0)}
            </div>
            <div className="text-sm text-gray-500">
              {property.rent ? "per month" : "For Sale"}
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-blue-600 border-blue-200 hover:bg-blue-50"
            >
              View Details
            </Button>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
              Contact
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
