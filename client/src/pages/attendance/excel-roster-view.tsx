import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient as qc } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Users, UserPlus, UserCircle } from "lucide-react";
import { ClockRecord, SHIFT_DEFS, DOW_EN3, MONTH_SHORT } from "./types";
import { getLateStatus, formatTime, isValidTimeInput, TIME_ERR_MSG, isManagerPos, moveRowFocus } from "./utils";
import { RosterTimeDropdown, TimeDropdown, AddEmployeeDialog } from "./shared-components";

export function AppRosterView({ year, month, storeId, storeName = "Grand Diamond" }: { year: number; month: number; storeId: string; storeName?: string }) {
  const { toast } = useToast();
  const [localEdits, setLocalEdits] = useState<Record<string, Record<string, string>>>({});
  const [savingRows, setSavingRows] = useState<Set<string>>(new Set());
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showAddEmp, setShowAddEmp] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<string>("");
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
    if (managers.length > 0 && !selectedEmp) {
      setSelectedEmp(managers[0].fullName);
    } else if (managers.length > 0 && !managers.some(e => e.fullName === selectedEmp)) {
      setSelectedEmp(managers[0].fullName);
    }
  }, [managers, selectedEmp]);

  const selectedManager = managers.find(e => e.fullName === selectedEmp);

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

  const inputClass = "w-full text-sm bg-transparent border border-gray-200 rounded p-1.5 focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900";

  if (isLoading) return <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  if (managers.length === 0) return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" className="gap-1.5" onClick={() => setShowAddEmp(true)}>
          <UserPlus className="h-4 w-4" />เพิ่มพนักงาน
        </Button>
      </div>
      <Card className="border-dashed shadow-sm">
        <CardContent className="flex flex-col items-center gap-3 py-16">
          <Users className="h-16 w-16 text-muted-foreground/30" />
          <p className="text-muted-foreground text-center text-sm font-medium">ยังไม่มีข้อมูลพนักงานในเดือนนี้</p>
          <p className="text-xs text-muted-foreground/70">กด "เพิ่มพนักงาน" เพื่อเริ่มกรอกข้อมูล หรือ Import Excel ก่อน</p>
          <Button size="sm" variant="outline" className="gap-1.5 mt-2" onClick={() => setShowAddEmp(true)}>
            <UserPlus className="h-4 w-4" />เพิ่มพนักงาน
          </Button>
        </CardContent>
      </Card>
      {showAddEmp && <AddEmployeeDialog year={year} month={month} storeId={storeId} onClose={() => setShowAddEmp(false)} onAdded={() => { qc.invalidateQueries({ queryKey: ["/api/attendance/records"] }); }} />}
    </div>
  );

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-lg border shadow-sm">
        <div className="flex-1 w-full max-w-sm">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">เลือกพนักงานระดับจัดการ (Manager)</label>
          <select 
            className="w-full p-2 border rounded-md bg-gray-50 text-gray-900 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={selectedEmp} 
            onChange={e => setSelectedEmp(e.target.value)}
          >
            {managers.map(e => (
              <option key={e.fullName} value={e.fullName}>{e.fullName} {e.nickName ? `(${e.nickName})` : ""}</option>
            ))}
          </select>
        </div>
        <Button size="sm" onClick={() => setShowAddEmp(true)} className="gap-2 whitespace-nowrap">
          <UserPlus className="h-4 w-4" /> เพิ่มพนักงาน
        </Button>
      </div>

      {showAddEmp && <AddEmployeeDialog year={year} month={month} storeId={storeId} onClose={() => setShowAddEmp(false)} onAdded={() => { qc.invalidateQueries({ queryKey: ["/api/attendance/records"] }); }} />}

      {!selectedManager ? (
        <Card className="border-dashed"><CardContent className="py-16 text-center text-gray-400">กรุณาเลือกพนักงาน</CardContent></Card>
      ) : (
        <div className="space-y-4">
          <Card className="bg-orange-50/50 border-orange-100 shadow-sm">
            <CardContent className="p-4 flex flex-col sm:flex-row gap-4 items-center sm:items-start">
              <div className="h-16 w-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-xl font-bold shrink-0">
                {selectedManager.nickName?.[0] || selectedManager.fullName[0]}
              </div>
              <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 text-sm w-full">
                <div className="col-span-2 md:col-span-1"><span className="text-gray-500">ชื่อ-นามสกุล:</span> <br/><strong className="text-gray-900">{selectedManager.fullName}</strong></div>
                <div><span className="text-gray-500">ชื่อเล่น:</span> <br/><strong className="text-gray-900">{selectedManager.nickName || "-"}</strong></div>
                <div><span className="text-gray-500">ตำแหน่ง:</span> <br/><strong className="text-gray-900">{selectedManager.position || "-"}</strong></div>
                <div><span className="text-gray-500">สาขา:</span> <br/><strong className="text-gray-900">{storeName}</strong></div>
                <div><span className="text-gray-500">ประจำเดือน:</span> <br/><strong className="text-gray-900">{monthShort} {year}</strong></div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b text-xs text-gray-500 flex justify-between">
              <span>คลิกเซลล์เพื่อแก้ไข — บันทึกอัตโนมัติเมื่อออก</span>
              <span>กด Escape เพื่อยกเลิก / Enter เพื่อเลื่อนลง</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-100 text-gray-600 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-3 py-3 font-semibold text-center w-12">วัน</th>
                    <th className="px-3 py-3 font-semibold text-center w-16">วันที่</th>
                    <th className="px-3 py-3 font-semibold text-center w-36">เวลาเข้า (Roster AC)</th>
                    <th className="px-3 py-3 font-semibold text-center w-36">เวลาเข้า (Aloha)</th>
                    <th className="px-3 py-3 font-semibold text-center w-36">เวลาออก (Aloha)</th>
                    <th className="px-3 py-3 font-semibold text-left">หมายเหตุ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {days.map(({ dateStr, d, dow, isValid }) => {
                    if (!isValid) return (
                      <tr key={`blank-${d}`} className="bg-gray-50 text-gray-300">
                        <td className="px-3 py-2 text-center" colSpan={2}>{d}</td>
                        <td colSpan={4}></td>
                      </tr>
                    );

                    const rec = recIdx[`${dateStr}:${selectedManager.fullName}`];
                    const k = `${dateStr}:${selectedManager.fullName}`;
                    const isSaving = savingRows.has(k);
                    const isWknd = dow === 0 || dow === 6;
                    
                    const rosterVal = getEdit(dateStr!, selectedManager.fullName, "rosterTime") ?? (rec?.rosterTime ? displayRoster(rec.rosterTime) : "");
                    const clockInVal = getEdit(dateStr!, selectedManager.fullName, "clockInTime") ?? (rec?.clockInTime ? formatTime(rec.clockInTime) : "");
                    const clockOutVal = getEdit(dateStr!, selectedManager.fullName, "clockOutTime") ?? (rec?.clockOutTime ? formatTime(rec.clockOutTime) : "");
                    const notesVal = getEdit(dateStr!, selectedManager.fullName, "notes") ?? (rec?.notes ?? "");
                    
                    const status = getLateStatus(rosterVal, clockInVal);
                    const inColor = status === "late" ? "text-red-600 font-medium" : status === "early" ? "text-blue-700" : status === "on-time" ? "text-green-700" : "text-gray-900";

                    return (
                      <tr key={dateStr} className={`hover:bg-gray-50 transition-colors ${isWknd ? 'bg-orange-50/30' : ''}`}>
                        <td className={`px-3 py-2 text-center whitespace-nowrap font-medium ${isWknd ? 'text-orange-600' : 'text-gray-600'}`}>{DOW_EN3[dow!]}</td>
                        <td className={`px-3 py-2 text-center whitespace-nowrap ${isWknd ? 'text-orange-600' : 'text-gray-600'}`}>{d}-{monthShort}</td>
                        <td className="px-3 py-2">
                          <div className="relative flex justify-center">
                            <RosterTimeDropdown value={rosterVal} onChange={v => setEdit(dateStr!, selectedManager.fullName, "rosterTime", v)} onBlur={() => saveRow(dateStr!, selectedManager)} />
                            {fieldErrors[`${k}:rosterTime`] && <span className="absolute -bottom-4 left-0 text-[10px] text-red-500 w-full text-center">{fieldErrors[`${k}:rosterTime`]}</span>}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <div className={`relative flex justify-center ${inColor}`}>
                            <TimeDropdown value={clockInVal} onChange={v => setEdit(dateStr!, selectedManager.fullName, "clockInTime", v)} onBlur={() => saveRow(dateStr!, selectedManager)} />
                            {fieldErrors[`${k}:clockInTime`] && <span className="absolute -bottom-4 left-0 text-[10px] text-red-500 w-full text-center">{fieldErrors[`${k}:clockInTime`]}</span>}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="relative flex justify-center">
                            <TimeDropdown value={clockOutVal} onChange={v => setEdit(dateStr!, selectedManager.fullName, "clockOutTime", v)} onBlur={() => saveRow(dateStr!, selectedManager)} />
                            {fieldErrors[`${k}:clockOutTime`] && <span className="absolute -bottom-4 left-0 text-[10px] text-red-500 w-full text-center">{fieldErrors[`${k}:clockOutTime`]}</span>}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          {isSaving ? <Loader2 className="h-4 w-4 animate-spin text-gray-400" /> : (
                            <input 
                              className={inputClass} 
                              placeholder="เพิ่มหมายเหตุ..."
                              value={notesVal} 
                              onChange={e => setEdit(dateStr!, selectedManager.fullName, "notes", e.target.value)} 
                              onBlur={() => saveRow(dateStr!, selectedManager)} 
                              onKeyDown={e => { if (e.key === "Escape") { e.preventDefault(); revertField(dateStr!, selectedManager.fullName, "notes"); (e.target as HTMLInputElement).blur(); return; } if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLInputElement).blur(); moveRowFocus(e, e.shiftKey ? -1 : 1); } }}
                            />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  
                  <tr><td colSpan={6} className="bg-gray-100 h-2 border-y border-gray-200"></td></tr>
                  <tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
                    <th colSpan={2} className="px-4 py-3 font-semibold text-right">Shift (กะการทำงาน)</th>
                    <th className="px-4 py-3 font-semibold text-center">เวลาเข้า (Time Roster)</th>
                    <th className="px-4 py-3 font-semibold text-center">รวมจำนวนวัน (Total)</th>
                    <th colSpan={2}></th>
                  </tr>
                  {SHIFT_DEFS.map(s => {
                    const total = shiftCount(selectedManager.fullName, s.h0, s.h1);
                    return (
                      <tr key={s.name} style={{ backgroundColor: s.bg, color: s.fg }} className="border-b border-gray-100 last:border-0">
                        <td colSpan={2} className="px-4 py-2 font-semibold text-right text-xs">{s.name}</td>
                        <td className="px-4 py-2 text-center text-xs">{s.label}</td>
                        <td className="px-4 py-2 text-center font-bold">{total > 0 ? total : "-"}</td>
                        <td colSpan={2}></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
