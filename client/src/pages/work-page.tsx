import { useState } from "react";
import { useI18n } from "@/hooks/use-i18n";
import { useMyWeek, useMyMonth, useManagerTeamMonth, useBookShift, useCancelShift, useRoster } from "@/hooks/use-shifts";
import { useSettings } from "@/hooks/use-settings";
import { useAuth } from "@/hooks/use-auth";
import { format, addDays, startOfWeek, addWeeks, subWeeks, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths } from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, AlertCircle, Clock, Trash2, EyeOff, Eye, Users, UserCog, ArrowLeft, Pencil, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { api } from "@shared/routes";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Schema for booking form
const bookSchema = z.object({
  date: z.string().min(1, "Date is required"),
  shiftGroup: z.string().min(1, "Shift group is required"),
  startTime: z.string().min(1, "Time period is required"),
  note: z.string().optional(),
});

type BookFormValues = z.infer<typeof bookSchema>;

// Helper function to display shift group name
const getShiftDisplayName = (shiftGroup: string): string => {
  switch (shiftGroup?.toLowerCase()) {
    case 'late': return 'Late Night';
    case 'com': return 'COM';
    case 'off': return 'OFF';
    case 'meeting_manager': return 'MM';
    case 'meeting_zone': return 'ZM';
    case 'other': return 'OTHER';
    default: return shiftGroup;
  }
};

// Shift order for filtering based on typical shift times
// open (morning) -> lunch -> swing (afternoon) -> dinner (evening) -> close (night) -> late (late night)
const SHIFT_ORDER: Record<string, number> = {
  'open': 0,
  'lunch': 1, 
  'swing': 2,
  'dinner': 3,
  'close': 4,
  'late': 5,
  'com': 6,
  'off': 7,
  'meeting_manager': 8,
  'meeting_zone': 9,
  'other': 10
};

const getShiftOrder = (shiftGroup: string | undefined): number => {
  if (!shiftGroup) return -1;
  const order = SHIFT_ORDER[shiftGroup.toLowerCase()];
  // If shift is not in the map, return a fallback order based on alphabetical (still show the shift)
  return order !== undefined ? order : 99;
};

