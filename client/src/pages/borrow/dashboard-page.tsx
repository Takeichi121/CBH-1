import React from "react";
import { useLanguage } from "@/lib/i18n";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowDownLeft,
  ArrowUpRight,
  FileStack,
  Database,
  Lightbulb,
  CalendarDays,
} from "lucide-react";
import type { DashboardMetrics } from "@shared/schema";

export default function Dashboard() {
  const { t } = useLanguage();

  const { data: metrics, isLoading } = useQuery<DashboardMetrics>({
    queryKey: ["/api/dashboard/metrics"],
  });

  // ✅ TH/EN locale (ไม่เดา t.lang แล้ว)
  const isThai =
    (typeof document !== "undefined" &&
      document.documentElement?.lang?.toLowerCase().startsWith("th")) ||
    (typeof navigator !== "undefined" &&
      navigator.language?.toLowerCase().startsWith("th"));

  const locale = isThai ? "th-TH" : "en-US";

  const now = new Date();
  const dayName = now.toLocaleDateString(locale, { weekday: "long" });
  const fullDate = now.toLocaleDateString(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const todayLabel = isThai ? "วันนี้" : "Today";

  return (
    <div className="space-y-6">
      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          label={t.dashboard.totalTransactions}
          value={metrics?.totalTransactions ?? 0}
          icon={FileStack}
          isLoading={isLoading}
          variant="default"
        />
        <MetricCard
          label={t.dashboard.totalBorrowIn}
          value={metrics?.totalBorrowIn ?? 0}
          icon={ArrowDownLeft}
          isLoading={isLoading}
          variant="success"
        />
        <MetricCard
          label={t.dashboard.totalBorrowOut}
          value={metrics?.totalBorrowOut ?? 0}
          icon={ArrowUpRight}
          isLoading={isLoading}
          variant="danger"
        />
      </div>

      {/* Overview Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            {t.dashboard.overview}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{t.dashboard.dbMode}</p>
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <Lightbulb className="h-4 w-4 mt-0.5 text-primary shrink-0" />
            <span>{t.dashboard.tip}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface MetricCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  isLoading: boolean;
  variant: "default" | "success" | "danger";
}

function MetricCard({ label, value, icon: Icon, isLoading, variant }: MetricCardProps) {
  const variantStyles = {
    default: "text-foreground",
    success: "text-chart-2",
    danger: "text-destructive",
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
                className={"text-3xl font-black tabular-nums " + variantStyles[variant]}
                data-testid={"text-metric-" + variant}
              >
                {value.toLocaleString()}
              </p>
            )}
          </div>
          <div className={"p-3 rounded-xl bg-muted " + variantStyles[variant]}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
