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
import { cn } from "@/lib/utils";
import { Copy, Save, ChevronLeft, ChevronRight, FileText, Loader2, Check, ChevronsUpDown, X } from "lucide-react";
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks } from "date-fns";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

const BK_WASTE_CATEGORIES = [
  "BK-CR-Alcohol",
  "BK-CR-Bacon",
  "BK-CR-Bag",
  "BK-CR-BEEF",
  "BK-CR-Box(carton)",
  "BK-CR-BUN",
  "BK-CR-BUN EXPORT",
  "BK-CR-Carbonate",
  "BK-CR-CARBONATE-CAN",
  "BK-CR-CHEESY PATTIES",
  "BK-CR-CHEMICAL",
  "BK-CR-Chicken",
  "BK-CR-Cleaning",
  "BK-CR-Condiment",
  "BK-CR-Cup&Lid",
  "BK-CR-Dessert",
  "BK-CR-Fish",
  "BK-CR-Fried",
  "BK-CR-ICE CREAM",
  "BK-CR-INGREDIENT",
  "BK-CR-Napkin",
  "BK-CR-Non-Carbonate",
  "BK-CR-NON-CARBONATE - BOTTLE",
  "BK-CR-Paper",
  "BK-CR-PIE",
  "BK-CR-Plastic Utensil",
  "BK-CR-PORK",
  "BK-CR-Premium",
  "BK-CR-Shortening",
  "BK-CR-VEGETABLE",
  "BK-CR-VEGETABLE PATTY",
  "BK-CR-Wrap",
];

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

interface ItemSelection {
  itemName: string;
  detail: string;
}

const emptySelections: ItemSelection[] = [
  { itemName: "", detail: "" },
  { itemName: "", detail: "" },
  { itemName: "", detail: "" },
];

function parseSelectionsFromText(text: string): ItemSelection[] {
  if (!text) return [...emptySelections.map(s => ({ ...s }))];
  const lines = text.split("\n").filter(l => l.trim());
  const result: ItemSelection[] = [];
  for (let i = 0; i < 3; i++) {
    if (i < lines.length) {
      const line = lines[i].replace(/^\d+\.\s*/, "");
      const dashIdx = line.indexOf(" - ");
      if (dashIdx >= 0) {
        result.push({ itemName: line.substring(0, dashIdx).trim(), detail: line.substring(dashIdx + 3).trim() });
      } else {
        result.push({ itemName: line.trim(), detail: "" });
      }
    } else {
      result.push({ itemName: "", detail: "" });
    }
  }
  return result;
}

function selectionsToText(selections: ItemSelection[]): string {
  const active = selections.filter(r => r.itemName);
  if (active.length === 0) return "";
  return active
    .map((row, i) => `${i + 1}. ${row.itemName}${row.detail ? ` - ${row.detail}` : ""}`)
    .join("\n");
}

