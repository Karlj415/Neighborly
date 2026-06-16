import { useState, useRef, useEffect } from "react";
import {
  X,
  Send,
  ChevronLeft,
  Check,
  CheckCheck,
  Plus,
  Search,
  MessageCircle,
  Home,
  Bed,
  Bath,
  Square,
  DollarSign,
  Camera,
  Heart,
  Calendar,
  FileText,
  ChevronRight,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format, isToday, isYesterday } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ApplicationCard } from "./ApplicationCard";
import ApplicationDetailsModal from "./ApplicationDetailsModal";

// Image Carousel Component for Property Listings
function PropertyImageCarousel({ images }: { images: string[] }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  if (!images || images.length === 0) return null;

  return (
    <div className="relative h-full w-full">
      <div className="relative h-full w-full overflow-hidden bg-gray-100">
        <img
          src={images[currentImageIndex]}
          alt={`Property image ${currentImageIndex + 1}`}
          className="w-full h-full object-cover"
        />

        {/* Navigation arrows - only show if more than 1 image */}
        {images.length > 1 && (
          <>
            <button
              onClick={prevImage}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-opacity"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={nextImage}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-opacity"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        {/* Image counter */}
        {images.length > 1 && (
          <div className="absolute top-4 right-4 bg-black bg-opacity-60 text-white text-sm px-3 py-1 rounded-full">
            {currentImageIndex + 1} / {images.length}
          </div>
        )}

        {/* Thumbnail dots for navigation */}
        {images.length > 1 && images.length <= 8 && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentImageIndex(index)}
                className={`w-3 h-3 rounded-full transition-all duration-200 ${
                  index === currentImageIndex
                    ? "bg-white shadow-lg"
                    : "bg-white bg-opacity-50 hover:bg-opacity-80"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
}

interface Conversation {
  id: number;
  participant1Id: string;
  participant2Id: string;
  conversationType: string;
  lastMessageAt: string;
  otherParticipant?: User;
  lastMessage?: Message;
}

interface Message {
  id: number;
  conversationId: number;
  senderId: string;
  messageType: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  sender?: User;
  status?: "sending" | "sent" | "delivered" | "read";
  metadata?: any;
}

interface PropertyMessageCardProps {
  message: Message;
  isOwn: boolean;
  onPropertyClick: (property: any) => void;
  conversation: Conversation;
}

function PropertyMessageCard({
  message,
  isOwn,
  onPropertyClick,
  conversation,
}: PropertyMessageCardProps) {
  // Property data is stored in the conversation's propertyData field
  const property = (conversation as any)?.propertyData;
  
  if (!property) {
    // Fallback to regular message if no property data
    return (
      <motion.div
        whileHover={{ scale: 1.02 }}
        className={`px-4 py-2 rounded-2xl ${
          isOwn ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-900"
        }`}
      >
        <p className="text-sm whitespace-pre-wrap break-words">
          {message.content}
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={`rounded-xl overflow-hidden cursor-pointer max-w-sm shadow-lg border ${
        isOwn ? "bg-blue-500 border-blue-400" : "bg-white border-gray-200"
      }`}
      onClick={() => onPropertyClick(property)}
    >
      {/* Property Image */}
      {(property.photos?.[0] || property.images?.[0]) && (
        <div className="relative h-40 overflow-hidden">
          <img
            src={property.photos?.[0] || property.images?.[0]}
            alt="Property"
            className="w-full h-full object-cover"
          />
          {/* Price overlay */}
          <div className="absolute top-3 right-3 bg-black bg-opacity-75 text-white px-2 py-1 rounded-lg text-sm font-semibold">
            ${(property.price || property.monthlyRent)?.toLocaleString()}/mo
          </div>
        </div>
      )}

      {/* Property Details */}
      <div className={`p-4 ${isOwn ? "text-white" : "text-gray-900"}`}>
        {/* Address */}
        <h3 className={`font-semibold text-base mb-2 ${isOwn ? "text-white" : "text-gray-900"}`}>
          {property.address || property.formattedAddress || property.streetAddress}
        </h3>

        {/* Property specs in clean grid */}
        <div className="grid grid-cols-3 gap-3 mb-3">
          {(property.bedrooms || property.beds) && (
            <div className={`text-center p-2 rounded-lg ${isOwn ? "bg-blue-400 bg-opacity-50" : "bg-gray-100"}`}>
              <div className={`text-lg font-bold ${isOwn ? "text-white" : "text-gray-900"}`}>
                {property.bedrooms || property.beds}
              </div>
              <div className={`text-xs ${isOwn ? "text-blue-100" : "text-gray-600"}`}>
                Bed{(property.bedrooms || property.beds) !== 1 ? 's' : ''}
              </div>
            </div>
          )}
          {(property.bathrooms || property.baths) && (
            <div className={`text-center p-2 rounded-lg ${isOwn ? "bg-blue-400 bg-opacity-50" : "bg-gray-100"}`}>
              <div className={`text-lg font-bold ${isOwn ? "text-white" : "text-gray-900"}`}>
                {property.bathrooms || property.baths}
              </div>
              <div className={`text-xs ${isOwn ? "text-blue-100" : "text-gray-600"}`}>
                Bath{(property.bathrooms || property.baths) !== 1 ? 's' : ''}
              </div>
            </div>
          )}
          {(property.livingArea || property.squareFeet) && (
            <div className={`text-center p-2 rounded-lg ${isOwn ? "bg-blue-400 bg-opacity-50" : "bg-gray-100"}`}>
              <div className={`text-lg font-bold ${isOwn ? "text-white" : "text-gray-900"}`}>
                {(property.livingArea || property.squareFeet)?.toLocaleString()}
              </div>
              <div className={`text-xs ${isOwn ? "text-blue-100" : "text-gray-600"}`}>
                Sq Ft
              </div>
            </div>
          )}
        </div>

        {/* Property highlights */}
        <div className="flex flex-wrap gap-2 mb-3">
          {property.isPetFriendly && (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              isOwn ? "bg-green-400 bg-opacity-30 text-green-100" : "bg-green-100 text-green-800"
            }`}>
              🐕 Pet Friendly
            </span>
          )}
          {property.hasWasherDryer && (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              isOwn ? "bg-purple-400 bg-opacity-30 text-purple-100" : "bg-purple-100 text-purple-800"
            }`}>
              🧺 W/D
            </span>
          )}
          {property.propertyType && (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              isOwn ? "bg-gray-400 bg-opacity-30 text-gray-100" : "bg-gray-100 text-gray-800"
            }`}>
              {property.propertyType}
            </span>
          )}
        </div>

        {/* Call to action */}
        <div className={`text-center pt-2 border-t ${isOwn ? "border-blue-400" : "border-gray-200"}`}>
          <p className={`text-xs font-medium ${isOwn ? "text-blue-100" : "text-blue-600"}`}>
            👆 Tap to view full details
          </p>
        </div>
      </div>
    </motion.div>
  );
}

