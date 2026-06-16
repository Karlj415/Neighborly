import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, Clock, Heart, MapPin, Bed, Bath, Square, Car, Wifi, Package, Dumbbell, Trash2, Star, Phone, MessageSquare, Calendar as CalendarIcon, CheckCircle } from "lucide-react";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { Property } from "@shared/schema";

export default function PropertyDetails() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");

  const { data: property, isLoading, error } = useQuery({
    queryKey: ['/api/properties', id],
    enabled: !!id,
  });

  const { data: membership } = useQuery({
    queryKey: ['/api/membership'],
    enabled: isAuthenticated,
  });

  const { data: savedProperties } = useQuery({
    queryKey: ['/api/saved-properties'],
    enabled: isAuthenticated,
  });

  const isSaved = savedProperties?.some((saved: any) => saved.property.id === parseInt(id as string));

  // Easy Apply mutation
  const easyApplyMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/applications/easy-apply/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Application Submitted!",
        description: "Your application has been submitted successfully. You'll hear back within 24-48 hours.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/applications'] });
      // Also invalidate application check queries to refresh status
      queryClient.invalidateQueries({ queryKey: ['/api/applications/check'] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Please Log In",
          description: "You need to be logged in to apply for properties.",
          variant: "destructive",
        });
        setLocation("/login");
        return;
      }
      toast({
        title: "Application Failed",
        description: "Failed to submit application. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Save Property mutation
  const savePropertyMutation = useMutation({
    mutationFn: async () => {
      if (isSaved) {
        await apiRequest("DELETE", `/api/saved-properties/${id}`);
      } else {
        await apiRequest("POST", "/api/saved-properties", { propertyId: parseInt(id as string) });
      }
    },
    onSuccess: () => {
      toast({
        title: isSaved ? "Property Removed" : "Property Saved",
        description: isSaved ? "Removed from your saved properties" : "Added to your saved properties",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/saved-properties'] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Please Log In",
          description: "You need to be logged in to save properties.",
          variant: "destructive",
        });
        setLocation("/login");
        return;
      }
      toast({
        title: "Save Failed",
        description: "Failed to save property. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Schedule Viewing mutation
  const scheduleViewingMutation = useMutation({
    mutationFn: async ({ date, time }: { date: string; time: string }) => {
      await apiRequest("POST", "/api/viewings", {
        propertyId: parseInt(id as string),
        viewingType: "in_person",
        scheduledDate: new Date(`${date} ${time}`),
        duration: 30,
        status: "scheduled"
      });
    },
    onSuccess: () => {
      toast({
        title: "Viewing Scheduled!",
        description: "Your property viewing has been scheduled successfully.",
      });
      setShowScheduleModal(false);
      queryClient.invalidateQueries({ queryKey: ['/api/viewings'] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Please Log In",
          description: "You need to be logged in to schedule viewings.",
          variant: "destructive",
        });
        setLocation("/login");
        return;
      }
      toast({
        title: "Scheduling Failed",
        description: "Failed to schedule viewing. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (isLoading || isAuthLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="h-screen flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Property Not Found</h1>
          <p className="text-gray-600 mb-6">The property you're looking for doesn't exist.</p>
          <Button onClick={() => setLocation("/")}>Back to Search</Button>
        </div>
      </div>
    );
  }

  const isPremium = property.isPremium;
  const isOffMarket = property.isOffMarket;
  const canAccessEarly = membership?.status === 'active';

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl bg-background text-foreground">
      {/* Property Header */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">{property.title}</h1>
            <div className="flex items-center text-muted-foreground mb-2">
              <MapPin className="h-4 w-4 mr-1" />
              <span>{property.address}, {property.city}, {property.state} {property.zipCode}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {isPremium && (
                <Badge variant="secondary" className="bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  <Star className="h-3 w-3 mr-1" />
                  Premium
                </Badge>
              )}
              {isOffMarket && (
                <Badge variant="outline" className="border-orange-500/40 text-orange-300">
                  Off-Market
                </Badge>
              )}
              {canAccessEarly && isOffMarket && (
                <Badge className="bg-green-500/20 text-green-300 border border-green-500/30">
                  Early Access
                </Badge>
              )}
            </div>
          </div>
          <div className="text-right mt-4 md:mt-0">
            <div className="text-3xl font-bold text-blue-400">${property.rent?.toLocaleString()}/mo</div>
            {property.deposit && (
              <div className="text-sm text-muted-foreground">${property.deposit.toLocaleString()} deposit</div>
            )}
          </div>
        </div>

        {/* Property Stats */}
        <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
          <div className="flex items-center">
            <Bed className="h-4 w-4 mr-1" />
            <span>{property.bedrooms} bed{property.bedrooms !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex items-center">
            <Bath className="h-4 w-4 mr-1" />
            <span>{property.bathrooms} bath{property.bathrooms !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex items-center">
            <Square className="h-4 w-4 mr-1" />
            <span>{property.squareFootage?.toLocaleString()} sq ft</span>
          </div>
          {property.parking && (
            <div className="flex items-center">
              <Car className="h-4 w-4 mr-1" />
              <span>Parking</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-6">
          {/* Property Image */}
          <Card className="bg-card border-border">
            <CardContent className="p-0">
              <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                <img 
                  src={property.imageUrl || "/api/placeholder/800/450"} 
                  alt={property.title}
                  className="w-full h-full object-cover"
                />
              </div>
            </CardContent>
          </Card>

          {/* Description */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>About This Property</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">
                {property.description || "Beautiful property in a great location with modern amenities and easy access to transportation."}
              </p>
            </CardContent>
          </Card>

          {/* Amenities */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Amenities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {property.amenities?.map((amenity, index) => (
                  <div key={index} className="flex items-center text-sm text-muted-foreground">
                    <CheckCircle className="h-4 w-4 mr-2 text-green-400" />
                    {amenity}
                  </div>
                )) || (
                  <>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Wifi className="h-4 w-4 mr-2 text-green-400" />
                      WiFi Included
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Package className="h-4 w-4 mr-2 text-green-400" />
                      Package Service
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Dumbbell className="h-4 w-4 mr-2 text-green-400" />
                      Fitness Center
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Trash2 className="h-4 w-4 mr-2 text-green-400" />
                      Waste Management
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Action Buttons */}
          <Card>
            <CardContent className="p-6 space-y-4">
              {isAuthenticated ? (
                <>
                  <Button 
                    onClick={() => easyApplyMutation.mutate()}
                    disabled={easyApplyMutation.isPending}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    size="lg"
                  >
                    {easyApplyMutation.isPending ? "Submitting..." : "Easy Apply"}
                  </Button>
                  
                  <Dialog open={showScheduleModal} onOpenChange={setShowScheduleModal}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full" size="lg">
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        Schedule Viewing
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Schedule a Viewing</DialogTitle>
                        <DialogDescription>
                          Choose your preferred date and time to view this property.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Date</label>
                          <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            className="w-full p-2 border border-gray-300 rounded-md"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Time</label>
                          <select
                            value={selectedTime}
                            onChange={(e) => setSelectedTime(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-md"
                          >
                            <option value="">Select a time</option>
                            <option value="09:00">9:00 AM</option>
                            <option value="10:00">10:00 AM</option>
                            <option value="11:00">11:00 AM</option>
                            <option value="14:00">2:00 PM</option>
                            <option value="15:00">3:00 PM</option>
                            <option value="16:00">4:00 PM</option>
                            <option value="17:00">5:00 PM</option>
                          </select>
                        </div>
                        <Button 
                          onClick={() => selectedDate && selectedTime && scheduleViewingMutation.mutate({ date: selectedDate, time: selectedTime })}
                          disabled={!selectedDate || !selectedTime || scheduleViewingMutation.isPending}
                          className="w-full"
                        >
                          {scheduleViewingMutation.isPending ? "Scheduling..." : "Schedule Viewing"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Button 
                    variant="outline" 
                    onClick={() => savePropertyMutation.mutate()}
                    disabled={savePropertyMutation.isPending}
                    className="w-full"
                    size="lg"
                  >
                    <Heart className={`h-4 w-4 mr-2 ${isSaved ? 'fill-red-500 text-red-500' : ''}`} />
                    {isSaved ? "Saved" : "Save Property"}
                  </Button>
                </>
              ) : (
                <div className="text-center space-y-4">
                  <p className="text-sm text-gray-600">Log in to apply and save properties</p>
                  <Button onClick={() => setLocation("/login")} className="w-full bg-blue-600 hover:bg-blue-700">
                    Log In to Apply
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contact Info */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center">
                <Phone className="h-4 w-4 mr-3 text-gray-500" />
                <span className="text-sm">(555) 123-4567</span>
              </div>
              <div className="flex items-center">
                <MessageSquare className="h-4 w-4 mr-3 text-gray-500" />
                <span className="text-sm">Message Agent</span>
              </div>
              <Separator />
              <div className="text-xs text-gray-500">
                <p>Property managed by BuildEstate</p>
                <p>Response time: Usually within 2 hours</p>
              </div>
            </CardContent>
          </Card>

          {/* Property Details */}
          <Card>
            <CardHeader>
              <CardTitle>Property Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Property Type</span>
                <span className="font-medium">{property.propertyType || 'Apartment'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Available</span>
                <span className="font-medium">{property.availableDate ? new Date(property.availableDate).toLocaleDateString() : 'Now'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Lease Term</span>
                <span className="font-medium">12+ months</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Pets</span>
                <span className="font-medium">{property.allowsPets ? 'Allowed' : 'Not Allowed'}</span>
              </div>
              {property.petDeposit && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Pet Deposit</span>
                  <span className="font-medium">${property.petDeposit}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}