export default function WeeklySalesPage() {
  const { user } = useAuth();
  const { language } = useI18n();
  const { toast } = useToast();
  const token = localStorage.getItem("bk_token") || "";

  const [currentDate, setCurrentDate] = useState(new Date());
  const [form, setForm] = useState<WeeklyFormData>({ ...emptyForm });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasData, setHasData] = useState(false);

  const [wasteSelections, setWasteSelections] = useState<ItemSelection[]>([...emptySelections.map(s => ({ ...s }))]);
  const [unacSelections, setUnacSelections] = useState<ItemSelection[]>([...emptySelections.map(s => ({ ...s }))]);
  const [openCombobox, setOpenCombobox] = useState<{ type: 'waste' | 'unac'; index: number } | null>(null);

  const { start: weekStart, end: weekEnd } = getWeekRange(currentDate);
  const weekStartStr = format(weekStart, "yyyy-MM-dd");
  const weekEndStr = format(weekEnd, "yyyy-MM-dd");
  const weekLabel = `${format(weekStart, "dd/MM/yyyy")} - ${format(weekEnd, "dd/MM/yyyy")}`;

  useEffect(() => {
    loadWeeklyReport();
  }, [weekStartStr]);

  useEffect(() => {
    const text = selectionsToText(wasteSelections);
    setForm(prev => ({ ...prev, wasteTop3: text }));
  }, [wasteSelections]);

  useEffect(() => {
    const text = selectionsToText(unacSelections);
    setForm(prev => ({ ...prev, unaccountedTop3: text }));
  }, [unacSelections]);

  const loadWeeklyReport = async () => {
    setLoading(true);
    try {
      const res = await apiRequest("POST", "/api/sales/getWeeklyReport", {
        token,
        weekStartDate: weekStartStr,
      });
      const data = await res.json();
      if (data.ok && data.report) {
        const fmt = (v: string) => {
          if (!v) return "";
          const stripped = v.replace(/,/g, "");
          const num = stripped.replace(/[^0-9.]/g, "");
          if (!num || isNaN(Number(num))) return v;
          const parts = num.split(".");
          parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
          return parts.length > 1 ? parts[0] + "." + parts[1] : parts[0];
        };
        setForm({
          sale: fmt(data.report.sale || ""),
          tc: fmt(data.report.tc || ""),
          ta: fmt(data.report.ta || ""),
          cog: data.report.cog || "",
          waste: data.report.waste || "",
          unac: data.report.unac || "",
          sos: fmt(data.report.sos || ""),
          gsi: data.report.gsi || "",
          osat: data.report.osat || "",
          delivery: data.report.delivery || "",
          googleReview: data.report.googleReview || "",
          colMtd: data.report.colMtd || "",
          wasteTop3: data.report.wasteTop3 || "",
          unaccountedTop3: data.report.unaccountedTop3 || "",
        });
        setWasteSelections(parseSelectionsFromText(data.report.wasteTop3 || ""));
        setUnacSelections(parseSelectionsFromText(data.report.unaccountedTop3 || ""));
        setHasData(true);
      } else {
        setForm({ ...emptyForm });
        setWasteSelections([...emptySelections.map(s => ({ ...s }))]);
        setUnacSelections([...emptySelections.map(s => ({ ...s }))]);
        setHasData(false);
      }
    } catch {
      setForm({ ...emptyForm });
      setWasteSelections([...emptySelections.map(s => ({ ...s }))]);
      setUnacSelections([...emptySelections.map(s => ({ ...s }))]);
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

  const numericFields = new Set<keyof WeeklyFormData>(["sale", "tc", "ta", "sos"]);

  const formatWithCommas = (val: string) => {
    const stripped = val.replace(/,/g, "");
    const num = stripped.replace(/[^0-9.]/g, "");
    if (!num) return "";
    const parts = num.split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.length > 1 ? parts[0] + "." + parts[1] : parts[0];
  };

  const update = (field: keyof WeeklyFormData, value: string) => {
    const formatted = numericFields.has(field) ? formatWithCommas(value) : value;
    setForm((prev) => ({ ...prev, [field]: formatted }));
  };

  const updateSelection = (
    type: 'waste' | 'unac',
    index: number,
    field: 'itemName' | 'detail',
    value: string
  ) => {
    if (type === 'waste') {
      const newRows = [...wasteSelections];
      newRows[index] = { ...newRows[index], [field]: value };
      setWasteSelections(newRows);
    } else {
      const newRows = [...unacSelections];
      newRows[index] = { ...newRows[index], [field]: value };
      setUnacSelections(newRows);
    }
  };

  const clearSelection = (type: 'waste' | 'unac', index: number) => {
    if (type === 'waste') {
      const newRows = [...wasteSelections];
      newRows[index] = { itemName: "", detail: "" };
      setWasteSelections(newRows);
    } else {
      const newRows = [...unacSelections];
      newRows[index] = { itemName: "", detail: "" };
      setUnacSelections(newRows);
    }
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
    selectItem: language === "th" ? "เลือก Item..." : "Select Item...",
    searchItem: language === "th" ? "ค้นหา item..." : "Search item...",
    noItems: language === "th" ? "ไม่พบข้อมูล" : "No items found",
    detailPlaceholder: language === "th" ? "รายละเอียด (เช่น 500 บาท)" : "Detail (e.g. 500 Baht)",
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

  const renderTop3Selectors = (
    type: 'waste' | 'unac',
    selections: ItemSelection[]
  ) => {
    return (
      <div className="space-y-2 border rounded-md p-3 bg-muted/20">
        {selections.map((row, index) => (
          <div key={index} className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium w-4">{index + 1}.</span>

            <Popover
              open={openCombobox?.type === type && openCombobox?.index === index}
              onOpenChange={(isOpen) =>
                setOpenCombobox(isOpen ? { type, index } : null)
              }
            >
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  disabled={!isManager}
                  className={cn(
                    "w-[180px] sm:w-[200px] justify-between text-sm",
                    !row.itemName && "text-muted-foreground"
                  )}
                  data-testid={`button-${type}-item-${index}`}
                >
                  <span className="truncate">{row.itemName || t.selectItem}</span>
                  <ChevronsUpDown className="ml-1 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[220px] p-0" align="start">
                <Command>
                  <CommandInput placeholder={t.searchItem} />
                  <CommandList>
                    <CommandEmpty>{t.noItems}</CommandEmpty>
                    <CommandGroup>
                      {BK_WASTE_CATEGORIES.map((name) => (
                        <CommandItem
                          key={name}
                          value={name}
                          onSelect={(currentValue) => {
                            updateSelection(type, index, 'itemName', currentValue === row.itemName ? "" : currentValue);
                            setOpenCombobox(null);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              row.itemName === name ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            <Input
              placeholder={t.detailPlaceholder}
              value={row.detail}
              onChange={(e) => updateSelection(type, index, 'detail', e.target.value)}
              className="flex-1 min-w-[120px] text-sm"
              disabled={!isManager}
              data-testid={`input-${type}-detail-${index}`}
            />

            <div className={cn("w-9", !(row.itemName || row.detail) && "invisible")}>
              {(row.itemName || row.detail) && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => clearSelection(type, index)}
                  disabled={!isManager}
                  data-testid={`button-${type}-clear-${index}`}
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

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
                  {renderTop3Selectors('waste', wasteSelections)}
                </div>

                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-1 block">
                    {t.unaccountedTop3}
                  </Label>
                  {renderTop3Selectors('unac', unacSelections)}
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
