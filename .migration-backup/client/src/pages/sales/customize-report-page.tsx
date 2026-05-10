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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Save, RotateCcw, Eye, EyeOff } from "lucide-react";

type SectionEntry = { title?: string; hidden?: boolean };
type FieldEntry = { label?: string; hidden?: boolean };
type SectionState = Record<string, SectionEntry>;
type FieldState = Record<string, FieldEntry>;

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
  { key: "quality", th: "คุณภาพสินค้า", en: "Product Quality", color: "bg-emerald-500" },
] as const;

type FieldDef = { key: string; section: string; th: string; en: string };

const FIELD_DEFS: FieldDef[] = [
  // daily
  { key: "dailyTarget", section: "daily", th: "เป้าหมาย (TG)", en: "Target (TG)" },
  { key: "actualSales", section: "daily", th: "ยอดขายจริง (AC)", en: "Actual (AC)" },
  { key: "transactionCount", section: "daily", th: "จำนวนบิล (TC)", en: "Transactions (TC)" },
  { key: "cashDeposit", section: "daily", th: "Cash Deposit (฿)", en: "Cash Deposit (฿)" },
  // mtd
  { key: "mtdTarget", section: "mtd", th: "MTD Target", en: "MTD Target" },
  { key: "mtdActual", section: "mtd", th: "MTD Actual", en: "MTD Actual" },
  { key: "mtdTc", section: "mtd", th: "MTD TC", en: "MTD TC" },
  // inStore
  { key: "dineIn", section: "inStore", th: "Dine-In (฿)", en: "Dine-In (฿)" },
  { key: "dineInTc", section: "inStore", th: "Dine-In TC", en: "Dine-In TC" },
  { key: "takeAway", section: "inStore", th: "Take-Away (฿)", en: "Take-Away (฿)" },
  { key: "takeAwayTc", section: "inStore", th: "Take-Away TC", en: "Take-Away TC" },
  // delivery
  { key: "grabfood", section: "delivery", th: "GrabFood (฿)", en: "GrabFood (฿)" },
  { key: "lineman", section: "delivery", th: "LINE MAN (฿)", en: "LINE MAN (฿)" },
  { key: "shopee", section: "delivery", th: "ShopeeFood (฿)", en: "ShopeeFood (฿)" },
  { key: "bkapp", section: "delivery", th: "BK App (฿)", en: "BK App (฿)" },
  { key: "robin", section: "delivery", th: "Robin (฿)", en: "Robin (฿)" },
  { key: "gokoo", section: "delivery", th: "GoKOO (฿)", en: "GoKOO (฿)" },
  // performance
  { key: "osat", section: "performance", th: "OSAT (%)", en: "OSAT (%)" },
  { key: "surveyCount", section: "performance", th: "Survey Count", en: "Survey Count" },
  { key: "voidAmount", section: "performance", th: "Void Amount (฿)", en: "Void Amount (฿)" },
  { key: "voidCount", section: "performance", th: "Void Count", en: "Void Count" },
  { key: "sosDaily", section: "performance", th: "SOS รายวัน", en: "SOS Daily" },
  { key: "sosMtd", section: "performance", th: "SOS MTD", en: "SOS MTD" },
  // addons
  { key: "addCheeseCount", section: "addons", th: "Add Cheese #", en: "Add Cheese #" },
  { key: "vMealCount", section: "addons", th: "V-Meal #", en: "V-Meal #" },
  { key: "upSizeCount", section: "addons", th: "Up Size #", en: "Up Size #" },
  // waste
  { key: "wasteMealDaily", section: "waste", th: "Waste Meal รายวัน (฿)", en: "Waste Meal Daily (฿)" },
  { key: "wasteMealMtd", section: "waste", th: "Waste Meal MTD (฿)", en: "Waste Meal MTD (฿)" },
  // labor
  { key: "recommendHours", section: "labor", th: "Recommend Hours", en: "Recommend Hours" },
  { key: "rosterCommit", section: "labor", th: "Roster Commit", en: "Roster Commit" },
  { key: "actualHours", section: "labor", th: "Actual Hours", en: "Actual Hours" },
  // quality
  { key: "complaintCount", section: "quality", th: "จำนวนเคส Complaint", en: "Complaint Cases" },
  { key: "refundAmount", section: "quality", th: "ยอด Refund (฿)", en: "Refund Amount (฿)" },
];

