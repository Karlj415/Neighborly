import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Users, DollarSign, MapPin, Calendar, Shield } from 'lucide-react';
import CreateMasterLeaseModal from '@/components/CreateMasterLeaseModal';
import ApplyMasterLeaseModal from '@/components/ApplyMasterLeaseModal';

interface MasterLeaseListing {
  id: number;
  landlordUserId: string;
  propertyAddress: string;
  rent: number;
  bedrooms: number | null;
  bathrooms: number | null;
  squareFootage: number | null;
  maxTenants: number;
  pricePerRoom: number;
  securityDeposit: number;
  leaseStartDate: string | null;
  leaseDurationMonths: number;
  description: string | null;
  amenities: string[];
  propertyImages: string[];
  status: string;
  stripeAccountId: string | null;
  dwollaAccountId: string | null;
  achAccountId: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function MasterLease() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState<MasterLeaseListing | null>(null);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);

  // Fetch all master lease listings
  const { data: listings = [], isLoading } = useQuery({
    queryKey: ['/api/master-lease/listings'],
    enabled: !!user
  });

  // Apply for master lease mutation
  const applyMutation = useMutation({
    mutationFn: async ({ masterLeaseId, groupId }: { masterLeaseId: number; groupId: string }) => {
      return apiRequest('POST', '/api/master-lease/applications', {
        masterLeaseId,
        groupId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/master-lease/listings'] });
      setIsApplyModalOpen(false);
      setSelectedListing(null);
    }
  });

  const handleApplyClick = (listing: MasterLeaseListing) => {
    setSelectedListing(listing);
    setIsApplyModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Master Lease Matching</h1>
            <p className="text-gray-600 mt-2">
              Find compatible roommates through landlord-managed units with shared lease agreements
            </p>
          </div>
          
          <Button 
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            List Property
          </Button>
        </div>

        {/* Master Lease Listings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((listing: MasterLeaseListing) => (
            <Card key={listing.id} className="hover:shadow-lg transition-shadow border border-gray-200">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg font-semibold text-gray-900">
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 mr-1 text-gray-500" />
                      {listing.propertyAddress}
                    </div>
                  </CardTitle>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    {listing.status}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Property Images */}
                {listing.propertyImages.length > 0 && (
                  <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                    <img 
                      src={listing.propertyImages[0]} 
                      alt="Property" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Property Details */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center">
                    <Users className="w-4 h-4 mr-1 text-blue-600" />
                    <span>{listing.maxTenants} Max Tenants</span>
                  </div>
                  <div className="flex items-center">
                    <DollarSign className="w-4 h-4 mr-1 text-green-600" />
                    <span>${listing.pricePerRoom}/room</span>
                  </div>
                  {listing.bedrooms && (
                    <div className="text-gray-600">
                      {listing.bedrooms} bed / {listing.bathrooms} bath
                    </div>
                  )}
                  {listing.squareFootage && (
                    <div className="text-gray-600">
                      {listing.squareFootage} sq ft
                    </div>
                  )}
                </div>

                {/* Total Rent and Security Deposit */}
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-blue-700">Total Monthly Rent:</span>
                    <span className="font-semibold text-blue-900">${listing.rent}</span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-sm text-blue-700">Security Deposit:</span>
                    <span className="font-medium text-blue-900">${listing.securityDeposit}</span>
                  </div>
                </div>

                {/* Blockchain Security Badge */}
                <div className="flex items-center justify-center bg-amber-50 border border-amber-200 rounded-lg p-2">
                  <Shield className="w-4 h-4 mr-2 text-amber-600" />
                  <span className="text-sm text-amber-800 font-medium">
                    Deposit Held in Smart Contract
                  </span>
                </div>

                {/* Lease Details */}
                {listing.leaseStartDate && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="w-4 h-4 mr-1" />
                    Lease starts: {new Date(listing.leaseStartDate).toLocaleDateString()}
                  </div>
                )}

                {/* Amenities */}
                {listing.amenities.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Amenities:</h4>
                    <div className="flex flex-wrap gap-1">
                      {listing.amenities.slice(0, 3).map((amenity, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {amenity}
                        </Badge>
                      ))}
                      {listing.amenities.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{listing.amenities.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Description */}
                {listing.description && (
                  <p className="text-sm text-gray-600 line-clamp-3">
                    {listing.description}
                  </p>
                )}

                {/* Apply Button */}
                <Button 
                  onClick={() => handleApplyClick(listing)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={applyMutation.isPending}
                >
                  {applyMutation.isPending ? 'Applying...' : 'Apply with Roommate Group'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {listings.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Master Lease Listings Yet</h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              Be the first to create a master lease listing and help tenants find compatible roommates.
            </p>
            <Button 
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Listing
            </Button>
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateMasterLeaseModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
      
      <ApplyMasterLeaseModal 
        isOpen={isApplyModalOpen}
        onClose={() => setIsApplyModalOpen(false)}
        listing={selectedListing}
      />
    </div>
  );
}