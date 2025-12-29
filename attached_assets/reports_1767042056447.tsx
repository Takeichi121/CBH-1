import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, Calendar, TrendingUp, TrendingDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { th, enUS } from "date-fns/locale";
import { useLanguage } from "@/contexts/language-context";

export default function Reports() {
  const [searchDate, setSearchDate] = useState("");
  const { t, language } = useLanguage();
  const dateLocale = language === 'th' ? th : enUS;

  const { data: reports, isLoading } = useQuery({
    queryKey: ["/api/daily-sales", searchDate],
    queryFn: async () => {
      const url = searchDate 
        ? `/api/daily-sales?date=${searchDate}&limit=30`
        : "/api/daily-sales?limit=30";
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch reports");
      }
      return response.json();
    }
  });

  const getShiftLabel = (shift: string) => {
    if (shift === 'morning') return t.recentReports.morning;
    if (shift === 'evening') return t.recentReports.evening;
    if (shift === 'full') return t.recentReports.fullDay;
    return shift;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900" data-testid="text-reports-title">{t.pages.reports.title}</h1>
          <p className="text-gray-600 mt-1">{t.pages.reports.subtitle}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">{t.pages.reports.filterData}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <Input
                type="date"
                value={searchDate}
                onChange={(e) => setSearchDate(e.target.value)}
                className="max-w-xs"
                data-testid="input-search-date"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setSearchDate("")}
              data-testid="button-show-all"
            >
              {t.pages.reports.showAll}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-medium">
              {t.pages.reports.dailySalesReports} {searchDate && `(${format(new Date(searchDate), "d MMMM yyyy", { locale: dateLocale })})`}
            </CardTitle>
            <Badge variant="secondary">
              {reports?.length || 0} {t.pages.reports.items}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1,2,3].map(i => (
                <div key={i} className="h-20 bg-gray-100 rounded animate-pulse"></div>
              ))}
            </div>
          ) : !reports || reports.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">
                {t.pages.reports.noReports}
              </p>
              <p className="text-sm mb-4">
                {t.pages.reports.startRecording}
              </p>
              {!searchDate && (
                <Button variant="outline" onClick={() => window.location.href = '/daily-sales'} data-testid="button-go-record">
                  {t.pages.reports.goToRecord}
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map((report: any) => {
                const actual = parseFloat(report.actualSales);
                const target = parseFloat(report.dailyTarget);
                const achievement = target > 0 ? (actual / target) * 100 : 0;
                const variance = actual - target;

                return (
                  <Card key={report.id} className="border border-gray-200 hover:border-bk-red/30 transition-colors">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <Calendar className="w-5 h-5 text-gray-400" />
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {format(new Date(report.reportDate), "EEEE, d MMMM yyyy", { locale: dateLocale })}
                            </h3>
                            <p className="text-sm text-gray-500">{t.pages.reports.shift}: {getShiftLabel(report.workShift)}</p>
                          </div>
                        </div>
                        <Badge 
                          variant="secondary"
                          className={
                            achievement >= 100 
                              ? "bg-green-100 text-green-800"
                              : achievement >= 90
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                          }
                        >
                          {achievement.toFixed(1)}% {language === 'th' ? 'ของเป้า' : 'of target'}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">{t.pages.reports.actualSales}</p>
                          <p className="text-xl font-bold text-gray-900">₿{actual.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">{t.pages.reports.target}</p>
                          <p className="text-lg font-medium text-gray-700">₿{target.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">{language === 'th' ? 'ส่วนต่าง' : 'Variance'}</p>
                          <div className="flex items-center space-x-1">
                            {variance >= 0 ? (
                              <TrendingUp className="w-4 h-4 text-green-500" />
                            ) : (
                              <TrendingDown className="w-4 h-4 text-red-500" />
                            )}
                            <p className={`text-lg font-medium ${variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {variance >= 0 ? '+' : ''}₿{variance.toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">{t.pages.reports.transactions}</p>
                          <p className="text-lg font-medium text-gray-700">{report.transactionCount.toLocaleString()}</p>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">GSI: </span>
                            <span className="font-medium">{report.gsi || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">SOS: </span>
                            <span className="font-medium">{report.sos ? `${report.sos}s` : 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Void: </span>
                            <span className="font-medium">{report.voidCount || 0} {language === 'th' ? 'ครั้ง' : 'times'}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">OSAT: </span>
                            <span className="font-medium">{report.osat || 'N/A'}</span>
                          </div>
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
  );
}
