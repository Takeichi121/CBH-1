import { useState } from "react";
import { useLanguage } from "@/lib/i18n";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings as SettingsIcon, Building2, ShoppingBag } from "lucide-react";
import { BorrowLayout } from "./borrow-layout"; // ✅ เพิ่ม Layout เพื่อให้มีเมนู
import Branches from "./Branches"; // ต้องมั่นใจว่ามีไฟล์ Branches.tsx อยู่โฟลเดอร์เดียวกัน
import Items from "./Items";       // ต้องมั่นใจว่ามีไฟล์ Items.tsx อยู่โฟลเดอร์เดียวกัน

export default function Settings() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("branches");

  return (
    <BorrowLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <SettingsIcon className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold" data-testid="text-settings-title">
            {t.nav.settings}
          </h1>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="branches" className="flex items-center gap-2" data-testid="tab-branches">
              <Building2 className="h-4 w-4" />
              {t.nav.branches}
            </TabsTrigger>
            <TabsTrigger value="items" className="flex items-center gap-2" data-testid="tab-items">
              <ShoppingBag className="h-4 w-4" />
              {t.nav.items}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="branches" className="mt-6">
            {/* เรียกใช้ Component สาขาที่เราทำไว้ */}
            <Branches />
          </TabsContent>

          <TabsContent value="items" className="mt-6">
            {/* เรียกใช้ Component สินค้าที่เราทำไว้ */}
            <Items />
          </TabsContent>
        </Tabs>
      </div>
    </BorrowLayout>
  );
}