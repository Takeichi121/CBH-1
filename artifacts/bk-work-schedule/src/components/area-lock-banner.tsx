import { useState } from "react";
import { useAreaLock } from "@/hooks/use-area-lock";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Lock, Unlock, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function AreaLockBanner() {
  const { isAreaUser, isUnlocked, unlock, lock, unlockUntil } = useAreaLock();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  if (!isAreaUser) return null;

  const handleUnlock = async () => {
    setLoading(true);
    const result = await unlock(password);
    setLoading(false);
    if (result.ok) {
      toast({ title: "ปลดล็อกสำเร็จ", description: "สามารถแก้ไขข้อมูลได้ 30 นาที" });
      setDialogOpen(false);
      setPassword("");
    } else {
      toast({ title: "ล้มเหลว", description: result.message || "รหัสผ่านไม่ถูกต้อง", variant: "destructive" });
    }
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <>
      {isUnlocked ? (
        <div className="flex items-center justify-between rounded-lg px-4 py-2 mb-3 bg-green-50 dark:bg-green-950 border border-green-300 dark:border-green-800 text-green-800 dark:text-green-300 text-sm">
          <span className="flex items-center gap-2">
            <Unlock className="w-4 h-4" />
            <span>โหมดแก้ไข (หมดอายุ {unlockUntil ? formatTime(unlockUntil) : ""}  น.)</span>
          </span>
          <Button size="sm" variant="outline" onClick={lock} className="h-7 text-xs border-green-400">
            ล็อก
          </Button>
        </div>
      ) : (
        <div className="flex items-center justify-between rounded-lg px-4 py-2 mb-3 bg-amber-50 dark:bg-amber-950 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-sm">
          <span className="flex items-center gap-2">
            <Lock className="w-4 h-4" />
            <span>Area Mode — กดปลดล็อกเพื่อแก้ไข</span>
          </span>
          <Button size="sm" variant="outline" onClick={() => setDialogOpen(true)} className="h-7 text-xs border-amber-400">
            ปลดล็อก
          </Button>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Unlock className="w-4 h-4" /> ปลดล็อกเพื่อแก้ไข
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">กรอกรหัสผ่านของคุณเพื่อปลดล็อกโหมดแก้ไข (30 นาที)</p>
            <Input
              type="password"
              placeholder="รหัสผ่าน"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !loading && handleUnlock()}
              autoFocus
              data-testid="input-area-unlock-password"
            />
            <Button className="w-full" onClick={handleUnlock} disabled={loading || !password}>
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Unlock className="w-4 h-4 mr-2" />}
              ปลดล็อก
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
