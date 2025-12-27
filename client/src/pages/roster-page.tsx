import { useState } from "react";
import { useRoster, useSetShiftForUser, useDeleteShiftForUser } from "@/hooks/use-shifts";
import { useSettings } from "@/hooks/use-settings";
import { useAuth } from "@/hooks/use-auth";
import { format, addWeeks, subWeeks, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, UserPlus, Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function RosterPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const dateParam = format(currentDate, "yyyy-MM-dd");
  
  const { data, isLoading, error } = useRoster(dateParam);
  const { data: settings } = useSettings();
  const { user } = useAuth();
  const isManager = user?.role === "manager" || user?.role === "admin";

  const handlePrevWeek = () => setCurrentDate(subWeeks(currentDate, 1));
  const handleNextWeek = () => setCurrentDate(addWeeks(currentDate, 1));

  if (isLoading) return <RosterSkeleton />;
  if (error) return <div className="p-8 text-center text-red-500">Error loading roster: {error.message}</div>;

  const days = data?.weekRange?.days || [];
  const rosterItems = data?.roster || [];
  
  // Group shifts by user
  const userShifts: Record<string, any> = {};
  rosterItems.forEach((shift: any) => {
    if (!userShifts[shift.username]) {
      userShifts[shift.username] = {
        username: shift.username,
        fullName: shift.fullName,
        role: shift.role,
        shifts: {}
      };
    }
    userShifts[shift.username].shifts[shift.date] = shift;
  });

  const sortedUsers = Object.values(userShifts).sort((a: any, b: any) => a.username.localeCompare(b.username));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold text-foreground">Staff Roster</h2>
          <p className="text-muted-foreground flex items-center gap-2 mt-1">
            <CalendarIcon className="w-4 h-4" />
            Week of {days[0] ? format(parseISO(days[0]), "MMM d") : ""}
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

      <Card className="glass-card overflow-hidden border-none shadow-xl">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="w-[200px] font-bold">Staff Member</TableHead>
                {days.map((day: string) => (
                  <TableHead key={day} className="text-center min-w-[120px]">
                    <div className="flex flex-col items-center py-2">
                      <span className="text-xs uppercase text-muted-foreground font-semibold">
                        {format(parseISO(day), "EEE")}
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
              {sortedUsers.length > 0 ? (
                sortedUsers.map((u: any) => (
                  <TableRow key={u.username} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span className="text-foreground font-semibold">{u.fullName || u.username}</span>
                        <span className="text-xs text-muted-foreground capitalize">{u.role}</span>
                      </div>
                    </TableCell>
                    {days.map((day: string) => {
                      const shift = u.shifts[day];
                      return (
                        <TableCell key={day} className="p-2">
                          {shift ? (
                            <ShiftCell shift={shift} isManager={isManager} groups={settings?.groups} />
                          ) : (
                            isManager ? (
                              <ManageShiftDialog username={u.username} date={day} mode="create" groups={settings?.groups}>
                                <div className="h-16 w-full rounded-lg border-2 border-dashed border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer flex items-center justify-center opacity-0 hover:opacity-100 group">
                                  <UserPlus className="w-5 h-5 text-primary/50 group-hover:text-primary" />
                                </div>
                              </ManageShiftDialog>
                            ) : (
                              <div className="h-16 w-full rounded-lg bg-muted/10"></div>
                            )
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                    No shifts found for this week.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}

function ShiftCell({ shift, isManager, groups }: { shift: any; isManager: boolean; groups?: any[] }) {
  const groupColors: Record<string, string> = {
    open: "bg-blue-100 text-blue-700 border-blue-200",
    lunch: "bg-orange-100 text-orange-700 border-orange-200",
    dinner: "bg-purple-100 text-purple-700 border-purple-200",
    late: "bg-slate-100 text-slate-700 border-slate-200",
  };
  
  const bgClass = groupColors[shift.shiftGroup.toLowerCase()] || "bg-gray-100 text-gray-700 border-gray-200";

  const content = (
    <div className={`h-full w-full rounded-xl p-2 border ${bgClass} shadow-sm flex flex-col justify-center items-center gap-1 cursor-pointer hover:brightness-95 transition-all`}>
      <span className="text-[10px] font-bold uppercase tracking-wider">{shift.shiftGroup}</span>
      <span className="text-xs font-semibold">{shift.startTime}</span>
    </div>
  );

  if (isManager) {
    return (
      <ManageShiftDialog username={shift.username} date={shift.date} existingShift={shift} mode="edit" groups={groups}>
        {content}
      </ManageShiftDialog>
    );
  }

  return content;
}

function ManageShiftDialog({ 
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
  const { mutate: setShift } = useSetShiftForUser();
  const { mutate: deleteShift } = useDeleteShiftForUser();
  
  const [formData, setFormData] = useState({
    shiftGroup: existingShift?.shiftGroup || groups?.[0]?.key || "open",
    startTime: existingShift?.startTime || "09:00",
    note: existingShift?.note || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShift({
      username,
      date,
      shiftGroup: formData.shiftGroup,
      startTime: formData.startTime,
      note: formData.note
    }, {
      onSuccess: () => setOpen(false)
    });
  };

  const handleDelete = () => {
    if (confirm("Remove this shift?")) {
      deleteShift({ username, date }, {
        onSuccess: () => setOpen(false)
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
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
              onValueChange={(v) => setFormData({...formData, shiftGroup: v})}
            >
              <SelectTrigger>
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
            <Label>Start Time</Label>
            <Input 
              type="time" 
              value={formData.startTime}
              onChange={(e) => setFormData({...formData, startTime: e.target.value})}
            />
          </div>

          <div className="space-y-2">
            <Label>Note</Label>
            <Input 
              value={formData.note}
              onChange={(e) => setFormData({...formData, note: e.target.value})}
              placeholder="Optional note"
            />
          </div>

          <div className="flex gap-2 pt-2">
            {mode === "edit" && (
              <Button type="button" variant="destructive" onClick={handleDelete} className="flex-1" data-testid="button-delete-shift">
                <Trash2 className="w-4 h-4 mr-2" />
                Remove
              </Button>
            )}
            <Button type="submit" className="flex-1" data-testid="button-save-shift">
              Save Shift
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RosterSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-24" />
      </div>
      <Skeleton className="h-[500px] w-full rounded-2xl" />
    </div>
  );
}
