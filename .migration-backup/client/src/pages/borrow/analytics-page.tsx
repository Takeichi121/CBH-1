import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useI18n } from "@/hooks/use-i18n";
import { BorrowLayout } from "./borrow-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, AlertTriangle, Package } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

export default function BorrowAnalyticsPage() {
  const { language } = useI18n();
  const token = localStorage.getItem("bk_token") || "";

  const { data, isLoading } = useQuery({
    queryKey: ["/api/borrow/analytics"],
    queryFn: async () => {
      const res = await fetch(`/api/borrow/analytics?token=${encodeURIComponent(token)}`);
      return res.json();
    },
    staleTime: 60_000,
  });

  const topItems: Array<{ name: string; count: number; returned: number; overdue: number; pending: number }> =
    data?.topItems || [];
  const statusBreakdown: Array<{ name: string; value: number; color: string }> =
    data?.statusBreakdown || [];
  const overdueList: any[] = data?.overdueList || [];
  const total: number = data?.total || 0;

  const overdueCount = useMemo(
    () => statusBreakdown.find(s => s.name === "เกินกำหนด")?.value ?? 0,
    [statusBreakdown]
  );

  return (
    <BorrowLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-borrow-analytics-title">
            {language === "th" ? "วิเคราะห์ข้อมูลการยืม" : "Borrow Analytics"}
          </h1>
          <p className="text-muted-foreground text-sm">
            {language === "th" ? `รายการทั้งหมด ${total} รายการ` : `Total ${total} transactions`}
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-72 w-full rounded-xl" />
            <Skeleton className="h-72 w-full rounded-xl" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* G2: Top Items Bar Chart */}
              <Card data-testid="card-borrow-top-items">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-primary" />
                    {language === "th" ? "รายการยืมสูงสุด 10 อันดับ" : "Top 10 Borrowed Items"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {topItems.length === 0 ? (
                    <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">
                      {language === "th" ? "ยังไม่มีข้อมูล" : "No data yet"}
                    </div>
                  ) : (
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topItems} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.1} />
                          <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                          <YAxis
                            type="category"
                            dataKey="name"
                            width={90}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10 }}
                          />
                          <Tooltip
                            contentStyle={{ borderRadius: 8, fontSize: 12 }}
                            formatter={(v: number, name: string) => [v, name]}
                          />
                          <Bar dataKey="returned" name={language === "th" ? "คืนแล้ว" : "Returned"} fill="#22c55e" stackId="a" radius={[0, 0, 0, 0]} />
                          <Bar dataKey="pending" name={language === "th" ? "กำลังยืม" : "Borrowing"} fill="#3b82f6" stackId="a" />
                          <Bar dataKey="overdue" name={language === "th" ? "เกินกำหนด" : "Overdue"} fill="#ef4444" stackId="a" radius={[0, 3, 3, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* G2: Status Pie Chart */}
              <Card data-testid="card-borrow-status-pie">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Package className="w-4 h-4 text-primary" />
                    {language === "th" ? "สัดส่วนสถานะ" : "Status Breakdown"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {statusBreakdown.every(s => s.value === 0) ? (
                    <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">
                      {language === "th" ? "ยังไม่มีข้อมูล" : "No data yet"}
                    </div>
                  ) : (
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={statusBreakdown.filter(s => s.value > 0)}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            innerRadius={40}
                            label={({ name, value }) => `${name}: ${value}`}
                            labelLine={false}
                          >
                            {statusBreakdown.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v: number) => v} />
                          <Legend iconType="circle" iconSize={8} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* G2: Overdue Table */}
            {overdueList.length > 0 && (
              <Card className="border-red-200 dark:border-red-800" data-testid="card-borrow-overdue">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2 text-red-600 dark:text-red-400">
                    <AlertTriangle className="w-4 h-4" />
                    {language === "th" ? `เกินกำหนดคืน ${overdueCount} รายการ` : `${overdueCount} Overdue Items`}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {overdueList.map((tx: any, i: number) => (
                      <div
                        key={tx.id || i}
                        className="flex items-center justify-between p-3 rounded-lg bg-red-50 dark:bg-red-500/10"
                        data-testid={`row-overdue-${tx.id || i}`}
                      >
                        <div>
                          <p className="text-sm font-medium">{tx.item}</p>
                          <p className="text-xs text-muted-foreground">{tx.branch} · {tx.borrower || "-"}</p>
                        </div>
                        <div className="text-right">
                          <Badge variant="destructive" className="text-xs">
                            {language === "th" ? "กำหนด" : "Due"}: {tx.dueDate}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">×{tx.qty} {tx.unit || ""}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </BorrowLayout>
  );
}
