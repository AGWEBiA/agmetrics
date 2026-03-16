import { useEffect, useCallback, useState } from "react";

export function useBrowserNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "denied"
  );

  const requestPermission = useCallback(async () => {
    if (typeof Notification === "undefined") return "denied";
    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  }, []);

  const showNotification = useCallback(
    (title: string, options?: NotificationOptions) => {
      if (permission !== "granted") return;
      try {
        new Notification(title, {
          icon: "/favicon.png",
          badge: "/favicon.png",
          ...options,
        });
      } catch (e) {
        console.warn("[BrowserNotification] Error:", e);
      }
    },
    [permission]
  );

  return { permission, requestPermission, showNotification };
}
