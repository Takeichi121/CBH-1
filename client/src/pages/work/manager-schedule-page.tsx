import { useState } from "react";
import { useI18n } from "@/hooks/use-i18n";
import { useMyMonth } from "@/hooks/use-shifts";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isToday, parseISO, isSameDay } from "date-fns";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { WorkLayout } from "./work-layout";

const getShiftDisplayName = (shiftGroup: string): string => {
  if (shiftGroup?.toLowerCase() === 'late') return 'Late Night';
  return shiftGroup;
};

function SchedulePageSkeleton() {
  return (
    <WorkLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-[600px] w-full" />
      </div>
    </WorkLayout>
  );
}

export default function ManagerSchedulePage() {
  const { t, language } = useI18n();
  const [currentDate, setCurrentDate] = useState(new Date());

  const month = currentDate.getMonth() + 1;
  const year = currentDate.getFullYear();

  const { data, isLoading } = useMyMonth(month, year);

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  if (isLoading) return <SchedulePageSkeleton />;

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const weekDays = language === "th" 
    ? ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"]
    : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const getShiftForDate = (date: Date) => {
    if (!data?.shifts) return null;
    return data.shifts.find((s: any) => {
      const shiftDate = parseISO(s.date);
      return isSameDay(shiftDate, date);
    });
  };

  const monthLabel = language === "th"
    ? format(currentDate, "MMMM yyyy")
    : format(currentDate, "MMMM yyyy");

  return (
    <WorkLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground" data-testid="text-page-title">
              {language === "th" ? "ตารางทีมผู้จัดการ" : "Manager Team Schedule"}
            </h2>
            <p className="text-muted-foreground flex items-center gap-2 mt-1">
              <CalendarIcon className="w-4 h-4" />
              {monthLabel}
            </p>
          </div>

          <div className="flex items-center gap-2">
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

        <Card className="glass-card overflow-hidden border-none shadow-xl">
          <div className="grid grid-cols-7 border-b bg-muted/30">
            {weekDays.map((day, idx) => (
              <div
                key={day}
                className={`py-3 text-center text-sm font-semibold ${
                  idx === 0 ? "text-destructive" : "text-muted-foreground"
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 auto-rows-fr">
            {calendarDays.map((day, idx) => {
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isTodayDate = isToday(day);
              const dayNumber = format(day, "d");
              const isSunday = day.getDay() === 0;
              const shift = getShiftForDate(day);

              return (
                <div
                  key={idx}
                  className={`min-h-[100px] md:min-h-[120px] p-2 border-b border-r last:border-r-0 transition-colors ${
                    !isCurrentMonth ? "bg-muted/20" : "bg-background"
                  } ${isTodayDate ? "ring-2 ring-primary ring-inset" : ""}`}
                  data-testid={`calendar-cell-${format(day, "yyyy-MM-dd")}`}
                >
                  <div className="flex flex-col h-full">
                    <span
                      className={`text-sm font-bold ${
                        !isCurrentMonth
                          ? "text-muted-foreground/50"
                          : isSunday
                          ? "text-destructive"
                          : "text-foreground"
                      }`}
                    >
                      {dayNumber}
                    </span>
                    
                    {shift && isCurrentMonth && (
                      <div className="mt-1 flex-1">
                        <div
                          className={`rounded p-1.5 text-[10px] md:text-xs flex flex-col gap-0.5 ${
                            shift.shiftGroup === "open"
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                              : shift.shiftGroup === "swing"
                              ? "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300"
                              : shift.shiftGroup === "lunch"
                              ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
                              : shift.shiftGroup === "dinner"
                              ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                              : shift.shiftGroup === "close"
                              ? "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300"
                              : shift.shiftGroup === "late"
                              ? "bg-slate-700 text-slate-100 dark:bg-slate-800 dark:text-slate-200"
                              : "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300"
                          }`}
                        >
                          <span className="font-bold uppercase truncate">
                            {getShiftDisplayName(shift.shiftGroup)}
                          </span>
                          <span className="truncate opacity-80">
                            {shift.startTime}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </WorkLayout>
  );
}
