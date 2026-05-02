import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useI18n } from "@/hooks/use-i18n";
import { yesterdayBangkok } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp, TrendingDown, DollarSign, Users, Target,
  BarChart3, Calendar, ArrowUpRight, ArrowDownRight
} from "lucide-react";
import { SalesLayout } from "./sales-layout";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { format, parseISO } from "date-fns";
import { th } from "date-fns/locale";

export default function SalesDashboardPage() {
  const { language } = useI18n();

  const reportDate = yesterdayBangkok();
  const [year, month] = reportDate.split("-").map(Number);

  const { data: reportByDateData, isLoading: isLoadingToday } = useQuery({
    queryKey: ["/api/sales/getReportByDate", reportDate],
    queryFn: async () => {
      const token = localStorage.getItem("bk_token");
      const res = await apiRequest("POST", "/api/sales/getReportByDate", { token, date: reportDate });
      return res.json();
    },
    staleTime: 60_000,
  });

  const { data: mtdDataRaw, isLoading: isLoadingMtd } = useQuery({
    queryKey: ["/api/sales/getMtdSummary", year, month],
    queryFn: async () => {
      const token = localStorage.getItem("bk_token");
      const res = await apiRequest("POST", "/api/sales/getMtdSummary", { token, year, month });
      return res.json();
    },
    staleTime: 60_000,
  });

  const { data: reportsData, isLoading: isLoadingReports } = useQuery({
    queryKey: ["/api/sales/getReports"],
    queryFn: async () => {
      const token = localStorage.getItem("bk_token");
      const res = await apiRequest("POST", "/api/sales/getReports", { token });
      return res.json();
    },
    staleTime: 60_000,
  });

  const isLoading = isLoadingToday || isLoadingMtd || isLoadingReports;

  const todayReport = useMemo(() => {
    if (reportByDateData?.ok && reportByDateData.report) return reportByDateData.report;
    const reports = reportsData?.reports || [];
    const latest = reports[0];
    if (latest?.reportDate === reportDate) return latest;
    return null;
  }, [reportByDateData, reportsData, reportDate]);

  const mtdData = useMemo(() => {
    if (!mtdDataRaw?.ok) return null;
    return {
      mtdActual: mtdDataRaw.mtdActual || 0,
      mtdTc: mtdDataRaw.mtdTc || 0,
      mtdTarget: mtdDataRaw.mtdTarget || 0,
      wasteMtdTotal: mtdDataRaw.wasteMtdTotal || 0,
      wasteMealMtd: mtdDataRaw.wasteMealMtd || 0,
      otMtd: mtdDataRaw.otMtd || 0,
      reportCount: mtdDataRaw.reportCount || 0,
    };
  }, [mtdDataRaw]);

  const recentReports = useMemo(() => (reportsData?.reports || []).slice(0, 10), [reportsData]);

  const todaySales = todayReport ? parseFloat(todayReport.actualSales) || 0 : null;
  const todayTc = todayReport ? parseInt(todayReport.transactionCount) || 0 : null;
  const avgTicket = todaySales && todayTc && todayTc > 0 ? Math.round(todaySales / todayTc) : null;

  const deliverySales = todayReport
    ? (parseFloat(todayReport.grabfood) || 0) +
      (parseFloat(todayReport.lineman) || 0) +
      (parseFloat(todayReport.shopee) || 0) +
      (parseFloat(todayReport.bkapp) || 0)
    : null;
  const deliveryPercent =
    todaySales && deliverySales !== null && todaySales > 0
      ? (deliverySales / todaySales) * 100
      : null;

  const chartData = useMemo(() => {
    return [...recentReports].reverse().map((r: any) => {
      const actual = parseFloat(r.actualSales) || 0;
      const target = parseFloat(r.dailyTarget) || 0;
      let label = r.reportDate;
      try {
        label = format(parseISO(r.reportDate), "d MMM", { locale: language === "th" ? th : undefined });
      } catch {}
      return { date: label, actual, target };
    });
  }, [recentReports, language]);

  const t = {
    title: language === "th" ? "ภาพรวมยอดขาย" : "Sales Dashboard",
    subtitle: language === "th" ? "สรุปข้อมูลสำคัญ" : "Key metrics overview",
    todaySales: language === "th" ? "ยอดขายล่าสุด" : "Latest Sales",
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
    salesTrend: language === "th" ? "แนวโน้มยอดขาย (10 วัน)" : "Sales Trend (10 days)",
    performance: language === "th" ? "ประสิทธิภาพ MTD" : "MTD Performance",
    noPerformanceData: language === "th" ? "ยังไม่มีข้อมูลประสิทธิภาพ" : "No performance data yet",
    ofTarget: language === "th" ? "ของเป้า" : "of target",
    mtdAvgTicket: language === "th" ? "ยอดเฉลี่ย/บิล (MTD)" : "MTD Avg Ticket",
    mtdWaste: language === "th" ? "Waste MTD" : "MTD Waste",
    mtdWastePercent: language === "th" ? "% Waste MTD" : "MTD Waste %",
    mtdOt: language === "th" ? "OT สะสม (ชม.)" : "MTD OT Hours",
    mtdDays: language === "th" ? "วันที่บันทึก" : "Days Reported",
    actual: language === "th" ? "ยอดจริง" : "Actual",
    target: language === "th" ? "เป้า" : "Target",
  };

  const kpiCards = [
    {
      title: t.todaySales,
      value: todaySales !== null ? `฿${todaySales.toLocaleString()}` : "-",
      icon: DollarSign,
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-50 dark:bg-emerald-500/10",
      sub: todayReport?.reportDate ?? reportDate,
    },
    {
      title: t.monthToDate,
      value: mtdData ? `฿${mtdData.mtdActual.toLocaleString()}` : "-",
      icon: Target,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-500/10",
      sub: mtdData && mtdData.mtdTarget > 0
        ? `${((mtdData.mtdActual / mtdData.mtdTarget) * 100).toFixed(1)}% ${t.ofTarget}`
        : "-",
    },
    {
      title: t.transactions,
      value: todayTc !== null ? todayTc.toLocaleString() : "-",
      icon: Users,
      color: "text-violet-600 dark:text-violet-400",
      bgColor: "bg-violet-50 dark:bg-violet-500/10",
      sub: mtdData ? `MTD: ${mtdData.mtdTc.toLocaleString()}` : "-",
    },
    {
      title: t.avgTicket,
      value: avgTicket !== null ? `฿${avgTicket.toLocaleString()}` : "-",
      icon: BarChart3,
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-50 dark:bg-amber-500/10",
      sub: mtdData && mtdData.mtdTc > 0
        ? `MTD: ฿${Math.round(mtdData.mtdActual / mtdData.mtdTc).toLocaleString()}`
        : "-",
    },
    {
      title: t.deliveryTotal,
      value: deliverySales !== null ? `฿${deliverySales.toLocaleString()}` : "-",
      icon: TrendingUp,
      color: "text-rose-600 dark:text-rose-400",
      bgColor: "bg-rose-50 dark:bg-rose-500/10",
      sub: "",
    },
    {
      title: t.deliveryPercent,
      value: deliveryPercent !== null ? `${deliveryPercent.toFixed(1)}%` : "-",
      icon: BarChart3,
      color: "text-sky-600 dark:text-sky-400",
      bgColor: "bg-sky-50 dark:bg-sky-500/10",
      sub: "",
    },
  ];

  const mtdAchievement = mtdData && mtdData.mtdTarget > 0
    ? (mtdData.mtdActual / mtdData.mtdTarget) * 100
    : null;

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
          {kpiCards.map((card) => {
            const cardId = card.title.toLowerCase().replace(/[^a-z0-9]/g, "-");
            return (
              <Card key={cardId} className={card.bgColor} data-testid={`card-kpi-${cardId}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-muted-foreground" data-testid={`text-kpi-title-${cardId}`}>
                      {card.title}
                    </p>
                    <div className={`p-1.5 rounded-full ${card.bgColor}`}>
                      <card.icon className={`w-4 h-4 ${card.color}`} />
                    </div>
                  </div>
                  {isLoading ? (
                    <Skeleton className="h-7 w-24 mt-1" />
                  ) : (
                    <p className="text-xl font-bold" data-testid={`text-kpi-value-${cardId}`}>
                      {card.value}
                    </p>
                  )}
                  {isLoading ? (
                    <Skeleton className="h-3 w-16 mt-1" />
                  ) : (
                    card.sub && (
                      <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
                    )
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                {t.salesTrend}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingReports ? (
              <Skeleton className="h-[220px] w-full rounded-xl" />
            ) : chartData.length === 0 ? (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
                {t.noData}
              </div>
            ) : (
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorTarget" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                      width={38}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "10px",
                        border: "1px solid hsl(var(--border))",
                        backgroundColor: "hsl(var(--background))",
                        fontSize: 12,
                      }}
                      formatter={(value: number) => `฿${value.toLocaleString()}`}
                    />
                    <Legend verticalAlign="top" align="right" height={28} iconType="circle" iconSize={8} />
                    <Area
                      type="monotone"
                      name={t.actual}
                      dataKey="actual"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2.5}
                      fill="url(#colorActual)"
                      dot={{ r: 3, fill: "hsl(var(--primary))", strokeWidth: 0 }}
                      activeDot={{ r: 5, strokeWidth: 0 }}
                    />
                    <Area
                      type="monotone"
                      name={t.target}
                      dataKey="target"
                      stroke="#f59e0b"
                      strokeWidth={1.5}
                      strokeDasharray="5 3"
                      fill="url(#colorTarget)"
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

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
              {isLoadingReports ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full rounded-lg" />
                  ))}
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
                <div className="space-y-2">
                  {recentReports.slice(0, 5).map((report: any) => {
                    const actual = parseFloat(report.actualSales) || 0;
                    const target = parseFloat(report.dailyTarget) || 0;
                    const achievement = target > 0 ? (actual / target) * 100 : 0;
                    const variance = actual - target;
                    return (
                      <div
                        key={report.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted/80 transition-colors"
                        data-testid={`row-report-${report.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
                          <div>
                            <p className="text-sm font-medium">{report.reportDate}</p>
                            <p className="text-xs text-muted-foreground">{report.reportBy}</p>
                          </div>
                        </div>
                        <div className="text-right flex items-center gap-2">
                          <div>
                            <p className="text-sm font-bold">฿{actual.toLocaleString()}</p>
                            <div className="flex items-center justify-end gap-0.5 text-xs">
                              {variance >= 0 ? (
                                <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                              ) : (
                                <ArrowDownRight className="w-3 h-3 text-rose-500" />
                              )}
                              <span className={variance >= 0 ? "text-emerald-600" : "text-rose-600"}>
                                {variance >= 0 ? "+" : ""}฿{Math.abs(variance).toLocaleString()}
                              </span>
                            </div>
                          </div>
                          <Badge
                            variant="secondary"
                            className={`text-xs tabular-nums ${
                              achievement >= 100
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                                : achievement >= 90
                                  ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"
                                  : "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400"
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
              {isLoadingMtd ? (
                <div className="space-y-4">
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-3 w-full rounded-full" />
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                  ))}
                </div>
              ) : mtdData && mtdData.mtdTarget > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">MTD Achievement</span>
                    <span className={`text-lg font-bold ${
                      mtdAchievement !== null && mtdAchievement >= 100
                        ? "text-emerald-600 dark:text-emerald-400"
                        : mtdAchievement !== null && mtdAchievement >= 90
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-rose-600 dark:text-rose-400"
                    }`}>
                      {mtdAchievement !== null ? `${mtdAchievement.toFixed(1)}%` : "-"}
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-3 rounded-full transition-all duration-700 ${
                        mtdAchievement !== null && mtdAchievement >= 100
                          ? "bg-emerald-500"
                          : mtdAchievement !== null && mtdAchievement >= 90
                            ? "bg-amber-500"
                            : "bg-rose-500"
                      }`}
                      style={{ width: `${Math.min(100, mtdAchievement ?? 0)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>฿{mtdData.mtdActual.toLocaleString()}</span>
                    <span>/ ฿{mtdData.mtdTarget.toLocaleString()}</span>
                  </div>
                  {[
                    { label: "MTD Transactions", value: mtdData.mtdTc.toLocaleString() },
                    mtdData.mtdTc > 0
                      ? { label: t.mtdAvgTicket, value: `฿${Math.round(mtdData.mtdActual / mtdData.mtdTc).toLocaleString()}` }
                      : null,
                    { label: t.mtdWaste, value: `฿${mtdData.wasteMtdTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}` },
                    mtdData.mtdActual > 0
                      ? { label: t.mtdWastePercent, value: `${((mtdData.wasteMtdTotal / mtdData.mtdActual) * 100).toFixed(2)}%` }
                      : null,
                    { label: t.mtdOt, value: `${mtdData.otMtd.toFixed(1)} ชม.` },
                    { label: t.mtdDays, value: `${mtdData.reportCount} วัน` },
                  ]
                    .filter(Boolean)
                    .map((row: any) => (
                      <div key={row.label} className="pt-3 border-t flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{row.label}</span>
                        <span className="text-sm font-semibold">{row.value}</span>
                      </div>
                    ))}
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
