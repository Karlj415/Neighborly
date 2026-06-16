import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { X, Upload, DollarSign, Users, Calendar, Shield } from 'lucide-react';

interface CreateMasterLeaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const commonAmenities = [
  'Parking', 'Laundry', 'Pet-Friendly', 'Gym', 'Pool', 'WiFi',
  'Air Conditioning', 'Dishwasher', 'Balcony', 'Storage', 'Security'
];

export default function CreateMasterLeaseModal({ isOpen, onClose }: CreateMasterLeaseModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    propertyAddress: '',
    rent: '',
    bedrooms: '',
    bathrooms: '',
    squareFootage: '',
    maxTenants: '',
    pricePerRoom: '',
    securityDeposit: '',
    leaseStartDate: '',
    leaseDurationMonths: '12',
    description: '',
    amenities: [] as string[],
    stripeAccountId: '',
    dwollaAccountId: '',
    achAccountId: ''
  });

  const [selectedImages, setSelectedImages] = useState<string[]>([]);

  const createListingMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('POST', '/api/master-lease/listings', data);
    },
    onSuccess: () => {
      toast({
        title: "Master Lease Listed",
        description: "Your property has been successfully listed for roommate matching.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/master-lease/listings'] });
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error Creating Listing",
        description: error.message || "Failed to create master lease listing",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.propertyAddress || !formData.rent || !formData.maxTenants || !formData.pricePerRoom || !formData.securityDeposit) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    createListingMutation.mutate({
      ...formData,
      rent: parseFloat(formData.rent),
      bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : null,
      bathrooms: formData.bathrooms ? parseInt(formData.bathrooms) : null,
      squareFootage: formData.squareFootage ? parseInt(formData.squareFootage) : null,
      maxTenants: parseInt(formData.maxTenants),
      pricePerRoom: parseFloat(formData.pricePerRoom),
      securityDeposit: parseFloat(formData.securityDeposit),
      leaseDurationMonths: parseInt(formData.leaseDurationMonths),
      leaseStartDate: formData.leaseStartDate || null,
      propertyImages: selectedImages
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64String = event.target?.result as string;
          setSelectedImages(prev => [...prev, base64String]);
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const toggleAmenity = (amenity: string) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  const handleClose = () => {
    setFormData({
      propertyAddress: '',
      rent: '',
      bedrooms: '',
      bathrooms: '',
      squareFootage: '',
      maxTenants: '',
      pricePerRoom: '',
      securityDeposit: '',
      leaseStartDate: '',
      leaseDurationMonths: '12',
      description: '',
      amenities: [],
      stripeAccountId: '',
      dwollaAccountId: '',
      achAccountId: ''
    });
    setSelectedImages([]);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-screen overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Users className="w-5 h-5 mr-2 text-blue-600" />
            Create Master Lease Listing
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Property Address */}
          <div>
            <Label htmlFor="propertyAddress">Property Address *</Label>
            <Input
              id="propertyAddress"
              value={formData.propertyAddress}
              onChange={(e) => setFormData(prev => ({ ...prev, propertyAddress: e.target.value }))}
              placeholder="123 Main St, Dallas, TX 75201"
              required
            />
          </div>

          {/* Basic Property Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="bedrooms">Bedrooms</Label>
              <Input
                id="bedrooms"
                type="number"
                min="1"
                value={formData.bedrooms}
                onChange={(e) => setFormData(prev => ({ ...prev, bedrooms: e.target.value }))}
                placeholder="3"
              />
            </div>
            <div>
              <Label htmlFor="bathrooms">Bathrooms</Label>
              <Input
                id="bathrooms"
                type="number"
                min="1"
                step="0.5"
                value={formData.bathrooms}
                onChange={(e) => setFormData(prev => ({ ...prev, bathrooms: e.target.value }))}
                placeholder="2"
              />
            </div>
            <div>
              <Label htmlFor="squareFootage">Square Footage</Label>
              <Input
                id="squareFootage"
                type="number"
                min="1"
                value={formData.squareFootage}
                onChange={(e) => setFormData(prev => ({ ...prev, squareFootage: e.target.value }))}
                placeholder="1200"
              />
            </div>
            <div>
              <Label htmlFor="maxTenants">Max Tenants *</Label>
              <Input
                id="maxTenants"
                type="number"
                min="1"
                max="10"
                value={formData.maxTenants}
                onChange={(e) => setFormData(prev => ({ ...prev, maxTenants: e.target.value }))}
                placeholder="4"
                required
              />
            </div>
          </div>

          {/* Financial Details */}
          <div className="bg-blue-50 p-4 rounded-lg space-y-4">
            <h3 className="font-semibold text-blue-900 flex items-center">
              <DollarSign className="w-4 h-4 mr-2" />
              Financial Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="rent">Total Monthly Rent *</Label>
                <Input
                  id="rent"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.rent}
                  onChange={(e) => setFormData(prev => ({ ...prev, rent: e.target.value }))}
                  placeholder="2400.00"
                  required
                />
              </div>
              <div>
                <Label htmlFor="pricePerRoom">Price Per Room *</Label>
                <Input
                  id="pricePerRoom"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.pricePerRoom}
                  onChange={(e) => setFormData(prev => ({ ...prev, pricePerRoom: e.target.value }))}
                  placeholder="600.00"
                  required
                />
              </div>
              <div>
                <Label htmlFor="securityDeposit">Security Deposit *</Label>
                <Input
                  id="securityDeposit"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.securityDeposit}
                  onChange={(e) => setFormData(prev => ({ ...prev, securityDeposit: e.target.value }))}
                  placeholder="2000.00"
                  required
                />
              </div>
            </div>
          </div>

          {/* Lease Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="leaseStartDate">Lease Start Date</Label>
              <Input
                id="leaseStartDate"
                type="date"
                value={formData.leaseStartDate}
                onChange={(e) => setFormData(prev => ({ ...prev, leaseStartDate: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="leaseDurationMonths">Lease Duration (months)</Label>
              <Input
                id="leaseDurationMonths"
                type="number"
                min="1"
                max="36"
                value={formData.leaseDurationMonths}
                onChange={(e) => setFormData(prev => ({ ...prev, leaseDurationMonths: e.target.value }))}
                placeholder="12"
              />
            </div>
          </div>

          {/* Payment Accounts */}
          <div className="bg-green-50 p-4 rounded-lg space-y-4">
            <h3 className="font-semibold text-green-900 flex items-center">
              <Shield className="w-4 h-4 mr-2" />
              Payment Account Setup (Optional)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="stripeAccountId">Stripe Account ID</Label>
                <Input
                  id="stripeAccountId"
                  value={formData.stripeAccountId}
                  onChange={(e) => setFormData(prev => ({ ...prev, stripeAccountId: e.target.value }))}
                  placeholder="acct_1234567890"
                />
              </div>
              <div>
                <Label htmlFor="dwollaAccountId">Dwolla Account ID</Label>
                <Input
                  id="dwollaAccountId"
                  value={formData.dwollaAccountId}
                  onChange={(e) => setFormData(prev => ({ ...prev, dwollaAccountId: e.target.value }))}
                  placeholder="dwolla-account-id"
                />
              </div>
              <div>
                <Label htmlFor="achAccountId">ACH Account Info</Label>
                <Input
                  id="achAccountId"
                  value={formData.achAccountId}
                  onChange={(e) => setFormData(prev => ({ ...prev, achAccountId: e.target.value }))}
                  placeholder="Routing & Account #"
                />
              </div>
            </div>
          </div>

          {/* Amenities */}
          <div>
            <Label>Amenities</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {commonAmenities.map((amenity) => (
                <Badge
                  key={amenity}
                  variant={formData.amenities.includes(amenity) ? "default" : "outline"}
                  className={`cursor-pointer ${formData.amenities.includes(amenity) 
                    ? 'bg-blue-600 text-white' : 'hover:bg-blue-50'
                  }`}
                  onClick={() => toggleAmenity(amenity)}
                >
                  {amenity}
                </Badge>
              ))}
            </div>
          </div>

          {/* Property Images */}
          <div>
            <Label htmlFor="images">Property Images</Label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <input
                type="file"
                id="images"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
              />
              <label
                htmlFor="images"
                className="cursor-pointer text-blue-600 hover:text-blue-800"
              >
                Click to upload images
              </label>
            </div>
            
            {selectedImages.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-4">
                {selectedImages.map((image, index) => (
                  <div key={index} className="relative">
                    <img
                      src={image}
                      alt={`Property ${index + 1}`}
                      className="w-full h-24 object-cover rounded border"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Property Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe your property, neighborhood, and what makes it special for roommate living..."
              rows={4}
            />
          </div>

          {/* Blockchain Security Notice */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <Shield className="w-5 h-5 mr-2 text-amber-600" />
              <span className="font-semibold text-amber-800">Smart Contract Protection</span>
            </div>
            <p className="text-sm text-amber-700">
              Security deposits will be held in a blockchain smart contract for transparent escrow management. 
              Funds are automatically released upon lease completion or can be disputed through our secure system.
            </p>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-4 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={createListingMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={createListingMutation.isPending}
            >
              {createListingMutation.isPending ? 'Creating...' : 'Create Master Lease Listing'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}