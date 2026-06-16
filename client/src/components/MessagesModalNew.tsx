import { useState, useRef, useEffect } from "react";
import { X, MessageCircle, Send, Search, Plus, User } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format, isToday, isYesterday } from "date-fns";

interface AuthUser {
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
  propertyData?: any;
  lastMessageAt: string;
  otherUser?: AuthUser;
  otherParticipant?: AuthUser;
  lastMessage?: {
    content: string;
    createdAt: string;
    senderId: string;
  };
  unreadCount?: number;
}

interface Message {
  id: number;
  conversationId: number;
  senderId: string;
  messageType: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  sender?: AuthUser;
}

interface MessagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
}

export default function MessagesModal({
  isOpen,
  onClose,
  currentUserId,
}: MessagesModalProps) {
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<AuthUser | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debug conversation data when it loads
  useEffect(() => {
    if (conversations && conversations.length > 0) {
      console.log('Frontend conversation data:', {
        firstConversation: {
          id: conversations[0].id,
          otherParticipant: conversations[0].otherParticipant,
          otherUser: conversations[0].otherUser,
        }
      });
    }
  }, [conversations]);

  // Fetch conversations
  const { data: conversations = [], isLoading: isLoadingConversations } =
    useQuery({
      queryKey: ["/api/conversations"],
      enabled: isOpen,
      refetchOnMount: true,
      refetchOnWindowFocus: false,
      staleTime: 0, // Always fetch fresh data
    });

  // Fetch friends for new conversation
  const { data: friends = [], isLoading: isLoadingFriends } = useQuery({
    queryKey: ["/api/friends"],
    enabled: isOpen && showNewConversation,
  });

  // Fetch messages for selected conversation
  const { data: messages = [], isLoading: isLoadingMessages } = useQuery({
    queryKey: [`/api/conversations/${selectedConversation?.id}/messages`],
    enabled: isOpen && !!selectedConversation,
    refetchInterval: 5000, // Poll for new messages every 5 seconds
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (selectedConversation) {
        return await apiRequest(
          "POST",
          `/api/conversations/${selectedConversation.id}/messages`,
          {
            content,
          },
        );
      } else if (selectedFriend) {
        // Create new conversation
        return await apiRequest("POST", "/api/conversations/start", {
          receiverId: selectedFriend.id,
          message: content,
        });
      }
    },
    onSuccess: (response) => {
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });

      // If this was a new conversation with a friend, switch to that conversation
      if (selectedFriend && response?.conversation) {
        setSelectedConversation(response.conversation);
        setSelectedFriend(null);
        // Also invalidate messages for the new conversation
        queryClient.invalidateQueries({
          queryKey: [`/api/conversations/${response.conversation.id}/messages`],
        });
      } else if (selectedConversation) {
        queryClient.invalidateQueries({
          queryKey: [`/api/conversations/${selectedConversation.id}/messages`],
        });
      }
      inputRef.current?.focus();
    },
    onError: (error) => {
      toast({
        title: "Failed to send message",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() && (selectedConversation || selectedFriend)) {
      sendMessageMutation.mutate(newMessage.trim());
    }
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) {
      return format(date, "h:mm a");
    } else if (isYesterday(date)) {
      return "Yesterday " + format(date, "h:mm a");
    } else {
      return format(date, "MMM d, h:mm a");
    }
  };

  const getUserName = (user: AuthUser) => {
    console.log('getUserName called with user:', {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      hasFirstName: !!user.firstName,
      hasLastName: !!user.lastName
    });
    
    if (user.firstName || user.lastName) {
      const name = `${user.firstName || ""} ${user.lastName || ""}`.trim();
      console.log('Returning name:', name);
      return name;
    }
    console.log('Falling back to email:', user.email);
    return user.email || "Unknown";
  };

  const getInitials = (user: AuthUser) => {
    const name = getUserName(user);
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const filteredFriends = friends.filter(
    (friend: AuthUser) =>
      getUserName(friend).toLowerCase().includes(searchQuery.toLowerCase()) ||
      friend.email.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-5xl h-[80vh] flex overflow-hidden">
        {/* Conversations List */}
        <div className="w-1/3 border-r flex flex-col">
          <div className="p-4 border-b space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Messages</h2>
              <div className="flex gap-2">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    setShowNewConversation(!showNewConversation);
                    setSelectedConversation(null);
                    setSelectedFriend(null);
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={onClose}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {showNewConversation && (
              <Input
                placeholder="Search friends..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            )}
          </div>

          <ScrollArea className="flex-1">
            {showNewConversation ? (
              // Friends list for new conversation
              <div className="p-2">
                {isLoadingFriends ? (
                  <div className="text-center text-muted-foreground py-4">
                    Loading friends...
                  </div>
                ) : filteredFriends.length === 0 ? (
                  <div className="text-center text-muted-foreground py-4">
                    {searchQuery ? "No friends found" : "No friends yet"}
                  </div>
                ) : (
                  filteredFriends.map((friend: AuthUser) => (
                    <button
                      key={friend.id}
                      onClick={() => {
                        setSelectedFriend(friend);
                        setSelectedConversation(null);
                        setShowNewConversation(false);
                        setSearchQuery("");
                      }}
                      className="w-full p-3 hover:bg-muted rounded-lg flex items-center gap-3 transition-colors"
                    >
                      <Avatar>
                        <AvatarImage src={friend.profileImageUrl} />
                        <AvatarFallback>{getInitials(friend)}</AvatarFallback>
                      </Avatar>
                      <div className="text-left flex-1">
                        <div className="font-medium">{getUserName(friend)}</div>
                        <div className="text-sm text-muted-foreground">
                          {friend.email}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            ) : (
              // Conversations list
              <div className="p-2">
                {isLoadingConversations ? (
                  <div className="text-center text-muted-foreground py-4">
                    Loading conversations...
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="text-center text-muted-foreground py-4">
                    No conversations yet
                  </div>
                ) : (
                  conversations.map((conversation: Conversation) => (
                    <button
                      key={conversation.id}
                      onClick={() => {
                        setSelectedConversation(conversation);
                        setSelectedFriend(null);
                      }}
                      className={`w-full p-3 hover:bg-muted rounded-lg flex items-center gap-3 transition-colors ${
                        selectedConversation?.id === conversation.id
                          ? "bg-muted"
                          : ""
                      }`}
                    >
                      <Avatar>
                        <AvatarImage
                          src={
                            (
                              conversation.otherUser ||
                              conversation.otherParticipant
                            )?.profileImageUrl
                          }
                        />
                        <AvatarFallback>
                          {getInitials(
                            conversation.otherUser ||
                              conversation.otherParticipant!,
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div className="text-left flex-1 min-w-0">
                        <div className="font-medium flex items-center gap-2">
                          {getUserName(
                            conversation.otherUser ||
                              conversation.otherParticipant!,
                          )}
                          {conversation.conversationType ===
                            "property_share" && (
                            <Badge variant="secondary" className="text-xs">
                              Property
                            </Badge>
                          )}
                          {conversation.conversationType ===
                            "agent_contact" && (
                            <Badge variant="secondary" className="text-xs">
                              Agent
                            </Badge>
                          )}
                        </div>
                        {conversation.lastMessage && (
                          <div className="text-sm text-muted-foreground truncate">
                            {conversation.lastMessage.senderId === currentUserId
                              ? "You: "
                              : ""}
                            {conversation.lastMessage.content}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground">
                          {formatMessageTime(conversation.lastMessageAt)}
                        </div>
                      </div>
                      {conversation.unreadCount &&
                        conversation.unreadCount > 0 && (
                          <Badge className="bg-blue-600">
                            {conversation.unreadCount}
                          </Badge>
                        )}
                    </button>
                  ))
                )}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Messages Area */}
        <div className="flex-1 flex flex-col">
          {selectedConversation || selectedFriend ? (
            <>
              {/* Header */}
              <div className="p-4 border-b flex items-center gap-3">
                <Avatar>
                  <AvatarImage
                    src={
                      (
                        selectedConversation?.otherUser ||
                        selectedConversation?.otherParticipant ||
                        selectedFriend
                      )?.profileImageUrl
                    }
                  />
                  <AvatarFallback>
                    {getInitials(
                      selectedConversation?.otherUser ||
                        selectedConversation?.otherParticipant ||
                        selectedFriend!,
                    )}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="font-semibold">
                    {getUserName(
                      selectedConversation?.otherUser ||
                        selectedConversation?.otherParticipant ||
                        selectedFriend!,
                    )}
                  </div>
                  {selectedConversation?.propertyData && (
                    <div className="text-sm text-muted-foreground">
                      {selectedConversation.propertyData.address}
                    </div>
                  )}
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {isLoadingMessages ? (
                    <div className="text-center text-muted-foreground">
                      Loading messages...
                    </div>
                  ) : messages.length === 0 && !selectedFriend ? (
                    <div className="text-center text-muted-foreground">
                      No messages yet
                    </div>
                  ) : (
                    <>
                      {/* Show property card if it's a property conversation */}
                      {selectedConversation?.conversationType ===
                        "property_share" &&
                        selectedConversation.propertyData && (
                          <div className="flex justify-center mb-4">
                            <Card className="p-4 max-w-sm">
                              <div className="text-sm font-medium mb-1">
                                Shared Property
                              </div>
                              <div className="font-semibold">
                                {selectedConversation.propertyData.address}
                              </div>
                              {selectedConversation.propertyData.price && (
                                <div className="text-lg font-bold text-blue-600">
                                  ${selectedConversation.propertyData.price}/mo
                                </div>
                              )}
                              {(selectedConversation.propertyData.bedrooms ||
                                selectedConversation.propertyData
                                  .bathrooms) && (
                                <div className="text-sm text-muted-foreground">
                                  {selectedConversation.propertyData.bedrooms}{" "}
                                  bed •
                                  {selectedConversation.propertyData.bathrooms}{" "}
                                  bath
                                </div>
                              )}
                            </Card>
                          </div>
                        )}

                      {messages.map((message: Message) => {
                        const isOwnMessage = message.senderId === currentUserId;
                        return (
                          <div
                            key={message.id}
                            className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                                isOwnMessage
                                  ? "bg-blue-600 text-white"
                                  : "bg-muted"
                              }`}
                            >
                              <div className="break-words">
                                {message.content}
                              </div>
                              <div
                                className={`text-xs mt-1 ${
                                  isOwnMessage
                                    ? "text-blue-100"
                                    : "text-muted-foreground"
                                }`}
                              >
                                {formatMessageTime(message.createdAt)}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Message Input */}
              <form onSubmit={handleSendMessage} className="p-4 border-t">
                <div className="flex gap-2">
                  <Input
                    ref={inputRef}
                    placeholder={
                      selectedFriend
                        ? "Start a conversation..."
                        : "Type a message..."
                    }
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    type="submit"
                    disabled={
                      !newMessage.trim() || sendMessageMutation.isPending
                    }
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              Select a conversation or start a new one
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
