import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useI18n } from "@/hooks/use-i18n";
import { LayoutDashboard, FileText, Settings, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface BorrowLayoutProps {
  children: ReactNode;
}

export function BorrowLayout({ children }: BorrowLayoutProps) {
  const { language } = useI18n();
  const [location] = useLocation();

  const tabs = [
    {
      href: "/borrow",
      label: language === "th" ? "ภาพรวม" : "Dashboard",
      icon: LayoutDashboard,
    },
    {
      href: "/borrow/transactions",
      label: language === "th" ? "รายการ" : "Transactions",
      icon: FileText,
    },
    {
      href: "/borrow/settings",
      label: language === "th" ? "ตั้งค่า" : "Settings",
      icon: Settings,
    },
    {
      href: "/borrow/help",
      label: language === "th" ? "คู่มือ" : "Help",
      icon: HelpCircle,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 border-b pb-2">
        {tabs.map((tab) => {
          const isActive = location === tab.href || 
            (tab.href !== "/borrow" && location.startsWith(tab.href));
          const isExactDashboard = tab.href === "/borrow" && location === "/borrow";
          const active = isExactDashboard || (tab.href !== "/borrow" && isActive);
          
          const tabId = tab.href === "/borrow" ? "dashboard" : tab.href.replace("/borrow/", "");
          return (
            <Link key={tab.href} href={tab.href}>
              <a
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                data-testid={`tab-borrow-${tabId}`}
              >
                <tab.icon className="w-4 h-4" data-testid={`icon-borrow-${tabId}`} />
                <span className="hidden sm:inline" data-testid={`text-borrow-${tabId}`}>{tab.label}</span>
              </a>
            </Link>
          );
        })}
      </div>
      <div>{children}</div>
    </div>
  );
}
