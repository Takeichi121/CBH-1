import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient as qc } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, UserPlus } from "lucide-react";
import { HH_OPTS, MM_OPTS } from "./utils";

export function TimeDropdown({ value: valueProp, onChange, onBlur, style, compact = false, testId }: {
  value: string | null | undefined;
  onChange: (v: string) => void;
  onBlur?: () => void;
  style?: React.CSSProperties;
  compact?: boolean;
  testId?: string;
}) {
  const value = valueProp ?? "";
  const [hh, mm] = value ? value.split(":") : ["", ""];
  const selCls = compact
    ? "bg-transparent border-0 focus:outline-none cursor-pointer text-center p-0 text-[11px]"
    : "h-8 text-sm border rounded px-1 bg-background text-foreground";

  const handleBlur = (e: React.FocusEvent<HTMLSpanElement>) => {
    if (onBlur && !e.currentTarget.contains(e.relatedTarget as Node)) onBlur();
  };

  return (
    <span className="inline-flex items-center" style={style} onBlur={handleBlur} data-testid={testId}>
      <select
        className={selCls}
        style={compact ? { width: 30 } : { width: 70 }}
        value={hh || ""}
        onChange={e => onChange(e.target.value && (mm || "00") ? `${e.target.value}:${mm || "00"}` : "")}
      >
        <option value="">--</option>
        {HH_OPTS.map(h => <option key={h} value={h}>{h}</option>)}
      </select>
      <span className={compact ? "text-[11px] leading-none" : "text-sm mx-0.5"}>:</span>
      <select
        className={selCls}
        style={compact ? { width: 30 } : { width: 70 }}
        value={mm || ""}
        onChange={e => onChange(hh && e.target.value ? `${hh}:${e.target.value}` : hh ? `${hh}:${e.target.value}` : "")}
      >
        <option value="">--</option>
        {MM_OPTS.map(m => <option key={m} value={m}>{m}</option>)}
      </select>
    </span>
  );
}

export function RosterTimeDropdown({ value: valueProp, onChange, onBlur, compact = false, testId }: {
  value: string | null | undefined;
  onChange: (v: string) => void;
  onBlur?: () => void;
  compact?: boolean;
  testId?: string;
}) {
  const value = valueProp ?? "";
  const isOff = value?.toUpperCase() === "OFF";
  const parts = isOff ? ["", ""] : (value || "").split(" - ");
  const startTime = parts[0]?.trim() || "";
  const endTime   = parts[1]?.trim() || "";

  const handleBlur = (e: React.FocusEvent<HTMLSpanElement>) => {
    if (onBlur && !e.currentTarget.contains(e.relatedTarget as Node)) onBlur();
  };

  return (
    <span className="inline-flex items-center flex-wrap gap-px" onBlur={handleBlur} data-testid={testId}>
      {isOff ? (
        <>
          <span style={{ color: "#CC0000", fontWeight: 700, fontSize: compact ? 11 : undefined }}>OFF</span>
          <button
            type="button"
            className={compact ? "text-[9px] text-muted-foreground ml-0.5 underline" : "text-xs text-muted-foreground ml-1 underline"}
            onClick={() => onChange("")}
          >×</button>
        </>
      ) : (
        <>
          <TimeDropdown
            compact={compact}
            value={startTime}
            onChange={v => onChange(v ? `${v} - ${endTime || "00:00"}` : endTime ? `00:00 - ${endTime}` : "")}
          />
          <span className={compact ? "text-[11px] leading-none mx-px" : "text-sm mx-1"}>–</span>
          <TimeDropdown
            compact={compact}
            value={endTime}
            onChange={v => onChange(startTime || v ? `${startTime || "00:00"} - ${v}` : "")}
          />
          <button
            type="button"
            title="ตั้งเป็น OFF"
            className={compact ? "text-[9px] text-red-500 ml-0.5 leading-none" : "text-xs text-red-500 ml-1"}
            onClick={() => onChange("OFF")}
          >OFF</button>
        </>
      )}
    </span>
  );
}

export function AddEmployeeDialog({
  year, month, storeId, onClose, onAdded,
}: { year: number; month: number; storeId: string; onClose: () => void; onAdded: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ fullName: "", nickName: "", position: "" });
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!form.fullName.trim()) {
      toast({ variant: "destructive", title: "Error", description: "กรุณาใส่ชื่อเต็มพนักงาน" });
      return;
    }
    setSaving(true);
    const date = `${year}-${String(month).padStart(2, "0")}-01`;
    try {
      const res = await apiRequest("POST", "/api/attendance/record", {
        token: localStorage.getItem("bk_token"),
        date, storeId,
        employeeFullName: form.fullName.trim(),
        employeeNickName: form.nickName.trim(),
        position: form.position.trim(),
        rosterTime: "", clockInTime: "", clockOutTime: "", notes: "",
      });
      const json = await res.json();
      if (json.ok) {
        toast({ title: "เพิ่มพนักงานแล้ว", description: `${form.fullName} ปรากฏในตารางแล้ว` });
        qc.invalidateQueries({ queryKey: ["/api/attendance/records"] });
        onAdded();
        onClose();
      } else {
        toast({ variant: "destructive", title: "Error", description: json.message });
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            เพิ่มพนักงานในตาราง
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div>
            <Label className="text-xs">ชื่อเต็ม *</Label>
            <Input value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} placeholder="Firstname Lastname" className="h-8 text-sm mt-1" data-testid="input-add-emp-fullname" autoFocus />
          </div>
          <div>
            <Label className="text-xs">ชื่อเล่น</Label>
            <Input value={form.nickName} onChange={e => setForm({ ...form, nickName: e.target.value })} placeholder="เช่น Jew, Non, Yo" className="h-8 text-sm mt-1" data-testid="input-add-emp-nickname" />
          </div>
          <div>
            <Label className="text-xs">ตำแหน่ง</Label>
            <Input value={form.position} onChange={e => setForm({ ...form, position: e.target.value })} placeholder="เช่น Shift Manager, Store Manager" className="h-8 text-sm mt-1" data-testid="input-add-emp-position" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>ยกเลิก</Button>
          <Button size="sm" onClick={handleAdd} disabled={saving} data-testid="button-add-emp-confirm">
            {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <UserPlus className="h-4 w-4 mr-1" />}
            เพิ่มพนักงาน
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
