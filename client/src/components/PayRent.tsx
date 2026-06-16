import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Home, MapPin, DollarSign, Calendar } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface RentalProperty {
  relationshipId: number;
  landlordId: string;
  monthlyRent: number;
  leaseStartDate: string;
  leaseEndDate: string;
  relationshipStatus: string;
  propertyId: number;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  propertyType: string;
  images: string[];
}

export default function PayRent() {
  const { user } = useAuth();

  const { data: rentalProperty, isLoading, error } = useQuery<RentalProperty>({
    queryKey: ["/api/tenant/rental-property"],
    enabled: !!user,
  });

  // Don't show the section if user has no active rental property
  if (!user || isLoading || error || !rentalProperty) {
    return null;
  }

  const propertyImage = rentalProperty.images?.[0] || "/hero-property.png";
  const fullAddress = `${rentalProperty.address}, ${rentalProperty.city}, ${rentalProperty.state} ${rentalProperty.zipCode}`;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Home className="h-6 w-6 text-blue-400" />
        <h2 className="text-2xl font-bold text-white">Pay Rent</h2>
      </div>

      <Card className="bg-gray-800 border-gray-700 hover:border-gray-600 transition-colors">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Property Image */}
            <div className="md:w-1/3">
              <img
                src={propertyImage}
                alt="Your rental property"
                className="w-full h-48 object-cover rounded-lg"
              />
            </div>

            {/* Property Details */}
            <div className="md:w-2/3 space-y-4">
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  Your Rental Property
                </h3>
                <div className="flex items-center gap-2 text-gray-300 mb-3">
                  <MapPin className="h-4 w-4" />
                  <span>{fullAddress}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="text-center bg-gray-700 rounded-lg p-3">
                  <div className="text-gray-400">Bedrooms</div>
                  <div className="text-white font-semibold">{rentalProperty.bedrooms}</div>
                </div>
                <div className="text-center bg-gray-700 rounded-lg p-3">
                  <div className="text-gray-400">Bathrooms</div>
                  <div className="text-white font-semibold">{rentalProperty.bathrooms}</div>
                </div>
                <div className="text-center bg-gray-700 rounded-lg p-3">
                  <div className="text-gray-400">Sq Ft</div>
                  <div className="text-white font-semibold">
                    {rentalProperty.squareFeet?.toLocaleString() || "N/A"}
                  </div>
                </div>
                <div className="text-center bg-gray-700 rounded-lg p-3">
                  <div className="text-gray-400">Type</div>
                  <div className="text-white font-semibold">{rentalProperty.propertyType}</div>
                </div>
              </div>

              {/* Lease Info */}
              <div className="flex flex-wrap gap-4 items-center">
                <Badge variant="outline" className="bg-blue-500/20 border-blue-400 text-blue-300">
                  <DollarSign className="h-3 w-3 mr-1" />
                  {formatCurrency(Number(rentalProperty.monthlyRent))} / month
                </Badge>
                <Badge variant="outline" className="bg-green-500/20 border-green-400 text-green-300">
                  <Calendar className="h-3 w-3 mr-1" />
                  Lease until {formatDate(rentalProperty.leaseEndDate)}
                </Badge>
              </div>

              {/* Pay Rent Button */}
              <div className="pt-4">
                <Button 
                  className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8"
                  onClick={() => {
                    // TODO: Implement Stripe payment integration
                    console.log("Pay rent clicked for property:", rentalProperty.propertyId);
                  }}
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  Pay Rent - {formatCurrency(Number(rentalProperty.monthlyRent))}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}