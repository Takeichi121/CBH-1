import { ReactNode, useState, useMemo, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { LogoDataHouse } from "@/components/logo";
import { Link, useLocation } from "wouter";
import { Briefcase, Calendar, Settings, LogOut, User, Menu, Moon, Sun, Shield, BarChart3, Package, FileText, BookOpen, LayoutDashboard, Pencil, Clock, ChevronDown, Bot, Globe, History, Store, ChevronUp, Megaphone, CalendarCheck, Sparkles, Smartphone } from "lucide-react";
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

  const isAdminLike = user?.role === 'admin' || user?.role === 'area';

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
  const effectiveStoreId = selectedStoreId || (stores[0]?.id) || 'BK1040';
  const currentStore = stores.find(s => s.id === effectiveStoreId) || stores[0];

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
    return <div className="min-h-screen bg-background">{children}</div>;
  }

  const isManagerOrAdmin = user.role === "manager" || user.role === "admin";
  const isViewer = user.role === "viewer";

  // Feature permission helper: admin always has full access; others check allowedFeatures
  const hasFeature = (key: string): boolean => {
    if (user.role === "admin") return true;
    if (!user.allowedFeatures) return true;
    return user.allowedFeatures.includes(key);
  };

  const announcementNavItem: NavItem = { href: "/announcements", label: language === "th" ? "ประกาศ" : "Announcements", icon: Megaphone, badge: unreadAnnouncementCount };

  const desktopNavItems: NavItem[] = isViewer ? [
    ...(hasFeature("sales") ? [{ href: "/sales", label: t("salesReport") || "Sales Report", icon: BarChart3 }] : []),
    ...(hasFeature("handbook") ? [{ href: "/handbook", label: t("employeeHandbook") || "Handbook", icon: BookOpen }] : []),
    announcementNavItem,
  ] : [
    ...(hasFeature("dashboard") ? [{ href: "/dashboard", label: t("dashboard") || "Dashboard", icon: LayoutDashboard }] : []),
    ...(hasFeature("work") ? [{ href: "/work", label: t("myWork") || "My Work", icon: Briefcase }] : []),
    ...(isManagerOrAdmin && hasFeature("sales") ? [
      { href: "/sales", label: t("salesReport") || "Sales Report", icon: BarChart3 },
    ] : []),
    ...(isManagerOrAdmin && hasFeature("borrow") ? [
      { href: "/borrow", label: t("borrowTracker") || "Borrow", icon: Package },
    ] : []),
    ...(isManagerOrAdmin ? [
      { href: "/attendance", label: language === "th" ? "เวลาทำงาน" : "Attendance", icon: CalendarCheck },
    ] : []),
    { href: "/mobile", label: language === "th" ? "มือถือ" : "Mobile", icon: Smartphone },
    { href: "/chann", label: "Chann AI", icon: Sparkles },
    announcementNavItem,
    ...(user.role === "admin" && hasFeature("admin") ? [
      { href: "/agent-requests", label: "Agent", icon: Bot },
    ] : []),
  ];

  const mobileNavItems: NavItem[] = isViewer ? [
    ...(hasFeature("sales") ? [{ href: "/sales", label: t("salesReport") || "Sales Report", icon: BarChart3 }] : []),
    ...(hasFeature("handbook") ? [{ href: "/handbook", label: t("employeeHandbook") || "Handbook", icon: BookOpen }] : []),
    announcementNavItem,
  ] : [
    ...(hasFeature("dashboard") ? [{ href: "/dashboard", label: t("dashboard") || "Dashboard", icon: LayoutDashboard }] : []),
    ...(hasFeature("work") ? [{ href: "/work", label: t("myWork") || "My Work", icon: Briefcase }] : []),
    ...(hasFeature("roster") ? [{ href: "/roster", label: t("roster") || "Roster", icon: Calendar }] : []),
    ...(isManagerOrAdmin && hasFeature("sales") ? [
      { href: "/sales", label: t("salesReport") || "Sales Report", icon: BarChart3 },
    ] : []),
    ...(isManagerOrAdmin && hasFeature("borrow") ? [
      { href: "/borrow", label: t("borrowTracker") || "Borrow", icon: Package },
    ] : []),
    ...(isManagerOrAdmin ? [
      { href: "/attendance", label: language === "th" ? "เวลาทำงาน" : "Attendance", icon: CalendarCheck },
    ] : []),
    ...(isManagerOrAdmin && hasFeature("requests") ? [
      { href: "/requests", label: t("managerRequest") || "Request", icon: FileText },
    ] : []),
    ...(isManagerOrAdmin && hasFeature("admin") ? [
      { href: "/admin", label: t("manageTeam") || "Manage Team", icon: Shield },
    ] : []),
    ...(user.role === "admin" && hasFeature("admin") ? [
      { href: "/agent-requests", label: "Agent", icon: Bot },
    ] : []),
    { href: "/mobile", label: language === "th" ? "มือถือ" : "Mobile", icon: Smartphone },
    { href: "/chann", label: "Chann AI", icon: Sparkles },
    announcementNavItem,
    ...(hasFeature("settings") ? [{ href: "/settings", label: t("settings") || "Settings", icon: Settings }] : []),
    ...(hasFeature("handbook") ? [{ href: "/handbook", label: t("employeeHandbook") || "Handbook", icon: BookOpen }] : []),
  ];

  const displayEmail = (user as any).email || user.username;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <OfflineIndicator />

      {/* Mobile Header */}
      <header className="md:hidden flex flex-col border-b sticky top-0 z-50 bg-background/80 backdrop-blur-md">
        <div className="h-14 flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <LogoDataHouse size={32} />
            <h1 className="text-lg font-bold font-display text-foreground">Chann Back House</h1>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLanguage(language === "en" ? "th" : "en")}
              className="gap-1 h-8 px-2.5 rounded-full border-primary/20 text-muted-foreground text-xs"
              data-testid="button-language-toggle-mobile"
            >
              <Globe className="w-3.5 h-3.5" />
              {language === "en" ? "TH" : "EN"}
            </Button>
            <Avatar className="h-9 w-9 border-2 border-primary/10" data-testid="avatar-mobile-header">
              <AvatarImage src={user.profilePicture || ""} alt={user.fullName || ""} />
              <AvatarFallback className="bg-primary/5 text-primary font-bold text-sm">
                {user.username.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        <div className="px-4 pb-2">
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full h-10 w-10">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] p-0 border-r-0 bg-background">
              <div className="flex flex-col h-full">

                {/* Mobile Sidebar — BK Logo Header */}
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

                {/* Mobile Sidebar — Profile Section (BK Portal style) */}
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

                {/* Mobile Sidebar — Nav Items */}
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

      {/* Desktop Header */}
      <header className="hidden md:flex h-16 items-center justify-between px-6 bg-background/80 backdrop-blur-md border-b sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-4">
          <Link href="/work" className="flex items-center gap-3 group">
            <div className="flex items-center justify-center transition-all duration-300 group-hover:scale-110">
              <LogoDataHouse size={40} />
            </div>
            <h1 className="text-xl font-bold font-display text-foreground hidden lg:block group-hover:text-primary transition-colors">Chann Back House</h1>
          </Link>
        </div>

        <nav className="flex items-center gap-1">
          {desktopNavItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href) && item.href !== "/work");
            const isWorkActive = item.href === "/work" && (location === "/work" || location.startsWith("/requests"));

            if (item.href === "/work" && isManagerOrAdmin) {
              return (
                <DropdownMenu key={item.href}>
                  <DropdownMenuTrigger asChild>
                    <button
                      className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-200 ${
                        isWorkActive
                          ? "bg-primary/10 text-primary font-semibold"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      }`}
                    >
                      <item.icon className="w-4 h-4" />
                      <span>{item.label}</span>
                      <ChevronDown className="w-3 h-3 opacity-60" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-44">
                    <DropdownMenuItem asChild>
                      <Link href="/work">
                        <a className="flex items-center gap-2 w-full cursor-pointer">
                          <Briefcase className="w-4 h-4 text-muted-foreground" />
                          <span>{t("myWork") || "My Work"}</span>
                        </a>
                      </Link>
                    </DropdownMenuItem>
                    {hasFeature("requests") && (
                      <DropdownMenuItem asChild>
                        <Link href="/requests">
                          <a className="flex items-center gap-2 w-full cursor-pointer">
                            <FileText className="w-4 h-4 text-muted-foreground" />
                            <span>{t("managerRequest") || "Request"}</span>
                          </a>
                        </Link>
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-200 ${
                  isActive
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
                data-testid={`nav-desktop-${item.href.replace("/", "")}`}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
                {item.badge != null && item.badge > 0 && (
                  <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none" data-testid="badge-announcements-desktop">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {/* Store Switcher (admin/area only, when multiple stores exist) */}
          {isAdminLike && stores.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 h-9 px-3 rounded-full border-primary/20 hover:bg-primary/5 text-muted-foreground hover:text-foreground transition-all max-w-[180px]"
                  data-testid="button-store-switcher"
                >
                  <Store className="w-4 h-4 shrink-0" />
                  <span className="text-xs font-medium truncate">{currentStore?.name || effectiveStoreId}</span>
                  <ChevronDown className="w-3 h-3 opacity-60 shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                {stores.filter(s => s.isActive === 1).map(store => (
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
            className="gap-1.5 h-9 px-3 rounded-full border-primary/20 hover:bg-primary/5 text-muted-foreground hover:text-foreground transition-all"
            data-testid="button-language-toggle"
          >
            <Globe className="w-4 h-4" />
            <span className="text-xs font-medium">{language === "en" ? "ไทย" : "EN"}</span>
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="rounded-full w-10 h-10 border-primary/20 hover:bg-primary/5 transition-all duration-300 relative overflow-hidden"
            data-testid="button-theme-toggle"
          >
            <div className="relative w-full h-full flex items-center justify-center">
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all duration-500 dark:-rotate-90 dark:scale-0 text-yellow-400" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all duration-500 dark:rotate-0 dark:scale-100 text-emerald-400" />
            </div>
            <span className="sr-only">Toggle theme</span>
          </Button>

          <NotificationBell />

          {/* Desktop Profile Dropdown — BK Portal Style */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full" data-testid="button-profile-dropdown">
                <Avatar className="h-10 w-10 border-2 border-primary/10">
                  <AvatarImage src={user.profilePicture || ""} alt={user.fullName || ""} />
                  <AvatarFallback className="bg-primary/5 text-primary font-bold">
                    {user.username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-72 p-0 overflow-hidden" align="end" forceMount>

              {/* Profile Header — Brown/Primary */}
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

              {/* Menu Items */}
              <div className="py-1">
                {!isViewer && hasFeature("work") && (
                  <DropdownMenuItem asChild className="cursor-pointer px-4 py-2.5 gap-3">
                    <Link href="/work">
                      <a className="flex items-center gap-3 w-full" data-testid="dropdown-nav-home">
                        <Briefcase className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span>Home (My Work)</span>
                      </a>
                    </Link>
                  </DropdownMenuItem>
                )}
                {!isViewer && hasFeature("settings") && (
                  <DropdownMenuItem asChild className="cursor-pointer px-4 py-2.5 gap-3">
                    <Link href="/settings">
                      <a className="flex items-center gap-3 w-full" data-testid="dropdown-nav-profile">
                        <User className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span>โปรไฟล์ของฉัน</span>
                      </a>
                    </Link>
                  </DropdownMenuItem>
                )}
                {!isViewer && hasFeature("admin") && (
                  <DropdownMenuItem asChild className="cursor-pointer px-4 py-2.5 gap-3">
                    <Link href="/admin">
                      <a className="flex items-center gap-3 w-full" data-testid="dropdown-nav-activity">
                        <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span>กิจกรรมของฉัน</span>
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
                {!isViewer && hasFeature("handbook") && (
                  <DropdownMenuItem asChild className="cursor-pointer px-4 py-2.5 gap-3">
                    <Link href="/handbook">
                      <a className="flex items-center gap-3 w-full" data-testid="dropdown-nav-changelog">
                        <History className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span>{language === "th" ? "ประวัติเวอร์ชัน" : "Version History"}</span>
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
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-6 md:py-8 pb-8">
        {children}
      </main>

      <BottomNav />
    </div>
  );
}
