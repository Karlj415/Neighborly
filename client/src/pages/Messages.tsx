import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Share, User, Home, MapPin, DollarSign, Bed, Bath, Square } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface PropertyShare {
  id: number;
  senderId: string;
  receiverId: string;
  propertyType: string;
  propertyId: string;
  propertyData: any;
  message?: string;
  isRead: boolean;
  createdAt: string;
  senderFirstName?: string;
  senderLastName?: string;
  senderEmail?: string;
}

interface DirectMessage {
  id: number;
  senderId: string;
  receiverId: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  senderFirstName?: string;
  senderLastName?: string;
  senderEmail?: string;
}

export default function Messages() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("shared-properties");

  // Fetch shared properties received by the user
  const { data: sharedProperties = [], isLoading: loadingShares } = useQuery({
    queryKey: ["/api/property-shares/received"],
    enabled: !!user,
  });

  // Fetch direct messages received by the user
  const { data: directMessages = [], isLoading: loadingMessages } = useQuery({
    queryKey: ["/api/direct-messages/received"],
    enabled: !!user,
  });

  const formatPropertyPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const getSenderName = (share: PropertyShare | DirectMessage) => {
    if (share.senderFirstName && share.senderLastName) {
      return `${share.senderFirstName} ${share.senderLastName}`;
    }
    return share.senderEmail || "Unknown User";
  };

  const PropertyShareCard = ({ share }: { share: PropertyShare }) => {
    const property = share.propertyData;
    
    return (
      <Card className={`mb-4 transition-all hover:shadow-md ${!share.isRead ? 'border-blue-500 bg-blue-50' : ''}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full">
                <User className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-sm font-medium">{getSenderName(share)}</CardTitle>
                <p className="text-xs text-gray-500">
                  Shared a property • {formatDistanceToNow(new Date(share.createdAt), { addSuffix: true })}
                </p>
              </div>
            </div>
            {!share.isRead && (
              <Badge variant="default" className="bg-blue-600">
                New
              </Badge>
            )}
          </div>
          {share.message && (
            <p className="text-sm text-gray-700 mt-2 italic">"{share.message}"</p>
          )}
        </CardHeader>
        <CardContent>
          <div className="bg-white border rounded-lg p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-gray-900">{property.address}</h3>
                <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                  <MapPin className="h-3 w-3" />
                  <span>{property.city}, {property.state}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-gray-900">
                  {formatPropertyPrice(property.monthlyRent)}/mo
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-gray-600">
              {property.bedrooms && (
                <div className="flex items-center gap-1">
                  <Bed className="h-3 w-3" />
                  <span>{property.bedrooms} bed</span>
                </div>
              )}
              {property.bathrooms && (
                <div className="flex items-center gap-1">
                  <Bath className="h-3 w-3" />
                  <span>{property.bathrooms} bath</span>
                </div>
              )}
              {property.squareFeet && (
                <div className="flex items-center gap-1">
                  <Square className="h-3 w-3" />
                  <span>{property.squareFeet} sqft</span>
                </div>
              )}
            </div>
            
            <div className="flex gap-2 mt-4">
              <Button size="sm" className="flex-1">
                View Property
              </Button>
              <Button size="sm" variant="outline">
                Reply
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const DirectMessageCard = ({ message }: { message: DirectMessage }) => {
    return (
      <Card className={`mb-4 transition-all hover:shadow-md ${!message.isRead ? 'border-blue-500 bg-blue-50' : ''}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-full">
                <MessageSquare className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-sm font-medium">{getSenderName(message)}</CardTitle>
                <p className="text-xs text-gray-500">
                  {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                </p>
              </div>
            </div>
            {!message.isRead && (
              <Badge variant="default" className="bg-blue-600">
                New
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700">{message.message}</p>
          <div className="flex gap-2 mt-3">
            <Button size="sm" variant="outline">
              Reply
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Please log in to view your messages.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
          <p className="text-gray-600">Stay connected with your friends and property contacts</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="shared-properties" className="flex items-center gap-2">
              <Share className="h-4 w-4" />
              Shared Properties
            </TabsTrigger>
            <TabsTrigger value="direct-messages" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Direct Messages
            </TabsTrigger>
          </TabsList>

          <TabsContent value="shared-properties" className="mt-6">
            {loadingShares ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
              </div>
            ) : sharedProperties.length === 0 ? (
              <div className="text-center py-12">
                <div className="flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4">
                  <Share className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No shared properties</h3>
                <p className="text-gray-600">
                  When friends share properties with you, they'll appear here.
                </p>
              </div>
            ) : (
              <div>
                {sharedProperties.map((share: PropertyShare) => (
                  <PropertyShareCard key={share.id} share={share} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="direct-messages" className="mt-6">
            {loadingMessages ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
              </div>
            ) : directMessages.length === 0 ? (
              <div className="text-center py-12">
                <div className="flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4">
                  <MessageSquare className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No messages</h3>
                <p className="text-gray-600">
                  Direct messages from friends will appear here.
                </p>
              </div>
            ) : (
              <div>
                {directMessages.map((message: DirectMessage) => (
                  <DirectMessageCard key={message.id} message={message} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}