import { useState } from "react";
import { useI18n } from "@/hooks/use-i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, Calendar, TrendingUp, TrendingDown } from "lucide-react";
import { SalesLayout } from "./sales-layout";
import { Link } from "wouter";

export default function SalesReportsPage() {
  const { language } = useI18n();
  const [searchDate, setSearchDate] = useState("");

  const t = {
    title: language === "th" ? "รายงานย้อนหลัง" : "Reports History",
    subtitle: language === "th" ? "ดูและค้นหารายงานที่บันทึกไว้" : "View and search recorded reports",
    filterByDate: language === "th" ? "กรองตามวันที่" : "Filter by date",
    showAll: language === "th" ? "แสดงทั้งหมด" : "Show All",
    noReports: language === "th" ? "ยังไม่มีรายงาน" : "No reports yet",
    startRecording: language === "th" ? "เริ่มบันทึกยอดขายเพื่อดูรายงานที่นี่" : "Start recording sales to see reports here",
    goToForm: language === "th" ? "ไปกรอกข้อมูล" : "Go to form",
    items: language === "th" ? "รายการ" : "items",
    shift: language === "th" ? "กะ" : "Shift",
    actualSales: language === "th" ? "ยอดขายจริง" : "Actual Sales",
    target: language === "th" ? "เป้าหมาย" : "Target",
    variance: language === "th" ? "ส่วนต่าง" : "Variance",
    transactions: language === "th" ? "รายการ" : "Transactions",
    ofTarget: language === "th" ? "ของเป้า" : "of target",
  };

  const reports: any[] = [];

  return (
    <SalesLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-reports-title">
            {t.title}
          </h1>
          <p className="text-muted-foreground text-sm">{t.subtitle}</p>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t.filterByDate}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 flex-wrap">
              <Input
                type="date"
                value={searchDate}
                onChange={(e) => setSearchDate(e.target.value)}
                className="max-w-xs"
                data-testid="input-search-date"
              />
              <Button
                variant="outline"
                onClick={() => setSearchDate("")}
                data-testid="button-show-all"
              >
                {t.showAll}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-lg">{t.title}</CardTitle>
              <Badge variant="secondary">
                {reports.length} {t.items}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {reports.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">{t.noReports}</p>
                <p className="text-sm mb-4">{t.startRecording}</p>
                <Link href="/sales/daily">
                  <Button variant="outline" data-testid="button-go-record">
                    {t.goToForm}
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {reports.map((report: any) => {
                  const actual = parseFloat(report.actualSales);
                  const target = parseFloat(report.dailyTarget);
                  const achievement = target > 0 ? (actual / target) * 100 : 0;
                  const variance = actual - target;

                  return (
                    <Card key={report.id} className="border hover:border-primary/30 transition-colors">
                      <CardContent className="p-4 md:p-6">
                        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                          <div className="flex items-center gap-3">
                            <Calendar className="w-5 h-5 text-muted-foreground" />
                            <div>
                              <h3 className="font-semibold">{report.reportDate}</h3>
                              <p className="text-sm text-muted-foreground">
                                {t.shift}: {report.workShift}
                              </p>
                            </div>
                          </div>
                          <Badge
                            variant="secondary"
                            className={
                              achievement >= 100
                                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                : achievement >= 90
                                  ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                                  : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                            }
                          >
                            {achievement.toFixed(1)}% {t.ofTarget}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">{t.actualSales}</p>
                            <p className="text-xl font-bold">฿{actual.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">{t.target}</p>
                            <p className="text-lg font-medium">฿{target.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">{t.variance}</p>
                            <div className="flex items-center gap-1">
                              {variance >= 0 ? (
                                <TrendingUp className="w-4 h-4 text-green-500" />
                              ) : (
                                <TrendingDown className="w-4 h-4 text-red-500" />
                              )}
                              <p className={`text-lg font-medium ${variance >= 0 ? "text-green-600" : "text-red-600"}`}>
                                {variance >= 0 ? "+" : ""}฿{variance.toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">{t.transactions}</p>
                            <p className="text-lg font-medium">{report.transactionCount?.toLocaleString() || 0}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SalesLayout>
  );
}
