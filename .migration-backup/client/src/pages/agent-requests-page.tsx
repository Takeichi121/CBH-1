import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bot, Send, MessageSquarePlus, Sparkles, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import type { AgentRequest } from "@shared/schema";

const TYPE_OPTIONS = [
  { value: "feature_request", label: "✨ Feature", color: "bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30" },
  { value: "bug_report",      label: "🐛 Bug",     color: "bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30" },
  { value: "other",           label: "💬 Other",   color: "bg-gray-500/20 text-gray-400 border-gray-500/30 hover:bg-gray-500/30" },
];

const TYPE_BADGE: Record<string, string> = {
  feature_request: "bg-blue-500/20 text-blue-400",
  bug_report:      "bg-red-500/20 text-red-400",
  other:           "bg-gray-500/20 text-gray-400",
};

const STATUS_INFO: Record<string, { label: string; color: string }> = {
  pending:      { label: "Pending",      color: "bg-yellow-500/20 text-yellow-400" },
  acknowledged: { label: "Acknowledged", color: "bg-blue-500/20 text-blue-400" },
  in_progress:  { label: "In Progress",  color: "bg-purple-500/20 text-purple-400" },
  done:         { label: "Done",         color: "bg-green-500/20 text-green-400" },
};

// ─── Chann Embedded Chat ────────────────────────────────────────────────────
type ChannMsg = {
  role: "user" | "assistant";
  content: string;
  thinking?: boolean;
  thinkingText?: string;
};

