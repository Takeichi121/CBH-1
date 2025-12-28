import { useState } from "react";
import { useI18n } from "@/hooks/use-i18n";
import { useMyWeek, useMyMonth, useBookShift, useCancelShift, useRoster } from "@/hooks/use-shifts";
import { useSettings } from "@/hooks/use-settings";
import { useAuth } from "@/hooks/use-auth";
import { format, addDays, startOfWeek, addWeeks, subWeeks, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths } from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, AlertCircle, Clock, Trash2, EyeOff, Eye, Users, UserCog, ArrowLeft, LayoutDashboard } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";

const bookSchema = z.object({
  date: z.string().min(1, "Date is required"),
  shiftGroup: z.string().min(1, "Shift group is required"),
  startTime: z.string().min(1, "Time period is required"),
  note: z.string().optional(),
});

type BookFormValues = z.infer<typeof bookSchema>;

export default function WorkPage() {
  const { user } = useAuth();
  const isManager = user?.role === "manager" || user?.role === "admin";

  if (isManager) {
    return <ManagerDashboard />;
  }

  return <StaffDashboard />;
}

function StaffDashboard() {
  const { user } = useAuth();
  const { t, language } = useI18n();
  const [currentDate, setCurrentDate] = useState(new Date());
  const dateParam = format(currentDate, "yyyy-MM-dd");
  
  const { data, isLoading, error } = useMyWeek(dateParam);
  const { data: rosterData, isLoading: isLoadingRoster } = useRoster(dateParam);
  const { data: settings } = useSettings();
  const { mutate: cancelShift } = useCancelShift();

  const handlePrevWeek = () => setCurrentDate(subWeeks(currentDate, 1));
  const handleNextWeek = () => setCurrentDate(addWeeks(currentDate, 1));

  if (isLoading || isLoadingRoster) return <WorkPageSkeleton />;
  if (error) return <div className="p-8 text-center text-red-500">Error loading schedule: {error.message}</div>;

  const weekStartStr = data?.weekRange?.start;
  const weekEndStr = data?.weekRange?.end;
  const days = data?.weekRange?.days || [];
  const displayRange = weekStartStr ? `${format(new Date(weekStartStr), "MMM d")} - ${format(new Date(weekEndStr), "MMM d, yyyy")}` : "";

  const myShiftsByDate: Record<string, any> = {};
  data?.items?.forEach((s: any) => {
    myShiftsByDate[s.date] = s;
  });

  const myShiftsThisWeek = data?.items?.length || 0;

  const labels = {
    dashboard: language === "th" ? "ภาพรวม" : "Dashboard",
    mySchedule: language === "th" ? "ตารางงานของฉัน" : "My Schedule",
    thisWeek: language === "th" ? "สัปดาห์นี้" : "This Week",
    shiftsBooked: language === "th" ? "กะที่จองแล้ว" : "shifts booked",
    teamSchedule: language === "th" ? "ตารางเพื่อนร่วมงาน" : "Team Schedule",
  };

  const groupColors: Record<string, string> = {
    open: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300",
    lunch: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300",
    dinner: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300",
    late: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/50 dark:text-slate-300",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <LayoutDashboard className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">{labels.dashboard}</h2>
            <p className="text-muted-foreground text-sm flex items-center gap-2">
              <CalendarIcon className="w-4 h-4" />
              {displayRange}
            </p>
          </div>
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
        <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{language === "th" ? "ระบบปิด" : "System Closed"}</AlertTitle>
          <AlertDescription>
            {language === "th" ? "ไม่สามารถจองหรือแก้ไขกะได้ในขณะนี้" : "You cannot book or edit shifts at this time."}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="glass-card border-none shadow-lg p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wider">{labels.thisWeek}</div>
          <div className="text-3xl font-bold text-primary mt-1">{myShiftsThisWeek}</div>
          <div className="text-xs text-muted-foreground">{labels.shiftsBooked}</div>
        </Card>
        {Object.entries(groupColors).map(([key, colorClass]) => {
          const count = data?.items?.filter((s: any) => s.shiftGroup?.toLowerCase() === key).length || 0;
          if (count === 0) return null;
          return (
            <Card key={key} className={`border p-4 ${colorClass}`}>
              <div className="text-xs uppercase tracking-wider font-bold">{key}</div>
              <div className="text-2xl font-bold mt-1">{count}</div>
            </Card>
          );
        })}
      </div>

      <div>
        <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
          <UserCog className="w-5 h-5 text-primary" />
          {labels.mySchedule}
        </h3>
        <Card className="glass-card overflow-hidden border-none shadow-xl">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  {days.map((day: string) => (
                    <TableHead key={day} className="text-center min-w-[100px]">
                      <div className="flex flex-col items-center py-2">
                        <span className="text-xs uppercase text-muted-foreground font-medium">
                          {t(format(parseISO(day), "EEEE").toLowerCase() as any)}
                        </span>
                        <span className="text-2xl font-bold text-foreground mt-1">
                          {format(parseISO(day), "d")}
                        </span>
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="hover:bg-muted/30 transition-colors">
                  {days.map((day: string) => {
                    const shift = myShiftsByDate[day];
                    return (
                      <TableCell key={day} className="p-2">
                        {shift ? (
                          <div 
                            className={`h-20 w-full rounded-xl p-2 border shadow-sm flex flex-col justify-center items-center gap-1 cursor-pointer hover:brightness-95 transition-all ${groupColors[shift.shiftGroup] || 'bg-muted'}`}
                            onClick={() => {
                              if (!data.closed && confirm(language === "th" ? "ยกเลิกกะนี้?" : "Cancel this shift?")) {
                                cancelShift(day);
                              }
                            }}
                            data-testid={`shift-cell-${day}`}
                          >
                            <span className="text-[10px] font-bold uppercase tracking-wider">{shift.shiftGroup}</span>
                            <span className="text-xs font-semibold">{shift.startTime}</span>
                          </div>
                        ) : (
                          <BookShiftDialog 
                            groups={settings?.groups} 
                            day={day} 
                            disabled={data.closed}
                            settings={settings}
                          >
                            <div className={`h-20 w-full rounded-xl border-2 border-dashed border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer flex items-center justify-center group ${data.closed ? 'opacity-50 cursor-not-allowed' : ''}`}>
                              <Plus className="w-5 h-5 text-primary/50 group-hover:text-primary" />
                            </div>
                          </BookShiftDialog>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      <div>
        <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          {labels.teamSchedule}
        </h3>
        <Card className="glass-card overflow-hidden border-none shadow-xl">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="min-w-[120px]">{language === "th" ? "เพื่อนร่วมงาน" : "Teammate"}</TableHead>
                  {days.map((day: string) => (
                    <TableHead key={day} className="text-center min-w-[80px]">
                      <span className="text-xs">{format(parseISO(day), "EEE d")}</span>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rosterData?.users
                  ?.filter((u: any) => u.username !== user?.username && u.active === 1 && u.role === "staff")
                  .map((u: any) => {
                    const staffShifts: Record<string, any> = {};
                    rosterData.roster?.filter((s: any) => s.username === u.username).forEach((s: any) => {
                      staffShifts[s.date] = s;
                    });
                    return (
                      <TableRow key={u.username} className="hover:bg-muted/10 transition-colors">
                        <TableCell className="font-medium text-sm">
                          {u.nickName || u.fullName || u.username}
                        </TableCell>
                        {days.map((day: string) => {
                          const s = staffShifts[day];
                          return (
                            <TableCell key={day} className="text-center p-1">
                              {s ? (
                                <Badge className={`text-[9px] ${groupColors[s.shiftGroup] || ''}`}>
                                  {s.shiftGroup}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground text-xs">-</span>
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
    </div>
  );
}

function ManagerDashboard() {
  const { language } = useI18n();
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const dateParam = format(currentDate, "yyyy-MM-dd");
  const month = currentDate.getMonth() + 1;
  const year = currentDate.getFullYear();
  
  const { data: weekData, isLoading: isLoadingWeek } = useMyWeek(dateParam);
  const { data: monthData, isLoading: isLoadingMonth } = useMyMonth(month, year);
  const { data: rosterData, isLoading: isLoadingRoster } = useRoster(dateParam);
  const queryClient = useQueryClient();

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

  if (isLoadingWeek || isLoadingMonth || isLoadingRoster) return <WorkPageSkeleton />;

  const weekRange = rosterData?.weekRange;
  const displayRange = weekRange ? `${format(new Date(weekRange.start), "MMM d")} - ${format(new Date(weekRange.end), "MMM d, yyyy")}` : "";

  const myShiftsByDate: Record<string, any> = {};
  weekData?.items?.forEach((s: any) => {
    myShiftsByDate[s.date] = s;
  });

  const myShiftsThisWeek = weekData?.items?.length || 0;
  const myShiftsThisMonth = monthData?.shifts?.length || 0;

  const staffCount = rosterData?.users?.filter((u: any) => u.role === "staff" && u.active === 1).length || 0;
  const totalShiftsBooked = rosterData?.roster?.length || 0;

  const labels = {
    dashboard: language === "th" ? "ภาพรวม" : "Dashboard",
    mySchedule: language === "th" ? "ตารางงานของฉัน" : "My Schedule",
    employeeSchedule: language === "th" ? "ตารางพนักงาน" : "Employee Schedule",
    thisWeek: language === "th" ? "สัปดาห์นี้" : "This Week",
    thisMonth: language === "th" ? "เดือนนี้" : "This Month",
    shiftsBooked: language === "th" ? "กะของฉัน" : "my shifts",
    totalStaff: language === "th" ? "พนักงานทั้งหมด" : "total staff",
    totalBooked: language === "th" ? "กะที่จองแล้ว" : "shifts booked",
    staff: language === "th" ? "พนักงาน" : "Staff",
    status: language === "th" ? "สถานะ" : "Status",
  };

  const groupColors: Record<string, string> = {
    open: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300",
    lunch: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300",
    dinner: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300",
    late: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/50 dark:text-slate-300",
  };

  const days = weekRange?.days || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <LayoutDashboard className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">{labels.dashboard}</h2>
            <p className="text-muted-foreground text-sm flex items-center gap-2">
              <CalendarIcon className="w-4 h-4" />
              {displayRange}
            </p>
          </div>
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="glass-card border-none shadow-lg p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wider">{labels.thisWeek}</div>
          <div className="text-3xl font-bold text-primary mt-1">{myShiftsThisWeek}</div>
          <div className="text-xs text-muted-foreground">{labels.shiftsBooked}</div>
        </Card>
        <Card className="glass-card border-none shadow-lg p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wider">{labels.thisMonth}</div>
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-1">{myShiftsThisMonth}</div>
          <div className="text-xs text-muted-foreground">{labels.shiftsBooked}</div>
        </Card>
        <Card className="glass-card border-none shadow-lg p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wider">{labels.staff}</div>
          <div className="text-3xl font-bold text-green-600 dark:text-green-400 mt-1">{staffCount}</div>
          <div className="text-xs text-muted-foreground">{labels.totalStaff}</div>
        </Card>
        <Card className="glass-card border-none shadow-lg p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wider">{labels.thisWeek}</div>
          <div className="text-3xl font-bold text-orange-600 dark:text-orange-400 mt-1">{totalShiftsBooked}</div>
          <div className="text-xs text-muted-foreground">{labels.totalBooked}</div>
        </Card>
      </div>

      <div>
        <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
          <UserCog className="w-5 h-5 text-primary" />
          {labels.mySchedule}
        </h3>
        <Card className="glass-card overflow-hidden border-none shadow-xl">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  {days.map((day: any) => (
                    <TableHead key={day.date} className="text-center min-w-[100px]">
                      <div className="flex flex-col items-center py-2">
                        <span className="text-xs uppercase text-muted-foreground font-medium">
                          {day.dayName}
                        </span>
                        <span className="text-2xl font-bold text-foreground mt-1">
                          {day.date ? format(parseISO(day.date), "d") : ""}
                        </span>
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="hover:bg-muted/30 transition-colors">
                  {days.map((day: any) => {
                    const shift = myShiftsByDate[day.date];
                    return (
                      <TableCell key={day.date} className="p-2 text-center">
                        {shift ? (
                          <div className={`inline-block px-3 py-2 rounded-xl border ${groupColors[shift.shiftGroup] || 'bg-muted'}`}>
                            <div className="text-[10px] font-bold uppercase tracking-wider">{shift.shiftGroup}</div>
                            <div className="text-xs font-semibold">{shift.startTime}</div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      <div>
        <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          {labels.employeeSchedule}
        </h3>
        <Card className="glass-card overflow-hidden border-none shadow-xl">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="sticky left-0 bg-card z-10 min-w-[150px]">
                    {labels.staff}
                  </TableHead>
                  {days.map((day: any) => (
                    <TableHead key={day.date} className="text-center min-w-[80px]">
                      <div className="text-xs font-medium">{day.dayName}</div>
                      <div className="text-xs text-muted-foreground">{day.date ? format(parseISO(day.date), "d MMM") : ""}</div>
                    </TableHead>
                  ))}
                  <TableHead className="text-center min-w-[60px]">
                    {labels.status}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rosterData?.staffWithShifts?.map((staff: any) => (
                  <TableRow key={staff.username} className={staff.active === 0 ? "opacity-50" : ""}>
                    <TableCell className="sticky left-0 bg-card z-10 font-medium">
                      <div className="flex flex-col">
                        <span>{staff.nickName || staff.fullName}</span>
                        <span className="text-xs text-muted-foreground">@{staff.username}</span>
                      </div>
                    </TableCell>
                    {days.map((day: any) => {
                      const shift = staff.shifts?.[day.date];
                      return (
                        <TableCell key={day.date} className="text-center p-1">
                          {shift ? (
                            <Badge className={`text-[9px] ${groupColors[shift.shiftGroup] || ''}`}>
                              {shift.shiftGroup}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-center">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleUpdateUserStatus(staff.username, staff.active === 1 ? 0 : 1)}
                        data-testid={`button-toggle-status-${staff.username}`}
                      >
                        {staff.active === 1 ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </div>
  );
}

function BookShiftDialog({ children, groups, day, disabled, settings }: { children: React.ReactNode; groups: any; day: string; disabled?: boolean; settings?: any }) {
  const [open, setOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [note, setNote] = useState("");
  const { mutate: bookShift, isPending } = useBookShift();
  const queryClient = useQueryClient();

  const handleBook = () => {
    if (!selectedGroup || !selectedTime) return;
    
    bookShift(
      { date: day, shiftGroup: selectedGroup, startTime: selectedTime, note },
      {
        onSuccess: () => {
          setOpen(false);
          setSelectedGroup("");
          setSelectedTime("");
          setNote("");
          queryClient.invalidateQueries({ queryKey: [api.shifts.getMyWeek.path] });
        },
      }
    );
  };

  if (disabled) {
    return <>{children}</>;
  }

  const groupConfig = settings?.groups?.[selectedGroup];
  const timeSlots = groupConfig?.timeSlots || [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Book Shift - {format(parseISO(day), "EEE, MMM d")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Shift Group</Label>
            <Select value={selectedGroup} onValueChange={(v) => { setSelectedGroup(v); setSelectedTime(""); }}>
              <SelectTrigger data-testid="select-shift-group">
                <SelectValue placeholder="Select shift group" />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(groups || {}).map((g) => (
                  <SelectItem key={g} value={g}>{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {selectedGroup && (
            <div className="space-y-2">
              <Label>Time</Label>
              <Select value={selectedTime} onValueChange={setSelectedTime}>
                <SelectTrigger data-testid="select-time">
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.map((t: string) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Note (optional)</Label>
            <Textarea 
              value={note} 
              onChange={(e) => setNote(e.target.value)} 
              placeholder="Any notes..."
              data-testid="input-note"
            />
          </div>

          <Button 
            onClick={handleBook} 
            disabled={!selectedGroup || !selectedTime || isPending}
            className="w-full"
            data-testid="button-book-shift"
          >
            {isPending ? "Booking..." : "Book Shift"}
          </Button>
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
      <Skeleton className="h-64 w-full rounded-2xl" />
    </div>
  );
}
