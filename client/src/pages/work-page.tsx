import { useState } from "react";
import { useI18n } from "@/hooks/use-i18n";
import { useMyWeek, useMyMonth, useBookShift, useCancelShift, useRoster } from "@/hooks/use-shifts";
import { useSettings } from "@/hooks/use-settings";
import { useAuth } from "@/hooks/use-auth";
import { format, addDays, startOfWeek, addWeeks, subWeeks, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths } from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, AlertCircle, Clock, Trash2, EyeOff, Eye } from "lucide-react";
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

export default function WorkPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [currentDate, setCurrentDate] = useState(new Date());
  // Format date as YYYY-MM-DD for API
  const dateParam = format(currentDate, "yyyy-MM-dd");
  
  const { data, isLoading, error } = useMyWeek(dateParam);
  const { data: rosterData, isLoading: isLoadingRoster } = useRoster(dateParam);
  const { data: settings } = useSettings();
  const { mutate: cancelShift } = useCancelShift();
  const queryClient = useQueryClient();
  const isManager = user?.role === "manager" || user?.role === "admin";

  // For managers, show monthly view
  if (isManager) {
    return <ManagerMonthlyView />;
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
  const days = data?.weekRange?.days || [];
  const displayRange = weekStartStr ? `${format(new Date(weekStartStr), "MMM d")} - ${format(new Date(weekEndStr), "MMM d, yyyy")}` : "";

  // My shifts for the week mapped by date
  const myShiftsByDate: Record<string, any> = {};
  data?.items?.forEach((s: any) => {
    myShiftsByDate[s.date] = s;
  });

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
        <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-800">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>System Closed</AlertTitle>
          <AlertDescription>
            You cannot book or edit shifts at this time.
          </AlertDescription>
        </Alert>
      )}

      <Card className="glass-card overflow-hidden border-none shadow-xl">
        <div className="overflow-x-auto -mx-4 md:mx-0">
          <div className="min-w-[800px] md:min-w-0 p-4 md:p-0">
            <Table>
              <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="w-[150px] font-bold">Staff Member</TableHead>
                {days.map((day: string) => (
                  <TableHead key={day} className="text-center min-w-[120px]">
                    <div className="flex flex-col items-center py-2">
                      <span className="text-sm uppercase text-destructive font-black tracking-tighter">
                        {t(format(parseISO(day), "EEEE").toLowerCase() as any)}
                      </span>
                      <span className="text-3xl font-black text-foreground mt-1">
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
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span className="font-semibold text-primary">Your Shifts</span>
                      <span className="text-xs text-muted-foreground">Select to book/cancel</span>
                    </div>
                  </TableCell>
                  {days.map((day: string) => {
                    const shift = myShiftsByDate[day];
                    return (
                      <TableCell key={day} className="p-2">
                        {shift ? (
                          <div 
                            className={`h-20 w-full rounded-xl p-2 border shadow-sm flex flex-col justify-center items-center gap-1 cursor-pointer hover:brightness-95 transition-all
                              ${shift.shiftGroup === 'open' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                shift.shiftGroup === 'lunch' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                                shift.shiftGroup === 'dinner' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                                'bg-slate-100 text-slate-700 border-slate-200'}`}
                            onClick={() => {
                              if (!data.closed && confirm("Are you sure you want to cancel this shift?")) {
                                cancelShift(day);
                              }
                            }}
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
              )}
              {/* Other staff shifts for information */}
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
                              className="h-6 px-1 text-[8px] text-destructive hover:text-destructive mt-1 justify-start w-fit"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateUserStatus(u.username, 0);
                              }}
                            >
                              <Trash2 className="w-2.5 h-2.5 mr-1" />
                              Hide
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      {days.map((day: string) => {
                        const s = staffShifts[day];
                        const content = s ? (
                          <div className={`h-12 w-full rounded-lg p-1 border flex flex-col justify-center items-center opacity-60
                            ${s.shiftGroup === 'open' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                              s.shiftGroup === 'lunch' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                              s.shiftGroup === 'dinner' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                              'bg-slate-50 text-slate-600 border-slate-100'}`}>
                            <span className="text-[8px] font-bold uppercase">{s.shiftGroup}</span>
                            <span className="text-[9px]">{s.startTime}</span>
                          </div>
                        ) : (
                          <div className="h-12 w-full rounded-lg bg-muted/5"></div>
                        );

                        return (
                          <TableCell key={day} className="p-1">
                            {isManager ? (
                              <ManageShiftDialogInWork username={u.username} date={day} existingShift={s} mode={s ? "edit" : "create"} groups={settings?.groups}>
                                {s ? content : (
                                  <div className="h-12 w-full rounded-lg border border-dashed border-border/30 hover:border-primary/30 hover:bg-primary/5 transition-all cursor-pointer flex items-center justify-center opacity-0 hover:opacity-100">
                                    <Plus className="w-3 h-3 text-primary/30" />
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
        </div>
      </Card>
    </div>
  );
}

function BookShiftDialog({ children, groups, day, disabled, settings }: { children: React.ReactNode; groups: any[]; day: string; disabled?: boolean, settings: any }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const { mutate: bookShift, isPending } = useBookShift();
  
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
    bookShift(data, {
      onSuccess: () => {
        setOpen(false);
        form.reset();
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
                    {g.label} ({g.windowStart} - {g.windowEnd})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.shiftGroup && <p className="text-xs text-red-500">{form.formState.errors.shiftGroup.message}</p>}
          </div>

          {form.watch("shiftGroup") && (
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
  const [open, setOpen] = useState(false);
  const { mutate: bookShift } = useBookShift();
  const { mutate: cancelShift } = useCancelShift();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    shiftGroup: existingShift?.shiftGroup || groups?.[0]?.key || "open",
    startTime: existingShift?.startTime || groups?.[0]?.times?.[0] || "07:00 - 16:00",
    note: existingShift?.note || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("bk_token") || "";
    apiRequest("POST", "/api/setShiftForUser", {
      token,
      username,
      date,
      shiftGroup: formData.shiftGroup,
      startTime: formData.startTime,
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

function ManagerMonthlyView() {
  const { t, language } = useI18n();
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const month = currentDate.getMonth() + 1;
  const year = currentDate.getFullYear();
  
  const { data, isLoading } = useMyMonth(month, year);
  
  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  if (isLoading) return <WorkPageSkeleton />;

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  // Get the day of week for the first day (0 = Sunday, 1 = Monday, etc.)
  const startDayOfWeek = getDay(monthStart);
  
  // Build shifts by date
  const shiftsByDate: Record<string, any> = {};
  data?.shifts?.forEach((s: any) => {
    shiftsByDate[s.date] = s;
  });

  const weekDays = language === "th" 
    ? ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"]
    : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const monthNames = language === "th"
    ? ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"]
    : ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const groupColors: Record<string, string> = {
    open: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
    lunch: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800",
    dinner: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800",
    late: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-700",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold text-foreground">
            {language === "th" ? "ตารางงานของฉัน" : "My Schedule"}
          </h2>
          <p className="text-muted-foreground flex items-center gap-2 mt-1">
            <CalendarIcon className="w-4 h-4" />
            {monthNames[month - 1]} {year}
          </p>
        </div>
        
        <div className="flex items-center gap-1.5 md:gap-2">
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
            const shift = shiftsByDate[dateStr];
            const isToday = format(new Date(), "yyyy-MM-dd") === dateStr;
            const isSunday = getDay(day) === 0;
            
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
                    <span className="text-[8px] md:text-[10px] font-bold uppercase tracking-wider">{shift.shiftGroup}</span>
                    <span className="text-[7px] md:text-[9px] hidden md:block">{shift.startTime?.split(' - ')[0]}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="glass-card border-none shadow-lg p-4">
        <h3 className="font-bold text-foreground mb-3">{language === "th" ? "สรุปประจำเดือน" : "Monthly Summary"}</h3>
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
      </Card>
    </div>
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
