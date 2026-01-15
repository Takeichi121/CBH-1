import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useI18n } from "@/hooks/use-i18n";
import { 
  LayoutDashboard, 
  FileText, 
  Plus,
  Settings, 
  HelpCircle, 
  ShoppingBag, // เพิ่มไอคอนสำหรับ Items
  Store        // เพิ่มไอคอนสำหรับ Branches
} from "lucide-react";
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
      href: "/borrow/history",
      label: language === "th" ? "ประวัติ" : "History",
      icon: FileText,
    },
    {
      href: "/borrow/transactions",
      label: language === "th" ? "เพิ่มรายการ" : "Add New",
      icon: Plus,
    },
    {
      href: "/borrow/branches",
      label: language === "th" ? "สาขา" : "Branches",
      icon: Store,
    },
    {
      href: "/borrow/items",
      label: language === "th" ? "รายการ" : "Items",
      icon: ShoppingBag,
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
      <div className="flex flex-wrap gap-2 border-b pb-2 overflow-x-auto">
        {tabs.map((tab) => {
          // Logic การเช็ค Active state
          const isActive = location === tab.href || 
            (tab.href !== "/borrow" && location.startsWith(tab.href));
          const isExactDashboard = tab.href === "/borrow" && location === "/borrow";
          const active = isExactDashboard || (tab.href !== "/borrow" && isActive);

          const tabId = tab.href === "/borrow" ? "dashboard" : tab.href.replace("/borrow/", "");

          return (
            <Link key={tab.href} href={tab.href}>
              <a
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                data-testid={`tab-borrow-${tabId}`}
              >
                <tab.icon className="w-4 h-4" data-testid={`icon-borrow-${tabId}`} />
                {/* แสดง text ตลอด หรือจะซ่อนในมือถือก็ได้ (ในที่นี้เปิดไว้เพื่อให้กดง่าย) */}
                <span className="hidden sm:inline" data-testid={`text-borrow-${tabId}`}>{tab.label}</span>
                {/* Show icon only on very small screens if needed, otherwise span above handles it */}
                <span className="sm:hidden inline">{tab.label}</span>
              </a>
            </Link>
          );
        })}
      </div>
      <div className="min-h-screen">{children}</div>
    </div>
  );
}