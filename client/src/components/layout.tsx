import { ReactNode, useState, useMemo, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { LogoDataHouse } from "@/components/logo";
import { Link, useLocation } from "wouter";
import {
  Briefcase, Calendar, Settings, LogOut, User, Menu, Moon, Sun, Shield,
  BarChart3, Package, FileText, BookOpen, LayoutDashboard, Pencil, Clock,
  ChevronDown, Bot, Globe, History, Store, ChevronUp, Megaphone, CalendarCheck,
  Sparkles, Smartphone, ArrowLeft, ChevronLeft, ChevronRight, Trophy, Bell,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useTheme } from "next-themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/bottom-nav";
import { OfflineIndicator } from "@/components/offline-indicator";
import { NotificationBell } from "@/components/notification-bell";
import { useI18n } from "@/hooks/use-i18n";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
}

export function Layout({ children }: { children: ReactNode }) {
  const { user, logoutMutation, selectedStoreId, setSelectedStoreId, token } = useAuth();
  const { t, language, setLanguage } = useI18n();
  const [location] = useLocation();
  const { theme, setTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  // Auto-collapse on tablet (< 1024px), expand on large screens
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 1024 : false
  );

  useEffect(() => {
    const handleResize = () => {
      setSidebarCollapsed(window.innerWidth < 1024);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isAdminLike = user?.role === "admin" || user?.role === "area";

  const { data: storesData } = useQuery({
    queryKey: ["/api/admin/stores", token],
    enabled: !!isAdminLike && !!token,
    queryFn: async () => {
      const res = await apiRequest("POST", "/api/admin/stores", { token });
      return res.json();
    },
    staleTime: 60000,
  });

  const stores: Array<{ id: string; name: string; nameTh?: string | null; isActive: number }> = storesData?.stores || [];
  const effectiveStoreId = selectedStoreId || stores[0]?.id || "BK1040";
  const currentStore = stores.find((s) => s.id === effectiveStoreId) || stores[0];

  const { data: announcementsData } = useQuery<{ ok: boolean; announcements: Array<{ id: number; createdAt: string }> }>({
    queryKey: ["/api/announcements-nav", token],
    enabled: !!token,
    queryFn: async () => {
      const res = await fetch("/api/announcements?limit=50", {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
    refetchInterval: 60000,
    staleTime: 30000,
  });

  const announcementsLastSeenKey = user ? `announcements_last_seen:${user.username}` : null;
  const [announcementsLastSeen, setAnnouncementsLastSeen] = useState<string | null>(null);

  useEffect(() => {
    if (!announcementsLastSeenKey) return;
    setAnnouncementsLastSeen(localStorage.getItem(announcementsLastSeenKey));
  }, [announcementsLastSeenKey]);

  useEffect(() => {
    if (!announcementsLastSeenKey) return;
    if (location === "/announcements") {
      const now = new Date().toISOString();
      localStorage.setItem(announcementsLastSeenKey, now);
      setAnnouncementsLastSeen(now);
    }
  }, [location, announcementsLastSeenKey]);

  const unreadAnnouncementCount = useMemo(() => {
    const announcements = announcementsData?.announcements ?? [];
    if (!announcementsLastSeen) return announcements.length;
    return announcements.filter((a) => new Date(a.createdAt) > new Date(announcementsLastSeen)).length;
  }, [announcementsData, announcementsLastSeen]);

  if (!user) {
    // เพิ่ม paddingTop (safe-area-inset-top) สำหรับ mobile/iOS
    return (
      <div
        className="min-h-screen bg-background"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        {children}
      </div>
    );
  }

  const isManagerOrAdmin = user.role === "manager" || user.role === "admin";
  const isViewer = user.role === "viewer";

  const hasFeature = (key: string): boolean => {
    if (user.role === "admin") return true;
    if (!user.allowedFeatures) return true;
    return user.allowedFeatures.includes(key);
  };

  const announcementNavItem: NavItem = {
    href: "/announcements",
    label: language === "th" ? "ประกาศ" : "Announcements",
    icon: Megaphone,
    badge: unreadAnnouncementCount,
  };

  const notificationsNavItem: NavItem = {
    href: "/notifications",
    label: language === "th" ? "การแจ้งเตือน" : "Notifications",
    icon: Bell,
  };

  const sidebarNavItems: NavItem[] = isViewer
    ? [
        ...(hasFeature("sales") ? [{ href: "/sales", label: t("salesReport") || "Sales Report", icon: BarChart3 }] : []),
        ...(hasFeature("handbook") ? [{ href: "/handbook", label: t("employeeHandbook") || "Handbook", icon: BookOpen }] : []),
        announcementNavItem,
      ]
    : [
        ...(hasFeature("dashboard") ? [{ href: "/dashboard", label: t("dashboard") || "Dashboard", icon: LayoutDashboard }] : []),
        ...(hasFeature("work") ? [{ href: "/work", label: t("myWork") || "My Work", icon: Briefcase }] : []),
        ...(hasFeature("roster") ? [{ href: "/roster", label: t("roster") || "Roster", icon: Calendar }] : []),
        ...(isManagerOrAdmin && hasFeature("sales") ? [{ href: "/sales", label: t("salesReport") || "Sales Report", icon: BarChart3 }] : []),
        ...(isManagerOrAdmin ? [{ href: "/attendance", label: language === "th" ? "เวลาทำงาน" : "Attendance", icon: CalendarCheck }] : []),
        ...(isManagerOrAdmin ? [{ href: "/gamification", label: language === "th" ? "กระดานอันดับ" : "Leaderboard", icon: Trophy }] : []),
        ...(isManagerOrAdmin && hasFeature("borrow") ? [{ href: "/borrow", label: t("borrowTracker") || "Borrow", icon: Package }] : []),
        { href: "/chann", label: "Chann AI", icon: Sparkles },
        announcementNavItem,
        ...(isManagerOrAdmin && hasFeature("requests") ? [{ href: "/requests", label: t("managerRequest") || "Request", icon: FileText }] : []),
        ...(isManagerOrAdmin && hasFeature("admin") ? [{ href: "/admin", label: t("manageTeam") || "Manage Team", icon: Shield }] : []),
        ...(hasFeature("settings") ? [{ href: "/settings", label: t("settings") || "Settings", icon: Settings }] : []),
        ...(hasFeature("handbook") ? [{ href: "/handbook", label: t("employeeHandbook") || "Handbook", icon: BookOpen }] : []),
      ];

  const mobileNavItems: NavItem[] = isViewer
    ? [
        ...(hasFeature("sales") ? [{ href: "/sales", label: t("salesReport") || "Sales Report", icon: BarChart3 }] : []),
        ...(hasFeature("handbook") ? [{ href: "/handbook", label: t("employeeHandbook") || "Handbook", icon: BookOpen }] : []),
        announcementNavItem,
      ]
    : [
        ...(hasFeature("dashboard") ? [{ href: "/dashboard", label: t("dashboard") || "Dashboard", icon: LayoutDashboard }] : []),
        ...(hasFeature("work") ? [{ href: "/work", label: t("myWork") || "My Work", icon: Briefcase }] : []),
        ...(hasFeature("roster") ? [{ href: "/roster", label: t("roster") || "Roster", icon: Calendar }] : []),
        { href: "/chann", label: "Chann AI", icon: Sparkles },
        { href: "/mobile", label: language === "th" ? "มือถือ" : "Mobile", icon: Smartphone },
        ...(isManagerOrAdmin && hasFeature("sales") ? [{ href: "/sales", label: t("salesReport") || "Sales Report", icon: BarChart3 }] : []),
        ...(isManagerOrAdmin ? [{ href: "/attendance", label: language === "th" ? "เวลาทำงาน" : "Attendance", icon: CalendarCheck }] : []),
        ...(isManagerOrAdmin ? [{ href: "/gamification", label: language === "th" ? "กระดานอันดับ" : "Leaderboard", icon: Trophy }] : []),
        ...(isManagerOrAdmin && hasFeature("borrow") ? [{ href: "/borrow", label: t("borrowTracker") || "Borrow", icon: Package }] : []),
        ...(isManagerOrAdmin && hasFeature("requests") ? [{ href: "/requests", label: t("managerRequest") || "Request", icon: FileText }] : []),
        ...(isManagerOrAdmin && hasFeature("admin") ? [{ href: "/admin", label: t("manageTeam") || "Manage Team", icon: Shield }] : []),
        announcementNavItem,
        ...(hasFeature("settings") ? [{ href: "/settings", label: t("settings") || "Settings", icon: Settings }] : []),
        ...(hasFeature("handbook") ? [{ href: "/handbook", label: t("employeeHandbook") || "Handbook", icon: BookOpen }] : []),
      ];

  const activeNavItem = sidebarNavItems.find(
    (item) => location === item.href || (item.href !== "/" && location.startsWith(item.href))
  );

  const displayEmail = (user as any).email || user.username;

  /* ── Right-side controls shared between desktop topbar ── */
  const RightControls = () => (
    <div className="flex items-center gap-1">
      {isAdminLike && stores.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-8 px-2.5 rounded-full border-primary/20 hover:bg-primary/5 text-muted-foreground hover:text-foreground transition-all"
              data-testid="button-store-switcher"
            >
              <Store className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden lg:inline text-xs font-medium truncate max-w-[120px]">{currentStore?.name || effectiveStoreId}</span>
              <ChevronDown className="w-3 h-3 opacity-60 shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            {stores.filter((s) => s.isActive === 1).map((store) => (
              <DropdownMenuItem
                key={store.id}
                onClick={() => setSelectedStoreId(store.id)}
                className={effectiveStoreId === store.id ? "bg-primary/10 text-primary font-semibold" : ""}
                data-testid={`store-option-${store.id}`}
              >
                <Store className="w-4 h-4 mr-2 shrink-0" />
                <span className="truncate">{store.name}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={() => setLanguage(language === "en" ? "th" : "en")}
        className="gap-1 h-8 px-2.5 rounded-full border-primary/20 hover:bg-primary/5 text-muted-foreground hover:text-foreground transition-all"
        data-testid="button-language-toggle"
      >
        <Globe className="w-3.5 h-3.5" />
        <span className="hidden lg:inline text-xs font-medium">{language === "en" ? "ไทย" : "EN"}</span>
      </Button>

      <Button
        variant="outline"
        size="icon"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        className="rounded-full w-8 h-8 border-primary/20 hover:bg-primary/5 transition-all duration-300 relative overflow-hidden"
        data-testid="button-theme-toggle"
      >
        <div className="relative w-full h-full flex items-center justify-center">
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all duration-500 dark:-rotate-90 dark:scale-0 text-yellow-400" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all duration-500 dark:rotate-0 dark:scale-100 text-emerald-400" />
        </div>
        <span className="sr-only">Toggle theme</span>
      </Button>

      <NotificationBell />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0" data-testid="button-profile-dropdown">
            <Avatar className="h-8 w-8 border-2 border-primary/20">
              <AvatarImage src={user.profilePicture || ""} alt={user.fullName || ""} />
              <AvatarFallback className="bg-primary/5 text-primary font-bold text-xs">
                {user.username.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-72 p-0 overflow-hidden" align="end" forceMount>
          <div className="bg-primary text-primary-foreground">
            <div className="flex items-center justify-end px-4 pt-3 pb-1">
              <button
                onClick={() => logoutMutation.mutate()}
                className="text-xs text-primary-foreground/80 hover:text-primary-foreground underline flex items-center gap-1 transition-colors"
                data-testid="button-logout-desktop"
              >
                ออกจากระบบ <LogOut className="h-3 w-3" />
              </button>
            </div>
            <div className="flex items-center gap-3 px-4 pb-4">
              <Avatar className="h-14 w-14 border-2 border-primary-foreground/30 shrink-0">
                <AvatarImage src={user.profilePicture || ""} alt={user.fullName || ""} />
                <AvatarFallback className="bg-primary-foreground/10 text-primary-foreground font-bold text-lg">
                  {user.username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm leading-tight truncate">{user.fullName || user.username}</p>
                <p className="text-xs text-primary-foreground/70 truncate mt-0.5">{displayEmail}</p>
              </div>
              {!isViewer && (
                <Link href="/settings">
                  <a className="p-1.5 rounded-full hover:bg-primary-foreground/10 transition-colors shrink-0" data-testid="button-edit-profile-desktop">
                    <Pencil className="h-3.5 w-3.5 text-primary-foreground/80" />
                  </a>
                </Link>
              )}
            </div>
          </div>
          <div className="py-1">
            {!isViewer && hasFeature("settings") && (
              <DropdownMenuItem asChild className="cursor-pointer px-4 py-2.5 gap-3">
                <Link href="/settings">
                  <a className="flex items-center gap-3 w-full" data-testid="dropdown-nav-profile">
                    <User className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span>{language === "th" ? "โปรไฟล์ของฉัน" : "My Profile"}</span>
                  </a>
                </Link>
              </DropdownMenuItem>
            )}
            {isManagerOrAdmin && hasFeature("admin") && (
              <DropdownMenuItem asChild className="cursor-pointer px-4 py-2.5 gap-3">
                <Link href="/admin">
                  <a className="flex items-center gap-3 w-full" data-testid="dropdown-nav-manage-team">
                    <Shield className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span>{t("manageTeam") || "Manage Team"}</span>
                  </a>
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="cursor-pointer px-4 py-2.5 gap-3">
              <Link href="/mobile">
                <a className="flex items-center gap-3 w-full" data-testid="dropdown-nav-mobile">
                  <Smartphone className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{language === "th" ? "แดชบอร์ดมือถือ" : "Mobile Dashboard"}</span>
                </a>
              </Link>
            </DropdownMenuItem>
            {hasFeature("handbook") && (
              <DropdownMenuItem asChild className="cursor-pointer px-4 py-2.5 gap-3">
                <Link href="/handbook">
                  <a className="flex items-center gap-3 w-full" data-testid="dropdown-nav-handbook">
                    <BookOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span>{language === "th" ? "คู่มือพนักงาน" : "Handbook"}</span>
                  </a>
                </Link>
              </DropdownMenuItem>
            )}
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => logoutMutation.mutate()}
            className="text-destructive focus:text-destructive cursor-pointer px-4 py-2.5 gap-3"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span>{t("logout")}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <OfflineIndicator />

      {/* ── MOBILE LAYOUT ─────────────────────────────────────────────── */}
      <div className="flex flex-col min-h-screen md:hidden">
        {/* Mobile Header */}
        <header
          className="flex items-center h-14 px-3 gap-1.5 border-b sticky top-0 z-50 bg-background/80 backdrop-blur-md shadow-md"
          style={{ paddingTop: 'env(safe-area-inset-top, 12px)' }}
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.history.back()}
            className="h-9 w-9 rounded-full text-muted-foreground hover:text-foreground shrink-0"
            data-testid="button-back-mobile"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <Link href="/work" className="flex items-center gap-2 flex-1 min-w-0">
            <LogoDataHouse size={28} />
            <span className="text-base font-bold font-display text-foreground truncate hidden xs:block">Chann Back House</span>
          </Link>

          <div className="flex items-center gap-1 shrink-0">
            <NotificationBell />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLanguage(language === "en" ? "th" : "en")}
              className="h-8 w-8 rounded-full text-muted-foreground text-xs"
              data-testid="button-language-toggle-mobile"
            >
              <Globe className="w-3.5 h-3.5" />
            </Button>
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full h-9 w-9">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] p-0 border-r-0 bg-background">
                <div className="flex flex-col h-full">
                  <SheetHeader className="p-4 text-left border-b">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <LogoDataHouse size={36} />
                        <SheetTitle className="text-xl font-bold font-display">Chann Back House</SheetTitle>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
                        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                        data-testid="button-theme-toggle-mobile"
                      >
                        {theme === "dark" ? <Sun className="h-4 w-4 text-[#F5EB16]" /> : <Moon className="h-4 w-4 text-[#0033A0]" />}
                      </Button>
                    </div>
                  </SheetHeader>

                  <div className="bg-primary text-primary-foreground">
                    <div className="flex items-center justify-end px-4 pt-3 pb-1">
                      <button
                        className="text-xs text-primary-foreground/80 hover:text-primary-foreground underline flex items-center gap-1 transition-colors"
                        onClick={() => { logoutMutation.mutate(); setIsMobileMenuOpen(false); }}
                        data-testid="button-logout-mobile"
                      >
                        ออกจากระบบ <LogOut className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="flex items-center gap-3 px-4 pb-4">
                      <Avatar className="h-14 w-14 border-2 border-primary-foreground/30 shrink-0">
                        <AvatarImage src={user.profilePicture || ""} alt={user.fullName || ""} />
                        <AvatarFallback className="bg-primary-foreground/10 text-primary-foreground font-bold text-lg">
                          {user.username.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm leading-tight truncate">{user.fullName || user.username}</p>
                        <p className="text-xs text-primary-foreground/70 truncate mt-0.5">{displayEmail}</p>
                      </div>
                      {!isViewer && (
                        <Link href="/settings">
                          <a
                            className="p-1.5 rounded-full hover:bg-primary-foreground/10 transition-colors shrink-0"
                            onClick={() => setIsMobileMenuOpen(false)}
                            data-testid="button-edit-profile-mobile"
                          >
                            <Pencil className="h-3.5 w-3.5 text-primary-foreground/80" />
                          </a>
                        </Link>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
                    {mobileNavItems.map((item) => {
                      const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
                      return (
                        <Link key={item.href} href={item.href}>
                          <a
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                              isActive
                                ? "bg-primary/10 text-primary font-bold shadow-sm"
                                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                            }`}
                            data-testid={`nav-mobile-${item.href.replace("/", "")}`}
                          >
                            <item.icon className={`w-5 h-5 shrink-0 ${isActive ? "stroke-[2.5px]" : ""}`} />
                            <span className="text-base flex-1">{item.label}</span>
                            {item.badge != null && item.badge > 0 && (
                              <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none" data-testid="badge-announcements-mobile">
                                {item.badge > 99 ? "99+" : item.badge}
                              </span>
                            )}
                          </a>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </header>

        <main className="flex-1 container mx-auto px-4 py-6 pb-24">
          {children}
        </main>

        <BottomNav />
      </div>

      {/* ── DESKTOP LAYOUT — Sidebar ───────────────────────────────────── */}
      <div className="hidden md:flex h-screen overflow-hidden">

        {/* Sidebar */}
        <aside
          className={`flex flex-col border-r bg-card transition-all duration-250 ease-in-out shrink-0 ${
            sidebarCollapsed ? "w-[64px]" : "w-[220px]"
          }`}
        >
          {/* Logo row */}
          <div className={`flex items-center h-[60px] border-b shrink-0 ${sidebarCollapsed ? "justify-center px-0" : "px-4 justify-between"}`}>
            <Link href="/work" className="flex items-center gap-2.5 group min-w-0 overflow-hidden">
              <div className="shrink-0 transition-transform duration-300 group-hover:scale-105">
                <LogoDataHouse size={30} />
              </div>
              {!sidebarCollapsed && (
                <span className="font-bold text-sm font-display text-foreground truncate group-hover:text-primary transition-colors">
                  Chann Back House
                </span>
              )}
            </Link>
            {!sidebarCollapsed && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarCollapsed(true)}
                className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground shrink-0"
                data-testid="button-sidebar-collapse"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Expand button when collapsed */}
          {sidebarCollapsed && (
            <button
              onClick={() => setSidebarCollapsed(false)}
              className="flex justify-center items-center py-2 border-b text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
              data-testid="button-sidebar-expand"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          )}

          {/* Nav items */}
          <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
            {sidebarNavItems.map((item) => {
              const isActive =
                location === item.href ||
                (item.href !== "/" && location.startsWith(item.href));
              return (
                <Link key={item.href} href={item.href}>
                  <a
                    className={`relative flex items-center rounded-xl transition-all duration-150 group
                      ${sidebarCollapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5"}
                      ${isActive
                        ? "bg-primary/10 text-primary font-semibold"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      }`}
                    data-testid={`nav-sidebar-${item.href.replace("/", "")}`}
                    title={sidebarCollapsed ? item.label : undefined}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-[20%] h-[60%] w-[3px] bg-primary rounded-r-full" />
                    )}
                    <item.icon className={`w-[18px] h-[18px] shrink-0 ${isActive ? "stroke-[2.5px]" : "stroke-[1.8px]"}`} />
                    {!sidebarCollapsed && (
                      <>
                        <span className="text-[13.5px] flex-1 truncate">{item.label}</span>
                        {item.badge != null && item.badge > 0 && (
                          <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none" data-testid="badge-announcements-sidebar">
                            {item.badge > 99 ? "99+" : item.badge}
                          </span>
                        )}
                      </>
                    )}
                    {sidebarCollapsed && item.badge != null && item.badge > 0 && (
                      <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-card" />
                    )}
                  </a>
                </Link>
              );
            })}
          </nav>

          {/* Profile footer */}
          <div className={`border-t py-3 px-2 shrink-0`}>
            <div className={`flex items-center rounded-xl ${sidebarCollapsed ? "justify-center px-0 py-2" : "gap-2.5 px-3 py-2"}`}>
              <Avatar className="h-7 w-7 border border-primary/20 shrink-0">
                <AvatarImage src={user.profilePicture || ""} alt={user.fullName || ""} />
                <AvatarFallback className="bg-primary/10 text-primary font-bold text-[10px]">
                  {user.username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {!sidebarCollapsed && (
                <>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-foreground truncate leading-tight">{user.fullName || user.username}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{displayEmail}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => logoutMutation.mutate()}
                    className="h-6 w-6 rounded-full text-muted-foreground hover:text-destructive shrink-0"
                    data-testid="button-logout-sidebar"
                    title="ออกจากระบบ"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </aside>

        {/* Main area */}
        <div className="flex flex-col flex-1 overflow-hidden">

          {/* Desktop top bar */}
          <header className="flex items-center justify-between h-[56px] px-5 border-b bg-background/80 backdrop-blur-md shrink-0">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => window.history.back()}
                className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground shrink-0"
                data-testid="button-back-desktop"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              {activeNavItem && (
                <>
                  <div className="h-4 w-px bg-border" />
                  <span className="text-sm font-semibold text-foreground">{activeNavItem.label}</span>
                </>
              )}
            </div>
            <RightControls />
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-y-auto">
            <div className="px-4 md:px-5 lg:px-8 py-5 lg:py-6 max-w-screen-2xl w-full mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
