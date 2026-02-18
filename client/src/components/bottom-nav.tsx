import { useLocation, Link } from "wouter";
import { Calendar, BarChart3, Package, MessageCircle, Settings, Briefcase } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";

export function BottomNav() {
  const { user } = useAuth();
  const { t, language } = useI18n();
  const [location] = useLocation();

  if (!user) return null;

  const isManagerOrAdmin = user.role === "manager" || user.role === "admin";

  const chatLabel = language === "th" ? "แชท" : "Chat";

  const navItems = [
    { href: "/work", label: t("myWork") || "My Work", icon: Briefcase },
    { href: "/roster", label: t("roster") || "Roster", icon: Calendar },
    ...(isManagerOrAdmin
      ? [
          { href: "/sales", label: language === "th" ? "ยอดขาย" : "Sales", icon: BarChart3 },
          { href: "/borrow", label: t("borrowTracker") || "Borrow", icon: Package },
        ]
      : [
          { href: "/dashboard", label: chatLabel, icon: MessageCircle },
        ]),
    { href: "/settings", label: t("settings") || "Settings", icon: Settings },
  ];

  const isActive = (href: string) => {
    if (href === "/sales") return location.startsWith("/sales");
    if (href === "/borrow") return location.startsWith("/borrow");
    return location === href;
  };

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-md"
      data-testid="nav-bottom"
    >
      <div className="flex items-center justify-around gap-1 px-2" style={{ height: "calc(4rem + env(safe-area-inset-bottom, 0px))", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link key={item.href} href={item.href}>
              <a
                className={`flex flex-col items-center justify-center gap-0.5 min-w-0 flex-1 py-1.5 rounded-lg transition-colors ${
                  active
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
                data-testid={`nav-bottom-${item.href.replace("/", "")}`}
              >
                <div className={`relative flex items-center justify-center w-10 h-7 rounded-full transition-colors ${active ? "bg-primary/10" : ""}`}>
                  <item.icon className={`w-5 h-5 ${active ? "stroke-[2.5px]" : ""}`} />
                </div>
                <span className={`text-[10px] leading-tight truncate max-w-full ${active ? "font-bold" : "font-medium"}`}>
                  {item.label}
                </span>
              </a>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
