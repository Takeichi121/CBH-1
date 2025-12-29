import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, Plus, Check, Trash2, Edit, Clock, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface BorrowItem {
  id: string;
  itemName: string;
  borrower: string;
  quantity: number;
  borrowDate: string;
  returnDate: string | null;
  status: "borrowed" | "returned" | "overdue";
  note: string;
}

export default function BorrowTrackerPage() {
  const { user } = useAuth();
  const { language } = useI18n();
  const { toast } = useToast();

  const [items, setItems] = useState<BorrowItem[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<BorrowItem | null>(null);
  const [newItem, setNewItem] = useState({
    itemName: "",
    borrower: "",
    quantity: 1,
    borrowDate: format(new Date(), "yyyy-MM-dd"),
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

  const labels = {
    title: language === "th" ? "ระบบยืม-คืนอุปกรณ์" : "Borrow Tracker",
    subtitle: language === "th" ? "จัดการการยืม-คืนอุปกรณ์" : "Manage borrowed equipment",
    addItem: language === "th" ? "เพิ่มรายการ" : "Add Item",
    itemName: language === "th" ? "ชื่อรายการ" : "Item Name",
    borrower: language === "th" ? "ผู้ยืม" : "Borrower",
    quantity: language === "th" ? "จำนวน" : "Quantity",
    borrowDate: language === "th" ? "วันที่ยืม" : "Borrow Date",
    returnDate: language === "th" ? "วันที่คืน" : "Return Date",
    status: language === "th" ? "สถานะ" : "Status",
    note: language === "th" ? "หมายเหตุ" : "Note",
    actions: language === "th" ? "จัดการ" : "Actions",
    borrowed: language === "th" ? "ยืมอยู่" : "Borrowed",
    returned: language === "th" ? "คืนแล้ว" : "Returned",
    overdue: language === "th" ? "เกินกำหนด" : "Overdue",
    markReturned: language === "th" ? "คืนแล้ว" : "Mark Returned",
    delete: language === "th" ? "ลบ" : "Delete",
    save: language === "th" ? "บันทึก" : "Save",
    cancel: language === "th" ? "ยกเลิก" : "Cancel",
    noItems: language === "th" ? "ไม่มีรายการ" : "No items",
    itemAdded: language === "th" ? "เพิ่มรายการแล้ว" : "Item added",
    itemReturned: language === "th" ? "บันทึกการคืนแล้ว" : "Item returned",
    itemDeleted: language === "th" ? "ลบรายการแล้ว" : "Item deleted",
    totalBorrowed: language === "th" ? "ยืมอยู่ทั้งหมด" : "Total Borrowed",
    totalReturned: language === "th" ? "คืนแล้วทั้งหมด" : "Total Returned",
  };

  const handleAddItem = () => {
    if (!newItem.itemName || !newItem.borrower) {
      toast({ title: language === "th" ? "กรุณากรอกข้อมูลให้ครบ" : "Please fill all required fields", variant: "destructive" });
      return;
    }

    const item: BorrowItem = {
      id: Date.now().toString(),
      ...newItem,
      returnDate: null,
      status: "borrowed",
    };

    setItems(prev => [item, ...prev]);
    setNewItem({
      itemName: "",
      borrower: "",
      quantity: 1,
      borrowDate: format(new Date(), "yyyy-MM-dd"),
      note: "",
    });
    setShowAddDialog(false);
    toast({ title: labels.itemAdded });
  };

  const handleMarkReturned = (id: string) => {
    setItems(prev => prev.map(item => 
      item.id === id 
        ? { ...item, status: "returned" as const, returnDate: format(new Date(), "yyyy-MM-dd") }
        : item
    ));
    toast({ title: labels.itemReturned });
  };

  const handleDelete = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
    toast({ title: labels.itemDeleted });
  };

  const borrowedCount = items.filter(i => i.status === "borrowed").length;
  const returnedCount = items.filter(i => i.status === "returned").length;

  const getStatusBadge = (status: BorrowItem["status"]) => {
    switch (status) {
      case "borrowed":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"><Clock className="w-3 h-3 mr-1" />{labels.borrowed}</Badge>;
      case "returned":
        return <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"><Check className="w-3 h-3 mr-1" />{labels.returned}</Badge>;
      case "overdue":
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />{labels.overdue}</Badge>;
    }
  };

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

        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-borrow">
              <Plus className="w-4 h-4 mr-2" />
              {labels.addItem}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{labels.addItem}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{labels.itemName} *</Label>
                <Input
                  value={newItem.itemName}
                  onChange={(e) => setNewItem(prev => ({ ...prev, itemName: e.target.value }))}
                  placeholder={language === "th" ? "เช่น ถังดับเพลิง, กุญแจสำรอง" : "e.g. Fire extinguisher, Spare key"}
                  data-testid="input-item-name"
                />
              </div>
              <div className="space-y-2">
                <Label>{labels.borrower} *</Label>
                <Input
                  value={newItem.borrower}
                  onChange={(e) => setNewItem(prev => ({ ...prev, borrower: e.target.value }))}
                  placeholder={language === "th" ? "ชื่อผู้ยืม" : "Borrower name"}
                  data-testid="input-borrower"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{labels.quantity}</Label>
                  <Input
                    type="number"
                    min={1}
                    value={newItem.quantity}
                    onChange={(e) => setNewItem(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                    data-testid="input-quantity"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{labels.borrowDate}</Label>
                  <Input
                    type="date"
                    value={newItem.borrowDate}
                    onChange={(e) => setNewItem(prev => ({ ...prev, borrowDate: e.target.value }))}
                    data-testid="input-borrow-date"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{labels.note}</Label>
                <Input
                  value={newItem.note}
                  onChange={(e) => setNewItem(prev => ({ ...prev, note: e.target.value }))}
                  placeholder={language === "th" ? "หมายเหตุ (ถ้ามี)" : "Note (optional)"}
                  data-testid="input-borrow-note"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                {labels.cancel}
              </Button>
              <Button onClick={handleAddItem} data-testid="button-save-borrow">
                {labels.save}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{labels.totalBorrowed}</p>
                <p className="text-2xl font-bold text-yellow-600">{borrowedCount}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600/20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{labels.totalReturned}</p>
                <p className="text-2xl font-bold text-green-600">{returnedCount}</p>
              </div>
              <Check className="w-8 h-8 text-green-600/20" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          {items.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>{labels.noItems}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{labels.itemName}</TableHead>
                    <TableHead>{labels.borrower}</TableHead>
                    <TableHead className="text-center">{labels.quantity}</TableHead>
                    <TableHead>{labels.borrowDate}</TableHead>
                    <TableHead>{labels.returnDate}</TableHead>
                    <TableHead className="text-center">{labels.status}</TableHead>
                    <TableHead>{labels.note}</TableHead>
                    <TableHead className="text-center">{labels.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id} className={item.status === "returned" ? "opacity-60" : ""}>
                      <TableCell className="font-medium">{item.itemName}</TableCell>
                      <TableCell>{item.borrower}</TableCell>
                      <TableCell className="text-center">{item.quantity}</TableCell>
                      <TableCell>{format(new Date(item.borrowDate), "dd/MM/yyyy")}</TableCell>
                      <TableCell>{item.returnDate ? format(new Date(item.returnDate), "dd/MM/yyyy") : "-"}</TableCell>
                      <TableCell className="text-center">{getStatusBadge(item.status)}</TableCell>
                      <TableCell className="max-w-[150px] truncate">{item.note || "-"}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          {item.status === "borrowed" && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleMarkReturned(item.id)}
                              className="text-green-600 hover:text-green-700"
                              data-testid={`button-return-${item.id}`}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDelete(item.id)}
                            className="text-destructive hover:text-destructive"
                            data-testid={`button-delete-${item.id}`}
                          >
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
