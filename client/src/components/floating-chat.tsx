import { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Send, MessageCircle, X, Users, User, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

interface ChatMessage {
  user: string;
  senderUsername: string;
  recipientUsername?: string;
  text: string;
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const privateScrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
      if (payload.isPrivate) {
        setPrivateMessages((prev) => [...prev, payload]);
        if (!isOpen) setUnreadCount(c => c + 1);
      } else {
        setGroupMessages((prev) => [...prev, payload]);
        if (!isOpen) setUnreadCount(c => c + 1);
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

    // Request all users list
    newSocket.emit("get_all_users");

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
      inputRef.current?.focus();
    }
  }, [isOpen]);

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
        to: selectedUser 
      });
    } else {
      socket.emit("message", { text: message.trim() });
    }
    setMessage("");
    inputRef.current?.focus();
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

  const currentUsername = user?.username || "";

  const filteredPrivateMessages = privateMessages.filter(m => 
    (m.senderUsername === currentUsername && m.recipientUsername === selectedUser) ||
    (m.senderUsername === selectedUser && m.recipientUsername === currentUsername)
  );

  if (!user) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50" data-testid="floating-chat-container">
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
                            "rounded-lg px-2.5 py-1.5 text-sm break-words",
                            isMe ? "bg-primary text-primary-foreground" : "bg-muted"
                          )}>
                            {msg.text}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <form onSubmit={sendMessage} className="flex gap-2 p-3 border-t">
                <Input
                  ref={inputRef}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type message... / พิมพ์..."
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
                  <p className="text-xs text-muted-foreground mb-2">Select user / เลือกผู้ใช้:</p>
                  {allUsers.length === 0 ? (
                    <div className="text-center text-muted-foreground text-sm py-8" data-testid="text-no-users">
                      No users / ไม่มีผู้ใช้
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
                        No messages / ยังไม่มีข้อความ
                      </div>
                    ) : (
                      filteredPrivateMessages.map((msg, index) => {
                        const isMe = msg.senderUsername === currentUsername;
                        return (
                          <div
                            key={index}
                            className={cn("flex gap-2", isMe ? "flex-row-reverse" : "")}
                            data-testid={`message-private-${index}`}
                          >
                            <div className={cn(
                              "rounded-lg px-2.5 py-1.5 text-sm break-words max-w-[80%]",
                              isMe ? "bg-primary text-primary-foreground" : "bg-muted"
                            )}>
                              {msg.text}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <form onSubmit={sendMessage} className="flex gap-2 p-3 border-t">
                    <Input
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Type message... / พิมพ์..."
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
