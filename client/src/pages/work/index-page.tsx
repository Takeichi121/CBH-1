import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { LoadingScreen } from "@/components/loading-screen";

export default function WorkIndexPage() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && user) {
      const isManager = user.role === "manager" || user.role === "admin";
      if (isManager) {
        setLocation("/work/manager");
      } else {
        setLocation("/work/employee");
      }
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) return <LoadingScreen />;
  
  return <LoadingScreen />;
}
