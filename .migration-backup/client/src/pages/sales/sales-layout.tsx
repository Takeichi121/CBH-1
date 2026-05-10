import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useI18n } from "@/hooks/use-i18n";
import { useAuth } from "@/hooks/use-auth";
import { LayoutDashboard, FileEdit, FileText, Settings, BookOpen, Database, CalendarRange, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnomalyBanner } from "@/components/anomaly-banner";

interface SalesLayoutProps {
  children: ReactNode;
}

export function SalesLayout({ children }: SalesLayoutProps) {
  const { language } = useI18n();
  const { user } = useAuth();
  const [location] = useLocation();
  const isViewer = user?.role === "viewer";
  const isAdmin = user?.role === "admin";

  const allTabs = [
    {
      href: "/sales",
      label: language === "th" ? "ภาพรวม" : "Dashboard",
      icon: LayoutDashboard,
      viewerAllowed: true,
    },
    {
      href: "/sales/daily",
      label: language === "th" ? "กรอกข้อมูล" : "Daily Sales",
      icon: FileEdit,
      viewerAllowed: true,
    },
    {
      href: "/sales/weekly",
      label: language === "th" ? "รายสัปดาห์" : "Weekly",
      icon: CalendarRange,
      viewerAllowed: true,
    },
    {
      href: "/sales/reports",
      label: language === "th" ? "รายงาน" : "Reports",
      icon: FileText,
      viewerAllowed: true,
    },
    {
      href: "/sales/settings",
      label: language === "th" ? "ตั้งค่า" : "Settings",
      icon: Settings,
      viewerAllowed: false,
    },
    ...(isAdmin
      ? [
          {
            href: "/sales/customize",
            label: language === "th" ? "ปรับแต่งการ์ด" : "Customize",
            icon: SlidersHorizontal,
            viewerAllowed: false,
          },
        ]
      : []),
    {
      href: "/sales/manual",
      label: language === "th" ? "คู่มือ" : "Manual",
      icon: BookOpen,
      viewerAllowed: true,
    },
    {
      href: "/sales/import",
      label: language === "th" ? "Import DBF" : "Import DBF",
      icon: Database,
      viewerAllowed: false,
    },
  ];

  const tabs = isViewer ? allTabs.filter(t => t.viewerAllowed) : allTabs;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 border-b pb-2">
        {tabs.map((tab) => {
          const isActive = location === tab.href || 
            (tab.href !== "/sales" && location.startsWith(tab.href));
          const isExactDashboard = tab.href === "/sales" && location === "/sales";
          const active = isExactDashboard || (tab.href !== "/sales" && isActive);
          
          const tabId = tab.href === "/sales" ? "dashboard" : tab.href.replace("/sales/", "");
          return (
            <Link key={tab.href} href={tab.href}>
              <a
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                data-testid={`tab-sales-${tabId}`}
              >
                <tab.icon className="w-4 h-4" data-testid={`icon-sales-${tabId}`} />
                <span className="hidden sm:inline" data-testid={`text-sales-${tabId}`}>{tab.label}</span>
              </a>
            </Link>
          );
        })}
      </div>
      <div className="pb-36">
        <AnomalyBanner />
        {children}
      </div>
    </div>
  );
}
