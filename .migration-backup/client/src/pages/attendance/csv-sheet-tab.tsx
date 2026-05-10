import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useI18n } from "@/hooks/use-i18n";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient as qc } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Loader2, UserPlus, Upload, Download, CheckCircle2, RefreshCw } from "lucide-react";
import { ClockRecord, EMP_COLORS_CSV, CSV_SHIFTS_FE, DOW_TH, MONTH_SHORT, MONTH_EN } from "./types";
import { getLateStatus, formatTime, isValidTimeInput, TIME_ERR_MSG, isManagerPos, rosterStartH } from "./utils";
import { AddEmployeeDialog } from "./shared-components";

export function ClockInOutCSVTab({ year, month, storeId, storeName = "Grand Diamond" }: { year: number; month: number; storeId: string; storeName?: string }) {
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

  const [localEdits, setLocalEdits] = useState<Record<string, Record<string, string>>>({});
  const [savingRows, setSavingRows] = useState<Set<string>>(new Set());
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const escapingRef = useRef(false);

  const getEdit = (date: string, empName: string, field: string) => localEdits[`${date}:${empName}`]?.[field];

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
      if (n[k]) { const row = { ...n[k] }; delete row[field]; if (Object.keys(row).length === 0) delete n[k]; else n[k] = row; }
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
      token: localStorage.getItem("bk_token"), date, storeId,
      employeeFullName: emp.fullName, employeeNickName: edits.employeeNickName ?? emp.nickName ?? "",
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
      if (json.ok) { setLocalEdits(prev => { const n = { ...prev }; delete n[k]; return n; }); qc.invalidateQueries({ queryKey: ["/api/attendance/records"] }); }
      else { toast({ variant: "destructive", title: "Error", description: json.message }); }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally { setSavingRows(prev => { const n = new Set(prev); n.delete(k); return n; }); }
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
  records.forEach(r => { if (isManagerPos(r.position) && !empMap.has(r.employeeFullName)) empMap.set(r.employeeFullName, { fullName: r.employeeFullName, nickName: r.employeeNickName, position: r.position }); });
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
    const a = document.createElement("a"); a.href = url; a.download = `Clock_In_Out_${MONTH_EN[month - 1]}_${year}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const handleCSVFile = async (file: File) => {
    if (!file.name.match(/\.csv$/i)) { toast({ variant: "destructive", title: "Error", description: t("Please select a CSV file (.csv)", "กรุณาเลือกไฟล์ CSV (.csv)") }); return; }
    setImportFileName(file.name); setImportLoading(true);
    const fd = new FormData(); fd.append("file", file); fd.append("token", localStorage.getItem("bk_token") || ""); fd.append("confirm", "false");
    try {
      const res = await fetch("/api/attendance/import-csv", { method: "POST", body: fd });
      const data = await res.json();
      if (data.ok) { setImportPreview(data.sample || []); setImportCount(data.count || 0); setImportStep("preview"); toast({ title: t("File parsed", "อ่านไฟล์สำเร็จ"), description: `${data.count} ${t("records found", "รายการ")}` }); }
      else { toast({ variant: "destructive", title: "Error", description: data.message }); }
    } catch (err: any) { toast({ variant: "destructive", title: "Error", description: err.message }); }
    finally { setImportLoading(false); }
  };

  const handleConfirmCSVImport = async () => {
    if (!csvFileRef.current?.files?.[0]) return;
    setImportLoading(true);
    const fd = new FormData(); fd.append("file", csvFileRef.current.files[0]); fd.append("token", localStorage.getItem("bk_token") || ""); fd.append("confirm", "true");
    try {
      const res = await fetch("/api/attendance/import-csv", { method: "POST", body: fd });
      const data = await res.json();
      if (data.ok) { setImportResult({ imported: data.imported, updated: data.updated }); setImportStep("done"); qc.invalidateQueries({ queryKey: ["/api/attendance/records"] }); toast({ title: t("Import complete!", "Import สำเร็จ!"), description: data.message }); }
      else { toast({ variant: "destructive", title: "Error", description: data.message }); }
    } catch (err: any) { toast({ variant: "destructive", title: "Error", description: err.message }); }
    finally { setImportLoading(false); }
  };

  const resetImport = () => { setImportStep("idle"); setImportPreview([]); setImportFileName(""); setImportResult(null); if (csvFileRef.current) csvFileRef.current.value = ""; };

  const GROUP = 5;
  const tdB = "border border-gray-300 px-1.5 py-0.5 text-center";
  const cellInput = "w-full h-5 px-0.5 text-[11px] bg-transparent border-0 focus:ring-1 focus:ring-blue-400 rounded focus:outline-none text-center";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" className="gap-1.5" onClick={() => setShowAddEmp(true)} data-testid="button-add-employee-csv"><UserPlus className="h-3.5 w-3.5" />เพิ่มพนักงาน</Button>
        <Button onClick={handleDownloadCSV} variant="outline" size="sm" className="gap-1.5" data-testid="button-download-csv"><Download className="h-3.5 w-3.5" />{t("Download CSV", "ดาวน์โหลด CSV")}</Button>
        {importStep === "idle" && (
          <>
            <input ref={csvFileRef} type="file" accept=".csv" className="hidden" data-testid="input-file-csv" onChange={e => { const f = e.target.files?.[0]; if (f) handleCSVFile(f); }} />
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => csvFileRef.current?.click()} disabled={importLoading} data-testid="button-import-csv">
              {importLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              {importLoading ? t("Parsing…", "กำลังอ่าน…") : t("Import CSV", "Import CSV")}
            </Button>
          </>
        )}
        {importStep === "preview" && (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={resetImport}>{t("← Cancel", "← ยกเลิก")}</Button>
            <Button size="sm" className="gap-1.5" onClick={handleConfirmCSVImport} disabled={importLoading} data-testid="button-confirm-csv-import">
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

      {showAddEmp && (
        <AddEmployeeDialog year={year} month={month} storeId={storeId} onClose={() => setShowAddEmp(false)} onAdded={() => { setShowAddEmp(false); qc.invalidateQueries({ queryKey: ["/api/attendance/records"] }); }} />
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : employees.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <FileText className="h-12 w-12 text-muted-foreground/40" />
            <p className="text-muted-foreground text-center text-sm">{t("No records yet — add an employee or import data.", "ยังไม่มีข้อมูล — เพิ่มพนักงานหรือ Import CSV ก่อน")}</p>
            <Button size="sm" className="gap-1.5" onClick={() => setShowAddEmp(true)} data-testid="button-add-employee-csv-empty"><UserPlus className="h-3.5 w-3.5" />เพิ่มพนักงาน</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border overflow-auto" style={{ maxHeight: "72vh" }}>
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
                            <tr style={{ backgroundColor: c.header }}>
                              <td className={`${tdB} font-medium whitespace-nowrap`} style={{ color: c.accent }}>ชื่อ</td>
                              <td className={`${tdB} font-bold`} style={{ color: c.accent }} colSpan={2}>{emp.fullName}</td>
                              <td className={`${tdB} font-medium whitespace-nowrap`} style={{ color: c.accent }}>ชื่อเล่น</td>
                              <td className={`${tdB} font-bold`} style={{ color: c.accent }} colSpan={2}>{emp.nickName || "—"}</td>
                            </tr>
                            <tr style={{ backgroundColor: c.header }}>
                              <td className={`${tdB} font-medium whitespace-nowrap`} style={{ color: c.accent }}>สาขา</td>
                              <td className={`${tdB}`} style={{ color: c.accent }} colSpan={2}>{storeName}</td>
                              <td className={`${tdB} font-medium whitespace-nowrap`} style={{ color: c.accent }}>Month of</td>
                              <td className={`${tdB}`} style={{ color: c.accent }} colSpan={2}>{MONTH_SHORT[month - 1]}</td>
                            </tr>
                            <tr style={{ backgroundColor: c.header }}>
                              <td className={`${tdB} font-medium whitespace-nowrap`} style={{ color: c.accent }}>ตำแหน่ง</td>
                              <td className={`${tdB}`} style={{ color: c.accent }} colSpan={5}>{emp.position || "—"}</td>
                            </tr>
                            <tr style={{ backgroundColor: c.colHead }}>
                              <th className={`${tdB} font-semibold`} style={{ color: c.accent }}>วัน</th>
                              <th className={`${tdB} font-semibold`} style={{ color: c.accent }}>วันที่</th>
                              <th className={`${tdB} font-semibold leading-tight`} style={{ color: c.accent }}>Roster</th>
                              <th className={`${tdB} font-semibold leading-tight`} style={{ color: c.accent }}>Clock-In</th>
                              <th className={`${tdB} font-semibold leading-tight`} style={{ color: c.accent }}>Clock-Out</th>
                              <th className={`${tdB} font-semibold`} style={{ color: c.accent }}>Notes</th>
                            </tr>
                            {days.map(({ dateStr, d, dowIdx }) => {
                              const rec = recIdx[`${dateStr}:${emp.fullName}`];
                              const k = `${dateStr}:${emp.fullName}`;
                              const isSaving = savingRows.has(k);
                              const isWknd = dowIdx === 0 || dowIdx === 6;
                              const rosterVal = getEdit(dateStr, emp.fullName, "rosterTime") ?? rec?.rosterTime ?? "";
                              const inVal = getEdit(dateStr, emp.fullName, "clockInTime") ?? (rec?.clockInTime ? formatTime(rec.clockInTime) : "");
                              const outVal = getEdit(dateStr, emp.fullName, "clockOutTime") ?? (rec?.clockOutTime ? formatTime(rec.clockOutTime) : "");
                              const notesVal = getEdit(dateStr, emp.fullName, "notes") ?? rec?.notes ?? "";
                              const status = getLateStatus(rosterVal || null, inVal || null);
                              const inColor = status === "late" ? "#CC0000" : status === "early" ? "#1F3864" : status === "on-time" ? "#375623" : undefined;
                              const errR = fieldErrors[`${k}:rosterTime`];
                              const errI = fieldErrors[`${k}:clockInTime`];
                              const errO = fieldErrors[`${k}:clockOutTime`];
                              return (
                                <tr key={dateStr} style={{ backgroundColor: isWknd ? "#FFF2CC" : undefined }}>
                                  <td className={tdB} style={{ color: isWknd ? "#833C00" : undefined, fontWeight: isWknd ? 600 : undefined }}>{DOW_TH[dowIdx]}</td>
                                  <td className={tdB}>{d}</td>
                                  <td className={`${tdB} p-0`}>
                                    <input className={cellInput} style={{ color: rosterVal?.toUpperCase() === "OFF" ? "#CC0000" : undefined }} value={rosterVal} onChange={e => setEditCell(dateStr, emp.fullName, "rosterTime", e.target.value)} onBlur={() => saveRow(dateStr, emp)} onKeyDown={e => { if (e.key === "Escape") { e.preventDefault(); revertField(dateStr, emp.fullName, "rosterTime"); (e.target as HTMLInputElement).blur(); } else if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLInputElement).blur(); } }} disabled={isSaving} data-testid={`cell-cvroster-${idx}-${d}`} />
                                    {errR && <div className="text-[9px] text-red-500 leading-tight px-0.5">{errR}</div>}
                                  </td>
                                  <td className={`${tdB} p-0`}>
                                    {isSaving ? <div className="flex items-center justify-center h-5"><Loader2 className="h-3 w-3 animate-spin text-muted-foreground" /></div> : (
                                      <input className={cellInput} style={{ color: inColor }} value={inVal} onChange={e => setEditCell(dateStr, emp.fullName, "clockInTime", e.target.value)} onBlur={() => saveRow(dateStr, emp)} onKeyDown={e => { if (e.key === "Escape") { e.preventDefault(); revertField(dateStr, emp.fullName, "clockInTime"); (e.target as HTMLInputElement).blur(); } else if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLInputElement).blur(); } }} data-testid={`cell-cvin-${idx}-${d}`} />
                                    )}
                                    {errI && <div className="text-[9px] text-red-500 leading-tight px-0.5">{errI}</div>}
                                  </td>
                                  <td className={`${tdB} p-0`}>
                                    {isSaving ? <div className="flex items-center justify-center h-5"><Loader2 className="h-3 w-3 animate-spin text-muted-foreground" /></div> : (
                                      <input className={cellInput} value={outVal} onChange={e => setEditCell(dateStr, emp.fullName, "clockOutTime", e.target.value)} onBlur={() => saveRow(dateStr, emp)} onKeyDown={e => { if (e.key === "Escape") { e.preventDefault(); revertField(dateStr, emp.fullName, "clockOutTime"); (e.target as HTMLInputElement).blur(); } else if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLInputElement).blur(); } }} data-testid={`cell-cvout-${idx}-${d}`} />
                                    )}
                                    {errO && <div className="text-[9px] text-red-500 leading-tight px-0.5">{errO}</div>}
                                  </td>
                                  <td className={`${tdB} p-0`}>
                                    {isSaving ? <div className="flex items-center justify-center h-5"><Loader2 className="h-3 w-3 animate-spin text-muted-foreground" /></div> : (
                                      <input className={`${cellInput} text-left`} value={notesVal} onChange={e => setEditCell(dateStr, emp.fullName, "notes", e.target.value)} onBlur={() => saveRow(dateStr, emp)} onKeyDown={e => { if (e.key === "Escape") { e.preventDefault(); revertField(dateStr, emp.fullName, "notes"); (e.target as HTMLInputElement).blur(); } else if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLInputElement).blur(); } }} data-testid={`cell-cvnotes-${idx}-${d}`} />
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                            <tr><td colSpan={6} style={{ height: 6 }} /></tr>
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
                                  <td className={tdB} /><td className={tdB} colSpan={2} />
                                </tr>
                              );
                            })}
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
