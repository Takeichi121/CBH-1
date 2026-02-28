import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, X, Loader2, Bot, User, Trash2, FileText, Palette, ImagePlus, CheckCircle2, Zap, Calendar, BarChart3, Users, ClipboardList, Database, Sparkles, Paperclip } from "lucide-react";
import * as XLSX from "xlsx";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { useChatCustomization, ChatCustomizationPanel } from "@/components/chat-customization";
import ReactMarkdown from "react-markdown";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  imageUrl?: string;
  toolActions?: string[];
}

export function FloatingChannChat() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && !historyLoaded) {
      const fetchHistory = async () => {
        try {
          const token = localStorage.getItem("bk_token");
          if (!token) return;
          const res = await fetch("/api/chann/history", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
          });
          const data = await res.json();
          if (data.ok && data.messages && data.messages.length > 0) {
            setMessages(data.messages.map((m: any) => ({
              role: m.role,
              content: m.content,
              timestamp: m.createdAt || new Date().toISOString(),
              imageUrl: m.imageUrl || undefined,
            })));
          }
          setHistoryLoaded(true);
        } catch (error) {
          console.error("Failed to load history:", error);
          setHistoryLoaded(true);
        }
      };
      fetchHistory();
    }
  }, [isOpen, historyLoaded]);

  const processImageFile = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    if (file.size > 20 * 1024 * 1024) {
      alert("ไฟล์ใหญ่เกินไป (สูงสุด 20MB)");
      return;
    }
    try {
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      setImagePreview(`data:${file.type};base64,${btoa(binary)}`);
    } catch {
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processImageFile(file);
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) processImageFile(file);
        return;
      }
    }
  };

  const removeImagePreview = () => {
    setImagePreview(null);
  };

  const removeFile = () => {
    setFileContent(null);
    setFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      alert("ขนาดไฟล์ใหญ่เกินไป (จำกัดไม่เกิน 20MB)");
      removeFile();
      return;
    }
    setFileName(file.name);
    const ext = file.name.split(".").pop()?.toLowerCase();
    const reader = new FileReader();
    if (ext === "txt" || ext === "csv") {
      reader.onload = (event) => {
        setFileContent(event.target?.result as string);
      };
      reader.readAsText(file);
    } else if (ext === "xlsx" || ext === "xls") {
      reader.onload = (event) => {
        try {
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          let allText = "";
          workbook.SheetNames.forEach((sheetName) => {
            const ws = workbook.Sheets[sheetName];
            allText += `\n--- Sheet: ${sheetName} ---\n`;
            allText += XLSX.utils.sheet_to_csv(ws) + "\n";
          });
          setFileContent(allText);
        } catch {
          alert("ไม่สามารถอ่านไฟล์ Excel ได้");
          removeFile();
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      alert("รองรับเฉพาะไฟล์ .txt, .csv, .xlsx, .xls เท่านั้น");
      removeFile();
    }
  };

  const buildPageContext = (): string => {
    const path = window.location.pathname;
    const pageDate = localStorage.getItem("chann_page_date");
    const pageMonth = localStorage.getItem("chann_page_month");
    const lines = [`- Path: ${path}`];
    if (pageDate) lines.push(`- วันที่ที่เลือก: ${pageDate}`);
    if (pageMonth) lines.push(`- เดือนที่ดูอยู่: ${pageMonth}`);
    return lines.join("\n");
  };

  const sendMessage = async () => {
    if ((!message.trim() && !imagePreview && !fileContent) || isLoading || isStreaming) return;

    const token = localStorage.getItem("bk_token");
    if (!token) return;

    const currentImage = imagePreview;
    const currentFile = fileContent;
    const currentFileName = fileName;
    const currentInput = message.trim() || (currentImage ? "ส่งรูปภาพ" : currentFile ? "โปรดวิเคราะห์ไฟล์นี้" : "");

    const displayContent = currentFile && currentFileName
      ? `📎 ${currentFileName}${message.trim() ? " — " + message.trim() : ""}`
      : currentInput;

    const contextMessage = currentFile && currentFileName
      ? `[ไฟล์แนบ: ${currentFileName}]\n\`\`\`\n${currentFile.slice(0, 12000)}\n\`\`\`\n\nคำถามจากผู้ใช้: ${currentInput}`
      : currentInput;

    const userMessage: ChatMessage = {
      role: "user",
      content: displayContent,
      timestamp: new Date().toISOString(),
      imageUrl: currentImage || undefined,
    };

    setMessages(prev => [
      ...prev,
      userMessage,
      { role: "assistant", content: "", timestamp: new Date().toISOString() }
    ]);
    setMessage("");
    if (inputRef.current) inputRef.current.style.height = "36px";
    setImagePreview(null);
    removeFile();
    setIsLoading(true);

    try {
      const body: any = { token, message: contextMessage, pageContext: buildPageContext() };
      if (currentImage) {
        body.imageBase64 = currentImage;
      }

      const res = await fetch("/api/chann", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let done = false;
      let hasStartedTyping = false;
      let buffer = "";

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;

        if (value) {
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const dataStr = line.replace("data: ", "");

              if (dataStr.trim() === "[DONE]") {
                setIsLoading(false);
                setIsStreaming(false);
                break;
              }

              try {
                const parsed = JSON.parse(dataStr);

                if (parsed.toolActions && Array.isArray(parsed.toolActions)) {
                  setMessages((prev) => {
                    const newMsgs = [...prev];
                    const actionMsg: ChatMessage = {
                      role: "assistant",
                      content: "",
                      timestamp: new Date().toISOString(),
                      toolActions: parsed.toolActions,
                    };
                    newMsgs.splice(newMsgs.length - 1, 0, actionMsg);
                    return newMsgs;
                  });
                }

                if (parsed.content) {
                  if (!hasStartedTyping) {
                    setIsLoading(false);
                    setIsStreaming(true);
                    hasStartedTyping = true;
                  }

                  setMessages((prev) => {
                    const newMsgs = [...prev];
                    const lastIndex = newMsgs.length - 1;
                    newMsgs[lastIndex] = {
                      ...newMsgs[lastIndex],
                      content: newMsgs[lastIndex].content + parsed.content,
                    };
                    return newMsgs;
                  });
                }
              } catch {
                // ignore parse error for partial chunks
              }
            }
          }
        }
      }

      setIsLoading(false);
      setIsStreaming(false);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => {
        const newMsgs = [...prev];
        const lastIndex = newMsgs.length - 1;
        if (newMsgs[lastIndex]?.role === "assistant" && !newMsgs[lastIndex].content) {
          newMsgs[lastIndex] = {
            ...newMsgs[lastIndex],
            content: "ไม่สามารถเชื่อมต่อกับ Chann ได้ กรุณาลองใหม่",
          };
        }
        return newMsgs;
      });
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  const [isSummarizing, setIsSummarizing] = useState(false);
  const [showCustomization, setShowCustomization] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const { getBubbleColorClass, getBubbleStyleClass, getAvatarStyleClass } = useChatCustomization();

  const isManagerOrAdmin = user?.role === "manager" || user?.role === "admin";
  const isAdmin = user?.role === "admin";

  const quickActions = [
    { label: "ภาพรวมวันนี้", prompt: "สรุปภาพรวมทุกระบบวันนี้ให้หน่อย", icon: Sparkles, show: true },
    { label: "ตารางกะวันนี้", prompt: "ดูว่าวันนี้ใครทำกะอะไรบ้าง", icon: Calendar, show: true },
    { label: "ตารางกะสัปดาห์นี้", prompt: "สรุปตารางกะของสัปดาห์นี้", icon: ClipboardList, show: true },
    { label: "ยอดขายเดือนนี้", prompt: "สรุปยอดขายเดือนนี้ (MTD) ทั้ง actual, TC, เป้า, Waste", icon: BarChart3, show: isManagerOrAdmin },
    { label: "COL% วันนี้", prompt: "คำนวณ COL% ของวันนี้ให้หน่อย พร้อมอธิบายว่าสูง/ต่ำกว่าเป้าแค่ไหน", icon: Zap, show: isManagerOrAdmin },
    { label: "รายชื่อพนักงาน", prompt: "แสดงรายชื่อพนักงานทั้งหมดพร้อมตำแหน่ง", icon: Users, show: true },
    { label: "รายการยืม-คืน", prompt: "สรุปรายการยืมคืนล่าสุด", icon: Database, show: isManagerOrAdmin },
    { label: "ตั้งเป้ายอดขาย", prompt: "ตั้งเป้ายอดขายวันนี้", icon: BarChart3, show: isManagerOrAdmin },
    { label: "จองกะ", prompt: "จองกะให้พนักงาน", icon: Calendar, show: isManagerOrAdmin },
    { label: "คำขอสลับกะ", prompt: "ดูคำขอสลับกะที่รอดำเนินการ", icon: ClipboardList, show: isManagerOrAdmin },
    { label: "Waste เดือนนี้", prompt: "ดูเป้า Waste ของเดือนนี้", icon: BarChart3, show: isManagerOrAdmin },
    { label: "ตั้งค่าร้าน", prompt: "แสดงการตั้งค่าร้านปัจจุบัน", icon: Database, show: isAdmin },
    { label: "ดู Audit Log", prompt: "แสดง audit log 20 รายการล่าสุด", icon: ClipboardList, show: isAdmin },
    { label: "สร้างผู้ใช้ใหม่", prompt: "สร้างบัญชีผู้ใช้ใหม่", icon: Users, show: isAdmin },
    { label: "Labor Settings", prompt: "แสดงค่า Labor settings ปัจจุบัน", icon: BarChart3, show: isAdmin },
  ].filter(a => a.show);

  const sendQuickAction = (prompt: string) => {
    setShowQuickActions(false);
    setMessage("");
    if (inputRef.current) inputRef.current.style.height = "36px";
    const fakeEvent = prompt;
    const token = localStorage.getItem("bk_token");
    if (!token || isLoading || isStreaming) return;

    const userMsg: ChatMessage = {
      role: "user",
      content: fakeEvent,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg, { role: "assistant", content: "", timestamp: new Date().toISOString() }]);
    setIsLoading(true);

    (async () => {
      try {
        const res = await fetch("/api/chann", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, message: fakeEvent, pageContext: buildPageContext() }),
        });
        if (!res.body) throw new Error("No response body");
        const reader = res.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let done = false;
        let hasStarted = false;
        let buf = "";
        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) {
            buf += decoder.decode(value, { stream: true });
            const lines = buf.split("\n\n");
            buf = lines.pop() || "";
            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const dataStr = line.replace("data: ", "");
                if (dataStr.trim() === "[DONE]") break;
                try {
                  const parsed = JSON.parse(dataStr);
                  if (parsed.toolActions && Array.isArray(parsed.toolActions)) {
                    setMessages(prev => {
                      const n = [...prev];
                      n.splice(n.length - 1, 0, { role: "assistant", content: "", timestamp: new Date().toISOString(), toolActions: parsed.toolActions });
                      return n;
                    });
                  }
                  if (parsed.content) {
                    if (!hasStarted) { setIsLoading(false); setIsStreaming(true); hasStarted = true; }
                    setMessages(prev => {
                      const n = [...prev];
                      n[n.length - 1] = { ...n[n.length - 1], content: n[n.length - 1].content + parsed.content };
                      return n;
                    });
                  }
                } catch {}
              }
            }
          }
        }
      } catch (err) {
        console.error("Quick action error:", err);
        setMessages(prev => {
          const n = [...prev];
          if (n[n.length - 1]?.role === "assistant" && !n[n.length - 1].content) {
            n[n.length - 1] = { ...n[n.length - 1], content: "ไม่สามารถเชื่อมต่อได้ กรุณาลองใหม่" };
          }
          return n;
        });
      } finally {
        setIsLoading(false);
        setIsStreaming(false);
      }
    })();
  };

  const summarizeChat = async () => {
    if (messages.length === 0 || isSummarizing || isLoading || isStreaming) return;

    setIsSummarizing(true);
    try {
      const token = localStorage.getItem("bk_token");
      if (!token) return;

      setMessages(prev => [
        ...prev,
        { role: "user", content: "ช่วยสรุปบทสนทนาทั้งหมดที่เราคุยกันมาให้ทีครับนาย", timestamp: new Date().toISOString() },
        { role: "assistant", content: "", timestamp: new Date().toISOString() }
      ]);
      setIsLoading(true);

      const res = await fetch("/api/chann", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          message: "ช่วยสรุปบทสนทนาทั้งหมดที่เราคุยกันมาให้ทีครับนาย",
        }),
      });

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let rdDone = false;
      let buf = "";
      let started = false;

      while (!rdDone) {
        const { value, done: readerDone } = await reader.read();
        rdDone = readerDone;
        if (value) {
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split("\n\n");
          buf = lines.pop() || "";
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const dataStr = line.replace("data: ", "");
              if (dataStr.trim() === "[DONE]") break;
              try {
                const parsed = JSON.parse(dataStr);
                if (parsed.content) {
                  if (!started) { setIsLoading(false); setIsStreaming(true); started = true; }
                  setMessages((prev) => {
                    const n = [...prev];
                    n[n.length - 1] = { ...n[n.length - 1], content: n[n.length - 1].content + parsed.content };
                    return n;
                  });
                }
              } catch {}
            }
          }
        }
      }
    } catch (error) {
      console.error("Summary error:", error);
    } finally {
      setIsSummarizing(false);
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  const clearHistory = async () => {
    setMessages([]);
    try {
      const token = localStorage.getItem("bk_token");
      if (!token) return;
      await fetch("/api/chann/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
    } catch (error) {
      console.error("Failed to clear history:", error);
    }
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
        <div className="fixed inset-4 bottom-20 md:inset-auto md:bottom-4 md:right-4 md:w-[400px] md:h-[600px] md:max-h-[calc(100vh-6rem)] z-[51] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden" data-testid="container-chann-chat">
          <div className="flex items-center justify-between p-4 bg-primary text-primary-foreground">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold" data-testid="text-chann-title">Chann AI</h3>
                <p className="text-xs opacity-80" data-testid="text-chann-subtitle">
                  {isStreaming ? "กำลังพิมพ์..." : "ผู้ช่วยอัจฉริยะ"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={summarizeChat}
                disabled={messages.length === 0 || isSummarizing || isLoading || isStreaming}
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
                disabled={isLoading || isStreaming}
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
              <div className="flex flex-col items-center justify-center h-full text-center" data-testid="container-chann-empty">
                <Bot className="w-14 h-14 mb-3 text-primary/30" />
                <p className="font-bold text-foreground">สวัสดีครับ! ผมชื่อ Chann</p>
                <p className="text-sm text-muted-foreground mt-1">เลือกคำสั่งด่วนหรือพิมพ์ข้อความได้เลยครับ</p>
                <div className="grid grid-cols-2 gap-2 mt-4 w-full max-w-xs">
                  {quickActions.slice(0, 4).map((action) => (
                    <button
                      key={action.label}
                      onClick={() => sendQuickAction(action.prompt)}
                      disabled={isLoading || isStreaming}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border/60 bg-muted/30 hover:bg-primary/10 hover:border-primary/30 transition-all text-left group"
                      data-testid={`button-quick-${action.label}`}
                    >
                      <action.icon className="w-4 h-4 text-primary/60 group-hover:text-primary flex-shrink-0" />
                      <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground">{action.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, index) => {
              if (msg.toolActions && msg.toolActions.length > 0) {
                return (
                  <div key={index} className="flex justify-center animate-in fade-in slide-in-from-bottom-2 duration-300" data-testid={`message-chann-action-${index}`}>
                    <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg px-3 py-2 max-w-[90%]">
                      <div className="flex items-center gap-1.5 mb-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                        <span className="text-xs font-semibold text-green-700 dark:text-green-300">Chann ดำเนินการแล้ว</span>
                      </div>
                      {msg.toolActions.map((action, i) => (
                        <p key={i} className="text-xs text-green-600 dark:text-green-400 pl-5">
                          {action}
                        </p>
                      ))}
                    </div>
                  </div>
                );
              }

              return (
              <div
                key={index}
                className={cn(
                  "flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300",
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
                  {msg.imageUrl && msg.imageUrl !== "(image attached)" && (
                    <img
                      src={msg.imageUrl}
                      alt="sent"
                      className="max-w-full max-h-40 rounded-md mb-1 cursor-pointer"
                      onClick={() => window.open(msg.imageUrl, "_blank")}
                      data-testid={`img-chann-${index}`}
                    />
                  )}
                  {msg.content && msg.content !== "ส่งรูปภาพ" && (
                    msg.role === "assistant" ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    )
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
              );
            })}

            {isLoading && !isStreaming && (
              <div className="flex gap-3 justify-start animate-in fade-in slide-in-from-bottom-2 duration-300" data-testid="container-chann-loading">
                <Avatar className="w-8 h-8 flex-shrink-0">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    <Bot className="w-4 h-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                    <span className="text-xs text-muted-foreground">Chann กำลังคิด...</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-border">
            {showQuickActions && (
              <div className="p-2 border-b border-border bg-muted/30 overflow-x-auto">
                <div className="flex gap-1.5 flex-wrap">
                  {quickActions.map((action) => (
                    <button
                      key={action.label}
                      onClick={() => sendQuickAction(action.prompt)}
                      disabled={isLoading || isStreaming}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-border/60 bg-background hover:bg-primary/10 hover:border-primary/30 transition-all text-xs font-medium text-muted-foreground hover:text-foreground whitespace-nowrap"
                      data-testid={`button-quickbar-${action.label}`}
                    >
                      <action.icon className="w-3 h-3" />
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="p-3">
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
              {fileName && (
                <div className="flex items-center gap-2 mb-2 px-2 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-sm w-fit max-w-[80%]">
                  <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                  <span className="truncate text-xs font-medium text-slate-700 dark:text-slate-300">{fileName}</span>
                  <button
                    onClick={removeFile}
                    className="ml-1 hover:bg-slate-200 dark:hover:bg-slate-700 p-0.5 rounded-full transition-colors"
                    title="ลบไฟล์"
                    data-testid="button-remove-file-preview"
                  >
                    <X className="w-3 h-3 text-slate-500" />
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
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.csv,.xlsx,.xls"
                className="hidden"
                onChange={handleFileSelect}
                data-testid="input-chann-file"
              />
              <div className="flex items-end gap-1.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn("h-9 w-9 rounded-full transition-colors", showQuickActions && "bg-primary/10 text-primary")}
                  onClick={() => setShowQuickActions(!showQuickActions)}
                  disabled={isLoading || isStreaming}
                  title="คำสั่งด่วน"
                  data-testid="button-chann-quick-actions"
                >
                  <Zap className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-full"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={isLoading || isStreaming}
                  data-testid="button-chann-image-upload"
                >
                  <ImagePlus className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn("h-9 w-9 rounded-full", fileName && "text-blue-500")}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading || isStreaming}
                  title="แนบไฟล์ (.txt, .csv, .xlsx)"
                  data-testid="button-chann-file-upload"
                >
                  <Paperclip className="w-4 h-4" />
                </Button>
                <Textarea
                  ref={inputRef}
                  value={message}
                  onChange={(e) => {
                    setMessage(e.target.value);
                    const el = e.target;
                    el.style.height = "0px";
                    el.style.height = Math.min(el.scrollHeight, 120) + "px";
                  }}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  placeholder="พิมพ์ข้อความ..."
                  disabled={isLoading || isStreaming}
                  className="flex-1 min-h-[36px] max-h-[120px] resize-none text-sm overflow-y-auto"
                  rows={1}
                  data-testid="input-chann-message"
                />
                <Button
                  onClick={sendMessage}
                  disabled={(!message.trim() && !imagePreview && !fileContent) || isLoading || isStreaming}
                  size="icon"
                  className="h-9 w-9 rounded-full"
                  data-testid="button-send-chann-message"
                >
                  {isLoading || isStreaming ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
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
