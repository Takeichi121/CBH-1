import { ReactNode, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { LogoDataHouse } from "@/components/logo";
import { Link, useLocation } from "wouter";
import { Briefcase, Calendar, Settings, LogOut, User, Menu, Moon, Sun, Shield, BarChart3, Package, FileText, BookOpen, LayoutDashboard, Pencil, Clock, ChevronDown, Bot, Globe, History } from "lucide-react";
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

import { useI18n } from "@/hooks/use-i18n";

export function Layout({ children }: { children: ReactNode }) {
  const { user, logoutMutation } = useAuth();
  const { t, language, setLanguage } = useI18n();
  const [location] = useLocation();
  const { theme, setTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (!user) {
    return <div className="min-h-screen bg-background">{children}</div>;
  }

  const isManagerOrAdmin = user.role === "manager" || user.role === "admin";

  const desktopNavItems = [
    { href: "/dashboard", label: t("dashboard") || "Dashboard", icon: LayoutDashboard },
    { href: "/work", label: t("myWork") || "My Work", icon: Briefcase },
    ...(isManagerOrAdmin ? [
      { href: "/sales", label: t("salesReport") || "Sales Report", icon: BarChart3 },
      { href: "/borrow", label: t("borrowTracker") || "Borrow", icon: Package },
    ] : []),
    ...(user.role === "admin" ? [
      { href: "/agent-requests", label: "Agent", icon: Bot },
    ] : []),
  ];

  const mobileNavItems = [
    { href: "/dashboard", label: t("dashboard") || "Dashboard", icon: LayoutDashboard },
    { href: "/work", label: t("myWork") || "My Work", icon: Briefcase },
    { href: "/roster", label: t("roster") || "Roster", icon: Calendar },
    ...(isManagerOrAdmin ? [
      { href: "/sales", label: t("salesReport") || "Sales Report", icon: BarChart3 },
      { href: "/borrow", label: t("borrowTracker") || "Borrow", icon: Package },
      { href: "/requests", label: t("managerRequest") || "Request", icon: FileText },
      { href: "/admin", label: t("manageTeam") || "Manage Team", icon: Shield },
    ] : []),
    ...(user.role === "admin" ? [
      { href: "/agent-requests", label: "Agent", icon: Bot },
    ] : []),
    { href: "/settings", label: t("settings") || "Settings", icon: Settings },
    { href: "/handbook", label: t("employeeHandbook") || "Handbook", icon: BookOpen },
  ];

  const displayEmail = (user as any).email || user.username;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Orange Brand Top Bar */}
      <div className="w-full h-8 flex items-center px-4 gap-2 shrink-0" style={{ backgroundColor: "#F58220" }}>
        <LogoDataHouse size={20} />
        <span className="text-white text-sm font-semibold font-display tracking-wide">Chann Back House</span>
      </div>

      <OfflineIndicator />

      {/* Mobile Header */}
      <header className="md:hidden flex flex-col border-b sticky top-0 z-50 bg-background/80 backdrop-blur-md">
        <div className="h-14 flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <LogoDataHouse size={32} />
            <h1 className="text-lg font-bold font-display text-foreground">Chann Back House</h1>
          </div>
          <div className="flex items-center gap-2">
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
                    <Link href="/settings">
                      <a
                        className="p-1.5 rounded-full hover:bg-primary-foreground/10 transition-colors shrink-0"
                        onClick={() => setIsMobileMenuOpen(false)}
                        data-testid="button-edit-profile-mobile"
                      >
                        <Pencil className="h-3.5 w-3.5 text-primary-foreground/80" />
                      </a>
                    </Link>
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
                          <span className="text-base">{item.label}</span>
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
                    <DropdownMenuItem asChild>
                      <Link href="/requests">
                        <a className="flex items-center gap-2 w-full cursor-pointer">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          <span>{t("managerRequest") || "Request"}</span>
                        </a>
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-200 ${
                  isActive
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
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
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all duration-500 dark:-rotate-90 dark:scale-0 text-[#F5EB16]" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all duration-500 dark:rotate-0 dark:scale-100 text-[#0033A0]" />
            </div>
            <span className="sr-only">Toggle theme</span>
          </Button>

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
                  <Link href="/settings">
                    <a className="p-1.5 rounded-full hover:bg-primary-foreground/10 transition-colors shrink-0" data-testid="button-edit-profile-desktop">
                      <Pencil className="h-3.5 w-3.5 text-primary-foreground/80" />
                    </a>
                  </Link>
                </div>
              </div>

              {/* Menu Items */}
              <div className="py-1">
                <DropdownMenuItem asChild className="cursor-pointer px-4 py-2.5 gap-3">
                  <Link href="/work">
                    <a className="flex items-center gap-3 w-full" data-testid="dropdown-nav-home">
                      <Briefcase className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span>Home (My Work)</span>
                    </a>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer px-4 py-2.5 gap-3">
                  <Link href="/settings">
                    <a className="flex items-center gap-3 w-full" data-testid="dropdown-nav-profile">
                      <User className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span>โปรไฟล์ของฉัน</span>
                    </a>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer px-4 py-2.5 gap-3">
                  <Link href="/admin">
                    <a className="flex items-center gap-3 w-full" data-testid="dropdown-nav-activity">
                      <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span>กิจกรรมของฉัน</span>
                    </a>
                  </Link>
                </DropdownMenuItem>
                {isManagerOrAdmin && (
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
                  <Link href="/handbook">
                    <a className="flex items-center gap-3 w-full" data-testid="dropdown-nav-handbook">
                      <BookOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span>{language === "th" ? "คู่มือพนักงาน" : "Handbook"}</span>
                    </a>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer px-4 py-2.5 gap-3">
                  <Link href="/handbook">
                    <a className="flex items-center gap-3 w-full" data-testid="dropdown-nav-changelog">
                      <History className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span>{language === "th" ? "ประวัติเวอร์ชัน" : "Version History"}</span>
                    </a>
                  </Link>
                </DropdownMenuItem>
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
