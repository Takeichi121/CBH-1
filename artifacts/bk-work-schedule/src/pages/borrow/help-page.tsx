import { useI18n } from "@/hooks/use-i18n";
import { BorrowLayout } from "./borrow-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  HelpCircle, 
  FilePlus, 
  History, 
  Settings, 
  Search, 
  Plus, 
  Check, 
  ArrowDownLeft, 
  ArrowUpRight,
  Upload
} from "lucide-react";

export default function BorrowHelpPage() {
  const { language } = useI18n();

  const t = {
    title: language === "th" ? "คู่มือการใช้งาน" : "User Guide",
    overview: language === "th" ? "ภาพรวม" : "Overview",
    overviewDesc: language === "th" 
      ? "ระบบ Borrow Tracker ใช้สำหรับติดตามการยืม-คืนอุปกรณ์และวัตถุดิบระหว่างสาขา" 
      : "Borrow Tracker is used to track borrowing and returning of equipment and materials between branches.",
    newTx: language === "th" ? "สร้างรายการใหม่" : "Create New Transaction",
    history: language === "th" ? "ประวัติรายการ" : "Transaction History",
    settings: language === "th" ? "ตั้งค่าระบบ" : "Settings",
    faq: language === "th" ? "คำถามที่พบบ่อย" : "FAQ",
  };

  return (
    <BorrowLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <HelpCircle className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">{t.title}</h1>
        </div>

        <ScrollArea className="h-[calc(100vh-200px)]">
          <div className="space-y-6 pr-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="h-5 w-5" />
                  {t.overview}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{t.overviewDesc}</p>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <div className="font-medium">Total Transactions</div>
                    <div className="text-sm text-muted-foreground">
                      {language === "th" ? "จำนวนรายการทั้งหมด" : "All transactions count"}
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-chart-2/10">
                    <div className="font-medium flex items-center gap-2">
                      <ArrowDownLeft className="h-4 w-4 text-chart-2" />
                      Borrow In
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {language === "th" ? "ยืมเข้า - สาขาเราได้รับของจากสาขาอื่น" : "Items received from other branches"}
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-destructive/10">
                    <div className="font-medium flex items-center gap-2">
                      <ArrowUpRight className="h-4 w-4 text-destructive" />
                      Borrow Out
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {language === "th" ? "ยืมออก - สาขาเราให้ของไปสาขาอื่น" : "Items lent to other branches"}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FilePlus className="h-5 w-5" />
                  {t.newTx}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">1</div>
                    <div>
                      <div className="font-medium">{language === "th" ? "เลือกประเภทรายการ" : "Select Transaction Type"}</div>
                      <div className="text-sm text-muted-foreground">
                        {language === "th" ? "Borrow In (ยืมเข้า) หรือ Borrow Out (ยืมออก)" : "Borrow In or Borrow Out"}
                      </div>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">2</div>
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        <Search className="h-4 w-4" />
                        {language === "th" ? "ค้นหาและเลือก Item" : "Search and Select Item"}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {language === "th" 
                          ? "พิมพ์ชื่อหรือรหัสสินค้า, ใช้ลูกศร ↑↓ เลือก, กด Enter เพื่อยืนยัน" 
                          : "Type name or code, use ↑↓ to navigate, press Enter to select"}
                      </div>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">3</div>
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        {language === "th" ? "กำหนดจำนวนและเพิ่มลงตะกร้า" : "Set Quantity and Add to Cart"}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {language === "th" ? "ใส่จำนวน แล้วกดปุ่ม Add" : "Enter quantity and click Add button"}
                      </div>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">4</div>
                    <div>
                      <div className="font-medium">{language === "th" ? "เลือกสาขาและกรอกข้อมูล" : "Select Branch and Fill Details"}</div>
                      <div className="text-sm text-muted-foreground">
                        {language === "th" ? "เลือกสาขา, วันที่, ผู้ยืม/ผู้ให้ยืม, หมายเหตุ" : "Branch, date, borrower/lender, notes"}
                      </div>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">5</div>
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        <Check className="h-4 w-4" />
                        {language === "th" ? "ยืนยันรายการ" : "Submit Transaction"}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {language === "th" ? "กดปุ่ม Submit เพื่อบันทึก" : "Click Submit to save"}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  {t.history}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-muted-foreground">
                  {language === "th" 
                    ? "แสดงรายการทั้งหมดพร้อมสถานะ:" 
                    : "Shows all transactions with status:"}
                </p>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <span className="text-sm">Pending - {language === "th" ? "รอดำเนินการ" : "Waiting"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-sm">Done - {language === "th" ? "เสร็จสิ้น" : "Completed"}</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  {language === "th" 
                    ? "คลิกที่รายการเพื่อเปลี่ยนสถานะหรือลบ" 
                    : "Click on an item to toggle status or delete"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  {t.settings}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  {language === "th" ? "เฉพาะ Manager เท่านั้นที่เข้าถึงได้" : "Manager access only"}
                </p>
                
                <div className="space-y-3">
                  <div className="p-3 rounded-lg border">
                    <div className="font-medium">{language === "th" ? "สาขา (Branches)" : "Branches"}</div>
                    <ul className="mt-2 text-sm text-muted-foreground space-y-1">
                      <li>• {language === "th" ? "เพิ่มสาขา - กรอกชื่อและรหัส" : "Add branch - enter name and code"}</li>
                      <li className="flex items-center gap-1">
                        • <Upload className="h-3 w-3" /> Import Excel - {language === "th" ? "นำเข้าจากไฟล์" : "Import from file"}
                      </li>
                      <li>• {language === "th" ? "ลบสาขา - กดไอคอนถังขยะ" : "Delete - click trash icon"}</li>
                    </ul>
                  </div>
                  
                  <div className="p-3 rounded-lg border">
                    <div className="font-medium">{language === "th" ? "รายการอุปกรณ์ (Items)" : "Items"}</div>
                    <ul className="mt-2 text-sm text-muted-foreground space-y-1">
                      <li>• {language === "th" ? "เพิ่มรายการ - กรอกชื่อ, รหัส, Units" : "Add item - enter name, code, units"}</li>
                      <li>• {language === "th" ? "แก้ไข Units - คลิกที่ช่อง Unit แล้วพิมพ์ (คั่นด้วยจุลภาค)" : "Edit units - click Unit field and type (comma-separated)"}</li>
                      <li>• {language === "th" ? "ตัวอย่าง: BOX, CASE, PACK" : "Example: BOX, CASE, PACK"}</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="h-5 w-5" />
                  {t.faq}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <div className="font-medium">
                      Q: {language === "th" ? "ทำไมเปลี่ยนสถานะไม่ได้?" : "Why can't I change status?"}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      A: {language === "th" ? "ต้อง login เป็น Manager หรือ Admin" : "Must be logged in as Manager or Admin"}
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <div className="font-medium">
                      Q: {language === "th" ? "จะเพิ่ม Item ใหม่ได้อย่างไร?" : "How to add new items?"}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      A: {language === "th" ? "ไปที่ Settings > Items > กดปุ่ม Add Item" : "Go to Settings > Items > Click Add Item"}
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <div className="font-medium">
                      Q: {language === "th" ? "ค้นหา Item ไม่เจอ?" : "Can't find an item?"}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      A: {language === "th" ? "ตรวจสอบว่า Item ถูกเพิ่มในระบบแล้วหรือยังที่หน้า Settings" : "Check if the item has been added in Settings page"}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </div>
    </BorrowLayout>
  );
}
