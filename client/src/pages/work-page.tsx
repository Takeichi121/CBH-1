import { useState } from "react";
import { useMyWeek, useBookShift, useCancelShift } from "@/hooks/use-shifts";
import { useSettings } from "@/hooks/use-settings";
import { useAuth } from "@/hooks/use-auth";
import { format, addDays, startOfWeek, addWeeks, subWeeks } from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ShiftCard } from "@/components/shift-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Schema for booking form
const bookSchema = z.object({
  date: z.string().min(1, "Date is required"),
  shiftGroup: z.string().min(1, "Shift group is required"),
  note: z.string().optional(),
});

type BookFormValues = z.infer<typeof bookSchema>;

export default function WorkPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  // Format date as YYYY-MM-DD for API
  const dateParam = format(currentDate, "yyyy-MM-dd");
  
  const { data, isLoading, error } = useMyWeek(dateParam);
  const { data: settings } = useSettings();
  const { mutate: cancelShift } = useCancelShift();

  const handlePrevWeek = () => setCurrentDate(subWeeks(currentDate, 1));
  const handleNextWeek = () => setCurrentDate(addWeeks(currentDate, 1));

  if (isLoading) return <WorkPageSkeleton />;
  if (error) return <div className="p-8 text-center text-red-500">Error loading schedule: {error.message}</div>;

  const weekStartStr = data?.weekRange?.start;
  const weekEndStr = data?.weekRange?.end;
  const displayRange = weekStartStr ? `${format(new Date(weekStartStr), "MMM d")} - ${format(new Date(weekEndStr), "MMM d, yyyy")}` : "";

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold text-foreground">My Schedule</h2>
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
          
          <BookShiftDialog groups={settings?.groups} />
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {data?.items && data.items.length > 0 ? (
          data.items.map((shift: any) => (
            <ShiftCard
              key={shift.id}
              date={shift.date}
              startTime={shift.startTime}
              endTime={shift.endTime}
              shiftGroup={shift.shiftGroup}
              note={shift.note}
              onCancel={!data.closed ? () => {
                if(confirm("Are you sure you want to cancel this shift?")) {
                  cancelShift(shift.date);
                }
              } : undefined}
            />
          ))
        ) : (
          <div className="col-span-full py-12 flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed border-border rounded-3xl bg-white/50">
            <CalendarIcon className="w-12 h-12 mb-4 opacity-20" />
            <p>No shifts booked for this week.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function BookShiftDialog({ groups }: { groups: any[] }) {
  const [open, setOpen] = useState(false);
  const { mutate: bookShift, isPending } = useBookShift();
  const { user } = useAuth();
  
  const form = useForm<BookFormValues>({
    resolver: zodResolver(bookSchema),
    defaultValues: {
      date: "",
      shiftGroup: "",
      note: "",
    },
  });

  // Only staff can book
  if (user?.role !== "staff") return null;

  const onSubmit = (data: BookFormValues) => {
    bookShift({ ...data, startTime: "" }, {
      onSuccess: () => {
        setOpen(false);
        form.reset();
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-full shadow-lg shadow-primary/20 bg-gradient-to-r from-primary to-primary/90 hover:opacity-90 transition-opacity" data-testid="button-book-shift">
          <Plus className="w-4 h-4 mr-2" />
          Book Shift
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] rounded-2xl">
        <DialogHeader>
          <DialogTitle>Book a Shift</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Date</Label>
            <Input type="date" {...form.register("date")} className="rounded-xl" />
            {form.formState.errors.date && <p className="text-xs text-red-500">{form.formState.errors.date.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Shift Group</Label>
            <Select onValueChange={(val) => form.setValue("shiftGroup", val)}>
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 w-full rounded-2xl" />)}
      </div>
    </div>
  );
}
