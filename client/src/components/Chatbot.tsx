import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  MessageCircle, 
  Send, 
  Bot, 
  User, 
  Minimize2, 
  Maximize2, 
  X,
  Home,
  Building2,
  Briefcase
} from "lucide-react";
import type { Conversation, ChatMessage, ChatSuggestion } from "@shared/schema";

interface ChatbotProps {
  userType?: 'tenant' | 'landlord' | 'business';
  isOpen?: boolean;
  onToggle?: () => void;
}

export default function Chatbot({ userType = 'tenant', isOpen = false, onToggle }: ChatbotProps) {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isMinimized, setIsMinimized] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get conversations
  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
    enabled: isOpen,
  });

  // Get current conversation messages
  const { data: messages = [] } = useQuery<ChatMessage[]>({
    queryKey: ["/api/conversations", currentConversationId, "messages"],
    enabled: !!currentConversationId,
  });

  // Get chat suggestions
  const { data: suggestions = [] } = useQuery<ChatSuggestion[]>({
    queryKey: ["/api/chat/suggestions", { userType, context: "greeting" }],
    enabled: isOpen,
  });

  // Create conversation mutation
  const createConversationMutation = useMutation({
    mutationFn: async (data: { userType: string; topic?: string; title?: string }) => {
      const res = await apiRequest("POST", "/api/conversations", data);
      return await res.json();
    },
    onSuccess: (conversation: Conversation) => {
      console.log('Conversation created:', conversation);
      setCurrentConversationId(conversation.id);
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      
      // If there's a pending message, send it now
      if (messageInput.trim()) {
        console.log('Sending pending message after conversation creation...');
        setTimeout(() => {
          setIsTyping(true);
          sendMessageMutation.mutate({
            content: messageInput.trim(),
            messageType: 'text'
          });
        }, 100); // Small delay to ensure state is updated
      }
    },
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (data: { content: string; messageType?: string; conversationId?: number }) => {
      const convId = data.conversationId || currentConversationId;
      if (!convId) throw new Error("No conversation selected");
      const res = await apiRequest("POST", `/api/conversations/${convId}/messages`, data);
      return await res.json();
    },
    onSuccess: (data, variables) => {
      const convId = variables.conversationId || currentConversationId;
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", convId, "messages"] });
      setMessageInput("");
      setIsTyping(false);
    },
    onError: (error) => {
      console.error('Send message error:', error);
      setIsTyping(false);
      toast({
        title: "Error",
        description: `Failed to send message: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Don't auto-create conversations anymore - let user initiate
  // useEffect(() => {
  //   if (isOpen && !currentConversationId && !createConversationMutation.isPending) {
  //     console.log('Creating new conversation on open...');
  //     startNewConversation();
  //   }
  // }, [isOpen, currentConversationId, createConversationMutation.isPending]);

  const startNewConversation = () => {
    console.log('Starting new conversation...');
    createConversationMutation.mutate({
      userType,
      topic: 'general',
      title: `${userType} chat ${new Date().toLocaleDateString()}`
    });
  };

  const handleSendMessage = async () => {
    console.log('Send message clicked. Input:', messageInput.trim(), 'ConversationID:', currentConversationId);
    
    if (!messageInput.trim()) {
      console.log('No message input');
      return;
    }
    
    // If no conversation exists, create one first and then send the message
    if (!currentConversationId) {
      console.log('No conversation ID, creating new conversation first...');
      
      try {
        // Create conversation first
        const conversation = await createConversationMutation.mutateAsync({
          userType,
          topic: 'general',
          title: `${userType} chat ${new Date().toLocaleDateString()}`
        });
        
        console.log('Conversation created, now sending message with ID:', conversation.id);
        
        // Now send the message with the new conversation ID
        setIsTyping(true);
        await sendMessageMutation.mutateAsync({
          content: messageInput.trim(),
          messageType: 'text',
          conversationId: conversation.id
        });
        
      } catch (error) {
        console.error('Error creating conversation or sending message:', error);
        toast({
          title: "Error",
          description: "Failed to create conversation or send message",
          variant: "destructive",
        });
      }
      return;
    }
    
    console.log('Sending message...');
    setIsTyping(true);
    sendMessageMutation.mutate({
      content: messageInput.trim(),
      messageType: 'text'
    });
  };

  const handleSuggestionClick = (suggestionText: string) => {
    setMessageInput(suggestionText);
    handleSendMessage();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getUserTypeIcon = (type: string) => {
    switch (type) {
      case 'landlord': return <Building2 className="h-4 w-4" />;
      case 'business': return <Briefcase className="h-4 w-4" />;
      default: return <Home className="h-4 w-4" />;
    }
  };

  const getUserTypeColor = (type: string) => {
    switch (type) {
      case 'landlord': return 'bg-blue-600';
      case 'business': return 'bg-green-600';
      default: return 'bg-blue-600';
    }
  };

  // Show chatbot for everyone, authenticated or not

  // Chat toggle button when closed
  if (!isOpen) {
    return (
      <Button
        onClick={onToggle}
        className={`fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-xl ${getUserTypeColor(userType)} hover:scale-105 transition-all duration-200 z-30`}
        title="Need help? Chat with us!"
      >
        <MessageCircle className="h-7 w-7 text-white" />
        <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
          !
        </span>
      </Button>
    );
  }

  return (
    <Card className={`fixed bottom-6 right-6 z-30 shadow-2xl border-0 rounded-xl transition-all duration-300 animate-in slide-in-from-bottom-2 ${
      isMinimized ? 'w-80 h-16' : 'w-96 h-[600px]'
    }`}>
      {/* Header */}
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-full ${getUserTypeColor(userType)}`}>
              {getUserTypeIcon(userType)}
            </div>
            <div>
              <CardTitle className="text-sm">
                {userType === 'tenant' && 'Tenant Assistant'}
                {userType === 'landlord' && 'Landlord Assistant'}
                {userType === 'business' && 'Business Assistant'}
              </CardTitle>
              <p className="text-xs text-gray-500">Always here to help</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(!isMinimized)}
              className="h-8 w-8 p-0"
            >
              {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggle}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {!isMinimized && (
        <CardContent className="p-0 flex flex-col h-[520px]">
          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-8">
                  <Bot className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">
                    {userType === 'tenant' && "Hi! I'm here to help you find your perfect rental home."}
                    {userType === 'landlord' && "Hello! I can help you manage properties and screen tenants."}
                    {userType === 'business' && "Welcome! I can help grow your real estate business."}
                  </p>
                  {suggestions.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600">Try asking:</p>
                      {suggestions.slice(0, 3).map((suggestion, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          onClick={() => handleSuggestionClick(suggestion.suggestion)}
                          className="block mx-auto"
                        >
                          {suggestion.suggestion}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.senderType === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] ${message.senderType === 'user' ? 'order-2' : 'order-1'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      {message.senderType === 'bot' ? (
                        <Bot className="h-4 w-4 text-gray-500" />
                      ) : (
                        <User className="h-4 w-4 text-gray-500" />
                      )}
                      <span className="text-xs text-gray-500">
                        {message.senderType === 'bot' ? 'Assistant' : 'You'}
                      </span>
                    </div>
                    <div
                      className={`p-3 rounded-lg ${
                        message.senderType === 'user'
                          ? `${getUserTypeColor(userType)} text-white`
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                    </div>
                    
                    {/* Show suggestions for bot messages */}
                    {message.senderType === 'bot' && message.metadata?.suggestions && (
                      <div className="mt-2 space-y-1">
                        {message.metadata.suggestions.map((suggestion: string, index: number) => (
                          <Button
                            key={index}
                            variant="outline"
                            size="sm"
                            onClick={() => handleSuggestionClick(suggestion)}
                            className="text-xs mr-1 mb-1"
                          >
                            {suggestion}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 p-3 rounded-lg">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          <Separator />

          {/* Input */}
          <div className="p-4">
            <div className="flex gap-2">
              <Input
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                disabled={sendMessageMutation.isPending}
                className="flex-1"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!messageInput.trim() || sendMessageMutation.isPending}
                className={getUserTypeColor(userType)}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}