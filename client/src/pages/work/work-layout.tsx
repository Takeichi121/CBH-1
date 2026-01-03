import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Users, UserCog, Calendar } from "lucide-react";

interface WorkLayoutProps {
  children: React.ReactNode;
}

export function WorkLayout({ children }: WorkLayoutProps) {
  const { user } = useAuth();
  const { t } = useI18n();
  const [location] = useLocation();
  const isManager = user?.role === "manager" || user?.role === "admin";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 border-b pb-3">
        <Link href="/work/employee">
          <Button 
            variant={location === "/work/employee" ? "default" : "ghost"} 
            size="sm"
            className="gap-2"
            data-testid="link-work-employee"
          >
            <Calendar className="w-4 h-4" />
            {t("mySchedule")}
          </Button>
        </Link>
        {isManager && (
          <Link href="/work/manager">
            <Button 
              variant={location === "/work/manager" ? "default" : "ghost"} 
              size="sm"
              className="gap-2"
              data-testid="link-work-manager"
            >
              <UserCog className="w-4 h-4" />
              {t("managerConsole")}
            </Button>
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}
