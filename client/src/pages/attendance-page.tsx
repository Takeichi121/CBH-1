import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient as qc } from "@/lib/queryClient";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Clock, Upload, FileSpreadsheet, CheckCircle2, Loader2,
  Plus, Pencil, Trash2, Info, Users, RefreshCw, AlertTriangle, Download, LayoutGrid, Printer, FileText, UserPlus, X
} from "lucide-react";
import { PageTutorial, TutorialStep } from "@/components/page-tutorial";

const ATTENDANCE_TUTORIAL: TutorialStep[] = [
  {
    titleTh: "📋 หน้าบันทึกเวลาทำงาน",
    descriptionTh: "หน้านี้ใช้สำหรับดูและจัดการข้อมูลการ clock-in/out ของพนักงาน นำเข้าจาก Aloha POS",
    icon: <Clock className="w-10 h-10 text-primary" />,
  },
  {
    titleTh: "📅 เลือกเดือนและปี",
    descriptionTh: "ใช้ปุ่มลูกศร ‹ › หรือ dropdown เดือน/ปีด้านบน เพื่อดูข้อมูลของเดือนที่ต้องการ",
    icon: <Clock className="w-10 h-10 text-blue-500" />,
  },
  {
    titleTh: "📊 แท็บ 'บันทึก'",
    descriptionTh: "แสดงรายการ clock-in/out ทุกวันของเดือนนั้น สามารถแก้ไข เพิ่ม หรือลบข้อมูลได้",
    icon: <FileSpreadsheet className="w-10 h-10 text-green-500" />,
  },
  {
    titleTh: "🔲 แท็บ 'ตารางเปรียบ'",
    descriptionTh: "แสดงข้อมูลพนักงานทุกคนแบบตารางเปรียบเทียบ แก้ไขข้อมูลได้โดยตรงในเซลล์",
    icon: <LayoutGrid className="w-10 h-10 text-purple-500" />,
  },
  {
    titleTh: "📥 Import Excel",
    descriptionTh: "อัพโหลดไฟล์ Clock In/Out จาก Aloha (รูปแบบ .xlsx) ระบบจะอ่านข้อมูลพนักงาน 5 คนโดยอัตโนมัติ",
    icon: <Upload className="w-10 h-10 text-orange-500" />,
  },
  {
    titleTh: "⬇️ ดาวน์โหลด Excel",
    descriptionTh: "กดปุ่ม 'ดาวน์โหลด Excel' เพื่อ export ข้อมูลเป็นไฟล์ .xlsx รูปแบบเดียวกับต้นฉบับ",
    icon: <Download className="w-10 h-10 text-teal-500" />,
  },
];

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────
interface ClockRecord {
  id: number;
  date: string;
  storeId: string;
  employeeFullName: string;
  employeeNickName: string | null;
  position: string | null;
  rosterTime: string | null;
  clockInTime: string | null;
  clockOutTime: string | null;
  notes: string | null;
  importSource: string | null;
}

const MONTH_TH = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];
const MONTH_EN = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function formatTime(t: string | null | undefined): string {
  if (!t) return "";
  // Handle full datetime: "HH:MM" or "1899-12-30..."
  if (t.includes("T")) {
    const d = new Date(t);
    return `${d.getUTCHours().toString().padStart(2,"0")}:${d.getUTCMinutes().toString().padStart(2,"0")}`;
  }
  return t;
}

function getLateStatus(rosterTime: string | null, clockInTime: string | null): "on-time" | "late" | "early" | "absent" | "unknown" {
  if (!clockInTime) return rosterTime ? "absent" : "unknown";
  if (!rosterTime) return "unknown";
  const rosterStart = rosterTime.split(" - ")[0]?.trim();
  if (!rosterStart) return "unknown";
  const [rh, rm] = rosterStart.split(":").map(Number);
  const [ch, cm] = clockInTime.split(":").map(Number);
  if (isNaN(rh) || isNaN(ch)) return "unknown";
  const rosterMins = rh * 60 + rm;
  const clockMins  = ch * 60 + cm;
  if (clockMins <= rosterMins) return "early";
  if (clockMins <= rosterMins + 5) return "on-time";
  return "late";
}

