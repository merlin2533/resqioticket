"use client";

import { useState } from "react";

type Props = {
  initialNotifyOnComment: boolean;
  initialNotifyOnStatusChange: boolean;
};

export function NotificationPreferencesCard({
  initialNotifyOnComment,
  initialNotifyOnStatusChange,
}: Props) {
  const [notifyOnComment, setNotifyOnComment] = useState(initialNotifyOnComment);
  const [notifyOnStatusChange, setNotifyOnStatusChange] = useState(initialNotifyOnStatusChange);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch("/api/portal/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notifyOnComment, notifyOnStatusChange }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Fehler beim Speichern");
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch {
      setError("Netzwerkfehler");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <h2 className="text-base font-semibold text-gray-900 mb-1">E-Mail-Benachrichtigungen</h2>
      <p className="text-sm text-gray-500 mb-4">Legen Sie fest, wann Sie per E-Mail benachrichtigt werden möchten.</p>
      <form onSubmit={handleSave} className="space-y-3">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={notifyOnComment}
            onChange={(e) => setNotifyOnComment(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">Bei neuen Kommentaren / Antworten auf meine Tickets</span>
        </label>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={notifyOnStatusChange}
            onChange={(e) => setNotifyOnStatusChange(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">Bei Statusänderungen meiner Tickets</span>
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "Speichern..." : "Einstellungen speichern"}
          </button>
          {saved && <span className="text-sm text-green-600">Gespeichert</span>}
        </div>
      </form>
    </div>
  );
}
