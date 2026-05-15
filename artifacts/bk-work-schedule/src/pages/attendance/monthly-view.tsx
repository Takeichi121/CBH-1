import { useState, useEffect } from "react";
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
import { Clock, Plus, Pencil, Trash2, Users, Loader2, UserCircle } from "lucide-react";
import { ClockRecord } from "./types";
import { getLateStatus, formatTime } from "./utils";
import { TimeDropdown, RosterTimeDropdown } from "./shared-components";

function EditRecordDialog({ record, onClose, storeId, employeeNamePreFill }: { record: Partial<ClockRecord> | null; onClose: () => void; storeId: string; employeeNamePreFill?: string }) {
  const { toast } = useToast();
  const { language } = useI18n();
  const t = (en: string, th: string) => language === "th" ? th : en;
  const [form, setForm] = useState({
    date: record?.date || "",
    employeeFullName: record?.employeeFullName || employeeNamePreFill || "",
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
            <Clock className="h-5 w-5 text-blue-500" />
            {record?.id ? t("Edit Record","แก้ไขบันทึก") : t("Add Record","เพิ่มบันทึก")}
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-2">
          <div className="col-span-2">
            <Label className="text-xs font-semibold text-muted-foreground">{t("Date","วันที่")} *</Label>
            <Input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="h-9 text-sm mt-1" />
          </div>
          <div>
            <Label className="text-xs font-semibold text-muted-foreground">{t("Full Name","ชื่อเต็ม")} *</Label>
            <Input value={form.employeeFullName} onChange={e => setForm({...form, employeeFullName: e.target.value})} placeholder="Firstname Lastname" className="h-9 text-sm mt-1" />
          </div>
          <div>
            <Label className="text-xs font-semibold text-muted-foreground">{t("Nickname","ชื่อเล่น")}</Label>
            <Input value={form.employeeNickName} onChange={e => setForm({...form, employeeNickName: e.target.value})} className="h-9 text-sm mt-1" />
          </div>
          <div>
            <Label className="text-xs font-semibold text-muted-foreground">{t("Position","ตำแหน่ง")}</Label>
            <Input value={form.position} onChange={e => setForm({...form, position: e.target.value})} className="h-9 text-sm mt-1" />
          </div>
          <div>
            <Label className="text-xs font-semibold text-muted-foreground">{t("Roster Time","เวลา Roster")}</Label>
            <div className="mt-1"><RosterTimeDropdown value={form.rosterTime} onChange={v => setForm({...form, rosterTime: v})} /></div>
          </div>
          <div>
            <Label className="text-xs font-semibold text-muted-foreground">{t("Clock In","สแกนเข้างาน")}</Label>
            <div className="mt-1"><TimeDropdown value={form.clockInTime} onChange={v => setForm({...form, clockInTime: v})} /></div>
          </div>
          <div>
            <Label className="text-xs font-semibold text-muted-foreground">{t("Clock Out","สแกนออกงาน")}</Label>
            <div className="mt-1"><TimeDropdown value={form.clockOutTime} onChange={v => setForm({...form, clockOutTime: v})} /></div>
          </div>
          <div className="col-span-2">
            <Label className="text-xs font-semibold text-muted-foreground">{t("Notes","หมายเหตุ")}</Label>
            <Input value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="h-9 text-sm mt-1" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t("Cancel","ยกเลิก")}</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            {t("Save","บันทึก")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AppMonthlyView({ year, month, storeId }: { year: number; month: number; storeId: string }) {
  const { language } = useI18n();
  const { toast } = useToast();
  const t = (en: string, th: string) => language === "th" ? th : en;
  
  const [editRecord, setEditRecord] = useState<Partial<ClockRecord> | null>(null);
  const [selectedEmp, setSelectedEmp] = useState<string>("");

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
  
  const employeeMap = new Map<string, { fullName: string; nickName: string | null; position: string | null }>();
  records.forEach(r => {
    if (!employeeMap.has(r.employeeFullName)) {
      employeeMap.set(r.employeeFullName, { fullName: r.employeeFullName, nickName: r.employeeNickName, position: r.position });
    }
  });
  const employees = Array.from(employeeMap.values()).sort((a, b) => a.fullName.localeCompare(b.fullName));

  useEffect(() => {
    if (employees.length > 0 && !selectedEmp) {
      setSelectedEmp(employees[0].fullName);
    } else if (employees.length > 0 && !employees.some(e => e.fullName === selectedEmp)) {
      setSelectedEmp(employees[0].fullName);
    }
  }, [employees, selectedEmp]);

  const currentEmp = employees.find(e => e.fullName === selectedEmp);
  const empRecords = records.filter(r => r.employeeFullName === selectedEmp).sort((a, b) => a.date.localeCompare(b.date));

  const totalShifts = empRecords.filter(r => r.clockInTime || r.rosterTime).length;
  const lateCount   = empRecords.filter(r => getLateStatus(r.rosterTime, r.clockInTime) === "late").length;
  const absentCount = empRecords.filter(r => getLateStatus(r.rosterTime, r.clockInTime) === "absent").length;
  const onTimeCount = empRecords.filter(r => ["on-time","early"].includes(getLateStatus(r.rosterTime, r.clockInTime))).length;

  if (isLoading) return <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  if (employees.length === 0) return (
    <Card className="border-dashed shadow-sm">
      <CardContent className="flex flex-col items-center gap-3 py-16">
        <Clock className="h-16 w-16 text-muted-foreground/30" />
        <p className="text-muted-foreground text-center font-medium">{t("No attendance records for this month yet.","ยังไม่มีข้อมูล Clock In/Out สำหรับเดือนนี้")}</p>
        <Button size="sm" onClick={() => setEditRecord({})} className="gap-2 mt-2">
          <Plus className="h-4 w-4" />{t("Add Record Manually","เพิ่มรายการด้วยตนเอง")}
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-4 rounded-lg border shadow-sm">
        <div className="flex-1 w-full max-w-sm">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">เลือกพนักงานเพื่อดูประวัติรายเดือน</label>
          <select 
            className="w-full p-2 border border-border rounded-md bg-muted/50 text-foreground font-medium focus:ring-2 focus:ring-primary focus:border-primary"
            value={selectedEmp}
            onChange={(e) => setSelectedEmp(e.target.value)}
          >
            {employees.map(emp => (
              <option key={emp.fullName} value={emp.fullName}>
                {emp.fullName} {emp.nickName ? `(${emp.nickName})` : ""}
              </option>
            ))}
          </select>
        </div>
        <Button size="sm" onClick={() => setEditRecord({ employeeFullName: selectedEmp })} className="gap-2 whitespace-nowrap">
          <Plus className="h-4 w-4" /> {t("Add Record","เพิ่มบันทึก")}
        </Button>
      </div>

      {!currentEmp ? (
        <Card className="border-dashed"><CardContent className="py-16 text-center text-muted-foreground">กรุณาเลือกพนักงาน</CardContent></Card>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="bg-blue-500/10 border-blue-500/20 shadow-sm lg:col-span-1">
              <CardContent className="p-4 flex items-center gap-4 h-full">
                <div className="h-16 w-16 bg-blue-500/20 text-blue-500 rounded-full flex items-center justify-center text-2xl font-bold shrink-0">
                  {currentEmp.nickName?.[0] || currentEmp.fullName[0]}
                </div>
                <div className="flex flex-col gap-1">
                  <strong className="text-foreground text-lg leading-tight">{currentEmp.fullName}</strong>
                  <span className="text-muted-foreground text-sm">{currentEmp.nickName || "-"} • {currentEmp.position || "Staff"}</span>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:col-span-2">
              {[
                { label: t("Total Shifts","กะทั้งหมด"), value: totalShifts, color: "text-foreground" },
                { label: t("On Time / Early","ตรงเวลา / เร็ว"), value: onTimeCount, color: "text-green-500" },
                { label: t("Late","สาย"), value: lateCount, color: "text-red-500" },
                { label: t("Absent","ขาด / ไม่มีข้อมูล"), value: absentCount, color: "text-amber-500" },
              ].map(s => (
                <Card key={s.label} className="shadow-sm flex flex-col justify-center">
                  <CardContent className="p-4 text-center">
                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{s.label}</p>
                    <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <Card className="shadow-sm overflow-hidden">
            <div className="overflow-x-auto max-h-[60vh]">
              <Table>
                <TableHeader className="sticky top-0 bg-muted/50 z-10 shadow-sm">
                  <TableRow>
                    <TableHead className="text-xs font-semibold w-32">{t("Date","วันที่")}</TableHead>
                    <TableHead className="text-xs font-semibold text-center w-28">{t("Roster","เข้างาน Roster")}</TableHead>
                    <TableHead className="text-xs font-semibold text-center w-28">{t("In","สแกนเข้า")}</TableHead>
                    <TableHead className="text-xs font-semibold text-center w-28">{t("Out","สแกนออก")}</TableHead>
                    <TableHead className="text-xs font-semibold text-center w-28">{t("Status","สถานะ")}</TableHead>
                    <TableHead className="text-xs font-semibold">{t("Notes","หมายเหตุ")}</TableHead>
                    <TableHead className="text-xs font-semibold text-right w-24">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {empRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">ไม่มีข้อมูลการทำงานในเดือนนี้</TableCell>
                    </TableRow>
                  ) : (
                    empRecords.map((r) => {
                      const status = getLateStatus(r.rosterTime, r.clockInTime);
                      const dayStr = new Date(r.date + "T00:00:00").toLocaleDateString(language === "th" ? "th-TH" : "en-US", { weekday: "short", day: "numeric", month: "short" });
                      const isWeekend = new Date(r.date + "T00:00:00").getDay() === 0 || new Date(r.date + "T00:00:00").getDay() === 6;

                      return (
                        <TableRow key={r.id} className={isWeekend ? 'bg-amber-500/5' : ''}>
                          <TableCell className="text-sm font-medium whitespace-nowrap">{dayStr}</TableCell>
                          <TableCell className="text-sm text-center text-muted-foreground">{r.rosterTime || "—"}</TableCell>
                          <TableCell className="text-sm text-center">
                            {r.clockInTime ? (
                              <span className={status === "late" ? "text-red-500 font-bold" : status === "early" ? "text-blue-500 font-medium" : "text-green-500 font-medium"}>
                                {formatTime(r.clockInTime)}
                              </span>
                            ) : <span className="text-muted-foreground/50">—</span>}
                          </TableCell>
                          <TableCell className="text-sm text-center text-muted-foreground">{r.clockOutTime ? formatTime(r.clockOutTime) : "—"}</TableCell>
                          <TableCell className="text-center">
                            {status === "on-time" && <Badge className="text-[10px] bg-green-500/15 text-green-500 hover:bg-green-500/15 border-none">{t("On Time","ตรงเวลา")}</Badge>}
                            {status === "early"   && <Badge className="text-[10px] bg-blue-500/15 text-blue-500 hover:bg-blue-500/15 border-none">{t("Early","เร็ว")}</Badge>}
                            {status === "late"    && <Badge className="text-[10px] bg-red-500/15 text-red-500 hover:bg-red-500/15 border-none">{t("Late","สาย")}</Badge>}
                            {status === "absent"  && <Badge className="text-[10px] bg-amber-500/15 text-amber-500 hover:bg-amber-500/15 border-none">{t("Absent","ขาด")}</Badge>}
                            {status === "unknown" && <span className="text-muted-foreground/30">—</span>}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground truncate max-w-[200px]">{r.notes || ""}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10" onClick={() => setEditRecord(r)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground/50 hover:text-red-500 hover:bg-red-500/10" onClick={() => { if (confirm(t("Delete this record?","ลบรายการนี้?"))) deleteMutation.mutate(r.id); }}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>
      )}

      {editRecord !== null && (
        <EditRecordDialog 
          record={editRecord} 
          onClose={() => setEditRecord(null)} 
          storeId={storeId} 
          employeeNamePreFill={selectedEmp}
        />
      )}
    </div>
  );
}
