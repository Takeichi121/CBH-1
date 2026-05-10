import { useState } from "react";
import { Sparkles, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface DraftField {
  value: string;
  confidence: "high" | "medium" | "low";
  source: string;
}

interface DailySalesDraft {
  reportDate: string;
  storeId: string;
  fields: Record<string, DraftField>;
  notes: string;
  hints: string[];
}

interface Props {
  reportDate: string;
  disabled?: boolean;
  onApply: (fields: Record<string, string>, notes: string) => void;
}

const FIELD_LABEL: Record<string, string> = {
  actualSales: "ยอดขายจริง",
  transactionCount: "TC",
  dailyTarget: "เป้ายอดขาย",
  mtdActual: "MTD Actual",
  mtdTarget: "MTD Target",
  mtdTc: "MTD TC",
  dineIn: "Dine-In",
  dineInTc: "Dine-In TC",
  takeAway: "Take-Away",
  takeAwayTc: "Take-Away TC",
  grabfood: "GrabFood",
  lineman: "LINEMAN",
  shopee: "Shopee",
  bkapp: "BK App",
  actualHours: "ชั่วโมงแรงงาน",
  recommendHours: "Recommend Hours",
};

const CONFIDENCE_COLOR: Record<string, string> = {
  high: "text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/40",
  medium: "text-yellow-700 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/40",
  low: "text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800",
};

export function ChannDraftButton({ reportDate, disabled, onApply }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<DailySalesDraft | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const fetchDraft = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("bk_token");
      const res = await apiRequest("POST", "/api/chann/draft-daily-sales", { token, date: reportDate });
      const json = await res.json();
      if (!json.ok) throw new Error(json.message || "ดึง draft ไม่สำเร็จ");
      setDraft(json.draft);
      setSelected(new Set(Object.keys(json.draft.fields)));
    } catch (e: any) {
      toast({ title: "ดึง draft ไม่สำเร็จ", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const apply = () => {
    if (!draft) return;
    const out: Record<string, string> = {};
    for (const k of selected) {
      if (draft.fields[k]) out[k] = draft.fields[k].value;
    }
    onApply(out, draft.notes);
    toast({ title: "เติมค่าจาก Chann แล้ว", description: `${Object.keys(out).length} ฟิลด์ — กรุณาตรวจสอบก่อนเซฟ` });
    setDraft(null);
  };

  const toggle = (key: string) => {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={fetchDraft}
        disabled={loading || disabled}
        className="gap-2 border-purple-400 text-purple-700 hover:bg-purple-50 dark:border-purple-600 dark:text-purple-300 dark:hover:bg-purple-950"
        data-testid="button-chann-draft"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        ดึง Draft จาก Chann
      </Button>

      <Dialog open={!!draft} onOpenChange={(o) => { if (!o) setDraft(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh]" data-testid="dialog-chann-draft">
          <DialogHeader>
            <DialogTitle>Draft จาก Chann — {draft?.reportDate}</DialogTitle>
          </DialogHeader>
          {draft && (
            <ScrollArea className="max-h-[55vh] pr-3">
              {draft.hints.length > 0 && (
                <div className="mb-3 p-3 rounded-md bg-blue-100 dark:bg-blue-900/40 border border-blue-300 dark:border-blue-700 text-sm space-y-1">
                  {draft.hints.map((h, i) => <div key={i} data-testid={`text-hint-${i}`}>💡 {h}</div>)}
                </div>
              )}
              {draft.notes && (
                <div className="mb-3 p-3 rounded-md bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-sm" data-testid="text-draft-notes">
                  <div className="font-medium mb-1">📝 สรุปจาก Chann</div>
                  <div className="text-xs opacity-90">{draft.notes}</div>
                </div>
              )}
              <div className="space-y-1">
                {Object.entries(draft.fields).map(([key, f]) => {
                  const isSelected = selected.has(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggle(key)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left text-sm border transition-colors ${
                        isSelected
                          ? "border-purple-400 bg-purple-50 dark:bg-purple-950/30"
                          : "border-gray-200 dark:border-gray-700 opacity-60"
                      }`}
                      data-testid={`row-draft-${key}`}
                    >
                      <CheckCircle2 className={`w-4 h-4 shrink-0 ${isSelected ? "text-purple-600" : "text-gray-300"}`} />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">{FIELD_LABEL[key] || key}</div>
                        <div className="text-xs opacity-70">{f.source}</div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="font-mono font-semibold">{f.value}</div>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${CONFIDENCE_COLOR[f.confidence]}`}>
                          {f.confidence}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDraft(null)} data-testid="button-draft-cancel">ยกเลิก</Button>
            <Button
              onClick={apply}
              disabled={selected.size === 0}
              className="bg-purple-600 hover:bg-purple-700 text-white"
              data-testid="button-draft-apply"
            >
              เติมในฟอร์ม ({selected.size} ฟิลด์)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