// ─────────────────────────────────────────────────────────
// Import Excel Tab
// ─────────────────────────────────────────────────────────
function ImportExcelTab({ year, month, storeId }: { year: number; month: number; storeId: string }) {
  const { toast } = useToast();
  const { language } = useI18n();
  const t = (en: string, th: string) => language === "th" ? th : en;
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<"upload" | "preview" | "done">("upload");
  const [isLoading, setIsLoading] = useState(false);
  const [preview, setPreview] = useState<ClockRecord[]>([]);
  const [previewCount, setPreviewCount] = useState(0);
  const [fileName, setFileName] = useState("");
  const [importResult, setImportResult] = useState<{ imported: number; updated: number; message: string } | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.match(/\.xlsx?$/i)) {
      toast({ variant: "destructive", title: "Error", description: t("Please select an Excel file (.xlsx)", "กรุณาเลือกไฟล์ Excel (.xlsx)") });
      return;
    }
    setFileName(file.name); setIsLoading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("token", localStorage.getItem("bk_token") || "");
    fd.append("confirm", "false");
    try {
      const res = await fetch("/api/attendance/import-excel", { method: "POST", body: fd });
      const data = await res.json();
      if (data.ok) {
        setPreview(data.sample || []);
        setPreviewCount(data.count || 0);
        setStep("preview");
        toast({ title: t("File parsed", "อ่านไฟล์สำเร็จ"), description: `${data.count} ${t("records found", "รายการ")}` });
      } else {
        toast({ variant: "destructive", title: "Error", description: data.message });
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally { setIsLoading(false); }
  }, [toast, language]);

  const handleConfirmImport = async () => {
    if (!fileRef.current?.files?.[0]) return;
    setIsLoading(true);
    const fd = new FormData();
    fd.append("file", fileRef.current.files[0]);
    fd.append("token", localStorage.getItem("bk_token") || "");
    fd.append("confirm", "true");
    try {
      const res = await fetch("/api/attendance/import-excel", { method: "POST", body: fd });
      const data = await res.json();
      if (data.ok) {
        setImportResult({ imported: data.imported, updated: data.updated, message: data.message });
        setStep("done");
        qc.invalidateQueries({ queryKey: ["/api/attendance/records"] });
        toast({ title: t("Import complete!", "Import สำเร็จ!"), description: data.message });
      } else {
        toast({ variant: "destructive", title: "Error", description: data.message });
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally { setIsLoading(false); }
  };

  const reset = () => { setStep("upload"); setPreview([]); setFileName(""); setImportResult(null); if (fileRef.current) fileRef.current.value = ""; };

  if (step === "done" && importResult) {
    return (
      <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <CheckCircle2 className="h-10 w-10 text-green-600 shrink-0" />
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-green-800 dark:text-green-200">{t("Import Completed!", "Import เสร็จสิ้น!")}</h3>
              <div className="flex gap-3">
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-sm px-3 py-1">{t("New","ใหม่")}: {importResult.imported}</Badge>
                <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-sm px-3 py-1">{t("Updated","อัพเดต")}: {importResult.updated}</Badge>
              </div>
              <Button onClick={reset} className="gap-2"><RefreshCw className="w-4 h-4" />{t("Import Another File","Import ไฟล์อื่น")}</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === "preview") {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2"><FileSpreadsheet className="h-5 w-5 text-green-500" />{fileName}</CardTitle>
                <CardDescription>{previewCount} {t("records detected (showing first 30)","รายการ (แสดง 30 แรก)")}</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={reset}>{t("← Change File","← เปลี่ยนไฟล์")}</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-auto max-h-72">
              <Table>
                <TableHeader className="sticky top-0 bg-background">
                  <TableRow>
                    <TableHead className="text-xs">{t("Date","วันที่")}</TableHead>
                    <TableHead className="text-xs">{t("Employee","พนักงาน")}</TableHead>
                    <TableHead className="text-xs">{t("Position","ตำแหน่ง")}</TableHead>
                    <TableHead className="text-xs">{t("Roster","Roster")}</TableHead>
                    <TableHead className="text-xs">{t("Clock In","สแกนเข้า")}</TableHead>
                    <TableHead className="text-xs">{t("Clock Out","สแกนออก")}</TableHead>
                    <TableHead className="text-xs">{t("Notes","หมายเหตุ")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.map((r, i) => {
                    const status = getLateStatus(r.rosterTime, r.clockInTime);
                    return (
                      <TableRow key={i}>
                        <TableCell className="text-xs font-mono">{r.date}</TableCell>
                        <TableCell className="text-xs">
                          <span className="font-medium">{r.employeeNickName || r.employeeFullName}</span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{r.position || "—"}</TableCell>
                        <TableCell className="text-xs">{r.rosterTime || "—"}</TableCell>
                        <TableCell className="text-xs">
                          {r.clockInTime ? (
                            <span className={status === "late" ? "text-red-500 font-medium" : status === "early" ? "text-blue-500" : "text-green-600"}>
                              {formatTime(r.clockInTime)}
                            </span>
                          ) : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-xs">{r.clockOutTime ? formatTime(r.clockOutTime) : "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-24 truncate">{r.notes || "—"}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <div className="flex justify-between items-center mt-4">
              <p className="text-xs text-muted-foreground">{t("Green = on time, Red = late, Blue = early","เขียว = ตรงเวลา, แดง = สาย, น้ำเงิน = เร็ว")}</p>
              <Button onClick={handleConfirmImport} disabled={isLoading} className="gap-2" data-testid="button-confirm-import">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {isLoading ? t("Importing...","กำลัง Import...") : `${t("Import","Import")} ${previewCount} ${t("records","รายการ")}`}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="text-sm space-y-1">
          <p className="font-medium">{t("Supported Excel format:","รูปแบบ Excel ที่รองรับ:")}</p>
          <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
            <li>{t("Each employee = 7 columns (Day | Date | Roster | Clock-in | Clock-out | Notes)","พนักงานแต่ละคน = 7 คอลัมน์ (วัน | วันที่ | Roster | สแกนเข้า | สแกนออก | หมายเหตุ)")}</li>
            <li>{t("Row 1: Employee names, Row 3: Positions, Row 5+: Daily data","แถวที่ 1: ชื่อพนักงาน, แถว 3: ตำแหน่ง, แถว 5+: ข้อมูลรายวัน")}</li>
            <li>{t("Multiple sheets (Jan, Feb...) are all imported automatically","หลาย sheet (Jan, Feb...) จะ import อัตโนมัติทั้งหมด")}</li>
          </ul>
        </AlertDescription>
      </Alert>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5 text-primary" />{t("Upload Clock In/Out Excel","อัพโหลด Clock In/Out Excel")}</CardTitle>
          <CardDescription>{t("Same format as your current Excel tracking sheet","รูปแบบเดียวกับ Excel ที่ใช้อยู่ปัจจุบัน")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors ${isDragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25"}`}
            onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={e => { e.preventDefault(); setIsDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            data-testid="dropzone-excel"
          >
            <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} className="hidden" data-testid="input-file-excel" />
            {isLoading ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-muted-foreground">{t("Parsing Excel...","กำลังอ่าน Excel...")}</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <FileSpreadsheet className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-lg">{t("Drop Excel file here","ลาก Excel มาวางที่นี่")}</p>
                  <p className="text-sm text-muted-foreground mt-1">{t("or click to browse (.xlsx)","หรือคลิกเลือกไฟล์ (.xlsx)")}</p>
                </div>
                <Button size="lg" onClick={() => fileRef.current?.click()} data-testid="button-select-excel">
                  <Upload className="h-4 w-4 mr-2" />{t("Select Excel File","เลือกไฟล์ Excel")}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Edit Record Dialog
// ─────────────────────────────────────────────────────────
function EditRecordDialog({
  record, onClose, storeId
}: { record: Partial<ClockRecord> | null; onClose: () => void; storeId: string }) {
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
            <Input value={form.rosterTime} onChange={e => setForm({...form, rosterTime: e.target.value})} placeholder="05:00 - 14:00" className="h-8 text-sm" data-testid="input-record-roster" />
          </div>
          <div>
            <Label className="text-xs">{t("Clock In (Aloha)","สแกนเข้า (Aloha)")}</Label>
            <Input type="time" value={form.clockInTime} onChange={e => setForm({...form, clockInTime: e.target.value})} className="h-8 text-sm" data-testid="input-record-clockin" />
          </div>
          <div>
            <Label className="text-xs">{t("Clock Out (Aloha)","สแกนออก (Aloha)")}</Label>
            <Input type="time" value={form.clockOutTime} onChange={e => setForm({...form, clockOutTime: e.target.value})} className="h-8 text-sm" data-testid="input-record-clockout" />
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

// ─────────────────────────────────────────────────────────
// Monthly Records View
// ─────────────────────────────────────────────────────────
function MonthlyView({ year, month, storeId }: { year: number; month: number; storeId: string }) {
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/attendance/records"] });
      toast({ title: t("Deleted","ลบแล้ว") });
    }
  });

  const records = data?.records || [];

  // Get unique employees
  const employees = Array.from(new Map(records.map(r => [r.employeeFullName, r])).values());
  const filteredRecords = filterEmp === "all" ? records : records.filter(r => r.employeeFullName === filterEmp);

  // Group by date
  const byDate = filteredRecords.reduce((acc, r) => {
    if (!acc[r.date]) acc[r.date] = [];
    acc[r.date].push(r);
    return acc;
  }, {} as Record<string, ClockRecord[]>);

  const dates = Object.keys(byDate).sort();

  // Stats
  const totalShifts = filteredRecords.filter(r => r.clockInTime || r.rosterTime).length;
  const lateCount   = filteredRecords.filter(r => getLateStatus(r.rosterTime, r.clockInTime) === "late").length;
  const absentCount = filteredRecords.filter(r => getLateStatus(r.rosterTime, r.clockInTime) === "absent").length;
  const onTimeCount = filteredRecords.filter(r => ["on-time","early"].includes(getLateStatus(r.rosterTime, r.clockInTime))).length;

  return (
    <div className="space-y-4">
      {/* Stats row */}
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

      {/* Filter + Add */}
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
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : records.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <Clock className="h-12 w-12 text-muted-foreground/40" />
            <p className="text-muted-foreground text-center">
              {t("No attendance records for this month yet.","ยังไม่มีข้อมูล Clock In/Out สำหรับเดือนนี้")}
            </p>
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
                              <span className={status === "late" ? "text-red-500 font-semibold" : status === "early" ? "text-blue-500" : "text-green-600"}>
                                {formatTime(r.clockInTime)}
                              </span>
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
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditRecord(r)} data-testid={`button-edit-${r.id}`}>
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:text-red-600" onClick={() => { if (confirm(t("Delete this record?","ลบรายการนี้?"))) deleteMutation.mutate(r.id); }} data-testid={`button-delete-${r.id}`}>
                                <Trash2 className="h-3 w-3" />
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
          </CardContent>
        </Card>
      )}

      {editRecord !== null && (
        <EditRecordDialog record={editRecord} onClose={() => setEditRecord(null)} storeId={storeId} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Shared time-format validation
// Accepts: "" | "OFF" | "HH:MM" | "HH:MM - HH:MM"
// ─────────────────────────────────────────────────────────
const TIME_RE       = /^(\d{2}):(\d{2})$/;
const TIME_RANGE_RE = /^(\d{2}):(\d{2})\s*-\s*(\d{2}):(\d{2})$/;

function isValidTimePart(h: number, m: number): boolean {
  return h >= 0 && h <= 23 && m >= 0 && m <= 59;
}

function isValidTimeInput(val: string): boolean {
  const v = val.trim();
  if (!v) return true;
  if (v.toUpperCase() === "OFF") return true;
  const single = TIME_RE.exec(v);
  if (single) return isValidTimePart(parseInt(single[1]), parseInt(single[2]));
  const range = TIME_RANGE_RE.exec(v);
  if (range) {
    return isValidTimePart(parseInt(range[1]), parseInt(range[2]))
        && isValidTimePart(parseInt(range[3]), parseInt(range[4]));
  }
  return false;
}

const TIME_ERR_MSG = "รูปแบบไม่ถูกต้อง เช่น 05:00 หรือ 05:00 - 14:00 (ชั่วโมง 00-23, นาที 00-59)";

// ─────────────────────────────────────────────────────────
// Matrix View (Excel-style: rows=dates, cols=employees)
// ─────────────────────────────────────────────────────────
const DOW_TH = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

function MatrixView({ year, month, storeId }: { year: number; month: number; storeId: string }) {
  const { language } = useI18n();
  const { toast } = useToast();
  const t = (en: string, th: string) => language === "th" ? th : en;

  const [localEdits, setLocalEdits] = useState<Record<string, Record<string, string>>>({});
  const [savingRows, setSavingRows] = useState<Set<string>>(new Set());
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const escapingRef = useRef(false);

  const { data, isLoading } = useQuery<{ ok: boolean; records: ClockRecord[] }>({
    queryKey: ["/api/attendance/records", year, month, storeId],
    queryFn: async () => {
      const token = localStorage.getItem("bk_token") || "";
      const res = await fetch(`/api/attendance/records?token=${token}&year=${year}&month=${month}&storeId=${storeId}`);
      return res.json();
    },
  });

  const records = data?.records || [];

  // Build employee list preserving order of first appearance
  const employeeMap = new Map<string, { fullName: string; nickName: string | null; position: string | null }>();
  records.forEach(r => {
    if (!employeeMap.has(r.employeeFullName)) {
      employeeMap.set(r.employeeFullName, {
        fullName: r.employeeFullName,
        nickName: r.employeeNickName,
        position: r.position,
      });
    }
  });
  const employees = Array.from(employeeMap.values());

  // Build record index: "date:fullName" -> record
  const recordIndex: Record<string, ClockRecord> = {};
  records.forEach(r => { recordIndex[`${r.date}:${r.employeeFullName}`] = r; });

  // Generate all days in the month
  const daysInMonth = new Date(year, month, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const d = i + 1;
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const dowIdx = new Date(dateStr + "T00:00:00").getDay();
    return { date: dateStr, day: d, dowIdx };
  });

  const getEdit = (date: string, empName: string, field: string) =>
    localEdits[`${date}:${empName}`]?.[field];

  const setEdit = (date: string, empName: string, field: string, value: string) => {
    const k = `${date}:${empName}`;
    setLocalEdits(prev => ({ ...prev, [k]: { ...(prev[k] || {}), [field]: value } }));
    setFieldErrors(prev => { const n = { ...prev }; delete n[`${k}:${field}`]; return n; });
  };

  const revertField = (date: string, empName: string, field: string) => {
    escapingRef.current = true;
    const k = `${date}:${empName}`;
    setLocalEdits(prev => {
      const n = { ...prev };
      if (n[k]) {
        const row = { ...n[k] };
        delete row[field];
        if (Object.keys(row).length === 0) delete n[k]; else n[k] = row;
      }
      return n;
    });
    setFieldErrors(prev => { const n = { ...prev }; delete n[`${k}:${field}`]; return n; });
  };

  const saveRow = async (date: string, emp: { fullName: string; nickName: string | null; position: string | null }) => {
    if (escapingRef.current) { escapingRef.current = false; return; }
    const k = `${date}:${emp.fullName}`;
    const edits = localEdits[k];
    if (!edits || Object.keys(edits).length === 0) return;

    // Validate time fields before sending to API
    const timeFields = ["rosterTime", "clockInTime", "clockOutTime"] as const;
    const newErrors: Record<string, string> = {};
    for (const field of timeFields) {
      const val = edits[field] ?? "";
      if (!isValidTimeInput(val)) newErrors[`${k}:${field}`] = TIME_ERR_MSG;
    }
    if (Object.keys(newErrors).length > 0) {
      setFieldErrors(prev => ({ ...prev, ...newErrors }));
      return;
    }
    setFieldErrors(prev => {
      const n = { ...prev };
      timeFields.forEach(f => delete n[`${k}:${f}`]);
      return n;
    });

    const existing = recordIndex[k];
    const payload = {
      token: localStorage.getItem("bk_token"),
      date,
      storeId,
      employeeFullName: emp.fullName,
      employeeNickName: edits.employeeNickName ?? emp.nickName ?? "",
      position: edits.position ?? emp.position ?? "",
      rosterTime: edits.rosterTime ?? existing?.rosterTime ?? "",
      clockInTime: edits.clockInTime ?? existing?.clockInTime ?? "",
      clockOutTime: edits.clockOutTime ?? existing?.clockOutTime ?? "",
      notes: edits.notes ?? existing?.notes ?? "",
    };
    setSavingRows(prev => new Set(prev).add(k));
    try {
      const url = existing?.id ? `/api/attendance/record/${existing.id}` : "/api/attendance/record";
      const method = existing?.id ? "PUT" : "POST";
      const res = await apiRequest(method, url, payload);
      const json = await res.json();
      if (json.ok) {
        setLocalEdits(prev => { const n = { ...prev }; delete n[k]; return n; });
        qc.invalidateQueries({ queryKey: ["/api/attendance/records"] });
      } else {
        toast({ variant: "destructive", title: "Error", description: json.message });
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally {
      setSavingRows(prev => { const n = new Set(prev); n.delete(k); return n; });
    }
  };

  if (isLoading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  if (employees.length === 0) return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-12">
        <LayoutGrid className="h-12 w-12 text-muted-foreground/40" />
        <p className="text-muted-foreground text-center">
          {t("No records yet — Import Excel or add records first.", "ยังไม่มีข้อมูล — กรุณา Import Excel หรือเพิ่มรายการก่อน")}
        </p>
      </CardContent>
    </Card>
  );

  const inputCls = "w-full h-6 px-1 text-[11px] bg-transparent border-0 focus:ring-1 focus:ring-primary rounded focus:outline-none min-w-[52px]";

  return (
    <div className="space-y-3">
      {/* Legend */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs text-muted-foreground">
          {t("Click any cell to edit — saves on blur. Press Escape to cancel.", "คลิกเซลล์เพื่อแก้ไข — บันทึกอัตโนมัติเมื่อออกจากเซลล์ • กด Escape เพื่อยกเลิก")}
        </p>
        <div className="flex gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />{t("On time","ตรงเวลา")}</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />{t("Late","สาย")}</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />{t("Early","เร็ว")}</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />{t("Weekend","เสาร์/อา")}</span>
        </div>
      </div>

      {/* Matrix Table */}
      <div className="rounded-lg border overflow-auto max-h-[65vh]">
        <table className="text-xs border-collapse w-full min-w-max">
          <thead className="sticky top-0 z-20 bg-background">
            {/* Employee header row */}
            <tr className="border-b">
              <th
                className="border-r px-2 py-2 text-left font-medium bg-muted/60 w-16 sticky left-0 z-30"
                rowSpan={2}
              >
                {t("Date","วันที่")}
              </th>
              {employees.map(emp => (
                <th
                  key={emp.fullName}
                  colSpan={4}
                  className="border-r px-2 py-1.5 text-center font-semibold bg-primary/8 whitespace-nowrap border-x"
                >
                  <div className="text-primary text-xs">{emp.nickName || emp.fullName}</div>
                  {emp.nickName && <div className="text-muted-foreground font-normal text-[10px] leading-tight">{emp.fullName}</div>}
                  {emp.position && <div className="text-muted-foreground font-normal text-[10px] leading-tight">{emp.position}</div>}
                </th>
              ))}
            </tr>
            {/* Sub-header row */}
            <tr className="border-b bg-muted/40">
              {employees.map(emp => (
                [
                  { key: "roster", label: "Roster" },
                  { key: "in", label: t("In","เข้า") },
                  { key: "out", label: t("Out","ออก") },
                  { key: "notes", label: t("Note","หมายเหตุ") },
                ].map(col => (
                  <th
                    key={`${emp.fullName}-${col.key}`}
                    className="border px-1 py-1 text-center font-normal text-muted-foreground whitespace-nowrap text-[10px]"
                  >
                    {col.label}
                  </th>
                ))
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map(({ date, day, dowIdx }) => {
              const isWeekend = dowIdx === 0 || dowIdx === 6;
              const dowLabel = DOW_TH[dowIdx];
              return (
                <tr
                  key={date}
                  className={`border-b hover:bg-muted/20 transition-colors ${isWeekend ? "bg-amber-50/60 dark:bg-amber-950/15" : ""}`}
                >
                  {/* Date cell — sticky left */}
                  <td className="border-r px-2 py-0.5 font-medium sticky left-0 z-10 whitespace-nowrap bg-inherit">
                    <span className={`font-semibold ${isWeekend ? "text-amber-600 dark:text-amber-400" : "text-foreground"}`}>
                      {dowLabel}
                    </span>
                    <span className="text-muted-foreground ml-1 text-[11px]">{day}</span>
                  </td>

                  {/* Employee columns */}
                  {employees.map(emp => {
                    const k = `${date}:${emp.fullName}`;
                    const rec = recordIndex[k];
                    const isSaving = savingRows.has(k);

                    const roster = getEdit(date, emp.fullName, "rosterTime") ?? rec?.rosterTime ?? "";
                    const clockIn = getEdit(date, emp.fullName, "clockInTime") ?? rec?.clockInTime ?? "";
                    const clockOut = getEdit(date, emp.fullName, "clockOutTime") ?? rec?.clockOutTime ?? "";
                    const notes = getEdit(date, emp.fullName, "notes") ?? rec?.notes ?? "";

                    const status = getLateStatus(roster, clockIn);
                    const inColor = status === "late" ? "text-red-500 font-semibold"
                      : status === "early" ? "text-blue-500"
                      : status === "on-time" ? "text-green-600" : "";

                    const errR = fieldErrors[`${k}:rosterTime`];
                    const errI = fieldErrors[`${k}:clockInTime`];
                    const errO = fieldErrors[`${k}:clockOutTime`];

                    return (
                      <>
                        <td key={`${k}-r`} className="border px-0.5 py-0.5">
                          <input
                            className={`${inputCls} ${errR ? "ring-1 ring-red-500 rounded" : ""}`}
                            value={roster}
                            placeholder="05:00"
                            title={errR}
                            onChange={e => setEdit(date, emp.fullName, "rosterTime", e.target.value)}
                            onBlur={() => saveRow(date, emp)}
                            onKeyDown={e => { if (e.key === "Escape") { e.preventDefault(); revertField(date, emp.fullName, "rosterTime"); (e.target as HTMLInputElement).blur(); return; } if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLInputElement).blur(); moveRowFocus(e, e.shiftKey ? -1 : 1); } }}
                            data-testid={`cell-roster-${date}-${emp.fullName.replace(/\s/g,"_")}`}
                          />
                          {errR && <div className="text-[9px] text-red-500 leading-tight px-0.5" data-testid={`err-roster-${date}-${emp.fullName.replace(/\s/g,"_")}`}>{errR}</div>}
                        </td>
                        <td key={`${k}-i`} className="border px-0.5 py-0.5">
                          <input
                            className={`${inputCls} ${inColor} ${errI ? "ring-1 ring-red-500 rounded" : ""}`}
                            value={clockIn}
                            placeholder="05:02"
                            title={errI}
                            onChange={e => setEdit(date, emp.fullName, "clockInTime", e.target.value)}
                            onBlur={() => saveRow(date, emp)}
                            onKeyDown={e => { if (e.key === "Escape") { e.preventDefault(); revertField(date, emp.fullName, "clockInTime"); (e.target as HTMLInputElement).blur(); return; } if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLInputElement).blur(); moveRowFocus(e, e.shiftKey ? -1 : 1); } }}
                            data-testid={`cell-in-${date}-${emp.fullName.replace(/\s/g,"_")}`}
                          />
                          {errI && <div className="text-[9px] text-red-500 leading-tight px-0.5" data-testid={`err-in-${date}-${emp.fullName.replace(/\s/g,"_")}`}>{errI}</div>}
                        </td>
                        <td key={`${k}-o`} className="border px-0.5 py-0.5">
                          <input
                            className={`${inputCls} ${errO ? "ring-1 ring-red-500 rounded" : ""}`}
                            value={clockOut}
                            placeholder="14:00"
                            title={errO}
                            onChange={e => setEdit(date, emp.fullName, "clockOutTime", e.target.value)}
                            onBlur={() => saveRow(date, emp)}
                            onKeyDown={e => { if (e.key === "Escape") { e.preventDefault(); revertField(date, emp.fullName, "clockOutTime"); (e.target as HTMLInputElement).blur(); return; } if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLInputElement).blur(); moveRowFocus(e, e.shiftKey ? -1 : 1); } }}
                            data-testid={`cell-out-${date}-${emp.fullName.replace(/\s/g,"_")}`}
                          />
                          {errO && <div className="text-[9px] text-red-500 leading-tight px-0.5" data-testid={`err-out-${date}-${emp.fullName.replace(/\s/g,"_")}`}>{errO}</div>}
                        </td>
                        <td key={`${k}-n`} className="border px-0.5 py-0.5">
                          {isSaving ? (
                            <div className="flex items-center justify-center h-6">
                              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                            </div>
                          ) : (
                            <input
                              className={inputCls}
                              value={notes}
                              onChange={e => setEdit(date, emp.fullName, "notes", e.target.value)}
                              onBlur={() => saveRow(date, emp)}
                              onKeyDown={e => { if (e.key === "Escape") { e.preventDefault(); revertField(date, emp.fullName, "notes"); (e.target as HTMLInputElement).blur(); return; } if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLInputElement).blur(); moveRowFocus(e, e.shiftKey ? -1 : 1); } }}
                              data-testid={`cell-notes-${date}-${emp.fullName.replace(/\s/g,"_")}`}
                            />
                          )}
                        </td>
                      </>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Helper: move focus to next/prev row, same column on Enter
// ─────────────────────────────────────────────────────────
function moveRowFocus(e: React.KeyboardEvent, direction: 1 | -1) {
  const input = e.target as HTMLInputElement;
  const tr = input.closest("tr");
  const tbody = tr?.closest("tbody");
  if (!tr || !tbody) return;
  const rows = Array.from(tbody.querySelectorAll("tr"));
  const rowIdx = rows.indexOf(tr);
  const rowInputs = Array.from(tr.querySelectorAll("input"));
  const colIdx = rowInputs.indexOf(input);
  let nextRowIdx = rowIdx + direction;
  while (nextRowIdx >= 0 && nextRowIdx < rows.length) {
    const nextInputs = Array.from(rows[nextRowIdx].querySelectorAll("input"));
    if (nextInputs[colIdx]) {
      (nextInputs[colIdx] as HTMLInputElement).focus();
      return;
    }
    nextRowIdx += direction;
  }
}

// ─────────────────────────────────────────────────────────
// Excel Roster View (Manager team — inline editable)
// ─────────────────────────────────────────────────────────
const DOW_EN3 = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// Header colours per employee block (matching Excel palette)
const EMP_COLORS = [
  { header: "#E2EFDA", accent: "#375623", colHead: "#A9D18E" },
  { header: "#FCE4D6", accent: "#833C00", colHead: "#F4B183" },
  { header: "#FFF2CC", accent: "#7F6000", colHead: "#FFD966" },
  { header: "#DDEBF7", accent: "#1F3864", colHead: "#9DC3E6" },
  { header: "#EDD6F8", accent: "#7030A0", colHead: "#C5A3E3" },
];

// Shift definitions — display labels match Excel; h0/h1 are non-overlapping count ranges (inclusive)
// Swing  05:00/06:00 → counts start hours 5–6
// Open   06:00/08:00 → counts start hours 7–10 (6am belongs to Swing to avoid double-count)
// Mid    11:00/13:00 → counts start hours 11–19
// Late N 20:00/22:00 → counts start hours 20–22
const SHIFT_DEFS = [
  { name: "Swing",  label: "05:00 / 06:00", bg: "#FF6600", fg: "#fff", h0: 5,  h1: 6  },
  { name: "Open",   label: "06:00 / 08:00", bg: "#92D050", fg: "#fff", h0: 7,  h1: 10 },
  { name: "Mid",    label: "11:00 / 13:00", bg: "#70AD47", fg: "#fff", h0: 11, h1: 19 },
  { name: "Late N", label: "20:00 / 22:00", bg: "#FFC000", fg: "#333", h0: 20, h1: 22 },
];

function isManagerPos(pos: string | null) {
  if (!pos) return false;
  const p = pos.toLowerCase();
  return p.includes("manager") || p.includes("shift");
}

function getPosPriority(pos: string | null): number {
  if (!pos) return 3;
  const p = pos.toLowerCase();
  if (p.includes("store manager") && !p.includes("asst") && !p.includes("assistant")) return 0;
  if (p.includes("assistant") || p.includes("asst")) return 1;
  if (p.includes("shift")) return 2;
  return 3;
}

function AddEmployeeDialog({
  year, month, storeId, onClose, onAdded,
}: { year: number; month: number; storeId: string; onClose: () => void; onAdded: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ fullName: "", nickName: "", position: "" });
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!form.fullName.trim()) {
      toast({ variant: "destructive", title: "Error", description: "กรุณาใส่ชื่อเต็มพนักงาน" });
      return;
    }
    setSaving(true);
    const date = `${year}-${String(month).padStart(2, "0")}-01`;
    try {
      const res = await apiRequest("POST", "/api/attendance/record", {
        token: localStorage.getItem("bk_token"),
        date,
        storeId,
        employeeFullName: form.fullName.trim(),
        employeeNickName: form.nickName.trim(),
        position: form.position.trim(),
        rosterTime: "",
        clockInTime: "",
        clockOutTime: "",
        notes: "",
      });
      const json = await res.json();
      if (json.ok) {
        toast({ title: "เพิ่มพนักงานแล้ว", description: `${form.fullName} ปรากฏในตารางแล้ว` });
        qc.invalidateQueries({ queryKey: ["/api/attendance/records"] });
        onAdded();
        onClose();
      } else {
        toast({ variant: "destructive", title: "Error", description: json.message });
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            เพิ่มพนักงานในตาราง
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div>
            <Label className="text-xs">ชื่อเต็ม *</Label>
            <Input
              value={form.fullName}
              onChange={e => setForm({ ...form, fullName: e.target.value })}
              placeholder="Firstname Lastname"
              className="h-8 text-sm mt-1"
              data-testid="input-add-emp-fullname"
              autoFocus
            />
          </div>
          <div>
            <Label className="text-xs">ชื่อเล่น</Label>
            <Input
              value={form.nickName}
              onChange={e => setForm({ ...form, nickName: e.target.value })}
              placeholder="เช่น Jew, Non, Yo"
              className="h-8 text-sm mt-1"
              data-testid="input-add-emp-nickname"
            />
          </div>
          <div>
            <Label className="text-xs">ตำแหน่ง</Label>
            <Input
              value={form.position}
              onChange={e => setForm({ ...form, position: e.target.value })}
              placeholder="เช่น Shift Manager, Store Manager"
              className="h-8 text-sm mt-1"
              data-testid="input-add-emp-position"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>ยกเลิก</Button>
          <Button size="sm" onClick={handleAdd} disabled={saving} data-testid="button-add-emp-confirm">
            {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <UserPlus className="h-4 w-4 mr-1" />}
            เพิ่มพนักงาน
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ExcelRosterView({ year, month, storeId, storeName = "Grand Diamond" }: { year: number; month: number; storeId: string; storeName?: string }) {
  const { toast } = useToast();
  const [localEdits, setLocalEdits] = useState<Record<string, Record<string, string>>>({});
  const [savingRows, setSavingRows] = useState<Set<string>>(new Set());
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showAddEmp, setShowAddEmp] = useState(false);
  const escapingRef = useRef(false);

  const { data, isLoading } = useQuery<{ ok: boolean; records: ClockRecord[] }>({
    queryKey: ["/api/attendance/records", year, month, storeId],
    queryFn: async () => {
      const token = localStorage.getItem("bk_token") || "";
      const res = await fetch(`/api/attendance/records?token=${token}&year=${year}&month=${month}&storeId=${storeId}`);
      return res.json();
    },
  });

  const records = data?.records || [];

  // Build ordered manager list (manager/shift manager positions only)
  const empMap = new Map<string, { fullName: string; nickName: string | null; position: string | null }>();
  records.forEach(r => {
    if (isManagerPos(r.position) && !empMap.has(r.employeeFullName)) {
      empMap.set(r.employeeFullName, { fullName: r.employeeFullName, nickName: r.employeeNickName, position: r.position });
    }
  });
  const managers = Array.from(empMap.values());

  // Record index: "YYYY-MM-DD:fullName"
  const recIdx: Record<string, ClockRecord> = {};
  records.forEach(r => { recIdx[`${r.date}:${r.employeeFullName}`] = r; });

  const getEdit = (date: string, empName: string, field: string) =>
    localEdits[`${date}:${empName}`]?.[field];

  const setEdit = (date: string, empName: string, field: string, value: string) => {
    const k = `${date}:${empName}`;
    setLocalEdits(prev => ({ ...prev, [k]: { ...(prev[k] || {}), [field]: value } }));
    setFieldErrors(prev => { const n = { ...prev }; delete n[`${k}:${field}`]; return n; });
  };

  const revertField = (date: string, empName: string, field: string) => {
    escapingRef.current = true;
    const k = `${date}:${empName}`;
    setLocalEdits(prev => {
      const n = { ...prev };
      if (n[k]) {
        const row = { ...n[k] };
        delete row[field];
        if (Object.keys(row).length === 0) delete n[k]; else n[k] = row;
      }
      return n;
    });
    setFieldErrors(prev => { const n = { ...prev }; delete n[`${k}:${field}`]; return n; });
  };

  const saveRow = async (date: string, emp: { fullName: string; nickName: string | null; position: string | null }) => {
    if (escapingRef.current) { escapingRef.current = false; return; }
    const k = `${date}:${emp.fullName}`;
    const edits = localEdits[k];
    if (!edits || Object.keys(edits).length === 0) return;

    // Validate time fields before sending to API
    const timeFields = ["rosterTime", "clockInTime", "clockOutTime"] as const;
    const newErrors: Record<string, string> = {};
    for (const field of timeFields) {
      const val = edits[field] ?? "";
      if (!isValidTimeInput(val)) newErrors[`${k}:${field}`] = TIME_ERR_MSG;
    }
    if (Object.keys(newErrors).length > 0) {
      setFieldErrors(prev => ({ ...prev, ...newErrors }));
      return;
    }
    setFieldErrors(prev => {
      const n = { ...prev };
      timeFields.forEach(f => delete n[`${k}:${f}`]);
      return n;
    });

    const existing = recIdx[k];
    const payload = {
      token: localStorage.getItem("bk_token"),
      date,
      storeId,
      employeeFullName: emp.fullName,
      employeeNickName: edits.employeeNickName ?? emp.nickName ?? "",
      position: edits.position ?? emp.position ?? "",
      rosterTime: edits.rosterTime ?? existing?.rosterTime ?? "",
      clockInTime: edits.clockInTime ?? existing?.clockInTime ?? "",
      clockOutTime: edits.clockOutTime ?? existing?.clockOutTime ?? "",
      notes: edits.notes ?? existing?.notes ?? "",
    };
    setSavingRows(prev => new Set(prev).add(k));
    try {
      const url = existing?.id ? `/api/attendance/record/${existing.id}` : "/api/attendance/record";
      const method = existing?.id ? "PUT" : "POST";
      const res = await apiRequest(method, url, payload);
      const json = await res.json();
      if (json.ok) {
        setLocalEdits(prev => { const n = { ...prev }; delete n[k]; return n; });
        qc.invalidateQueries({ queryKey: ["/api/attendance/records"] });
      } else {
        toast({ variant: "destructive", title: "Error", description: json.message });
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally {
      setSavingRows(prev => { const n = new Set(prev); n.delete(k); return n; });
    }
  };

  // Always render 31 rows; days beyond actual month length show blank data
  const daysInMonth = new Date(year, month, 0).getDate();
  const days = Array.from({ length: 31 }, (_, i) => {
    const d = i + 1;
    const isValid = d <= daysInMonth;
    const dateStr = isValid
      ? `${year}-${String(month).padStart(2,"0")}-${String(d).padStart(2,"0")}`
      : null;
    const dow = isValid && dateStr ? new Date(dateStr + "T00:00:00").getDay() : null;
    return { dateStr, d, dow, isValid };
  });

  const monthShort = MONTH_SHORT[month - 1];

  // Count shifts for shift summary table (only valid days)
  function shiftCount(empName: string, h0: number, h1: number): number {
    return days.reduce((acc, { dateStr, isValid }) => {
      if (!isValid || !dateStr) return acc;
      const rec = recIdx[`${dateStr}:${empName}`];
      if (!rec?.rosterTime) return acc;
      const raw = rec.rosterTime.split(" - ")[0]?.trim() || "";
      const h = parseInt(formatTime(raw).split(":")[0] || "");
      return (!isNaN(h) && h >= h0 && h <= h1) ? acc + 1 : acc;
    }, 0);
  }

  // Parse roster time: show full range or single time
  function displayRoster(rosterTime: string | null): string {
    if (!rosterTime) return "";
    if (rosterTime.toUpperCase().includes("OFF")) return "OFF";
    // "HH:MM - HH:MM" -> keep as is (already readable), or handle datetime
    if (rosterTime.includes("T")) return formatTime(rosterTime);
    return rosterTime;
  }

  if (isLoading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  if (managers.length === 0) return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" className="gap-1.5" onClick={() => setShowAddEmp(true)} data-testid="button-add-employee-empty">
          <UserPlus className="h-4 w-4" />
          เพิ่มพนักงาน
        </Button>
      </div>
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12">
          <Users className="h-12 w-12 text-muted-foreground/40" />
          <p className="text-muted-foreground text-center text-sm font-medium">ยังไม่มีข้อมูลพนักงานในเดือนนี้</p>
          <p className="text-xs text-muted-foreground/70">กด "เพิ่มพนักงาน" เพื่อเริ่มกรอกข้อมูล หรือ Import Excel ก่อน</p>
          <Button size="sm" variant="outline" className="gap-1.5 mt-1" onClick={() => setShowAddEmp(true)}>
            <UserPlus className="h-4 w-4" />
            เพิ่มพนักงาน
          </Button>
        </CardContent>
      </Card>
      {showAddEmp && (
        <AddEmployeeDialog year={year} month={month} storeId={storeId} onClose={() => setShowAddEmp(false)} onAdded={() => {}} />
      )}
    </div>
  );

  const tdBorder = "border border-gray-300 px-1.5 py-0.5";
  const thBorder = "border border-gray-300 px-1.5 py-1 text-center";

  return (
    <>
      <p className="text-xs text-muted-foreground mb-1.5">
        คลิกเซลล์เพื่อแก้ไข — บันทึกอัตโนมัติเมื่อออกจากเซลล์ • กด Escape เพื่อยกเลิก
      </p>
    <div className="rounded-lg border overflow-auto" style={{ maxHeight: "75vh" }}>
      <div className="flex min-w-max">
        {managers.map((emp, idx) => {
          const c = EMP_COLORS[idx % EMP_COLORS.length];
          return (
            <div
              key={emp.fullName}
              className="border-r last:border-r-0 shrink-0"
              style={{ width: 390 }}
              data-testid={`block-roster-${idx}`}
            >
              <table className="w-full border-collapse" style={{ fontSize: 11 }}>
                <tbody>
                  {/* ── Employee header ── */}
                  <tr style={{ backgroundColor: c.header }}>
                    <td className={`${tdBorder} font-medium whitespace-nowrap`} style={{ color: c.accent }}>ชื่อ</td>
                    <td className={`${tdBorder} font-bold`} style={{ color: c.accent }} colSpan={2}>{emp.fullName}</td>
                    <td className={`${tdBorder} font-medium whitespace-nowrap`} style={{ color: c.accent }}>ชื่อเล่น</td>
                    <td className={`${tdBorder} font-bold`} style={{ color: c.accent }}>{emp.nickName || "-"}</td>
                  </tr>
                  <tr style={{ backgroundColor: c.header }}>
                    <td className={`${tdBorder} font-medium whitespace-nowrap`} style={{ color: c.accent }}>สาขา</td>
                    <td className={`${tdBorder} font-bold`} style={{ color: c.accent }} colSpan={2}>{storeName}</td>
                    <td className={`${tdBorder} font-medium whitespace-nowrap`} style={{ color: c.accent }}>Month of</td>
                    <td className={`${tdBorder} font-bold`} style={{ color: c.accent }}>{monthShort}</td>
                  </tr>
                  <tr style={{ backgroundColor: c.header }}>
                    <td className={`${tdBorder} font-medium`} style={{ color: c.accent }}>ตำแหน่ง</td>
                    <td className={`${tdBorder} font-bold`} style={{ color: c.accent }} colSpan={4}>{emp.position || "-"}</td>
                  </tr>

                  {/* ── Column headers ── */}
                  <tr style={{ backgroundColor: c.colHead }}>
                    <th className={`${thBorder} font-semibold`} style={{ color: c.accent }}>วัน</th>
                    <th className={`${thBorder} font-semibold`} style={{ color: c.accent }}>วันที่</th>
                    <th className={`${thBorder} font-semibold leading-tight`} style={{ color: c.accent }}>
                      เวลาเข้างาน<br />(ตาม roster ที่<br />มีลายเซ็น AC)
                    </th>
                    <th className={`${thBorder} font-semibold leading-tight`} style={{ color: c.accent }}>
                      เวลาสแกนนิ้ว<br />เข้างาน (จาก<br />Aloha)
                    </th>
                    <th className={`${thBorder} font-semibold leading-tight`} style={{ color: c.accent }}>
                      เวลาสแกนนิ้ว<br />เลิกงาน (จาก<br />Aloha)
                    </th>
                    <th className={`${thBorder} font-semibold`} style={{ color: c.accent }}>
                      หมายเหตุ
                    </th>
                  </tr>

                  {/* ── Daily rows (always 31) ── */}
                  {days.map(({ dateStr, d, dow, isValid }) => {
                    if (!isValid) {
                      // Day doesn't exist in this month — blank row
                      return (
                        <tr key={`blank-${d}`} style={{ color: "#BFBFBF" }} data-testid={`row-roster-${idx}-${d}`}>
                          <td className={`${tdBorder} text-center`}>{d}</td>
                          <td className={tdBorder} colSpan={5} />
                        </tr>
                      );
                    }
                    const rec = recIdx[`${dateStr}:${emp.fullName}`];
                    const k = `${dateStr}:${emp.fullName}`;
                    const isSaving = savingRows.has(k);
                    const isWknd = dow === 0 || dow === 6;

                    const rosterVal = getEdit(dateStr, emp.fullName, "rosterTime") ?? (rec?.rosterTime ? displayRoster(rec.rosterTime) : "");
                    const clockInVal = getEdit(dateStr, emp.fullName, "clockInTime") ?? (rec?.clockInTime ? formatTime(rec.clockInTime) : "");
                    const clockOutVal = getEdit(dateStr, emp.fullName, "clockOutTime") ?? (rec?.clockOutTime ? formatTime(rec.clockOutTime) : "");
                    const notesVal = getEdit(dateStr, emp.fullName, "notes") ?? (rec?.notes ?? "");

                    const isOff = rosterVal.toUpperCase() === "OFF";
                    const status = getLateStatus(rosterVal, clockInVal);
                    const inColor = status === "late" ? "#CC0000" : status === "early" ? "#1F3864" : status === "on-time" ? "#375623" : undefined;

                    const cellInput = "w-full h-5 px-0.5 text-[11px] bg-transparent border-0 focus:ring-1 focus:ring-blue-400 rounded focus:outline-none text-center";

                    const errR = fieldErrors[`${k}:rosterTime`];
                    const errI = fieldErrors[`${k}:clockInTime`];
                    const errO = fieldErrors[`${k}:clockOutTime`];

                    return (
                      <tr
                        key={dateStr}
                        style={{ backgroundColor: isWknd ? "#FFF2CC" : undefined }}
                        data-testid={`row-roster-${idx}-${d}`}
                      >
                        <td className={`${tdBorder} text-center whitespace-nowrap font-medium`}
                          style={{ color: isWknd ? "#833C00" : undefined }}>
                          {DOW_EN3[dow!]}
                        </td>
                        <td className={`${tdBorder} text-center whitespace-nowrap`}>
                          {d}-{monthShort}
                        </td>
                        <td className={`${tdBorder} p-0`}>
                          <input
                            className={`${cellInput} ${errR ? "ring-1 ring-red-500" : ""}`}
                            style={{ color: isOff ? "#CC0000" : undefined, fontWeight: isOff ? 700 : undefined }}
                            value={rosterVal}
                            placeholder="05:00 - 14:00"
                            title={errR}
                            onChange={e => setEdit(dateStr, emp.fullName, "rosterTime", e.target.value)}
                            onBlur={() => saveRow(dateStr, emp)}
                            onKeyDown={e => { if (e.key === "Escape") { e.preventDefault(); revertField(dateStr, emp.fullName, "rosterTime"); (e.target as HTMLInputElement).blur(); return; } if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLInputElement).blur(); moveRowFocus(e, e.shiftKey ? -1 : 1); } }}
                            data-testid={`cell-exroster-${idx}-${d}`}
                          />
                          {errR && <div className="text-[9px] text-red-500 leading-tight px-0.5" data-testid={`err-exroster-${idx}-${d}`}>{errR}</div>}
                        </td>
                        <td className={`${tdBorder} p-0`}>
                          <input
                            className={`${cellInput} ${errI ? "ring-1 ring-red-500" : ""}`}
                            style={{ color: inColor }}
                            value={clockInVal}
                            placeholder="05:02"
                            title={errI}
                            onChange={e => setEdit(dateStr, emp.fullName, "clockInTime", e.target.value)}
                            onBlur={() => saveRow(dateStr, emp)}
                            onKeyDown={e => { if (e.key === "Escape") { e.preventDefault(); revertField(dateStr, emp.fullName, "clockInTime"); (e.target as HTMLInputElement).blur(); return; } if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLInputElement).blur(); moveRowFocus(e, e.shiftKey ? -1 : 1); } }}
                            data-testid={`cell-exin-${idx}-${d}`}
                          />
                          {errI && <div className="text-[9px] text-red-500 leading-tight px-0.5" data-testid={`err-exin-${idx}-${d}`}>{errI}</div>}
                        </td>
                        <td className={`${tdBorder} p-0`}>
                          <input
                            className={`${cellInput} ${errO ? "ring-1 ring-red-500" : ""}`}
                            value={clockOutVal}
                            placeholder="14:00"
                            title={errO}
                            onChange={e => setEdit(dateStr, emp.fullName, "clockOutTime", e.target.value)}
                            onBlur={() => saveRow(dateStr, emp)}
                            onKeyDown={e => { if (e.key === "Escape") { e.preventDefault(); revertField(dateStr, emp.fullName, "clockOutTime"); (e.target as HTMLInputElement).blur(); return; } if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLInputElement).blur(); moveRowFocus(e, e.shiftKey ? -1 : 1); } }}
                            data-testid={`cell-exout-${idx}-${d}`}
                          />
                          {errO && <div className="text-[9px] text-red-500 leading-tight px-0.5" data-testid={`err-exout-${idx}-${d}`}>{errO}</div>}
                        </td>
                        <td className={`${tdBorder} p-0`}>
                          {isSaving ? (
                            <div className="flex items-center justify-center h-5">
                              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                            </div>
                          ) : (
                            <input
                              className={cellInput}
                              value={notesVal}
                              onChange={e => setEdit(dateStr, emp.fullName, "notes", e.target.value)}
                              onBlur={() => saveRow(dateStr, emp)}
                              onKeyDown={e => { if (e.key === "Escape") { e.preventDefault(); revertField(dateStr, emp.fullName, "notes"); (e.target as HTMLInputElement).blur(); return; } if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLInputElement).blur(); moveRowFocus(e, e.shiftKey ? -1 : 1); } }}
                              data-testid={`cell-exnotes-${idx}-${d}`}
                            />
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {/* ── Spacer ── */}
                  <tr><td colSpan={6} style={{ height: 8 }} /></tr>

                  {/* ── Shift summary header ── */}
                  <tr style={{ backgroundColor: c.colHead }}>
                    <th className={thBorder} style={{ color: c.accent }} colSpan={2}>Shift</th>
                    <th className={thBorder} style={{ color: c.accent }}>Time Roster</th>
                    <th className={thBorder} style={{ color: c.accent }}>Total</th>
                    <th className={thBorder} style={{ color: c.accent }} colSpan={2} />
                  </tr>

                  {/* ── Shift rows ── */}
                  {SHIFT_DEFS.map(s => {
                    const total = shiftCount(emp.fullName, s.h0, s.h1);
                    return (
                      <tr key={s.name} style={{ backgroundColor: s.bg, color: s.fg }}>
                        <td className={tdBorder} colSpan={2} style={{ fontWeight: 600 }}>{s.name}</td>
                        <td className={`${tdBorder} text-center`}>{s.label}</td>
                        <td className={`${tdBorder} text-center font-bold`}>{total > 0 ? total : ""}</td>
                        <td className={tdBorder} colSpan={2} />
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────
// Excel Sheet Tab (paper form — manager side-by-side, blank template)
// ─────────────────────────────────────────────────────────
function ExcelSheetTab({ year, month, storeId, storeName = "Grand Diamond" }: { year: number; month: number; storeId: string; storeName?: string }) {
  const { toast } = useToast();
  const [showAddEmp, setShowAddEmp] = useState(false);

  const [localEdits, setLocalEdits] = useState<Record<string, Record<string, string>>>({});
  const [savingRows, setSavingRows] = useState<Set<string>>(new Set());
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const escapingRef = useRef(false);

  const getEdit = (date: string, empName: string, field: string) =>
    localEdits[`${date}:${empName}`]?.[field];

  const setEditCell = (date: string, empName: string, field: string, value: string) => {
    const k = `${date}:${empName}`;
    setLocalEdits(prev => ({ ...prev, [k]: { ...(prev[k] || {}), [field]: value } }));
    setFieldErrors(prev => { const n = { ...prev }; delete n[`${k}:${field}`]; return n; });
  };

  const revertField = (date: string, empName: string, field: string) => {
    escapingRef.current = true;
    const k = `${date}:${empName}`;
    setLocalEdits(prev => {
      const n = { ...prev };
      if (n[k]) {
        const row = { ...n[k] }; delete row[field];
        if (Object.keys(row).length === 0) delete n[k]; else n[k] = row;
      }
      return n;
    });
    setFieldErrors(prev => { const n = { ...prev }; delete n[`${k}:${field}`]; return n; });
  };

  const saveRow = async (date: string, emp: { fullName: string; nickName: string | null; position: string | null }) => {
    if (escapingRef.current) { escapingRef.current = false; return; }
    const k = `${date}:${emp.fullName}`;
    const edits = localEdits[k];
    if (!edits || Object.keys(edits).length === 0) return;
    const timeFields = ["rosterTime", "clockInTime", "clockOutTime"] as const;
    const newErrors: Record<string, string> = {};
    for (const field of timeFields) {
      const val = edits[field] ?? "";
      if (!isValidTimeInput(val)) newErrors[`${k}:${field}`] = TIME_ERR_MSG;
    }
    if (Object.keys(newErrors).length > 0) { setFieldErrors(prev => ({ ...prev, ...newErrors })); return; }
    setFieldErrors(prev => { const n = { ...prev }; timeFields.forEach(f => delete n[`${k}:${f}`]); return n; });
    const existing = recIdx[k];
    const payload = {
      token: localStorage.getItem("bk_token"),
      date, storeId,
      employeeFullName: emp.fullName,
      employeeNickName: edits.employeeNickName ?? emp.nickName ?? "",
      position: edits.position ?? emp.position ?? "",
      rosterTime: edits.rosterTime ?? existing?.rosterTime ?? "",
      clockInTime: edits.clockInTime ?? existing?.clockInTime ?? "",
      clockOutTime: edits.clockOutTime ?? existing?.clockOutTime ?? "",
      notes: edits.notes ?? existing?.notes ?? "",
    };
    setSavingRows(prev => new Set(prev).add(k));
    try {
      const url = existing?.id ? `/api/attendance/record/${existing.id}` : "/api/attendance/record";
      const method = existing?.id ? "PUT" : "POST";
      const res = await apiRequest(method, url, payload);
      const json = await res.json();
      if (json.ok) {
        setLocalEdits(prev => { const n = { ...prev }; delete n[k]; return n; });
        qc.invalidateQueries({ queryKey: ["/api/attendance/records"] });
      } else {
        toast({ variant: "destructive", title: "Error", description: json.message });
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally {
      setSavingRows(prev => { const n = new Set(prev); n.delete(k); return n; });
    }
  };

  const { data, isLoading: recordsLoading } = useQuery<{ ok: boolean; records: ClockRecord[] }>({
    queryKey: ["/api/attendance/records", year, month, storeId],
    queryFn: async () => {
      const token = localStorage.getItem("bk_token") || "";
      const res = await fetch(`/api/attendance/records?token=${token}&year=${year}&month=${month}&storeId=${storeId}`);
      return res.json();
    },
  });

  const { data: empData, isLoading: empLoading } = useQuery<{ ok: boolean; employees: Array<{ fullName: string; nickName: string | null; position: string | null }> }>({
    queryKey: ["/api/attendance/employees", storeId],
    queryFn: async () => {
      const token = localStorage.getItem("bk_token") || "";
      const res = await fetch(`/api/attendance/employees?token=${token}&storeId=${storeId}`);
      return res.json();
    },
  });

  const isLoading = recordsLoading || empLoading;
  const records = data?.records || [];

  // Build employee list: start from ALL-TIME manager employees so the table
  // shows even in months with no clock records yet; overlay employees found
  // in current-month records (in case someone new was added this month).
  const empMap = new Map<string, { fullName: string; nickName: string | null; position: string | null }>();
  (empData?.employees || []).forEach(e => {
    if (isManagerPos(e.position)) empMap.set(e.fullName, e);
  });
  records.forEach(r => {
    if (isManagerPos(r.position) && !empMap.has(r.employeeFullName))
      empMap.set(r.employeeFullName, { fullName: r.employeeFullName, nickName: r.employeeNickName, position: r.position });
  });
  const employees = Array.from(empMap.values());
  const recIdx: Record<string, ClockRecord> = {};
  records.forEach(r => { recIdx[`${r.date}:${r.employeeFullName}`] = r; });

  const daysInMonth = new Date(year, month, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const d = i + 1;
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const dowIdx = new Date(dateStr + "T00:00:00").getDay();
    return { dateStr, d, dowIdx };
  });

  function shiftCount(empName: string, h0: number, h1: number): number {
    return days.reduce((acc, { dateStr }) => {
      const rec = recIdx[`${dateStr}:${empName}`];
      const h = rosterStartH(rec?.rosterTime || null);
      return h !== null && h >= h0 && h <= h1 ? acc + 1 : acc;
    }, 0);
  }

  function totalRosterDays(empName: string): number {
    return days.reduce((acc, { dateStr }) => {
      const rec = recIdx[`${dateStr}:${empName}`];
      return rec?.rosterTime && rec.rosterTime.toUpperCase() !== "OFF" ? acc + 1 : acc;
    }, 0);
  }

  const GROUP = 5;
  const tdB = "border border-[#bfbfbf] px-1.5 py-0.5 text-center text-[#111111]";
  const cellInput = "w-full h-5 px-0.5 text-[11px] bg-transparent border-0 focus:ring-1 focus:ring-blue-400 rounded focus:outline-none text-center text-[#111111]";

  return (
    <div className="space-y-4">
      {/* Action buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" className="gap-1.5" onClick={() => setShowAddEmp(true)} data-testid="button-add-employee-excel-sheet">
          <UserPlus className="h-3.5 w-3.5" />
          เพิ่มพนักงาน
        </Button>
      </div>

      {/* Add Employee Dialog */}
      {showAddEmp && (
        <AddEmployeeDialog
          year={year} month={month} storeId={storeId}
          onClose={() => setShowAddEmp(false)}
          onAdded={() => { setShowAddEmp(false); qc.invalidateQueries({ queryKey: ["/api/attendance/records"] }); }}
        />
      )}

      {/* Sheet view */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : employees.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <FileSpreadsheet className="h-12 w-12 text-muted-foreground/40" />
            <p className="text-muted-foreground text-center text-sm">
              ยังไม่มีพนักงานในเดือนนี้ — เพิ่มพนักงานเพื่อเริ่มกรอกข้อมูล
            </p>
            <Button size="sm" className="gap-1.5" onClick={() => setShowAddEmp(true)} data-testid="button-add-employee-excel-sheet-empty">
              <UserPlus className="h-3.5 w-3.5" />
              เพิ่มพนักงาน
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border overflow-auto bg-white" style={{ maxHeight: "72vh" }}>
          {Array.from({ length: Math.ceil(employees.length / GROUP) }, (_, gi) => {
            const grpEmps = employees.slice(gi * GROUP, (gi + 1) * GROUP);
            return (
              <div key={gi}>
                {gi > 0 && <div className="h-6 border-t border-b" style={{ backgroundColor: "#d9d9d9" }} />}
                <div className="flex min-w-max">
                  {grpEmps.map((emp, idx) => {
                    const c = EMP_COLORS_CSV[idx % EMP_COLORS_CSV.length];
                    const total = totalRosterDays(emp.fullName);
                    return (
                      <div key={emp.fullName} className="border-r last:border-r-0 shrink-0" style={{ width: 420 }} data-testid={`block-excel-sheet-${gi}-${idx}`}>
                        <table className="w-full border-collapse" style={{ fontSize: 11 }}>
                          <tbody>
                            {/* Row 1: ชื่อ / fullName / ชื่อเล่น / nickName */}
                            <tr style={{ backgroundColor: c.header }}>
                              <td className={`${tdB} font-medium whitespace-nowrap`} style={{ color: c.accent }}>ชื่อ</td>
                              <td className={`${tdB} font-bold`} style={{ color: c.accent }} colSpan={2}>{emp.fullName}</td>
                              <td className={`${tdB} font-medium whitespace-nowrap`} style={{ color: c.accent }}>ชื่อเล่น</td>
                              <td className={`${tdB} font-bold`} style={{ color: c.accent }} colSpan={2}>{emp.nickName || "—"}</td>
                            </tr>
                            {/* Row 2: สาขา / Month */}
                            <tr style={{ backgroundColor: c.header }}>
                              <td className={`${tdB} font-medium whitespace-nowrap`} style={{ color: c.accent }}>สาขา</td>
                              <td className={`${tdB}`} style={{ color: c.accent }} colSpan={2}>{storeName}</td>
                              <td className={`${tdB} font-medium whitespace-nowrap`} style={{ color: c.accent }}>Month of</td>
                              <td className={`${tdB}`} style={{ color: c.accent }} colSpan={2}>{MONTH_SHORT[month - 1]}</td>
                            </tr>
                            {/* Row 3: ตำแหน่ง */}
                            <tr style={{ backgroundColor: c.header }}>
                              <td className={`${tdB} font-medium whitespace-nowrap`} style={{ color: c.accent }}>ตำแหน่ง</td>
                              <td className={`${tdB}`} style={{ color: c.accent }} colSpan={5}>{emp.position || "—"}</td>
                            </tr>
                            {/* Column headers */}
                            <tr style={{ backgroundColor: c.colHead }}>
                              <th className={`${tdB} font-semibold`} style={{ color: c.accent }}>วัน</th>
                              <th className={`${tdB} font-semibold`} style={{ color: c.accent }}>วันที่</th>
                              <th className={`${tdB} font-semibold leading-tight`} style={{ color: c.accent }}>Roster</th>
                              <th className={`${tdB} font-semibold leading-tight`} style={{ color: c.accent }}>ScanIn</th>
                              <th className={`${tdB} font-semibold leading-tight`} style={{ color: c.accent }}>ScanOut</th>
                              <th className={`${tdB} font-semibold`} style={{ color: c.accent }}>Notes</th>
                            </tr>
                            {/* Daily editable rows — always 31 */}
                            {days.map(({ dateStr, d, dowIdx }) => {
                              const rec = recIdx[`${dateStr}:${emp.fullName}`];
                              const k = `${dateStr}:${emp.fullName}`;
                              const isSaving = savingRows.has(k);
                              const isWknd = dowIdx === 0 || dowIdx === 6;

                              const rosterVal = getEdit(dateStr, emp.fullName, "rosterTime") ?? rec?.rosterTime ?? "";
                              const inVal     = getEdit(dateStr, emp.fullName, "clockInTime") ?? (rec?.clockInTime ? formatTime(rec.clockInTime) : "");
                              const outVal    = getEdit(dateStr, emp.fullName, "clockOutTime") ?? (rec?.clockOutTime ? formatTime(rec.clockOutTime) : "");
                              const notesVal  = getEdit(dateStr, emp.fullName, "notes") ?? rec?.notes ?? "";

                              const status = getLateStatus(rosterVal || null, inVal || null);
                              const inColor = status === "late" ? "#CC0000" : status === "early" ? "#1F3864" : status === "on-time" ? "#375623" : undefined;

                              const errR = fieldErrors[`${k}:rosterTime`];
                              const errI = fieldErrors[`${k}:clockInTime`];
                              const errO = fieldErrors[`${k}:clockOutTime`];

                              return (
                                <tr key={dateStr} style={{ backgroundColor: isWknd ? "#FFF2CC" : "#ffffff" }}>
                                  <td className={tdB} style={{ color: isWknd ? "#833C00" : "#111111", fontWeight: isWknd ? 600 : undefined }}>
                                    {DOW_TH[dowIdx]}
                                  </td>
                                  <td className={tdB} style={{ color: isWknd ? "#833C00" : "#111111" }}>{d}</td>
                                  {/* Roster */}
                                  <td className={`${tdB} p-0`}>
                                    <input
                                      className={cellInput}
                                      style={{ color: rosterVal?.toUpperCase() === "OFF" ? "#CC0000" : undefined }}
                                      value={rosterVal}
                                      onChange={e => setEditCell(dateStr, emp.fullName, "rosterTime", e.target.value)}
                                      onBlur={() => saveRow(dateStr, emp)}
                                      onKeyDown={e => { if (e.key === "Escape") { e.preventDefault(); revertField(dateStr, emp.fullName, "rosterTime"); (e.target as HTMLInputElement).blur(); } else if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLInputElement).blur(); } }}
                                      disabled={isSaving}
                                      data-testid={`cell-es-roster-${idx}-${d}`}
                                    />
                                    {errR && <div className="text-[9px] text-red-500 leading-tight px-0.5">{errR}</div>}
                                  </td>
                                  {/* ScanIn */}
                                  <td className={`${tdB} p-0`}>
                                    {isSaving ? (
                                      <div className="flex items-center justify-center h-5"><Loader2 className="h-3 w-3 animate-spin text-muted-foreground" /></div>
                                    ) : (
                                      <input
                                        className={cellInput}
                                        style={{ color: inColor }}
                                        value={inVal}
                                        onChange={e => setEditCell(dateStr, emp.fullName, "clockInTime", e.target.value)}
                                        onBlur={() => saveRow(dateStr, emp)}
                                        onKeyDown={e => { if (e.key === "Escape") { e.preventDefault(); revertField(dateStr, emp.fullName, "clockInTime"); (e.target as HTMLInputElement).blur(); } else if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLInputElement).blur(); } }}
                                        data-testid={`cell-es-scanin-${idx}-${d}`}
                                      />
                                    )}
                                    {errI && <div className="text-[9px] text-red-500 leading-tight px-0.5">{errI}</div>}
                                  </td>
                                  {/* ScanOut */}
                                  <td className={`${tdB} p-0`}>
                                    {isSaving ? (
                                      <div className="flex items-center justify-center h-5"><Loader2 className="h-3 w-3 animate-spin text-muted-foreground" /></div>
                                    ) : (
                                      <input
                                        className={cellInput}
                                        value={outVal}
                                        onChange={e => setEditCell(dateStr, emp.fullName, "clockOutTime", e.target.value)}
                                        onBlur={() => saveRow(dateStr, emp)}
                                        onKeyDown={e => { if (e.key === "Escape") { e.preventDefault(); revertField(dateStr, emp.fullName, "clockOutTime"); (e.target as HTMLInputElement).blur(); } else if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLInputElement).blur(); } }}
                                        data-testid={`cell-es-scanout-${idx}-${d}`}
                                      />
                                    )}
                                    {errO && <div className="text-[9px] text-red-500 leading-tight px-0.5">{errO}</div>}
                                  </td>
                                  {/* Notes */}
                                  <td className={`${tdB} p-0`}>
                                    {isSaving ? (
                                      <div className="flex items-center justify-center h-5"><Loader2 className="h-3 w-3 animate-spin text-muted-foreground" /></div>
                                    ) : (
                                      <input
                                        className={`${cellInput} text-left`}
                                        value={notesVal}
                                        onChange={e => setEditCell(dateStr, emp.fullName, "notes", e.target.value)}
                                        onBlur={() => saveRow(dateStr, emp)}
                                        onKeyDown={e => { if (e.key === "Escape") { e.preventDefault(); revertField(dateStr, emp.fullName, "notes"); (e.target as HTMLInputElement).blur(); } else if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLInputElement).blur(); } }}
                                        data-testid={`cell-es-notes-${idx}-${d}`}
                                      />
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                            {/* Spacer */}
                            <tr><td colSpan={6} style={{ height: 6, backgroundColor: "#f2f2f2", borderTop: "1px solid #bfbfbf", borderBottom: "1px solid #bfbfbf" }} /></tr>
                            {/* Shift summary header */}
                            <tr style={{ backgroundColor: c.colHead }}>
                              <th className={`${tdB} font-semibold`} style={{ color: c.accent }}>Shift</th>
                              <th className={`${tdB} font-semibold`} style={{ color: c.accent }}>Time</th>
                              <th className={`${tdB} font-semibold`} style={{ color: c.accent }}>Time Roster</th>
                              <th className={`${tdB} font-semibold`} style={{ color: c.accent }}>Total</th>
                              <th className={tdB} colSpan={2} />
                            </tr>
                            {CSV_SHIFTS_FE.map(sh => {
                              const cnt = shiftCount(emp.fullName, sh.h0, sh.h1);
                              return (
                                <tr key={sh.label} style={{ backgroundColor: "#ffffff" }}>
                                  <td className={tdB} style={{ textAlign: "left", paddingLeft: 4, color: "#111111" }}>{sh.label}</td>
                                  <td className={tdB} style={{ color: "#111111" }}>{sh.h0}:00</td>
                                  <td className={tdB} style={{ color: cnt > 0 ? c.accent : "#111111", fontWeight: cnt > 0 ? 600 : undefined }}>{cnt > 0 ? cnt : ""}</td>
                                  <td className={tdB} />
                                  <td className={tdB} colSpan={2} />
                                </tr>
                              );
                            })}
                            {/* Total row */}
                            <tr style={{ backgroundColor: c.colHead, fontWeight: 600 }}>
                              <td className={tdB} style={{ color: c.accent }}>Total</td>
                              <td className={tdB} style={{ color: c.accent }}>Total</td>
                              <td className={tdB} style={{ color: c.accent }}>{total > 0 ? total : ""}</td>
                              <td className={tdB} style={{ color: c.accent }}>{total > 0 ? total : ""}</td>
                              <td className={tdB} colSpan={2} />
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Clock In Out CSV Sheet Tab
// ─────────────────────────────────────────────────────────
const CSV_SHIFTS_FE = [
  { label: "Swing/5:00",   h0: 5,  h1: 5  },
  { label: "Open/6:00",    h0: 6,  h1: 6  },
  { label: "Swing/7:00",   h0: 7,  h1: 7  },
  { label: "8:00-11:00",   h0: 8,  h1: 11 },
  { label: "Mid/12:00",    h0: 12, h1: 12 },
  { label: "13:00",        h0: 13, h1: 13 },
  { label: "Swing/14:00",  h0: 14, h1: 14 },
  { label: "15:00-16:00",  h0: 15, h1: 16 },
  { label: "Late N/21:00", h0: 21, h1: 21 },
  { label: "Swing/22:00",  h0: 22, h1: 22 },
];

const EMP_COLORS_CSV = [
  { header: "#E2EFDA", accent: "#375623", colHead: "#A9D18E" },
  { header: "#FCE4D6", accent: "#833C00", colHead: "#F4B183" },
  { header: "#FFF2CC", accent: "#7F6000", colHead: "#FFD966" },
  { header: "#DDEBF7", accent: "#1F3864", colHead: "#9DC3E6" },
  { header: "#EDD6F8", accent: "#7030A0", colHead: "#C5A3E3" },
];

function rosterStartH(rosterTime: string | null): number | null {
  if (!rosterTime) return null;
  const raw = rosterTime.split(" - ")[0]?.trim() || "";
  const h = parseInt(raw.split(":")[0] || "");
  return isNaN(h) ? null : h;
}

function ClockInOutCSVTab({ year, month, storeId, storeName = "Grand Diamond" }: { year: number; month: number; storeId: string; storeName?: string }) {
  const { toast } = useToast();
  const { language } = useI18n();
  const t = (en: string, th: string) => language === "th" ? th : en;
  const csvFileRef = useRef<HTMLInputElement>(null);
  const [importStep, setImportStep] = useState<"idle" | "preview" | "done">("idle");
  const [importLoading, setImportLoading] = useState(false);
  const [importPreview, setImportPreview] = useState<ClockRecord[]>([]);
  const [importCount, setImportCount] = useState(0);
  const [importResult, setImportResult] = useState<{ imported: number; updated: number } | null>(null);
  const [importFileName, setImportFileName] = useState("");
  const [showAddEmp, setShowAddEmp] = useState(false);

  // Inline editing state (same pattern as ExcelRosterView)
  const [localEdits, setLocalEdits] = useState<Record<string, Record<string, string>>>({});
  const [savingRows, setSavingRows] = useState<Set<string>>(new Set());
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const escapingRef = useRef(false);

  const getEdit = (date: string, empName: string, field: string) =>
    localEdits[`${date}:${empName}`]?.[field];

  const setEditCell = (date: string, empName: string, field: string, value: string) => {
    const k = `${date}:${empName}`;
    setLocalEdits(prev => ({ ...prev, [k]: { ...(prev[k] || {}), [field]: value } }));
    setFieldErrors(prev => { const n = { ...prev }; delete n[`${k}:${field}`]; return n; });
  };

  const revertField = (date: string, empName: string, field: string) => {
    escapingRef.current = true;
    const k = `${date}:${empName}`;
    setLocalEdits(prev => {
      const n = { ...prev };
      if (n[k]) {
        const row = { ...n[k] }; delete row[field];
        if (Object.keys(row).length === 0) delete n[k]; else n[k] = row;
      }
      return n;
    });
    setFieldErrors(prev => { const n = { ...prev }; delete n[`${k}:${field}`]; return n; });
  };

  const saveRow = async (date: string, emp: { fullName: string; nickName: string | null; position: string | null }) => {
    if (escapingRef.current) { escapingRef.current = false; return; }
    const k = `${date}:${emp.fullName}`;
    const edits = localEdits[k];
    if (!edits || Object.keys(edits).length === 0) return;
    const timeFields = ["rosterTime", "clockInTime", "clockOutTime"] as const;
    const newErrors: Record<string, string> = {};
    for (const field of timeFields) {
      const val = edits[field] ?? "";
      if (!isValidTimeInput(val)) newErrors[`${k}:${field}`] = TIME_ERR_MSG;
    }
    if (Object.keys(newErrors).length > 0) { setFieldErrors(prev => ({ ...prev, ...newErrors })); return; }
    setFieldErrors(prev => { const n = { ...prev }; timeFields.forEach(f => delete n[`${k}:${f}`]); return n; });
    const existing = recIdx[k];
    const payload = {
      token: localStorage.getItem("bk_token"),
      date, storeId,
      employeeFullName: emp.fullName,
      employeeNickName: edits.employeeNickName ?? emp.nickName ?? "",
      position: edits.position ?? emp.position ?? "",
      rosterTime: edits.rosterTime ?? existing?.rosterTime ?? "",
      clockInTime: edits.clockInTime ?? existing?.clockInTime ?? "",
      clockOutTime: edits.clockOutTime ?? existing?.clockOutTime ?? "",
      notes: edits.notes ?? existing?.notes ?? "",
    };
    setSavingRows(prev => new Set(prev).add(k));
    try {
      const url = existing?.id ? `/api/attendance/record/${existing.id}` : "/api/attendance/record";
      const method = existing?.id ? "PUT" : "POST";
      const res = await apiRequest(method, url, payload);
      const json = await res.json();
      if (json.ok) {
        setLocalEdits(prev => { const n = { ...prev }; delete n[k]; return n; });
        qc.invalidateQueries({ queryKey: ["/api/attendance/records"] });
      } else {
        toast({ variant: "destructive", title: "Error", description: json.message });
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally {
      setSavingRows(prev => { const n = new Set(prev); n.delete(k); return n; });
    }
  };

  const { data, isLoading } = useQuery<{ ok: boolean; records: ClockRecord[] }>({
    queryKey: ["/api/attendance/records", year, month, storeId],
    queryFn: async () => {
      const token = localStorage.getItem("bk_token") || "";
      const res = await fetch(`/api/attendance/records?token=${token}&year=${year}&month=${month}&storeId=${storeId}`);
      return res.json();
    },
  });

  const records = data?.records || [];

  const empMap = new Map<string, { fullName: string; nickName: string | null; position: string | null }>();
  records.forEach(r => {
    if (isManagerPos(r.position) && !empMap.has(r.employeeFullName))
      empMap.set(r.employeeFullName, { fullName: r.employeeFullName, nickName: r.employeeNickName, position: r.position });
  });
  const employees = Array.from(empMap.values());
  const recIdx: Record<string, ClockRecord> = {};
  records.forEach(r => { recIdx[`${r.date}:${r.employeeFullName}`] = r; });

  const daysInMonth = new Date(year, month, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const d = i + 1;
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const dowIdx = new Date(dateStr + "T00:00:00").getDay();
    return { dateStr, d, dowIdx };
  });

  function shiftCount(empName: string, h0: number, h1: number): number {
    return days.reduce((acc, { dateStr }) => {
      const rec = recIdx[`${dateStr}:${empName}`];
      const h = rosterStartH(rec?.rosterTime || null);
      return h !== null && h >= h0 && h <= h1 ? acc + 1 : acc;
    }, 0);
  }

  function totalRosterDays(empName: string): number {
    return days.reduce((acc, { dateStr }) => {
      const rec = recIdx[`${dateStr}:${empName}`];
      return rec?.rosterTime && rec.rosterTime.toUpperCase() !== "OFF" ? acc + 1 : acc;
    }, 0);
  }

  const handleDownloadCSV = () => {
    const token = localStorage.getItem("bk_token") || "";
    const url = `/api/attendance/export-csv?token=${encodeURIComponent(token)}&year=${year}&month=${month}&storeId=${encodeURIComponent(storeId)}`;
    const a = document.createElement("a");
    a.href = url;
    a.download = `Clock_In_Out_${MONTH_EN[month - 1]}_${year}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCSVFile = async (file: File) => {
    if (!file.name.match(/\.csv$/i)) {
      toast({ variant: "destructive", title: "Error", description: t("Please select a CSV file (.csv)", "กรุณาเลือกไฟล์ CSV (.csv)") });
      return;
    }
    setImportFileName(file.name);
    setImportLoading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("token", localStorage.getItem("bk_token") || "");
    fd.append("confirm", "false");
    try {
      const res = await fetch("/api/attendance/import-csv", { method: "POST", body: fd });
      const data = await res.json();
      if (data.ok) {
        setImportPreview(data.sample || []);
        setImportCount(data.count || 0);
        setImportStep("preview");
        toast({ title: t("File parsed", "อ่านไฟล์สำเร็จ"), description: `${data.count} ${t("records found", "รายการ")}` });
      } else {
        toast({ variant: "destructive", title: "Error", description: data.message });
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally { setImportLoading(false); }
  };

  const handleConfirmCSVImport = async () => {
    if (!csvFileRef.current?.files?.[0]) return;
    setImportLoading(true);
    const fd = new FormData();
    fd.append("file", csvFileRef.current.files[0]);
    fd.append("token", localStorage.getItem("bk_token") || "");
    fd.append("confirm", "true");
    try {
      const res = await fetch("/api/attendance/import-csv", { method: "POST", body: fd });
      const data = await res.json();
      if (data.ok) {
        setImportResult({ imported: data.imported, updated: data.updated });
        setImportStep("done");
        qc.invalidateQueries({ queryKey: ["/api/attendance/records"] });
        toast({ title: t("Import complete!", "Import สำเร็จ!"), description: data.message });
      } else {
        toast({ variant: "destructive", title: "Error", description: data.message });
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally { setImportLoading(false); }
  };

  const resetImport = () => {
    setImportStep("idle");
    setImportPreview([]);
    setImportFileName("");
    setImportResult(null);
    if (csvFileRef.current) csvFileRef.current.value = "";
  };

  const GROUP = 5;
  const tdB = "border border-gray-300 px-1.5 py-0.5 text-center";
  const cellInput = "w-full h-5 px-0.5 text-[11px] bg-transparent border-0 focus:ring-1 focus:ring-blue-400 rounded focus:outline-none text-center";

  return (
    <div className="space-y-4">
      {/* Action buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" className="gap-1.5" onClick={() => setShowAddEmp(true)} data-testid="button-add-employee-csv">
          <UserPlus className="h-3.5 w-3.5" />
          เพิ่มพนักงาน
        </Button>
        <Button onClick={handleDownloadCSV} variant="outline" size="sm" className="gap-1.5" data-testid="button-download-csv">
          <Download className="h-3.5 w-3.5" />
          {t("Download CSV", "ดาวน์โหลด CSV")}
        </Button>
        {importStep === "idle" && (
          <>
            <input
              ref={csvFileRef}
              type="file"
              accept=".csv"
              className="hidden"
              data-testid="input-file-csv"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleCSVFile(f); }}
            />
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => csvFileRef.current?.click()}
              disabled={importLoading}
              data-testid="button-import-csv"
            >
              {importLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              {importLoading ? t("Parsing…", "กำลังอ่าน…") : t("Import CSV", "Import CSV")}
            </Button>
          </>
        )}
        {importStep === "preview" && (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={resetImport}>{t("← Cancel", "← ยกเลิก")}</Button>
            <Button
              size="sm"
              className="gap-1.5"
              onClick={handleConfirmCSVImport}
              disabled={importLoading}
              data-testid="button-confirm-csv-import"
            >
              {importLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              {importLoading ? t("Importing…", "กำลัง Import…") : `${t("Confirm Import", "ยืนยัน Import")} (${importCount})`}
            </Button>
          </div>
        )}
        {importStep === "done" && importResult && (
          <div className="flex items-center gap-2">
            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs px-2 py-0.5">{t("New","ใหม่")}: {importResult.imported}</Badge>
            <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs px-2 py-0.5">{t("Updated","อัพเดต")}: {importResult.updated}</Badge>
            <Button variant="ghost" size="sm" onClick={resetImport}><RefreshCw className="h-3.5 w-3.5 mr-1" />{t("Import Another", "Import อื่น")}</Button>
          </div>
        )}
      </div>

      {/* Preview table (when import step = preview) */}
      {importStep === "preview" && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-500" />
              {importFileName} — {importCount} {t("records detected (showing first 30)", "รายการ (แสดง 30 แรก)")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded border overflow-auto max-h-64">
              <Table>
                <TableHeader className="sticky top-0 bg-background">
                  <TableRow>
                    <TableHead className="text-xs">{t("Date","วันที่")}</TableHead>
                    <TableHead className="text-xs">{t("Employee","พนักงาน")}</TableHead>
                    <TableHead className="text-xs">{t("Roster","Roster")}</TableHead>
                    <TableHead className="text-xs">{t("In","เข้า")}</TableHead>
                    <TableHead className="text-xs">{t("Out","ออก")}</TableHead>
                    <TableHead className="text-xs">{t("Notes","หมายเหตุ")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importPreview.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs font-mono">{r.date}</TableCell>
                      <TableCell className="text-xs font-medium">{r.employeeNickName || r.employeeFullName}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.rosterTime || "—"}</TableCell>
                      <TableCell className="text-xs">{r.clockInTime || "—"}</TableCell>
                      <TableCell className="text-xs">{r.clockOutTime || "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-24 truncate">{r.notes || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Employee Dialog (reuse ExcelRosterView's dialog) */}
      {showAddEmp && (
        <AddEmployeeDialog
          year={year} month={month} storeId={storeId}
          onClose={() => setShowAddEmp(false)}
          onAdded={() => { setShowAddEmp(false); qc.invalidateQueries({ queryKey: ["/api/attendance/records"] }); }}
        />
      )}

      {/* Paper-like sheet view */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : employees.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <FileText className="h-12 w-12 text-muted-foreground/40" />
            <p className="text-muted-foreground text-center text-sm">
              {t("No records yet — add an employee or import data.", "ยังไม่มีข้อมูล — เพิ่มพนักงานหรือ Import CSV ก่อน")}
            </p>
            <Button size="sm" className="gap-1.5" onClick={() => setShowAddEmp(true)} data-testid="button-add-employee-csv-empty">
              <UserPlus className="h-3.5 w-3.5" />
              เพิ่มพนักงาน
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border overflow-auto" style={{ maxHeight: "72vh" }}>
          {/* Render groups of 5 employees */}
          {Array.from({ length: Math.ceil(employees.length / GROUP) }, (_, gi) => {
            const grpEmps = employees.slice(gi * GROUP, (gi + 1) * GROUP);
            return (
              <div key={gi}>
                {gi > 0 && <div className="h-6 bg-muted/30 border-t border-b" />}
                <div className="flex min-w-max">
                  {grpEmps.map((emp, idx) => {
                    const c = EMP_COLORS_CSV[idx % EMP_COLORS_CSV.length];
                    const total = totalRosterDays(emp.fullName);
                    return (
                      <div key={emp.fullName} className="border-r last:border-r-0 shrink-0" style={{ width: 420 }} data-testid={`block-csv-${gi}-${idx}`}>
                        <table className="w-full border-collapse" style={{ fontSize: 11 }}>
                          <tbody>
                            {/* Row 1: ชื่อ / fullName / ชื่อเล่น / nickName */}
                            <tr style={{ backgroundColor: c.header }}>
                              <td className={`${tdB} font-medium whitespace-nowrap`} style={{ color: c.accent }}>ชื่อ</td>
                              <td className={`${tdB} font-bold`} style={{ color: c.accent }} colSpan={2}>{emp.fullName}</td>
                              <td className={`${tdB} font-medium whitespace-nowrap`} style={{ color: c.accent }}>ชื่อเล่น</td>
                              <td className={`${tdB} font-bold`} style={{ color: c.accent }} colSpan={2}>{emp.nickName || "—"}</td>
                            </tr>
                            {/* Row 2: สาขา / Month */}
                            <tr style={{ backgroundColor: c.header }}>
                              <td className={`${tdB} font-medium whitespace-nowrap`} style={{ color: c.accent }}>สาขา</td>
                              <td className={`${tdB}`} style={{ color: c.accent }} colSpan={2}>{storeName}</td>
                              <td className={`${tdB} font-medium whitespace-nowrap`} style={{ color: c.accent }}>Month of</td>
                              <td className={`${tdB}`} style={{ color: c.accent }} colSpan={2}>{MONTH_SHORT[month - 1]}</td>
                            </tr>
                            {/* Row 3: ตำแหน่ง */}
                            <tr style={{ backgroundColor: c.header }}>
                              <td className={`${tdB} font-medium whitespace-nowrap`} style={{ color: c.accent }}>ตำแหน่ง</td>
                              <td className={`${tdB}`} style={{ color: c.accent }} colSpan={5}>{emp.position || "—"}</td>
                            </tr>
                            {/* Column headers */}
                            <tr style={{ backgroundColor: c.colHead }}>
                              <th className={`${tdB} font-semibold`} style={{ color: c.accent }}>วัน</th>
                              <th className={`${tdB} font-semibold`} style={{ color: c.accent }}>วันที่</th>
                              <th className={`${tdB} font-semibold leading-tight`} style={{ color: c.accent }}>Roster</th>
                              <th className={`${tdB} font-semibold leading-tight`} style={{ color: c.accent }}>Clock-In</th>
                              <th className={`${tdB} font-semibold leading-tight`} style={{ color: c.accent }}>Clock-Out</th>
                              <th className={`${tdB} font-semibold`} style={{ color: c.accent }}>Notes</th>
                            </tr>
                            {/* Daily editable rows */}
                            {days.map(({ dateStr, d, dowIdx }) => {
                              const rec = recIdx[`${dateStr}:${emp.fullName}`];
                              const k = `${dateStr}:${emp.fullName}`;
                              const isSaving = savingRows.has(k);
                              const isWknd = dowIdx === 0 || dowIdx === 6;

                              const rosterVal = getEdit(dateStr, emp.fullName, "rosterTime") ?? rec?.rosterTime ?? "";
                              const inVal     = getEdit(dateStr, emp.fullName, "clockInTime") ?? (rec?.clockInTime ? formatTime(rec.clockInTime) : "");
                              const outVal    = getEdit(dateStr, emp.fullName, "clockOutTime") ?? (rec?.clockOutTime ? formatTime(rec.clockOutTime) : "");
                              const notesVal  = getEdit(dateStr, emp.fullName, "notes") ?? rec?.notes ?? "";

                              const status = getLateStatus(rosterVal || null, inVal || null);
                              const inColor = status === "late" ? "#CC0000" : status === "early" ? "#1F3864" : status === "on-time" ? "#375623" : undefined;

                              const errR = fieldErrors[`${k}:rosterTime`];
                              const errI = fieldErrors[`${k}:clockInTime`];
                              const errO = fieldErrors[`${k}:clockOutTime`];

                              return (
                                <tr key={dateStr} style={{ backgroundColor: isWknd ? "#FFF2CC" : undefined }}>
                                  <td className={tdB} style={{ color: isWknd ? "#833C00" : undefined, fontWeight: isWknd ? 600 : undefined }}>
                                    {DOW_TH[dowIdx]}
                                  </td>
                                  <td className={tdB}>{d}</td>
                                  {/* Roster */}
                                  <td className={`${tdB} p-0`}>
                                    <input
                                      className={cellInput}
                                      style={{ color: rosterVal?.toUpperCase() === "OFF" ? "#CC0000" : undefined }}
                                      value={rosterVal}
                                      onChange={e => setEditCell(dateStr, emp.fullName, "rosterTime", e.target.value)}
                                      onBlur={() => saveRow(dateStr, emp)}
                                      onKeyDown={e => { if (e.key === "Escape") { e.preventDefault(); revertField(dateStr, emp.fullName, "rosterTime"); (e.target as HTMLInputElement).blur(); } else if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLInputElement).blur(); } }}
                                      disabled={isSaving}
                                      data-testid={`cell-cvroster-${idx}-${d}`}
                                    />
                                    {errR && <div className="text-[9px] text-red-500 leading-tight px-0.5">{errR}</div>}
                                  </td>
                                  {/* Clock-In */}
                                  <td className={`${tdB} p-0`}>
                                    {isSaving ? (
                                      <div className="flex items-center justify-center h-5"><Loader2 className="h-3 w-3 animate-spin text-muted-foreground" /></div>
                                    ) : (
                                      <input
                                        className={cellInput}
                                        style={{ color: inColor }}
                                        value={inVal}
                                        onChange={e => setEditCell(dateStr, emp.fullName, "clockInTime", e.target.value)}
                                        onBlur={() => saveRow(dateStr, emp)}
                                        onKeyDown={e => { if (e.key === "Escape") { e.preventDefault(); revertField(dateStr, emp.fullName, "clockInTime"); (e.target as HTMLInputElement).blur(); } else if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLInputElement).blur(); } }}
                                        data-testid={`cell-cvin-${idx}-${d}`}
                                      />
                                    )}
                                    {errI && <div className="text-[9px] text-red-500 leading-tight px-0.5">{errI}</div>}
                                  </td>
                                  {/* Clock-Out */}
                                  <td className={`${tdB} p-0`}>
                                    {isSaving ? (
                                      <div className="flex items-center justify-center h-5"><Loader2 className="h-3 w-3 animate-spin text-muted-foreground" /></div>
                                    ) : (
                                      <input
                                        className={cellInput}
                                        value={outVal}
                                        onChange={e => setEditCell(dateStr, emp.fullName, "clockOutTime", e.target.value)}
                                        onBlur={() => saveRow(dateStr, emp)}
                                        onKeyDown={e => { if (e.key === "Escape") { e.preventDefault(); revertField(dateStr, emp.fullName, "clockOutTime"); (e.target as HTMLInputElement).blur(); } else if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLInputElement).blur(); } }}
                                        data-testid={`cell-cvout-${idx}-${d}`}
                                      />
                                    )}
                                    {errO && <div className="text-[9px] text-red-500 leading-tight px-0.5">{errO}</div>}
                                  </td>
                                  {/* Notes */}
                                  <td className={`${tdB} p-0`}>
                                    {isSaving ? (
                                      <div className="flex items-center justify-center h-5"><Loader2 className="h-3 w-3 animate-spin text-muted-foreground" /></div>
                                    ) : (
                                      <input
                                        className={`${cellInput} text-left`}
                                        value={notesVal}
                                        onChange={e => setEditCell(dateStr, emp.fullName, "notes", e.target.value)}
                                        onBlur={() => saveRow(dateStr, emp)}
                                        onKeyDown={e => { if (e.key === "Escape") { e.preventDefault(); revertField(dateStr, emp.fullName, "notes"); (e.target as HTMLInputElement).blur(); } else if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLInputElement).blur(); } }}
                                        data-testid={`cell-cvnotes-${idx}-${d}`}
                                      />
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                            {/* Spacer */}
                            <tr><td colSpan={6} style={{ height: 6 }} /></tr>
                            {/* Shift summary header */}
                            <tr style={{ backgroundColor: c.colHead }}>
                              <th className={`${tdB} font-semibold`} style={{ color: c.accent }}>Shift</th>
                              <th className={`${tdB} font-semibold`} style={{ color: c.accent }}>Time</th>
                              <th className={`${tdB} font-semibold`} style={{ color: c.accent }}>Time Roster</th>
                              <th className={`${tdB} font-semibold`} style={{ color: c.accent }}>Total</th>
                              <th className={tdB} colSpan={2} />
                            </tr>
                            {CSV_SHIFTS_FE.map(sh => {
                              const cnt = shiftCount(emp.fullName, sh.h0, sh.h1);
                              return (
                                <tr key={sh.label}>
                                  <td className={tdB} style={{ textAlign: "left", paddingLeft: 4 }}>{sh.label}</td>
                                  <td className={tdB}>{sh.h0}:00</td>
                                  <td className={tdB}>{cnt > 0 ? cnt : ""}</td>
                                  <td className={tdB} />
                                  <td className={tdB} colSpan={2} />
                                </tr>
                              );
                            })}
                            {/* Total row */}
                            <tr style={{ backgroundColor: c.colHead, fontWeight: 600 }}>
                              <td className={tdB} style={{ color: c.accent }}>Total</td>
                              <td className={tdB} style={{ color: c.accent }}>Total</td>
                              <td className={tdB} style={{ color: c.accent }}>{total > 0 ? total : ""}</td>
                              <td className={tdB} style={{ color: c.accent }}>{total > 0 ? total : ""}</td>
                              <td className={tdB} colSpan={2} />
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────
export default function AttendancePage() {
  const { user } = useAuth();
  const { language } = useI18n();
  const t = (en: string, th: string) => language === "th" ? th : en;

  const now = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const storeId = (user as any)?.storeId || "BK1040";

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const handleDownloadExcel = () => {
    const token = localStorage.getItem("bk_token") || "";
    const url = `/api/attendance/export-excel?token=${encodeURIComponent(token)}&year=${year}&month=${month}&storeId=${encodeURIComponent(storeId)}`;
    const a = document.createElement("a");
    a.href = url;
    a.download = `Clock_In_Out_${MONTH_EN[month - 1]}_${year}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <>
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-6xl px-4 py-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-attendance-title">
              <Clock className="h-6 w-6 text-primary" />
              {t("Attendance / Clock In-Out","บันทึกเวลาทำงาน")}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t("Track and manage employee clock-in/out records from Aloha POS","บันทึกและจัดการเวลาเข้า-ออกงานจาก Aloha POS")}
            </p>
          </div>
        </div>

        {/* Month selector */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevMonth} data-testid="button-prev-month" className="h-9 w-9">‹</Button>
          <div className="flex items-center gap-2">
            <Select value={String(month)} onValueChange={v => setMonth(parseInt(v))}>
              <SelectTrigger className="h-9 w-40" data-testid="select-month">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTH_TH.map((m, i) => (
                  <SelectItem key={i+1} value={String(i+1)}>
                    {language === "th" ? m : MONTH_EN[i]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(year)} onValueChange={v => setYear(parseInt(v))}>
              <SelectTrigger className="h-9 w-24" data-testid="select-year">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" size="icon" onClick={nextMonth} data-testid="button-next-month" className="h-9 w-9">›</Button>
          <Button variant="outline" size="sm" onClick={handleDownloadExcel} data-testid="button-download-excel" className="gap-1.5 h-9 ml-2">
            <Download className="h-3.5 w-3.5" />
            {t("Export Excel","ดาวน์โหลด Excel")}
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="records" className="space-y-4">
          <TabsList className="grid grid-cols-6 w-full max-w-4xl">
            <TabsTrigger value="records" data-testid="tab-records" className="gap-1 text-xs">
              <Clock className="h-3.5 w-3.5" />{t("Records","บันทึก")}
            </TabsTrigger>
            <TabsTrigger value="roster" data-testid="tab-roster" className="gap-1 text-xs">
              <FileSpreadsheet className="h-3.5 w-3.5" />{t("Roster Sheet","ตารางงาน")}
            </TabsTrigger>
            <TabsTrigger value="matrix" data-testid="tab-matrix" className="gap-1 text-xs">
              <LayoutGrid className="h-3.5 w-3.5" />{t("Matrix","ตารางเปรียบ")}
            </TabsTrigger>
            <TabsTrigger value="excel-sheet" data-testid="tab-excel-sheet" className="gap-1 text-xs">
              <FileSpreadsheet className="h-3.5 w-3.5" />{t("Excel Sheet","Excel Sheet")}
            </TabsTrigger>
            <TabsTrigger value="csv-sheet" data-testid="tab-csv-sheet" className="gap-1 text-xs">
              <FileText className="h-3.5 w-3.5" />{t("CSV Sheet","Clock In Out")}
            </TabsTrigger>
            <TabsTrigger value="import" data-testid="tab-import" className="gap-1 text-xs">
              <Upload className="h-3.5 w-3.5" />{t("Import","Import Excel")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="records">
            <MonthlyView year={year} month={month} storeId={storeId} />
          </TabsContent>

          <TabsContent value="roster">
            <div className="flex justify-end mb-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  document.body.classList.add("printing-roster");
                  window.print();
                  window.addEventListener("afterprint", () => {
                    document.body.classList.remove("printing-roster");
                  }, { once: true });
                }}
                data-testid="button-print-roster"
                className="gap-1.5 h-9"
              >
                <Printer className="h-3.5 w-3.5" />
                {t("Print","พิมพ์")}
              </Button>
            </div>
            <div id="roster-print-area">
              <ExcelRosterView year={year} month={month} storeId={storeId} />
            </div>
          </TabsContent>

          <TabsContent value="matrix">
            <MatrixView year={year} month={month} storeId={storeId} />
          </TabsContent>

          <TabsContent value="excel-sheet">
            <ExcelSheetTab year={year} month={month} storeId={storeId} />
          </TabsContent>

          <TabsContent value="csv-sheet">
            <ClockInOutCSVTab year={year} month={month} storeId={storeId} />
          </TabsContent>

          <TabsContent value="import">
            <ImportExcelTab year={year} month={month} storeId={storeId} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
    <PageTutorial pageKey="attendance" steps={ATTENDANCE_TUTORIAL} />
    </>
  );
}
