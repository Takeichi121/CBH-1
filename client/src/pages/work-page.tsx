import { useState } from "react";
import { useI18n } from "@/hooks/use-i18n";
import { useMyWeek, useBookShift, useCancelShift, useRoster } from "@/hooks/use-shifts";
import { useSettings } from "@/hooks/use-settings";
import { useAuth } from "@/hooks/use-auth";
import { format, addDays, startOfWeek, addWeeks, subWeeks, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, AlertCircle, Clock } from "lucide-react";
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
  const { t } = useI18n();
  const [currentDate, setCurrentDate] = useState(new Date());
  // Format date as YYYY-MM-DD for API
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

  // My shifts for the week mapped by date
  const myShiftsByDate: Record<string, any> = {};
  data?.items?.forEach((s: any) => {
    myShiftsByDate[s.date] = s;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold text-foreground">Book Shift</h2>
          <p className="text-muted-foreground flex items-center gap-2 mt-1">
            <CalendarIcon className="w-4 h-4" />
            {displayRange}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePrevWeek} className="rounded-full" data-testid="button-prev-week">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleNextWeek} className="rounded-full" data-testid="button-next-week">
            <ChevronRight className="w-4 h-4" />
          </Button>
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
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="w-[150px] font-bold">Staff Member</TableHead>
                {days.map((day: string) => (
                  <TableHead key={day} className="text-center min-w-[120px]">
                    <div className="flex flex-col items-center py-2">
                      <span className="text-xs uppercase text-primary font-bold">
                        {t(format(parseISO(day), "EEEE").toLowerCase() as any)}
                      </span>
                      <span className="text-lg font-bold text-foreground">
                        {format(parseISO(day), "d")}
                      </span>
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
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
              {/* Optional: Show other staff members summary if needed, but the primary request is the booking table */}
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