function ChannChatPanel() {
  const { token, user } = useAuth();
  const [messages, setMessages] = useState<ChannMsg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load history
  useEffect(() => {
    if (!token) return;
    fetch("/api/chann/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(r => r.json())
      .then(d => {
        if (d?.history?.length) {
          setMessages(d.history.map((h: { role: string; content: string }) => ({
            role: h.role as "user" | "assistant",
            content: h.content,
          })));
        }
      })
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading || isStreaming) return;

    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    setMessages(prev => [...prev, { role: "user", content: text }]);
    setIsLoading(true);

    try {
      const res = await fetch("/api/chann", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, message: text, context: `- Path: /agent-requests` }),
      });

      if (!res.body) throw new Error("No stream");
      setIsLoading(false);
      setIsStreaming(true);

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let assistantText = "";

      setMessages(prev => [...prev, { role: "assistant", content: "", thinking: true }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = dec.decode(value, { stream: true });
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const raw = line.slice(5).trim();
          if (raw === "[DONE]") continue;
          try {
            const parsed = JSON.parse(raw);
            const thinkingStep = parsed?.thinking ?? "";
            const token2 = parsed?.content ?? parsed?.choices?.[0]?.delta?.content ?? parsed?.delta ?? parsed?.text ?? "";
            if (thinkingStep) {
              setMessages(prev => {
                const next = [...prev];
                const last = next[next.length - 1];
                next[next.length - 1] = { ...last, thinking: true, thinkingText: thinkingStep };
                return next;
              });
            }
            if (token2) {
              assistantText += token2;
              setMessages(prev => {
                const next = [...prev];
                next[next.length - 1] = { role: "assistant", content: assistantText, thinking: false, thinkingText: undefined };
                return next;
              });
            }
          } catch { /* non-JSON line */ }
        }
      }

      if (!assistantText) {
        setMessages(prev => {
          const next = [...prev];
          next[next.length - 1] = { role: "assistant", content: "(ไม่มีคำตอบ)", thinking: false };
          return next;
        });
      }
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง" }]);
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  }, [input, isLoading, isStreaming, token]);

  const clearChat = async () => {
    if (!token) return;
    await fetch("/api/chann/clear", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    setMessages([]);
  };

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function handleTextareaChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 flex items-center justify-center mb-4 border border-violet-500/20">
              <Sparkles className="w-7 h-7 text-violet-400" />
            </div>
            <h2 className="text-base font-semibold text-foreground mb-2">Chann AI</h2>
            <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
              ผู้ช่วย AI วิเคราะห์ยอดขาย ตาราง roster และข้อมูลร้านได้ทันที
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn("flex gap-2.5", msg.role === "user" ? "justify-end" : "justify-start")}
          >
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-4 h-4 text-white" />
              </div>
            )}
            <div
              className={cn(
                "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm",
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-tr-sm"
                  : "bg-muted text-foreground rounded-tl-sm"
              )}
            >
              {msg.thinking ? (
                <div className="flex flex-col gap-1.5">
                  {msg.thinkingText && (
                    <p className="text-xs italic text-muted-foreground/70 leading-relaxed" data-testid="text-thinking-step">
                      {msg.thinkingText}
                    </p>
                  )}
                  <div className="flex gap-1 items-center py-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              ) : msg.role === "assistant" ? (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              )}
            </div>
            {msg.role === "user" && user?.profilePicture ? (
              <img src={user.profilePicture} className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5" alt="" />
            ) : msg.role === "user" ? (
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold text-primary">
                {user?.nickName?.[0] ?? user?.username?.[0] ?? "U"}
              </div>
            ) : null}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t bg-background px-4 py-3 shrink-0">
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="ถามอะไรก็ได้… (Enter ส่ง, Shift+Enter ขึ้นบรรทัด)"
            rows={1}
            disabled={isLoading || isStreaming}
            className="flex-1 resize-none rounded-xl border bg-muted/50 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/50 leading-relaxed disabled:opacity-50"
            style={{ minHeight: "42px", maxHeight: "160px", overflowY: "auto" }}
            data-testid="input-chann-page-message"
          />
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={clearChat}
              className="h-[42px] w-[42px] rounded-xl shrink-0 text-muted-foreground hover:text-destructive"
              title="ล้างประวัติ"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
          <Button
            size="icon"
            onClick={sendMessage}
            disabled={!input.trim() || isLoading || isStreaming}
            className="h-[42px] w-[42px] rounded-xl shrink-0 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500"
            data-testid="button-send-chann-page"
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
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function AgentRequestsPage() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"replit" | "chann">("chann");
  const [selectedType, setSelectedType] = useState("feature_request");
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data, isLoading } = useQuery<{ ok: boolean; requests: AgentRequest[] }>({
    queryKey: ["/api/agent-requests"],
    queryFn: async () => {
      const res = await fetch("/api/agent-requests", {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
    refetchInterval: (query) => {
      const requests = query.state.data?.requests ?? [];
      const hasPending = requests.some((r) => !r.response);
      return hasPending ? 2500 : false;
    },
  });

  const requests = (data?.requests ?? []).slice().reverse();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [requests.length]);

  const createMutation = useMutation({
    mutationFn: async (body: { type: string; title: string; description: string }) => {
      const res = await fetch("/api/agent-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.ok) {
        queryClient.invalidateQueries({ queryKey: ["/api/agent-requests"] });
        setMessage("");
        if (textareaRef.current) textareaRef.current.style.height = "auto";
      } else {
        toast({ variant: "destructive", title: "Error", description: data.message });
      }
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await fetch(`/api/agent-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent-requests"] });
    },
  });

  function handleSend() {
    const trimmed = message.trim();
    if (!trimmed) return;
    const lines = trimmed.split("\n");
    const title = lines[0].slice(0, 100) || trimmed.slice(0, 100);
    createMutation.mutate({ type: selectedType, title, description: trimmed });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleTextareaChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setMessage(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-background">
      {/* Header with tabs */}
      <div className="border-b bg-background/95 backdrop-blur shrink-0">
        <div className="flex items-center gap-3 px-4 pt-3">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Bot className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-foreground leading-none">AI Agents</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Chann AI assistant &amp; Replit Agent requests</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-4 pt-3">
          <button
            onClick={() => setActiveTab("chann")}
            data-testid="tab-chann"
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors",
              activeTab === "chann"
                ? "border-violet-500 text-violet-500 bg-violet-500/5"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Chann AI
          </button>
          <button
            onClick={() => setActiveTab("replit")}
            data-testid="tab-replit-agent"
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors",
              activeTab === "replit"
                ? "border-primary text-primary bg-primary/5"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Bot className="w-3.5 h-3.5" />
            Replit Agent
          </button>
        </div>
      </div>

      {/* Tab content */}
      {activeTab === "chann" ? (
        <div className="flex-1 overflow-hidden">
          <ChannChatPanel />
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {isLoading && (
              <div className="flex flex-col gap-4">
                {[1, 2].map(i => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-end">
                      <div className="h-12 w-56 rounded-2xl bg-muted animate-pulse" />
                    </div>
                    <div className="flex justify-start gap-2">
                      <div className="h-8 w-8 rounded-full bg-muted animate-pulse shrink-0" />
                      <div className="h-10 w-48 rounded-2xl bg-muted animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!isLoading && requests.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center py-16">
                <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-muted-foreground/25 flex items-center justify-center mb-4">
                  <MessageSquarePlus className="w-7 h-7 text-muted-foreground/40" />
                </div>
                <h2 className="text-base font-semibold text-foreground mb-2" data-testid="text-empty-title">
                  New chat with Agent
                </h2>
                <p className="text-sm text-muted-foreground max-w-xs leading-relaxed" data-testid="text-empty-description">
                  Agent can make changes, review its work, and debug itself automatically.
                </p>
              </div>
            )}

            {requests.map((req) => (
              <div key={req.id} className="space-y-1.5" data-testid={`card-request-${req.id}`}>
                <div className="flex flex-col items-end gap-1">
                  <div className="max-w-[80%]">
                    <div className="rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-primary-foreground shadow-sm">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap" data-testid={`text-desc-${req.id}`}>
                        {req.description}
                      </p>
                    </div>
                    <div className="flex items-center justify-end gap-2 mt-1.5 flex-wrap">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_BADGE[req.type] ?? "bg-gray-500/20 text-gray-400"}`}
                        data-testid={`badge-type-${req.id}`}
                      >
                        {TYPE_OPTIONS.find(t => t.value === req.type)?.label ?? req.type}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(req.createdAt).toLocaleDateString("th-TH", { day: "numeric", month: "short" })}
                      </span>
                      <Select
                        value={req.status}
                        onValueChange={(val) => statusMutation.mutate({ id: req.id, status: val })}
                      >
                        <SelectTrigger
                          className={`h-5 text-xs px-2 py-0 rounded-full border w-auto gap-1 ${STATUS_INFO[req.status]?.color ?? ""}`}
                          data-testid={`select-status-${req.id}`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent align="end">
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="acknowledged">Acknowledged</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="done">Done</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="flex items-end gap-2 max-w-[80%]">
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0 mb-0.5">
                    <Bot className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="rounded-2xl rounded-bl-sm bg-muted px-4 py-2.5 shadow-sm">
                    {req.response ? (
                      <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap" data-testid={`text-response-${req.id}`}>
                        {req.response}
                      </p>
                    ) : (
                      <div className="flex gap-1 items-center py-0.5" data-testid={`text-response-loading-${req.id}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            <div ref={messagesEndRef} />
          </div>

          <div className="border-t bg-background px-4 py-3 shrink-0">
            <div className="flex gap-1.5 mb-2.5">
              {TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  data-testid={`button-type-${opt.value}`}
                  onClick={() => setSelectedType(opt.value)}
                  className={`text-xs px-3 py-1 rounded-full border font-medium transition-colors ${opt.color} ${
                    selectedType === opt.value ? "ring-1 ring-current" : "opacity-60"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="flex gap-2 items-end">
              <textarea
                ref={textareaRef}
                data-testid="textarea-message"
                value={message}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                placeholder="Type your request… (Enter to send, Shift+Enter for new line)"
                rows={1}
                className="flex-1 resize-none rounded-xl border bg-muted/50 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 leading-relaxed"
                style={{ minHeight: "42px", maxHeight: "160px", overflowY: "auto" }}
              />
              <Button
                data-testid="button-send"
                size="icon"
                className="rounded-xl shrink-0 h-[42px] w-[42px]"
                disabled={!message.trim() || createMutation.isPending}
                onClick={handleSend}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
