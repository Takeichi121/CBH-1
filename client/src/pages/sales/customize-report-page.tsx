import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { SalesLayout } from "./sales-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Save, RotateCcw, Eye, EyeOff } from "lucide-react";

type SectionEntry = { title?: string; hidden?: boolean };
type SectionState = Record<string, SectionEntry>;

const SECTION_DEFS = [
  { key: "basicInfo", th: "ข้อมูลเบื้องต้น", en: "Basic Info", color: "bg-muted" },
  { key: "daily", th: "ยอดขายประจำวัน", en: "Daily", color: "bg-blue-500" },
  { key: "mtd", th: "ยอดขายสะสมเดือนนี้ (MTD)", en: "MTD", color: "bg-green-500" },
  { key: "inStore", th: "In-Store Sales", en: "In Store", color: "bg-orange-500" },
  { key: "delivery", th: "Delivery Sales", en: "Delivery", color: "bg-purple-500" },
  { key: "performance", th: "Performance", en: "Performance", color: "bg-yellow-500" },
  { key: "addons", th: "Add-ons", en: "Add-ons", color: "bg-pink-500" },
  { key: "waste", th: "Waste", en: "Waste", color: "bg-red-500" },
  { key: "labor", th: "Labor", en: "Labor", color: "bg-indigo-500" },
  { key: "roster", th: "Roster", en: "Roster", color: "bg-teal-500" },
] as const;

export default function CustomizeReportPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { language } = useI18n();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [sections, setSections] = useState<SectionState>({});

  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      setLocation("/sales");
    }
  }, [authLoading, isAdmin, setLocation]);

  const { data, isLoading } = useQuery({
    queryKey: ["/api/settings/get-report-customization"],
    queryFn: async () => {
      const token = localStorage.getItem("bk_token") || "";
      const res = await apiRequest("POST", "/api/settings/get-report-customization", { token });
      return res.json();
    },
  });

  useEffect(() => {
    if (data?.sections) setSections(data.sections);
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async (payload: SectionState) => {
      const token = localStorage.getItem("bk_token") || "";
      const res = await apiRequest("POST", "/api/settings/save-report-customization", {
        token,
        sections: payload,
      });
      return res.json();
    },
    onSuccess: (res) => {
      if (res?.ok) {
        toast({ title: language === "th" ? "บันทึกสำเร็จ" : "Saved successfully" });
        queryClient.invalidateQueries({ queryKey: ["/api/settings/get-report-customization"] });
      } else {
        toast({ variant: "destructive", title: res?.message || "Save failed" });
      }
    },
    onError: () => {
      toast({ variant: "destructive", title: language === "th" ? "บันทึกล้มเหลว" : "Save failed" });
    },
  });

  const updateEntry = (key: string, patch: Partial<SectionEntry>) => {
    setSections((prev) => ({
      ...prev,
      [key]: { ...prev[key], ...patch },
    }));
  };

  const resetEntry = (key: string) => {
    setSections((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSave = () => {
    const payload: SectionState = {};
    for (const def of SECTION_DEFS) {
      const entry = sections[def.key] || {};
      payload[def.key] = {
        title: typeof entry.title === "string" ? entry.title : "",
        hidden: !!entry.hidden,
      };
    }
    saveMutation.mutate(payload);
  };

  const hiddenCount = useMemo(
    () => SECTION_DEFS.filter((d) => sections[d.key]?.hidden).length,
    [sections]
  );

  if (authLoading || !isAdmin) {
    return (
      <SalesLayout>
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      </SalesLayout>
    );
  }

  return (
    <SalesLayout>
      <Card>
        <CardHeader>
          <CardTitle data-testid="text-page-title">
            {language === "th" ? "ปรับแต่งการ์ดรีพอร์ต" : "Customize Report Cards"}
          </CardTitle>
          <CardDescription>
            {language === "th"
              ? "เปลี่ยนชื่อหรือซ่อนการ์ดในหน้ากรอกยอดขายประจำวัน — เห็นผลกับผู้ใช้ทุกคน (แอดมินยังมองเห็นการ์ดที่ซ่อนเสมอ)"
              : "Rename or hide cards on the Daily Sales page. Affects all users (admins always see hidden cards)."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="text-xs text-muted-foreground" data-testid="text-hidden-count">
                {language === "th"
                  ? `ซ่อนอยู่ ${hiddenCount} จาก ${SECTION_DEFS.length} ใบ`
                  : `${hiddenCount} of ${SECTION_DEFS.length} cards hidden`}
              </div>

              <div className="space-y-2">
                {SECTION_DEFS.map((def) => {
                  const entry = sections[def.key] || {};
                  const defaultName = language === "th" ? def.th : def.en;
                  const hidden = !!entry.hidden;
                  return (
                    <div
                      key={def.key}
                      className="flex flex-col md:flex-row md:items-center gap-3 p-3 border rounded-lg hover-elevate"
                      data-testid={`row-section-${def.key}`}
                    >
                      <div className="flex items-center gap-2 md:w-56 shrink-0">
                        <span className={`w-3 h-3 rounded-full ${def.color}`} />
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate" data-testid={`text-default-${def.key}`}>
                            {defaultName}
                          </div>
                          <div className="text-xs text-muted-foreground">{def.key}</div>
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <Label className="text-xs text-muted-foreground">
                          {language === "th" ? "ชื่อใหม่ (เว้นว่าง = ใช้ค่าเดิม)" : "Custom title (blank = default)"}
                        </Label>
                        <Input
                          value={entry.title ?? ""}
                          onChange={(e) => updateEntry(def.key, { title: e.target.value })}
                          placeholder={defaultName}
                          className="text-sm"
                          data-testid={`input-title-${def.key}`}
                        />
                      </div>

                      <div className="flex items-center gap-2 md:w-40 shrink-0 justify-between md:justify-end">
                        <div className="flex items-center gap-2">
                          {hidden ? (
                            <EyeOff className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <Eye className="w-4 h-4 text-muted-foreground" />
                          )}
                          <Label className="text-xs">
                            {language === "th" ? "ซ่อน" : "Hide"}
                          </Label>
                          <Switch
                            checked={hidden}
                            onCheckedChange={(v) => updateEntry(def.key, { hidden: v })}
                            data-testid={`switch-hidden-${def.key}`}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2"
                          onClick={() => resetEntry(def.key)}
                          data-testid={`button-reset-${def.key}`}
                          title={language === "th" ? "คืนค่าเริ่มต้น" : "Reset to default"}
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="button"
                  onClick={handleSave}
                  disabled={saveMutation.isPending}
                  data-testid="button-save"
                >
                  {saveMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-1" />
                  ) : (
                    <Save className="w-4 h-4 mr-1" />
                  )}
                  {language === "th" ? "บันทึก" : "Save"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </SalesLayout>
  );
}
