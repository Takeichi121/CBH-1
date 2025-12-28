import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useAuth } from "./use-auth";
import { useToast } from "@/hooks/use-toast";

export function useMyWeek(anyDate?: string) {
  const { token } = useAuth();
  
  return useQuery({
    queryKey: [api.shifts.getMyWeek.path, token, anyDate],
    enabled: !!token,
    queryFn: async () => {
      const res = await fetch(api.shifts.getMyWeek.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, anyDate }),
      });
      if (!res.ok) throw new Error("Failed to fetch week");
      const data = await res.json();
      if (!data.ok) throw new Error(data.message || "Failed to fetch week");
      return data;
    },
  });
}

export function useMyMonth(month: number, year: number) {
  const { token } = useAuth();
  
  return useQuery({
    queryKey: [api.shifts.getMyMonth.path, token, month, year],
    enabled: !!token,
    queryFn: async () => {
      const res = await fetch(api.shifts.getMyMonth.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, month, year }),
      });
      if (!res.ok) throw new Error("Failed to fetch month");
      const data = await res.json();
      if (!data.ok) throw new Error(data.message || "Failed to fetch month");
      return data;
    },
  });
}

export function useBookShift() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { date: string; shiftGroup: string; startTime: string; note?: string }) => {
      const res = await fetch(api.shifts.book.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, token }),
      });
      const body = await res.json();
      if (!body.ok) throw new Error(body.message);
      return body;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.shifts.getMyWeek.path] });
      toast({ title: "Success", description: "Shift booked successfully" });
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Booking Failed", description: err.message });
    },
  });
}

export function useCancelShift() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (date: string) => {
      const res = await fetch(api.shifts.cancel.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, date }),
      });
      const body = await res.json();
      if (!body.ok) throw new Error(body.message);
      return body;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.shifts.getMyWeek.path] });
      toast({ title: "Success", description: "Shift cancelled" });
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Cancellation Failed", description: err.message });
    },
  });
}

export function useRoster(anyDate?: string) {
  const { token } = useAuth();

  return useQuery({
    queryKey: [api.shifts.getRoster.path, token, anyDate],
    enabled: !!token,
    queryFn: async () => {
      const res = await fetch(api.shifts.getRoster.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, anyDate }),
      });
      if (!res.ok) throw new Error("Failed to fetch roster");
      const data = await res.json();
      if (!data.ok) throw new Error(data.message);
      return data;
    },
  });
}

export function useSetShiftForUser() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { username: string; date: string; shiftGroup: string; startTime: string; note?: string }) => {
      const res = await fetch(api.shifts.setForUser.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, token }),
      });
      const body = await res.json();
      if (!body.ok) throw new Error(body.message);
      return body;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.shifts.getRoster.path] });
      toast({ title: "Success", description: "Shift updated for user" });
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Update Failed", description: err.message });
    },
  });
}

export function useDeleteShiftForUser() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { username: string; date: string }) => {
      const res = await fetch(api.shifts.deleteForUser.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, token }),
      });
      const body = await res.json();
      if (!body.ok) throw new Error(body.message);
      return body;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.shifts.getRoster.path] });
      toast({ title: "Success", description: "Shift removed" });
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Delete Failed", description: err.message });
    },
  });
}
