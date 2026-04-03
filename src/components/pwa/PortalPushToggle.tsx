"use client";

import { useState, useEffect } from "react";

export function PortalPushToggle() {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if ("Notification" in window) {
      setPermission(Notification.permission);
      setEnabled(localStorage.getItem("portal_notifications") === "true");
    }
  }, []);

  async function handleToggle() {
    if (!("Notification" in window)) return;

    if (permission === "default") {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") return;
    }

    if (permission === "denied") return;

    const newState = !enabled;
    setEnabled(newState);
    localStorage.setItem("portal_notifications", String(newState));

    if (newState) {
      new Notification("ResQio Benachrichtigungen", {
        body: "Sie erhalten jetzt Benachrichtigungen zu Ihren Tickets.",
        icon: "/icons/icon-192x192.png",
      });
    }
  }

  if (typeof window === "undefined" || !("Notification" in window)) return null;

  if (permission === "denied") {
    return (
      <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
        Benachrichtigungen blockiert - bitte in Browser-Einstellungen erlauben.
      </div>
    );
  }

  return (
    <button onClick={handleToggle}
      className={`flex items-center gap-2 text-sm font-medium rounded-lg px-3 py-2 transition-colors ${
        enabled ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
      }`}>
      {enabled ? "Benachrichtigungen aktiv" : "Benachrichtigungen aktivieren"}
    </button>
  );
}
