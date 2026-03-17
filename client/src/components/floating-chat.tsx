import { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Send, MessageCircle, X, Users, User, Loader2, Smile, ImagePlus, Paperclip,
  ThumbsUp, Heart, Smile as SmileIcon, Sparkles, Frown, Flame, Zap, Star, 
  CheckCircle, Trophy, PartyPopper, Rocket, Coffee, Utensils, Clock,
  FileText, FileSpreadsheet, File, FileArchive, Download
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { CHAT_STICKERS } from "@shared/schema";
import { showLocalNotification } from "@/lib/notifications";

const STICKER_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  ThumbsUp, Heart, Smile: SmileIcon, Sparkles, Frown, Flame, Zap, Star,
  CheckCircle, Trophy, PartyPopper, Rocket, Coffee, Utensils, Clock, MessageCircle
};

interface FileAttachment {
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  extractedText?: string;
}

interface ChatMessage {
  user: string;
  senderUsername: string;
  recipientUsername?: string;
  text: string;
  messageType?: string;
  imageUrl?: string | null;
  fileAttachment?: FileAttachment | null;
  timestamp: string;
  isPrivate?: boolean;
}

interface OnlineUser {
  username: string;
  displayName: string;
}

interface AllUser {
  username: string;
  displayName: string;
  online: boolean;
}

