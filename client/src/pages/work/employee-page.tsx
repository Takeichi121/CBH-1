import { useState } from "react";
import { useI18n } from "@/hooks/use-i18n";
import { useMyWeek, useRoster, useCancelShift } from "@/hooks/use-shifts";
import { useSettings } from "@/hooks/use-settings";
import { useAuth } from "@/hooks/use-auth";
import { format, addDays, addWeeks, subWeeks, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, AlertCircle, Eye, Users } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { api } from "@shared/routes";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { WorkLayout } from "./work-layout";
import { BookShiftDialog } from "@/components/book-shift-dialog";

const getShiftDisplayName = (shiftGroup: string): string => {
  if (shiftGroup?.toLowerCase() === 'late') return 'Late Night';
  return shiftGroup;
};

const SHIFT_ORDER: Record<string, number> = {
  'open': 0,
  'lunch': 1, 
  'swing': 2,
  'dinner': 3,
  'close': 4,
  'late': 5
};

const getShiftOrder = (shiftGroup: string | undefined): number => {
  if (!shiftGroup) return -1;
  const order = SHIFT_ORDER[shiftGroup.toLowerCase()];
  return order !== undefined ? order : 99;
};

function EmployeePageSkeleton() {
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

export default function WorkEmployeePage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [mobileDayPairIndex, setMobileDayPairIndex] = useState(0);
  const [showAll7Days, setShowAll7Days] = useState(true);
  
  const dateParam = format(currentDate, "yyyy-MM-dd");
  const { data, isLoading, error } = useMyWeek(dateParam);
  const { data: rosterData, isLoading: isLoadingRoster } = useRoster(dateParam);
  const { data: settings } = useSettings();
  const { mutate: cancelShift } = useCancelShift();
  const queryClient = useQueryClient();

  const handlePrevWeek = () => setCurrentDate(subWeeks(currentDate, 1));
  const handleNextWeek = () => setCurrentDate(addWeeks(currentDate, 1));

  if (isLoading || isLoadingRoster) return <EmployeePageSkeleton />;
  if (error) return <div className="p-8 text-center text-red-500">Error loading schedule: {error.message}</div>;

  const weekStartStr = data?.weekRange?.start;
  const weekEndStr = data?.weekRange?.end;
  const allDays = data?.weekRange?.days || [];
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const tomorrowStr = format(addDays(new Date(), 1), "yyyy-MM-dd");
  const days = allDays;
  const displayRange = weekStartStr ? `${format(new Date(weekStartStr), "MMM d")} - ${format(new Date(weekEndStr), "MMM d, yyyy")}` : "";

  const myShiftsByDate: Record<string, any> = {};
  data?.items?.forEach((s: any) => {
    myShiftsByDate[s.date] = s;
  });
  
  const getRosterShiftsByUser = (username: string): Record<string, any> => {
    const shifts: Record<string, any> = {};
    rosterData?.roster?.filter((s: any) => s.username === username).forEach((s: any) => {
      shifts[s.date] = s;
    });
    return shifts;
  };

  const allStaff = rosterData?.users?.filter((u: any) => u.active === 1 && u.role === "staff") || [];

  return (
    <WorkLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground" data-testid="text-page-title">{t("mySchedule")}</h2>
            <p className="text-muted-foreground flex items-center gap-2 mt-1">
              <CalendarIcon className="w-4 h-4" />
              {displayRange}
            </p>
          </div>
          
          <div className="flex items-center gap-1.5 md:gap-2">
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

        {data?.closed && (
          <Alert variant="destructive" className="bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800 text-orange-800 dark:text-orange-200">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t("systemClosed")}</AlertTitle>
            <AlertDescription>{t("systemClosed")}</AlertDescription>
          </Alert>
        )}

        {/* Mobile View */}
        <Card className="glass-card overflow-hidden border-none shadow-xl md:hidden">
          <div className="p-2">
            {(() => {
              const dayPairs: string[][] = [];
              if (days.length >= 7) {
                dayPairs.push([days[0], days[1]]);
                dayPairs.push([days[2], days[3]]);
                dayPairs.push([days[4], days[5], days[6]]);
              } else if (days.length >= 2) {
                dayPairs.push(days.slice(0, 2));
                if (days.length >= 4) dayPairs.push(days.slice(2, 4));
                if (days.length >= 5) dayPairs.push(days.slice(4));
              }
              
              const currentPair = showAll7Days ? days : (dayPairs[mobileDayPairIndex] || days.slice(0, 2));
              
              const getPairLabel = (index: number): string => {
                if (!dayPairs[index]) return "";
                const pair = dayPairs[index];
                const dayNames = pair.map(d => t(format(parseISO(d), "EEEE").toLowerCase() as any).slice(0, 3));
                return dayNames.join(" - ");
              };
              
              const prevIndex = mobileDayPairIndex > 0 ? mobileDayPairIndex - 1 : null;
              const nextIndex = mobileDayPairIndex < dayPairs.length - 1 ? mobileDayPairIndex + 1 : null;
              
              return (
                <>
                  <div className="flex items-center justify-between mb-2 gap-1">
                    <div className="flex-1">
                      {!showAll7Days && prevIndex !== null && (
                        <Button variant="ghost" size="sm" onClick={() => setMobileDayPairIndex(prevIndex)} className="text-[10px] px-1 h-7" data-testid="button-prev-days">
                          <ChevronLeft className="w-3 h-3" />
                          {getPairLabel(prevIndex)}
                        </Button>
                      )}
                    </div>
                    
                    <Button variant={showAll7Days ? "default" : "outline"} size="sm" onClick={() => setShowAll7Days(!showAll7Days)} className="text-[10px] gap-1 px-2 h-7" data-testid="button-toggle-view-all">
                      {showAll7Days ? <Eye className="w-3 h-3" /> : <Users className="w-3 h-3" />}
                      {showAll7Days ? t("filtered") : t("viewAll")}
                    </Button>
                    
                    <div className="flex-1 flex justify-end">
                      {!showAll7Days && nextIndex !== null && (
                        <Button variant="ghost" size="sm" onClick={() => setMobileDayPairIndex(nextIndex)} className="text-[10px] px-1 h-7" data-testid="button-next-days">
                          {getPairLabel(nextIndex)}
                          <ChevronRight className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableHead className="w-[70px] font-bold text-[10px]">Staff</TableHead>
                        {currentPair.map((day: string) => (
                          <TableHead key={day} className="text-center min-w-[50px] p-0.5">
                            <div className="flex flex-col items-center py-0.5">
                              <span className="text-sm uppercase text-destructive font-black tracking-tighter">
                                {t(format(parseISO(day), "EEEE").toLowerCase() as any).slice(0, 3)}
                              </span>
                              <span className="text-lg font-black text-foreground">
                                {format(parseISO(day), "d")}
                              </span>
                            </div>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {user?.role === "staff" && (
                        <TableRow className="hover:bg-muted/30 transition-colors bg-primary/5">
                          <TableCell className="font-medium p-1">
                            <div className="flex flex-col">
                              <span className="font-bold text-primary text-[10px]">ME</span>
                            </div>
                          </TableCell>
                          {currentPair.map((day: string) => {
                            const shift = myShiftsByDate[day];
                            return (
                              <TableCell key={day} className="p-0.5">
                                {shift ? (
                                  <div 
                                    className={`h-9 w-full rounded p-0.5 border shadow-sm flex flex-col justify-center items-center cursor-pointer hover:brightness-95 transition-all
                                      ${shift.shiftGroup === 'open' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                        shift.shiftGroup === 'swing' ? 'bg-cyan-100 text-cyan-700 border-cyan-200' :
                                        shift.shiftGroup === 'lunch' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                                        shift.shiftGroup === 'dinner' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                                        shift.shiftGroup === 'close' ? 'bg-pink-100 text-pink-700 border-pink-200' :
                                        shift.shiftGroup === 'late' ? 'bg-slate-700 text-slate-100 border-slate-600' :
                                        'bg-slate-100 text-slate-700 border-slate-200'}`}
                                    onClick={() => {
                                      if (!data.closed && confirm("Are you sure you want to cancel this shift?")) {
                                        cancelShift(day);
                                      }
                                    }}
                                  >
                                    <span className="text-[7px] font-bold uppercase">{getShiftDisplayName(shift.shiftGroup)}</span>
                                    <span className="text-[8px]">{shift.startTime}</span>
                                  </div>
                                ) : (
                                  <BookShiftDialog groups={settings?.groups} day={day} disabled={data.closed} settings={settings}>
                                    <div className={`h-9 w-full rounded border border-dashed border-red-200/50 bg-red-50/50 dark:bg-red-950/20 dark:border-red-900/30 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer flex items-center justify-center group ${data.closed ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                      <span className="text-[9px] font-medium text-red-400/70 dark:text-red-400/50 group-hover:hidden">OFF</span>
                                      <Plus className="w-3 h-3 text-primary/50 group-hover:text-primary hidden group-hover:block" />
                                    </div>
                                  </BookShiftDialog>
                                )}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      )}
                      {allStaff.filter((u: any) => u.username !== user?.username).map((u: any) => {
                        const staffShifts = getRosterShiftsByUser(u.username);
                        return (
                          <TableRow key={u.username} className="hover:bg-muted/10 transition-colors">
                            <TableCell className="font-medium text-[9px] py-0.5 px-1">
                              <span className="font-medium text-muted-foreground truncate max-w-[65px] block">{u.nickName || u.fullName || u.username}</span>
                            </TableCell>
                            {currentPair.map((day: string) => {
                              const s = staffShifts[day];
                              return (
                                <TableCell key={day} className="p-0.5">
                                  {s ? (() => {
                                    const [start, end] = s.startTime.split(' - ');
                                    return showAll7Days ? (
                                      <div className={`h-14 w-full rounded p-0.5 border flex flex-col justify-center items-center gap-0
                                        ${s.shiftGroup === 'open' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                          s.shiftGroup === 'swing' ? 'bg-cyan-50 text-cyan-600 border-cyan-100' :
                                          s.shiftGroup === 'lunch' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                                          s.shiftGroup === 'dinner' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                                          s.shiftGroup === 'close' ? 'bg-pink-50 text-pink-600 border-pink-100' :
                                          s.shiftGroup === 'late' ? 'bg-slate-700 text-slate-100 border-slate-600' :
                                          'bg-slate-50 text-slate-600 border-slate-100'}`}>
                                        <span className="text-[7px] font-bold uppercase leading-tight">{getShiftDisplayName(s.shiftGroup)}</span>
                                        <span className="text-[5px] leading-tight">Start : {start}</span>
                                        <span className="text-[5px] leading-tight">End : {end}</span>
                                      </div>
                                    ) : (
                                      <div className={`h-8 w-full rounded p-0.5 border flex flex-col justify-center items-center gap-0
                                        ${s.shiftGroup === 'open' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                          s.shiftGroup === 'swing' ? 'bg-cyan-50 text-cyan-600 border-cyan-100' :
                                          s.shiftGroup === 'lunch' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                                          s.shiftGroup === 'dinner' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                                          s.shiftGroup === 'close' ? 'bg-pink-50 text-pink-600 border-pink-100' :
                                          s.shiftGroup === 'late' ? 'bg-slate-700 text-slate-100 border-slate-600' :
                                          'bg-slate-50 text-slate-600 border-slate-100'}`}>
                                        <span className="text-[6px] font-bold uppercase leading-tight">{getShiftDisplayName(s.shiftGroup)}</span>
                                        <span className="text-[6px] leading-tight">{s.startTime}</span>
                                      </div>
                                    );
                                  })() : (
                                    <div className={`${showAll7Days ? 'h-14' : 'h-8'} w-full rounded bg-red-50/50 dark:bg-red-950/20 border border-red-200/30 dark:border-red-900/20 flex items-center justify-center`}>
                                      <span className="text-[7px] font-medium text-red-400/70 dark:text-red-400/50">OFF</span>
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
                </>
              );
            })()}
          </div>
        </Card>

        {/* Desktop View */}
        <Card className="glass-card overflow-hidden border-none shadow-xl hidden md:block">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="w-[150px] font-bold text-sm">Staff</TableHead>
                  {days.map((day: string) => (
                    <TableHead key={day} className="text-center min-w-[120px] p-2">
                      <div className="flex flex-col items-center py-2">
                        <span className="text-sm uppercase text-destructive font-black tracking-tighter">
                          {t(format(parseISO(day), "EEEE").toLowerCase() as any).slice(0, 3)}
                        </span>
                        <span className="text-3xl font-black text-foreground">
                          {format(parseISO(day), "d")}
                        </span>
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {user?.role === "staff" && (
                  <TableRow className="hover:bg-muted/30 transition-colors bg-primary/5">
                    <TableCell className="font-medium p-2">
                      <div className="flex flex-col">
                        <span className="font-bold text-primary">ME</span>
                        <span className="text-xs text-muted-foreground">{user?.nickName || user?.fullName || user?.username}</span>
                      </div>
                    </TableCell>
                    {days.map((day: string) => {
                      const shift = myShiftsByDate[day];
                      return (
                        <TableCell key={day} className="p-1">
                          {shift ? (
                            <div 
                              className={`h-16 w-full rounded p-1 border shadow-sm flex flex-col justify-center items-center cursor-pointer hover:brightness-95 transition-all
                                ${shift.shiftGroup === 'open' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                  shift.shiftGroup === 'swing' ? 'bg-cyan-100 text-cyan-700 border-cyan-200' :
                                  shift.shiftGroup === 'lunch' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                                  shift.shiftGroup === 'dinner' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                                  shift.shiftGroup === 'close' ? 'bg-pink-100 text-pink-700 border-pink-200' :
                                  shift.shiftGroup === 'late' ? 'bg-slate-700 text-slate-100 border-slate-600' :
                                  'bg-slate-100 text-slate-700 border-slate-200'}`}
                              onClick={() => {
                                if (!data.closed && confirm("Are you sure you want to cancel this shift?")) {
                                  cancelShift(day);
                                }
                              }}
                            >
                              <span className="text-xs font-bold uppercase">{getShiftDisplayName(shift.shiftGroup)}</span>
                              <span className="text-xs">{shift.startTime}</span>
                            </div>
                          ) : (
                            <BookShiftDialog groups={settings?.groups} day={day} disabled={data.closed} settings={settings}>
                              <div className={`h-16 w-full rounded border border-dashed border-red-200/50 bg-red-50/50 dark:bg-red-950/20 dark:border-red-900/30 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer flex items-center justify-center group ${data.closed ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                <span className="text-sm font-medium text-red-400/70 dark:text-red-400/50 group-hover:hidden">OFF</span>
                                <Plus className="w-5 h-5 text-primary/50 group-hover:text-primary hidden group-hover:block" />
                              </div>
                            </BookShiftDialog>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                )}
                {allStaff.filter((u: any) => u.username !== user?.username).map((u: any) => {
                  const staffShifts = getRosterShiftsByUser(u.username);
                  return (
                    <TableRow key={u.username} className="hover:bg-muted/10 transition-colors">
                      <TableCell className="font-medium p-2">
                        <span className="font-medium text-muted-foreground">{u.nickName || u.fullName || u.username}</span>
                      </TableCell>
                      {days.map((day: string) => {
                        const s = staffShifts[day];
                        return (
                          <TableCell key={day} className="p-1">
                            {s ? (() => {
                              const [start, end] = s.startTime.split(' - ');
                              return (
                                <div className={`h-16 w-full rounded p-1 border flex flex-col justify-center items-center gap-0.5
                                  ${s.shiftGroup === 'open' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                    s.shiftGroup === 'swing' ? 'bg-cyan-50 text-cyan-600 border-cyan-100' :
                                    s.shiftGroup === 'lunch' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                                    s.shiftGroup === 'dinner' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                                    s.shiftGroup === 'close' ? 'bg-pink-50 text-pink-600 border-pink-100' :
                                    s.shiftGroup === 'late' ? 'bg-slate-700 text-slate-100 border-slate-600' :
                                    'bg-slate-50 text-slate-600 border-slate-100'}`}>
                                  <span className="text-xs font-bold uppercase">{getShiftDisplayName(s.shiftGroup)}</span>
                                  <span className="text-[10px]">Start: {start}</span>
                                  <span className="text-[10px]">End: {end}</span>
                                </div>
                              );
                            })() : (
                              <div className="h-16 w-full rounded bg-red-50/50 dark:bg-red-950/20 border border-red-200/30 dark:border-red-900/20 flex items-center justify-center">
                                <span className="text-sm font-medium text-red-400/70 dark:text-red-400/50">OFF</span>
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
