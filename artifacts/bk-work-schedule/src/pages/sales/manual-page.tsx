import { useState } from "react";
import { useI18n } from "@/hooks/use-i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  BookOpen,
  LayoutDashboard,
  FileEdit,
  FileText,
  Settings,
  Calculator,
  HelpCircle,
  ChevronLeft,
} from "lucide-react";
import { SalesLayout } from "./sales-layout";
import { Link } from "wouter";

export default function SalesManualPage() {
  const { language } = useI18n();

  const t = {
    title: language === "th" ? "คู่มือการใช้งาน" : "User Manual",
    subtitle: language === "th" ? "เมนู Sales Report" : "Sales Report Menu",
    version: "3.3.0",
    lastUpdated: "12/01/2026",
    back: language === "th" ? "กลับ" : "Back",
  };

  const sections = [
    {
      id: "overview",
      title: language === "th" ? "1. ภาพรวมระบบ" : "1. System Overview",
      icon: BookOpen,
      content: language === "th" ? (
        <div className="space-y-4">
          <p>ระบบ Sales Report เป็นเครื่องมือสำหรับบันทึกและติดตามยอดขายประจำวันของร้าน Grand Diamond โดยมีความสามารถหลักดังนี้:</p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li><strong>บันทึกยอดขายรายวัน</strong> - บันทึกยอดขายจริง เป้าหมาย และจำนวนรายการ</li>
            <li><strong>ติดตาม MTD (Month-to-Date)</strong> - ดูยอดสะสมประจำเดือน</li>
            <li><strong>แยกประเภทยอดขาย</strong> - Dine In, Take Away, Delivery (Grab, LINE MAN, Shopee, BK App)</li>
            <li><strong>บันทึกประสิทธิภาพ</strong> - OSAT, Void, SOS, Add-ons, Waste</li>
            <li><strong>จัดการ Labor</strong> - COL%, Labor Hour, TCMH</li>
            <li><strong>ตารางงาน (Roster)</strong> - บันทึกตารางงานผู้จัดการและพนักงาน</li>
          </ul>
        </div>
      ) : (
        <div className="space-y-4">
          <p>The Sales Report system is a tool for recording and tracking daily sales at Grand Diamond with the following main features:</p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li><strong>Daily Sales Recording</strong> - Record actual sales, targets, and transaction counts</li>
            <li><strong>MTD Tracking</strong> - View month-to-date accumulated sales</li>
            <li><strong>Sales Categories</strong> - Dine In, Take Away, Delivery (Grab, LINE MAN, Shopee, BK App)</li>
            <li><strong>Performance Tracking</strong> - OSAT, Void, SOS, Add-ons, Waste</li>
            <li><strong>Labor Management</strong> - COL%, Labor Hour, TCMH</li>
            <li><strong>Roster</strong> - Manager and staff scheduling</li>
          </ul>
        </div>
      ),
    },
    {
      id: "dashboard",
      title: language === "th" ? "2. แท็บภาพรวม (Dashboard)" : "2. Dashboard Tab",
      icon: LayoutDashboard,
      content: language === "th" ? (
        <div className="space-y-4">
          <p className="font-medium">หน้า Dashboard แสดงข้อมูลสรุปสำคัญแบบ Real-time</p>
          
          <div className="space-y-2">
            <h4 className="font-semibold">การ์ด KPI หลัก (6 การ์ด)</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">การ์ด</th>
                    <th className="text-left p-2">คำอธิบาย</th>
                    <th className="text-left p-2">สี</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b"><td className="p-2 font-medium">ยอดขายวันนี้</td><td className="p-2">ยอดขายจริงของวันปัจจุบัน</td><td className="p-2"><Badge className="bg-green-500">เขียว</Badge></td></tr>
                  <tr className="border-b"><td className="p-2 font-medium">ยอดสะสม (MTD)</td><td className="p-2">ยอดขายสะสมตั้งแต่ต้นเดือน</td><td className="p-2"><Badge className="bg-blue-500">น้ำเงิน</Badge></td></tr>
                  <tr className="border-b"><td className="p-2 font-medium">จำนวนรายการ (TC)</td><td className="p-2">จำนวน Transaction วันนี้</td><td className="p-2"><Badge className="bg-purple-500">ม่วง</Badge></td></tr>
                  <tr className="border-b"><td className="p-2 font-medium">ยอดเฉลี่ย/บิล (TA)</td><td className="p-2">ยอดขายหารจำนวนบิล</td><td className="p-2"><Badge className="bg-orange-500">ส้ม</Badge></td></tr>
                  <tr className="border-b"><td className="p-2 font-medium">ยอด Delivery รวม</td><td className="p-2">Grab + LINE MAN + Shopee + BK App</td><td className="p-2"><Badge className="bg-red-500">แดง</Badge></td></tr>
                  <tr><td className="p-2 font-medium">% Delivery</td><td className="p-2">เปอร์เซ็นต์ Delivery ต่อยอดรวม</td><td className="p-2"><Badge className="bg-cyan-500">ฟ้า</Badge></td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold">สีของ Badge แสดงผลลัพธ์</h4>
            <ul className="space-y-1">
              <li><Badge className="bg-green-500 mr-2">100%+</Badge> ถึงเป้า</li>
              <li><Badge className="bg-yellow-500 mr-2">90-99%</Badge> ใกล้เป้า</li>
              <li><Badge className="bg-red-500 mr-2">&lt;90%</Badge> ต่ำกว่าเป้า</li>
            </ul>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="font-medium">Dashboard displays real-time key metrics summary</p>
          
          <div className="space-y-2">
            <h4 className="font-semibold">Main KPI Cards (6 Cards)</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Card</th>
                    <th className="text-left p-2">Description</th>
                    <th className="text-left p-2">Color</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b"><td className="p-2 font-medium">Today's Sales</td><td className="p-2">Actual sales for current day</td><td className="p-2"><Badge className="bg-green-500">Green</Badge></td></tr>
                  <tr className="border-b"><td className="p-2 font-medium">Month to Date</td><td className="p-2">Accumulated sales from month start</td><td className="p-2"><Badge className="bg-blue-500">Blue</Badge></td></tr>
                  <tr className="border-b"><td className="p-2 font-medium">Transactions (TC)</td><td className="p-2">Today's transaction count</td><td className="p-2"><Badge className="bg-purple-500">Purple</Badge></td></tr>
                  <tr className="border-b"><td className="p-2 font-medium">Avg Ticket (TA)</td><td className="p-2">Sales divided by bills</td><td className="p-2"><Badge className="bg-orange-500">Orange</Badge></td></tr>
                  <tr className="border-b"><td className="p-2 font-medium">Delivery Total</td><td className="p-2">Grab + LINE MAN + Shopee + BK App</td><td className="p-2"><Badge className="bg-red-500">Red</Badge></td></tr>
                  <tr><td className="p-2 font-medium">Delivery %</td><td className="p-2">Delivery percentage of total</td><td className="p-2"><Badge className="bg-cyan-500">Cyan</Badge></td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "daily-sales",
      title: language === "th" ? "3. แท็บกรอกข้อมูล (Daily Sales)" : "3. Daily Sales Tab",
      icon: FileEdit,
      content: language === "th" ? (
        <div className="space-y-4">
          <p className="font-medium">หน้าสำหรับกรอกข้อมูลยอดขายประจำวันอย่างละเอียด</p>

          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="basic">
              <AccordionTrigger>ข้อมูลพื้นฐาน</AccordionTrigger>
              <AccordionContent>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li><strong>วันที่</strong> - วันที่ของรายงาน</li>
                  <li><strong>ผู้รายงาน</strong> - ชื่อผู้บันทึกข้อมูล</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="daily">
              <AccordionTrigger>ข้อมูลรายวัน (Daily) - พื้นหลังสีน้ำเงิน</AccordionTrigger>
              <AccordionContent>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li><strong>เป้า (TG)</strong> - เป้าหมายยอดขายประจำวัน (บาท)</li>
                  <li><strong>ยอดจริง (AC)</strong> - ยอดขายจริงประจำวัน (บาท)</li>
                  <li><strong>TC</strong> - จำนวนรายการ/บิล</li>
                  <li><strong>TA</strong> - ยอดเฉลี่ยต่อบิล (คำนวณอัตโนมัติ = AC ÷ TC)</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="mtd">
              <AccordionTrigger>ข้อมูล MTD - พื้นหลังสีเขียว</AccordionTrigger>
              <AccordionContent>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li><strong>MTD เป้า</strong> - เป้าหมายสะสมตั้งแต่ต้นเดือน</li>
                  <li><strong>MTD ยอดจริง</strong> - ยอดขายสะสมจริง</li>
                  <li><strong>ส่วนต่าง (Variance)</strong> - MTD Actual - MTD Target</li>
                  <li><strong>MTD TC</strong> - จำนวนรายการสะสม</li>
                  <li><strong>MTD TA</strong> - ยอดเฉลี่ยต่อบิลสะสม</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="instore">
              <AccordionTrigger>In Store - พื้นหลังสีส้ม</AccordionTrigger>
              <AccordionContent>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li><strong>Dine In</strong> - ยอดขายลูกค้านั่งทานในร้าน + TC + %</li>
                  <li><strong>Take Away</strong> - ยอดขายซื้อกลับบ้าน + TC + %</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="delivery">
              <AccordionTrigger>Delivery - พื้นหลังสีแดง</AccordionTrigger>
              <AccordionContent>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li><strong>Grab</strong> - ยอดขายจาก GrabFood</li>
                  <li><strong>LINE MAN</strong> - ยอดขายจาก LINE MAN</li>
                  <li><strong>Shopee Food</strong> - ยอดขายจาก Shopee Food</li>
                  <li><strong>BK App/Web</strong> - ยอดขายจาก BK App</li>
                  <li><strong>Delivery Total</strong> - รวมยอด Delivery (คำนวณอัตโนมัติ)</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="performance">
              <AccordionTrigger>Performance - พื้นหลังสีม่วง</AccordionTrigger>
              <AccordionContent>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li><strong>OSAT</strong> - คะแนนความพึงพอใจลูกค้า</li>
                  <li><strong>Survey Count</strong> - จำนวน Survey ที่ได้รับ</li>
                  <li><strong>Void</strong> - ยอดเงินและจำนวนบิลที่ Void</li>
                  <li><strong>SOS</strong> - Speed of Service (Daily และ MTD)</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="addons">
              <AccordionTrigger>Add-ons - พื้นหลังสีเหลือง</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li><strong>Add Cheese</strong> - จำนวนและเปอร์เซ็นต์</li>
                    <li><strong>V-meal</strong> - จำนวนและเปอร์เซ็นต์</li>
                    <li><strong>Up Size</strong> - จำนวนและเปอร์เซ็นต์</li>
                  </ul>
                  <div className="bg-muted p-3 rounded-lg mt-2">
                    <p className="font-medium">วิธีคำนวณ Add-on:</p>
                    <ol className="list-decimal list-inside space-y-1 ml-4 text-sm">
                      <li>กรอกจำนวน Count ของแต่ละ Add-on</li>
                      <li>คลิกปุ่มเครื่องคิดเลข</li>
                      <li>ใส่ตัวหาร (หรือใช้ TC เป็นค่าเริ่มต้น)</li>
                      <li>กด "คำนวณ" ระบบจะคำนวณ % ให้อัตโนมัติ</li>
                    </ol>
                    <p className="text-sm mt-2"><strong>สูตร:</strong> % = (Count ÷ ตัวหาร) × 100</p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="waste">
              <AccordionTrigger>Waste (ของเสีย)</AccordionTrigger>
              <AccordionContent>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li><strong>Waste Daily Total</strong> - รวมของเสียรายวัน (Raw + Meal)</li>
                  <li><strong>Waste Meal Daily</strong> - ของเสียประเภท Meal รายวัน</li>
                  <li><strong>Waste Raw Daily</strong> - คำนวณอัตโนมัติ (Total - Meal)</li>
                  <li><strong>Waste MTD</strong> - ของเสียสะสมประจำเดือน</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="labor">
              <AccordionTrigger>Labor (แรงงาน) - พื้นหลังสีฟ้า</AccordionTrigger>
              <AccordionContent>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li><strong>Labor Cost</strong> - ค่าแรงรวม (บาท)</li>
                  <li><strong>COL %</strong> - (Labor Cost ÷ ยอดขาย) × 100</li>
                  <li><strong>Labor Hour</strong> - ชั่วโมงทำงานรวม</li>
                  <li><strong>TCMH</strong> - TC ÷ Labor Hour</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="roster">
              <AccordionTrigger>Roster (ตารางงาน)</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3">
                  <div>
                    <p className="font-medium">ตารางงานผู้จัดการ:</p>
                    <p className="text-sm text-muted-foreground">เลือกกะการทำงานสำหรับผู้จัดการแต่ละคน</p>
                  </div>
                  <div>
                    <p className="font-medium">ตารางงานพนักงาน:</p>
                    <ol className="list-decimal list-inside space-y-1 ml-4 text-sm">
                      <li>เลือกกะเวลา</li>
                      <li>เลือกชื่อพนักงาน</li>
                      <li>กดปุ่ม + เพื่อเพิ่มพนักงานอีกคน</li>
                      <li>กดปุ่ม × เพื่อลบรายการ</li>
                    </ol>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="autosave">
              <AccordionTrigger>การบันทึกข้อมูล</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  <p><strong>Auto-Save:</strong> ระบบจะบันทึกอัตโนมัติทุก 1.5 วินาทีหลังจากหยุดพิมพ์</p>
                  <p className="font-medium mt-2">ปุ่มควบคุม:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li><strong>ล้างข้อมูล</strong> - ลบข้อมูลในฟอร์มทั้งหมด</li>
                    <li><strong>คัดลอกรายงาน</strong> - คัดลอกรายงานไปยัง Clipboard</li>
                    <li><strong>บันทึก</strong> - บันทึกข้อมูลทั้งหมดไปยังเซิร์ฟเวอร์</li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="font-medium">Page for detailed daily sales data entry</p>
          <p className="text-muted-foreground">This page includes sections for: Basic Info, Daily Sales, MTD, In Store, Delivery, Performance, Add-ons, Waste, Labor, and Roster.</p>
        </div>
      ),
    },
    {
      id: "reports",
      title: language === "th" ? "4. แท็บรายงาน (Reports)" : "4. Reports Tab",
      icon: FileText,
      content: language === "th" ? (
        <div className="space-y-4">
          <p className="font-medium">หน้าสำหรับดูและค้นหารายงานย้อนหลัง</p>

          <div className="space-y-2">
            <h4 className="font-semibold">การกรองรายงาน</h4>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li><strong>กรองตามวันที่</strong> - เลือกวันที่ที่ต้องการดู</li>
              <li><strong>แสดงทั้งหมด</strong> - ล้างตัวกรองแสดงทุกรายงาน</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold">ข้อมูลในแต่ละรายงาน</h4>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>วันที่, กะ, ผู้รายงาน</li>
              <li>% ของเป้า (Badge สี)</li>
              <li>ยอดขายจริง, เป้าหมาย, ส่วนต่าง</li>
              <li>จำนวน Transaction</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold">การแก้ไขรายงาน</h4>
            <ol className="list-decimal list-inside space-y-1 ml-4">
              <li>คลิกไอคอนดินสอที่รายงานที่ต้องการแก้</li>
              <li>แก้ไขข้อมูลในหน้าต่าง Dialog</li>
              <li>กด "บันทึก" เพื่อบันทึกการแก้ไข</li>
            </ol>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold">การลบรายงาน</h4>
            <ol className="list-decimal list-inside space-y-1 ml-4">
              <li>คลิกไอคอนถังขยะที่รายงานที่ต้องการลบ</li>
              <li>ยืนยันการลบในหน้าต่าง Dialog</li>
            </ol>
            <p className="text-destructive text-sm font-medium">คำเตือน: การลบไม่สามารถย้อนกลับได้!</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="font-medium">Page for viewing and searching historical reports</p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Filter by date or show all</li>
            <li>Edit reports by clicking pencil icon</li>
            <li>Delete reports by clicking trash icon</li>
          </ul>
        </div>
      ),
    },
    {
      id: "settings",
      title: language === "th" ? "5. แท็บตั้งค่า (Settings)" : "5. Settings Tab",
      icon: Settings,
      content: language === "th" ? (
        <div className="space-y-4">
          <p className="font-medium">หน้าสำหรับตั้งค่าเป้าหมายและข้อมูลร้าน</p>
          <p className="text-muted-foreground">(สำหรับ Manager/Admin เท่านั้น)</p>

          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="store-info">
              <AccordionTrigger>ข้อมูลร้าน</AccordionTrigger>
              <AccordionContent>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li><strong>รหัสร้าน:</strong> Grand Diamond</li>
                  <li><strong>ชื่อร้าน:</strong> Grand Diamond</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="labor-params">
              <AccordionTrigger>พารามิเตอร์ Labor</AccordionTrigger>
              <AccordionContent>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li><strong>Duty Team Hours</strong> - ชั่วโมงทีมผู้จัดการต่อวัน (ค่าเริ่มต้น: 40 ชม.)</li>
                  <li><strong>PPH (Hourly Rate)</strong> - ค่าแรงต่อชั่วโมง (ค่าเริ่มต้น: ฿84)</li>
                </ul>
                <div className="bg-muted p-3 rounded-lg mt-2">
                  <p className="font-medium">สูตรคำนวณ:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4 text-sm">
                    <li>Summary Hr = Duty Team + Actual Hr + OT Hr</li>
                    <li>Variance Hr = Summary Hr - Roster Commit</li>
                    <li>COL (฿) = Summary Hr × PPH</li>
                    <li>COL % = (COL ÷ Sales) × 100</li>
                    <li>TCMH = TC ÷ Summary Hr</li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="excel-table">
              <AccordionTrigger>ตารางข้อมูลรายวัน (22 คอลัมน์)</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3">
                  <p className="text-sm">ตารางแบบ Excel สำหรับดูและแก้ไขข้อมูลทั้งเดือน</p>
                  
                  <div className="space-y-2">
                    <p className="font-medium text-green-600">คอลัมน์ที่กรอกได้ (Input):</p>
                    <ul className="list-disc list-inside space-y-1 ml-4 text-sm">
                      <li>Target, Actual Sales, Actual TC</li>
                      <li>Recommend Hr, Roster Commit, Actual Hr, OT Hr</li>
                      <li>Waste Daily (฿)</li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <p className="font-medium text-blue-600">คอลัมน์คำนวณอัตโนมัติ:</p>
                    <ul className="list-disc list-inside space-y-1 ml-4 text-sm">
                      <li>Sales MTD, TC MTD, MTD Roster</li>
                      <li>Summary Hr, MTD Hr, Variance Hr</li>
                      <li>COL (฿), MTD COL, COL %</li>
                      <li>TCMH, Waste MTD, Waste %</li>
                    </ul>
                  </div>

                  <div className="bg-muted p-3 rounded-lg">
                    <p className="font-medium">วิธีใช้งาน:</p>
                    <ol className="list-decimal list-inside space-y-1 ml-4 text-sm">
                      <li>เลือกเดือนที่ต้องการด้วยปุ่ม &lt; &gt;</li>
                      <li>เลื่อนตารางซ้าย-ขวาเพื่อดูคอลัมน์ทั้งหมด</li>
                      <li>กรอกข้อมูลในช่องที่มีพื้นหลังขาว</li>
                      <li>กดปุ่ม "บันทึกข้อมูล" เมื่อเสร็จสิ้น</li>
                      <li>กดปุ่ม "Undo" เพื่อคืนค่าข้อมูลเดิมก่อนบันทึก</li>
                    </ol>
                  </div>

                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-3 rounded-lg mt-2">
                    <p className="font-medium text-yellow-700 dark:text-yellow-400">ปุ่ม Undo:</p>
                    <p className="text-sm mt-1">ใช้คืนค่าข้อมูล Target และ Sales Data ทั้งหมดกลับเป็นค่าเดิมที่โหลดมาจากระบบ (ก่อนการแก้ไข)</p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="font-medium">Settings page for targets and store info (Manager/Admin only)</p>
          
          <div className="space-y-2">
            <h4 className="font-semibold">Store Information</h4>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Store Code: Grand Diamond</li>
              <li>Store Name: Grand Diamond</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold">Labor Parameters</h4>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li><strong>Duty Team Hours</strong> - Manager team hours per day (default: 40 hrs)</li>
              <li><strong>PPH (Hourly Rate)</strong> - Wage per hour (default: ฿84)</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold">Excel-style Daily Data Table (22 Columns)</h4>
            <p className="text-sm text-muted-foreground">View and edit monthly data including: Target, Sales, TC, Labor Hours, COL calculations, and Waste tracking with MTD running totals.</p>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold">Undo Button</h4>
            <p className="text-sm text-muted-foreground">Click "Undo" to restore all Target and Sales Data to their original values before editing.</p>
          </div>
        </div>
      ),
    },
    {
      id: "glossary",
      title: language === "th" ? "6. คำศัพท์และตัวย่อ" : "6. Glossary",
      icon: Calculator,
      content: language === "th" ? (
        <div className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b bg-muted">
                  <th className="text-left p-2">ตัวย่อ</th>
                  <th className="text-left p-2">ภาษาอังกฤษ</th>
                  <th className="text-left p-2">ความหมาย</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b"><td className="p-2 font-medium">AC</td><td className="p-2">Actual</td><td className="p-2">ยอดขายจริง</td></tr>
                <tr className="border-b"><td className="p-2 font-medium">TG</td><td className="p-2">Target</td><td className="p-2">เป้าหมาย</td></tr>
                <tr className="border-b"><td className="p-2 font-medium">TC</td><td className="p-2">Transaction Count</td><td className="p-2">จำนวนรายการ/บิล</td></tr>
                <tr className="border-b"><td className="p-2 font-medium">TA</td><td className="p-2">Transaction Average</td><td className="p-2">ยอดเฉลี่ยต่อบิล</td></tr>
                <tr className="border-b"><td className="p-2 font-medium">MTD</td><td className="p-2">Month-to-Date</td><td className="p-2">ยอดสะสมตั้งแต่ต้นเดือน</td></tr>
                <tr className="border-b"><td className="p-2 font-medium">OSAT</td><td className="p-2">Overall Satisfaction</td><td className="p-2">คะแนนความพึงพอใจรวม</td></tr>
                <tr className="border-b"><td className="p-2 font-medium">SOS</td><td className="p-2">Speed of Service</td><td className="p-2">ความเร็วในการให้บริการ</td></tr>
                <tr className="border-b"><td className="p-2 font-medium">COL</td><td className="p-2">Cost of Labor</td><td className="p-2">ต้นทุนค่าแรง</td></tr>
                <tr className="border-b"><td className="p-2 font-medium">TCMH</td><td className="p-2">TC per Man Hour</td><td className="p-2">จำนวนรายการต่อชั่วโมงทำงาน</td></tr>
                <tr><td className="p-2 font-medium">Void</td><td className="p-2">Void</td><td className="p-2">รายการยกเลิก</td></tr>
              </tbody>
            </table>
          </div>

          <div className="space-y-2 mt-4">
            <h4 className="font-semibold">สูตรคำนวณสำคัญ</h4>
            <div className="bg-muted p-3 rounded-lg space-y-1 text-sm font-mono">
              <p>TA = ยอดขาย ÷ TC</p>
              <p>Variance = ยอดจริง - เป้าหมาย</p>
              <p>% ของเป้า = (ยอดจริง ÷ เป้าหมาย) × 100</p>
              <p>Delivery % = (ยอด Delivery รวม ÷ ยอดขายรวม) × 100</p>
              <p>COL % = (Labor Cost ÷ ยอดขาย) × 100</p>
              <p>TCMH = TC ÷ Labor Hour</p>
              <p>Add-on % = (Count ÷ ตัวหาร) × 100</p>
              <p>Waste Raw = Waste Total - Waste Meal</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="font-medium">Common abbreviations and their meanings</p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li><strong>AC</strong> - Actual Sales</li>
            <li><strong>TG</strong> - Target</li>
            <li><strong>TC</strong> - Transaction Count</li>
            <li><strong>TA</strong> - Transaction Average</li>
            <li><strong>MTD</strong> - Month-to-Date</li>
            <li><strong>OSAT</strong> - Overall Satisfaction</li>
            <li><strong>SOS</strong> - Speed of Service</li>
            <li><strong>COL</strong> - Cost of Labor</li>
            <li><strong>TCMH</strong> - Transaction Count per Man Hour</li>
          </ul>
        </div>
      ),
    },
    {
      id: "troubleshooting",
      title: language === "th" ? "7. การแก้ไขปัญหาเบื้องต้น" : "7. Troubleshooting",
      icon: HelpCircle,
      content: language === "th" ? (
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold text-destructive">ปัญหา: ข้อมูลไม่บันทึก</h4>
              <p className="text-sm mt-2">วิธีแก้ไข:</p>
              <ol className="list-decimal list-inside space-y-1 ml-4 text-sm">
                <li>ตรวจสอบว่ากรอก "วันที่" และ "ผู้รายงาน" ครบถ้วน</li>
                <li>รอให้แสดง "บันทึกแล้ว" ก่อนออกจากหน้า</li>
                <li>ตรวจสอบการเชื่อมต่ออินเทอร์เน็ต</li>
              </ol>
            </div>

            <div className="border rounded-lg p-4">
              <h4 className="font-semibold text-destructive">ปัญหา: MTD ไม่อัปเดต</h4>
              <p className="text-sm mt-2">วิธีแก้ไข:</p>
              <ol className="list-decimal list-inside space-y-1 ml-4 text-sm">
                <li>MTD จะอัปเดตเมื่อเลือกวันที่ใหม่</li>
                <li>รอสักครู่เพื่อให้ระบบดึงข้อมูลจากเซิร์ฟเวอร์</li>
              </ol>
            </div>

            <div className="border rounded-lg p-4">
              <h4 className="font-semibold text-destructive">ปัญหา: ไม่สามารถลบรายงานได้</h4>
              <p className="text-sm mt-2">วิธีแก้ไข:</p>
              <ol className="list-decimal list-inside space-y-1 ml-4 text-sm">
                <li>ตรวจสอบว่ามีสิทธิ์ Manager หรือ Admin</li>
                <li>ติดต่อผู้ดูแลระบบหากปัญหายังคงอยู่</li>
              </ol>
            </div>

            <div className="border rounded-lg p-4">
              <h4 className="font-semibold text-destructive">ปัญหา: เปอร์เซ็นต์ Add-on คำนวณไม่ถูก</h4>
              <p className="text-sm mt-2">วิธีแก้ไข:</p>
              <ol className="list-decimal list-inside space-y-1 ml-4 text-sm">
                <li>ตรวจสอบว่ากรอก TC หรือตัวหารที่ถูกต้อง</li>
                <li>ใช้ปุ่มเครื่องคิดเลขเพื่อคำนวณอัตโนมัติ</li>
              </ol>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="font-medium">Common issues and solutions</p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li><strong>Data not saving:</strong> Check date and reporter fields, wait for "Saved" status</li>
            <li><strong>MTD not updating:</strong> Select a new date and wait for server response</li>
            <li><strong>Cannot delete report:</strong> Check Manager/Admin permissions</li>
            <li><strong>Add-on % incorrect:</strong> Verify TC or divisor value</li>
          </ul>
        </div>
      ),
    },
  ];

  return (
    <SalesLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-manual-title">
                {t.title}
              </h1>
              <p className="text-muted-foreground text-sm">{t.subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">v{t.version}</Badge>
            <Badge variant="secondary">{t.lastUpdated}</Badge>
          </div>
        </div>

        <ScrollArea className="h-[calc(100vh-280px)]">
          <div className="space-y-4 pr-4">
            {sections.map((section) => (
              <Card key={section.id} data-testid={`card-manual-${section.id}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-3 text-lg">
                    <section.icon className="w-5 h-5 text-primary" />
                    {section.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>{section.content}</CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>

        <div className="text-center text-sm text-muted-foreground pt-4 border-t">
          <p>Developer: Chanon | Version {t.version} | Last Updated: {t.lastUpdated}</p>
          <p className="mt-1">© 2025-2026 Grand Diamond. All Rights Reserved.</p>
        </div>
      </div>
    </SalesLayout>
  );
}
