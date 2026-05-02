import { useState, useRef, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/hooks/use-i18n";
import { apiRequest } from "@/lib/queryClient";
import {
  Upload, FileSpreadsheet, Users, CheckCircle2, Loader2,
  Database, FileCheck, TrendingUp, AlertTriangle, Info, RefreshCw
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SalesLayout } from "./sales-layout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";

// ─────────────────────────────────────────────────────────
// Section A: Employee DBF Import (existing)
// ─────────────────────────────────────────────────────────
interface DBFField { name: string; type: string; size: number; }
interface ParsedDBFData {
  fields: DBFField[];
  recordCount: number;
  records: Record<string, any>[];
}
interface EmployeeMapping {
  username: string; fullName: string; nickName: string; phone: string; email: string;
}

function EmployeeDBFTab() {
  const { toast } = useToast();
  const { language } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = (en: string, th: string) => language === "th" ? th : en;
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedDBFData | null>(null);
  const [fileName, setFileName] = useState("");
  const [selectedRecords, setSelectedRecords] = useState<Set<number>>(new Set());
  const [fieldMapping, setFieldMapping] = useState<EmployeeMapping>({
    username: "", fullName: "", nickName: "", phone: "", email: ""
  });
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; errors?: string[] } | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".dbf")) {
      toast({ variant: "destructive", title: "Error", description: t("Please select a .dbf file", "กรุณาเลือกไฟล์ .dbf") });
      return;
    }
    setFileName(file.name); setIsLoading(true); setParsedData(null);
    setSelectedRecords(new Set()); setImportResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("token", localStorage.getItem("bk_token") || "");
      const res = await fetch("/api/import/parse-dbf", { method: "POST", body: formData });
      const data = await res.json();
      if (data.ok) {
        setParsedData(data);
        setSelectedRecords(new Set<number>(data.records.map((_: any, i: number) => i)));
        const originalFields = data.fields.map((f: DBFField) => f.name);
        const findFieldMatch = (patterns: string[]) =>
          originalFields.find((f: string) => patterns.some(p => f.toLowerCase().includes(p))) || "";
        setFieldMapping({
          username: findFieldMatch(["id", "code", "emp"]),
          fullName: findFieldMatch(["name", "fname"]),
          nickName: findFieldMatch(["nick", "alias"]),
          phone: findFieldMatch(["phone", "tel", "mobile"]),
          email: findFieldMatch(["email", "mail"]),
        });
        toast({ title: t("File parsed", "อ่านไฟล์สำเร็จ"), description: `${data.recordCount} ${t("records found", "รายการ")}` });
      } else { toast({ variant: "destructive", title: "Error", description: data.message }); }
    } catch (err: any) { toast({ variant: "destructive", title: "Error", description: err.message }); }
    finally { setIsLoading(false); }
  };

  const toggleRecord = (i: number) => { const s = new Set(selectedRecords); s.has(i) ? s.delete(i) : s.add(i); setSelectedRecords(s); };
  const toggleAll = () => setSelectedRecords(selectedRecords.size === parsedData?.records.length ? new Set() : new Set(parsedData?.records.map((_, i) => i)));

  const handleImport = async () => {
    if (!parsedData || selectedRecords.size === 0) return;
    const mappedEmployees = Array.from(selectedRecords).map(i => {
      const r = parsedData.records[i];
      return { username: fieldMapping.username ? String(r[fieldMapping.username] || "").trim() : "",
        fullName: fieldMapping.fullName ? String(r[fieldMapping.fullName] || "").trim() : "",
        nickName: fieldMapping.nickName ? String(r[fieldMapping.nickName] || "").trim() : "",
        phone: fieldMapping.phone ? String(r[fieldMapping.phone] || "").trim() : "",
        email: fieldMapping.email ? String(r[fieldMapping.email] || "").trim() : "" };
    }).filter(e => e.username);
    if (mappedEmployees.length === 0) { toast({ variant: "destructive", title: "Error", description: t("No valid employees", "ไม่มีพนักงานที่ถูกต้อง") }); return; }
    setIsImporting(true);
    try {
      const res = await apiRequest("POST", "/api/import/employees-from-dbf", { token: localStorage.getItem("bk_token"), employees: mappedEmployees });
      const data = await res.json();
      if (data.ok) { setImportResult(data); toast({ title: t("Import completed", "Import สำเร็จ"), description: data.message }); }
      else { toast({ variant: "destructive", title: "Error", description: data.message }); }
    } catch (err: any) { toast({ variant: "destructive", title: "Error", description: err.message }); }
    finally { setIsImporting(false); }
  };

  const resetForm = () => { setParsedData(null); setFileName(""); setSelectedRecords(new Set()); setImportResult(null); if (fileInputRef.current) fileInputRef.current.value = ""; };

  return (
    <div className="space-y-4">
      {importResult && (
        <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <CheckCircle2 className="h-8 w-8 text-green-600 shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-green-800 dark:text-green-200">{t("Import Completed", "Import เสร็จสิ้น")}</h3>
                <div className="flex gap-4 mt-2">
                  <Badge variant="outline" className="bg-green-100 dark:bg-green-900">{t("Imported", "Import แล้ว")}: {importResult.imported}</Badge>
                  <Badge variant="outline" className="bg-yellow-100 dark:bg-yellow-900">{t("Skipped", "ข้าม")}: {importResult.skipped}</Badge>
                </div>
                <Button variant="outline" className="mt-4" onClick={resetForm} data-testid="button-import-more">{t("Import More", "Import เพิ่มเติม")}</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!parsedData && !importResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5" />{t("Upload Employee DBF", "อัพโหลดไฟล์พนักงาน DBF")}</CardTitle>
            <CardDescription>{t("Select _Emp.DBF or similar file from Aloha POS BOH", "เลือกไฟล์ _Emp.DBF จาก Aloha POS BOH server")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <input ref={fileInputRef} type="file" accept=".dbf" onChange={handleFileSelect} className="hidden" data-testid="input-file-dbf" />
              <div className="flex flex-col items-center gap-4">
                {isLoading ? (<><Loader2 className="h-12 w-12 animate-spin text-primary" /><p className="text-muted-foreground">{t("Parsing file...", "กำลังอ่านไฟล์...")}</p></>) : (
                  <>
                    <Upload className="h-12 w-12 text-muted-foreground" />
                    <div><p className="font-medium">{t("Drop .dbf file here or click to browse", "ลากไฟล์ .dbf มาวางหรือคลิกเพื่อเลือก")}</p>
                      <p className="text-sm text-muted-foreground mt-1">{t("Supports: _Emp.DBF, etc.", "รองรับ: _Emp.DBF ฯลฯ")}</p></div>
                    <Button onClick={() => fileInputRef.current?.click()} data-testid="button-select-file"><Upload className="h-4 w-4 mr-2" />{t("Select File", "เลือกไฟล์")}</Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {parsedData && !importResult && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><FileCheck className="h-5 w-5" />{t("File Loaded", "โหลดไฟล์สำเร็จ")}: {fileName}</CardTitle>
              <CardDescription>{parsedData.recordCount} {t("records", "รายการ")} | {parsedData.fields.length} {t("fields", "คอลัมน์")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {(["username", "fullName", "nickName", "phone", "email"] as const).map(key => (
                  <div key={key}>
                    <Label>{key === "username" ? `${t("Username", "Username")} *` : t(key.charAt(0).toUpperCase() + key.slice(1), key)}</Label>
                    <Select value={fieldMapping[key] || "_none_"} onValueChange={v => setFieldMapping({ ...fieldMapping, [key]: v === "_none_" ? "" : v })}>
                      <SelectTrigger data-testid={`select-${key}-field`}><SelectValue placeholder={t("Select field", "เลือกคอลัมน์")} /></SelectTrigger>
                      <SelectContent>
                        {key !== "username" && <SelectItem value="_none_">({t("None", "ไม่เลือก")})</SelectItem>}
                        {parsedData.fields.map(f => <SelectItem key={f.name} value={f.name}>{f.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" />{t("Preview", "ตัวอย่าง")}</CardTitle>
                  <CardDescription>{selectedRecords.size} / {parsedData.records.length} {t("selected", "รายการ")}</CardDescription></div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={resetForm} data-testid="button-cancel">{t("Cancel", "ยกเลิก")}</Button>
                  <Button onClick={handleImport} disabled={selectedRecords.size === 0 || !fieldMapping.username || isImporting} data-testid="button-import">
                    {isImporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Users className="h-4 w-4 mr-2" />}
                    {t("Import", "Import")} ({selectedRecords.size})
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-auto max-h-80">
                <Table>
                  <TableHeader className="sticky top-0 bg-background">
                    <TableRow>
                      <TableHead className="w-12"><Checkbox checked={selectedRecords.size === parsedData.records.length} onCheckedChange={toggleAll} data-testid="checkbox-select-all" /></TableHead>
                      {parsedData.fields.slice(0, 6).map(f => <TableHead key={f.name}>{f.name}{fieldMapping.username === f.name && <Badge className="ml-1" variant="secondary">ID</Badge>}</TableHead>)}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.records.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell><Checkbox checked={selectedRecords.has(i)} onCheckedChange={() => toggleRecord(i)} data-testid={`checkbox-row-${i}`} /></TableCell>
                        {parsedData.fields.slice(0, 6).map(f => <TableCell key={f.name} className="max-w-32 truncate">{String(r[f.name] || "")}</TableCell>)}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Section B: Aloha Sales CSV Import (NEW)
// ─────────────────────────────────────────────────────────

interface DetectedCols {
  dateCol: string; salesCol: string; txCountCol: string;
  colPctCol: string; refundCol: string; grossCol: string;
}
interface ParsedCSVResult {
  headers: string[];
  rowCount: number;
  detected: DetectedCols;
  preview: Array<{ raw: Record<string, string>; mapped: Record<string, string> }>;
}
interface MappedRow {
  reportDate: string; actualSales: string; transactionCount: string;
  colPercent: string; refundAmount: string;
}

const COL_LABELS: Record<keyof DetectedCols, { en: string; th: string }> = {
  dateCol:    { en: "Date Column",           th: "คอลัมน์วันที่" },
  salesCol:   { en: "Net Sales Column",      th: "คอลัมน์ยอดขาย (Net Sales)" },
  txCountCol: { en: "Transaction Count",     th: "คอลัมน์จำนวน Checks" },
  colPctCol:  { en: "Labor % (COL%)",        th: "คอลัมน์ COL% / Labor %" },
  refundCol:  { en: "Comps / Voids",         th: "คอลัมน์ Comps / Voids" },
  grossCol:   { en: "Gross Sales (optional)", th: "Gross Sales (ไม่บังคับ)" },
};

function SalesCSVTab() {
  const { toast } = useToast();
  const { language } = useI18n();
  const t = (en: string, th: string) => language === "th" ? th : en;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<"upload" | "preview" | "done">("upload");
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [fileName, setFileName] = useState("");
  const [parsed, setParsed] = useState<ParsedCSVResult | null>(null);
  const [colMap, setColMap] = useState<DetectedCols>({ dateCol: "", salesCol: "", txCountCol: "", colPctCol: "", refundCol: "", grossCol: "" });
  const [importResult, setImportResult] = useState<{ imported: number; updated: number; skipped: number; errors?: string[]; message: string } | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast({ variant: "destructive", title: "Error", description: t("Please select a .csv file", "กรุณาเลือกไฟล์ .csv") });
      return;
    }
    setFileName(file.name); setIsLoading(true); setParsed(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("token", localStorage.getItem("bk_token") || "");
      const res = await fetch("/api/sales/parse-aloha-csv", { method: "POST", body: formData });
      const data = await res.json();
      if (data.ok) {
        setParsed(data);
        setColMap(data.detected);
        setStep("preview");
        toast({ title: t("File parsed", "อ่านไฟล์สำเร็จ"), description: `${data.rowCount} ${t("rows found", "แถว")}` });
      } else {
        toast({ variant: "destructive", title: "Error", description: data.message });
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally {
      setIsLoading(false);
    }
  }, [toast, language]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (f) handleFile(f);
  };

  const buildMappedRows = useCallback((): MappedRow[] => {
    if (!parsed) return [];
    return parsed.preview.map(p => {
      const raw = p.raw;
      const parseDate = (s: string) => {
        const mdy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (mdy) return `${mdy[3]}-${mdy[1].padStart(2,"0")}-${mdy[2].padStart(2,"0")}`;
        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
        return s;
      };
      return {
        reportDate:       colMap.dateCol    ? parseDate(raw[colMap.dateCol] || "")             : "",
        actualSales:      colMap.salesCol   ? (raw[colMap.salesCol] || "").replace(/[,$]/g,"")  : "",
        transactionCount: colMap.txCountCol ? (raw[colMap.txCountCol] || "").replace(/,/g,"")  : "",
        colPercent:       colMap.colPctCol  ? (raw[colMap.colPctCol] || "").replace(/%/g,"")   : "",
        refundAmount:     colMap.refundCol  ? (raw[colMap.refundCol] || "").replace(/[,$]/g,"") : "",
      };
    });
  }, [parsed, colMap]);

  const mappedRows = buildMappedRows();

  const handleImport = async () => {
    setIsImporting(true);
    try {
      const res = await fetch("/api/sales/import-aloha-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: localStorage.getItem("bk_token"), mappedRows }),
      });
      const data = await res.json();
      if (data.ok) { setImportResult(data); setStep("done"); toast({ title: t("Import complete!", "Import สำเร็จ!"), description: data.message }); }
      else { toast({ variant: "destructive", title: "Error", description: data.message }); }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally { setIsImporting(false); }
  };

  const reset = () => { setStep("upload"); setParsed(null); setFileName(""); setImportResult(null); if (fileInputRef.current) fileInputRef.current.value = ""; };

  if (step === "done" && importResult) {
    return (
      <Card className="border-green-200 bg-green-50 dark:bg-green-950/20" data-testid="card-import-result">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <CheckCircle2 className="h-10 w-10 text-green-600 shrink-0" />
            <div className="flex-1 space-y-3">
              <h3 className="text-lg font-semibold text-green-800 dark:text-green-200">{t("Import Completed!", "Import เสร็จสิ้น!")}</h3>
              <div className="flex flex-wrap gap-3">
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-sm px-3 py-1">
                  {t("New", "ใหม่")}: {importResult.imported}
                </Badge>
                <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-sm px-3 py-1">
                  {t("Updated", "อัพเดต")}: {importResult.updated}
                </Badge>
                <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 text-sm px-3 py-1">
                  {t("Skipped", "ข้าม")}: {importResult.skipped}
                </Badge>
              </div>
              {importResult.errors && importResult.errors.length > 0 && (
                <div className="text-sm text-red-600 space-y-1">
                  {importResult.errors.map((e, i) => <div key={i}>⚠ {e}</div>)}
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <Button onClick={reset} data-testid="button-import-more">
                  <RefreshCw className="w-4 h-4 mr-2" />{t("Import Another File", "Import ไฟล์อื่น")}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === "upload") {
    return (
      <div className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-sm space-y-1">
            <p className="font-medium">{t("How to export from Aloha Essentials:", "วิธี export จาก Aloha Essentials:")}</p>
            <ol className="list-decimal list-inside space-y-0.5 text-muted-foreground">
              <li>{t("Open Aloha BOH → Reports → Aloha Point-of-Sale → Sales", "เปิด Aloha BOH → Reports → Aloha Point-of-Sale → Sales")}</li>
              <li>{t("Select date range → Generate Report", "เลือกช่วงวันที่ → Generate Report")}</li>
              <li>{t("Click Export → Save as CSV", 'คลิก Export → Save as CSV (.csv)')}</li>
              <li>{t("Upload the CSV file here", "อัพโหลดไฟล์ CSV ที่นี่")}</li>
            </ol>
            <p className="text-xs mt-1 text-muted-foreground">{t("Columns auto-detected: Date, Net Sales, Checks, Labor%, Comps", "ระบบ detect คอลัมน์อัตโนมัติ: Date, Net Sales, Checks, Labor%, Comps")}</p>
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              {t("Upload Aloha Sales Report CSV", "อัพโหลด Aloha Sales Report CSV")}
            </CardTitle>
            <CardDescription>
              {t("Daily Sales Report exported from Aloha BOH back office", "รายงานยอดขายรายวันจาก Aloha BOH back office")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors ${isDragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25"}`}
              onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={e => { e.preventDefault(); setIsDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
              data-testid="dropzone-csv"
            >
              <input ref={fileInputRef} type="file" accept=".csv,.txt" onChange={handleFileInput} className="hidden" data-testid="input-file-csv" />
              {isLoading ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <p className="text-muted-foreground">{t("Parsing CSV and detecting columns...", "กำลังอ่าน CSV และ detect คอลัมน์...")}</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <FileSpreadsheet className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-lg">{t("Drop CSV file here", "ลาก CSV มาวางที่นี่")}</p>
                    <p className="text-sm text-muted-foreground mt-1">{t("or click to browse", "หรือคลิกเพื่อเลือกไฟล์")} (.csv)</p>
                  </div>
                  <Button size="lg" onClick={() => fileInputRef.current?.click()} data-testid="button-select-csv">
                    <Upload className="h-4 w-4 mr-2" />{t("Select CSV File", "เลือกไฟล์ CSV")}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step: preview
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileCheck className="h-5 w-5 text-green-500" />{fileName}
              </CardTitle>
              <CardDescription>{parsed?.rowCount} {t("rows detected", "แถว")} — {t("check column mapping below", "ตรวจสอบการ map คอลัมน์ด้านล่าง")}</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={reset} data-testid="button-back">{t("← New File", "← เปลี่ยนไฟล์")}</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {(Object.keys(COL_LABELS) as (keyof DetectedCols)[]).map(key => (
              <div key={key}>
                <Label className="text-xs text-muted-foreground">
                  {language === "th" ? COL_LABELS[key].th : COL_LABELS[key].en}
                  {["dateCol","salesCol","txCountCol"].includes(key) && <span className="text-red-500 ml-1">*</span>}
                </Label>
                <Select value={colMap[key] || "_none_"} onValueChange={v => setColMap({ ...colMap, [key]: v === "_none_" ? "" : v })}>
                  <SelectTrigger className="h-8 text-xs mt-1" data-testid={`select-col-${key}`}>
                    <SelectValue placeholder={t("Not mapped", "ยังไม่ map")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none_">{t("(none)", "(ไม่เลือก)")}</SelectItem>
                    {parsed?.headers.map(h => (
                      <SelectItem key={h} value={h}>{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {colMap[key] && (
                  <p className="text-xs text-emerald-600 mt-0.5">✓ {t("mapped to", "map จาก")} "{colMap[key]}"</p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Preview table */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">{t("Preview (first 20 rows)", "ตัวอย่าง 20 แถวแรก")}</CardTitle>
            <Button
              onClick={handleImport}
              disabled={isImporting || !colMap.dateCol || !colMap.salesCol}
              data-testid="button-confirm-import"
              className="gap-2"
            >
              {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4" />}
              {isImporting ? t("Importing...", "กำลัง Import...") : `${t("Import", "Import")} ${parsed?.rowCount || 0} ${t("rows", "แถว")}`}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!colMap.dateCol && (
            <Alert className="mb-3 border-amber-200 bg-amber-50 dark:bg-amber-950/20">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-sm text-amber-700 dark:text-amber-300">
                {t("Please map the Date column before importing", "กรุณาเลือกคอลัมน์วันที่ก่อน Import")}
              </AlertDescription>
            </Alert>
          )}
          <div className="rounded-lg border overflow-auto max-h-72">
            <Table>
              <TableHeader className="sticky top-0 bg-background">
                <TableRow>
                  <TableHead className="text-xs">{t("Date", "วันที่")}</TableHead>
                  <TableHead className="text-xs text-right">{t("Net Sales", "ยอดขาย")}</TableHead>
                  <TableHead className="text-xs text-right">{t("Checks", "Checks")}</TableHead>
                  <TableHead className="text-xs text-right">COL%</TableHead>
                  <TableHead className="text-xs text-right">{t("Comps/Voids", "Comps/Voids")}</TableHead>
                  <TableHead className="text-xs text-center">{t("Status", "สถานะ")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mappedRows.map((row, i) => {
                  const valid = row.reportDate && /^\d{4}-\d{2}-\d{2}$/.test(row.reportDate) && (row.actualSales || row.transactionCount);
                  return (
                    <TableRow key={i} className={!valid ? "opacity-50" : ""} data-testid={`row-preview-${i}`}>
                      <TableCell className="text-xs font-mono">{row.reportDate || "—"}</TableCell>
                      <TableCell className="text-xs text-right">
                        {row.actualSales ? `฿${parseFloat(row.actualSales).toLocaleString()}` : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-right">{row.transactionCount || "—"}</TableCell>
                      <TableCell className="text-xs text-right">
                        {row.colPercent ? <Badge variant={parseFloat(row.colPercent) > 28 ? "destructive" : "secondary"} className="text-xs">{parseFloat(row.colPercent).toFixed(1)}%</Badge> : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-right">
                        {row.refundAmount ? `฿${parseFloat(row.refundAmount).toLocaleString()}` : "—"}
                      </TableCell>
                      <TableCell className="text-center">
                        {valid ? <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">OK</Badge>
                          : <Badge variant="destructive" className="text-xs">{t("Skip", "ข้าม")}</Badge>}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {(parsed?.rowCount ?? 0) > 20 && (
            <p className="text-xs text-muted-foreground mt-2 text-center">
              {t(`Showing first 20 of ${parsed?.rowCount} rows — all rows will be imported`, `แสดง 20 จาก ${parsed?.rowCount} แถว — ทั้งหมดจะถูก import`)}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────
export default function ImportDBFPage() {
  const { language } = useI18n();
  const t = (en: string, th: string) => language === "th" ? th : en;

  return (
    <SalesLayout>
      <div className="max-w-5xl mx-auto space-y-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-import-title">
            <Database className="h-6 w-6" />
            {t("Import from Aloha POS", "Import จาก Aloha POS")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("Import sales data or employee data from Aloha POS exports", "นำเข้าข้อมูลยอดขายหรือพนักงานจาก Aloha POS")}
          </p>
        </div>

        <Tabs defaultValue="sales" className="space-y-4">
          <TabsList className="grid grid-cols-2 w-full max-w-sm">
            <TabsTrigger value="sales" data-testid="tab-import-sales" className="gap-2">
              <TrendingUp className="w-4 h-4" />
              {t("Sales CSV", "ยอดขาย CSV")}
            </TabsTrigger>
            <TabsTrigger value="employee" data-testid="tab-import-employee" className="gap-2">
              <Users className="w-4 h-4" />
              {t("Employee DBF", "พนักงาน DBF")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sales">
            <SalesCSVTab />
          </TabsContent>

          <TabsContent value="employee">
            <EmployeeDBFTab />
          </TabsContent>
        </Tabs>
      </div>
    </SalesLayout>
  );
}
