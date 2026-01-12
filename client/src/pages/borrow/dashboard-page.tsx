import React from "react";
import { useI18n } from "@/hooks/use-i18n";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowDownLeft,
  ArrowUpRight,
  FileStack,
  Database,
  Lightbulb,
  AlertCircle // เพิ่มไอคอนแจ้งเตือน
} from "lucide-react";
import { BorrowLayout } from "./borrow-layout";

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
  });

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