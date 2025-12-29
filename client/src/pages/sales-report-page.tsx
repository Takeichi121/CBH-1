import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { BarChart3, DollarSign, Calculator, FileText, Copy, Check, TrendingUp, Clock, CreditCard, Banknote, Smartphone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

type PaymentMethod = "cash" | "card" | "promptpay" | "grab" | "lineman" | "foodpanda" | "robinhood";

interface SalesData {
  date: string;
  openingCash: number;
  closingCash: number;
  cardSales: number;
  promptpaySales: number;
  grabSales: number;
  linemanSales: number;
  foodpandaSales: number;
  robinhoodSales: number;
  voidAmount: number;
  discountAmount: number;
  note: string;
}

export default function SalesReportPage() {
  const { user } = useAuth();
  const { t, language } = useI18n();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const [salesData, setSalesData] = useState<SalesData>({
    date: format(new Date(), "yyyy-MM-dd"),
    openingCash: 0,
    closingCash: 0,
    cardSales: 0,
    promptpaySales: 0,
    grabSales: 0,
    linemanSales: 0,
    foodpandaSales: 0,
    robinhoodSales: 0,
    voidAmount: 0,
    discountAmount: 0,
    note: "",
  });

  const isManager = user?.role === "manager" || user?.role === "admin";

  if (!isManager) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="p-8 text-center">
          <CardTitle className="text-destructive mb-2">Access Denied</CardTitle>
          <CardDescription>Only managers can access this page</CardDescription>
        </Card>
      </div>
    );
  }

  const cashSales = salesData.closingCash - salesData.openingCash;
  const deliverySales = salesData.grabSales + salesData.linemanSales + salesData.foodpandaSales + salesData.robinhoodSales;
  const totalSales = cashSales + salesData.cardSales + salesData.promptpaySales + deliverySales;
  const netSales = totalSales - salesData.voidAmount - salesData.discountAmount;

  const handleChange = (field: keyof SalesData, value: string | number) => {
    setSalesData(prev => ({
      ...prev,
      [field]: typeof value === "string" && field !== "date" && field !== "note" ? parseFloat(value) || 0 : value
    }));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(amount);
  };

  const generateReport = () => {
    const dateDisplay = format(new Date(salesData.date), "dd/MM/yyyy");
    const report = `
Daily Sales Report - Grand Diamond
Date: ${dateDisplay}
================================

CASH
Opening: ${formatCurrency(salesData.openingCash)}
Closing: ${formatCurrency(salesData.closingCash)}
Cash Sales: ${formatCurrency(cashSales)}

CARD/E-PAYMENT
Card: ${formatCurrency(salesData.cardSales)}
PromptPay: ${formatCurrency(salesData.promptpaySales)}

DELIVERY
Grab: ${formatCurrency(salesData.grabSales)}
LINE MAN: ${formatCurrency(salesData.linemanSales)}
foodpanda: ${formatCurrency(salesData.foodpandaSales)}
Robinhood: ${formatCurrency(salesData.robinhoodSales)}
Delivery Total: ${formatCurrency(deliverySales)}

================================
Gross Sales: ${formatCurrency(totalSales)}
Void: -${formatCurrency(salesData.voidAmount)}
Discount: -${formatCurrency(salesData.discountAmount)}
================================
NET SALES: ${formatCurrency(netSales)}

${salesData.note ? `Note: ${salesData.note}` : ""}
    `.trim();

    return report;
  };

  const copyReport = async () => {
    const report = generateReport();
    await navigator.clipboard.writeText(report);
    setCopied(true);
    toast({ title: language === "th" ? "คัดลอกแล้ว" : "Copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  const labels = {
    title: language === "th" ? "สรุปยอดรายวัน" : "Daily Sales Report",
    subtitle: language === "th" ? "กรอกข้อมูลยอดขายประจำวัน" : "Enter daily sales data",
    date: language === "th" ? "วันที่" : "Date",
    cash: language === "th" ? "เงินสด" : "Cash",
    opening: language === "th" ? "เปิดร้าน" : "Opening",
    closing: language === "th" ? "ปิดร้าน" : "Closing",
    cashSales: language === "th" ? "ยอดขายเงินสด" : "Cash Sales",
    cardPayment: language === "th" ? "บัตร/โอน" : "Card/Transfer",
    card: language === "th" ? "บัตรเครดิต/เดบิต" : "Card",
    promptpay: "PromptPay",
    delivery: language === "th" ? "Delivery" : "Delivery",
    deductions: language === "th" ? "หักลบ" : "Deductions",
    void: language === "th" ? "ยกเลิก (Void)" : "Void",
    discount: language === "th" ? "ส่วนลด" : "Discount",
    summary: language === "th" ? "สรุป" : "Summary",
    grossSales: language === "th" ? "ยอดขายรวม" : "Gross Sales",
    netSales: language === "th" ? "ยอดขายสุทธิ" : "Net Sales",
    note: language === "th" ? "หมายเหตุ" : "Note",
    copyReport: language === "th" ? "คัดลอกรายงาน" : "Copy Report",
    copied: language === "th" ? "คัดลอกแล้ว" : "Copied",
    deliveryTotal: language === "th" ? "รวม Delivery" : "Delivery Total",
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">{labels.title}</h2>
            <p className="text-muted-foreground text-sm">{labels.subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={salesData.date}
            onChange={(e) => handleChange("date", e.target.value)}
            className="w-auto"
            data-testid="input-sales-date"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Banknote className="w-5 h-5 text-green-600" />
              {labels.cash}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{labels.opening}</Label>
              <Input
                type="number"
                value={salesData.openingCash || ""}
                onChange={(e) => handleChange("openingCash", e.target.value)}
                placeholder="0.00"
                data-testid="input-opening-cash"
              />
            </div>
            <div className="space-y-2">
              <Label>{labels.closing}</Label>
              <Input
                type="number"
                value={salesData.closingCash || ""}
                onChange={(e) => handleChange("closingCash", e.target.value)}
                placeholder="0.00"
                data-testid="input-closing-cash"
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{labels.cashSales}</span>
              <Badge variant={cashSales >= 0 ? "default" : "destructive"}>
                {formatCurrency(cashSales)}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CreditCard className="w-5 h-5 text-blue-600" />
              {labels.cardPayment}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{labels.card}</Label>
              <Input
                type="number"
                value={salesData.cardSales || ""}
                onChange={(e) => handleChange("cardSales", e.target.value)}
                placeholder="0.00"
                data-testid="input-card-sales"
              />
            </div>
            <div className="space-y-2">
              <Label>{labels.promptpay}</Label>
              <Input
                type="number"
                value={salesData.promptpaySales || ""}
                onChange={(e) => handleChange("promptpaySales", e.target.value)}
                placeholder="0.00"
                data-testid="input-promptpay-sales"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Smartphone className="w-5 h-5 text-orange-600" />
              {labels.delivery}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Grab</Label>
                <Input
                  type="number"
                  value={salesData.grabSales || ""}
                  onChange={(e) => handleChange("grabSales", e.target.value)}
                  placeholder="0.00"
                  data-testid="input-grab-sales"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">LINE MAN</Label>
                <Input
                  type="number"
                  value={salesData.linemanSales || ""}
                  onChange={(e) => handleChange("linemanSales", e.target.value)}
                  placeholder="0.00"
                  data-testid="input-lineman-sales"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">foodpanda</Label>
                <Input
                  type="number"
                  value={salesData.foodpandaSales || ""}
                  onChange={(e) => handleChange("foodpandaSales", e.target.value)}
                  placeholder="0.00"
                  data-testid="input-foodpanda-sales"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Robinhood</Label>
                <Input
                  type="number"
                  value={salesData.robinhoodSales || ""}
                  onChange={(e) => handleChange("robinhoodSales", e.target.value)}
                  placeholder="0.00"
                  data-testid="input-robinhood-sales"
                />
              </div>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{labels.deliveryTotal}</span>
              <Badge>{formatCurrency(deliverySales)}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calculator className="w-5 h-5 text-red-600" />
              {labels.deductions}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{labels.void}</Label>
              <Input
                type="number"
                value={salesData.voidAmount || ""}
                onChange={(e) => handleChange("voidAmount", e.target.value)}
                placeholder="0.00"
                data-testid="input-void"
              />
            </div>
            <div className="space-y-2">
              <Label>{labels.discount}</Label>
              <Input
                type="number"
                value={salesData.discountAmount || ""}
                onChange={(e) => handleChange("discountAmount", e.target.value)}
                placeholder="0.00"
                data-testid="input-discount"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="w-5 h-5 text-muted-foreground" />
              {labels.note}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              className="w-full min-h-[100px] p-3 rounded-md border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              value={salesData.note}
              onChange={(e) => handleChange("note", e.target.value)}
              placeholder={language === "th" ? "หมายเหตุเพิ่มเติม..." : "Additional notes..."}
              data-testid="input-note"
            />
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="w-5 h-5 text-primary" />
              {labels.summary}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{labels.cashSales}</span>
                <span className="font-medium">{formatCurrency(cashSales)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{labels.card}</span>
                <span className="font-medium">{formatCurrency(salesData.cardSales)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{labels.promptpay}</span>
                <span className="font-medium">{formatCurrency(salesData.promptpaySales)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{labels.delivery}</span>
                <span className="font-medium">{formatCurrency(deliverySales)}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{labels.grossSales}</span>
                <span className="font-bold">{formatCurrency(totalSales)}</span>
              </div>
              <div className="flex items-center justify-between text-destructive">
                <span className="text-sm">- {labels.void}/{labels.discount}</span>
                <span className="font-medium">-{formatCurrency(salesData.voidAmount + salesData.discountAmount)}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-primary">{labels.netSales}</span>
                <span className="text-xl font-bold text-primary">{formatCurrency(netSales)}</span>
              </div>
            </div>

            <Button 
              className="w-full" 
              onClick={copyReport}
              data-testid="button-copy-report"
            >
              {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
              {copied ? labels.copied : labels.copyReport}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
