import { useState, useRef, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/hooks/use-i18n";
import { queryClient as qc } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Clock, Upload, FileSpreadsheet, CheckCircle2, Loader2, RefreshCw, Info } from "lucide-react";
import { ClockRecord } from "./types";
import { getLateStatus, formatTime } from "./utils";

export function ImportExcelTab({ year, month, storeId }: { year: number; month: number; storeId: string }) {
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
        setPreview(data.sample || []); setPreviewCount(data.count || 0); setStep("preview");
        toast({ title: t("File parsed", "อ่านไฟล์สำเร็จ"), description: `${data.count} ${t("records found", "รายการ")}` });
      } else { toast({ variant: "destructive", title: "Error", description: data.message }); }
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
      } else { toast({ variant: "destructive", title: "Error", description: data.message }); }
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
                        <TableCell className="text-xs"><span className="font-medium">{r.employeeNickName || r.employeeFullName}</span></TableCell>
                        <TableCell className="text-xs text-muted-foreground">{r.position || "—"}</TableCell>
                        <TableCell className="text-xs">{r.rosterTime || "—"}</TableCell>
                        <TableCell className="text-xs">
                          {r.clockInTime ? (
                            <span className={status === "late" ? "text-red-500 font-medium" : status === "early" ? "text-blue-500" : "text-green-600"}>{formatTime(r.clockInTime)}</span>
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
