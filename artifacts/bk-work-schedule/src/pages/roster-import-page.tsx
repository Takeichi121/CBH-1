import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  ArrowLeft,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import ExcelJS from "exceljs";

interface ParsedShift {
  nickname: string;
  date: string;
  shiftGroup: string;
  timeRange: string;
}

interface ImportResult {
  ok: boolean;
  imported?: number;
  skipped?: number;
  errors?: string[];
  message?: string;
}

export default function RosterImportPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedShift[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  if (!user || (user.role !== "admin" && user.role !== "manager")) {
    return (
      <div className="p-8 text-center" data-testid="page-roster-import-denied">
        <p className="text-muted-foreground">ไม่มีสิทธิ์เข้าถึงหน้านี้</p>
      </div>
    );
  }

  const excelDateToString = (value: number | Date): string => {
    if (value instanceof Date) {
      return value.toISOString().split("T")[0];
    }
    const date = new Date((value - 25569) * 86400000);
    return date.toISOString().split("T")[0];
  };

  const parseShiftGroup = (code: string, timeRange: string): string | null => {
    const upperCode = code?.toUpperCase()?.trim();

    if (!upperCode || upperCode === "") return null;

    // New shift types
    if (upperCode === "COM") return "com";
    if (upperCode === "OFF") return "off";
    if (upperCode === "MM") return "meeting_manager";
    if (upperCode === "ZM") return "meeting_zone";
    if (upperCode === "OT") return "other";
    if (upperCode === "SK" || upperCode === "SICK") return "sick";

    // Existing shift types
    if (upperCode === "7.00-16.00") return "open";
    if (upperCode === "09.00-18.00") return "swing";
    if (upperCode === "13.00-22.00") return "lunch";
    if (upperCode === "15.00-00.00") return "dinner";
    if (upperCode === "19.00-04.00") return "close";
    if (upperCode === "22.00-07.00") return "late night";

    // Parse from time range if available (Fallback case)
    if (timeRange) {
      const match = timeRange.match(/(\d{1,2})\.(\d{2})/);
      if (match) {
        const startHour = parseInt(match[1]);
        if (startHour >= 22 || startHour < 6) return "late";
        if (startHour >= 17) return "dinner";
        if (startHour >= 10) return "lunch";
        return "open";
      }
    }

    return "lunch";
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setResult(null);

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);
      const parsed: ParsedShift[] = [];

      workbook.eachSheet((worksheet) => {
        const data: any[][] = [];
        worksheet.eachRow((row) => {
          data.push((row.values as any[]).slice(1));
        });

        let dateRow: (number | Date)[] = [];

        for (let i = 0; i < data.length; i++) {
          const row = data[i];
          if (!row || row.length === 0) continue;

          if (row[0] === "DATE") {
            dateRow = [];
            for (let j = 2; j < row.length; j += 2) {
              const cell = row[j];
              if (cell instanceof Date || (typeof cell === "number" && cell > 40000)) {
                dateRow.push(cell);
              }
            }
            continue;
          }

          if (row[0] === "Store Name" || row[2] === "TUE" || row[2] === "WED")
            continue;

          if (row[0] && typeof row[0] === "string" && row[0].trim() !== "") {
            const currentNickname = row[0].trim();

            let dateIndex = 0;
            for (
              let j = 2;
              j < row.length && dateIndex < dateRow.length;
              j += 2
            ) {
              const code = row[j];
              const nextRow = data[i + 1];
              const timeRange = nextRow?.[j] || "";

              if (code && typeof code === "string") {
                const shiftGroup = parseShiftGroup(code, timeRange);
                if (shiftGroup) {
                  parsed.push({
                    nickname: currentNickname,
                    date: excelDateToString(dateRow[dateIndex]),
                    shiftGroup,
                    timeRange: timeRange || code,
                  });
                }
              }
              dateIndex++;
            }
          }
        }
      });

      setParsedData(parsed);
      toast({
        title: "อ่านไฟล์สำเร็จ",
        description: `พบ ${parsed.length} รายการ พร้อม import`,
      });
    } catch (err: any) {
      toast({
        title: "อ่านไฟล์ไม่สำเร็จ",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleImport = async () => {
    if (parsedData.length === 0) return;

    setIsLoading(true);
    try {
      const token = localStorage.getItem("bk_token") || "";
      const res = await apiRequest("POST", "/api/roster/import", {
        token,
        data: parsedData,
      });

      const json: ImportResult = await res.json();
      setResult(json);

      if (json.ok) {
        toast({
          title: "Import สำเร็จ",
          description: `นำเข้า ${json.imported} รายการ, ข้าม ${json.skipped} รายการ`,
        });
      } else {
        toast({
          title: "Import ไม่สำเร็จ",
          description: json.message,
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="container mx-auto p-4 max-w-4xl"
      data-testid="page-roster-import"
    >
      <div className="flex items-center gap-4 mb-6">
        <Link href="/roster">
          <Button variant="ghost" size="icon" data-testid="button-back-roster">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">นำเข้าตารางเวรจาก Excel</h1>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            เลือกไฟล์ Excel
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            data-testid="input-file-excel"
          />
          {file && (
            <p className="text-sm text-muted-foreground">
              ไฟล์: {file.name} ({(file.size / 1024).toFixed(1)} KB)
            </p>
          )}
        </CardContent>
      </Card>

      {parsedData.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>ตัวอย่างข้อมูล ({parsedData.length} รายการ)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-64 overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">ชื่อเล่น</th>
                    <th className="text-left p-2">วันที่</th>
                    <th className="text-left p-2">กะ</th>
                    <th className="text-left p-2">เวลา</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedData.slice(0, 20).map((item, i) => (
                    <tr key={i} className="border-b">
                      <td className="p-2">{item.nickname}</td>
                      <td className="p-2">{item.date}</td>
                      <td className="p-2">{item.shiftGroup}</td>
                      <td className="p-2">{item.timeRange}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsedData.length > 20 && (
                <p className="text-sm text-muted-foreground mt-2">
                  ... และอีก {parsedData.length - 20} รายการ
                </p>
              )}
            </div>

            <div className="flex gap-3 mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setFile(null);
                  setParsedData([]);
                  setResult(null);
                }}
                disabled={isLoading}
                className="flex-1"
                data-testid="button-cancel-import"
              >
                ยกเลิก
              </Button>
              <Button
                onClick={handleImport}
                disabled={isLoading}
                className="flex-1"
                data-testid="button-import"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    กำลัง Import...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Import ทั้งหมด {parsedData.length} รายการ
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {result.ok ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              ผลลัพธ์
            </CardTitle>
          </CardHeader>
          <CardContent>
            {result.ok ? (
              <div className="space-y-2">
                <p className="text-green-600">
                  นำเข้าสำเร็จ: {result.imported} รายการ
                </p>
                <p className="text-yellow-600">ข้าม: {result.skipped} รายการ</p>
                {result.errors && result.errors.length > 0 && (
                  <div className="mt-4">
                    <p className="text-red-600 font-medium">ข้อผิดพลาด:</p>
                    <ul className="list-disc list-inside text-sm text-red-500">
                      {result.errors.slice(0, 10).map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-red-600">{result.message}</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
