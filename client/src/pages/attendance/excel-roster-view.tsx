import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient as qc } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Users, UserPlus } from "lucide-react";
import { ClockRecord, EMP_COLORS, SHIFT_DEFS, DOW_EN3, MONTH_SHORT } from "./types";
import { getLateStatus, formatTime, isValidTimeInput, TIME_ERR_MSG, isManagerPos, moveRowFocus } from "./utils";
import { RosterTimeDropdown, TimeDropdown, AddEmployeeDialog } from "./shared-components";

export function ExcelRosterView({ year, month, storeId, storeName = "Grand Diamond" }: { year: number; month: number; storeId: string; storeName?: string }) {
  const { toast } = useToast();
  const [localEdits, setLocalEdits] = useState<Record<string, Record<string, string>>>({});
  const [savingRows, setSavingRows] = useState<Set<string>>(new Set());
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showAddEmp, setShowAddEmp] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<string>("all");
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

  const empMap = new Map<string, { fullName: string; nickName: string | null; position: string | null }>();
  records.forEach(r => {
    if (isManagerPos(r.position) && !empMap.has(r.employeeFullName))
      empMap.set(r.employeeFullName, { fullName: r.employeeFullName, nickName: r.employeeNickName, position: r.position });
  });
  const managers = Array.from(empMap.values());

  useEffect(() => {
    if (selectedEmp !== "all" && !managers.some(e => e.fullName === selectedEmp)) setSelectedEmp("all");
  }, [managers, selectedEmp]);

  const visibleManagers = selectedEmp === "all" ? managers : managers.filter(e => e.fullName === selectedEmp);

  const recIdx: Record<string, ClockRecord> = {};
  records.forEach(r => { recIdx[`${r.date}:${r.employeeFullName}`] = r; });

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

  const daysInMonth = new Date(year, month, 0).getDate();
  const days = Array.from({ length: 31 }, (_, i) => {
    const d = i + 1;
    const isValid = d <= daysInMonth;
    const dateStr = isValid ? `${year}-${String(month).padStart(2,"0")}-${String(d).padStart(2,"0")}` : null;
    const dow = isValid && dateStr ? new Date(dateStr + "T00:00:00").getDay() : null;
    return { dateStr, d, dow, isValid };
  });

  const monthShort = MONTH_SHORT[month - 1];

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

  function displayRoster(rosterTime: string | null): string {
    if (!rosterTime) return "";
    if (rosterTime.toUpperCase().includes("OFF")) return "OFF";
    if (rosterTime.includes("T")) return formatTime(rosterTime);
    return rosterTime;
  }

  if (isLoading) return <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  if (managers.length === 0) return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" className="gap-1.5" onClick={() => setShowAddEmp(true)} data-testid="button-add-employee-empty">
          <UserPlus className="h-4 w-4" />เพิ่มพนักงาน
        </Button>
      </div>
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12">
          <Users className="h-12 w-12 text-muted-foreground/40" />
          <p className="text-muted-foreground text-center text-sm font-medium">ยังไม่มีข้อมูลพนักงานในเดือนนี้</p>
          <p className="text-xs text-muted-foreground/70">กด "เพิ่มพนักงาน" เพื่อเริ่มกรอกข้อมูล หรือ Import Excel ก่อน</p>
          <Button size="sm" variant="outline" className="gap-1.5 mt-1" onClick={() => setShowAddEmp(true)}>
            <UserPlus className="h-4 w-4" />เพิ่มพนักงาน
          </Button>
        </CardContent>
      </Card>
      {showAddEmp && <AddEmployeeDialog year={year} month={month} storeId={storeId} onClose={() => setShowAddEmp(false)} onAdded={() => {}} />}
    </div>
  );

  const tdBorder = "border border-gray-300 px-1.5 py-0.5";
  const thBorder = "border border-gray-300 px-1.5 py-1 text-center";

  return (
    <>
      <div className="flex items-center justify-between mb-1.5 gap-3">
        <p className="text-xs text-muted-foreground">คลิกเซลล์เพื่อแก้ไข — บันทึกอัตโนมัติเมื่อออกจากเซลล์ • กด Escape เพื่อยกเลิก</p>
        {managers.length > 1 && (
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs text-muted-foreground whitespace-nowrap">พนักงาน:</span>
            <select className="h-7 text-xs border rounded px-1.5 bg-background text-foreground" value={selectedEmp} onChange={e => setSelectedEmp(e.target.value)} data-testid="select-roster-emp">
              <option value="all">ทั้งหมด ({managers.length} คน)</option>
              {managers.map(e => <option key={e.fullName} value={e.fullName}>{e.nickName || e.fullName}</option>)}
            </select>
          </div>
        )}
      </div>
      <div className="rounded-lg border overflow-auto" style={{ maxHeight: "75vh" }}>
        <div className="flex min-w-max">
          {visibleManagers.map((emp, idx) => {
            const c = EMP_COLORS[managers.indexOf(emp) % EMP_COLORS.length];
            return (
              <div key={emp.fullName} className="border-r last:border-r-0 shrink-0" style={{ width: 390 }} data-testid={`block-roster-${idx}`}>
                <table className="w-full border-collapse" style={{ fontSize: 11 }}>
                  <tbody>
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
                    <tr style={{ backgroundColor: c.colHead }}>
                      <th className={`${thBorder} font-semibold`} style={{ color: c.accent }}>วัน</th>
                      <th className={`${thBorder} font-semibold`} style={{ color: c.accent }}>วันที่</th>
                      <th className={`${thBorder} font-semibold leading-tight`} style={{ color: c.accent }}>เวลาเข้างาน<br />(ตาม roster ที่<br />มีลายเซ็น AC)</th>
                      <th className={`${thBorder} font-semibold leading-tight`} style={{ color: c.accent }}>เวลาสแกนนิ้ว<br />เข้างาน (จาก<br />Aloha)</th>
                      <th className={`${thBorder} font-semibold leading-tight`} style={{ color: c.accent }}>เวลาสแกนนิ้ว<br />เลิกงาน (จาก<br />Aloha)</th>
                      <th className={`${thBorder} font-semibold`} style={{ color: c.accent }}>หมายเหตุ</th>
                    </tr>
                    {days.map(({ dateStr, d, dow, isValid }) => {
                      if (!isValid) return (
                        <tr key={`blank-${d}`} style={{ color: "#BFBFBF" }} data-testid={`row-roster-${idx}-${d}`}>
                          <td className={`${tdBorder} text-center`}>{d}</td>
                          <td className={tdBorder} colSpan={5} />
                        </tr>
                      );
                      const rec = recIdx[`${dateStr}:${emp.fullName}`];
                      const k = `${dateStr}:${emp.fullName}`;
                      const isSaving = savingRows.has(k);
                      const isWknd = dow === 0 || dow === 6;
                      const rosterVal = getEdit(dateStr!, emp.fullName, "rosterTime") ?? (rec?.rosterTime ? displayRoster(rec.rosterTime) : "");
                      const clockInVal = getEdit(dateStr!, emp.fullName, "clockInTime") ?? (rec?.clockInTime ? formatTime(rec.clockInTime) : "");
                      const clockOutVal = getEdit(dateStr!, emp.fullName, "clockOutTime") ?? (rec?.clockOutTime ? formatTime(rec.clockOutTime) : "");
                      const notesVal = getEdit(dateStr!, emp.fullName, "notes") ?? (rec?.notes ?? "");
                      const status = getLateStatus(rosterVal, clockInVal);
                      const inColor = status === "late" ? "#CC0000" : status === "early" ? "#1F3864" : status === "on-time" ? "#375623" : undefined;
                      const cellInput = "w-full h-5 px-0.5 text-[11px] bg-transparent border-0 focus:ring-1 focus:ring-blue-400 rounded focus:outline-none text-center";
                      const errR = fieldErrors[`${k}:rosterTime`];
                      const errI = fieldErrors[`${k}:clockInTime`];
                      const errO = fieldErrors[`${k}:clockOutTime`];
                      return (
                        <tr key={dateStr} style={{ backgroundColor: isWknd ? "#FFF2CC" : undefined }} data-testid={`row-roster-${idx}-${d}`}>
                          <td className={`${tdBorder} text-center whitespace-nowrap font-medium`} style={{ color: isWknd ? "#833C00" : undefined }}>{DOW_EN3[dow!]}</td>
                          <td className={`${tdBorder} text-center whitespace-nowrap`}>{d}-{monthShort}</td>
                          <td className={`${tdBorder} p-0.5`}>
                            <RosterTimeDropdown compact value={rosterVal} onChange={v => setEdit(dateStr!, emp.fullName, "rosterTime", v)} onBlur={() => saveRow(dateStr!, emp)} testId={`cell-exroster-${idx}-${d}`} />
                            {errR && <div className="text-[9px] text-red-500 leading-tight px-0.5" data-testid={`err-exroster-${idx}-${d}`}>{errR}</div>}
                          </td>
                          <td className={`${tdBorder} p-0.5`}>
                            <TimeDropdown compact value={clockInVal} onChange={v => setEdit(dateStr!, emp.fullName, "clockInTime", v)} onBlur={() => saveRow(dateStr!, emp)} style={{ color: inColor }} testId={`cell-exin-${idx}-${d}`} />
                            {errI && <div className="text-[9px] text-red-500 leading-tight px-0.5" data-testid={`err-exin-${idx}-${d}`}>{errI}</div>}
                          </td>
                          <td className={`${tdBorder} p-0.5`}>
                            <TimeDropdown compact value={clockOutVal} onChange={v => setEdit(dateStr!, emp.fullName, "clockOutTime", v)} onBlur={() => saveRow(dateStr!, emp)} testId={`cell-exout-${idx}-${d}`} />
                            {errO && <div className="text-[9px] text-red-500 leading-tight px-0.5" data-testid={`err-exout-${idx}-${d}`}>{errO}</div>}
                          </td>
                          <td className={`${tdBorder} p-0`}>
                            {isSaving ? <div className="flex items-center justify-center h-5"><Loader2 className="h-3 w-3 animate-spin text-muted-foreground" /></div> : (
                              <input className={cellInput} value={notesVal} onChange={e => setEdit(dateStr!, emp.fullName, "notes", e.target.value)} onBlur={() => saveRow(dateStr!, emp)} onKeyDown={e => { if (e.key === "Escape") { e.preventDefault(); revertField(dateStr!, emp.fullName, "notes"); (e.target as HTMLInputElement).blur(); return; } if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLInputElement).blur(); moveRowFocus(e, e.shiftKey ? -1 : 1); } }} data-testid={`cell-exnotes-${idx}-${d}`} />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    <tr><td colSpan={6} style={{ height: 8 }} /></tr>
                    <tr style={{ backgroundColor: c.colHead }}>
                      <th className={thBorder} style={{ color: c.accent }} colSpan={2}>Shift</th>
                      <th className={thBorder} style={{ color: c.accent }}>Time Roster</th>
                      <th className={thBorder} style={{ color: c.accent }}>Total</th>
                      <th className={thBorder} style={{ color: c.accent }} colSpan={2} />
                    </tr>
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
