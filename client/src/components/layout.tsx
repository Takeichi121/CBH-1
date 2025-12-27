import { ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { Briefcase, Calendar, Settings, LogOut, User, Menu, Moon, Sun } from "lucide-react";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export function Layout({ children }: { children: ReactNode }) {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();
  const { theme, setTheme } = useTheme();

  if (!user) {
    return <div className="min-h-screen bg-background">{children}</div>;
  }

  const isManager = user.role === "manager" || user.role === "admin";

  const navItems = [
    { href: "/work", label: "My Work", icon: Briefcase },
    { href: "/roster", label: "Roster", icon: Calendar },
    ...(isManager ? [{ href: "/settings", label: "Settings", icon: Settings }] : []),
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
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
      <main className="flex-1 container mx-auto px-4 py-6 md:py-8 pb-24 md:pb-8">
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-lg border-t safe-area-pb z-50 shadow-[0_-5px_20px_rgba(0,0,0,0.05)] dark:shadow-[0_-5px_20px_rgba(0,0,0,0.3)]">
        <div className="flex justify-around items-center h-16 px-2">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center w-full h-full transition-all duration-300 ${
                  isActive ? "text-primary scale-110" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <div className={`p-2 rounded-xl transition-colors ${isActive ? 'bg-primary/10' : ''}`}>
                  <item.icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : ''}`} />
                </div>
                <span className={`text-[10px] font-bold mt-1 transition-opacity ${isActive ? 'opacity-100' : 'opacity-70'}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
          <div 
            className="flex flex-col items-center justify-center w-full h-full text-muted-foreground active:scale-95 transition-transform" 
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <div className="p-2 rounded-xl">
              {theme === "dark" ? <Sun className="w-5 h-5 text-[#F5EB16]" /> : <Moon className="w-5 h-5 text-[#0033A0]" />}
            </div>
            <span className="text-[10px] font-bold mt-1 opacity-70">Theme</span>
          </div>
        </div>
      </nav>
    </div>
  );
}
