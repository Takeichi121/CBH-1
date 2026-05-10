import { useState, useEffect, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export type PushPermission = "default" | "granted" | "denied";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const [permission, setPermission] = useState<PushPermission>(
    "Notification" in window ? (Notification.permission as PushPermission) : "denied"
  );
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  const { data: vapidData } = useQuery<{ publicKey: string }>({
    queryKey: ["/api/push/vapid-public-key"],
  });

  useEffect(() => {
    const supported =
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;
    setIsSupported(supported);

    if (!supported) return;

    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setIsSubscribed(!!sub);
    });
  }, []);

  const subscribeMutation = useMutation({
    mutationFn: async () => {
      if (!vapidData?.publicKey) throw new Error("VAPID key not loaded");
      const reg = await navigator.serviceWorker.ready;
      const applicationServerKey = urlBase64ToUint8Array(vapidData.publicKey);
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });
      const json = sub.toJSON() as {
        endpoint: string;
        keys: { p256dh: string; auth: string };
      };
      await apiRequest("POST", "/api/push/subscribe", {
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
        userAgent: navigator.userAgent,
      });
      return sub;
    },
    onSuccess: () => {
      setIsSubscribed(true);
      setPermission("granted");
    },
  });

  const unsubscribeMutation = useMutation({
    mutationFn: async () => {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await apiRequest("POST", "/api/push/unsubscribe", {
          endpoint: sub.endpoint,
        });
        await sub.unsubscribe();
      }
    },
    onSuccess: () => {
      setIsSubscribed(false);
    },
  });

  const requestPermissionAndSubscribe = useCallback(async () => {
    if (!isSupported) return;
    const result = await Notification.requestPermission();
    setPermission(result as PushPermission);
    if (result === "granted") {
      await subscribeMutation.mutateAsync();
    }
  }, [isSupported, subscribeMutation]);

  const toggle = useCallback(async () => {
    if (isSubscribed) {
      await unsubscribeMutation.mutateAsync();
    } else {
      await requestPermissionAndSubscribe();
    }
  }, [isSubscribed, unsubscribeMutation, requestPermissionAndSubscribe]);

  return {
    isSupported,
    isSubscribed,
    permission,
    toggle,
    requestPermissionAndSubscribe,
    isLoading: subscribeMutation.isPending || unsubscribeMutation.isPending,
    error: subscribeMutation.error || unsubscribeMutation.error,
  };
}
