"use client";

import { useState, useEffect } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const STORAGE_KEY = "pwa_install_dismissed";

function isMobile(): boolean {
  if (typeof window === "undefined") return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.innerWidth < 768;
}

function isIOS(): boolean {
  if (typeof window === "undefined") return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && (navigator as { standalone?: boolean }).standalone === true)
  );
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showIOSHint, setShowIOSHint] = useState(false);

  useEffect(() => {
    // Already installed or not mobile — don't show
    if (!isMobile() || isStandalone()) return;

    // User has permanently dismissed or installed
    if (localStorage.getItem(STORAGE_KEY)) return;

    // iOS doesn't fire beforeinstallprompt — show manual hint
    if (isIOS()) {
      setShowIOSHint(true);
      setShowBanner(true);
      return;
    }

    // Android / Chrome: listen for native install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Detect post-install
    const onInstalled = () => {
      localStorage.setItem(STORAGE_KEY, "installed");
      setShowBanner(false);
    };
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      localStorage.setItem(STORAGE_KEY, "installed");
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  }

  function handleDismiss() {
    localStorage.setItem(STORAGE_KEY, "dismissed");
    setShowBanner(false);
  }

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-slide-up">
      <div className="max-w-lg mx-auto bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-2xl p-4 text-white">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <p className="font-semibold text-sm">ResQio installieren</p>
            <p className="text-xs text-blue-100">Schneller Zugriff direkt vom Homescreen</p>
          </div>
          {!showIOSHint && (
            <button onClick={handleInstall}
              className="px-4 py-2 bg-white text-blue-600 rounded-lg text-sm font-semibold hover:bg-blue-50 transition-colors shrink-0">
              Installieren
            </button>
          )}
          <button onClick={handleDismiss} className="text-blue-200 hover:text-white text-lg leading-none shrink-0" aria-label="Schließen">
            &times;
          </button>
        </div>
        {showIOSHint && (
          <p className="text-xs text-blue-100 mt-2">
            Tippe auf{" "}
            <span className="inline-block align-middle text-base leading-none">⎙</span>{" "}
            &quot;Teilen&quot; und dann &quot;Zum Home-Bildschirm&quot;.
          </p>
        )}
      </div>
    </div>
  );
}
