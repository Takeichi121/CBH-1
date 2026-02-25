import React, { useMemo } from "react";
import { useI18n } from "@/hooks/use-i18n";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowDownLeft,
  ArrowUpRight,
  FileStack,
  Database,
  Lightbulb,
  AlertCircle,
  BarChart3,
  RefreshCw
} from "lucide-react";
import { BorrowLayout } from "./borrow-layout";
import { format, subDays } from "date-fns";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line
} from "recharts";
import type { BorrowTransaction } from "@shared/schema";

interface DashboardMetrics {
  totalTransactions: number;
  totalBorrowIn: number;
  totalBorrowOut: number;
  overdueCount: number;
}

export default function BorrowDashboardPage() {
  const { language } = useI18n();

  const { data: metrics, isLoading } = useQuery<DashboardMetrics>({
    queryKey: ["/api/borrow/dashboard"],
    queryFn: async () => {
      const res = await apiRequest("POST", "/api/borrow/dashboard", { token: localStorage.getItem("bk_token") });
      const data = await res.json();
      return data;
    },
  });

  const { data: transactions } = useQuery<BorrowTransaction[]>({
    queryKey: ["/api/borrow/transactions"],
    queryFn: async () => {
      const res = await apiRequest("POST", "/api/borrow/transactions", { token: localStorage.getItem("bk_token") });
      const data = await res.json();
      return data.transactions || [];
    },
  });

  const trendData = useMemo(() => {
    if (!transactions) return [];
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = subDays(new Date(), i);
      return format(d, "yyyy-MM-dd");
    }).reverse();

    return last7Days.map(date => {
      const dayTxs = transactions.filter(t => t.txDate === date);
      return {
        date: format(new Date(date), "dd MMM"),
        borrow_in: dayTxs.filter(t => t.txType === "borrow_in").length,
        borrow_out: dayTxs.filter(t => t.txType === "borrow_out").length,
      };
    });
  }, [transactions]);

  const labels = {
    totalTransactions: language === "th" ? "รายการทั้งหมด" : "Total Transactions",
    totalBorrowIn: language === "th" ? "ยืมเข้า" : "Borrow In",
    totalBorrowOut: language === "th" ? "ให้ยืม" : "Borrow Out",
    overdue: language === "th" ? "เกินกำหนดคืน" : "Overdue Items", // เพิ่ม Label
    overview: language === "th" ? "ภาพรวม" : "Overview",
    dbMode: language === "th" ? "ระบบพร้อมใช้งาน" : "System is ready",
    tip: language === "th" ? "ใช้แท็บด้านบนเพื่อดูรายการและตั้งค่า" : "Use the tabs above to view transactions and settings",
  };

  return (
    <BorrowLayout>
      <div className="space-y-6">
        {/* ปรับ Grid เป็น 4 คอลัมน์สำหรับหน้าจอใหญ่ */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label={labels.totalTransactions}
            value={metrics?.totalTransactions ?? 0}
            icon={FileStack}
            isLoading={isLoading}
            variant="default"
          />
          <MetricCard
            label={labels.totalBorrowOut}
            value={metrics?.totalBorrowOut ?? 0}
            icon={ArrowUpRight}
            isLoading={isLoading}
            variant="warning" // สีส้ม
          />
          <MetricCard
            label={labels.totalBorrowIn}
            value={metrics?.totalBorrowIn ?? 0}
            icon={ArrowDownLeft}
            isLoading={isLoading}
            variant="success" // สีเขียว
          />
          <MetricCard
            label={labels.overdue}
            value={metrics?.overdueCount ?? 0}
            icon={AlertCircle}
            isLoading={isLoading}
            variant="danger" // สีแดง
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="hover-elevate overflow-hidden border-none shadow-sm md:border md:shadow-none">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-1 bg-muted/5">
              <CardTitle className="text-base font-semibold">
                {language === "th" ? "แนวโน้มการยืม-คืน (7 วัน)" : "7-Day Borrow/Lend Trends"}
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent className="pt-6">
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                    />
                    <Tooltip 
                      cursor={{ fill: "hsl(var(--muted) / 0.2)" }}
                      contentStyle={{ 
                        borderRadius: "12px", 
                        border: "1px solid hsl(var(--border))", 
                        boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                        backgroundColor: "hsl(var(--background))",
                      }}
                    />
                    <Legend verticalAlign="top" align="right" height={36} iconType="circle" />
                    <Bar 
                      name={labels.totalBorrowIn} 
                      dataKey="borrow_in" 
                      fill="#22c55e" 
                      radius={[4, 4, 0, 0]} 
                      barSize={20}
                    />
                    <Bar 
                      name={labels.totalBorrowOut} 
                      dataKey="borrow_out" 
                      fill="#f97316" 
                      radius={[4, 4, 0, 0]} 
                      barSize={20}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="hover-elevate overflow-hidden border-none shadow-sm md:border md:shadow-none">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-1 bg-muted/5">
              <CardTitle className="text-base font-semibold">
                {language === "th" ? "สถิติรายวัน" : "Daily Activity Metrics"}
              </CardTitle>
              <RefreshCw className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent className="pt-6">
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        borderRadius: "12px", 
                        border: "1px solid hsl(var(--border))", 
                        boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                        backgroundColor: "hsl(var(--background))",
                      }}
                    />
                    <Legend verticalAlign="top" align="right" height={36} iconType="circle" />
                    <Line 
                      type="monotone" 
                      name={labels.totalBorrowIn} 
                      dataKey="borrow_in" 
                      stroke="#22c55e" 
                      strokeWidth={3} 
                      dot={{ r: 4, fill: "#22c55e", strokeWidth: 2, stroke: "#fff" }} 
                      activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                    <Line 
                      type="monotone" 
                      name={labels.totalBorrowOut} 
                      dataKey="borrow_out" 
                      stroke="#f97316" 
                      strokeWidth={3} 
                      dot={{ r: 4, fill: "#f97316", strokeWidth: 2, stroke: "#fff" }} 
                      activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              {labels.overview}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">{labels.dbMode}</p>
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <Lightbulb className="h-4 w-4 mt-0.5 text-primary shrink-0" />
              <span>{labels.tip}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </BorrowLayout>
  );
}

interface MetricCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  isLoading: boolean;
  variant: "default" | "success" | "warning" | "danger";
}

function MetricCard({ label, value, icon: Icon, isLoading, variant }: MetricCardProps) {
  // Map สีให้ชัดเจนและรองรับ Dark mode
  const variantStyles = {
    default: "text-foreground bg-muted",
    success: "text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400",
    warning: "text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400",
    danger: "text-destructive bg-red-100 dark:bg-red-900/30 dark:text-red-400",
  };

  const iconStyles = {
    default: "text-foreground",
    success: "text-green-600 dark:text-green-400",
    warning: "text-orange-600 dark:text-orange-400",
    danger: "text-destructive dark:text-red-400",
  };

  return (
    <Card data-testid={"card-metric-" + variant}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {label}
            </p>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <p
                className={`text-3xl font-black tabular-nums ${iconStyles[variant]}`}
                data-testid={"text-metric-" + variant}
              >
                {value.toLocaleString()}
              </p>
            )}
          </div>
          <div className={`p-3 rounded-xl ${variantStyles[variant]}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}