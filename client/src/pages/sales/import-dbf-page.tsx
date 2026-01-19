import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/hooks/use-i18n";
import { apiRequest } from "@/lib/queryClient";
import { Upload, FileSpreadsheet, Users, CheckCircle2, Loader2, Database, FileCheck } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SalesLayout } from "./sales-layout";

interface DBFField {
  name: string;
  type: string;
  size: number;
}

interface ParsedDBFData {
  fields: DBFField[];
  recordCount: number;
  records: Record<string, any>[];
}

interface EmployeeMapping {
  username: string;
  fullName: string;
  nickName: string;
  phone: string;
  email: string;
}

export default function ImportDBFPage() {
  const { toast } = useToast();
  const { language } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedDBFData | null>(null);
  const [fileName, setFileName] = useState("");
  const [selectedRecords, setSelectedRecords] = useState<Set<number>>(new Set());
  const [fieldMapping, setFieldMapping] = useState<EmployeeMapping>({
    username: "",
    fullName: "",
    nickName: "",
    phone: "",
    email: ""
  });
  const [importResult, setImportResult] = useState<{imported: number; skipped: number; errors?: string[]} | null>(null);

  const t = (en: string, th: string) => language === "th" ? th : en;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".dbf")) {
      toast({ variant: "destructive", title: "Error", description: t("Please select a .dbf file", "กรุณาเลือกไฟล์ .dbf") });
      return;
    }

    setFileName(file.name);
    setIsLoading(true);
    setParsedData(null);
    setSelectedRecords(new Set());
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("token", localStorage.getItem("bk_token") || "");

      const res = await fetch("/api/import/parse-dbf", {
        method: "POST",
        body: formData
      });
      const data = await res.json();

      if (data.ok) {
        setParsedData(data);
        
        const allIndexes = new Set<number>(data.records.map((_: any, i: number) => i));
        setSelectedRecords(allIndexes);
        
        const originalFields = data.fields.map((f: DBFField) => f.name);
        const findFieldMatch = (patterns: string[]) => {
          return originalFields.find((f: string) => 
            patterns.some(p => f.toLowerCase().includes(p))
          ) || "";
        };
        setFieldMapping({
          username: findFieldMatch(["id", "code", "emp"]),
          fullName: findFieldMatch(["name", "fname"]),
          nickName: findFieldMatch(["nick", "alias"]),
          phone: findFieldMatch(["phone", "tel", "mobile"]),
          email: findFieldMatch(["email", "mail"])
        });

        toast({ title: t("File parsed", "อ่านไฟล์สำเร็จ"), description: `${data.recordCount} ${t("records found", "รายการ")}` });
      } else {
        toast({ variant: "destructive", title: "Error", description: data.message });
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleRecord = (index: number) => {
    const newSet = new Set(selectedRecords);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setSelectedRecords(newSet);
  };

  const toggleAll = () => {
    if (selectedRecords.size === parsedData?.records.length) {
      setSelectedRecords(new Set());
    } else {
      setSelectedRecords(new Set(parsedData?.records.map((_, i) => i)));
    }
  };

  const handleImport = async () => {
    if (!parsedData || selectedRecords.size === 0) return;

    const mappedEmployees = Array.from(selectedRecords).map(index => {
      const record = parsedData.records[index];
      return {
        username: fieldMapping.username ? String(record[fieldMapping.username] || "").trim() : "",
        fullName: fieldMapping.fullName ? String(record[fieldMapping.fullName] || "").trim() : "",
        nickName: fieldMapping.nickName ? String(record[fieldMapping.nickName] || "").trim() : "",
        phone: fieldMapping.phone ? String(record[fieldMapping.phone] || "").trim() : "",
        email: fieldMapping.email ? String(record[fieldMapping.email] || "").trim() : ""
      };
    }).filter(emp => emp.username);

    if (mappedEmployees.length === 0) {
      toast({ variant: "destructive", title: "Error", description: t("No valid employees to import. Please check username mapping.", "ไม่มีพนักงานที่ถูกต้องสำหรับ import กรุณาตรวจสอบการเลือก Username") });
      return;
    }

    setIsImporting(true);
    try {
      const res = await apiRequest("POST", "/api/import/employees-from-dbf", {
        token: localStorage.getItem("bk_token"),
        employees: mappedEmployees
      });
      const data = await res.json();

      if (data.ok) {
        setImportResult(data);
        toast({ title: t("Import completed", "Import สำเร็จ"), description: data.message });
      } else {
        toast({ variant: "destructive", title: "Error", description: data.message });
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setIsImporting(false);
    }
  };

  const resetForm = () => {
    setParsedData(null);
    setFileName("");
    setSelectedRecords(new Set());
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <SalesLayout>
    <div className="container mx-auto max-w-6xl">
      <div className="flex items-center gap-2 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Database className="h-6 w-6" />
            {t("Import from Aloha POS", "Import จาก Aloha POS")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("Import employee data from DBF files", "Import ข้อมูลพนักงานจากไฟล์ DBF")}
          </p>
        </div>
      </div>

      {importResult && (
        <Card className="mb-6 border-green-200 bg-green-50 dark:bg-green-950/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
              <div className="flex-1">
                <h3 className="font-semibold text-green-800 dark:text-green-200">
                  {t("Import Completed", "Import เสร็จสิ้น")}
                </h3>
                <div className="flex gap-4 mt-2">
                  <Badge variant="outline" className="bg-green-100 dark:bg-green-900">
                    {t("Imported", "Import แล้ว")}: {importResult.imported}
                  </Badge>
                  <Badge variant="outline" className="bg-yellow-100 dark:bg-yellow-900">
                    {t("Skipped", "ข้าม")}: {importResult.skipped}
                  </Badge>
                </div>
                {importResult.errors && importResult.errors.length > 0 && (
                  <div className="mt-2 text-sm text-red-600">
                    {importResult.errors.slice(0, 5).map((e, i) => (
                      <div key={i}>{e}</div>
                    ))}
                  </div>
                )}
                <Button variant="outline" className="mt-4" onClick={resetForm} data-testid="button-import-more">
                  {t("Import More", "Import เพิ่มเติม")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!parsedData && !importResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              {t("Upload DBF File", "อัพโหลดไฟล์ DBF")}
            </CardTitle>
            <CardDescription>
              {t("Select a .dbf file from Aloha POS to import employee data", "เลือกไฟล์ .dbf จาก Aloha POS เพื่อ import ข้อมูลพนักงาน")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".dbf"
                onChange={handleFileSelect}
                className="hidden"
                data-testid="input-file-dbf"
              />
              <div className="flex flex-col items-center gap-4">
                {isLoading ? (
                  <>
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <p className="text-muted-foreground">{t("Parsing file...", "กำลังอ่านไฟล์...")}</p>
                  </>
                ) : (
                  <>
                    <Upload className="h-12 w-12 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{t("Drop .dbf file here or click to browse", "ลากไฟล์ .dbf มาวางหรือคลิกเพื่อเลือก")}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {t("Supports: _Emp.DBF, AlohaEmployee.dbf, etc.", "รองรับ: _Emp.DBF, AlohaEmployee.dbf ฯลฯ")}
                      </p>
                    </div>
                    <Button onClick={() => fileInputRef.current?.click()} data-testid="button-select-file">
                      <Upload className="h-4 w-4 mr-2" />
                      {t("Select File", "เลือกไฟล์")}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {parsedData && !importResult && (
        <>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="h-5 w-5" />
                {t("File Loaded", "โหลดไฟล์สำเร็จ")}: {fileName}
              </CardTitle>
              <CardDescription>
                {parsedData.recordCount} {t("records found", "รายการ")} | {parsedData.fields.length} {t("fields", "คอลัมน์")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <div>
                  <Label>{t("Username Field", "คอลัมน์ Username")} *</Label>
                  <Select value={fieldMapping.username} onValueChange={(v) => setFieldMapping({...fieldMapping, username: v})}>
                    <SelectTrigger data-testid="select-username-field">
                      <SelectValue placeholder={t("Select field", "เลือกคอลัมน์")} />
                    </SelectTrigger>
                    <SelectContent>
                      {parsedData.fields.map(f => (
                        <SelectItem key={f.name} value={f.name}>{f.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t("Full Name Field", "คอลัมน์ชื่อเต็ม")}</Label>
                  <Select value={fieldMapping.fullName} onValueChange={(v) => setFieldMapping({...fieldMapping, fullName: v})}>
                    <SelectTrigger data-testid="select-fullname-field">
                      <SelectValue placeholder={t("Select field", "เลือกคอลัมน์")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">({t("None", "ไม่เลือก")})</SelectItem>
                      {parsedData.fields.map(f => (
                        <SelectItem key={f.name} value={f.name}>{f.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t("Nickname Field", "คอลัมน์ชื่อเล่น")}</Label>
                  <Select value={fieldMapping.nickName} onValueChange={(v) => setFieldMapping({...fieldMapping, nickName: v})}>
                    <SelectTrigger data-testid="select-nickname-field">
                      <SelectValue placeholder={t("Select field", "เลือกคอลัมน์")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">({t("None", "ไม่เลือก")})</SelectItem>
                      {parsedData.fields.map(f => (
                        <SelectItem key={f.name} value={f.name}>{f.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t("Phone Field", "คอลัมน์เบอร์โทร")}</Label>
                  <Select value={fieldMapping.phone} onValueChange={(v) => setFieldMapping({...fieldMapping, phone: v})}>
                    <SelectTrigger data-testid="select-phone-field">
                      <SelectValue placeholder={t("Select field", "เลือกคอลัมน์")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">({t("None", "ไม่เลือก")})</SelectItem>
                      {parsedData.fields.map(f => (
                        <SelectItem key={f.name} value={f.name}>{f.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t("Email Field", "คอลัมน์ Email")}</Label>
                  <Select value={fieldMapping.email} onValueChange={(v) => setFieldMapping({...fieldMapping, email: v})}>
                    <SelectTrigger data-testid="select-email-field">
                      <SelectValue placeholder={t("Select field", "เลือกคอลัมน์")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">({t("None", "ไม่เลือก")})</SelectItem>
                      {parsedData.fields.map(f => (
                        <SelectItem key={f.name} value={f.name}>{f.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    {t("Preview Data", "ตัวอย่างข้อมูล")}
                  </CardTitle>
                  <CardDescription>
                    {selectedRecords.size} / {parsedData.records.length} {t("selected", "รายการที่เลือก")}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={resetForm} data-testid="button-cancel">
                    {t("Cancel", "ยกเลิก")}
                  </Button>
                  <Button 
                    onClick={handleImport} 
                    disabled={selectedRecords.size === 0 || !fieldMapping.username || isImporting}
                    data-testid="button-import"
                  >
                    {isImporting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Users className="h-4 w-4 mr-2" />
                    )}
                    {t("Import Selected", "Import ที่เลือก")} ({selectedRecords.size})
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-auto max-h-96">
                <Table>
                  <TableHeader className="sticky top-0 bg-background">
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox 
                          checked={selectedRecords.size === parsedData.records.length} 
                          onCheckedChange={toggleAll}
                          data-testid="checkbox-select-all"
                        />
                      </TableHead>
                      {parsedData.fields.slice(0, 6).map(f => (
                        <TableHead key={f.name} className="font-medium">
                          {f.name}
                          {fieldMapping.username === f.name && <Badge className="ml-1" variant="secondary">Username</Badge>}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.records.map((record, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Checkbox 
                            checked={selectedRecords.has(index)}
                            onCheckedChange={() => toggleRecord(index)}
                            data-testid={`checkbox-row-${index}`}
                          />
                        </TableCell>
                        {parsedData.fields.slice(0, 6).map(f => (
                          <TableCell key={f.name} className="max-w-32 truncate">
                            {String(record[f.name] || "")}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {parsedData.recordCount > 100 && (
                <p className="text-sm text-muted-foreground mt-2">
                  {t("Showing first 100 of", "แสดง 100 รายการแรกจาก")} {parsedData.recordCount} {t("records", "รายการ")}
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
    </SalesLayout>
  );
}
