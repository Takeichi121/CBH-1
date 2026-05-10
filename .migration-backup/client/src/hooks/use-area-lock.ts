import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";

const LOCK_KEY = "area_unlock_until";
const UNLOCK_DURATION_MS = 30 * 60 * 1000;

export function useAreaLock() {
  const { user, token } = useAuth();
  const isAreaUser = user?.role === "area";

  const getIsUnlocked = useCallback(() => {
    if (!isAreaUser) return true;
    const until = localStorage.getItem(LOCK_KEY);
    if (!until) return false;
    return Date.now() < Number(until);
  }, [isAreaUser]);

  const [isUnlocked, setIsUnlocked] = useState(getIsUnlocked);

  useEffect(() => {
    if (!isAreaUser) return;
    setIsUnlocked(getIsUnlocked());
    const interval = setInterval(() => {
      setIsUnlocked(getIsUnlocked());
    }, 10000);
    return () => clearInterval(interval);
  }, [isAreaUser, getIsUnlocked]);

  const unlock = useCallback(
    async (password: string): Promise<{ ok: boolean; message?: string }> => {
      if (!token) return { ok: false, message: "ไม่พบ session" };
      try {
        const res = await fetch("/api/auth/verify-password", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ token, password }),
        });
        const data = await res.json();
        if (data.ok) {
          localStorage.setItem(LOCK_KEY, String(Date.now() + UNLOCK_DURATION_MS));
          setIsUnlocked(true);
          return { ok: true };
        }
        return { ok: false, message: "รหัสผ่านไม่ถูกต้อง" };
      } catch {
        return { ok: false, message: "เกิดข้อผิดพลาด" };
      }
    },
    [token],
  );

  const lock = useCallback(() => {
    localStorage.removeItem(LOCK_KEY);
    setIsUnlocked(false);
  }, []);

  const unlockUntil = isUnlocked ? Number(localStorage.getItem(LOCK_KEY) || 0) : null;

  return { isAreaUser, isUnlocked, unlock, lock, unlockUntil };
}
