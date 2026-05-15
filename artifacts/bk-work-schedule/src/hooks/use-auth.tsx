import { createContext, useContext, ReactNode, useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { safeStorage } from "@/lib/safe-storage";

type User = {
  username: string;
  role: "staff" | "manager" | "admin" | "area" | "viewer";
  fullName: string;
  fullNameTh?: string;
  nickName?: string;
  email?: string;
  phone?: string;
  position?: string;
  profilePicture?: string;
  profileComplete?: boolean;
  mustChangePassword?: boolean;
  allowedFeatures?: string[] | null;
  storeId?: string | null;
};

const SELECTED_STORE_KEY = "selected_store_id";

type AuthContextType = {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  loginMutation: ReturnType<typeof useLoginMutation>;
  logoutMutation: ReturnType<typeof useLogoutMutation>;
  registerStaffMutation: ReturnType<typeof useRegisterStaffMutation>;
  registerManagerMutation: ReturnType<typeof useRegisterManagerMutation>;
  completeProfileMutation: ReturnType<typeof useCompleteProfileMutation>;
  forceChangePasswordMutation: ReturnType<typeof useForceChangePasswordMutation>;
  setUserProfileComplete: (profileData?: { nickName?: string; phone?: string; email?: string }) => void;
  setUserPasswordChanged: () => void;
  setUserProfilePicture: (profilePicture: string) => void;
  selectedStoreId: string | null;
  setSelectedStoreId: (id: string) => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

const TOKEN_KEY = "bk_token";
const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

function authHeaders(token?: string | null) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => safeStorage.getItem(TOKEN_KEY));
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStoreId, setSelectedStoreIdState] = useState<string | null>(() => {
    const stored = safeStorage.getItem(SELECTED_STORE_KEY);
    if (stored === 'BK001GDP') {
      safeStorage.removeItem(SELECTED_STORE_KEY);
      return null;
    }
    return stored;
  });
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const setSelectedStoreId = (id: string) => {
    safeStorage.setItem(SELECTED_STORE_KEY, id);
    setSelectedStoreIdState(id);
    // Invalidate all queries so data refreshes for new store
    queryClient.invalidateQueries();
  };

  const clearSession = () => {
    safeStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  };

  // Validate token on mount
  useEffect(() => {
    let cancelled = false;

    async function validateSession() {
      const storedToken = safeStorage.getItem(TOKEN_KEY);

      // Always call validate — server reads bk_session cookie first (cookie-primary auth).
      // storedToken is sent as fallback if present; if absent the cookie alone is enough.
      try {
        const res = await fetch(api.auth.validate.path, {
          method: "POST",
          credentials: "include", // Send bk_session cookie on cross-origin requests
          headers: authHeaders(storedToken),
          body: JSON.stringify({ token: storedToken ?? undefined }),
        });

        const data = await res.json();

        if (!cancelled) {
          if (data?.ok && data?.user) {
            setUser(data.user);
            // Keep/restore stored token; cookie session is handled by browser automatically
            if (storedToken) setToken(storedToken);
          } else {
            clearSession();
          }
        }
      } catch (error) {
        console.error("Auth validation failed", error);
        if (!cancelled) clearSession();
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    validateSession();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loginMutation = useLoginMutation(setUser, setToken, setLocation, toast, queryClient);
  const logoutMutation = useLogoutMutation(setUser, setToken, setLocation, toast, queryClient, clearSession);

  // Idle session timeout — auto-logout after 30 minutes of inactivity
  useEffect(() => {
    if (!user) return; // Only run when logged in

    let idleTimer: ReturnType<typeof setTimeout>;

    const resetTimer = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        toast({
          variant: "destructive",
          title: "หมดเวลาใช้งาน",
          description: "คุณไม่ได้ใช้งานนานเกิน 30 นาที กรุณา login ใหม่",
        });
        logoutMutation.mutate();
      }, IDLE_TIMEOUT_MS);
    };

    const events = ["mousemove", "keydown", "touchstart", "click"] as const;
    events.forEach((e) => window.addEventListener(e, resetTimer, { passive: true }));
    resetTimer(); // Start the initial countdown

    return () => {
      clearTimeout(idleTimer);
      events.forEach((e) => window.removeEventListener(e, resetTimer));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const registerStaffMutation = useRegisterStaffMutation(toast, queryClient);
  const registerManagerMutation = useRegisterManagerMutation(toast, queryClient);

  const completeProfileMutation = useCompleteProfileMutation(token, toast);
  const forceChangePasswordMutation = useForceChangePasswordMutation(token, toast);

  const setUserProfileComplete = (profileData?: { nickName?: string; phone?: string; email?: string }) => {
    setUser((prev) =>
      prev
        ? {
            ...prev,
            profileComplete: true,
            ...(profileData || {}),
          }
        : null
    );
  };

  const setUserPasswordChanged = () => {
    setUser((prev) => (prev ? { ...prev, mustChangePassword: false } : null));
  };

  const setUserProfilePicture = (profilePicture: string) => {
    setUser((prev) => (prev ? { ...prev, profilePicture } : null));
  };

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      token,
      isLoading,
      loginMutation,
      logoutMutation,
      registerStaffMutation,
      registerManagerMutation,
      completeProfileMutation,
      forceChangePasswordMutation,
      setUserProfileComplete,
      setUserPasswordChanged,
      setUserProfilePicture,
      selectedStoreId,
      setSelectedStoreId,
    }),
    [
      user,
      token,
      isLoading,
      loginMutation,
      logoutMutation,
      registerStaffMutation,
      registerManagerMutation,
      completeProfileMutation,
      forceChangePasswordMutation,
      selectedStoreId,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}

// --- Mutations ---

function useLoginMutation(
  setUser: (u: User | null) => void,
  setToken: (t: string | null) => void,
  setLocation: (loc: string) => void,
  toast: any,
  queryClient: ReturnType<typeof useQueryClient>
) {
  return useMutation({
    mutationFn: async (creds: z.infer<typeof api.auth.login.input>) => {
      const res = await fetch(api.auth.login.path, {
        method: "POST",
        credentials: "include", // Receive Set-Cookie (bk_session) from server response
        headers: authHeaders(null),
        body: JSON.stringify(creds),
      });
      return await res.json();
    },
    onSuccess: (data) => {
      if (data?.ok) {
        setUser(data.user);
        setToken(data.token);
        safeStorage.setItem(TOKEN_KEY, data.token);

        // กัน cache ของ user/role เก่า
        queryClient.invalidateQueries();

        toast({ title: "Welcome back!", description: `Logged in as ${data.user.username}` });
        setLocation("/work");
      } else {
        toast({
          variant: "destructive",
          title: "Login Failed",
          description: data?.message || "Invalid credentials",
        });
      }
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Something went wrong. Please try again.",
      });
    },
  });
}

