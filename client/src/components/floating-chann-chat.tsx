import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, X, Loader2, Bot, User, Trash2, FileText, ImagePlus, CheckCircle2, Zap, Calendar, BarChart3, Users, ClipboardList, Database, Sparkles, Paperclip } from "lucide-react";
import * as XLSX from "xlsx";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  imageUrl?: string;
  toolActions?: string[];
  thinking?: string;
  suggestedReplies?: string[];
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
  const greetingInitiated = useRef(false);
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

  const handleSSEStream = async (
    res: Response,
    opts?: { onStarted?: () => void }
  ) => {
    if (!res.ok) {
      let errorMsg = "เกิดข้อผิดพลาดในการเชื่อมต่อ";
      try {
        const errData = await res.json();
        if (errData.message) errorMsg = errData.message;
      } catch {}
      throw new Error(errorMsg);
    }
    if (!res.body) throw new Error("No body");
    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let done = false;
    let started = false;
    let buf = "";
    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;
      if (value) {
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n\n");
        buf = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const dataStr = line.slice(6);
          if (dataStr.trim() === "[DONE]") break;
          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.thinking) {
              setMessages(prev => {
                const n = [...prev];
                if (n[n.length - 1]?.role === "assistant") n[n.length - 1] = { ...n[n.length - 1], thinking: parsed.thinking };
                return n;
              });
            }
            if (parsed.toolActions && Array.isArray(parsed.toolActions)) {
              setMessages(prev => {
                const n = [...prev];
                n.splice(n.length - 1, 0, { role: "assistant", content: "", timestamp: new Date().toISOString(), toolActions: parsed.toolActions });
                return n;
              });
            }
            if (parsed.content) {
              if (!started) {
                setIsLoading(false);
                setIsStreaming(true);
                started = true;
                opts?.onStarted?.();
              }
              setMessages(prev => {
                const n = [...prev];
                n[n.length - 1] = { ...n[n.length - 1], content: n[n.length - 1].content + parsed.content, thinking: undefined };
                return n;
              });
            }
            if (parsed.suggestedReplies && Array.isArray(parsed.suggestedReplies)) {
              setMessages(prev => {
                const n = [...prev];
                n[n.length - 1] = { ...n[n.length - 1], suggestedReplies: parsed.suggestedReplies };
                return n;
              });
            }
          } catch {}
        }
      }
    }
  };

  const sendGreeting = (token: string) => {
    if (greetingInitiated.current) return;
    greetingInitiated.current = true;
    const displayName = user?.nickName || user?.fullName?.split(" ")[0] || "นาย";
    const greetPrompt = `ทักทาย${displayName} ตามเวลาปัจจุบัน และแนะนำตัวเองสั้นๆ ว่าช่วยอะไรได้บ้างในระบบนี้ พร้อมสรุปกะวันนี้หรือข้อมูลที่น่าสนใจ 1-2 รายการ`;
    setMessages([{ role: "assistant", content: "", timestamp: new Date().toISOString() }]);
    setIsLoading(true);
    (async () => {
      try {
        const res = await fetch("/api/chann", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, message: greetPrompt, silentMessage: true, provider: "replit" }),
        });
        await handleSSEStream(res);
      } catch (err) {
        console.error("Greeting error:", err);
        setMessages([{ role: "assistant", content: "สวัสดีครับ! ผม Chann มีอะไรให้ช่วยไหมครับ?", timestamp: new Date().toISOString() }]);
      } finally {
        setIsLoading(false);
        setIsStreaming(false);
      }
    })();
  };

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
          } else {
            sendGreeting(token);
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
      const body: any = { token, message: contextMessage, pageContext: buildPageContext(), provider: "replit" };
      if (currentImage) {
        body.imageBase64 = currentImage;
      }

      const res = await fetch("/api/chann", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      await handleSSEStream(res);
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
  const [showQuickActions, setShowQuickActions] = useState(false);

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
    { label: "คำขอพนักงาน", prompt: "ดูคำขอของพนักงานทั้งหมดที่ยังรอดำเนินการ", icon: ClipboardList, show: isManagerOrAdmin },
    { label: "โน้ตของฉัน", prompt: "เรียกดู notes ทั้งหมดที่เคยบันทึกไว้", icon: FileText, show: isManagerOrAdmin },
    { label: "ค้นหาเว็บ", prompt: "ค้นหาข้อมูลจากอินเตอร์เน็ต", icon: Zap, show: true },
  ].filter(a => a.show);

  const sendQuickAction = (prompt: string) => {
    setShowQuickActions(false);
    setMessage("");
    if (inputRef.current) inputRef.current.style.height = "36px";
    const token = localStorage.getItem("bk_token");
    if (!token || isLoading || isStreaming) return;

    const userMsg: ChatMessage = {
      role: "user",
      content: prompt,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg, { role: "assistant", content: "", timestamp: new Date().toISOString() }]);
    setIsLoading(true);

    (async () => {
      try {
        const res = await fetch("/api/chann", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, message: prompt, pageContext: buildPageContext(), provider: "replit" }),
        });
        await handleSSEStream(res);
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
          provider: "replit",
        }),
      });

      await handleSSEStream(res);
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
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-32 md:bottom-16 right-4 z-50 group"
          data-testid="button-open-chann-chat"
        >
          <div className="relative flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-105 transition-all duration-200">
            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
              <Bot className="w-4 h-4" />
            </div>
            <span className="text-sm font-semibold">Chann</span>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white animate-pulse" />
          </div>
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-3 bottom-20 md:inset-auto md:bottom-4 md:right-4 md:w-[420px] md:h-[640px] md:max-h-[calc(100vh-6rem)] z-[51] flex flex-col overflow-hidden rounded-2xl shadow-2xl shadow-black/20 border border-white/10" data-testid="container-chann-chat">
          <div className="bg-gradient-to-r from-slate-900 via-violet-950 to-slate-900 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-slate-900" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm" data-testid="text-chann-title">Chann AI</h3>
                  <p className="text-[11px] text-violet-300/80" data-testid="text-chann-subtitle">
                    {isStreaming
                      ? "กำลังพิมพ์..."
                      : isLoading
                        ? "กำลังวิเคราะห์..."
                        : "ผู้ช่วยอัจฉริยะ"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-violet-300 hover:text-white hover:bg-white/10"
                  onClick={summarizeChat}
                  disabled={messages.length === 0 || isSummarizing || isLoading || isStreaming}
                  title="สรุปบทสนทนา"
                  data-testid="button-summarize-chann"
                >
                  {isSummarizing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-violet-300 hover:text-white hover:bg-white/10"
                  onClick={clearHistory}
                  disabled={isLoading || isStreaming}
                  title="ล้างประวัติ"
                  data-testid="button-clear-chann-history"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-violet-300 hover:text-white hover:bg-white/10"
                  onClick={() => setIsOpen(false)}
                  data-testid="button-close-chann-chat"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto bg-slate-950 p-4 space-y-3" data-testid="container-chann-messages">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center" data-testid="container-chann-empty">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 flex items-center justify-center mb-4">
                  <Bot className="w-8 h-8 text-violet-400" />
                </div>
                <p className="font-bold text-white text-lg">สวัสดีครับ!</p>
                <p className="text-sm text-slate-400 mt-1 mb-5">ผมชื่อ Chann — มีอะไรให้ช่วยครับ?</p>
                <div className="grid grid-cols-2 gap-2 w-full max-w-xs">
                  {quickActions.slice(0, 4).map((action) => (
                    <button
                      key={action.label}
                      onClick={() => sendQuickAction(action.prompt)}
                      disabled={isLoading || isStreaming}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-white/5 bg-white/5 hover:bg-violet-500/10 hover:border-violet-500/20 transition-all text-left group"
                      data-testid={`button-quick-${action.label}`}
                    >
                      <action.icon className="w-4 h-4 text-violet-400/60 group-hover:text-violet-400 flex-shrink-0" />
                      <span className="text-xs font-medium text-slate-400 group-hover:text-slate-200">{action.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, index) => {
              if (msg.toolActions && msg.toolActions.length > 0) {
                return (
                  <div key={index} className="flex justify-center animate-in fade-in slide-in-from-bottom-2 duration-300" data-testid={`message-chann-action-${index}`}>
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2 max-w-[90%]">
                      <div className="flex items-center gap-1.5 mb-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-xs font-semibold text-emerald-300">Chann ดำเนินการแล้ว</span>
                      </div>
                      {msg.toolActions.map((action, i) => (
                        <p key={i} className="text-xs text-emerald-400/80 pl-5">{action}</p>
                      ))}
                    </div>
                  </div>
                );
              }

              const isLastMsg = index === messages.length - 1;
              const displayContent = msg.content?.replace(/\[SUGGESTIONS:.*?\]\s*$/s, "").trimEnd() || "";
              const showSuggestions = msg.role === "assistant" && isLastMsg && !isLoading && !isStreaming && msg.suggestedReplies && msg.suggestedReplies.length > 0;

              return (
                <div key={index} className="flex flex-col gap-1.5 animate-in fade-in slide-in-from-bottom-2 duration-300" data-testid={`message-chann-${msg.role}-${index}`}>
                  <div className={cn("flex gap-2.5", msg.role === "user" ? "justify-end" : "justify-start")}>
                    {msg.role === "assistant" && (
                      <Avatar className="w-7 h-7 flex-shrink-0 mt-0.5">
                        <AvatarFallback className="bg-gradient-to-br from-violet-500 to-indigo-600 text-white text-xs">
                          <Bot className="w-3.5 h-3.5" />
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div
                      className={cn(
                        "max-w-[80%] px-3.5 py-2.5 text-sm",
                        msg.role === "user"
                          ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-2xl rounded-br-md shadow-lg shadow-violet-500/10"
                          : "bg-slate-800/80 text-slate-200 rounded-2xl rounded-bl-md border border-white/5"
                      )}
                    >
                      {msg.imageUrl && msg.imageUrl !== "(image attached)" && (
                        <img
                          src={msg.imageUrl}
                          alt="sent"
                          className="max-w-full max-h-40 rounded-lg mb-1.5 cursor-pointer"
                          onClick={() => window.open(msg.imageUrl, "_blank")}
                          data-testid={`img-chann-${index}`}
                        />
                      )}
                      {msg.thinking && !msg.content && (
                        <div className="flex items-center gap-2 text-xs text-violet-300/80 italic" data-testid={`thinking-chann-${index}`}>
                          <div className="flex gap-1">
                            <div className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                            <div className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                            <div className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                          </div>
                          <span>{msg.thinking}</span>
                        </div>
                      )}
                      {displayContent && displayContent !== "ส่งรูปภาพ" && (
                        msg.role === "assistant" ? (
                          <div className="prose prose-sm prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 prose-p:text-slate-200 prose-headings:text-white prose-strong:text-white prose-code:text-violet-300 prose-code:bg-slate-700/50 prose-code:px-1 prose-code:rounded">
                            <ReactMarkdown>{displayContent}</ReactMarkdown>
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap">{displayContent}</p>
                        )
                      )}
                    </div>
                    {msg.role === "user" && (
                      <Avatar className="w-7 h-7 flex-shrink-0 mt-0.5">
                        <AvatarFallback className="bg-slate-700 text-slate-300 text-xs">
                          <User className="w-3.5 h-3.5" />
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                  {showSuggestions && (
                    <div className="flex flex-wrap gap-1.5 pl-10 animate-in fade-in duration-300" data-testid={`suggestions-chann-${index}`}>
                      {msg.suggestedReplies!.map((suggestion, si) => (
                        <button
                          key={si}
                          onClick={() => sendQuickAction(suggestion)}
                          className="text-xs px-2.5 py-1 rounded-full border border-violet-500/20 bg-violet-500/5 text-violet-300 hover:bg-violet-500/15 hover:border-violet-500/40 transition-all"
                          data-testid={`suggestion-chip-${index}-${si}`}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {isLoading && !isStreaming && (
              <div className="flex gap-2.5 justify-start animate-in fade-in slide-in-from-bottom-2 duration-300" data-testid="container-chann-loading">
                <Avatar className="w-7 h-7 flex-shrink-0">
                  <AvatarFallback className="bg-gradient-to-br from-violet-500 to-indigo-600 text-white text-xs">
                    <Bot className="w-3.5 h-3.5" />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-slate-800/80 rounded-2xl rounded-bl-md px-4 py-3 border border-white/5">
                  <div className="flex items-center gap-2.5">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div className="w-2 h-2 bg-violet-400/70 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="w-2 h-2 bg-violet-400/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                    <span className="text-xs text-slate-400">Chann กำลังคิด...</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-white/5 bg-slate-900">
            {showQuickActions && (
              <div className="p-2 border-b border-white/5 bg-slate-900/50 overflow-x-auto">
                <div className="flex gap-1.5 flex-wrap">
                  {quickActions.map((action) => (
                    <button
                      key={action.label}
                      onClick={() => sendQuickAction(action.prompt)}
                      disabled={isLoading || isStreaming}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-white/5 bg-white/5 hover:bg-violet-500/10 hover:border-violet-500/20 transition-all text-xs font-medium text-slate-400 hover:text-slate-200 whitespace-nowrap"
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
                  <img src={imagePreview} alt="preview" className="max-h-20 rounded-lg border border-white/10" />
                  <button
                    onClick={removeImagePreview}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs shadow-lg"
                    data-testid="button-remove-image-preview"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
              {fileName && (
                <div className="flex items-center gap-2 mb-2 px-2 py-1.5 bg-slate-800 border border-white/10 rounded-lg text-sm w-fit max-w-[80%]">
                  <FileText className="w-4 h-4 text-violet-400 shrink-0" />
                  <span className="truncate text-xs font-medium text-slate-300">{fileName}</span>
                  <button
                    onClick={removeFile}
                    className="ml-1 hover:bg-slate-700 p-0.5 rounded-full transition-colors"
                    title="ลบไฟล์"
                    data-testid="button-remove-file-preview"
                  >
                    <X className="w-3 h-3 text-slate-400" />
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
                  className={cn("h-9 w-9 rounded-full text-slate-400 hover:text-violet-300 hover:bg-white/5 transition-colors", showQuickActions && "bg-violet-500/10 text-violet-400")}
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
                  className="h-9 w-9 rounded-full text-slate-400 hover:text-violet-300 hover:bg-white/5"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={isLoading || isStreaming}
                  data-testid="button-chann-image-upload"
                >
                  <ImagePlus className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn("h-9 w-9 rounded-full text-slate-400 hover:text-violet-300 hover:bg-white/5", fileName && "text-violet-400")}
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
                  className="flex-1 min-h-[36px] max-h-[120px] resize-none text-sm overflow-y-auto bg-slate-800/50 border-white/10 text-slate-200 placeholder:text-slate-500 focus-visible:ring-violet-500/30"
                  rows={1}
                  data-testid="input-chann-message"
                />
                <Button
                  onClick={sendMessage}
                  disabled={(!message.trim() && !imagePreview && !fileContent) || isLoading || isStreaming}
                  size="icon"
                  className="h-9 w-9 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-500/20 disabled:opacity-30"
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
    </>
  );
}
