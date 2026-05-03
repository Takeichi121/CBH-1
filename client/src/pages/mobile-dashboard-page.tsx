import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useI18n } from "@/hooks/use-i18n";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Bell, BellOff, BellRing, Calendar, BarChart3, Briefcase, Settings,
  Sparkles, ChevronRight, TrendingUp, TrendingDown, Users, Clock,
  Megaphone, CheckCircle2, AlertCircle, Smartphone, Package
} from "lucide-react";
import type { Notification } from "@shared/schema";

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

function formatThaiDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("th-TH", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

function PushToggleCard() {
  const { isSupported, isSubscribed, permission, toggle, isLoading } = usePushNotifications();
  const { toast } = useToast();

  const handleToggle = async () => {
    try {
      await toggle();
      toast({
        title: isSubscribed ? "ปิดการแจ้งเตือนแล้ว" : "เปิดการแจ้งเตือนแล้ว",
        description: isSubscribed
          ? "คุณจะไม่ได้รับการแจ้งเตือน Push บนอุปกรณ์นี้"
          : "คุณจะได้รับการแจ้งเตือน Push บนอุปกรณ์นี้",
      });
    } catch {
      toast({ title: "เกิดข้อผิดพลาด", description: "ไม่สามารถเปลี่ยนสถานะการแจ้งเตือนได้", variant: "destructive" });
    }
  };

  if (!isSupported) return null;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${isSubscribed ? "bg-primary/15" : "bg-muted"}`}>
              {isSubscribed ? (
                <BellRing className="w-5 h-5 text-primary" />
              ) : (
                <BellOff className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
            <div>
              <p className="font-semibold text-sm">
                {isSubscribed ? "การแจ้งเตือน Push เปิดอยู่" : "เปิดการแจ้งเตือน Push"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {permission === "denied"
                  ? "บราวเซอร์บล็อกการแจ้งเตือน กรุณาเปิดในตั้งค่า"
                  : isSubscribed
                  ? "รับการแจ้งเตือนแม้แอปปิดอยู่"
                  : "รับการแจ้งเตือนแม้แอปปิดอยู่"}
              </p>
            </div>
          </div>
          {permission !== "denied" && (
            <Button
              size="sm"
              variant={isSubscribed ? "outline" : "default"}
              onClick={handleToggle}
              disabled={isLoading}
              data-testid="button-push-toggle"
            >
              {isLoading ? "..." : isSubscribed ? "ปิด" : "เปิด"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function TestPushButton() {
  const { isSubscribed } = usePushNotifications();
  const { toast } = useToast();
  const testMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/push/send-test", {}),
    onSuccess: async (res) => {
      const data = await res.json();
      if (data.ok) {
        toast({ title: "ส่งทดสอบแล้ว!", description: "คุณจะได้รับการแจ้งเตือนในไม่ช้า" });
      } else {
        toast({ title: "ยังไม่มี subscription", description: "กรุณาเปิดการแจ้งเตือนก่อน", variant: "destructive" });
      }
    },
  });

  if (!isSubscribed) return null;

  return (
    <Button
      size="sm"
      variant="ghost"
      className="text-xs text-muted-foreground"
      onClick={() => testMutation.mutate()}
      disabled={testMutation.isPending}
      data-testid="button-push-test"
    >
      <Bell className="w-3.5 h-3.5 mr-1.5" />
      ทดสอบการแจ้งเตือน
    </Button>
  );
}

export default function MobileDashboardPage() {
  const { user } = useAuth();
  const { language } = useI18n();
  const today = getToday();
  const todayParts = today.split("-");
  const year = parseInt(todayParts[0]);
  const month = parseInt(todayParts[1]);

  const isManagerOrAdmin = user?.role === "manager" || user?.role === "admin" || user?.role === "area";

  const { data: shiftsData, isLoading: shiftsLoading } = useQuery<{ shifts: any[] }>({
    queryKey: ["/api/shifts/range", today, today],
    enabled: !!user && isManagerOrAdmin,
    queryFn: async () => {
      const token = localStorage.getItem("bk_token");
      const res = await fetch(`/api/shifts?startDate=${today}&endDate=${today}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
    staleTime: 60000,
  });

  const { data: myShiftData, isLoading: myShiftLoading } = useQuery<{ shift: any }>({
    queryKey: ["/api/shifts/my", today],
    enabled: !!user && !isManagerOrAdmin,
    queryFn: async () => {
      const token = localStorage.getItem("bk_token");
      const res = await fetch(`/api/shifts/my?date=${today}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
    staleTime: 60000,
  });

  const { data: salesData, isLoading: salesLoading } = useQuery<{ report?: any }>({
    queryKey: ["/api/sales/today", today],
    enabled: !!user && isManagerOrAdmin,
    queryFn: async () => {
      const token = localStorage.getItem("bk_token");
      const res = await fetch(`/api/sales/daily?date=${today}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
    staleTime: 60000,
  });

  const { data: notifData, isLoading: notifLoading } = useQuery<{ notifications: Notification[] }>({
    queryKey: ["/api/notifications"],
    enabled: !!user,
    staleTime: 30000,
  });

  const todayShifts = shiftsData?.shifts || [];
  const unreadNotifs = (notifData?.notifications || []).filter(n => !n.isRead);
  const sales = salesData?.report;
  const myShift = myShiftData?.shift;

  const quickLinks = [
    { href: "/work", label: "My Work", labelTh: "ตารางงาน", icon: Briefcase, color: "text-blue-500" },
    ...(isManagerOrAdmin ? [
      { href: "/roster", label: "Roster", labelTh: "รายชื่อ", icon: Calendar, color: "text-green-500" },
      { href: "/sales", label: "Sales", labelTh: "ยอดขาย", icon: BarChart3, color: "text-orange-500" },
      { href: "/attendance", label: "Attendance", labelTh: "เวลาทำงาน", icon: Clock, color: "text-purple-500" },
    ] : []),
    { href: "/chann", label: "Chann AI", labelTh: "Chann AI", icon: Sparkles, color: "text-primary" },
    { href: "/announcements", label: "Announce", labelTh: "ประกาศ", icon: Megaphone, color: "text-yellow-500" },
    { href: "/settings", label: "Settings", labelTh: "ตั้งค่า", icon: Settings, color: "text-muted-foreground" },
  ];

  return (
    <div className="max-w-xl mx-auto px-4 py-5 space-y-4 pb-28">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-primary" />
            <h1 className="text-lg font-bold text-foreground">Mobile Dashboard</h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {formatThaiDate(today)}
          </p>
        </div>
        <TestPushButton />
      </div>

      {/* Push Notification Card */}
      <PushToggleCard />

      {/* Manager: Today's Shift Summary */}
      {isManagerOrAdmin && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-500" />
                <span className="font-semibold text-sm">กะวันนี้</span>
              </div>
              <Link href="/roster">
                <a className="text-xs text-primary flex items-center gap-0.5 hover:underline" data-testid="link-roster-from-mobile">
                  ดูทั้งหมด <ChevronRight className="w-3 h-3" />
                </a>
              </Link>
            </div>
            {shiftsLoading ? (
              <div className="space-y-2">
                {[1,2,3].map(i => <Skeleton key={i} className="h-8 w-full rounded-lg" />)}
              </div>
            ) : todayShifts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-3">ยังไม่มีข้อมูลกะวันนี้</p>
            ) : (
              <div className="space-y-1.5">
                {todayShifts.slice(0, 5).map((shift: any) => (
                  <div key={`${shift.username}-${shift.date}`} className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-muted/40">
                    <span className="text-sm font-medium truncate max-w-[160px]">
                      {shift.nickName || shift.username}
                    </span>
                    <Badge variant="outline" className="text-xs font-mono shrink-0">
                      {shift.shiftGroup}
                    </Badge>
                  </div>
                ))}
                {todayShifts.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center pt-1">
                    +{todayShifts.length - 5} คนอื่น
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Staff: My Shift Today */}
      {!isManagerOrAdmin && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Briefcase className="w-4 h-4 text-blue-500" />
              <span className="font-semibold text-sm">กะของฉันวันนี้</span>
            </div>
            {myShiftLoading ? (
              <Skeleton className="h-14 w-full rounded-xl" />
            ) : myShift ? (
              <div className="flex items-center gap-4 py-2 px-3 rounded-xl bg-primary/10 border border-primary/20">
                <div className="text-3xl font-bold text-primary font-mono">{myShift.shiftGroup}</div>
                <div>
                  {myShift.startTime && myShift.endTime && (
                    <p className="text-sm font-medium">{myShift.startTime} – {myShift.endTime}</p>
                  )}
                  {myShift.note && <p className="text-xs text-muted-foreground">{myShift.note}</p>}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 py-3 px-3 rounded-xl bg-muted/40">
                <AlertCircle className="w-5 h-5 text-muted-foreground shrink-0" />
                <p className="text-sm text-muted-foreground">ไม่มีกะวันนี้</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Manager: Sales Snapshot */}
      {isManagerOrAdmin && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-orange-500" />
                <span className="font-semibold text-sm">ยอดขายวันนี้</span>
              </div>
              <Link href="/sales/daily">
                <a className="text-xs text-primary flex items-center gap-0.5 hover:underline" data-testid="link-sales-from-mobile">
                  บันทึก <ChevronRight className="w-3 h-3" />
                </a>
              </Link>
            </div>
            {salesLoading ? (
              <Skeleton className="h-14 w-full rounded-xl" />
            ) : sales ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">Actual</p>
                  <p className="text-xl font-bold font-mono text-foreground">
                    {Number(sales.actualSales || 0).toLocaleString()}
                  </p>
                </div>
                <div className="rounded-xl bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">Target</p>
                  <p className="text-xl font-bold font-mono text-foreground">
                    {Number(sales.targetSales || 0).toLocaleString()}
                  </p>
                </div>
                {sales.actualSales && sales.targetSales && (
                  <div className="col-span-2 flex items-center gap-2 px-1">
                    {Number(sales.actualSales) >= Number(sales.targetSales) ? (
                      <TrendingUp className="w-4 h-4 text-green-500 shrink-0" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-500 shrink-0" />
                    )}
                    <span className={`text-sm font-semibold ${Number(sales.actualSales) >= Number(sales.targetSales) ? "text-green-500" : "text-red-500"}`}>
                      {Math.round((Number(sales.actualSales) / Number(sales.targetSales)) * 100)}% ของเป้า
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3 py-3 px-3 rounded-xl bg-muted/40">
                <AlertCircle className="w-4 h-4 text-muted-foreground shrink-0" />
                <p className="text-sm text-muted-foreground">ยังไม่มีข้อมูลยอดขายวันนี้</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent Notifications */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-yellow-500" />
              <span className="font-semibold text-sm">การแจ้งเตือนล่าสุด</span>
              {unreadNotifs.length > 0 && (
                <Badge className="h-5 px-1.5 text-xs">{unreadNotifs.length}</Badge>
              )}
            </div>
          </div>
          {notifLoading ? (
            <div className="space-y-2">
              {[1,2].map(i => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}
            </div>
          ) : (notifData?.notifications || []).length === 0 ? (
            <div className="flex items-center gap-3 py-3 px-3 rounded-xl bg-muted/40">
              <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
              <p className="text-sm text-muted-foreground">ไม่มีการแจ้งเตือน</p>
            </div>
          ) : (
            <div className="space-y-2">
              {(notifData?.notifications || []).slice(0, 4).map((n) => (
                <div
                  key={n.id}
                  className={`px-3 py-2.5 rounded-lg ${!n.isRead ? "bg-primary/8 border border-primary/15" : "bg-muted/40"}`}
                  data-testid={`notif-item-${n.id}`}
                >
                  <p className={`text-sm ${!n.isRead ? "font-semibold" : "font-medium"} line-clamp-1`}>
                    {n.titleTh || n.title}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                    {n.messageTh || n.message}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Links Grid */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 px-1">เมนูลัด</h2>
        <div className="grid grid-cols-4 gap-2">
          {quickLinks.map((item) => (
            <Link key={item.href} href={item.href}>
              <a
                className="flex flex-col items-center gap-1.5 py-3 px-1 rounded-2xl bg-card border border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all active:scale-95"
                data-testid={`mobile-quick-link-${item.href.replace(/\//g, "-").replace(/^-/, "")}`}
              >
                <item.icon className={`w-5 h-5 ${item.color}`} />
                <span className="text-xs text-center leading-tight text-foreground font-medium">
                  {language === "th" ? item.labelTh : item.label}
                </span>
              </a>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
