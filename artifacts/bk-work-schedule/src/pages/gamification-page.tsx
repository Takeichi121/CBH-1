import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Trophy, Star, Flame, Crown, Medal, Clock, CheckCircle,
  Target, Zap, Award, TrendingUp, Users, Calendar
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageTutorial, TutorialStep } from "@/components/page-tutorial";

interface ClockRecord {
  id: number; date: string; storeId: string;
  employeeFullName: string; employeeNickName: string | null;
  position: string | null; rosterTime: string | null;
  clockInTime: string | null; clockOutTime: string | null;
  notes: string | null;
}

const MONTH_TH = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน",
  "กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];

function parseTimeToMins(t: string | null | undefined): number {
  if (!t) return -1;
  const clean = t.trim();
  if (clean.includes("T")) {
    const d = new Date(clean);
    return d.getUTCHours() * 60 + d.getUTCMinutes();
  }
  const [h, m] = clean.split(":").map(Number);
  if (isNaN(h)) return -1;
  return h * 60 + (m || 0);
}

interface BadgeDef { id: string; label: string; emoji: string; colorClass: string; }
const BADGE_DEFS: BadgeDef[] = [
  { id: "nolate",    label: "ไม่มาสาย",    emoji: "✅", colorClass: "bg-green-500/15 text-green-600 border-green-500/30 dark:text-green-400" },
  { id: "punctual",  label: "ตรงต่อเวลา",   emoji: "⭐", colorClass: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30 dark:text-yellow-400" },
  { id: "earlybird", label: "เช้านก",       emoji: "🌅", colorClass: "bg-orange-500/15 text-orange-600 border-orange-500/30 dark:text-orange-400" },
  { id: "hardwork",  label: "ขยัน",         emoji: "🔥", colorClass: "bg-red-500/15 text-red-600 border-red-500/30 dark:text-red-400" },
  { id: "perfect",   label: "สมบูรณ์แบบ",   emoji: "💎", colorClass: "bg-blue-500/15 text-blue-600 border-blue-500/30 dark:text-blue-400" },
];

interface EmpStats {
  fullName: string; nickName: string | null; position: string | null;
  points: number; shiftCount: number;
  onTimeCount: number; earlyCount: number; lateCount: number; perfectDays: number;
  badges: BadgeDef[];
}

function calcStats(records: ClockRecord[]): EmpStats[] {
  const byEmp = new Map<string, ClockRecord[]>();
  records.forEach(r => {
    if (!byEmp.has(r.employeeFullName)) byEmp.set(r.employeeFullName, []);
    byEmp.get(r.employeeFullName)!.push(r);
  });

  return Array.from(byEmp.entries()).map(([name, recs]) => {
    let points = 0, onTimeCount = 0, earlyCount = 0, lateCount = 0, perfectDays = 0;

    recs.forEach(r => {
      if (!r.rosterTime || !r.clockInTime) return;
      const rosterStart = r.rosterTime.split(" - ")[0]?.trim();
      if (!rosterStart) return;
      const rosterMins = parseTimeToMins(rosterStart);
      const clockInMins = parseTimeToMins(r.clockInTime);
      if (rosterMins < 0 || clockInMins < 0) return;

      const diff = clockInMins - rosterMins;

      if (diff < -5) { earlyCount++; onTimeCount++; points += 10; }
      else if (diff <= 15) { onTimeCount++; points += 10; }
      else if (diff <= 30) { lateCount++; points += 5; }
      else { lateCount++; }

      if (r.clockOutTime) points += 3;
      if (diff <= 0 && r.clockOutTime) { perfectDays++; points += 5; }
    });

    const badges: BadgeDef[] = [];
    if (lateCount === 0 && recs.length > 0) badges.push(BADGE_DEFS[0]);
    if (onTimeCount >= 7) badges.push(BADGE_DEFS[1]);
    if (earlyCount >= 5) badges.push(BADGE_DEFS[2]);
    if (recs.length >= 20) badges.push(BADGE_DEFS[3]);
    if (perfectDays >= 10) badges.push(BADGE_DEFS[4]);

    return {
      fullName: name, nickName: recs[0].nickName, position: recs[0].position,
      points, shiftCount: recs.length, onTimeCount, earlyCount, lateCount, perfectDays, badges,
    };
  }).sort((a, b) => b.points - a.points);
}

const AVATAR_COLORS = [
  "bg-rose-500","bg-orange-500","bg-amber-500","bg-emerald-500",
  "bg-teal-500","bg-cyan-500","bg-blue-500","bg-violet-500","bg-purple-500","bg-pink-500",
];
function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[h];
}
function initials(name: string) {
  return name.split(" ").map(p => p[0] || "").join("").slice(0, 2).toUpperCase();
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    titleTh: "🏆 กระดานอันดับพนักงาน",
    descriptionTh: "หน้านี้แสดงคะแนนและอันดับของพนักงานแต่ละคน คำนวณจากข้อมูลการ clock-in/out จริง",
    icon: <Trophy className="w-10 h-10 text-yellow-500" />,
  },
  {
    titleTh: "⭐ ระบบคะแนน",
    descriptionTh: "คะแนนแต่ละวัน: มาตรงเวลา = +10 คะแนน | มาช้า < 30 นาที = +5 | clock-out ครบ = +3 | วันสมบูรณ์ = +5 โบนัส",
    icon: <Star className="w-10 h-10 text-primary" />,
  },
  {
    titleTh: "🎖️ เหรียญตรา (Badges)",
    descriptionTh: "พนักงานจะได้รับ badge พิเศษเมื่อทำตามเงื่อนไข เช่น ไม่มาสายทั้งเดือน มาตรงเวลา 7 ครั้ง+ หรือทำงาน 20 วันขึ้นไป",
    icon: <Award className="w-10 h-10 text-purple-500" />,
  },
  {
    titleTh: "📅 เลือกเดือนที่ต้องการดู",
    descriptionTh: "ใช้ตัวเลือกเดือน/ปีด้านบนเพื่อดูคะแนนและอันดับของเดือนนั้นๆ ข้อมูลจะอัพเดตอัตโนมัติ",
    icon: <Calendar className="w-10 h-10 text-blue-500" />,
  },
];

