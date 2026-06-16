import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, Bed, Bath, Square, Eye, FileText, CheckCircle, Clock as ClockIcon, XCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import type { Application, Property } from "@shared/schema";

interface ApplicationWithProperty extends Application {
  property: Property;
}

export default function Applications() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [, setLocation] = useLocation();

  const { data: applications, isLoading } = useQuery({
    queryKey: ['/api/applications'],
    enabled: isAuthenticated,
  });

  if (isAuthLoading || isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="h-screen flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
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
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'pending':
      case 'submitted':
        return <ClockIcon className="h-5 w-5 text-yellow-600" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'under_review':
        return <AlertCircle className="h-5 w-5 text-blue-600" />;
      default:
        return <FileText className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-500/20 text-green-400';
      case 'pending':
      case 'submitted':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'rejected':
        return 'bg-red-500/20 text-red-400';
      case 'under_review':
        return 'bg-blue-500/20 text-blue-400';
      default:
        return 'bg-white/10 text-white/70';
    }
  };

  return (
    <div className="min-h-screen bg-[hsl(220,20%,8%)]">
      <Header />
      
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">My Applications</h1>
          <p className="text-white/70">Track the status of your rental applications</p>
        </div>

      {applications && applications.length === 0 ? (
        <Card className="bilt-card">
          <CardContent className="p-12 text-center">
            <FileText className="h-16 w-16 text-white/40 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Applications Yet</h3>
            <p className="text-white/70 mb-6">
              You haven't submitted any rental applications yet. Start browsing properties to find your perfect home!
            </p>
            <Button onClick={() => setLocation("/")} className="bilt-gradient">
              Browse Properties
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {applications?.map((application: ApplicationWithProperty) => (
            <Card key={application.id} className="bilt-card hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  {/* Property Info */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-xl font-semibold text-white mb-1">
                          {application.property.title}
                        </h3>
                        <div className="flex items-center text-white/70 mb-2">
                          <MapPin className="h-4 w-4 mr-1" />
                          <span className="text-sm">
                            {application.property.address}, {application.property.city}, {application.property.state}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-white/70">
                          <div className="flex items-center">
                            <Bed className="h-4 w-4 mr-1" />
                            <span>{application.property.bedrooms} bed</span>
                          </div>
                          <div className="flex items-center">
                            <Bath className="h-4 w-4 mr-1" />
                            <span>{application.property.bathrooms} bath</span>
                          </div>
                          <div className="flex items-center">
                            <Square className="h-4 w-4 mr-1" />
                            <span>{application.property.squareFootage} sq ft</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">
                          ${application.property.rent?.toLocaleString()}/mo
                        </div>
                      </div>
                    </div>

                    {/* Application Details */}
                    <div className="flex flex-wrap gap-4 text-sm text-white/70 mb-4">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        <span>Applied: {format(new Date(application.applicationDate || application.createdAt), 'MMM d, yyyy')}</span>
                      </div>
                      {application.moveInDate && (
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          <span>Move-in: {format(new Date(application.moveInDate), 'MMM d, yyyy')}</span>
                        </div>
                      )}
                      {application.leaseTerm && (
                        <span>Lease: {application.leaseTerm} months</span>
                      )}
                    </div>

                    {/* Status and Actions */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(application.status)}
                          <Badge className={getStatusColor(application.status)}>
                            {application.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </Badge>
                        </div>
                        {application.reviewedAt && (
                          <span className="text-xs text-white/50">
                            Updated {format(new Date(application.reviewedAt), 'MMM d, yyyy')}
                          </span>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setLocation(`/property/${application.property.id}`)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View Property
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setLocation(`/applications/${application.id}`)}
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          View Application
                        </Button>
                      </div>
                    </div>

                    {/* Landlord Notes */}
                    {application.landlordNotes && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-700">
                          <strong>Landlord Notes:</strong> {application.landlordNotes}
                        </p>
                      </div>
                    )}

                    {/* Application Notes */}
                    {application.additionalNotes && (
                      <div className="mt-4 p-3 bg-purple-50 rounded-lg">
                        <p className="text-sm text-gray-700">
                          <strong>Your Notes:</strong> {application.additionalNotes}
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

      {/* Application Tips */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Application Status Guide
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <ClockIcon className="h-4 w-4 text-yellow-600" />
                <span className="font-medium">Submitted/Pending:</span>
                <span className="text-gray-600">Application received, awaiting review</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <span className="font-medium">Under Review:</span>
                <span className="text-gray-600">Landlord is reviewing your application</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="font-medium">Approved:</span>
                <span className="text-gray-600">Congratulations! You can proceed with the lease</span>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-600" />
                <span className="font-medium">Rejected:</span>
                <span className="text-gray-600">Application was not accepted this time</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
      
    </div>
  );
}