export default function WorkPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [mobileDayPairIndex, setMobileDayPairIndex] = useState(0); // 0: Tue-Wed, 1: Thu-Fri, 2: Sat-Sun-Mon
  const [showAll7Days, setShowAll7Days] = useState(true); // View All mode - default to all 7 days
  // Format date as YYYY-MM-DD for API
  const dateParam = format(currentDate, "yyyy-MM-dd");
  
  const { data, isLoading, error } = useMyWeek(dateParam);
  const { data: rosterData, isLoading: isLoadingRoster } = useRoster(dateParam);
  const { data: settings } = useSettings();
  const { mutate: cancelShift } = useCancelShift();
  const queryClient = useQueryClient();
  const isManager = user?.role === "manager" || user?.role === "admin";

  // For managers, show dashboard with selection
  if (isManager) {
    return <ManagerDashboard />;
  }

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

  if (isLoading || isLoadingRoster) return <WorkPageSkeleton />;
  if (error) return <div className="p-8 text-center text-red-500">Error loading schedule: {error.message}</div>;

  const weekStartStr = data?.weekRange?.start;
  const weekEndStr = data?.weekRange?.end;
  const allDays = data?.weekRange?.days || [];
  
  // For staff mobile view
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const tomorrowStr = format(addDays(new Date(), 1), "yyyy-MM-dd");
  
  // Mobile day pair navigation state - will be managed via useState
  // Day pairs: [Tue-Wed], [Thu-Fri], [Sat-Sun-Mon]
  // We'll use the first pair as default
  const mobileDays: string[] = [todayStr, tomorrowStr];
  
  // Use all days for desktop, filtered days for mobile (will be handled in render)
  const days = allDays;
  const displayRange = weekStartStr ? `${format(new Date(weekStartStr), "MMM d")} - ${format(new Date(weekEndStr), "MMM d, yyyy")}` : "";

  // My shifts for the week mapped by date
  const myShiftsByDate: Record<string, any> = {};
  data?.items?.forEach((s: any) => {
    myShiftsByDate[s.date] = s;
  });
  
  // Get roster shifts by username and date
  const getRosterShiftsByUser = (username: string): Record<string, any> => {
    const shifts: Record<string, any> = {};
    rosterData?.roster?.filter((s: any) => s.username === username).forEach((s: any) => {
      shifts[s.date] = s;
    });
    return shifts;
  };
  
  // Filter staff for mobile view based on shift groups
  // For today: show before-shift members, same-shift members, next-shift members
  // For tomorrow: show only same-shift members
  const isKnownShift = (order: number): boolean => order >= 0 && order < 99;
  
  const filterStaffForDay = (day: string, allStaff: any[]): any[] => {
    const myShift = myShiftsByDate[day];
    const myShiftOrder = getShiftOrder(myShift?.shiftGroup);
    
    if (day === todayStr) {
      // Today: show staff from shifts before, same as, and one after current user's shift
      return allStaff.filter((u: any) => {
        const staffShifts = getRosterShiftsByUser(u.username);
        const staffShift = staffShifts[day];
        const staffOrder = getShiftOrder(staffShift?.shiftGroup);
        
        // If user has no shift today (OFF), don't show any staff for today
        if (myShiftOrder === -1) return false;
        // If staff has no shift today, don't show (they're OFF)
        if (staffOrder === -1) return false;
        // If staff has unknown shift type, always show (could be any time)
        if (!isKnownShift(staffOrder)) return true;
        // If user has unknown shift type, show all working staff
        if (!isKnownShift(myShiftOrder)) return true;
        
        // Show: before user's shift, same shift, or one shift after
        return staffOrder <= myShiftOrder || staffOrder === myShiftOrder + 1;
      });
    } else if (day === tomorrowStr) {
      // Tomorrow: show only same-shift colleagues
      return allStaff.filter((u: any) => {
        const staffShifts = getRosterShiftsByUser(u.username);
        const staffShift = staffShifts[day];
        const staffOrder = getShiftOrder(staffShift?.shiftGroup);
        
        // Get my shift for tomorrow
        const myTomorrowShift = myShiftsByDate[tomorrowStr];
        const myTomorrowOrder = getShiftOrder(myTomorrowShift?.shiftGroup);
        
        // If user has no shift tomorrow (OFF), don't show any staff for tomorrow
        if (myTomorrowOrder === -1) return false;
        // If staff has no shift, don't show
        if (staffOrder === -1) return false;
        // If staff has unknown shift type, always show
        if (!isKnownShift(staffOrder)) return true;
        // If user has unknown shift type, show all working staff
        if (!isKnownShift(myTomorrowOrder)) return true;
        // Show only same-shift colleagues
        return staffOrder === myTomorrowOrder;
      });
    }
    
    // For other days, show all staff
    return allStaff;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold text-foreground">My Work & Roster</h2>
          <p className="text-muted-foreground flex items-center gap-2 mt-1">
            <CalendarIcon className="w-4 h-4" />
            {displayRange}
          </p>
        </div>
        
          <div className="flex items-center gap-1.5 md:gap-2">
            {isManager && rosterData?.users?.some((u: any) => u.active === 0 && u.role === "staff") && (
              <HiddenStaffDialogInWork 
                users={rosterData.users.filter((u: any) => u.active === 0 && u.role === "staff")} 
                onUpdateStatus={handleUpdateUserStatus} 
              />
            )}
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
          <AlertDescription>
            {t("systemClosed")}
          </AlertDescription>
        </Alert>
      )}

      {/* Mobile View: Day-pair navigation with all users */}
      <Card className="glass-card overflow-hidden border-none shadow-xl md:hidden">
        <div className="p-2">
          {(() => {
            // Day pairs: [Tue-Wed], [Thu-Fri], [Sat-Sun-Mon]
            const dayPairs: string[][] = [];
            if (days.length >= 7) {
              dayPairs.push([days[0], days[1]]); // Tue-Wed
              dayPairs.push([days[2], days[3]]); // Thu-Fri
              dayPairs.push([days[4], days[5], days[6]]); // Sat-Sun-Mon
            } else if (days.length >= 2) {
              // Fallback for partial week
              dayPairs.push(days.slice(0, 2));
              if (days.length >= 4) dayPairs.push(days.slice(2, 4));
              if (days.length >= 5) dayPairs.push(days.slice(4));
            }
            
            const currentPair = showAll7Days ? days : (dayPairs[mobileDayPairIndex] || days.slice(0, 2));
            const allStaff = rosterData?.users?.filter((u: any) => u.active === 1 && u.role === "staff") || [];
            
            // Navigation labels
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
                {/* Navigation and View All buttons */}
                <div className="flex items-center justify-between mb-2 gap-1">
                  {/* Left: Prev button */}
                  <div className="flex-1">
                    {!showAll7Days && prevIndex !== null && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setMobileDayPairIndex(prevIndex)}
                        className="text-[10px] px-1 h-7"
                        data-testid="button-prev-days"
                      >
                        <ChevronLeft className="w-3 h-3" />
                        {getPairLabel(prevIndex)}
                      </Button>
                    )}
                  </div>
                  
                  {/* Center: View All button */}
                  <Button 
                    variant={showAll7Days ? "default" : "outline"} 
                    size="sm"
                    onClick={() => setShowAll7Days(!showAll7Days)}
                    className="text-[10px] gap-1 px-2 h-7"
                    data-testid="button-toggle-view-all"
                  >
                    {showAll7Days ? <Eye className="w-3 h-3" /> : <Users className="w-3 h-3" />}
                    {showAll7Days ? t("filtered") : t("viewAll")}
                  </Button>
                  
                  {/* Right: Next button */}
                  <div className="flex-1 flex justify-end">
                    {!showAll7Days && nextIndex !== null && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setMobileDayPairIndex(nextIndex)}
                        className="text-[10px] px-1 h-7"
                        data-testid="button-next-days"
                      >
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
                    {/* Current user's shifts row */}
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
                                      shift.shiftGroup === 'com' ? 'bg-green-100 text-green-700 border-green-200' :
                                      shift.shiftGroup === 'off' ? 'bg-gray-100 text-gray-700 border-gray-200' :
                                      shift.shiftGroup === 'meeting_manager' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                                      shift.shiftGroup === 'meeting_zone' ? 'bg-cyan-100 text-cyan-700 border-cyan-200' :
                                      shift.shiftGroup === 'other' ? 'bg-orange-100 text-orange-700 border-orange-200' :
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
                                <BookShiftDialog 
                                  groups={settings?.groups} 
                                  day={day} 
                                  disabled={data.closed}
                                  settings={settings}
                                >
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
                    {/* All staff */}
                    {allStaff
                      .filter((u: any) => u.username !== user?.username)
                      .map((u: any) => {
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
                                          s.shiftGroup === 'com' ? 'bg-green-50 text-green-600 border-green-100' :
                                          s.shiftGroup === 'off' ? 'bg-gray-50 text-gray-600 border-gray-200' :
                                          s.shiftGroup === 'meeting_manager' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                                          s.shiftGroup === 'meeting_zone' ? 'bg-cyan-50 text-cyan-600 border-cyan-100' :
                                          s.shiftGroup === 'other' ? 'bg-orange-50 text-orange-600 border-orange-100' :
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
                                          s.shiftGroup === 'com' ? 'bg-green-50 text-green-600 border-green-100' :
                                          s.shiftGroup === 'off' ? 'bg-gray-50 text-gray-600 border-gray-200' :
                                          s.shiftGroup === 'meeting_manager' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                                          s.shiftGroup === 'meeting_zone' ? 'bg-cyan-50 text-cyan-600 border-cyan-100' :
                                          s.shiftGroup === 'other' ? 'bg-orange-50 text-orange-600 border-orange-100' :
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

      {/* Desktop View: Full week with all staff */}
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
                <TableRow className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-medium p-2">
                    <div className="flex flex-col">
                      <span className="font-semibold text-primary text-sm">Your Shifts</span>
                      <span className="text-xs text-muted-foreground">Select to book/cancel</span>
                    </div>
                  </TableCell>
                  {days.map((day: string) => {
                    const shift = myShiftsByDate[day];
                    return (
                      <TableCell key={day} className="p-2">
                        {shift ? (
                          <div 
                            className={`h-16 w-full rounded-xl p-2 border shadow-sm flex flex-col justify-center items-center cursor-pointer hover:brightness-95 transition-all
                              ${shift.shiftGroup === 'open' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                shift.shiftGroup === 'lunch' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                                shift.shiftGroup === 'dinner' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                                shift.shiftGroup === 'late' ? 'bg-slate-700 text-slate-100 border-slate-600' :
                                shift.shiftGroup === 'com' ? 'bg-green-100 text-green-700 border-green-200' :
                                shift.shiftGroup === 'off' ? 'bg-gray-100 text-gray-700 border-gray-200' :
                                shift.shiftGroup === 'meeting_manager' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                                shift.shiftGroup === 'meeting_zone' ? 'bg-cyan-100 text-cyan-700 border-cyan-200' :
                                shift.shiftGroup === 'other' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                                'bg-slate-100 text-slate-700 border-slate-200'}`}
                            onClick={() => {
                              if (!data.closed && confirm("Are you sure you want to cancel this shift?")) {
                                cancelShift(day);
                              }
                            }}
                          >
                            <span className="text-[10px] font-bold uppercase tracking-wider">{getShiftDisplayName(shift.shiftGroup)}</span>
                            <span className="text-xs font-semibold">{shift.startTime}</span>
                          </div>
                        ) : (
                          <BookShiftDialog 
                            groups={settings?.groups} 
                            day={day} 
                            disabled={data.closed}
                            settings={settings}
                          >
                            <div className={`h-16 w-full rounded-xl border border-dashed border-red-200/50 bg-red-50/50 dark:bg-red-950/20 dark:border-red-900/30 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer flex items-center justify-center group ${data.closed ? 'opacity-50 cursor-not-allowed' : ''}`}>
                              <span className="text-[10px] font-medium text-red-400/70 dark:text-red-400/50 group-hover:hidden">OFF</span>
                              <Plus className="w-5 h-5 text-primary/50 group-hover:text-primary hidden group-hover:block" />
                            </div>
                          </BookShiftDialog>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              )}
              {/* All staff for desktop view */}
              {rosterData?.roster && rosterData.users && rosterData.users
                .filter((u: any) => u.username !== user?.username && u.active === 1 && u.role === "staff")
                .map((u: any) => {
                  const staffShifts: Record<string, any> = {};
                  rosterData.roster.filter((s: any) => s.username === u.username).forEach((s: any) => {
                    staffShifts[s.date] = s;
                  });
                  return (
                    <TableRow key={u.username} className="hover:bg-muted/10 transition-colors opacity-80">
                      <TableCell className="font-medium text-xs py-1">
                        <div className="flex flex-col">
                          <span className="font-medium text-muted-foreground">{u.nickName || u.fullName || u.username}</span>
                          {isManager && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 px-1 text-[8px] text-destructive hover:text-destructive mt-0.5 justify-start w-fit"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateUserStatus(u.username, 0);
                              }}
                            >
                              <Trash2 className="w-2.5 h-2.5 mr-0.5" />
                              Hide
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      {days.map((day: string) => {
                        const s = staffShifts[day];
                        const content = s ? (
                          <div className={`h-10 w-full rounded p-1 border flex flex-col justify-center items-center opacity-60
                            ${s.shiftGroup === 'open' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                              s.shiftGroup === 'lunch' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                              s.shiftGroup === 'dinner' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                              s.shiftGroup === 'late' ? 'bg-slate-700 text-slate-100 border-slate-600' :
                              s.shiftGroup === 'com' ? 'bg-green-50 text-green-600 border-green-100' :
                              s.shiftGroup === 'off' ? 'bg-gray-50 text-gray-600 border-gray-200' :
                              s.shiftGroup === 'meeting_manager' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                              s.shiftGroup === 'meeting_zone' ? 'bg-cyan-50 text-cyan-600 border-cyan-100' :
                              s.shiftGroup === 'other' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                              'bg-slate-50 text-slate-600 border-slate-100'}`}>
                            <span className="text-[8px] font-bold uppercase">{getShiftDisplayName(s.shiftGroup)}</span>
                            <span className="text-[9px]">{s.startTime}</span>
                          </div>
                        ) : (
                          <div className="h-10 w-full rounded bg-red-50/50 dark:bg-red-950/20 border border-red-200/30 dark:border-red-900/20 flex items-center justify-center">
                            <span className="text-[10px] font-medium text-red-400/70 dark:text-red-400/50">OFF</span>
                          </div>
                        );

                        return (
                          <TableCell key={day} className="p-1">
                            {isManager ? (
                              <ManageShiftDialogInWork username={u.username} date={day} existingShift={s} mode={s ? "edit" : "create"} groups={settings?.groups}>
                                {s ? content : (
                                  <div className="h-10 w-full rounded border border-dashed border-red-200/50 bg-red-50/50 dark:bg-red-950/20 dark:border-red-900/30 hover:border-primary/30 hover:bg-primary/5 transition-all cursor-pointer flex items-center justify-center group">
                                    <span className="text-[10px] font-medium text-red-400/70 dark:text-red-400/50 group-hover:hidden">OFF</span>
                                    <Plus className="w-3 h-3 text-primary/30 hidden group-hover:block" />
                                  </div>
                                )}
                              </ManageShiftDialogInWork>
                            ) : (
                              content
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })
              }
              <TableRow>
                <TableCell colSpan={8} className="h-8 bg-muted/20 text-center text-[10px] text-muted-foreground uppercase tracking-widest">
                  End of Weekly View
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}

function BookShiftDialog({ children, groups, day, disabled, settings }: { children: React.ReactNode; groups: any[]; day: string; disabled?: boolean, settings: any }) {
  const { t, language } = useI18n();
  const [open, setOpen] = useState(false);
  const { mutate: bookShift, isPending } = useBookShift();
  const [useCustomTime, setUseCustomTime] = useState(false);
  const [customStartTime, setCustomStartTime] = useState("08:00");
  const [customEndTime, setCustomEndTime] = useState("16:00");
  
  const form = useForm<BookFormValues>({
    resolver: zodResolver(bookSchema),
    defaultValues: {
      date: day,
      shiftGroup: "",
      startTime: "",
      note: "",
    },
  });

  if (disabled) return <div className="opacity-50 cursor-not-allowed">{children}</div>;

  const onSubmit = (data: BookFormValues) => {
    const finalTime = useCustomTime ? `${customStartTime} - ${customEndTime}` : data.startTime;
    bookShift({ ...data, startTime: finalTime }, {
      onSuccess: () => {
        setOpen(false);
        form.reset();
        setUseCustomTime(false);
        setCustomStartTime("08:00");
        setCustomEndTime("16:00");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Book Shift for {format(parseISO(day), "EEE, MMM d")}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Shift Group</Label>
            <Select onValueChange={(val) => {
              form.setValue("shiftGroup", val);
              const grp = groups?.find(g => g.key === val);
              if (grp?.times?.[0]) {
                form.setValue("startTime", grp.times[0]);
              }
            }}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Select group" />
              </SelectTrigger>
              <SelectContent>
                {groups?.map((g: any) => (
                  <SelectItem key={g.key} value={g.key}>
                    {g.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.shiftGroup && <p className="text-xs text-red-500">{form.formState.errors.shiftGroup.message}</p>}
          </div>

          {form.watch("shiftGroup") && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="bookCustomTime" 
                  checked={useCustomTime} 
                  onChange={(e) => setUseCustomTime(e.target.checked)}
                  className="rounded"
                  disabled={settings?.lockTimePeriod}
                />
                <Label htmlFor="bookCustomTime" className="cursor-pointer">
                  {language === "th" ? "กำหนดเวลาเอง" : "Custom Time"}
                </Label>
              </div>
              
              {useCustomTime ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>{language === "th" ? "เวลาเริ่ม" : "Start Time"}</Label>
                    <Select value={customStartTime} onValueChange={setCustomStartTime}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {timeOptions.map((time) => (
                          <SelectItem key={time} value={time}>{time}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{language === "th" ? "เวลาจบ" : "End Time"}</Label>
                    <Select value={customEndTime} onValueChange={setCustomEndTime}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {timeOptions.map((time) => (
                          <SelectItem key={time} value={time}>{time}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Time Period</Label>
                  <Select 
                    onValueChange={(val) => form.setValue("startTime", val)} 
                    defaultValue={form.getValues("startTime")}
                    disabled={settings?.lockTimePeriod}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Select time period" />
                    </SelectTrigger>
                    <SelectContent>
                      {groups?.find(g => g.key === form.watch("shiftGroup"))?.times?.map((t: string) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {settings?.lockTimePeriod && <p className="text-[10px] text-muted-foreground">Fixed by Manager</p>}
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>Note (Optional)</Label>
            <Textarea {...form.register("note")} className="rounded-xl resize-none" placeholder="Any special requests?" />
          </div>

          <Button type="submit" className="w-full rounded-xl" disabled={isPending} data-testid="button-confirm-booking">
            {isPending ? "Booking..." : "Confirm Booking"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function HiddenStaffDialogInWork({ users, onUpdateStatus }: { users: any[]; onUpdateStatus: (username: string, active: number) => void }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="rounded-full gap-2">
          <EyeOff className="w-4 h-4" />
          <span>Hidden ({users.length})</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <EyeOff className="w-5 h-5 text-destructive" />
            Hidden Staff Members
          </DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <p className="text-sm text-muted-foreground">The following staff members are currently hidden from the roster.</p>
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
            {users.map((u) => (
              <div key={u.username} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/50">
                <div className="flex flex-col">
                  <span className="text-sm font-semibold">{u.nickName || u.fullName || u.username}</span>
                  <span className="text-[10px] text-muted-foreground uppercase">{u.username}</span>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 gap-2 text-primary hover:text-primary hover:bg-primary/10 rounded-lg"
                  onClick={() => onUpdateStatus(u.username, 1)}
                >
                  <Eye className="w-4 h-4" />
                  Show
                </Button>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ManageShiftDialogInWork({ 
  children, 
  username, 
  date, 
  existingShift, 
  mode,
  groups
}: { 
  children: React.ReactNode; 
  username: string; 
  date: string; 
  existingShift?: any; 
  mode: "create" | "edit";
  groups?: any[];
}) {
  const { language } = useI18n();
  const [open, setOpen] = useState(false);
  const { mutate: bookShift } = useBookShift();
  const { mutate: cancelShift } = useCancelShift();
  const queryClient = useQueryClient();
  const [useCustomTime, setUseCustomTime] = useState(false);
  const [customStartTime, setCustomStartTime] = useState(existingShift?.startTime?.split(" - ")[0] || "08:00");
  const [customEndTime, setCustomEndTime] = useState(existingShift?.startTime?.split(" - ")[1] || "16:00");
  
  const [formData, setFormData] = useState({
    shiftGroup: existingShift?.shiftGroup || groups?.[0]?.key || "open",
    startTime: existingShift?.startTime || groups?.[0]?.times?.[0] || "07:00 - 16:00",
    note: existingShift?.note || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("bk_token") || "";
    const finalTime = useCustomTime ? `${customStartTime} - ${customEndTime}` : formData.startTime;
    apiRequest("POST", "/api/setShiftForUser", {
      token,
      username,
      date,
      shiftGroup: formData.shiftGroup,
      startTime: finalTime,
      note: formData.note
    }).then(() => {
      queryClient.invalidateQueries({ queryKey: [api.shifts.getRoster.path] });
      setOpen(false);
    });
  };

  const handleDelete = () => {
    if (confirm("Remove this shift?")) {
      const token = localStorage.getItem("bk_token") || "";
      apiRequest("POST", "/api/deleteShiftForUser", { token, username, date })
        .then(() => {
          queryClient.invalidateQueries({ queryKey: [api.shifts.getRoster.path] });
          setOpen(false);
        });
    }
  };

  const currentGroup = groups?.find(g => g.key === formData.shiftGroup);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px] rounded-2xl">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add Shift" : "Edit Shift"}</DialogTitle>
        </DialogHeader>
        
        <div className="py-2 space-y-1">
          <p className="text-sm text-muted-foreground">User: <span className="font-medium text-foreground">{username}</span></p>
          <p className="text-sm text-muted-foreground">Date: <span className="font-medium text-foreground">{format(parseISO(date), "MMM d, yyyy")}</span></p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Shift Group</Label>
            <Select 
              value={formData.shiftGroup} 
              onValueChange={(v) => {
                const grp = groups?.find(g => g.key === v);
                setFormData({
                  ...formData, 
                  shiftGroup: v, 
                  startTime: grp?.times?.[0] || ""
                });
              }}
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {groups?.map(g => (
                  <SelectItem key={g.key} value={g.key}>{g.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="manageCustomTime" 
                checked={useCustomTime} 
                onChange={(e) => setUseCustomTime(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="manageCustomTime" className="cursor-pointer">
                {language === "th" ? "กำหนดเวลาเอง" : "Custom Time"}
              </Label>
            </div>
            
            {useCustomTime ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>{language === "th" ? "เวลาเริ่ม" : "Start Time"}</Label>
                  <Select value={customStartTime} onValueChange={setCustomStartTime}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timeOptions.map((time) => (
                        <SelectItem key={time} value={time}>{time}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{language === "th" ? "เวลาจบ" : "End Time"}</Label>
                  <Select value={customEndTime} onValueChange={setCustomEndTime}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timeOptions.map((time) => (
                        <SelectItem key={time} value={time}>{time}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Time Period</Label>
                <Select 
                  value={formData.startTime} 
                  onValueChange={(v) => setFormData({...formData, startTime: v})}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currentGroup?.times?.map((t: string) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Note</Label>
            <Input 
              value={formData.note}
              onChange={(e) => setFormData({...formData, note: e.target.value})}
              placeholder="Optional note"
              className="rounded-xl"
            />
          </div>

          <div className="flex gap-2 pt-2">
            {mode === "edit" && (
              <Button type="button" variant="destructive" onClick={handleDelete} className="flex-1 rounded-xl">
                <Trash2 className="w-4 h-4 mr-2" />
                Remove
              </Button>
            )}
            <Button type="submit" className="flex-1 rounded-xl">
              Save Shift
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ManagerDashboard() {
  const { language } = useI18n();
  const [selectedView, setSelectedView] = useState<"none" | "employee" | "manager">("none");

  const labels = {
    title: language === "th" ? "เลือกตารางที่ต้องการดู" : "Select Schedule View",
    employeeSchedule: language === "th" ? "ตารางงานพนักงาน" : "Employee Schedule",
    managerSchedule: language === "th" ? "ตารางงานผู้จัดการ" : "Manager Schedule",
    employeeDesc: language === "th" ? "ดูและจัดการตารางงานของพนักงานทั้งหมด" : "View and manage all employee schedules",
    managerDesc: language === "th" ? "ดูตารางงานของตัวเองรายเดือน" : "View your own monthly schedule",
    back: language === "th" ? "กลับ" : "Back",
  };

  if (selectedView === "employee") {
    return (
      <div className="space-y-6">
        <Button 
          variant="ghost" 
          onClick={() => setSelectedView("none")} 
          className="mb-4"
          data-testid="button-back-to-dashboard"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {labels.back}
        </Button>
        <ManagerEmployeeRosterView />
      </div>
    );
  }

  if (selectedView === "manager") {
    return (
      <div className="space-y-6">
        <Button 
          variant="ghost" 
          onClick={() => setSelectedView("none")} 
          className="mb-4"
          data-testid="button-back-to-dashboard"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {labels.back}
        </Button>
        <ManagerMonthlyView />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-display font-bold text-foreground">
          {labels.title}
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
        <Card 
          className="glass-card border-none shadow-xl p-8 cursor-pointer hover-elevate transition-all"
          onClick={() => setSelectedView("employee")}
          data-testid="card-employee-schedule"
        >
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-24 h-24 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Users className="w-12 h-12 text-primary" />
            </div>
            <h3 className="text-xl font-bold text-foreground">{labels.employeeSchedule}</h3>
            <p className="text-sm text-muted-foreground">{labels.employeeDesc}</p>
          </div>
        </Card>

        <Card 
          className="glass-card border-none shadow-xl p-8 cursor-pointer hover-elevate transition-all"
          onClick={() => setSelectedView("manager")}
          data-testid="card-manager-schedule"
        >
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-24 h-24 rounded-2xl bg-primary/10 flex items-center justify-center">
              <UserCog className="w-12 h-12 text-primary" />
            </div>
            <h3 className="text-xl font-bold text-foreground">{labels.managerSchedule}</h3>
            <p className="text-sm text-muted-foreground">{labels.managerDesc}</p>
          </div>
        </Card>
      </div>
    </div>
  );
}

// Generate time options (00:00 - 23:00)
const timeOptions = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, "0");
  return `${hour}:00`;
});

function ShiftCellWithActions({ shift, groups, onRefresh, onDragStart, onDragEnd }: { shift: any; groups: any; onRefresh: () => void; onDragStart?: (shift: any, isCopy: boolean) => void; onDragEnd?: () => void }) {
  const { language } = useI18n();
  const [showActions, setShowActions] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isCopyMode, setIsCopyMode] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(shift.shiftGroup);
  const [useCustomTime, setUseCustomTime] = useState(false);
  const [selectedTime, setSelectedTime] = useState(shift.startTime);
  const [customStartTime, setCustomStartTime] = useState(shift.startTime?.split(" - ")[0] || "08:00");
  const [customEndTime, setCustomEndTime] = useState(shift.startTime?.split(" - ")[1] || "16:00");
  const [note, setNote] = useState(shift.note || "");
  const queryClient = useQueryClient();

  const handleDelete = async () => {
    if (!confirm(language === "th" ? "ต้องการลบตารางนี้?" : "Delete this shift?")) return;
    const token = localStorage.getItem("bk_token") || "";
    try {
      await apiRequest("POST", "/api/deleteShift", { token, shiftId: shift.id });
      queryClient.invalidateQueries({ queryKey: [api.shifts.getRoster.path] });
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async () => {
    if (!selectedGroup) return;
    const finalTime = useCustomTime ? `${customStartTime} - ${customEndTime}` : selectedTime;
    if (!finalTime) return;
    
    const token = localStorage.getItem("bk_token") || "";
    try {
      await apiRequest("POST", "/api/updateShift", {
        token,
        shiftId: shift.id,
        shiftGroup: selectedGroup,
        startTime: finalTime,
        note,
      });
      queryClient.invalidateQueries({ queryKey: [api.shifts.getRoster.path] });
      setEditOpen(false);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const groupColors: Record<string, string> = {
    open: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    swing: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
    lunch: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
    dinner: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
    close: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
    late: "bg-slate-700 text-slate-100 dark:bg-slate-800 dark:text-slate-200",
  };

  return (
    <>
      <div 
        className={`relative h-10 rounded-lg p-1 flex flex-col justify-center items-center cursor-grab ${groupColors[shift.shiftGroup] || groupColors.late} ${isDragging ? (isCopyMode ? 'opacity-50 ring-2 ring-green-500' : 'opacity-50 ring-2 ring-orange-500') : ''}`}
        draggable
        onDragStart={(e) => {
          const copyMode = e.ctrlKey || e.metaKey;
          setIsDragging(true);
          setIsCopyMode(copyMode);
          const shiftData = { ...shift, _isCopy: copyMode };
          e.dataTransfer.setData('application/json', JSON.stringify(shiftData));
          e.dataTransfer.effectAllowed = copyMode ? 'copy' : 'move';
          onDragStart?.(shift, copyMode);
        }}
        onDragEnd={() => {
          setIsDragging(false);
          setIsCopyMode(false);
          onDragEnd?.();
        }}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
        onClick={() => setEditOpen(true)}
      >
        <span className="text-[10px] font-bold uppercase whitespace-nowrap">{getShiftDisplayName(shift.shiftGroup)}</span>
        <span className="text-[10px] whitespace-nowrap">{shift.startTime}</span>
        {shift.note && <span className="text-[9px] opacity-70 truncate max-w-full">{shift.note}</span>}
        
        <div 
          className={`absolute top-0.5 right-0.5 flex gap-0.5 transition-opacity ${showActions ? 'opacity-100' : 'opacity-0'}`}
          style={{ visibility: showActions ? 'visible' : 'hidden' }}
        >
          <button 
            onClick={(e) => { e.stopPropagation(); setEditOpen(true); }}
            className="p-1 rounded bg-background/80 hover:bg-background shadow-sm"
            data-testid={`button-edit-shift-${shift.id}`}
          >
            <Pencil className="w-3 h-3" />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); handleDelete(); }}
            className="p-1 rounded bg-background/80 hover:bg-destructive hover:text-destructive-foreground shadow-sm"
            data-testid={`button-delete-shift-${shift.id}`}
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {language === "th" ? "แก้ไขตารางงาน" : "Edit Schedule"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{shift.nickName || shift.fullName}</span> - {format(parseISO(shift.date), "EEEE d MMM yyyy")}
            </div>
            <div className="space-y-2">
              <Label>{language === "th" ? "กะงาน" : "Shift Group"}</Label>
              <Select value={selectedGroup} onValueChange={(v) => { setSelectedGroup(v); setSelectedTime(""); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {groups?.map((g: any) => (
                    <SelectItem key={g.key} value={g.key}>{g.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="editCustomTime" 
                  checked={useCustomTime} 
                  onChange={(e) => setUseCustomTime(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="editCustomTime" className="cursor-pointer">
                  {language === "th" ? "กำหนดเวลาเอง" : "Custom Time"}
                </Label>
              </div>
              
              {useCustomTime ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>{language === "th" ? "เวลาเริ่ม" : "Start Time"}</Label>
                    <Select value={customStartTime} onValueChange={setCustomStartTime}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {timeOptions.map((time) => (
                          <SelectItem key={time} value={time}>{time}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{language === "th" ? "เวลาจบ" : "End Time"}</Label>
                    <Select value={customEndTime} onValueChange={setCustomEndTime}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {timeOptions.map((time) => (
                          <SelectItem key={time} value={time}>{time}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>{language === "th" ? "เวลา" : "Time"}</Label>
                  <Select value={selectedTime} onValueChange={setSelectedTime}>
                    <SelectTrigger>
                      <SelectValue placeholder={language === "th" ? "เลือกเวลา..." : "Select time..."} />
                    </SelectTrigger>
                    <SelectContent>
                      {groups?.find((g: any) => g.key === selectedGroup)?.times?.map((time: string) => (
                        <SelectItem key={time} value={time}>{time}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <Label>{language === "th" ? "หมายเหตุ" : "Note"}</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional..." />
            </div>
            
            <div className="flex gap-2">
              <Button onClick={handleSave} className="flex-1">
                {language === "th" ? "บันทึก" : "Save"}
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function StaffCellBookDialog({ groups, day, username, staffName, children }: { groups: any; day: string; username: string; staffName: string; children: React.ReactNode }) {
  const { language } = useI18n();
  const [open, setOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [useCustomTime, setUseCustomTime] = useState(false);
  const [selectedTime, setSelectedTime] = useState("");
  const [customStartTime, setCustomStartTime] = useState("08:00");
  const [customEndTime, setCustomEndTime] = useState("16:00");
  const [note, setNote] = useState("");
  const queryClient = useQueryClient();

  const handleSubmit = async () => {
    if (!selectedGroup) return;
    const finalTime = useCustomTime ? `${customStartTime} - ${customEndTime}` : selectedTime;
    if (!finalTime) return;
    
    const token = localStorage.getItem("bk_token") || "";
    try {
      await apiRequest("POST", api.shifts.setForUser.path, {
        token,
        username,
        date: day,
        shiftGroup: selectedGroup,
        startTime: finalTime,
        note,
      });
      queryClient.invalidateQueries({ queryKey: [api.shifts.getRoster.path] });
      setOpen(false);
      setSelectedGroup("");
      setSelectedTime("");
      setUseCustomTime(false);
      setNote("");
    } catch (err) {
      console.error(err);
    }
  };

  const isValid = selectedGroup && (useCustomTime ? (customStartTime && customEndTime) : selectedTime);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {language === "th" ? "สร้างตารางงาน" : "Create Schedule"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{staffName}</span> - {format(parseISO(day), "EEEE d MMM yyyy")}
          </div>
          <div className="space-y-2">
            <Label>{language === "th" ? "กะงาน" : "Shift Group"}</Label>
            <Select value={selectedGroup} onValueChange={(v) => { setSelectedGroup(v); setSelectedTime(""); }}>
              <SelectTrigger>
                <SelectValue placeholder={language === "th" ? "เลือกกะ..." : "Select shift..."} />
              </SelectTrigger>
              <SelectContent>
                {groups?.map((g: any) => (
                  <SelectItem key={g.key} value={g.key}>{g.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {selectedGroup && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="customTime" 
                  checked={useCustomTime} 
                  onChange={(e) => setUseCustomTime(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="customTime" className="cursor-pointer">
                  {language === "th" ? "กำหนดเวลาเอง" : "Custom Time"}
                </Label>
              </div>
              
              {useCustomTime ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>{language === "th" ? "เวลาเริ่ม" : "Start Time"}</Label>
                    <Select value={customStartTime} onValueChange={setCustomStartTime}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {timeOptions.map((time) => (
                          <SelectItem key={time} value={time}>{time}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{language === "th" ? "เวลาจบ" : "End Time"}</Label>
                    <Select value={customEndTime} onValueChange={setCustomEndTime}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {timeOptions.map((time) => (
                          <SelectItem key={time} value={time}>{time}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>{language === "th" ? "เวลา" : "Time"}</Label>
                  <Select value={selectedTime} onValueChange={setSelectedTime}>
                    <SelectTrigger>
                      <SelectValue placeholder={language === "th" ? "เลือกเวลา..." : "Select time..."} />
                    </SelectTrigger>
                    <SelectContent>
                      {groups?.find((g: any) => g.key === selectedGroup)?.times?.map((time: string) => (
                        <SelectItem key={time} value={time}>{time}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
          
          <div className="space-y-2">
            <Label>{language === "th" ? "หมายเหตุ" : "Note"}</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional..." />
          </div>
          <Button onClick={handleSubmit} className="w-full" disabled={!isValid}>
            {language === "th" ? "บันทึก" : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ManagerCreateCustomScheduleDialog({ groups, users, days, children }: { groups: any; users: any[]; days: string[]; children: React.ReactNode }) {
  const { language } = useI18n();
  const [open, setOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [useCustomTime, setUseCustomTime] = useState(false);
  const [selectedTime, setSelectedTime] = useState("");
  const [customStartTime, setCustomStartTime] = useState("08:00");
  const [customEndTime, setCustomEndTime] = useState("16:00");
  const [selectedUser, setSelectedUser] = useState("");
  const [note, setNote] = useState("");
  const queryClient = useQueryClient();

  const handleSubmit = async () => {
    if (!selectedUser || !selectedGroup || !selectedDay) return;
    const finalTime = useCustomTime ? `${customStartTime} - ${customEndTime}` : selectedTime;
    if (!finalTime) return;
    
    const token = localStorage.getItem("bk_token") || "";
    try {
      await apiRequest("POST", api.shifts.setForUser.path, {
        token,
        username: selectedUser,
        date: selectedDay,
        shiftGroup: selectedGroup,
        startTime: finalTime,
        note,
      });
      queryClient.invalidateQueries({ queryKey: [api.shifts.getRoster.path] });
      setOpen(false);
      setSelectedDay("");
      setSelectedGroup("");
      setSelectedTime("");
      setUseCustomTime(false);
      setSelectedUser("");
      setNote("");
    } catch (err) {
      console.error(err);
    }
  };

  const staffUsers = users?.filter((u: any) => u.role === "staff" && u.active === 1) || [];
  const isValid = selectedUser && selectedGroup && selectedDay && (useCustomTime ? (customStartTime && customEndTime) : selectedTime);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {language === "th" ? "สร้างตารางงานกำหนดเอง" : "Create Custom Schedule"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>{language === "th" ? "เลือกวัน" : "Select Day"}</Label>
            <Select value={selectedDay} onValueChange={setSelectedDay}>
              <SelectTrigger>
                <SelectValue placeholder={language === "th" ? "เลือกวัน..." : "Select day..."} />
              </SelectTrigger>
              <SelectContent>
                {days.map((day: string) => (
                  <SelectItem key={day} value={day}>
                    {format(parseISO(day), "EEEE d MMM yyyy")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{language === "th" ? "เลือกพนักงาน" : "Select Staff"}</Label>
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger>
                <SelectValue placeholder={language === "th" ? "เลือกพนักงาน..." : "Select staff..."} />
              </SelectTrigger>
              <SelectContent>
                {staffUsers.map((u: any) => (
                  <SelectItem key={u.username} value={u.username}>
                    {u.nickName || u.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{language === "th" ? "กะงาน" : "Shift Group"}</Label>
            <Select value={selectedGroup} onValueChange={(v) => { setSelectedGroup(v); setSelectedTime(""); }}>
              <SelectTrigger>
                <SelectValue placeholder={language === "th" ? "เลือกกะ..." : "Select shift..."} />
              </SelectTrigger>
              <SelectContent>
                {groups?.map((g: any) => (
                  <SelectItem key={g.key} value={g.key}>{g.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {selectedGroup && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="customTimeCreate" 
                  checked={useCustomTime} 
                  onChange={(e) => setUseCustomTime(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="customTimeCreate" className="cursor-pointer">
                  {language === "th" ? "กำหนดเวลาเอง" : "Custom Time"}
                </Label>
              </div>
              
              {useCustomTime ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>{language === "th" ? "เวลาเริ่ม" : "Start Time"}</Label>
                    <Select value={customStartTime} onValueChange={setCustomStartTime}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {timeOptions.map((time) => (
                          <SelectItem key={time} value={time}>{time}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{language === "th" ? "เวลาจบ" : "End Time"}</Label>
                    <Select value={customEndTime} onValueChange={setCustomEndTime}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {timeOptions.map((time) => (
                          <SelectItem key={time} value={time}>{time}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>{language === "th" ? "เวลา" : "Time"}</Label>
                  <Select value={selectedTime} onValueChange={setSelectedTime}>
                    <SelectTrigger>
                      <SelectValue placeholder={language === "th" ? "เลือกเวลา..." : "Select time..."} />
                    </SelectTrigger>
                    <SelectContent>
                      {groups?.find((g: any) => g.key === selectedGroup)?.times?.map((time: string) => (
                        <SelectItem key={time} value={time}>{time}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
          
          <div className="space-y-2">
            <Label>{language === "th" ? "หมายเหตุ" : "Note"}</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional..." />
          </div>
          <Button onClick={handleSubmit} className="w-full" disabled={!isValid}>
            {language === "th" ? "บันทึก" : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DroppableEmptyCell({ 
  username, 
  day, 
  staffName, 
  groups, 
  onDrop, 
  isDragging,
  isCopyMode
}: { 
  username: string; 
  day: string; 
  staffName: string; 
  groups: any; 
  onDrop: (username: string, day: string, shift: any) => void;
  isDragging: boolean;
  isCopyMode: boolean;
}) {
  const { language } = useI18n();
  const [isOver, setIsOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = e.ctrlKey || e.metaKey ? 'copy' : 'move';
    setIsOver(true);
  };

  const handleDragLeave = () => {
    setIsOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(false);
    try {
      const shiftData = JSON.parse(e.dataTransfer.getData('application/json'));
      onDrop(username, day, shiftData);
    } catch (err) {
      console.error('Failed to parse dropped shift data:', err);
    }
  };

  const borderColor = isOver 
    ? (isCopyMode ? 'border-green-500 bg-green-500/20 border-2' : 'border-orange-500 bg-orange-500/20 border-2')
    : (isDragging ? (isCopyMode ? 'border-green-400/50 bg-green-500/5' : 'border-orange-400/50 bg-orange-500/5') : 'border-red-200/50 bg-red-50/50 dark:bg-red-950/20 dark:border-red-900/30 hover:bg-primary/5 hover:border-primary/30');

  return (
    <StaffCellBookDialog groups={groups} day={day} username={username} staffName={staffName}>
      <div
        className={`w-full h-10 border border-dashed rounded-lg flex items-center justify-center transition-all cursor-pointer group ${borderColor}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <span className={`text-[10px] font-medium text-red-400/70 dark:text-red-400/50 ${isDragging || isOver ? 'hidden' : 'group-hover:hidden'}`}>OFF</span>
        <Plus className={`w-4 h-4 ${isDragging || isOver ? (isCopyMode ? 'block text-green-500' : 'block text-orange-500') : 'hidden group-hover:block text-muted-foreground/30'}`} />
      </div>
    </StaffCellBookDialog>
  );
}

function ManagerEmployeeRosterView() {
  const { language, t } = useI18n();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"roster" | "booked">("roster");
  const [draggedShift, setDraggedShift] = useState<any>(null);
  const [isCopyMode, setIsCopyMode] = useState(false);
  const dateParam = format(currentDate, "yyyy-MM-dd");
  const { data: rosterData, isLoading } = useRoster(dateParam);
  const { data: settings } = useSettings();
  const queryClient = useQueryClient();

  const handleDropShift = async (targetUsername: string, targetDate: string, sourceShift: any) => {
    const token = localStorage.getItem("bk_token") || "";
    const isCopy = sourceShift._isCopy;
    
    try {
      // Create new shift at target location
      await apiRequest("POST", api.shifts.setForUser.path, {
        token,
        username: targetUsername,
        date: targetDate,
        shiftGroup: sourceShift.shiftGroup,
        startTime: sourceShift.startTime,
        note: sourceShift.note || "",
      });
      
      // If moving (not copying), delete the original shift
      if (!isCopy && sourceShift.id) {
        await apiRequest("POST", "/api/deleteShift", { token, shiftId: sourceShift.id });
      }
      
      queryClient.invalidateQueries({ queryKey: [api.shifts.getRoster.path] });
    } catch (err) {
      console.error(err);
    }
  };

  const handlePrevWeek = () => setCurrentDate(subWeeks(currentDate, 1));
  const handleNextWeek = () => setCurrentDate(addWeeks(currentDate, 1));

  const handleUpdateUserStatus = (username: string, active: number) => {
    if (confirm(active === 0 ? "ซ่อนพนักงานนี้?" : "แสดงพนักงานนี้?")) {
      const token = localStorage.getItem("bk_token") || "";
      apiRequest("POST", "/api/updateUserStatus", { token, username, active })
        .then(() => {
          queryClient.invalidateQueries({ queryKey: [api.shifts.getRoster.path] });
        });
    }
  };

  if (isLoading) return <WorkPageSkeleton />;

  const weekRange = rosterData?.weekRange;
  const days = weekRange?.days || [];
  const displayRange = weekRange ? `${format(new Date(weekRange.start), "MMM d")} - ${format(new Date(weekRange.end), "MMM d, yyyy")}` : "";

  const labels = {
    title: language === "th" ? "ตารางงานพนักงาน" : "Employee Schedule",
    staffMember: language === "th" ? "Staff Member" : "Staff Member",
    yourShifts: language === "th" ? "Your Shifts" : "Your Shifts",
    selectToBook: language === "th" ? "Select to book/cancel" : "Select to book/cancel",
    customSchedule: language === "th" ? "สร้างตารางกำหนดเอง" : "Create Custom Schedule",
    viewBooked: language === "th" ? "ดูตารางที่ book ไว้" : "View Booked Shifts",
    viewRoster: language === "th" ? "ดูตารางงาน" : "View Roster",
  };

  const bookedShifts = rosterData?.roster || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold text-foreground">
            {labels.title}
          </h2>
          <p className="text-muted-foreground flex items-center gap-2 mt-1">
            <CalendarIcon className="w-4 h-4" />
            {displayRange}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <ManagerCreateCustomScheduleDialog groups={settings?.groups} users={rosterData?.users} days={days}>
            <Button variant="default" size="sm" data-testid="button-create-custom-schedule">
              <Plus className="w-4 h-4 mr-1" />
              {labels.customSchedule}
            </Button>
          </ManagerCreateCustomScheduleDialog>
          <Button
            variant={viewMode === "booked" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode(viewMode === "booked" ? "roster" : "booked")}
            data-testid="button-toggle-view-mode"
          >
            {viewMode === "booked" ? labels.viewRoster : labels.viewBooked}
          </Button>
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

      <Card className="glass-card overflow-hidden border-none shadow-xl">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="sticky left-0 bg-muted/50 z-10 min-w-[150px] font-bold">
                  {labels.staffMember}
                </TableHead>
                {days.map((day: string) => (
                  <TableHead key={day} className="text-center min-w-[100px]">
                    <div className="flex flex-col items-center py-2">
                      <span className="text-xs uppercase text-primary font-black tracking-tight">
                        {t(format(parseISO(day), "EEEE").toLowerCase() as any)}
                      </span>
                      <span className="text-2xl font-black text-foreground mt-1">
                        {format(parseISO(day), "d")}
                      </span>
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {viewMode === "roster" ? (
                <>
                  <TableRow className="hover:bg-muted/30 border-b-2 border-primary/20">
                    <TableCell className="sticky left-0 bg-card z-10 font-medium">
                      <div className="flex flex-col">
                        <span className="font-semibold text-primary">{labels.yourShifts}</span>
                        <span className="text-xs text-muted-foreground">{labels.selectToBook}</span>
                      </div>
                    </TableCell>
                    {days.map((day: string) => (
                      <TableCell key={day} className="text-center p-2">
                        <ManagerBookShiftDialog groups={settings?.groups} day={day}>
                          <button 
                            className="w-full h-10 border-2 border-dashed border-primary/30 rounded-lg flex items-center justify-center hover:bg-primary/5 transition-colors cursor-pointer"
                            data-testid={`button-book-shift-${day}`}
                          >
                            <Plus className="w-5 h-5 text-primary/50" />
                          </button>
                        </ManagerBookShiftDialog>
                      </TableCell>
                    ))}
                  </TableRow>
                  {rosterData?.users?.filter((u: any) => u.role === "staff" && u.active === 1)
                    .map((staff: any) => {
                      const staffShifts: Record<string, any> = {};
                      rosterData?.roster?.forEach((s: any) => {
                        if (s.username === staff.username) {
                          staffShifts[s.date] = s;
                        }
                      });
                      const firstShift = days.map(d => staffShifts[d]).find(s => s);
                      const sortTime = firstShift?.startTime?.split(" - ")[0] || "99:99";
                      return { staff, staffShifts, sortTime };
                    })
                    .sort((a, b) => a.sortTime.localeCompare(b.sortTime))
                    .map(({ staff, staffShifts }) => (
                      <TableRow key={staff.username} className="hover:bg-muted/30">
                        <TableCell className="sticky left-0 bg-card z-10 font-medium">
                          <span>{staff.nickName || staff.fullName}</span>
                        </TableCell>
                        {days.map((day: string) => {
                          const shift = staffShifts[day];
                          return (
                            <TableCell key={day} className="text-center p-2">
                              {shift ? (
                                <ShiftCellWithActions 
                                  shift={shift} 
                                  groups={settings?.groups} 
                                  onRefresh={() => queryClient.invalidateQueries({ queryKey: [api.shifts.getRoster.path] })}
                                  onDragStart={(s, copy) => { setDraggedShift(s); setIsCopyMode(copy); }}
                                  onDragEnd={() => { setDraggedShift(null); setIsCopyMode(false); }}
                                />
                              ) : (
                                <DroppableEmptyCell
                                  username={staff.username}
                                  day={day}
                                  staffName={staff.nickName || staff.fullName}
                                  groups={settings?.groups}
                                  onDrop={handleDropShift}
                                  isDragging={!!draggedShift}
                                  isCopyMode={isCopyMode}
                                />
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                </>
              ) : (
                bookedShifts.length > 0 ? (
                  bookedShifts.map((shift: any, idx: number) => (
                    <TableRow key={`${shift.username}-${shift.date}-${idx}`} className="hover:bg-muted/30">
                      <TableCell className="sticky left-0 bg-card z-10 font-medium">
                        <div className="flex flex-col">
                          <span>{shift.nickName || shift.fullName}</span>
                          <span className="text-xs text-muted-foreground">{shift.date}</span>
                        </div>
                      </TableCell>
                      {days.map((day: string) => (
                        <TableCell key={day} className="text-center p-2">
                          {shift.date === day ? (
                            <div className={`h-10 rounded-lg p-1 flex flex-col justify-center items-center ${
                              shift.shiftGroup === "open" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" :
                              shift.shiftGroup === "lunch" ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300" :
                              shift.shiftGroup === "dinner" ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" :
                              "bg-slate-100 text-slate-700 dark:bg-slate-800/50 dark:text-slate-300"
                            }`}>
                              <span className="text-[10px] font-bold uppercase whitespace-nowrap">{getShiftDisplayName(shift.shiftGroup)}</span>
                              <span className="text-[10px] whitespace-nowrap">{shift.startTime}</span>
                            </div>
                          ) : null}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={days.length + 1} className="text-center py-8 text-muted-foreground">
                      {language === "th" ? "ยังไม่มีตารางที่ book ไว้" : "No booked shifts yet"}
                    </TableCell>
                  </TableRow>
                )
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}

function ManagerBookShiftDialog({ groups, day, children }: { groups: any; day: string; children: React.ReactNode }) {
  const { language } = useI18n();
  const [open, setOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [selectedUser, setSelectedUser] = useState("");
  const [note, setNote] = useState("");
  const queryClient = useQueryClient();
  const { data: rosterData } = useRoster(day);

  const handleSubmit = async () => {
    if (!selectedUser || !selectedGroup || !selectedTime) return;
    const token = localStorage.getItem("bk_token") || "";
    try {
      await apiRequest("POST", api.shifts.setForUser.path, {
        token,
        username: selectedUser,
        date: day,
        shiftGroup: selectedGroup,
        startTime: selectedTime,
        note,
      });
      queryClient.invalidateQueries({ queryKey: [api.shifts.getRoster.path] });
      setOpen(false);
      setSelectedGroup("");
      setSelectedTime("");
      setSelectedUser("");
      setNote("");
    } catch (err) {
      console.error(err);
    }
  };

  const staffUsers = rosterData?.users?.filter((u: any) => u.role === "staff" && u.active === 1) || [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {language === "th" ? "สร้างตารางงาน" : "Create Schedule"} - {format(parseISO(day), "d MMM yyyy")}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>{language === "th" ? "เลือกพนักงาน" : "Select Staff"}</Label>
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger>
                <SelectValue placeholder={language === "th" ? "เลือกพนักงาน..." : "Select staff..."} />
              </SelectTrigger>
              <SelectContent>
                {staffUsers.map((u: any) => (
                  <SelectItem key={u.username} value={u.username}>
                    {u.nickName || u.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{language === "th" ? "กะงาน" : "Shift Group"}</Label>
            <Select value={selectedGroup} onValueChange={(v) => { setSelectedGroup(v); setSelectedTime(""); }}>
              <SelectTrigger>
                <SelectValue placeholder={language === "th" ? "เลือกกะ..." : "Select shift..."} />
              </SelectTrigger>
              <SelectContent>
                {groups?.map((g: any) => (
                  <SelectItem key={g.key} value={g.key}>{g.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedGroup && (
            <div className="space-y-2">
              <Label>{language === "th" ? "เวลา" : "Time"}</Label>
              <Select value={selectedTime} onValueChange={setSelectedTime}>
                <SelectTrigger>
                  <SelectValue placeholder={language === "th" ? "เลือกเวลา..." : "Select time..."} />
                </SelectTrigger>
                <SelectContent>
                  {groups?.find((g: any) => g.key === selectedGroup)?.times?.map((time: string) => (
                    <SelectItem key={time} value={time}>{time}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label>{language === "th" ? "หมายเหตุ" : "Note"}</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional..." />
          </div>
          <Button onClick={handleSubmit} className="w-full" disabled={!selectedUser || !selectedGroup || !selectedTime}>
            {language === "th" ? "บันทึก" : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ManagerMonthlyView() {
  const { language } = useI18n();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"my" | "team">("my");
  const [selectedCell, setSelectedCell] = useState<{ date: string; manager?: any } | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const month = currentDate.getMonth() + 1;
  const year = currentDate.getFullYear();
  
  const { data: myData, isLoading: isLoadingMy } = useMyMonth(month, year);
  const { data: teamData, isLoading: isLoadingTeam } = useManagerTeamMonth(month, year);
  const { data: settings } = useSettings();
  
  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const isLoading = viewMode === "my" ? isLoadingMy : isLoadingTeam;
  const data = viewMode === "my" ? myData : teamData;

  if (isLoading) return <WorkPageSkeleton />;

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  const startDayOfWeek = getDay(monthStart);
  
  const shiftsByDate: Record<string, any> = {};
  if (viewMode === "my") {
    data?.shifts?.forEach((s: any) => {
      shiftsByDate[s.date] = s;
    });
  }

  const teamShiftsByDateAndUser: Record<string, Record<string, any>> = {};
  if (viewMode === "team" && teamData?.shifts) {
    teamData.shifts.forEach((s: any) => {
      if (!teamShiftsByDateAndUser[s.date]) {
        teamShiftsByDateAndUser[s.date] = {};
      }
      teamShiftsByDateAndUser[s.date][s.username] = s;
    });
  }

  const weekDays = language === "th" 
    ? ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"]
    : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const monthNames = language === "th"
    ? ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"]
    : ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const groupColors: Record<string, string> = {
    open: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
    swing: "bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300 dark:border-cyan-800",
    lunch: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800",
    dinner: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800",
    close: "bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-900/30 dark:text-pink-300 dark:border-pink-800",
    late: "bg-slate-700 text-slate-100 border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700",
  };

  const groupColorsBadge: Record<string, string> = {
    open: "bg-blue-500",
    swing: "bg-cyan-500",
    lunch: "bg-orange-500",
    dinner: "bg-purple-500",
    close: "bg-pink-500",
    late: "bg-slate-600",
  };

  const managers = teamData?.managers || [];

  const handleCellClick = (dateStr: string, manager?: any) => {
    if (viewMode === "team") {
      setSelectedCell({ date: dateStr, manager });
      setEditDialogOpen(true);
    }
  };

  const handleSaveShift = async (shiftGroup: string, startTime: string, note: string) => {
    if (!selectedCell) return;
    const token = localStorage.getItem("bk_token") || "";
    try {
      await apiRequest("POST", api.shifts.setForUser.path, {
        token,
        username: selectedCell.manager?.username,
        date: selectedCell.date,
        shiftGroup,
        startTime,
        note,
      });
      queryClient.invalidateQueries({ queryKey: [api.shifts.getManagerTeamMonth.path] });
      setEditDialogOpen(false);
      setSelectedCell(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteShift = async () => {
    if (!selectedCell?.manager) return;
    const token = localStorage.getItem("bk_token") || "";
    try {
      await apiRequest("POST", api.shifts.deleteForUser.path, {
        token,
        username: selectedCell.manager.username,
        date: selectedCell.date,
      });
      queryClient.invalidateQueries({ queryKey: [api.shifts.getManagerTeamMonth.path] });
      setEditDialogOpen(false);
      setSelectedCell(null);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold text-foreground">
            {viewMode === "my" 
              ? (language === "th" ? "ตารางงานของฉัน" : "My Schedule")
              : (language === "th" ? "ตารางงานทีมผู้จัดการ" : "Manager Team Schedule")}
          </h2>
          <p className="text-muted-foreground flex items-center gap-2 mt-1">
            <CalendarIcon className="w-4 h-4" />
            {monthNames[month - 1]} {year}
          </p>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-muted/30 p-1 rounded-full border border-border/50">
            <Button 
              variant={viewMode === "my" ? "default" : "ghost"} 
              size="sm"
              onClick={() => setViewMode("my")}
              className="rounded-full text-xs"
              data-testid="button-view-my-schedule"
            >
              <UserCog className="w-4 h-4 mr-1" />
              {language === "th" ? "ของฉัน" : "My"}
            </Button>
            <Button 
              variant={viewMode === "team" ? "default" : "ghost"} 
              size="sm"
              onClick={() => setViewMode("team")}
              className="rounded-full text-xs"
              data-testid="button-view-team-schedule"
            >
              <Users className="w-4 h-4 mr-1" />
              {language === "th" ? "ทีม" : "Team"}
            </Button>
          </div>
          <div className="flex items-center bg-muted/30 p-1 rounded-full border border-border/50">
            <Button variant="ghost" size="icon" onClick={handlePrevMonth} className="h-8 w-8 rounded-full" data-testid="button-prev-month">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="h-4 w-px bg-border/50 mx-1" />
            <Button variant="ghost" size="icon" onClick={handleNextMonth} className="h-8 w-8 rounded-full" data-testid="button-next-month">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {viewMode === "team" && managers.length > 0 && (
        <Card className="glass-card border-none shadow-lg p-3">
          <div className="flex flex-wrap gap-2">
            {managers.map((m: any, idx: number) => {
              const colors = ["bg-red-500", "bg-blue-500", "bg-green-500", "bg-yellow-500", "bg-purple-500", "bg-pink-500", "bg-indigo-500", "bg-teal-500"];
              const color = colors[idx % colors.length];
              return (
                <div key={m.username} className="flex items-center gap-1.5 text-xs">
                  <div className={`w-3 h-3 rounded-full ${color}`} />
                  <span className="text-muted-foreground">{m.nickName || m.fullName || m.username}</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Card className="glass-card overflow-hidden border-none shadow-xl p-4">
        <div className="grid grid-cols-7 gap-1 md:gap-2">
          {weekDays.map((day, i) => (
            <div key={day} className={`text-center py-2 text-xs md:text-sm font-bold uppercase tracking-wider ${i === 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
              {day}
            </div>
          ))}
          
          {Array.from({ length: startDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}
          
          {days.map((day) => {
            const dateStr = format(day, "yyyy-MM-dd");
            const isToday = format(new Date(), "yyyy-MM-dd") === dateStr;
            const isSunday = getDay(day) === 0;
            
            if (viewMode === "my") {
              const shift = shiftsByDate[dateStr];
              return (
                <div 
                  key={dateStr} 
                  className={`aspect-square rounded-xl border p-1 md:p-2 flex flex-col transition-all
                    ${isToday ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}
                    ${shift ? groupColors[shift.shiftGroup?.toLowerCase()] || 'bg-muted/30 border-border/50' : 'bg-muted/10 border-border/30'}
                  `}
                  data-testid={`day-cell-${dateStr}`}
                >
                  <span className={`text-xs md:text-sm font-bold ${isSunday ? 'text-destructive' : ''} ${isToday ? 'text-primary' : ''}`}>
                    {format(day, "d")}
                  </span>
                  {shift && (
                    <div className="flex-1 flex flex-col justify-center items-center">
                      <span className="text-[8px] md:text-[10px] font-bold uppercase tracking-wider">{getShiftDisplayName(shift.shiftGroup)}</span>
                      <span className="text-[7px] md:text-[9px] hidden md:block">{shift.startTime}</span>
                    </div>
                  )}
                </div>
              );
            } else {
              const dayShifts = teamShiftsByDateAndUser[dateStr] || {};
              const managersWithShifts = managers.filter((m: any) => dayShifts[m.username]);
              const managersWithoutShifts = managers.filter((m: any) => !dayShifts[m.username]);
              const colors = ["bg-red-500", "bg-blue-500", "bg-green-500", "bg-yellow-500", "bg-purple-500", "bg-pink-500", "bg-indigo-500", "bg-teal-500"];
              
              return (
                <div 
                  key={dateStr} 
                  className={`min-h-[80px] md:min-h-[100px] rounded-xl border p-1 md:p-2 flex flex-col transition-all bg-muted/10 border-border/30
                    ${isToday ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}
                  `}
                  data-testid={`day-cell-${dateStr}`}
                >
                  <span className={`text-xs md:text-sm font-bold mb-1 ${isSunday ? 'text-destructive' : ''} ${isToday ? 'text-primary' : ''}`}>
                    {format(day, "d")}
                  </span>
                  <div className="flex-1 flex flex-col gap-0.5 overflow-hidden">
                    {managersWithShifts.map((m: any) => {
                      const shift = dayShifts[m.username];
                      const idx = managers.findIndex((mgr: any) => mgr.username === m.username);
                      const color = colors[idx % colors.length];
                      return (
                        <div
                          key={m.username}
                          className={`flex items-center gap-1 px-1 py-0.5 rounded text-[7px] md:text-[8px] cursor-pointer hover:opacity-80 transition-opacity ${groupColors[shift.shiftGroup?.toLowerCase()] || 'bg-muted'}`}
                          onClick={() => handleCellClick(dateStr, m)}
                          data-testid={`shift-${dateStr}-${m.username}`}
                        >
                          <div className={`w-2 h-2 rounded-full ${color} shrink-0`} />
                          <span className="truncate font-medium">{getShiftDisplayName(shift.shiftGroup)}</span>
                        </div>
                      );
                    })}
                    {managersWithoutShifts.length > 0 && (
                      <div className="flex flex-wrap gap-0.5 mt-auto">
                        {managersWithoutShifts.map((m: any) => {
                          const idx = managers.findIndex((mgr: any) => mgr.username === m.username);
                          const color = colors[idx % colors.length];
                          return (
                            <div
                              key={m.username}
                              className={`w-2 h-2 rounded-full ${color} opacity-30 cursor-pointer hover:opacity-60 transition-opacity`}
                              onClick={() => handleCellClick(dateStr, m)}
                              title={`${m.nickName || m.fullName}: OFF - Click to add`}
                              data-testid={`add-shift-${dateStr}-${m.username}`}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            }
          })}
        </div>
      </Card>

      <Card className="glass-card border-none shadow-lg p-4">
        <h3 className="font-bold text-foreground mb-3">
          {viewMode === "my" 
            ? (language === "th" ? "สรุปประจำเดือน" : "Monthly Summary")
            : (language === "th" ? "สรุปตารางทีม" : "Team Summary")}
        </h3>
        {viewMode === "my" ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(groupColors).map(([key, colorClass]) => {
                const count = data?.shifts?.filter((s: any) => s.shiftGroup?.toLowerCase() === key).length || 0;
                return (
                  <div key={key} className={`rounded-xl border p-3 ${colorClass}`}>
                    <span className="text-[10px] font-bold uppercase tracking-wider block">{key}</span>
                    <span className="text-2xl font-black">{count}</span>
                    <span className="text-[10px] ml-1">{language === "th" ? "กะ" : "shifts"}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 pt-4 border-t border-border/50">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{language === "th" ? "รวมทั้งหมด" : "Total Shifts"}</span>
                <span className="text-xl font-bold text-primary">{data?.shifts?.length || 0}</span>
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-3">
            {managers.map((m: any, idx: number) => {
              const managerShifts = teamData?.shifts?.filter((s: any) => s.username === m.username) || [];
              const colors = ["bg-red-500", "bg-blue-500", "bg-green-500", "bg-yellow-500", "bg-purple-500", "bg-pink-500", "bg-indigo-500", "bg-teal-500"];
              const color = colors[idx % colors.length];
              return (
                <div key={m.username} className="flex items-center justify-between p-2 rounded-lg bg-muted/20">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${color}`} />
                    <span className="font-medium text-sm">{m.nickName || m.fullName || m.username}</span>
                    <span className="text-xs text-muted-foreground">({m.position || m.role})</span>
                  </div>
                  <span className="text-lg font-bold text-primary">{managerShifts.length} {language === "th" ? "กะ" : "shifts"}</span>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <ManagerShiftEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        selectedCell={selectedCell}
        teamShiftsByDateAndUser={teamShiftsByDateAndUser}
        groups={settings?.groups}
        onSave={handleSaveShift}
        onDelete={handleDeleteShift}
        language={language}
      />
    </div>
  );
}

function ManagerShiftEditDialog({
  open,
  onOpenChange,
  selectedCell,
  teamShiftsByDateAndUser,
  groups,
  onSave,
  onDelete,
  language,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCell: { date: string; manager?: any } | null;
  teamShiftsByDateAndUser: Record<string, Record<string, any>>;
  groups: any;
  onSave: (shiftGroup: string, startTime: string, note: string) => void;
  onDelete: () => void;
  language: string;
}) {
  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [useCustomTime, setUseCustomTime] = useState(false);
  const [customStartTime, setCustomStartTime] = useState("08:00");
  const [customEndTime, setCustomEndTime] = useState("16:00");
  const [note, setNote] = useState("");

  const existingShift = selectedCell?.manager && teamShiftsByDateAndUser[selectedCell.date]?.[selectedCell.manager.username];

  const timeOptions = Array.from({ length: 24 }, (_, i) => {
    const hour = i.toString().padStart(2, "0");
    return `${hour}:00`;
  });

  const handleOpen = (isOpen: boolean) => {
    if (isOpen && existingShift) {
      setSelectedGroup(existingShift.shiftGroup);
      setSelectedTime(existingShift.startTime);
      setNote(existingShift.note || "");
    } else if (isOpen) {
      setSelectedGroup("");
      setSelectedTime("");
      setNote("");
    }
    onOpenChange(isOpen);
  };

  const handleSubmit = () => {
    if (!selectedGroup) return;
    const finalTime = useCustomTime ? `${customStartTime} - ${customEndTime}` : selectedTime;
    if (!finalTime) return;
    onSave(selectedGroup, finalTime, note);
  };

  if (!selectedCell) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {existingShift 
              ? (language === "th" ? "แก้ไขตารางงาน" : "Edit Schedule")
              : (language === "th" ? "เพิ่มตารางงาน" : "Add Schedule")}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {selectedCell.manager?.nickName || selectedCell.manager?.fullName || selectedCell.manager?.username}
            </span>
            {" - "}
            {format(parseISO(selectedCell.date), "EEEE d MMM yyyy")}
          </div>
          
          <div className="space-y-2">
            <Label>{language === "th" ? "กะงาน" : "Shift Group"}</Label>
            <Select value={selectedGroup} onValueChange={(v) => { setSelectedGroup(v); setSelectedTime(""); }}>
              <SelectTrigger>
                <SelectValue placeholder={language === "th" ? "เลือกกะ..." : "Select shift..."} />
              </SelectTrigger>
              <SelectContent>
                {groups?.map((g: any) => (
                  <SelectItem key={g.key} value={g.key}>{g.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedGroup && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="customTimeTeam" 
                  checked={useCustomTime} 
                  onChange={(e) => setUseCustomTime(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="customTimeTeam" className="cursor-pointer">
                  {language === "th" ? "กำหนดเวลาเอง" : "Custom Time"}
                </Label>
              </div>
              
              {useCustomTime ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>{language === "th" ? "เวลาเริ่ม" : "Start Time"}</Label>
                    <Select value={customStartTime} onValueChange={setCustomStartTime}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {timeOptions.map((time) => (
                          <SelectItem key={time} value={time}>{time}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{language === "th" ? "เวลาจบ" : "End Time"}</Label>
                    <Select value={customEndTime} onValueChange={setCustomEndTime}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {timeOptions.map((time) => (
                          <SelectItem key={time} value={time}>{time}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>{language === "th" ? "เวลา" : "Time"}</Label>
                  <Select value={selectedTime} onValueChange={setSelectedTime}>
                    <SelectTrigger>
                      <SelectValue placeholder={language === "th" ? "เลือกเวลา..." : "Select time..."} />
                    </SelectTrigger>
                    <SelectContent>
                      {groups?.find((g: any) => g.key === selectedGroup)?.times?.map((time: string) => (
                        <SelectItem key={time} value={time}>{time}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>{language === "th" ? "หมายเหตุ" : "Note"}</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional..." />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSubmit} className="flex-1" disabled={!selectedGroup || (!useCustomTime && !selectedTime)}>
              {language === "th" ? "บันทึก" : "Save"}
            </Button>
            {existingShift && (
              <Button variant="destructive" onClick={onDelete}>
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function WorkPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Skeleton className="h-10 w-48 rounded-xl" />
        <Skeleton className="h-10 w-32 rounded-full" />
      </div>
      <Skeleton className="h-64 w-full rounded-2xl" />
    </div>
  );
}
