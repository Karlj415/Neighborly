import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, MessageSquare, User, X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface AgentMessagingProps {
  propertyId?: string;
  propertyAddress: string;
  agentName?: string;
  agentPhone?: string;
  zpid?: string;
  onClose: () => void;
  hideHeader?: boolean;
}

interface AgentMessage {
  id: number;
  threadId: string;
  userId: string;
  propertyId?: string;
  propertyAddress?: string;
  message: string;
  senderType: 'user' | 'agent';
  isRead: boolean;
  createdAt: string;
}

export default function AgentMessaging({ 
  propertyId, 
  propertyAddress, 
  agentName = "Property Agent",
  agentPhone,
  zpid,
  onClose,
  hideHeader = false
}: AgentMessagingProps) {
  const [messageText, setMessageText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Generate consistent thread ID from property details
  const threadId = `property_${zpid || propertyId || propertyAddress.replace(/\s+/g, '_').toLowerCase()}`;

  // Fetch messages for this thread
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['/api/agent-messages', threadId],
  });

  // Send message mutation using unified conversation system
  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      // Create a conversation with the agent (using a placeholder agent ID for now)
      // In a real scenario, you'd have actual agent user IDs
      const agentId = "agent_" + (zpid || propertyId || propertyAddress.replace(/\s+/g, '_'));
      
      return await apiRequest('POST', '/api/conversations/agent-contact', {
        agentId,
        propertyId: zpid || propertyId,
        propertyData: {
          address: propertyAddress,
          zpid,
          agentName,
          agentPhone,
        },
        message,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      setMessageText("");
      toast({
        title: "Message sent",
        description: "Your message has been sent to the property agent. You can continue the conversation in Messages.",
      });
      // Close the agent messaging modal and direct user to unified messages
      onClose();
    },
    onError: (error) => {
      console.error('Error sending message:', error);
      toast({
        title: "Failed to send message",
        description: "Please try again later.",
        variant: "destructive",
      });
    },
  });

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [messageText]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSendMessage = () => {
    if (!messageText.trim()) return;
    sendMessageMutation.mutate(messageText.trim());
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-800 border-l border-gray-600">
      {/* Header */}
      {!hideHeader && (
        <div className="p-6 border-b border-gray-600 bg-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500 bg-opacity-20 rounded-full">
                <MessageSquare className="h-4 w-4 text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Message Agent
                </h3>
                <p className="text-sm text-gray-300">
                  {agentName}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {agentPhone && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open(`tel:${agentPhone}`, '_self')}
                  className="text-blue-400 border-blue-500 hover:bg-blue-500 hover:bg-opacity-20"
                >
                  Call {agentPhone}
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="hover:bg-gray-700 text-gray-300"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Property Context */}
      <div className="px-6 py-3 bg-gray-700 border-b border-gray-600">
        <p className="text-xs text-gray-400 mb-1">Property:</p>
        <p className="text-sm font-medium text-white">{propertyAddress}</p>
      </div>

      {/* Messages Display */}
      <div className="flex-1 overflow-y-auto p-6 bg-gray-800">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-500" />
            <p className="text-sm">No messages yet</p>
            <p className="text-xs text-gray-500 mt-1">
              Start a conversation with the property agent
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message: AgentMessage) => (
              <div
                key={message.id}
                className={`flex ${
                  message.senderType === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[70%] rounded-lg px-4 py-2 ${
                    message.senderType === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 border border-gray-600 text-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {message.senderType === 'agent' && (
                      <User className="h-3 w-3" />
                    )}
                    <span className="text-xs opacity-75">
                      {message.senderType === 'user' ? 'You' : agentName}
                    </span>
                  </div>
                  <p className="text-sm">{message.message}</p>
                  <p className={`text-xs mt-1 ${
                    message.senderType === 'user' ? 'text-blue-100' : 'text-gray-400'
                  }`}>
                    {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Message Input */}
      <div className="p-6 border-t border-gray-600 bg-gray-800">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={`Ask ${agentName} about this property...`}
            className="flex-1 min-h-[40px] max-h-[120px] resize-none bg-gray-700 border-gray-600 text-white placeholder-gray-400"
            rows={1}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!messageText.trim() || sendMessageMutation.isPending}
            className="px-4 bg-blue-600 hover:bg-blue-700"
          >
            {sendMessageMutation.isPending ? (
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}