interface iMessageChatProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
  recipientId?: string;
  recipientName?: string;
}

export function IMessageChat({
  isOpen,
  onClose,
  currentUserId,
  recipientId,
  recipientName,
}: iMessageChatProps) {
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);
  const [selectedPropertyForDetail, setSelectedPropertyForDetail] =
    useState<any>(null);
  const [isPropertyDetailOpen, setIsPropertyDetailOpen] = useState(false);
  const [selectedApplicationForDetail, setSelectedApplicationForDetail] =
    useState<any>(null);
  const [isApplicationDetailOpen, setIsApplicationDetailOpen] = useState(false);
  const [leftPanelWidth, setLeftPanelWidth] = useState(35); // percentage
  const [isResizing, setIsResizing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch conversations
  const { data: conversations = [], isLoading: isLoadingConversations } =
    useQuery<Conversation[]>({
      queryKey: ["/api/conversations"],
      enabled: isOpen,
    });

  // Fetch friends for new conversation
  const { data: friends = [], isLoading: isLoadingFriends } = useQuery<User[]>({
    queryKey: ["/api/friends"],
    enabled: isOpen && showNewConversation,
  });

  // Fetch messages for selected conversation
  const { data: messages = [], isLoading: isLoadingMessages } = useQuery<Message[]>({
    queryKey: [`/api/user-conversations/${selectedConversation?.id}/messages`],
    enabled: isOpen && !!selectedConversation,
    refetchInterval: false, // We'll use WebSocket for real-time updates
    staleTime: 0, // Always fetch fresh data for enrichment
    gcTime: 0, // Don't cache to ensure fresh enrichment
  });

  // Initialize WebSocket connection
  useEffect(() => {
    if (!isOpen || !currentUserId) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("WebSocket connected");
      // Authenticate
      ws.send(JSON.stringify({ type: "auth", userId: currentUserId }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case "newMessage":
          // Add new message to the query cache
          queryClient.setQueryData(
            [`/api/conversations/${data.conversationId}/messages`],
            (oldMessages: Message[] = []) => [...oldMessages, data.message],
          );
          // Update conversations list
          queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
          break;

        case "typing":
          if (data.conversationId === selectedConversation?.id) {
            setTypingUsers((prev) => {
              const newSet = new Set(prev);
              if (data.isTyping) {
                newSet.add(data.userId);
              } else {
                newSet.delete(data.userId);
              }
              return newSet;
            });
          }
          break;

        case "read":
          // Update message status
          queryClient.setQueryData(
            [`/api/conversations/${data.conversationId}/messages`],
            (oldMessages: Message[] = []) =>
              oldMessages.map((msg) =>
                data.messageIds.includes(msg.id)
                  ? { ...msg, isRead: true, status: "read" }
                  : msg,
              ),
          );
          break;
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
    };

    setWsConnection(ws);

    return () => {
      ws.close();
    };
  }, [isOpen, currentUserId, selectedConversation?.id]);

  // Auto-create conversation if recipientId is provided
  useEffect(() => {
    if (isOpen && recipientId && conversations.length > 0) {
      // Find existing conversation with recipient
      const existingConv = conversations.find(
        (conv: Conversation) =>
          conv.participant1Id === recipientId ||
          conv.participant2Id === recipientId,
      );

      if (existingConv) {
        setSelectedConversation(existingConv);
      } else {
        // Create new conversation
        startNewConversation(recipientId);
      }
    }
  }, [isOpen, recipientId, conversations]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle resize functionality
  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing) return;
    
    const container = document.querySelector('.messages-container') as HTMLElement;
    if (!container) return;
    
    const containerRect = container.getBoundingClientRect();
    const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
    
    // Constrain width between 20% and 60%
    const constrainedWidth = Math.min(Math.max(newWidth, 20), 60);
    setLeftPanelWidth(constrainedWidth);
  };

  const handleMouseUp = () => {
    setIsResizing(false);
  };

  useEffect(() => {
    const updateIsMobile = () => setIsMobile(window.innerWidth < 768);
    updateIsMobile();
    window.addEventListener('resize', updateIsMobile);
    return () => window.removeEventListener('resize', updateIsMobile);
  }, []);

  useEffect(() => {
    const container = document.querySelector('.messages-container') as HTMLElement;
    
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      // Add resizing class to container
      if (container) {
        container.classList.add('resizing');
      }
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        
        // Remove resizing class from container
        if (container) {
          container.classList.remove('resizing');
        }
      };
    }
  }, [isResizing]);

  const startResizing = () => {
    setIsResizing(true);
  };

  // Handle typing indicator
  const handleTyping = () => {
    if (!wsConnection || !selectedConversation) return;

    const otherUserId =
      selectedConversation.participant1Id === currentUserId
        ? selectedConversation.participant2Id
        : selectedConversation.participant1Id;

    // Send typing indicator
    wsConnection.send(
      JSON.stringify({
        type: "typing",
        conversationId: selectedConversation.id,
        recipientId: otherUserId,
        isTyping: true,
      }),
    );

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      wsConnection.send(
        JSON.stringify({
          type: "typing",
          conversationId: selectedConversation.id,
          recipientId: otherUserId,
          isTyping: false,
        }),
      );
    }, 2000);
  };

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!selectedConversation) return;

      const response = await apiRequest(
        "POST",
        `/api/user-conversations/${selectedConversation.id}/messages`,
        {
          content,
        },
      );
      return await response.json();
    },
    onMutate: async (content) => {
      // Optimistic update
      const optimisticMessage: Message = {
        id: Date.now(),
        conversationId: selectedConversation!.id,
        senderId: currentUserId,
        messageType: "text",
        content,
        isRead: false,
        createdAt: new Date().toISOString(),
        status: "sending",
      };

      queryClient.setQueryData(
        [`/api/user-conversations/${selectedConversation?.id}/messages`],
        (oldMessages: Message[] = []) => [...oldMessages, optimisticMessage],
      );

      return { optimisticMessage };
    },
    onSuccess: (data, variables, context) => {
      setNewMessage("");
      // Update the optimistic message with real data
      queryClient.setQueryData(
        [`/api/user-conversations/${selectedConversation?.id}/messages`],
        (oldMessages: Message[] = []) =>
          oldMessages.map((msg) =>
            msg.id === context?.optimisticMessage.id
              ? { ...data, status: "sent" }
              : msg,
          ),
      );
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
    onError: (error, variables, context) => {
      // Remove optimistic message on error
      queryClient.setQueryData(
        [`/api/user-conversations/${selectedConversation?.id}/messages`],
        (oldMessages: Message[] = []) =>
          oldMessages.filter((msg) => msg.id !== context?.optimisticMessage.id),
      );
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    },
  });

  const startNewConversation = async (userId: string) => {
    try {
      const response = await apiRequest("POST", "/api/conversations/start", {
        receiverId: userId,
        message: "👋", // Start with a wave
      });
      const conversationData = await response.json();
      setSelectedConversation(conversationData);
      setShowNewConversation(false);
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start conversation",
        variant: "destructive",
      });
    }
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedConversation) {
      return;
    }
    sendMessageMutation.mutate(newMessage.trim());
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) {
      return format(date, "h:mm a");
    } else if (isYesterday(date)) {
      return `Yesterday ${format(date, "h:mm a")}`;
    } else {
      return format(date, "MMM d, h:mm a");
    }
  };

  const getMessageStatus = (message: Message) => {
    if (message.senderId !== currentUserId) return null;

    if (message.status === "sending") {
      return <Check className="h-3 w-3 text-gray-400" />;
    } else if (message.isRead || message.status === "read") {
      return <CheckCheck className="h-3 w-3 text-blue-500" />;
    } else {
      return <CheckCheck className="h-3 w-3 text-gray-400" />;
    }
  };

  const getUserName = (user?: User) => {
    if (!user) return "Unknown";
    if (user.firstName || user.lastName) {
      return `${user.firstName || ""} ${user.lastName || ""}`.trim();
    }
    return user.email.split("@")[0];
  };

  const getInitials = (user?: User) => {
    if (!user) return "?";
    const name = getUserName(user);
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 bg-black/50"
            onClick={onClose}
          >
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="absolute top-0 right-0 w-full max-w-6xl bg-gray-800 shadow-2xl rounded-l-2xl border border-gray-600 messages-container"
              style={{ height: "100vh" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex h-full rounded-l-2xl overflow-hidden">
                {/* Left Panel - Conversations */}
                <div 
                  className={`flex flex-col bg-gray-800 border-r border-gray-600 ${isMobile && selectedConversation ? 'hidden' : ''}`}
                  style={{ width: isMobile ? '100%' : `${leftPanelWidth}%` }}
                >
                  {/* Left Panel Header */}
                  <div className="sticky top-0 z-20 flex items-center justify-between border-b border-gray-600 p-4 bg-gray-800 rounded-tl-2xl">
                    <div className="flex items-center gap-3">
                      <h2 className="text-lg font-semibold text-white">Messages</h2>
                    </div>
                    <div className="flex items-center gap-2">
                      {!showNewConversation && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setShowNewConversation(true)}
                          className="h-8 w-8 text-white hover:bg-gray-700"
                        >
                          <Plus className="h-5 w-5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="h-8 w-8 text-white hover:bg-gray-700"
                      >
                        <X className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>

                  {/* Left Panel Content */}
                  <div className="flex-1 overflow-hidden">
                    {showNewConversation ? (
                      // Friend selection for new conversation
                      <div className="h-full flex flex-col">
                        <div className="p-4 border-b border-gray-600">
                          <div className="flex items-center gap-2 mb-4">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setShowNewConversation(false)}
                              className="h-8 w-8 text-white hover:bg-gray-700"
                            >
                              <ChevronLeft className="h-5 w-5" />
                            </Button>
                            <h3 className="font-semibold text-white">
                              New Conversation
                            </h3>
                          </div>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                              placeholder="Search friends..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="pl-10"
                            />
                          </div>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                          {isLoadingFriends ? (
                            <div className="flex items-center justify-center h-full">
                              <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
                            </div>
                          ) : friends.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-400 p-6">
                              <p className="text-center">
                                No friends found. Add some friends first!
                              </p>
                            </div>
                          ) : (
                            <div className="divide-y divide-gray-600">
                              {friends
                                .filter(
                                  (friend: User) =>
                                    !searchQuery ||
                                    `${friend.firstName} ${friend.lastName}`
                                      .toLowerCase()
                                      .includes(searchQuery.toLowerCase()) ||
                                    friend.email
                                      .toLowerCase()
                                      .includes(searchQuery.toLowerCase()),
                                )
                                .map((friend: User) => (
                                  <motion.div
                                    key={friend.id}
                                    whileHover={{
                                      backgroundColor: "rgba(0,0,0,0.02)",
                                    }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() =>
                                      startNewConversation(friend.id)
                                    }
                                    className="flex items-center gap-3 p-4 cursor-pointer"
                                  >
                                    <Avatar className="h-12 w-12">
                                      <AvatarImage src={friend.profileImageUrl} />
                                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                                        {getInitials(friend)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium truncate text-white">
                                        {getUserName(friend)}
                                      </p>
                                      <p className="text-sm text-gray-400 truncate">
                                        {friend.email}
                                      </p>
                                    </div>
                                  </motion.div>
                                ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      // Conversations list
                      <div className="h-full overflow-y-auto">
                        {isLoadingConversations ? (
                          <div className="flex items-center justify-center h-full">
                            <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
                          </div>
                        ) : conversations.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-full text-gray-400 p-6">
                            <MessageCircle className="h-16 w-16 text-gray-500 mb-4" />
                            <p className="text-lg font-medium mb-2 text-white">
                              No conversations yet
                            </p>
                            <p className="text-sm text-center mb-6 text-gray-400">
                              Start a conversation with a friend
                            </p>
                            <Button
                              onClick={() => setShowNewConversation(true)}
                              className="bg-blue-500 hover:bg-blue-600 text-white"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Start New Conversation
                            </Button>
                          </div>
                        ) : (
                          <div className="relative h-full">
                            <div className="divide-y divide-gray-600">
                              {conversations.map((conversation: Conversation) => (
                                <motion.div
                                  key={conversation.id}
                                  whileHover={{
                                    backgroundColor: "rgba(255,255,255,0.05)",
                                  }}
                                  whileTap={{ scale: 0.98 }}
                                  onClick={() =>
                                    setSelectedConversation(conversation)
                                  }
                                  className="flex items-center gap-3 p-4 cursor-pointer"
                                >
                                  <Avatar className="h-12 w-12">
                                    <AvatarImage
                                      src={
                                        conversation.otherParticipant
                                          ?.profileImageUrl
                                      }
                                    />
                                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                                      {getInitials(conversation.otherParticipant)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                      <p className="font-medium truncate text-white">
                                        {getUserName(
                                          conversation.otherParticipant,
                                        )}
                                      </p>
                                      <span className="text-xs text-gray-400">
                                        {formatMessageTime(
                                          conversation.lastMessage?.createdAt ||
                                            conversation.lastMessageAt,
                                        )}
                                      </span>
                                    </div>
                                    <p className="text-sm text-gray-400 truncate">
                                      {conversation.lastMessage?.content ||
                                        "Start a conversation"}
                                    </p>
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                            {/* Floating Action Button */}
                            <Button
                              onClick={() => setShowNewConversation(true)}
                              className="absolute bottom-4 right-4 h-14 w-14 rounded-full bg-blue-500 hover:bg-blue-600 text-white shadow-lg"
                              size="icon"
                            >
                              <Plus className="h-6 w-6" />
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Resize Handle (desktop only) */}
                {!isMobile && (
                  <div 
                    className="w-1 bg-gray-600 hover:bg-gray-500 cursor-col-resize active:bg-blue-500 transition-colors"
                    onMouseDown={startResizing}
                  />
                )}
                
                {/* Right Panel - Messages */}
                <div 
                  className={`flex flex-col bg-gray-800 ${isMobile && !selectedConversation ? 'hidden' : ''}`}
                  style={{ width: isMobile ? '100%' : `${100 - leftPanelWidth}%` }}
                >
                  {selectedConversation ? (
                    <>
                      {/* Right Panel Header */}
                      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-gray-600 p-4 bg-gray-800">
                        <div className="flex items-center gap-3">
                          {isMobile && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setSelectedConversation(null)}
                              className="h-8 w-8"
                            >
                              <ChevronLeft className="h-5 w-5" />
                            </Button>
                          )}
                          <h2 className="text-lg font-semibold text-white">
                            {getUserName(selectedConversation.otherParticipant)}
                          </h2>
                        </div>
                        {isMobile && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={onClose}
                            className="h-8 w-8"
                          >
                            <X className="h-5 w-5" />
                          </Button>
                        )}
                      </div>
                      
                      {/* Messages view */}
                      <div className="flex flex-col h-full">
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {isLoadingMessages ? (
                          <div className="flex items-center justify-center h-full">
                            <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
                          </div>
                        ) : (
                          <>
                            <AnimatePresence>
                              {messages.map(
                                (message: Message, index: number) => {
                                  // Ensure both IDs are compared as strings for consistency
                                  const isOwn =
                                    String(message.senderId) ===
                                    String(currentUserId);
                                  const showAvatar =
                                    !isOwn &&
                                    (index === 0 ||
                                      messages[index - 1]?.senderId !==
                                        message.senderId);

                                  return (
                                    <motion.div
                                      key={message.id}
                                      initial={{ opacity: 0, y: 20 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      exit={{ opacity: 0, y: -20 }}
                                      transition={{ duration: 0.3 }}
                                      className={`flex gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}
                                    >
                                      {!isOwn && showAvatar && (
                                        <Avatar className="h-8 w-8 mt-auto">
                                          <AvatarImage
                                            src={
                                              message.sender?.profileImageUrl
                                            }
                                          />
                                          <AvatarFallback className="bg-gray-200 text-xs">
                                            {getInitials(message.sender)}
                                          </AvatarFallback>
                                        </Avatar>
                                      )}
                                      {!isOwn && !showAvatar && (
                                        <div className="w-8" />
                                      )}

                                      <div className={`max-w-[78%] ${isOwn ? 'items-end' : 'items-start'}`}>
                                        {message.messageType ===
                                        "property_share" ? (
                                          <PropertyMessageCard
                                            message={message}
                                            isOwn={isOwn}
                                            conversation={selectedConversation}
                                            onPropertyClick={(property) => {
                                              setSelectedPropertyForDetail(
                                                property,
                                              );
                                              setIsPropertyDetailOpen(true);
                                            }}
                                          />
                                        ) : message.messageType ===
                                            "application" &&
                                          message.metadata ? (
                                          <ApplicationCard
                                            metadata={message.metadata}
                                            isOwn={isOwn}
                                            onClick={() => {
                                              setSelectedApplicationForDetail(
                                                message.metadata,
                                              );
                                              setIsApplicationDetailOpen(true);
                                            }}
                                          />
                                        ) : (
                                          <motion.div
                                            whileHover={{ scale: 1.02 }}
                                            className={`${isOwn ? 'bg-[#0A84FF] text-white' : 'bg-gray-700 text-gray-100'} px-4 py-2 rounded-2xl`}
                                          >
                                            <p className="text-sm whitespace-pre-wrap break-words">
                                              {message.content}
                                            </p>
                                          </motion.div>
                                        )}
                                        <div className="flex items-center gap-1 mt-1 px-2">
                                          <span className="text-[10px] text-gray-400">
                                            {formatMessageTime(
                                              message.createdAt,
                                            )}
                                          </span>
                                          {isOwn && getMessageStatus(message)}
                                        </div>
                                      </div>
                                    </motion.div>
                                  );
                                },
                              )}
                            </AnimatePresence>

                            {/* Typing indicator */}
                            <AnimatePresence>
                              {typingUsers.size > 0 && (
                                <motion.div
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: 10 }}
                                  className="flex items-center gap-2"
                                >
                                  <Avatar className="h-8 w-8">
                                    <AvatarImage
                                      src={
                                        selectedConversation.otherParticipant
                                          ?.profileImageUrl
                                      }
                                    />
                                    <AvatarFallback className="bg-gray-200 text-xs">
                                      {getInitials(
                                        selectedConversation.otherParticipant,
                                      )}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="bg-gray-200 rounded-2xl px-4 py-2">
                                    <div className="flex gap-1">
                                      <motion.div
                                        animate={{ y: [0, -4, 0] }}
                                        transition={{
                                          duration: 0.6,
                                          repeat: Infinity,
                                          delay: 0,
                                        }}
                                        className="w-2 h-2 bg-gray-500 rounded-full"
                                      />
                                      <motion.div
                                        animate={{ y: [0, -4, 0] }}
                                        transition={{
                                          duration: 0.6,
                                          repeat: Infinity,
                                          delay: 0.2,
                                        }}
                                        className="w-2 h-2 bg-gray-500 rounded-full"
                                      />
                                      <motion.div
                                        animate={{ y: [0, -4, 0] }}
                                        transition={{
                                          duration: 0.6,
                                          repeat: Infinity,
                                          delay: 0.4,
                                        }}
                                        className="w-2 h-2 bg-gray-500 rounded-full"
                                      />
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </>
                        )}
                          <div ref={messagesEndRef} />
                        </div>

                        {/* Message input */}
                        <div className="border-t border-gray-600 p-3 bg-gray-800 sticky bottom-0">
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              handleSendMessage();
                            }}
                            className="flex gap-2 items-end"
                          >
                            <Input
                              ref={inputRef}
                              value={newMessage}
                              onChange={(e) => {
                                setNewMessage(e.target.value);
                                handleTyping();
                              }}
                              placeholder="iMessage"
                              className="flex-1 rounded-full px-4 py-3 bg-gray-700 border-0 text-white placeholder:text-gray-400"
                              disabled={sendMessageMutation.isPending}
                            />
                            <Button
                              type="submit"
                              size="icon"
                              className="rounded-full h-10 w-10 bg-[#0A84FF] hover:brightness-110"
                              disabled={
                                !newMessage.trim() ||
                                sendMessageMutation.isPending
                              }
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          </form>
                        </div>
                      </div>
                    </>
                  ) : (
                    // No conversation selected
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 p-6">
                      <MessageCircle className="h-16 w-16 text-gray-500 mb-4" />
                      <p className="text-lg font-medium mb-2 text-white">
                        Select a conversation
                      </p>
                      <p className="text-sm text-center text-gray-400">
                        Choose a conversation from the left to start messaging
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Property Detail Modal */}
      <Dialog
        open={isPropertyDetailOpen}
        onOpenChange={(open) => {
          if (!open) setIsPropertyDetailOpen(false);
        }}
      >
        <DialogContent 
          className="dark max-w-6xl max-h-[95vh] overflow-hidden p-0 property-detail-modal-dark"
        >
          {selectedPropertyForDetail && (
            <div className="flex h-[85vh]">
              {/* Left Side - Image */}
              <div className="w-2/5 bg-gradient-to-b from-gray-100 to-gray-200 dark:from-[hsl(220,20%,6%)] dark:to-[hsl(220,18%,8%)] relative overflow-hidden">
                {selectedPropertyForDetail.images &&
                selectedPropertyForDetail.images.length > 0 ? (
                  <div className="relative h-full">
                    <PropertyImageCarousel
                      images={selectedPropertyForDetail.images}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[hsl(220,20%,4%)]/30 via-transparent to-transparent pointer-events-none"></div>
                  </div>
                ) : selectedPropertyForDetail.photos?.[0] ||
                  selectedPropertyForDetail.images?.[0] ? (
                  <div className="relative h-full">
                    <img
                      src={
                        selectedPropertyForDetail.photos?.[0] ||
                        selectedPropertyForDetail.images?.[0]
                      }
                      alt="Property"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[hsl(220,20%,4%)]/30 via-transparent to-transparent"></div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300 dark:from-[hsl(220,20%,6%)] dark:to-[hsl(220,18%,8%)]">
                    <div className="text-center">
                      <Camera className="h-20 w-20 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                      <p className="text-gray-500 dark:text-gray-400 font-medium">No images available</p>
                    </div>
                  </div>
                )}
                
                {/* Floating Price Badge */}
                <div className="absolute top-6 left-6 bg-white/95 dark:bg-[hsl(220,20%,6%)]/95 backdrop-blur-md rounded-2xl px-4 py-3 shadow-lg border border-white/20 dark:border-gray-700/50">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    $
                    {(
                      selectedPropertyForDetail.monthlyRent ||
                      selectedPropertyForDetail.price ||
                      0
                    ).toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300 font-medium">per month</div>
                </div>

                {/* Property Type Badge */}
                {selectedPropertyForDetail.propertyType && (
                  <div className="absolute bottom-6 left-6 bg-blue-600/90 dark:bg-blue-500/90 backdrop-blur-md text-white rounded-full px-4 py-2 shadow-lg">
                    <span className="text-sm font-medium">
                      {selectedPropertyForDetail.propertyType}
                    </span>
                  </div>
                )}
              </div>

              {/* Right Side - Details */}
              <div className="w-3/5 flex flex-col property-detail-content backdrop-blur-sm">
                {/* Header */}
                <div className="p-8 border-b border-gray-200/50 dark:border-gray-700/50 property-detail-content">
                  <div className="space-y-3">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white leading-tight">
                      {selectedPropertyForDetail.address ||
                        selectedPropertyForDetail.formattedAddress ||
                        selectedPropertyForDetail.streetAddress}
                    </h1>
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                      </svg>
                      <span className="font-medium">
                        {selectedPropertyForDetail.city},{" "}
                        {selectedPropertyForDetail.state}{" "}
                        {selectedPropertyForDetail.zipCode}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Content - Scrollable */}
                <div className="flex-1 overflow-y-auto p-8 space-y-8 property-detail-content">
                  {/* Property Stats - Enhanced Cards */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="group bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/50 dark:to-blue-900/30 border border-blue-200/50 dark:border-blue-700/30 rounded-2xl p-4 text-center hover:shadow-md transition-all duration-200">
                      <div className="text-3xl font-bold text-blue-900 dark:text-blue-100 mb-1">
                        {selectedPropertyForDetail.bedrooms ||
                          selectedPropertyForDetail.beds ||
                          "—"}
                      </div>
                      <div className="text-sm font-medium text-blue-700 dark:text-blue-300">
                        Bedroom{((selectedPropertyForDetail.bedrooms || selectedPropertyForDetail.beds) !== 1) ? 's' : ''}
                      </div>
                    </div>
                    <div className="group bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/50 dark:to-emerald-900/30 border border-emerald-200/50 dark:border-emerald-700/30 rounded-2xl p-4 text-center hover:shadow-md transition-all duration-200">
                      <div className="text-3xl font-bold text-emerald-900 dark:text-emerald-100 mb-1">
                        {selectedPropertyForDetail.bathrooms ||
                          selectedPropertyForDetail.baths ||
                          "—"}
                      </div>
                      <div className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                        Bathroom{((selectedPropertyForDetail.bathrooms || selectedPropertyForDetail.baths) !== 1) ? 's' : ''}
                      </div>
                    </div>
                    <div className="group bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/50 dark:to-purple-900/30 border border-purple-200/50 dark:border-purple-700/30 rounded-2xl p-4 text-center hover:shadow-md transition-all duration-200">
                      <div className="text-3xl font-bold text-purple-900 dark:text-purple-100 mb-1">
                        {(
                          selectedPropertyForDetail.squareFeet ||
                          selectedPropertyForDetail.livingArea
                        )?.toLocaleString() || "—"}
                      </div>
                      <div className="text-sm font-medium text-purple-700 dark:text-purple-300">Sq Ft</div>
                    </div>
                  </div>

                  {/* Key Features */}
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Key Features</h3>
                    <div className="flex flex-wrap gap-3">
                      {selectedPropertyForDetail.isPetFriendly !== undefined && (
                        <div className="flex items-center gap-2 bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-700/50 rounded-full px-4 py-2">
                          <Heart className="h-4 w-4 text-green-600 dark:text-green-400" />
                          <span className="text-green-800 dark:text-green-300 font-medium text-sm">Pet Friendly</span>
                        </div>
                      )}

                      {selectedPropertyForDetail.leaseLengthMonths && (
                        <div className="flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700/50 rounded-full px-4 py-2">
                          <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          <span className="text-blue-800 dark:text-blue-300 font-medium text-sm">
                            {selectedPropertyForDetail.leaseLengthMonths} month lease
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Amenities - Enhanced Grid */}
                  {(selectedPropertyForDetail.hasWasherDryer ||
                    selectedPropertyForDetail.hasElevator ||
                    selectedPropertyForDetail.hasOnsiteLaundry ||
                    selectedPropertyForDetail.hasHardwoodFloors ||
                    selectedPropertyForDetail.hasParkingGarage ||
                    selectedPropertyForDetail.hasSwimmingPool ||
                    selectedPropertyForDetail.allowsSubletting ||
                    selectedPropertyForDetail.isSmokeFree ||
                    selectedPropertyForDetail.hasGym ||
                    selectedPropertyForDetail.hasLiveInSuper) && (
                    <div className="space-y-4">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">Amenities</h3>
                      <div className="grid grid-cols-2 gap-3">
                        {selectedPropertyForDetail.hasWasherDryer && (
                          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
                            <div className="w-3 h-3 bg-emerald-500 dark:bg-emerald-400 rounded-full flex-shrink-0"></div>
                            <span className="text-gray-800 dark:text-gray-200 font-medium">Washer/Dryer in unit</span>
                          </div>
                        )}
                        {selectedPropertyForDetail.hasElevator && (
                          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
                            <div className="w-3 h-3 bg-emerald-500 dark:bg-emerald-400 rounded-full flex-shrink-0"></div>
                            <span className="text-gray-800 dark:text-gray-200 font-medium">Elevator</span>
                          </div>
                        )}
                        {selectedPropertyForDetail.hasOnsiteLaundry && (
                          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
                            <div className="w-3 h-3 bg-emerald-500 dark:bg-emerald-400 rounded-full flex-shrink-0"></div>
                            <span className="text-gray-800 dark:text-gray-200 font-medium">On-site laundry</span>
                          </div>
                        )}
                        {selectedPropertyForDetail.hasHardwoodFloors && (
                          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
                            <div className="w-3 h-3 bg-emerald-500 dark:bg-emerald-400 rounded-full flex-shrink-0"></div>
                            <span className="text-gray-800 dark:text-gray-200 font-medium">Hardwood floors</span>
                          </div>
                        )}
                        {selectedPropertyForDetail.hasParkingGarage && (
                          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
                            <div className="w-3 h-3 bg-emerald-500 dark:bg-emerald-400 rounded-full flex-shrink-0"></div>
                            <span className="text-gray-800 dark:text-gray-200 font-medium">Parking garage</span>
                          </div>
                        )}
                        {selectedPropertyForDetail.hasSwimmingPool && (
                          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
                            <div className="w-3 h-3 bg-emerald-500 dark:bg-emerald-400 rounded-full flex-shrink-0"></div>
                            <span className="text-gray-800 dark:text-gray-200 font-medium">Swimming pool</span>
                          </div>
                        )}
                        {selectedPropertyForDetail.allowsSubletting && (
                          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
                            <div className="w-3 h-3 bg-emerald-500 dark:bg-emerald-400 rounded-full flex-shrink-0"></div>
                            <span className="text-gray-800 dark:text-gray-200 font-medium">Sub-letting allowed</span>
                          </div>
                        )}
                        {selectedPropertyForDetail.isSmokeFree && (
                          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
                            <div className="w-3 h-3 bg-emerald-500 dark:bg-emerald-400 rounded-full flex-shrink-0"></div>
                            <span className="text-gray-800 dark:text-gray-200 font-medium">Smoke-free</span>
                          </div>
                        )}
                        {selectedPropertyForDetail.hasGym && (
                          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
                            <div className="w-3 h-3 bg-emerald-500 dark:bg-emerald-400 rounded-full flex-shrink-0"></div>
                            <span className="text-gray-800 dark:text-gray-200 font-medium">Gym</span>
                          </div>
                        )}
                        {selectedPropertyForDetail.hasLiveInSuper && (
                          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
                            <div className="w-3 h-3 bg-emerald-500 dark:bg-emerald-400 rounded-full flex-shrink-0"></div>
                            <span className="text-gray-800 dark:text-gray-200 font-medium">Live-in super</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Description */}
                  {selectedPropertyForDetail.description && (
                    <div className="space-y-4">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">Description</h3>
                      <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-2xl p-6">
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                          {selectedPropertyForDetail.description}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Required Documents */}
                  {selectedPropertyForDetail.requiredDocuments &&
                    selectedPropertyForDetail.requiredDocuments.length > 0 && (
                      <div className="space-y-4">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Required Documents</h3>
                        <div className="grid grid-cols-2 gap-3">
                          {selectedPropertyForDetail.requiredDocuments.map(
                            (doc: string) => (
                              <div
                                key={doc}
                                className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700/50 rounded-2xl hover:bg-blue-100 dark:hover:bg-blue-800/30 transition-colors"
                              >
                                <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                                <span className="text-blue-800 dark:text-blue-300 font-medium capitalize">
                                  {doc.replace(/_/g, " ")}
                                </span>
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Application Details Modal */}
      {(() => {
        // Create sanitized version for logging (exclude base64 image data)
        const sanitizedAppData = selectedApplicationForDetail
          ? {
              ...selectedApplicationForDetail,
              documents:
                selectedApplicationForDetail.documents?.map((doc: any) => ({
                  ...doc,
                  fileUrl: doc.fileUrl
                    ? `[BASE64_DATA_${doc.mimeType}_${doc.fileSize || 0}B]`
                    : doc.fileUrl,
                })) || [],
            }
          : null;

        return (
          <ApplicationDetailsModal
            isOpen={isApplicationDetailOpen}
            onClose={() => setIsApplicationDetailOpen(false)}
            application={selectedApplicationForDetail}
            conversationId={selectedConversation?.id}
            canManageApplication={
              selectedConversation
                ? (() => {
                    // Only allow management if this is an application conversation AND the current user is NOT the applicant
                    // The applicant is the one who submitted the application (userId in the application data)
                    const isApplicant =
                      selectedApplicationForDetail?.userId === currentUserId ||
                      selectedApplicationForDetail?.applicantData?.userId ===
                        currentUserId;
                    return !!(
                      currentUserId &&
                      selectedConversation.conversationType === "application" &&
                      !isApplicant
                    );
                  })()
                : false
            }
            currentUserId={currentUserId}
          />
        );
      })()}
    </>
  );
}
