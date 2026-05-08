import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useI18n } from "@/hooks/use-i18n";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient as qc } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Plus, Pencil, Trash2, Users, Loader2 } from "lucide-react";
import { ClockRecord } from "./types";
import { getLateStatus, formatTime, getPosPriority } from "./utils";
import { TimeDropdown, RosterTimeDropdown } from "./shared-components";

function EditRecordDialog({ record, onClose, storeId }: { record: Partial<ClockRecord> | null; onClose: () => void; storeId: string }) {
  const { toast } = useToast();
  const { language } = useI18n();
  const t = (en: string, th: string) => language === "th" ? th : en;
  const [form, setForm] = useState({
    date: record?.date || "",
    employeeFullName: record?.employeeFullName || "",
    employeeNickName: record?.employeeNickName || "",
    position: record?.position || "",
    rosterTime: record?.rosterTime || "",
    clockInTime: record?.clockInTime || "",
    clockOutTime: record?.clockOutTime || "",
    notes: record?.notes || "",
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.date || !form.employeeFullName) {
      toast({ variant: "destructive", title: "Error", description: t("Date and Employee name are required","กรุณาใส่วันที่และชื่อพนักงาน") });
      return;
    }
    setSaving(true);
    try {
      const url = record?.id ? `/api/attendance/record/${record.id}` : "/api/attendance/record";
      const method = record?.id ? "PUT" : "POST";
      const res = await apiRequest(method, url, { token: localStorage.getItem("bk_token"), ...form, storeId });
      const data = await res.json();
      if (data.ok) {
        qc.invalidateQueries({ queryKey: ["/api/attendance/records"] });
        toast({ title: t("Saved!","บันทึกแล้ว!") });
        onClose();
      } else { toast({ variant: "destructive", title: "Error", description: data.message }); }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {record?.id ? t("Edit Record","แก้ไขบันทึก") : t("Add Record","เพิ่มบันทึก")}
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="col-span-2">
            <Label className="text-xs">{t("Date","วันที่")} *</Label>
            <Input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="h-8 text-sm" data-testid="input-record-date" />
          </div>
          <div>
            <Label className="text-xs">{t("Full Name","ชื่อเต็ม")} *</Label>
            <Input value={form.employeeFullName} onChange={e => setForm({...form, employeeFullName: e.target.value})} placeholder="Firstname Lastname" className="h-8 text-sm" data-testid="input-record-fullname" />
          </div>
          <div>
            <Label className="text-xs">{t("Nickname","ชื่อเล่น")}</Label>
            <Input value={form.employeeNickName} onChange={e => setForm({...form, employeeNickName: e.target.value})} className="h-8 text-sm" data-testid="input-record-nickname" />
          </div>
          <div>
            <Label className="text-xs">{t("Position","ตำแหน่ง")}</Label>
            <Input value={form.position} onChange={e => setForm({...form, position: e.target.value})} className="h-8 text-sm" data-testid="input-record-position" />
          </div>
          <div>
            <Label className="text-xs">{t("Roster Time","เวลา Roster")}</Label>
            <RosterTimeDropdown value={form.rosterTime} onChange={v => setForm({...form, rosterTime: v})} testId="input-record-roster" />
          </div>
          <div>
            <Label className="text-xs">{t("Clock In (Aloha)","สแกนเข้า (Aloha)")}</Label>
            <TimeDropdown value={form.clockInTime} onChange={v => setForm({...form, clockInTime: v})} testId="input-record-clockin" />
          </div>
          <div>
            <Label className="text-xs">{t("Clock Out (Aloha)","สแกนออก (Aloha)")}</Label>
            <TimeDropdown value={form.clockOutTime} onChange={v => setForm({...form, clockOutTime: v})} testId="input-record-clockout" />
          </div>
          <div className="col-span-2">
            <Label className="text-xs">{t("Notes","หมายเหตุ")}</Label>
            <Input value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="h-8 text-sm" data-testid="input-record-notes" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t("Cancel","ยกเลิก")}</Button>
          <Button onClick={handleSave} disabled={saving} data-testid="button-save-record">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            {t("Save","บันทึก")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MonthlyView({ year, month, storeId }: { year: number; month: number; storeId: string }) {
  const { language } = useI18n();
  const { toast } = useToast();
  const t = (en: string, th: string) => language === "th" ? th : en;
  const [editRecord, setEditRecord] = useState<Partial<ClockRecord> | null>(null);
  const [filterEmp, setFilterEmp] = useState("all");

  const { data, isLoading } = useQuery<{ ok: boolean; records: ClockRecord[] }>({
    queryKey: ["/api/attendance/records", year, month, storeId],
    queryFn: async () => {
      const token = localStorage.getItem("bk_token") || "";
      const res = await fetch(`/api/attendance/records?token=${token}&year=${year}&month=${month}&storeId=${storeId}`);
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const token = localStorage.getItem("bk_token") || "";
      const res = await fetch(`/api/attendance/record/${id}?token=${token}`, { method: "DELETE" });
      return res.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/attendance/records"] }); toast({ title: t("Deleted","ลบแล้ว") }); }
  });

  const records = data?.records || [];
  const employees = Array.from(new Map(records.map(r => [r.employeeFullName, r])).values());
  const filteredRecords = filterEmp === "all" ? records : records.filter(r => r.employeeFullName === filterEmp);
  const byDate = filteredRecords.reduce((acc, r) => { if (!acc[r.date]) acc[r.date] = []; acc[r.date].push(r); return acc; }, {} as Record<string, ClockRecord[]>);
  const dates = Object.keys(byDate).sort();

  const totalShifts = filteredRecords.filter(r => r.clockInTime || r.rosterTime).length;
  const lateCount   = filteredRecords.filter(r => getLateStatus(r.rosterTime, r.clockInTime) === "late").length;
  const absentCount = filteredRecords.filter(r => getLateStatus(r.rosterTime, r.clockInTime) === "absent").length;
  const onTimeCount = filteredRecords.filter(r => ["on-time","early"].includes(getLateStatus(r.rosterTime, r.clockInTime))).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: t("Total Shifts","กะทั้งหมด"), value: totalShifts, color: "text-foreground" },
          { label: t("On Time / Early","ตรงเวลา / เร็ว"), value: onTimeCount, color: "text-green-600" },
          { label: t("Late","สาย"), value: lateCount, color: "text-red-500" },
          { label: t("Absent / No Scan","ขาด / ไม่มีข้อมูล"), value: absentCount, color: "text-amber-500" },
        ].map(s => (
          <Card key={s.label} className="py-3">
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <Select value={filterEmp} onValueChange={setFilterEmp}>
            <SelectTrigger className="h-8 w-52 text-sm" data-testid="select-filter-employee">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("All Employees","พนักงานทุกคน")}</SelectItem>
              {employees.map(e => (
                <SelectItem key={e.employeeFullName} value={e.employeeFullName}>
                  {e.employeeNickName ? `${e.employeeNickName} (${e.employeeFullName})` : e.employeeFullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" onClick={() => setEditRecord({})} data-testid="button-add-record" className="gap-1">
          <Plus className="h-4 w-4" />{t("Add","เพิ่ม")}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : records.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <Clock className="h-12 w-12 text-muted-foreground/40" />
            <p className="text-muted-foreground text-center">{t("No attendance records for this month yet.","ยังไม่มีข้อมูล Clock In/Out สำหรับเดือนนี้")}</p>
            <p className="text-sm text-muted-foreground">{t("Import Excel or add records manually.","Import Excel หรือเพิ่มรายการด้วยตนเอง")}</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="rounded-lg overflow-auto max-h-[60vh]">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="text-xs w-28 shrink-0">{t("Date","วันที่")}</TableHead>
                    <TableHead className="text-xs w-40 min-w-[9rem]">{t("Employee","พนักงาน")}</TableHead>
                    <TableHead className="text-xs w-36 min-w-[8rem] hidden md:table-cell">{t("Position","ตำแหน่ง")}</TableHead>
                    <TableHead className="text-xs w-20 min-w-[4rem]">{t("Roster","Roster")}</TableHead>
                    <TableHead className="text-xs w-20 min-w-[4rem]">{t("In","เข้า")}</TableHead>
                    <TableHead className="text-xs w-20 min-w-[4rem]">{t("Out","ออก")}</TableHead>
                    <TableHead className="text-xs w-24 min-w-[5rem]">{t("Status","สถานะ")}</TableHead>
                    <TableHead className="text-xs w-28 min-w-[6rem] hidden lg:table-cell">{t("Notes","หมายเหตุ")}</TableHead>
                    <TableHead className="w-16 shrink-0"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dates.map(date =>
                    [...byDate[date]].sort((a, b) => getPosPriority(a.position) - getPosPriority(b.position) || (a.employeeNickName || a.employeeFullName).localeCompare(b.employeeNickName || b.employeeFullName)).map((r, ri) => {
                      const status = getLateStatus(r.rosterTime, r.clockInTime);
                      const day = new Date(date + "T00:00:00").toLocaleDateString(language === "th" ? "th-TH" : "en-US", { weekday: "short", day: "numeric" });
                      return (
                        <TableRow key={r.id} data-testid={`row-record-${r.id}`} className={ri === 0 ? "border-t-2 border-border/50" : ""}>
                          <TableCell className="text-xs font-mono">{ri === 0 ? day : ""}</TableCell>
                          <TableCell className="text-xs">
                            <div className="font-medium">{r.employeeNickName || r.employeeFullName}</div>
                            {r.employeeNickName && <div className="text-muted-foreground text-xs">{r.employeeFullName}</div>}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground hidden md:table-cell">{r.position || "—"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{r.rosterTime || "—"}</TableCell>
                          <TableCell className="text-xs">
                            {r.clockInTime ? (
                              <span className={status === "late" ? "text-red-500 font-semibold" : status === "early" ? "text-blue-500" : "text-green-600"}>{formatTime(r.clockInTime)}</span>
                            ) : <span className="text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{r.clockOutTime ? formatTime(r.clockOutTime) : "—"}</TableCell>
                          <TableCell>
                            {status === "on-time" && <Badge className="text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">{t("On Time","ตรงเวลา")}</Badge>}
                            {status === "early"   && <Badge className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">{t("Early","เร็ว")}</Badge>}
                            {status === "late"    && <Badge className="text-xs bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">{t("Late","สาย")}</Badge>}
                            {status === "absent"  && <Badge className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">{t("Absent","ขาด")}</Badge>}
                            {status === "unknown" && <Badge variant="outline" className="text-xs">{t("—","—")}</Badge>}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground hidden lg:table-cell max-w-32 truncate">{r.notes || ""}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditRecord(r)} data-testid={`button-edit-${r.id}`}><Pencil className="h-3 w-3" /></Button>
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:text-red-600" onClick={() => { if (confirm(t("Delete this record?","ลบรายการนี้?"))) deleteMutation.mutate(r.id); }} data-testid={`button-delete-${r.id}`}><Trash2 className="h-3 w-3" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {editRecord !== null && (
        <EditRecordDialog record={editRecord} onClose={() => setEditRecord(null)} storeId={storeId} />
      )}
    </div>
  );
}
