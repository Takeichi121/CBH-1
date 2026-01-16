import { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, MessageCircle, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface ChatMessage {
  user: string;
  text: string;
  timestamp: string;
}

export default function ChatPage() {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [message, setMessage] = useState("");
  const [chatLog, setChatLog] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const token = localStorage.getItem("bk_token");
    if (!token) {
      setConnectionError("Please login to use chat / กรุณาเข้าสู่ระบบเพื่อใช้แชท");
      return;
    }

    const newSocket = io(window.location.origin, {
      transports: ["websocket", "polling"],
      auth: { token }
    });

    newSocket.on("connect", () => {
      console.log("Connected to chat server");
      setIsConnected(true);
      setConnectionError(null);
    });

    newSocket.on("connect_error", (error) => {
      console.error("Connection error:", error.message);
      setConnectionError(error.message);
      setIsConnected(false);
    });

    newSocket.on("chat_history", (history: ChatMessage[]) => {
      setChatLog(history);
    });

    newSocket.on("message", (payload: ChatMessage) => {
      setChatLog((prev) => [...prev, payload]);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatLog]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && socket && isConnected) {
      socket.emit("message", { text: message.trim() });
      setMessage("");
      inputRef.current?.focus();
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

  const currentUser = user?.nickName || user?.fullName || user?.username || "Guest";

  if (connectionError) {
    return (
      <div className="flex flex-col h-full max-w-2xl mx-auto p-4 md:p-6">
        <Card className="flex flex-col flex-1">
          <CardHeader className="border-b pb-4">
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Staff Chat / แชทพนักงาน
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col flex-1 items-center justify-center">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <p className="text-center text-muted-foreground" data-testid="text-connection-error">
              {connectionError}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="flex flex-col h-full max-w-2xl mx-auto p-4 md:p-6">
        <Card className="flex flex-col flex-1">
          <CardHeader className="border-b pb-4">
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Staff Chat / แชทพนักงาน
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col flex-1 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
            <p className="text-center text-muted-foreground" data-testid="text-connecting">
              Connecting... / กำลังเชื่อมต่อ...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto p-4 md:p-6">
      <Card className="flex flex-col flex-1 overflow-hidden">
        <CardHeader className="border-b pb-4">
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Staff Chat / แชทพนักงาน
            <span className="ml-auto text-xs font-normal text-green-600" data-testid="text-connected">
              Connected / เชื่อมต่อแล้ว
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col flex-1 p-0 overflow-hidden">
          <div 
            ref={scrollRef}
            className="flex-1 p-4 overflow-y-auto"
          >
            <div className="space-y-4">
              {chatLog.length === 0 && (
                <div className="text-center text-muted-foreground py-8" data-testid="text-no-messages">
                  No messages yet / ยังไม่มีข้อความ
                </div>
              )}
              {chatLog.map((msg, index) => {
                const isMe = msg.user === currentUser;
                return (
                  <div
                    key={index}
                    className={`flex gap-3 ${isMe ? "flex-row-reverse" : ""}`}
                    data-testid={`chat-message-${index}`}
                  >
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className={isMe ? "bg-primary text-primary-foreground" : "bg-muted"}>
                        {getInitials(msg.user)}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium" data-testid={`text-username-${index}`}>{msg.user}</span>
                        <span className="text-xs text-muted-foreground" data-testid={`text-time-${index}`}>
                          {formatTime(msg.timestamp)}
                        </span>
                      </div>
                      <div
                        className={`rounded-lg px-3 py-2 max-w-[280px] break-words ${
                          isMe
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                        data-testid={`text-message-${index}`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <form
            onSubmit={sendMessage}
            className="flex gap-2 p-4 border-t bg-background"
          >
            <Input
              ref={inputRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message... / พิมพ์ข้อความ..."
              className="flex-1"
              data-testid="input-chat-message"
            />
            <Button
              type="submit"
              disabled={!message.trim() || !isConnected}
              data-testid="button-send-message"
            >
              <Send className="h-4 w-4 mr-1" />
              Send / ส่ง
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
