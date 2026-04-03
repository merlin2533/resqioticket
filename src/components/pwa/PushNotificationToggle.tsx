"use client";

import { useEffect, useState, useCallback } from "react";

interface Props {
  agentId: string;
  apiKey: string;
}

export function PushNotificationToggle({ agentId, apiKey }: Props) {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if ("Notification" in window) {
      setPermission(Notification.permission);
    }
    // Check if already subscribed
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          setSubscribed(!!sub);
        });
      });
    }
  }, []);

  const subscribe = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Get VAPID public key
      const vapidRes = await fetch("/api/push/vapid-key");
      if (!vapidRes.ok) throw new Error("Push nicht konfiguriert");
      const { publicKey } = await vapidRes.json();

      // 2. Request notification permission
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") return;

      // 3. Subscribe via Push API
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      // 4. Send subscription to server
      const subJson = sub.toJSON();
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
        },
        body: JSON.stringify({
          agentId,
          subscription: {
            endpoint: sub.endpoint,
            keys: {
              p256dh: subJson.keys?.p256dh ?? "",
              auth: subJson.keys?.auth ?? "",
            },
          },
        }),
      });

      setSubscribed(true);
    } catch (err) {
      console.error("Push subscribe failed:", err);
    } finally {
      setLoading(false);
    }
  }, [agentId, apiKey]);

  const unsubscribe = useCallback(async () => {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch(
          `/api/push/subscribe?endpoint=${encodeURIComponent(sub.endpoint)}`,
          {
            method: "DELETE",
            headers: { "x-api-key": apiKey },
          }
        );
        await sub.unsubscribe();
      }
      setSubscribed(false);
    } catch (err) {
      console.error("Push unsubscribe failed:", err);
    } finally {
      setLoading(false);
    }
  }, [apiKey]);

  // Not supported
  if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator)) {
    return null;
  }

  if (permission === "denied") {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
        <span>🔕</span>
        <span>Push-Benachrichtigungen blockiert. Bitte in den Browser-Einstellungen erlauben.</span>
      </div>
    );
  }

  return (
    <button
      onClick={subscribed ? unsubscribe : subscribe}
      disabled={loading}
      className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
        subscribed
          ? "bg-green-100 text-green-800 hover:bg-green-200"
          : "bg-slate-900 text-white hover:bg-slate-800"
      } disabled:opacity-50`}
    >
      {loading ? (
        <span className="animate-spin">⏳</span>
      ) : subscribed ? (
        <>🔔 Push aktiv – Deaktivieren</>
      ) : (
        <>🔕 Push-Benachrichtigungen aktivieren</>
      )}
    </button>
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length) as Uint8Array<ArrayBuffer>;
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
