import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useAuth } from "./use-auth";
import { useToast } from "@/hooks/use-toast";

export function useSettings() {
  const { token } = useAuth();

  return useQuery({
    queryKey: [api.settings.get.path, token],
    enabled: !!token,
    queryFn: async () => {
      const res = await fetch(api.settings.get.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) throw new Error("Failed to fetch settings");
      const data = await res.json();
      if (!data.ok) throw new Error(data.message);
      return data;
    },
  });
}

export function useUpdateSettings() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (payload: Record<string, any>) => {
      const res = await fetch(api.settings.update.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, ...payload }),
      });
      const body = await res.json();
      if (!body.ok) throw new Error(body.message);
      return body;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.settings.get.path] });
      toast({ title: "Settings Updated", description: "Settings have been saved." });
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Update Failed", description: err.message });
    },
  });
}
