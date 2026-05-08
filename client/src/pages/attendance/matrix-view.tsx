import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useI18n } from "@/hooks/use-i18n";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient as qc } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, LayoutGrid } from "lucide-react";
import { ClockRecord, DOW_TH } from "./types";
import { getLateStatus, isValidTimeInput, TIME_ERR_MSG, moveRowFocus } from "./utils";

export function MatrixView({ year, month, storeId }: { year: number; month: number; storeId: string }) {
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

  const employeeMap = new Map<string, { fullName: string; nickName: string | null; position: string | null }>();
  records.forEach(r => {
    if (!employeeMap.has(r.employeeFullName))
      employeeMap.set(r.employeeFullName, { fullName: r.employeeFullName, nickName: r.employeeNickName, position: r.position });
  });
  const employees = Array.from(employeeMap.values());

  const recordIndex: Record<string, ClockRecord> = {};
  records.forEach(r => { recordIndex[`${r.date}:${r.employeeFullName}`] = r; });

  const daysInMonth = new Date(year, month, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const d = i + 1;
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const dowIdx = new Date(dateStr + "T00:00:00").getDay();
    return { date: dateStr, day: d, dowIdx };
  });

  const getEdit = (date: string, empName: string, field: string) => localEdits[`${date}:${empName}`]?.[field];

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

    const existing = recordIndex[k];
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

  if (isLoading) return <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  if (employees.length === 0) return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-12">
        <LayoutGrid className="h-12 w-12 text-muted-foreground/40" />
        <p className="text-muted-foreground text-center">{t("No records yet — Import Excel or add records first.", "ยังไม่มีข้อมูล — กรุณา Import Excel หรือเพิ่มรายการก่อน")}</p>
      </CardContent>
    </Card>
  );

  const inputCls = "w-full h-6 px-1 text-[11px] bg-transparent border-0 focus:ring-1 focus:ring-primary rounded focus:outline-none min-w-[52px]";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs text-muted-foreground">{t("Click any cell to edit — saves on blur. Press Escape to cancel.", "คลิกเซลล์เพื่อแก้ไข — บันทึกอัตโนมัติเมื่อออกจากเซลล์ • กด Escape เพื่อยกเลิก")}</p>
        <div className="flex gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />{t("On time","ตรงเวลา")}</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />{t("Late","สาย")}</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />{t("Early","เร็ว")}</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />{t("Weekend","เสาร์/อา")}</span>
        </div>
      </div>

      <div className="rounded-lg border overflow-auto max-h-[65vh]">
        <table className="text-xs border-collapse w-full min-w-max">
          <thead className="sticky top-0 z-20 bg-background">
            <tr className="border-b">
              <th className="border-r px-2 py-2 text-left font-medium bg-muted/60 w-16 sticky left-0 z-30" rowSpan={2}>{t("Date","วันที่")}</th>
              {employees.map(emp => (
                <th key={emp.fullName} colSpan={4} className="border-r px-2 py-1.5 text-center font-semibold bg-primary/8 whitespace-nowrap border-x">
                  <div className="text-primary text-xs">{emp.nickName || emp.fullName}</div>
                  {emp.nickName && <div className="text-muted-foreground font-normal text-[10px] leading-tight">{emp.fullName}</div>}
                  {emp.position && <div className="text-muted-foreground font-normal text-[10px] leading-tight">{emp.position}</div>}
                </th>
              ))}
            </tr>
            <tr className="border-b bg-muted/40">
              {employees.map(emp => (
                [{ key: "roster", label: "Roster" }, { key: "in", label: t("In","เข้า") }, { key: "out", label: t("Out","ออก") }, { key: "notes", label: t("Note","หมายเหตุ") }].map(col => (
                  <th key={`${emp.fullName}-${col.key}`} className="border px-1 py-1 text-center font-normal text-muted-foreground whitespace-nowrap text-[10px]">{col.label}</th>
                ))
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map(({ date, day, dowIdx }) => {
              const isWeekend = dowIdx === 0 || dowIdx === 6;
              const dowLabel = DOW_TH[dowIdx];
              return (
                <tr key={date} className={`border-b hover:bg-muted/20 transition-colors ${isWeekend ? "bg-amber-50/60 dark:bg-amber-950/15" : ""}`}>
                  <td className="border-r px-2 py-0.5 font-medium sticky left-0 z-10 whitespace-nowrap bg-inherit">
                    <span className={`font-semibold ${isWeekend ? "text-amber-600 dark:text-amber-400" : "text-foreground"}`}>{dowLabel}</span>
                    <span className="text-muted-foreground ml-1 text-[11px]">{day}</span>
                  </td>
                  {employees.map(emp => {
                    const k = `${date}:${emp.fullName}`;
                    const rec = recordIndex[k];
                    const isSaving = savingRows.has(k);
                    const roster = getEdit(date, emp.fullName, "rosterTime") ?? rec?.rosterTime ?? "";
                    const clockIn = getEdit(date, emp.fullName, "clockInTime") ?? rec?.clockInTime ?? "";
                    const clockOut = getEdit(date, emp.fullName, "clockOutTime") ?? rec?.clockOutTime ?? "";
                    const notes = getEdit(date, emp.fullName, "notes") ?? rec?.notes ?? "";
                    const status = getLateStatus(roster, clockIn);
                    const inColor = status === "late" ? "text-red-500 font-semibold" : status === "early" ? "text-blue-500" : status === "on-time" ? "text-green-600" : "";
                    const errR = fieldErrors[`${k}:rosterTime`];
                    const errI = fieldErrors[`${k}:clockInTime`];
                    const errO = fieldErrors[`${k}:clockOutTime`];
                    return (
                      <>
                        <td key={`${k}-r`} className="border px-0.5 py-0.5">
                          <input className={`${inputCls} ${errR ? "ring-1 ring-red-500 rounded" : ""}`} value={roster} placeholder="05:00" title={errR} onChange={e => setEdit(date, emp.fullName, "rosterTime", e.target.value)} onBlur={() => saveRow(date, emp)} onKeyDown={e => { if (e.key === "Escape") { e.preventDefault(); revertField(date, emp.fullName, "rosterTime"); (e.target as HTMLInputElement).blur(); return; } if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLInputElement).blur(); moveRowFocus(e, e.shiftKey ? -1 : 1); } }} data-testid={`cell-roster-${date}-${emp.fullName.replace(/\s/g,"_")}`} />
                          {errR && <div className="text-[9px] text-red-500 leading-tight px-0.5" data-testid={`err-roster-${date}-${emp.fullName.replace(/\s/g,"_")}`}>{errR}</div>}
                        </td>
                        <td key={`${k}-i`} className="border px-0.5 py-0.5">
                          <input className={`${inputCls} ${inColor} ${errI ? "ring-1 ring-red-500 rounded" : ""}`} value={clockIn} placeholder="05:02" title={errI} onChange={e => setEdit(date, emp.fullName, "clockInTime", e.target.value)} onBlur={() => saveRow(date, emp)} onKeyDown={e => { if (e.key === "Escape") { e.preventDefault(); revertField(date, emp.fullName, "clockInTime"); (e.target as HTMLInputElement).blur(); return; } if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLInputElement).blur(); moveRowFocus(e, e.shiftKey ? -1 : 1); } }} data-testid={`cell-in-${date}-${emp.fullName.replace(/\s/g,"_")}`} />
                          {errI && <div className="text-[9px] text-red-500 leading-tight px-0.5" data-testid={`err-in-${date}-${emp.fullName.replace(/\s/g,"_")}`}>{errI}</div>}
                        </td>
                        <td key={`${k}-o`} className="border px-0.5 py-0.5">
                          <input className={`${inputCls} ${errO ? "ring-1 ring-red-500 rounded" : ""}`} value={clockOut} placeholder="14:00" title={errO} onChange={e => setEdit(date, emp.fullName, "clockOutTime", e.target.value)} onBlur={() => saveRow(date, emp)} onKeyDown={e => { if (e.key === "Escape") { e.preventDefault(); revertField(date, emp.fullName, "clockOutTime"); (e.target as HTMLInputElement).blur(); return; } if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLInputElement).blur(); moveRowFocus(e, e.shiftKey ? -1 : 1); } }} data-testid={`cell-out-${date}-${emp.fullName.replace(/\s/g,"_")}`} />
                          {errO && <div className="text-[9px] text-red-500 leading-tight px-0.5" data-testid={`err-out-${date}-${emp.fullName.replace(/\s/g,"_")}`}>{errO}</div>}
                        </td>
                        <td key={`${k}-n`} className="border px-0.5 py-0.5">
                          {isSaving ? <div className="flex items-center justify-center h-6"><Loader2 className="h-3 w-3 animate-spin text-muted-foreground" /></div> : (
                            <input className={inputCls} value={notes} onChange={e => setEdit(date, emp.fullName, "notes", e.target.value)} onBlur={() => saveRow(date, emp)} onKeyDown={e => { if (e.key === "Escape") { e.preventDefault(); revertField(date, emp.fullName, "notes"); (e.target as HTMLInputElement).blur(); return; } if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLInputElement).blur(); moveRowFocus(e, e.shiftKey ? -1 : 1); } }} data-testid={`cell-notes-${date}-${emp.fullName.replace(/\s/g,"_")}`} />
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
