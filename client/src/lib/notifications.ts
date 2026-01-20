export async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) {
    console.log("Browser does not support notifications");
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  const permission = await Notification.requestPermission();
  return permission === "granted";
}

export async function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      console.log("Service Worker registered:", registration);
      return registration;
    } catch (error) {
      console.error("Service Worker registration failed:", error);
      return null;
    }
  }
  return null;
}

export function showLocalNotification(title: string, body: string) {
  if (Notification.permission === "granted") {
    new Notification(title, {
      body,
      icon: "/icons/icon-192x192.png",
    });
  }
}
