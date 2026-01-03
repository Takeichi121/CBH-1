import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { LoadingScreen } from "@/components/loading-screen";
import { Card } from "@/components/ui/card";
import { Users, UserCog } from "lucide-react";

export default function WorkIndexPage() {
  const { user, isLoading } = useAuth();
  const { t } = useI18n();

  if (isLoading) return <LoadingScreen />;

  const isManager = user?.role === "manager" || user?.role === "admin";

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6">
      <h1 className="text-2xl font-bold mb-8">{t("selectScheduleView") || "Select Schedule View"}</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl w-full">
        <Link href="/work/employee">
          <Card className="p-8 flex flex-col items-center text-center cursor-pointer hover-elevate transition-all">
            <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-lg font-semibold mb-2">{t("employeeSchedule") || "Employee Schedule"}</h2>
            <p className="text-sm text-muted-foreground">
              {t("employeeScheduleDesc") || "View and manage all employee schedules"}
            </p>
          </Card>
        </Link>

        {isManager && (
          <Link href="/work/manager">
            <Card className="p-8 flex flex-col items-center text-center cursor-pointer hover-elevate transition-all">
              <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <UserCog className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-lg font-semibold mb-2">{t("managerSchedule") || "Manager Schedule"}</h2>
              <p className="text-sm text-muted-foreground">
                {t("managerScheduleDesc") || "View your own monthly schedule"}
              </p>
            </Card>
          </Link>
        )}
      </div>
    </div>
  );
}