function PodiumCard({ emp, rank }: { emp: EmpStats; rank: number }) {
  const heights = { 1: "h-28", 2: "h-20", 3: "h-14" };
  const medals = { 1: "🥇", 2: "🥈", 3: "🥉" };
  const bgColors = {
    1: "from-yellow-500/20 to-amber-500/10 border-yellow-500/30",
    2: "from-slate-400/20 to-slate-500/10 border-slate-400/30",
    3: "from-orange-600/20 to-orange-700/10 border-orange-600/30",
  } as Record<number, string>;
  const textColors = { 1: "text-yellow-500", 2: "text-slate-400", 3: "text-orange-500" };

  return (
    <div className="flex flex-col items-center gap-2" data-testid={`card-podium-${rank}`}>
      <div className={cn(
        "relative w-24 sm:w-28 p-3 rounded-2xl border bg-gradient-to-b text-center transition-transform hover:scale-105",
        bgColors[rank]
      )}>
        <div className="text-2xl mb-1">{medals[rank as 1|2|3]}</div>
        <Avatar className="w-12 h-12 mx-auto mb-2">
          <AvatarFallback className={cn("text-white font-bold text-sm", avatarColor(emp.fullName))}>
            {initials(emp.fullName)}
          </AvatarFallback>
        </Avatar>
        <div className="text-xs font-bold leading-tight">{emp.nickName || emp.fullName.split(" ")[0]}</div>
        <div className={cn("text-lg font-black mt-1", textColors[rank as 1|2|3])}>{emp.points}</div>
        <div className="text-[10px] text-muted-foreground">คะแนน</div>
        {emp.badges.length > 0 && (
          <div className="flex flex-wrap justify-center gap-0.5 mt-1">
            {emp.badges.slice(0, 3).map(b => (
              <span key={b.id} className="text-xs">{b.emoji}</span>
            ))}
          </div>
        )}
      </div>
      <div className={cn("w-full rounded-t-lg", heights[rank as 1|2|3], bgColors[rank])} />
    </div>
  );
}

