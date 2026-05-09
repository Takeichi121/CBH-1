import { useQuery } from "@tanstack/react-query";
import { useI18n } from "@/hooks/use-i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, CheckCircle2, Clock4, XCircle, CalendarX } from "lucide-react";
import { ClockRecord, MONTH_TH, MONTH_EN } from "./types";
import { getLateStatus } from "./utils";

interface EmpStats {
  fullName: string;
  nickName: string | null;
  position: string | null;
  total: number;
  onTime: number;
  early: number;
  late: number;
  absent: number;
}

export function OverviewTab({ year, month, storeId }: { year: number; month: number; storeId: string }) {
  const { language } = useI18n();
  const t = (en: string, th: string) => language === "th" ? th : en;

  const { data, isLoading } = useQuery<{ ok: boolean; records: ClockRecord[] }>({
    queryKey: ["/api/attendance/records", year, month, storeId],
    queryFn: async () => {
      const token = localStorage.getItem("bk_token") || "";
      const res = await fetch(`/api/attendance/records?token=${token}&year=${year}&month=${month}&storeId=${storeId}`);
      return res.json();
    },
  });

  const records = data?.records || [];

  const empMap = new Map<string, EmpStats>();
  records.forEach(r => {
    if (!empMap.has(r.employeeFullName)) {
      empMap.set(r.employeeFullName, {
        fullName: r.employeeFullName,
        nickName: r.employeeNickName,
        position: r.position,
        total: 0, onTime: 0, early: 0, late: 0, absent: 0,
      });
    }
    const s = empMap.get(r.employeeFullName)!;
    if (!r.rosterTime && !r.clockInTime) return;
    s.total++;
    const status = getLateStatus(r.rosterTime, r.clockInTime);
    if (status === "on-time") s.onTime++;
    else if (status === "early") s.early++;
    else if (status === "late") s.late++;
    else if (status === "absent") s.absent++;
  });

  const employees = Array.from(empMap.values()).sort((a, b) => a.fullName.localeCompare(b.fullName));
  const monthLabel = language === "th" ? MONTH_TH[month - 1] : MONTH_EN[month - 1];

  const teamTotal  = employees.reduce((acc, e) => acc + e.total, 0);
  const teamOnTime = employees.reduce((acc, e) => acc + e.onTime + e.early, 0);
  const teamLate   = employees.reduce((acc, e) => acc + e.late, 0);
  const teamAbsent = employees.reduce((acc, e) => acc + e.absent, 0);

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  if (employees.length === 0) return (
    <Card className="border-dashed shadow-sm">
      <CardContent className="flex flex-col items-center gap-3 py-16">
        <Users className="h-16 w-16 text-muted-foreground/30" />
        <p className="text-muted-foreground text-center font-medium">
          {t("No attendance data for this month.","ยังไม่มีข้อมูลการเข้างานสำหรับเดือนนี้")}
        </p>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            {t("All Employees Overview","ภาพรวมพนักงานทั้งหมด")}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {monthLabel} {year} — {employees.length} {t("employees","คน")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: Clock4,      label: t("Total Shifts","กะทั้งหมด"),       value: teamTotal,  color: "text-foreground",    bg: "bg-muted/40" },
          { icon: CheckCircle2,label: t("On Time / Early","ตรงเวลา / เร็ว"), value: teamOnTime, color: "text-green-500",     bg: "bg-green-500/10 border-green-500/20" },
          { icon: Clock4,      label: t("Late","สาย"),                     value: teamLate,   color: "text-red-500",       bg: "bg-red-500/10 border-red-500/20" },
          { icon: CalendarX,   label: t("Absent / No Data","ขาด / ไม่มีข้อมูล"), value: teamAbsent, color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/20" },
        ].map(s => (
          <Card key={s.label} className={`${s.bg} border shadow-sm`}>
            <CardContent className="p-4 flex flex-col items-center text-center gap-1">
              <s.icon className={`h-5 w-5 ${s.color} mb-1`} />
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wider sticky top-0">
              <tr>
                <th className="px-4 py-3 font-semibold">{t("Employee","พนักงาน")}</th>
                <th className="px-4 py-3 font-semibold">{t("Position","ตำแหน่ง")}</th>
                <th className="px-4 py-3 font-semibold text-center">{t("Shifts","กะ")}</th>
                <th className="px-4 py-3 font-semibold text-center">{t("On Time","ตรงเวลา")}</th>
                <th className="px-4 py-3 font-semibold text-center">{t("Late","สาย")}</th>
                <th className="px-4 py-3 font-semibold text-center">{t("Absent","ขาด")}</th>
                <th className="px-4 py-3 font-semibold">{t("Attendance","สถานะ")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {employees.map((emp) => {
                const onTimeRate = emp.total > 0 ? Math.round(((emp.onTime + emp.early) / emp.total) * 100) : 0;
                const lateRatio  = emp.total > 0 ? emp.late / emp.total : 0;
                const rowStatus  = lateRatio > 0.3 ? "bad" : lateRatio > 0.1 ? "warn" : "good";

                return (
                  <tr key={emp.fullName} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${rowStatus === "bad" ? "bg-red-500/15 text-red-500" : rowStatus === "warn" ? "bg-amber-500/15 text-amber-500" : "bg-blue-500/15 text-blue-500"}`}>
                          {(emp.nickName || emp.fullName)[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground leading-tight">{emp.fullName}</p>
                          {emp.nickName && <p className="text-xs text-muted-foreground">{emp.nickName}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{emp.position || "—"}</td>
                    <td className="px-4 py-3 text-center font-medium text-foreground">{emp.total || "—"}</td>
                    <td className="px-4 py-3 text-center">
                      {(emp.onTime + emp.early) > 0
                        ? <span className="text-green-500 font-medium">{emp.onTime + emp.early}</span>
                        : <span className="text-muted-foreground/40">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {emp.late > 0
                        ? <span className="text-red-500 font-bold">{emp.late}</span>
                        : <span className="text-muted-foreground/40">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {emp.absent > 0
                        ? <span className="text-amber-500 font-bold">{emp.absent}</span>
                        : <span className="text-muted-foreground/40">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {emp.total === 0 ? (
                        <Badge className="text-[10px] bg-muted/60 text-muted-foreground border-none">ไม่มีข้อมูล</Badge>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-muted/60 rounded-full overflow-hidden min-w-[60px]">
                            <div
                              className={`h-full rounded-full transition-all ${onTimeRate >= 80 ? "bg-green-500" : onTimeRate >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                              style={{ width: `${onTimeRate}%` }}
                            />
                          </div>
                          <span className={`text-xs font-semibold tabular-nums ${onTimeRate >= 80 ? "text-green-500" : onTimeRate >= 50 ? "text-amber-500" : "text-red-500"}`}>
                            {onTimeRate}%
                          </span>
                        </div>
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
  );
}
