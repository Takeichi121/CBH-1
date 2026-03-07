import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bot, Send, MessageSquarePlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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

export default function AgentRequestsPage() {
  const { token } = useAuth();
  const { toast } = useToast();
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
        if (textareaRef.current) {
          textareaRef.current.style.height = "auto";
        }
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
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-background/95 backdrop-blur shrink-0">
        <div className="p-1.5 rounded-lg bg-primary/10">
          <Bot className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-sm font-semibold text-foreground leading-none">Replit Agent</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Send requests · Agent reviews automatically</p>
        </div>
      </div>

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
    </div>
  );
}
