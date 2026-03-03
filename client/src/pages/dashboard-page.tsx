import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { todayBangkok } from "@/lib/utils";
import { SalesChart } from "@/components/dashboard/sales-chart";
import { DailyTip } from "@/components/dashboard/daily-tip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, Calendar, DollarSign, Clock, Package } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface UnifiedDashboardData {
  ok: boolean;
  date: string;
  shifts: {
    total: number;
    byGroup: Record<string, number>;
    staff: Array<{ username: string; fullName?: string; nickName?: string; shiftGroup: string; startTime?: string; endTime?: string }>;
  } | null;
  sales: {
    actualSales: number;
    dailyTarget: number;
    transactionCount: number;
  } | null;
  labor: {
    actualHours: number;
    otHours: number;
    summaryHours: number;
    laborCostTotal: number;
    colPercent: number;
  } | null;
  borrows: {
    recent: Array<{ id: number; itemName: string; borrowerName: string; status: string; date?: string }>;
    pendingCount: number;
  } | null;
  stats: {
    activeStaff: number;
    todayShiftCount: number;
  } | null;
}

export default function DashboardPage() {
  const { user, isLoading } = useAuth();
  const { language } = useI18n();

  const isManager = user?.role === "admin" || user?.role === "manager";

  const { data: dashboardData, isLoading: isDashboardLoading } = useQuery<UnifiedDashboardData>({
    queryKey: ["/api/unified-dashboard"],
    queryFn: async () => {
      const token = localStorage.getItem("bk_token") || "";
      const res = await apiRequest("POST", "/api/unified-dashboard", { token });
      const json = await res.json();
      if (!json.ok) throw new Error(json.message || "Failed to load dashboard");
      return json;
    },
    enabled: !!user && isManager,
    staleTime: 30000,
  });

  const { data: myShifts, isLoading: isMyShiftsLoading } = useQuery({
    queryKey: ["/api/shifts/my-week"],
    queryFn: async () => {
      const token = localStorage.getItem("bk_token") || "";
      const res = await apiRequest("POST", "/api/shifts/my-week", { token });
      const json = await res.json();
      if (!json.ok) throw new Error(json.message || "Failed to load shifts");
      return json;
    },
    enabled: !!user && !isManager,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center h-screen items-center" data-testid="dashboard-loading">
        <Loader2 className="animate-spin h-8 w-8" />
      </div>
    );
  }

  if (!user) return null;

  const today = todayBangkok();
  const myUpcomingShifts = myShifts?.shifts?.filter((s: any) => s.date >= today) || [];

  const shiftGroupLabel = (group: string) => {
    const labels: Record<string, { th: string; en: string }> = {
      open: { th: "เช้า", en: "Open" },
      lunch: { th: "เที่ยง", en: "Lunch" },
      dinner: { th: "เย็น", en: "Dinner" },
      late: { th: "ดึก", en: "Late" },
    };
    const found = labels[group.toLowerCase()];
    if (found) return language === "th" ? found.th : found.en;
    return group;
  };

  if (!isManager) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6" data-testid="page-dashboard">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight" data-testid="text-greeting">
          {language === "th" ? "สวัสดี" : "Hello"}, {user.nickName || user.fullName || user.username}
        </h2>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <div className="col-span-full lg:col-span-5">
            <Card className="h-full" data-testid="card-my-shifts">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle>{language === "th" ? "ตารางงานของคุณ" : "Your Schedule"}</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isMyShiftsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="animate-spin h-6 w-6" />
                  </div>
                ) : myUpcomingShifts.length > 0 ? (
                  <div className="space-y-3">
                    {myUpcomingShifts.slice(0, 5).map((shift: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded-md bg-muted/50" data-testid={`row-shift-${i}`}>
                        <div>
                          <p className="font-medium">
                            {new Date(shift.date).toLocaleDateString(language === "th" ? "th-TH" : "en-US", {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                            })}
                          </p>
                          <p className="text-sm text-muted-foreground">{shiftGroupLabel(shift.shiftGroup)}</p>
                        </div>
                        <div className="text-right text-sm">
                          <p>{shift.startTime} - {shift.endTime}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground" data-testid="text-no-shifts">
                    {language === "th" ? "ไม่มีกะงานที่กำลังจะถึง" : "No upcoming shifts"}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
          <div className="col-span-full lg:col-span-2">
            <DailyTip />
          </div>
        </div>
      </div>
    );
  }

  const shifts = dashboardData?.shifts;
  const sales = dashboardData?.sales;
  const labor = dashboardData?.labor;
  const borrows = dashboardData?.borrows;

  const salesPercent = sales && sales.dailyTarget > 0
    ? ((sales.actualSales / sales.dailyTarget) * 100).toFixed(1)
    : null;

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6" data-testid="page-dashboard">
      <h2 className="text-2xl md:text-3xl font-bold tracking-tight" data-testid="text-greeting">
        {language === "th" ? "สวัสดี" : "Hello"}, {user.nickName || user.fullName || user.username}
      </h2>

      {isDashboardLoading ? (
        <div className="flex justify-center py-12" data-testid="dashboard-data-loading">
          <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <Card data-testid="card-shift-summary">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {language === "th" ? "พนักงานวันนี้" : "Staff Today"}
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {shifts ? (
                  <>
                    <div className="text-2xl font-bold" data-testid="text-shift-total">{shifts.total}</div>
                    <div className="mt-2 space-y-1">
                      {Object.entries(
                        (shifts.staff || []).reduce((acc: Record<string, typeof shifts.staff>, m) => {
                          if (!acc[m.shiftGroup]) acc[m.shiftGroup] = [];
                          acc[m.shiftGroup]!.push(m);
                          return acc;
                        }, {})
                      ).map(([group, members]) => (
                        <div key={group} className="flex items-start gap-1 flex-wrap">
                          <span className="text-xs text-muted-foreground shrink-0 mt-0.5">
                            {shiftGroupLabel(group)}:
                          </span>
                          {(members as typeof shifts.staff)!.map((m) => (
                            <Badge key={m.username} variant="secondary" className="text-xs px-1.5 py-0" data-testid={`badge-staff-${m.username}`}>
                              {m.nickName || m.fullName?.split(" ")[0] || m.username}
                            </Badge>
                          ))}
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground" data-testid="text-no-shift-data">
                    {language === "th" ? "ไม่มีข้อมูลกะวันนี้" : "No shift data today"}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card data-testid="card-sales-summary">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {language === "th" ? "ยอดขายวันนี้" : "Today's Sales"}
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {sales ? (
                  <>
                    <div className="text-2xl font-bold" data-testid="text-actual-sales">
                      {"\u0E3F"}{sales.actualSales.toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1" data-testid="text-sales-target">
                      {language === "th" ? "เป้า" : "Target"}: {"\u0E3F"}{sales.dailyTarget.toLocaleString()}
                      {salesPercent && ` (${salesPercent}%)`}
                    </p>
                    <p className="text-xs text-muted-foreground" data-testid="text-transaction-count">
                      {sales.transactionCount} {language === "th" ? "รายการ" : "transactions"}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground" data-testid="text-no-sales-data">
                    {language === "th" ? "ยังไม่มีข้อมูลยอดขาย" : "No sales data available"}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card data-testid="card-labor-summary">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {language === "th" ? "ชั่วโมงแรงงาน" : "Labor Hours"}
                </CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {labor ? (
                  <>
                    <div className="text-2xl font-bold" data-testid="text-summary-hours">
                      {labor.summaryHours.toLocaleString()} {language === "th" ? "ชม." : "hrs"}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1" data-testid="text-col-percent">
                      COL: {labor.colPercent}%
                    </p>
                    <p className="text-xs text-muted-foreground" data-testid="text-ot-hours">
                      OT: {labor.otHours.toLocaleString()} {language === "th" ? "ชม." : "hrs"}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground" data-testid="text-no-labor-data">
                    {language === "th" ? "ไม่มีข้อมูลแรงงาน" : "No labor data available"}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card data-testid="card-borrow-summary">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {language === "th" ? "ยืม-คืน" : "Borrow Tracker"}
                </CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {borrows ? (
                  <>
                    <div className="text-2xl font-bold" data-testid="text-pending-count">
                      {borrows.pendingCount}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1" data-testid="text-pending-label">
                      {language === "th" ? "รายการค้างคืน" : "pending items"}
                    </p>
                    {borrows.recent && borrows.recent.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {borrows.recent.slice(0, 3).map((item, i) => (
                          <div key={item.id || i} className="text-xs text-muted-foreground flex items-center justify-between gap-2" data-testid={`row-borrow-${i}`}>
                            <span className="truncate">{item.itemName}</span>
                            <Badge variant="outline" className="text-[10px]">{item.status}</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground" data-testid="text-no-borrow-data">
                    {language === "th" ? "ไม่มีข้อมูลยืม-คืน" : "No borrow data available"}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <SalesChart />

            <div className="col-span-full lg:col-span-3 space-y-4">
              <Card data-testid="card-staff-today">
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {language === "th" ? "รายชื่อพนักงานวันนี้" : "Staff Working Today"}
                  </CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {shifts && shifts.staff && shifts.staff.length > 0 ? (
                    <div className="space-y-2">
                      {shifts.staff.slice(0, 8).map((member, i) => (
                        <div key={i} className="flex items-center justify-between gap-2 text-sm" data-testid={`row-staff-${i}`}>
                          <span className="truncate">{member.fullName || member.nickName || member.username}</span>
                          <Badge variant="secondary">{shiftGroupLabel(member.shiftGroup)}</Badge>
                        </div>
                      ))}
                      {shifts.staff.length > 8 && (
                        <p className="text-xs text-muted-foreground" data-testid="text-more-staff">
                          +{shifts.staff.length - 8} {language === "th" ? "คนเพิ่มเติม" : "more"}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground" data-testid="text-no-staff-today">
                      {language === "th" ? "ไม่มีพนักงานวันนี้" : "No staff scheduled today"}
                    </p>
                  )}
                </CardContent>
              </Card>

              <DailyTip />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
