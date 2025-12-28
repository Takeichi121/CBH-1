import { createContext, useContext, ReactNode, useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

type User = {
  username: string;
  role: "staff" | "manager" | "admin";
  fullName: string;
  nickName?: string;
  email?: string;
  phone?: string;
  position?: string;
  profileComplete?: boolean;
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  loginMutation: ReturnType<typeof useLoginMutation>;
  logoutMutation: ReturnType<typeof useLogoutMutation>;
  registerStaffMutation: ReturnType<typeof useRegisterStaffMutation>;
  registerManagerMutation: ReturnType<typeof useRegisterManagerMutation>;
  completeProfileMutation: ReturnType<typeof useCompleteProfileMutation>;
  setUserProfileComplete: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem("bk_token"));
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Validate token on mount
  useEffect(() => {
    async function validateSession() {
      const storedToken = localStorage.getItem("bk_token");
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch(api.auth.validate.path, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: storedToken }),
        });
        
        const data = await res.json();
        if (data.ok && data.user) {
          setUser(data.user);
          setToken(storedToken);
        } else {
          localStorage.removeItem("bk_token");
          setToken(null);
          setUser(null);
        }
      } catch (error) {
        console.error("Auth validation failed", error);
        localStorage.removeItem("bk_token");
      } finally {
        setIsLoading(false);
      }
    }

    validateSession();
  }, []);

  const loginMutation = useLoginMutation(setUser, setToken, setLocation, toast);
  const logoutMutation = useLogoutMutation(setUser, setToken, setLocation, toast);
  const registerStaffMutation = useRegisterStaffMutation(toast);
  const registerManagerMutation = useRegisterManagerMutation(toast);
  const completeProfileMutation = useCompleteProfileMutation(token, toast);

  const setUserProfileComplete = () => {
    setUser((prev) => prev ? { ...prev, profileComplete: true } : null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        loginMutation,
        logoutMutation,
        registerStaffMutation,
        registerManagerMutation,
        completeProfileMutation,
        setUserProfileComplete,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// --- Mutations ---

function useLoginMutation(
  setUser: (u: User | null) => void,
  setToken: (t: string | null) => void,
  setLocation: (loc: string) => void,
  toast: any
) {
  return useMutation({
    mutationFn: async (creds: z.infer<typeof api.auth.login.input>) => {
      const res = await fetch(api.auth.login.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(creds),
      });
      return await res.json();
    },
    onSuccess: (data) => {
      if (data.ok) {
        setUser(data.user);
        setToken(data.token);
        localStorage.setItem("bk_token", data.token);
        toast({ title: "Welcome back!", description: `Logged in as ${data.user.username}` });
        setLocation("/work");
      } else {
        toast({
          variant: "destructive",
          title: "Login Failed",
          description: data.message || "Invalid credentials",
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
  setUser: (u: null) => void,
  setToken: (t: null) => void,
  setLocation: (loc: string) => void,
  toast: any
) {
  return useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem("bk_token");
      if (!token) return { ok: true };
      
      const res = await fetch(api.auth.logout.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      return await res.json();
    },
    onSuccess: () => {
      localStorage.removeItem("bk_token");
      setUser(null);
      setToken(null);
      setLocation("/");
      toast({ title: "Logged out", description: "See you next time!" });
    },
  });
}

function useRegisterStaffMutation(toast: any) {
  return useMutation({
    mutationFn: async (data: z.infer<typeof api.auth.registerStaff.input>) => {
      const res = await fetch(api.auth.registerStaff.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return await res.json();
    },
    onSuccess: (data) => {
      if (data.ok) {
        toast({ title: "Registration Successful", description: `Account created: ${data.username}` });
      } else {
        toast({ variant: "destructive", title: "Registration Failed", description: data.message });
      }
    },
  });
}

function useRegisterManagerMutation(toast: any) {
  return useMutation({
    mutationFn: async (data: z.infer<typeof api.auth.registerManager.input>) => {
      const res = await fetch(api.auth.registerManager.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return await res.json();
    },
    onSuccess: (data) => {
      if (data.ok) {
        toast({ title: "Manager Account Created", description: `Welcome, ${data.username}!` });
      } else {
        toast({ variant: "destructive", title: "Registration Failed", description: data.message });
      }
    },
  });
}

function useCompleteProfileMutation(token: string | null, toast: any) {
  return useMutation({
    mutationFn: async (data: { nickName: string; phone: string; email: string }) => {
      const res = await fetch(api.auth.completeProfile.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, token }),
      });
      return await res.json();
    },
    onSuccess: (data) => {
      if (data.ok) {
        toast({ title: "Profile Complete", description: "Your profile has been updated" });
      } else {
        toast({ variant: "destructive", title: "Error", description: data.message || "Failed to update profile" });
      }
    },
    onError: () => {
      toast({ variant: "destructive", title: "Error", description: "Something went wrong" });
    },
  });
}
