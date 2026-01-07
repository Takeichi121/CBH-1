import { useState, useEffect } from "react";
import { useI18n } from "@/hooks/use-i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign, Users, Target, BarChart3, Loader2, Calendar } from "lucide-react";
import { SalesLayout } from "./sales-layout";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";

export default function SalesDashboardPage() {
  const { language } = useI18n();
  const [loading, setLoading] = useState(true);
  const [todayReport, setTodayReport] = useState<any>(null);
  const [mtdData, setMtdData] = useState<{ mtdActual: number; mtdTc: number; mtdTarget: number } | null>(null);
  const [recentReports, setRecentReports] = useState<any[]>([]);

  const t = {
    title: language === "th" ? "ภาพรวมยอดขาย" : "Sales Dashboard",
    subtitle: language === "th" ? "สรุปข้อมูลสำคัญ" : "Key metrics overview",
    todaySales: language === "th" ? "ยอดขายวันนี้" : "Today's Sales",
    monthToDate: language === "th" ? "ยอดสะสม (MTD)" : "Month to Date",
    transactions: language === "th" ? "จำนวนรายการ" : "Transactions",
    avgTicket: language === "th" ? "ยอดเฉลี่ย/บิล" : "Avg Ticket",
    deliveryTotal: language === "th" ? "ยอด Delivery รวม" : "Delivery Total",
    deliveryPercent: language === "th" ? "% Delivery" : "Delivery %",
    noData: language === "th" ? "ยังไม่มีข้อมูล" : "No data yet",
    startRecording: language === "th" ? "เริ่มบันทึกยอดขาย" : "Start recording sales",
    goToForm: language === "th" ? "ไปกรอกข้อมูล" : "Go to form",
    recentReports: language === "th" ? "รายงานล่าสุด" : "Recent Reports",
    viewAll: language === "th" ? "ดูทั้งหมด" : "View All",
    performance: language === "th" ? "ประสิทธิภาพ" : "Performance",
    noPerformanceData: language === "th" ? "ยังไม่มีข้อมูลประสิทธิภาพ" : "No performance data yet",
    loading: language === "th" ? "กำลังโหลด..." : "Loading...",
    ofTarget: language === "th" ? "ของเป้า" : "of target",
    shift: language === "th" ? "กะ" : "Shift",
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("bk_token");
        const today = new Date().toISOString().split('T')[0];
        const [year, month] = today.split('-');

        const todayRes = await apiRequest("POST", "/api/sales/getReportByDate", { token, date: today });
        const todayData = await todayRes.json();
        
        let reportForToday = null;
        if (todayData.ok && todayData.report) {
          reportForToday = todayData.report;
        } else {
          // Fallback: check reports list for today's date
          const reportsRes = await apiRequest("POST", "/api/sales/getReports", { token });
          const reportsData = await reportsRes.json();
          if (reportsData.ok && reportsData.reports && reportsData.reports.length > 0) {
            const latest = reportsData.reports[0];
            if (latest.reportDate === today) {
              reportForToday = latest;
            }
          }
        }
        setTodayReport(reportForToday);

        const mtdRes = await apiRequest("POST", "/api/sales/getMtdSummary", { token, year: parseInt(year), month: parseInt(month) });
        const mtdDataRes = await mtdRes.json();
        if (mtdDataRes.ok) {
          setMtdData({
            mtdActual: mtdDataRes.mtdActual || 0,
            mtdTc: mtdDataRes.mtdTc || 0,
            mtdTarget: mtdDataRes.mtdTarget || 0
          });
        }

        const reportsRes = await apiRequest("POST", "/api/sales/getReports", { token });
        const reportsData = await reportsRes.json();
        if (reportsData.ok && reportsData.reports) {
          setRecentReports(reportsData.reports.slice(0, 5));
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  const todaySales = todayReport ? parseFloat(todayReport.actualSales) || 0 : null;
  const todayTc = todayReport ? parseInt(todayReport.transactionCount) || 0 : null;
  const avgTicket = todaySales && todayTc && todayTc > 0 ? Math.round(todaySales / todayTc) : null;

  const deliverySales = todayReport ? (
    (parseFloat(todayReport.grabfood) || 0) +
    (parseFloat(todayReport.lineman) || 0) +
    (parseFloat(todayReport.shopee) || 0) +
    (parseFloat(todayReport.bkapp) || 0)
  ) : null;
  const deliveryPercent = todaySales && deliverySales !== null && todaySales > 0 ? (deliverySales / todaySales) * 100 : null;

  const kpiCards = [
    {
      title: t.todaySales,
      value: loading ? "-" : (todaySales !== null ? `฿${todaySales.toLocaleString()}` : "-"),
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-50 dark:bg-green-950/30",
    },
    {
      title: t.monthToDate,
      value: loading ? "-" : (mtdData ? `฿${mtdData.mtdActual.toLocaleString()}` : "-"),
      icon: Target,
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950/30",
    },
    {
      title: t.transactions,
      value: loading ? "-" : (todayTc !== null ? todayTc.toLocaleString() : "-"),
      icon: Users,
      color: "text-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-950/30",
    },
    {
      title: t.avgTicket,
      value: loading ? "-" : (avgTicket !== null ? `฿${avgTicket.toLocaleString()}` : "-"),
      icon: BarChart3,
      color: "text-orange-600",
      bgColor: "bg-orange-50 dark:bg-orange-950/30",
    },
    {
      title: t.deliveryTotal,
      value: loading ? "-" : (deliverySales !== null ? `฿${deliverySales.toLocaleString()}` : "-"),
      icon: TrendingUp,
      color: "text-red-600",
      bgColor: "bg-red-50 dark:bg-red-950/30",
    },
    {
      title: t.deliveryPercent,
      value: loading ? "-" : (deliveryPercent !== null ? `${deliveryPercent.toFixed(1)}%` : "-"),
      icon: BarChart3,
      color: "text-cyan-600",
      bgColor: "bg-cyan-50 dark:bg-cyan-950/30",
    },
  ];

  return (
    <SalesLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-sales-dashboard-title">
            {t.title}
          </h1>
          <p className="text-muted-foreground text-sm">{t.subtitle}</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {kpiCards.map((card, index) => {
            const cardId = card.title.toLowerCase().replace(/[^a-z0-9]/g, "-");
            return (
              <Card key={cardId} className={card.bgColor} data-testid={`card-kpi-${cardId}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground" data-testid={`text-kpi-title-${cardId}`}>{card.title}</p>
                      <p className="text-xl font-bold mt-1" data-testid={`text-kpi-value-${cardId}`}>{card.value}</p>
                    </div>
                    <div className={`p-2 rounded-full ${card.bgColor}`}>
                      <card.icon className={`w-5 h-5 ${card.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{t.recentReports}</CardTitle>
                <Link href="/sales/reports">
                  <span className="text-sm text-primary hover:underline cursor-pointer">{t.viewAll}</span>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin" />
                  <p className="text-sm">{t.loading}</p>
                </div>
              ) : recentReports.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm mb-2">{t.noData}</p>
                  <p className="text-xs mb-4">{t.startRecording}</p>
                  <Link href="/sales/daily">
                    <Button variant="outline" size="sm" data-testid="button-go-to-form">
                      {t.goToForm}
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentReports.map((report) => {
                    const actual = parseFloat(report.actualSales) || 0;
                    const target = parseFloat(report.dailyTarget) || 0;
                    const achievement = target > 0 ? (actual / target) * 100 : 0;
                    
                    return (
                      <div key={report.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{report.reportDate}</p>
                            <p className="text-xs text-muted-foreground">{report.reportBy}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold">฿{actual.toLocaleString()}</p>
                          <Badge
                            variant="secondary"
                            className={`text-xs ${
                              achievement >= 100
                                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                : achievement >= 90
                                  ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                                  : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                            }`}
                          >
                            {achievement.toFixed(0)}%
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">{t.performance}</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin" />
                  <p className="text-sm">{t.loading}</p>
                </div>
              ) : mtdData && mtdData.mtdTarget > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">MTD Achievement</span>
                    <span className="text-lg font-bold">
                      {((mtdData.mtdActual / mtdData.mtdTarget) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-3">
                    <div 
                      className="bg-primary h-3 rounded-full transition-all" 
                      style={{ width: `${Math.min(100, (mtdData.mtdActual / mtdData.mtdTarget) * 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">฿{mtdData.mtdActual.toLocaleString()}</span>
                    <span className="text-muted-foreground">/ ฿{mtdData.mtdTarget.toLocaleString()}</span>
                  </div>
                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">MTD Transactions</span>
                      <span className="text-lg font-bold">{mtdData.mtdTc.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm">{t.noPerformanceData}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </SalesLayout>
  );
}
