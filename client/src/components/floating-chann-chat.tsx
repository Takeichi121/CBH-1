import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, X, Loader2, Bot, User, Trash2, FileText, Palette, ImagePlus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { useChatCustomization, ChatCustomizationPanel } from "@/components/chat-customization";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  imageUrl?: string;
}

export function FloatingChannChat() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      alert("ไฟล์ใหญ่เกินไป (สูงสุด 4MB)");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const removeImagePreview = () => {
    setImagePreview(null);
  };

  const sendMessage = async () => {
    if ((!message.trim() && !imagePreview) || isLoading) return;

    const token = localStorage.getItem("bk_token");
    if (!token) return;

    const currentImage = imagePreview;
    const userMessage: ChatMessage = {
      role: "user",
      content: message.trim() || (currentImage ? "ส่งรูปภาพ" : ""),
      timestamp: new Date().toISOString(),
      imageUrl: currentImage || undefined,
    };

    setMessages(prev => [...prev, userMessage]);
    setMessage("");
    setImagePreview(null);
    setIsLoading(true);

    try {
      const body: any = {
        token,
        message: userMessage.content,
        history: messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
      };
      if (currentImage) {
        body.imageBase64 = currentImage;
      }

      const res = await fetch("/api/chann", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (data.ok && data.reply) {
        const aiMessage: ChatMessage = {
          role: "assistant",
          content: data.reply,
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, aiMessage]);
      } else {
        const errorMessage: ChatMessage = {
          role: "assistant",
          content: data.message || "เกิดข้อผิดพลาด กรุณาลองใหม่",
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      const errorMessage: ChatMessage = {
        role: "assistant",
        content: "ไม่สามารถเชื่อมต่อกับ Chann ได้ กรุณาลองใหม่",
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const [isSummarizing, setIsSummarizing] = useState(false);
  const [showCustomization, setShowCustomization] = useState(false);
  const { getBubbleColorClass, getBubbleStyleClass, getAvatarStyleClass } = useChatCustomization();

  const summarizeChat = async () => {
    if (messages.length === 0 || isSummarizing) return;
    
    setIsSummarizing(true);
    try {
      // For floating chat, we might not have a conversation ID if it's in-memory
      // But let's check if there's a way to get one or use a generic summary endpoint
      // Given the floating chat uses /api/chann with history, let's implement a quick summary via AI directly
      
      const token = localStorage.getItem("bk_token");
      if (!token) return;

      const res = await fetch("/api/chann", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          message: "ช่วยสรุปบทสนทนาทั้งหมดที่เราคุยกันมาให้ทีครับนาย",
          history: messages.slice(-20),
        }),
      });

      const data = await res.json();
      if (data.ok && data.reply) {
        const aiMessage: ChatMessage = {
          role: "assistant",
          content: `--- สรุปบทสนทนา ---\n${data.reply}`,
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, aiMessage]);
      }
    } catch (error) {
      console.error("Summary error:", error);
    } finally {
      setIsSummarizing(false);
    }
  };

  const clearHistory = () => {
    setMessages([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!user) return null;

  return (
    <>
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          size="lg"
          className="fixed bottom-32 md:bottom-16 right-4 z-50 rounded-full shadow-lg"
          data-testid="button-open-chann-chat"
        >
          <Bot className="w-5 h-5 mr-1" />
          <span className="text-sm">Chann</span>
        </Button>
      )}

      {isOpen && (
        <div className="fixed bottom-32 md:bottom-4 right-4 z-[51] w-[360px] max-w-[calc(100vw-2rem)] h-[460px] max-h-[calc(100vh-10rem)] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden" data-testid="container-chann-chat">
          <div className="flex items-center justify-between p-4 bg-primary text-primary-foreground">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold" data-testid="text-chann-title">Chann AI</h3>
                <p className="text-xs opacity-80" data-testid="text-chann-subtitle">ผู้ช่วยอัจฉริยะ</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={summarizeChat}
                disabled={messages.length === 0 || isSummarizing}
                title="สรุปบทสนทนา"
                data-testid="button-summarize-chann"
              >
                {isSummarizing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileText className="w-4 h-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowCustomization(true)}
                title="ปรับแต่งแชท"
                data-testid="button-customize-chat"
              >
                <Palette className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={clearHistory}
                title="ล้างประวัติ"
                data-testid="button-clear-chann-history"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                data-testid="button-close-chann-chat"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4" data-testid="container-chann-messages">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground" data-testid="container-chann-empty">
                <Bot className="w-16 h-16 mb-4 opacity-30" />
                <p className="font-medium">สวัสดีครับ! ผมชื่อ Chann</p>
                <p className="text-sm mt-1">ผู้ช่วยอัจฉริยะพร้อมช่วยเหลือคุณ</p>
                <p className="text-xs mt-2 opacity-70">ถามอะไรก็ได้ครับ</p>
              </div>
            )}

            {messages.map((msg, index) => (
              <div
                key={index}
                className={cn(
                  "flex gap-3",
                  msg.role === "user" ? "justify-end" : "justify-start"
                )}
                data-testid={`message-chann-${msg.role}-${index}`}
              >
                {msg.role === "assistant" && (
                  <Avatar className={cn("w-8 h-8 flex-shrink-0", getAvatarStyleClass())}>
                    <AvatarFallback className={cn("bg-primary text-primary-foreground text-xs", getAvatarStyleClass())}>
                      <Bot className="w-4 h-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={cn(
                    "max-w-[80%] px-4 py-2 text-sm",
                    msg.role === "user"
                      ? cn(getBubbleColorClass(), "text-white", getBubbleStyleClass())
                      : cn("bg-muted text-foreground", getBubbleStyleClass())
                  )}
                >
                  {msg.imageUrl && (
                    <img
                      src={msg.imageUrl}
                      alt="sent"
                      className="max-w-full max-h-40 rounded-md mb-1 cursor-pointer"
                      onClick={() => window.open(msg.imageUrl, "_blank")}
                      data-testid={`img-chann-${index}`}
                    />
                  )}
                  {msg.content && msg.content !== "ส่งรูปภาพ" && (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  )}
                </div>
                {msg.role === "user" && (
                  <Avatar className={cn("w-8 h-8 flex-shrink-0", getAvatarStyleClass())}>
                    <AvatarFallback className={cn("bg-muted text-muted-foreground text-xs", getAvatarStyleClass())}>
                      <User className="w-4 h-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 justify-start" data-testid="container-chann-loading">
                <Avatar className="w-8 h-8 flex-shrink-0">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    <Bot className="w-4 h-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="p-3 border-t border-border">
            {imagePreview && (
              <div className="mb-2 relative inline-block">
                <img src={imagePreview} alt="preview" className="max-h-20 rounded-md border" />
                <button
                  onClick={removeImagePreview}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center text-xs"
                  data-testid="button-remove-image-preview"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageSelect}
              data-testid="input-chann-image"
            />
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => imageInputRef.current?.click()}
                disabled={isLoading}
                data-testid="button-chann-image-upload"
              >
                <ImagePlus className="w-4 h-4" />
              </Button>
              <Input
                ref={inputRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="พิมพ์ข้อความ..."
                disabled={isLoading}
                className="flex-1"
                data-testid="input-chann-message"
              />
              <Button
                onClick={sendMessage}
                disabled={(!message.trim() && !imagePreview) || isLoading}
                size="icon"
                data-testid="button-send-chann-message"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      <ChatCustomizationPanel 
        isOpen={showCustomization} 
        onClose={() => setShowCustomization(false)} 
      />
    </>
  );
}
