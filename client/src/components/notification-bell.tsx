import { useState } from "react";
import { Bell, CheckCircle2, XCircle, CalendarDays, Package, Sparkles, ClipboardList, FileText } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Notification } from "@shared/schema";

function formatRelativeTime(createdAt: string): string {
  const now = Date.now();
  const created = new Date(createdAt).getTime();
  const diffMs = now - created;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "เมื่อกี้";
  if (diffMin < 60) return `${diffMin} นาทีที่แล้ว`;
  if (diffHr < 24) return `${diffHr} ชั่วโมงที่แล้ว`;
  if (diffDay === 1) return "เมื่อวาน";
  if (diffDay < 7) return `${diffDay} วันที่แล้ว`;
  return new Date(createdAt).toLocaleDateString("th-TH", { day: "numeric", month: "short" });
}

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem("bk_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);

  const { data } = useQuery<{ ok: boolean; notifications: Notification[]; unreadCount: number }>({
    queryKey: ["/api/notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications", {
        headers: getAuthHeader(),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch notifications");
      return res.json();
    },
    refetchInterval: 30000,
    staleTime: 20000,
  });

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  const markReadMutation = useMutation({
    mutationFn: async (id: number) => {
      const token = localStorage.getItem("bk_token") || "";
      const res = await fetch(`/api/notifications/${id}/read`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({ token }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/notifications"] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem("bk_token") || "";
      const res = await fetch("/api/notifications/read-all", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({ token }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/notifications"] }),
  });

  const handleItemClick = (notif: Notification) => {
    if (!notif.isRead) {
      markReadMutation.mutate(notif.id);
    }
  };

  const badgeCount = unreadCount > 99 ? "99+" : unreadCount > 0 ? String(unreadCount) : null;

  function NotifIcon({ type }: { type: string }) {
    const base = "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5";
    switch (type) {
      case "version_update":
        return <span className={`${base} bg-violet-100 dark:bg-violet-900/30`}><Sparkles className="w-3.5 h-3.5 text-violet-500" /></span>;
      case "request_approved":
        return <span className={`${base} bg-green-100 dark:bg-green-900/30`}><CheckCircle2 className="w-3.5 h-3.5 text-green-600" /></span>;
      case "request_rejected":
        return <span className={`${base} bg-red-100 dark:bg-red-900/30`}><XCircle className="w-3.5 h-3.5 text-red-500" /></span>;
      case "manager_request":
        return <span className={`${base} bg-orange-100 dark:bg-orange-900/30`}><ClipboardList className="w-3.5 h-3.5 text-orange-500" /></span>;
      case "borrow_transaction":
        return <span className={`${base} bg-blue-100 dark:bg-blue-900/30`}><Package className="w-3.5 h-3.5 text-blue-500" /></span>;
      case "roster_published":
        return <span className={`${base} bg-teal-100 dark:bg-teal-900/30`}><CalendarDays className="w-3.5 h-3.5 text-teal-600" /></span>;
      case "daily_report":
        return <span className={`${base} bg-amber-100 dark:bg-amber-900/30`}><FileText className="w-3.5 h-3.5 text-amber-600" /></span>;
      default:
        return <span className={`${base} bg-muted`}><Bell className="w-3.5 h-3.5 text-muted-foreground" /></span>;
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative rounded-full w-9 h-9 border-primary/20 hover:bg-primary/5 transition-all"
          data-testid="button-notification-bell"
          aria-label="การแจ้งเตือน"
        >
          <Bell className="w-4 h-4 text-muted-foreground" />
          {badgeCount && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
              {badgeCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80 p-0 shadow-lg"
        data-testid="popover-notifications"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <span className="font-semibold text-sm text-foreground">การแจ้งเตือน</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-primary hover:text-primary/80 px-2"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
              data-testid="button-mark-all-read"
            >
              อ่านทั้งหมด
            </Button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground text-sm gap-2">
            <Bell className="w-8 h-8 opacity-30" />
            <span>ไม่มีการแจ้งเตือน</span>
          </div>
        ) : (
          <ScrollArea className="max-h-[360px]">
            <div className="divide-y">
              {notifications.map((notif) => (
                <button
                  key={notif.id}
                  className={`w-full text-left px-4 py-3 transition-colors hover:bg-muted/50 flex gap-3 items-start ${
                    !notif.isRead ? "bg-primary/5" : ""
                  }`}
                  onClick={() => handleItemClick(notif)}
                  data-testid={`notification-item-${notif.id}`}
                >
                  <div className="relative flex-shrink-0">
                    <NotifIcon type={notif.type} />
                    {!notif.isRead && (
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-background" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-snug line-clamp-1 ${!notif.isRead ? "font-semibold text-foreground" : "font-medium text-foreground/80"}`}>
                      {notif.titleTh || notif.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-snug">
                      {notif.messageTh || notif.message}
                    </p>
                    <p className="text-[10px] text-muted-foreground/70 mt-1">
                      {formatRelativeTime(notif.createdAt)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  );
}
