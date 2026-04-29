import { useState, useEffect } from "react";
import { useI18n } from "@/hooks/use-i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, Calendar, TrendingUp, TrendingDown, Loader2, Trash2, Pencil } from "lucide-react";
import { SalesLayout } from "./sales-layout";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function SalesReportsPage() {
  const { language } = useI18n();
  const { toast } = useToast();
  const [searchDate, setSearchDate] = useState("");
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [editingReport, setEditingReport] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    actualSales: "",
    transactionCount: "",
    dailyTarget: "",
  });
  const [saving, setSaving] = useState(false);

  const t = {
    title: language === "th" ? "รายงานย้อนหลัง" : "Reports History",
    subtitle: language === "th" ? "ดูและค้นหารายงานที่บันทึกไว้" : "View and search recorded reports",
    filterByDate: language === "th" ? "กรองตามวันที่" : "Filter by date",
    showAll: language === "th" ? "แสดงทั้งหมด" : "Show All",
    noReports: language === "th" ? "ยังไม่มีรายงาน" : "No reports yet",
    startRecording: language === "th" ? "เริ่มบันทึกยอดขายเพื่อดูรายงานที่นี่" : "Start recording sales to see reports here",
    goToForm: language === "th" ? "ไปกรอกข้อมูล" : "Go to form",
    items: language === "th" ? "รายการ" : "items",
    shift: language === "th" ? "กะ" : "Shift",
    actualSales: language === "th" ? "ยอดขายจริง" : "Actual Sales",
    target: language === "th" ? "เป้าหมาย" : "Target",
    variance: language === "th" ? "ส่วนต่าง" : "Variance",
    transactions: language === "th" ? "รายการ" : "Transactions",
    ofTarget: language === "th" ? "ของเป้า" : "of target",
    loading: language === "th" ? "กำลังโหลด..." : "Loading...",
    delete: language === "th" ? "ลบ" : "Delete",
    deleteConfirm: language === "th" ? "ยืนยันการลบ" : "Confirm Delete",
    deleteMessage: language === "th" ? "คุณต้องการลบรายงานนี้หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้" : "Are you sure you want to delete this report? This action cannot be undone.",
    cancel: language === "th" ? "ยกเลิก" : "Cancel",
    deleted: language === "th" ? "ลบรายงานสำเร็จ" : "Report deleted successfully",
    deleteFailed: language === "th" ? "ไม่สามารถลบรายงานได้" : "Failed to delete report",
    edit: language === "th" ? "แก้ไข" : "Edit",
    editReport: language === "th" ? "แก้ไขรายงาน" : "Edit Report",
    editDescription: language === "th" ? "แก้ไขข้อมูลยอดขายประจำวัน" : "Edit daily sales data",
    save: language === "th" ? "บันทึก" : "Save",
    saved: language === "th" ? "บันทึกสำเร็จ" : "Saved successfully",
    saveFailed: language === "th" ? "ไม่สามารถบันทึกได้" : "Failed to save",
  };

  const fetchReports = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("bk_token");
      const res = await apiRequest("POST", "/api/sales/getReports", { 
        token, 
        date: searchDate || undefined 
      });
      const data = await res.json();
      if (data.ok && data.reports) {
        setReports(data.reports);
      }
    } catch (error) {
      console.error("Failed to fetch reports:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [searchDate]);

  const handleDelete = async (id: number) => {
    try {
      setDeleting(id);
      const token = localStorage.getItem("bk_token");
      const res = await apiRequest("POST", "/api/sales/deleteReport", { token, id });
      const data = await res.json();
      if (data.ok) {
        toast({ title: t.deleted });
        setReports(reports.filter(r => r.id !== id));
      } else {
        toast({ variant: "destructive", title: t.deleteFailed, description: data.message });
      }
    } catch (error) {
      toast({ variant: "destructive", title: t.deleteFailed });
    } finally {
      setDeleting(null);
    }
  };

  const openEditDialog = (report: any) => {
    setEditingReport(report);
    setEditForm({
      actualSales: report.actualSales || "",
      transactionCount: report.transactionCount || "",
      dailyTarget: report.dailyTarget || "",
    });
  };

  const handleSaveEdit = async () => {
    if (!editingReport) return;
    try {
      setSaving(true);
      const token = localStorage.getItem("bk_token");
      const res = await apiRequest("POST", "/api/sales/updateReport", {
        token,
        id: editingReport.id,
        report: {
          actualSales: editForm.actualSales,
          transactionCount: editForm.transactionCount,
          dailyTarget: editForm.dailyTarget,
        }
      });
      const data = await res.json();
      if (data.ok) {
        toast({ title: t.saved });
        setReports(reports.map(r => r.id === editingReport.id ? { ...r, ...data.report } : r));
        setEditingReport(null);
      } else {
        toast({ variant: "destructive", title: t.saveFailed, description: data.message });
      }
    } catch (error) {
      toast({ variant: "destructive", title: t.saveFailed });
    } finally {
      setSaving(false);
    }
  };

  const filteredReports = searchDate 
    ? reports.filter(r => r.reportDate === searchDate)
    : reports;

  return (
    <SalesLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-reports-title">
            {t.title}
          </h1>
          <p className="text-muted-foreground text-sm">{t.subtitle}</p>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t.filterByDate}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 flex-wrap">
              <Input
                type="date"
                value={searchDate}
                onChange={(e) => setSearchDate(e.target.value)}
                className="max-w-xs"
                data-testid="input-search-date"
              />
              <Button
                variant="outline"
                onClick={() => setSearchDate("")}
                data-testid="button-show-all"
              >
                {t.showAll}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-lg">{t.title}</CardTitle>
              <div className="flex items-center gap-2">
                <Link href="/sales/customize">
                  <Button size="sm" variant="outline" data-testid="button-add-report-card">
                    + {language === "th" ? "เพิ่มการ์ดรีพอร์ต" : "Add report card"}
                  </Button>
                </Link>
                <Badge variant="secondary">
                  {filteredReports.length} {t.items}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">
                <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin" />
                <p className="text-sm">{t.loading}</p>
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">{t.noReports}</p>
                <p className="text-sm mb-4">{t.startRecording}</p>
                <Link href="/sales/daily">
                  <Button variant="outline" data-testid="button-go-record">
                    {t.goToForm}
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredReports.map((report: any) => {
                  const actual = parseFloat(report.actualSales) || 0;
                  const target = parseFloat(report.dailyTarget) || 0;
                  const achievement = target > 0 ? (actual / target) * 100 : 0;
                  const variance = actual - target;

                  return (
                    <Card key={report.id} className="border hover:border-primary/30 transition-colors">
                      <CardContent className="p-4 md:p-6">
                        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                          <div className="flex items-center gap-3">
                            <Calendar className="w-5 h-5 text-muted-foreground" />
                            <div>
                              <h3 className="font-semibold">{report.reportDate}</h3>
                              <p className="text-sm text-muted-foreground">
                                {t.shift}: {report.workShift} | {report.reportBy}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="secondary"
                              className={
                                achievement >= 100
                                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                  : achievement >= 90
                                    ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                                    : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                              }
                            >
                              {achievement.toFixed(1)}% {t.ofTarget}
                            </Badge>
                            <Button 
                              size="icon" 
                              variant="ghost"
                              onClick={() => openEditDialog(report)}
                              data-testid={`button-edit-report-${report.id}`}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="text-destructive hover:text-destructive"
                                  disabled={deleting === report.id}
                                  data-testid={`button-delete-report-${report.id}`}
                                >
                                  {deleting === report.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-4 h-4" />
                                  )}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>{t.deleteConfirm}</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {t.deleteMessage}
                                    <br />
                                    <span className="font-medium">
                                      {report.reportDate} - ฿{actual.toLocaleString()}
                                    </span>
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => handleDelete(report.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    {t.delete}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">{t.actualSales}</p>
                            <p className="text-xl font-bold">฿{actual.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">{t.target}</p>
                            <p className="text-lg font-medium">฿{target.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">{t.variance}</p>
                            <div className="flex items-center gap-1">
                              {variance >= 0 ? (
                                <TrendingUp className="w-4 h-4 text-green-500" />
                              ) : (
                                <TrendingDown className="w-4 h-4 text-red-500" />
                              )}
                              <p className={`text-lg font-medium ${variance >= 0 ? "text-green-600" : "text-red-600"}`}>
                                {variance >= 0 ? "+" : ""}฿{variance.toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">{t.transactions}</p>
                            <p className="text-lg font-medium">{parseInt(report.transactionCount || "0").toLocaleString()}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!editingReport} onOpenChange={(open) => !open && setEditingReport(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.editReport}</DialogTitle>
            <DialogDescription>
              {t.editDescription} - {editingReport?.reportDate}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-actualSales">{t.actualSales} (฿)</Label>
              <Input
                id="edit-actualSales"
                type="number"
                value={editForm.actualSales}
                onChange={(e) => setEditForm({ ...editForm, actualSales: e.target.value })}
                data-testid="input-edit-actual-sales"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-transactionCount">{t.transactions}</Label>
              <Input
                id="edit-transactionCount"
                type="number"
                value={editForm.transactionCount}
                onChange={(e) => setEditForm({ ...editForm, transactionCount: e.target.value })}
                data-testid="input-edit-transaction-count"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-dailyTarget">{t.target} (฿)</Label>
              <Input
                id="edit-dailyTarget"
                type="number"
                value={editForm.dailyTarget}
                onChange={(e) => setEditForm({ ...editForm, dailyTarget: e.target.value })}
                data-testid="input-edit-daily-target"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingReport(null)}>
              {t.cancel}
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SalesLayout>
  );
}