export function FloatingChat() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [message, setMessage] = useState("");
  const [groupMessages, setGroupMessages] = useState<ChatMessage[]>([]);
  const [privateMessages, setPrivateMessages] = useState<ChatMessage[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [allUsers, setAllUsers] = useState<AllUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedUserDisplay, setSelectedUserDisplay] = useState<string>("");
  const [isConnected, setIsConnected] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState("group");
  const [showStickers, setShowStickers] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const privateScrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const token = localStorage.getItem("bk_token");
    if (!token || !user) return;

    const newSocket = io(window.location.origin, {
      transports: ["websocket", "polling"],
      auth: { token }
    });

    newSocket.on("connect", () => {
      setIsConnected(true);
    });

    newSocket.on("connect_error", () => {
      setIsConnected(false);
    });

    newSocket.on("chat_history", (history: ChatMessage[]) => {
      setGroupMessages(history.filter(m => !m.isPrivate));
    });

    newSocket.on("message", (payload: ChatMessage) => {
      const isFromMe = payload.senderUsername === user?.username;
      
      if (payload.isPrivate) {
        setPrivateMessages((prev) => [...prev, payload]);
        if (!isOpen && !isFromMe) {
          setUnreadCount(c => c + 1);
          showLocalNotification(
            `ข้อความจาก ${payload.user}`,
            payload.messageType === "sticker" ? "ส่งสติกเกอร์" : payload.text.slice(0, 50)
          );
        }
      } else {
        setGroupMessages((prev) => [...prev, payload]);
        if (!isOpen && !isFromMe) {
          setUnreadCount(c => c + 1);
          showLocalNotification(
            `${payload.user} ในแชทกลุ่ม`,
            payload.messageType === "sticker" ? "ส่งสติกเกอร์" : payload.text.slice(0, 50)
          );
        }
      }
    });

    newSocket.on("online_users", (users: OnlineUser[]) => {
      setOnlineUsers(users.filter(u => u.username !== user.username));
    });

    newSocket.on("all_users", (users: AllUser[]) => {
      setAllUsers(users);
    });

    newSocket.on("private_history", (history: ChatMessage[]) => {
      setPrivateMessages(prev => {
        const existing = new Set(prev.map(m => `${m.senderUsername}-${m.timestamp}`));
        const newMsgs = history.filter(m => !existing.has(`${m.senderUsername}-${m.timestamp}`));
        return [...prev, ...newMsgs];
      });
    });

    newSocket.emit("get_all_users");
    newSocket.emit("get_all_private_history");

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [user]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [groupMessages]);

  useEffect(() => {
    if (privateScrollRef.current) {
      privateScrollRef.current.scrollTop = privateScrollRef.current.scrollHeight;
    }
  }, [privateMessages]);

  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
      if (activeTab === "group") {
        inputRef.current?.focus();
      }
    }
  }, [isOpen, activeTab]);

  useEffect(() => {
    if (selectedUser && socket && isConnected) {
      socket.emit("get_private_history", selectedUser);
    }
  }, [selectedUser, socket, isConnected]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !socket || !isConnected) return;

    if (activeTab === "private" && selectedUser) {
      socket.emit("private_message", { 
        text: message.trim(), 
        to: selectedUser,
        messageType: "text"
      });
    } else {
      socket.emit("message", { text: message.trim(), messageType: "text" });
    }
    setMessage("");
    inputRef.current?.focus();
  };

  const sendSticker = (stickerId: string) => {
    if (!socket || !isConnected) return;
    
    const sticker = CHAT_STICKERS.find(s => s.id === stickerId);
    if (!sticker) return;

    if (activeTab === "private" && selectedUser) {
      socket.emit("private_message", { 
        text: sticker.icon,
        to: selectedUser,
        messageType: "sticker"
      });
    } else {
      socket.emit("message", { text: sticker.icon, messageType: "sticker" });
    }
    setShowStickers(false);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes("pdf")) return FileText;
    if (mimeType.includes("spreadsheet") || mimeType.includes("excel") || mimeType.includes("csv")) return FileSpreadsheet;
    if (mimeType.includes("word") || mimeType.includes("document")) return FileText;
    if (mimeType.includes("zip") || mimeType.includes("rar") || mimeType.includes("7z") || mimeType.includes("tar") || mimeType.includes("gzip")) return FileArchive;
    return File;
  };

  const isImageFile = (file: globalThis.File): boolean => {
    return file.type.startsWith("image/");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !socket || !isConnected) return;

    const token = localStorage.getItem("bk_token");
    if (!token) return;

    setIsUploading(true);
    try {
      if (isImageFile(file)) {
        const formData = new FormData();
        formData.append("image", file);
        formData.append("token", token);

        const response = await fetch("/api/chat/upload-image", {
          method: "POST",
          body: formData
        });

        const result = await response.json();
        if (result.ok && result.imageUrl) {
          if (activeTab === "private" && selectedUser) {
            socket.emit("private_message", { 
              text: "[Image]",
              to: selectedUser,
              messageType: "image",
              imageUrl: result.imageUrl
            });
          } else {
            socket.emit("message", { 
              text: "[Image]", 
              messageType: "image",
              imageUrl: result.imageUrl
            });
          }
        } else {
          console.error("Image upload failed:", result.message);
        }
      } else {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("token", token);

        const response = await fetch("/api/chat/upload-file", {
          method: "POST",
          body: formData
        });

        const result = await response.json();
        if (result.ok) {
          const fileAttachment: FileAttachment = {
            fileUrl: result.fileUrl,
            fileName: result.fileName,
            fileSize: result.fileSize,
            mimeType: result.mimeType,
            ...(result.extractedText ? { extractedText: result.extractedText } : {})
          };

          const msgPayload = {
            text: `[File] ${result.fileName}`,
            messageType: "file",
            fileAttachment
          };

          if (activeTab === "private" && selectedUser) {
            socket.emit("private_message", { ...msgPayload, to: selectedUser });
          } else {
            socket.emit("message", msgPayload);
          }
        } else {
          console.error("File upload failed:", result.message);
        }
      }
    } catch (error) {
      console.error("File upload error:", error);
    } finally {
      setIsUploading(false);
      if (imageInputRef.current) {
        imageInputRef.current.value = "";
      }
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getInitials = (name: string) => {
    return name.substring(0, 2).toUpperCase();
  };

  const renderMessageContent = (msg: ChatMessage, isMe: boolean) => {
    if (msg.messageType === "sticker") {
      const IconComponent = STICKER_ICONS[msg.text];
      if (IconComponent) {
        return (
          <IconComponent className={cn(
            "h-10 w-10",
            isMe ? "text-primary" : "text-foreground"
          )} />
        );
      }
      return <Star className="h-10 w-10 text-muted-foreground" />;
    }
    
    if (msg.messageType === "image" && msg.imageUrl) {
      return (
        <img 
          src={msg.imageUrl} 
          alt="Chat image"
          className="max-w-full max-h-48 rounded cursor-pointer"
          onClick={() => window.open(msg.imageUrl!, "_blank")}
        />
      );
    }

    if (msg.messageType === "file" && msg.fileAttachment) {
      const fa = msg.fileAttachment;
      const IconComp = getFileIcon(fa.mimeType);
      return (
        <div
          className="flex items-center gap-2 p-2 rounded border bg-background/80 min-w-[180px] cursor-pointer"
          onClick={() => window.open(fa.fileUrl, "_blank")}
          data-testid="file-attachment-card"
        >
          <IconComp className="h-8 w-8 shrink-0 text-muted-foreground" />
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-xs font-medium truncate">{fa.fileName}</span>
            <span className="text-[10px] text-muted-foreground">{formatFileSize(fa.fileSize)}</span>
          </div>
          <Download className="h-4 w-4 shrink-0 text-muted-foreground" />
        </div>
      );
    }

    return msg.text;
  };

  const currentUsername = user?.username || "";

  const filteredPrivateMessages = privateMessages.filter(m => 
    (m.senderUsername === currentUsername && m.recipientUsername === selectedUser) ||
    (m.senderUsername === selectedUser && m.recipientUsername === currentUsername)
  );

  const recentChats = (() => {
    const chatPartners = new Map<string, { username: string; displayName: string; lastMessage: string; timestamp: string }>();
    
    privateMessages.forEach(msg => {
      const partnerUsername = msg.senderUsername === currentUsername 
        ? msg.recipientUsername 
        : msg.senderUsername;
      
      if (partnerUsername && partnerUsername !== currentUsername) {
        const existing = chatPartners.get(partnerUsername);
        if (!existing || new Date(msg.timestamp) > new Date(existing.timestamp)) {
          const displayName = msg.senderUsername === currentUsername 
            ? (allUsers.find(u => u.username === partnerUsername)?.displayName || partnerUsername)
            : msg.user;
          
          let lastMessage = msg.text;
          if (msg.messageType === "image") lastMessage = "[รูปภาพ]";
          else if (msg.messageType === "file") lastMessage = "[ไฟล์]";
          else if (msg.messageType === "sticker") lastMessage = "[สติ๊กเกอร์]";
          else if (lastMessage.length > 30) lastMessage = lastMessage.substring(0, 30) + "...";
          
          chatPartners.set(partnerUsername, {
            username: partnerUsername,
            displayName,
            lastMessage,
            timestamp: msg.timestamp
          });
        }
      }
    });
    
    return Array.from(chatPartners.values())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  })();

  if (!user) return null;

  const StickerPicker = () => (
    <Popover open={showStickers} onOpenChange={setShowStickers}>
      <PopoverTrigger asChild>
        <Button 
          type="button" 
          variant="ghost" 
          size="icon" 
          disabled={!isConnected}
          data-testid="button-sticker-picker"
        >
          <Smile className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="end">
        <div className="grid grid-cols-4 gap-1">
          {CHAT_STICKERS.map((sticker) => {
            const IconComponent = STICKER_ICONS[sticker.icon];
            return (
              <Button
                key={sticker.id}
                variant="ghost"
                size="icon"
                onClick={() => sendSticker(sticker.id)}
                title={sticker.label}
                data-testid={`sticker-${sticker.id}`}
              >
                {IconComponent && <IconComponent className="h-5 w-5" />}
              </Button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );

  const FileUploadButton = () => (
    <>
      <input
        ref={imageInputRef}
        type="file"
        className="hidden"
        onChange={handleFileUpload}
        data-testid="input-file-upload"
      />
      <Button 
        type="button" 
        variant="ghost" 
        size="icon" 
        disabled={!isConnected || isUploading}
        onClick={() => imageInputRef.current?.click()}
        data-testid="button-file-upload"
      >
        {isUploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Paperclip className="h-4 w-4" />
        )}
      </Button>
    </>
  );

  return (
    <div className="fixed bottom-20 md:bottom-4 right-4 z-50" data-testid="floating-chat-container">
      {isOpen ? (
        <div className="w-80 sm:w-96 h-[500px] bg-background border rounded-lg shadow-lg flex flex-col overflow-hidden">
          <div className="flex items-center justify-between gap-2 p-3 border-b bg-primary text-primary-foreground">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              <span className="font-semibold">Staff Chat / แชทพนักงาน</span>
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              data-testid="button-close-chat"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-2 rounded-none border-b">
              <TabsTrigger value="group" className="gap-1" data-testid="tab-group-chat">
                <Users className="h-4 w-4" />
                Group / รวม
              </TabsTrigger>
              <TabsTrigger value="private" className="gap-1" data-testid="tab-private-chat">
                <User className="h-4 w-4" />
                Private / ส่วนตัว
              </TabsTrigger>
            </TabsList>

            <TabsContent value="group" className="flex-1 flex flex-col overflow-hidden m-0">
              <div ref={scrollRef} className="flex-1 p-3 overflow-y-auto space-y-3" data-testid="group-messages-container">
                {!isConnected ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : groupMessages.length === 0 ? (
                  <div className="text-center text-muted-foreground text-sm py-8" data-testid="text-no-messages">
                    No messages yet / ยังไม่มีข้อความ
                  </div>
                ) : (
                  groupMessages.map((msg, index) => {
                    const isMe = msg.senderUsername === currentUsername;
                    const isSticker = msg.messageType === "sticker";
                    const isImage = msg.messageType === "image";
                    const isFile = msg.messageType === "file";
                    return (
                      <div
                        key={index}
                        className={cn("flex gap-2", isMe ? "flex-row-reverse" : "")}
                        data-testid={`message-group-${index}`}
                      >
                        <Avatar className="h-7 w-7 shrink-0">
                          <AvatarFallback className={cn("text-xs", isMe ? "bg-primary text-primary-foreground" : "bg-muted")}>
                            {getInitials(msg.user)}
                          </AvatarFallback>
                        </Avatar>
                        <div className={cn("flex flex-col max-w-[70%]", isMe ? "items-end" : "items-start")}>
                          <div className="flex items-center gap-1 mb-0.5 flex-wrap">
                            <span className="text-[10px] font-medium">{msg.user}</span>
                            <span className="text-[10px] text-muted-foreground">{formatTime(msg.timestamp)}</span>
                          </div>
                          <div className={cn(
                            "rounded-lg text-sm break-words",
                            isSticker ? "bg-transparent p-0" : "px-2.5 py-1.5",
                            isImage || isFile ? "p-1 bg-muted/50" : "",
                            !isSticker && !isImage && !isFile && (isMe ? "bg-primary text-primary-foreground" : "bg-muted")
                          )}>
                            {renderMessageContent(msg, isMe)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <form onSubmit={sendMessage} className="flex items-center gap-1 p-2 border-t">
                <StickerPicker />
                <FileUploadButton />
                <Input
                  ref={inputRef}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="พิมพ์ข้อความ..."
                  className="flex-1"
                  disabled={!isConnected}
                  data-testid="input-group-message"
                />
                <Button 
                  type="submit" 
                  size="icon" 
                  disabled={!message.trim() || !isConnected}
                  data-testid="button-send-group"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="private" className="flex-1 flex flex-col overflow-hidden m-0">
              {!selectedUser ? (
                <div className="flex-1 p-3 overflow-y-auto" data-testid="private-user-list">
                  {recentChats.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs text-muted-foreground mb-2">ล่าสุด:</p>
                      <div className="space-y-1">
                        {recentChats.map((chat) => {
                          const userInfo = allUsers.find(u => u.username === chat.username);
                          return (
                            <Button
                              key={chat.username}
                              variant="ghost"
                              className="w-full justify-start gap-2 h-auto py-2"
                              onClick={() => {
                                setSelectedUser(chat.username);
                                setSelectedUserDisplay(chat.displayName);
                              }}
                              data-testid={`button-recent-${chat.username}`}
                            >
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                  {getInitials(chat.displayName)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col items-start flex-1 min-w-0">
                                <div className="flex items-center gap-2 w-full">
                                  <span className="text-sm font-medium">{chat.displayName}</span>
                                  <Badge 
                                    variant="outline" 
                                    className={cn(
                                      "ml-auto text-[10px]",
                                      userInfo?.online 
                                        ? "bg-green-500/10 text-green-600 border-green-500/20" 
                                        : "bg-muted text-muted-foreground border-muted"
                                    )}
                                  >
                                    {userInfo?.online ? "Online" : "Offline"}
                                  </Badge>
                                </div>
                                <span className="text-xs text-muted-foreground truncate w-full text-left">
                                  {chat.lastMessage}
                                </span>
                              </div>
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  <p className="text-xs text-muted-foreground mb-2">
                    {recentChats.length > 0 ? "ผู้ใช้ทั้งหมด:" : "เลือกผู้ใช้:"}
                  </p>
                  {allUsers.length === 0 ? (
                    <div className="text-center text-muted-foreground text-sm py-8" data-testid="text-no-users">
                      ไม่มีผู้ใช้
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {allUsers.map((u) => (
                        <Button
                          key={u.username}
                          variant="ghost"
                          className="w-full justify-start gap-2"
                          onClick={() => {
                            setSelectedUser(u.username);
                            setSelectedUserDisplay(u.displayName);
                          }}
                          data-testid={`button-user-${u.username}`}
                        >
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs bg-muted">
                              {getInitials(u.displayName)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{u.displayName}</span>
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "ml-auto text-[10px]",
                              u.online 
                                ? "bg-green-500/10 text-green-600 border-green-500/20" 
                                : "bg-muted text-muted-foreground border-muted"
                            )}
                          >
                            {u.online ? "Online" : "Offline"}
                          </Badge>
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 p-2 border-b bg-muted/30">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => setSelectedUser(null)}
                      data-testid="button-back-private"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs bg-muted">
                        {getInitials(selectedUserDisplay || selectedUser)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium" data-testid="text-selected-user">
                      {selectedUserDisplay || selectedUser}
                    </span>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-[10px]",
                        allUsers.find(u => u.username === selectedUser)?.online
                          ? "bg-green-500/10 text-green-600 border-green-500/20" 
                          : "bg-muted text-muted-foreground border-muted"
                      )}
                    >
                      {allUsers.find(u => u.username === selectedUser)?.online ? "Online" : "Offline"}
                    </Badge>
                  </div>

                  <div ref={privateScrollRef} className="flex-1 p-3 overflow-y-auto space-y-3" data-testid="private-messages-container">
                    {filteredPrivateMessages.length === 0 ? (
                      <div className="text-center text-muted-foreground text-sm py-8" data-testid="text-no-private-messages">
                        ยังไม่มีข้อความ
                      </div>
                    ) : (
                      filteredPrivateMessages.map((msg, index) => {
                        const isMe = msg.senderUsername === currentUsername;
                        const isSticker = msg.messageType === "sticker";
                        const isImage = msg.messageType === "image";
                        const isFile = msg.messageType === "file";
                        return (
                          <div
                            key={index}
                            className={cn("flex gap-2", isMe ? "flex-row-reverse" : "")}
                            data-testid={`message-private-${index}`}
                          >
                            <div className={cn(
                              "rounded-lg text-sm break-words max-w-[80%]",
                              isSticker ? "bg-transparent p-0" : "px-2.5 py-1.5",
                              isImage || isFile ? "p-1 bg-muted/50" : "",
                              !isSticker && !isImage && !isFile && (isMe ? "bg-primary text-primary-foreground" : "bg-muted")
                            )}>
                              {renderMessageContent(msg, isMe)}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <form onSubmit={sendMessage} className="flex items-center gap-1 p-2 border-t">
                    <StickerPicker />
                    <FileUploadButton />
                    <Input
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="พิมพ์ข้อความ..."
                      className="flex-1"
                      disabled={!isConnected}
                      data-testid="input-private-message"
                    />
                    <Button 
                      type="submit" 
                      size="icon" 
                      disabled={!message.trim() || !isConnected}
                      data-testid="button-send-private"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>
      ) : (
        <Button
          onClick={() => setIsOpen(true)}
          size="lg"
          className="rounded-full shadow-lg relative"
          data-testid="button-open-chat"
        >
          <MessageCircle className="h-6 w-6" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 px-1.5 py-0.5 text-[10px]"
              variant="destructive"
              data-testid="badge-unread-count"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      )}
    </div>
  );
}
