import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { safeStorage } from "@/lib/safe-storage";
import { useLocation } from "wouter";
import { useI18n } from "@/hooks/use-i18n";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  CheckCircle2,
  XCircle,
  CalendarDays,
  Package,
  Sparkles,
  ClipboardList,
  FileText,
  CheckCheck,
  Filter,
  Trash2,
  X,
  ArrowRight,
} from "lucide-react";
import type { Notification } from "@shared/schema";
import { getNotificationUrl } from "@/lib/notification-utils";

function formatRelativeTime(createdAt: string, language: string): string {
  const now = Date.now();
  const created = new Date(createdAt).getTime();
  const diffMs = now - created;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (language === "th") {
    if (diffSec < 60) return "เมื่อกี้";
    if (diffMin < 60) return `${diffMin} นาทีที่แล้ว`;
    if (diffHr < 24) return `${diffHr} ชั่วโมงที่แล้ว`;
    if (diffDay === 1) return "เมื่อวาน";
    if (diffDay < 7) return `${diffDay} วันที่แล้ว`;
    return new Date(createdAt).toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" });
  } else {
    if (diffSec < 60) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDay === 1) return "yesterday";
    if (diffDay < 7) return `${diffDay}d ago`;
    return new Date(createdAt).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
  }
}

function getAuthHeader(): Record<string, string> {
  const token = safeStorage.getItem("bk_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

type NotifType = Notification["type"] | "all" | "unread";

const TYPE_LABELS: Record<string, { th: string; en: string }> = {
  all: { th: "ทั้งหมด", en: "All" },
  unread: { th: "ยังไม่อ่าน", en: "Unread" },
  version_update: { th: "อัปเดต", en: "Updates" },
  request_approved: { th: "อนุมัติ", en: "Approved" },
  request_rejected: { th: "ปฏิเสธ", en: "Rejected" },
  manager_request: { th: "คำขอ", en: "Requests" },
  borrow_transaction: { th: "ยืม-คืน", en: "Borrow" },
  roster_published: { th: "ตารางงาน", en: "Roster" },
  daily_report: { th: "รายงาน", en: "Report" },
};

function NotifIcon({ type, size = "md" }: { type: string; size?: "sm" | "md" }) {
  const dim = size === "sm" ? "w-6 h-6" : "w-9 h-9";
  const icon = size === "sm" ? "w-3 h-3" : "w-4 h-4";
  const base = `${dim} rounded-full flex items-center justify-center flex-shrink-0`;
  switch (type) {
    case "version_update":
      return <span className={`${base} bg-violet-100 dark:bg-violet-900/30`}><Sparkles className={`${icon} text-violet-500`} /></span>;
    case "request_approved":
      return <span className={`${base} bg-green-100 dark:bg-green-900/30`}><CheckCircle2 className={`${icon} text-green-600`} /></span>;
    case "request_rejected":
      return <span className={`${base} bg-red-100 dark:bg-red-900/30`}><XCircle className={`${icon} text-red-500`} /></span>;
    case "manager_request":
      return <span className={`${base} bg-orange-100 dark:bg-orange-900/30`}><ClipboardList className={`${icon} text-orange-500`} /></span>;
    case "borrow_transaction":
      return <span className={`${base} bg-blue-100 dark:bg-blue-900/30`}><Package className={`${icon} text-blue-500`} /></span>;
    case "roster_published":
      return <span className={`${base} bg-teal-100 dark:bg-teal-900/30`}><CalendarDays className={`${icon} text-teal-600`} /></span>;
    case "daily_report":
      return <span className={`${base} bg-amber-100 dark:bg-amber-900/30`}><FileText className={`${icon} text-amber-600`} /></span>;
    default:
      return <span className={`${base} bg-muted`}><Bell className={`${icon} text-muted-foreground`} /></span>;
  }
}

const FILTER_TABS: NotifType[] = ["all", "unread", "version_update", "manager_request", "request_approved", "request_rejected", "borrow_transaction", "roster_published", "daily_report"];

export default function NotificationsPage() {
  const { language } = useI18n();
  const [activeFilter, setActiveFilter] = useState<NotifType>("all");
  const [, navigate] = useLocation();

  const { data, isLoading } = useQuery<{ ok: boolean; notifications: Notification[]; unreadCount: number }>({
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

  const allNotifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  const markReadMutation = useMutation({
    mutationFn: async (id: number) => {
      const token = safeStorage.getItem("bk_token") || "";
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
      const token = safeStorage.getItem("bk_token") || "";
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

  const deleteNotifMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/notifications/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/notifications"] }),
  });

  const clearReadMutation = useMutation({
    mutationFn: async () => {
      const token = safeStorage.getItem("bk_token") || "";
      const res = await fetch("/api/notifications/clear-read", {
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
    const url = getNotificationUrl(notif.type);
    if (!notif.isRead) {
      markReadMutation.mutate(notif.id);
    }
    if (url) {
      navigate(url);
    }
  };

  const filteredNotifications = allNotifications.filter((n) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "unread") return !n.isRead;
    return n.type === activeFilter;
  });

  const typeCounts = allNotifications.reduce<Record<string, number>>((acc, n) => {
    acc[n.type] = (acc[n.type] || 0) + 1;
    return acc;
  }, {});

  const readCount = allNotifications.filter((n) => n.isRead).length;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-bold text-foreground">
            {language === "th" ? "การแจ้งเตือน" : "Notifications"}
          </h1>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="h-5 px-1.5 text-[10px] font-bold" data-testid="badge-unread-count">
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {readCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-8 text-xs text-muted-foreground hover:text-destructive hover:border-destructive/50"
              onClick={() => clearReadMutation.mutate()}
              disabled={clearReadMutation.isPending}
              data-testid="button-clear-read"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {language === "th" ? "ล้างที่อ่านแล้ว" : "Clear read"}
            </Button>
          )}
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-8 text-xs"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
              data-testid="button-mark-all-read-page"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              {language === "th" ? "อ่านทั้งหมด" : "Mark all read"}
            </Button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 flex-wrap mb-4" data-testid="notifications-filter-tabs">
        {FILTER_TABS.map((tab) => {
          const count =
            tab === "all"
              ? allNotifications.length
              : tab === "unread"
              ? unreadCount
              : typeCounts[tab] || 0;

          if (count === 0 && tab !== "all" && tab !== "unread") return null;

          const label = TYPE_LABELS[tab]?.[language === "th" ? "th" : "en"] ?? tab;
          const isActive = activeFilter === tab;

          return (
            <button
              key={tab}
              onClick={() => setActiveFilter(tab)}
              className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-all border ${
                isActive
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
              }`}
              data-testid={`filter-tab-${tab}`}
            >
              {tab === "all" && <Filter className="w-3 h-3" />}
              {label}
              {count > 0 && (
                <span className={`text-[10px] px-1 rounded-full ${isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Notification list */}
      <div className="rounded-xl border bg-card overflow-hidden" data-testid="notifications-list">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
            <Bell className="w-10 h-10 opacity-20 animate-pulse" />
            <span className="text-sm">{language === "th" ? "กำลังโหลด..." : "Loading..."}</span>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3" data-testid="notifications-empty">
            <Bell className="w-10 h-10 opacity-20" />
            <span className="text-sm">
              {activeFilter === "unread"
                ? (language === "th" ? "อ่านครบทุกรายการแล้ว" : "All caught up!")
                : (language === "th" ? "ไม่มีการแจ้งเตือน" : "No notifications")}
            </span>
          </div>
        ) : (
          <div className="divide-y">
            {filteredNotifications.map((notif) => (
              <div
                key={notif.id}
                className={`relative group flex gap-3 items-start px-4 py-4 transition-colors hover:bg-muted/40 ${
                  !notif.isRead ? "bg-primary/5" : ""
                }`}
                data-testid={`notification-item-${notif.id}`}
              >
                <button
                  className="flex gap-3 items-start flex-1 text-left min-w-0"
                  onClick={() => handleItemClick(notif)}
                >
                  <div className="relative flex-shrink-0 mt-0.5">
                    <NotifIcon type={notif.type} />
                    {!notif.isRead && (
                      <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-background" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-snug ${!notif.isRead ? "font-semibold text-foreground" : "font-medium text-foreground/80"}`}>
                      {language === "th" ? (notif.titleTh || notif.title) : (notif.title || notif.titleTh)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      {language === "th" ? (notif.messageTh || notif.message) : (notif.message || notif.messageTh)}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1.5">
                      {formatRelativeTime(notif.createdAt, language)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0 mt-1">
                    {!notif.isRead && (
                      <span className="text-[10px] text-primary font-medium" data-testid={`notif-unread-${notif.id}`}>
                        {language === "th" ? "ใหม่" : "New"}
                      </span>
                    )}
                    {getNotificationUrl(notif.type) && (
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-primary transition-colors" />
                    )}
                  </div>
                </button>
                <button
                  className="shrink-0 mt-0.5 p-1 rounded-md text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNotifMutation.mutate(notif.id);
                  }}
                  disabled={deleteNotifMutation.isPending}
                  title={language === "th" ? "ลบการแจ้งเตือนนี้" : "Delete this notification"}
                  data-testid={`button-delete-notif-${notif.id}`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {filteredNotifications.length > 0 && (
        <p className="text-center text-xs text-muted-foreground/60 mt-4">
          {language === "th"
            ? `แสดง ${filteredNotifications.length} รายการ`
            : `Showing ${filteredNotifications.length} notification${filteredNotifications.length !== 1 ? "s" : ""}`}
        </p>
      )}
    </div>
  );
}
