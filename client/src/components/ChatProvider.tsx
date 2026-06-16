import { createContext, useContext, useState, ReactNode } from "react";
import Chatbot from "./Chatbot";

interface ChatContextType {
  isOpen: boolean;
  userType: 'tenant' | 'landlord' | 'business';
  openChat: (userType?: 'tenant' | 'landlord' | 'business') => void;
  closeChat: () => void;
  toggleChat: () => void;
  setUserType: (userType: 'tenant' | 'landlord' | 'business') => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function useChatbot() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChatbot must be used within a ChatProvider");
  }
  return context;
}

interface ChatProviderProps {
  children: ReactNode;
  defaultUserType?: 'tenant' | 'landlord' | 'business';
}

export function ChatProvider({ children, defaultUserType = 'tenant' }: ChatProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [userType, setUserType] = useState<'tenant' | 'landlord' | 'business'>(defaultUserType);

  const openChat = (type?: 'tenant' | 'landlord' | 'business') => {
    if (type) setUserType(type);
    setIsOpen(true);
  };

  const closeChat = () => {
    setIsOpen(false);
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  return (
    <ChatContext.Provider 
      value={{ 
        isOpen, 
        userType, 
        openChat, 
        closeChat, 
        toggleChat, 
        setUserType 
      }}
    >
      {children}
      <Chatbot 
        userType={userType}
        isOpen={isOpen}
        onToggle={toggleChat}
      />
    </ChatContext.Provider>
  );
}

export default ChatProvider;