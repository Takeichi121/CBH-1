import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Megaphone, Plus, Pencil, Trash2, Pin, AlertTriangle, Clock, CheckCircle2, Users } from "lucide-react";
import type { Announcement, AnnouncementAcknowledgment } from "@shared/schema";

const PRIORITY_COLORS: Record<string, string> = {
  high: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
  normal: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800",
  low: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700",
};

const PRIORITY_LABELS: Record<string, { en: string; th: string }> = {
  high: { en: "High", th: "เร่งด่วน" },
  normal: { en: "Normal", th: "ปกติ" },
  low: { en: "Low", th: "ต่ำ" },
};

const AUDIENCE_LABELS: Record<string, { en: string; th: string }> = {
  all: { en: "All Staff", th: "พนักงานทุกคน" },
  managers: { en: "Managers Only", th: "ผู้จัดการเท่านั้น" },
  staff: { en: "Staff Only", th: "พนักงานทั่วไป" },
};

function formatDate(iso: string, language: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(language === "th" ? "th-TH" : "en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function isExpired(expiresAt: string | null) {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

interface AnnouncementFormState {
  title: string;
  titleTh: string;
  content: string;
  contentTh: string;
  priority: string;
  targetAudience: string;
  isPinned: boolean;
  expiresAt: string;
}

const emptyForm: AnnouncementFormState = {
  title: "",
  titleTh: "",
  content: "",
  contentTh: "",
  priority: "normal",
  targetAudience: "all",
  isPinned: false,
  expiresAt: "",
};

export default function AnnouncementsPage() {
  const { user } = useAuth();
  const { language } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const token = localStorage.getItem("bk_token") || "";
  const isManager = user?.role === "admin" || user?.role === "manager" || user?.role === "area";

  useEffect(() => {
    if (!user?.username) return;
    const key = `announcements_last_seen:${user.username}`;
    localStorage.setItem(key, new Date().toISOString());
  }, [user?.username]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<AnnouncementFormState>(emptyForm);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [showExpired, setShowExpired] = useState(false);
  const [acksDialogId, setAcksDialogId] = useState<number | null>(null);

  const { data, isLoading } = useQuery<{ ok: boolean; announcements: Announcement[] }>({
    queryKey: ["/api/announcements", showExpired],
    queryFn: async () => {
      const res = await fetch(`/api/announcements?includeExpired=${showExpired}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
    staleTime: 30000,
  });

  const { data: myAcksData } = useQuery<{ ok: boolean; acknowledgedIds: number[] }>({
    queryKey: ["/api/announcements/my-acknowledgments"],
    queryFn: async () => {
      const res = await fetch("/api/announcements/my-acknowledgments", {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
    staleTime: 30000,
  });

  const acknowledgedIds = new Set(myAcksData?.acknowledgedIds ?? []);

  const { data: acksDetailData, isLoading: acksDetailLoading } = useQuery<{
    ok: boolean;
    acknowledged: AnnouncementAcknowledgment[];
    unacknowledged: { username: string; displayName: string }[];
  }>({
    queryKey: ["/api/announcements", acksDialogId, "acknowledgments"],
    queryFn: async () => {
      const res = await fetch(`/api/announcements/${acksDialogId}/acknowledgments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
    enabled: acksDialogId !== null && isManager,
  });

  const announcements = data?.announcements ?? [];

  const acknowledgeMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/announcements/${id}/acknowledge`, { token });
      const json = await res.json();
      if (!json.ok) throw new Error(json.message || "Failed to acknowledge");
      return { ...json, announcementId: id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/announcements/my-acknowledgments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/announcements", data.announcementId, "acknowledgments"] });
      toast({
        title: language === "th" ? "รับทราบแล้ว" : "Acknowledged",
        description: language === "th" ? "ขอบคุณสำหรับการยืนยัน" : "Thank you for confirming you've read this.",
      });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const createMutation = useMutation({
    mutationFn: async (body: object) => {
      const res = await apiRequest("POST", "/api/announcements", { ...body, token });
      const json = await res.json();
      if (!json.ok) throw new Error(json.message || "Failed to create");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/announcements"] });
      setDialogOpen(false);
      setForm(emptyForm);
      toast({ title: "Announcement posted", description: "Staff will now see your announcement." });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, body }: { id: number; body: object }) => {
      const res = await apiRequest("PATCH", `/api/announcements/${id}`, { ...body, token });
      const json = await res.json();
      if (!json.ok) throw new Error(json.message || "Failed to update");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/announcements"] });
      setDialogOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      toast({ title: "Announcement updated" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/announcements/${id}`, { token });
      const json = await res.json();
      if (!json.ok) throw new Error(json.message || "Failed to delete");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/announcements"] });
      setDeleteId(null);
      toast({ title: "Announcement deleted" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(a: Announcement) {
    setEditingId(a.id);
    setForm({
      title: a.title,
      titleTh: a.titleTh ?? "",
      content: a.content,
      contentTh: a.contentTh ?? "",
      priority: a.priority,
      targetAudience: a.targetAudience,
      isPinned: a.isPinned === 1,
      expiresAt: a.expiresAt ? a.expiresAt.slice(0, 10) : "",
    });
    setDialogOpen(true);
  }

  function handleSubmit() {
    const body = {
      title: form.title.trim(),
      titleTh: form.titleTh.trim() || null,
      content: form.content.trim(),
      contentTh: form.contentTh.trim() || null,
      priority: form.priority,
      targetAudience: form.targetAudience,
      isPinned: form.isPinned,
      expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
    };
    if (!body.title || !body.content) {
      toast({ title: "Validation", description: "Title and content are required.", variant: "destructive" });
      return;
    }
    if (editingId) {
      updateMutation.mutate({ id: editingId, body });
    } else {
      createMutation.mutate(body);
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  const acksForDialog = acksDetailData?.acknowledged ?? [];
  const unacksForDialog = acksDetailData?.unacknowledged ?? [];

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10">
            <Megaphone className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display" data-testid="text-announcements-title">
              {language === "th" ? "ประกาศ" : "Announcements"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {language === "th" ? "ข่าวสารและประกาศจากผู้จัดการ" : "Notices and broadcasts from management"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isManager && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Switch
                id="show-expired"
                checked={showExpired}
                onCheckedChange={setShowExpired}
                data-testid="switch-show-expired"
              />
              <Label htmlFor="show-expired" className="cursor-pointer">
                {language === "th" ? "รวมหมดอายุ" : "Show expired"}
              </Label>
            </div>
          )}
          {isManager && (
            <Button onClick={openCreate} size="sm" className="gap-2" data-testid="button-create-announcement">
              <Plus className="w-4 h-4" />
              {language === "th" ? "ประกาศใหม่" : "New Announcement"}
            </Button>
          )}
        </div>
      </div>

      {/* Announcements List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      ) : announcements.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <Megaphone className="w-12 h-12 text-muted-foreground/40" />
            <p className="text-muted-foreground font-medium">
              {language === "th" ? "ยังไม่มีประกาศ" : "No announcements yet"}
            </p>
            {isManager && (
              <Button variant="outline" size="sm" onClick={openCreate} data-testid="button-create-first-announcement">
                <Plus className="w-4 h-4 mr-2" />
                {language === "th" ? "สร้างประกาศแรก" : "Create the first one"}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {announcements.map(a => {
            const expired = isExpired(a.expiresAt);
            const priorityColor = PRIORITY_COLORS[a.priority] || PRIORITY_COLORS.normal;
            const priorityLabel = (PRIORITY_LABELS[a.priority] || PRIORITY_LABELS.normal)[language === "th" ? "th" : "en"];
            const audienceLabel = (AUDIENCE_LABELS[a.targetAudience] || AUDIENCE_LABELS.all)[language === "th" ? "th" : "en"];
            const displayTitle = (language === "th" && a.titleTh) ? a.titleTh : a.title;
            const displayContent = (language === "th" && a.contentTh) ? a.contentTh : a.content;
            const isAcknowledged = acknowledgedIds.has(a.id);

            return (
              <Card
                key={a.id}
                className={`transition-all ${expired ? "opacity-60" : ""} ${a.isPinned ? "border-primary/30 shadow-sm" : ""}`}
                data-testid={`card-announcement-${a.id}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      {a.isPinned === 1 && (
                        <Pin className="w-4 h-4 text-primary shrink-0" />
                      )}
                      <CardTitle className="text-base leading-snug" data-testid={`text-announcement-title-${a.id}`}>
                        {displayTitle}
                      </CardTitle>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {isManager && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => openEdit(a)}
                            data-testid={`button-edit-announcement-${a.id}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => setDeleteId(a.id)}
                            data-testid={`button-delete-announcement-${a.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap mt-1">
                    <Badge variant="outline" className={`text-xs ${priorityColor}`}>
                      {a.priority === "high" && <AlertTriangle className="w-3 h-3 mr-1" />}
                      {priorityLabel}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {audienceLabel}
                    </Badge>
                    {expired && (
                      <Badge variant="outline" className="text-xs text-muted-foreground">
                        {language === "th" ? "หมดอายุแล้ว" : "Expired"}
                      </Badge>
                    )}
                    {a.expiresAt && !expired && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {language === "th" ? "หมดอายุ" : "Expires"} {formatDate(a.expiresAt, language)}
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-foreground/80 whitespace-pre-wrap" data-testid={`text-announcement-content-${a.id}`}>
                    {displayContent}
                  </p>
                  <p className="text-xs text-muted-foreground mt-3">
                    {language === "th" ? "โดย" : "By"} {a.createdBy} · {formatDate(a.createdAt, language)}
                  </p>

                  {/* Acknowledgment row */}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                    {/* Staff: Got it button / acknowledged indicator */}
                    {!isManager && !expired && (
                      isAcknowledged ? (
                        <span
                          className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400 font-medium"
                          data-testid={`status-acknowledged-${a.id}`}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          {language === "th" ? "รับทราบแล้ว" : "Acknowledged"}
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 border-emerald-500 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950"
                          onClick={() => acknowledgeMutation.mutate(a.id)}
                          disabled={acknowledgeMutation.isPending}
                          data-testid={`button-acknowledge-${a.id}`}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          {language === "th" ? "รับทราบ" : "Got it"}
                        </Button>
                      )
                    )}

                    {/* Manager: Got it (as a regular user too) and acknowledgment count */}
                    {isManager && !expired && (
                      <div className="flex items-center gap-2">
                        {isAcknowledged ? (
                          <span
                            className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400 font-medium"
                            data-testid={`status-acknowledged-${a.id}`}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            {language === "th" ? "รับทราบแล้ว" : "Acknowledged"}
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 border-emerald-500 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950"
                            onClick={() => acknowledgeMutation.mutate(a.id)}
                            disabled={acknowledgeMutation.isPending}
                            data-testid={`button-acknowledge-${a.id}`}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            {language === "th" ? "รับทราบ" : "Got it"}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-1.5 text-muted-foreground hover:text-foreground text-xs"
                          onClick={() => setAcksDialogId(a.id)}
                          data-testid={`button-view-acknowledgments-${a.id}`}
                        >
                          <Users className="w-3.5 h-3.5" />
                          {language === "th" ? "ดูการรับทราบ" : "View responses"}
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Acknowledgments Detail Dialog (manager only) */}
      <Dialog open={acksDialogId !== null} onOpenChange={open => { if (!open) setAcksDialogId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              {language === "th" ? "สถานะการรับทราบ" : "Acknowledgment Status"}
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-4">
            {acksDetailLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : (
              <>
                {/* Summary counts */}
                <div className="flex gap-3">
                  <div className="flex-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-3 text-center">
                    <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400" data-testid="count-acknowledged">{acksForDialog.length}</p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-500">{language === "th" ? "รับทราบแล้ว" : "Acknowledged"}</p>
                  </div>
                  <div className="flex-1 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 text-center">
                    <p className="text-2xl font-bold text-amber-700 dark:text-amber-400" data-testid="count-unacknowledged">{unacksForDialog.length}</p>
                    <p className="text-xs text-amber-600 dark:text-amber-500">{language === "th" ? "ยังไม่รับทราบ" : "Pending"}</p>
                  </div>
                </div>

                {/* Acknowledged list */}
                {acksForDialog.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1.5 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {language === "th" ? "รับทราบแล้ว" : "Acknowledged"}
                    </p>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {acksForDialog.map(ack => (
                        <div
                          key={ack.id}
                          className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-muted/50"
                          data-testid={`row-acknowledged-${ack.id}`}
                        >
                          <span className="text-sm font-medium">{ack.username}</span>
                          <span className="text-xs text-muted-foreground">{formatDate(ack.acknowledgedAt, language)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Unacknowledged list */}
                {unacksForDialog.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1.5 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {language === "th" ? "ยังไม่รับทราบ" : "Pending"}
                    </p>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {unacksForDialog.map(u => (
                        <div
                          key={u.username}
                          className="flex items-center px-3 py-1.5 rounded-lg bg-muted/30"
                          data-testid={`row-unacknowledged-${u.username}`}
                        >
                          <span className="text-sm text-muted-foreground">{u.displayName}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {acksForDialog.length === 0 && unacksForDialog.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {language === "th" ? "ยังไม่มีผู้รับทราบ" : "No one has acknowledged yet"}
                  </p>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAcksDialogId(null)}>
              {language === "th" ? "ปิด" : "Close"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={open => { if (!open) { setDialogOpen(false); setEditingId(null); setForm(emptyForm); } else { setDialogOpen(true); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingId
                ? (language === "th" ? "แก้ไขประกาศ" : "Edit Announcement")
                : (language === "th" ? "ประกาศใหม่" : "New Announcement")}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <Label htmlFor="ann-title">Title (EN) *</Label>
                <Input
                  id="ann-title"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Announcement title"
                  data-testid="input-announcement-title"
                />
              </div>
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <Label htmlFor="ann-title-th">Title (TH)</Label>
                <Input
                  id="ann-title-th"
                  value={form.titleTh}
                  onChange={e => setForm(f => ({ ...f, titleTh: e.target.value }))}
                  placeholder="หัวข้อ (ไทย)"
                  data-testid="input-announcement-title-th"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ann-content">Content (EN) *</Label>
              <Textarea
                id="ann-content"
                value={form.content}
                onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                placeholder="Write your announcement here..."
                rows={4}
                data-testid="input-announcement-content"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ann-content-th">Content (TH)</Label>
              <Textarea
                id="ann-content-th"
                value={form.contentTh}
                onChange={e => setForm(f => ({ ...f, contentTh: e.target.value }))}
                placeholder="เนื้อหา (ไทย)"
                rows={3}
                data-testid="input-announcement-content-th"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger data-testid="select-announcement-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Audience</Label>
                <Select value={form.targetAudience} onValueChange={v => setForm(f => ({ ...f, targetAudience: v }))}>
                  <SelectTrigger data-testid="select-announcement-audience">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Staff</SelectItem>
                    <SelectItem value="managers">Managers Only</SelectItem>
                    <SelectItem value="staff">Staff Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 items-center">
              <div className="space-y-1.5">
                <Label htmlFor="ann-expires">Expires On (optional)</Label>
                <Input
                  id="ann-expires"
                  type="date"
                  value={form.expiresAt}
                  onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
                  data-testid="input-announcement-expires"
                />
              </div>
              <div className="flex items-center gap-3 pt-5">
                <Switch
                  id="ann-pinned"
                  checked={form.isPinned}
                  onCheckedChange={v => setForm(f => ({ ...f, isPinned: v }))}
                  data-testid="switch-announcement-pinned"
                />
                <Label htmlFor="ann-pinned" className="cursor-pointer flex items-center gap-1">
                  <Pin className="w-3.5 h-3.5" />
                  Pin to top
                </Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isPending} data-testid="button-submit-announcement">
              {isPending ? "Saving..." : editingId ? "Update" : "Post Announcement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={open => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {language === "th" ? "ยืนยันการลบ" : "Delete Announcement"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === "th"
                ? "ต้องการลบประกาศนี้? การกระทำนี้ไม่สามารถย้อนกลับได้"
                : "Are you sure you want to delete this announcement? This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              data-testid="button-confirm-delete-announcement"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