export default function GamificationPage() {
  const { user } = useAuth();
  const { language } = useI18n();
  const t = (th: string, en: string) => language === "th" ? th : en;

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const storeId = (user as any)?.storeId || "";
  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  const { data, isLoading } = useQuery<{ ok: boolean; records: ClockRecord[] }>({
    queryKey: ["/api/attendance/records", year, month, storeId],
    queryFn: async () => {
      const token = localStorage.getItem("bk_token") || "";
      const res = await fetch(
        `/api/attendance/records?year=${year}&month=${month}&storeId=${encodeURIComponent(storeId)}&token=${encodeURIComponent(token)}`
      );
      return res.json();
    },
  });
  const records: ClockRecord[] = data?.records ?? [];

  const stats = useMemo(() => calcStats(records), [records]);
  const maxPoints = stats[0]?.points || 1;
  const top3 = stats.slice(0, 3);
  const podiumOrder = top3.length >= 3 ? [top3[1], top3[0], top3[2]] : top3;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-4xl px-4 py-6 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-gamification-title">
              <Trophy className="h-6 w-6 text-yellow-500" />
              {t("กระดานอันดับ", "Staff Leaderboard")}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {t("คะแนนและผลงานประจำเดือน", "Monthly performance scores & badges")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={String(month)} onValueChange={v => setMonth(parseInt(v))}>
              <SelectTrigger className="h-9 w-36" data-testid="select-gamif-month">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTH_TH.map((m, i) => (
                  <SelectItem key={i+1} value={String(i+1)}>
                    {language === "th" ? m : ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][i]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(year)} onValueChange={v => setYear(parseInt(v))}>
              <SelectTrigger className="h-9 w-24" data-testid="select-gamif-year">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center space-y-2">
              <Trophy className="h-12 w-12 text-muted-foreground/40 mx-auto animate-pulse" />
              <p className="text-muted-foreground text-sm">กำลังโหลดข้อมูล...</p>
            </div>
          </div>
        )}

        {/* No data */}
        {!isLoading && stats.length === 0 && (
          <Card>
            <CardContent className="py-16 text-center">
              <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="font-medium text-muted-foreground">ไม่มีข้อมูลเวลาทำงานในเดือนนี้</p>
              <p className="text-sm text-muted-foreground/70 mt-1">กรุณา import ข้อมูลในหน้าเวลาทำงานก่อน</p>
            </CardContent>
          </Card>
        )}

        {/* Podium */}
        {!isLoading && top3.length >= 2 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Crown className="h-4 w-4 text-yellow-500" />
                {t("อันดับสูงสุด", "Top Performers")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-center gap-4 pt-2">
                {podiumOrder.map((emp, i) => {
                  const rank = emp === top3[0] ? 1 : emp === top3[1] ? 2 : 3;
                  return <PodiumCard key={emp.fullName} emp={emp} rank={rank} />;
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Full Leaderboard */}
        {!isLoading && stats.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                {t("ตารางอันดับทั้งหมด", "Full Rankings")}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {stats.map((emp, idx) => {
                  const rank = idx + 1;
                  const pct = Math.round((emp.points / maxPoints) * 100);
                  const isTop = rank <= 3;
                  return (
                    <div
                      key={emp.fullName}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors",
                        rank === 1 && "bg-yellow-500/5"
                      )}
                      data-testid={`row-leaderboard-${idx}`}
                    >
                      {/* Rank */}
                      <div className="w-8 text-center shrink-0">
                        {rank === 1 ? <span className="text-xl">🥇</span>
                          : rank === 2 ? <span className="text-xl">🥈</span>
                          : rank === 3 ? <span className="text-xl">🥉</span>
                          : <span className="text-sm font-bold text-muted-foreground">#{rank}</span>}
                      </div>

                      {/* Avatar */}
                      <Avatar className="w-9 h-9 shrink-0">
                        <AvatarFallback className={cn("text-white font-bold text-xs", avatarColor(emp.fullName))}>
                          {initials(emp.fullName)}
                        </AvatarFallback>
                      </Avatar>

                      {/* Name + stats */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm truncate">
                            {emp.nickName || emp.fullName.split(" ")[0]}
                          </span>
                          <span className="text-xs text-muted-foreground truncate hidden sm:block">
                            {emp.fullName}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <Progress value={pct} className="h-1.5 flex-1 max-w-[120px]" />
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {emp.shiftCount} กะ · ตรงเวลา {emp.onTimeCount}
                          </span>
                        </div>
                        {emp.badges.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {emp.badges.map(b => (
                              <span
                                key={b.id}
                                className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full border", b.colorClass)}
                                data-testid={`badge-${b.id}-${idx}`}
                              >
                                {b.emoji} {b.label}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Points */}
                      <div className="text-right shrink-0">
                        <div className={cn(
                          "text-lg font-black",
                          rank === 1 ? "text-yellow-500" : rank === 2 ? "text-slate-400" : rank === 3 ? "text-orange-500" : "text-foreground"
                        )}>
                          {emp.points}
                        </div>
                        <div className="text-[10px] text-muted-foreground">คะแนน</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Score breakdown legend */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              {t("วิธีคำนวณคะแนน", "How Points Are Calculated")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { icon: <CheckCircle className="h-4 w-4 text-green-500" />, label: "มาตรงเวลา (≤15 นาที)", pts: "+10" },
                { icon: <Clock className="h-4 w-4 text-yellow-500" />, label: "มาช้า < 30 นาที", pts: "+5" },
                { icon: <Target className="h-4 w-4 text-blue-500" />, label: "clock-out ครบ", pts: "+3" },
                { icon: <Star className="h-4 w-4 text-primary" />, label: "วันสมบูรณ์ (โบนัส)", pts: "+5" },
                { icon: <Flame className="h-4 w-4 text-orange-500" />, label: "มาก่อนเวลา 5+ นาที", pts: "+10" },
                { icon: <Medal className="h-4 w-4 text-purple-500" />, label: "badge พิเศษ", pts: "🎖️" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 bg-muted/40 rounded-lg p-2.5">
                  {item.icon}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-muted-foreground leading-tight">{item.label}</div>
                  </div>
                  <div className="text-sm font-bold text-primary">{item.pts}</div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t">
              <p className="text-xs font-medium text-muted-foreground mb-2">เงื่อนไข Badge:</p>
              <div className="flex flex-wrap gap-2">
                {BADGE_DEFS.map(b => (
                  <span key={b.id} className={cn("text-xs px-2 py-1 rounded-full border font-medium", b.colorClass)}>
                    {b.emoji} {b.label}
                  </span>
                ))}
              </div>
              <p className="text-xs text-muted-foreground/70 mt-2">
                ✅ ไม่มาสาย: 0 ครั้งสาย / ⭐ ตรงเวลา: 7+ ครั้ง / 🌅 เช้านก: มาก่อน 5+ ครั้ง / 🔥 ขยัน: 20+ กะ / 💎 สมบูรณ์: 10+ วันสมบูรณ์
              </p>
            </div>
          </CardContent>
        </Card>

      </div>

      <PageTutorial pageKey="gamification" steps={TUTORIAL_STEPS} />
    </div>
  );
}
