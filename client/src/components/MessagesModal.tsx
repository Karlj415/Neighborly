import { useState } from "react";
import {
  X,
  MessageCircle,
  Send,
  ArrowLeft,
  Home,
  Building2,
  Clock,
  User,
  FileText,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { ApplicationCard } from "./ApplicationCard";
import ApplicationDetailsModal from "./ApplicationDetailsModal";

interface MessagesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AuthUser {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
}

interface ConversationMessage {
  id: number;
  senderId: string;
  messageType: string;
  content: string;
  metadata?: any;
  createdAt: string;
  sender: AuthUser;
}

interface UserConversation {
  id: number;
  participant1Id: string;
  participant2Id: string;
  conversationType: string;
  propertyId?: string;
  propertyData?: any;
  lastMessageAt: string;
  otherParticipant: AuthUser;
  lastMessage?: ConversationMessage;
}

export default function MessagesModal({ isOpen, onClose }: MessagesModalProps) {
  const [activeConversation, setActiveConversation] =
    useState<UserConversation | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [selectedApplication, setSelectedApplication] = useState<any>(null);
  const [isApplicationDetailsOpen, setIsApplicationDetailsOpen] =
    useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  // Fetch all conversations
  const { data: conversations = [], isLoading: isLoadingConversations } =
    useQuery<UserConversation[]>({
      queryKey: ["/api/user-conversations"],
      enabled: isOpen,
    });

  // Fetch messages for active conversation
  const { data: messages = [], isLoading: isLoadingMessages } = useQuery<
    ConversationMessage[]
  >({
    queryKey: [`/api/user-conversations/${activeConversation?.id}/messages`],
    enabled: isOpen && !!activeConversation,
    staleTime: 0, // Always fetch fresh data for enrichment
    gcTime: 0, // Don't cache to ensure fresh enrichment
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({
      conversationId,
      content,
    }: {
      conversationId: number;
      content: string;
    }) => {
      return await apiRequest(
        "POST",
        `/api/user-conversations/${conversationId}/messages`,
        {
          content,
        },
      );
    },
    onSuccess: () => {
      setNewMessage("");
      // Refresh messages and conversations
      queryClient.invalidateQueries({
        queryKey: [
          `/api/user-conversations/${activeConversation?.id}/messages`,
        ],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user-conversations"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (!isOpen) return null;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays <= 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const getConversationTypeIcon = (type: string) => {
    switch (type) {
      case "property_share":
        return <Home className="h-4 w-4" />;
      case "agent_contact":
        return <Building2 className="h-4 w-4" />;
      case "application":
        return <FileText className="h-4 w-4" />;
      default:
        return <MessageCircle className="h-4 w-4" />;
    }
  };

  const getConversationTypeLabel = (type: string) => {
    switch (type) {
      case "property_share":
        return "Property Share";
      case "agent_contact":
        return "Agent Contact";
      case "application":
        return "Application";
      default:
        return "Direct Message";
    }
  };

  const handleSendMessage = () => {
    if (!activeConversation || !newMessage.trim()) return;

    sendMessageMutation.mutate({
      conversationId: activeConversation.id,
      content: newMessage.trim(),
    });
  };

  const getParticipantName = (participant: AuthUser) => {
    if (participant.firstName || participant.lastName) {
      return `${participant.firstName || ""} ${participant.lastName || ""}`.trim();
    }
    return participant.email.split("@")[0];
  };

  const handleApplicationClick = (metadata: any) => {
    // Simply use the metadata we already have - it contains the current status
    setSelectedApplication(metadata);
    setIsApplicationDetailsOpen(true);
  };

  const handleDocumentClick = async (documentId: string) => {
    try {
      const response = await apiRequest(
        "GET",
        `/api/documents/${documentId}/view`,
      );
      const document = await response.json();

      // Open document in new tab/window
      if (document.fileUrl) {
        window.open(document.fileUrl, "_blank");
      } else {
        toast({
          title: "Document Unavailable",
          description: "This document is not available for viewing.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load document. Please try again.",
        variant: "destructive",
      });
    }
  };

  const formatApplicationMessage = (content: string) => {
    // Split content by lines and format
    const lines = content.split("\n");
    const formattedLines = lines.map((line, index) => {
      // Check if line contains document link
      const documentMatch = line.match(/^• (.+) - \/documents\/(\d+)$/);
      if (documentMatch) {
        const [, docType, docId] = documentMatch;
        return (
          <div key={index} className="flex items-center space-x-2 mt-1">
            <FileText className="h-3 w-3" />
            <button
              onClick={() => handleDocumentClick(docId)}
              className="text-blue-600 hover:text-blue-800 underline text-xs"
            >
              {docType}
            </button>
          </div>
        );
      }

      // Format headers with bold
      if (line.startsWith("**") && line.endsWith("**")) {
        return (
          <div key={index} className="font-semibold text-sm mt-2 mb-1">
            {line.replace(/\*\*/g, "")}
          </div>
        );
      }

      // Format regular lines
      if (line.trim()) {
        return (
          <div key={index} className="text-xs text-gray-700 mb-1">
            {line}
          </div>
        );
      }

      return <div key={index} className="mb-1"></div>;
    });

    return <div>{formattedLines}</div>;
  };

  // Show conversation view
  if (activeConversation) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end">
        <div className="bg-white w-full max-w-md h-full flex flex-col animate-in slide-in-from-right duration-300">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveConversation(null)}
                className="p-1"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h3 className="font-semibold">
                  {getParticipantName(activeConversation.otherParticipant)}
                </h3>
                <div className="flex items-center space-x-1 text-xs text-gray-500">
                  {getConversationTypeIcon(activeConversation.conversationType)}
                  <span>
                    {getConversationTypeLabel(
                      activeConversation.conversationType,
                    )}
                  </span>
                </div>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="p-1">
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Property context (if applicable) */}
          {activeConversation.propertyData && (
            <div className="p-3 bg-blue-50 border-b">
              <div className="flex items-start space-x-3">
                {activeConversation.propertyData.images &&
                  activeConversation.propertyData.images.length > 0 && (
                    <img
                      src={activeConversation.propertyData.images[0]}
                      alt="Property"
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                  )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {activeConversation.propertyData.address ||
                      activeConversation.propertyData.streetAddress}
                  </p>
                  {activeConversation.propertyData.price && (
                    <p className="text-sm text-gray-600">
                      {formatPrice(activeConversation.propertyData.price)}/month
                    </p>
                  )}
                  {(activeConversation.propertyData.bedrooms ||
                    activeConversation.propertyData.bathrooms) && (
                    <p className="text-xs text-gray-500">
                      {activeConversation.propertyData.bedrooms}bed •{" "}
                      {activeConversation.propertyData.bathrooms}bath
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            {isLoadingMessages ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <MessageCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No messages yet</p>
                <p className="text-sm">Start the conversation!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message: any) => {
                  const messageType =
                    message.messageType || message.message_type;
                  return (
                    <div key={message.id}>
                      {messageType === "application" && message.metadata ? (
                        // Application card - full width like property shares, no bubble styling
                        <div className="w-full">
                          <ApplicationCard
                            metadata={message.metadata}
                            onClick={() =>
                              handleApplicationClick(message.metadata)
                            }
                            canManageApplication={(() => {
                              const currentUserId = String(
                                (currentUser as any)?.id,
                              );
                              const messageSenderId = String(message.senderId);

                              // In an application conversation, the landlord is the participant who RECEIVES the application
                              // So if the current user is NOT the sender of this application message, they can manage it
                              const canManage = !!(
                                currentUser &&
                                activeConversation &&
                                activeConversation.conversationType ===
                                  "application" &&
                                currentUserId !== messageSenderId
                              );

                              return canManage;
                            })()}
                            currentUserId={(currentUser as any)?.id}
                          />
                          <p className="text-xs mt-2 text-gray-500 text-center">
                            {formatDate(message.createdAt)}
                          </p>
                        </div>
                      ) : (
                        // Regular text messages with bubble styling
                        <div
                          className={`flex mb-4 ${
                            message.senderId ===
                            activeConversation.otherParticipant.id.toString()
                              ? "justify-start"
                              : "justify-end"
                          }`}
                        >
                          <div
                            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                              message.senderId ===
                              activeConversation.otherParticipant.id.toString()
                                ? "bg-gray-100 text-gray-900"
                                : "bg-blue-500 text-white"
                            }`}
                          >
                            <p className="text-sm">{message.content}</p>
                            <p
                              className={`text-xs mt-1 ${
                                message.senderId ===
                                activeConversation.otherParticipant.id.toString()
                                  ? "text-gray-500"
                                  : "text-blue-100"
                              }`}
                            >
                              {formatDate(message.createdAt)}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {/* Message input */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex space-x-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                className="flex-1"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || sendMessageMutation.isPending}
                size="sm"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show conversations list
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end">
      <div className="bg-white w-full max-w-md h-full flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Messages</h2>
          <Button variant="ghost" size="sm" onClick={onClose} className="p-1">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Conversations list */}
        <ScrollArea className="flex-1">
          {isLoadingConversations ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center text-gray-500 py-8 px-4">
              <MessageCircle className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="font-medium mb-2">No conversations yet</h3>
              <p className="text-sm">
                Share a property with a friend or contact an agent to start
                messaging!
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {conversations.map((conversation: UserConversation) => (
                <div
                  key={conversation.id}
                  className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => setActiveConversation(conversation)}
                >
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      {conversation.otherParticipant.profileImageUrl ? (
                        <img
                          src={conversation.otherParticipant.profileImageUrl}
                          alt="Profile"
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <User className="h-5 w-5 text-gray-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm truncate">
                          {getParticipantName(conversation.otherParticipant)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(conversation.lastMessageAt)}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {getConversationTypeLabel(
                            conversation.conversationType,
                          )}
                        </Badge>
                        {conversation.propertyData && (
                          <Badge variant="outline" className="text-xs">
                            Property
                          </Badge>
                        )}
                      </div>
                      {conversation.lastMessage && (
                        <p className="text-sm text-gray-600 truncate mt-1">
                          {conversation.lastMessage.content}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Application Details Modal */}
      <ApplicationDetailsModal
        isOpen={isApplicationDetailsOpen}
        onClose={() => setIsApplicationDetailsOpen(false)}
        application={
          selectedApplication
            ? (() => {
                // Find the most current application data from the refetched messages
                // This ensures we always show the latest status after database updates
                if (!activeConversation) return selectedApplication;

                const currentMessage = messages.find(
                  (msg) =>
                    msg.messageType === "application" &&
                    msg.metadata?.applicationId ===
                      selectedApplication.applicationId,
                );

                // Return the current metadata if found, otherwise fall back to selected
                return currentMessage?.metadata || selectedApplication;
              })()
            : null
        }
        conversationId={activeConversation?.id}
        canManageApplication={
          activeConversation
            ? (() => {
                const currentUserId = String((currentUser as any)?.id);
                // Only allow management if this is an application conversation AND the current user is NOT the applicant
                // The applicant is the one who submitted the application (userId in the application data)
                const selectedApp =
                  selectedApplication ||
                  messages.find(
                    (msg) =>
                      msg.messageType === "application" &&
                      msg.metadata?.applicationId ===
                        selectedApplication?.applicationId,
                  )?.metadata;
                const isApplicant =
                  selectedApp?.userId === currentUserId ||
                  selectedApp?.applicantData?.userId === currentUserId;
                return !!(
                  currentUser &&
                  activeConversation.conversationType === "application" &&
                  !isApplicant
                );
              })()
            : false
        }
        currentUserId={String((currentUser as any)?.id)}
      />
    </div>
  );
}
