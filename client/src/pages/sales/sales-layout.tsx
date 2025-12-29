import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useI18n } from "@/hooks/use-i18n";
import { LayoutDashboard, FileEdit, FileText, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

interface SalesLayoutProps {
  children: ReactNode;
}

export function SalesLayout({ children }: SalesLayoutProps) {
  const { language } = useI18n();
  const [location] = useLocation();

  const tabs = [
    {
      href: "/sales",
      label: language === "th" ? "ภาพรวม" : "Dashboard",
      icon: LayoutDashboard,
    },
    {
      href: "/sales/daily",
      label: language === "th" ? "กรอกข้อมูล" : "Daily Sales",
      icon: FileEdit,
    },
    {
      href: "/sales/reports",
      label: language === "th" ? "รายงาน" : "Reports",
      icon: FileText,
    },
    {
      href: "/sales/settings",
      label: language === "th" ? "ตั้งค่า" : "Settings",
      icon: Settings,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 border-b pb-2">
        {tabs.map((tab) => {
          const isActive = location === tab.href || 
            (tab.href !== "/sales" && location.startsWith(tab.href));
          const isExactDashboard = tab.href === "/sales" && location === "/sales";
          const active = isExactDashboard || (tab.href !== "/sales" && isActive);
          
          return (
            <Link key={tab.href} href={tab.href}>
              <a
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                data-testid={`tab-${tab.href.replace("/sales/", "").replace("/sales", "dashboard")}`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </a>
            </Link>
          );
        })}
      </div>
      <div>{children}</div>
    </div>
  );
}