export default function CustomizeReportPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { language } = useI18n();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [sections, setSections] = useState<SectionState>({});
  const [fields, setFields] = useState<FieldState>({});

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
    if (data?.fields) setFields(data.fields);
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async (payload: { sections: SectionState; fields: FieldState }) => {
      const token = localStorage.getItem("bk_token") || "";
      const res = await apiRequest("POST", "/api/settings/save-report-customization", {
        token,
        sections: payload.sections,
        fields: payload.fields,
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

  const updateSection = (key: string, patch: Partial<SectionEntry>) => {
    setSections((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  };
  const resetSection = (key: string) => {
    setSections((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };
  const updateField = (key: string, patch: Partial<FieldEntry>) => {
    setFields((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  };
  const resetField = (key: string) => {
    setFields((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSave = () => {
    const sectionPayload: SectionState = {};
    for (const def of SECTION_DEFS) {
      const entry = sections[def.key] || {};
      sectionPayload[def.key] = {
        title: typeof entry.title === "string" ? entry.title : "",
        hidden: !!entry.hidden,
      };
    }
    const fieldPayload: FieldState = {};
    for (const def of FIELD_DEFS) {
      const entry = fields[def.key] || {};
      fieldPayload[def.key] = {
        label: typeof entry.label === "string" ? entry.label : "",
        hidden: !!entry.hidden,
      };
    }
    saveMutation.mutate({ sections: sectionPayload, fields: fieldPayload });
  };

  const sectionHiddenCount = useMemo(
    () => SECTION_DEFS.filter((d) => sections[d.key]?.hidden).length,
    [sections]
  );
  const fieldHiddenCount = useMemo(
    () => FIELD_DEFS.filter((d) => fields[d.key]?.hidden).length,
    [fields]
  );

  const fieldsBySection = useMemo(() => {
    const grouped: Record<string, FieldDef[]> = {};
    for (const f of FIELD_DEFS) {
      (grouped[f.section] ||= []).push(f);
    }
    return grouped;
  }, []);

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
              ? "เปลี่ยนชื่อหรือซ่อนการ์ด/ฟิลด์ในหน้ากรอกยอดขายประจำวัน — เห็นผลกับผู้ใช้ทุกคน (แอดมินยังเห็นรายการที่ซ่อนเสมอ)"
              : "Rename or hide cards/fields on the Daily Sales page. Affects all users (admins always see hidden items)."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Tabs defaultValue="sections" className="w-full">
              <TabsList className="grid w-full grid-cols-2 max-w-sm" data-testid="tabs-customize">
                <TabsTrigger value="sections" data-testid="tab-sections">
                  {language === "th" ? "การ์ด" : "Cards"}
                </TabsTrigger>
                <TabsTrigger value="fields" data-testid="tab-fields">
                  {language === "th" ? "ฟิลด์" : "Fields"}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="sections" className="space-y-2 mt-3">
                <div className="text-xs text-muted-foreground" data-testid="text-hidden-count">
                  {language === "th"
                    ? `ซ่อนอยู่ ${sectionHiddenCount} จาก ${SECTION_DEFS.length} ใบ`
                    : `${sectionHiddenCount} of ${SECTION_DEFS.length} cards hidden`}
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
                            onChange={(e) => updateSection(def.key, { title: e.target.value })}
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
                              onCheckedChange={(v) => updateSection(def.key, { hidden: v })}
                              data-testid={`switch-hidden-${def.key}`}
                            />
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2"
                            onClick={() => resetSection(def.key)}
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
              </TabsContent>

              <TabsContent value="fields" className="space-y-3 mt-3">
                <div className="text-xs text-muted-foreground" data-testid="text-field-hidden-count">
                  {language === "th"
                    ? `ซ่อนอยู่ ${fieldHiddenCount} จาก ${FIELD_DEFS.length} ฟิลด์`
                    : `${fieldHiddenCount} of ${FIELD_DEFS.length} fields hidden`}
                </div>
                {SECTION_DEFS.map((sec) => {
                  const list = fieldsBySection[sec.key];
                  if (!list || list.length === 0) return null;
                  const sectionName = language === "th" ? sec.th : sec.en;
                  return (
                    <div key={sec.key} className="border rounded-lg overflow-hidden">
                      <div className="flex items-center gap-2 px-3 py-2 bg-muted/50">
                        <span className={`w-2.5 h-2.5 rounded-full ${sec.color}`} />
                        <span className="text-sm font-medium" data-testid={`text-section-name-${sec.key}`}>
                          {sectionName}
                        </span>
                        <span className="text-xs text-muted-foreground">({list.length})</span>
                      </div>
                      <div className="divide-y">
                        {list.map((def) => {
                          const entry = fields[def.key] || {};
                          const defaultName = language === "th" ? def.th : def.en;
                          const hidden = !!entry.hidden;
                          return (
                            <div
                              key={def.key}
                              className="flex flex-col md:flex-row md:items-center gap-2 p-2 hover-elevate"
                              data-testid={`row-field-${def.key}`}
                            >
                              <div className="md:w-48 shrink-0 min-w-0">
                                <div className="text-sm truncate" data-testid={`text-field-default-${def.key}`}>
                                  {defaultName}
                                </div>
                                <div className="text-xs text-muted-foreground truncate">{def.key}</div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <Input
                                  value={entry.label ?? ""}
                                  onChange={(e) => updateField(def.key, { label: e.target.value })}
                                  placeholder={defaultName}
                                  className="text-sm h-8"
                                  data-testid={`input-field-label-${def.key}`}
                                />
                              </div>
                              <div className="flex items-center gap-2 md:w-32 shrink-0 justify-end">
                                {hidden ? (
                                  <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
                                ) : (
                                  <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                                )}
                                <Switch
                                  checked={hidden}
                                  onCheckedChange={(v) => updateField(def.key, { hidden: v })}
                                  data-testid={`switch-field-hidden-${def.key}`}
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2"
                                  onClick={() => resetField(def.key)}
                                  data-testid={`button-field-reset-${def.key}`}
                                  title={language === "th" ? "คืนค่าเริ่มต้น" : "Reset to default"}
                                >
                                  <RotateCcw className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </TabsContent>
            </Tabs>
          )}

          {!isLoading && (
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
          )}
        </CardContent>
      </Card>
    </SalesLayout>
  );
}
