import { useI18n } from "@/hooks/use-i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign, Users, Target, BarChart3 } from "lucide-react";
import { SalesLayout } from "./sales-layout";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function SalesDashboardPage() {
  const { language } = useI18n();

  const t = {
    title: language === "th" ? "ภาพรวมยอดขาย" : "Sales Dashboard",
    subtitle: language === "th" ? "สรุปข้อมูลสำคัญ" : "Key metrics overview",
    todaySales: language === "th" ? "ยอดขายวันนี้" : "Today's Sales",
    monthToDate: language === "th" ? "ยอดสะสม (MTD)" : "Month to Date",
    transactions: language === "th" ? "จำนวนรายการ" : "Transactions",
    avgTicket: language === "th" ? "ยอดเฉลี่ย/บิล" : "Avg Ticket",
    noData: language === "th" ? "ยังไม่มีข้อมูล" : "No data yet",
    startRecording: language === "th" ? "เริ่มบันทึกยอดขาย" : "Start recording sales",
    goToForm: language === "th" ? "ไปกรอกข้อมูล" : "Go to form",
    recentReports: language === "th" ? "รายงานล่าสุด" : "Recent Reports",
    viewAll: language === "th" ? "ดูทั้งหมด" : "View All",
    performance: language === "th" ? "ประสิทธิภาพ" : "Performance",
    noPerformanceData: language === "th" ? "ยังไม่มีข้อมูลประสิทธิภาพ" : "No performance data yet",
  };

  const kpiCards = [
    {
      title: t.todaySales,
      value: "-",
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-50 dark:bg-green-950/30",
    },
    {
      title: t.monthToDate,
      value: "-",
      icon: Target,
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950/30",
    },
    {
      title: t.transactions,
      value: "-",
      icon: Users,
      color: "text-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-950/30",
    },
    {
      title: t.avgTicket,
      value: "-",
      icon: BarChart3,
      color: "text-orange-600",
      bgColor: "bg-orange-50 dark:bg-orange-950/30",
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

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiCards.map((card, index) => (
            <Card key={index} className={card.bgColor}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{card.title}</p>
                    <p className="text-xl font-bold mt-1">{card.value}</p>
                  </div>
                  <div className={`p-2 rounded-full ${card.bgColor}`}>
                    <card.icon className={`w-5 h-5 ${card.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{t.recentReports}</CardTitle>
                <Link href="/sales/reports">
                  <a className="text-sm text-primary hover:underline">{t.viewAll}</a>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">{t.performance}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">{t.noPerformanceData}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </SalesLayout>
  );
}
