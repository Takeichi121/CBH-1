import { useState, useEffect, useMemo } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Package, Plus, Check, Trash2, Clock, AlertCircle, ArrowDownToLine, ArrowUpFromLine, Settings, RefreshCw, Search, ChevronsUpDown, BarChart3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format, subDays, startOfDay, isSameDay } from "date-fns";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line
} from "recharts";
import type { BorrowBranch, BorrowItem, BorrowTransaction } from "@shared/schema";

// ✅ Import ปุ่มสำหรับดึงไฟล์ Excel/CSV
import ImportExcelButton from "./components/ImportExcelButton";

export default function BorrowTrackerPage() {
  const { user, token } = useAuth();
  const { language } = useI18n();
  const { toast } = useToast();

  const [branches, setBranches] = useState<BorrowBranch[]>([]);
  const [items, setItems] = useState<BorrowItem[]>([]);
  const [transactions, setTransactions] = useState<BorrowTransaction[]>([]);
  const [dashboardMetrics, setDashboardMetrics] = useState({ totalTransactions: 0, totalBorrowIn: 0, totalBorrowOut: 0, overdueCount: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [branchSearchOpen, setBranchSearchOpen] = useState(false);
  const [itemSearchOpen, setItemSearchOpen] = useState(false);
  const [unitSearchOpen, setUnitSearchOpen] = useState(false);
  const [newBranch, setNewBranch] = useState({ name: "", code: "" });
  const [newItem, setNewItem] = useState({ name: "", code: "", unit: "" });
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
    title: language === "th" ? "ระบบยืม-คืนอุปกรณ์" : "Borrow Tracker",
    subtitle: language === "th" ? "จัดการการยืม-คืนอุปกรณ์ระหว่างสาขา" : "Manage equipment between branches",
    addTransaction: language === "th" ? "เพิ่มรายการ" : "Add Transaction",
    settings: language === "th" ? "ตั้งค่า" : "Settings",
    branches: language === "th" ? "สาขา" : "Branches",
    items: language === "th" ? "รายการ" : "Items",
    transactions: language === "th" ? "ธุรกรรม" : "Transactions",
    borrowIn: language === "th" ? "ยืมเข้า" : "Borrow In",
    borrowOut: language === "th" ? "ยืมออก" : "Borrow Out",
    pending: language === "th" ? "รอดำเนินการ" : "Pending",
    done: language === "th" ? "เสร็จสิ้น" : "Done",
    overdue: language === "th" ? "เกินกำหนด" : "Overdue",
    branch: language === "th" ? "สาขา" : "Branch",
    item: language === "th" ? "รายการ" : "Item",
    qty: language === "th" ? "จำนวน" : "Qty",
    unit: language === "th" ? "หน่วย" : "Unit",
    txDate: language === "th" ? "วันที่" : "Date",
    dueDate: language === "th" ? "กำหนดคืน" : "Due Date",
    borrower: language === "th" ? "ผู้ยืม" : "Borrower",
    lender: language === "th" ? "ผู้ให้ยืม" : "Lender",
    note: language === "th" ? "หมายเหตุ" : "Note",
    status: language === "th" ? "สถานะ" : "Status",
    type: language === "th" ? "ประเภท" : "Type",
    actions: language === "th" ? "จัดการ" : "Actions",
    save: language === "th" ? "บันทึก" : "Save",
    cancel: language === "th" ? "ยกเลิก" : "Cancel",
    add: language === "th" ? "เพิ่ม" : "Add",
    delete: language === "th" ? "ลบ" : "Delete",
    name: language === "th" ? "ชื่อ" : "Name",
    code: language === "th" ? "รหัส" : "Code",
    noItems: language === "th" ? "ไม่มีรายการ" : "No items",
    totalTransactions: language === "th" ? "ธุรกรรมทั้งหมด" : "Total Transactions",
    accessDenied: language === "th" ? "ไม่มีสิทธิ์เข้าถึง" : "Access Denied",
    managersOnly: language === "th" ? "เฉพาะผู้จัดการเท่านั้น" : "Managers only",
    importBranches: language === "th" ? "นำเข้าสาขา (Excel/CSV)" : "Import Branches",
    importItems: language === "th" ? "นำเข้ารายการ (Excel/CSV)" : "Import Items",
  };

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [branchRes, itemRes, txRes, dashRes] = await Promise.all([
        fetch("/api/borrow/branches", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) }).then(r => r.json()),
        fetch("/api/borrow/items", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) }).then(r => r.json()),
        fetch("/api/borrow/transactions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) }).then(r => r.json()),
        fetch("/api/borrow/dashboard", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) }).then(r => r.json()),
      ]);
      if (!branchRes.ok || !itemRes.ok || !txRes.ok || !dashRes.ok) {
        const errMsg = branchRes.message || itemRes.message || txRes.message || dashRes.message || "Failed to load data";
        setError(errMsg);
        toast({ title: errMsg, variant: "destructive" });
        setLoading(false);
        return;
      }
      setBranches(branchRes.branches || []);
      setItems(itemRes.items || []);
      setTransactions(txRes.transactions || []);
      setDashboardMetrics({ totalTransactions: dashRes.totalTransactions, totalBorrowIn: dashRes.totalBorrowIn, totalBorrowOut: dashRes.totalBorrowOut, overdueCount: dashRes.overdueCount });
    } catch (e) {
      console.error("Failed to fetch borrow data", e);
      setError(language === "th" ? "เกิดข้อผิดพลาด" : "An error occurred");
      toast({ title: language === "th" ? "เกิดข้อผิดพลาด" : "An error occurred", variant: "destructive" });
    }
    setLoading(false);
  };

  useEffect(() => {
    if (token && isManager) fetchData();
  }, [token, isManager]);

  const handleAddBranch = async () => {
    if (!newBranch.name.trim()) return;
    const res = await fetch("/api/borrow/branches/add", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, name: newBranch.name, code: newBranch.code }) }).then(r => r.json());
    if (res.ok) {
      toast({ title: language === "th" ? "เพิ่มสาขาแล้ว" : "Branch added" });
      setNewBranch({ name: "", code: "" });
      fetchData();
    } else {
      toast({ title: res.message || "Failed", variant: "destructive" });
    }
  };

  const handleDeleteBranch = async (id: string) => {
    const res = await fetch("/api/borrow/branches/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, id }) }).then(r => r.json());
    if (!res.ok) {
      toast({ title: res.message || "Failed to delete", variant: "destructive" });
      return;
    }
    fetchData();
  };

  const handleAddItem = async () => {
    if (!newItem.name.trim()) return;
    const res = await fetch("/api/borrow/items/add", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, name: newItem.name, code: newItem.code, unit: newItem.unit }) }).then(r => r.json());
    if (res.ok) {
      toast({ title: language === "th" ? "เพิ่มรายการแล้ว" : "Item added" });
      setNewItem({ name: "", code: "", unit: "" });
      fetchData();
    } else {
      toast({ title: res.message || "Failed", variant: "destructive" });
    }
  };

  const handleDeleteItem = async (id: string) => {
    const res = await fetch("/api/borrow/items/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, id }) }).then(r => r.json());
    if (!res.ok) {
      toast({ title: res.message || "Failed to delete", variant: "destructive" });
      return;
    }
    fetchData();
  };

  const availableUnits = (() => {
    if (!newTx.item) return ["PCS", "CASE", "PACK", "BAG", "BOX"];
    const item = items.find(i => i.name === newTx.item);
    if (!item || !item.units || item.units.length === 0) return ["PCS", "CASE", "PACK", "BAG", "BOX"];
    const specificUnits = item.units.flatMap(u => u.split('/').map(s => s.trim())).filter(Boolean);
    return Array.from(new Set([...specificUnits, "PCS", "CASE", "PACK", "BAG", "BOX"]));
  })();

  const handleAddTransaction = async () => {
    if (!newTx.branch || !newTx.item || newTx.qty < 1) {
      toast({ title: language === "th" ? "กรุณากรอกข้อมูลให้ครบ" : "Please fill required fields", variant: "destructive" });
      return;
    }
    const res = await fetch("/api/borrow/transactions/add", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, ...newTx }) }).then(r => r.json());
    if (res.ok) {
      toast({ title: language === "th" ? "เพิ่มธุรกรรมแล้ว" : "Transaction added" });
      setNewTx({ txDate: format(new Date(), "yyyy-MM-dd"), dueDate: "", txType: "borrow_out", branch: "", item: "", qty: 1, unit: "", borrower: "", lender: "", note: "" });
      setShowAddDialog(false);
      fetchData();
    } else {
      toast({ title: res.message || "Failed", variant: "destructive" });
    }
  };

  const handleToggleTransaction = async (id: string) => {
    const res = await fetch("/api/borrow/transactions/toggle", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, id }) }).then(r => r.json());
    if (res.ok) {
      toast({ title: res.status === "done" ? (language === "th" ? "เสร็จสิ้น" : "Done") : (language === "th" ? "เปลี่ยนเป็นรอดำเนินการ" : "Changed to Pending") });
      fetchData();
    } else {
      toast({ title: res.message || "Failed", variant: "destructive" });
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    const res = await fetch("/api/borrow/transactions/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, id }) }).then(r => r.json());
    if (!res.ok) {
      toast({ title: res.message || "Failed to delete", variant: "destructive" });
      return;
    }
    fetchData();
  };

  if (!isManager) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="p-8 text-center">
          <CardTitle className="text-destructive mb-2">{labels.accessDenied}</CardTitle>
          <p className="text-muted-foreground">{labels.managersOnly}</p>
        </Card>
      </div>
    );
  }

  const isOverdue = (tx: BorrowTransaction) => {
    if (tx.status !== "pending" || !tx.dueDate) return false;
    return tx.dueDate < format(new Date(), "yyyy-MM-dd");
  };

  const trendData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = subDays(new Date(), i);
      return format(d, "yyyy-MM-dd");
    }).reverse();

    return last7Days.map(date => {
      const dayTxs = transactions.filter(t => t.txDate === date);
      return {
        date: format(new Date(date), "dd MMM"),
        borrow_in: dayTxs.filter(t => t.txType === "borrow_in").length,
        borrow_out: dayTxs.filter(t => t.txType === "borrow_out").length,
      };
    });
  }, [transactions]);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Package className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">{labels.title}</h2>
            <p className="text-muted-foreground text-sm">{labels.subtitle}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData} data-testid="button-refresh-borrow">
            <RefreshCw className="w-4 h-4 mr-2" />
            {language === "th" ? "รีเฟรช" : "Refresh"}
          </Button>
          <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-borrow-settings">
                <Settings className="w-4 h-4 mr-2" />
                {labels.settings}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{labels.settings}</DialogTitle>
              </DialogHeader>
              <Tabs defaultValue="branches" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="branches">{labels.branches}</TabsTrigger>
                  <TabsTrigger value="items">{labels.items}</TabsTrigger>
                </TabsList>

                {/* 📌 Tab: Branches */}
                <TabsContent value="branches" className="space-y-4">
                  <div className="flex gap-2">
                    <Input placeholder={labels.code} value={newBranch.code} onChange={(e) => setNewBranch(p => ({ ...p, code: e.target.value }))} className="w-24" data-testid="input-branch-code" />
                    <Input placeholder={labels.name} value={newBranch.name} onChange={(e) => setNewBranch(p => ({ ...p, name: e.target.value }))} className="flex-1" data-testid="input-branch-name" />
                    <Button onClick={handleAddBranch} data-testid="button-add-branch"><Plus className="w-4 h-4" /></Button>
                  </div>

                  {/* ✅ Import Button for Branches */}
                  <div className="flex justify-end border-b pb-2">
                    <ImportExcelButton 
                      endpoint="/api/borrow/branches/import"
                      accept=".csv,.xlsx,.xls"
                      label={labels.importBranches}
                      onDone={(res: any) => {
                        toast({ title: language === "th" ? `นำเข้าสำเร็จ ${res.imported} รายการ` : `Imported ${res.imported} branches` });
                        fetchData();
                      }}
                    />
                  </div>

                  <div className="border rounded-lg max-h-48 overflow-y-auto">
                    {branches.length === 0 ? (
                      <p className="text-center text-muted-foreground py-4">{labels.noItems}</p>
                    ) : (
                      branches.map((b) => (
                        <div key={b.id} className="flex items-center justify-between p-2 border-b last:border-b-0">
                          <span>{b.code ? `[${b.code}] ` : ""}{b.name}</span>
                          <Button size="icon" variant="ghost" onClick={() => handleDeleteBranch(b.id)} data-testid={`button-delete-branch-${b.id}`}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                        </div>
                      ))
                    )}
                  </div>
                </TabsContent>

                {/* 📌 Tab: Items */}
                <TabsContent value="items" className="space-y-4">
                  <div className="flex gap-2">
                    <Input placeholder={labels.code} value={newItem.code} onChange={(e) => setNewItem(p => ({ ...p, code: e.target.value }))} className="w-24" data-testid="input-item-code" />
                    <Input placeholder={labels.name} value={newItem.name} onChange={(e) => setNewItem(p => ({ ...p, name: e.target.value }))} className="flex-1" data-testid="input-item-name" />
                    <Input placeholder={labels.unit} value={newItem.unit} onChange={(e) => setNewItem(p => ({ ...p, unit: e.target.value }))} className="w-20" data-testid="input-item-unit" />
                    <Button onClick={handleAddItem} data-testid="button-add-item"><Plus className="w-4 h-4" /></Button>
                  </div>

                  {/* ✅ Import Button for Items */}
                  <div className="flex justify-end border-b pb-2">
                    <ImportExcelButton 
                      endpoint="/api/borrow/items/import"
                      accept=".csv,.xlsx,.xls"
                      label={labels.importItems}
                      onDone={(res: any) => {
                        toast({ title: language === "th" ? `นำเข้าสำเร็จ ${res.imported} รายการ` : `Imported ${res.imported} items` });
                        fetchData();
                      }}
                    />
                  </div>

                  <div className="border rounded-lg max-h-48 overflow-y-auto">
                    {items.length === 0 ? (
                      <p className="text-center text-muted-foreground py-4">{labels.noItems}</p>
                    ) : (
                      items.map((it) => (
                        <div key={it.id} className="flex items-center justify-between p-2 border-b last:border-b-0">
                          <span>{it.code ? `[${it.code}] ` : ""}{it.name} {it.units && it.units.length > 0 ? `(${it.units.join(", ")})` : ""}</span>
                          <Button size="icon" variant="ghost" onClick={() => handleDeleteItem(it.id)} data-testid={`button-delete-item-${it.id}`}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                        </div>
                      ))
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-transaction">
                <Plus className="w-4 h-4 mr-2" />
                {labels.addTransaction}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{labels.addTransaction}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{labels.type}</Label>
                    <Select value={newTx.txType} onValueChange={(v) => setNewTx(p => ({ ...p, txType: v as "borrow_in" | "borrow_out" }))}>
                      <SelectTrigger data-testid="select-tx-type"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="borrow_out">{labels.borrowOut}</SelectItem>
                        <SelectItem value="borrow_in">{labels.borrowIn}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{labels.branch}</Label>
                    <Popover open={branchSearchOpen} onOpenChange={setBranchSearchOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={branchSearchOpen}
                          className="w-full justify-between font-normal bg-muted/20"
                          data-testid="select-branch"
                        >
                          {newTx.branch
                            ? branches.find((b) => b.name === newTx.branch)?.name
                            : labels.branch}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                        <Command>
                          <CommandInput placeholder={labels.branch} />
                          <CommandList>
                            <CommandEmpty>{labels.noItems}</CommandEmpty>
                            <CommandGroup>
                              {branches.map((b) => (
                                <CommandItem
                                  key={b.id}
                                  value={b.name}
                                  onSelect={(currentValue) => {
                                    setNewTx((p) => ({ ...p, branch: currentValue }));
                                    setBranchSearchOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      newTx.branch === b.name ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {b.code ? `[${b.code}] ` : ""}{b.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{labels.item}</Label>
                    <Popover open={itemSearchOpen} onOpenChange={setItemSearchOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={itemSearchOpen}
                          className="w-full justify-between font-normal"
                          data-testid="select-item"
                        >
                          {newTx.item
                            ? items.find((it) => it.name === newTx.item)?.name
                            : labels.item}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                        <Command>
                          <CommandInput placeholder={labels.item} />
                          <CommandList>
                            <CommandEmpty>{labels.noItems}</CommandEmpty>
                            <CommandGroup>
                              {items.map((it) => (
                                <CommandItem
                                  key={it.id}
                                  value={it.name}
                                  onSelect={(currentValue) => {
                                    const selectedItem = items.find(i => i.name === currentValue);
                                    setNewTx((p) => ({ 
                                      ...p, 
                                      item: currentValue, 
                                      unit: selectedItem?.units?.[0] || "" 
                                    }));
                                    setItemSearchOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      newTx.item === it.name ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {it.code ? `[${it.code}] ` : ""}{it.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label>{labels.qty}</Label>
                    <div className="flex gap-2">
                      <Input type="number" min={1} value={newTx.qty} onChange={(e) => setNewTx(p => ({ ...p, qty: parseInt(e.target.value) || 1 }))} data-testid="input-qty" />
                      <Popover open={unitSearchOpen} onOpenChange={setUnitSearchOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={unitSearchOpen}
                            className="w-32 justify-between font-normal"
                            disabled={!newTx.item}
                            data-testid="select-unit"
                          >
                            {newTx.unit || labels.unit}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-48 p-0">
                          <Command>
                            <CommandInput placeholder={labels.unit} />
                            <CommandList>
                              <CommandEmpty>{labels.noItems}</CommandEmpty>
                              <CommandGroup>
                                {availableUnits.map((u) => (
                                  <CommandItem
                                    key={u}
                                    value={u}
                                    onSelect={(currentValue) => {
                                      setNewTx(p => ({ ...p, unit: currentValue.toUpperCase() }));
                                      setUnitSearchOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        newTx.unit === u ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {u}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{labels.txDate}</Label>
                    <Input type="date" value={newTx.txDate} onChange={(e) => setNewTx(p => ({ ...p, txDate: e.target.value }))} data-testid="input-tx-date" />
                  </div>
                  <div className="space-y-2">
                    <Label>{labels.dueDate}</Label>
                    <Input type="date" value={newTx.dueDate} onChange={(e) => setNewTx(p => ({ ...p, dueDate: e.target.value }))} data-testid="input-due-date" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{labels.borrower}</Label>
                    <Input value={newTx.borrower} onChange={(e) => setNewTx(p => ({ ...p, borrower: e.target.value }))} data-testid="input-borrower" />
                  </div>
                  <div className="space-y-2">
                    <Label>{labels.lender}</Label>
                    <Input value={newTx.lender} onChange={(e) => setNewTx(p => ({ ...p, lender: e.target.value }))} data-testid="input-lender" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{labels.note}</Label>
                  <Input value={newTx.note} onChange={(e) => setNewTx(p => ({ ...p, note: e.target.value }))} data-testid="input-note" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>{labels.cancel}</Button>
                <Button onClick={handleAddTransaction} data-testid="button-save-transaction">{labels.save}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">{labels.totalTransactions}</p>
                <p className="text-2xl font-bold">{dashboardMetrics.totalTransactions}</p>
              </div>
              <Package className="w-8 h-8 text-primary/20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">{labels.borrowOut}</p>
                <p className="text-2xl font-bold text-orange-600">{dashboardMetrics.totalBorrowOut}</p>
              </div>
              <ArrowUpFromLine className="w-8 h-8 text-orange-600/20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">{labels.borrowIn}</p>
                <p className="text-2xl font-bold text-green-600">{dashboardMetrics.totalBorrowIn}</p>
              </div>
              <ArrowDownToLine className="w-8 h-8 text-green-600/20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">{labels.overdue}</p>
                <p className="text-2xl font-bold text-destructive">{dashboardMetrics.overdueCount}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-destructive/20" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="hover-elevate overflow-hidden border-none shadow-sm md:border md:shadow-none">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-1 bg-muted/5">
            <CardTitle className="text-base font-semibold">
              {language === "th" ? "แนวโน้มการยืม-คืน (7 วัน)" : "7-Day Borrow/Lend Trends"}
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                  />
                  <Tooltip 
                    cursor={{ fill: "hsl(var(--muted) / 0.2)" }}
                    contentStyle={{ 
                      borderRadius: "12px", 
                      border: "1px solid hsl(var(--border))", 
                      boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                      backgroundColor: "hsl(var(--background))",
                    }}
                  />
                  <Legend verticalAlign="top" align="right" height={36} iconType="circle" />
                  <Bar 
                    name={labels.borrowIn} 
                    dataKey="borrow_in" 
                    fill="#22c55e" 
                    radius={[4, 4, 0, 0]} 
                    barSize={20}
                  />
                  <Bar 
                    name={labels.borrowOut} 
                    dataKey="borrow_out" 
                    fill="#f97316" 
                    radius={[4, 4, 0, 0]} 
                    barSize={20}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate overflow-hidden border-none shadow-sm md:border md:shadow-none">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-1 bg-muted/5">
            <CardTitle className="text-base font-semibold">
              {language === "th" ? "สถิติรายวัน" : "Daily Activity Metrics"}
            </CardTitle>
            <RefreshCw className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: "12px", 
                      border: "1px solid hsl(var(--border))", 
                      boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                      backgroundColor: "hsl(var(--background))",
                    }}
                  />
                  <Legend verticalAlign="top" align="right" height={36} iconType="circle" />
                  <Line 
                    type="monotone" 
                    name={labels.borrowIn} 
                    dataKey="borrow_in" 
                    stroke="#22c55e" 
                    strokeWidth={3} 
                    dot={{ r: 4, fill: "#22c55e", strokeWidth: 2, stroke: "#fff" }} 
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                  <Line 
                    type="monotone" 
                    name={labels.borrowOut} 
                    dataKey="borrow_out" 
                    stroke="#f97316" 
                    strokeWidth={3} 
                    dot={{ r: 4, fill: "#f97316", strokeWidth: 2, stroke: "#fff" }} 
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{labels.transactions}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Loading...</div>
          ) : error ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive/50" />
              <p className="text-destructive">{error}</p>
              <Button variant="outline" onClick={fetchData} className="mt-4">{language === "th" ? "ลองใหม่" : "Retry"}</Button>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>{labels.noItems}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{labels.type}</TableHead>
                    <TableHead>{labels.branch}</TableHead>
                    <TableHead>{labels.item}</TableHead>
                    <TableHead className="text-center">{labels.qty}</TableHead>
                    <TableHead>{labels.txDate}</TableHead>
                    <TableHead>{labels.dueDate}</TableHead>
                    <TableHead>{labels.borrower}</TableHead>
                    <TableHead className="text-center">{labels.status}</TableHead>
                    <TableHead className="text-center">{labels.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => (
                    <TableRow key={tx.id} className={tx.status === "done" ? "opacity-60" : ""}>
                      <TableCell>
                        {tx.txType === "borrow_in" ? (
                          <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            <ArrowDownToLine className="w-3 h-3 mr-1" />{labels.borrowIn}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                            <ArrowUpFromLine className="w-3 h-3 mr-1" />{labels.borrowOut}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{tx.branch}</TableCell>
                      <TableCell>{tx.item}</TableCell>
                      <TableCell className="text-center">{tx.qty} {tx.unit}</TableCell>
                      <TableCell>{tx.txDate}</TableCell>
                      <TableCell>{tx.dueDate || "-"}</TableCell>
                      <TableCell>{tx.borrower || "-"}</TableCell>
                      <TableCell className="text-center">
                        {isOverdue(tx) ? (
                          <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />{labels.overdue}</Badge>
                        ) : tx.status === "done" ? (
                          <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"><Check className="w-3 h-3 mr-1" />{labels.done}</Badge>
                        ) : (
                          <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />{labels.pending}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button size="icon" variant="ghost" onClick={() => handleToggleTransaction(tx.id)} className="text-green-600" data-testid={`button-toggle-${tx.id}`}>
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => handleDeleteTransaction(tx.id)} className="text-destructive" data-testid={`button-delete-tx-${tx.id}`}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}