function useLogoutMutation(
  setUser: (u: User | null) => void,
  setToken: (t: string | null) => void,
  setLocation: (loc: string) => void,
  toast: any,
  queryClient: ReturnType<typeof useQueryClient>,
  clearSession: () => void
) {
  return useMutation({
    mutationFn: async () => {
      const t = safeStorage.getItem(TOKEN_KEY);
      // Always call server logout — even without a localStorage token, the server
      // must clear the bk_session cookie (cookie-only sessions exist after migration).
      const res = await fetch(api.auth.logout.path, {
        method: "POST",
        credentials: "include", // Send bk_session cookie so server can clear it
        headers: authHeaders(t),
        body: JSON.stringify({ token: t ?? undefined }),
      });
      return await res.json();
    },
    onSuccess: () => {
      clearSession();
      setUser(null);
      setToken(null);

      // ล้าง cache ให้หมด กันข้อมูล role/สิทธิ์ค้าง
      queryClient.clear();

      setLocation("/");
      toast({ title: "Logged out", description: "See you next time!" });
    },
    onError: () => {
      // ต่อให้ API ล้ม ก็ให้ user หลุด session ไปก่อน (กัน stuck)
      clearSession();
      queryClient.clear();
      setLocation("/");
      toast({ title: "Logged out", description: "Session cleared." });
    },
  });
}

function useRegisterStaffMutation(toast: any, queryClient: ReturnType<typeof useQueryClient>) {
  return useMutation({
    mutationFn: async (data: z.infer<typeof api.auth.registerStaff.input>) => {
      const res = await fetch(api.auth.registerStaff.path, {
        method: "POST",
        headers: authHeaders(null),
        body: JSON.stringify(data),
      });
      return await res.json();
    },
    onSuccess: (data) => {
      if (data?.ok) {
        toast({ title: "Registration Successful", description: `Account created: ${data.username}` });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/getUsers"] });
      } else {
        toast({ variant: "destructive", title: "Registration Failed", description: data?.message || "Failed" });
      }
    },
    onError: () => {
      toast({ variant: "destructive", title: "Registration Failed", description: "Something went wrong" });
    },
  });
}

function useRegisterManagerMutation(toast: any, queryClient: ReturnType<typeof useQueryClient>) {
  return useMutation({
    mutationFn: async (data: z.infer<typeof api.auth.registerManager.input>) => {
      const res = await fetch(api.auth.registerManager.path, {
        method: "POST",
        headers: authHeaders(null),
        body: JSON.stringify(data),
      });
      return await res.json();
    },
    onSuccess: (data) => {
      if (data?.ok) {
        toast({ title: "Manager Account Created", description: `Welcome, ${data.username}!` });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/getUsers"] });
      } else {
        toast({ variant: "destructive", title: "Registration Failed", description: data?.message || "Failed" });
      }
    },
    onError: () => {
      toast({ variant: "destructive", title: "Registration Failed", description: "Something went wrong" });
    },
  });
}

function useCompleteProfileMutation(token: string | null, toast: any) {
  return useMutation({
    mutationFn: async (data: { nickName: string; phone: string; email: string }) => {
      const res = await fetch(api.auth.completeProfile.path, {
        method: "POST",
        headers: authHeaders(token),
        // ส่ง token เผื่อ backend ยังอ่านจาก body
        body: JSON.stringify({ ...data, token }),
      });
      return await res.json();
    },
    onSuccess: (data) => {
      if (data?.ok) {
        toast({ title: "Profile Complete", description: "Your profile has been updated" });
      } else {
        toast({ variant: "destructive", title: "Error", description: data?.message || "Failed to update profile" });
      }
    },
    onError: () => {
      toast({ variant: "destructive", title: "Error", description: "Something went wrong" });
    },
  });
}

function useForceChangePasswordMutation(token: string | null, toast: any) {
  return useMutation({
    mutationFn: async (data: { newPassword: string }) => {
      // ถ้าใน api มี route ก็ให้เปลี่ยนมาใช้ api.* ได้ทีหลัง
      const res = await fetch("/api/forceChangePassword", {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify({ ...data, token }),
      });
      return await res.json();
    },
    onSuccess: (data) => {
      if (data?.ok) {
        toast({ title: "Password Updated", description: "Your password has been changed successfully" });
      } else {
        toast({ variant: "destructive", title: "Error", description: data?.message || "Failed to change password" });
      }
    },
    onError: () => {
      toast({ variant: "destructive", title: "Error", description: "Something went wrong" });
    },
  });
}
