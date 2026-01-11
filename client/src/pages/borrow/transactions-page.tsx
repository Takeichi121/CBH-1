import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Check, Trash2, Clock, AlertCircle, ArrowDownToLine, ArrowUpFromLine, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { BorrowLayout } from "./borrow-layout";
import type { BorrowBranch, BorrowItem, BorrowTransaction } from "@shared/schema";

export default function BorrowTransactionsPage() {
  const { user, token } = useAuth();
  const { language } = useI18n();
  const { toast } = useToast();

  const [branches, setBranches] = useState<BorrowBranch[]>([]);
  const [items, setItems] = useState<BorrowItem[]>([]);
  const [transactions, setTransactions] = useState<BorrowTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newTx, setNewTx] = useState({
    txDate: format(new Date(), "yyyy-MM-dd"),
    dueDate: "",
    txType: "borrow_out" as "borrow_in" | "borrow_out",
    branch: "",
    item: "",
    qty: 1,
    unit: "",
    borrower: "",
    lender: "",
    note: "",
  });

  const isManager = user?.role === "manager" || user?.role === "admin";

  const labels = {
    title: language === "th" ? "รายการยืม-คืน" : "Transactions",
    addTx: language === "th" ? "เพิ่มรายการ" : "Add Transaction",
    date: language === "th" ? "วันที่" : "Date",
    dueDate: language === "th" ? "กำหนดคืน" : "Due Date",
    type: language === "th" ? "ประเภท" : "Type",
    branch: language === "th" ? "สาขา" : "Branch",
    item: language === "th" ? "รายการ" : "Item",
    qty: language === "th" ? "จำนวน" : "Qty",
    unit: language === "th" ? "หน่วย" : "Unit",
    borrower: language === "th" ? "ผู้ยืม" : "Borrower",
    lender: language === "th" ? "ผู้ให้ยืม" : "Lender",
    note: language === "th" ? "หมายเหตุ" : "Note",
    status: language === "th" ? "สถานะ" : "Status",
    actions: language === "th" ? "จัดการ" : "Actions",
    borrowIn: language === "th" ? "ยืมเข้า" : "Borrow In",
    borrowOut: language === "th" ? "ให้ยืม" : "Borrow Out",
    pending: language === "th" ? "รอคืน" : "Pending",
    returned: language === "th" ? "คืนแล้ว" : "Returned",
    overdue: language === "th" ? "เลยกำหนด" : "Overdue",
    save: language === "th" ? "บันทึก" : "Save",
    cancel: language === "th" ? "ยกเลิก" : "Cancel",
    noData: language === "th" ? "ยังไม่มีรายการ" : "No transactions yet",
    refresh: language === "th" ? "รีเฟรช" : "Refresh",
    markReturned: language === "th" ? "คืนแล้ว" : "Mark Returned",
    delete: language === "th" ? "ลบ" : "Delete",
  };

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [branchesRes, itemsRes, txRes] = await Promise.all([
        fetch("/api/borrow/branches", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) }),
        fetch("/api/borrow/items", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) }),
        fetch("/api/borrow/transactions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) }),
      ]);
      const branchesData = await branchesRes.json();
      const itemsData = await itemsRes.json();
      const txData = await txRes.json();
      if (branchesData.ok) setBranches(branchesData.branches);
      if (itemsData.ok) setItems(itemsData.items);
      if (txData.ok) setTransactions(txData.transactions);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleAddTransaction = async () => {
    if (!token || !newTx.branch || !newTx.item) return;
    try {
      const res = await fetch("/api/borrow/transactions/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, ...newTx }),
      });
      const data = await res.json();
      if (data.ok) {
        toast({ title: language === "th" ? "บันทึกสำเร็จ" : "Saved successfully" });
        setShowAddDialog(false);
        setNewTx({
          txDate: format(new Date(), "yyyy-MM-dd"),
          dueDate: "",
          txType: "borrow_out",
          branch: "",
          item: "",
          qty: 1,
          unit: "",
          borrower: "",
          lender: "",
          note: "",
        });
        fetchData();
      } else {
        toast({ title: data.message || "Error", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Network error", variant: "destructive" });
    }
  };

  const handleMarkReturned = async (txId: string) => {
    if (!token) return;
    try {
      const res = await fetch("/api/borrow/transactions/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, id: txId }),
      });
      const data = await res.json();
      if (data.ok) {
        toast({ title: language === "th" ? "บันทึกการคืนสำเร็จ" : "Marked as returned" });
        fetchData();
      }
    } catch (err) {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const handleDelete = async (txId: string) => {
    if (!token) return;
    if (!confirm(language === "th" ? "ต้องการลบรายการนี้?" : "Delete this transaction?")) return;
    try {
      const res = await fetch("/api/borrow/transactions/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, id: txId }),
      });
      const data = await res.json();
      if (data.ok) {
        toast({ title: language === "th" ? "ลบสำเร็จ" : "Deleted" });
        fetchData();
      } else {
        toast({ title: data.message || "Error", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const getStatusBadge = (tx: BorrowTransaction) => {
    if (tx.status === "done") {
      return <Badge variant="outline" className="text-green-600" data-testid={`badge-status-${tx.id}`}>{labels.returned}</Badge>;
    }
    if (tx.dueDate && new Date(tx.dueDate) < new Date()) {
      return <Badge variant="destructive" data-testid={`badge-status-${tx.id}`}>{labels.overdue}</Badge>;
    }
    return <Badge variant="secondary" data-testid={`badge-status-${tx.id}`}>{labels.pending}</Badge>;
  };

  return (
    <BorrowLayout>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-semibold">{labels.title}</h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchData} data-testid="button-refresh-transactions">
              <RefreshCw className="w-4 h-4 mr-1" />
              {labels.refresh}
            </Button>
            {isManager && (
              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" data-testid="button-add-transaction">
                    <Plus className="w-4 h-4 mr-1" />
                    {labels.addTx}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{labels.addTx}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>{labels.date}</Label>
                        <Input
                          type="date"
                          value={newTx.txDate}
                          onChange={(e) => setNewTx({ ...newTx, txDate: e.target.value })}
                          data-testid="input-tx-date"
                        />
                      </div>
                      <div>
                        <Label>{labels.dueDate}</Label>
                        <Input
                          type="date"
                          value={newTx.dueDate}
                          onChange={(e) => setNewTx({ ...newTx, dueDate: e.target.value })}
                          data-testid="input-tx-due-date"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>{labels.type}</Label>
                      <Select value={newTx.txType} onValueChange={(v) => setNewTx({ ...newTx, txType: v as any })}>
                        <SelectTrigger data-testid="select-tx-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="borrow_in">{labels.borrowIn}</SelectItem>
                          <SelectItem value="borrow_out">{labels.borrowOut}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>{labels.branch}</Label>
                      <Select value={newTx.branch} onValueChange={(v) => setNewTx({ ...newTx, branch: v })}>
                        <SelectTrigger data-testid="select-tx-branch">
                          <SelectValue placeholder={language === "th" ? "เลือกสาขา" : "Select branch"} />
                        </SelectTrigger>
                        <SelectContent>
                          {branches.map((b) => (
                            <SelectItem key={b.id} value={b.id}>{b.name} ({b.code})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>{labels.item}</Label>
                        <Select
                          value={newTx.item}
                          onValueChange={(v) => {
                            const item = items.find((i) => i.id === v);
                            setNewTx({ ...newTx, item: v, unit: item?.unit || "" });
                          }}
                        >
                          <SelectTrigger data-testid="select-tx-item">
                            <SelectValue placeholder={language === "th" ? "เลือกรายการ" : "Select item"} />
                          </SelectTrigger>
                          <SelectContent>
                            {items.map((i) => (
                              <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>{labels.qty}</Label>
                        <Input
                          type="number"
                          min={1}
                          value={newTx.qty}
                          onChange={(e) => setNewTx({ ...newTx, qty: parseInt(e.target.value) || 1 })}
                          data-testid="input-tx-qty"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>{labels.borrower}</Label>
                        <Input
                          value={newTx.borrower}
                          onChange={(e) => setNewTx({ ...newTx, borrower: e.target.value })}
                          data-testid="input-tx-borrower"
                        />
                      </div>
                      <div>
                        <Label>{labels.lender}</Label>
                        <Input
                          value={newTx.lender}
                          onChange={(e) => setNewTx({ ...newTx, lender: e.target.value })}
                          data-testid="input-tx-lender"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>{labels.note}</Label>
                      <Input
                        value={newTx.note}
                        onChange={(e) => setNewTx({ ...newTx, note: e.target.value })}
                        data-testid="input-tx-note"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowAddDialog(false)} data-testid="button-cancel-tx">
                      {labels.cancel}
                    </Button>
                    <Button onClick={handleAddTransaction} data-testid="button-save-tx">
                      {labels.save}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">Loading...</div>
            ) : transactions.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">{labels.noData}</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{labels.date}</TableHead>
                      <TableHead>{labels.type}</TableHead>
                      <TableHead>{labels.branch}</TableHead>
                      <TableHead>{labels.item}</TableHead>
                      <TableHead className="text-right">{labels.qty}</TableHead>
                      <TableHead>{labels.status}</TableHead>
                      <TableHead>{labels.actions}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((tx) => {
                      const branch = branches.find((b) => b.id === tx.branchId);
                      const item = items.find((i) => i.id === tx.itemId);
                      return (
                        <TableRow key={tx.id} data-testid={`row-tx-${tx.id}`}>
                          <TableCell>{tx.txDate}</TableCell>
                          <TableCell>
                            {tx.txType === "borrow_in" ? (
                              <span className="flex items-center gap-1 text-green-600">
                                <ArrowDownToLine className="w-4 h-4" />
                                {labels.borrowIn}
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-orange-600">
                                <ArrowUpFromLine className="w-4 h-4" />
                                {labels.borrowOut}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>{branch?.name || tx.branchId}</TableCell>
                          <TableCell>{item?.name || tx.itemId}</TableCell>
                          <TableCell className="text-right">{tx.qty} {tx.unit}</TableCell>
                          <TableCell>{getStatusBadge(tx)}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {tx.status === "pending" && isManager && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleMarkReturned(tx.id)}
                                  data-testid={`button-return-${tx.id}`}
                                >
                                  <Check className="w-4 h-4 mr-1" />
                                  {labels.markReturned}
                                </Button>
                              )}
                              {isManager && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDelete(tx.id)}
                                  data-testid={`button-delete-${tx.id}`}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </BorrowLayout>
  );
}
