import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { SalesLayout } from "./sales-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Copy, Save, ChevronLeft, ChevronRight, FileText, Loader2 } from "lucide-react";
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks } from "date-fns";

function getWeekRange(date: Date) {
  const start = startOfWeek(date, { weekStartsOn: 2 });
  const end = endOfWeek(date, { weekStartsOn: 2 });
  return { start, end };
}

interface WeeklyFormData {
  sale: string;
  tc: string;
  ta: string;
  cog: string;
  waste: string;
  unac: string;
  sos: string;
  gsi: string;
  osat: string;
  delivery: string;
  googleReview: string;
  colMtd: string;
  wasteTop3: string;
  unaccountedTop3: string;
}

const emptyForm: WeeklyFormData = {
  sale: "",
  tc: "",
  ta: "",
  cog: "",
  waste: "",
  unac: "",
  sos: "",
  gsi: "",
  osat: "",
  delivery: "",
  googleReview: "",
  colMtd: "",
  wasteTop3: "",
  unaccountedTop3: "",
};

export default function WeeklySalesPage() {
  const { user } = useAuth();
  const { language } = useI18n();
  const { toast } = useToast();
  const token = localStorage.getItem("token") || "";

  const [currentDate, setCurrentDate] = useState(new Date());
  const [form, setForm] = useState<WeeklyFormData>({ ...emptyForm });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasData, setHasData] = useState(false);

  const { start: weekStart, end: weekEnd } = getWeekRange(currentDate);
  const weekStartStr = format(weekStart, "yyyy-MM-dd");
  const weekEndStr = format(weekEnd, "yyyy-MM-dd");
  const weekLabel = `${format(weekStart, "dd/MM/yyyy")} - ${format(weekEnd, "dd/MM/yyyy")}`;

  useEffect(() => {
    loadWeeklyReport();
  }, [weekStartStr]);

  const loadWeeklyReport = async () => {
    setLoading(true);
    try {
      const res = await apiRequest("POST", "/api/sales/getWeeklyReport", {
        token,
        weekStartDate: weekStartStr,
      });
      const data = await res.json();
      if (data.ok && data.report) {
        setForm({
          sale: data.report.sale || "",
          tc: data.report.tc || "",
          ta: data.report.ta || "",
          cog: data.report.cog || "",
          waste: data.report.waste || "",
          unac: data.report.unac || "",
          sos: data.report.sos || "",
          gsi: data.report.gsi || "",
          osat: data.report.osat || "",
          delivery: data.report.delivery || "",
          googleReview: data.report.googleReview || "",
          colMtd: data.report.colMtd || "",
          wasteTop3: data.report.wasteTop3 || "",
          unaccountedTop3: data.report.unaccountedTop3 || "",
        });
        setHasData(true);
      } else {
        setForm({ ...emptyForm });
        setHasData(false);
      }
    } catch {
      setForm({ ...emptyForm });
      setHasData(false);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const res = await apiRequest("POST", "/api/sales/upsertWeeklyReport", {
        token,
        report: {
          weekStartDate: weekStartStr,
          weekEndDate: weekEndStr,
          reportBy: user.nickName || user.fullName || user.username,
          ...form,
        },
      });
      const data = await res.json();
      if (data.ok) {
        setHasData(true);
        toast({
          title: language === "th" ? "บันทึกสำเร็จ" : "Saved successfully",
        });
      } else {
        toast({ variant: "destructive", title: data.message || "Error" });
      }
    } catch {
      toast({ variant: "destructive", title: "Error saving report" });
    }
    setSaving(false);
  };

  const generateReportText = () => {
    const dateRange = weekLabel;
    const lines = [
      `Grand Diamond`,
      `Confirm Weekly ${dateRange}`,
      `Sale = ${form.sale}`,
      `TC = ${form.tc}`,
      `TA = ${form.ta}`,
      `COG = ${form.cog}`,
      `Waste = ${form.waste}`,
      `Unac = ${form.unac}`,
      `SOS = ${form.sos}`,
      `GSI = ${form.gsi}`,
      `OSAT = ${form.osat}`,
      `Delivery = ${form.delivery}`,
      `Google review = ${form.googleReview}`,
      `COL MTD = ${form.colMtd}`,
      ``,
      `Waste Top 3`,
      form.wasteTop3 || "-",
      ``,
      `Unaccounted Top 3`,
      form.unaccountedTop3 || "-",
    ];
    return lines.join("\n");
  };

  const handleCopy = async () => {
    const text = generateReportText();
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: language === "th" ? "คัดลอกแล้ว" : "Copied to clipboard",
      });
    } catch {
      toast({ variant: "destructive", title: "Failed to copy" });
    }
  };

  const update = (field: keyof WeeklyFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const isManager = user?.role === "manager" || user?.role === "admin";

  const t = {
    title: language === "th" ? "สรุปยอดรายสัปดาห์" : "Weekly Sales Report",
    subtitle: language === "th" ? "สรุปผลประจำสัปดาห์" : "Weekly performance summary",
    save: language === "th" ? "บันทึก" : "Save",
    copy: language === "th" ? "คัดลอก" : "Copy",
    preview: language === "th" ? "ตัวอย่างข้อความ" : "Preview Text",
    wasteTop3: language === "th" ? "Waste Top 3 รายการ" : "Waste Top 3 Items",
    unaccountedTop3: language === "th" ? "Unaccounted Top 3 รายการ" : "Unaccounted Top 3 Items",
    noPermission: language === "th" ? "เฉพาะผู้จัดการ" : "Manager only",
  };

  const fields: Array<{ key: keyof WeeklyFormData; label: string; placeholder?: string }> = [
    { key: "sale", label: "Sale", placeholder: "e.g. 750,000" },
    { key: "tc", label: "TC", placeholder: "e.g. 2,500" },
    { key: "ta", label: "TA", placeholder: "e.g. 300" },
    { key: "cog", label: "COG", placeholder: "e.g. 35%" },
    { key: "waste", label: "Waste", placeholder: "e.g. 1.2%" },
    { key: "unac", label: "Unac", placeholder: "e.g. 0.5%" },
    { key: "sos", label: "SOS", placeholder: "e.g. 180" },
    { key: "gsi", label: "GSI", placeholder: "e.g. 95%" },
    { key: "osat", label: "OSAT", placeholder: "e.g. 4.5/5" },
    { key: "delivery", label: "Delivery", placeholder: "e.g. 25%" },
    { key: "googleReview", label: "Google Review", placeholder: "e.g. 4.3" },
    { key: "colMtd", label: "COL MTD", placeholder: "e.g. 18%" },
  ];

  return (
    <SalesLayout>
      <div className="max-w-3xl mx-auto space-y-4 pb-20">
        <div>
          <h2 className="text-xl font-bold" data-testid="text-weekly-title">{t.title}</h2>
          <p className="text-sm text-muted-foreground">{t.subtitle}</p>
        </div>

        <div className="flex items-center justify-between gap-2">
          <Button
            size="icon"
            variant="outline"
            onClick={() => setCurrentDate(subWeeks(currentDate, 1))}
            data-testid="button-prev-week"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="text-center">
            <div className="font-semibold text-sm" data-testid="text-week-range">{weekLabel}</div>
            <div className="text-xs text-muted-foreground">
              {language === "th" ? "สัปดาห์ อ.-จ." : "Week Tue-Mon"}
            </div>
          </div>
          <Button
            size="icon"
            variant="outline"
            onClick={() => setCurrentDate(addWeeks(currentDate, 1))}
            data-testid="button-next-week"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  {language === "th" ? "กรอกข้อมูล" : "Enter Data"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {fields.map((f) => (
                    <div key={f.key}>
                      <Label className="text-xs font-medium text-muted-foreground mb-1 block">
                        {f.label}
                      </Label>
                      <Input
                        value={form[f.key]}
                        onChange={(e) => update(f.key, e.target.value)}
                        placeholder={f.placeholder}
                        className="text-sm"
                        disabled={!isManager}
                        data-testid={`input-weekly-${f.key}`}
                      />
                    </div>
                  ))}
                </div>

                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-1 block">
                    {t.wasteTop3}
                  </Label>
                  <Textarea
                    value={form.wasteTop3}
                    onChange={(e) => update("wasteTop3", e.target.value)}
                    placeholder={language === "th" ? "รายการ Waste Top 3 (บรรทัดละรายการ)" : "Waste Top 3 items (one per line)"}
                    rows={3}
                    className="text-sm"
                    disabled={!isManager}
                    data-testid="input-weekly-wasteTop3"
                  />
                </div>

                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-1 block">
                    {t.unaccountedTop3}
                  </Label>
                  <Textarea
                    value={form.unaccountedTop3}
                    onChange={(e) => update("unaccountedTop3", e.target.value)}
                    placeholder={language === "th" ? "รายการ Unaccounted Top 3 (บรรทัดละรายการ)" : "Unaccounted Top 3 items (one per line)"}
                    rows={3}
                    className="text-sm"
                    disabled={!isManager}
                    data-testid="input-weekly-unaccountedTop3"
                  />
                </div>

                {isManager && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button onClick={handleSave} disabled={saving} className="gap-2" data-testid="button-save-weekly">
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      {t.save}
                    </Button>
                    <Button variant="outline" onClick={handleCopy} className="gap-2" data-testid="button-copy-weekly">
                      <Copy className="w-4 h-4" />
                      {t.copy}
                    </Button>
                  </div>
                )}

                {!isManager && (
                  <p className="text-xs text-muted-foreground italic">{t.noPermission}</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{t.preview}</CardTitle>
              </CardHeader>
              <CardContent>
                <pre
                  className="whitespace-pre-wrap text-sm bg-muted/50 rounded-md p-4 font-mono leading-relaxed"
                  data-testid="text-weekly-preview"
                >
                  {generateReportText()}
                </pre>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </SalesLayout>
  );
}
