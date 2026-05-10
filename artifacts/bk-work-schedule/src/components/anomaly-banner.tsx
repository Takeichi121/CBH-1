import { useQuery, useMutation } from "@tanstack/react-query";
import { AlertTriangle, X, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

interface Anomaly {
  id: number;
  storeId: string;
  reportDate: string;
  field: string;
  expected: string;
  actual: string;
  deviation: string;
  severity: "warn" | "critical";
  reason: string;
}

const FIELD_LABEL: Record<string, string> = {
  actualSales: "ยอดขาย",
  transactionCount: "TC",
  actualHours: "ชั่วโมงแรงงาน",
  wasteRawDaily: "Waste Raw",
  cashOver: "Cash Over/Short",
  complaintCount: "เคสร้องเรียน",
  refundAmount: "ยอด Refund",
};

export function AnomalyBanner() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const token = typeof window !== "undefined" ? localStorage.getItem("bk_token") : null;

  const { data } = useQuery<{ ok: boolean; anomalies: Anomaly[] }>({
    queryKey: ["/api/chann/anomalies", token],
    queryFn: async () => {
      if (!token) return { ok: false, anomalies: [] };
      const url = `/api/chann/anomalies?token=${encodeURIComponent(token)}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) return { ok: false, anomalies: [] };
      return res.json();
    },
    enabled: !!token,
    refetchInterval: 60_000,
  });

  const ackMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("POST", `/api/chann/anomalies/${id}/acknowledge`, { token });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chann/anomalies"] });
      toast({ title: "รับทราบแล้ว", description: "ความผิดปกติถูกทำเครื่องหมายเรียบร้อย" });
    },
  });

  const items = data?.anomalies ?? [];
  if (items.length === 0) return null;

  const criticalCount = items.filter((a) => a.severity === "critical").length;
  const warnCount = items.length - criticalCount;
  const dominant: "critical" | "warn" = criticalCount > 0 ? "critical" : "warn";

  const colors = dominant === "critical"
    ? "bg-red-100 dark:bg-red-900/40 border-red-400 dark:border-red-700 text-red-900 dark:text-red-200"
    : "bg-amber-100 dark:bg-amber-900/40 border-amber-400 dark:border-amber-700 text-amber-900 dark:text-amber-200";

  return (
    <div className={`mb-3 rounded-lg border-2 ${colors}`} data-testid="banner-anomaly">
      <button
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left"
        onClick={() => setOpen(!open)}
        data-testid="button-anomaly-toggle"
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span className="font-medium text-sm">
            Chann พบความผิดปกติ {items.length} รายการ
            {criticalCount > 0 && <span className="ml-1">(วิกฤต {criticalCount}, เตือน {warnCount})</span>}
          </span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}
      </button>
      {open && (
        <div className="border-t border-current/20 px-3 py-2 space-y-2">
          {items.map((a) => (
            <div key={a.id} className="flex items-start justify-between gap-2 text-sm" data-testid={`item-anomaly-${a.id}`}>
              <div className="flex-1 min-w-0">
                <div className="font-medium">
                  {a.severity === "critical" ? "🔴" : "🟡"} {FIELD_LABEL[a.field] || a.field}
                  <span className="ml-1 opacity-70">— {a.reportDate}</span>
                </div>
                <div className="text-xs opacity-90">{a.reason}</div>
                <div className="text-xs opacity-70 mt-0.5">คาด {a.expected} จริง {a.actual} ({Number(a.deviation) >= 0 ? "+" : ""}{a.deviation}%)</div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 shrink-0"
                onClick={() => ackMutation.mutate(a.id)}
                disabled={ackMutation.isPending}
                data-testid={`button-ack-${a.id}`}
              >
                <X className="w-3.5 h-3.5 mr-1" />
                รับทราบ
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
