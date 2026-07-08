import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { encryptMessage, decryptMessage } from '../utils/crypto';
import { Send, User as UserIcon, Lock, Loader2, ChevronLeft } from 'lucide-react';
import clsx from 'clsx';

interface Conversation {
  _id: string;
  user1: { _id: string, username: string, publicKey: string };
  user2: { _id: string, username: string, publicKey: string };
  createdAt: string;
}

interface Message {
  _id: string;
  senderId: string;
  ciphertext: string;
  nonce: string;
  createdAt: string;
  decryptedText?: string;
}

const Chat: React.FC = () => {
  const { user, token, privateKey } = useAuth();
  const { socket, isConnected } = useSocket();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fetch conversations
    const fetchConversations = async () => {
      try {
        const response = await fetch('/api/invites/conversations', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (response.ok) {
          setConversations(data);
          if (data.length > 0) setActiveConv(data[0]);
        }
      } catch (err) {
        console.error('Failed to fetch conversations', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchConversations();
  }, [token]);

  useEffect(() => {
    if (!socket || !activeConv || !privateKey) return;

    socket.emit('join_conversation', activeConv._id);
    socket.emit('load_messages', activeConv._id);

    // Identify the other user's public key
    const otherUser = activeConv.user1._id === user?.id ? activeConv.user2 : activeConv.user1;
    const recipientPublicKey = otherUser.publicKey;

    const handlePastMessages = (pastMessages: Message[]) => {
      // Decrypt all past messages
      const decryptedMessages = pastMessages.map(msg => {
        try {
          // If sender is me, I encrypt with their public key and my private key
          // If sender is them, they encrypted with my public key and their private key
          // Decryption works the exact same way for both using Box.
          const decryptedText = decryptMessage(msg.ciphertext, msg.nonce, recipientPublicKey, privateKey);
          return { ...msg, decryptedText };
        } catch (e) {
          return { ...msg, decryptedText: '[Error decrypting message]' };
        }
      });
      setMessages(decryptedMessages);
      scrollToBottom();
    };

    const handleReceiveMessage = (msg: Message) => {
      if (msg.conversationId !== activeConv._id) return;
      
      try {
        const decryptedText = decryptMessage(msg.ciphertext, msg.nonce, recipientPublicKey, privateKey);
        setMessages(prev => [...prev, { ...msg, decryptedText }]);
      } catch (e) {
        setMessages(prev => [...prev, { ...msg, decryptedText: '[Error decrypting message]' }]);
      }
      scrollToBottom();
    };

    const handleTypingStart = ({ userId }: { userId: string }) => {
      if (userId !== user?.id) setIsTyping(true);
    };

    const handleTypingStop = ({ userId }: { userId: string }) => {
      if (userId !== user?.id) setIsTyping(false);
    };

    socket.on('past_messages', handlePastMessages);
    socket.on('receive_message', handleReceiveMessage);
    socket.on('typing_start', handleTypingStart);
    socket.on('typing_stop', handleTypingStop);

    return () => {
      socket.off('past_messages', handlePastMessages);
      socket.off('receive_message', handleReceiveMessage);
      socket.off('typing_start', handleTypingStart);
      socket.off('typing_stop', handleTypingStop);
    };
  }, [socket, activeConv, privateKey, user?.id]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeConv || !socket || !privateKey) return;

    const otherUser = activeConv.user1._id === user?.id ? activeConv.user2 : activeConv.user1;
    
    try {
      // Encrypt message
      const { ciphertext, nonce } = encryptMessage(inputText, otherUser.publicKey, privateKey);
      
      socket.emit('send_message', {
        conversationId: activeConv._id,
        ciphertext,
        nonce
      });
      
      setInputText('');
      socket.emit('typing_stop', activeConv._id);
    } catch (err) {
      console.error('Failed to encrypt/send message', err);
    }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    if (!socket || !activeConv) return;
    
    if (e.target.value) {
      socket.emit('typing_start', activeConv._id);
    } else {
      socket.emit('typing_stop', activeConv._id);
    }
  };

  if (isLoading) {
    return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-primary" size={40} /></div>;
  }

  return (
    <div className="flex h-full w-full">
      {/* Conversations List */}
      <div className={clsx(
        "border-r border-border bg-background flex flex-col h-full transition-all duration-300",
        activeConv ? "hidden md:flex md:w-80" : "w-full md:w-80"
      )}>
        <div className="p-4 border-b border-border bg-card">
          <h2 className="font-semibold text-lg">Conversations</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground flex flex-col items-center gap-3 mt-10">
              <UserIcon size={40} className="text-muted" />
              <p>No conversations yet.</p>
              <p className="text-sm">Go to Invites to connect with someone.</p>
            </div>
          ) : (
            conversations.map(conv => {
              const otherUser = conv.user1._id === user?.id ? conv.user2 : conv.user1;
              const isActive = activeConv?._id === conv._id;
              
              return (
                <div 
                  key={conv._id}
                  onClick={() => setActiveConv(conv)}
                  className={clsx(
                    "p-4 border-b border-border cursor-pointer transition-colors flex items-center gap-3",
                    isActive ? "bg-secondary" : "hover:bg-secondary/50"
                  )}
                >
                  <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center flex-shrink-0 font-bold">
                    {otherUser.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="overflow-hidden">
                    <h3 className="font-medium truncate">{otherUser.username}</h3>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Lock size={10} /> Encrypted connection
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Chat Area */}
      {activeConv ? (
        <div className="flex-1 flex flex-col h-full bg-background relative w-full">
          {/* Header */}
          <div className="h-16 border-b border-border bg-card/80 backdrop-blur-md flex items-center px-4 md:px-6 absolute top-0 w-full z-10">
            <button 
              onClick={() => setActiveConv(null)}
              className="md:hidden mr-3 p-2 -ml-2 rounded-md hover:bg-secondary text-muted-foreground transition-colors"
            >
              <ChevronLeft size={24} />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                {(activeConv.user1._id === user?.id ? activeConv.user2 : activeConv.user1).username.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="font-semibold text-foreground">
                  {(activeConv.user1._id === user?.id ? activeConv.user2 : activeConv.user1).username}
                </h3>
                {isTyping ? (
                  <p className="text-xs text-primary animate-pulse">typing...</p>
                ) : (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Lock size={10} /> End-to-end encrypted
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 pt-24 pb-4 scroll-smooth">
            <div className="space-y-4">
              {messages.map((msg, idx) => {
                const isMe = msg.senderId === user?.id;
                const showAvatar = idx === 0 || messages[idx - 1].senderId !== msg.senderId;
                
                return (
                  <div key={msg._id} className={clsx("flex flex-col", isMe ? "items-end" : "items-start")}>
                    <div className={clsx(
                      "max-w-[75%] md:max-w-[60%] rounded-2xl px-4 py-2.5 shadow-sm",
                      isMe 
                        ? "bg-primary text-primary-foreground rounded-tr-sm" 
                        : "bg-secondary text-secondary-foreground rounded-tl-sm border border-border/50"
                    )}>
                      <p className="whitespace-pre-wrap break-words">{msg.decryptedText}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground mt-1 px-1">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input Area */}
          <div className="p-4 bg-card border-t border-border">
            <form onSubmit={handleSendMessage} className="flex gap-2 items-end">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={inputText}
                  onChange={handleTyping}
                  placeholder="Type an encrypted message..."
                  className="w-full bg-input border border-border rounded-full pl-5 pr-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm"
                  disabled={!isConnected}
                />
              </div>
              <button
                type="submit"
                disabled={!inputText.trim() || !isConnected}
                className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={18} className="ml-1" />
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center bg-background/50">
          <div className="text-center p-8">
            <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock size={32} />
            </div>
            <h2 className="text-xl font-medium mb-2">Absolute Privacy</h2>
            <p className="text-muted-foreground max-w-sm mx-auto">
              Your messages are encrypted on your device and can only be decrypted by the recipient. The server cannot read your data.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;
