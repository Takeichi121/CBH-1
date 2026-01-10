import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Building, Package, Trash2, RefreshCw, Upload, FileSpreadsheet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BorrowLayout } from "./borrow-layout";
import type { BorrowBranch, BorrowItem } from "@shared/schema";

export default function BorrowSettingsPage() {
  const { user, token } = useAuth();
  const { language } = useI18n();
  const { toast } = useToast();

  const [branches, setBranches] = useState<BorrowBranch[]>([]);
  const [items, setItems] = useState<BorrowItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBranchDialog, setShowBranchDialog] = useState(false);
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [newBranch, setNewBranch] = useState({ name: "", code: "" });
  const [newItem, setNewItem] = useState({ name: "", code: "", unit: "" });
  const [importingBranches, setImportingBranches] = useState(false);
  const [importingItems, setImportingItems] = useState(false);
  const branchFileRef = useRef<HTMLInputElement>(null);
  const itemFileRef = useRef<HTMLInputElement>(null);

  const isManager = user?.role === "manager" || user?.role === "admin";

  const labels = {
    title: language === "th" ? "ตั้งค่าระบบยืม-คืน" : "Borrow Settings",
    branches: language === "th" ? "สาขา" : "Branches",
    items: language === "th" ? "รายการอุปกรณ์" : "Items",
    addBranch: language === "th" ? "เพิ่มสาขา" : "Add Branch",
    addItem: language === "th" ? "เพิ่มรายการ" : "Add Item",
    name: language === "th" ? "ชื่อ" : "Name",
    code: language === "th" ? "รหัส" : "Code",
    unit: language === "th" ? "หน่วย" : "Unit",
    actions: language === "th" ? "จัดการ" : "Actions",
    save: language === "th" ? "บันทึก" : "Save",
    cancel: language === "th" ? "ยกเลิก" : "Cancel",
    delete: language === "th" ? "ลบ" : "Delete",
    noBranches: language === "th" ? "ยังไม่มีสาขา" : "No branches yet",
    noItems: language === "th" ? "ยังไม่มีรายการ" : "No items yet",
    refresh: language === "th" ? "รีเฟรช" : "Refresh",
    importExcel: language === "th" ? "Import Excel" : "Import Excel",
    importSuccess: language === "th" ? "นำเข้าสำเร็จ" : "Import successful",
    importFailed: language === "th" ? "นำเข้าไม่สำเร็จ" : "Import failed",
    importing: language === "th" ? "กำลังนำเข้า..." : "Importing...",
    rowsImported: language === "th" ? "รายการที่นำเข้า" : "rows imported",
    rowsSkipped: language === "th" ? "รายการที่ข้าม" : "rows skipped",
  };

  const handleImportBranches = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;
    setImportingBranches(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("token", token);
      const res = await fetch("/api/borrow/branches/import", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.ok) {
        toast({ 
          title: labels.importSuccess, 
          description: `${data.imported} ${labels.rowsImported}, ${data.skipped} ${labels.rowsSkipped}` 
        });
        fetchData();
      } else {
        toast({ title: labels.importFailed, description: data.message, variant: "destructive" });
      }
    } catch (err) {
      toast({ title: labels.importFailed, variant: "destructive" });
    } finally {
      setImportingBranches(false);
      if (branchFileRef.current) branchFileRef.current.value = "";
    }
  };

  const handleImportItems = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;
    setImportingItems(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("token", token);
      const res = await fetch("/api/borrow/items/import", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.ok) {
        toast({ 
          title: labels.importSuccess, 
          description: `${data.imported} ${labels.rowsImported}, ${data.skipped} ${labels.rowsSkipped}` 
        });
        fetchData();
      } else {
        toast({ title: labels.importFailed, description: data.message, variant: "destructive" });
      }
    } catch (err) {
      toast({ title: labels.importFailed, variant: "destructive" });
    } finally {
      setImportingItems(false);
      if (itemFileRef.current) itemFileRef.current.value = "";
    }
  };

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [branchesRes, itemsRes] = await Promise.all([
        fetch("/api/borrow/branches", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/borrow/items", { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const branchesData = await branchesRes.json();
      const itemsData = await itemsRes.json();
      if (branchesData.ok) setBranches(branchesData.branches);
      if (itemsData.ok) setItems(itemsData.items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleAddBranch = async () => {
    if (!token || !newBranch.name || !newBranch.code) return;
    try {
      const res = await fetch("/api/borrow/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(newBranch),
      });
      const data = await res.json();
      if (data.ok) {
        toast({ title: language === "th" ? "เพิ่มสาขาสำเร็จ" : "Branch added" });
        setShowBranchDialog(false);
        setNewBranch({ name: "", code: "" });
        fetchData();
      } else {
        toast({ title: data.error || "Error", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Network error", variant: "destructive" });
    }
  };

  const handleAddItem = async () => {
    if (!token || !newItem.name || !newItem.code) return;
    try {
      const res = await fetch("/api/borrow/items", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(newItem),
      });
      const data = await res.json();
      if (data.ok) {
        toast({ title: language === "th" ? "เพิ่มรายการสำเร็จ" : "Item added" });
        setShowItemDialog(false);
        setNewItem({ name: "", code: "", unit: "" });
        fetchData();
      } else {
        toast({ title: data.error || "Error", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Network error", variant: "destructive" });
    }
  };

  const handleDeleteBranch = async (branchId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/borrow/branches/${branchId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.ok) {
        toast({ title: language === "th" ? "ลบสาขาสำเร็จ" : "Branch deleted" });
        fetchData();
      }
    } catch (err) {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/borrow/items/${itemId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.ok) {
        toast({ title: language === "th" ? "ลบรายการสำเร็จ" : "Item deleted" });
        fetchData();
      }
    } catch (err) {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  if (!isManager) {
    return (
      <BorrowLayout>
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            {language === "th" ? "เฉพาะผู้จัดการเท่านั้นที่สามารถเข้าถึงหน้านี้" : "Only managers can access this page"}
          </CardContent>
        </Card>
      </BorrowLayout>
    );
  }

  return (
    <BorrowLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">{labels.title}</h2>
          <Button variant="outline" size="sm" onClick={fetchData} data-testid="button-refresh-settings">
            <RefreshCw className="w-4 h-4 mr-1" />
            {labels.refresh}
          </Button>
        </div>

        <Tabs defaultValue="branches">
          <TabsList>
            <TabsTrigger value="branches" data-testid="tab-branches">
              <Building className="w-4 h-4 mr-1" />
              {labels.branches}
            </TabsTrigger>
            <TabsTrigger value="items" data-testid="tab-items">
              <Package className="w-4 h-4 mr-1" />
              {labels.items}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="branches" className="space-y-4">
            <div className="flex justify-end gap-2">
              <input
                ref={branchFileRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleImportBranches}
                data-testid="input-import-branches"
              />
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => branchFileRef.current?.click()}
                disabled={importingBranches}
                data-testid="button-import-branches"
              >
                <FileSpreadsheet className="w-4 h-4 mr-1" />
                {importingBranches ? labels.importing : labels.importExcel}
              </Button>
              <Dialog open={showBranchDialog} onOpenChange={setShowBranchDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" data-testid="button-add-branch">
                    <Plus className="w-4 h-4 mr-1" />
                    {labels.addBranch}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{labels.addBranch}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>{labels.name}</Label>
                      <Input
                        value={newBranch.name}
                        onChange={(e) => setNewBranch({ ...newBranch, name: e.target.value })}
                        placeholder="BK Grand Diamond"
                        data-testid="input-branch-name"
                      />
                    </div>
                    <div>
                      <Label>{labels.code}</Label>
                      <Input
                        value={newBranch.code}
                        onChange={(e) => setNewBranch({ ...newBranch, code: e.target.value })}
                        placeholder="BK001"
                        data-testid="input-branch-code"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowBranchDialog(false)} data-testid="button-cancel-branch">
                      {labels.cancel}
                    </Button>
                    <Button onClick={handleAddBranch} data-testid="button-save-branch">
                      {labels.save}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-8 text-center text-muted-foreground">Loading...</div>
                ) : branches.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">{labels.noBranches}</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{labels.code}</TableHead>
                        <TableHead>{labels.name}</TableHead>
                        <TableHead>{labels.actions}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {branches.map((branch) => (
                        <TableRow key={branch.id} data-testid={`row-branch-${branch.id}`}>
                          <TableCell>
                            <Badge variant="outline">{branch.code}</Badge>
                          </TableCell>
                          <TableCell>{branch.name}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteBranch(branch.id)}
                              data-testid={`button-delete-branch-${branch.id}`}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="items" className="space-y-4">
            <div className="flex justify-end gap-2">
              <input
                ref={itemFileRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleImportItems}
                data-testid="input-import-items"
              />
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => itemFileRef.current?.click()}
                disabled={importingItems}
                data-testid="button-import-items"
              >
                <FileSpreadsheet className="w-4 h-4 mr-1" />
                {importingItems ? labels.importing : labels.importExcel}
              </Button>
              <Dialog open={showItemDialog} onOpenChange={setShowItemDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" data-testid="button-add-item">
                    <Plus className="w-4 h-4 mr-1" />
                    {labels.addItem}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{labels.addItem}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>{labels.name}</Label>
                      <Input
                        value={newItem.name}
                        onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                        placeholder="Sauce Container"
                        data-testid="input-item-name"
                      />
                    </div>
                    <div>
                      <Label>{labels.code}</Label>
                      <Input
                        value={newItem.code}
                        onChange={(e) => setNewItem({ ...newItem, code: e.target.value })}
                        placeholder="SC001"
                        data-testid="input-item-code"
                      />
                    </div>
                    <div>
                      <Label>{labels.unit}</Label>
                      <Input
                        value={newItem.unit}
                        onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                        placeholder="pcs"
                        data-testid="input-item-unit"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowItemDialog(false)} data-testid="button-cancel-item">
                      {labels.cancel}
                    </Button>
                    <Button onClick={handleAddItem} data-testid="button-save-item">
                      {labels.save}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-8 text-center text-muted-foreground">Loading...</div>
                ) : items.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">{labels.noItems}</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{labels.code}</TableHead>
                        <TableHead>{labels.name}</TableHead>
                        <TableHead>{labels.unit}</TableHead>
                        <TableHead>{labels.actions}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => (
                        <TableRow key={item.id} data-testid={`row-item-${item.id}`}>
                          <TableCell>
                            <Badge variant="outline">{item.code}</Badge>
                          </TableCell>
                          <TableCell>{item.name}</TableCell>
                          <TableCell>{item.unit}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteItem(item.id)}
                              data-testid={`button-delete-item-${item.id}`}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </BorrowLayout>
  );
}
