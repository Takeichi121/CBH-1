import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient as qc } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, Loader2, UserPlus, UserCircle } from "lucide-react";
import { ClockRecord, DOW_TH, MONTH_SHORT } from "./types";
import { getLateStatus, formatTime, isValidTimeInput, TIME_ERR_MSG, isManagerPos, getPosPriority } from "./utils";
import { TimeDropdown, AddEmployeeDialog } from "./shared-components";

const ROSTER_OPTS = [
  "OFF", "05:00 - 14:00", "06:00 - 15:00", "07:00 - 16:00", "08:00 - 17:00",
  "09:00 - 18:00", "10:00 - 19:00", "11:00 - 20:00", "12:00 - 21:00",
  "13:00 - 22:00", "14:00 - 23:00", "15:00 - 00:00", "16:00 - 01:00",
  "20:00 - 05:00", "22:00 - 07:00",
];

export function EmployeeAppView({ year, month, storeId, storeName = "Grand Diamond" }: { year: number; month: number; storeId: string; storeName?: string }) {
  const { toast } = useToast();
  const [showAddEmp, setShowAddEmp] = useState(false);
  const [selectedEmpName, setSelectedEmpName] = useState<string>("");
  
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

  const empMap = new Map<string, { fullName: string; nickName: string | null; position: string | null }>();
  (empData?.employees || []).forEach(e => { if (isManagerPos(e.position)) empMap.set(e.fullName, e); });
  records.forEach(r => { if (isManagerPos(r.position) && !empMap.has(r.employeeFullName)) empMap.set(r.employeeFullName, { fullName: r.employeeFullName, nickName: r.employeeNickName, position: r.position }); });
  
  const employees = Array.from(empMap.values()).sort((a, b) => getPosPriority(a.position) - getPosPriority(b.position) || (a.nickName || a.fullName).localeCompare(b.nickName || b.fullName));

  useEffect(() => {
    if (employees.length > 0 && !selectedEmpName) {
      setSelectedEmpName(employees[0].fullName);
    }
  }, [employees, selectedEmpName]);

  const recIdx: Record<string, ClockRecord> = {};
  records.forEach(r => { recIdx[`${r.date}:${r.employeeFullName}`] = r; });

  const daysInMonth = new Date(year, month, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const d = i + 1;
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const dowIdx = new Date(dateStr + "T00:00:00").getDay();
    return { dateStr, d, dowIdx };
  });

  const selectedEmp = employees.find(e => e.fullName === selectedEmpName);

  const inputClass = "w-full text-sm bg-transparent border border-gray-200 rounded p-1.5 focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900";
  const selectClass = "w-full text-sm bg-transparent border border-gray-200 rounded p-1.5 focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900 cursor-pointer";

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-lg border shadow-sm">
        <div className="flex-1 w-full max-w-sm">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">เลือกพนักงาน (Employee)</label>
          <select 
            className="w-full p-2 border rounded-md bg-gray-50 text-gray-900 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={selectedEmpName}
            onChange={(e) => setSelectedEmpName(e.target.value)}
            disabled={isLoading || employees.length === 0}
          >
            {employees.length === 0 ? (
              <option value="">ไม่มีพนักงาน</option>
            ) : (
              employees.map(emp => (
                <option key={emp.fullName} value={emp.fullName}>
                  {emp.fullName} {emp.nickName ? `(${emp.nickName})` : ""}
                </option>
              ))
            )}
          </select>
        </div>
        <Button size="sm" onClick={() => setShowAddEmp(true)} className="gap-2 whitespace-nowrap">
          <UserPlus className="h-4 w-4" /> เพิ่มพนักงาน
        </Button>
      </div>

      {showAddEmp && (
        <AddEmployeeDialog year={year} month={month} storeId={storeId} onClose={() => setShowAddEmp(false)} onAdded={() => { setShowAddEmp(false); qc.invalidateQueries({ queryKey: ["/api/attendance/records"] }); }} />
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : !selectedEmp ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-16">
            <UserCircle className="h-16 w-16 text-muted-foreground/30" />
            <p className="text-muted-foreground text-center">ยังไม่มีข้อมูลพนักงาน หรือยังไม่ได้เลือกพนักงาน</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card className="bg-blue-50/50 border-blue-100 shadow-sm">
            <CardContent className="p-4 flex flex-col sm:flex-row gap-4 items-center sm:items-start">
              <div className="h-16 w-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xl font-bold shrink-0">
                {selectedEmp.nickName?.[0] || selectedEmp.fullName[0]}
              </div>
              <div className="flex-1 grid grid-cols-2 gap-x-4 gap-y-2 text-sm w-full">
                <div><span className="text-gray-500">ชื่อ-นามสกุล:</span> <strong className="text-gray-900">{selectedEmp.fullName}</strong></div>
                <div><span className="text-gray-500">ชื่อเล่น:</span> <strong className="text-gray-900">{selectedEmp.nickName || "-"}</strong></div>
                <div><span className="text-gray-500">ตำแหน่ง:</span> <strong className="text-gray-900">{selectedEmp.position || "-"}</strong></div>
                <div><span className="text-gray-500">สาขา:</span> <strong className="text-gray-900">{storeName}</strong></div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-100 text-gray-600 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3 font-semibold w-16">วัน/ที่</th>
                    <th className="px-4 py-3 font-semibold w-40">กะการทำงาน (Roster)</th>
                    <th className="px-4 py-3 font-semibold w-32">เวลาเข้า (In)</th>
                    <th className="px-4 py-3 font-semibold w-32">เวลาออก (Out)</th>
                    <th className="px-4 py-3 font-semibold">หมายเหตุ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {days.map(({ dateStr, d, dowIdx }) => {
                    const rec = recIdx[`${dateStr}:${selectedEmp.fullName}`];
                    const k = `${dateStr}:${selectedEmp.fullName}`;
                    const isSaving = savingRows.has(k);
                    const isWknd = dowIdx === 0 || dowIdx === 6;
                    
                    const rosterVal = getEdit(dateStr, selectedEmp.fullName, "rosterTime") ?? rec?.rosterTime ?? "";
                    const inVal = getEdit(dateStr, selectedEmp.fullName, "clockInTime") ?? (rec?.clockInTime ? formatTime(rec.clockInTime) : "");
                    const outVal = getEdit(dateStr, selectedEmp.fullName, "clockOutTime") ?? (rec?.clockOutTime ? formatTime(rec.clockOutTime) : "");
                    const notesVal = getEdit(dateStr, selectedEmp.fullName, "notes") ?? rec?.notes ?? "";
                    
                    const status = getLateStatus(rosterVal || null, inVal || null);
                    const inColor = status === "late" ? "text-red-600 font-medium" : status === "early" ? "text-blue-700" : status === "on-time" ? "text-green-700" : "text-gray-900";
                    
                    return (
                      <tr key={dateStr} className={`hover:bg-gray-50 transition-colors ${isWknd ? 'bg-orange-50/30' : ''}`}>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <span className={`font-medium ${isWknd ? 'text-orange-600' : 'text-gray-700'}`}>{DOW_TH[dowIdx]} {d}</span>
                        </td>
                        <td className="px-4 py-2">
                          <div className="relative">
                            <select 
                              className={`${selectClass} ${rosterVal === "OFF" ? "text-red-600 font-medium" : ""}`}
                              value={ROSTER_OPTS.includes(rosterVal) ? rosterVal : ""} 
                              onChange={e => setEditCell(dateStr, selectedEmp.fullName, "rosterTime", e.target.value)} 
                              onBlur={() => saveRow(dateStr, selectedEmp)} 
                              disabled={isSaving}
                            >
                              <option value="">— เลือกเวลา —</option>
                              {ROSTER_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
                              {rosterVal && !ROSTER_OPTS.includes(rosterVal) && <option value={rosterVal}>{rosterVal}</option>}
                            </select>
                            {fieldErrors[`${k}:rosterTime`] && <span className="absolute -bottom-4 left-0 text-[10px] text-red-500">{fieldErrors[`${k}:rosterTime`]}</span>}
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          {isSaving ? <Loader2 className="h-4 w-4 animate-spin text-gray-400 mx-auto" /> : (
                            <div className={`relative ${inColor}`}>
                              <TimeDropdown value={inVal} onChange={v => setEditCell(dateStr, selectedEmp.fullName, "clockInTime", v)} onBlur={() => saveRow(dateStr, selectedEmp)} />
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          {isSaving ? <Loader2 className="h-4 w-4 animate-spin text-gray-400 mx-auto" /> : (
                            <TimeDropdown value={outVal} onChange={v => setEditCell(dateStr, selectedEmp.fullName, "clockOutTime", v)} onBlur={() => saveRow(dateStr, selectedEmp)} />
                          )}
                        </td>
                        <td className="px-4 py-2">
                          {isSaving ? <Loader2 className="h-4 w-4 animate-spin text-gray-400 mx-auto" /> : (
                            <input 
                              className={inputClass} 
                              placeholder="เพิ่มหมายเหตุ..."
                              value={notesVal} 
                              onChange={e => setEditCell(dateStr, selectedEmp.fullName, "notes", e.target.value)} 
                              onBlur={() => saveRow(dateStr, selectedEmp)} 
                              onKeyDown={e => { if (e.key === "Escape") { e.preventDefault(); revertField(dateStr, selectedEmp.fullName, "notes"); (e.target as HTMLInputElement).blur(); } else if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLInputElement).blur(); } }} 
                            />
                          )}
                        </td>
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
