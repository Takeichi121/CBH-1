import { useState } from "react";
import { useI18n } from "@/hooks/use-i18n";
import { useRoster } from "@/hooks/use-shifts";
import { useSettings } from "@/hooks/use-settings";
import { useAuth } from "@/hooks/use-auth";
import { format, addWeeks, subWeeks, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, EyeOff, Eye, Settings } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { api } from "@shared/routes";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { WorkLayout } from "./work-layout";
import { Link } from "wouter";

const getShiftDisplayName = (shiftGroup: string): string => {
  if (shiftGroup?.toLowerCase() === 'late') return 'Late Night';
  return shiftGroup;
};

function ManagerPageSkeleton() {
  return (
    <WorkLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    </WorkLayout>
  );
}

function HiddenStaffDialog({ users, onUpdateStatus }: { users: any[], onUpdateStatus: (username: string, active: number) => void }) {
  const { t } = useI18n();
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2" data-testid="button-hidden-staff">
          <EyeOff className="w-4 h-4" />
          {t("hiddenStaff")} ({users.length})
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("hiddenStaff")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          {users.map((u: any) => (
            <div key={u.username} className="flex items-center justify-between p-2 bg-muted/50 rounded">
              <span>{u.nickName || u.fullName || u.username}</span>
              <Button size="sm" variant="outline" onClick={() => onUpdateStatus(u.username, 1)} data-testid={`button-show-${u.username}`}>
                <Eye className="w-4 h-4 mr-1" />
                {t("show")}
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function WorkManagerPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [currentDate, setCurrentDate] = useState(new Date());
  const queryClient = useQueryClient();
  
  const dateParam = format(currentDate, "yyyy-MM-dd");
  const { data: rosterData, isLoading } = useRoster(dateParam);
  const { data: settings } = useSettings();

  const handleUpdateUserStatus = (username: string, active: number) => {
    if (confirm(active === 0 ? "Hide/Disable this staff member?" : "Show/Enable this staff member?")) {
      const token = localStorage.getItem("bk_token") || "";
      apiRequest("POST", "/api/updateUserStatus", { token, username, active })
        .then(() => {
          queryClient.invalidateQueries({ queryKey: [api.shifts.getRoster.path] });
        });
    }
  };

  const handlePrevWeek = () => setCurrentDate(subWeeks(currentDate, 1));
  const handleNextWeek = () => setCurrentDate(addWeeks(currentDate, 1));

  if (isLoading) return <ManagerPageSkeleton />;

  const weekRange = rosterData?.weekRange;
  const days = weekRange?.days || [];
  const displayRange = weekRange?.start ? `${format(new Date(weekRange.start), "MMM d")} - ${format(new Date(weekRange.end), "MMM d, yyyy")}` : "";
  
  const activeStaff = rosterData?.users?.filter((u: any) => u.active === 1 && u.role === "staff") || [];
  const hiddenStaff = rosterData?.users?.filter((u: any) => u.active === 0 && u.role === "staff") || [];
  
  const getRosterShiftsByUser = (username: string): Record<string, any> => {
    const shifts: Record<string, any> = {};
    rosterData?.roster?.filter((s: any) => s.username === username).forEach((s: any) => {
      shifts[s.date] = s;
    });
    return shifts;
  };

  return (
    <WorkLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground" data-testid="text-page-title">{t("managerConsole")}</h2>
            <p className="text-muted-foreground flex items-center gap-2 mt-1">
              <CalendarIcon className="w-4 h-4" />
              {displayRange}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {hiddenStaff.length > 0 && (
              <HiddenStaffDialog users={hiddenStaff} onUpdateStatus={handleUpdateUserStatus} />
            )}
            <Link href="/settings">
              <Button variant="outline" size="sm" className="gap-2" data-testid="link-settings">
                <Settings className="w-4 h-4" />
                {t("settings")}
              </Button>
            </Link>
            <div className="flex items-center bg-muted/30 p-1 rounded-full border border-border/50">
              <Button variant="ghost" size="icon" onClick={handlePrevWeek} className="h-8 w-8 rounded-full" data-testid="button-prev-week">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="h-4 w-px bg-border/50 mx-1" />
              <Button variant="ghost" size="icon" onClick={handleNextWeek} className="h-8 w-8 rounded-full" data-testid="button-next-week">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Full Roster View */}
        <Card className="glass-card overflow-hidden border-none shadow-xl">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="w-[150px] font-bold text-sm sticky left-0 bg-muted/50 z-10">Staff</TableHead>
                  {days.map((day: string) => (
                    <TableHead key={day} className="text-center min-w-[100px] p-2">
                      <div className="flex flex-col items-center py-2">
                        <span className="text-sm uppercase text-destructive font-black tracking-tighter">
                          {t(format(parseISO(day), "EEEE").toLowerCase() as any).slice(0, 3)}
                        </span>
                        <span className="text-2xl font-black text-foreground">
                          {format(parseISO(day), "d")}
                        </span>
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeStaff.map((u: any) => {
                  const staffShifts = getRosterShiftsByUser(u.username);
                  return (
                    <TableRow key={u.username} className="hover:bg-muted/10 transition-colors">
                      <TableCell className="font-medium p-2 sticky left-0 bg-background z-10">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{u.nickName || u.fullName || u.username}</span>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 opacity-50 hover:opacity-100"
                            onClick={() => handleUpdateUserStatus(u.username, 0)}
                            data-testid={`button-hide-${u.username}`}
                          >
                            <EyeOff className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                      {days.map((day: string) => {
                        const s = staffShifts[day];
                        return (
                          <TableCell key={day} className="p-1">
                            {s ? (() => {
                              const [start, end] = s.startTime.split(' - ');
                              return (
                                <div className={`h-14 w-full rounded p-1 border flex flex-col justify-center items-center gap-0
                                  ${s.shiftGroup === 'open' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                    s.shiftGroup === 'swing' ? 'bg-cyan-50 text-cyan-600 border-cyan-100' :
                                    s.shiftGroup === 'lunch' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                                    s.shiftGroup === 'dinner' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                                    s.shiftGroup === 'close' ? 'bg-pink-50 text-pink-600 border-pink-100' :
                                    s.shiftGroup === 'late' ? 'bg-slate-700 text-slate-100 border-slate-600' :
                                    'bg-slate-50 text-slate-600 border-slate-100'}`}>
                                  <span className="text-[10px] font-bold uppercase">{getShiftDisplayName(s.shiftGroup)}</span>
                                  <span className="text-[8px]">Start: {start}</span>
                                  <span className="text-[8px]">End: {end}</span>
                                </div>
                              );
                            })() : (
                              <div className="h-14 w-full rounded bg-red-50/50 dark:bg-red-950/20 border border-red-200/30 dark:border-red-900/20 flex items-center justify-center">
                                <span className="text-xs font-medium text-red-400/70 dark:text-red-400/50">OFF</span>
                              </div>
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </WorkLayout>
  );
}
