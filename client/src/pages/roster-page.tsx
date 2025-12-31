import { useState } from "react";
import { useI18n } from "@/hooks/use-i18n";
import { useRoster, useSetShiftForUser, useDeleteShiftForUser } from "@/hooks/use-shifts";
import { useSettings } from "@/hooks/use-settings";
import { useAuth } from "@/hooks/use-auth";
import { format, addWeeks, subWeeks, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, UserPlus, Trash2, EyeOff, Eye } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Phone, Mail, Briefcase as PositionIcon, User } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { api } from "@shared/routes";

export default function RosterPage() {
  const { t } = useI18n();
  const [currentDate, setCurrentDate] = useState(new Date());
  const dateParam = format(currentDate, "yyyy-MM-dd");
  
  const { data, isLoading, error } = useRoster(dateParam);
  const { data: settings } = useSettings();
  const { user } = useAuth();
  const isManager = user?.role === "manager" || user?.role === "admin";
  const queryClient = useQueryClient();

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

  if (isLoading) return <RosterSkeleton />;
  if (error) return <div className="p-8 text-center text-red-500">Error loading roster: {error.message}</div>;

  const days = data?.weekRange?.days || [];
  const rosterItems = data?.roster || [];
  const allUsers = data?.users || [];
  
  // Group shifts by user
  const userShifts: Record<string, any> = {};

  // Initialize with all users to ensure they show up even without shifts
  allUsers.forEach((u: any) => {
    userShifts[u.username] = {
      username: u.username,
      fullName: u.fullName,
      nickName: u.nickName,
      role: u.role,
      active: u.active,
      shifts: {}
    };
  });

  rosterItems.forEach((shift: any) => {
    if (!userShifts[shift.username]) {
      userShifts[shift.username] = {
        username: shift.username,
        fullName: shift.fullName,
        nickName: shift.nickName,
        role: shift.role,
        shifts: {}
      };
    }
    userShifts[shift.username].shifts[shift.date] = shift;
  });

  // Custom staff order from management
  const staffOrder = [
    "athat", "arthit", "adisorn", "sunari", "sarawut", "wafah", "yossanun", 
    "phusanisa", "paisit", "pitak", "pornnipa", "pongpun", "thepthakun", 
    "nattarika", "kanapat", "kidsada"
  ];

  const sortedUsers = Object.values(userShifts)
    .filter((u: any) => {
      if (u.role === "admin" || u.role === "manager") return false;
      if (u.active === 0) return false;
      // Only show users who have at least one shift this week
      const hasShift = days.some(d => u.shifts[d]);
      return hasShift;
    })
    .sort((a: any, b: any) => {
      // Sort by custom staff order
      const aIndex = staffOrder.findIndex(name => a.username.toLowerCase().includes(name));
      const bIndex = staffOrder.findIndex(name => b.username.toLowerCase().includes(name));
      const aOrder = aIndex === -1 ? 999 : aIndex;
      const bOrder = bIndex === -1 ? 999 : bIndex;
      return aOrder - bOrder;
    });

  const hiddenUsers = Object.values(userShifts)
    .filter((u: any) => {
      if (u.role === "admin" || u.role === "manager") return false;
      return u.active === 0;
    })
    .sort((a: any, b: any) => a.username.localeCompare(b.username));

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
        
        <div className="flex items-center gap-1.5 md:gap-2">
          {isManager && hiddenUsers.length > 0 && (
            <HiddenStaffDialog users={hiddenUsers} onUpdateStatus={handleUpdateUserStatus} />
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

      <Card className="glass-card overflow-hidden border-none shadow-xl">
        <div className="overflow-x-auto -mx-4 md:mx-0">
          <div className="min-w-[800px] md:min-w-0 p-4 md:p-0">
            <Table>
              <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="w-[200px] font-bold">Staff Member</TableHead>
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
              {sortedUsers.length > 0 ? (
                sortedUsers.map((u: any) => (
                  <TableRow key={u.username} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium">
                      <UserProfileDialog username={u.username}>
                        <div className="flex flex-col cursor-pointer hover:text-primary transition-colors">
                          <span className="font-semibold underline decoration-dotted underline-offset-4">
                            {u.nickName ? `${u.nickName} (${u.username})` : u.fullName || u.username}
                          </span>
                          <span className="text-xs text-muted-foreground capitalize">{u.role}</span>
                        </div>
                      </UserProfileDialog>
                      {isManager && (
                        <div className="flex flex-col gap-1 mt-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 px-2 text-[10px] text-muted-foreground hover:text-foreground justify-start"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateUserStatus(u.username, 0);
                            }}
                          >
                            <EyeOff className="w-3 h-3 mr-1" />
                            Hide Staff
                          </Button>
                        </div>
                      )}
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
                                <div className="h-10 w-full rounded-lg border border-dashed border-red-200/50 bg-red-50/50 dark:bg-red-950/20 dark:border-red-900/30 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer flex items-center justify-center group">
                                  <span className="text-xs font-medium text-red-400/70 dark:text-red-400/50 group-hover:hidden">OFF</span>
                                  <UserPlus className="w-5 h-5 text-primary/50 group-hover:text-primary hidden group-hover:block" />
                                </div>
                              </ManageShiftDialog>
                            ) : (
                              <div className="h-10 w-full rounded-lg bg-red-50/50 dark:bg-red-950/20 border border-red-200/30 dark:border-red-900/20 flex items-center justify-center">
                                <span className="text-xs font-medium text-red-400/70 dark:text-red-400/50">OFF</span>
                              </div>
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
        </div>
      </Card>
    </div>
  );
}

function ShiftCell({ shift, isManager, groups }: { shift: any; isManager: boolean; groups?: any[] }) {
  const groupColors: Record<string, string> = {
    open: "bg-blue-100 text-blue-700 border-blue-200",
    swing: "bg-cyan-100 text-cyan-700 border-cyan-200",
    lunch: "bg-orange-100 text-orange-700 border-orange-200",
    dinner: "bg-purple-100 text-purple-700 border-purple-200",
    close: "bg-pink-100 text-pink-700 border-pink-200",
    late: "bg-slate-700 text-slate-100 border-slate-600 dark:bg-slate-800 dark:text-slate-200",
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
    startTime: existingShift?.startTime || groups?.[0]?.times?.[0] || "07:00 - 16:00",
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

  const currentGroup = groups?.find(g => g.key === formData.shiftGroup);

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
              onValueChange={(v) => {
                const grp = groups?.find(g => g.key === v);
                setFormData({
                  ...formData, 
                  shiftGroup: v, 
                  startTime: grp?.times?.[0] || ""
                });
              }}
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
            <Label>Time Period</Label>
            <Select 
              value={formData.startTime} 
              onValueChange={(v) => setFormData({...formData, startTime: v})}
            >
              <SelectTrigger>
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

function HiddenStaffDialog({ users, onUpdateStatus }: { users: any[]; onUpdateStatus: (username: string, active: number) => void }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="rounded-full gap-2">
          <EyeOff className="w-4 h-4" />
          <span>Hidden ({users.length})</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
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

function UserProfileDialog({ children, username }: { children: React.ReactNode; username: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["/api/getUserProfile", username],
    queryFn: async () => {
      // Use the token from the request body as per the app's pattern
      const token = localStorage.getItem("bk_token") || "";
      const res = await apiRequest("POST", "/api/getUserProfile", { 
        token, 
        username 
      });
      return res.json();
    }
  });

  const profile = data?.user;

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Staff Profile
          </DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : profile ? (
          <div className="space-y-6 py-4">
            <div className="space-y-1">
              <h4 className="text-lg font-bold text-foreground">
                {profile.nickName ? `${profile.nickName} (${username})` : username}
              </h4>
              <p className="text-sm text-muted-foreground">{profile.fullName}</p>
            </div>

            <div className="grid gap-4">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border/50">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <PositionIcon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Position</p>
                  <p className="text-sm font-medium">{profile.position || "Staff"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border/50">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Phone className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="text-sm font-medium">{profile.phone || "-"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border/50">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Mail className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm font-medium break-all">{profile.email || "-"}</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <p className="py-4 text-center text-muted-foreground">Profile not found</p>
        )}
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
