import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, Clock, MapPin, Bed, Bath, Square, Eye, Video, Users, Star, XCircle, CheckCircle, AlertCircle, Phone } from "lucide-react";
import { format, isBefore, isToday, isTomorrow } from "date-fns";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { Viewing, Property } from "@shared/schema";

interface ViewingWithProperty extends Viewing {
  property: Property;
}

export default function Viewings() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedViewing, setSelectedViewing] = useState<ViewingWithProperty | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const { data: viewings, isLoading } = useQuery({
    queryKey: ['/api/viewings'],
    enabled: isAuthenticated,
  });

  const cancelViewingMutation = useMutation({
    mutationFn: async (viewingId: number) => {
      await apiRequest("DELETE", `/api/viewings/${viewingId}`);
    },
    onSuccess: () => {
      toast({
        title: "Viewing Cancelled",
        description: "Your viewing has been cancelled successfully.",
      });
      setShowCancelModal(false);
      setSelectedViewing(null);
      queryClient.invalidateQueries({ queryKey: ['/api/viewings'] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Please Log In",
          description: "You need to be logged in to cancel viewings.",
          variant: "destructive",
        });
        setLocation("/login");
        return;
      }
      toast({
        title: "Cancellation Failed",
        description: "Failed to cancel viewing. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (isAuthLoading || isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="h-screen flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    setLocation("/login");
    return null;
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'scheduled':
        return <Calendar className="h-5 w-5 text-blue-600" />;
      case 'cancelled':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'no_show':
        return <AlertCircle className="h-5 w-5 text-orange-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'no_show':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDateBadge = (date: Date) => {
    if (isToday(date)) {
      return <Badge className="bg-green-100 text-green-800">Today</Badge>;
    } else if (isTomorrow(date)) {
      return <Badge className="bg-blue-100 text-blue-800">Tomorrow</Badge>;
    } else if (isBefore(date, new Date())) {
      return <Badge variant="outline" className="border-gray-300 text-gray-600">Past</Badge>;
    }
    return null;
  };

  const upcomingViewings = viewings?.filter((viewing: ViewingWithProperty) => 
    viewing.status === 'scheduled' && !isBefore(new Date(viewing.scheduledDate), new Date())
  ) || [];

  const pastViewings = viewings?.filter((viewing: ViewingWithProperty) => 
    viewing.status !== 'scheduled' || isBefore(new Date(viewing.scheduledDate), new Date())
  ) || [];

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Viewings</h1>
        <p className="text-gray-600">Manage your scheduled property viewings and tours</p>
      </div>

      {/* Upcoming Viewings */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Upcoming Viewings</h2>
        {upcomingViewings.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Upcoming Viewings</h3>
              <p className="text-gray-600 mb-4">
                You don't have any scheduled viewings. Browse properties to schedule tours!
              </p>
              <Button onClick={() => setLocation("/")} className="bg-blue-600 hover:bg-blue-700">
                Browse Properties
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {upcomingViewings.map((viewing: ViewingWithProperty) => (
              <Card key={viewing.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-xl font-semibold text-gray-900 mb-1">
                            {viewing.property.title}
                          </h3>
                          <div className="flex items-center text-gray-600 mb-2">
                            <MapPin className="h-4 w-4 mr-1" />
                            <span className="text-sm">
                              {viewing.property.address}, {viewing.property.city}, {viewing.property.state}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center">
                              <Bed className="h-4 w-4 mr-1" />
                              <span>{viewing.property.bedrooms} bed</span>
                            </div>
                            <div className="flex items-center">
                              <Bath className="h-4 w-4 mr-1" />
                              <span>{viewing.property.bathrooms} bath</span>
                            </div>
                            <div className="flex items-center">
                              <Square className="h-4 w-4 mr-1" />
                              <span>{viewing.property.squareFootage} sq ft</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-blue-600">
                            ${viewing.property.rent?.toLocaleString()}/mo
                          </div>
                        </div>
                      </div>

                      {/* Viewing Details */}
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-4">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          <span>{format(new Date(viewing.scheduledDate), 'EEEE, MMM d, yyyy')}</span>
                          {getDateBadge(new Date(viewing.scheduledDate))}
                        </div>
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          <span>{format(new Date(viewing.scheduledDate), 'h:mm a')} ({viewing.duration} min)</span>
                        </div>
                        {viewing.viewingType === 'virtual' && (
                          <div className="flex items-center">
                            <Video className="h-4 w-4 mr-1" />
                            <span>Virtual Tour</span>
                          </div>
                        )}
                        {viewing.attendeeCount && viewing.attendeeCount > 1 && (
                          <div className="flex items-center">
                            <Users className="h-4 w-4 mr-1" />
                            <span>{viewing.attendeeCount} attendees</span>
                          </div>
                        )}
                      </div>

                      {/* Status and Actions */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(viewing.status)}
                            <Badge className={getStatusColor(viewing.status)}>
                              {viewing.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </Badge>
                          </div>
                          {viewing.confirmationCode && (
                            <span className="text-xs text-gray-500">
                              Code: {viewing.confirmationCode}
                            </span>
                          )}
                        </div>

                        <div className="flex gap-2">
                          {viewing.meetingUrl && viewing.viewingType === 'virtual' && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => window.open(viewing.meetingUrl, '_blank')}
                            >
                              <Video className="h-4 w-4 mr-1" />
                              Join Virtual Tour
                            </Button>
                          )}
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setLocation(`/property/${viewing.property.id}`)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View Property
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedViewing(viewing);
                              setShowCancelModal(true);
                            }}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </div>

                      {/* Viewing Notes */}
                      {viewing.notes && (
                        <div className="mt-4 p-3 bg-purple-50 rounded-lg">
                          <p className="text-sm text-gray-700">
                            <strong>Notes:</strong> {viewing.notes}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Past Viewings */}
      {pastViewings.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Past Viewings</h2>
          <div className="space-y-4">
            {pastViewings.map((viewing: ViewingWithProperty) => (
              <Card key={viewing.id} className="opacity-75">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            {viewing.property.title}
                          </h3>
                          <div className="flex items-center text-gray-600 mb-2">
                            <MapPin className="h-4 w-4 mr-1" />
                            <span className="text-sm">
                              {viewing.property.address}, {viewing.property.city}, {viewing.property.state}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-gray-600">
                            ${viewing.property.rent?.toLocaleString()}/mo
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-4">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          <span>{format(new Date(viewing.scheduledDate), 'MMM d, yyyy')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(viewing.status)}
                          <Badge className={getStatusColor(viewing.status)}>
                            {viewing.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </Badge>
                        </div>
                        {viewing.rating && (
                          <div className="flex items-center">
                            <Star className="h-4 w-4 mr-1 text-yellow-500" />
                            <span>{viewing.rating}/5</span>
                          </div>
                        )}
                      </div>

                      {viewing.feedback && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-700">
                            <strong>Your Feedback:</strong> {viewing.feedback}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Cancel Viewing Modal */}
      <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Viewing</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel your viewing for "{selectedViewing?.property.title}"?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowCancelModal(false)}>
              Keep Viewing
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => selectedViewing && cancelViewingMutation.mutate(selectedViewing.id)}
              disabled={cancelViewingMutation.isPending}
            >
              {cancelViewingMutation.isPending ? "Cancelling..." : "Cancel Viewing"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Viewing Tips */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Viewing Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <h4 className="font-medium">Before Your Viewing:</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Arrive 5-10 minutes early</li>
                <li>• Bring a valid ID and proof of income</li>
                <li>• Prepare questions about the property</li>
                <li>• Check transportation and parking options</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">During Your Viewing:</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Test water pressure, lighting, and outlets</li>
                <li>• Check cell phone reception</li>
                <li>• Take photos/videos (if allowed)</li>
                <li>• Ask about move-in timeline and costs</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}