import { useState, useRef, useEffect, memo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import {
  Send, Loader2, Bot, User, Trash2, FileText, Sparkles, Calendar,
  BarChart3, Users, ClipboardList, Database, Zap, Copy, Check,
  Bell, Download, ImagePlus, Paperclip, X, CheckCircle2, Plus,
  ChevronRight, Cpu, BrainCircuit, MessageSquare, SquarePen
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import ExcelJS from "exceljs";

/* ── Types ────────────────────────────────────────────────── */
type ChannModel = "replit" | "claude";

interface ToolProgressStep {
  step: number; maxSteps: number; toolNames: string[]; writeActions: string[];
}
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  imageUrl?: string;
  toolActions?: string[];
  thinking?: string;
  suggestedReplies?: string[];
  progressSteps?: ToolProgressStep[];
}

/* ── Quick actions ─────────────────────────────────────────── */
const ALL_QUICK_ACTIONS = [
  { label: "ภาพรวมวันนี้", prompt: "สรุปภาพรวมทุกระบบวันนี้", icon: Sparkles, category: "ภาพรวม" },
  { label: "ตารางกะวันนี้", prompt: "ดูว่าวันนี้ใครทำกะอะไรบ้าง", icon: Calendar, category: "ภาพรวม" },
  { label: "รายชื่อพนักงาน", prompt: "แสดงรายชื่อพนักงานทั้งหมดพร้อมตำแหน่ง", icon: Users, category: "ภาพรวม" },
  { label: "ยอดขายเดือนนี้", prompt: "สรุปยอดขายเดือนนี้ (MTD) ทั้ง actual, TC, เป้า, Waste", icon: BarChart3, category: "ยอดขาย" },
  { label: "COL% วันนี้", prompt: "คำนวณ COL% ของวันนี้ พร้อมอธิบายสูง/ต่ำกว่าเป้าแค่ไหน", icon: Zap, category: "ยอดขาย" },
  { label: "Waste เดือนนี้", prompt: "ดูเป้า Waste ของเดือนนี้", icon: BarChart3, category: "ยอดขาย" },
  { label: "คำขอพนักงาน", prompt: "ดูคำขอของพนักงานทั้งหมดที่ยังรอดำเนินการ", icon: ClipboardList, category: "พนักงาน" },
  { label: "โน้ตของฉัน", prompt: "เรียกดู notes ทั้งหมดที่เคยบันทึกไว้", icon: FileText, category: "พนักงาน" },
  { label: "รายการยืม-คืน", prompt: "สรุปรายการยืมคืนล่าสุด", icon: Database, category: "ยอดขาย" },
  { label: "ส่งแจ้งเตือน LINE", prompt: "ส่งแจ้งเตือนพร้อมรายงานวันนี้ไปยัง LINE group", icon: Bell, category: "ระบบ" },
  { label: "ส่งออก Excel", prompt: "ส่งออกรายงานยอดขายเดือนนี้เป็นไฟล์ Excel", icon: Download, category: "ยอดขาย" },
  { label: "Anomaly ล่าสุด", prompt: "ตรวจสอบ anomaly ที่ยังไม่ได้รับทราบใน 7 วันที่ผ่านมา", icon: Zap, category: "ยอดขาย" },
];

/* ── MessageBubble ─────────────────────────────────────────── */
interface MsgBubbleProps {
  msg: ChatMessage; index: number; isLastMsg: boolean;
  isLoading: boolean; isStreaming: boolean;
  onSuggestion: (t: string) => void;
  model: ChannModel;
}
const MessageBubble = memo(function MessageBubble({ msg, index, isLastMsg, isLoading, isStreaming, onSuggestion, model }: MsgBubbleProps) {
  const [copied, setCopied] = useState(false);
  const displayContent = msg.content?.replace(/\[SUGGESTIONS:.*?\]\s*$/s, "").trimEnd() || "";
  const showSuggestions = msg.role === "assistant" && isLastMsg && !isLoading && !isStreaming && (msg.suggestedReplies?.length ?? 0) > 0;

  const handleCopy = () => {
    navigator.clipboard.writeText(displayContent).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    });
  };

  if (msg.toolActions?.length) {
    return (
      <div className="flex justify-center py-1" data-testid={`platform-msg-action-${index}`}>
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2.5 max-w-xl">
          <div className="flex items-center gap-1.5 mb-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs font-semibold text-emerald-300">Chann ดำเนินการแล้ว</span>
          </div>
          {msg.toolActions.map((a, i) => <p key={i} className="text-xs text-emerald-400/80 pl-5">{a}</p>)}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("group flex gap-4 py-3 px-4 md:px-8 lg:px-16 xl:px-24 rounded-2xl", msg.role === "user" ? "justify-end" : "justify-start")} data-testid={`platform-msg-${msg.role}-${index}`}>
      {msg.role === "assistant" && (
        <div className={cn("w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center shadow-md mt-0.5 transition-all",
          model === "claude" ? "bg-gradient-to-br from-orange-500 to-amber-600" : "bg-gradient-to-br from-violet-500 to-indigo-600")}>
          <Bot className="w-4 h-4 text-white" />
        </div>
      )}
      <div className={cn("flex flex-col gap-1.5 max-w-[75%]", msg.role === "user" && "items-end")}>
        <div className={cn(
          "px-4 py-3 rounded-2xl text-sm leading-relaxed",
          msg.role === "user"
            ? "bg-gradient-to-br from-violet-600 to-indigo-600 text-white rounded-br-sm shadow-lg shadow-violet-500/10"
            : "bg-slate-800/60 text-slate-200 rounded-bl-sm border border-white/5"
        )}>
          {msg.imageUrl && msg.imageUrl !== "(image attached)" && (
            <img src={msg.imageUrl} alt="sent" className="max-w-full max-h-52 rounded-lg mb-2 cursor-pointer" onClick={() => window.open(msg.imageUrl, "_blank")} />
          )}
          {msg.thinking && !msg.content && (
            <div className="flex items-center gap-2 text-xs text-violet-300/80 italic">
              <div className="flex gap-1">
                {[0, 150, 300].map(d => <div key={d} className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
              </div>
              <span>{msg.thinking}</span>
            </div>
          )}
          {displayContent && displayContent !== "ส่งรูปภาพ" && (
            msg.role === "assistant" ? (
              <div className="prose prose-sm prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 prose-p:text-slate-200 prose-headings:text-white prose-strong:text-white prose-code:text-violet-300 prose-code:bg-slate-700/50 prose-code:px-1 prose-code:rounded prose-pre:bg-slate-900 prose-pre:border prose-pre:border-white/10">
                <ReactMarkdown>{displayContent}</ReactMarkdown>
              </div>
            ) : <p className="whitespace-pre-wrap">{displayContent}</p>
          )}
          {(msg.progressSteps?.length ?? 0) > 0 && (
            <div className={cn("space-y-1 mt-2 pt-2 border-t border-white/5")}>
              {msg.progressSteps!.map((ps, pi) => (
                <div key={pi} className="flex items-start gap-1.5 text-[10px]">
                  <span className="text-violet-400/60 font-mono shrink-0 font-semibold">ขั้นตอน {ps.step}/{ps.maxSteps}:</span>
                  <span className="font-mono text-slate-500">{ps.toolNames.join(", ")}</span>
                  {ps.writeActions.length > 0 && <span className="text-emerald-400/70">✓ {ps.writeActions.join(", ")}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
        {msg.role === "assistant" && displayContent && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pl-1">
            <button onClick={handleCopy} className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all" data-testid={`platform-copy-${index}`}>
              {copied ? <><Check className="w-3 h-3 text-emerald-400" />คัดลอกแล้ว</> : <><Copy className="w-3 h-3" />คัดลอก</>}
            </button>
          </div>
        )}
        {showSuggestions && (
          <div className="flex flex-wrap gap-1.5 animate-in fade-in duration-300">
            {msg.suggestedReplies!.map((s, si) => (
              <button key={si} onClick={() => onSuggestion(s)} className="text-xs px-3 py-1 rounded-full border border-violet-500/20 bg-violet-500/5 text-violet-300 hover:bg-violet-500/15 hover:border-violet-500/40 transition-all" data-testid={`platform-suggestion-${index}-${si}`}>
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
      {msg.role === "user" && (
        <Avatar className="w-8 h-8 flex-shrink-0 mt-0.5">
          <AvatarFallback className="bg-slate-700 text-slate-300 text-xs"><User className="w-4 h-4" /></AvatarFallback>
        </Avatar>
      )}
    </div>
  );
});

/* ── Main Page ─────────────────────────────────────────────── */
export default function ChannPlatformPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [channModel, setChannModel] = useState<ChannModel>("replit");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState(0);
  const [isFileUploading, setIsFileUploading] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [sidebarSection, setSidebarSection] = useState<"actions" | "history">("actions");

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingContentRef = useRef("");
  const rafIdRef = useRef<number | null>(null);
  const greetingInitiated = useRef(false);

  const isManagerOrAdmin = user?.role === "manager" || user?.role === "admin";

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isLoading]);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => () => { if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current); }, []);

  const flushPending = () => {
    rafIdRef.current = null;
    const chunk = pendingContentRef.current;
    if (!chunk) return;
    pendingContentRef.current = "";
    setMessages(prev => {
      const n = [...prev];
      n[n.length - 1] = { ...n[n.length - 1], content: n[n.length - 1].content + chunk, thinking: undefined };
      return n;
    });
  };
  const scheduleFlush = () => { if (rafIdRef.current === null) rafIdRef.current = requestAnimationFrame(flushPending); };

  const handleSSEStream = async (res: Response) => {
    if (!res.ok) { let msg = "เกิดข้อผิดพลาด"; try { const d = await res.json(); if (d.message) msg = d.message; } catch {} throw new Error(msg); }
    if (!res.body) throw new Error("No body");
    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let done = false; let started = false; let buf = "";
    while (!done) {
      const { value, done: rd } = await reader.read();
      done = rd;
      if (value) {
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n\n"); buf = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const dataStr = line.slice(6);
          if (dataStr.trim() === "[DONE]") break;
          try {
            const p = JSON.parse(dataStr);
            if (p.thinking) setMessages(prev => { const n=[...prev]; if (n[n.length-1]?.role==="assistant") n[n.length-1]={...n[n.length-1],thinking:p.thinking}; return n; });
            if (p.toolProgress) setMessages(prev => { const n=[...prev]; const last=n[n.length-1]; if (last?.role==="assistant") n[n.length-1]={...last,progressSteps:[...(last.progressSteps||[]),p.toolProgress]}; return n; });
            if (p.toolActions?.length) setMessages(prev => { const n=[...prev]; n.splice(n.length-1,0,{role:"assistant",content:"",timestamp:new Date().toISOString(),toolActions:p.toolActions}); return n; });
            if (p.content) { if (!started) { setIsLoading(false); setIsStreaming(true); started=true; } pendingContentRef.current+=p.content; scheduleFlush(); }
            if (p.suggestedReplies?.length) { if (rafIdRef.current!==null){cancelAnimationFrame(rafIdRef.current);flushPending();} setMessages(prev=>{const n=[...prev];n[n.length-1]={...n[n.length-1],suggestedReplies:p.suggestedReplies};return n;}); }
          } catch {}
        }
      }
    }
    if (rafIdRef.current !== null) { cancelAnimationFrame(rafIdRef.current); flushPending(); }
  };

  // Load history on mount
  useEffect(() => {
    if (historyLoaded) return;
    const load = async () => {
      try {
        const token = localStorage.getItem("bk_token");
        if (!token) return;
        const res = await fetch("/api/chann/history", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
        const data = await res.json();
        if (data.ok && data.messages?.length > 0) {
          setMessages(data.messages.map((m: any) => ({ role: m.role, content: m.content, timestamp: m.createdAt || new Date().toISOString(), imageUrl: m.imageUrl || undefined })));
        } else {
          sendGreeting(token);
        }
      } catch {} finally { setHistoryLoaded(true); }
    };
    load();
  }, []);

  const sendGreeting = (token: string) => {
    if (greetingInitiated.current) return;
    greetingInitiated.current = true;
    const name = user?.nickName || user?.fullName?.split(" ")[0] || "นาย";
    setMessages([{ role: "assistant", content: "", timestamp: new Date().toISOString() }]);
    setIsLoading(true);
    (async () => {
      try {
        const res = await fetch("/api/chann", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, message: `ทักทาย${name} ตามเวลาปัจจุบัน แนะนำตัวเองสั้นๆ พร้อมสรุปกะวันนี้`, silentMessage: true, provider: "replit", model: "replit" }) });
        await handleSSEStream(res);
      } catch { setMessages([{ role: "assistant", content: "สวัสดีครับ! ผม Chann มีอะไรให้ช่วยไหมครับ?", timestamp: new Date().toISOString() }]); }
      finally { setIsLoading(false); setIsStreaming(false); }
    })();
  };

  const formatFileSize = (b: number) => b < 1024 ? b + " B" : b < 1048576 ? (b / 1024).toFixed(1) + " KB" : (b / 1048576).toFixed(1) + " MB";

  const processImageFile = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const ab = await file.arrayBuffer();
    const bytes = new Uint8Array(ab);
    let bin = ""; for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
    setImagePreview(`data:${file.type};base64,${btoa(bin)}`);
  };

  const processFile = async (file: File) => {
    setFileName(file.name); setFileSize(file.size); setFileContent(null);
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext === "txt" || ext === "csv") { const r = new FileReader(); r.onload = (e) => setFileContent(e.target?.result as string); r.readAsText(file); return; }
    if (ext === "xlsx" || ext === "xls") {
      try {
        const ab = await file.arrayBuffer(); const wb = new ExcelJS.Workbook(); await wb.xlsx.load(ab);
        let txt = ""; wb.eachSheet((ws) => { txt += `\n--- Sheet: ${ws.name} ---\n`; const rows: string[] = []; ws.eachRow((row) => { rows.push((row.values as any[]).slice(1).map((v: any) => v === null || v === undefined ? "" : typeof v === "object" && v.text ? v.text : v instanceof Date ? v.toISOString().split("T")[0] : String(v)).join(",")); }); txt += rows.join("\n") + "\n"; });
        setFileContent(txt);
      } catch { setFileContent(null); } return;
    }
    setIsFileUploading(true);
    try {
      const token = localStorage.getItem("bk_token");
      const fd = new FormData(); fd.append("file", file); fd.append("token", token || "");
      const res = await fetch("/api/chat/upload-file", { method: "POST", body: fd });
      const result = await res.json();
      if (result.ok) setFileContent(result.extractedText ?? null);
    } catch {} finally { setIsFileUploading(false); }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); const file = e.dataTransfer.files?.[0];
    if (!file) return;
    file.type.startsWith("image/") ? processImageFile(file) : processFile(file);
  };

  const buildPageContext = () => {
    const path = window.location.pathname;
    const lines = [`- Path: ${path}`, `- Platform: Chann AI Platform`];
    return lines.join("\n");
  };

  const sendMessage = async () => {
    if ((!message.trim() && !imagePreview && !fileContent && !fileName) || isLoading || isStreaming) return;
    const token = localStorage.getItem("bk_token");
    if (!token) return;

    const currentImage = imagePreview;
    const currentFile = fileContent;
    const currentFileName = fileName;
    const currentFileSize = fileSize;
    const currentInput = message.trim() || (currentImage ? "ส่งรูปภาพ" : currentFileName ? "โปรดวิเคราะห์ไฟล์นี้" : "");
    const displayContent = currentFileName ? `📎 ${currentFileName} (${formatFileSize(currentFileSize)})${message.trim() ? " — " + message.trim() : ""}` : currentInput;
    const contextMessage = currentFile && currentFileName ? `[ไฟล์แนบ: ${currentFileName}]\n\`\`\`\n${currentFile.slice(0, 12000)}\n\`\`\`\n\nคำถาม: ${currentInput}` : currentInput;

    setMessages(prev => [...prev, { role: "user", content: displayContent, timestamp: new Date().toISOString(), imageUrl: currentImage || undefined }, { role: "assistant", content: "", timestamp: new Date().toISOString() }]);
    setMessage(""); setImagePreview(null); setFileContent(null); setFileName(null); setFileSize(0);
    if (inputRef.current) inputRef.current.style.height = "44px";
    setIsLoading(true);
    try {
      const body: any = { token, message: contextMessage, pageContext: buildPageContext(), provider: channModel, model: channModel };
      if (currentImage) body.imageBase64 = currentImage;
      const res = await fetch("/api/chann", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      await handleSSEStream(res);
    } catch {
      setMessages(prev => { const n = [...prev]; if (n[n.length-1]?.role==="assistant" && !n[n.length-1].content) n[n.length-1]={...n[n.length-1],content:"ไม่สามารถเชื่อมต่อกับ Chann ได้ กรุณาลองใหม่"}; return n; });
    } finally { setIsLoading(false); setIsStreaming(false); }
  };

  const sendQuickAction = useCallback((prompt: string) => {
    const token = localStorage.getItem("bk_token");
    if (!token || isLoading || isStreaming) return;
    setMessages(prev => [...prev, { role: "user", content: prompt, timestamp: new Date().toISOString() }, { role: "assistant", content: "", timestamp: new Date().toISOString() }]);
    setIsLoading(true);
    (async () => {
      try {
        const res = await fetch("/api/chann", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, message: prompt, pageContext: buildPageContext(), provider: channModel, model: channModel }) });
        await handleSSEStream(res);
      } catch {
        setMessages(prev => { const n=[...prev]; if (n[n.length-1]?.role==="assistant"&&!n[n.length-1].content) n[n.length-1]={...n[n.length-1],content:"ไม่สามารถเชื่อมต่อได้"}; return n; });
      } finally { setIsLoading(false); setIsStreaming(false); }
    })();
  }, [channModel, isLoading, isStreaming]);

  const summarizeChat = async () => {
    if (!messages.length || isSummarizing || isLoading || isStreaming) return;
    setIsSummarizing(true);
    const token = localStorage.getItem("bk_token");
    if (!token) return;
    setMessages(prev => [...prev, { role: "user", content: "สรุปบทสนทนาทั้งหมด", timestamp: new Date().toISOString() }, { role: "assistant", content: "", timestamp: new Date().toISOString() }]);
    setIsLoading(true);
    try {
      const res = await fetch("/api/chann", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, message: "ช่วยสรุปบทสนทนาทั้งหมดที่เราคุยกันมา", provider: channModel, model: channModel }) });
      await handleSSEStream(res);
    } catch {} finally { setIsSummarizing(false); setIsLoading(false); setIsStreaming(false); }
  };

  const clearHistory = async () => {
    setMessages([]); greetingInitiated.current = false;
    try {
      const token = localStorage.getItem("bk_token");
      if (!token) return;
      await fetch("/api/chann/clear", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
      setTimeout(() => { const t = localStorage.getItem("bk_token"); if (t) sendGreeting(t); }, 100);
    } catch {}
  };

  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } };

  const isEmpty = messages.length === 0 || (messages.length === 1 && messages[0].role === "assistant" && !messages[0].content && isLoading);

  const MODEL_INFO = {
    replit: { label: "Replit AI", sub: "GPT-4.1 · เครื่องมือครบ", icon: Cpu, color: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/30", active: "bg-violet-600 text-white" },
    claude: { label: "Claude Opus", sub: "Anthropic · วิเคราะห์ลึก", icon: BrainCircuit, color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/30", active: "bg-orange-600 text-white" },
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] md:h-[calc(100vh-4rem)] bg-slate-950 overflow-hidden" onDragOver={e => e.preventDefault()} onDrop={handleDrop}>

      {/* ── Left Sidebar ───────────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-[260px] xl:w-[280px] border-r border-white/5 bg-slate-900/60 backdrop-blur-sm flex-shrink-0">
        {/* Brand */}
        <div className="px-4 pt-5 pb-4 border-b border-white/5">
          <div className="flex items-center gap-3 mb-4">
            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shadow-md transition-all duration-300",
              channModel === "claude" ? "bg-gradient-to-br from-orange-500 to-amber-600" : "bg-gradient-to-br from-violet-500 to-indigo-600")}>
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-white text-sm leading-tight">Chann AI</h2>
              <p className={cn("text-[10px] transition-colors", channModel === "claude" ? "text-orange-300/80" : "text-violet-300/80")}>Platform</p>
            </div>
          </div>

          {/* New Chat */}
          <Button
            variant="outline"
            className="w-full gap-2 border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-sm h-9"
            onClick={clearHistory}
            data-testid="button-platform-new-chat"
          >
            <SquarePen className="w-3.5 h-3.5" />
            บทสนทนาใหม่
          </Button>
        </div>

        {/* Model Picker */}
        <div className="px-4 py-4 border-b border-white/5">
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-2.5">AI Model</p>
          <div className="flex flex-col gap-1.5">
            {(["replit", "claude"] as ChannModel[]).map(m => {
              const info = MODEL_INFO[m];
              const Icon = info.icon;
              const isActive = channModel === m;
              return (
                <button
                  key={m}
                  onClick={() => setChannModel(m)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all duration-200 w-full",
                    isActive ? (m === "claude" ? "bg-orange-600/20 border-orange-500/40 ring-1 ring-orange-500/30" : "bg-violet-600/20 border-violet-500/40 ring-1 ring-violet-500/30") : "border-white/5 bg-white/0 hover:bg-white/5"
                  )}
                  data-testid={`platform-model-${m}`}
                >
                  <Icon className={cn("w-4 h-4 flex-shrink-0", isActive ? info.color : "text-slate-500")} />
                  <div className="flex-1 min-w-0">
                    <div className={cn("text-xs font-semibold leading-tight", isActive ? "text-white" : "text-slate-400")}>{info.label}</div>
                    <div className="text-[9px] text-slate-500 mt-0.5">{info.sub}</div>
                  </div>
                  {isActive && <div className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", m === "claude" ? "bg-orange-400" : "bg-violet-400")} />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sidebar Nav */}
        <div className="px-4 py-3 border-b border-white/5 flex gap-1">
          {(["actions", "history"] as const).map(s => (
            <button key={s} onClick={() => setSidebarSection(s)} className={cn("flex-1 py-1.5 rounded-lg text-[11px] font-medium transition-all", sidebarSection === s ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300")} data-testid={`platform-sidebar-${s}`}>
              {s === "actions" ? "คำสั่งด่วน" : "ประวัติ"}
            </button>
          ))}
        </div>

        {/* Quick Actions / History */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
          {sidebarSection === "actions" ? (
            ALL_QUICK_ACTIONS.filter(a => isManagerOrAdmin || ["ภาพรวม"].includes(a.category)).map((action, i) => {
              const Icon = action.icon;
              return (
                <button
                  key={i}
                  onClick={() => sendQuickAction(action.prompt)}
                  disabled={isLoading || isStreaming}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-xs text-slate-400 hover:text-white hover:bg-white/5 transition-all disabled:opacity-40 disabled:cursor-not-allowed group"
                  data-testid={`platform-quick-${i}`}
                >
                  <Icon className="w-3.5 h-3.5 flex-shrink-0 text-slate-600 group-hover:text-violet-400 transition-colors" />
                  <span className="truncate">{action.label}</span>
                  <ChevronRight className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-60 transition-opacity flex-shrink-0" />
                </button>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center h-32 text-center">
              <MessageSquare className="w-8 h-8 text-slate-700 mb-2" />
              <p className="text-xs text-slate-600">ประวัติจะแสดงที่นี่</p>
            </div>
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="px-4 py-3 border-t border-white/5 flex items-center justify-between">
          <Button variant="ghost" size="sm" className="gap-1.5 text-slate-500 hover:text-slate-300 h-7 px-2 text-xs" onClick={summarizeChat} disabled={!messages.length || isSummarizing || isLoading || isStreaming} data-testid="platform-summarize">
            {isSummarizing ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />}
            สรุป
          </Button>
          <Button variant="ghost" size="sm" className="gap-1.5 text-slate-500 hover:text-red-400 h-7 px-2 text-xs" onClick={clearHistory} disabled={isLoading || isStreaming} data-testid="platform-clear">
            <Trash2 className="w-3 h-3" />
            ล้าง
          </Button>
        </div>
      </aside>

      {/* ── Main Chat Area ──────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 relative">

        {/* Chat Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-slate-900/40 backdrop-blur-sm flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-300",
              channModel === "claude" ? "bg-gradient-to-br from-orange-500 to-amber-600" : "bg-gradient-to-br from-violet-500 to-indigo-600")}>
              <Bot className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <span className="text-sm font-semibold text-white">Chann AI Platform</span>
              <span className={cn("ml-2 text-[10px] px-1.5 py-0.5 rounded-full font-medium border", channModel === "claude" ? "text-orange-300 bg-orange-500/10 border-orange-500/20" : "text-violet-300 bg-violet-500/10 border-violet-500/20")}>
                {channModel === "claude" ? "⬡ Claude Opus" : "⚡ Replit AI"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {/* Mobile model switch */}
            <div className="flex md:hidden gap-1">
              {(["replit", "claude"] as ChannModel[]).map(m => (
                <button key={m} onClick={() => setChannModel(m)} className={cn("px-2 py-1 rounded-lg text-[10px] font-semibold border transition-all", channModel === m ? (m === "claude" ? "bg-orange-500/20 border-orange-500/30 text-orange-300" : "bg-violet-500/20 border-violet-500/30 text-violet-300") : "border-white/10 text-slate-500")} data-testid={`platform-model-mobile-${m}`}>
                  {m === "claude" ? "⬡ Claude" : "⚡ Replit"}
                </button>
              ))}
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-white hover:bg-white/5" onClick={clearHistory} disabled={isLoading || isStreaming} title="บทสนทนาใหม่" data-testid="platform-header-new">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto py-4 space-y-1">
          {isEmpty ? (
            /* Welcome screen */
            <div className="flex flex-col items-center justify-center h-full px-6 text-center">
              <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center shadow-2xl mb-5 transition-all duration-300",
                channModel === "claude" ? "bg-gradient-to-br from-orange-500 to-amber-600 shadow-orange-500/30" : "bg-gradient-to-br from-violet-500 to-indigo-600 shadow-violet-500/30")}>
                <Bot className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">สวัสดีครับ</h2>
              <p className="text-slate-400 text-sm mb-1">ผม <span className="text-white font-semibold">Chann</span> — ผู้ช่วย AI ของระบบ Chann Back House</p>
              <p className={cn("text-xs mb-8 font-medium", channModel === "claude" ? "text-orange-300/80" : "text-violet-300/80")}>
                {channModel === "claude" ? "ใช้งาน Claude Opus · Anthropic" : "ใช้งาน Replit AI · GPT-4.1"}
              </p>

              {/* Starter prompts */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl w-full">
                {ALL_QUICK_ACTIONS.slice(0, 4).map((action, i) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={i}
                      onClick={() => sendQuickAction(action.prompt)}
                      className={cn("flex items-start gap-3 p-4 rounded-2xl border text-left transition-all hover:scale-[1.02] active:scale-[0.99]",
                        "border-white/8 bg-slate-800/50 hover:bg-slate-800 hover:border-white/15")}
                      data-testid={`platform-starter-${i}`}
                    >
                      <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0",
                        channModel === "claude" ? "bg-orange-500/15" : "bg-violet-500/15")}>
                        <Icon className={cn("w-4 h-4", channModel === "claude" ? "text-orange-400" : "text-violet-400")} />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-white">{action.label}</div>
                        <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">{action.prompt}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            messages.map((msg, i) => (
              <MessageBubble
                key={i} msg={msg} index={i}
                isLastMsg={i === messages.length - 1}
                isLoading={isLoading} isStreaming={isStreaming}
                onSuggestion={sendQuickAction} model={channModel}
              />
            ))
          )}
          {isLoading && !messages.some(m => m.role === "assistant" && m.thinking) && (
            <div className="flex gap-4 px-4 md:px-8 lg:px-16 xl:px-24 py-3">
              <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0",
                channModel === "claude" ? "bg-gradient-to-br from-orange-500 to-amber-600" : "bg-gradient-to-br from-violet-500 to-indigo-600")}>
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-slate-800/60 border border-white/5 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2">
                <div className="flex gap-1">
                  {[0, 150, 300].map(d => <div key={d} className={cn("w-2 h-2 rounded-full animate-bounce", channModel === "claude" ? "bg-orange-400" : "bg-violet-400")} style={{ animationDelay: `${d}ms` }} />)}
                </div>
                <span className="text-xs text-slate-500">กำลังคิด...</span>
              </div>
            </div>
          )}
        </div>

        {/* ── Input Area ──────────────────────────────────── */}
        <div className="flex-shrink-0 px-4 md:px-8 lg:px-16 xl:px-24 pb-5 pt-3 border-t border-white/5 bg-slate-900/40 backdrop-blur-sm">
          {/* Previews */}
          {(imagePreview || fileName || isFileUploading) && (
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {isFileUploading && <div className="flex items-center gap-1.5 text-xs text-slate-400"><Loader2 className="w-3 h-3 animate-spin" />กำลังอัปโหลด...</div>}
              {imagePreview && (
                <div className="relative inline-block">
                  <img src={imagePreview} alt="preview" className="h-16 w-16 object-cover rounded-xl border border-white/10" />
                  <button onClick={() => setImagePreview(null)} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-slate-700 border border-white/10 flex items-center justify-center"><X className="w-2.5 h-2.5 text-white" /></button>
                </div>
              )}
              {fileName && !isFileUploading && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 border border-white/10 text-xs text-slate-300">
                  <Paperclip className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />
                  <span className="truncate max-w-[200px]">{fileName}</span>
                  <span className="text-slate-500 flex-shrink-0">{formatFileSize(fileSize)}</span>
                  <button onClick={() => { setFileName(null); setFileContent(null); setFileSize(0); }}><X className="w-3 h-3 text-slate-500 hover:text-white" /></button>
                </div>
              )}
            </div>
          )}

          <div className={cn("flex items-end gap-2 px-4 py-3 rounded-2xl border transition-all",
            channModel === "claude" ? "border-orange-500/20 bg-slate-800/80 focus-within:border-orange-500/40" : "border-violet-500/20 bg-slate-800/80 focus-within:border-violet-500/40")}>
            <div className="flex gap-1 pb-0.5">
              <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) { processImageFile(f); if (imageInputRef.current) imageInputRef.current.value = ""; } }} />
              <input ref={fileInputRef} type="file" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) { processFile(f); if (fileInputRef.current) fileInputRef.current.value = ""; } }} />
              <button onClick={() => imageInputRef.current?.click()} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all" title="แนบรูป" data-testid="platform-attach-image"><ImagePlus className="w-4 h-4" /></button>
              <button onClick={() => fileInputRef.current?.click()} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all" title="แนบไฟล์" data-testid="platform-attach-file"><Paperclip className="w-4 h-4" /></button>
            </div>
            <Textarea
              ref={inputRef}
              value={message}
              onChange={e => { setMessage(e.target.value); e.target.style.height = "44px"; e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px"; }}
              onKeyDown={handleKeyDown}
              placeholder={`พิมพ์ข้อความ... (${channModel === "claude" ? "Claude Sonnet" : "Replit AI"})`}
              className="flex-1 resize-none bg-transparent border-0 text-sm text-slate-200 placeholder:text-slate-600 focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[44px] max-h-[160px] py-2 px-0 overflow-hidden"
              style={{ height: "44px" }}
              disabled={isLoading || isStreaming}
              data-testid="platform-message-input"
              onPaste={e => { const items = e.clipboardData?.items; if (!items) return; for (const item of Array.from(items)) { if (item.type.startsWith("image/")) { e.preventDefault(); const f = item.getAsFile(); if (f) processImageFile(f); return; } } }}
            />
            <Button
              onClick={sendMessage}
              disabled={(!message.trim() && !imagePreview && !fileContent) || isLoading || isStreaming}
              size="icon"
              className={cn("w-9 h-9 rounded-xl flex-shrink-0 shadow-md transition-all duration-200 mb-0.5",
                channModel === "claude"
                  ? "bg-gradient-to-br from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500 shadow-orange-500/30"
                  : "bg-gradient-to-br from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-violet-500/30")}
              data-testid="platform-send-button"
            >
              {isLoading || isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-center text-[10px] text-slate-600 mt-2">Enter = ส่ง · Shift+Enter = บรรทัดใหม่</p>
        </div>
      </div>
    </div>
  );
}
