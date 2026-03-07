import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MessageSquarePlus, Bot, Plus, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { AgentRequest } from "@shared/schema";

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  bug_report:      { label: "Bug Report",      color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  feature_request: { label: "Feature Request", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  other:           { label: "Other",           color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400" },
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending:      { label: "Pending",      color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
  acknowledged: { label: "Acknowledged", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  in_progress:  { label: "In Progress",  color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  done:         { label: "Done",         color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
};

export default function AgentRequestsPage() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("feature_request");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const { data, isLoading } = useQuery<{ ok: boolean; requests: AgentRequest[] }>({
    queryKey: ["/api/agent-requests"],
    queryFn: async () => {
      const res = await fetch("/api/agent-requests", {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
  });

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
        toast({ title: "Request sent", description: "Replit Agent will pick this up soon." });
        queryClient.invalidateQueries({ queryKey: ["/api/agent-requests"] });
        setOpen(false);
        setTitle("");
        setDescription("");
        setType("feature_request");
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

  const requests = data?.requests ?? [];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Bot className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Agent Requests</h1>
              <p className="text-sm text-muted-foreground">Send requests directly to Replit Agent</p>
            </div>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-new-request" className="gap-2">
                <Plus className="w-4 h-4" />
                New Request
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Request to Agent</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="type">Type</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger data-testid="select-request-type" id="type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="feature_request">Feature Request</SelectItem>
                      <SelectItem value="bug_report">Bug Report</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    data-testid="input-request-title"
                    placeholder="Short summary..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    data-testid="textarea-request-description"
                    placeholder="Describe what you need in detail..."
                    rows={5}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                <Button
                  data-testid="button-submit-request"
                  className="w-full"
                  disabled={!title || !description || createMutation.isPending}
                  onClick={() => createMutation.mutate({ type, title, description })}
                >
                  {createMutation.isPending ? "Sending..." : "Send to Agent"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {!isLoading && requests.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-muted-foreground/30 flex items-center justify-center mb-4">
              <MessageSquarePlus className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-2" data-testid="text-empty-title">
              New chat with Agent
            </h2>
            <p className="text-sm text-muted-foreground max-w-xs" data-testid="text-empty-description">
              Agent can make changes, review its work, and debug itself automatically.
            </p>
          </div>
        )}

        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        )}

        <div className="space-y-3">
          {requests.map((req) => (
            <div
              key={req.id}
              data-testid={`card-request-${req.id}`}
              className="rounded-xl border bg-card p-4 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${TYPE_LABELS[req.type]?.color}`}
                      data-testid={`badge-type-${req.id}`}
                    >
                      {TYPE_LABELS[req.type]?.label ?? req.type}
                    </span>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_LABELS[req.status]?.color}`}
                      data-testid={`badge-status-${req.id}`}
                    >
                      {STATUS_LABELS[req.status]?.label ?? req.status}
                    </span>
                  </div>
                  <p className="font-medium text-foreground truncate" data-testid={`text-title-${req.id}`}>
                    {req.title}
                  </p>
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5" data-testid={`text-desc-${req.id}`}>
                    {req.description}
                  </p>
                </div>
                <Select
                  value={req.status}
                  onValueChange={(val) => statusMutation.mutate({ id: req.id, status: val })}
                >
                  <SelectTrigger className="w-32 shrink-0 h-8 text-xs" data-testid={`select-status-${req.id}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="acknowledged">Acknowledged</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span data-testid={`text-meta-${req.id}`}>
                  {req.username} · {new Date(req.createdAt).toLocaleDateString("th-TH")}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
