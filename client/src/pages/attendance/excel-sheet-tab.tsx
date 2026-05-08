import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useI18n } from "@/hooks/use-i18n";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient as qc } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, Loader2, UserPlus, Printer } from "lucide-react";
import { ClockRecord, EMP_COLORS_CSV, CSV_SHIFTS_FE, DOW_TH, MONTH_SHORT } from "./types";
import { getLateStatus, formatTime, isValidTimeInput, TIME_ERR_MSG, isManagerPos, getPosPriority, rosterStartH } from "./utils";
import { TimeDropdown, AddEmployeeDialog } from "./shared-components";
import { ExcelRosterView } from "./excel-roster-view";

const ROSTER_OPTS = [
  "OFF",
  "05:00 - 14:00","06:00 - 15:00","07:00 - 16:00","08:00 - 17:00",
  "09:00 - 18:00","10:00 - 19:00","11:00 - 20:00","12:00 - 21:00",
  "13:00 - 22:00","14:00 - 23:00","15:00 - 00:00","16:00 - 01:00",
  "20:00 - 05:00","22:00 - 07:00",
];

export function ExcelSheetTab({ year, month, storeId, storeName = "Grand Diamond" }: { year: number; month: number; storeId: string; storeName?: string }) {
  const { toast } = useToast();
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

  const empMap = new Map<string, { fullName: string; nickName: string | null; position: string | null }>();
  (empData?.employees || []).forEach(e => { if (isManagerPos(e.position)) empMap.set(e.fullName, e); });
  records.forEach(r => { if (isManagerPos(r.position) && !empMap.has(r.employeeFullName)) empMap.set(r.employeeFullName, { fullName: r.employeeFullName, nickName: r.employeeNickName, position: r.position }); });
  const employees = Array.from(empMap.values()).sort((a, b) => getPosPriority(a.position) - getPosPriority(b.position) || (a.nickName || a.fullName).localeCompare(b.nickName || b.fullName));

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
  const cellSelect = "w-full h-5 px-0 text-[11px] bg-transparent border-0 focus:outline-none text-center text-[#111111] cursor-pointer appearance-none";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs px-2.5" onClick={() => setShowAddEmp(true)} data-testid="button-add-employee-excel-sheet">
          <UserPlus className="h-3 w-3" />เพิ่มพนักงาน
        </Button>
      </div>

      {showAddEmp && (
        <AddEmployeeDialog year={year} month={month} storeId={storeId} onClose={() => setShowAddEmp(false)} onAdded={() => { setShowAddEmp(false); qc.invalidateQueries({ queryKey: ["/api/attendance/records"] }); }} />
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : employees.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <FileSpreadsheet className="h-12 w-12 text-muted-foreground/40" />
            <p className="text-muted-foreground text-center text-sm">ยังไม่มีพนักงานในเดือนนี้ — เพิ่มพนักงานเพื่อเริ่มกรอกข้อมูล</p>
            <Button size="sm" className="gap-1.5" onClick={() => setShowAddEmp(true)} data-testid="button-add-employee-excel-sheet-empty">
              <UserPlus className="h-3.5 w-3.5" />เพิ่มพนักงาน
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border overflow-auto bg-white" style={{ maxHeight: "calc(100vh - 210px)" }}>
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
                              <th className={`${tdB} font-semibold leading-tight`} style={{ color: c.accent }}>ScanIn</th>
                              <th className={`${tdB} font-semibold leading-tight`} style={{ color: c.accent }}>ScanOut</th>
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
                                <tr key={dateStr} style={{ backgroundColor: isWknd ? "#FFF2CC" : "#ffffff" }}>
                                  <td className={tdB} style={{ color: isWknd ? "#833C00" : "#111111", fontWeight: isWknd ? 600 : undefined }}>{DOW_TH[dowIdx]}</td>
                                  <td className={tdB} style={{ color: isWknd ? "#833C00" : "#111111" }}>{d}</td>
                                  <td className={`${tdB} p-0`}>
                                    <select className={cellSelect} style={{ color: rosterVal?.toUpperCase() === "OFF" ? "#CC0000" : "#111111" }} value={ROSTER_OPTS.includes(rosterVal) ? rosterVal : ""} onChange={e => { setEditCell(dateStr, emp.fullName, "rosterTime", e.target.value); }} onBlur={() => saveRow(dateStr, emp)} disabled={isSaving} data-testid={`cell-es-roster-${idx}-${d}`}>
                                      <option value="">—</option>
                                      {ROSTER_OPTS.map(o => <option key={o} value={o} style={{ color: o === "OFF" ? "#CC0000" : "#111111" }}>{o}</option>)}
                                      {rosterVal && !ROSTER_OPTS.includes(rosterVal) && <option value={rosterVal}>{rosterVal}</option>}
                                    </select>
                                    {errR && <div className="text-[9px] text-red-500 leading-tight px-0.5">{errR}</div>}
                                  </td>
                                  <td className={`${tdB} p-0.5`}>
                                    {isSaving ? <div className="flex items-center justify-center h-5"><Loader2 className="h-3 w-3 animate-spin text-muted-foreground" /></div> : (
                                      <TimeDropdown compact value={inVal} onChange={v => setEditCell(dateStr, emp.fullName, "clockInTime", v)} onBlur={() => saveRow(dateStr, emp)} style={{ color: inColor ?? "#111111" }} testId={`cell-es-scanin-${idx}-${d}`} />
                                    )}
                                    {errI && <div className="text-[9px] text-red-500 leading-tight px-0.5">{errI}</div>}
                                  </td>
                                  <td className={`${tdB} p-0.5`}>
                                    {isSaving ? <div className="flex items-center justify-center h-5"><Loader2 className="h-3 w-3 animate-spin text-muted-foreground" /></div> : (
                                      <TimeDropdown compact value={outVal} onChange={v => setEditCell(dateStr, emp.fullName, "clockOutTime", v)} onBlur={() => saveRow(dateStr, emp)} testId={`cell-es-scanout-${idx}-${d}`} />
                                    )}
                                    {errO && <div className="text-[9px] text-red-500 leading-tight px-0.5">{errO}</div>}
                                  </td>
                                  <td className={`${tdB} p-0`}>
                                    {isSaving ? <div className="flex items-center justify-center h-5"><Loader2 className="h-3 w-3 animate-spin text-muted-foreground" /></div> : (
                                      <input className={`${cellInput} text-left`} value={notesVal} onChange={e => setEditCell(dateStr, emp.fullName, "notes", e.target.value)} onBlur={() => saveRow(dateStr, emp)} onKeyDown={e => { if (e.key === "Escape") { e.preventDefault(); revertField(dateStr, emp.fullName, "notes"); (e.target as HTMLInputElement).blur(); } else if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLInputElement).blur(); } }} data-testid={`cell-es-notes-${idx}-${d}`} />
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                            <tr><td colSpan={6} style={{ height: 6, backgroundColor: "#f2f2f2", borderTop: "1px solid #bfbfbf", borderBottom: "1px solid #bfbfbf" }} /></tr>
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

export function ExcelSheetCombined({ year, month, storeId }: { year: number; month: number; storeId: string }) {
  const { language } = useI18n();
  const t = (en: string, th: string) => language === "th" ? th : en;
  const [subView, setSubView] = useState<"roster" | "excel">("roster");
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button onClick={() => setSubView("roster")} data-testid="subtab-roster-sheet" className={`px-3 py-1.5 rounded text-xs font-medium border transition-colors ${subView === "roster" ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:bg-muted"}`}>
          <span className="flex items-center gap-1.5"><FileSpreadsheet className="h-3.5 w-3.5" />{t("Roster Sheet","ตารางงาน")}</span>
        </button>
        <button onClick={() => setSubView("excel")} data-testid="subtab-excel-sheet" className={`px-3 py-1.5 rounded text-xs font-medium border transition-colors ${subView === "excel" ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:bg-muted"}`}>
          <span className="flex items-center gap-1.5"><FileSpreadsheet className="h-3.5 w-3.5" />{t("Excel Sheet","Excel Sheet")}</span>
        </button>
        {subView === "roster" && (
          <Button variant="outline" size="sm" onClick={() => { document.body.classList.add("printing-roster"); window.print(); window.addEventListener("afterprint", () => { document.body.classList.remove("printing-roster"); }, { once: true }); }} data-testid="button-print-roster" className="gap-1.5 h-7 text-xs ml-auto">
            <Printer className="h-3.5 w-3.5" />{t("Print","พิมพ์")}
          </Button>
        )}
      </div>
      {subView === "roster" ? (
        <div id="roster-print-area"><ExcelRosterView year={year} month={month} storeId={storeId} /></div>
      ) : (
        <ExcelSheetTab year={year} month={month} storeId={storeId} />
      )}
    </div>
  );
}
