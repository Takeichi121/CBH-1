import { useAuth } from "@/hooks/use-auth";
import { SalesChart } from "@/components/dashboard/sales-chart";
import { DailyTip } from "@/components/dashboard/daily-tip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Users, Calendar, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export default function DashboardPage() {
  const { user, isLoading } = useAuth();

  const { data: shiftsData } = useQuery({
    queryKey: ["/api/shifts/roster"],
    queryFn: async () => {
      const token = localStorage.getItem("token") || "";
      const today = new Date().toISOString().split("T")[0];
      const res = await apiRequest("POST", "/api/shifts/roster", { token, anyDate: today });
      const json = await res.json();
      return json;
    },
    enabled: !!user && (user.role === "admin" || user.role === "manager"),
  });

  const { data: myShifts } = useQuery({
    queryKey: ["/api/shifts/my-week"],
    queryFn: async () => {
      const token = localStorage.getItem("token") || "";
      const res = await apiRequest("POST", "/api/shifts/my-week", { token });
      const json = await res.json();
      return json;
    },
    enabled: !!user && user.role === "staff",
  });

  if (isLoading) {
    return (
      <div className="flex justify-center h-screen items-center" data-testid="dashboard-loading">
        <Loader2 className="animate-spin h-8 w-8" />
      </div>
    );
  }

  if (!user) return null;

  const isManager = user.role === "admin" || user.role === "manager";

  const today = new Date().toISOString().split("T")[0];
  const todayShifts = shiftsData?.items?.filter((s: any) => s.date === today) || [];
  const myUpcomingShifts = myShifts?.shifts?.filter((s: any) => s.date >= today) || [];

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6" data-testid="page-dashboard">
      <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
        สวัสดี, {user.nickName || user.fullName || user.username}
      </h2>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {isManager ? (
          <>
            <SalesChart />
            <div className="col-span-full lg:col-span-3 space-y-4">
              <Card data-testid="card-staff-today">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">พนักงานวันนี้</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {todayShifts.length > 0 ? (
                    <div className="space-y-2">
                      {todayShifts.slice(0, 5).map((shift: any, i: number) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <span>{shift.username}</span>
                          <span className="text-muted-foreground">{shift.shiftGroup}</span>
                        </div>
                      ))}
                      {todayShifts.length > 5 && (
                        <p className="text-xs text-muted-foreground">
                          +{todayShifts.length - 5} คนเพิ่มเติม
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">ไม่มีข้อมูลกะวันนี้</p>
                  )}
                </CardContent>
              </Card>

              <DailyTip />
            </div>
          </>
        ) : (
          <>
            <div className="col-span-full lg:col-span-5">
              <Card className="h-full" data-testid="card-my-shifts">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle>ตารางงานของคุณ</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {myUpcomingShifts.length > 0 ? (
                    <div className="space-y-3">
                      {myUpcomingShifts.slice(0, 5).map((shift: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                          <div>
                            <p className="font-medium">
                              {new Date(shift.date).toLocaleDateString("th-TH", {
                                weekday: "short",
                                day: "numeric",
                                month: "short",
                              })}
                            </p>
                            <p className="text-sm text-muted-foreground">{shift.shiftGroup}</p>
                          </div>
                          <div className="text-right text-sm">
                            <p>{shift.startTime} - {shift.endTime}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">ไม่มีกะงานที่กำลังจะถึง</p>
                  )}
                </CardContent>
              </Card>
            </div>
            <div className="col-span-full lg:col-span-2">
              <DailyTip />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
