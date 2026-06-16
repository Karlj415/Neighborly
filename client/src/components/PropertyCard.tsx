import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Home, 
  Bed, 
  Bath, 
  Square, 
  FileText, 
  Edit, 
  Trash2,
  MapPin,
  Calendar,
  DollarSign,
  MessageCircle,
  Share2
} from "lucide-react";
import { PropertyListing } from "@shared/schema";

interface PropertyCardProps {
  listing: PropertyListing;
  user: any;
  onEdit: (listing: PropertyListing) => void;
  onDelete: (id: number) => void;
  onShare?: (listing: PropertyListing) => void;
  onClick: (listing: PropertyListing) => void;
  userDocuments?: any[];
  onApply?: (listing: PropertyListing) => void;
  appliedProperties?: Set<number>;
}

export default function PropertyCard({ listing, user, onEdit, onDelete, onShare, onClick, userDocuments = [], onApply, appliedProperties }: PropertyCardProps) {
  // Safety check - return null if listing is undefined
  if (!listing) {
    return null;
  }
  
  // Ensure images is always an array, handle both undefined and null cases
  const images = Array.isArray(listing?.images) ? listing.images : [];
  
  // Create a safe listing object with guaranteed images array
  const safeListing = {
    ...listing,
    images: images
  };
  const formatDate = (dateString: string | Date) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Recently';
      }
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }).format(date);
    } catch {
      return 'Recently';
    }
  };

  const formatCurrency = (amount: any) => {
    const num = parseFloat(amount) || 0;
    return num.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  };

  // Check if user has all required documents
  const checkDocumentRequirements = () => {
    if (!listing.requiredDocuments || listing.requiredDocuments.length === 0) {
      return { hasAllDocuments: true, missingDocuments: [] };
    }

    const missingDocuments = listing.requiredDocuments.filter(requiredDoc => {
      const userDoc = userDocuments.find(doc => doc.documentType === requiredDoc);
      return !userDoc || userDoc.isDeclined || !userDoc.isVerified;
    });

    return {
      hasAllDocuments: missingDocuments.length === 0,
      missingDocuments
    };
  };

  const { hasAllDocuments, missingDocuments } = checkDocumentRequirements();
  const isOwnListing = user?.id?.toString() === listing.userId?.toString();

  return (
    <Card 
      className="bg-gray-800 border-gray-600 hover:shadow-2xl hover:shadow-primary/20 transition-all duration-300 overflow-hidden cursor-pointer rounded-xl relative"
      onClick={() => onClick(listing)}
    >
      {/* Action buttons in top-right corner */}
      <div className="absolute top-3 right-3 z-10 flex gap-2">
        {/* Share button - Always show for all users */}
        <button
          className="w-8 h-8 bg-blue-500 bg-opacity-90 hover:bg-opacity-100 rounded-full shadow-lg border border-blue-300 flex items-center justify-center transition-all"
          onClick={(e) => {
            e.stopPropagation();
            onShare?.(listing);
          }}
        >
          <Share2 className="h-4 w-4 text-white" />
        </button>
        
        {/* Edit/Delete buttons - Only show for property owner */}
        {user && listing.userId === String(user.id) && (
          <>
            <button
              className="w-8 h-8 bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full shadow-lg border border-gray-200 flex items-center justify-center transition-all"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(listing);
              }}
            >
              <Edit className="h-4 w-4 text-gray-600" />
            </button>
            <button
              className="w-8 h-8 bg-red-500 bg-opacity-90 hover:bg-opacity-100 rounded-full shadow-lg border border-red-300 flex items-center justify-center transition-all"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(listing.id);
              }}
            >
              <Trash2 className="h-4 w-4 text-white" />
            </button>
          </>
        )}
      </div>



      <div className="flex flex-col md:flex-row h-full">
        {/* Left Side - Image Carousel */}
        <div className="w-full md:w-1/2 relative h-48 md:h-auto">
          {safeListing.images && safeListing.images.length > 0 ? (
            <div className="h-full bg-gray-100 flex items-center justify-center">
              <img 
                src={safeListing.images[0]} 
                alt="Property" 
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement!.innerHTML = `
                    <div class="flex items-center justify-center h-full bg-gray-100">
                      <div class="text-gray-400"><svg class="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4"></path></svg></div>
                    </div>
                  `;
                }}
              />
              {safeListing.images.length > 1 && (
                <div className="absolute bottom-2 right-2 bg-gray-800 bg-opacity-90 text-white px-2 py-1 rounded text-xs">
                  +{safeListing.images.length - 1} more
                </div>
              )}
            </div>
          ) : (
            <div className="h-full bg-gray-100 flex items-center justify-center">
              <Home className="h-12 w-12 text-gray-400" />
            </div>
          )}
        </div>

        {/* Right Side - Property Information */}
        <div className="w-full md:w-1/2 p-4 md:p-6 flex flex-col justify-between">
          {/* Property Details */}
          <div>
            {/* Price */}
            <div className="flex items-center gap-2 mb-2 md:mb-3">
              <span className="text-xl md:text-2xl font-bold text-green-400">
                {formatCurrency(listing.monthlyRent || 0)}
              </span>
              <span className="text-gray-300 text-sm md:text-base">/month</span>
            </div>

            {/* Address */}
            <div className="flex items-start gap-2 mb-2 md:mb-3">
              <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-white leading-tight line-clamp-1">
                  {listing.address || 'No address provided'}
                </h4>
                <p className="text-xs md:text-sm text-gray-300">
                  {listing.city && listing.state ? `${listing.city}, ${listing.state}` : 'Location not specified'}
                </p>
              </div>
            </div>

            {/* Property Stats */}
            <div className="flex items-center gap-3 md:gap-4 mb-2 md:mb-3 text-xs md:text-sm text-gray-300">
              <div className="flex items-center gap-1">
                <Bed className="h-4 w-4" />
                {listing.bedrooms || 0} bed
              </div>
              <div className="flex items-center gap-1">
                <Bath className="h-4 w-4" />
                {listing.bathrooms || 0} bath
              </div>
              <div className="flex items-center gap-1">
                <Square className="h-4 w-4" />
                {listing.squareFeet || 'N/A'} sq ft
              </div>
            </div>

            {/* Property Type and Lease */}
            <div className="flex gap-2 mb-2 md:mb-3 flex-wrap">
              <Badge variant="secondary" className="text-[10px] md:text-xs">
                {listing.propertyType || 'Property'}
              </Badge>
              <Badge variant="outline" className="text-[10px] md:text-xs">
                {listing.leaseLengthMonths || 12} month lease
              </Badge>
              {listing.isPetFriendly && (
                <Badge variant="outline" className="text-[10px] md:text-xs bg-green-50 text-green-700 border-green-200">
                  🐕 Pet Friendly
                </Badge>
              )}
            </div>

            {/* Required Documents */}
            {listing.requiredDocuments && listing.requiredDocuments.length > 0 && (
              <div className="flex items-center gap-2 mb-2 md:mb-3">
                <FileText className="h-4 w-4 text-gray-400" />
                <span className="text-xs md:text-sm text-gray-300">
                  {listing.requiredDocuments.length} document{listing.requiredDocuments.length !== 1 ? 's' : ''} required
                </span>
              </div>
            )}

            {/* Amenities */}
            <div className="flex gap-1 flex-wrap mb-2 md:mb-3">
              {listing.hasWasherDryer && (
                <Badge variant="outline" className="text-[10px] md:text-xs bg-blue-50 text-blue-700 border-blue-200">
                  🧺 W/D
                </Badge>
              )}
              {listing.hasParkingGarage && (
                <Badge variant="outline" className="text-[10px] md:text-xs bg-purple-50 text-purple-700 border-purple-200">
                  🚗 Parking
                </Badge>
              )}
              {listing.hasGym && (
                <Badge variant="outline" className="text-[10px] md:text-xs bg-orange-50 text-orange-700 border-orange-200">
                  💪 Gym
                </Badge>
              )}
              {listing.hasSwimmingPool && (
                <Badge variant="outline" className="text-[10px] md:text-xs bg-cyan-50 text-cyan-700 border-cyan-200">
                  🏊 Pool
                </Badge>
              )}
            </div>
          </div>

          {/* Bottom Section */}
          <div>
            {/* Listed by and date */}
            <div className="flex items-center justify-between mb-2 md:mb-3 text-xs md:text-sm text-gray-300">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>Listed {listing.createdAt ? formatDate(listing.createdAt) : 'Recently'}</span>
              </div>
              <span>
                by {(listing as any).user?.firstName || 'Unknown'} {(listing as any).user?.lastName || ''}
              </span>
            </div>

            {/* Apply button or Missing documents (only for non-owners) */}
            {!isOwnListing && listing.requiredDocuments && listing.requiredDocuments.length > 0 && (
              <div className="mt-2 md:mt-3">
                {(() => {
                  const hasApplied = appliedProperties?.has(listing.id);
                  
                  if (hasApplied) {
                    return (
                      <Button 
                        disabled
                        className="w-full bg-gray-600 text-gray-300 cursor-not-allowed h-9 md:h-10"
                        size="sm"
                      >
                        ✓ Applied
                      </Button>
                    );
                  }
                  
                  if (hasAllDocuments) {
                    return (
                      <Button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onApply?.(listing);
                        }}
                        className="w-full bg-green-600 hover:bg-green-700 text-white h-9 md:h-10"
                        size="sm"
                      >
                        Apply to Property
                      </Button>
                    );
                  }
                  
                  return (
                    <div className="w-full p-2 bg-red-500/20 border border-red-500/30 rounded-md">
                      <div className="flex items-center justify-center gap-2">
                        <FileText className="h-4 w-4 text-red-400" />
                        <span className="text-red-400 text-xs md:text-sm font-medium">
                          Missing {missingDocuments.length} required document{missingDocuments.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}


          </div>
        </div>
      </div>
    </Card>
  );
}