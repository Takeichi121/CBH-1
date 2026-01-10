import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, AlertCircle, ArrowDownToLine, ArrowUpFromLine, RefreshCw, FileText, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BorrowLayout } from "./borrow-layout";
import { Link } from "wouter";
import type { BorrowTransaction } from "@shared/schema";
import { format } from "date-fns";

export default function BorrowDashboardPage() {
  const { user, token } = useAuth();
  const { language } = useI18n();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState({ totalTransactions: 0, totalBorrowIn: 0, totalBorrowOut: 0, overdueCount: 0 });
  const [recentTx, setRecentTx] = useState<BorrowTransaction[]>([]);

  const isManager = user?.role === "manager" || user?.role === "admin";

  const t = {
    title: language === "th" ? "ภาพรวม" : "Dashboard",
    subtitle: language === "th" ? "สรุปข้อมูลการยืม-คืน" : "Borrow tracker summary",
    totalTransactions: language === "th" ? "ธุรกรรมทั้งหมด" : "Total Transactions",
    borrowIn: language === "th" ? "ยืมเข้า" : "Borrow In",
    borrowOut: language === "th" ? "ยืมออก" : "Borrow Out",
    overdue: language === "th" ? "เกินกำหนด" : "Overdue",
    recentTransactions: language === "th" ? "รายการล่าสุด" : "Recent Transactions",
    viewAll: language === "th" ? "ดูทั้งหมด" : "View All",
    noTransactions: language === "th" ? "ยังไม่มีรายการ" : "No transactions yet",
    pending: language === "th" ? "รอดำเนินการ" : "Pending",
    done: language === "th" ? "เสร็จสิ้น" : "Done",
    accessDenied: language === "th" ? "ไม่มีสิทธิ์เข้าถึง" : "Access Denied",
    managersOnly: language === "th" ? "เฉพาะผู้จัดการเท่านั้น" : "Managers only",
  };

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [dashRes, txRes] = await Promise.all([
        fetch("/api/borrow/dashboard", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) }).then(r => r.json()),
        fetch("/api/borrow/transactions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, limit: 5 }) }).then(r => r.json()),
      ]);
      if (!dashRes.ok || !txRes.ok) {
        const errMsg = dashRes.message || txRes.message || "Failed to load";
        setError(errMsg);
        toast({ title: errMsg, variant: "destructive" });
        setLoading(false);
        return;
      }
      setMetrics({ totalTransactions: dashRes.totalTransactions, totalBorrowIn: dashRes.totalBorrowIn, totalBorrowOut: dashRes.totalBorrowOut, overdueCount: dashRes.overdueCount });
      setRecentTx(txRes.transactions);
    } catch (e) {
      console.error("Failed to fetch borrow dashboard", e);
      setError(language === "th" ? "เกิดข้อผิดพลาด" : "An error occurred");
    }
    setLoading(false);
  };

  useEffect(() => {
    if (token && isManager) fetchData();
  }, [token, isManager]);

  if (!isManager) {
    return (
      <BorrowLayout>
        <div className="flex items-center justify-center h-64">
          <Card className="p-8 text-center">
            <CardTitle className="text-destructive mb-2">{t.accessDenied}</CardTitle>
            <p className="text-muted-foreground">{t.managersOnly}</p>
          </Card>
        </div>
      </BorrowLayout>
    );
  }

  const isOverdue = (tx: BorrowTransaction) => {
    if (tx.status !== "pending" || !tx.dueDate) return false;
    return tx.dueDate < format(new Date(), "yyyy-MM-dd");
  };

  return (
    <BorrowLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Package className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{t.title}</h2>
              <p className="text-sm text-muted-foreground">{t.subtitle}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData} data-testid="button-refresh-dashboard">
            <RefreshCw className="w-4 h-4 mr-2" />
            {language === "th" ? "รีเฟรช" : "Refresh"}
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : error ? (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive/50" />
            <p className="text-destructive">{error}</p>
            <Button variant="outline" onClick={fetchData} className="mt-4">{language === "th" ? "ลองใหม่" : "Retry"}</Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm text-muted-foreground">{t.totalTransactions}</p>
                      <p className="text-2xl font-bold">{metrics.totalTransactions}</p>
                    </div>
                    <Package className="w-8 h-8 text-primary/20" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm text-muted-foreground">{t.borrowOut}</p>
                      <p className="text-2xl font-bold text-orange-600">{metrics.totalBorrowOut}</p>
                    </div>
                    <ArrowUpFromLine className="w-8 h-8 text-orange-600/20" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm text-muted-foreground">{t.borrowIn}</p>
                      <p className="text-2xl font-bold text-green-600">{metrics.totalBorrowIn}</p>
                    </div>
                    <ArrowDownToLine className="w-8 h-8 text-green-600/20" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm text-muted-foreground">{t.overdue}</p>
                      <p className="text-2xl font-bold text-destructive">{metrics.overdueCount}</p>
                    </div>
                    <AlertCircle className="w-8 h-8 text-destructive/20" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <CardTitle className="text-lg">{t.recentTransactions}</CardTitle>
                <Link href="/borrow/transactions">
                  <Button variant="ghost" size="sm" data-testid="link-view-all-tx">
                    {t.viewAll}
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {recentTx.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p>{t.noTransactions}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recentTx.map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-3">
                          {tx.txType === "borrow_out" ? (
                            <ArrowUpFromLine className="w-5 h-5 text-orange-600" />
                          ) : (
                            <ArrowDownToLine className="w-5 h-5 text-green-600" />
                          )}
                          <div>
                            <p className="font-medium">{tx.item}</p>
                            <p className="text-sm text-muted-foreground">{tx.branch} - {tx.qty} {tx.unit}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          {isOverdue(tx) ? (
                            <Badge variant="destructive">{t.overdue}</Badge>
                          ) : tx.status === "done" ? (
                            <Badge variant="secondary">{t.done}</Badge>
                          ) : (
                            <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />{t.pending}</Badge>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">{tx.txDate}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </BorrowLayout>
  );
}
