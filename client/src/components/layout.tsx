import { ReactNode, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { Briefcase, Calendar, Settings, LogOut, User, Menu, Moon, Sun, X } from "lucide-react";
import { SiBurgerking } from "react-icons/si";
import { useTheme } from "next-themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export function Layout({ children }: { children: ReactNode }) {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();
  const { theme, setTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (!user) {
    return <div className="min-h-screen bg-background">{children}</div>;
  }

  const isManager = user.role === "manager" || user.role === "admin";

  const navItems = [
    { href: "/work", label: t("myWork") || "My Work", icon: Briefcase },
    { href: "/roster", label: t("roster") || "Roster", icon: Calendar },
    ...(isManager ? [{ href: "/settings", label: t("settings") || "Settings", icon: Settings }] : []),
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Mobile Header */}
      <header className="md:hidden h-16 flex items-center justify-between px-4 border-b sticky top-0 z-50 bg-background/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <SiBurgerking className="w-8 h-8 text-[#ED1C24]" />
          <h1 className="text-lg font-bold font-display text-foreground">Grand Diamond</h1>
        </div>
        
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] p-0 border-r-0 bg-background">
            <div className="flex flex-col h-full">
              <SheetHeader className="p-6 border-b text-left">
                <div className="flex items-center gap-3">
                  <SiBurgerking className="w-10 h-10 text-[#ED1C24]" />
                  <SheetTitle className="text-xl font-bold font-display">BK Roster</SheetTitle>
                </div>
              </SheetHeader>
              
              <div className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
                {navItems.map((item) => {
                  const isActive = location === item.href;
                  return (
                    <Link key={item.href} href={item.href}>
                      <a 
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 ${
                          isActive 
                            ? "bg-primary/10 text-primary font-bold shadow-sm" 
                            : "text-muted-foreground hover:bg-muted/50"
                        }`}
                      >
                        <item.icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : ''}`} />
                        <span className="text-base">{item.label}</span>
                      </a>
                    </Link>
                  );
                })}
              </div>

              <div className="p-6 border-t space-y-4">
                <div className="flex items-center gap-4 px-4">
                  <Avatar className="h-10 w-10 border-2 border-primary/10">
                    <AvatarFallback className="bg-primary/5 text-primary font-bold">
                      {user.username.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col overflow-hidden">
                    <p className="text-sm font-bold truncate">{user.fullName}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.username}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    className="rounded-xl flex flex-col h-16 items-center justify-center gap-1 border-primary/10 hover:bg-primary/5"
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  >
                    {theme === "dark" ? <Sun className="w-5 h-5 text-[#F5EB16]" /> : <Moon className="w-5 h-5 text-[#0033A0]" />}
                    <span className="text-[10px] font-bold">Theme</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-xl flex flex-col h-16 items-center justify-center gap-1 border-destructive/10 hover:bg-destructive/5 text-destructive"
                    onClick={() => logoutMutation.mutate()}
                  >
                    <LogOut className="w-5 h-5" />
                    <span className="text-[10px] font-bold">Log out</span>
                  </Button>
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </header>

      {/* Desktop Header */}
      <header className="hidden md:flex h-16 items-center justify-between px-6 bg-background/80 backdrop-blur-md border-b sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-4">
          <Link href="/work" className="flex items-center gap-3 group">
            <div className="h-10 w-10 flex items-center justify-center transition-all duration-300 group-hover:scale-110">
              <SiBurgerking className="w-full h-full text-[#ED1C24]" />
            </div>
            <h1 className="text-xl font-bold font-display text-foreground hidden lg:block group-hover:text-primary transition-colors">Grand Diamond</h1>
          </Link>
        </div>

        <nav className="flex items-center gap-6">
          {navItems.map((item) => {
            const isActive = location === item.href;
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

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10 border-2 border-primary/10">
                  <AvatarFallback className="bg-primary/5 text-primary font-bold">
                    {user.username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user.fullName}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.username} • {user.role}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => logoutMutation.mutate()} className="text-destructive focus:text-destructive cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-6 md:py-8">
        {children}
      </main>
    </div>
  );
}
